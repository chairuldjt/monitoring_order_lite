import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getOptimizedSIMRSOrders, parseSIMRSDate } from '@/lib/simrs-client';

export async function GET() {
    try {
        // Fetch relevant status orders from SIMRS
        const [followUpOrders, pendingOrders] = await Promise.all([
            getOptimizedSIMRSOrders(11), // FOLLOW UP
            getOptimizedSIMRSOrders(13), // PENDING
        ]);

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        let followUpCount = 0;
        let pendingCount = 0;

        // Check for follow_up orders older than 1 day
        for (const order of followUpOrders) {
            const oDate = parseSIMRSDate(order.create_date);
            if (oDate && oDate < oneDayAgo) {
                const [existing]: any = await pool.query(
                    `SELECT id FROM notifications WHERE order_no = ? AND type = 'follow_up_overdue' AND DATE(created_at) = CURDATE()`,
                    [order.order_no]
                );
                if (existing.length === 0) {
                    await pool.query(
                        `INSERT INTO notifications (user_id, title, message, type, order_no)
               VALUES (NULL, ?, ?, 'follow_up_overdue', ?)`,
                        [
                            `Follow-up Terlambat: ${order.order_no}`,
                            `Order dari ${order.location_desc} sudah lebih dari 1 hari dalam status follow-up.`,
                            order.order_no
                        ]
                    );
                    followUpCount++;
                }
            }
        }

        // Check for pending orders older than 1 month
        for (const order of pendingOrders) {
            const oDate = parseSIMRSDate(order.create_date);
            if (oDate && oDate < oneMonthAgo) {
                const [existing]: any = await pool.query(
                    `SELECT id FROM notifications WHERE order_no = ? AND type = 'pending_overdue' AND DATE(created_at) = CURDATE()`,
                    [order.order_no]
                );
                if (existing.length === 0) {
                    await pool.query(
                        `INSERT INTO notifications (user_id, title, message, type, order_no)
               VALUES (NULL, ?, ?, 'pending_overdue', ?)`,
                        [
                            `Pending Terlalu Lama: ${order.order_no}`,
                            `Order dari ${order.location_desc} sudah lebih dari 1 bulan dalam status pending!`,
                            order.order_no
                        ]
                    );
                    pendingCount++;
                }
            }
        }

        return NextResponse.json({
            message: 'Check completed',
            followUpOverdue: followUpCount,
            pendingOverdue: pendingCount,
        });
    } catch (error) {
        console.error('Notification check error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
