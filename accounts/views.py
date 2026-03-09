from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.contrib import messages
from .models import UserProfile

def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        
        # Django's default User uses username. We'll use email as username.
        user = authenticate(request, username=email, password=password)
        
        if user is not None:
            auth_login(request, user)
            return redirect('home')
        else:
            messages.error(request, "Invalid email or password.")
            
    return render(request, "login.html")

def signup_view(request):
    if request.user.is_authenticated:
        return redirect('home')
        
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        
        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
        elif User.objects.filter(username=email).exists():
            messages.error(request, "Email already registered.")
        else:
            # Create user with email as username
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            auth_login(request, user)
            return redirect('home')
            
    return render(request, "signup.html")

def logout_view(request):
    auth_logout(request)
    return redirect('login')

def profile_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
        
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        ai_api_key = request.POST.get('ai_api_key', '')
        ai_model = request.POST.get('ai_model', 'gemini-2.5-flash')
        
        profile.ai_api_key = ai_api_key
        profile.ai_model = ai_model
        profile.save()
        messages.success(request, "Settings saved successfully.")
        return redirect('profile')
        
    context = {
        'api_key': profile.ai_api_key,
        'ai_model': profile.ai_model
    }
    return render(request, "profile.html", context)