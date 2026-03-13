import { NextResponse } from 'next/server';
import { findSIMRSOrderByNo, getSIMRSOrderHistory, getSIMRSOrderPhotos } from '@/lib/simrs-client';

/**
 * GET /api/tracking/[orderNo] — Live tracking from SIMRS
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ orderNo: string }> }
) {
    try {
        const { orderNo } = await params;
        const decodedNo = decodeURIComponent(orderNo);

        // 1. Find the order by its number in SIMRS (searches active status lists)
        const simrsOrder = await findSIMRSOrderByNo(decodedNo);

        if (!simrsOrder) {
            return NextResponse.json({ error: 'Order tidak ditemukan di SIMRS' }, { status: 404 });
        }

        // 2. Fetch history concurrently for this order
        const [history] = await Promise.all([
            getSIMRSOrderHistory(simrsOrder.order_id)
        ]);

        // 3. Map for UI compatibility
        return NextResponse.json({
            data: {
                order_id: simrsOrder.order_id,
                order_no: simrsOrder.order_no,
                title: simrsOrder.catatan || `Order ${simrsOrder.order_no}`,
                description: simrsOrder.catatan,
                requester_name: simrsOrder.order_by,
                requester_unit: simrsOrder.location_desc,
                status: simrsOrder.status_desc.toLowerCase().replace(' ', '_'),
                status_desc: simrsOrder.status_desc,
                created_at: simrsOrder.create_date,
                history: history.map((h: any) => ({
                    id: h.history_id || Math.random(),
                    status: h.status_desc?.toLowerCase().replace(' ', '_') || 'unknown',
                    status_desc: h.status_desc,
                    note: h.status_note || '',
                    changed_by_name: h.nama_petugas || 'System',
                    created_at: h.status_date || h.create_date || '',
                })),
                priority: 'normal', // Removed in SIMRS
            },
        });
    } catch (error: any) {
        console.error('Tracking error:', error);
        return NextResponse.json({ error: 'Gagal melacak order: ' + error.message }, { status: 500 });
    }
}
