import { useEffect, useState } from "react";

export interface HistoryItem {
  id: string;
  when: string;
  mode: "url" | "upload";
  title: string;
  size: string;
  detected_language: string;
  download_txt_url?: string;
  download_pdf_url?: string;
  transcript?: string;
  summary?: string;
}

export function pushHistory(item: HistoryItem) {
  const history = JSON.parse(localStorage.getItem("history") || "[]");
  history.unshift(item);
  localStorage.setItem("history", JSON.stringify(history.slice(0, 20)));
}

export function clearHistory() {
  localStorage.removeItem("history");
}

// Individual history translation
async function translateSummary(text: string, lang: string) {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(
      text
    )}`
  );
  const data = await res.json();
  return data[0].map((x: any) => x[0]).join(" ");
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("history") || "[]");
    setHistory(saved);
  }, []);

  const handleTranslateItem = async (itemId: string, lang: string) => {
    const updated = [...history];
    const idx = updated.findIndex((h) => h.id === itemId);
    if (idx === -1) return;
    const translated = await translateSummary(updated[idx].summary || "", lang);
    updated[idx].summary = translated;
    setHistory(updated);
    localStorage.setItem("history", JSON.stringify(updated));
  };

  if (history.length === 0)
    return <p className="text-gray-400 text-sm text-center">No history yet</p>;

  return (
    <div className="grid gap-4">
      {history.map((item) => (
        <div
          key={item.id}
          className="bg-[#1b2433] p-3 rounded-lg border border-gray-700 relative"
        >
          <p className="text-xs text-gray-400 mb-1">
            {new Date(item.when).toLocaleString()} • {item.size} •{" "}
            {item.detected_language || "unknown"}
          </p>
          <p className="text-sm text-blue-400 truncate mb-2">{item.title}</p>

          {/* Summary */}
          <p className="text-gray-300 text-xs mb-2 whitespace-pre-wrap line-clamp-4">
            {item.summary}
          </p>

          {/* 🌐 Translate per-card */}
          <div className="absolute top-2 right-2">
            <select
              onChange={(e) => handleTranslateItem(item.id, e.target.value)}
              className="bg-[#0f1623] text-xs text-gray-300 border border-gray-700 rounded-md px-1 py-[1px]"
            >
              <option value="">🌐</option>
              <option value="en">English</option>
              <option value="kn">Kannada</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="ml">Malayalam</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </div>

          <p className="text-cyan-400 text-xs font-medium mb-1">Transcript</p>
          <p className="text-gray-400 text-xs mb-2 line-clamp-5 whitespace-pre-wrap">
            {item.transcript}
          </p>

          <div className="flex gap-3 text-xs">
            {item.download_txt_url && (
              <a
                href={`http://localhost:8000${item.download_txt_url}`}
                target="_blank"
                className="text-green-400 hover:underline"
              >
                TXT
              </a>
            )}
            {item.download_pdf_url && (
              <a
                href={`http://localhost:8000${item.download_pdf_url}`}
                target="_blank"
                className="text-yellow-400 hover:underline"
              >
                PDF
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
