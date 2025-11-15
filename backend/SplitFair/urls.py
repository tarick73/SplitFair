# SplitFair/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # админка Django
    path("admin/", admin.site.urls),

    # все наши страницы (главная, регистрация, логин, логаут)
    path("", include("accounts.urls")),

     path("api/events/", include("events.api_urls")),
]
