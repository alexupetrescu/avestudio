/* Upload files sequentially; selecting files never decodes their images. */
(function () {
    'use strict';
    const form = document.getElementById('upload-form');
    if (!form) return;
    const submit = document.getElementById('submit-btn');
    const pause = document.getElementById('pause-upload');
    const finishButton = document.getElementById('finish-upload');
    const progress = document.getElementById('upload-progress');
    const fill = document.getElementById('progress-fill');
    const label = document.getElementById('progress-label');
    const errors = document.getElementById('upload-errors');
    const school = document.getElementById('id_school');
    const schoolClass = document.getElementById('id_class');
    const buckets = {};
    const csrf = form.querySelector('[name=csrfmiddlewaretoken]').value;
    let queue = [], batch = null, busy = false, paused = false, complete = false;

    function filterClasses() {
        for (const option of schoolClass.options) {
            if (!option.dataset.school) continue;
            option.hidden = !!school.value && option.dataset.school !== school.value;
            if (option.hidden && option.selected) schoolClass.value = '';
        }
        document.getElementById('new-class-fields').style.display = schoolClass.value ? 'none' : 'grid';
    }
    school.addEventListener('change', filterClasses);
    schoolClass.addEventListener('change', () => {
        if (schoolClass.selectedOptions[0].dataset.school) school.value = schoolClass.selectedOptions[0].dataset.school;
        filterClasses();
    });
    filterClasses();

    function size(bytes) { return (bytes / (1024 * 1024)).toFixed(1) + ' MB'; }
    function fileBucket(kind, suffix) {
        const zone = document.getElementById('dropzone-' + suffix);
        if (!zone) return;
        const input = zone.querySelector('input');
        const files = buckets[kind] = [];
        const bar = document.getElementById('selection-bar-' + suffix);
        const count = document.getElementById('selection-count-' + suffix);
        function refresh() {
            bar.classList.toggle('is-visible', files.length > 0);
            count.textContent = files.length + ' files · ' + size(files.reduce((sum, file) => sum + file.size, 0));
            submit.disabled = busy || !Object.values(buckets).some((items) => items.length);
        }
        function add(selected) {
            if (busy || batch) return;
            let rejected = 0;
            for (const file of selected) {
                if ((!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|tiff?|bmp|heic|heif|avif)$/i.test(file.name)) || file.size > 64 * 1024 * 1024) {
                    rejected++;
                    continue;
                }
                if (!files.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) files.push(file);
            }
            if (rejected) errors.textContent = rejected + ' files skipped. Choose image files of 64 MB or less each.';
            refresh();
        }
        zone.addEventListener('click', () => { if (!busy && !batch) input.click(); });
        zone.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!busy && !batch) input.click(); }
        });
        input.addEventListener('change', () => { add(input.files); input.value = ''; });
        ['dragenter', 'dragover'].forEach((name) => zone.addEventListener(name, (event) => {
            event.preventDefault(); zone.classList.add('is-dragover');
        }));
        ['dragleave', 'drop'].forEach((name) => zone.addEventListener(name, (event) => {
            event.preventDefault(); zone.classList.remove('is-dragover');
        }));
        zone.addEventListener('drop', (event) => { if (event.dataTransfer) add(event.dataTransfer.files); });
        document.getElementById('clear-' + suffix).addEventListener('click', () => {
            if (!busy && !batch) { files.length = 0; refresh(); }
        });
        refresh();
    }
    fileBucket('references', 'refs');
    fileBucket('images', 'photos');

    function post(url, data, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            xhr.timeout = 180000;
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('X-CSRFToken', csrf);
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
            });
            xhr.addEventListener('load', () => {
                let result;
                try { result = JSON.parse(xhr.responseText); } catch { reject(new Error('Server response ' + xhr.status + '. Your saved files can be retried safely.')); return; }
                if (xhr.status >= 200 && xhr.status < 300) resolve(result);
                else {
                    const error = new Error(result.error || 'Upload failed (' + xhr.status + ').');
                    error.retryAfter = Number(result.retry_after || 0);
                    reject(error);
                }
            });
            xhr.addEventListener('error', () => reject(new Error('Connection lost. Retry this file.')));
            xhr.addEventListener('timeout', () => reject(new Error('The request timed out. Retry this file.')));
            xhr.send(data);
        });
    }

    function setBusy(value) {
        busy = value;
        for (const control of form.querySelectorAll('input, select, button')) {
            if (control !== submit && control !== pause && control !== finishButton) control.disabled = value || !!batch;
        }
        submit.disabled = value;
        pause.hidden = !value;
        pause.disabled = false;
        finishButton.hidden = value || !batch || !queue.some((item) => item.status === 'done');
    }

    async function finish() {
        while (!paused) {
            try {
                const result = await post(batch.finish_url, new FormData());
                complete = true;
                window.location.assign(result.redirect);
                return;
            } catch (error) {
                if (!error.retryAfter) throw error;
                label.textContent = error.message;
                await new Promise((resolve) => setTimeout(resolve, error.retryAfter * 1000));
            }
        }
    }

    function showErrors() {
        const failed = queue.filter((item) => item.status === 'failed');
        errors.replaceChildren();
        if (!failed.length) return;
        const summary = document.createElement('p');
        summary.textContent = failed.length + ' files failed. Completed uploads are saved. Retry failed files or finish with the files already uploaded.';
        errors.append(summary);
        const list = document.createElement('ul');
        for (const item of failed) {
            const row = document.createElement('li');
            row.textContent = item.file.name + ': ' + item.error;
            list.append(row);
        }
        errors.append(list);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;
        if (!schoolClass.value && (!document.getElementById('id_new_class_name').value.trim() || !document.getElementById('id_session').value)) {
            errors.textContent = 'Choose a class, or choose its school and session and enter a new class name.';
            return;
        }
        const initial = new FormData(form);
        paused = false;
        errors.replaceChildren();
        setBusy(true);
        progress.classList.add('is-visible');
        try {
            if (!batch) {
                label.textContent = 'Preparing upload…';
                batch = await post(form.dataset.startUrl, initial);
                queue = Object.entries(buckets).flatMap(([kind, files]) => files.map((file) => ({
                    file, kind, key: crypto.randomUUID(), status: 'pending', error: '',
                })));
            }
            const totalBytes = queue.reduce((sum, item) => sum + item.file.size, 0);
            for (const item of queue) {
                if (item.status === 'done') continue;
                if (paused) break;
                const done = queue.filter((entry) => entry.status === 'done');
                const savedBytes = done.reduce((sum, entry) => sum + entry.file.size, 0);
                const data = new FormData();
                data.append('key', item.key);
                data.append('kind', item.kind);
                data.append('image', item.file, item.file.name);
                try {
                    label.textContent = done.length + ' / ' + queue.length + ' saved · Uploading ' + item.file.name;
                    await post(batch.file_url, data, (fraction) => {
                        const percent = totalBytes ? Math.round(100 * (savedBytes + item.file.size * fraction) / totalBytes) : 0;
                        fill.style.width = percent + '%';
                        label.textContent = done.length + ' / ' + queue.length + ' saved · ' + percent + '% · ' + (fraction === 1 ? 'Processing ' : 'Uploading ') + item.file.name;
                    });
                    item.status = 'done';
                    item.error = '';
                } catch (error) {
                    item.status = 'failed';
                    item.error = error.message;
                    if (/response 30[12]|response 403|permission|Connection lost/i.test(item.error)) paused = true;
                }
            }
            const saved = queue.filter((item) => item.status === 'done').length;
            label.textContent = saved + ' / ' + queue.length + ' files saved' + (paused ? ' · Paused' : '');
            showErrors();
            if (saved === queue.length) {
                label.textContent = 'All photos saved. Finishing upload…';
                await finish();
            }
        } catch (error) {
            errors.textContent = error.message;
        } finally {
            setBusy(false);
            submit.value = queue.length && queue.every((item) => item.status === 'done') ? 'Finish upload' : 'Resume / Retry upload';
        }
    });

    pause.addEventListener('click', () => { paused = true; pause.disabled = true; label.textContent += ' · Pausing after this file'; });
    finishButton.addEventListener('click', async () => {
        const skipped = queue.filter((item) => item.status !== 'done').length;
        if (skipped && !window.confirm('Finish without the ' + skipped + ' files that have not been uploaded?')) return;
        paused = false;
        setBusy(true);
        try { await finish(); } catch (error) { errors.textContent = error.message; }
        finally { setBusy(false); }
    });
    window.addEventListener('beforeunload', (event) => {
        if (batch && !complete) { event.preventDefault(); event.returnValue = ''; }
    });
})();
