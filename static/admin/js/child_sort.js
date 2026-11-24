(() => {
  'use strict';
  function setup() {
    document.querySelectorAll('.ave-child-roster').forEach(roster => {
      const body = roster.querySelector('tbody');
      if (!body) return;
      const buttons = [...roster.querySelectorAll('[data-roster-sort]')];
      const key = `ave-child-sort:${location.pathname}`;
      const collator = new Intl.Collator('ro', { sensitivity: 'base', numeric: true });
      function field(row, name) {
        const cell = row.querySelector(`.field-${name}`);
        return cell?.querySelector('input')?.value ?? cell?.textContent.trim() ?? '';
      }
      function apply(sort) {
        if (!buttons.some(button => button.dataset.rosterSort === sort)) sort = 'oldest';
        const rows = [...body.querySelectorAll('tr.form-row.has_original')];
        const anchor = body.querySelector('tr.form-row:not(.has_original), tr.add-row');
        rows.sort((a, b) => {
          const index = Number(field(a, 'entry_index')) - Number(field(b, 'entry_index'));
          if (sort === 'oldest') return index;
          if (sort === 'newest') return -index;
          const names = collator.compare(`${field(a, 'last_name')} ${field(a, 'first_name')}`, `${field(b, 'last_name')} ${field(b, 'first_name')}`);
          return (sort === 'name-desc' ? -names : names) || index;
        });
        const fragment = document.createDocumentFragment();
        rows.forEach(row => {
          const errors = row.previousElementSibling;
          if (errors?.classList.contains('row-form-errors')) fragment.append(errors);
          fragment.append(row);
        });
        body.insertBefore(fragment, anchor);
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.rosterSort === sort)));
        try { sessionStorage.setItem(key, sort); } catch { /* Sorting works without storage. */ }
      }
      buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.rosterSort)));
      let initial = 'oldest';
      try { initial = sessionStorage.getItem(key) || initial; } catch { /* Storage may be disabled. */ }
      apply(initial);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
