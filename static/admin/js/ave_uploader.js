/*
 * AVE Studio admin uploader.
 * Shared by the bulk-upload and add-photos admin pages.
 *
 * Handles: dropzone interactions (click / drag & drop / keyboard),
 * image-only file selection, selection summary, and an XHR upload
 * with a real progress bar. The server answers AJAX uploads with
 * JSON {redirect: url} so Django messages are shown after navigation.
 */
'use strict';

function initAveUploader(config) {
    const form = document.getElementById(config.formId);
    const dropzone = document.getElementById(config.dropzoneId);
    const input = document.getElementById(config.inputId);
    const selectionBar = document.getElementById(config.selectionBarId);
    const selectionCount = document.getElementById(config.selectionCountId);
    const clearBtn = document.getElementById(config.clearBtnId);
    const submitBtn = document.getElementById(config.submitBtnId);
    const progress = document.getElementById(config.progressId);
    const progressFill = document.getElementById(config.progressFillId);
    const progressLabel = document.getElementById(config.progressLabelId);

    let selectedFiles = [];

    function formatSize(bytes) {
        const mb = bytes / (1024 * 1024);
        return mb >= 1 ? mb.toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
    }

    function notifyChange() {
        const total = selectedFiles.reduce((sum, f) => sum + f.size, 0);
        if (selectedFiles.length) {
            selectionBar.classList.add('is-visible');
            selectionCount.textContent =
                selectedFiles.length + ' photo' + (selectedFiles.length === 1 ? '' : 's') +
                ' selected · ' + formatSize(total);
        } else {
            selectionBar.classList.remove('is-visible');
        }
        submitBtn.disabled = selectedFiles.length === 0;
        if (config.onFilesChanged) {
            config.onFilesChanged(selectedFiles);
        }
    }

    function addFiles(fileList) {
        let rejected = 0;
        for (const file of fileList) {
            if (!file.type.startsWith('image/')) {
                rejected += 1;
                continue;
            }
            // Skip duplicates (same name + size)
            const dup = selectedFiles.some(f => f.name === file.name && f.size === file.size);
            if (!dup) {
                selectedFiles.push(file);
            }
        }
        if (rejected && config.onRejected) {
            config.onRejected(rejected);
        }
        notifyChange();
    }

    // --- Dropzone wiring ---
    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            input.click();
        }
    });

    input.addEventListener('change', () => {
        addFiles(input.files);
        input.value = ''; // the picker is only an entry point; state lives in selectedFiles
    });

    ['dragenter', 'dragover'].forEach((name) => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            dropzone.classList.add('is-dragover');
        });
    });
    ['dragleave', 'drop'].forEach((name) => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            dropzone.classList.remove('is-dragover');
        });
    });
    dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files) {
            addFiles(e.dataTransfer.files);
        }
    });

    clearBtn.addEventListener('click', () => {
        selectedFiles = [];
        notifyChange();
    });

    // --- Upload with progress ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!selectedFiles.length) {
            return;
        }

        const formData = new FormData(form);
        for (const file of selectedFiles) {
            formData.append('images', file, file.name);
        }

        submitBtn.disabled = true;
        clearBtn.disabled = true;
        progress.classList.add('is-visible');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', form.action || window.location.href);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        xhr.upload.addEventListener('progress', (ev) => {
            if (ev.lengthComputable) {
                const pct = Math.round((ev.loaded / ev.total) * 100);
                progressFill.style.width = pct + '%';
                progressLabel.textContent = pct < 100
                    ? 'Uploading… ' + pct + '% (' + formatSize(ev.loaded) + ' of ' + formatSize(ev.total) + ')'
                    : 'Processing photos…';
            }
        });

        xhr.addEventListener('load', () => {
            let redirect = null;
            try {
                redirect = JSON.parse(xhr.responseText).redirect;
            } catch (err) { /* non-JSON response — fall through */ }
            if (xhr.status >= 200 && xhr.status < 300 && redirect) {
                window.location.assign(redirect);
            } else {
                fail();
            }
        });
        xhr.addEventListener('error', fail);
        xhr.addEventListener('abort', fail);

        function fail() {
            progress.classList.remove('is-visible');
            progressFill.style.width = '0%';
            submitBtn.disabled = false;
            clearBtn.disabled = false;
            progressLabel.textContent = '';
            window.alert('Upload failed. Please check your connection and try again.');
        }

        xhr.send(formData);
    });

    notifyChange();
}
