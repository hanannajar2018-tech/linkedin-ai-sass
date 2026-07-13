import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://zfhhosstncqawgsgnaqr.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmaGhvc3N0bmNxYXdnc2duYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDcwOTYsImV4cCI6MjA5ODQyMzA5Nn0.APigyGCQf_aqAyioLJvaPTiWVTpNKIUunA7ElRBQXwY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();

// فتح جدار الحماية الشامل لضمان عبور طلبات الدفع من Vercel دون حجب
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// 1. مسار إنشاء صفحة الدفع والاشتراك التلقائي مع صمامات أمان حتمية ضد خطأ 400
app.post('/api/checkout/session', async (req: Request, res: Response): Promise<void> => {
    const userId = req.body.userId || 'usr_98234';
    const customerName = req.body.customerName || 'Hanan Tech';
    const customerEmail = req.body.customerEmail || 'customer@example.com';
    
    // تثبيت القيمة الماليّة والعملة على الدينار الأردني لبيئة الاختبار المخصصة لكِ
    const amount = 15.00; // قيمة الاشتراك بالدينار الأردني (مثال)
    const currency = 'JOD'; 

    try {
        console.log(`Initiating Jordanian PayTabs Session for Profile ID: ${process.env.PAYTABS_PROFILE_ID}`);

        const response = await axios.post('https://paytabs.com', {
            profile_id: parseInt(process.env.PAYTABS_PROFILE_ID || '0', 10),
            tran_type: "sale",
            tran_class: "ecom",
            cart_id: `sub_${userId}_${Date.now()}`,
            cart_currency: currency,
            cart_amount: parseFloat(amount.toString()),
            cart_description: "Professional AI Content Generation - Monthly Subscription",
            paypage_lang: "ar",
            customer_details: {
                name: customerName,
                email: customerEmail,
                phone: "00962700000000", // ترميز الهاتف للأردن
                street1: "Amman Street",
                city: "Amman",
                country: "JO" // تحديث كود الدولة للأردن بدقة
            },
            callback: "https://railway.app",
            return: "https://vercel.app",
            tokenise: 1 
        }, {
            headers: {
                'Authorization': String(process.env.PAYTABS_SERVER_KEY).trim(),
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.redirect_url) {
            res.json({ success: true, url: response.data.redirect_url });
        } else {
            console.error("PayTabs Denied Request Response:", response.data);
            res.status(400).json({ error: "Failed to generate PayTabs token url", details: response.data });
        }
    } catch (error: any) {
        console.error("PayTabs API Connection Exception Stack:", error.response?.data || error.message);
        res.status(500).json({ error: "PayTabs gateway connection failed", details: error.response?.data || error.message });
    }
});


// 2. مسار استقبال تحديثات الدفع الفورية من السيرفر مالي (IPN Webhook)
app.post('/api/ipn', async (req: Request, res: Response): Promise<void> => {
    const ipnData = req.body;

    if (ipnData.payment_result && ipnData.payment_result.response_status === "A") {
        const token = ipnData.token; 
        const customerEmail = ipnData.customer_details.email;
        
        const cartIdParts = ipnData.cart_id.split('_');
        const userId = cartIdParts[1] || 'usr_98234'; 

        console.log(`Payment authorized. Activating Supabase Subscription for User: ${userId}`);

        await supabase
            .from('subscriptions')
            .upsert({ 
                id: userId, 
                email: customerEmail, 
                is_subscribed: true, 
                paytabs_token: token,
                updated_at: new Date()
            });
    }
    res.status(200).send("IPN Received Successfully");
});

// 3. مسار توليد المحتوى الاحترافي بالذكاء الاصطناعي GPT-4o
app.post('/api/generate-content', async (req: Request, res: Response): Promise<void> => {
    const { userId, rawProfileText, contentType } = req.body; 

    try {
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('is_subscribed')
            .eq('id', userId)
            .single();

        if (error || !subscription || !subscription.is_subscribed) {
            res.status(403).json({ error: 'Subscription required or expired' });
            return;
        }

        const prompt = `You are an elite LinkedIn personal branding executive. Analyze this raw text: "${rawProfileText}". Generate an incredibly professional ${contentType} in Arabic and English with relevant professional emojis.`;
        const aiResponse = await axios.post('https://openai.com', {
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ success: true, content: aiResponse.data.choices[0].message.content });
    } catch (error: any) {
        res.status(500).json({ error: 'AI Content generation failed', details: error.message });
    }
});

// ربط السيرفر بالعنوان العالمي 0.0.0.0 المفتوح للإنترنت السحابي
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully bonded globally on port ${PORT}`);
});
