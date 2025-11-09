from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView
from .views import index_view, register_view, csrf_token_view, api_login, dashboard_view
from events.views import create_event_view

urlpatterns = [
    # головна сторінка
    path("", index_view, name="index"),

    # реєстрація
    path("register/", register_view, name="register"),

    # стандартні Django login/logout (HTML)
    path(
        "login/",
        LoginView.as_view(template_name="login.html"),
        name="login",
    ),
    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),

    # React-friendly API endpoints
    path("api/login/", api_login, name="api_login"),
    path("csrf-token/", csrf_token_view, name="csrf_token"),
    path("dashboard/", dashboard_view, name="dashboard"),
    path("event/create/", create_event_view, name="create_event"),
]
