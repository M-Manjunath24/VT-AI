def transcribe_with_whisper(audio_path: str, model_size="base", language=None, translate_to_english=True):
    import whisper
    model = whisper.load_model(model_size)

    if translate_to_english:
        result = model.transcribe(audio_path, task="translate")
    else:
        result = model.transcribe(audio_path, language=language)

    text = result.get("text", "").strip()
    detected_lang = result.get("language", "unknown")
    return text, detected_lang
