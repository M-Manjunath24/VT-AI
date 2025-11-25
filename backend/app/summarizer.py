from typing import List, Tuple
import os
from transformers import pipeline, AutoTokenizer

DEFAULT_MODEL = os.getenv("SUMMARIZER_MODEL", "facebook/bart-large-cnn")

class HierarchicalSummarizer:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.pipe = pipeline("summarization", model=model_name, device=-1)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
        self.max_input = min(1024, getattr(self.tokenizer, "model_max_length", 1024) or 1024)

    def _chunk_by_tokens(self, text: str, target_tokens: int) -> List[str]:
        words = text.split()
        if len(words) == 0:
            return []
        chunks, cur = [], []
        cur_len = 0
        for w in words:
            cur.append(w)
            cur_len += 1
            if cur_len >= target_tokens:
                chunks.append(" ".join(cur))
                cur, cur_len = [], 0
        if cur:
            chunks.append(" ".join(cur))
        return chunks

    def summarize(self, text: str, target_words: Tuple[int, int]) -> str:
        if not text or len(text.strip()) == 0:
            return "Transcript unavailable."

        word_count = len(text.split())
        if word_count < 20:
            return "Transcript is too short to summarize."

        try:
            pieces = self._chunk_by_tokens(text, int(self.max_input * 0.8))
            if not pieces:
                return "Transcript could not be chunked for summarization."
            partials = []
            for p in pieces:
                try:
                    out = self.pipe(p, max_length=220, min_length=50, do_sample=False)[0]["summary_text"]
                    partials.append(out)
                except Exception:
                    continue
            if not partials:
                return "Failed during partial summarization."

            combined = " ".join(partials)
            lo, hi = target_words
            desired = min(max((lo + hi) // 2, lo), hi)
            max_len = int(desired * 1.1)
            min_len = int(desired * 0.7)

            try:
                final = self.pipe(
                    combined,
                    max_length=max(64, max_len),
                    min_length=max(32, min_len),
                    do_sample=False
                )[0]["summary_text"]
                return final.strip()
            except Exception:
                return "Failed during final summarization."
        except Exception:
            return "Summary could not be generated due to internal error."

def size_to_bounds(size: str) -> Tuple[int, int]:
        size = size.lower()
        if size == "small":
            return (100, 200)
        if size == "medium":
            return (201, 300)
        if size == "large":
            return (301, 400)
        return (150, 250)
