import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Linkedin, CreditCard, Copy, Check, LogOut, RefreshCw } from 'lucide-react';

function App() {
  // حالات تخزين البيانات الفورية (State)
  const [user, setUser] = useState({
    id: "usr_98234", // معرف مؤقت للمستخدم من سوبابيس
    name: "أحمد المطور",
    email: "ahmed@example.com",
    isSubscribed: false, // سنغيرها برمجياً لمحاكاة المشتركين
    profileText: "Full-Stack Engineer with 5 years of experience in Node.js, TypeScript, and cloud architectures. Passionate about building automated SaaS platforms."
  });

  const [contentType, setContentType] = useState('post');
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  // 1. وظيفة طلب رابط الدفع من السيرفر والتوجه إليه (PayTabs Checkout)
  const handleSubscribe = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/checkout/session', {
        userId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        amount: 19.00, // قيمة الاشتراك
        currency: "USD"
      });

      if (response.data.success && response.data.url) {
        // التوجيه الفوري لصفحة دفع PayTabs الآمنة لربط البطاقة
        window.location.href = response.data.url;
      }
    } catch (error) {
      alert("عذراً، فشل الاتصال ببوابة الدفع حالياً.");
    }
  };

  // 2. وظيفة إرسال الوصف وتوليد المحتوى بالذكاء الاصطناعي
  const handleGenerate = async () => {
    if (!user.isSubscribed) {
      alert("يرجى الاشتراك في الباقة الشهرية أولاً لتفعيل ميزات الذكاء الاصطناعي!");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/generate-content', {
        userId: user.id,
        userProfile: { bio: user.profileText },
        contentType: contentType
      });

      if (response.data.success) {
        setGeneratedContent(response.data.content);
      }
    } catch (error) {
      alert("فشل توليد المحتوى. تأكد من تفعيل السيرفر ومفاتيح OpenAI.");
    } finally {
      setLoading(false);
    }
  };

  // 3. نسخ النص المولد بضغطة زر
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased dir-rtl" style={{ direction: 'rtl' }}>
      {/* الشريط العلوي (Navbar) */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">LinkedAI SaaS</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${user.isSubscribed ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
            <span className="text-xs">{user.isSubscribed ? 'اشتراك نشط' : 'باقة مجانية مقيدة'}</span>
          </div>
          <button 
            onClick={() => setUser({...user, isSubscribed: !user.isSubscribed})} 
            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-indigo-300 transition"
          >
            تغيير حالة الاشتراك (للتجربة)
          </button>
        </div>
      </nav>

      {/* المحتوى الرئيسي للوحة التحكم */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* العمود الجانبي: الملف الشخصي والاشتراك */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 backdrop-blur">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-sky-400" /> ملف LinkedIn الخاص بك
            </h2>
            <textarea
              className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-300 resize-none"
              value={user.profileText}
              onChange={(e) => setUser({...user, profileText: e.target.value})}
            />
            <p className="text-xs text-slate-400 mt-2">يعتمد الذكاء الاصطناعي على هذا الوصف لبناء المحتوى التسويقي لشخصيتك الرقمية.</p>
          </div>

          {!user.isSubscribed && (
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800 border border-indigo-500/30 rounded-2xl p-6 text-center space-y-4">
              <CreditCard className="w-10 h-10 text-indigo-400 mx-auto" />
              <h3 className="font-bold text-lg text-indigo-200">الترقية للباقة الاحترافية</h3>
              <p className="text-xs text-slate-300 leading-relaxed">احصل على توليد محتوى غير محدود (منشورات، ملخصات، تفاعلات) لزيادة زيارات حسابك بنسبة 400%.</p>
              <button 
                onClick={handleSubscribe}
                className="w-full bg-indigo-600 hover:bg-indigo-500 font-medium text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                اشترك الآن بـ 19$/شهرياً
              </button>
            </div>
          )}
        </div>

        {/* العمود الرئيسي: توليد المحتوى */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 backdrop-blur space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">ماذا تريد أن تصنع اليوم؟</h2>
              <p className="text-xs text-slate-400">اختر نوع المحتوى الذي تود من الخبير الذكي صياغته لبروفايلك</p>
            </div>

            {/* أزرار اختيار نوع المحتوى */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'post', label: 'منشور فيروسي (Post)' },
                { id: 'headline', label: 'عنوان بروفايل (Headline)' },
                { id: 'summary', label: 'نبذة شخصية (About)' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setContentType(tab.id)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition ${
                    contentType === tab.id
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-inner'
                      : 'bg-slate-900 border-slate-700/80 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* زر التوليد الذكي */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> جاري الصياغة والتحليل عبر GPT-4o...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> توليد المحتوى الاحترافي فوراً
                </>
              )}
            </button>

            {/* صندوق عرض النتيجة القادمة من الذكاء الاصطناعي */}
            {generatedContent && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 relative group space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-xs text-indigo-400 font-medium">النتيجة المقترحة (عربي / إنجليزي):</span>
                  <button
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-800 transition flex items-center gap-1.5 text-xs"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'تم النسخ!' : 'نسخ النص'}
                  </button>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono select-all">
                  {generatedContent}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
