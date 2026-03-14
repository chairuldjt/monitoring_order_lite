/**
 * SIMRS Order API Client
 * Handles authentication and data fetching from the SIMRS Order Teknisi system.
 */

import axios from 'axios';

// SIMRS API Config from .env
const SIMRS_API_URL = process.env.SIMRS_API_URL || 'http://103.148.235.37:5010';
const SIMRS_USERNAME = process.env.SIMRS_USERNAME || '';
const SIMRS_PASSWORD = process.env.SIMRS_PASSWORD || '';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Status ID mapping from SIMRS
export const SIMRS_STATUS_MAP: Record<number, { id: number; local: string; label: string }> = {
    10: { id: 10, local: 'open', label: 'OPEN' },
    11: { id: 11, local: 'follow_up', label: 'FOLLOW UP' },
    12: { id: 12, local: 'running', label: 'RUNNING' },
    13: { id: 13, local: 'pending', label: 'PENDING' },
    15: { id: 15, local: 'done', label: 'DONE' },
    30: { id: 30, local: 'verified', label: 'VERIFIED' },
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
    service_catalog_id?: number | string;
    teknisi: string;
    service_name?: string;
    follow_up_date?: string | null;
    done_date?: string | null;
}

export interface SIMRSSummary {
    all?: number;
    open: number;
    follow_up: number;
    running: number;
    done: number;
    verified: number;
    pending: number;
}

// Internal cache storage
const internalCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for lists
const DETAIL_CACHE_TTL = 60 * 60 * 1000; // 1 hour for order details - much longer to improve speed

export const cacheManager = {
    get: (key: string): any | undefined => {
        const entry = internalCache.get(key);
        const ttl = key.startsWith('order_detail_') ? DETAIL_CACHE_TTL : CACHE_TTL;
        if (entry && Date.now() - entry.timestamp < ttl) {
            return entry.data;
        }
        internalCache.delete(key);
        return undefined;
    },
    set: (key: string, data: any) => {
        internalCache.set(key, { data, timestamp: Date.now() });
    },
    delete: (key: string) => {
        internalCache.delete(key);
    },
    clear: () => {
        internalCache.clear();
    },
    getSummaryState: (): { counts: SIMRSSummary; timestamp: number } | undefined => {
        const entry = internalCache.get('summary_state');
        if (entry && Date.now() - entry.timestamp < 5000) {
            return entry.data;
        }
        internalCache.delete('summary_state');
        return undefined;
    },
    setSummaryState: (summary: SIMRSSummary) => {
        internalCache.set('summary_state', { 
            data: { counts: summary, timestamp: Date.now() }, 
            timestamp: Date.now() 
        });
    }
};

/**
 * Login to SIMRS and get JWT token
 */
export async function simrsLogin(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    try {
        const response = await axios.post(`${SIMRS_API_URL}/secure/auth_validate_login`, {
            login: SIMRS_USERNAME,
            pwd: SIMRS_PASSWORD,
        });

        const data = response.data;
        if (!data.result || !data.token) {
            throw new Error('SIMRS login failed');
        }

        cachedToken = data.token;
        tokenExpiry = Date.now() + 8 * 60 * 60 * 1000;
        return cachedToken!;
    } catch (error: any) {
        cachedToken = null;
        tokenExpiry = 0;
        throw error;
    }
}

/**
 * Make authenticated request to SIMRS API
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
        if (error.response?.status === 429 && retryCount < 3) {
            const delay = 5000 * (retryCount + 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            return simrsFetch(endpoint, options, retryCount + 1);
        }
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
    cacheManager.setSummaryState(summary);
    return summary;
}

/**
 * Get orders by status from SIMRS
 */
export async function getSIMRSOrdersByStatus(statusId: number, bypassCache = false): Promise<SIMRSOrder[]> {
    const cacheKey = `orders_status_${statusId}`;
    if (!bypassCache) {
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;
    }

    try {
        const data = await simrsFetch(`/order/order_list_by_status/${statusId}`);
        const rawOrders = data.result || data.data || data || [];
        const orders = rawOrders.map((order: any) => {
            const rawDate = order.create_date || order.created_at || '';
            const parsedDate = parseSIMRSDate(rawDate);
            
            return {
                order_id: order.order_id || order.id,
                order_no: order.order_no || '',
                create_date: parsedDate ? formatToStandardDate(parsedDate) : rawDate,
                order_by: order.order_by || order.requester || '',
                location_desc: order.location_desc || order.location || '',
                ext_phone: order.ext_phone || order.phone || '',
                catatan: getCleanedSIMRSNote(order),
                status_desc: order.status_desc || order.status || '',
                status_id: order.status_id,
                service_catalog_id: order.service_catalog_id || order.service_id,
                teknisi: (order.teknisi || '').replace(/\|$/, '').trim(),
                service_name: order.service_name || order.service || '',
            };
        });

        cacheManager.set(cacheKey, orders);
        return orders;
    } catch (error) {
        console.error(`Error fetching status ${statusId}:`, error);
        return [];
    }
}

/**
 * Smart fetch: only refetch if summary has changed
 */
export async function getOptimizedSIMRSOrders(statusId: number): Promise<SIMRSOrder[]> {
    const cachedSummaryState = cacheManager.getSummaryState();

    let freshSummary: SIMRSSummary;
    if (cachedSummaryState && (Date.now() - cachedSummaryState.timestamp < 5000)) {
        freshSummary = cachedSummaryState.counts;
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
    if (cachedSummaryState && key && cachedSummaryState.counts[key] === freshSummary[key]) {
        const cachedList = cacheManager.get(`orders_status_${statusId}`);
        if (cachedList) return cachedList;
    }

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

        const rawDate = order.create_date || order.created_at || order.status_date || '';
        const parsedDate = parseSIMRSDate(rawDate);

        const result: SIMRSOrder = {
            order_id: order.order_id || order.id,
            order_no: order.order_no || '',
            create_date: parsedDate ? formatToStandardDate(parsedDate) : rawDate,
            order_by: order.order_by || order.requester || '',
            location_desc: order.location_desc || '',
            ext_phone: order.ext_phone || '',
            catatan: getCleanedSIMRSNote(order),
            status_desc: order.status_desc || '',
            status_id: parseInt(order.status_code) || order.status_id,
            service_catalog_id: order.service_catalog_id || order.service_id,
            teknisi: (order.nama_teknisi || order.teknisi || '').replace(/\|$/, '').trim(),
            service_name: order.service_name || order.service || '',
        };

        // If order_by is still empty, we can't easily get it here without history
        // but we'll let the merge logic handle it
        return result;
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
        return [];
    }
}

/**
 * Find order by order_no
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
 * Parse SIMRS date format
 */
export function parseSIMRSDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;

        const months: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
            'Mei': 4, 'Des': 11, 'Ags': 7, 'Agu': 7, 'Okt': 9,
        };

        const matchA = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{2,4})\s*-?\s*(\d{2}):(\d{2})/);
        if (matchA) {
            const day = parseInt(matchA[1]);
            const month = months[matchA[2]];
            let year = parseInt(matchA[3]);
            if (year < 100) year += 2000;
            const hour = parseInt(matchA[4]);
            const minute = parseInt(matchA[5]);
            return new Date(year, month, day, hour, minute);
        }

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
            return new Date(year, month, day, hour, minute);
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Format Date object to standard SIMRS string
 */
export function formatToStandardDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = date.getDate().toString().padStart(2, '0');
    const m = months[date.getMonth()];
    const y = date.getFullYear().toString().slice(-2);
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${d} ${m} ${y} - ${h}:${min}`;
}

/**
 * Map SIMRS status description to local status
 */
export function mapSIMRSStatus(statusDesc: string): string {
    const upper = (statusDesc || '').toUpperCase().trim();
    const foundStatus = Object.values(SIMRS_STATUS_MAP).find(status => status.label === upper);
    return foundStatus?.local || 'open';
}

/**
 * Clean SIMRS order notes
 */
export function getCleanedSIMRSNote(order: any): string {
    const rawNote = (order.catatan || order.note || order.description || '').trim();
    const orderNo = (order.order_no || '').trim();
    if (rawNote === orderNo || rawNote.toLowerCase() === `order ${orderNo.toLowerCase()}`) {
        return '';
    }
    return rawNote;
}

/**
 * Enhanced fetch: Gets orders and populates their details
 */
export async function getSIMRSOrdersWithDetails(statusIds: number[]): Promise<SIMRSOrder[]> {
    const allOrdersList: SIMRSOrder[] = [];
    for (const sid of statusIds) {
        const list = await getOptimizedSIMRSOrders(sid);
        allOrdersList.push(...list);
    }
    if (allOrdersList.length === 0) return [];

    // Use higher concurrency for bulk detail fetching
    const CONCURRENCY_LIMIT = 15; 
    const finalResults: SIMRSOrder[] = [];
    
    for (let i = 0; i < allOrdersList.length; i += CONCURRENCY_LIMIT) {
        const currentBatch = allOrdersList.slice(i, i + CONCURRENCY_LIMIT);
        const batchResponses = await Promise.all(
            currentBatch.map(async (o) => {
                const uniqueId = o.order_id;
                const cacheName = `order_detail_v2_${uniqueId}`; // New cache version for history
                const cachedData = cacheManager.get(cacheName);
                
                let detailedInfo: SIMRSOrder | null = cachedData;
                if (!detailedInfo) {
                    detailedInfo = await getSIMRSOrderDetail(uniqueId);
                    if (detailedInfo) {
                        // Fetch history for dates
                        const history = await getSIMRSOrderHistory(uniqueId);
                        let fDate: Date | null = null;
                        let dDate: Date | null = null;

                        history.forEach((h: any) => {
                            const sDesc = (h.status_desc || '').toUpperCase().trim();
                            const hDate = parseSIMRSDate(h.status_date) || parseSIMRSDate(h.create_date);
                            if (sDesc === 'FOLLOW UP' && !fDate) fDate = hDate;
                            if ((sDesc === 'DONE' || sDesc === 'VERIFIED') && !dDate) dDate = hDate;
                        });

                        detailedInfo.follow_up_date = (fDate instanceof Date) ? fDate.toISOString() : null;
                        detailedInfo.done_date = (dDate instanceof Date) ? dDate.toISOString() : null;
                        cacheManager.set(cacheName, detailedInfo);
                    }
                }

                if (detailedInfo) {
                    const merged = { ...o };
                    (Object.keys(detailedInfo) as Array<keyof SIMRSOrder>).forEach(key => {
                        if (detailedInfo[key] && detailedInfo[key] !== '') {
                            (merged as any)[key] = detailedInfo[key];
                        }
                    });
                    return merged;
                }
                return o;
            })
        );
        finalResults.push(...batchResponses);
    }
    return finalResults;
}
