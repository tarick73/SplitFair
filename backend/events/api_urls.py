from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_events_api, name='list_events_api'),
    path('create/', views.create_event_api, name='create_event_api'),
    path('join/', views.join_event_api, name='join_event_api'),

    path('<int:event_id>/', views.event_detail_api, name='event_detail_api'),
    path('<int:event_id>/participants/', views.add_participant_api, name='add_participant_api'),
    path('<int:event_id>/transactions/', views.add_transaction_api, name='add_transaction_api'),
    path('<int:event_id>/settle/', views.settle_event_api, name='event_settle'),
]
