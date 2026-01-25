# accounts/views.py
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.middleware.csrf import get_token
from django.shortcuts import render, redirect
from .forms import RegisterForm
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from events.models import Event
from django.db.models import Count
from django.db.models import Count, Q


def index_view(request):
    # просто рендер головної сторінки
    return render(request, "index.html")


def register_view(request):
    # якщо форма відправлена (POST)
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()   # создаём пользователя
            login(request, user) # сразу логиним нового юзера
            return redirect("dashboard")  # редирект на страницу дашборда
    else:
        form = RegisterForm()

    return render(request, "register.html", {"form": form})


@require_POST
@csrf_exempt  # 👉 тимчасово можна залишити, поки не переконаєшся що CSRF працює з фронтенду
def api_login(request):
  
    username = request.POST.get('username')
    password = request.POST.get('password')

    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return JsonResponse({
            "success": True,
            "user": {"id": user.id, "username": user.username}
        })
    return JsonResponse({"success": False, "message": "Invalid credentials"}, status=401)


def csrf_token_view(request):
  
    token = get_token(request)
    return JsonResponse({'csrfToken': token})

@login_required
@ensure_csrf_cookie
def dashboard_view(request):
    user_events = (
        Event.objects
        .filter(
            Q(owner=request.user) | Q(participants__user=request.user)
        )
        .annotate(
            participants_count=Count('participants', distinct=True)
        )
        .distinct()
        .order_by('-created_at')
    )
    return render(request, "dashboard.html", {
        "user_events": user_events
    })