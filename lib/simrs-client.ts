/**
 * SIMRS Order API Client
 * Handles authentication and data fetching from the SIMRS Order Teknisi system.
 * API Base: http://103.148.235.37:5010
 * Auth: Custom header `access-token` with JWT
 */

import axios from 'axios';
import { cache } from './cache';

// SIMRS API Config from .env
const SIMRS_API_URL = process.env.SIMRS_API_URL || 'http://103.148.235.37:5010';
const SIMRS_USERNAME = process.env.SIMRS_USERNAME || '';
const SIMRS_PASSWORD = process.env.SIMRS_PASSWORD || '';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Status ID mapping from SIMRS
export const SIMRS_STATUS_MAP: Record<string, { id: number; local: string }> = {
    'OPEN': { id: 10, local: 'open' },
    'FOLLOW UP': { id: 11, local: 'follow_up' },
    'RUNNING': { id: 12, local: 'running' },
    'PENDING': { id: 13, local: 'pending' },
    'DONE': { id: 15, local: 'done' },
    'VERIFIED': { id: 30, local: 'verified' },
};

// Reverse map: status_id → local status
export const STATUS_ID_TO_LOCAL: Record<number, string> = {
    10: 'open',
    11: 'follow_up',
    12: 'running',
    13: 'pending',
    15: 'done',
    30: 'verified',
};

export interface SIMRSOrder {
    order_id: number;
    order_no: string;
    create_date: string;
    order_by: string;
    location_desc: string;
    ext_phone: string;
    catatan: string;
    status_desc: string;
    status_id?: number;
    teknisi: string;
}

export interface SIMRSSummary {
    open: number;
    follow_up: number;
    running: number;
    done: number;
    verified: number;
    pending: number;
}

/**
 * Login to SIMRS and get JWT token
 * Endpoint: POST /secure/auth_validate_login
 * Body: { login: string, pwd: string }
 * Response: { result: true, token: "..." }
 */
export async function simrsLogin(): Promise<string> {
    // Return cached token if still valid
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    try {
        const response = await axios.post(`${SIMRS_API_URL}/secure/auth_validate_login`, {
            login: SIMRS_USERNAME,
            pwd: SIMRS_PASSWORD,
        });

        const data = response.data;

        // Response format: { result: true, token: "eyJ..." }
        if (!data.result || !data.token) {
            console.error('[SIMRS] Login failed. Response data:', data);
            throw new Error('SIMRS login returned invalid response');
        }

        cachedToken = data.token;

        // Cache for 8 hours
        tokenExpiry = Date.now() + 8 * 60 * 60 * 1000;
        return cachedToken!;
    } catch (error: any) {
        cachedToken = null;
        tokenExpiry = 0;
        throw error;
    }
}

/**
 * Make authenticated request to SIMRS API with retry logic
 */
async function simrsFetch(endpoint: string, options: any = {}, retryCount = 0): Promise<any> {
    const token = await simrsLogin();

    try {
        const response = await axios({
            url: `${SIMRS_API_URL}${endpoint}`,
            method: options.method || 'GET',
            data: options.body ? JSON.parse(options.body) : undefined,
            headers: {
                'access-token': token,
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            timeout: 30000,
        });

        return response.data;
    } catch (error: any) {
        // Handle 429 Too Many Requests
        if (error.response?.status === 429 && retryCount < 3) {
            const delay = 5000 * (retryCount + 1);
            console.warn(`[SIMRS] 429 Too Many Requests. Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return simrsFetch(endpoint, options, retryCount + 1);
        }

        // If 401/403, invalidate token and retry once
        if ((error.response?.status === 401 || error.response?.status === 403) && retryCount === 0) {
            cachedToken = null;
            tokenExpiry = 0;
            return simrsFetch(endpoint, options, retryCount + 1);
        }
        throw new Error(`SIMRS API error: ${error.response?.status || error.message}`);
    }
}

/**
 * Get order summary counts from SIMRS
 */
export async function getSIMRSSummary(): Promise<SIMRSSummary> {
    const data = await simrsFetch('/redis/get_summary_order');
    const result = data.result || data;
    const summary = {
        open: result.open || 0,
        follow_up: result.follow_up || 0,
        running: result.running || 0,
        done: result.done || 0,
        verified: result.verified || 0,
        pending: result.pending || 0,
    };

    // Update cache summary state
    cache.setSummaryState(summary);

    return summary;
}

/**
 * Get orders by status from SIMRS (with optional caching)
 */
export async function getSIMRSOrdersByStatus(statusId: number, bypassCache = false): Promise<SIMRSOrder[]> {
    const cacheKey = `orders_status_${statusId}`;
    if (!bypassCache) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
    }

    try {
        const data = await simrsFetch(`/order/order_list_by_status/${statusId}`);
        const orders = (data.result || data.data || data || []).map((order: any) => ({
            order_id: order.order_id || order.id,
            order_no: order.order_no || '',
            create_date: order.create_date || order.created_at || '',
            order_by: order.order_by || order.requester || '',
            location_desc: order.location_desc || order.location || '',
            ext_phone: order.ext_phone || order.phone || '',
            catatan: getCleanedSIMRSNote(order),
            status_desc: order.status_desc || order.status || '',
            status_id: order.status_id,
            teknisi: (order.teknisi || '').replace(/\|$/, '').trim(),
        }));

        // Cache the result
        cache.set(cacheKey, orders);
        return orders;
    } catch (error) {
        console.error(`Error fetching status ${statusId}:`, error);
        return [];
    }
}

/**
 * Smart fetch: only refetch if summary has changed
 */
/**
 * Smart fetch: only refetch if summary has changed.
 * Uses a short-lived memory cache (5s) for the summary to avoid redundant hits in bulk fetch.
 */
export async function getOptimizedSIMRSOrders(statusId: number): Promise<SIMRSOrder[]> {
    const cachedSummaryState = cache.getSummaryState();

    // Fetch fresh summary only if strictly necessary (expired or missing)
    let freshSummary: SIMRSSummary;
    if (cachedSummaryState && (Date.now() - cachedSummaryState.timestamp < 5000)) {
        freshSummary = cachedSummaryState.counts as unknown as SIMRSSummary;
    } else {
        freshSummary = await getSIMRSSummary();
    }

    const statusMap: Record<number, keyof SIMRSSummary> = {
        10: 'open',
        11: 'follow_up',
        12: 'running',
        13: 'pending',
        15: 'done',
        30: 'verified'
    };

    const key = statusMap[statusId];

    // If counts match AND the specific list is in cache, return it
    if (cachedSummaryState && key && cachedSummaryState.counts[key] === freshSummary[key]) {
        const cachedList = cache.get(`orders_status_${statusId}`);
        if (cachedList) return cachedList;
    }

    // Force fetch and refresh cache
    return getSIMRSOrdersByStatus(statusId, true);
}

/**
 * Get single order detail from SIMRS
 */
export async function getSIMRSOrderDetail(orderId: number | string): Promise<SIMRSOrder | null> {
    try {
        const data = await simrsFetch(`/order/order_detail_by_id/${orderId}`);
        const order = data.result || data.data;
        if (!order) return null;

        return {
            order_id: order.order_id || order.id,
            order_no: order.order_no || '',
            create_date: order.create_date || '',
            order_by: order.order_by || order.requester || '',
            location_desc: order.location_desc || '',
            ext_phone: order.ext_phone || '',
            catatan: getCleanedSIMRSNote(order),
            status_desc: order.status_desc || '',
            status_id: parseInt(order.status_code) || order.status_id,
            teknisi: (order.nama_teknisi || order.teknisi || '').replace(/\|$/, '').trim(),
        };
    } catch (error) {
        console.error(`Error fetching order detail ${orderId}:`, error);
        return null;
    }
}

/**
 * Get order history from SIMRS
 */
export async function getSIMRSOrderHistory(orderId: number | string): Promise<any[]> {
    try {
        const data = await simrsFetch(`/order/order_history_by_id/${orderId}`);
        return data.result || data.data || [];
    } catch (error) {
        console.error(`Error fetching order history ${orderId}:`, error);
        return [];
    }
}

/**
 * Get order photos from SIMRS
 */
export async function getSIMRSOrderPhotos(orderId: number | string): Promise<any[]> {
    try {
        const data = await simrsFetch(`/order/order_photos/${orderId}`);
        return data.result || data.data || [];
    } catch (error) {
        console.error(`Error fetching order photos ${orderId}:`, error);
        return [];
    }
}

/**
 * Get repair/perbaikan list from SIMRS
 */
export async function getSIMRSRepairList(filter: string = ''): Promise<any[]> {
    const data = await simrsFetch('/repair/list', {
        method: 'POST',
        body: JSON.stringify({ filter }),
    });
    return data.result || data.data || data || [];
}

/**
 * Find order by order_no by searching through status lists (Live)
 */
export async function findSIMRSOrderByNo(orderNo: string): Promise<SIMRSOrder | null> {
    const statusIds = [10, 11, 12, 13, 15, 30];
    for (const sid of statusIds) {
        const orders = await getSIMRSOrdersByStatus(sid);
        const found = orders.find(o => o.order_no === orderNo);
        if (found) return found;
    }
    return null;
}

/**
 * Parse SIMRS date format "DD Mon YY - HH:mm" to Date object
 */
export function parseSIMRSDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
        // Try standard date parse first
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;

        const months: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
        };

        // Format A: "DD Mon YY - HH:mm" (e.g. "25 Feb 26 - 15:04")
        const matchA = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{2,4})\s*-?\s*(\d{2}):(\d{2})/);
        if (matchA) {
            const day = parseInt(matchA[1]);
            const month = months[matchA[2]];
            let year = parseInt(matchA[3]);
            if (year < 100) year += 2000;
            const hour = parseInt(matchA[4]);
            const minute = parseInt(matchA[5]);

            // Assume Asia/Jakarta (WIB)
            const date = new Date(year, month, day, hour, minute);
            const wibOffset = 7 * 60; // WIB is UTC+7
            const localOffset = date.getTimezoneOffset(); // in minutes
            date.setMinutes(date.getMinutes() + localOffset + wibOffset);
            return date;
        }

        // Format B: "Mon DD YYYY HH:mmAM/PM" (e.g. "Feb 25 2026  9:14PM")
        const matchB = dateStr.match(/(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})(AM|PM)?/i);
        if (matchB) {
            const month = months[matchB[1]];
            const day = parseInt(matchB[2]);
            const year = parseInt(matchB[3]);
            let hour = parseInt(matchB[4]);
            const minute = parseInt(matchB[5]);
            const ampm = matchB[6]?.toUpperCase();

            if (ampm === 'PM' && hour < 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;

            // Assume Asia/Jakarta (WIB)
            const date = new Date(year, month, day, hour, minute);
            const wibOffset = 7 * 60;
            const localOffset = date.getTimezoneOffset();
            date.setMinutes(date.getMinutes() + localOffset + wibOffset);
            return date;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Map SIMRS status description to local status
 */
export function mapSIMRSStatus(statusDesc: string): string {
    const upper = (statusDesc || '').toUpperCase().trim();
    const mapping = SIMRS_STATUS_MAP[upper];
    return mapping?.local || 'open';
}

/**
 * Clean and prioritize SIMRS order notes to ensure meaningful text is displayed.
 * Filters out "fake" notes that only contain the order number.
 */
export function getCleanedSIMRSNote(order: any): string {
    const rawNote = (order.catatan || order.note || order.description || '').trim();
    const orderNo = (order.order_no || '').trim();

    // If the note is essentially just the order number, treat it as empty
    if (rawNote === orderNo || rawNote.toLowerCase() === `order ${orderNo.toLowerCase()}`) {
        return '';
    }

    return rawNote;
}

/**
 * Test SIMRS connection
 */
export async function testSIMRSConnection(): Promise<{ success: boolean; message: string; summary?: SIMRSSummary }> {
    try {
        await simrsLogin();
        const summary = await getSIMRSSummary();
        return {
            success: true,
            message: 'Connected to SIMRS successfully',
            summary,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `SIMRS connection failed: ${error.message}`,
        };
    }
}
