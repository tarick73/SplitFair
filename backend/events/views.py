from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db.models import Sum
from decimal import Decimal, InvalidOperation
import json

from accounts.forms import EventForm
from events.models import Event, EventParticipant, Transaction
from django.contrib.auth.models import User
from django.views.decorators.http import require_POST

from .utils import settle_event
from django.db.models import Q
from django.contrib.auth import get_user_model
User = get_user_model()
@login_required
def list_users_api(request):
    users = User.objects.all().values("id", "username")
    return JsonResponse(list(users), safe=False)



# Старий view для HTML форми
@login_required
def create_event_view(request):
    if request.method == "POST":
        form = EventForm(request.POST)
        if form.is_valid():
            event = form.save(commit=False)
            event.owner = request.user
            event.save()

            participants_text = form.cleaned_data.get('participants', '')
            if participants_text:
                participant_names = [name.strip() for name in participants_text.split(',')]
                for name in participant_names:
                    if name:
                        user, _ = User.objects.get_or_create(username=name)
                        EventParticipant.objects.create(
                            event=event, 
                            user=user,
                            role='member')

            return redirect("dashboard")
    else:
        form = EventForm()

    return render(request, "create_event_form.html", {"form": form})


# API endpoint для отримання списку подій
@login_required
def list_events_api(request):
    """API endpoint для отримання списку подій користувача"""
    if request.method == "GET":
        events = Event.objects.filter(
            Q(owner=request.user) | Q(participants__user=request.user)
        ).distinct().order_by('-created_at')
        
        events_data = []
        for event in events:
            events_data.append({
                'id': event.id,
                'title': event.title,
                'owner': event.owner.username,
                'participants_count': event.participants.count(),
                'created_at': event.created_at.isoformat()
            })
        
        return JsonResponse(events_data, safe=False)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# API endpoint для створення події
@login_required
def create_event_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            event = Event.objects.create(
                title=data.get('title'),
                owner=request.user
            )

            participants = data.get('participants', [])
            for user_id in participants:
                try:
                    user = User.objects.get(id=user_id)
                    EventParticipant.objects.create(event=event, user=user)
                except User.DoesNotExist:
                    pass

            return JsonResponse({
                'id': event.id,
                'title': event.title,
                'owner': event.owner.username,
                'participants_count': event.participants.count(),
                'created_at': event.created_at.isoformat()
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# 👇 НОВИЙ: API endpoint для отримання деталей події
@login_required
def event_detail_api(request, event_id):
    """API endpoint для отримання деталей події"""
    try:
        event = Event.objects.get(id=event_id)
        
        # Перевіряємо чи користувач має доступ до події
        is_participant = EventParticipant.objects.filter(
            event=event,
            user=request.user
        ).exists()
        
        if event.owner != request.user and not is_participant:
            return JsonResponse({'error': 'Access denied'}, status=403)
        
        # Отримуємо учасників з їх витратами
        participants_data = []
        totals_qs = Transaction.objects.filter(event=event).values("payer_id").annotate(total_spent=Sum("amount"))
        totals_by_user_id = {row["payer_id"]: row["total_spent"] for row in totals_qs}
        
        for participant in event.participants.all():
            participants_data.append({
                'id': participant.user.id,
                'username': participant.user.username,
                'total_spent': float(totals_by_user_id.get(participant.user.id, Decimal("0")))
            })
        
        # Отримуємо транзакції
        transactions_data = []
        for txn in Transaction.objects.filter(event=event).order_by('-date'):
            transactions_data.append({
                'id': txn.id,
                'payer': txn.payer.username if txn.payer else 'Unknown',
                'amount': float(txn.amount),
                'description': txn.description,
                'date': txn.date.isoformat()
            })
        
        return JsonResponse({
            'event': {
                'id': event.id,
                'title': event.title,
                'owner': event.owner.username,
                'is_owner': event.owner == request.user,
                'created_at': event.created_at.isoformat()
            },
            'participants': participants_data,
            'transactions': transactions_data
        })
        
    except Event.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# 👇 НОВИЙ: API endpoint для додавання учасника
@login_required
@login_required
def add_participant_api(request, event_id):
    """Add an EXISTING USER as participant"""
    if request.method != "POST":
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        event = Event.objects.get(id=event_id)

        if event.owner != request.user:
            return JsonResponse({'error': 'Only owner can add participants'}, status=403)

        data = json.loads(request.body)
        user_id = data.get("user_id")

        if not user_id:
            return JsonResponse({'error': 'user_id is required'}, status=400)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        participant, created = EventParticipant.objects.get_or_create(
            event=event,
            user=user,
            defaults={'role': 'member'}
        )

        if not created:
            return JsonResponse({'error': 'Participant already exists'}, status=400)

        return JsonResponse({
            'id': user.id,
            'username': user.username,
            'total_spent': 0
        }, status=201)

    except Event.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)



# 👇 НОВИЙ: API endpoint для додавання транзакції
@login_required
def add_transaction_api(request, event_id):
    """API endpoint для додавання витрати"""
    if request.method != "POST":
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        event = Event.objects.get(id=event_id)
        
        # Перевіряємо доступ
        is_participant = EventParticipant.objects.filter(
            event=event,
            user=request.user
        ).exists()
        
        if event.owner != request.user and not is_participant:
            return JsonResponse({'error': 'Access denied'}, status=403)
        
        data = json.loads(request.body)
        payer_id = data.get('payer_id')
        amount = data.get('amount')
        description = data.get('description', '')
        
        if not payer_id or not amount:
            return JsonResponse({'error': 'Payer and amount are required'}, status=400)
        
        payer = User.objects.get(id=payer_id)
        
        # Створюємо транзакцію
        transaction = Transaction.objects.create(
            event=event,
            payer=payer,
            amount=Decimal(str(amount)),
            description=description
        )
        
        return JsonResponse({
            'id': transaction.id,
            'payer': payer.username,
            'amount': float(transaction.amount),
            'description': transaction.description,
            'date': transaction.date.isoformat()
        }, status=201)
        
    except Event.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Payer not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# HTML view (старий)
@login_required
def event_detail_view(request, event_id):
    """
    Страница конкретного ивента.
    Тут можно:
    - видеть участников и сколько каждый потратил,
    - добавлять новых участников,
    - добавлять покупки (сумма + описание).
    """
    event = get_object_or_404(Event, id=event_id, owner=request.user)

    # Участники этого ивента
    participants_qs = EventParticipant.objects.filter(
        event=event
    ).select_related("user")

    # Все покупки в этом ивенте
    transactions_qs = Transaction.objects.filter(
        event=event
    ).select_related("payer").order_by("-date", "-id")

    # Считаем, сколько каждый участник всего потратил
    totals_qs = transactions_qs.values("payer_id").annotate(total_spent=Sum("amount"))
    totals_by_user_id = {row["payer_id"]: row["total_spent"] for row in totals_qs}

    from decimal import Decimal as _Decimal
    participants_data = []
    for p in participants_qs:
        participants_data.append(
            {
                "participant": p,
                "total_spent": totals_by_user_id.get(p.user_id, _Decimal("0")),
            }
        )

    # Обработка форм (POST)
    if request.method == "POST":
        action = request.POST.get("action")
        # 1) Добавление участника
        if action == "add_participant":
            name = request.POST.get("participant_name", "").strip()
            if name:
                # создаём/находим Django-пользователя с таким username
                user, _ = User.objects.get_or_create(username=name)
                # привязываем его к ивенту как участника
                EventParticipant.objects.get_or_create(
                    event=event,
                    user=user,
                    defaults={"role": "member"},
                )
            return redirect("event_detail", event_id=event.id)

        # 2) Добавление покупки (кто сколько потратил + описание)
        if action == "add_transaction":
            payer_id = request.POST.get("payer_id")
            amount_str = request.POST.get("amount", "").replace(",", ".").strip()
            description = request.POST.get("description", "").strip()

            errors = []
            payer = None

            # проверка участника
            if not payer_id:
                errors.append("choose participant")
            else:
                try:
                    payer = User.objects.get(id=payer_id)
                except User.DoesNotExist:
                    errors.append("This participant didn't found")

            # проверка суммы
            try:
                amount = Decimal(amount_str)
                if amount <= 0:
                    errors.append("Number must be more than 0")
            except (InvalidOperation, ValueError):
                errors.append("Invalid number")

            if not errors and payer:
                Transaction.objects.create(
                    event=event,
                    payer=payer,
                    amount=amount,
                    description=description,
                )
                return redirect("event_detail", event_id=event.id)

            # если есть ошибки — отрисуем страницу с сообщениями
            return render(
                request,
                "event_detail.html",
                {
                    "event": event,
                    "participants_data": participants_data,
                    "transactions": transactions_qs,
                    "errors": errors,
                },
            )

    # GET-запрос — просто показываем страницу
    return render(
        request,
        "event_detail.html",
        {
            "event": event,
            "participants_data": participants_data,
            "transactions": transactions_qs,
        },
    )


@require_POST
@login_required
def settle_event_api(request, event_id):
    """
    Trigger settle_event for the given event and return JSON with created settlements.
    Only event owner is allowed to trigger.
    """
    event = get_object_or_404(Event, pk=event_id)
    if event.owner_id != request.user.id:
        return JsonResponse({"error": "Only event owner can perform settlement."}, status=403)

    try:
        created = settle_event(event_id)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)

    return JsonResponse({"created": created, "count": len(created)})