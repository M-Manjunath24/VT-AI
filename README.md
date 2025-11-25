# YouTube Summarizer — Prebaked Models via Docker Build

This variant **downloads Whisper (base) + BART (facebook/bart-large-cnn) during Docker image build**, so the **first run is instant**.

## Run
```powershell
docker-compose up --build
```
- The first **build** downloads models (~2GB). Subsequent runs are instant.
- Frontend: http://localhost:8080
- Backend: http://localhost:8000/docs

## Change models
Edit `docker-compose.yml` -> build.args:
- `WHISPER_MODEL: tiny|base|small|medium`
- `SUMMARIZER_MODEL: facebook/bart-large-cnn|google/pegasus-xsum`
