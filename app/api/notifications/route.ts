import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';

export async function GET() {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [rows]: any = await pool.query(
            `SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50`,
            [payload.id]
        );

        const unreadCount = rows.filter((n: any) => !n.is_read).length;

        return NextResponse.json({ data: rows, unreadCount });
    } catch (error) {
        console.error('Notifications error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (body.markAll) {
            await pool.query(
                `UPDATE notifications SET is_read = TRUE WHERE user_id = ? OR user_id IS NULL`,
                [payload.id]
            );
        } else if (body.id) {
            await pool.query(
                `UPDATE notifications SET is_read = ? WHERE id = ?`,
                [body.is_read ?? true, body.id]
            );
        }

        return NextResponse.json({ message: 'Updated' });
    } catch (error) {
        console.error('Notification update error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
