import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

const {
    MYSQL_HOST,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE
} = process.env;

function parseSIMRSDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const months: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
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
    return null;
}

const semanticKeywords = [
    { key: 'PRINTER', title: 'Masalah Printer & Hardware Cetak', words: ['PRINTER', 'PRINT', 'CETAK', 'TONER', 'TINTA', 'KERTAS', 'PAPER', 'TSC', 'ZEBRA', 'EPSON', 'LASERJET'] },
    { key: 'NETWORK', title: 'Gangguan Jaringan & Internet', words: ['JARINGAN', 'INTERNET', 'KONEKSI', 'WIFI', 'LAN', 'HUB', 'SWITCH', 'LEMOT', 'LAMBAT', 'STUCK', 'HANG', 'CONNECT', 'RME', 'IP'] },
    { key: 'INPUT', title: 'Perbaikan Perangkat Input (Keyboard/Mouse)', words: ['KEYBOARD', 'MOUSE', 'KLIK'] },
    { key: 'DISPLAY', title: 'Masalah Display & Monitor', words: ['MONITOR', 'LAYAR', 'DISPLAY', 'TV', 'GAMBAR', 'GEJALA', 'GARIS', 'KEDIP'] },
    { key: 'POWER', title: 'PC Mati Total & Baterai CMOS', words: ['MATI', 'HIDUP', 'NYALA', 'POWER', 'CMOS', 'BATERE', 'BATERAI', 'BIOS'] },
    { key: 'PHONE', title: 'Gangguan Telepon (IP Phone/Ext)', words: ['TELEPON', 'TLP', 'EXT', 'PHONE', 'HUBUNGI'] },
    { key: 'INVENTORY', title: 'Pindahan & Pengembalian Inventaris PC', words: ['PINDAH', 'PENGEMBALIAN', 'PINJAM', 'TARIK', 'KIRIM', 'ANTAR', 'SIRS', 'FITRI', 'PERBAIKAN Selesai'] },
    { key: 'SOFTWARE', title: 'Masalah Software & Aplikasi (SIMRS/RME)', words: ['LOGIN', 'ADMINISTRASI', 'USER', 'PASSWORD', 'OTP', 'APPS', 'APLIKASI', 'SIMRS', 'RME', 'HMIS', 'CRYSTAL', 'FINGGER', 'FINGER', 'FACE', 'BPJS'] },
    { key: 'CCTV', title: 'Masalah CCTV & NVR', words: ['CCTV', 'NVR', 'KAMERA'] },
];

function analyzeSemantic(orders: any[], startDate: Date | null, endDate: Date | null, topN: number) {
    const filtered = orders.filter(o => {
        const d = parseSIMRSDate(o.create_date);
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
    });

    const categories: Record<string, { count: number; units: Set<string>; orderNos: string[]; reasons: Set<string> }> = {};
    semanticKeywords.forEach(k => { categories[k.key] = { count: 0, units: new Set(), orderNos: [], reasons: new Set() }; });

    filtered.forEach(o => {
        const catatan = (o.catatan || '').toUpperCase();
        for (const k of semanticKeywords) {
            if (k.words.some(word => catatan.includes(word))) {
                categories[k.key].count++;
                if (o.location_desc) categories[k.key].units.add(o.location_desc);
                categories[k.key].orderNos.push(o.order_no);
                categories[k.key].reasons.add(o.catatan.split('\n')[0].trim());
                break;
            }
        }
    });

    return Object.entries(categories)
        .filter(([_, data]) => data.count > 0)
        .map(([key, data]) => {
            const kw = semanticKeywords.find(k => k.key === key);
            return {
                title: kw?.title || key,
                reasoning: `Ditemukan ${data.count} keluhan serupa terkait ${kw?.title.toLowerCase()}. Contoh masalah: "${Array.from(data.reasons).slice(0, 2).join('; ')}".`,
                count: data.count,
                units: Array.from(data.units).slice(0, 5).join(', '),
                order_nos: data.orderNos
            };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
}

async function seedAiAnalysis() {
    console.log('🌱 Starting dynamic database seeding for ai_analysis...\n');

    const rawDataPath = path.join(process.cwd(), 'scripts', 'raw_data_2026-02-26.json');
    if (!fs.existsSync(rawDataPath)) {
        console.error(`❌ Raw data file not found at ${rawDataPath}`);
        return;
    }
    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
    console.log(`📦 Loaded ${rawData.length} raw orders.`);

    const connection = await mysql.createConnection({
        host: MYSQL_HOST,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD || '',
        database: MYSQL_DATABASE
    });

    console.log(`📦 Connected to database "${MYSQL_DATABASE}"`);

    const finalResult = [
        {
            analysis_type: 'repeat_orders',
            date_start: '2025-12-08',
            date_end: '2026-01-31',
            total_orders_analyzed: rawData.filter((o: any) => { const d = parseSIMRSDate(o.create_date); return d && d >= new Date(2025, 11, 8) && d <= new Date(2026, 0, 31, 23, 59, 59); }).length,
            result_json: JSON.stringify(analyzeSemantic(rawData, new Date(2025, 11, 8), new Date(2026, 0, 31, 23, 59, 59), 10)),
            status: 'success'
        },
        {
            analysis_type: 'repeat_orders',
            date_start: '2026-02-01',
            date_end: '2026-02-26',
            total_orders_analyzed: rawData.filter((o: any) => { const d = parseSIMRSDate(o.create_date); return d && d >= new Date(2026, 1, 1); }).length,
            result_json: JSON.stringify(analyzeSemantic(rawData, new Date(2026, 1, 1), null, 10)),
            status: 'success'
        },
        {
            analysis_type: 'repeat_orders',
            date_start: '2025-11-20',
            date_end: '2026-02-26',
            total_orders_analyzed: rawData.length,
            result_json: JSON.stringify(analyzeSemantic(rawData, null, null, 20)),
            status: 'success'
        }
    ];

    console.log('📋 Truncating table: ai_analysis');
    await connection.query('TRUNCATE TABLE ai_analysis');

    console.log('📋 Seeding dynamically analyzed data...');

    for (const record of finalResult) {
        await connection.query(
            `INSERT INTO ai_analysis 
            (analysis_type, result_json, date_start, date_end, total_orders_analyzed, status, error_message, last_run) 
            VALUES (?, ?, ?, ?, ?, ?, NULL, NOW())`,
            [record.analysis_type, record.result_json, record.date_start, record.date_end, record.total_orders_analyzed, record.status]
        );
    }

    await connection.end();
    console.log('\n✅ Dynamic database seeding complete!');
}

seedAiAnalysis().catch(err => {
    console.error('❌ Database seeding failed:', err);
    process.exit(1);
});
