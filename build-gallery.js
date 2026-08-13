#!/usr/bin/env node
// build-gallery.js — Generates a comparison gallery HTML from the versions/ directory.
// Usage: node build-gallery.js
//
// Directory convention:
//   versions/
//     baseline/          (or any name — sorted alphabetically, "baseline" first)
//       apex/
//         preview/slide-01.png
//         *.slide.json
//         *.pptx
//       cascade/
//         ...
//     improvement-1/
//       apex/
//         ...
//
// Output: gallery/index.html

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const versionsDir = path.join(root, 'versions');
const casesDir = path.join(root, '..', 'poc-pptx-qa', 'cases');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function firstPng(dir) {
  if (!fs.existsSync(dir)) return null;
  const pngs = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.png')).sort();
  return pngs[0] ?? null;
}

function scanVersions() {
  if (!fs.existsSync(versionsDir)) return { versions: [], cases: [] };

  const versionDirs = fs.readdirSync(versionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => {
      const aCurrent = /-current$/.test(a);
      const bCurrent = /-current$/.test(b);
      if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
      if (aCurrent && bCurrent) return b.localeCompare(a, undefined, { numeric: true });
      if (a === 'baseline') return 1;
      if (b === 'baseline') return -1;
      return b.localeCompare(a, undefined, { numeric: true });
    });

  const caseSet = new Map();

  for (const version of versionDirs) {
    const vDir = path.join(versionsDir, version);
    for (const entry of fs.readdirSync(vDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
      const caseId = entry.name;
      if (!caseSet.has(caseId)) {
        // Try to load prompt from poc-pptx-qa cases
        const caseJson = readJson(path.join(casesDir, caseId, 'case.json'));
        caseSet.set(caseId, {
          id: caseId,
          title: caseJson?.title ?? caseId,
          prompt: caseJson?.prompt ?? 'Please make a slide for the attached content',
          cells: {},
        });
      }

      const caseDir = path.join(vDir, caseId);
      const previewDir = path.join(caseDir, 'preview');
      const pngName = firstPng(previewDir);
      const specFiles = fs.existsSync(caseDir)
        ? fs.readdirSync(caseDir).filter(f => f.endsWith('.slide.json'))
        : [];
      const pptxFiles = fs.existsSync(caseDir)
        ? fs.readdirSync(caseDir).filter(f => f.endsWith('.pptx'))
        : [];
      const spec = specFiles[0] ? readJson(path.join(caseDir, specFiles[0])) : null;

      const rel = path.relative(path.join(root, 'gallery'), caseDir).replaceAll('\\', '/');

      const changesFile = path.join(vDir, 'changes.json');
      const allChanges = readJson(changesFile);
      const caseChanges = allChanges?.[caseId] ?? [];

      caseSet.get(caseId).cells[version] = {
        preview: pngName ? `${rel}/preview/${pngName}` : null,
        pptx: pptxFiles[0] ? `${rel}/${pptxFiles[0]}` : null,
        spec,
        title: spec?.title ?? null,
        warnings: [],
        changes: caseChanges,
      };
    }
  }

  return {
    versions: versionDirs,
    cases: [...caseSet.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

function renderGallery(model) {
  const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'America/New_York', hour12: false }).replace(',', '');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Skill Lab — Version Comparison</title>
<style>
:root{--paper:#f3f6f8;--card:#fff;--ink:#13222e;--soft:#4f5f6d;--faint:#8493a0;--line:#e1e8ed;--accent:#0e5562;--tint:#eaf4f4;--bad:#a02f2f;--bad-bg:#fbe7e3;--warn:#8a5a12;--warn-bg:#fbf3e6;--shadow:0 1px 2px rgba(19,34,46,.04),0 8px 24px rgba(19,34,46,.05);--display:system-ui,sans-serif;--body:system-ui,-apple-system,"Segoe UI",sans-serif;--mono:ui-monospace,Consolas,monospace;--primary:#00446A;--accent-orange:#E56910}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 var(--body)}
.wrap{max-width:1800px;margin:auto;padding:0 28px}
.mast{padding:48px 0 28px}
.eyebrow,.meta,.foot{font:600 11px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase}
.eyebrow{color:var(--accent)}
h1{font:700 clamp(28px,4vw,44px)/1.08 var(--display);letter-spacing:-.02em;margin:.35rem 0 .6rem}
h1 em{color:var(--accent);font-style:normal}
.lede{color:var(--soft);max-width:72ch}
.meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}
.meta span{background:var(--card);border:1px solid var(--line);border-radius:99px;padding:5px 9px}
.matrix-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card);box-shadow:var(--shadow)}
.matrix{display:grid;min-width:max-content}
.head,.case-head,.cell{border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.head{position:sticky;top:0;z-index:3;background:var(--ink);color:#fff;padding:13px 14px;font:600 13px/1.3 var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.head.baseline{background:var(--primary)}
.head.current{background:#0078D4}
.case-head{position:sticky;left:0;z-index:2;background:var(--card);width:240px;padding:16px}
.case-head strong{display:block;font:600 15px/1.3 var(--display)}
.case-head .case-id{color:var(--faint);font:11px var(--mono)}
.case-head .prompt{display:block;margin-top:6px;padding:5px 7px;background:var(--tint);border-radius:4px;color:var(--soft);font:italic 12px/1.4 var(--body);word-break:break-word}
.cell{width:320px;padding:12px;background:#fff}
.image-button{display:block;width:100%;padding:0;border:1px solid var(--line);border-radius:8px;background:#edf1f4;overflow:hidden;cursor:zoom-in;aspect-ratio:16/9}
.image-button img{display:block;width:100%;height:100%;object-fit:contain}
.empty{height:100%;display:grid;place-items:center;color:var(--faint);font:11px var(--mono);text-transform:uppercase}
.cell-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px;color:var(--soft);font:11px var(--mono)}
.cell-foot a{color:var(--accent);text-decoration:none}
.cell-foot a:hover{text-decoration:underline}
.version-label{display:inline-block;padding:2px 6px;border-radius:4px;font:600 10px var(--mono);letter-spacing:.08em;text-transform:uppercase}
.version-label.baseline{background:var(--primary);color:#fff}
.version-label.improvement{background:var(--accent-orange);color:#fff}
.modal{position:fixed;inset:0;z-index:20;background:rgba(19,34,46,.92);display:none;grid-template-rows:auto 1fr auto;padding:18px}
.modal.open{display:grid}
.modal-bar{display:flex;justify-content:space-between;align-items:flex-start;color:#fff;font:12px var(--mono)}
.modal-prompt{margin-top:4px;color:#9fc9d3;font:italic 11px/1.4 var(--body);letter-spacing:normal;text-transform:none}
.modal button{color:#fff;background:transparent;border:1px solid rgba(255,255,255,.35);border-radius:6px;padding:6px 10px;cursor:pointer}
.modal img{max-width:96vw;max-height:82vh;margin:auto;object-fit:contain}
.hint{text-align:center;color:#d6ebec;font:11px var(--mono)}
.foot{border-top:1px solid var(--line);margin-top:40px;padding:18px 0 28px;color:var(--soft)}
.foot-line{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:0}
@media(max-width:720px){.wrap{padding:0 14px}.case-head{width:180px}.cell{width:260px}}
.changes{margin-top:8px;display:flex;flex-direction:column;gap:4px}
.change{display:flex;gap:6px;align-items:baseline;font:11px/1.4 var(--body);color:var(--soft)}
.change-tag{flex-shrink:0;display:inline-block;padding:1px 5px;border-radius:3px;font:600 9px/1.4 var(--mono);letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.change-tag.ban{background:#fbe7e3;color:#a02f2f}
.change-tag.removed{background:#eee;color:#555}
.change-tag.added{background:#e3f5ed;color:#1a6b3c}
.change-tag.changed{background:#e3effa;color:#1a4d80}
.change-tag.fix{background:#fbf3e6;color:#8a5a12}
.change-tag.note{background:#f3f0fa;color:#5b3e8a}
.changes-toggle{background:none;border:none;padding:0;margin-top:4px;cursor:pointer;font:11px var(--mono);color:var(--accent);text-align:left}
.changes-toggle:hover{text-decoration:underline}
.changes-body{overflow:hidden;transition:max-height .2s ease}
.changes-body.collapsed{max-height:0}
@media print{body{background:#fff}.modal{display:none!important}.matrix-wrap{box-shadow:none}}
</style></head>
<body>
<main class="wrap">
<header class="mast">
<div class="eyebrow">Skill Lab — PowerPoint Skill Development</div>
<h1>Version by version, <em>side by side.</em></h1>
<p class="lede">Each column is a version of the skill output. Baseline is your starting point — improvements are numbered sequentially. Click any preview to zoom; use arrow keys to compare across versions.</p>
<div class="meta">
<span>${model.cases.length} cases</span>
<span>${model.versions.length} versions</span>
<span>generated ${stamp} ET</span>
</div>
</header>
<section class="matrix-wrap" aria-label="Version comparison matrix">
<div id="matrix" class="matrix"></div>
</section>
</main>
<div id="modal" class="modal" role="dialog" aria-modal="true" aria-label="Slide comparison zoom">
<div class="modal-bar">
<div><span id="modalTitle"></span><div id="modalPrompt" class="modal-prompt"></div></div>
<button id="close">Close · Esc</button>
</div>
<img id="modalImage" alt="Selected slide render">
<div class="hint">← / → adjacent version</div>
</div>
<footer class="foot"><div class="wrap foot-line">
<span>SKILL LAB GALLERY</span>
<span>source: skill-lab/versions/</span>
<span>${stamp}</span>
</div></footer>
<script>
const MODEL=${safeJson(model)};
let active=null;
const matrix=document.querySelector('#matrix');
matrix.style.gridTemplateColumns='240px'+MODEL.versions.map(()=>' 320px').join('');

function versionLabel(v){
  if(v==='baseline') return '<span class="version-label baseline">Baseline</span>';
  return '<span class="version-label improvement">'+v.replace(/-/g,' ')+'</span>';
}

function tagClass(tag){
  const t=tag.toLowerCase();
  if(t.startsWith('ban')) return 'ban';
  return {'removed':'removed','added':'added','changed':'changed','fix':'fix','note':'note'}[t]||'note';
}

function renderChanges(changes){
  if(!changes||!changes.length) return '';
  const id='ch_'+Math.random().toString(36).slice(2,8);
  return '<button class="changes-toggle" onclick="toggleChanges(\\''+id+'\\')">'+changes.length+' change'+(changes.length===1?'':'s')+' — why?</button>'+
    '<div id="'+id+'" class="changes changes-body collapsed">'+
    changes.map(c=>'<div class="change"><span class="change-tag '+tagClass(c.tag)+'">'+c.tag+'</span><span>'+c.note+'</span></div>').join('')+
    '</div>';
}

function render(){
  matrix.innerHTML='<div class="head">Case</div>'+MODEL.versions.map((v,vi)=>
    '<div class="head'+(vi===0?' current':v==='baseline'?' baseline':'')+'">'+v+'</div>'
  ).join('');

  MODEL.cases.forEach((c,ci)=>{
    matrix.insertAdjacentHTML('beforeend',
      '<div class="case-head"><strong>'+c.title+'</strong>'+
      '<span class="case-id">'+c.id+'</span>'+
      (c.prompt?'<span class="prompt">'+c.prompt+'</span>':'')+
      '</div>'
    );

    MODEL.versions.forEach((v,vi)=>{
      const cell=c.cells[v];
      const img=cell?.preview;
      const changes=cell?.changes||[];
      const el=document.createElement('div');
      el.className='cell';
      el.innerHTML=(img
        ?'<button class="image-button"><img src="'+img+'" alt="'+c.title+' · '+v+'"></button>'
        :'<div class="image-button"><span class="empty">No artifact</span></div>'
      )+'<div class="cell-foot">'+versionLabel(v)+
      (cell?.pptx?'<a href="'+cell.pptx+'" download>Download .pptx</a>':'<span>—</span>')+
      '</div>'+renderChanges(changes);
      el.querySelector('button')?.addEventListener('click',()=>openModal(ci,vi));
      matrix.append(el);
    });
  });
}

function openModal(ci,vi){
  active={ci,vi};
  updateModal();
  document.querySelector('#modal').classList.add('open');
}

function updateModal(){
  if(!active) return;
  const c=MODEL.cases[active.ci];
  const v=MODEL.versions[active.vi];
  const cell=c.cells[v];
  const img=cell?.preview;
  document.querySelector('#modalTitle').textContent=c.title+' · '+v;
  document.querySelector('#modalPrompt').textContent=c.prompt||'';
  const image=document.querySelector('#modalImage');
  image.src=img||'';
  image.style.visibility=img?'visible':'hidden';
}

function closeModal(){
  document.querySelector('#modal').classList.remove('open');
  active=null;
}

document.querySelector('#close').onclick=closeModal;
document.querySelector('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
addEventListener('keydown',e=>{
  if(!active) return;
  if(e.key==='Escape') closeModal();
  if(e.key==='ArrowLeft'){active.vi=Math.max(0,active.vi-1);updateModal()}
  if(e.key==='ArrowRight'){active.vi=Math.min(MODEL.versions.length-1,active.vi+1);updateModal()}
});

function toggleChanges(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.toggle('collapsed');
  const btn=el.previousElementSibling;
  if(btn&&btn.classList.contains('changes-toggle')){
    btn.textContent=el.classList.contains('collapsed')
      ? btn.textContent.replace('hide','why?')
      : btn.textContent.replace('why?','hide');
  }
}

render();
</script>
</body></html>`;
}

// Main
const model = scanVersions();
const galleryDir = path.join(root, 'gallery');
fs.mkdirSync(galleryDir, { recursive: true });
const out = path.join(galleryDir, 'index.html');
fs.writeFileSync(out, renderGallery(model), 'utf8');
console.log(`Gallery: ${out} (${model.cases.length} cases × ${model.versions.length} versions)`);
