import pool from '../lib/db';
import { getOptimizedSIMRSOrders, parseSIMRSDate } from '../lib/simrs-client';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function getOrdersForRange(startDate: string, endDate: string) {
    const statusIds = [10, 11, 12, 13, 15, 30];
    const allOrdersPromises = statusIds.map(sid => getOptimizedSIMRSOrders(sid));
    const allResponse = await Promise.all(allOrdersPromises);
    const allOrders = allResponse.flat();

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = allOrders.filter(o => {
        const oDate = parseSIMRSDate(o.create_date);
        return oDate && oDate >= start && oDate <= end;
    }).map(o => ({
        order_no: o.order_no,
        title: (o.catatan || '').split('\n')[0]?.trim(),
        unit: o.location_desc,
        date: o.create_date
    }));

    console.log(JSON.stringify(filtered));
    await pool.end();
}

getOrdersForRange('2026-01-01', '2026-01-30').catch(console.error);
