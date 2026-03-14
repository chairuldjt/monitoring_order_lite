import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import {
    getOptimizedSIMRSOrders,
    getSIMRSOrdersWithDetails,
    parseSIMRSDate,
    SIMRS_STATUS_MAP,
    SIMRSOrder,
} from '@/lib/simrs-client';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status') || '';
        const search = (searchParams.get('search') || '').toLowerCase().trim();
        const searchType = (searchParams.get('searchType') || 'all').toLowerCase().trim();
        const startDate = searchParams.get('startDate') || '';
        const endDate = searchParams.get('endDate') || '';
        const sort = searchParams.get('sort') || 'desc';
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

        // Fetch orders - Always with details for export to get full info
        const allOrders = await getSIMRSOrdersWithDetails(statusIds);

        // Map and filter
        let mapped = allOrders.map((o: SIMRSOrder) => ({
            order_id: o.order_id,
            order_no: o.order_no,
            create_date: o.create_date,
            order_by: o.order_by || '',
            location_desc: o.location_desc || '',
            ext_phone: o.ext_phone || '',
            catatan: o.catatan || '',
            status_desc: o.status_desc?.toUpperCase().trim() || 'UNKNOWN',
            service_name: o.service_name || '',
            service_catalog_id: o.service_catalog_id,
            teknisi: (o.teknisi || '').replace(/\|$/, '').trim(),
            _parsed_date: parseSIMRSDate(o.create_date),
        }));

        if (orderNos?.length) {
            mapped = mapped.filter(o => orderNos.includes(o.order_no));
        }

        if (search) {
            mapped = mapped.filter(o => {
                const s = search.toLowerCase();
                if (searchType === 'all') {
                    return o.catatan.toLowerCase().includes(s) ||
                        o.order_no.toLowerCase().includes(s) ||
                        o.order_by.toLowerCase().includes(s) ||
                        o.location_desc.toLowerCase().includes(s) ||
                        o.teknisi.toLowerCase().includes(s) ||
                        o.service_name.toLowerCase().includes(s);
                }
                switch (searchType) {
                    case 'order_no': return o.order_no.toLowerCase().includes(s);
                    case 'requester_name': return o.order_by.toLowerCase().includes(s);
                    case 'teknisi': return o.teknisi.toLowerCase().includes(s);
                    case 'location': return o.location_desc.toLowerCase().includes(s);
                    case 'ext_phone': return o.ext_phone.toLowerCase().includes(s);
                    case 'description': return o.catatan.toLowerCase().includes(s);
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

        // Create Excel Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Orders List');

        // Define Columns
        worksheet.columns = [
            { header: 'No. Order', key: 'order_no', width: 15 },
            { header: 'Tanggal', key: 'create_date', width: 20 },
            { header: 'Pelapor', key: 'order_by', width: 25 },
            { header: 'Lokasi', key: 'location_desc', width: 30 },
            { header: 'Ext', key: 'ext_phone', width: 10 },
            { header: 'Layanan', key: 'service_name', width: 25 },
            { header: 'Catatan Keluhan', key: 'catatan', width: 45 },
            { header: 'Status', key: 'status_desc', width: 15 },
            { header: 'Teknisi', key: 'teknisi', width: 25 },
        ];

        // Style Header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add Rows
        mapped.forEach((row: any) => {
            worksheet.addRow({
                ...row,
                teknisi: row.teknisi || '-'
            });
        });

        // Apply Styling to all cells
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = {
                    wrapText: true,
                    vertical: 'middle',
                    horizontal: rowNumber === 1 ? 'center' : 'left'
                };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="Orders_Export_${new Date().getTime()}.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

    } catch (error: any) {
        console.error('Export Orders Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
