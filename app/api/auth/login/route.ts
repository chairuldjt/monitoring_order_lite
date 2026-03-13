import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email/username dan password harus diisi' }, { status: 400 });
        }

        // Allow login with username or email
        const [rows]: any = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, email]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Username/email atau password salah' }, { status: 401 });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Username/email atau password salah' }, { status: 401 });
        }

        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            message: 'Login berhasil',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile_image: user.profile_image,
            },
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 10, // 10 hours
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
