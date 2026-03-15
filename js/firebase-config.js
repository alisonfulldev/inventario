// ============================================================
//  CONFIGURAÇÃO FIREBASE
//  Substitua os valores abaixo pelos do seu projeto Firebase
//  Console: https://console.firebase.google.com
// ============================================================

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Se o modo demo estiver ativo, não inicializa o SDK real
if (window._DEMO_MODE) {
  console.info('[firebase-config] Modo demo ativo — init ignorado.');
} else {
  firebase.initializeApp(firebaseConfig);

  // Referências globais dos serviços
  window.auth    = firebase.auth();
  window.db      = firebase.firestore();
  window.storage = firebase.storage();
}

// ============================================================
//  USUÁRIOS ADMIN (UID do Firebase Auth)
//  Adicione o UID dos usuários que terão acesso ao painel admin
// ============================================================
const ADMIN_UIDS = [
  // "UID_DO_ADMIN_1",
  // "UID_DO_ADMIN_2"
];

function isAdmin(uid) {
  return ADMIN_UIDS.includes(uid);
}
