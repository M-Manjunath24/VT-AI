from pydantic import BaseModel, HttpUrl, field_validator

class SummarizeIn(BaseModel):
    youtube_url: HttpUrl
    summary_size: str

    @field_validator("summary_size")
    @classmethod
    def check_size(cls, v):
        v = v.lower().strip()
        if v not in {"small", "medium", "large"}:
            raise ValueError("summary_size must be small|medium|large")
        return v

class SummarizeOut(BaseModel):
    transcript: str
    summary: str
    download_txt_url: str
    download_pdf_url: str
