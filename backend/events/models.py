# events/models.py

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Event(models.Model):
    title = models.CharField(max_length=200)
    owner = models.ForeignKey(User, related_name='owned_events', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class EventParticipant(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')  # 👈 Додано related_name
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, default='member')

    class Meta:
        unique_together = ('event', 'user')
        verbose_name = "Event Participant"
        verbose_name_plural = "Event Participants"

    def __str__(self):
        return f"{self.user.username} in {self.event.title}"


class Transaction(models.Model):
    """
    Represents a single expense made by a Payer within an Event.
    """
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    # The person who paid the full amount of the transaction
    payer = models.ForeignKey(User, related_name='paid_transactions', on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    description = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} - {self.amount} paid by {self.payer.username}"


class TransactionSplit(models.Model):
    """
    Represents the portion of a Transaction owed by a specific User.
    This is critical for the final split calculation.
    """
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    user = models.ForeignKey(User, related_name='transaction_shares', on_delete=models.CASCADE)

    share_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:

        unique_together = ('transaction', 'user')

    def __str__(self):
        return f"{self.user.username} owes {self.share_amount} for {self.transaction.description}"