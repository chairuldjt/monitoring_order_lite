import mysql from 'mysql2/promise';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function listModels() {
    try {
        const pool = mysql.createPool({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        const [settings]: any = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key' LIMIT 1");
        const apiKey = settings[0]?.setting_value;

        if (!apiKey) {
            console.error('API Key not found in database.');
            process.exit(1);
        }

        console.log('Using API Key: ' + apiKey.substring(0, 5) + '...');

        // Try v1beta first as it usually has most models
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await axios.get(url);

        console.log('\n--- Available Models (v1beta) ---');
        response.data.models.forEach((m: any) => {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                console.log(`- ${m.name} (${m.displayName})`);
            }
        });

        await pool.end();
    } catch (error: any) {
        console.error('Error listing models:', error.response?.data || error.message);
    }
}

listModels();
