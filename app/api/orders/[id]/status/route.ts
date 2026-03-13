import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { status, note } = await request.json();

        const validStatuses = ['open', 'follow_up', 'running', 'done', 'verified', 'pending'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
        }

        // Update order status
        const updateFields: any = { status };
        if (status === 'done' || status === 'verified') {
            updateFields.completed_at = new Date();
        }

        await pool.query(
            `UPDATE orders SET status = ?, completed_at = ? WHERE id = ?`,
            [status, updateFields.completed_at || null, id]
        );

        // Add status history
        await pool.query(
            `INSERT INTO order_status_history (order_id, status, note, changed_by, changed_by_name)
       VALUES (?, ?, ?, ?, ?)`,
            [id, status, note || `Status diubah ke ${status}`, payload.id, payload.username]
        );

        // Create notification for status change
        const [order]: any = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
        if (order.length > 0) {
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type, order_id)
         VALUES (?, ?, ?, 'status_change', ?)`,
                [
                    order[0].created_by,
                    `Status Update: ${order[0].order_no}`,
                    `Order "${order[0].title}" diubah ke status "${status}" oleh ${payload.username}`,
                    id
                ]
            );
        }

        return NextResponse.json({ message: 'Status updated' });
    } catch (error) {
        console.error('Status update error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
