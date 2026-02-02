const API_URL = 'http://localhost:3001/api';

async function main() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'Brunooliveira1010@hotmail.com',
                password: '123456'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json() as any;
        const token = loginData.token;
        console.log('Login successful. Token obtained.');

        // 2. Get Weekly Progress
        console.log('Fetching Weekly Progress...');
        const res = await fetch(`${API_URL}/dashboard/weekly-progress`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        console.log('Weekly Progress Data:');
        console.log(JSON.stringify(data, null, 2));

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

main();
