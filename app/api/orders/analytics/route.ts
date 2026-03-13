import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import { getSIMRSOrdersByStatus, getSIMRSOrderHistory, parseSIMRSDate } from '@/lib/simrs-client';
import fs from 'fs';
import path from 'path';

const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'analytics_cache.json');

export async function GET(request: Request) {
    try {
        const payload = await getPayloadFromCookie();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const viewType = searchParams.get('type') || 'weekly'; // daily, weekly, monthly
        const selectedMonth = searchParams.get('month'); // "1" - "12"
        const selectedYear = searchParams.get('year'); // "2024", etc.
        const action = searchParams.get('action'); // "recalculate"

        let rawData: any[] = [];

        // --- Recalculation Flow ---
        if (action === 'recalculate' || !fs.existsSync(CACHE_FILE_PATH)) {
            console.log('[Analytics API] Running full recalculation...');

            // 1. Fetch all DONE and VERIFIED orders
            let doneOrders = await getSIMRSOrdersByStatus(15);
            let verifiedOrders = await getSIMRSOrdersByStatus(30);

            let allRecalculateOrders = [...(doneOrders || []), ...(verifiedOrders || [])];
            console.log(`[Analytics API] Found ${allRecalculateOrders.length} orders raw from SIMRS (Done & Verified)`);

            if (allRecalculateOrders.length === 0) {
                console.log('[Analytics API] Returning early: No orders found');
                rawData = [];
            } else {
                // Limit concurrent requests to avoid SIMRS API timeout
                const concurrencyLimit = 10;

                for (let i = 0; i < allRecalculateOrders.length; i += concurrencyLimit) {
                    const chunk = allRecalculateOrders.slice(i, i + concurrencyLimit);
                    const chunkHistories = await Promise.all(
                        chunk.map(async (order: any) => {
                            const history = await getSIMRSOrderHistory(order.order_id);
                            return { order, history };
                        })
                    );
                    rawData.push(...chunkHistories);
                }
                console.log(`[Analytics API] Successfully fetched histories for ${rawData.length} orders`);

                // Save to local cache
                fs.mkdirSync(path.dirname(CACHE_FILE_PATH), { recursive: true });
                fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(rawData, null, 2), 'utf8');
                console.log('[Analytics API] Saved raw data to cache file');
            }
        } else {
            // --- Use Cached Data ---
            console.log('[Analytics API] Using cached data');
            const fileContent = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
            rawData = JSON.parse(fileContent);
        }

        // EXTRACT ALL UNIQUE TECHNICIANS BEFORE FILTERING
        // So the frontend dropdown always has a complete list
        const allTechnicians = new Set<string>();
        rawData.forEach(item => {
            if (item.order && item.order.teknisi) {
                const techName = item.order.teknisi.trim();
                if (techName) allTechnicians.add(techName);
            }
        });
        const techniciansList = Array.from(allTechnicians).sort();

        // --- Filtering Flow ---
        if (selectedMonth || selectedYear) {
            rawData = rawData.filter(item => {
                const date = parseSIMRSDate(item.order.create_date);
                if (!date) return false;

                let matches = true;
                if (selectedMonth) {
                    matches = matches && (date.getMonth() + 1).toString() === selectedMonth;
                }
                if (selectedYear) {
                    matches = matches && date.getFullYear().toString() === selectedYear;
                }
                return matches;
            });
            console.log(`[Analytics API] Filtered to ${rawData.length} orders for ${selectedMonth}/${selectedYear}`);
        }


        // 2. Process histories to find "FOLLOW UP" -> "DONE" duration & group by period & technician
        type TechnicianStat = { totalHours: number, count: number, orders: any[] };
        const groupMap = new Map<string, {
            totalHours: number,
            count: number,
            orders: any[],
            technicians: Map<string, TechnicianStat>
        }>();

        const getWeekNumber = (d: Date) => {
            const date = new Date(d.getTime());
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 4 - (date.getDay() || 7));
            const yearStart = new Date(date.getFullYear(), 0, 1);
            return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };

        const getGroupKey = (date: Date | null, type: string) => {
            if (!date || isNaN(date.getTime())) return null;
            const year = date.getFullYear();

            if (type === 'daily') {
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            } else if (type === 'monthly') {
                const month = String(date.getMonth() + 1).padStart(2, '0');
                return `${year}-${month}`;
            } else { // weekly
                const weekNum = getWeekNumber(date);
                return `${year}-W${String(weekNum).padStart(2, '0')}`;
            }
        };

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

        rawData.forEach(({ order, history }) => {
            if (!history || !Array.isArray(history)) return;

            let followUpDate: Date | null = null;
            let doneDate: Date | null = null;

            // Sort history by date asc
            const sortedHistory = [...history].sort((a, b) => {
                const da = parseSIMRSDate(a.status_date || a.create_date)?.getTime() || 0;
                const db = parseSIMRSDate(b.status_date || b.create_date)?.getTime() || 0;
                return da - db;
            });

            for (const h of sortedHistory) {
                const statusName = (h.status_desc || '').toUpperCase().trim();
                // User logic precedence: status_date is when action occurred locally, create_date is server time
                let hDate = parseSIMRSDate(h.status_date);
                if (!hDate || isNaN(hDate.getTime())) {
                    hDate = h.create_date ? new Date(h.create_date) : null;
                }

                if (statusName === 'FOLLOW UP' && !followUpDate) followUpDate = hDate;
                if (statusName === 'DONE' || statusName === 'VERIFIED') doneDate = hDate; // Catch VERIFIED as end too if DONE is missing
            }

            // Removed fallback to order.create_date so we strictly measure from "FOLLOW UP"
            if (!doneDate) {
                if (sortedHistory.length > 0) {
                    const lastLog = sortedHistory[sortedHistory.length - 1];
                    doneDate = lastLog.create_date ? new Date(lastLog.create_date) : parseSIMRSDate(lastLog.status_date);
                } else if (order.create_date) {
                    doneDate = new Date(order.create_date);
                }
            }

            if (followUpDate && doneDate) {
                const start = followUpDate.getTime();
                const end = doneDate.getTime();
                if (isNaN(start) || isNaN(end)) return;

                let diffHours = (end - start) / (1000 * 60 * 60);
                if (diffHours < 0) diffHours = 0;

                const groupKey = getGroupKey(followUpDate, viewType);
                if (groupKey) {
                    if (!groupMap.has(groupKey)) {
                        groupMap.set(groupKey, { totalHours: 0, count: 0, orders: [], technicians: new Map() });
                    }
                    const gData = groupMap.get(groupKey)!;

                    // Period Level Stats
                    gData.totalHours += diffHours;
                    gData.count += 1;
                    const orderData = {
                        order_no: order.order_no,
                        title: order.catatan || order.order_no,
                        follow_up_date: followUpDate.toISOString(),
                        done_date: doneDate.toISOString(),
                        duration_hours: Number(diffHours.toFixed(2)),
                        teknisi: order.teknisi || 'Tidak Diketahui'
                    };
                    gData.orders.push(orderData);

                    // Technician Level Stats
                    const techName = orderData.teknisi.toUpperCase();
                    const techMap = gData.technicians;
                    if (!techMap.has(techName)) {
                        techMap.set(techName, { totalHours: 0, count: 0, orders: [] });
                    }
                    const tData = techMap.get(techName)!;
                    tData.totalHours += diffHours;
                    tData.count += 1;
                    tData.orders.push(orderData);
                }
            }
        });

        // 3. Format into array for Recharts and Table
        const chartData = Array.from(groupMap.entries()).map(([key, value]) => {
            let label = key;
            if (viewType === 'monthly') {
                const [year, month] = key.split('-');
                label = `${monthNames[parseInt(month) - 1]} ${year}`;
            } else if (viewType === 'weekly') {
                const year = parseInt(key.split('-')[0]);
                const week = parseInt(key.split('-W')[1]);
                const d = new Date(year, 0, 1);
                const dayNum = d.getDay() || 7;
                d.setDate(d.getDate() + 4 - dayNum);
                d.setDate(d.getDate() - 3 + (week - 1) * 7);

                const startDay = d.getDate();
                const startMonth = monthNames[d.getMonth()];
                const startYear = d.getFullYear();

                d.setDate(d.getDate() + 6); // Shift to Sunday
                const endDay = d.getDate();
                const endMonth = monthNames[d.getMonth()];
                const endYear = d.getFullYear();

                if (startYear !== endYear) {
                    label = `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
                } else if (startMonth !== endMonth) {
                    label = `${startDay} ${startMonth} - ${endDay} ${endMonth} (${endYear})`;
                } else {
                    label = `${startDay} - ${endDay} ${startMonth} (${endYear})`;
                }
            } else if (viewType === 'daily') {
                const [year, month, day] = key.split('-');
                label = `${day} ${monthNames[parseInt(month) - 1]}`;
            }

            // Format technicians for this period
            const sortedTechnicians = Array.from(value.technicians.entries()).map(([techName, techStats]) => ({
                name: techName,
                averageHours: techStats.count > 0 ? Number((techStats.totalHours / techStats.count).toFixed(2)) : 0,
                orderCount: techStats.count
            })).sort((a, b) => a.averageHours - b.averageHours); // Sort by fastest first

            return {
                rawKey: key,
                label,
                averageHours: value.count > 0 ? Number((value.totalHours / value.count).toFixed(2)) : 0,
                orderCount: value.count,
                technicians: sortedTechnicians,
                details: value.orders.sort((a, b) => b.duration_hours - a.duration_hours)
            };
        }).sort((a, b) => a.rawKey.localeCompare(b.rawKey));

        return NextResponse.json({
            success: true,
            data: chartData,
            technicians: techniciansList,
            viewType
        });

    } catch (error: any) {
        console.error('Analytics API error:', error);
        return NextResponse.json({ error: 'Gagal memproses analitik: ' + error.message }, { status: 500 });
    }
}
