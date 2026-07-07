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

// مسار ربط حساب LinkedIn وجلب البيانات
app.post('/api/auth/linkedin', async (req: Request, res: Response): Promise<void> => {
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: 'OAuth code is required' }); return; }
    try {
        const tokenResponse = await axios.post('https://linkedin.com', null, {
            params: {
                grant_type: 'authorization_code',
                code,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const accessToken = tokenResponse.data.access_token;
        const profileResponse = await axios.get('https://linkedin.com', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        res.json({ success: true, profile: profileResponse.data });
    } catch (error: any) {
        res.status(500).json({ error: 'LinkedIn authentication failed', details: error.message });
    }
});

// إنشاء صفحة دفع الاشتراك وطلب حفظ البطاقة (PayTabs Page)
app.post('/api/checkout/session', async (req: Request, res: Response): Promise<void> => {
    const { userId, customerName, customerEmail, amount, currency } = req.body;

    const paymentDetails = {
        tran_type: "sale",
        tran_class: "ecom",
        cart_id: `sub_${userId}_${Date.now()}`, // نضع رقم المستخدم هنا لنعرفه عند عودة تأكيد الدفع
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
            return: "http://localhost:3000/success",
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

// الأتمتة الكاملة: استقبال تأكيد الدفع التلقائي وتحديث قاعدة البيانات فوراً
app.post('/api/ipn', async (req: Request, res: Response): Promise<void> => {
    const ipnData = req.body;

    if (ipnData.payment_result && ipnData.payment_result.response_status === "A") {
        const token = ipnData.token; 
        const customerEmail = ipnData.customer_details.email;
        
        // استخراج معرف المستخدم من الـ cart_id الذي أرسلناه سابقاً
        const cartIdParts = ipnData.cart_id.split('_');
        const userId = cartIdParts[1]; 

        console.log(`Payment authorized. Updating database for User: ${userId}`);

        // تحديث قاعدة البيانات في Supabase تلقائياً لفتح ميزات الذكاء الاصطناعي للمستخدم
        const { error } = await supabase
            .from('subscriptions')
            .upsert({ 
                id: userId, 
                email: customerEmail, 
                is_subscribed: true, 
                paytabs_token: token,
                updated_at: new Date()
            });

        if (error) {
            console.error("Failed to update Supabase database:", error.message);
        }
    }

    res.status(200).send("IPN Notification Processed");
});

// مسار توليد المحتوى الاحترافي بالذكاء الاصطناعي مع التحقق التلقائي من حالة الاشتراك
app.post('/api/generate-content', async (req: Request, res: Response): Promise<void> => {
    const { userId, userProfile, contentType } = req.body; 

    try {
        // فحص قاعدة البيانات للتأكد من أن المستخدم مشترك حقيقي ونشط حالياً
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('is_subscribed')
            .eq('id', userId)
            .single();

        if (error || !subscription || !subscription.is_subscribed) {
            res.status(403).json({ error: 'Subscription required or expired' });
            return;
        }

        // إذا كان مشتركاً، يتم توليد المحتوى فوراً
        const prompt = `You are a professional LinkedIn branding expert. Based on this user profile data: ${JSON.stringify(userProfile)}, generate a highly engaging professional ${contentType} in Arabic and English.`;
        const aiResponse = await axios.post('https://openai.com', {
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
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
