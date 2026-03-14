import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import { 
    getSIMRSOrderDetail, 
    getSIMRSOrderHistory, 
    getSIMRSOrderPhotos,
    parseSIMRSDate,
    formatToStandardDate
} from '@/lib/simrs-client';

/**
 * GET /api/orders/[id] — Fetch single order LIVE from SIMRS
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Fetch detail, history, and photos concurrently from SIMRS
        const [order, history, photos] = await Promise.all([
            getSIMRSOrderDetail(id),
            getSIMRSOrderHistory(id),
            getSIMRSOrderPhotos(id)
        ]);

        if (!order) {
            return NextResponse.json({ error: 'Order tidak ditemukan di SIMRS' }, { status: 404 });
        }

        // Standardize status for our UI (lowercase)
        const localStatus = order.status_desc.toLowerCase().replace(' ', '_');

        // Extract "TGL SELESAI" from history if not in main order
        let doneDate = order.tgl_selesai || null;
        if (!doneDate) {
            const doneEntry = history.find((h: any) => 
                ['DONE', 'VERIFIED'].includes((h.status_desc || '').toUpperCase().trim())
            );
            if (doneEntry) {
                const rawDoneDate = doneEntry.status_date || doneEntry.create_date || '';
                const parsed = parseSIMRSDate(rawDoneDate);
                doneDate = parsed ? formatToStandardDate(parsed) : rawDoneDate;
            }
        }

        return NextResponse.json({
            data: {
                ...order,
                status: localStatus,
                tgl_selesai: doneDate,
                photos: photos || [],
                history: history.map((h: any) => ({
                    id: h.history_id || Math.random(),
                    status: h.status_desc?.toLowerCase().replace(' ', '_') || 'unknown',
                    status_desc: h.status_desc,
                    note: h.status_note || '',
                    changed_by_name: h.nama_petugas || 'System',
                    created_at: h.status_date || h.create_date || '',
                })),
                // We provide dummy priority as it's removed from SIMRS
                priority: 'medium',
            }
        });
    } catch (error: any) {
        console.error('Order detail error:', error);
        return NextResponse.json({ error: 'Gagal mengambil detail order: ' + error.message }, { status: 500 });
    }
}
