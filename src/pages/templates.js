import { createModal } from '../components/modal.js';

const FAMILIES = {
  agenda: {
    name: 'Agenda',
    color: '#00446A',
    desc: 'Topic list, meeting prep, or session outline. Three variants routed by purpose and style.',
    questions: [
      { step: 1, label: 'Purpose', prompt: 'What kind of agenda is this?', options: ['Presentation — topic list for a client meeting or review', 'Working meeting — action items, owners, deadlines, discussion questions'] },
      { step: 2, label: 'Style', prompt: 'What style should this agenda use?', condition: 'Presentation only', options: ['Clean — white background, colored headers, numbered lists', 'Bold — dark background, floating cards, modern feel'] },
    ],
  },
};

const TEMPLATES = [
  {
    id: 'agenda',
    name: 'Clean',
    file: 'agenda.html',
    preview: 'html-to-pptx/screenshots/agenda.png',
    pptx_preview: 'html-to-pptx/screenshots/template-agenda-clean-pptx.png',
    pptx: 'presentations/template-agenda-clean.pptx',
    color: '#00446A',
    desc: 'White background, colored section headers, numbered lists.',
    triggers: ['agenda', 'session outline', 'discussion topics', 'meeting outline', 'workshop agenda'],
    slots: ['TITLE', 'SECTIONS[]', 'LOGO_TEXT', 'FOOTER'],
    routing: 'Purpose → Presentation, Style → "clean" / "light" / "simple"',
    style_group: 'agenda',
  },
  {
    id: 'agenda-bold',
    name: 'Bold',
    file: 'agenda-bold.html',
    preview: 'html-to-pptx/screenshots/agenda-bold.png',
    pptx_preview: 'html-to-pptx/screenshots/template-agenda-bold-pptx.png',
    pptx: 'presentations/template-agenda-bold.pptx',
    color: '#00446A',
    desc: 'Dark background with floating cards, modern feel.',
    triggers: ['agenda', 'session outline', 'discussion topics', 'meeting outline', 'workshop agenda'],
    slots: ['TITLE', 'SUBTITLE', 'ITEMS[]', 'LOGO_TEXT', 'DATE_TEXT'],
    routing: 'Purpose → Presentation, Style → "bold" / "dark" / "modern"',
    style_group: 'agenda',
  },
  {
    id: 'agenda-meeting',
    name: 'Meeting',
    file: 'agenda-meeting.html',
    preview: 'html-to-pptx/screenshots/agenda-meeting.png',
    pptx_preview: null,
    pptx: null,
    color: '#00446A',
    desc: 'Actions table with owners, discussion questions, deadlines.',
    triggers: ['meeting agenda', 'internal meeting', 'actions and questions', 'meeting prep', 'agenda with owners'],
    slots: ['TITLE', 'ACTIONS[]', 'QUESTIONS[]', 'DEADLINES[]', 'LOGO_TEXT', 'FOOTER'],
    routing: 'Purpose → "actions" / "owners" / "deadlines" / "internal meeting"',
    style_group: 'agenda',
  },
  {
    id: 'faq',
    name: 'FAQ',
    file: 'faq.html',
    preview: 'html-to-pptx/screenshots/faq.png',
    pptx_preview: null,
    pptx: null,
    color: '#00446A',
    desc: 'Two-column Q&A grid with numbered questions and concise answers.',
    triggers: ['FAQ', 'frequently asked questions', 'common questions', 'Q&A reference', 'anticipated questions', 'objection handling'],
    slots: ['TITLE', 'SUBTITLE', 'QUESTIONS[]', 'LOGO_TEXT'],
    routing: 'Direct — "FAQ", "frequently asked questions", "common questions"',
  },
  {
    id: 'kickoff-overview',
    name: 'Kickoff Overview',
    file: 'kickoff-overview.html',
    preview: 'html-to-pptx/screenshots/kickoff-overview.png',
    pptx_preview: null,
    pptx: null,
    color: '#00446A',
    desc: 'Session opener with numbered goals panel and reason/pillar cards.',
    triggers: ['kickoff', 'purpose slide', 'session goals', 'why are we here', 'training overview'],
    slots: ['TITLE', 'GOALS[]', 'PILLARS[]', 'PILLAR_COLORS'],
    routing: 'Direct — "kickoff", "session goals", "why are we here"',
  },
  {
    id: 'do-dont',
    name: 'Do / Don\'t',
    file: 'do-dont.html',
    preview: 'html-to-pptx/screenshots/do-dont.png',
    pptx_preview: null,
    pptx: null,
    color: '#E56910',
    desc: 'Two-column yes/no or concern/direction layout with bold lead answers.',
    triggers: ["do or don't", 'yes or no', 'expectations', 'myth vs reality', 'concern'],
    slots: ['TITLE', 'LEFT_HEADER', 'LEFT_ANSWER', 'LEFT_CARDS[]', 'RIGHT_HEADER', 'RIGHT_ANSWER', 'RIGHT_CARDS[]'],
    routing: 'Direct — "do or don\'t", "yes or no", "expectations"',
  },
  {
    id: 'phased-roadmap',
    name: 'Phased Roadmap',
    file: 'phased-roadmap.html',
    preview: 'html-to-pptx/screenshots/phased-roadmap.png',
    pptx_preview: null,
    pptx: null,
    color: '#00446A',
    desc: 'Engagement roadmap with phased chevrons, timing, and workstream bars.',
    triggers: ['roadmap', 'engagement timeline', 'project phases', 'phased plan', 'implementation roadmap', 'workstreams'],
    slots: ['TITLE', 'GROUPS[]', 'PHASES[]', 'DURATIONS[]', 'DETAILS[]', 'WORKSTREAMS[]'],
    routing: 'Direct — "roadmap", "project phases", "phased plan"',
  },
];

export function mount(root) {
  root.innerHTML = `
    <main class="wrap" style="padding-top:52px">
      <header class="mast">
        <h1>Templates</h1>
        <p style="color:var(--soft);max-width:72ch;margin-bottom:4px">Structural slides that skip the design engine. Fixed layout, content fills in. The router detects trigger keywords and short-circuits to a template. Analytical content always overrides.</p>
        <div class="meta">
          <span>${TEMPLATES.length} templates · ${Object.keys(FAMILIES).length} family</span>
        </div>
      </header>

      <div id="templateGrid"></div>

      <div style="margin-top:48px;border-top:1px solid var(--line);padding-top:32px">
        <h2 style="font:600 18px/1.3 var(--display);color:var(--ink);margin-bottom:16px">Routing examples</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:680px" id="routingExamples"></div>
      </div>
    </main>
    <div id="modal" class="modal" role="dialog" aria-modal="true" aria-label="Zoomed screenshot">
      <button class="close-x" aria-label="Close">&times;</button>
      <div class="modal-bar"><span id="modalTitle"></span></div>
      <div id="modalFormatToggle" class="modal-format-toggle" style="display:none">
        <button class="format-toggle-btn active" data-format="html">HTML</button>
        <button class="format-toggle-btn" data-format="pptx">PPTX</button>
      </div>
      <img id="modalImage" alt="Zoomed view">
      <div class="hint">ESC to close</div>
    </div>
    <footer class="foot"><div class="wrap foot-line"><span>Pepper · Templates</span></div></footer>`;

  const modal = createModal(root.querySelector('#modal'));

  function openZoom(title, htmlSrc, pptxSrc) {
    root.querySelector('#modalTitle').textContent = title;
    root.querySelector('#modalImage').src = htmlSrc;
    const toggleWrap = root.querySelector('#modalFormatToggle');
    if (pptxSrc) {
      toggleWrap.style.display = '';
      const btns = toggleWrap.querySelectorAll('.format-toggle-btn');
      btns.forEach(b => b.classList.toggle('active', b.dataset.format === 'html'));
      btns.forEach(b => {
        b.onclick = () => {
          btns.forEach(x => x.classList.toggle('active', x === b));
          root.querySelector('#modalImage').src = b.dataset.format === 'html' ? htmlSrc : pptxSrc;
        };
      });
    } else {
      toggleWrap.style.display = 'none';
    }
    root.querySelector('#modal').classList.add('open');
  }

  renderGrid();
  renderRouting();

  function renderGrid() {
    const grid = root.querySelector('#templateGrid');
    grid.innerHTML = '';

    // Group templates: family members together, standalone templates separate
    const familyGroups = {};
    const standalone = [];
    TEMPLATES.forEach(t => {
      if (t.style_group && FAMILIES[t.style_group]) {
        if (!familyGroups[t.style_group]) familyGroups[t.style_group] = [];
        familyGroups[t.style_group].push(t);
      } else {
        standalone.push(t);
      }
    });

    // Render family cards
    Object.entries(familyGroups).forEach(([groupKey, members]) => {
      const family = FAMILIES[groupKey];
      const card = document.createElement('div');
      card.className = 'skel-card';
      card.innerHTML = `
        <div class="skel-header">
          <div>
            <div class="skel-title">${family.name}</div>
            <div style="font:12px/1.5 var(--body);color:var(--soft);margin-top:4px">${family.desc}</div>
          </div>
          <div class="skel-badges">
            <span class="skel-badge built" style="background:${family.color}15;color:${family.color};border-color:${family.color}30">Family · ${members.length} variants</span>
          </div>
        </div>
        <div style="padding:12px 24px 16px;border-bottom:1px solid var(--line);background:var(--paper)">
          ${family.questions.map(q => `
            <div style="margin-bottom:${q === family.questions[family.questions.length - 1] ? '0' : '12px'}">
              <div style="font:600 12px/1.3 var(--display);color:var(--ink);margin-bottom:4px">
                Step ${q.step} — ${q.label}${q.condition ? ` <span style="font-weight:400;color:var(--soft)">(${q.condition})</span>` : ''}
              </div>
              <div style="font:12px/1.4 var(--body);color:var(--soft);margin-bottom:6px">${q.prompt}</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px">${q.options.map(opt =>
                `<span style="display:inline-block;font:11px var(--mono);color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:3px 10px">${opt}</span>`
              ).join('')}</div>
            </div>
          `).join('')}
        </div>
        <div style="padding:0;overflow-x:auto">
          <table class="variant-table">
            <colgroup>
              <col style="width:200px">
              <col style="width:160px">
              <col style="width:200px">
              <col style="width:80px">
              <col style="width:auto">
            </colgroup>
            <thead>
              <tr>
                <th>Preview</th>
                <th>Variant</th>
                <th>Slots</th>
                <th>PPTX</th>
                <th>Routing</th>
              </tr>
            </thead>
            <tbody>
              ${members.map(t => {
                const hasBoth = t.preview && t.pptx_preview;
                return `<tr>
                <td class="preview-cell">${t.preview
                  ? `<img class="variant-thumb" src="${t.preview}" alt="${t.name}" data-title="${family.name} (${t.name})" data-src="${t.preview}"${t.pptx_preview ? ` data-pptx-src="${t.pptx_preview}"` : ''}>${hasBoth ? `<div class="format-toggle-row"><button class="format-toggle-btn small active" data-format="html">HTML</button><button class="format-toggle-btn small" data-format="pptx">PPTX</button></div>` : ''}`
                  : '<span class="variant-empty-thumb">—</span>'
                }</td>
                <td>
                  <div style="font:600 13px/1.3 var(--display);color:var(--ink)">${t.name}</div>
                  <div style="font:12px/1.4 var(--body);color:var(--soft);margin-top:2px">${t.desc}</div>
                </td>
                <td>${t.slots.map(s =>
                  `<div style="font:12px var(--mono);color:var(--ink);padding:1px 0">${s}</div>`
                ).join('')}</td>
                <td class="pptx-cell">${t.pptx
                  ? `<a class="pptx-link" href="${t.pptx}" download title="Download PPTX">⬇ .pptx</a>`
                  : `<span style="color:var(--faint)">—</span>`
                }</td>
                <td style="font:12px/1.4 var(--body);color:var(--soft)">${t.routing || ''}</td>
              </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;

      attachThumbHandlers(card);
      grid.appendChild(card);
    });

    // Render standalone template cards
    standalone.forEach(t => {
      const hasBoth = t.preview && t.pptx_preview;
      const card = document.createElement('div');
      card.className = 'skel-card';
      card.innerHTML = `
        <div class="skel-header">
          <div>
            <div class="skel-title">${t.name}</div>
            <div style="font:12px/1.5 var(--body);color:var(--soft);margin-top:4px">${t.desc}</div>
          </div>
          <div class="skel-badges">
            <span class="skel-badge built" style="background:${t.color}15;color:${t.color};border-color:${t.color}30">Template</span>
          </div>
        </div>
        <div style="padding:0;overflow-x:auto">
          <table class="variant-table">
            <colgroup>
              <col style="width:200px">
              <col style="width:220px">
              <col style="width:200px">
              <col style="width:80px">
              <col style="width:auto">
            </colgroup>
            <thead>
              <tr>
                <th>Preview</th>
                <th>Trigger Keywords</th>
                <th>Slots</th>
                <th>PPTX</th>
                <th>Routing</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="preview-cell">${t.preview
                  ? `<img class="variant-thumb" src="${t.preview}" alt="${t.name}" data-title="${t.name}" data-src="${t.preview}"${t.pptx_preview ? ` data-pptx-src="${t.pptx_preview}"` : ''}>${hasBoth ? `<div class="format-toggle-row"><button class="format-toggle-btn small active" data-format="html">HTML</button><button class="format-toggle-btn small" data-format="pptx">PPTX</button></div>` : ''}`
                  : '<span class="variant-empty-thumb">—</span>'
                }</td>
                <td><div style="display:flex;flex-wrap:wrap;gap:4px">${t.triggers.map(kw =>
                  `<span style="display:inline-block;font:11px var(--mono);color:var(--soft);background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:2px 8px">${kw}</span>`
                ).join('')}</div></td>
                <td>${t.slots.map(s =>
                  `<div style="font:12px var(--mono);color:var(--ink);padding:1px 0">${s}</div>`
                ).join('')}</td>
                <td class="pptx-cell">${t.pptx
                  ? `<a class="pptx-link" href="${t.pptx}" download title="Download PPTX">⬇ .pptx</a>`
                  : `<span style="color:var(--faint)">—</span>`
                }</td>
                <td style="font:12px/1.4 var(--body);color:var(--soft)">${t.routing || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>`;

      attachThumbHandlers(card);
      grid.appendChild(card);
    });
  }

  function attachThumbHandlers(card) {
    card.querySelectorAll('.variant-thumb').forEach(img => {
      img.addEventListener('click', () => {
        openZoom(img.dataset.title, img.dataset.src, img.dataset.pptxSrc || null);
      });
    });

    card.querySelectorAll('.format-toggle-row').forEach(row => {
      const img = row.previousElementSibling;
      const htmlSrc = img.dataset.src;
      const pptxSrc = img.dataset.pptxSrc;
      row.querySelectorAll('.format-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          row.querySelectorAll('.format-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
          img.src = btn.dataset.format === 'html' ? htmlSrc : pptxSrc;
        });
      });
    });
  }

  function renderRouting() {
    const examples = [
      { req: 'Make me an agenda for the LATAM review', path: 'Template', detail: 'Agenda family → ask purpose → style' },
      { req: 'Agenda with action items and owners for Thursday', path: 'Template', detail: 'Agenda (Meeting) — auto-detected' },
      { req: 'Bold agenda for the client kickoff', path: 'Template', detail: 'Agenda (Bold) — auto-detected' },
      { req: 'Agenda slide with revenue by region chart', path: 'Engine', detail: 'Analytical content overrides' },
      { req: 'Make a kickoff slide with our 3 goals', path: 'Template', detail: 'Kickoff Overview' },
      { req: "Do/don't slide for the new process rollout", path: 'Template', detail: 'Do / Don\'t' },
    ];

    const container = root.querySelector('#routingExamples');
    container.innerHTML = examples.map(ex => `
      <div style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px">
        <span style="display:inline-block;font:600 10px var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:8px;margin-bottom:6px;${
          ex.path === 'Template'
            ? 'background:#1B7A4A18;color:#1B7A4A'
            : 'background:var(--accent-light);color:var(--accent)'
        }">${ex.path}</span>
        <div style="font:13px/1.5 var(--body);color:var(--soft)">&ldquo;${ex.req}&rdquo;</div>
        ${ex.detail ? `<div style="font:11px/1.4 var(--mono);color:var(--faint);margin-top:4px">${ex.detail}</div>` : ''}
      </div>
    `).join('');
  }

  const keyHandler = (e) => {
    if (e.key === 'Escape') modal.close();
  };
  window.addEventListener('keydown', keyHandler);

  return () => {
    window.removeEventListener('keydown', keyHandler);
    root.innerHTML = '';
  };
}
