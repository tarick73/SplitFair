# accounts/views.py
from django.shortcuts import render, redirect
from django.contrib.auth import login
from .forms import RegisterForm


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
            return redirect("index")
    else:
        # если просто зашли на страницу регистрации (GET)
        form = RegisterForm()

    return render(request, "register.html", {"form": form})
