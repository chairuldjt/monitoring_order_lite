import pool from './db';

const DEFAULT_SETTINGS: Record<string, string> = {
    'overdue_followup_days': '1',
    'overdue_pending_months': '1',
    'performance_excellent_hours': '24',
    'performance_normal_hours': '72'
};

/**
 * Fetch all system settings from database and merge with defaults
 */
export async function getSystemSettings(): Promise<Record<string, string>> {
    try {
        const [rows]: any = await pool.query('SELECT setting_key, setting_value FROM settings');
        const dbSettings: Record<string, string> = {};
        rows.forEach((row: any) => {
            dbSettings[row.setting_key] = row.setting_value;
        });

        return { ...DEFAULT_SETTINGS, ...dbSettings };
    } catch (error) {
        console.error('Error fetching system settings:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Fetch a specific setting value as number
 */
export async function getSettingNumber(key: string): Promise<number> {
    const settings = await getSystemSettings();
    return Number(settings[key]) || Number(DEFAULT_SETTINGS[key]);
}
