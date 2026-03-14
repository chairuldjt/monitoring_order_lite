import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import {
    getOptimizedSIMRSOrders,
    getSIMRSOrdersWithDetails,
    parseSIMRSDate,
} from '@/lib/simrs-client';
import { SIMRSOrder } from '@/lib/simrs-client';
import pool from '@/lib/db';

const NOISE_WORDS = new Set(['tolong', 'mohon', 'bantu', 'bantuan', 'segera', 'cek', 'dicek', 'perbaiki', 'perbaikan', 'rusak', 'ada', 'kendala', 'masalah', 'dari', 'unit', 'ruangan', 'terima', 'kasih', 'tks', 'sdh', 'sudah', 'yang', 'di', 'ke']);

function getNoteFingerprint(note: string): string {
    if (!note) return 'NO_NOTE';
    
    // Ambil baris pertama, bersihkan simbol dan angka
    const clean = note.split('\n')[0]
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ') 
        .trim();

    // Pisahkan kata, buang kata sampah, urutkan alfabetis
    const words = clean.split(/\s+/)
        .filter(w => w.length > 1 && !NOISE_WORDS.has(w))
        .sort();

    if (words.length === 0) return 'OTHER';
    
    // Gabungkan kembali menjadi key unik (misal: "ac_mati")
    return words.join('_');
}

export async function GET(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'overdue';
        const search = (searchParams.get('search') || '').toLowerCase().trim();
        const searchType = (searchParams.get('searchType') || 'all').toLowerCase().trim();
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
                case 'service': return (mappedItem.service_name || '').toLowerCase().includes(search) || (mappedItem.service_catalog_id?.toString() === search);
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
            const groupBy = searchParams.get('groupBy') || 'location'; // 'location', 'extension', or 'service'
            
            // Build query based on filters
            let query = `
                SELECT 
                    order_id, order_no, create_date, order_by, location_desc, 
                    ext_phone, catatan, status_desc, status_id, 
                    service_catalog_id, service_name, teknisi
                FROM simrs_orders_cache
                WHERE 1=1
            `;
            const queryParams: any[] = [];

            if (startDate) {
                query += ` AND create_date >= ?`;
                queryParams.push(startDate + ' 00:00:00');
            }
            if (endDate) {
                query += ` AND create_date <= ?`;
                queryParams.push(endDate + ' 23:59:59');
            }

            const searchLower = search?.toLowerCase();
            if (searchLower) {
                if (groupBy === 'location') {
                    query += ` AND LOWER(location_desc) LIKE ?`;
                    queryParams.push(`%${searchLower}%`);
                } else if (groupBy === 'extension') {
                    query += ` AND LOWER(ext_phone) LIKE ?`;
                    queryParams.push(`%${searchLower}%`);
                } else if (groupBy === 'service') {
                    query += ` AND LOWER(service_name) LIKE ?`;
                    queryParams.push(`%${searchLower}%`);
                }
            }

            const [rows]: any = await pool.query(query, queryParams);
            
            if (rows.length === 0) {
                return NextResponse.json({ data: [] });
            }

            const counts: Record<string, { count: number; items: any[]; label: string }> = {};
            
            for (const row of rows) {
                let key = '';
                let label = '';
                
                if (groupBy === 'extension') {
                    key = row.ext_phone?.trim() || 'NO_EXT';
                    label = key === 'NO_EXT' ? 'Tanpa Ekstensi' : `Ext: ${key}`;
                } else if (groupBy === 'service') {
                    key = row.service_catalog_id?.toString() || row.service_name?.trim() || 'NO_SERVICE';
                    label = row.service_name?.trim() || 'Tanpa Layanan';
                } else {
                    key = row.location_desc?.trim() || 'NO_LOCATION';
                    label = key === 'NO_LOCATION' ? 'Tanpa Lokasi' : key;
                }

                if (!key || key === 'NO_EXT' || key === 'NO_LOCATION' || key === 'NO_SERVICE') continue;

                if (!counts[key]) {
                    counts[key] = { count: 0, items: [], label };
                }
                counts[key].count++;
                
                // Format date back to SIMRS view format for UI consistency
                const date = new Date(row.create_date);
                const formattedDate = date.toLocaleDateString('id-ID', { 
                    day: 'numeric', month: 'short', year: '2-digit' 
                }) + ' - ' + date.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', minute: '2-digit', hour12: false 
                }).replace('.', ':');

                if (counts[key].items.length < 5) {
                    counts[key].items.push({
                        order_no: row.order_no,
                        title: row.catatan || `Order ${row.order_no}`,
                        create_date: formattedDate,
                        status: row.status_desc
                    });
                }
            }

            let repeatData = Object.entries(counts)
                .filter(([, v]) => v.count > 1)
                .map(([key, v]) => ({
                    key,
                    label: v.label,
                    count: v.count,
                    items: v.items
                }));

            if (sort === 'asc') repeatData.sort((a, b) => a.count - b.count);
            else repeatData.sort((a, b) => b.count - a.count);

            // Get last sync time
            let lastSynced = null;
            const [syncRow]: any = await pool.query('SELECT MAX(last_synced) as last_sync FROM simrs_orders_cache');
            if (syncRow[0] && syncRow[0].last_sync) {
                lastSynced = syncRow[0].last_sync;
            }

            return NextResponse.json({ data: repeatData, lastSync: lastSynced });
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
