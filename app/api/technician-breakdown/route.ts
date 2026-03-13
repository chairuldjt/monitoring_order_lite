import { NextRequest, NextResponse } from 'next/server';
import { getPayloadFromCookie } from '@/lib/jwt';

// Helper to clean trailing slash from URL
const API_URL = (process.env.ESERVICEDESK_API_URL || '').replace(/\/$/, '');

async function getEServiceDeskToken() {
    try {
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.ESERVICEDESK_GATEWAY_USER,
                password: process.env.ESERVICEDESK_GATEWAY_PASS
            })
        });

        if (!loginRes.ok) {
            const err = await loginRes.json();
            throw new Error(err.error || 'Login to EServiceDesk failed');
        }

        const data = await loginRes.json();
        return data.token;
    } catch (error: any) {
        console.error('EServiceDesk Login Error:', error);
        throw error;
    }
}

export async function GET(request: NextRequest) {
    const user = await getPayloadFromCookie();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    try {
        // 1. Get Token via Simulated Login
        const token = await getEServiceDeskToken();

        // 2. Fetch Monitoring Data
        const monitoringUrl = new URL(`${API_URL}/api/monitoring`);
        if (date) monitoringUrl.searchParams.set('date', date);

        const monitoringRes = await fetch(monitoringUrl.toString(), {
            headers: {
                'Cookie': `token=${token}`
            }
        });

        if (!monitoringRes.ok) {
            const err = await monitoringRes.json();
            throw new Error(err.error || 'Failed to fetch monitoring data');
        }

        const data = await monitoringRes.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Technician Breakdown Scraper Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await getPayloadFromCookie();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // 1. Get Token
        const token = await getEServiceDeskToken();

        // 2. Update Technician Status
        const updateRes = await fetch(`${API_URL}/api/monitoring/technician-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(body)
        });

        if (!updateRes.ok) {
            const err = await updateRes.json();
            throw new Error(err.error || 'Failed to update technician status');
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Technician Status Scraper Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
