import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

export async function GET() {
    try {
        const [rows]: any = await pool.query(
            'SELECT * FROM ai_assistant_requests WHERE status = "pending" ORDER BY created_at DESC LIMIT 1'
        );
        return NextResponse.json({ data: rows[0] || null });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { startDate, endDate } = await request.json();

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Start date and End date are required' }, { status: 400 });
        }

        // Check if there is already a pending request
        const [existing]: any = await pool.query(
            'SELECT id FROM ai_assistant_requests WHERE status = "pending"'
        );

        if (existing.length > 0) {
            return NextResponse.json({
                error: 'Ada permintaan yang sedang mengantri. Mohon tunggu hingga Assistant menyelesaikannya.'
            }, { status: 400 });
        }

        const [result]: any = await pool.query(
            'INSERT INTO ai_assistant_requests (start_date, end_date, status) VALUES (?, ?, "pending")',
            [startDate, endDate]
        );

        return NextResponse.json({
            success: true,
            message: 'Permintaan telah dikirim ke Assistant. Assistant akan segera memproses analisa ini.',
            id: result.insertId
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
