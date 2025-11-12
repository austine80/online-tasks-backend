import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import base64 from 'base-64';

dotenv.config();
const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const shortcode = process.env.SHORTCODE; // your till/paybill
const passkey = process.env.PASSKEY;
const callbackUrl = process.env.CALLBACK_URL; // must be accessible from internet

// === Get Access Token ===
async function getAccessToken() {
    const auth = base64.encode(`${consumerKey}:${consumerSecret}`);
    const res = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: { Authorization: `Basic ${auth}` },
    });
    const data = await res.json();
    return data.access_token;
}

// === STK Push Endpoint ===
app.post('/stkpush', async (req, res) => {
    try {
        const { phone, amount } = req.body;
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

        const stkResponse = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await stkResponse.json();
        res.json(data);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'STK Push failed', error });
    }
});

// === Callback (Safaricom posts result here) ===
app.post('/callback', (req, res) => {
    console.log('Callback received:', JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// Use Render's assigned port, or fallback to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

