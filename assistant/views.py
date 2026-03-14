import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from ai_engine.base import generate, clean_json
from ai_engine.email_generator import draft_email
from ai_engine.summarizer import summarize, extract_text
from ai_engine.task_parser import parse_task
from ai_engine.promptDeterminer import classify_prompt  
from accounts.models import UserProfile, Task, Summary, AIChat, EmailDraft
import uuid

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

                    
        if mode == "":
            mode = classify_prompt(text)

        if mode == 'Meeting Assistant':
            fmt = params.get('format', 'bullets')
            length = params.get('length', 'medium')
            
            content = extract_text(uploaded_file) if uploaded_file else text
            ai_response = summarize(content, format=fmt, length=length, api_key=profile.ai_api_key, model_name=profile.ai_model)
            
            Summary.objects.create(user=request.user, original_text=content[:5000], summary_text=ai_response)

        elif mode == 'task_parse':
            task_data = parse_task(text, api_key=profile.ai_api_key, model_name=profile.ai_model)
            new_task = Task.objects.create(
                user=request.user,
                title=task_data.get('title', 'New parsed task'),
                status='todo',
                priority=task_data.get('priority', 'medium'),
                description=task_data.get('description', ''),
                due_date=task_data.get('due_date', ''),
                due_time=task_data.get('due_time', '')
            )
            
            task_data['id'] = str(new_task.task_id)
            task_data['status'] = new_task.status
            return JsonResponse(task_data)

        elif mode == 'Calendar Event':
            from accounts.models import CalendarEvent
            from ai_engine.event_parser import parse_event
            from datetime import date
            
            event_data = parse_event(text, api_key=profile.ai_api_key, model_name=profile.ai_model)
            
            # Persist to Calendar database natively
            event_obj = CalendarEvent.objects.create(
                user=request.user,
                title=event_data.get('title', text),
                date=event_data.get('date', date.today().strftime('%Y-%m-%d')),
                start_time=event_data.get('start_time', '09:00'),
                end_time=event_data.get('end_time', '10:00'),
                description=event_data.get('description', '')
            )
            
            # Inject generated ID to the frontend
            event_data['id'] = event_obj.id

            # Format a friendly conversational response
            ai_response = f"I've added the event: **{event_obj.title}** on {event_obj.date}"
            if event_obj.start_time:
                ai_response += f" at {event_obj.start_time}"
            AIChat.objects.create(user=request.user, request_text=text, response_text=ai_response)
            return JsonResponse({'response': ai_response})


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
            
            EmailDraft.objects.create(
                user=request.user,
                tone=email_data.get('tone', tone),
                subject=email_data.get('subject', ''),
                greeting=email_data.get('greeting', ''),
                body=body_text,
                closing=email_data.get('closing', ''),
                signature=email_data.get('signature', request.user.get_full_name())
            )

        elif mode == 'Task Planner':
            task_data = parse_task(text, api_key=profile.ai_api_key, model_name=profile.ai_model)
            Task.objects.create(
                user=request.user,
                title=task_data.get('title', 'New planner task'),
                status='todo',
                priority=task_data.get('priority', 'medium'),
                description=task_data.get('description', ''),
                due_date=task_data.get('due_date', ''),
                due_time=task_data.get('due_time', '')
            )
            ai_response = f"I've added the task: **{task_data.get('title')}**"
            if task_data.get('due_date'):
                ai_response += f" (Due: {task_data.get('due_date')})"



        # elif mode == 'goal_suggest':
        #     prompt = f"Based on these tasks, suggest 3 concise daily goals for today. Tasks: {text}. Return ONLY a JSON list of strings."
        #     raw = generate(prompt, json_mode=True, api_key=profile.ai_api_key, model_name=profile.ai_model)
        #     cleaned = clean_json(raw)
        #     try:
        #         goals = json.loads(cleaned)
        #     except:
        #         goals = ["Complete pending tasks", "Check email", "Plan next steps"]
        #     return JsonResponse({'goals': goals})

        # elif mode == 'Daily Plan':
        #     # For now, treat as general generate or specific prompt
        #     prompt = f"Create a daily schedule based on this plan: {text}"
        #     ai_response = generate(prompt, api_key=profile.ai_api_key, model_name=profile.ai_model)
        #     # Maybe save to a daily_plan field if added later, for now just chat
        
        else:
            # General Chat
            ai_response = generate(text, api_key=profile.ai_api_key, model_name=profile.ai_model)

        # Save to chat history
        AIChat.objects.create(user=request.user, request_text=text, response_text=ai_response)

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
        
        # In a real app the frontend should send the draft ID.
        # Here we mimic the index logic: drafts are shown reversed (newest first).
        drafts = list(EmailDraft.objects.filter(user=request.user).order_by('created_at'))
        if 0 <= index < len(drafts):
            db_index = len(drafts) - 1 - index
            draft_to_delete = drafts[db_index]
            draft_to_delete.delete()
            return JsonResponse({'success': True, 'remaining': len(drafts) - 1})
            
        return JsonResponse({'error': 'Invalid index'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@login_required
def delete_all_drafts(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST requests allowed'}, status=405)
    try:
        EmailDraft.objects.filter(user=request.user).delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
