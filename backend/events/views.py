from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from accounts.forms import EventForm
from events.models import Event, EventParticipant
from django.contrib.auth.models import User

# Старий view для HTML форми
@login_required
def create_event_view(request):
    if request.method == "POST":
        form = EventForm(request.POST)
        if form.is_valid():
            event = form.save(commit=False)
            event.owner = request.user
            event.save()

            participants_text = form.cleaned_data.get('participants', '')
            if participants_text:
                participant_names = [name.strip() for name in participants_text.split(',')]
                for name in participant_names:
                    if name:
                        user, _ = User.objects.get_or_create(username=name)
                        EventParticipant.objects.create(
                            event=event, 
                            user=user,
                            role='member')

            return redirect("dashboard")
    else:
        form = EventForm()

    return render(request, "create_event_form.html", {"form": form})


# НОВИЙ API endpoint для React
@login_required
def create_event_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            event = Event.objects.create(
                title=data.get('title'),
                owner=request.user
            )
            
            participants = data.get('participants', [])
            for participant_name in participants:
                if participant_name:
                    user, _ = User.objects.get_or_create(username=participant_name)
                    EventParticipant.objects.create(
                        event=event, 
                        user=user,
                        role='member'
                    )
            
            return JsonResponse({
                'id': event.id,
                'title': event.title,
                'owner': event.owner.username,
                'participants_count': event.participants.count(),
                'created_at': event.created_at.isoformat()
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)