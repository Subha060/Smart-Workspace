from django.urls import path
from . import views

urlpatterns = [
    path("chat-api/", views.chat_api, name="chat_api"),
    path("delete-draft/", views.delete_draft, name="delete_draft"),
    path("delete-all-drafts/", views.delete_all_drafts, name="delete_all_drafts"),
]
