import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function fix() {
    try {
        const pool = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        // Update request status to success
        await pool.query(
            "UPDATE ai_assistant_requests SET status = 'success' WHERE id = 5"
        );

        console.log('✅ Request #5 marked as success.');
        await pool.end();
    } catch (e) {
        console.error('ERROR:', e);
    }
}

fix();
