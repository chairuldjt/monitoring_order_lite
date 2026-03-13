import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';

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

async function clearAiAnalysis() {
    console.log('🧹 Cleaning up all AI Analysis and Request history...\n');

    const connection = await mysql.createConnection({
        host: MYSQL_HOST,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD || '',
        database: MYSQL_DATABASE
    });

    console.log(`📦 Connected to database "${MYSQL_DATABASE}"`);

    console.log('📋 Truncating table: ai_analysis');
    await connection.query('TRUNCATE TABLE ai_analysis');

    console.log('📋 Truncating table: ai_assistant_requests');
    await connection.query('TRUNCATE TABLE ai_assistant_requests');

    await connection.end();
    console.log('\n✅ Database cleanup complete! You can now start fresh AI analysis.');
}

clearAiAnalysis().catch(err => {
    console.error('❌ Database cleanup failed:', err);
    process.exit(1);
});
