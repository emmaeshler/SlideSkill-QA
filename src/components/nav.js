const PAGES = [
  { id: 'all-versions', label: 'All Versions' },
  { id: 'progression', label: 'Skill Progression' },
  { id: 'conversion', label: 'PPTX Conversion' },
];

export function createNav(container, { onNavigate }) {
  let currentPage = null;

  function render(activeId) {
    currentPage = activeId;
    container.innerHTML = `
      <div class="site-nav-inner">
        <div style="display:flex;align-items:center;gap:24px">
          <span class="site-brand">Pepper</span>
        </div>
        <div class="page-tabs">
          ${PAGES.map((p) => `<button class="page-tab${p.id === activeId ? ' active' : ''}" data-page="${p.id}">${p.label}</button>`).join('')}
        </div>
      </div>`;

    container.querySelectorAll('.page-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.page;
        if (id === currentPage) return;
        onNavigate(id);
        render(id);
      });
    });
  }

  window.addEventListener('scroll', () => {
    container.classList.toggle('scrolled', window.scrollY > 8);
  });

  return { render };
}
