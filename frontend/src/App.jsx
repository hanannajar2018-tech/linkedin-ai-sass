import React, { useState } from "react";
import axios from "axios";
import { Sparkles, FileText, CreditCard, Copy, Check, RefreshCw, HelpCircle } from "lucide-react";

function App() {
  const [user, setUser] = useState({
    id: "usr_98234",
    name: "???? ??????",
    email: "ahmed@example.com",
    isSubscribed: false,
  });

  const [profileText, setProfileText] = useState("");
  const [contentType, setContentType] = useState("post");
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubscribe = async () => {
    try {
      const response = await axios.post("https://railway.app", {
        userId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        amount: 19.00,
        currency: "USD"
      });

      if (response.data.success && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      alert("?????? ??? ??????? ?????? ????? ??????.");
    }
  };

  const handleGenerate = async () => {
    if (!user.isSubscribed) {
      alert("???? ????? ???????? ???????? ?? ??????? ?????? ?? ??????? ????? ?????? ?????????!");
      return;
    }
    if (!profileText.trim()) {
      alert("?????? ??? ?? ???? ?????? ?? ????? ??????? ?????.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("https://railway.app", {
        userId: user.id,
        rawProfileText: profileText,
        contentType: contentType
      });

      if (response.data.success) {
        setGeneratedContent(response.data.content);
      }
    } catch (error) {
      alert("??? ????? ???????. ???? ?? ????? ???? ??? Backend ???? ????? OpenAI ????? ??.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased" style={{ direction: "rtl" }}>
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">LinkedAI SaaS</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${user.isSubscribed ? "bg-emerald-400" : "bg-amber-400"}`}></div>
            <span className="text-xs">{user.isSubscribed ? "?????? ???" : "???? ?????? ?????"}</span>
          </div>
          <button 
            onClick={() => setUser({...user, isSubscribed: !user.isSubscribed})} 
            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-indigo-300 transition"
          >
            ????? ???? ???????? (??????? ???????)
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 backdrop-blur space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-indigo-300">
              <FileText className="w-5 h-5" /> ???? ???? ?????? ???
            </h2>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-xs text-slate-400 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> ??? ???? ??? ?????</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">???? ????????? ?? LinkedIn? ???? ??? "About" ?? ?????? ???????? ???? ???????.</p>
            </div>
            <textarea
              className="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-300 resize-none font-mono"
              placeholder="???? ???? ?????? ???..."
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
            />
          </div>

          {!user.isSubscribed && (
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800 border border-indigo-500/30 rounded-2xl p-6 text-center space-y-4">
              <CreditCard className="w-10 h-10 text-indigo-400 mx-auto" />
              <h3 className="font-bold text-lg text-indigo-200">??????? ?????? ??? ????????</h3>
              <p className="text-xs text-slate-300 leading-relaxed">???? ??? ?????? ??? ?????? ????????? ???????.</p>
              <button 
                onClick={handleSubscribe}
                className="w-full bg-indigo-600 hover:bg-indigo-500 font-medium text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                ????? ???? ?? 19$/??????
              </button>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 backdrop-blur space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">???? ??????? ?????? ??????</h2>
              <p className="text-xs text-slate-400">???? ?????? ??????? ????? ??????? ????? ?????????</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "post", label: "????? ?????? ?????? (Post)" },
                { id: "headline", label: "????? ??????? ???? (Headline)" },
                { id: "summary", label: "???? ????? ???????? (About)" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setContentType(tab.id)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition ${
                    contentType === tab.id
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                      : "bg-slate-900 border-slate-700/80 hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> ???? ??????? ??? GPT-4o...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> ???? ??????? ?????? ?????
                </>
              )}
            </button>

            {generatedContent && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 relative group space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-xs text-indigo-400 font-medium">??????? ???????:</span>
                  <button
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-800 transition flex items-center gap-1.5 text-xs"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? "?? ?????!" : "??? ????"}
                  </button>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
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

export default App;// Final connection deployment sync v2
