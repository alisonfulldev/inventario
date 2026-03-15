# Guia de Configuração — Inventário de Embarcados Agrícolas

## Pré-requisitos

- Conta Google
- Projeto no [Firebase Console](https://console.firebase.google.com)
- Navegador moderno com suporte a ES6+

---

## Passo 1 — Criar projeto no Firebase

1. Acesse https://console.firebase.google.com
2. Clique em **"Adicionar projeto"**
3. Dê um nome (ex: `inventario-embarcados`)
4. Desative o Google Analytics (opcional)
5. Clique em **"Criar projeto"**

---

## Passo 2 — Habilitar serviços

### Authentication
1. No menu lateral: **Build → Authentication**
2. Clique em **"Começar"**
3. Em **Sign-in method**, ative **E-mail/senha**
4. Vá em **Users → Adicionar usuário** e crie os usuários de campo e admin

### Cloud Firestore
1. No menu lateral: **Build → Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Selecione **modo de produção**
4. Escolha a região (ex: `southamerica-east1`)

### Storage
1. No menu lateral: **Build → Storage**
2. Clique em **"Começar"**
3. Selecione a mesma região do Firestore

---

## Passo 3 — Configurar o arquivo `js/firebase-config.js`

1. No Firebase Console, vá em **Configurações do projeto** (ícone de engrenagem)
2. Em **"Seus apps"**, clique em **"</> Web"**
3. Registre o app e copie o objeto `firebaseConfig`
4. Abra `js/firebase-config.js` e substitua os valores:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "inventario-embarcados.firebaseapp.com",
  projectId:         "inventario-embarcados",
  storageBucket:     "inventario-embarcados.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

---

## Passo 4 — Configurar admins

1. No Firebase Console → Authentication → Users, copie o **UID** dos usuários admin
2. Em `js/firebase-config.js`, adicione os UIDs:

```js
const ADMIN_UIDS = [
  "UID_DO_ADMIN_AQUI",
  "OUTRO_UID_SE_NECESSARIO"
];
```

3. No arquivo `firestore.rules`, adicione os mesmos UIDs:

```
function isAdmin() {
  return request.auth.uid in [
    "UID_DO_ADMIN_AQUI"
  ];
}
```

---

## Passo 5 — Aplicar regras de segurança

### Firestore
1. No Console → Firestore → **Regras**
2. Cole o conteúdo do arquivo `firestore.rules`
3. Clique em **Publicar**

### Storage
1. No Console → Storage → **Regras**
2. Cole o conteúdo do arquivo `storage.rules`
3. Clique em **Publicar**

---

## Passo 6 — Publicar o site

### Opção A — Firebase Hosting (recomendado)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# public directory: . (ponto)
# single page app: não
firebase deploy
```

### Opção B — Qualquer servidor estático
Faça upload de todos os arquivos para qualquer hospedagem (Netlify, Vercel, GitHub Pages, etc.)

### Opção C — Acesso local (teste)
Abra `index.html` diretamente em um servidor local:
```bash
npx serve .
# ou
python -m http.server 8080
```
> Não abra o arquivo diretamente como `file://` — use um servidor HTTP.

---

## Estrutura de arquivos

```
inventáriosistemasembarcados/
├── index.html          # Login
├── inventario.html     # Formulário de campo
├── admin.html          # Painel administrativo
├── firestore.rules     # Regras de segurança Firestore
├── storage.rules       # Regras de segurança Storage
├── css/
│   ├── style.css       # Estilos principais
│   └── admin.css       # Estilos do painel admin
└── js/
    ├── firebase-config.js  # ← Configure aqui!
    ├── auth.js             # Autenticação
    ├── compress.js         # Compressão de imagens
    ├── app.js              # Lógica do formulário
    └── admin.js            # Lógica do painel admin
```

---

## Estrutura dos dados no Firestore

```
inventarios/
  {docId}/
    matricula:     "12345"
    frota:         "F-001"
    equipamentos:  { bordo: true, radio: true, piloto: false, ... }
    modelos:       { piloto: "Trimble FMX", receptor: "StarFire 6000", ... }
    numerosSerie:  { monitor: "...", receptor: "...", nave: "...", ... }
    idRadio:       "..."
    chips:         { bordo: "...", automacao: "...", ... }
    automacoes:    ["OMD G4 Plantadeira", ...]
    status:        "instalados" | "retirados"
    observacao:    "..."
    fotosURL:      { bordo: "https://...", radio: "https://...", ... }
    dataRegistro:  Timestamp
    uid:           "UID do usuário"
    email:         "usuario@email.com"
```

## Estrutura no Storage

```
inventario/
  {frota}/
    {YYYY-MM-DD}/
      bordo.jpg
      radio.jpg
      monitor.jpg
      receptor.jpg
      serie.jpg
```

---

## Fluxo de uso em campo

1. Técnico acessa a URL no celular → tela de **Login**
2. Preenche o formulário em seções expansíveis
3. Tira as fotos diretamente pela câmera do celular
4. Clica em **"Enviar Inventário"**
5. Dados são salvos no Firestore e fotos no Storage

## Fluxo do admin

1. Admin acessa a URL → Login → redirecionado para **`admin.html`**
2. Visualiza estatísticas (total, instalados, retirados)
3. Busca por frota, matrícula ou número de série
4. Clica em **"Ver detalhes"** para ver todas as informações e fotos
5. Clica em **"Baixar imagens"** para baixar um ZIP com todas as fotos da frota

---

## Suporte

Em caso de dúvidas sobre Firebase:
- Documentação: https://firebase.google.com/docs
- Console: https://console.firebase.google.com
