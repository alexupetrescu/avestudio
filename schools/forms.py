from django import forms
from .models import ChildProfile, PhotoSession


class ChildReferencePhotoForm(forms.Form):
    image = forms.ImageField(
        label='Choose a photo', required=False,
        widget=forms.FileInput(attrs={'accept': 'image/*'}),
    )
    camera_image = forms.ImageField(
        label='Take a photo', required=False,
        widget=forms.FileInput(attrs={'accept': 'image/*', 'capture': 'environment'}),
        help_text='On a supported phone, this opens the camera.',
    )
    run_matching = forms.BooleanField(
        label='Run face matching after upload', required=False, initial=True,
    )

    def clean(self):
        cleaned = super().clean()
        image = cleaned.get('image')
        camera_image = cleaned.get('camera_image')
        if image and camera_image:
            raise forms.ValidationError('Choose one photo: upload a file or take a photo.')
        if not image and not camera_image and not self.errors:
            raise forms.ValidationError('Choose a photo or take one with your phone camera.')
        cleaned['reference_image'] = image or camera_image
        return cleaned


class NewSessionRosterForm(forms.Form):
    name = forms.CharField(max_length=120, label='Class name')
    session = forms.ModelChoiceField(queryset=PhotoSession.objects.all())
    shoot_date = forms.DateField(required=False, widget=forms.DateInput(attrs={'type': 'date'}))
    shoot_time = forms.TimeField(required=False, widget=forms.TimeInput(attrs={'type': 'time'}))


class ExistingChildForm(forms.Form):
    child = forms.ModelChoiceField(queryset=ChildProfile.objects.all(), label='Existing child album')

    def __init__(self, *args, school_class, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['child'].queryset = ChildProfile.objects.filter(
            enrollments__school_class__school=school_class.school,
        ).exclude(enrollments__school_class=school_class).distinct()


class QueuedPhotoForm(forms.Form):
    key = forms.UUIDField()
    kind = forms.ChoiceField(choices=[('images', 'Class photo'), ('references', 'Reference portrait')])
    image = forms.ImageField()

    def clean_image(self):
        image = self.cleaned_data['image']
        if image.size > 64 * 1024 * 1024:
            raise forms.ValidationError('Each photo must be 64 MB or smaller.')
        return image
