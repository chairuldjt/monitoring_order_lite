import { NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';
import {
  getSIMRSSummary,
  getOptimizedSIMRSOrders,
  parseSIMRSDate,
} from '@/lib/simrs-client';
import { getSystemSettings } from '@/lib/settings-helper';

/**
 * Dashboard Stats — ALL data fetched LIVE from SIMRS API with server-side caching
 * No local DB queries for orders
 */
export async function GET() {
  try {
    const payload = await getPayloadFromCookie();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Live summary counts from SIMRS (this also updates cache summary state)
    const summary = await getSIMRSSummary();
    const counts = {
      open: summary.open,
      follow_up: summary.follow_up,
      running: summary.running,
      done: summary.done,
      verified: summary.verified,
      pending: summary.pending,
    };
    const totalOrders = Object.values(counts).reduce((a, b) => a + b, 0);

    // 2. Fetch active orders for analytics (Optimized with Summary-based Caching)
    const [openOrders, followUpOrders, runningOrders, pendingOrders, doneOrders, verifiedOrders] = await Promise.all([
      getOptimizedSIMRSOrders(10), // Open
      getOptimizedSIMRSOrders(11), // Follow Up
      getOptimizedSIMRSOrders(12), // Running
      getOptimizedSIMRSOrders(13), // Pending
      getOptimizedSIMRSOrders(15), // Done
      getOptimizedSIMRSOrders(30), // Verified
    ]);

    // Combine all fetched orders for analytics
    const allActiveOrders = [...openOrders, ...followUpOrders, ...runningOrders, ...pendingOrders, ...doneOrders, ...verifiedOrders];

    // 3. Calculate orders created today (WIB timezone: Asia/Jakarta)
    const now = new Date();
    // Create Date object for start of today in WIB
    const startOfToday = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    startOfToday.setHours(0, 0, 0, 0);

    // Convert startOfToday back to Date object that can be compared with parsed SIMRS dates
    // since parsed SIMRS dates are now forced to WIB
    const todayOrders = allActiveOrders.filter(o => {
      const d = parseSIMRSDate(o.create_date);
      return d && d >= startOfToday;
    }).length;

    // 4. Find oldest order date
    let oldestDate: Date | null = null;
    allActiveOrders.forEach(o => {
      const d = parseSIMRSDate(o.create_date);
      if (d) {
        if (!oldestDate || d < oldestDate) oldestDate = d;
      }
    });

    const oldestOrderDate = oldestDate
      ? (oldestDate as Date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    // 5. Dynamic Thresholds from Settings
    const settings = await getSystemSettings();
    const overdueFollowupDays = Number(settings['overdue_followup_days']) || 1;
    const overduePendingMonths = Number(settings['overdue_pending_months']) || 1;

    // 4. Follow-up overdue: from follow_up orders where create_date is older than threshold
    const followupThresholdDate = new Date();
    followupThresholdDate.setDate(followupThresholdDate.getDate() - overdueFollowupDays);

    // Since SIMRS doesn't separate follow_up easily, we use the summary + status_desc
    const followUpOverdue = followUpOrders
      .filter(o => o.status_desc?.toUpperCase() === 'FOLLOW UP')
      .filter(o => {
        const d = parseSIMRSDate(o.create_date);
        return d && d < followupThresholdDate;
      })
      .map(o => ({
        order_no: o.order_no,
        title: (o.catatan || '').split('\n')[0]?.trim() || `Order ${o.order_no}`,
        requester_name: o.order_by,
        requester_unit: o.location_desc,
        teknisi: (o.teknisi || '').replace(/\|$/, '').trim(),
        create_date: o.create_date,
        hours_overdue: Math.round((Date.now() - (parseSIMRSDate(o.create_date)?.getTime() || Date.now())) / (1000 * 60 * 60)),
      }))
      .slice(0, 10);

    // 5. Pending overdue
    const pendingThresholdDate = new Date();
    pendingThresholdDate.setMonth(pendingThresholdDate.getMonth() - overduePendingMonths);

    const pendingOverdue = pendingOrders
      .filter(o => o.status_desc?.toUpperCase() === 'PENDING')
      .filter(o => {
        const d = parseSIMRSDate(o.create_date);
        return d && d < pendingThresholdDate;
      })
      .map(o => ({
        order_no: o.order_no,
        title: (o.catatan || '').split('\n')[0]?.trim() || `Order ${o.order_no}`,
        requester_name: o.order_by,
        requester_unit: o.location_desc,
        teknisi: (o.teknisi || '').replace(/\|$/, '').trim(),
        create_date: o.create_date,
        days_overdue: Math.round((Date.now() - (parseSIMRSDate(o.create_date)?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)),
      }))
      .slice(0, 10);

    // 5. Repeat orders — group by first line of catatan
    const titleCounts: Record<string, { count: number; units: Set<string> }> = {};
    for (const order of allActiveOrders) {
      const title = (order.catatan || '').split('\n')[0]?.trim();
      if (!title) continue;
      if (!titleCounts[title]) {
        titleCounts[title] = { count: 0, units: new Set() };
      }
      titleCounts[title].count++;
      if (order.location_desc) {
        titleCounts[title].units.add(order.location_desc);
      }
    }
    const repeatOrders = Object.entries(titleCounts)
      .filter(([, v]) => v.count > 1)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([title, v]) => ({
        title,
        count: v.count,
        units: Array.from(v.units).join(', '),
      }));

    // 6. Recent orders — most recent from all fetched orders, sorted by create_date
    const recentOrders = allActiveOrders
      .map(o => ({
        order_no: o.order_no,
        title: (o.catatan || '').split('\n')[0]?.trim() || `Order ${o.order_no}`,
        status: o.status_desc,
        requester_name: o.order_by,
        requester_unit: o.location_desc,
        teknisi: (o.teknisi || '').replace(/\|$/, '').trim(),
        create_date: o.create_date,
        _parsed_date: parseSIMRSDate(o.create_date),
      }))
      .sort((a, b) => (b._parsed_date?.getTime() || 0) - (a._parsed_date?.getTime() || 0))
      .slice(0, 10)
      .map(({ _parsed_date, ...rest }) => rest);

    return NextResponse.json({
      counts,
      totalOrders,
      todayOrders,
      oldestOrderDate,
      followUpOverdue,
      pendingOverdue,
      repeatOrders,
      recentOrders,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dari SIMRS: ' + error.message }, { status: 500 });
  }
}
