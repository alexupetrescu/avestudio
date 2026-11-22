from django.db import transaction
from django.db.models import Count, DateField, F, Q
from django.db.models.functions import Coalesce, TruncDate

from .models import Child, ChildProfile, SchoolClass


@transaction.atomic
def copy_roster(source, *, name, session, shoot_date=None, shoot_time=None):
    target = SchoolClass.objects.create(
        school=source.school, name=name, session=session,
        teacher_name=source.teacher_name, teacher_phone=source.teacher_phone,
        shoot_date=shoot_date, shoot_time=shoot_time,
    )
    for old in source.children.select_related('profile'):
        if not old.profile_id:
            old.save()
        Child.objects.create(
            school_class=target, profile=old.profile,
            first_name=old.first_name, last_name=old.last_name,
        )
    return target


def album_enrollments(child):
    queryset = Child.objects.filter(profile_id=child.profile_id) if child.profile_id else Child.objects.filter(pk=child.pk)
    return queryset.select_related('school_class__school', 'school_class__session', 'profile').annotate(
        photo_count=Count('photos', filter=Q(photos__school_class_id=F('school_class_id')), distinct=True),
        album_date=Coalesce(
            'school_class__shoot_date', 'school_class__session__date',
            TruncDate('school_class__session__created_at'), TruncDate('school_class__created_at'),
            output_field=DateField(),
        ),
    ).order_by(
        F('school_class__session__year').desc(nulls_last=True),
        '-album_date', '-school_class__created_at',
    )


def resolve_album(child_id, pin, session_id=None):
    # Preserve existing URLs and PINs; only explicitly linked rosters share history.
    profile = ChildProfile.objects.filter(pk=child_id, pin=pin).first()
    anchor = (
        Child.objects.filter(profile=profile).first() if profile else
        Child.objects.filter(pk=child_id, pin=pin).first()
    )
    if anchor is None:
        return None
    enrollments = album_enrollments(anchor)
    return enrollments.filter(pk=session_id).first() if session_id else enrollments.first()
