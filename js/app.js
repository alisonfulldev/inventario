// ============================================================
//  INVENTÁRIO — lógica principal
// ============================================================

const PHOTO_TYPES = [
  'bordo', 'tela', 'chip-bordo',           // grupo Bordo
  'radio',                                   // grupo Rádio
  'monitor', 'receptor', 'nave',            // grupo Piloto Automático
  'automacao',                               // grupo Automação
];

// Mapa grupo → tipos + total esperado (itens com ≥1 foto)
const GROUP_MAP = {
  bordo:    { types: ['bordo', 'tela', 'chip-bordo'],       total: 3 },
  radio:    { types: ['radio'],                              total: 1 },
  piloto:   { types: ['monitor', 'receptor', 'nave'],        total: 3 },
  automacao:{ types: ['automacao'],                          total: 1 },
};

// selectedPhotos[type] = [] de Files (múltiplos por tipo)
const selectedPhotos = {};
PHOTO_TYPES.forEach(t => { selectedPhotos[t] = []; });

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  requireAuth((user) => {
    setupUI(user);
    setupStatusButtons();
    setupPhotoCards();
    setupForm();
  });
});

// ─── UI ───────────────────────────────────────────────────────
function setupUI(user) {
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = user.email;

  const adminLink = document.getElementById('admin-link');
  if (adminLink) adminLink.style.display = isAdmin(user.uid) ? 'flex' : 'none';

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut();
    window.location.href = 'index.html';
  });
}

// ─── Status ───────────────────────────────────────────────────
function setupStatusButtons() {
  document.querySelectorAll('input[name="status"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('lbl-instalado')?.classList.remove('selected-instalado');
      document.getElementById('lbl-retirado')?.classList.remove('selected-retirado');
      document.getElementById(`lbl-${radio.value === 'instalados' ? 'instalado' : 'retirado'}`)
        ?.classList.add(`selected-${radio.value === 'instalados' ? 'instalado' : 'retirado'}`);
    });
  });
}

// ─── Cards de foto (multi-foto) ───────────────────────────────
function setupPhotoCards() {
  PHOTO_TYPES.forEach(type => {
    const input   = document.getElementById(`foto-${type}`);
    const loading = document.getElementById(`loading-${type}`);
    if (!input) return;

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      loading?.classList.add('active');
      try {
        const compressed = await compressImage(file, 1280, 0.78);
        const finalFile  = new File([compressed], `${type}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const dataURL    = await fileToDataURL(finalFile);

        selectedPhotos[type].push(finalFile);
        addThumbnail(type, dataURL, selectedPhotos[type].length - 1);
        updateProgress();
      } catch {
        showToast('Erro ao processar imagem.', 'error');
      } finally {
        loading?.classList.remove('active');
        input.value = ''; // permite selecionar o mesmo arquivo de novo
      }
    });
  });
}

// Insere thumbnail no strip do card
function addThumbnail(type, dataURL, index) {
  const strip = document.getElementById(`thumbs-${type}`);
  if (!strip) return;

  const addBtn = strip.querySelector('.thumb-add');

  const item = document.createElement('div');
  item.className = 'thumb-item';
  item.dataset.index = index;

  const img = document.createElement('img');
  img.src = dataURL;
  img.alt = `${type} ${index + 1}`;

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'thumb-del';
  delBtn.innerHTML = '✕';
  delBtn.setAttribute('aria-label', 'Remover foto');
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removePhoto(type, item);
  });

  item.appendChild(img);
  item.appendChild(delBtn);
  strip.insertBefore(item, addBtn);

  // Scroll para mostrar a foto recém-adicionada
  strip.scrollLeft = strip.scrollWidth;
}

// Remove uma foto do array e do DOM, re-indexa os demais
function removePhoto(type, thumbEl) {
  const idx = parseInt(thumbEl.dataset.index, 10);
  selectedPhotos[type].splice(idx, 1);
  thumbEl.remove();

  document.getElementById(`thumbs-${type}`)
    ?.querySelectorAll('.thumb-item')
    .forEach((el, i) => { el.dataset.index = i; });

  updateProgress();
}

// ─── Progresso ────────────────────────────────────────────────
function updateProgress() {
  // Progresso global: quantos tipos têm ≥1 foto
  const covered = PHOTO_TYPES.filter(t => selectedPhotos[t].length > 0).length;
  const total   = PHOTO_TYPES.length;

  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  if (fill) fill.style.width = (covered / total * 100) + '%';
  if (text) text.textContent = `${covered} / ${total}`;

  // Badge de cada card (nº de fotos tiradas)
  PHOTO_TYPES.forEach(type => {
    const count = selectedPhotos[type].length;
    const badge = document.getElementById(`badge-${type}`);
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('has-photos', count > 0);
    }
  });

  // Contador de grupo (tipos cobertos / total do grupo)
  for (const [group, { types, total: groupTotal }] of Object.entries(GROUP_MAP)) {
    const done = types.filter(t => selectedPhotos[t].length > 0).length;
    const el   = document.getElementById(`count-${group}`);
    if (el) {
      el.textContent = `${done} / ${groupTotal}`;
      el.classList.toggle('done', done === groupTotal);
    }
  }
}

// ─── Upload Storage ───────────────────────────────────────────
async function uploadPhotos(frota) {
  const today = new Date().toISOString().slice(0, 10);
  const base  = `inventario/${frota}/${today}`;
  const urls  = {};

  for (const [type, files] of Object.entries(selectedPhotos)) {
    if (!files.length) continue;
    urls[type] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const ref = storage.ref(`${base}/${type}_${i}.jpg`);
        await ref.put(files[i]);
        urls[type].push(await ref.getDownloadURL());
      } catch (err) {
        console.warn(`Foto ${type}[${i}] não enviada:`, err.message);
      }
    }
  }
  return urls;
}

// ─── Coleta todos os campos ───────────────────────────────────
function coletarDados() {
  const val = (id) => document.getElementById(id)?.value?.trim() || '';

  return {
    matricula:  val('matricula'),
    frota:      val('frota'),
    status:     document.querySelector('input[name="status"]:checked')?.value || '',
    observacao: val('observacao'),
    numerosSerie: {
      serieBordo:     val('serie-bordo'),
      serieTela:      val('serie-tela'),
      serieRadio:     val('serie-radio'),
      idRadio:        val('id-radio'),
      serieMonitor:   val('serie-monitor'),
      serieReceptor:  val('serie-receptor'),
      serieNave:      val('serie-nave'),
      serieTM200:     val('serie-tm200'),
      serieAG850:     val('serie-ag850'),
      serieAutomacao: val('serie-automacao'),
    },
    chipBordo: val('chip-bordo'),
  };
}

// ─── Submit ───────────────────────────────────────────────────
function setupForm() {
  document.getElementById('form-inventario')?.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();

  const dados = coletarDados();
  if (!dados.matricula) { showToast('Informe a matrícula.', 'error'); return; }
  if (!dados.frota)     { showToast('Informe a frota.', 'error'); return; }
  if (!dados.status)    { showToast('Selecione o status.', 'error'); return; }

  const btn = document.getElementById('btn-submit');
  setLoading(btn, true);

  try {
    showToast('Enviando fotos…', 'info');
    const fotosURL = await uploadPhotos(dados.frota);

    const totalFotos = Object.values(fotosURL)
      .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

    await db.collection('inventarios').add({
      ...dados,
      fotosURL,
      totalFotos,
      dataRegistro: firebase.firestore.FieldValue.serverTimestamp(),
      uid:          auth.currentUser.uid,
      email:        auth.currentUser.email,
    });

    showToast('Inventário enviado! ✔', 'success');
    setTimeout(() => {
      document.getElementById('form-inventario').reset();
      resetCards();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1500);

  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ─── Reset ────────────────────────────────────────────────────
function resetCards() {
  PHOTO_TYPES.forEach(type => {
    selectedPhotos[type] = [];

    const strip = document.getElementById(`thumbs-${type}`);
    if (strip) strip.querySelectorAll('.thumb-item').forEach(el => el.remove());

    const input = document.getElementById(`foto-${type}`);
    if (input) input.value = '';
  });

  document.getElementById('lbl-instalado')?.classList.remove('selected-instalado');
  document.getElementById('lbl-retirado')?.classList.remove('selected-retirado');
  updateProgress();
}

function setLoading(btn, on) {
  if (!btn) return;
  btn.disabled  = on;
  btn.innerHTML = on
    ? '<span class="spinner"></span> Enviando…'
    : '<span>📤</span> Enviar Inventário';
}
