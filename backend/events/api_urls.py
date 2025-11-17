from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_events_api, name='list_events_api'),           # GET /api/events/
    path('create/', views.create_event_api, name='create_event_api'), # POST /api/events/create/
]