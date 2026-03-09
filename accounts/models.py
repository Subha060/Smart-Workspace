from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

# Create your models here.
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    draft_email = models.JSONField(default=list)
    tasks = models.JSONField(default=list)
    summaries = models.JSONField(default=list)
    ai_chat = models.JSONField(default=list)
    ai_api_key = models.CharField(max_length=255, blank=True, null=True)
    ai_model = models.CharField(max_length=50, default='gemini-2.5-flash')

    def __str__(self):
        return self.user.username

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
