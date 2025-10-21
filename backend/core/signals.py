"""
Signals for the core app.
Replaces Supabase database triggers.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def handle_new_user(sender, instance, created, **kwargs):
    """
    Handle post-save for new users.
    Replaces Supabase's handle_new_user() trigger.
    """
    if created:
        # Set is_staff for admin users
        if instance.role == 'admin' and not instance.is_staff:
            instance.is_staff = True
            instance.save(update_fields=['is_staff'])
