import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
const paytabs = require('paytabs_pt2');

dotenv.config();

// 1. تهيئة سوبابيس (Supabase Client)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. تهيئة نظام PayTabs
const profileID = process.env.PAYTABS_PROFILE_ID || '';
const serverKey = process.env.PAYTABS_SERVER_KEY || '';
const region = process.env.PAYTABS_REGION || '';
paytabs.setConfig(profileID, serverKey, region);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// [محدث] إنشاء صفحة دفع الاشتراك وربطها بمعرف العميل من سوبابيس
app.post('/api/checkout/session', async (req: Request, res: Response): Promise<void> => {
    const { userId, customerName, customerEmail, amount, currency } = req.body;

    const paymentDetails = {
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
            state: "Cairo",
            country: "EG",
        },
        urls: {
            return: "http://localhost:5173/success", // رابط الـ Frontend المحلي بعد التحديث
            callback: "https://your-domain.com"
        },
        tokenise: 2 
    };

    try {
        paytabs.createPaymentPage(paymentDetails, (result: any) => {
            if (result && result.redirect_url) {
                res.json({ success: true, url: result.redirect_url });
            } else {
                res.status(400).json({ error: "Failed to create PayTabs session" });
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: "PayTabs server error", details: error.message });
    }
});

// [مستقر] استقبال تأكيد الدفع الفوري وتحديث قاعدة البيانات تلقائياً
app.post('/api/ipn', async (req: Request, res: Response): Promise<void> => {
    const ipnData = req.body;

    if (ipnData.payment_result && ipnData.payment_result.response_status === "A") {
        const token = ipnData.token; 
        const customerEmail = ipnData.customer_details.email;
        
        const cartIdParts = ipnData.cart_id.split('_');
        const userId = cartIdParts[1]; // استخراج الـ ID بدقة

        console.log(`Payment authorized. Updating database for User: ${userId}`);

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
    res.status(200).send("IPN Notification Processed");
});

// [محدث] مسار توليد المحتوى الذكي بالاعتماد المباشر على النص المنسوخ
app.post('/api/generate-content', async (req: Request, res: Response): Promise<void> => {
    const { userId, rawProfileText, contentType } = req.body; 

    if (!rawProfileText || rawProfileText.trim().length < 10) {
        res.status(400).json({ error: 'Please provide a valid profile text or bio' });
        return;
    }

    try {
        // الفحص التلقائي للاشتراك في سوبابيس
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('is_subscribed')
            .eq('id', userId)
            .single();

        if (error || !subscription || !subscription.is_subscribed) {
            res.status(403).json({ error: 'Subscription required or expired' });
            return;
        }

        // هندسة الأوامر (Prompt Engineering) لإنتاج محتوى احترافي ومبهر
        const prompt = `You are an elite LinkedIn personal branding executive. Analyze this raw text from a user's LinkedIn profile/CV: "${rawProfileText}". Based on it, generate an incredibly professional and highly engaging ${contentType} in both Arabic and English. Format it beautifully with line breaks and relevant professional emojis. Make it stand out to headhunters.`;

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
    console.log(`Server running on port ${PORT}`);
});
