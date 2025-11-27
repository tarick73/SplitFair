from decimal import Decimal
from django.db import transaction as db_transaction
from django.db.models import Sum, Value, Q, DecimalField
from django.db.models.functions import Coalesce
from django.contrib.auth import get_user_model

from .models import Event, Transaction, TransactionSplit
from events.DividePayments import dividePay

User = get_user_model()


def settle_event(event_id):
    """
    Compute per-participant net (total_paid - total_owed), call dividePay,
    and persist resulting settlement transactions to DB.

    Usage:
      from events.utils import settle_event
      settle_event(event_id)
    """
    event = Event.objects.get(pk=event_id)

    # collect all participant users (EventParticipant + owner)
    participant_users = list(
        User.objects.filter(id__in=event.participants.values_list("user_id", flat=True))
    )
    if event.owner_id and event.owner not in participant_users:
        participant_users.append(event.owner)

    # compute net for each participant: total_paid - total_owed
    data = []
    user_by_name = {}
    for u in participant_users:
        # ensure Coalesce uses a Decimal zero with output_field set to DecimalField()
        paid_agg = u.paid_transactions.filter(event=event).aggregate(
            s=Coalesce(Sum("amount"), Value(Decimal('0.00'), output_field=DecimalField()))
        )
        owed_agg = u.transaction_shares.filter(transaction__event=event).aggregate(
            s=Coalesce(Sum("share_amount"), Value(Decimal('0.00'), output_field=DecimalField()))
        )

        total_paid = paid_agg["s"] or Decimal('0.00')
        total_owed = owed_agg["s"] or Decimal('0.00')
        net = total_paid - total_owed  # positive => creditor, negative => debtor

        # Use username as label expected by dividePay
        label = u.username
        data.append((label, float(net)))  # dividePay expects numeric values (floats)
        user_by_name[label] = u

    # If nobody or single participant -> nothing to do
    if len(data) < 2:
        return []

    # Call dividePay to get settlement instructions like "Debtor -> Creditor 12.34"
    settlements = dividePay(data)

    created = []
    with db_transaction.atomic():
        for s in settlements:
            # parse "Debtor -> Creditor 12.34"
            try:
                parts = s.strip().split()
                debtor_name = parts[0]
                creditor_name = parts[2]
                amt = Decimal(parts[3])
            except Exception:
                # skip malformed line
                continue

            debtor = user_by_name.get(debtor_name)
            creditor = user_by_name.get(creditor_name)
            if not debtor or not creditor:
                # names not found — skip (could log)
                continue

            # Create a Transaction where debtor pays the settlement amount
            txn = Transaction.objects.create(
                event=event,
                payer=debtor,
                amount=amt,
                description=f"Settlement: {debtor.username} -> {creditor.username}"
            )
            # Record that creditor owes that txn (so payer covered creditor's share)
            TransactionSplit.objects.create(
                transaction=txn,
                user=creditor,
                share_amount=amt
            )
            created.append({
                "transaction_id": txn.id,
                "payer": debtor.username,
                "to": creditor.username,
                "amount": str(amt),
            })

    return created