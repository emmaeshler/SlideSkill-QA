export function createMatrix(container, { cellWidth = 320, caseWidth = 240 } = {}) {
  const collapsed = new Set();

  function updateGrid(versions) {
    container.style.gridTemplateColumns =
      `${caseWidth}px` +
      versions.map((_, vi) => (collapsed.has(vi) ? ' 44px' : ` ${cellWidth}px`)).join('');
  }

  function toggleColumn(vi, versions) {
    if (collapsed.has(vi)) collapsed.delete(vi);
    else collapsed.add(vi);
    updateGrid(versions);
    container.querySelectorAll(`[data-vi="${vi}"]`).forEach((el) => {
      el.classList.toggle('collapsed', collapsed.has(vi));
    });
    container.querySelectorAll(`.head[data-vi="${vi}"] .collapse-btn`).forEach((btn) => {
      btn.textContent = collapsed.has(vi) ? '»' : '«';
      btn.title = collapsed.has(vi) ? 'Expand column' : 'Collapse column';
    });
  }

  return { collapsed, updateGrid, toggleColumn };
}

export function tagClass(tag) {
  const t = tag.toLowerCase();
  if (t.startsWith('ban')) return 'ban';
  return { removed: 'removed', added: 'added', changed: 'changed', fix: 'fix', note: 'note' }[t] || 'note';
}

export function renderChanges(changes) {
  if (!changes || !changes.length) return '';
  const id = 'ch_' + Math.random().toString(36).slice(2, 8);
  return (
    `<button class="changes-toggle" data-changes-id="${id}">${changes.length} change${changes.length === 1 ? '' : 's'} — why?</button>` +
    `<div id="${id}" class="changes changes-body collapsed">` +
    changes.map((c) => `<div class="change"><span class="change-tag ${tagClass(c.tag)}">${c.tag}</span><span>${c.note}</span></div>`).join('') +
    '</div>'
  );
}

export function bindChangesToggle(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.changes-toggle');
    if (!btn) return;
    const id = btn.dataset.changesId;
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('collapsed');
    btn.textContent = el.classList.contains('collapsed')
      ? btn.textContent.replace('hide', 'why?')
      : btn.textContent.replace('why?', 'hide');
  });
}

export function versionLabel(v) {
  if (v === 'baseline') return '<span class="version-label baseline">Baseline</span>';
  return `<span class="version-label improvement">${v.replace(/-/g, ' ')}</span>`;
}
