import uuid, os
from fpdf import FPDF

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

def save_result(transcript: str, summary: str) -> str:
    _id = str(uuid.uuid4())
    base = os.path.join(DATA_DIR, _id)
    with open(base + ".txt", "w", encoding="utf-8") as f:
        f.write("=== TRANSCRIPT ===\n")
        f.write(transcript.strip() + "\n\n")
        f.write("=== SUMMARY ===\n")
        f.write(summary.strip() + "\n")
    _save_pdf(base + ".pdf", transcript, summary)
    return _id

def _save_pdf(path: str, transcript: str, summary: str):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    def add_heading(text):
        pdf.set_font("Arial", "B", 14)
        pdf.multi_cell(0, 8, text)
        pdf.ln(2)
        pdf.set_font("Arial", size=12)
    add_heading("Transcript")
    for line in transcript.splitlines():
        pdf.multi_cell(0, 6, line if line.strip() else " ")
    pdf.add_page()
    add_heading("Summary")
    for line in summary.splitlines():
        pdf.multi_cell(0, 6, line if line.strip() else " ")
    pdf.output(path)

def txt_path(_id: str) -> str:
    return os.path.join(DATA_DIR, f"{_id}.txt")
def pdf_path(_id: str) -> str:
    return os.path.join(DATA_DIR, f"{_id}.pdf")
