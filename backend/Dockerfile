FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg git curl build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt && \
    pip install --no-cache-dir huggingface_hub


RUN pip install --upgrade yt-dlp

RUN mkdir -p /models_cache/whisper-tiny && \
    huggingface-cli download openai/whisper-tiny --cache-dir /models_cache/whisper-tiny

COPY app /app/app
RUN mkdir -p /app/app/data

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
