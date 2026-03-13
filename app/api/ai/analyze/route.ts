import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getOptimizedSIMRSOrders, parseSIMRSDate } from '@/lib/simrs-client';
import { processAIAnalysis } from '@/lib/ai-handler';

export async function GET(req: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        // 1. Get history list
        const [history]: any = await pool.query(
            "SELECT id, date_start, date_end, total_orders_analyzed, last_run FROM ai_analysis WHERE analysis_type = 'repeat_orders' AND status = 'success' ORDER BY last_run DESC LIMIT 50"
        );

        // 2. Check for active background tasks
        const [activeTask]: any = await pool.query(
            "SELECT status, created_at FROM ai_assistant_requests WHERE status IN ('pending', 'executing') AND processing_mode = 'auto' ORDER BY created_at DESC LIMIT 1"
        );

        // 3. Determine which data to return
        let targetAnalysis = null;
        if (id) {
            const [specific]: any = await pool.query(
                "SELECT * FROM ai_analysis WHERE id = ? AND analysis_type = 'repeat_orders'", [id]
            );
            targetAnalysis = specific[0];
        } else {
            const [latest]: any = await pool.query(
                "SELECT * FROM ai_analysis WHERE analysis_type = 'repeat_orders' AND status = 'success' ORDER BY last_run DESC LIMIT 1"
            );
            targetAnalysis = latest[0];
        }

        return NextResponse.json({
            data: targetAnalysis ? JSON.parse(targetAnalysis.result_json) : null,
            dateStart: targetAnalysis?.date_start,
            dateEnd: targetAnalysis?.date_end,
            totalOrders: targetAnalysis?.total_orders_analyzed,
            lastRun: targetAnalysis?.last_run,
            id: targetAnalysis?.id,
            history: history,
            activeTask: activeTask[0] || null,
            cached: !!targetAnalysis
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, startDate, endDate, model = 'gemini-1.5-flash' } = body;

        // Action: Estimate (Still synchronous for UX)
        if (action === 'estimate') {
            const statusIds = [10, 11, 12, 13, 15, 30];
            const allResponse = await Promise.all(statusIds.map(sid => getOptimizedSIMRSOrders(sid)));
            const allOrders = allResponse.flat();
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            const count = allOrders.filter(o => {
                const oDate = parseSIMRSDate(o.create_date);
                if (!oDate) return false;
                if (start && oDate < start) return false;
                if (end && oDate > end) return false;
                return true;
            }).length;

            return NextResponse.json({
                orderCount: count,
                estimatedTokens: Math.ceil((count * 200) / 4) // Rough token estimate
            });
        }

        // Action: Execute (Async via Worker)
        if (action === 'execute') {
            // Register as auto task for background worker
            await pool.query(
                "INSERT INTO ai_assistant_requests (start_date, end_date, status, processing_mode) VALUES (?, ?, 'pending', 'auto')",
                [startDate, endDate]
            );

            return NextResponse.json({
                success: true,
                message: 'Analisa telah dijadwalkan ke Background Worker. Silakan tunggu beberapa saat.'
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('AI Analysis error:', error);
        return NextResponse.json({ error: 'Gagal menjadwalkan analisa: ' + error.message }, { status: 500 });
    }
}
