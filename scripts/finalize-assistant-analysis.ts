import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const resultData = [
    {
        "title": "Masalah Perangkat Input (Mouse & Keyboard)",
        "reasoning": "Ditemukan 12 keluhan tentang mouse dan keyboard yang tidak responsif atau rusak (Kenari, Kasuari, ODS Rajawali, ICU). Polanya menunjukkan perangkat yang sudah mencapai masa umur pakainya.",
        "count": 12,
        "units": "Kasuari, Kenari, ODS Rajawali, ICU, Poliklinik",
        "order_nos": ["20.54155", "20.54150", "20.54148", "20.54115", "20.54103", "20.54096", "20.54095", "20.54086", "20.53976", "20.53545", "20.53115", "20.54026"]
    },
    {
        "title": "Performa Jaringan & RME Lemot (Critical)",
        "reasoning": "Masalah konektivitas (IP 169.x.x.x) dan akses RME yang lambat terdeteksi di 8 titik pelayanan utama. Ini seringkali memerlukan pengecekan pada switch lokal atau beban bandwith.",
        "count": 8,
        "units": "IGD, ICU, Merpati, Kasuari, Penunjang",
        "order_nos": ["20.54228", "20.54224", "20.54198", "20.54172", "20.54164", "20.54156", "20.54154", "20.53974"]
    },
    {
        "title": "Manajemen Aset (Pengembalian PC Pinjaman)",
        "reasoning": "Siklus rutin penarikan unit inventaris pinjaman setelah PC utama selesai diperbaiki. Fokus pergerakan aset ada di Ruang Training dan Gudang SIMRS.",
        "count": 10,
        "units": "SIRS, PICU, TB Dots, Kasuari, Rajawali, Merak, Anak",
        "order_nos": ["20.54141", "20.54140", "20.54139", "20.54138", "20.54137", "20.54143", "20.54142", "20.54149", "20.54099", "20.53341"]
    },
    {
        "title": "Trouble Printer & Hasil Cetak Kotor",
        "reasoning": "Keluhan terkait printer zebra, HP, dan Epson yang mengalami paper jam atau hasil berblok hitam (toner bocor).",
        "count": 15,
        "units": "Farmasi Merpati, Radiologi, Gizi, MR, Elang",
        "order_nos": ["20.54227", "20.54222", "20.54189", "20.54188", "20.54171", "20.54166", "20.54157"]
    },
    {
        "title": "Hardware PC (Baterai CMOS & Bios Stuck)",
        "reasoning": "Identifikasi kebutuhan penggantian baterai CMOS untuk PC AIO Dell dan PC yang mati mendadak saat listrik labil.",
        "count": 5,
        "units": "Adhi CDC, Lab PA, ICU Central, Elang CC",
        "order_nos": ["20.54225", "20.54218", "20.54038", "20.54036", "20.54030"]
    },
    {
        "title": "Gangguan Visual (Display TV & Antrean)",
        "reasoning": "TV Display jadwal dan antrean pasien tidak muncul atau menampilkan 'display store'. Masalah ini berpusat di area ruang tunggu utama.",
        "count": 7,
        "units": "Poli THT Merpati, Diklat, Merpati Triase, Poli MDT Garuda, Radioterapi",
        "order_nos": ["20.54226", "20.54216", "20.54129", "20.54114", "20.53066", "20.52009", "20.53935"]
    }
];

async function finalize() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        // 1. Inject to ai_analysis
        await connection.query(
            "INSERT INTO ai_analysis (analysis_type, result_json, date_start, date_end, total_orders_analyzed, last_run, status) VALUES ('repeat_orders', ?, '2026-01-27', '2026-02-26', 261, NOW(), 'success')",
            [JSON.stringify(resultData)]
        );

        // 2. Update request status to success
        await connection.query(
            'UPDATE ai_assistant_requests SET status = "success" WHERE id = 1'
        );

        console.log('✅ Analysis finalized and request marked as success.');
        await connection.end();
    } catch (e) {
        console.error('ERROR:', e);
    }
}

finalize();
