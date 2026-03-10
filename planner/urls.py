from django.urls import path
from . import views

urlpatterns = [
    path("tasks/", views.tasks, name="tasks"),
    path("tasks/create/", views.create_task, name="create_task"),
    path("tasks/update_status/", views.update_task_status, name="update_task_status"),
    path("tasks/update_title/", views.update_task_title, name="update_task_title"),
    path("tasks/delete/", views.delete_task, name="delete_task"),
    path('tasks/clear_by_status/', views.clear_tasks_by_status, name='clear_tasks_by_status'),
    path("planner/", views.planner_view, name="planner"),
]
