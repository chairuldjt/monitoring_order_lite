import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkRequests() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        const [rows]: any = await connection.query(
            'SELECT * FROM ai_assistant_requests WHERE status = "pending" ORDER BY created_at ASC'
        );

        if (rows.length === 0) {
            console.log('✅ No pending requests found.');
        } else {
            console.log(`🔔 Found ${rows.length} pending requests:`);
            rows.forEach((r: any) => {
                console.log(`- Request ID: ${r.id} | Range: ${r.start_date} to ${r.end_date}`);
            });
            console.log('\nUsage: "Assistant, tolong proses request nomor [ID]"');
        }

        await connection.end();
    } catch (e) {
        console.error('ERROR:', e);
    }
}

checkRequests();
