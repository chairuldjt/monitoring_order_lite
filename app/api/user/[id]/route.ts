import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPayloadFromCookie } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { username, email, password, role } = await req.json();

        let query = 'UPDATE users SET username = ?, email = ?, role = ?';
        let values = [username, email, role];

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            values.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        values.push(id);

        await pool.query(query, values);

        return NextResponse.json({ message: 'User berhasil diperbarui' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Prevent self-deletion
        if (Number(id) === payload.id) {
            return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' }, { status: 400 });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        return NextResponse.json({ message: 'User berhasil dihapus' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
