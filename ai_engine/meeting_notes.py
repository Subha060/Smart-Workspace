
from .base import generate


def structure_notes(
    raw_notes: str,
    title: str = 'Meeting',
    attendees: str = '',
    date: str = '',
    api_key: str = None,
    model_name: str = 'gemini-2.5-flash',
) -> str:
    
    raw_notes = raw_notes[:6000]

    meta_lines = []
    if attendees:
        meta_lines.append(f"Attendees: {attendees}")
    if date:
        meta_lines.append(f"Date: {date}")
    meta_block = '\n'.join(meta_lines) if meta_lines else ''

    prompt = f"""You are a professional meeting analyst and executive assistant.
Process the raw meeting notes below into a clean, structured summary.

Meeting Title: {title}
{meta_block}

---RAW NOTES---
{raw_notes}
---END NOTES---

Produce a structured output with EXACTLY these sections (use markdown headers):

## Summary
(2–3 sentence overview of what the meeting was about)

## Key Discussion Points
(Bullet list of main topics that were discussed)

## Action Items
(Each item on its own line. Format: - [ ] Task description — Owner: Name (if mentioned))

## Decisions Made
(List of decisions or conclusions reached during the meeting)

## Next Steps & Follow-ups
(Any upcoming deadlines, next meeting, or pending items)

Be concise, professional, and extract only what is mentioned in the notes.
Output ONLY the structured summary:"""

    return generate(prompt, api_key=api_key, model_name=model_name)