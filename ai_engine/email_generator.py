import json
from datetime import date
from .base import generate, clean_json


TONE_DESCRIPTIONS = {
    'professional': 'formal and professional, suitable for workplace communication',
    'friendly':     'warm and friendly, yet still appropriate for work',
    'formal':       'highly formal with proper salutations, suitable for official correspondence',
    'assertive':    'confident and direct, clearly stating requirements without being rude',
    'apologetic':   'empathetic and apologetic in tone, taking responsibility where needed',
    'persuasive':   'compelling and persuasive, designed to convince the reader',
}


def draft_email(
    brief: str,
    recipient: str = '',
    recipient_org: str = '',
    recipient_address: str = '',
    tone: str = 'professional',
    context: str = '',
    sender_name: str = '',
    sender_address: str = '',
    sender_designation: str = '',
    api_key: str = None,
    model_name: str = 'gemini-2.5-flash'
) -> dict:
    
    tone_desc = TONE_DESCRIPTIONS.get(tone, TONE_DESCRIPTIONS['professional'])
    today_str = date.today().strftime('%d %B %Y')
    extra     = f"Additional context: {context}" if context else ""

    prompt = f"""You are an expert letter/email writer. Generate a formal letter based on the brief below.

BRIEF: {brief}
SENDER NAME: {sender_name if sender_name else 'infer from context'}
SENDER ADDRESS: {sender_address if sender_address else 'not provided'}
SENDER DESIGNATION: {sender_designation if sender_designation else 'infer from context'}
RECIPIENT DESIGNATION: {recipient if recipient else 'infer from context'}
RECIPIENT ORGANIZATION: {recipient_org if recipient_org else 'infer from context'}
RECIPIENT ADDRESS: {recipient_address if recipient_address else 'infer from context'}
TONE: {tone_desc}
{extra}

Return ONLY a valid JSON object — no markdown, no code fences, no explanation.
Use this exact structure:

{{
  "email": {{
    "tone": "{tone}",
    "subject": "clear subject line",
    "greeting": "appropriate greeting",
    "body": [
      "first paragraph",
      "second paragraph",
      "third paragraph"
    ],
    "closing": "closing line",
    "signature": "sender name"
  }}
}}"""

    raw = generate(prompt, json_mode=True, api_key=api_key, model_name=model_name)
    cleaned = clean_json(raw)

    try:
        data = json.loads(cleaned)
        # Handle if the model returns the root level as "email" or just the fields
        return data if "email" in data else {"email": data}

    except (json.JSONDecodeError, Exception):
        # Graceful fallback with better defaults
        return {
            "email": {
                "tone": tone,
                "subject": "Inquiry regarding " + (brief[:30] + "..." if len(brief) > 30 else brief),
                "greeting": "Dear " + (recipient or "Sir/Madam"),
                "body": [
                    "I am writing to you regarding the following:",
                    brief,
                    "I look forward to hearing from you soon."
                ],
                "closing": "Thank you.",
                "signature": sender_name or "Subha Adak"
            }
        }
