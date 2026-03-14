
from .base import generate


AVAILABLE_MODES = [
    'Meeting Assistant',
    'Email Draft',
    'Task Planner',
    'Calendar Event',
    'General Chat',
]


def classify_prompt(text: str) -> str:
    
    prompt = f"""You are an intent classifier for a productivity assistant app.

Analyze the user's message and classify it into EXACTLY ONE of these modes:

1. "Meeting Assistant"
   - User pastes meeting notes, discussion points, or a transcript
   - User asks to summarize a document or text
   - Keywords: notes, meeting, discussion, summarize, summary, transcript, minutes

2. "Email Draft"
   - User wants to write, compose, or draft an email or letter
   - User asks to reply to an email
   - Keywords: email, write email, draft, compose, letter, send message, reply

3. "Task Planner"
   - User wants to add, create, or manage a task or to-do item
   - User mentions something they need to do, finish, or complete
   - Keywords: task, todo, remind, finish, complete, do, deadline, submit, assignment

4. "Calendar Event"
   - User wants to schedule, add, or create a calendar event or appointment
   - User mentions a meeting time, event, or appointment to track
   - Keywords: schedule, event, appointment, calendar, add event, book, meeting at, on [date]

5. "General Chat"
   - Anything else — questions, greetings, general conversation, unclear intent

User message: "{text}"

Reply with ONLY the mode name. No explanation, no punctuation, just the mode name exactly as listed above."""

    result = generate(prompt).strip()

    # Validate the result is one of the known modes
    for mode in AVAILABLE_MODES:
        if mode.lower() in result.lower():
            return mode

    # Default fallback
    return 'General Chat'