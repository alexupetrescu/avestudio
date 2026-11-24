"""
School -> Class -> Child -> photos.

This app replaces the per-child ClientAlbum workflow in `clients` for the
school / kindergarten season. `clients` is intentionally left untouched.
"""

import random
import re
import unicodedata
import uuid
from io import BytesIO
from decimal import Decimal

import qrcode
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.core.files import File
from django.db import models, transaction
from django.utils import timezone

from backend.image_variants import build_variants
from backend.school_storage import school_media_storage
from . import pricing


def generate_pin():
    return str(random.randint(1000, 9999))


def fold_name(text: str) -> str:
    """
    Diacritics-insensitive, order-insensitive key for a person's name.

    'Popescu Ana-Maria', 'ana_maria popescu.jpg', 'POPESCU-ANA-MARIA (3)'
    all become 'ana-maria-popescu'.
    """
    if not text:
        return ''
    text = re.sub(r'\.[^.]+$', '', text)                 # drop extension
    text = re.sub(r'\s*\([^)]*\)\s*$', '', text)         # drop trailing "(1)"
    text = re.sub(r'[_\s]+\d+$', '', text)               # drop trailing "_01"
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    tokens = [t for t in re.split(r'[^a-z0-9]+', text.lower()) if t]
    return '-'.join(sorted(tokens))


def _frontend_url(path: str) -> str:
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return f"{base}{path}"


def _make_qr(url: str, filename: str) -> File:
    img = qrcode.make(url)
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return File(buffer, name=filename)


class School(models.Model):
    name = models.CharField(max_length=200)
    city = models.CharField(max_length=120, blank=True)
    contact_name = models.CharField(max_length=120, blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    is_returning_customer = models.BooleanField(
        default=False,
        help_text=(f"Returning schools pay {pricing.tier_display(True)} "
                   f"instead of {pricing.tier_display(False)}."),
    )
    season = models.PositiveIntegerField(default=pricing.SEASON)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-season', 'name']

    @property
    def prices(self) -> dict:
        return pricing.prices_for(self.is_returning_customer)

    @property
    def price_a(self) -> int:
        return self.prices['a']

    @property
    def price_b(self) -> int:
        return self.prices['b']

    @property
    def tier_display(self) -> str:
        return pricing.tier_display(self.is_returning_customer)

    def __str__(self):
        return f"{self.name}{f' ({self.city})' if self.city else ''}"


class PhotoSession(models.Model):
    name = models.CharField(max_length=120, help_text='Christmas, March, Summer, etc.')
    year = models.PositiveIntegerField(default=pricing.SEASON)
    offer_start = models.DateField('Offer period start', null=True, blank=True)
    offer_end = models.DateField('Offer period end', null=True, blank=True)
    packages = models.ManyToManyField('PhotoPackage', through='SessionPackage', related_name='photo_sessions', blank=True)
    date = models.DateField(null=True, blank=True, help_text='Used to order sessions within a year.')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', '-date', '-created_at']

    def clean(self):
        super().clean()
        if self.offer_start and self.offer_end and self.offer_start > self.offer_end:
            raise ValidationError({'offer_end': 'Offer end must be on or after its start.'})

    def __str__(self):
        return f'{self.name} {self.year}'


class PhotoPackage(models.Model):
    class Kind(models.TextChoices):
        BASE = 'base', 'Base package (choose one)'
        EXTRA = 'extra', 'Optional extra'

    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.BASE)
    description = models.TextField(blank=True, help_text='Short description shown on the order form.')
    digital_included = models.BooleanField(default=False)
    list_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)], help_text='Optional original price in lei.')
    new_price = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(0)], help_text='Price in lei for new schools.')
    returning_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)], help_text='Blank uses the new-school price.')
    image = models.ImageField(upload_to='site/packages/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['kind', 'name', 'pk']
        verbose_name = 'Photo package'
        verbose_name_plural = 'Photo packages'

    def clean(self):
        super().clean()
        if self.pk:
            old = type(self).objects.filter(pk=self.pk).values_list('kind', flat=True).first()
            if old != self.kind and self.session_offers.filter(selected_children__isnull=False).exists():
                raise ValidationError({'kind': 'The type cannot change after children have selected this package. Create a new package instead.'})

    def __str__(self):
        return self.name


class PackageItem(models.Model):
    package = models.ForeignKey(PhotoPackage, related_name='items', on_delete=models.CASCADE)
    quantity = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1)])
    name = models.CharField(max_length=180, help_text='Calendar, photograph, greeting card, etc.')
    format = models.CharField(max_length=80, blank=True, help_text='For example 20×30 cm, 45 pieces, or design 2027.')
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'pk']

    def __str__(self):
        return f'{self.quantity} × {self.name}' + (f' · {self.format}' if self.format else '')


class SessionPackage(models.Model):
    session = models.ForeignKey(PhotoSession, related_name='package_offers', on_delete=models.CASCADE)
    package = models.ForeignKey(PhotoPackage, related_name='session_offers', on_delete=models.PROTECT)
    code = models.CharField(max_length=12, validators=[RegexValidator(r'^[A-Za-z0-9][A-Za-z0-9-]*$', 'Use letters, numbers or hyphens.')], help_text='Display label: A, B, C, AA, EXTRA1, etc.')
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, help_text='Disable to stop new selections while retaining existing orders.')
    list_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)], help_text='Optional session override in lei.')
    new_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)], help_text='Blank uses the catalog price.')
    returning_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)], help_text='Blank uses the catalog returning-school price.')
    legacy_key = models.CharField(max_length=1, blank=True, editable=False, default='')

    class Meta:
        ordering = ['sort_order', 'pk']
        constraints = [
            models.UniqueConstraint(fields=['session', 'code'], name='unique_package_code_per_session'),
            models.UniqueConstraint(fields=['session', 'package'], name='unique_package_per_session'),
        ]

    def clean(self):
        super().clean()
        self.code = self.code.upper().strip()
        if self.pk:
            old = type(self).objects.filter(pk=self.pk).values('session_id', 'package_id').first()
            if old and (old['session_id'] != self.session_id or old['package_id'] != self.package_id) and self.selected_children.exists():
                raise ValidationError('This offer is already selected. Add another offer instead of changing its session or package.')

    def save(self, *args, **kwargs):
        self.code = self.code.upper().strip()
        super().save(*args, **kwargs)

    @property
    def available(self):
        return self.is_active and self.package.is_active

    def price_for(self, returning):
        if returning:
            if self.returning_price is not None:
                return self.returning_price
            return self.package.returning_price if self.package.returning_price is not None else (self.new_price if self.new_price is not None else self.package.new_price)
        return self.new_price if self.new_price is not None else self.package.new_price

    @property
    def effective_list_price(self):
        return self.list_price if self.list_price is not None else self.package.list_price

    def __str__(self):
        return f'{self.code} · {self.package.name} · {self.session}'


class ChildProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    pin = models.CharField(max_length=4, default=generate_pin)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['last_name', 'first_name']
        verbose_name = 'Child album'

    @property
    def full_name(self):
        return f'{self.last_name} {self.first_name}'.strip()

    @property
    def album_url(self):
        return _frontend_url(f'/copil/{self.pk}')

    def __str__(self):
        return f'{self.full_name} · {str(self.pk)[:8]}'


class SchoolClass(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(School, related_name='classes', on_delete=models.CASCADE)
    session = models.ForeignKey(PhotoSession, related_name='classes', on_delete=models.PROTECT, null=True)
    name = models.CharField(max_length=120, help_text='e.g. "Grupa Mare", "Clasa a II-a B"')
    teacher_name = models.CharField(max_length=120, blank=True)
    teacher_phone = models.CharField(max_length=40, blank=True)
    pin = models.CharField(max_length=4, default=generate_pin, help_text='Teacher PIN for the online order list')
    qr_code = models.ImageField(upload_to='schools/qr/', blank=True, null=True)
    shoot_date = models.DateField('Shoot date', null=True, blank=True, help_text='Day of the photo session at this class')
    shoot_time = models.TimeField('Shoot time', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['school__name', 'name']
        verbose_name = 'Class'
        verbose_name_plural = 'Classes'

    @property
    def teacher_url(self) -> str:
        return _frontend_url(f"/scoala/{self.id}")

    @property
    def session_label(self):
        return str(self.session) if self.session_id else f'Sesiune {self.school.season}'

    @property
    def prices(self) -> dict:
        from .offers import legacy_prices
        return legacy_prices(self)

    @property
    def price_a(self) -> int:
        return self.prices['a']

    @property
    def shoot_display(self) -> str:
        """'12 noiembrie 2026, ora 09:30' in Romanian, or '' when not scheduled."""
        if not self.shoot_date:
            return ''
        months = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie',
                  'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
        text = f"{self.shoot_date.day} {months[self.shoot_date.month - 1]} {self.shoot_date.year}"
        if self.shoot_time:
            text += f", ora {self.shoot_time.strftime('%H:%M')}"
        return text

    def generate_qr_code(self):
        if self.qr_code:
            self.qr_code.delete(save=False)
        self.qr_code.save(f"qr_class_{self.id}.png", _make_qr(self.teacher_url, f"qr_class_{self.id}.png"), save=False)

    def save(self, *args, **kwargs):
        if not self.qr_code:
            self.generate_qr_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.school.name} - {self.name} · {self.session_label}"


class Child(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey(SchoolClass, related_name='children', on_delete=models.CASCADE)
    profile = models.ForeignKey(
        ChildProfile, related_name='enrollments', on_delete=models.PROTECT, null=True, blank=True,
        help_text='Reuse the same child album for later sessions. Leave empty for a new child.',
    )
    first_name = models.CharField('Prenume', max_length=120)
    last_name = models.CharField('Nume', max_length=120)
    match_key = models.CharField(max_length=255, editable=False, db_index=True, blank=True)
    package_a = models.BooleanField('A · Standard', default=False)
    package_b = models.BooleanField('B · Extra', default=False)
    package_c = models.BooleanField('C · Breloc', default=False)
    package_d = models.BooleanField('D · Magnet', default=False)
    package_e = models.BooleanField('E · Puzzle', default=False)
    notes = models.CharField(max_length=255, blank=True)
    pin = models.CharField(max_length=4, default=generate_pin, help_text='PIN for the child album')
    qr_code = models.ImageField(upload_to='schools/qr/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    entry_index = models.PositiveBigIntegerField('Entry index', editable=False)
    package_choices = models.ManyToManyField(SessionPackage, through='ChildPackageChoice', related_name='selected_children', blank=True, editable=False)

    class Meta:
        ordering = ['last_name', 'first_name']
        verbose_name_plural = 'Children'
        constraints = [
            models.UniqueConstraint(fields=['school_class', 'match_key'], name='unique_child_per_class'),
            models.UniqueConstraint(fields=['school_class', 'profile'], name='unique_child_profile_per_class'),
            models.UniqueConstraint(fields=['school_class', 'entry_index'], name='unique_child_entry_per_class'),
        ]

    @property
    def full_name(self) -> str:
        return f"{self.last_name} {self.first_name}".strip()

    @property
    def album_url(self) -> str:
        return _frontend_url(f"/copil/{self.profile_id or self.id}")

    def has(self, key: str) -> bool:
        return bool(getattr(self, f'package_{key}'))

    @property
    def package_ids(self):
        from .offers import child_package_ids
        return child_package_ids(self)

    @property
    def total_lei(self):
        from .offers import child_package_ids, catalog_for_class
        selected = set(child_package_ids(self))
        return sum((offer['price'] for offer in catalog_for_class(self.school_class) if offer['id'] in selected), Decimal('0.00'))

    @property
    def packages(self) -> str:
        from .offers import child_package_ids, catalog_for_class
        selected = set(child_package_ids(self))
        return ', '.join(offer['code'] for offer in catalog_for_class(self.school_class) if offer['id'] in selected) or '-'

    def clean(self):
        super().clean()
        if self.package_a and self.package_b:
            raise ValidationError('Alegeți fie Pachetul Standard (A), fie Pachetul Extra (B), nu amândouă.')

    def generate_qr_code(self):
        if self.qr_code:
            self.qr_code.delete(save=False)
        self.qr_code.save(f"qr_child_{self.id}.png", _make_qr(self.album_url, f"qr_child_{self.id}.png"), save=False)

    def save(self, *args, **kwargs):
        self.first_name = self.first_name.strip()
        self.last_name = self.last_name.strip()
        self.match_key = fold_name(f"{self.last_name} {self.first_name}")
        if self.package_a and self.package_b:
            raise ValidationError('Alegeți fie Pachetul Standard (A), fie Pachetul Extra (B), nu amândouă.')
        with transaction.atomic():
            previous = (
                type(self).objects.filter(pk=self.pk).values('profile_id', 'school_class_id', 'entry_index', *[f'package_{key}' for key in pricing.LETTERS]).first()
                if not self._state.adding else None
            )
            if previous is None or previous['school_class_id'] != self.school_class_id:
                # Lock the parent so simultaneous additions receive distinct, increasing indexes.
                SchoolClass.objects.select_for_update().get(pk=self.school_class_id)
                latest = type(self).objects.filter(school_class_id=self.school_class_id).aggregate(
                    latest=models.Max('entry_index'),
                )['latest'] or 0
                self.entry_index = latest + 1
                if kwargs.get('update_fields') is not None:
                    kwargs['update_fields'] = set(kwargs['update_fields']) | {'entry_index'}
            else:
                self.entry_index = previous['entry_index']
            legacy_changed = any(getattr(self, f'package_{key}') != (previous[f'package_{key}'] if previous else False) for key in pricing.LETTERS)
            moved = previous is not None and previous['school_class_id'] != self.school_class_id
            previous_profile = previous['profile_id'] if previous else None
            if not self.profile_id:
                self.profile = ChildProfile.objects.create(
                    id=self.pk, first_name=self.first_name, last_name=self.last_name, pin=self.pin,
                )
            self.pin = self.profile.pin
            if not self.qr_code or (previous_profile and previous_profile != self.profile_id):
                self.generate_qr_code()
            super().save(*args, **kwargs)
            if legacy_changed or moved:
                from .offers import sync_legacy_choices
                sync_legacy_choices(self, moved=moved, legacy_changed=legacy_changed)

    def __str__(self):
        return self.full_name


class ChildPackageChoice(models.Model):
    child = models.ForeignKey(Child, on_delete=models.CASCADE)
    offer = models.ForeignKey(SessionPackage, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['child', 'offer'], name='unique_child_package_choice')]


def _class_id_of(instance):
    if hasattr(instance, 'school_class_id'):
        return instance.school_class_id
    return instance.child.school_class_id


def upload_orig(instance, filename):
    return f"schools/{_class_id_of(instance)}/orig/{filename}"


def upload_web(instance, filename):
    return f"schools/{_class_id_of(instance)}/web/{filename}"


def upload_thumb(instance, filename):
    return f"schools/{_class_id_of(instance)}/thumb/{filename}"


def upload_ref(instance, filename):
    return f"schools/{_class_id_of(instance)}/refs/{filename}"


class ClassPhoto(models.Model):
    school_class = models.ForeignKey(SchoolClass, related_name='photos', on_delete=models.CASCADE)
    image = models.ImageField('Original', upload_to=upload_orig, storage=school_media_storage, max_length=500)
    web = models.ImageField(upload_to=upload_web, storage=school_media_storage, max_length=500, blank=True, null=True, editable=False)
    thumb = models.ImageField(upload_to=upload_thumb, storage=school_media_storage, max_length=500, blank=True, null=True, editable=False)
    width = models.PositiveIntegerField(default=0, editable=False)
    height = models.PositiveIntegerField(default=0, editable=False)
    faces_processed = models.BooleanField(default=False, db_index=True)
    children = models.ManyToManyField(Child, through='PhotoMatch', related_name='photos', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    @property
    def filename(self) -> str:
        return self.image.name.split('/')[-1] if self.image else ''

    def build_variants(self):
        """(Re)generate web + thumb from the original. Does not save the row."""
        source = self.image.file if not self.image.closed else self.image.open('rb')
        result = build_variants(source, self.filename or 'photo.jpg')
        source.seek(0)
        self.width, self.height = result.width, result.height
        if self.web:
            self.web.delete(save=False)
        if self.thumb:
            self.thumb.delete(save=False)
        self.web.save(result.web.name, result.web, save=False)
        self.thumb.save(result.thumb.name, result.thumb, save=False)

    def save(self, *args, **kwargs):
        if self.image and not self.web:
            self.build_variants()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.filename} (#{self.id})"


class PhotoMatch(models.Model):
    SOURCE_FACE = 'face'
    SOURCE_FILENAME = 'filename'
    SOURCE_MANUAL = 'manual'
    SOURCE_ALL = 'all'
    SOURCES = [
        (SOURCE_FACE, 'Face recognition'),
        (SOURCE_FILENAME, 'Filename'),
        (SOURCE_MANUAL, 'Manual'),
        (SOURCE_ALL, 'Whole class'),
    ]

    photo = models.ForeignKey(ClassPhoto, related_name='matches', on_delete=models.CASCADE)
    child = models.ForeignKey(Child, related_name='matches', on_delete=models.CASCADE)
    confidence = models.FloatField(default=1.0, help_text='1 = certain. For faces: 1 - distance/threshold.')
    source = models.CharField(max_length=10, choices=SOURCES, default=SOURCE_MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['photo', 'child'], name='unique_photo_child'),
        ]

    def __str__(self):
        return f"{self.photo_id} -> {self.child}"


class FaceReference(models.Model):
    child = models.ForeignKey(Child, related_name='face_references', on_delete=models.CASCADE)
    image = models.ImageField(upload_to=upload_ref, storage=school_media_storage, max_length=500)
    embedding = models.JSONField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Reference for {self.child}"


class FaceJob(models.Model):
    PENDING, RUNNING, DONE, FAILED = 'pending', 'running', 'done', 'failed'
    STATUSES = [(PENDING, 'Pending'), (RUNNING, 'Running'), (DONE, 'Done'), (FAILED, 'Failed')]

    school_class = models.ForeignKey(SchoolClass, related_name='face_jobs', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUSES, default=PENDING)
    total = models.PositiveIntegerField(default=0)
    processed = models.PositiveIntegerField(default=0)
    matched_photos = models.PositiveIntegerField(default=0)
    unmatched_photos = models.PositiveIntegerField(default=0)
    log = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def append_log(self, line: str):
        stamp = timezone.now().strftime('%H:%M:%S')
        self.log = (self.log + f"[{stamp}] {line}\n")[-20000:]

    @property
    def is_active(self) -> bool:
        return self.status in (self.PENDING, self.RUNNING)

    def __str__(self):
        return f"FaceJob {self.id} ({self.status}) - {self.school_class}"


class ClassUpload(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    run_matching = models.BooleanField(default=True)
    finished = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class UploadReceipt(models.Model):
    upload = models.ForeignKey(ClassUpload, related_name='receipts', on_delete=models.CASCADE)
    key = models.UUIDField()
    kind = models.CharField(max_length=12)
    filename = models.CharField(max_length=255)
    size = models.PositiveBigIntegerField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=['upload', 'key'], name='unique_class_upload_file')]


class ClassAssistant(models.Model):
    """An explicit grant to manage children and photos in one existing class."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='class_assignments')
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='assistant_assignments')

    class Meta:
        verbose_name = 'CRM class access'
        verbose_name_plural = 'CRM class access'
        constraints = [models.UniqueConstraint(fields=['user', 'school_class'], name='unique_class_assistant')]

    def __str__(self):
        return f'{self.user} · {self.school_class}'


class AssistantUploadReceipt(models.Model):
    """A durable receipt prevents duplicate mobile uploads after a lost response."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    child = models.ForeignKey(Child, on_delete=models.CASCADE)
    key = models.UUIDField()
    kind = models.CharField(max_length=12, choices=[('photo', 'Album photo'), ('reference', 'Reference portrait')])
    filename = models.CharField(max_length=255)
    size = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'key'], name='unique_assistant_upload')]
