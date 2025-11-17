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


# НОВИЙ API endpoint для React
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
            for participant_name in participants:
                if participant_name:
                    user, _ = User.objects.get_or_create(username=participant_name)
                    EventParticipant.objects.create(
                        event=event, 
                        user=user,
                        role='member'
                    )
            
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
