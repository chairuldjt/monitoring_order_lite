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
            'SELECT id, username, email, role, profile_image FROM users WHERE id = ?',
            [payload.id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ data: rows[0] });
    } catch (error) {
        console.error('Profile error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
