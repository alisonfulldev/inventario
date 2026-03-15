// ============================================================
//  PAINEL ADMIN
// ============================================================

let allInventarios = [];
let currentDoc     = null;
const chartInstances = {};

document.addEventListener('DOMContentLoaded', () => {
  requireAdmin((user) => {
    setupAdminUI(user);
    loadInventarios();
    setupSearch();
    setupModal();
    setupChartsToggle();
  });
});

// ─── UI ───────────────────────────────────────────────────────
function setupAdminUI(user) {
  const el = document.getElementById('admin-email');
  if (el) el.textContent = user.email;

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut();
    window.location.href = 'index.html';
  });
}

// ─── Toggle gráficos ──────────────────────────────────────────
function setupChartsToggle() {
  document.getElementById('btn-charts-toggle')?.addEventListener('click', () => {
    const body = document.getElementById('charts-body');
    const btn  = document.getElementById('btn-charts-toggle');
    const collapsed = body.classList.toggle('charts-body--hidden');
    btn.textContent = collapsed ? '▼ ver gráficos' : '▲ ocultar';
    if (!collapsed) {
      Object.values(chartInstances).forEach(c => c?.resize?.());
    }
  });
}

// ─── Carregar inventários ──────────────────────────────────────
async function loadInventarios() {
  const list    = document.getElementById('inventario-list');
  const counter = document.getElementById('result-count');
  list.innerHTML = '<div class="loading-state"><span class="spinner"></span> Carregando...</div>';

  try {
    const snap = await db.collection('inventarios').orderBy('dataRegistro', 'desc').get();
    allInventarios = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const filtered = filterResults(allInventarios, {});
    counter.textContent = `${filtered.length} registro(s) encontrado(s)`;
    renderList(filtered);
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Erro ao carregar: ${err.message}</div>`;
  }
}

function filterResults(docs, { term = '', campo = 'all' } = {}) {
  if (!term) return docs;
  const t = term.toLowerCase();

  return docs.filter(doc => {
    if (campo === 'frota'    || campo === 'all') {
      if (doc.frota?.toLowerCase().includes(t)) return true;
    }
    if (campo === 'matricula' || campo === 'all') {
      if (doc.matricula?.toLowerCase().includes(t)) return true;
    }
    if (campo === 'serie' || campo === 'all') {
      const series = Object.values(doc.numerosSerie || {}).join(' ').toLowerCase();
      if (series.includes(t)) return true;
    }
    return false;
  });
}

// ─── Renderizar lista ──────────────────────────────────────────
function renderList(docs) {
  const list = document.getElementById('inventario-list');

  if (docs.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum inventário encontrado.</div>';
    return;
  }

  list.innerHTML = docs.map(doc => {
    const date = doc.dataRegistro?.toDate
      ? doc.dataRegistro.toDate().toLocaleDateString('pt-BR')
      : '—';

    const statusClass = doc.status === 'instalados' ? 'badge--green' : 'badge--red';
    const totalFotos  = countTotalFotos(doc.fotosURL);

    return `
      <div class="card inv-card" data-id="${doc.id}">
        <div class="inv-card__header">
          <div>
            <span class="inv-frota">Frota: <strong>${doc.frota || '—'}</strong></span>
            <span class="inv-matricula">Matrícula: ${doc.matricula || '—'}</span>
          </div>
          <span class="badge ${statusClass}">${doc.status || '—'}</span>
        </div>
        <div class="inv-card__body">
          <p class="inv-date"><span class="label">Data:</span> ${date}</p>
          <p class="inv-date"><span class="label">Técnico:</span> ${doc.email || '—'}</p>
          ${totalFotos > 0 ? `<p class="inv-fotos-badge"><span class="badge badge--blue">📷 ${totalFotos} foto${totalFotos > 1 ? 's' : ''}</span></p>` : ''}
        </div>
        <div class="inv-card__actions">
          <button class="btn btn--outline btn--sm" onclick="openModal('${doc.id}')">Ver detalhes</button>
          <button class="btn btn--primary btn--sm" onclick="downloadZip('${doc.id}')">
            ⬇ Baixar imagens
          </button>
        </div>
      </div>`;
  }).join('');
}

// Conta o total de fotos em fotosURL (suporta arrays e URLs únicas)
function countTotalFotos(fotosURL = {}) {
  return Object.values(fotosURL).reduce((sum, v) => {
    return sum + (Array.isArray(v) ? v.length : (v ? 1 : 0));
  }, 0);
}

// ─── Busca ────────────────────────────────────────────────────
function setupSearch() {
  const input  = document.getElementById('search-input');
  const campo  = document.getElementById('search-campo');
  const btnClr = document.getElementById('btn-clear-search');

  const doSearch = () => {
    const term = input.value.trim();
    btnClr.style.display = term ? 'flex' : 'none';
    const filtered = filterResults(allInventarios, { term, campo: campo.value });
    document.getElementById('result-count').textContent = `${filtered.length} registro(s) encontrado(s)`;
    renderList(filtered);
  };

  input.addEventListener('input', doSearch);
  campo.addEventListener('change', doSearch);

  btnClr.addEventListener('click', () => {
    input.value = '';
    btnClr.style.display = 'none';
    renderList(allInventarios);
    document.getElementById('result-count').textContent = `${allInventarios.length} registro(s) encontrado(s)`;
  });
}

// ─── Modal de detalhes ────────────────────────────────────────
function setupModal() {
  const overlay  = document.getElementById('modal-overlay');
  const btnClose = document.getElementById('modal-close');
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  btnClose?.addEventListener('click', closeModal);
}

function openModal(id) {
  const doc = allInventarios.find(d => d.id === id);
  if (!doc) return;
  currentDoc = doc;

  const date = doc.dataRegistro?.toDate
    ? doc.dataRegistro.toDate().toLocaleString('pt-BR')
    : '—';

  document.getElementById('modal-title').textContent = `Frota ${doc.frota || '—'} — ${doc.matricula || '—'}`;

  const ns = doc.numerosSerie || {};
  const totalFotos = countTotalFotos(doc.fotosURL);

  document.getElementById('modal-body').innerHTML = `
    <div class="detail-grid">

      <div class="detail-section">
        <h3>Identificação</h3>
        <p><strong>Matrícula:</strong> ${doc.matricula || '—'}</p>
        <p><strong>Frota:</strong> ${doc.frota || '—'}</p>
        <p><strong>Data:</strong> ${date}</p>
        <p><strong>Status:</strong>
          <span class="badge ${doc.status === 'instalados' ? 'badge--green' : 'badge--red'}">
            ${doc.status === 'instalados' ? '✅ Instalados' : '🔧 Retirados'}
          </span>
        </p>
        ${doc.email ? `<p><strong>Técnico:</strong> ${doc.email}</p>` : ''}
      </div>

      <div class="detail-section">
        <h3>Números de Série</h3>
        ${row('Bordo',      ns.serieBordo)}
        ${row('Tela',       ns.serieTela)}
        ${row('Rádio',      ns.serieRadio)}
        ${row('ID rádio',   ns.idRadio)}
        ${row('Monitor',    ns.serieMonitor)}
        ${row('Receptor',   ns.serieReceptor)}
        ${row('Nave',       ns.serieNave)}
        ${row('TM200',      ns.serieTM200)}
        ${row('AG850',      ns.serieAG850)}
        ${row('Automação',  ns.serieAutomacao)}
        ${!Object.values(ns).some(Boolean) ? '<p style="color:#b0bba9;font-style:italic">Nenhum informado</p>' : ''}
      </div>

      ${doc.chipBordo ? `
      <div class="detail-section">
        <h3>Chip Bordo</h3>
        <p>${doc.chipBordo}</p>
      </div>` : ''}

      ${doc.observacao ? `
      <div class="detail-section">
        <h3>Observação</h3>
        <p>${doc.observacao}</p>
      </div>` : ''}

      <div class="detail-section detail-section--full">
        <h3>Fotos (${totalFotos})</h3>
        ${buildFotosHTML(doc.fotosURL)}
      </div>

    </div>
  `;

  document.getElementById('modal-overlay').style.display = 'flex';
}

function row(label, val) {
  if (!val) return '';
  return `<p><strong>${label}:</strong> ${val}</p>`;
}

function buildFotosHTML(fotosURL = {}) {
  const labels = {
    bordo: 'Bordo', tela: 'Tela', 'chip-bordo': 'Chip Bordo',
    radio: 'Rádio', monitor: 'Monitor', receptor: 'Receptor',
    nave: 'Nave', automacao: 'Automação',
  };

  // Normaliza: suporta arrays e URLs únicas (compatibilidade)
  const items = [];
  for (const [type, value] of Object.entries(fotosURL)) {
    const urls = Array.isArray(value) ? value : (value ? [value] : []);
    urls.forEach((url, i) => {
      const suffix = urls.length > 1 ? ` ${i + 1}` : '';
      items.push({ label: (labels[type] || type) + suffix, url });
    });
  }

  if (items.length === 0) return '<p>Nenhuma foto enviada.</p>';

  return `<div class="fotos-grid">
    ${items.map(({ label, url }) => `
      <div class="foto-item">
        <a href="${url}" target="_blank" rel="noopener">
          <img src="${url}" alt="${label}" loading="lazy">
        </a>
        <span class="foto-label">${label}</span>
        <a href="${url}" download="${label}.jpg" class="btn btn--outline btn--xs">⬇ Baixar</a>
      </div>`).join('')}
  </div>`;
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  currentDoc = null;
}

// ─── Download ZIP ─────────────────────────────────────────────
async function downloadZip(id) {
  const doc = allInventarios.find(d => d.id === id);
  if (!doc) return;

  // Achata todas as fotos em [{type, url, filename}]
  const fotos = [];
  for (const [type, value] of Object.entries(doc.fotosURL || {})) {
    const urls = Array.isArray(value) ? value : (value ? [value] : []);
    urls.forEach((url, i) => {
      fotos.push({ url, filename: urls.length > 1 ? `${type}_${i + 1}.jpg` : `${type}.jpg` });
    });
  }

  if (fotos.length === 0) {
    showToast('Este inventário não possui fotos.', 'error');
    return;
  }

  showToast('Preparando ZIP...', 'info');

  try {
    const zip    = new JSZip();
    const folder = zip.folder(`frota_${doc.frota}_${doc.matricula}`);

    await Promise.all(fotos.map(async ({ url, filename }) => {
      const resp = await fetch(url);
      const blob = await resp.blob();
      folder.file(filename, blob);
    }));

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `inventario_frota${doc.frota}_${doc.matricula}.zip`);
    showToast('Download iniciado!', 'success');
  } catch (err) {
    showToast('Erro ao gerar ZIP: ' + err.message, 'error');
  }
}

// ─── Gráficos ─────────────────────────────────────────────────
const CHART_COLORS = {
  green:    '#2e7d32',
  greenMid: '#43a047',
  greenLt:  '#81c784',
  orange:   '#f9a825',
  red:      '#e53935',
  gray:     '#9e9e9e',
  blue:     '#0277bd',
};
const GREENS = ['#1b5e20','#2e7d32','#388e3c','#43a047','#4caf50','#66bb6a','#81c784','#a5d6a7'];

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

function renderCharts(docs) {
  renderStatusChart(docs);
  renderTechChart(docs);
  renderTimelineChart(docs);
  renderEquipChart(docs);
}

// Doughnut — Instalados vs Retirados
function renderStatusChart(docs) {
  destroyChart('status');
  const ctx = document.getElementById('chart-status')?.getContext('2d');
  if (!ctx) return;

  const inst = docs.filter(d => d.status === 'instalados').length;
  const ret  = docs.filter(d => d.status === 'retirados').length;
  const out  = docs.length - inst - ret;

  const data   = [inst, ret, out].filter((_, i) => [inst, ret, out][i] > 0);
  const labels = ['Instalados', 'Retirados', 'Outros'].filter((_, i) => [inst, ret, out][i] > 0);
  const colors = [CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.gray].filter((_, i) => [inst, ret, out][i] > 0);

  chartInstances['status'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, padding: 10 } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed}` } },
      },
    },
  });
}

// Bar — Registros por técnico
function renderTechChart(docs) {
  destroyChart('tech');
  const ctx = document.getElementById('chart-tech')?.getContext('2d');
  if (!ctx || !docs.length) return;

  const map = {};
  docs.forEach(d => {
    const name = (d.email || 'Desconhecido').split('@')[0];
    map[name] = (map[name] || 0) + 1;
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7);

  chartInstances['tech'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([n]) => n),
      datasets: [{
        label: 'Inventários',
        data: sorted.map(([, n]) => n),
        backgroundColor: sorted.map((_, i) => GREENS[i % GREENS.length] + 'cc'),
        borderRadius: 5,
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#f0f0f0' } },
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 } },
      },
    },
  });
}

// Bar — Registros por data (últimas 14 datas com registro)
function renderTimelineChart(docs) {
  destroyChart('timeline');
  const ctx = document.getElementById('chart-timeline')?.getContext('2d');
  if (!ctx || !docs.length) return;

  const map = {};
  docs.forEach(d => {
    const date = d.dataRegistro?.toDate
      ? d.dataRegistro.toDate().toLocaleDateString('pt-BR')
      : 'Sem data';
    map[date] = (map[date] || 0) + 1;
  });

  const parseDate = s => { const [dd, mm, yy] = s.split('/'); return new Date(yy, mm - 1, dd); };
  const sorted = Object.entries(map)
    .sort((a, b) => parseDate(a[0]) - parseDate(b[0]))
    .slice(-14);

  chartInstances['timeline'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([d]) => d),
      datasets: [{
        label: 'Registros',
        data: sorted.map(([, n]) => n),
        backgroundColor: CHART_COLORS.greenMid + 'bb',
        borderColor: CHART_COLORS.green,
        borderWidth: 1.5,
        borderRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#f0f0f0' } },
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      },
    },
  });
}

// Horizontal bar — % inventários com foto por equipamento
function renderEquipChart(docs) {
  destroyChart('equip');
  const ctx = document.getElementById('chart-equip')?.getContext('2d');
  if (!ctx || !docs.length) return;

  const EQUIP_TYPES = [
    { key: 'bordo',      label: 'Bordo' },
    { key: 'tela',       label: 'Tela' },
    { key: 'chip-bordo', label: 'Chip Bordo' },
    { key: 'radio',      label: 'Rádio' },
    { key: 'monitor',    label: 'Monitor' },
    { key: 'receptor',   label: 'Receptor' },
    { key: 'nave',       label: 'Nave' },
    { key: 'automacao',  label: 'Automação' },
  ];

  const total = docs.length;
  const data  = EQUIP_TYPES.map(({ key }) => {
    const count = docs.filter(d => {
      const v = (d.fotosURL || {})[key];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    return Math.round(count / total * 100);
  });

  chartInstances['equip'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: EQUIP_TYPES.map(t => t.label),
      datasets: [{
        label: 'Cobertura (%)',
        data,
        backgroundColor: data.map(pct =>
          pct >= 80 ? CHART_COLORS.green + 'cc'
          : pct >= 40 ? CHART_COLORS.orange + 'cc'
          : CHART_COLORS.red + 'aa'
        ),
        borderRadius: 5,
        borderWidth: 0,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.parsed.x}%` } },
      },
      scales: {
        x: {
          min: 0, max: 100,
          ticks: { callback: v => v + '%', font: { size: 10 } },
          grid: { color: '#f0f0f0' },
        },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

// Expor funções globais usadas no HTML inline
window.renderList  = renderList;
window.renderCharts = renderCharts;
window.openModal   = openModal;
window.downloadZip = downloadZip;
