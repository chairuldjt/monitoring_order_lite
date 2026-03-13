import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
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

async function initDatabase() {
    console.log('🚀 Starting database initialization (Live View Mode)...\n');

    // Connect without database to create it if needed
    const connection = await mysql.createConnection({
        host: MYSQL_HOST,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD || '',
    });

    console.log(`📦 Creating database "${MYSQL_DATABASE}" if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${MYSQL_DATABASE}\``);

    // ================================
    // TABLE: users
    // ================================
    console.log('📋 Creating table: users');
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
            profile_image TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ================================
    // TABLE: settings
    // ================================
    console.log('📋 Creating table: settings');
    await connection.query(`
        CREATE TABLE IF NOT EXISTS settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ================================
    // TABLE: ai_usage_logs
    // ================================
    console.log('📋 Creating table: ai_usage_logs');
    await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_type VARCHAR(50) NOT NULL,
            prompt_tokens INT DEFAULT 0,
            completion_tokens INT DEFAULT 0,
            model VARCHAR(50) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ================================
    // TABLE: notifications
    // ================================
    console.log('📋 Creating table: notifications');
    await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) NOT NULL,
            order_id INT NULL,
            order_no VARCHAR(50) NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ================================
    // TABLE: ai_assistant_requests
    // ================================
    console.log('📋 Creating table: ai_assistant_requests');
    await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_assistant_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status ENUM('pending', 'executing', 'success', 'error') DEFAULT 'pending',
            processing_mode VARCHAR(50) DEFAULT 'auto',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure processing_mode exists on ai_assistant_requests
    console.log('🔄 Checking columns for table: ai_assistant_requests');
    const [requestColumns]: any = await connection.query(`SHOW COLUMNS FROM ai_assistant_requests`);
    const requestColumnNames = requestColumns.map((c: any) => c.Field);
    if (!requestColumnNames.includes('processing_mode')) {
        console.log('   ➕ Adding column: processing_mode');
        await connection.query(`ALTER TABLE ai_assistant_requests ADD COLUMN processing_mode VARCHAR(50) DEFAULT 'auto' AFTER status`);
    }

    // ================================
    // TABLE: ai_analysis
    // ================================
    console.log('📋 Creating table: ai_analysis');
    await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_analysis (
            id INT AUTO_INCREMENT PRIMARY KEY,
            analysis_type VARCHAR(50) NOT NULL DEFAULT 'repeat_orders',
            result_json LONGTEXT NULL,
            date_start DATE NULL,
            date_end DATE NULL,
            total_orders_analyzed INT DEFAULT 0,
            last_run TIMESTAMP NULL,
            status ENUM('success', 'failed', 'running') DEFAULT 'success',
            error_message TEXT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure columns exist in ai_analysis (Migration for existing tables)
    console.log('🔄 Checking columns for table: ai_analysis');
    const [aiColumns]: any = await connection.query(`SHOW COLUMNS FROM ai_analysis`);
    const aiColumnNames = aiColumns.map((c: any) => c.Field);

    if (!aiColumnNames.includes('date_start')) {
        console.log('   ➕ Adding column: date_start');
        await connection.query(`ALTER TABLE ai_analysis ADD COLUMN date_start DATE NULL AFTER result_json`);
    }
    if (!aiColumnNames.includes('date_end')) {
        console.log('   ➕ Adding column: date_end');
        await connection.query(`ALTER TABLE ai_analysis ADD COLUMN date_end DATE NULL AFTER date_start`);
    }
    if (!aiColumnNames.includes('total_orders_analyzed')) {
        console.log('   ➕ Adding column: total_orders_analyzed');
        await connection.query(`ALTER TABLE ai_analysis ADD COLUMN total_orders_analyzed INT DEFAULT 0 AFTER date_end`);
    }

    // ================================
    // CLEANUP: Drop local orders tables (Legacy cleanup, but KEEP notifications)
    // ================================
    console.log('🗑️  Cleaning up legacy local orders data (except notifications)...');
    // We KEEP notifications because it's used for tracking alerts even for SIMRS orders
    await connection.query(`DROP TABLE IF EXISTS order_status_history`);
    await connection.query(`DROP TABLE IF EXISTS orders`);
    await connection.query(`DROP TABLE IF EXISTS sync_logs`);

    // ================================
    // SEED: Default admin user
    // ================================
    console.log('\n👤 Seeding default admin user...');
    const [existingAdmin]: any = await connection.query(
        'SELECT id FROM users WHERE username = ?', ['admin']
    );

    if (existingAdmin.length === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.query(
            `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            ['admin', 'admin@monitoring.local', hashedPassword, 'admin']
        );
        console.log('   ✅ Admin user created (username: admin, password: admin123)');
    } else {
        console.log('   ⏭️  Admin user already exists, skipping...');
    }

    await connection.end();
    console.log('\n✅ Database initialization complete!');
    console.log('   Mode: LIVE VIEW (No local orders storage)');
    console.log('   Database:', MYSQL_DATABASE);
    console.log('   Tables: users');
}

initDatabase().catch(err => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
});
