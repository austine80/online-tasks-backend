// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import base64 from 'base-64';
import cors from 'cors';

dotenv.config();
const app = express();

// Allow requests from any origin (needed if frontend is on Netlify)
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());

// --- Sandbox credentials from .env ---
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const shortcode = process.env.SHORTCODE; // Sandbox till: 174379
const passkey = process.env.PASSKEY;
const callbackUrl = process.env.CALLBACK_URL; // Must be public (Render URL)

// === Get Access Token ===
async function getAccessToken() {
    const auth = base64.encode(`${consumerKey}:${consumerSecret}`);
    try {
        const res = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}` },
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('Failed to get access token:', res.status, text);
            throw new Error('Access token request failed');
        }

        const data = await res.json();
        console.log('Access token received');
        return data.access_token;

    } catch (error) {
        console.error('Error fetching access token:', error);
        throw error;
    }
}

// === STK Push Endpoint ===
app.post('/stkpush', async (req, res) => {
    try {
        const { phone, amount } = req.body;
        console.log('Received STK push request:', { phone, amount });

        const token = await getAccessToken();

        const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
        const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

        const payload = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phone,
            PartyB: shortcode,
            PhoneNumber: phone,
            CallBackURL: callbackUrl,
            AccountReference: 'OnlineTasks',
            TransactionDesc: 'Account activation payment',
        };

        // Sandbox STK push URL
        const stkPushUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const stkResponse = await fetch(stkPushUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const text = await stkResponse.text();
        console.log('Raw STK Push response:', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.error('Failed to parse STK Push response as JSON');
            data = { error: 'Invalid JSON response from Safaricom sandbox', raw: text };
        }

        res.json(data);

    } catch (error) {
        console.error('❌ Error during STK push:', error);
        res.status(500).json({ message: 'STK Push failed', error: error.toString() });
    }
});

// === Callback endpoint ===
app.post('/callback', (req, res) => {
    console.log('Callback received:', JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// Use Render's port or fallback to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
