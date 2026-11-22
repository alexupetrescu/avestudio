from django import forms


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
