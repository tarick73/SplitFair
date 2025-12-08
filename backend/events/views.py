from decimal import Decimal, InvalidOperation
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Q
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST

from accounts.forms import EventForm
from events.models import Event, EventParticipant, Transaction
from .utils import settle_event
from django.db.models import Q

User = get_user_model()


@login_required
def list_users_api(request):
    users = User.objects.all().values("id", "username")
    return JsonResponse(list(users), safe=False)


@login_required
def create_event_view(request):
    if request.method == "POST":
        form = EventForm(request.POST)
        if form.is_valid():
            event = form.save(commit=False)
            event.owner = request.user
            event.save()  # join_code генерируется в save()
            # Создатель не добавляет участников
            return redirect("dashboard")
    else:
        form = EventForm()

    return render(request, "create_event_form.html", {"form": form})


# API endpoint для отримання списку подій
@login_required
def list_events_api(request):
    """API endpoint для отримання списку подій користувача"""
    if request.method == "GET":
        events = (
            Event.objects.filter(
                Q(owner=request.user) | Q(participants__user=request.user)
            )
            .distinct()
            .order_by("-created_at")
        )

        events_data = []
        for event in events:
            events_data.append(
                {
                    "id": event.id,
                    "title": event.title,
                    "owner": event.owner.username,
                    "participants_count": event.participants.count(),
                    "join_code": event.join_code,
                    "created_at": event.created_at.isoformat(),
                }
            )

        return JsonResponse(events_data, safe=False)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@login_required
def create_event_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        title = (data.get("title") or "").strip()
        if not title:
            return JsonResponse({"error": "Title is required"}, status=400)

        event = Event.objects.create(
            title=title,
            owner=request.user,
        )

        return JsonResponse(
            {
                "id": event.id,
                "title": event.title,
                "owner": event.owner.username,
                "participants_count": event.participants.count(),
                "join_code": event.join_code,  # отдаём код
                "created_at": event.created_at.isoformat(),
            },
            status=201,
        )

    return JsonResponse({"error": "Method not allowed"}, status=405)


# API endpoint для отримання деталей події
@login_required
def event_detail_api(request, event_id):
    """API endpoint для отримання деталей події"""
    try:
        event = Event.objects.get(id=event_id)

        # Перевіряємо чи користувач має доступ до події
        is_participant = EventParticipant.objects.filter(
            event=event, user=request.user
        ).exists()

        if event.owner != request.user and not is_participant:
            return JsonResponse({"error": "Access denied"}, status=403)

        # Учасники з їх витратами
        participants_data = []
        totals_qs = (
            Transaction.objects.filter(event=event)
            .values("payer_id")
            .annotate(total_spent=Sum("amount"))
        )
        totals_by_user_id = {row["payer_id"]: row["total_spent"] for row in totals_qs}

        for participant in event.participants.all():
            participants_data.append(
                {
                    "id": participant.user.id,
                    "username": participant.user.username,
                    "total_spent": float(
                        totals_by_user_id.get(participant.user.id, Decimal("0"))
                    ),
                }
            )

        # Транзакції
        transactions_data = []
        for txn in Transaction.objects.filter(event=event).order_by("-date"):
            transactions_data.append(
                {
                    "id": txn.id,
                    "payer": txn.payer.username if txn.payer else "Unknown",
                    "amount": float(txn.amount),
                    "description": txn.description,
                    "date": txn.date.isoformat(),
                }
            )

        return JsonResponse(
            {
                "event": {
                    "id": event.id,
                    "title": event.title,
                    "owner": event.owner.username,
                    "is_owner": event.owner == request.user,
                    "created_at": event.created_at.isoformat(),
                },
                "participants": participants_data,
                "transactions": transactions_data,
            }
        )

    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# API endpoint для додавання учасника (якщо захочеш залишити старий спосіб)
@login_required
def add_participant_api(request, event_id):
    """Add an EXISTING USER as participant (owner-only)"""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        event = Event.objects.get(id=event_id)

        if event.owner != request.user:
            return JsonResponse(
                {"error": "Only owner can add participants"}, status=403
            )

        data = json.loads(request.body)
        user_id = data.get("user_id")

        if not user_id:
            return JsonResponse({"error": "user_id is required"}, status=400)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)

        participant, created = EventParticipant.objects.get_or_create(
            event=event,
            user=user,
            defaults={"role": "member"},
        )

        if not created:
            return JsonResponse({"error": "Participant already exists"}, status=400)

        return JsonResponse(
            {
                "id": user.id,
                "username": user.username,
                "total_spent": 0,
            },
            status=201,
        )

    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# API endpoint для додавання транзакції
@login_required
def add_transaction_api(request, event_id):
    """API endpoint для додавання витрати"""
    if request.method != "POST":
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        event = Event.objects.get(id=event_id)

        # Проверяем доступ к ивенту
        is_participant = EventParticipant.objects.filter(
            event=event,
            user=request.user
        ).exists()

        if event.owner != request.user and not is_participant:
            return JsonResponse({'error': 'Access denied'}, status=403)

        data = json.loads(request.body)
        amount = data.get('amount')
        description = data.get('description', '')

        # ----------- ЛОГИКА ПЛАТЕЛЬЩИКА -----------
        if event.owner == request.user:
            # владелец может выбирать любого участника
            payer_id = data.get('payer_id')
            if not payer_id:
                return JsonResponse({'error': 'Payer is required'}, status=400)
            try:
                payer = User.objects.get(id=payer_id)
            except User.DoesNotExist:
                return JsonResponse({'error': 'Payer not found'}, status=404)
        else:
            # НЕ владелец — только сам за себя
            if not is_participant:
                return JsonResponse({'error': 'You are not a participant'}, status=403)

            payer_id = data.get('payer_id')
            # если фронт пытается указать кого-то другого — запрещаем
            if payer_id is not None and str(payer_id) != str(request.user.id):
                return JsonResponse(
                    {'error': 'You can only add expenses for yourself'},
                    status=403
                )
            payer = request.user

        # Плательщик обязан быть участником ивента (или владельцем)
        if payer != event.owner and not EventParticipant.objects.filter(
                event=event,
                user=payer
        ).exists():
            return JsonResponse(
                {'error': 'Payer must be a participant of this event'},
                status=400
            )

        # ----------- ПРОВЕРКА СУММЫ -----------
        if amount is None:
            return JsonResponse({'error': 'Amount is required'}, status=400)

        try:
            amount_dec = Decimal(str(amount))
            if amount_dec <= 0:
                return JsonResponse({'error': 'Amount must be > 0'}, status=400)
        except (InvalidOperation, ValueError):
            return JsonResponse({'error': 'Invalid amount'}, status=400)

        # Создаём транзакцию
        transaction = Transaction.objects.create(
            event=event,
            payer=payer,
            amount=amount_dec,
            description=description,
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
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
def event_detail_view(request, event_id):
    """
    Страница конкретного ивента.

    Тут можно:
    - видеть участников и сколько каждый потратил,
    - добавлять покупки (сумма + описание).

    Доступ: владелец или любой участник ивента.
    """

    # Разрешаем доступ владельцу ИЛИ участнику
    qs = Event.objects.filter(
        Q(owner=request.user) | Q(participants__user=request.user)
    ).distinct()
    event = get_object_or_404(qs, id=event_id)

    # Участники этого ивента
    participants_qs = EventParticipant.objects.filter(
        event=event
    ).select_related("user")

    # Все покупки в этом ивенте
    transactions_qs = (
        Transaction.objects.filter(event=event)
        .select_related("payer")
        .order_by("-date", "-id")
    )

    # Считаем, сколько каждый участник всего потратил
    totals_qs = transactions_qs.values("payer_id").annotate(total_spent=Sum("amount"))
    totals_by_user_id = {row["payer_id"]: row["total_spent"] for row in totals_qs}

    participants_data = [
        {
            "participant": p,
            "total_spent": totals_by_user_id.get(p.user_id, Decimal("0")),
        }
        for p in participants_qs
    ]

    # Обработка форм (POST) — только добавление покупки
    if request.method == "POST":
        action = request.POST.get("action")

        if action == "add_transaction":
            payer_id = request.POST.get("payer_id")
            amount_str = (
                request.POST.get("amount", "").replace(",", ".").strip()
            )
            description = request.POST.get("description", "").strip()

            errors = []
            payer = None

            # ----------- ЛОГИКА ПЛАТЕЛЬЩИКА -----------
            if event.owner == request.user:
                # владелец может выбрать любого участника из списка
                if not payer_id:
                    errors.append("choose participant")
                else:
                    try:
                        payer = User.objects.get(id=payer_id)
                    except User.DoesNotExist:
                        errors.append("This participant didn't found")
            else:
                # НЕ владелец — только сам за себя
                if not EventParticipant.objects.filter(
                        event=event,
                        user=request.user
                ).exists():
                    errors.append("You are not a participant of this event")
                else:
                    # если выбрал не себя — ошибка
                    if payer_id and payer_id != str(request.user.id):
                        errors.append("You can only add expenses for yourself")
                    else:
                        payer = request.user

            # ----------- ПРОВЕРКА СУММЫ -----------
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



@login_required
def join_event_api(request):
    """
    Присоединение текущего пользователя к событию по коду приглашения.

    Работает в двух режимах:
    - JSON POST (fetch, XHR) -> возвращает JSON
    - Обычная HTML-форма POST -> редиректит обратно на dashboard
    """
    if request.method != "POST":
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    content_type = request.headers.get("Content-Type", "")
    is_json = content_type.startswith("application/json")

    # JSON-запрос (fetch)
    if is_json:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
    else:
        # обычная HTML-форма
        data = request.POST

    code = (data.get("code") or data.get("join_code") or "").strip()
    if not code:
        if is_json:
            return JsonResponse({'error': 'Event code is required'}, status=400)
        # для HTML просто возвращаемся на дашборд
        return redirect("dashboard")

    try:
        event = Event.objects.get(join_code=code)
    except Event.DoesNotExist:
        if is_json:
            return JsonResponse({'error': 'Event not found'}, status=404)
        return redirect("dashboard")

    participant, created = EventParticipant.objects.get_or_create(
        event=event,
        user=request.user,
        defaults={"role": "member"},
    )

    if is_json:
        if not created:
            return JsonResponse({'error': 'You have already joined this event'}, status=400)

        return JsonResponse({
            'message': 'Joined successfully',
            'event': {
                'id': event.id,
                'title': event.title,
                'join_code': event.join_code,
                'owner': event.owner.username,
            }
        }, status=201)

    # HTML-форма: после успешного присоединения просто возвращаем пользователя на дашборд
    return redirect("dashboard")



@require_POST
@login_required
def settle_event_api(request, event_id):
    """
    Trigger settle_event for the given event and return JSON with created settlements.
    Only event owner is allowed to trigger.
    """
    event = get_object_or_404(Event, pk=event_id)
    if event.owner_id != request.user.id:
        return JsonResponse(
            {"error": "Only event owner can perform settlement."}, status=403
        )

    try:
        created = settle_event(event_id)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)

    return JsonResponse({"created": created, "count": len(created)})
