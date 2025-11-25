import os, uuid
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .transcript import transcribe_with_whisper  # <-- Make sure transcript.py supports language + translate params
import yt_dlp

from transformers import pipeline
HF_MODEL = "sshleifer/distilbart-cnn-12-6"
pipe = pipeline("summarization", model=HF_MODEL, device=-1)

from fastapi.responses import FileResponse

# ================= FASTAPI SETUP =================
app = FastAPI(title="YouTube Summarizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= MODELS =================
class SummarizeIn(BaseModel):
    youtube_url: str
    summary_size: Literal["small", "medium", "large"] = "small"

class SummarizeOut(BaseModel):
    transcript: str
    summary: str
    download_txt_url: str
    download_pdf_url: str
    detected_language: str

# ================= UTILS =================
DATA_DIR = "/app/app/data"
os.makedirs(DATA_DIR, exist_ok=True)

def download_audio(url: str) -> str:
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": "temp_audio.%(ext)s",
        "quiet": True,
        "cookiefile": "/app/cookies.txt", 
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192"
        }]
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info).replace(".webm", ".mp3").replace(".m4a", ".mp3")
        return filename


def summarize_text(text: str, size: str) -> str:
    word_limits = {"small": (100, 200), "medium": (201, 300), "large": (301, 400)}
    min_w, max_w = word_limits[size]
    target_len = (min_w + max_w) // 2

    summary = pipe(
        text,
        max_length=target_len,
        min_length=min_w,
        do_sample=False,
        truncation=True
    )[0]["summary_text"]

    return summary.replace("\n", " ").strip()

# ================= YOUTUBE SUMMARIZE =================
@app.post("/api/summarize", response_model=SummarizeOut)
def summarize(payload: SummarizeIn):
    url = payload.youtube_url.strip()

    if not url.startswith("http"):
        raise HTTPException(status_code=422, detail="Invalid YouTube URL")

    try:
        audio_path = download_audio(url)
        transcript, detected_lang = transcribe_with_whisper(
            audio_path,
            os.getenv("WHISPER_MODEL", "base"),
            language=None,                 # Force auto-detect
            translate_to_english=True      # ✅ Always translate to English
        )
        os.remove(audio_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to process audio: {e}")

    summary = summarize_text(transcript, payload.summary_size)

    item_id = str(uuid.uuid4())
    txt_path = os.path.join(DATA_DIR, f"{item_id}.txt")
    pdf_path = os.path.join(DATA_DIR, f"{item_id}.pdf")

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("=== Transcript ===\n")
        f.write(transcript + "\n\n")
        f.write("=== Summary ===\n")
        f.write(summary + "\n")

    from fpdf import FPDF
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "YouTube Summarizer", ln=True)
    pdf.set_font("Arial", size=11)
    pdf.multi_cell(0, 6, "Transcript:\n" + transcript)
    pdf.ln(4)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.set_font("Arial", size=11)
    pdf.multi_cell(0, 6, summary)
    pdf.output(pdf_path)

    return SummarizeOut(
        transcript=transcript,
        summary=summary,
        download_txt_url=f"/download/txt/{item_id}",
        download_pdf_url=f"/download/pdf/{item_id}",
        detected_language=detected_lang
    )

# ================= FILE UPLOAD SUMMARIZE =================
@app.post("/api/summarize_upload", response_model=SummarizeOut)
async def summarize_upload(
    file: UploadFile = File(...),
    summary_size: Literal["small", "medium", "large"] = Form("small")
):
    temp_path = os.path.join(DATA_DIR, f"upload_{uuid.uuid4()}_{file.filename}")
    with open(temp_path, "wb") as out:
        out.write(await file.read())

    try:
        transcript, detected_lang = transcribe_with_whisper(
            temp_path,
            os.getenv("WHISPER_MODEL", "base"),
            language=None,
            translate_to_english=True     # ✅ Always translate
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to process audio: {e}")
    finally:
        try: os.remove(temp_path)
        except: pass

    summary = summarize_text(transcript, summary_size)

    item_id = str(uuid.uuid4())
    txt_path = os.path.join(DATA_DIR, f"{item_id}.txt")
    pdf_path = os.path.join(DATA_DIR, f"{item_id}.pdf")

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("=== Transcript ===\n")
        f.write(transcript + "\n\n")
        f.write("=== Summary ===\n")
        f.write(summary + "\n")

    from fpdf import FPDF
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "YouTube Summarizer", ln=True)
    pdf.set_font("Arial", size=11)
    pdf.multi_cell(0, 6, "Transcript:\n" + transcript)
    pdf.ln(4)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.set_font("Arial", size=11)
    pdf.multi_cell(0, 6, summary)
    pdf.output(pdf_path)
    API_BASE = os.getenv("API_BASE", "http://localhost:8000")
    return SummarizeOut(
        transcript=transcript,
        summary=summary,
        download_txt_url=f"/download/txt/{item_id}",
        download_pdf_url=f"/download/pdf/{item_id}",
        detected_language=detected_lang
    )

# ================= DOWNLOAD ROUTES =================
@app.get("/download/txt/{item_id}")
def download_txt(item_id: str):
    path = os.path.join(DATA_DIR, f"{item_id}.txt")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="text/plain", filename="summary.txt")

@app.get("/download/pdf/{item_id}")
def download_pdf(item_id: str):
    path = os.path.join(DATA_DIR, f"{item_id}.pdf")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="application/pdf", filename="summary.pdf")
