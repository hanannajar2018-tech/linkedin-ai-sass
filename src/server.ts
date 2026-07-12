import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// 1. مسار إنشاء صفحة الدفع الآمنة والاشتراك التلقائي عبر الـ API المباشر لـ PayTabs
app.post('/api/checkout/session', async (req: Request, res: Response): Promise<void> => {
    const { userId, customerName, customerEmail, amount, currency } = req.body;

    try {
        // إرسال طلب الدفع الفوري والمضمون مباشرة لسيرفرات PayTabs الإقليمية
        const response = await axios.post('https://paytabs.com', {
            profile_id: parseInt(process.env.PAYTABS_PROFILE_ID || '0'),
            tran_type: "sale",
            tran_class: "ecom",
            cart_id: `sub_${userId}_${Date.now()}`,
            cart_currency: currency || "USD",
            cart_amount: amount || 19.00,
            cart_description: "Professional AI Content Generation - Monthly Subscription",
            paypage_lang: "ar",
            customer_details: {
                name: customerName,
                email: customerEmail,
                phone: "0000000000",
                street1: "Main Street",
                city: "Cairo",
                country: "EG"
            },
            callback: "https://railway.app",
            return: "https://vercel.app",
            tokenise: 2 // طلب توليد توكن الخصم الدوري للشهر القادم تلقائياً
        }, {
            headers: {
                'Authorization': process.env.PAYTABS_SERVER_KEY || '',
                'Content-Type': 'application/json'
            }
        });

        // إذا نجح السيرفر في توليد الصفحة، نرسل الرابط مباشرة للواجهة الأمامية
        if (response.data && response.data.redirect_url) {
            res.json({ success: true, url: response.data.redirect_url });
        } else {
            console.error("PayTabs Response Error:", response.data);
            res.status(400).json({ error: "Failed to generate PayTabs token url", details: response.data });
        }
    } catch (error: any) {
        console.error("PayTabs API Exception:", error.response?.data || error.message);
        res.status(500).json({ error: "PayTabs gateway connection failed", details: error.response?.data || error.message });
    }
});

// 2. مسار استقبال تحديثات الدفع الفورية من السيرفر (IPN Webhook)
app.post('/api/ipn', async (req: Request, res: Response): Promise<void> => {
    const ipnData = req.body;

    if (ipnData.payment_result && ipnData.payment_result.response_status === "A") {
        const token = ipnData.token; 
        const customerEmail = ipnData.customer_details.email;
        
        const cartIdParts = ipnData.cart_id.split('_');
        const userId = cartIdParts[1]; // استخراج معرف العميل بدقة

        console.log(`Payment authorized. Activating Supabase for User: ${userId}`);

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
    res.status(200).send("IPN Received");
});

// 3. مسار توليد المحتوى بالذكاء الاصطناعي
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

        res.json({ success: true, content: aiResponse.data.choices.message.content });
    } catch (error: any) {
        res.status(500).json({ error: 'AI Content generation failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT}`);
});
