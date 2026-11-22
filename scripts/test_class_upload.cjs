const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function uploadPage(transport) {
    class Element {
        constructor() {
            this.listeners = {};
            this.dataset = {};
            this.value = '';
            this.classList = { add() {}, remove() {}, toggle() {} };
        }
        addEventListener(name, callback) { this.listeners[name] = callback; }
        replaceChildren() {}
        append() {}
        querySelector() { return this.input; }
        querySelectorAll() { return []; }
    }
    const ids = [
        'upload-form', 'submit-btn', 'pause-upload', 'finish-upload', 'upload-progress',
        'progress-fill', 'progress-label', 'upload-errors', 'id_school', 'id_class',
        'new-class-fields', 'id_new_class_name', 'id_session',
    ];
    for (const suffix of ['refs', 'photos']) ids.push('dropzone-' + suffix, 'selection-bar-' + suffix, 'selection-count-' + suffix, 'clear-' + suffix);
    const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
    for (const element of Object.values(elements)) element.style = {};
    elements.id_class.value = 'class-id';
    elements.id_class.options = [];
    elements.id_class.selectedOptions = [{ dataset: { school: '1' } }];
    elements['upload-form'].dataset.startUrl = '/start';
    elements['upload-form'].input = { value: 'csrf-token' };
    elements['dropzone-refs'].input = new Element();
    elements['dropzone-photos'].input = new Element();
    const requests = [];
    let redirected = null, active = 0, maximumActive = 0;
    class FormData {
        constructor() { this.values = new Map(); }
        append(key, value) { this.values.set(key, value); }
        get(key) { return this.values.get(key); }
    }
    class XHR {
        constructor() { this.handlers = {}; this.upload = new Element(); }
        open(method, url) { this.url = url; }
        setRequestHeader() {}
        addEventListener(name, callback) { this.handlers[name] = callback; }
        send(data) {
            active++;
            maximumActive = Math.max(maximumActive, active);
            const request = { url: this.url, data };
            requests.push(request);
            queueMicrotask(() => {
                const response = transport(request, requests, elements) || {
                    status: 200,
                    body: this.url === '/start' ? { file_url: '/file', finish_url: '/finish' } :
                        this.url === '/finish' ? { redirect: '/review' } : { ok: true },
                };
                if (this.upload.listeners.progress) this.upload.listeners.progress({ lengthComputable: true, loaded: 100, total: 100 });
                this.status = response.status;
                this.responseText = JSON.stringify(response.body);
                active--;
                this.handlers.load();
            });
        }
    }
    let nextKey = 0;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../static/admin/js/class_upload.js'), 'utf8'), {
        document: { getElementById: (id) => elements[id], createElement: () => new Element() },
        window: { addEventListener() {}, confirm: () => true, location: { assign: (url) => { redirected = url; } } },
        crypto: { randomUUID: () => 'key-' + (++nextKey) }, FormData, XMLHttpRequest: XHR,
        setTimeout: (callback) => queueMicrotask(callback),
        URL: { createObjectURL: () => { throw Error('Image previews must not be created'); } },
    });
    function select(names) {
        elements['dropzone-photos'].input.files = names.map((name) => ({ name, size: 1024, lastModified: 1, type: 'image/jpeg' }));
        elements['dropzone-photos'].input.listeners.change();
    }
    return {
        select, requests, elements,
        submit: () => elements['upload-form'].listeners.submit({ preventDefault() {} }),
        redirect: () => redirected, maximumActive: () => maximumActive,
    };
}

test('large selections send one file per request and redirect only after completion', async () => {
    const page = uploadPage(() => null);
    page.select(Array.from({ length: 150 }, (_, index) => `photo-${index}.jpg`));
    await page.submit();
    assert.equal(page.requests.filter((request) => request.url === '/file').length, 150);
    assert.equal(page.maximumActive(), 1);
    assert.equal(page.requests.at(-1).url, '/finish');
    assert.equal(page.redirect(), '/review');
});

test('retry keeps the file key and skips successful files', async () => {
    let fail = true;
    const page = uploadPage((request) => {
        if (request.url === '/file' && request.data.get('image').name === 'bad.jpg' && fail) {
            fail = false;
            return { status: 500, body: { error: 'Temporary failure' } };
        }
    });
    page.select(['bad.jpg', 'good.jpg']);
    await page.submit();
    assert.equal(page.redirect(), null);
    await page.submit();
    const files = page.requests.filter((request) => request.url === '/file');
    assert.deepEqual(files.map((request) => request.data.get('image').name), ['bad.jpg', 'good.jpg', 'bad.jpg']);
    assert.equal(files[0].data.get('key'), files[2].data.get('key'));
    assert.equal(page.redirect(), '/review');
});

test('pause completes the current file and resume sends the remaining files', async () => {
    let pausedOnce = false;
    const page = uploadPage((request, requests, elements) => {
        if (request.url === '/file' && !pausedOnce) {
            pausedOnce = true;
            elements['pause-upload'].listeners.click();
        }
    });
    page.select(['one.jpg', 'two.jpg']);
    await page.submit();
    assert.equal(page.requests.filter((request) => request.url === '/file').length, 1);
    assert.equal(page.redirect(), null);
    await page.submit();
    assert.equal(page.requests.filter((request) => request.url === '/file').length, 2);
    assert.equal(page.redirect(), '/review');
});

test('finishing waits for an existing matching run without uploading files again', async () => {
    let waiting = true;
    const page = uploadPage((request) => {
        if (request.url === '/finish' && waiting) {
            waiting = false;
            return { status: 409, body: { error: 'Waiting for matching', retry_after: 5 } };
        }
    });
    page.select(['one.jpg']);
    await page.submit();
    assert.equal(page.requests.filter((request) => request.url === '/file').length, 1);
    assert.equal(page.requests.filter((request) => request.url === '/finish').length, 2);
    assert.equal(page.redirect(), '/review');
});
