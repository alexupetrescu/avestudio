"""
Face detection + embedding, wrapped so the rest of the app never imports torch
directly. Uses facenet-pytorch (MTCNN detector + InceptionResnetV1 trained on
VGGFace2, 512-d L2-normalised embeddings) on CPU.

If torch / facenet-pytorch are not installed, `available()` is False and the
caller falls back to filename matching only.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from typing import Optional

import numpy as np
from django.conf import settings
from PIL import Image

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_models = None
_import_error: Optional[str] = None


@dataclass
class DetectedFace:
    box: tuple[float, float, float, float]   # x1, y1, x2, y2 in source pixels
    prob: float
    embedding: np.ndarray

    @property
    def area(self) -> float:
        x1, y1, x2, y2 = self.box
        return max(0.0, x2 - x1) * max(0.0, y2 - y1)


def available() -> bool:
    global _import_error
    if _import_error is not None:
        return False
    try:
        import torch  # noqa: F401
        import facenet_pytorch  # noqa: F401
        return True
    except Exception as exc:  # ImportError, DLL errors on Windows, ...
        _import_error = str(exc)
        logger.warning("Face recognition unavailable: %s", exc)
        return False


def unavailable_reason() -> str:
    available()
    return _import_error or ''


def _load():
    """Lazy, thread-safe singleton for the detector + embedder."""
    global _models
    if _models is None:
        with _lock:
            if _models is None:
                import torch
                from facenet_pytorch import MTCNN, InceptionResnetV1

                torch.set_num_threads(max(1, (torch.get_num_threads() or 4)))
                device = torch.device('cpu')
                mtcnn = MTCNN(keep_all=True, min_face_size=40, thresholds=[0.6, 0.7, 0.8],
                              post_process=True, device=device)
                resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
                _models = (mtcnn, resnet, torch)
                logger.info("Face models loaded (CPU)")
    return _models


def embed_faces(image: Image.Image) -> list[DetectedFace]:
    """Detect every face in the image and return its embedding."""
    mtcnn, resnet, torch = _load()
    img = image.convert('RGB')
    boxes, probs = mtcnn.detect(img)
    if boxes is None or len(boxes) == 0:
        return []
    faces = mtcnn.extract(img, boxes, None)   # (N, 3, 160, 160), already normalised
    if faces is None:
        return []
    if faces.dim() == 3:
        faces = faces.unsqueeze(0)
    with torch.no_grad():
        embeddings = resnet(faces).cpu().numpy()
    result = []
    for box, prob, emb in zip(boxes, probs, embeddings):
        if prob is None:
            continue
        result.append(DetectedFace(box=tuple(float(v) for v in box), prob=float(prob), embedding=emb))
    return result


def embed_reference(image: Image.Image) -> Optional[np.ndarray]:
    """Embedding of the largest face in a reference portrait, or None."""
    faces = embed_faces(image)
    if not faces:
        return None
    return max(faces, key=lambda f: f.area).embedding


@dataclass
class MatchResult:
    child_id: object
    distance: float
    runner_up: float


def match(embedding: np.ndarray, references: dict) -> Optional[MatchResult]:
    """
    `references` maps child_id -> list[np.ndarray]. Returns the best child when
    its distance is under FACE_MATCH_THRESHOLD and beats the runner-up by
    FACE_MATCH_MARGIN; otherwise None.
    """
    threshold = float(getattr(settings, 'FACE_MATCH_THRESHOLD', 0.9))
    margin = float(getattr(settings, 'FACE_MATCH_MARGIN', 0.15))

    scored = []
    for child_id, embs in references.items():
        if not embs:
            continue
        dist = min(float(np.linalg.norm(embedding - e)) for e in embs)
        scored.append((dist, child_id))
    if not scored:
        return None
    scored.sort()
    best_dist, best_id = scored[0]
    runner_up = scored[1][0] if len(scored) > 1 else float('inf')
    if best_dist > threshold:
        return None
    if runner_up - best_dist < margin:
        return None
    return MatchResult(child_id=best_id, distance=best_dist, runner_up=runner_up)


def confidence_from_distance(distance: float) -> float:
    threshold = float(getattr(settings, 'FACE_MATCH_THRESHOLD', 0.9))
    return round(max(0.0, min(1.0, 1.0 - distance / threshold)), 3)
