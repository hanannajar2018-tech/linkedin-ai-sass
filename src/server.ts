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

import cron from 'node-cron';

// جدولة مهمة مأتمتة تعمل تلقائياً مرة واحدة يومياً عند منتصف الليل (00:00)
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily subscription renewal check...');

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. فحص سوبابيس لجلب المستخدمين الذين انتهت فترة الـ 30 يوماً الخاصة بهم واشتراكهم نشط
        const { data: expiredSubscriptions, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('is_subscribed', true)
            .lte('updated_at', thirtyDaysAgo); // تم التحديث قبل 30 يوماً أو أكثر

        if (error) {
            console.error('Error fetching expired subscriptions:', error.message);
            return;
        }

        if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
            console.log('No subscriptions up for renewal today.');
            return;
        }

        // 2. المرور على كل مستخدم منتهي الصلاحية وخصم الاشتراك تلقائياً عبر التوكن الخاص به
        for (const sub of expiredSubscriptions) {
            if (!sub.paytabs_token) continue; // تخطي العميل إذا لم يكن لديه بطاقة محفوظة

            const recurringDetails = {
                tran_type: "recurring", // تحديد العملية كخصم تلقائي متكرر
                tran_class: "ecom",
                cart_id: `rec_${sub.id}_${Date.now()}`,
                cart_currency: "USD",
                cart_amount: 19.00, // قيمة القسط الشهري الثابت
                cart_description: "Monthly Renewal - Professional AI Content SaaS",
                token: sub.paytabs_token // إرسال التوكن السري المخزن للبطاقة
            };

            // إرسال طلب الدفع الفوري والمخفي لـ PayTabs دون تدخل العميل
            paytabs.createPaymentPage(recurringDetails, async (result: any) => {
                if (result && result.payment_result && result.payment_result.response_status === "A") {
                    console.log(`Successfully renewed subscription for user: ${sub.id}`);
                    
                    // تحديث تاريخ التجديد لـ 30 يوماً إضافية في قاعدة البيانات
                    await supabase
                        .from('subscriptions')
                        .update({ updated_at: new Date() })
                        .eq('id', sub.id);
                } else {
                    console.log(`Failed to charge user: ${sub.id}. Subscription will be deactivated.`);
                    
                    // إذا فشل الخصم (بسبب انتهاء صلاحية البطاقة أو عدم وجود رصيد)، يتم إيقاف الاشتراك تلقائياً
                    await supabase
                        .from('subscriptions')
                        .update({ is_subscribed: false })
                        .eq('id', sub.id);
                }
            });
        }

    } catch (err: any) {
        console.error('Subscription cron job error:', err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
