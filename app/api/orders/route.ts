import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import {
    getOptimizedSIMRSOrders,
    getSIMRSSummary,
    parseSIMRSDate,
    SIMRS_STATUS_MAP,
} from '@/lib/simrs-client';

/**
 * GET /api/orders — Fetch orders LIVE from SIMRS API with server-side caching
 * Query params: ?status=follow_up&search=keyword
 */
export async function GET(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status') || '';
        const search = (searchParams.get('search') || '').toLowerCase();
        const searchType = searchParams.get('searchType') || 'all';
        const startDate = searchParams.get('startDate') || '';
        const endDate = searchParams.get('endDate') || '';
        const sort = searchParams.get('sort') || 'desc';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const nosParam = searchParams.get('nos');
        const orderNos = nosParam ? nosParam.split(',').filter(Boolean) : null;

        // Determine which status IDs to fetch
        let statusIds: number[] = [];
        if (statusFilter) {
            const mapping = Object.entries(SIMRS_STATUS_MAP).find(([, v]) => v.local === statusFilter);
            if (mapping) {
                statusIds = [mapping[1].id];
            }
        } else {
            // Fetch active statuses (Optimized)
            // statusIds: 10: open, 11: follow_up, 12: running, 15: done, 13: pending, 30: verified
            statusIds = [10, 11, 12, 13, 15, 30];
        }

        // Fetch from SIMRS (Using Optimized Cache logic)
        let allOrders: any[] = [];
        for (const sid of statusIds) {
            try {
                const orders = await getOptimizedSIMRSOrders(sid);
                allOrders.push(...orders);
            } catch (e) {
                console.error(`Error fetching status ${sid}:`, e);
            }
        }

        // Map to display format
        let mapped = allOrders.map(o => ({
            order_id: o.order_id,
            order_no: o.order_no,
            title: o.catatan || `Order ${o.order_no}`,
            description: o.catatan || '',
            status: o.status_desc?.toUpperCase().trim() || 'UNKNOWN',
            requester_name: o.order_by || '',
            requester_unit: o.location_desc || '',
            ext_phone: o.ext_phone || '',
            teknisi: (o.teknisi || '').replace(/\|$/, '').trim(),
            create_date: o.create_date,
            _parsed_date: parseSIMRSDate(o.create_date),
        }));

        // Exact Order Nos filter (High Priority)
        if (orderNos && orderNos.length > 0) {
            mapped = mapped.filter(o => orderNos.includes(o.order_no));
        }

        // Search filter
        if (search) {
            mapped = mapped.filter(o => {
                if (searchType === 'all') {
                    return o.title.toLowerCase().includes(search) ||
                        o.order_no.toLowerCase().includes(search) ||
                        o.requester_name.toLowerCase().includes(search) ||
                        o.requester_unit.toLowerCase().includes(search) ||
                        o.teknisi.toLowerCase().includes(search) ||
                        (o.ext_phone || '').toLowerCase().includes(search) ||
                        o.description.toLowerCase().includes(search);
                }

                switch (searchType) {
                    case 'order_no': return o.order_no.toLowerCase().includes(search);
                    case 'requester_name': return o.requester_name.toLowerCase().includes(search);
                    case 'teknisi': return o.teknisi.toLowerCase().includes(search);
                    case 'location': return o.requester_unit.toLowerCase().includes(search);
                    case 'ext_phone': return (o.ext_phone || '').toLowerCase().includes(search);
                    case 'description': return o.description.toLowerCase().includes(search);
                    default: return false;
                }
            });
        }

        // Date filter
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            mapped = mapped.filter(o => {
                if (!o._parsed_date) return false;
                return o._parsed_date >= start;
            });
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            mapped = mapped.filter(o => {
                if (!o._parsed_date) return false;
                return o._parsed_date <= end;
            });
        }

        // Sort by date
        if (sort === 'asc') {
            mapped.sort((a, b) => (a._parsed_date?.getTime() || 0) - (b._parsed_date?.getTime() || 0));
        } else {
            mapped.sort((a, b) => (b._parsed_date?.getTime() || 0) - (a._parsed_date?.getTime() || 0));
        }

        const total = mapped.length;

        // Pagination
        const startIndex = (page - 1) * limit;
        const paginated = mapped.slice(startIndex, startIndex + limit).map(({ _parsed_date, ...rest }) => rest);

        // Get summary for counts
        let summary = null;
        try {
            summary = await getSIMRSSummary();
        } catch (e) {
            // fallback
        }

        return NextResponse.json({
            orders: paginated,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            summary,
        });
    } catch (error: any) {
        console.error('Orders error:', error);
        return NextResponse.json({ error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
    }
}
