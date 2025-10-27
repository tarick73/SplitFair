# SplitFair/urls.py

from django.contrib import admin
from django.urls import path, include 

urlpatterns = [
    # Django Admin Site
    path('admin/', admin.site.urls),
    
    # 1. Authentication URLs (Login, Logout, etc.)
    # Django includes many built-in auth views under 'accounts/'.
    path('accounts/', include('django.contrib.auth.urls')),
    
    # 2. Custom Authentication URLs (Registration)
    path('accounts/', include('accounts.urls')), # We will create accounts/urls.py next

    # 3. Main Application URLs
    path('', include('events.urls')), # Base path for your main app views (e.g., event list)
]