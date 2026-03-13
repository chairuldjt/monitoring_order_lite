import pool from './db';
import { getOptimizedSIMRSOrders, parseSIMRSDate } from './simrs-client';
import axios from 'axios';

export async function processAIAnalysis(startDate?: string, endDate?: string, model: string = 'gemini-1.5-flash', providedOrders?: any[]) {
    const isAssistantMode = model === 'assistant';

    // 1. Get API Key (Don't require if assistant mode)
    let apiKey = '';
    if (!isAssistantMode) {
        const [settings]: any = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key' LIMIT 1");
        apiKey = settings[0]?.setting_value;
        if (!apiKey) {
            throw new Error('API Key Gemini belum diatur di Pengaturan');
        }
    }

    // 2. Data Retrieval
    let allOrders: any[] = [];

    if (providedOrders) {
        console.log(`[AI Handler] Using ${providedOrders.length} provided orders (Raw Data Mode)`);
        allOrders = providedOrders;
    } else {
        // Fetch orders and filter by date locally
        const statusIds = [10, 11, 12, 13, 15, 30]; // All statuses
        console.log(`[AI Handler] Fetching orders for statuses: ${statusIds.join(', ')}`);
        for (const sid of statusIds) {
            const orders = await getOptimizedSIMRSOrders(sid);
            allOrders = [...allOrders, ...orders];
            // Longer delay to avoid 429
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // 3. Local Filtering
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const filteredOrders = allOrders.filter(o => {
        const oDate = parseSIMRSDate(o.create_date);
        if (!oDate) return false;
        if (start && oDate < start) return false;
        if (end && oDate > end) return false;
        return true;
    }).map(o => ({
        id: o.order_no,
        title: (o.catatan || o.catatan_clean || '').split('\n')[0]?.trim(),
        unit: o.location_desc,
        date: o.create_date
    })).filter(o => o.title);

    if (filteredOrders.length === 0) {
        throw new Error('Tidak ada data order pada rentang tanggal tersebut');
    }

    // 3. Hybrid Pre-Aggregation (Lokal)
    const problemAggregates: Record<string, { count: number; units: Set<string>; orderNos: string[] }> = {};

    filteredOrders.forEach((order: any) => {
        const firstLine = order.title; // Already taken split[0] in map
        if (!firstLine) return;

        if (!problemAggregates[firstLine]) {
            problemAggregates[firstLine] = { count: 0, units: new Set(), orderNos: [] };
        }
        problemAggregates[firstLine].count++;
        if (order.unit) problemAggregates[firstLine].units.add(order.unit);
        problemAggregates[firstLine].orderNos.push(order.id);
    });

    // Ubah ke format ringkas untuk AI
    const aggregatedList = Object.entries(problemAggregates).map(([text, data], index) => ({
        idx: index,
        text,
        total: data.count,
        units: Array.from(data.units).slice(0, 5).join(', '), // Even smaller units list for prompt safety
    })).sort((a, b) => b.total - a.total);

    // 4. Handle Assistant Mode (Manual)
    if (isAssistantMode) {
        console.log('\n=== ASSISTANT MANUAL ANALYSIS DATA ===');
        console.log(JSON.stringify(aggregatedList, null, 2));
        console.log('========================================\n');
        throw new Error('MODAL_PAUSE: Data sudah dikirim ke Assistant. Silakan tunggu Assistant memproses dan melakukan injection.');
    }

    // 4. Prepare AI Prompt
    const prompt = `
    Saya memiliki ringkasan data order perbaikan IT.
    Terdapat ${aggregatedList.length} kelompok masalah unik dari total ${filteredOrders.length} order.
    
    Data Ringkasan Kelompok (Pra-Agregasi Lokal):
    ${JSON.stringify(aggregatedList)}

    Tugas Anda:
    Lakukan "Semantic Merging". Gabungkan kelompok-kelompok di atas yang secara makna/konteks sama.
    Contoh: "Printer Rusak" (idx: 0, 10x) dan "Printer tidak keluar tinta" (idx: 5, 5x) harus digabung menjadi satu kategori "Masalah Printer" dengan total 15x.

    Output format (JSON Array ONLY):
    [{ 
        "title": "Deskripsi Masalah Singkat & Padat", 
        "reasoning": "Kenapa digabung", 
        "count": total_gabungan_sesuai_data_di_atas, 
        "units": "Daftar unit terdampak", 
        "source_indices": [idx1, idx2...] 
    }]
    
    PENTING: Pastikan "count" adalah jumlah AKURAT dari data "total" di atas. Serta "source_indices" berisi angka idx dari kelompok yang Anda gabungkan.
    Hanya jawab JSON valid array.
    `;

    // 5. Call Gemini API with retry logic
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let response;
    let geminiRetryCount = 0;
    while (geminiRetryCount < 3) {
        try {
            response = await axios.post(geminiUrl, {
                contents: [{ parts: [{ text: prompt }] }]
            });
            break; // Success
        } catch (err: any) {
            if (err.response?.status === 429 && geminiRetryCount < 2) {
                console.warn(`[AI Handler] Gemini 429 (Rate Limit). Retrying in 5s...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                geminiRetryCount++;
            } else {
                throw err;
            }
        }
    }

    const aiText = response?.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error('AI tidak memberikan format JSON yang valid: ' + aiText.slice(0, 100));
    }

    let resultData = JSON.parse(jsonMatch[0]);

    // 6. Post-Processing: Map indices back to full Order Nos
    const rawAggregates = Object.entries(problemAggregates).map(([text, data]) => data);

    resultData = resultData.map((cluster: any) => {
        const fullOrderNos: string[] = [];
        const indices = cluster.source_indices || [];

        indices.forEach((i: number) => {
            if (rawAggregates[i]) {
                fullOrderNos.push(...rawAggregates[i].orderNos);
            }
        });

        return {
            ...cluster,
            order_nos: fullOrderNos
        };
    });

    // 7. Save to Local DB (ai_analysis)
    console.log(`Saving AI analysis with ${resultData.length} clusters.`);
    const [result]: any = await pool.query(
        "INSERT INTO ai_analysis (analysis_type, result_json, date_start, date_end, total_orders_analyzed, last_run, status) VALUES ('repeat_orders', ?, ?, ?, ?, NOW(), 'success')",
        [JSON.stringify(resultData), startDate || null, endDate || null, filteredOrders.length]
    );

    await pool.query("INSERT INTO ai_usage_logs (request_type, model) VALUES ('repeat_analysis', ?)", [model]);

    return {
        id: result.insertId,
        data: resultData,
        orderCount: filteredOrders.length
    };
}
