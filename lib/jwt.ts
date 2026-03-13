import { sign, verify, type Secret, type SignOptions } from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = (process.env.JWT_SECRET || 'secret-key') as Secret;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '10h');

export interface JWTPayload {
    id: number;
    username: string;
    email: string;
    role: string;
}

export function generateToken(payload: JWTPayload): string {
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
    return sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export async function getTokenFromCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get('token')?.value || null;
}

export async function getPayloadFromCookie(): Promise<JWTPayload | null> {
    const token = await getTokenFromCookie();
    if (!token) return null;
    return verifyToken(token);
}
