# accounts/forms.py
from django import forms
from django.contrib.auth.models import User
from events.models import Event


class RegisterForm(forms.ModelForm):
    username = forms.CharField(label="Username")
    email = forms.EmailField(label="Email (optional)", required=False)
    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput
    )
    password2 = forms.CharField(
        label="Repeat password",
        widget=forms.PasswordInput
    )

    class Meta:
        model = User
        fields = ("username", "email")

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("Passwords don't match")
        return p2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])  # хэшируем пароль
        if commit:
            user.save()
        return user

class EventForm(forms.ModelForm):
    participants = forms.CharField(
        widget=forms.Textarea(attrs={"rows": 2}),
        help_text="Enter participant names separated by commas",
        required=False
    )

    class Meta:
        model = Event
        fields = ['title']  # Only include title as other fields are auto-populated
        widgets = {
            'title': forms.TextInput(attrs={'placeholder': 'Event name'})
        }