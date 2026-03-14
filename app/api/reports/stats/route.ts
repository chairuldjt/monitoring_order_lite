import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';

export async function GET(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const days = searchParams.get('days'); // 7, 30, 90, 'all'
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

        // Helper to append date filter to raw queries
        const getQuery = (base: string, tail: string = "") => {
            if (dateFilter) {
                // If base already has WHERE, use AND
                if (base.toUpperCase().includes("WHERE")) {
                    return `${base} ${dateFilter.replace("WHERE", "AND")} ${tail}`;
                }
                return `${base} ${dateFilter} ${tail}`;
            }
            return `${base} ${tail}`;
        };

        // 1. Trends - Orders per Day
        const [trends]: any = await pool.query(getQuery(`
            SELECT DATE(create_date) as date, COUNT(*) as count 
            FROM simrs_orders_cache 
        `, `GROUP BY DATE(create_date) ORDER BY date ASC`), queryParams);

        // 2. Status Distribution
        const [statusDist]: any = await pool.query(getQuery(`
            SELECT status_desc as name, COUNT(*) as value 
            FROM simrs_orders_cache 
        `, `GROUP BY status_desc ORDER BY value DESC`), queryParams);

        // 3. Top Locations
        const [topLocations]: any = await pool.query(getQuery(`
            SELECT location_desc as name, COUNT(*) as value 
            FROM simrs_orders_cache 
            WHERE location_desc IS NOT NULL AND location_desc != ''
        `, `GROUP BY location_desc ORDER BY value DESC LIMIT 10`), queryParams);

        // 4. Top Services
        const [topServices]: any = await pool.query(getQuery(`
            SELECT service_name as name, COUNT(*) as value 
            FROM simrs_orders_cache 
            WHERE service_name IS NOT NULL AND service_name != ''
        `, `GROUP BY service_name ORDER BY value DESC LIMIT 10`), queryParams);

        // 5. Total Summary
        const [summary]: any = await pool.query(getQuery(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status_id IN (15, 30) THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN LOWER(status_desc) LIKE '%open%' OR status_id = 10 THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status_id IN (11, 12) THEN 1 ELSE 0 END) as running,
                SUM(CASE WHEN status_id = 13 THEN 1 ELSE 0 END) as pending
            FROM simrs_orders_cache
        `), queryParams);

        // 6. Calculate Average Completion Time from Database
        let averageCompletionTime = 0;
        try {
            const [avgRows]: any = await pool.query(getQuery(`
                SELECT AVG(TIMESTAMPDIFF(SECOND, follow_up_date, done_date)) / 3600 as avg_hours
                FROM simrs_orders_cache
                WHERE follow_up_date IS NOT NULL AND done_date IS NOT NULL 
                AND done_date >= follow_up_date
            `), queryParams);

            if (avgRows[0] && avgRows[0].avg_hours) {
                averageCompletionTime = Number(parseFloat(avgRows[0].avg_hours).toFixed(1));
            }
        } catch (e) {
            console.error('Error calculating avg completion time from SQL:', e);
        }

        // 7. Get last sync time
        let lastSync = null;
        try {
            const [syncRow]: any = await pool.query('SELECT MAX(last_synced) as last_sync FROM simrs_orders_cache');
            if (syncRow[0] && syncRow[0].last_sync) {
                lastSync = syncRow[0].last_sync;
            }
        } catch (e) {
            console.error('Error fetching last sync:', e);
        }

        return NextResponse.json({
            data: {
                trends,
                statusDist,
                topLocations,
                topServices,
                summary: {
                    ...summary[0],
                    averageCompletionTime
                },
                lastSync
            }
        });
    } catch (error: any) {
        console.error('Report API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

