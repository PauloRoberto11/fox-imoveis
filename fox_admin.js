/* ══════════════════════════════════════════
   FOX IMÓVEIS — fox_admin.js v3
   Supabase + Cloudinary + login real
══════════════════════════════════════════ */

let editId           = null;
let pendImgs         = [];
let editCorretorId   = null;
let pendCorretorFoto = null;
let adminLogado      = null;

/* ══════════════════════════════════════════
   TIMEOUT DE SESSÃO
   Desloga automaticamente após inatividade
══════════════════════════════════════════ */
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos
const SESSION_WARNING_MS = 14 * 60 * 1000; // aviso 1 min antes
let   _sessionTimer      = null;
let   _warningTimer      = null;
let   _warningToast      = null;

/* Reinicia o contador toda vez que o usuário faz algo */
function resetSessionTimer() {
  if (!adminLogado) return;
  clearTimeout(_sessionTimer);
  clearTimeout(_warningTimer);

  /* esconde aviso se ainda estiver visível */
  if (_warningToast) {
    _warningToast.style.display = 'none';
    _warningToast = null;
  }

  /* aviso 1 minuto antes */
  _warningTimer = setTimeout(() => {
    _warningToast = _showSessionWarning();
  }, SESSION_WARNING_MS);

  /* logout automático */
  _sessionTimer = setTimeout(() => {
    _forceLogout();
  }, SESSION_TIMEOUT_MS);
}

/* Mostra aviso flutuante de sessão prestes a expirar */
function _showSessionWarning() {
  let el = document.getElementById('session-warning');
  if (!el) {
    el = document.createElement('div');
    el.id = 'session-warning';
    el.style.cssText = `
      position:fixed; bottom:140px; left:50%; transform:translateX(-50%);
      background:#1C1A17; color:#F0E8D0;
      padding:14px 22px; border-radius:12px;
      font-size:0.83rem; font-weight:600; z-index:99999;
      box-shadow:0 8px 32px rgba(0,0,0,0.35);
      border:1px solid rgba(201,168,76,0.35);
      display:flex; align-items:center; gap:12px;
      white-space:nowrap; animation:toastIn 0.3s ease;
    `;
    document.body.appendChild(el);
  }
  el.innerHTML = `
    ⏱ Sessão expira em <strong style="color:#F0C95A">1 minuto</strong> por inatividade.
    <button onclick="resetSessionTimer()" style="
      background:#B8862A; color:#fff; border:none;
      padding:5px 14px; border-radius:6px; font-size:0.78rem;
      font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif;
      margin-left:4px;
    ">Continuar</button>
  `;
  el.style.display = 'flex';
  return el;
}

/* Desloga e exibe mensagem */
function _forceLogout() {
  adminLogado = null;
  clearTimeout(_sessionTimer);
  clearTimeout(_warningTimer);

  /* esconde warning */
  const w = document.getElementById('session-warning');
  if (w) w.style.display = 'none';

  /* volta para tela de login */
  const mainView  = document.getElementById('admin-main-view');
  const loginView = document.getElementById('admin-login-view');
  if (mainView)  { mainView.style.display  = 'none'; }
  if (loginView) { loginView.style.display = 'block'; }

  /* limpa campos */
  const u = document.getElementById('login-user');
  const p = document.getElementById('login-pass');
  if (u) u.value = '';
  if (p) p.value = '';

  /* fecha painel se estiver fechado — abre com mensagem */
  const panel = document.getElementById('admin-panel');
  if (panel && panel.classList.contains('open')) {
    const errEl = document.getElementById('login-error');
    if (errEl) {
      errEl.textContent = '⏱ Sessão encerrada por inatividade. Faça login novamente.';
      errEl.style.display = 'block';
      errEl.style.color = '#B8862A';
    }
  }

  showToast('🔒 Sessão encerrada por inatividade.');
}

/* Eventos que reiniciam o timer (mouse, teclado, toque, scroll) */
function _startActivityListeners() {
  const events = ['mousemove','mousedown','keydown','touchstart','scroll','click'];
  events.forEach(ev => document.addEventListener(ev, resetSessionTimer, { passive:true }));
}

/* ── ABRIR / FECHAR PAINEL ── */
function openAdminLogin(e) {
  e && e.preventDefault();
  document.getElementById('admin-panel').classList.add('open');
}
function closeAdmin() {
  document.getElementById('admin-panel').classList.remove('open');
}

/* ══════════════════════════════════════════
   LOGIN — verifica na tabela admins
══════════════════════════════════════════ */
async function doLogin() {
  const email = document.getElementById('login-user').value.trim().toLowerCase();
  const senha = document.getElementById('login-pass').value.trim();
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  errEl.style.color   = '#C0392B';

  if (!email || !senha) { errEl.textContent = 'Preencha e-mail e senha.'; errEl.style.display = 'block'; return; }

  try {
    const btnLogin = document.querySelector('#admin-login-view .btn-form');
    if (btnLogin) { btnLogin.textContent = 'Verificando...'; btnLogin.disabled = true; }

    const r = await fetch(
      `${SB_URL}/rest/v1/admins?email=eq.${encodeURIComponent(email)}&select=*`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    const list = await r.json();

    if (btnLogin) { btnLogin.textContent = 'Entrar no Painel'; btnLogin.disabled = false; }

    if (!list || !list.length || list[0].senha !== senha) {
      errEl.textContent = 'E-mail ou senha incorretos.';
      errEl.style.display = 'block';
      return;
    }

    adminLogado = list[0];
    document.getElementById('admin-login-view').style.display = 'none';
    const mv = document.getElementById('admin-main-view');
    mv.style.display = 'flex';
    renderAdminImoveis();

    /* ── inicia timeout de sessão após login ── */
    _startActivityListeners();
    resetSessionTimer();

  } catch(e) {
    errEl.textContent = 'Erro de conexão. Tente novamente.';
    errEl.style.display = 'block';
    const btnLogin = document.querySelector('#admin-login-view .btn-form');
    if (btnLogin) { btnLogin.textContent = 'Entrar no Painel'; btnLogin.disabled = false; }
  }
}

/* ── TABS ── */
function switchAdminTab(tab, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'imoveis')     renderAdminImoveis();
  else if (tab === 'corretores') renderAdminCorretores();
}

/* ══════════════════════════════════════════
   RENDER IMÓVEIS ADMIN
══════════════════════════════════════════ */
async function renderAdminImoveis() {
  const b = document.getElementById('admin-body-content');
  b.innerHTML = '<p style="color:var(--text-muted);font-size:0.84rem;padding:16px 0;">Carregando...</p>';
  try {
    const data = await sb.from('imoveis').select('*');
    let h = `<div class="admin-sec-title">
      Anúncios (${data ? data.length : 0})
      <button class="btn-add" onclick="openModalNew()">+ Novo Imóvel</button>
    </div>`;
    if (!data || !data.length) {
      h += '<p style="color:var(--text-muted);font-size:0.84rem;">Nenhum imóvel cadastrado. Clique em + Novo Imóvel para começar!</p>';
    } else {
      data.forEach(p => {
        const firstImg = p.imgs ? p.imgs.split(',')[0].trim() : '';
        const th = firstImg
          ? `<img src="${firstImg}" style="width:68px;height:54px;object-fit:cover;border-radius:8px;">`
          : `<div style="width:68px;height:54px;border-radius:8px;background:var(--bg-2);display:flex;align-items:center;justify-content:center;font-size:1.6rem;">${p.emoji||'🏠'}</div>`;
        h += `<div class="admin-item">
          <div class="admin-item-img">${th}</div>
          <div class="admin-item-info">
            <div class="admin-item-title">${p.titulo}</div>
            <div class="admin-item-meta">${p.tipo} · ${labelTxt[p.modal]||p.modal} · ${p.local}</div>
            <div class="admin-item-price">${p.preco}</div>
            <div class="admin-item-btns">
              <button class="btn-edit" onclick="openModalEdit(${p.id})">✏ Editar</button>
              <button class="btn-del"  onclick="deleteImovel(${p.id})">🗑 Remover</button>
            </div>
          </div>
        </div>`;
      });
    }
    b.innerHTML = h;
  } catch(e) {
    b.innerHTML = '<p style="color:red;font-size:0.84rem;">Erro ao carregar. Verifique a conexão.</p>';
  }
}

/* ══════════════════════════════════════════
   RENDER CORRETORES ADMIN
══════════════════════════════════════════ */
async function renderAdminCorretores() {
  const b = document.getElementById('admin-body-content');
  b.innerHTML = '<p style="color:var(--text-muted);font-size:0.84rem;padding:16px 0;">Carregando...</p>';
  try {
    const list = await sb.from('corretores').select('*');
    let h = `<div class="admin-sec-title">Corretores Ativos (${list ? list.length : 0})
      <button class="btn-add" onclick="openCorretorModalNew()">+ Novo Corretor</button>
    </div>`;
    if (!list || !list.length) {
      h += '<p style="color:var(--text-muted);font-size:0.84rem;">Nenhum corretor cadastrado.</p>';
    } else {
      list.forEach(c => {
        const avatarStyle = c.card === '1'
          ? 'background:linear-gradient(135deg,#B8862A,#8B6420);'
          : 'background:linear-gradient(135deg,#C45C2A,#8B3A0A);';
        const avatarInner = c.foto
          ? `<img src="${c.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
          : (c.sigla || '?');
        h += `<div class="corretor-item">
          <div class="corretor-av" style="${avatarStyle}overflow:hidden;">${avatarInner}</div>
          <div style="flex:1;">
            <div class="corretor-name">${c.nome}</div>
            <div class="corretor-meta">${c.creci} · ${c.tel}</div>
          </div>
          <button class="btn-edit" onclick="openCorretorModal(${c.id})">✏ Editar</button>
        </div>`;
      });
    }
    h += '<p style="font-size:0.72rem;color:var(--text-muted);margin-top:14px;">Edite dados e foto de cada corretor. As alterações aparecem nos cartões do site em tempo real.</p>';
    b.innerHTML = h;
  } catch(e) {
    b.innerHTML = '<p style="color:red;font-size:0.84rem;">Erro ao carregar corretores.</p>';
  }
}

/* ══════════════════════════════════════════
   MODAL EDITAR CORRETOR
══════════════════════════════════════════ */
async function openCorretorModal(id) {
  const list = await sb.from('corretores').select('*');
  const c = list.find(x => x.id === id);
  if (!c) return;
  editCorretorId   = id;
  pendCorretorFoto = null;

  document.getElementById('cf-nome').value   = c.nome   || '';
  document.getElementById('cf-role').value   = c.role   || '';
  document.getElementById('cf-creci').value  = c.creci  || '';
  document.getElementById('cf-tel').value    = c.tel    || '';
  document.getElementById('cf-email').value  = c.email  || '';
  document.getElementById('cf-cidade').value = c.cidade || '';
  document.getElementById('cf-wa').value     = c.wa     || '';
  document.getElementById('cf-ig').value     = c.ig     || '';
  document.getElementById('cf-badges').value = c.badges || '';
  document.getElementById('cf-senha').value  = '';

  /* preview avatar */
  const prev = document.getElementById('cf-foto-preview');
  const avatarStyle = c.card === '1'
    ? 'background:linear-gradient(135deg,#B8862A,#8B6420);'
    : 'background:linear-gradient(135deg,#C45C2A,#8B3A0A);';
  if (c.foto) {
    prev.innerHTML  = `<img src="${c.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    prev.style.cssText = 'width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;';
  } else {
    prev.innerHTML  = c.sigla || '?';
    prev.style.cssText = `width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:#fff;${avatarStyle}`;
  }
  document.getElementById('corretor-modal').classList.add('open');
}

function openCorretorModalNew() {
  editCorretorId = null; pendCorretorFoto = null;
  ['cf-nome','cf-role','cf-creci','cf-tel','cf-email','cf-cidade','cf-wa','cf-ig','cf-badges','cf-senha']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  const prev = document.getElementById('cf-foto-preview');
  prev.innerHTML = '?';
  prev.style.cssText = 'width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#B8862A,#8B6420);font-family:Playfair Display,serif;font-size:1.5rem;font-weight:700;color:#fff;';
  document.getElementById('corretor-modal').classList.add('open');
}

function closeCorretorModal() {
  document.getElementById('corretor-modal').classList.remove('open');
  editCorretorId = null; pendCorretorFoto = null;
}

function handleCorretorFoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  pendCorretorFoto = file;
  const reader = new FileReader();
  reader.onload = ev => {
    const prev = document.getElementById('cf-foto-preview');
    prev.innerHTML  = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    prev.style.cssText = 'width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;';
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removeCorretorFoto() {
  pendCorretorFoto = '__remove__';
  const prev = document.getElementById('cf-foto-preview');
  prev.innerHTML  = '?';
  prev.style.cssText = 'width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#B8862A,#8B6420);font-family:Playfair Display,serif;font-size:1.5rem;font-weight:700;color:#fff;';
}

async function saveCorretor() {
  const nome = document.getElementById('cf-nome').value.trim();
  if (!nome) { showToast('⚠️ Informe o nome do corretor'); return; }

  const btnSave = document.querySelector('#corretor-modal .btn-save');
  if (btnSave) { btnSave.textContent = 'Salvando...'; btnSave.disabled = true; }

  try {
    /* upload foto se houver */
    let fotoUrl = '';
    if (pendCorretorFoto && pendCorretorFoto !== '__remove__' && pendCorretorFoto instanceof File) {
      showToast('📤 Enviando foto...');
      fotoUrl = await uploadToCloudinary(pendCorretorFoto);
    }

    const payload = {
      nome,
      role:   document.getElementById('cf-role').value.trim(),
      creci:  document.getElementById('cf-creci').value.trim(),
      tel:    document.getElementById('cf-tel').value.trim(),
      email:  document.getElementById('cf-email').value.trim(),
      cidade: document.getElementById('cf-cidade').value.trim(),
      wa:     document.getElementById('cf-wa').value.trim(),
      ig:     document.getElementById('cf-ig').value.trim(),
      badges: document.getElementById('cf-badges').value.trim(),
    };
    if (fotoUrl)                            payload.foto = fotoUrl;
    if (pendCorretorFoto === '__remove__')   payload.foto = '';

    /* atualizar senha na tabela admins se preenchida */
    const novaSenha = document.getElementById('cf-senha').value.trim();
    if (novaSenha) {
      const emailCorretor = document.getElementById('cf-email').value.trim();
      /* verifica se já existe registro na tabela admins */
      const admList = await fetch(
        `${SB_URL}/rest/v1/admins?email=eq.${encodeURIComponent(emailCorretor)}&select=id`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      ).then(r => r.json());

      if (admList && admList.length) {
        /* atualiza senha existente */
        await fetch(`${SB_URL}/rest/v1/admins?email=eq.${encodeURIComponent(emailCorretor)}`, {
          method: 'PATCH',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type':'application/json' },
          body: JSON.stringify({ senha: novaSenha })
        });
      } else {
        /* cria novo registro na tabela admins */
        await fetch(`${SB_URL}/rest/v1/admins`, {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type':'application/json', Prefer:'return=representation' },
          body: JSON.stringify({ email: emailCorretor, nome, senha: novaSenha, corretor_id: editCorretorId || null })
        });
      }
    }

    if (editCorretorId) {
      await sb.from('corretores').update(payload, { id: editCorretorId });
    } else {
      /* novo corretor — define card automaticamente */
      const existentes = await sb.from('corretores').select('card');
      const cards = (existentes || []).map(c => c.card);
      payload.card = cards.includes('1') ? '2' : '1';
      payload.sigla = nome.split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2);
      await sb.from('corretores').insert(payload);
    }

    closeCorretorModal();
    await loadAndApplyCorretores();
    renderAdminCorretores();
    showToast('✅ Corretor salvo com sucesso!');
  } catch(err) {
    showToast('❌ Erro ao salvar. Tente novamente.');
    console.error(err);
  } finally {
    if (btnSave) { btnSave.textContent = '💾 Salvar Perfil'; btnSave.disabled = false; }
  }
}

/* ══════════════════════════════════════════
   CRUD IMÓVEIS
══════════════════════════════════════════ */
function openModalNew() {
  editId = null; pendImgs = [];
  document.getElementById('modal-title').textContent = 'Novo Anúncio';
  ['titulo','preco','area','quartos','suites','vagas','banheiros','local','desc']
    .forEach(f => { const el = document.getElementById('f-'+f); if(el) el.value=''; });
  document.getElementById('f-tipo').value  = 'Casa';
  document.getElementById('f-modal').value = 'venda';
  document.getElementById('img-previews').innerHTML = '';
  document.getElementById('imovel-modal').classList.add('open');
}

async function openModalEdit(id) {
  const data = await sb.from('imoveis').select('*');
  const p = data.find(x => x.id === id);
  if (!p) return;
  editId = id;
  /* converte urls salvas em objetos para o preview */
  pendImgs = p.imgs ? p.imgs.split(',').map(u => ({ url: u.trim(), file: null })).filter(x => x.url) : [];
  document.getElementById('modal-title').textContent = 'Editar Anúncio';
  ['titulo','preco','area','quartos','suites','vagas','banheiros','local','desc']
    .forEach(f => { const el = document.getElementById('f-'+f); if(el) el.value = p[f]||''; });
  document.getElementById('f-tipo').value  = p.tipo  || 'Casa';
  document.getElementById('f-modal').value = p.modal || 'venda';
  renderImgPrev();
  document.getElementById('imovel-modal').classList.add('open');
}

function closeModal() { document.getElementById('imovel-modal').classList.remove('open'); }

function handleImgUpload(e) {
  Array.from(e.target.files).forEach(file => {
    pendImgs.push({ file, url: URL.createObjectURL(file) });
    renderImgPrev();
  });
  e.target.value = '';
}

function renderImgPrev() {
  const g = document.getElementById('img-previews');
  g.innerHTML = '';
  pendImgs.forEach((img, i) => {
    const w = document.createElement('div'); w.className = 'img-tw';
    w.innerHTML = `<img src="${img.url}" alt="foto ${i+1}" style="width:70px;height:56px;object-fit:cover;border-radius:7px;border:1px solid var(--border);">
      <button class="img-tw-del" onclick="removeImg(${i})">✕</button>`;
    g.appendChild(w);
  });
}

function removeImg(i) { pendImgs.splice(i, 1); renderImgPrev(); }

async function saveImovel() {
  const titulo = document.getElementById('f-titulo').value.trim();
  if (!titulo) { showToast('⚠️ Informe o título do imóvel'); return; }

  const btnSave = document.querySelector('#imovel-modal .btn-save');
  if (btnSave) { btnSave.textContent = 'Salvando...'; btnSave.disabled = true; }

  try {
    /* upload das novas fotos para Cloudinary */
    const urls = [];
    for (const img of pendImgs) {
      if (img.file) {
        showToast(`📤 Enviando foto ${urls.length + 1}/${pendImgs.length}...`);
        const url = await uploadToCloudinary(img.file);
        urls.push(url);
      } else if (img.url && img.url.startsWith('http')) {
        urls.push(img.url); /* foto já existente no Cloudinary */
      }
    }

    const obj = {
      titulo,
      tipo:      document.getElementById('f-tipo').value,
      modal:     document.getElementById('f-modal').value,
      preco:     document.getElementById('f-preco').value,
      area:      document.getElementById('f-area').value,
      quartos:   document.getElementById('f-quartos').value,
      suites:    document.getElementById('f-suites').value,
      vagas:     document.getElementById('f-vagas').value,
      banheiros: document.getElementById('f-banheiros').value,
      local:     document.getElementById('f-local').value,
      descricao: document.getElementById('f-desc').value,
      imgs:      urls.join(','),
      emoji: '🏠', grad: 'ig1',
    };

    if (editId) {
      await sb.from('imoveis').update(obj, { id: editId });
    } else {
      await sb.from('imoveis').insert(obj);
    }

    closeModal();
    await renderListings();
    renderAdminImoveis();
    showToast(editId ? '✅ Anúncio atualizado!' : '✅ Anúncio publicado no site!');
  } catch(err) {
    showToast('❌ Erro ao salvar. Tente novamente.');
    console.error(err);
  } finally {
    if (btnSave) { btnSave.textContent = '💾 Salvar Anúncio'; btnSave.disabled = false; }
  }
}

async function deleteImovel(id) {
  if (!confirm('Remover este imóvel do site?')) return;
  await sb.from('imoveis').delete({ id });
  await renderListings();
  renderAdminImoveis();
  showToast('🗑 Imóvel removido.');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  /* nada extra — applyCorretorCards é chamado pelo fox_main.js */
});
