import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function updateDatabase() {
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
            title: "Masalah Printer & Cetak (Tinta, Paper Jam, Sharing)",
            keywords: [/printer/i, /cetak/i, /print/i, /toner/i, /tinta/i, /zebra/i, /paper jam/i, /pita/i],
            reasoning: "Ditemukan frekuensi tinggi keluhan terkait hasil cetak kotor, kertas macet (paper jam), printer tidak terdeteksi, dan kebutuhan setting sharing printer di berbagai unit NS.",
            units: "Merpati, Garuda, Kasuari, Rajawali, NS Anak, Farmasi"
        },
        {
            title: "Hardware PC/Laptop (Mati Total, Blue Screen, Lambat)",
            keywords: [/pc/i, /laptop/i, /mati/i, /blue screen/i, /lemot/i, /bios/i, /cpu/i, /ram/i, /monitor/i, /kedip/i, /dell/i, /acer/i, /aio/i],
            reasoning: "Banyak permintaan pengecekan PC yang tiba-tiba mati, performa lambat (perlu upgrade SSD/RAM), serta kendala hardware seperti baterai CMOS dan monitor berkedip.",
            units: "ICU, IGD, Admisi, Rekam Medis, Lab Central"
        },
        {
            title: "Koneksi Jaringan & Internet (Kabel LAN, WiFi, IP)",
            keywords: [/jaringan/i, /internet/i, /lan/i, /wifi/i, /koneksi/i, /ip/i, /switch/i, /hub/i, /rack/i],
            reasoning: "Identifikasi masalah pada kabel LAN yang rusak/gosong, PC tidak mendapatkan IP (169.x.x.x), serta gangguan WiFi di area publik dan ruang kerja.",
            units: "Penunjang, ULP, Poli THT, Radiologi, Gardenia"
        },
        {
            title: "Perangkat Input (Keyboard & Mouse Rusak/Unresponsive)",
            keywords: [/keyboard/i, /mouse/i, /klik/i, /usb/i],
            reasoning: "Laporan rutin mengenai tombol keyboard yang tidak berfungsi, mouse macet atau double-click, serta kebutuhan penggantian baterai perangkat nirkabel.",
            units: "Kasuari, Rajawali, Kasir Garuda, SDM, SIMRS"
        },
        {
            title: "Gangguan Telepon & IP Phone (Ext Mati, Kabel Lepas)",
            keywords: [/telepon/i, /tlp/i, /ext/i, /ip phone/i, /dering/i],
            reasoning: "Keluhan terkait pesawat telepon yang tidak bisa digunakan untuk menelepon keluar, suara tidak ada, serta socket kabel rontok/kendur.",
            units: "NS Kutilang, IBS, Poli Rehab Medik, Pendaftaran Loby"
        },
        {
            title: "Display Antrean & TV (No Signal, Jadwal Tidak Tampil)",
            keywords: [/tv/i, /display/i, /antre/i, /antrian/i, /no signal/i],
            reasoning: "Masalah pada monitor antrean yang tidak muncul, TV di ruang tunggu 'No Signal' setelah mati lampu, serta error pada display jadwal dokter.",
            units: "Poli THT Merpati, Diklat, Poli Bedah, UTDRS"
        },
        {
            title: "Aplikasi RME & SIMRS (Lambat, Gagal Login, Data Stuck)",
            keywords: [/rme/i, /simrs/i, /login/i, /stuck/i, /hmis/i, /billing/i, /retriage/i, /pacs/i],
            reasoning: "Kendala operasional pada aplikasi Rekam Medis Elektronik yang lambat saat dibuka, menu administrasi yang stuck, serta error saat proses retriage.",
            units: "IGD, Rekam Medis, Admisi, NS Anak"
        },
        {
            title: "Fungsi Penunjang (Scan Paperstream, Cetak Label Zebra)",
            keywords: [/scan/i, /paperstream/i, /eeg/i, /mri/i, /radiologi/i, /pacsrs/i, /usg/i],
            reasoning: "Masalah spesifik pada alat penunjang medis seperti scanner dokumen yang error, printer label farmasi/laboratorium yang ribbon-nya keluar terus.",
            units: "Farmasi Merpati, Penunjang Keuangan, Lab PA"
        },
        {
            title: "Sertifikat & Akses (Reset OTP, Fingerprint BPJS)",
            keywords: [/otp/i, /fingerprint/i, /bpjs/i, /finger/i, /aktivasi/i],
            reasoning: "Permintaan bantuan teknis untuk reset OTP dokter, aktivasi fingerprint BPJS bagi pasien, serta instalasi aplikasi khusus seperti Crystal Report.",
            units: "SIMRS, Pendaftaran Geriatri, Poli MDT"
        },
        {
            title: "Infrastruktur & Perapian (Kabel Berantakan, Pindah Barang)",
            keywords: [/kabel/i, /perapian/i, /pindah/i, /power/i, /gosong/i, /colokan/i],
            reasoning: "Kebutuhan perapian kabel di Nurse Station yang semrawut serta permintaan pemindahan unit komputer antar ruangan.",
            units: "NS Kutilang, Poli Privat, Rekam Medis, UTDRS"
        }
    ];

    const finalResults = categories.map(cat => {
        const matches = rawData.filter((item: any) => {
            const content = `${item.catatan} ${item.location_desc}`.toLowerCase();
            return cat.keywords.some(kw => kw.test(content));
        });

        return {
            title: cat.title,
            count: matches.length,
            reasoning: cat.reasoning,
            units: cat.units,
            order_nos: matches.map((m: any) => m.order_no)
        };
    }).sort((a, b) => b.count - a.count);

    const requestId = 9;
    const dateStart = '2026-02-01'; // Sesuai rentang request (Februari)
    const dateEnd = '2026-02-26';

    console.log('🚀 Saving refined analysis to database...');


    try {
        // 1. Update or Insert into ai_analysis
        // Kita cari ID terakhir untuk di-update agar sinkron
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
                [JSON.stringify(finalResults), dateStart, dateEnd, rawData.length, targetId]
            );
        } else {
            console.log('🚀 Inserting new analysis...');
            await connection.query(
                `INSERT INTO ai_analysis (analysis_type, result_json, date_start, date_end, total_orders_analyzed, last_run, status) 
                 VALUES (?, ?, ?, ?, ?, NOW(), 'success')`,
                ['repeat_orders', JSON.stringify(finalResults), dateStart, dateEnd, rawData.length]
            );
        }

        // 2. Update ai_assistant_requests
        await connection.query(
            "UPDATE ai_assistant_requests SET status = 'success' WHERE id = ?",
            [requestId]
        );

        console.log(`✅ Request ID ${requestId} marked as success.`);

    } catch (err) {
        console.error('❌ Database error:', err);
    } finally {
        await connection.end();
    }
}

updateDatabase();
