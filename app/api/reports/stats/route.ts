import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'analytics_cache.json');

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

        // 6. Calculate Average Completion Time
        let averageCompletionTime = 0;
        try {
            if (fs.existsSync(CACHE_FILE_PATH)) {
                const fileContent = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
                const rawData = JSON.parse(fileContent);
                
                let totalHours = 0;
                let validCount = 0;

                const parseDate = (dateStr: string) => {
                    if (!dateStr) return null;
                    const d = new Date(dateStr);
                    return isNaN(d.getTime()) ? null : d;
                };

                let cutoffDate: Date | null = null;
                let startLimit: Date | null = null;
                let endLimit: Date | null = null;

                if (startDate && endDate) {
                    startLimit = new Date(startDate + ' 00:00:00');
                    endLimit = new Date(endDate + ' 23:59:59');
                } else if (days && days !== 'all') {
                    cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
                }

                rawData.forEach((item: any) => {
                    if (!item.history || !Array.isArray(item.history)) return;
                    
                    const orderDate = parseDate(item.order.create_date);
                    if (!orderDate) return;

                    if (startLimit && endLimit) {
                        if (orderDate < startLimit || orderDate > endLimit) return;
                    } else if (cutoffDate) {
                        if (orderDate < cutoffDate) return;
                    }

                    let followUpDate: Date | null = null;
                    let doneDate: Date | null = null;

                    item.history.forEach((h: any) => {
                        const statusName = (h.status_desc || '').toUpperCase().trim();
                        let hDate = parseDate(h.status_date) || parseDate(h.create_date);

                        if (statusName === 'FOLLOW UP' && !followUpDate) followUpDate = hDate;
                        if ((statusName === 'DONE' || statusName === 'VERIFIED') && hDate) doneDate = hDate;
                    });

                    if (followUpDate && doneDate) {
                        const diff = ((doneDate as any).getTime() - (followUpDate as any).getTime()) / (1000 * 60 * 60);
                        if (diff >= 0) {
                            totalHours += diff;
                            validCount++;
                        }
                    }
                });

                if (validCount > 0) {
                    averageCompletionTime = Number((totalHours / validCount).toFixed(1));
                }
            }
        } catch (e) {
            console.error('Error calculating avg completion time:', e);
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
                }
            }
        });
    } catch (error: any) {
        console.error('Report API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
