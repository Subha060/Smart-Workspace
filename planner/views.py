import json
import uuid
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from accounts.models import UserProfile

@login_required
def tasks(request):
    try:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        user_tasks = list(profile.tasks)
    except Exception:
        user_tasks = []
    
    # Ensure all tasks have an ID and status (for drag and drop)
    changed = False
    for t in user_tasks:
        if 'id' not in t:
            t['id'] = str(uuid.uuid4())
            changed = True
        if 'status' not in t:
            t['status'] = 'todo'
            changed = True
        if 'priority' not in t:
            t['priority'] = 'medium'
            changed = True
            
    if changed:
        profile.tasks = user_tasks
        profile.save()
            
    context = {
        'tasks': user_tasks,
        'tasks_json': json.dumps(user_tasks)
    }
    return render(request, "tasks.html", context)

@csrf_exempt
@login_required
def update_task_status(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            task_id = str(data.get('id', ''))
            new_status = data.get('status')
            
            profile = UserProfile.objects.get(user=request.user)
            user_tasks = list(profile.tasks)
            for t in user_tasks:
                if str(t.get('id')) == task_id:
                    t['status'] = new_status
                    profile.tasks = user_tasks
                    profile.save()
                    return JsonResponse({'success': True})
            return JsonResponse({'error': 'Task not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
@login_required
def delete_task(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            task_id = str(data.get('id', ''))
            
            profile = UserProfile.objects.get(user=request.user)
            user_tasks = list(profile.tasks)
            new_tasks = [t for t in user_tasks if str(t.get('id')) != task_id]
            if len(new_tasks) < len(user_tasks):
                profile.tasks = new_tasks
                profile.save()
                return JsonResponse({'success': True})
            return JsonResponse({'error': 'Task not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
@login_required
def clear_tasks_by_status(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            status = data.get('status')
            
            profile = UserProfile.objects.get(user=request.user)
            user_tasks = list(profile.tasks)
            new_tasks = [t for t in user_tasks if t.get('status') != status]
            
            if len(new_tasks) < len(user_tasks):
                profile.tasks = new_tasks
                profile.save()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
@login_required
def create_task(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_task = {
                'id': str(uuid.uuid4()),
                'title': data.get('title', 'New Task'),
                'status': data.get('status', 'todo'),
                'priority': 'medium',
                'description': '',
                'due_date': '',
                'due_time': ''
            }
            profile = UserProfile.objects.get(user=request.user)
            tasks = list(profile.tasks)
            tasks.append(new_task)
            profile.tasks = tasks
            profile.save()
            return JsonResponse({'success': True, 'task': new_task})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
@login_required
def update_task_title(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            task_id = str(data.get('id', ''))
            new_title = data.get('title', '').strip()
            if not new_title:
                return JsonResponse({'error': 'Empty title'}, status=400)
                
            profile = UserProfile.objects.get(user=request.user)
            user_tasks = list(profile.tasks)
            for t in user_tasks:
                if str(t.get('id')) == task_id:
                    t['title'] = new_title
                    profile.tasks = user_tasks
                    profile.save()
                    return JsonResponse({'success': True})
            return JsonResponse({'error': 'Task not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid method'}, status=405)

@login_required
def planner_view(request):
    return render(request, "planner.html")
