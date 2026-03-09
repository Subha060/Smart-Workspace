import google.generativeai as genai
from django.conf import settings

def get_model(json_mode: bool = False, api_key: str = None, model_name: str = 'gemini-2.5-flash'):
    # Use user-provided key, fallback to system key
    key = api_key if api_key else settings.GEMINI_API_KEY
    genai.configure(api_key=key)
    config = {"response_mime_type": "application/json"} if json_mode else None
    return genai.GenerativeModel(model_name, generation_config=config)

def generate(prompt: str, json_mode: bool = False, api_key: str = None, model_name: str = 'gemini-2.5-flash') -> str:
    try:
        model = get_model(json_mode=json_mode, api_key=api_key, model_name=model_name)
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"[AI Error] {str(e)}"

def clean_json(raw: str) -> str:
    """Helper to remove markdown code fences from JSON strings."""
    raw = raw.strip()
    if raw.startswith('```'):
        lines = raw.split('\n')
        # Remove first line (```json or ```)
        raw = '\n'.join(lines[1:])
        # Remove last line if it's the closing fence
        if raw.rstrip().endswith('```'):
            raw = raw.rstrip()[:-3].strip()
    return raw