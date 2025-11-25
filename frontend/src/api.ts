export type SummarySize = "small" | "medium" | "large";

const BASE_URL = "http://localhost:8000";

export async function summarizeURL(payload: {
  youtube_url: string;
  summary_size: SummarySize;
  language?: string;
  translate_to_english?: boolean;
}) {
  const res = await fetch(`${BASE_URL}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Server error");
  }

  return res.json();
}

export async function summarizeUpload(
  file: File,
  options: { summary_size: SummarySize; language?: string; translate_to_english?: boolean }
) {
  const form = new FormData();
  form.append("file", file);
  form.append("summary_size", options.summary_size);
  if (options.language) form.append("language", options.language);
  if (options.translate_to_english) form.append("translate_to_english", "true");

  const res = await fetch(`${BASE_URL}/api/summarize_upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Server error");
  }

  return res.json();
}
