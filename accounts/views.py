# accounts/views.py
from django.shortcuts import render, redirect
from django.contrib.auth import login
from .forms import RegisterForm
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from events.models import Event


def index_view(request):
    # просто рендер главной страницы
    return render(request, "index.html")


def register_view(request):
    # если форма отправлена (POST)
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()   # создаём пользователя
            login(request, user) # сразу логиним нового юзера
            return redirect("dashboard")  # редирект на страницу дашборда
    else:
        # если просто зашли на страницу регистрации (GET)
        form = RegisterForm()

    return render(request, "register.html", {"form": form})

@login_required
@ensure_csrf_cookie
def dashboard_view(request):
    user_events = Event.objects.filter(owner=request.user).order_by('-created_at')
    return render(request, "dashboard.html", {
        "user_events": user_events
    })
