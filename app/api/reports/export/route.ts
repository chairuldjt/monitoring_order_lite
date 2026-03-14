import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const days = searchParams.get('days'); 
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let dateFilter = "";
        let queryParams: any[] = [];

        if (startDate && endDate) {
            dateFilter = "WHERE create_date BETWEEN ? AND ?";
            queryParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
        } else if (days && days !== 'all') {
            dateFilter = "WHERE create_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)";
            queryParams = [parseInt(days)];
        }

        const query = `
            SELECT 
                order_no, 
                create_date, 
                order_by, 
                location_desc, 
                ext_phone, 
                catatan, 
                status_desc, 
                service_name, 
                teknisi 
            FROM simrs_orders_cache 
            ${dateFilter}
            ORDER BY create_date DESC
        `;

        const [rows]: any = await pool.query(query, queryParams);

        // Create Excel Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Orders Report');

        // Define Columns
        worksheet.columns = [
            { header: 'No. Order', key: 'order_no', width: 20 },
            { header: 'Tanggal', key: 'create_date', width: 20 },
            { header: 'Pelapor', key: 'order_by', width: 25 },
            { header: 'Lokasi', key: 'location_desc', width: 30 },
            { header: 'Ext', key: 'ext_phone', width: 10 },
            { header: 'Layanan', key: 'service_name', width: 30 },
            { header: 'Catatan', key: 'catatan', width: 40 },
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
        rows.forEach((row: any) => {
            worksheet.addRow({
                ...row,
                create_date: new Date(row.create_date).toLocaleString('id-ID'),
                teknisi: row.teknisi || '-'
            });
        });

        // Apply Styling to all cells (Borders, Wrap Text, Alignment)
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                // Add Borders
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // Add Alignment & Wrap Text
                cell.alignment = {
                    wrapText: true,
                    vertical: 'middle',
                    horizontal: rowNumber === 1 ? 'center' : 'left'
                };
            });

            // Set row height for better readability if text wraps
            if (rowNumber > 1) {
                row.height = undefined; // Auto height based on content
            }
        });

        // Generate Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Return as Response
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="Order_Report_${new Date().getTime()}.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

    } catch (error: any) {
        console.error('Export API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
