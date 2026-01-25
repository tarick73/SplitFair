# events/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
import secrets

User = get_user_model()


class Event(models.Model):
    title = models.CharField(max_length=200)
    owner = models.ForeignKey(User, related_name='owned_events', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    join_code = models.CharField(
        max_length=12,
        unique=True,
        editable=False,
        db_index=True,
        null=True,   # 👈 добавили
        blank=True,  # 👈 добавили (чтобы форма не требовала)
    )


    def save(self, *args, **kwargs):
        # генерируем код только один раз
        if not self.join_code:
            # Получится что-то вроде "A1B2C3D4"
            self.join_code = secrets.token_hex(4).upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title



class EventParticipant(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_participations')
    added_at = models.DateTimeField(auto_now_add=True)
    role = models.CharField(max_length=32, default='member')  # added field

    class Meta:
        unique_together = ('event', 'user')

    def __str__(self):
        return f'{self.user} @ {self.event}'

# events/models.py

class Transaction(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="transactions")
    payer = models.ForeignKey(
        User,
        related_name='paid_transactions',
        on_delete=models.SET_NULL,
        null=True
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} - {self.amount} paid by {self.payer.username}"

class TransactionSplit(models.Model):
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name="splits"
    )
    user = models.ForeignKey(
        User,
        related_name='transaction_shares',
        on_delete=models.CASCADE
    )
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)


    class Meta:

        unique_together = ('transaction', 'user')

    def __str__(self):
        return f"{self.user.username} owes {self.share_amount} for {self.transaction.description}"


# Ensure owner is always a participant after Event is created/updated
@receiver(post_save, sender=Event)
def ensure_owner_is_participant(sender, instance, created, **kwargs):
    # create participant record for owner if missing
    if instance.owner_id:
        EventParticipant.objects.get_or_create(event=instance, user=instance.owner)