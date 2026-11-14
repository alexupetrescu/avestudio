FROM python:3.12.13-slim-bookworm@sha256:4766d8b510c428e595d74b9cc5bbb2fae8e26316fffb4adc89908d79aacd58a2 AS dependencies
COPY ops/requirements.lock /requirements.lock
COPY ops/vendor/ /wheels/
RUN python -m pip install --disable-pip-version-check --no-cache-dir --only-binary=:all: --require-hashes --find-links=/wheels/ --extra-index-url=https://download.pytorch.org/whl/cpu --prefix=/install -r /requirements.lock

FROM python:3.12.13-slim-bookworm@sha256:4766d8b510c428e595d74b9cc5bbb2fae8e26316fffb4adc89908d79aacd58a2 AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp PYTHONPATH=/app/ops:/app OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2
RUN groupadd --gid 20010 app && useradd --no-log-init --uid 20010 --gid 20010 --no-create-home --shell /usr/sbin/nologin app
COPY --from=dependencies /install/ /usr/local/
WORKDIR /app
COPY --chown=20010:20010 . /app/
RUN python ops/openssl_compat.py /usr/local
USER 20010:20010
EXPOSE 8000
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "2", "--timeout", "900", "--access-logfile", "-", "--error-logfile", "-"]
