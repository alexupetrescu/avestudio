"""
Background face-matching job for a class.

Runs in a daemon thread started from the admin (or synchronously from the
`process_faces` management command). Progress lives in the FaceJob row so the
admin page can poll it.
"""

from __future__ import annotations

import logging
import threading

import numpy as np
from django.db import close_old_connections, connection, transaction
from django.utils import timezone
from PIL import Image, ImageOps

from . import face_engine
from .models import Child, ClassPhoto, FaceJob, FaceReference, PhotoMatch, SchoolClass, fold_name

logger = logging.getLogger(__name__)


def _open_image(field) -> Image.Image:
    field.open('rb')
    try:
        img = Image.open(field)
        img.load()
    finally:
        field.close()
    return ImageOps.exif_transpose(img)


def embed_references(school_class: SchoolClass, log=None) -> dict:
    """
    Make sure every FaceReference of the class has an embedding. Returns
    {child_id: [np.ndarray, ...]} for children that have at least one.
    """
    references: dict = {}
    if not face_engine.available():
        return references
    refs = FaceReference.objects.filter(child__school_class=school_class).select_related('child')
    for ref in refs:
        if ref.embedding is None:
            try:
                emb = face_engine.embed_reference(_open_image(ref.image))
            except Exception as exc:
                logger.exception("Reference %s failed", ref.pk)
                if log:
                    log(f"Reference for {ref.child}: error {exc}")
                continue
            if emb is None:
                if log:
                    log(f"Reference for {ref.child}: no face found in {ref.image.name.split('/')[-1]}")
                continue
            ref.embedding = [float(v) for v in emb]
            ref.save(update_fields=['embedding'])
        references.setdefault(ref.child_id, []).append(np.asarray(ref.embedding, dtype=np.float32))
    return references


def add_match(photo: ClassPhoto, child_id, source: str, confidence: float = 1.0) -> bool:
    """Create or strengthen a PhotoMatch. Returns True if created."""
    with transaction.atomic():
        match, created = PhotoMatch.objects.get_or_create(
            photo=photo, child_id=child_id,
            defaults={'source': source, 'confidence': confidence},
        )
        if not created and confidence > match.confidence:
            match.confidence = confidence
            match.source = source
            match.save(update_fields=['confidence', 'source'])
    return created


def process_photo(photo: ClassPhoto, references: dict, children_by_key: dict, log=None) -> int:
    """Match one photo. Returns the number of children it is linked to afterwards."""
    # 1) filename convention "nume prenume (3).jpg"
    key = fold_name(photo.filename)
    if key and key in children_by_key:
        add_match(photo, children_by_key[key], PhotoMatch.SOURCE_FILENAME, 1.0)

    # 2) faces
    if references and face_engine.available():
        source_field = photo.web or photo.image
        faces = face_engine.embed_faces(_open_image(source_field))
        for face in faces:
            result = face_engine.match(face.embedding, references)
            if result is None:
                continue
            add_match(photo, result.child_id, PhotoMatch.SOURCE_FACE,
                      face_engine.confidence_from_distance(result.distance))
        if log and not faces:
            log(f"{photo.filename}: no faces detected")

    photo.faces_processed = True
    photo.save(update_fields=['faces_processed'])
    return photo.matches.count()


def run_job(job_id: int):
    close_old_connections()
    job = FaceJob.objects.select_related('school_class').get(pk=job_id)
    school_class = job.school_class

    def log(line: str):
        job.append_log(line)

    job.status = FaceJob.RUNNING
    job.started_at = timezone.now()
    if not face_engine.available():
        log(f"Face engine unavailable ({face_engine.unavailable_reason()}); filename matching only.")
    job.save()

    try:
        references = embed_references(school_class, log)
        log(f"{sum(len(v) for v in references.values())} reference embedding(s) for "
            f"{len(references)} child(ren).")
        children_by_key = {c.match_key: c.id for c in Child.objects.filter(school_class=school_class)}

        photos = list(ClassPhoto.objects.filter(school_class=school_class, faces_processed=False).order_by('id'))
        job.total = len(photos)
        job.processed = job.matched_photos = job.unmatched_photos = 0
        job.save()

        for photo in photos:
            try:
                linked = process_photo(photo, references, children_by_key, log)
                if linked:
                    job.matched_photos += 1
                else:
                    job.unmatched_photos += 1
            except Exception as exc:
                logger.exception("Photo %s failed", photo.pk)
                log(f"{photo.filename}: error {exc}")
                job.unmatched_photos += 1
            job.processed += 1
            job.save(update_fields=['processed', 'matched_photos', 'unmatched_photos', 'log'])

        job.status = FaceJob.DONE
        log(f"Done: {job.matched_photos} matched, {job.unmatched_photos} need review.")
    except Exception as exc:
        logger.exception("Face job %s failed", job_id)
        job.status = FaceJob.FAILED
        log(f"FAILED: {exc}")
    finally:
        job.finished_at = timezone.now()
        job.save()
        connection.close()


def start_face_job(school_class: SchoolClass, reset: bool = False) -> FaceJob:
    """
    Queue a job for the class and run it in a background thread.
    `reset=True` re-processes every photo (keeps manual matches, drops
    face/filename ones).
    """
    active = FaceJob.objects.filter(school_class=school_class, status__in=[FaceJob.PENDING, FaceJob.RUNNING]).first()
    if active:
        return active

    if reset:
        PhotoMatch.objects.filter(
            photo__school_class=school_class,
            source__in=[PhotoMatch.SOURCE_FACE, PhotoMatch.SOURCE_FILENAME],
        ).delete()
        ClassPhoto.objects.filter(school_class=school_class).update(faces_processed=False)

    job = FaceJob.objects.create(school_class=school_class)
    thread = threading.Thread(target=run_job, args=(job.pk,), name=f"face-job-{job.pk}", daemon=True)
    thread.start()
    return job
