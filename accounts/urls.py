# accounts/urls.py
from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView
from .views import index_view, register_view, dashboard_view
from events.views import create_event_view

urlpatterns = [
    # главная страница "/"
    path("", index_view, name="index"),

    # страница регистрации "/register/"
    path("register/", register_view, name="register"),

    # страница логина "/login/"
    path(
        "login/",
        LoginView.as_view(template_name="login.html"),
        name="login",
    ),

    # логаут "/logout/"
    # logout по умолчанию делает POST-запрос
    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),

    path("dashboard/", dashboard_view, name="dashboard"),

    path("event/create/", create_event_view, name="create_event"),
]
