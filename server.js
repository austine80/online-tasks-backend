import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Paystack secret key from your .env
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Endpoint to initialize payment
app.post('/paystack/init', async (req, res) => {
    try {
        const { email, amount } = req.body;

        const payload = {
            email,
            amount: amount * 100, // Paystack expects amount in kobo
        };

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Paystack initialization failed', error });
    }
});

// Endpoint to verify payment
app.get('/paystack/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Verification failed', error });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
