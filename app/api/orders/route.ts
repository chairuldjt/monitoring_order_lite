import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import {
    getOptimizedSIMRSOrders,
    getSIMRSSummary,
    getSIMRSOrdersWithDetails,
    getSIMRSOrderDetail,
    parseSIMRSDate,
    SIMRS_STATUS_MAP,
    SIMRSOrder,
    cacheManager,
} from '@/lib/simrs-client';

/**
 * GET /api/orders — Fetch orders LIVE from SIMRS API with server-side caching
 */
export async function GET(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status') || '';
        const search = (searchParams.get('search') || '').toLowerCase().trim();
        const searchType = (searchParams.get('searchType') || 'all').toLowerCase().trim();
        const startDate = searchParams.get('startDate') || '';
        const endDate = searchParams.get('endDate') || '';
        const sort = searchParams.get('sort') || 'desc';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const nosParam = searchParams.get('nos');
        const orderNos = nosParam ? nosParam.split(',').filter(Boolean) : null;

        // Determine status IDs
        let statusIds: number[] = [];
        if (statusFilter) {
            const mapping = Object.entries(SIMRS_STATUS_MAP).find(([, v]) => v.local === statusFilter);
            if (mapping) statusIds = [mapping[1].id];
        } else {
            statusIds = [10, 11, 12, 13, 15, 30];
        }

        // Fetch orders
        let allOrders: SIMRSOrder[] = [];
        if (searchType === 'service') {
            allOrders = await getSIMRSOrdersWithDetails(statusIds);
        } else {
            for (const sid of statusIds) {
                try {
                    const orders = await getOptimizedSIMRSOrders(sid);
                    allOrders.push(...orders);
                } catch (e) {}
            }
        }

        // Map and filter
        let mapped = allOrders.map((o: SIMRSOrder) => ({
            order_id: o.order_id,
            order_no: o.order_no,
            title: o.catatan || `Order ${o.order_no}`,
            description: o.catatan || '',
            status: o.status_desc?.toUpperCase().trim() || 'UNKNOWN',
            requester_name: o.order_by || '',
            requester_unit: o.location_desc || '',
            ext_phone: o.ext_phone || '',
            teknisi: (o.teknisi || '').replace(/\|$/, '').trim(),
            service_name: o.service_name || '',
            service_catalog_id: o.service_catalog_id,
            create_date: o.create_date,
            _parsed_date: parseSIMRSDate(o.create_date),
        }));

        if (orderNos?.length) {
            mapped = mapped.filter(o => orderNos.includes(o.order_no));
        }

        if (search) {
            mapped = mapped.filter(o => {
                const s = search.toLowerCase();
                if (searchType === 'all') {
                    return o.title.toLowerCase().includes(s) ||
                        o.order_no.toLowerCase().includes(s) ||
                        o.requester_name.toLowerCase().includes(s) ||
                        o.requester_unit.toLowerCase().includes(s) ||
                        o.teknisi.toLowerCase().includes(s) ||
                        o.service_name.toLowerCase().includes(s);
                }
                switch (searchType) {
                    case 'order_no': return o.order_no.toLowerCase().includes(s);
                    case 'requester_name': return o.requester_name.toLowerCase().includes(s);
                    case 'teknisi': return o.teknisi.toLowerCase().includes(s);
                    case 'location': return o.requester_unit.toLowerCase().includes(s);
                    case 'ext_phone': return o.ext_phone.toLowerCase().includes(s);
                    case 'description': return o.description.toLowerCase().includes(s);
                    case 'service': return o.service_name.toLowerCase().includes(s) || (o.service_catalog_id?.toString() === s);
                    default: return false;
                }
            });
        }

        // Date filter
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0,0,0,0);
            mapped = mapped.filter(o => o._parsed_date && o._parsed_date >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23,59,59,999);
            mapped = mapped.filter(o => o._parsed_date && o._parsed_date <= end);
        }

        // Sort
        mapped.sort((a, b) => {
            const timeA = a._parsed_date?.getTime() || 0;
            const timeB = b._parsed_date?.getTime() || 0;
            return sort === 'asc' ? timeA - timeB : timeB - timeA;
        });

        const total = mapped.length;
        const startIndex = (page - 1) * limit;
        let paginated = mapped.slice(startIndex, startIndex + limit);

        // Populate service_name for paginated items if missing
        if (searchType !== 'service') {
            paginated = await Promise.all(paginated.map(async (o) => {
                if (o.service_name) return o;
                const cached = cacheManager.get(`order_detail_${o.order_id}`);
                if (cached) return { ...o, service_name: cached.service_name };
                try {
                    const detail = await getSIMRSOrderDetail(o.order_id);
                    if (detail) {
                        cacheManager.set(`order_detail_${o.order_id}`, detail);
                        return { ...o, service_name: detail.service_name };
                    }
                } catch (e) {}
                return o;
            }));
        }

        const summary = await getSIMRSSummary().catch(() => null);

        return NextResponse.json({
            orders: paginated.map(({ _parsed_date, ...rest }) => rest),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            summary,
        });
    } catch (error: any) {
        console.error('Orders API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
