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


class PackageQuantityWidget(forms.Widget):
    template_name = 'schools/widgets/package_quantities.html'

    def __init__(self, offers=(), attrs=None):
        super().__init__(attrs)
        self.offers = offers

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        quantities = value or {}
        if isinstance(quantities, list):
            quantities = dict.fromkeys(map(str, quantities), 1)
        context['widget']['offers'] = [{
            **offer, 'input_name': f"{name}_{offer['id']}",
            'input_id': f"{context['widget']['attrs'].get('id', name)}_{index}",
            'quantity': quantities.get(offer['id'], 0),
        } for index, offer in enumerate(self.offers)]
        return context

    def value_from_datadict(self, data, files, name):
        names = [(offer['id'], f"{name}_{offer['id']}") for offer in self.offers]
        if any(input_name in data for _, input_name in names):
            return {offer_id: data.get(input_name, '0') for offer_id, input_name in names}
        # Accept selections from an already-open, older admin form.
        return {str(value): 1 for value in (data.getlist(name) if hasattr(data, 'getlist') else data.get(name, []))}

    def id_for_label(self, id_):
        return ''


class PackageQuantityField(forms.Field):
    def to_python(self, value):
        quantities = {}
        for offer_id, raw in (value or {}).items():
            quantity = forms.IntegerField(min_value=0, max_value=99, required=False).clean(raw) or 0
            if quantity:
                quantities[offer_id] = quantity
        return quantities


class ChildPackageForm(forms.ModelForm):
    package_selection = PackageQuantityField(required=False, label='Package quantities')

    class Meta:
        from .models import Child
        model = Child
        exclude = ('package_choices', 'package_a', 'package_b', 'package_c', 'package_d', 'package_e')

    def __init__(self, *args, school_class=None, **kwargs):
        from .models import SchoolClass
        from .offers import catalog_for_class, child_package_quantities, default_package_ids
        super().__init__(*args, **kwargs)
        self.order_class = school_class or (self.instance.school_class if self.instance.school_class_id else None)
        if school_class is None and self.is_bound and self.data.get('school_class'):
            try:
                self.order_class = SchoolClass.objects.select_related('school', 'session').get(pk=self.data['school_class'])
            except (SchoolClass.DoesNotExist, ValueError, forms.ValidationError):
                pass
        if self.order_class is not None and not self.order_class.school_id:
            self.order_class = None
        self.fields['package_selection'].widget = PackageQuantityWidget(catalog_for_class(self.order_class) if self.order_class else [])
        if not self.instance._state.adding:
            self.initial['package_selection'] = child_package_quantities(self.instance)
        elif self.order_class:
            self.initial['package_selection'] = dict.fromkeys(default_package_ids(self.order_class), 1)

    def clean(self):
        from .offers import validate_package_quantities
        cleaned = super().clean()
        group = cleaned.get('school_class') or self.order_class
        if group and 'package_selection' in cleaned:
            validate_package_quantities(group, cleaned['package_selection'], child=self.instance if not self.instance._state.adding else None, require_base=False)
        return cleaned

    def _save_m2m(self):
        from .offers import set_child_packages
        super()._save_m2m()
        if 'package_selection' in self.cleaned_data:
            set_child_packages(self.instance, self.cleaned_data['package_selection'])


class ChildPackageInlineFormSet(forms.models.BaseInlineFormSet):
    def get_form_kwargs(self, index):
        return {**super().get_form_kwargs(index), 'school_class': self.instance}


class SessionPackageFormSet(forms.models.BaseInlineFormSet):
    def clean(self):
        super().clean()
        for form in self.forms:
            if form.cleaned_data.get('DELETE') and form.instance.pk and form.instance.selected_children.exists():
                form.add_error('DELETE', 'This offer is selected by children. Disable it instead of deleting it.')
