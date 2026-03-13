import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getSIMRSOrderPhotos } from '@/lib/simrs-client';

/**
 * GET /api/orders/[id]/photos — Fetch photos for a specific order LIVE from SIMRS
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Optional: Check auth for this endpoint
        // const payload = await getPayloadFromCookie();
        // if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const photos = await getSIMRSOrderPhotos(id);

        return NextResponse.json({
            data: photos.map((p: any) => ({
                id: p.id || p.photo_id || Math.random(),
                thumbnail: p.id || p.photo_id ? `/api/photos/${p.id || p.photo_id}` : '',
                full: p.id || p.photo_id ? `/api/photos/${p.id || p.photo_id}` : '',
                created_at: p.create_date || p.created_at || '',
                user_name: p.user_name || p.nama_lengkap || p.nama_teknisi || p.teknisi_name || '',
            }))
        });
    } catch (error: any) {
        console.error('Order photos error:', error);
        return NextResponse.json({ error: 'Gagal mengambil foto order: ' + error.message }, { status: 500 });
    }
}
