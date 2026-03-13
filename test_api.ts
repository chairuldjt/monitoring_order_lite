import 'dotenv/config';
import { simrsLogin } from './lib/simrs-client';
import axios from 'axios';
import fs from 'fs';

async function test() {
    const token = await simrsLogin();
    const API_URL = process.env.SIMRS_API_URL || 'http://103.148.235.37:5010';
    let output = '';
    
    output += 'Fetching service catalog list...\n';
    try {
        const res = await axios.get(`${API_URL}/order/service_catalog_list`, {
            headers: { 'access-token': token }
        });
        const catalogs = res.data.result || res.data;
        output += `Catalog count: ${catalogs.length}\n`;
        output += `Sample catalog: ${JSON.stringify(catalogs[0], null, 2)}\n`;
    } catch (e: any) {
        output += `Catalog fetch failed: ${e.message}\n`;
    }

    output += '\nFetching raw order list for Status 11...\n';
    try {
        const res = await axios.get(`${API_URL}/order/order_list_by_status/11`, {
            headers: { 'access-token': token }
        });
        const orders = res.data.result || res.data;
        const raw = orders[0];
        output += `Raw order keys: ${JSON.stringify(Object.keys(raw))}\n`;
        output += `Raw order sample: ${JSON.stringify(raw, null, 2)}\n`;
    } catch (e: any) {
        output += `Order list fetch failed: ${e.message}\n`;
    }
    
    fs.writeFileSync('test_output.txt', output);
    console.log('Results written to test_output.txt');
}

test().catch(console.error);
