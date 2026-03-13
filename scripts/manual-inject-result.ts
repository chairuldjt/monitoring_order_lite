import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const resultData = [
    {
        "title": "Masalah Hardware Input (Keyboard & Mouse)",
        "reasoning": "Ditemukan banyak permintaan penggantian keyboard dan mouse yang tidak responsif atau rusak di berbagai unit (Kasuari, Kenari, ODS Rajawali, ICU). Ini menunjukkan perlunya pengecekan stok atau kualitas perangkat input.",
        "count": 10,
        "units": "Kasuari, Kenari, ODS Rajawali, ICU, Poliklinik",
        "order_nos": ["20.54155", "20.54150", "20.54148", "20.54115", "20.54103", "20.54096", "20.54095", "20.54086", "20.53976", "20.53545"]
    },
    {
        "title": "Masalah Koneksi & Performa Jaringan (RME Lemot)",
        "reasoning": "Keluhan terkait koneksi internet terputus (IP 169.x.x.x) dan performa RME yang lambat terjadi berulang di area kritis seperti IGD, ICU, dan Poliklinik. Mengindikasikan masalah pada switch atau beban jaringan.",
        "count": 10,
        "units": "IGD, ICU, Merpati, Kasuari, Penunjang",
        "order_nos": ["20.54228", "20.54224", "20.54198", "20.54172", "20.54164", "20.54156", "20.54154", "20.53971", "20.53970", "20.53974"]
    },
    {
        "title": "Pengembalian & Pindahan Inventaris PC",
        "reasoning": "Terdapat siklus rutin pengembalian PC selesai perbaikan dan penarikan PC pinjaman. Mayoritas dikoordinasikan oleh bagian SIRS (Mbak Fitri) untuk unit rawat inap dan poliklinik.",
        "count": 7,
        "units": "PICU, TB Dots, Kasuari, Rajawali, Merak, Anak",
        "order_nos": ["20.54141", "20.54140", "20.54139", "20.54138", "20.54137", "20.54143", "20.54142"]
    },
    {
        "title": "Masalah Printer (General & Paper Jam)",
        "reasoning": "Gangguan pada printer standar (HP Laserjet/Epson) berupa gagal print, toner kotor, atau paper jam. Masalah ini bersifat menyebar di berbagai unit pelayanan.",
        "count": 7,
        "units": "Klinik Amarilis, Penandaftaran Elang, Obgyn Anak, Kutilang, Elang RPO, ODS Rajawali",
        "order_nos": ["20.54233", "20.54211", "20.54171", "20.54157", "20.54027", "20.53732", "20.53342"]
    },
    {
        "title": "Ganti Baterai CMOS & PC Mati Total",
        "reasoning": "Beberapa PC AIO Dell dan ASUS mengalami masalah tidak mau hidup atau stuck di BIOS yang memerlukan penggantian baterai CMOS atau pengecekan hardware lebih lanjut.",
        "count": 6,
        "units": "Adhi CDC, Poli Elang, Lab Central, ICU Central, Farmasi Kasuari",
        "order_nos": ["20.54225", "20.54218", "20.54038", "20.53030", "20.53522", "20.54028"]
    },
    {
        "title": "Gangguan Display TV & Antrean Pasien",
        "reasoning": "TV Display jadwal dokter dan antrean pasien sering tidak muncul atau salah tampilan (display store/no signal) di area Poliklinik Merpati, Garuda, dan Diklat.",
        "count": 6,
        "units": "Poli THT Merpati, Diklat, Merpati Triase, Poli MDT Garuda, Radioterapi",
        "order_nos": ["20.54226", "20.54216", "20.54129", "20.54114", "20.53066", "20.52009"]
    }
];

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        await connection.query(
            "INSERT INTO ai_analysis (analysis_type, result_json, date_start, date_end, total_orders_analyzed, last_run, status) VALUES ('repeat_orders', ?, CURDATE() - INTERVAL 30 DAY, CURDATE(), 261, NOW(), 'success')",
            [JSON.stringify(resultData)]
        );

        console.log('SUCCESS: Analysis result injected into database.');
        await connection.end();
    } catch (e) {
        console.error('ERROR:', e);
    }
}

run();
