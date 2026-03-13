import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [rows]: any = await pool.query(
            'SELECT id, username, email, role, created_at, profile_image FROM users ORDER BY created_at DESC'
        );

        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username, email, password, role } = await req.json();

        if (!username || !email || !password || !role) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
        }

        // Check if user already exists
        const [existing]: any = await pool.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return NextResponse.json({ error: 'Username atau Email sudah terdaftar' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role]
        );

        return NextResponse.json({ message: 'User berhasil dibuat' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
