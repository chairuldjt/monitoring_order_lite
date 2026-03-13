import { NextResponse } from 'next/server';
import axios from 'axios';
import { simrsLogin } from '@/lib/simrs-client';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) return new NextResponse('ID is required', { status: 400 });

        const token = await simrsLogin();

        // Use the base IP from SIMRS_API_URL but switch to port 9000 for photo binary content
        const apiBase = process.env.SIMRS_API_URL || 'http://103.148.235.37:5010';
        const photoBase = apiBase.replace(/:\d+$/, ':9000');
        const url = `${photoBase}/photo/get_photo/${id}`;

        const response = await axios.get(url, {
            headers: { 'access-token': token },
            responseType: 'arraybuffer',
            validateStatus: (status) => status < 500 // Allow 404 to pass through
        });

        // Detect and decode the response
        const rawBuffer = Buffer.from(response.data);
        const rawStr = rawBuffer.toString('utf-8').trim();
        let decodedData: Buffer | null = null;

        // Try to find JSON boundaries {}
        const firstBrace = rawStr.indexOf('{');
        const lastBrace = rawStr.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonPart = rawStr.slice(firstBrace, lastBrace + 1);
            try {
                const parsed = JSON.parse(jsonPart);
                const base64 = parsed.img_base || parsed.result || parsed.data || parsed.image || parsed.photo_url;
                if (typeof base64 === 'string') {
                    // Remove data:image/...;base64, prefix if present
                    const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
                    decodedData = Buffer.from(cleanBase64, 'base64');
                }
            } catch (e) {
                // JSON parse failed, try regex as fallback
            }
        }

        // Regex fallback if JSON parsing failed or result was empty
        if (!decodedData) {
            const match = rawStr.match(/"(?:img_base|result|data|image|photo_url)"\s*:\s*"([^"]+)"/);
            if (match && match[1]) {
                const cleanBase64 = match[1].replace(/^data:image\/[a-z]+;base64,/, '');
                decodedData = Buffer.from(cleanBase64, 'base64');
            }
        }

        // One more fallback: maybe it's just raw base64 or quoted base64?
        if (!decodedData) {
            if (rawStr.startsWith('"') && rawStr.endsWith('"')) {
                decodedData = Buffer.from(rawStr.slice(1, -1), 'base64');
            } else if (rawStr.length > 50 && !rawStr.includes(' ') && /^[A-Za-z0-9+/=]+$/.test(rawStr)) {
                decodedData = Buffer.from(rawStr, 'base64');
            }
        }

        // If we still have nothing, we use the raw buffer as a last resort
        const finalData = decodedData || rawBuffer;

        // Return as a standard Response to avoid Next.js smart headers
        return new Response(finalData, {
            status: 200,
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
                'Content-Length': finalData.length.toString(),
                'X-Proxy-Status': 'Antigravity-v3', // Verification header
            },
        });

    } catch (error: any) {
        console.error(`Error proxying photo ${error.message}`);
        return new NextResponse('Gagal mengambil foto dari server SIMRS', { status: 500 });
    }
}
