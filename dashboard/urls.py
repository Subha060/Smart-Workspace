from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("chat/", views.chat, name="chat"),
    path("tasks/", views.tasks, name="tasks"),
    path("calendar/", views.calendar_view, name="calendar"),
    path("email/", views.email_view, name="email"),
    path("planner/", views.planner_view, name="planner"),
    path("activity/", views.activity_view, name="activity"),
]
