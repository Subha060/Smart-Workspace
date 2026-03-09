
import json
from datetime import date
from .base import generate, clean_json


def parse_task(natural_input: str, today: date = None, api_key: str = None, model_name: str = 'gemini-2.5-flash') -> dict:
    if today is None:
        today = date.today()

    today_str = today.strftime('%A, %d %B %Y')

    prompt = f"""You are a task management AI. Parse the following task description into structured JSON.

Today's date: {today_str}

Task description: "{natural_input}"

Return ONLY a valid JSON object — no markdown, no code fences, no explanation:
{{
  "title": "clear, concise task title (max 100 chars)",
  "description": "any extra details or context from the input, or empty string",
  "due_date": "YYYY-MM-DD if a date is mentioned or can be inferred, else null",
  "due_time": "HH:MM in 24h format if a time is mentioned, else null",
  "priority": "high if urgent/ASAP/critical/important, low if someday/whenever, else medium"
}}

Rules:
- Infer relative dates: "tomorrow" = {today_str} + 1 day, "friday" = next Friday, "next week" = 7 days from today
- Infer priority from words like: urgent, ASAP, critical, important (→ high); someday, whenever (→ low)
- Keep the title action-oriented and short"""

    raw = generate(prompt, json_mode=True, api_key=api_key, model_name=model_name)
    cleaned = clean_json(raw)

    try:
        data = json.loads(cleaned)
        # Sanitize fields
        return {
            'title':       str(data.get('title', natural_input))[:200],
            'description': str(data.get('description', '')),
            'due_date':    data.get('due_date') or None,
            'due_time':    data.get('due_time') or None,
            'priority':    data.get('priority', 'medium') if data.get('priority') in ('high', 'medium', 'low') else 'medium',
        }
    except (json.JSONDecodeError, Exception):
        # Graceful fallback: treat the whole input as the title
        return {
            'title':       natural_input[:200],
            'description': '',
            'due_date':    None,
            'due_time':    None,
            'priority':    'medium',
        }