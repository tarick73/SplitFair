from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from accounts.forms import EventForm
from events.models import Event, EventParticipant
from django.contrib.auth.models import User

@login_required
def create_event_view(request):
    if request.method == "POST":
        form = EventForm(request.POST)
        if form.is_valid():
            event = form.save(commit=False)
            event.owner = request.user
            event.save()

            # Handle participants
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
