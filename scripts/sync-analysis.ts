import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function syncAnalysis() {
    const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
    dotenv.config({ path: envPath });

    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE
    });

    const rawDataPath = path.join(process.cwd(), 'scripts', 'raw_data.json');
    if (!fs.existsSync(rawDataPath)) {
        console.error('❌ raw_data.json not found!');
        process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
    console.log(`📦 Loaded ${rawData.length} raw orders.`);

    const categories = [
        {
            title: "Masalah Printer & Cetak",
            keywords: [/printer/i, /cetak/i, /print/i, /toner/i, /tinta/i, /zebra/i, /paper jam/i, /pita/i],
            reasoning: "Masalah terkait hardware printer, hasil cetak, penggantian toner/tinta, dan kendala mekanik seperti paper jam."
        },
        {
            title: "Hardware PC & Laptop",
            keywords: [/pc/i, /laptop/i, /mati/i, /blue screen/i, /lemot/i, /bios/i, /cpu/i, /ram/i, /monitor/i, /kedip/i, /dell/i, /acer/i, /aio/i],
            reasoning: "Kendala fisik pada komputer atau laptop, indikasi kerusakan komponen (SSD/RAM), serta performa perangkat yang menurun."
        },
        {
            title: "Koneksi Jaringan & Internet",
            keywords: [/jaringan/i, /internet/i, /lan/i, /wifi/i, /koneksi/i, /ip/i, /switch/i, /hub/i, /rack/i],
            reasoning: "Gangguan pada infrastruktur jaringan baik kabel maupun nirkabel, serta konfigurasi IP address."
        },
        {
            title: "Perangkat Input (Keyboard/Mouse)",
            keywords: [/keyboard/i, /mouse/i, /klik/i, /usb/i],
            reasoning: "Kerusakan atau kendala responsivitas pada alat input utama seperti keyboard dan mouse."
        },
        {
            title: "Telepon & Komunikasi (Ext)",
            keywords: [/telepon/i, /tlp/i, /ext/i, /ip phone/i, /dering/i],
            reasoning: "Masalah pada pesawat telepon, saluran ekstensi, serta gangguan komunikasi internal."
        },
        {
            title: "Display Antrean & TV",
            keywords: [/tv/i, /display/i, /antre/i, /antrian/i, /no signal/i],
            reasoning: "Kendala pada layar monitor informasi antrean pasien dan televisi di area tunggu."
        },
        {
            title: "Aplikasi RME & SIMRS",
            keywords: [/rme/i, /simrs/i, /login/i, /stuck/i, /hmis/i, /billing/i, /retriage/i, /pacs/i],
            reasoning: "Error atau kendala penggunaan pada sistem perangkat lunak utama rumah sakit."
        },
        {
            title: "Alat Penunjang Medis",
            keywords: [/scan/i, /paperstream/i, /eeg/i, /mri/i, /radiologi/i, /pacsrs/i, /usg/i],
            reasoning: "Pengecekan teknis pada perangkat IT pendukung tindakan medis khusus."
        },
        {
            title: "Akses & Keamanan (OTP/Finger)",
            keywords: [/otp/i, /fingerprint/i, /bpjs/i, /finger/i, /aktivasi/i],
            reasoning: "Bantuan terkait autentikasi user, aktivasi sidik jari untuk klaim BPJS, dan keamanan akses berkas."
        },
        {
            title: "Infrastruktur & Perapian Kabel",
            keywords: [/kabel/i, /perapian/i, /pindah/i, /power/i, /gosong/i, /colokan/i],
            reasoning: "Permintaan penataan kabel di Nurse Station serta pemindahan lokasi unit kerja."
        }
    ];

    const results = categories.map(cat => {
        const matches = rawData.filter((item: any) => {
            const content = `${item.catatan} ${item.location_desc}`.toLowerCase();
            return cat.keywords.some(kw => kw.test(content));
        });

        const units = Array.from(new Set(matches.map((m: any) => {
            const parts = m.location_desc.split(' ');
            return parts[0].toUpperCase();
        }))).slice(0, 8).join(', ');

        return {
            title: cat.title.toUpperCase(),
            count: matches.length,
            reasoning: cat.reasoning,
            units: units || "Berbagai Unit",
            order_nos: matches.map((m: any) => m.order_no)
        };
    }).sort((a, b) => b.count - a.count);

    console.log('📊 Result Summary:');
    results.forEach(r => console.log(`- ${r.title}: ${r.count} orders`));

    const requestId = 9;
    const dateStart = '2026-02-01';
    const dateEnd = '2026-02-26';

    try {
        // Clear existing for ID 9 if needed, but here we just insert a NEW one or update?
        // Let's insert as a NEW one to be safe, then the user will see a NEW history entry.
        // Actually the user wants to "sinkron", so updating the latest might be better.

        const [latest]: any = await connection.query('SELECT id FROM ai_analysis ORDER BY id DESC LIMIT 1');
        const targetId = latest[0]?.id;

        if (targetId) {
            console.log(`🔄 Updating existing analysis ID: ${targetId}`);
            await connection.query(
                `UPDATE ai_analysis SET 
                    result_json = ?, 
                    date_start = ?, 
                    date_end = ?, 
                    total_orders_analyzed = ?, 
                    status = 'success',
                    last_run = NOW()
                 WHERE id = ?`,
                [JSON.stringify(results), dateStart, dateEnd, rawData.length, targetId]
            );
        } else {
            console.log('🚀 No existing analysis found, inserting new one...');
            await connection.query(
                `INSERT INTO ai_analysis (analysis_type, result_json, date_start, date_end, total_orders_analyzed, last_run, status) 
                 VALUES (?, ?, ?, ?, ?, NOW(), 'success')`,
                ['repeat_orders', JSON.stringify(results), dateStart, dateEnd, rawData.length]
            );
        }

        console.log('✅ Data synced successfully.');

    } catch (err) {
        console.error('❌ Database error:', err);
    } finally {
        await connection.end();
    }
}

syncAnalysis();
