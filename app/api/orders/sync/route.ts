import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getSIMRSOrdersWithDetails, parseSIMRSDate } from '@/lib/simrs-client';
import pool from '@/lib/db';

export async function POST(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Status IDs we want to sync
        const statusIds = [10, 11, 12, 13, 15, 30];
        
        console.log('🔄 Starting SIMRS sync for repeat orders...');
        const orders = await getSIMRSOrdersWithDetails(statusIds);
        
        if (orders.length === 0) {
            return NextResponse.json({ message: 'No orders found to sync', count: 0 });
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // We use UPSERT (INSERT ... ON DUPLICATE KEY UPDATE)
            const query = `
                INSERT INTO simrs_orders_cache 
                (order_id, order_no, create_date, order_by, location_desc, ext_phone, catatan, status_desc, status_id, service_catalog_id, service_name, teknisi)
                VALUES ?
                ON DUPLICATE KEY UPDATE
                order_no = VALUES(order_no),
                create_date = VALUES(create_date),
                order_by = VALUES(order_by),
                location_desc = VALUES(location_desc),
                ext_phone = VALUES(ext_phone),
                catatan = VALUES(catatan),
                status_desc = VALUES(status_desc),
                status_id = VALUES(status_id),
                service_catalog_id = VALUES(service_catalog_id),
                service_name = VALUES(service_name),
                teknisi = VALUES(teknisi),
                last_synced = CURRENT_TIMESTAMP
            `;

            const values = orders.map(o => {
                const parsedDate = parseSIMRSDate(o.create_date);
                // Convert to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
                const mysqlDate = parsedDate ? parsedDate.toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');
                
                return [
                    o.order_id,
                    o.order_no,
                    mysqlDate,
                    o.order_by,
                    o.location_desc,
                    o.ext_phone,
                    o.catatan,
                    o.status_desc,
                    o.status_id,
                    o.service_catalog_id?.toString(),
                    o.service_name,
                    o.teknisi
                ];
            });

            // Chunk large inserts if necessary, but 10-100 orders should be fine in one go
            // SIMRS usually has < 500 active orders
            await connection.query(query, [values]);

            await connection.commit();
            console.log(`✅ Synced ${orders.length} orders to local cache`);
            
            return NextResponse.json({ 
                success: true, 
                message: `Berhasil sinkronisasi ${orders.length} data.`,
                count: orders.length 
            });
        } catch (error: any) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: 'Gagal sinkronisasi: ' + error.message }, { status: 500 });
    }
}
