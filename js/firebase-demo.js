// ============================================================
//  FIREBASE DEMO MOCK — sem conexão real, tudo em localStorage
//  Usuários de teste:
//    Técnico: tecnico@demo.com  / senha: 123456
//    Admin:   admin@demo.com    / senha: 123456
// ============================================================

// Sinaliza modo demo ANTES de qualquer outro script rodar
window._DEMO_MODE = true;

const LS_SESSION     = 'demo_session';
const LS_INVENTARIOS = 'demo_inventarios';
const LS_PHOTOS      = 'demo_photos';

// ─── Usuários de demo ─────────────────────────────────────────
const DEMO_USERS = [
  { uid: 'user-001',  email: 'tecnico@demo.com', password: '123456', admin: false },
  { uid: 'admin-001', email: 'admin@demo.com',   password: '123456', admin: true  },
];

// ─── Estado de sessão ─────────────────────────────────────────
let _currentUser    = null;
const _authListeners = [];

function _notifyAuth(user) {
  _authListeners.forEach(cb => {
    try { cb(user); } catch(e) { console.error(e); }
  });
}

// ─── Mock: auth ───────────────────────────────────────────────
const auth = {
  get currentUser() { return _currentUser; },

  onAuthStateChanged(callback) {
    _authListeners.push(callback);
    const saved = localStorage.getItem(LS_SESSION);
    if (saved) {
      _currentUser = JSON.parse(saved);
      setTimeout(() => callback(_currentUser), 0);
    } else {
      setTimeout(() => callback(null), 0);
    }
  },

  signInWithEmailAndPassword(email, password) {
    const found = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (!found) {
      return Promise.reject({
        code: 'auth/invalid-credential',
        message: 'E-mail ou senha incorretos.'
      });
    }
    _currentUser = { uid: found.uid, email: found.email };
    localStorage.setItem(LS_SESSION, JSON.stringify(_currentUser));
    setTimeout(() => _notifyAuth(_currentUser), 0);
    return Promise.resolve({ user: _currentUser });
  },

  signOut() {
    _currentUser = null;
    localStorage.removeItem(LS_SESSION);
    setTimeout(() => _notifyAuth(null), 0);
    return Promise.resolve();
  },
};

// ─── Mock: Firestore ──────────────────────────────────────────
function _getItems() {
  try { return JSON.parse(localStorage.getItem(LS_INVENTARIOS) || '[]'); }
  catch { return []; }
}
function _saveItems(items) {
  localStorage.setItem(LS_INVENTARIOS, JSON.stringify(items));
}

function _makeDoc(item) {
  return {
    id: item._id,
    data() {
      return {
        ...item,
        dataRegistro: {
          toDate: () => new Date(item._ts || Date.now()),
          seconds: (item._ts || Date.now()) / 1000,
        },
      };
    },
  };
}

const db = {
  collection(name) {
    return {
      add(data) {
        const items = _getItems();
        const id    = 'inv-' + Date.now();
        const ts    = Date.now();
        const item  = { ...data, _id: id, _ts: ts, dataRegistro: ts };
        items.unshift(item);
        _saveItems(items);
        return Promise.resolve({ id });
      },

      orderBy(/* field, dir */) {
        return {
          get() {
            const items = _getItems();
            return Promise.resolve({ docs: items.map(_makeDoc) });
          },
        };
      },
    };
  },
};

// ─── Mock: Storage (base64 em localStorage) ───────────────────
function _getPhotos() {
  try { return JSON.parse(localStorage.getItem(LS_PHOTOS) || '{}'); }
  catch { return {}; }
}

const storage = {
  ref(path) {
    return {
      put(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const photos   = _getPhotos();
            photos[path]   = e.target.result;   // guarda como data-URL base64
            try {
              localStorage.setItem(LS_PHOTOS, JSON.stringify(photos));
            } catch {
              // localStorage cheio: guarda vazio para não quebrar o fluxo
              console.warn('localStorage cheio — foto não persistida.');
            }
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      },

      getDownloadURL() {
        const photos = _getPhotos();
        return Promise.resolve(photos[path] || '');
      },
    };
  },
};

// ─── Mock: firebase global ────────────────────────────────────
const firebase = {
  initializeApp() { /* no-op */ },
  firestore: {
    FieldValue: {
      serverTimestamp() { return Date.now(); },
    },
  },
};

// ─── Admin ────────────────────────────────────────────────────
const ADMIN_UIDS = ['admin-001'];
function isAdmin(uid) { return ADMIN_UIDS.includes(uid); }

// ─── Expor globalmente (mesma interface que firebase-config.js) ─
window.firebase    = firebase;
window.auth        = auth;
window.db          = db;
window.storage     = storage;
window.isAdmin     = isAdmin;
window.ADMIN_UIDS  = ADMIN_UIDS;

// ─── Banner de aviso ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const banner = document.createElement('div');
  banner.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'right:0',
    'background:#f9a825', 'color:#1a1a1a', 'text-align:center',
    'padding:7px 12px', 'font-size:.78rem', 'font-weight:700',
    'z-index:9999', 'letter-spacing:.2px',
  ].join(';');
  banner.textContent = '⚠ MODO DEMO — dados salvos apenas neste navegador | tecnico@demo.com ou admin@demo.com / 123456';
  document.body.appendChild(banner);
});
