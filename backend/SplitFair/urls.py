# SplitFair/urls.py
from django.contrib import admin
from django.urls import path, include
from events import views

urlpatterns = [
    # админка Django
    path("admin/", admin.site.urls),

    # все наши страницы (главная, регистрация, логин, логаут)
    path("", include("accounts.urls")),
    path("api/users/", views.list_users_api, name="list_users_api"),
     path("api/events/", include("events.api_urls")),
]
