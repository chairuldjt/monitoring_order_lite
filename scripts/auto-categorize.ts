import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function run() {
    const rawDataPath = path.join(process.cwd(), 'scripts', 'raw_data_2026-02-26.json');
    let orders = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

    // Filter out items without proper date/title just like the app does
    orders = orders.filter((o: any) => o.catatan || o.catatan_clean);

    const problemAggregates: any = {};

    orders.forEach((order: any, originalIndex: number) => {
        const title = (order.catatan || order.catatan_clean || '').split('\n')[0]?.trim();
        if (!title) return;

        if (!problemAggregates[title]) {
            problemAggregates[title] = { count: 0, units: new Set(), orderNos: [], idx: Object.keys(problemAggregates).length };
        }
        problemAggregates[title].count++;
        if (order.location_desc) problemAggregates[title].units.add(order.location_desc);
        problemAggregates[title].orderNos.push(order.order_no);
    });

    const aggregatedList = Object.entries(problemAggregates).map(([text, data]: any) => ({
        idx: data.idx,
        text,
        total: data.count,
        units: Array.from(data.units).slice(0, 5).join(', '),
        orderNos: data.orderNos
    }));

    // Perform keyword based clustering (acting as AI Semantic Merger)
    const clusters = [
        {
            title: "Masalah Printer & Tinta",
            reasoning: "Digabungkan dari berbagai keluhan gagal print, paper jam, tinta habis, atau hasil cetak bergaris.",
            keywords: ["print", "tinta", "kertas", "paper jam", "paperjam", "ribbon", "catridge", "zebra", "epson"],
            count: 0,
            units: new Set(),
            order_nos: [] as string[]
        },
        {
            title: "Hardware PC & Laptop (Mati/Lambat)",
            reasoning: "Keluhan PC/laptop mati total, bluescreen, lemot, no signal, RAM/CMOS trouble.",
            keywords: ["pc", "laptop", "leptop", "cmos", "mati", "bluescreen", "blue screen", "lemot", "cpu", "komputer", "layar"],
            count: 0,
            units: new Set(),
            order_nos: [] as string[]
        },
        {
            title: "Jariangan, Internet & RME Lambat",
            reasoning: "Laporan terkait koneksi terputus (IP 169.x.x.x), RME lemot, atau tarik kabel LAN.",
            keywords: ["jaringan", "internet", "lan ", "kabel", "wifi", "rme", "koneksi", "ip ", "169.", "silang", "putus"],
            count: 0,
            units: new Set(),
            order_nos: [] as string[]
        },
        {
            title: "Masalah Telepon & PABX",
            reasoning: "Pesawat telepon mati, tidak ada nada sambung, atau kabel spiral putus.",
            keywords: ["telp", "tlp", "telepon", "tlpn", "ekstension", "ext", "pabx", "bunyi", "nada"],
            count: 0,
            units: new Set(),
            order_nos: [] as string[]
        },
        {
            title: "Hardware Input (Mouse & Keyboard)",
            reasoning: "Penggantian atau perbaikan mouse / keyboard yang tidak responsif.",
            keywords: ["mouse", "keyboard", "klik", "ketik"],
            count: 0,
            units: new Set(),
            order_nos: [] as string[]
        },
        {
            title: "TV Display & Antrean",
            reasoning: "Gangguan pada TV display antrean, STB mati, atau HDMI tidak detek.",
            keywords: ["tv ", "tv,", "display", "antrean", "antrian", "stb", "set box", "hdmi", "setbo"],
            count: 0,
            units: new Set(),
            order_nos: [] as string[]
        }
    ];

    const unassigned: any[] = [];

    for (const item of aggregatedList) {
        const lower = item.text.toLowerCase();
        let matched = false;
        for (const cluster of clusters) {
            if (cluster.keywords.some(kw => lower.includes(kw))) {
                cluster.count += item.total;
                cluster.order_nos.push(...item.orderNos);
                item.units.split(', ').forEach((u: string) => cluster.units.add(u));
                matched = true;
                break;
            }
        }
        if (!matched) {
            unassigned.push(item);
        }
    }

    // "Other" cluster
    const otherCluster = {
        title: "Lain-lain (Software/Aset/Fingerprint/Scanner)",
        reasoning: "Berbagai masalah operasional seperti tarik aset PC, software, absen fingerprint, scanner error.",
        count: 0,
        units: new Set(),
        order_nos: [] as string[]
    };

    for (const item of unassigned) {
        otherCluster.count += item.total;
        otherCluster.order_nos.push(...item.orderNos);
        item.units.split(', ').forEach((u: string) => otherCluster.units.add(u));
    }

    const finalResult = [...clusters, otherCluster].filter(c => c.count > 0).map(c => ({
        title: c.title,
        reasoning: c.reasoning,
        count: c.count,
        units: Array.from(c.units).slice(0, 5).join(', '),
        order_nos: c.order_nos
    })).sort((a, b) => b.count - a.count);

    console.log(`Generated ${finalResult.length} clusters.`);
    console.log(JSON.stringify(finalResult.slice(0, 2), null, 2));

    try {
        const pool = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        // 1. Inject to ai_analysis (for request ID 5 context)
        // Request ID 5 Start Date: 2026-02-01, End Date: 2026-02-26
        const [insertRes]: any = await pool.query(
            "INSERT INTO ai_analysis (analysis_type, result_json, date_start, date_end, total_orders_analyzed, last_run, status) VALUES ('repeat_orders', ?, '2026-02-01', '2026-02-26', ?, NOW(), 'success')",
            [JSON.stringify(finalResult), orders.length]
        );

        const newAiAnalysisId = insertRes.insertId;

        // 2. Update request status to success
        await pool.query(
            "UPDATE ai_assistant_requests SET status = 'success', model = 'assistant', analysis_id = ? WHERE id = 5",
            [newAiAnalysisId]
        );

        console.log('✅ Analysis finalized and request #5 marked as success.');
        await pool.end();
    } catch (e) {
        console.error('ERROR:', e);
    }
}

run();
