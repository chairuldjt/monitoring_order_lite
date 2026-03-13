import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';

async function getLatestRequest() {
    const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
    dotenv.config({ path: envPath });

    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE
    });

    const [rows]: any = await connection.query('SELECT * FROM ai_assistant_requests ORDER BY id DESC LIMIT 1');
    console.log(JSON.stringify(rows[0]));
    await connection.end();
}

getLatestRequest().catch(err => {
    console.error(err);
    process.exit(1);
});
