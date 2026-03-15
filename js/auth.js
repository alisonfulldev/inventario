// ============================================================
//  AUTENTICAÇÃO
// ============================================================

// Verifica sessão e redireciona conforme necessário
function requireAuth(onAuthed) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      onAuthed(user);
    } else {
      window.location.href = 'index.html';
    }
  });
}

function requireAdmin(onAuthed) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    if (isAdmin(user.uid)) {
      onAuthed(user);
      return;
    }
    // Usuário logado mas sem acesso admin: mostra tela de bloqueio
    _showUnauthorized(user.email);
  });
}

function _showUnauthorized(email) {
  document.body.innerHTML = `
    <div style="
      min-height:100vh; display:flex; flex-direction:column;
      align-items:center; justify-content:center; padding:24px;
      background:#f4f6f3; font-family:system-ui,sans-serif; text-align:center;
    ">
      <div style="
        background:#fff; border-radius:16px; padding:32px 28px;
        max-width:360px; width:100%; box-shadow:0 4px 20px rgba(0,0,0,.1);
      ">
        <div style="font-size:3rem; margin-bottom:12px">🔒</div>
        <h2 style="color:#1b5e20; margin:0 0 8px">Acesso restrito</h2>
        <p style="color:#6a7a65; font-size:.9rem; margin:0 0 6px">
          Você está logado como:
        </p>
        <p style="color:#1c2b18; font-weight:700; margin:0 0 24px; font-size:.95rem">
          ${email}
        </p>
        <p style="color:#6a7a65; font-size:.85rem; margin:0 0 24px">
          Esta área é exclusiva para administradores.<br>
          Saia e entre com uma conta admin.
        </p>
        <button onclick="auth.signOut().then(()=> location.href='index.html')"
          style="
            width:100%; padding:14px; background:#2e7d32; color:#fff;
            border:none; border-radius:10px; font-size:1rem; font-weight:700;
            cursor:pointer;
          ">
          Sair e trocar conta
        </button>
        <a href="inventario.html"
          style="display:block; margin-top:12px; color:#6a7a65; font-size:.85rem">
          Voltar para o inventário
        </a>
      </div>
    </div>`;
}

async function signIn(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

async function signOut() {
  return auth.signOut();
}

// ─── Toast global ────────────────────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
