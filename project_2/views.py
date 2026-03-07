from django.shortcuts import render

# Trigger dev server reload to pick up new template

def home(request):
    return render(request, "dashboard.html")


def login(request):
    return render(request, "login.html")


def signup(request):
    return render(request, "signup.html")


def chat(request):
    return render(request, "chat.html")

def tasks(request):
    return render(request, "tasks.html")

def calendar_view(request):
    return render(request, "calendar.html")

def email_view(request):
    return render(request, "email.html")

def planner_view(request):
    return render(request, "planner.html")

def activity_view(request):
    return render(request, "activity.html")
