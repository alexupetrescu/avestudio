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


class ChildPackageForm(forms.ModelForm):
    package_selection = forms.ModelMultipleChoiceField(queryset=None, required=False, label='Packages', widget=forms.CheckboxSelectMultiple)

    class Meta:
        from .models import Child
        model = Child
        exclude = ('package_choices',)

    def __init__(self, *args, school_class=None, **kwargs):
        from .models import SessionPackage, SchoolClass
        from .offers import default_package_ids, session_offers
        super().__init__(*args, **kwargs)
        self.order_class = school_class or (self.instance.school_class if self.instance.school_class_id else None)
        if school_class is None and self.is_bound and self.data.get('school_class'):
            try:
                self.order_class = SchoolClass.objects.select_related('school', 'session').get(pk=self.data['school_class'])
            except (SchoolClass.DoesNotExist, ValueError, forms.ValidationError):
                pass
        queryset = SessionPackage.objects.select_related('package', 'session')
        if self.order_class and self.order_class.session_id:
            queryset = queryset.filter(session_id=self.order_class.session_id)
        self.fields['package_selection'].queryset = queryset
        self.fields['package_selection'].label_from_instance = lambda offer: str(offer) + ('' if offer.available else ' [Unavailable for new orders]')
        if not self.instance._state.adding:
            self.initial['package_selection'] = [offer.pk for offer in self.instance.package_choices.all()]
        elif self.order_class and session_offers(self.order_class):
            self.initial['package_selection'] = default_package_ids(self.order_class)

    def clean(self):
        from .offers import session_offers, validate_package_ids
        cleaned = super().clean()
        group = cleaned.get('school_class') or self.order_class
        if group and session_offers(group) and 'package_selection' in cleaned:
            validate_package_ids(group, [str(offer.pk) for offer in cleaned['package_selection']], child=self.instance, require_base=False)
        return cleaned

    def _save_m2m(self):
        from .offers import session_offers, set_child_packages
        super()._save_m2m()
        if 'package_selection' in self.cleaned_data and session_offers(self.instance.school_class):
            set_child_packages(self.instance, [str(offer.pk) for offer in self.cleaned_data['package_selection']])


class ChildPackageInlineFormSet(forms.models.BaseInlineFormSet):
    def get_form_kwargs(self, index):
        return {**super().get_form_kwargs(index), 'school_class': self.instance}


class SessionPackageFormSet(forms.models.BaseInlineFormSet):
    def clean(self):
        super().clean()
        for form in self.forms:
            if form.cleaned_data.get('DELETE') and form.instance.pk and form.instance.selected_children.exists():
                form.add_error('DELETE', 'This offer is selected by children. Disable it instead of deleting it.')
