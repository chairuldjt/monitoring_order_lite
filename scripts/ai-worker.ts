import pool from '../lib/db';
import { processAIAnalysis } from '../lib/ai-handler';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function worker() {
    console.log(`[AI Worker] Started at ${new Date().toLocaleString()}`);

    while (true) {
        try {
            // Pick one pending task with processing_mode='auto'
            const [rows]: any = await pool.query(
                "SELECT * FROM ai_assistant_requests WHERE status = 'pending' AND processing_mode = 'auto' ORDER BY created_at ASC LIMIT 1"
            );

            if (rows.length === 0) {
                // Idle
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }

            const task = rows[0];
            console.log(`[AI Worker] Processing task #${task.id} (${task.start_date} to ${task.end_date})`);

            // Update status to executing
            await pool.query("UPDATE ai_assistant_requests SET status = 'executing' WHERE id = ?", [task.id]);

            try {
                const result = await processAIAnalysis(
                    task.start_date.toISOString().split('T')[0],
                    task.end_date.toISOString().split('T')[0],
                    'gemini-1.5-flash' // Default model for worker
                );

                // Success
                await pool.query(
                    "UPDATE ai_assistant_requests SET status = 'success' WHERE id = ?",
                    [task.id]
                );
                console.log(`[AI Worker] Task #${task.id} COMPLETED. Analysis ID: ${result.id}`);
            } catch (err: any) {
                console.error(`[AI Worker] Task #${task.id} FAILED:`, err.message);
                await pool.query(
                    "UPDATE ai_assistant_requests SET status = 'error' WHERE id = ?",
                    [task.id]
                );
            }

        } catch (globalErr: any) {
            console.error('[AI Worker] Global loop error:', globalErr.message);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
}

worker().catch(console.error);
