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

import qrcode
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files import File
from django.db import models
from django.utils import timezone

from backend.image_variants import build_variants
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


class SchoolClass(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(School, related_name='classes', on_delete=models.CASCADE)
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
    def prices(self) -> dict:
        return self.school.prices

    @property
    def price_a(self) -> int:
        return self.school.price_a

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
        return f"{self.school.name} - {self.name}"


class Child(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey(SchoolClass, related_name='children', on_delete=models.CASCADE)
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

    class Meta:
        ordering = ['last_name', 'first_name']
        verbose_name_plural = 'Children'
        constraints = [
            models.UniqueConstraint(fields=['school_class', 'match_key'], name='unique_child_per_class'),
        ]

    @property
    def full_name(self) -> str:
        return f"{self.last_name} {self.first_name}".strip()

    @property
    def album_url(self) -> str:
        return _frontend_url(f"/copil/{self.id}")

    def has(self, key: str) -> bool:
        return bool(getattr(self, f'package_{key}'))

    @property
    def total_lei(self) -> int:
        prices = self.school_class.prices
        return sum(prices[k] for k in pricing.LETTERS if self.has(k))

    @property
    def packages(self) -> str:
        return ''.join(k.upper() for k in pricing.LETTERS if self.has(k)) or '-'

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
        if not self.qr_code:
            self.generate_qr_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.full_name


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
    image = models.ImageField('Original', upload_to=upload_orig)
    web = models.ImageField(upload_to=upload_web, blank=True, null=True, editable=False)
    thumb = models.ImageField(upload_to=upload_thumb, blank=True, null=True, editable=False)
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
    image = models.ImageField(upload_to=upload_ref)
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
