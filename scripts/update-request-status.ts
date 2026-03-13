import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function updateStatus() {
    const id = process.argv[2];
    const status = process.argv[3];
    if (!id || !status) return;

    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        await connection.query(
            'UPDATE ai_assistant_requests SET status = ? WHERE id = ?',
            [status, id]
        );

        console.log(`✅ Request ${id} status updated to ${status}`);
        await connection.end();
    } catch (e) {
        console.error('ERROR:', e);
    }
}

updateStatus();
