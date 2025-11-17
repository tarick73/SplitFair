from django.urls import path
from . import views  # 👈 ВАЖЛИВО!

urlpatterns = [
    path('create/', views.create_event_api, name='create_event_api'),  # буде api/events/create/
    path('<int:event_id>/settle/', views.settle_event_api, name='event_settle'),
]