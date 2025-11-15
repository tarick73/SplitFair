from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from events.models import Event, EventParticipant
from django.contrib.auth.models import User

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_event_api(request):
    name = request.data.get("name")
    description = request.data.get("description")
    participants = request.data.get("participants", "")

    if not name:
        return Response({"error": "Name is required"}, status=400)

    event = Event.objects.create(
        title=name,
        description=description,
        owner=request.user
    )

    # participants: "john, anna, mike"
    if participants:
        for username in [u.strip() for u in participants.split(",") if u.strip()]:
            user, _ = User.objects.get_or_create(username=username)
            EventParticipant.objects.create(event=event, user=user, role="member")

    return Response({"message": "Event created successfully"}, status=201)
