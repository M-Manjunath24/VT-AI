import { useState, useEffect } from "react";
import { summarizeURL, summarizeUpload, SummarySize } from "./api";
import History, { pushHistory, clearHistory } from "./components/History";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "kn", name: "Kannada", flag: "🇮🇳" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", flag: "🇮🇳" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
];

export default function App() {
  const [url, setUrl] = useState("");
  const [size, setSize] = useState<SummarySize>("small");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"url" | "upload">("url");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<string>("en");
  const [translate, setTranslate] = useState(true);
  const [summary, setSummary] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [downloadTxt, setDownloadTxt] = useState<string>("");
  const [downloadPdf, setDownloadPdf] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleSummarize = async () => {
    setLoading(true);
    setError("");
    setSummary("");
    setTranscript("");

    try {
      let data;
      if (tab === "url") {
        data = await summarizeURL({
          youtube_url: url,
          summary_size: size,
          language,
          translate_to_english: translate,
        });
      } else if (file) {
        data = await summarizeUpload(file, size, language, translate);
      } else {
        throw new Error("No file selected");
      }

      setSummary(data.summary || "");
      setTranscript(data.transcript || "");
      setDownloadTxt(data.download_txt_url || "");
      setDownloadPdf(data.download_pdf_url || "");

      pushHistory({
        id: crypto.randomUUID(),
        when: new Date().toISOString(),
        mode: tab,
        title: tab === "url" ? url : file?.name || "Uploaded file",
        size,
        detected_language: data.detected_language,
        download_txt_url: data.download_txt_url,
        download_pdf_url: data.download_pdf_url,
        transcript: data.transcript,
        summary: data.summary,
      });

      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (targetLang: string) => {
    if (!summary) return;
    setShowLangDropdown(false);
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
          summary
        )}`
      );
      const data = await res.json();
      const translated = data[0].map((item: any) => item[0]).join(" ");
      setSummary(translated);
    } catch (err) {
      console.error(err);
      alert("Translation failed. Please try again.");
    }
  };

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  return (
    <div
      className={`min-h-screen font-sans p-6 flex flex-col items-center transition-all duration-500 ${
        theme === "dark" ? "bg-[#0a0f18] text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6 relative">
        <div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            VT AI
          </h1>
          <p className="text-gray-400 text-sm">
            AI-Powered YouTube Transcript & Summary
          </p>
        </div>

        <div className="flex items-center gap-3 menu-dropdown relative">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-xl hover:text-cyan-400 transition"
            title="Toggle Theme"
          >
            {theme === "dark" ? "🌞" : "🌙"}
          </button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-2xl hover:text-cyan-400 transition"
          >
            ⋮
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 w-44 bg-[#121826] border border-gray-700 rounded-xl shadow-lg z-50">
              <button
                onClick={() => {
                  setShowHistory(true);
                  setShowMenu(false);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-[#1b2433] text-sm"
              >
                🕓 View History
              </button>

              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="block w-full text-left px-4 py-2 hover:bg-[#1b2433] text-sm"
              >
                🌐 Translate Summary
              </button>

              {showLangDropdown && (
                <div className="absolute right-full top-0 mt-1 w-52 bg-[#1b2433] border border-gray-700 rounded-xl shadow-lg">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleTranslate(lang.code)}
                      className="flex items-center w-full px-3 py-2 text-sm hover:bg-[#0e1625]"
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-4 rounded-lg overflow-hidden border border-gray-700">
        <button
          onClick={() => setTab("url")}
          className={`px-4 py-2 ${tab === "url" ? "bg-cyan-600" : "bg-[#121826]"}`}
        >
          YouTube URL
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`px-4 py-2 ${tab === "upload" ? "bg-cyan-600" : "bg-[#121826]"}`}
        >
          Upload File
        </button>
      </div>

      {/* Input Section */}
      <div className="bg-[#121826] w-full max-w-2xl p-5 rounded-2xl shadow-lg flex flex-col gap-4 mb-8">
        {tab === "url" && (
          <input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-xl bg-[#1b2433] border border-gray-700 px-3 py-2"
          />
        )}
        {tab === "upload" && (
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-300"
          />
        )}
        <div className="flex gap-4 flex-wrap">
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as SummarySize)}
            className="rounded-xl bg-[#1b2433] border border-gray-700 px-3 py-2"
          >
            <option value="small">Small (100–200 words)</option>
            <option value="medium">Medium (201–300 words)</option>
            <option value="large">Large (301–400 words)</option>
          </select>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={translate}
              onChange={(e) => setTranslate(e.target.checked)}
            />
            Translate to English
          </label>
        </div>

        <button
          onClick={handleSummarize}
          disabled={loading}
          className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-500 px-5 py-2 font-medium text-white flex items-center justify-center"
        >
          {loading ? "Summarizing..." : "Summarize"}
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Summary Output */}
      {summary && (
        <div className="bg-[#121826] w-full max-w-2xl mt-6 p-4 rounded-2xl border border-gray-700 mb-16">
          <h2 className="text-xl font-semibold text-cyan-400 mb-2">Summary</h2>
          <p className="text-gray-200 text-sm whitespace-pre-wrap">{summary}</p>
          <div className="flex gap-4 mt-3 text-xs">
            <button
              onClick={() => navigator.clipboard.writeText(summary)}
              className="text-cyan-400 hover:underline"
            >
              📋 Copy Summary
            </button>
            {downloadTxt && (
              <a
                href={`http://localhost:8000${downloadTxt}`}
                className="text-green-400 hover:underline"
                target="_blank"
              >
                ⬇️ Download TXT
              </a>
            )}
            {downloadPdf && (
              <a
                href={`http://localhost:8000${downloadPdf}`}
                className="text-yellow-400 hover:underline"
                target="_blank"
              >
                ⬇️ Download PDF
              </a>
            )}
          </div>

          {transcript && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-blue-400">
                Show Transcript
              </summary>
              <p className="text-gray-400 text-xs mt-2 whitespace-pre-wrap">{transcript}</p>
            </details>
          )}
        </div>
      )}

      {/* --- SCROLLABLE UI SECTIONS --- */}

      {/* Why Choose VT AI */}
      <section className="max-w-5xl mt-16 text-center">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Why Choose VT AI?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "🤖", title: "AI-Powered", desc: "Extracts key insights using NLP." },
            { icon: "⚙️", title: "Customizable", desc: "Choose summary size & language." },
            { icon: "📋", title: "Transcript Included", desc: "Get summary + transcript." },
            { icon: "💡", title: "Multi-Language", desc: "Supports 10+ languages." },
          ].map((c, i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl border shadow-lg transition-transform hover:-translate-y-1 ${
                theme === "dark"
                  ? "bg-[#121826] border-gray-700 text-gray-200"
                  : "bg-white border-gray-200 text-gray-800"
              }`}
            >
              <div className="text-3xl mb-2">{c.icon}</div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-1">{c.title}</h3>
              <p className="text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How To Use */}
      <section className="max-w-4xl mt-20 text-center">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">How to Use VT AI?</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { step: "1️⃣", title: "Paste Link / Upload", desc: "Add YouTube link or video file." },
            { step: "2️⃣", title: "Set Preferences", desc: "Choose summary type & language." },
            { step: "3️⃣", title: "Get Results", desc: "View summary instantly below." },
          ].map((s, i) => (
            <div
              key={i}
              className={`p-6 rounded-2xl border shadow-lg ${
                theme === "dark" ? "bg-[#121826]" : "bg-white"
              }`}
            >
              <div className="text-4xl mb-2">{s.step}</div>
              <h3 className="font-semibold text-cyan-400 mb-1">{s.title}</h3>
              <p className="text-sm text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who Can Use */}
      <section className="max-w-5xl mt-20 text-center">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">Who Can Use VT AI?</h2>
        <div className="grid sm:grid-cols-4 gap-6">
          {[
            { icon: "💼", title: "Professionals", desc: "Extract insights from meetings." },
            { icon: "📚", title: "Educators", desc: "Simplify course videos easily." },
            { icon: "🔬", title: "Researchers", desc: "Summarize long talks quickly." },
            { icon: "🎓", title: "Students", desc: "Turn long lessons into notes." },
          ].map((u, i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl shadow-lg border ${
                theme === "dark"
                  ? "bg-[#121826] border-gray-700"
                  : "bg-white border-gray-300"
              }`}
            >
              <div className="text-3xl mb-2">{u.icon}</div>
              <h3 className="font-semibold text-cyan-400 mb-1">{u.title}</h3>
              <p className="text-sm text-gray-400">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mt-20 mb-32 text-center">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">VT AI FAQs</h2>
        {[
          { q: "What makes VT AI unique?", a: "It combines Whisper + GPT summarization." },
          { q: "Can I summarize any language?", a: "Yes! Multi-language supported." },
          { q: "Is my data safe?", a: "Yes, all processing happens locally." },
          { q: "Can I download results?", a: "Yes, TXT & PDF downloads available." },
        ].map((f, i) => (
          <div
            key={i}
            onClick={() => toggleFaq(i)}
            className={`p-4 border-b cursor-pointer text-left ${
              theme === "dark"
                ? "border-gray-700 hover:bg-[#121826]"
                : "border-gray-200 hover:bg-gray-100"
            }`}
          >
            <div className="flex justify-between items-center">
              <p className="font-semibold text-cyan-400">{f.q}</p>
              <span>{openFaq === i ? "▲" : "▼"}</span>
            </div>
            {openFaq === i && <p className="text-sm text-gray-400 mt-2">{f.a}</p>}
          </div>
        ))}
      </section>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-[#121826] w-11/12 max-w-3xl rounded-2xl p-6 overflow-y-auto max-h-[80vh] border border-gray-700 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-cyan-400">History</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (confirm("Clear all history?")) clearHistory();
                    window.location.reload();
                  }}
                  className="text-red-400 text-sm hover:underline"
                >
                  🗑️ Clear All
                </button>
                <button onClick={() => setShowHistory(false)} className="text-xl">
                  ✖
                </button>
              </div>
            </div>
            <History />
          </div>
        </div>
      )}
    </div>
  );
}
