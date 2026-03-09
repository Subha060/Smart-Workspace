import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from ai_engine.base import generate, clean_json
from ai_engine.email_generator import draft_email
from ai_engine.summarizer import summarize, extract_text
from ai_engine.task_parser import parse_task
from accounts.models import UserProfile

@csrf_exempt
@login_required
def chat_api(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST requests allowed'}, status=405)

    try:
        if request.content_type.startswith('multipart/form-data'):
            params = request.POST
            uploaded_file = request.FILES.get('file')
        else:
            try:
                params = json.loads(request.body)
            except json.JSONDecodeError:
                params = {}
            uploaded_file = None

        mode = params.get('mode', '')
        text = params.get('text', '')

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        ai_response = ""

        if mode == 'Meeting Summary':
            fmt = params.get('format', 'bullets')
            length = params.get('length', 'medium')
            
            if uploaded_file:
                content = extract_text(uploaded_file)
                ai_response = summarize(content, format=fmt, length=length, api_key=profile.ai_api_key, model_name=profile.ai_model)
            else:
                ai_response = summarize(text, format=fmt, length=length, api_key=profile.ai_api_key, model_name=profile.ai_model)
            summaries = list(profile.summaries)
            summaries.append({'text': text, 'summary': ai_response})
            profile.summaries = summaries

        elif mode == 'Meeting Notes':
            from ai_engine.meeting_notes import structure_notes
            if uploaded_file:
                content = extract_text(uploaded_file)
                ai_response = structure_notes(content, api_key=profile.ai_api_key, model_name=profile.ai_model)
            else:
                ai_response = structure_notes(text, api_key=profile.ai_api_key, model_name=profile.ai_model)
            chats = list(profile.ai_chat)
            chats.append({'request': f"Structure notes: {text[:50]}...", 'response': ai_response})
            profile.ai_chat = chats

        elif mode == 'task_parse':
            task_data = parse_task(text, api_key=profile.ai_api_key, model_name=profile.ai_model)
            tasks = list(profile.tasks)
            tasks.append(task_data)
            profile.tasks = tasks
            profile.save()
            return JsonResponse(task_data)

        elif mode == 'event_parse':
            # Simplified event parser using general generate for now
            today_str = date.today().strftime('%Y-%m-%d')
            prompt = f"Parse this into a calendar event JSON (title, date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM)). Today is {today_str}. Input: {text}. Return ONLY JSON."
            raw = generate(prompt, api_key=profile.ai_api_key, model_name=profile.ai_model).strip()
            # Basic cleanup
            if raw.startswith('```'):
                raw = raw.split('\n', 1)[1].rsplit('\n', 1)[0].strip()
            try:
                event_data = json.loads(raw)
            except:
                event_data = {'title': text, 'date': today_str, 'start_time': '09:00', 'end_time': '10:00'}
            
            chats = list(profile.ai_chat)
            chats.append({'request': f"Parse event: {text}", 'response': json.dumps(event_data)})
            profile.ai_chat = chats
            profile.save()
            return JsonResponse(event_data)

        elif mode == 'reply_draft':
            # Context-aware reply drafting
            prompt = f"Write a brief, professional reply to this email:\n\n{text}\n\nReturn ONLY the reply text."
            ai_response = generate(prompt, api_key=profile.ai_api_key, model_name=profile.ai_model)
            return JsonResponse({'reply': ai_response})

        elif mode == 'Email Draft':
            tone = params.get('tone', 'professional')
            result = draft_email(text, sender_name=request.user.get_full_name(), tone=tone, api_key=profile.ai_api_key, model_name=profile.ai_model)
            email_data = result.get('email', {})
            
            # Construct a complete formatted email for the chat response
            body_text = "\n\n".join(email_data.get('body', [])) if isinstance(email_data.get('body'), list) else str(email_data.get('body', ''))
            
            ai_response = f"**Subject:** {email_data.get('subject', 'No Subject')}\n\n"
            ai_response += f"{email_data.get('greeting', 'Dear Recipient')},\n\n"
            ai_response += f"{body_text}\n\n"
            ai_response += f"{email_data.get('closing', 'Regards')},\n"
            ai_response += f"{email_data.get('signature', request.user.get_full_name())}"
            
            drafts = list(profile.draft_email)
            drafts.append(result)
            profile.draft_email = drafts

        elif mode == 'Task Planner':
            task_data = parse_task(text, api_key=profile.ai_api_key, model_name=profile.ai_model)
            ai_response = f"I've added the task: **{task_data['title']}**"
            if task_data['due_date']:
                ai_response += f" (Due: {task_data['due_date']})"
            tasks = list(profile.tasks)
            tasks.append(task_data)
            profile.tasks = tasks

        elif mode == 'goal_suggest':
            prompt = f"Based on these tasks, suggest 3 concise daily goals for today. Tasks: {text}. Return ONLY a JSON list of strings."
            raw = generate(prompt, json_mode=True, api_key=profile.ai_api_key, model_name=profile.ai_model)
            cleaned = clean_json(raw)
            try:
                goals = json.loads(cleaned)
            except:
                goals = ["Complete pending tasks", "Check email", "Plan next steps"]
            return JsonResponse({'goals': goals})

        elif mode == 'Daily Plan':
            # For now, treat as general generate or specific prompt
            prompt = f"Create a daily schedule based on this plan: {text}"
            ai_response = generate(prompt, api_key=profile.ai_api_key, model_name=profile.ai_model)
            # Maybe save to a daily_plan field if added later, for now just chat
        
        else:
            # General Chat
            ai_response = generate(text, api_key=profile.ai_api_key, model_name=profile.ai_model)

        # Save to chat history
        chats = list(profile.ai_chat)
        chats.append({'request': text, 'response': ai_response})
        profile.ai_chat = chats
        profile.save()

        return JsonResponse({'response': ai_response})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@login_required
def delete_draft(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST requests allowed'}, status=405)
    try:
        data = json.loads(request.body)
        index = int(data.get('draft_index', -1))
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        drafts = list(profile.draft_email)
        if 0 <= index < len(drafts):
            # The index in the template is from the reversed list,
            # so we need to reverse back to find the correct DB index.
            db_index = len(drafts) - 1 - index
            drafts.pop(db_index)
            profile.draft_email = drafts
            profile.save()
            return JsonResponse({'success': True, 'remaining': len(drafts)})
        return JsonResponse({'error': 'Invalid index'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@login_required
def delete_all_drafts(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST requests allowed'}, status=405)
    try:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.draft_email = []
        profile.save()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
