from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def home(request):
    return render(request, "dashboard.html")

@login_required
def chat(request):
    return render(request, "chat.html")

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from accounts.models import UserProfile





@login_required
def calendar_view(request):
    return render(request, "calendar.html")

@login_required
def email_view(request):
    try:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        drafts = list(profile.draft_email)
    except Exception:
        drafts = []
    
    # Reverse so newest is first
    drafts = list(reversed(drafts))
    
    context = {
        'drafts': drafts,
        'drafts_json': json.dumps(drafts)
    }
    return render(request, "email.html", context)


@login_required
def activity_view(request):
    return render(request, "activity.html")
