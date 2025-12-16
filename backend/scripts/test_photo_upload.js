
const API_URL = 'http://localhost:9000/api';
const EMAIL = 'hr.manager@company.com';
const PASSWORD = 'RoleUser@1234';

// A small red dot base64 image (approx 100 bytes, safe for testing)
const MOCK_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

async function run() {
    try {
        // 1. Login
        console.log(`Logging in as ${EMAIL}...`);
        const loginRes = await fetch('http://localhost:9000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('Login successful.');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Upload Photo (Update Bio)
        console.log('Uploading Profile Picture...');
        const updateRes = await fetch('http://localhost:9000/employee-profile/me/bio', {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                biography: "Updated via test script",
                profilePictureUrl: MOCK_IMAGE
            })
        });

        if (!updateRes.ok) {
            console.error(`Upload failed: ${updateRes.status}`);
            console.error(await updateRes.text());
        } else {
            console.log('✅ Profile Picture Updated Successfully!');
            const data = await updateRes.json();
            console.log('New Picture URL length:', data.profilePictureUrl?.length);
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

run();
