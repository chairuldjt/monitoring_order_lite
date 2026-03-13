import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import {
    getOptimizedSIMRSOrders,
    parseSIMRSDate,
} from '@/lib/simrs-client';

export async function GET(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const searchParams = new URL(request.url).searchParams;
        const type = searchParams.get('type') || 'overdue';
        const search = (searchParams.get('search') || '').toLowerCase();
        const searchType = searchParams.get('searchType') || 'all';
        const startDate = searchParams.get('startDate') || '';
        const endDate = searchParams.get('endDate') || '';
        const sort = searchParams.get('sort') || 'desc';

        // Helper filter text
        const applyTextFilter = (mappedItem: any) => {
            if (!search) return true;
            if (searchType === 'all') {
                return (mappedItem.title || '').toLowerCase().includes(search) ||
                    (mappedItem.order_no || '').toLowerCase().includes(search) ||
                    (mappedItem.requester_name || '').toLowerCase().includes(search) ||
                    (mappedItem.requester_unit || '').toLowerCase().includes(search) ||
                    (mappedItem.teknisi || '').toLowerCase().includes(search) ||
                    (mappedItem.ext_phone || '').toLowerCase().includes(search) ||
                    (mappedItem.description || '').toLowerCase().includes(search);
            }
            switch (searchType) {
                case 'order_no': return (mappedItem.order_no || '').toLowerCase().includes(search);
                case 'requester_name': return (mappedItem.requester_name || '').toLowerCase().includes(search);
                case 'teknisi': return (mappedItem.teknisi || '').toLowerCase().includes(search);
                case 'location': return (mappedItem.requester_unit || '').toLowerCase().includes(search);
                case 'ext_phone': return (mappedItem.ext_phone || '').toLowerCase().includes(search);
                case 'description': return (mappedItem.description || '').toLowerCase().includes(search);
                default: return false;
            }
        };

        // Helper filter date
        const applyDateFilter = (dateObj: Date | null) => {
            if (!dateObj) return false;

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (dateObj < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (dateObj > end) return false;
            }
            return true;
        };

        if (type === 'overdue') {
            const followUpOrders = await getOptimizedSIMRSOrders(11);
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);

            let followUpOverdue = followUpOrders
                .filter(o => o.status_desc?.toUpperCase() === 'FOLLOW UP')
                .filter(o => {
                    const d = parseSIMRSDate(o.create_date);
                    return d && d < oneDayAgo && applyDateFilter(d);
                })
                .map(o => ({
                    order_id: o.order_id,
                    order_no: o.order_no,
                    title: o.catatan || `Order ${o.order_no}`,
                    description: o.catatan || '',
                    requester_name: o.order_by,
                    requester_unit: o.location_desc,
                    ext_phone: o.ext_phone,
                    teknisi: (o.teknisi || '').replace(/\|$/, '').trim(),
                    create_date: o.create_date,
                    _parsed_date: parseSIMRSDate(o.create_date),
                    status: o.status_desc?.toUpperCase() || 'FOLLOW UP',
                    hours_overdue: Math.round((Date.now() - (parseSIMRSDate(o.create_date)?.getTime() || Date.now())) / (1000 * 60 * 60)),
                }))
                .filter(applyTextFilter);

            if (sort === 'asc') followUpOverdue.sort((a, b) => (a._parsed_date?.getTime() || 0) - (b._parsed_date?.getTime() || 0));
            else followUpOverdue.sort((a, b) => (b._parsed_date?.getTime() || 0) - (a._parsed_date?.getTime() || 0));

            return NextResponse.json({ data: followUpOverdue.map(({ _parsed_date, ...rest }) => rest) });
        }

        if (type === 'pending') {
            const pendingOrders = await getOptimizedSIMRSOrders(13);
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            let pendingOverdue = pendingOrders
                .filter(o => o.status_desc?.toUpperCase() === 'PENDING')
                .filter(o => {
                    const d = parseSIMRSDate(o.create_date);
                    return d && d < oneMonthAgo && applyDateFilter(d);
                })
                .map(o => ({
                    order_id: o.order_id,
                    order_no: o.order_no,
                    title: o.catatan || `Order ${o.order_no}`,
                    description: o.catatan || '',
                    requester_name: o.order_by,
                    requester_unit: o.location_desc,
                    ext_phone: o.ext_phone,
                    teknisi: (o.teknisi || '').replace(/\|$/, '').trim(),
                    create_date: o.create_date,
                    _parsed_date: parseSIMRSDate(o.create_date),
                    status: o.status_desc?.toUpperCase() || 'PENDING',
                    days_overdue: Math.round((Date.now() - (parseSIMRSDate(o.create_date)?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)),
                }))
                .filter(applyTextFilter);

            if (sort === 'asc') pendingOverdue.sort((a, b) => (a._parsed_date?.getTime() || 0) - (b._parsed_date?.getTime() || 0));
            else pendingOverdue.sort((a, b) => (b._parsed_date?.getTime() || 0) - (a._parsed_date?.getTime() || 0));

            return NextResponse.json({ data: pendingOverdue.map(({ _parsed_date, ...rest }) => rest) });
        }

        if (type === 'repeat') {
            const [followUpOrders, runningOrders, pendingOrders, doneOrders] = await Promise.all([
                getOptimizedSIMRSOrders(11),
                getOptimizedSIMRSOrders(12),
                getOptimizedSIMRSOrders(13),
                getOptimizedSIMRSOrders(15),
            ]);

            // Raw pre-filter by date before aggregation for performance
            const allActiveOrders = [...followUpOrders, ...runningOrders, ...pendingOrders, ...doneOrders].filter(o => {
                const d = parseSIMRSDate(o.create_date);
                return applyDateFilter(d);
            });

            const titleCounts: Record<string, { count: number; units: Set<string>; examples: any[] }> = {};
            for (const order of allActiveOrders) {
                const title = (order.catatan || '').split('\n')[0]?.trim();
                if (!title) continue;
                if (!titleCounts[title]) {
                    titleCounts[title] = { count: 0, units: new Set(), examples: [] };
                }
                titleCounts[title].count++;
                if (order.location_desc) titleCounts[title].units.add(order.location_desc);
                if (titleCounts[title].examples.length < 3) {
                    titleCounts[title].examples.push({
                        order_no: order.order_no,
                        create_date: order.create_date,
                        status: order.status_desc
                    });
                }
            }

            let repeatOrders = Object.entries(titleCounts)
                .filter(([, v]) => v.count > 1)
                .map(([title, v]) => ({
                    title,
                    count: v.count,
                    units: Array.from(v.units).join(', '),
                    examples: v.examples
                }));

            if (search) {
                repeatOrders = repeatOrders.filter(ro => ro.title.toLowerCase().includes(search) || ro.units.toLowerCase().includes(search));
            }

            // Re-use sort order parameter, but for this context sort by occurrence ascending or descending
            if (sort === 'asc') repeatOrders.sort((a, b) => a.count - b.count);
            else repeatOrders.sort((a, b) => b.count - a.count);

            return NextResponse.json({ data: repeatOrders });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error: any) {
        console.error('Specific stats error:', error);
        let message = error.message;
        if (error.message.includes('SIMRS API error')) {
            message = 'Server SIMRS sedang tidak menanggapi (Offline/Error 500). Mohon coba lagi nanti.';
        }
        return NextResponse.json({ error: 'Gagal mengambil data dari SIMRS: ' + message }, { status: 500 });
    }
}
