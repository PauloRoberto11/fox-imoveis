/* ══════════════════════════════════════════
   FOX IMÓVEIS — Painel Administrativo v2
   Foto de perfil + edição dados corretor
══════════════════════════════════════════ */

let editId   = null;
let pendImgs = [];

/* ── Dados corretores (localStorage) ── */
const CK = 'fox_corretores_v2';

const defaultCorretores = [
  {
    id: 1, sigla: 'RC', card: '1',
    nome: 'Ricardo Carvalho', role: 'Corretor de Imóveis',
    creci: 'CRECI-RN 7659',
    tel: '(84) 9 8728-9132', email: 'ricardocarvalho@foximoveis.com.br',
    cidade: 'Natal – RN', wa: '5584987289132', ig: '',
    foto: '',
    badges: ['Residencial','Comercial','Litoral','Lançamentos','MCMV','Financiamento']
  },
  {
    id: 2, sigla: 'RA', card: '2',
    nome: 'Ricardo Alves', role: 'Corretor de Imóveis',
    creci: 'CRECI-RN 9028',
    tel: '(84) 9 8729-0501', email: 'ricardoalves@foximoveis.com.br',
    cidade: 'Natal – RN', wa: '5584987290501', ig: '',
    foto: '',
    badges: ['Residencial','Comercial','Litoral','Lançamentos','MCMV','Financiamento']
  }
];

function getCorretores() {
  try { const s = localStorage.getItem(CK); return s ? JSON.parse(s) : defaultCorretores; }
  catch { return defaultCorretores; }
}
function saveCorretores(arr) {
  try { localStorage.setItem(CK, JSON.stringify(arr)); } catch {}
}
if (!localStorage.getItem(CK)) saveCorretores(defaultCorretores);

/* ── Aplica dados dos corretores nos cards visíveis no site ── */
function applyCorretorCards() {
  const list = getCorretores();
  list.forEach(c => {
    const card = document.querySelector(`.biz-card-${c.card}`);
    if (!card) return;

    /* avatar: foto ou sigla */
    const av = card.querySelector('.biz-avatar');
    if (av) {
      if (c.foto) {
        av.innerHTML = `<img src="${c.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${c.nome}">`;
        av.style.padding = '0';
      } else {
        av.innerHTML = c.sigla;
        av.style.padding = '';
      }
    }
    const nm = card.querySelector('.biz-name');  if (nm) nm.textContent = c.nome;
    const rl = card.querySelector('.biz-role');  if (rl) rl.textContent = c.role;
    const cr = card.querySelector('.biz-creci'); if (cr) cr.textContent = c.creci;

    const rows = card.querySelectorAll('.biz-txt');
    if (rows[0]) rows[0].textContent = c.tel;
    if (rows[1]) rows[1].textContent = c.email;
    if (rows[2]) rows[2].textContent = `· ${c.cidade} ·`;

    const badgesWrap = card.querySelector('.biz-badges');
    if (badgesWrap && c.badges && c.badges.length) {
      badgesWrap.innerHTML = c.badges.map(b => `<span class="biz-badge">${b}</span>`).join('');
    }

    const waBtn = card.querySelector('.biz-btn-wa');
    if (waBtn) {
      waBtn.onclick = (e) => {
        e.preventDefault();
        window.open(`https://wa.me/${c.wa}?text=Olá ${c.nome}, vim pelo site da FOX Imóveis!`, '_blank');
      };
    }
    const igBtn = card.querySelector('.biz-btn-ig');
    if (igBtn && c.ig) {
      igBtn.href   = c.ig.startsWith('http') ? c.ig : `https://instagram.com/${c.ig}`;
      igBtn.target = '_blank';
    }
  });
}

/* ── ABRIR / FECHAR ── */
function openAdminLogin(e) { e && e.preventDefault(); document.getElementById('admin-panel').classList.add('open'); }
function closeAdmin()      { document.getElementById('admin-panel').classList.remove('open'); }

/* ── LOGIN ── */
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  if (u === 'admin' && p === 'fox2025') {
    document.getElementById('admin-login-view').style.display = 'none';
    const mv = document.getElementById('admin-main-view');
    mv.style.display = 'flex';
    renderAdminImoveis();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

function switchAdminTab(tab, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'imoveis')     renderAdminImoveis();
  else if (tab === 'corretores') renderAdminCorretores();
}

/* ── RENDER IMÓVEIS ── */
function renderAdminImoveis() {
  const b    = document.getElementById('admin-body-content');
  const data = getListings();
  let h = `<div class="admin-sec-title">
    Anúncios Cadastrados (${data.length})
    <button class="btn-add" onclick="openModalNew()">+ Novo Imóvel</button>
  </div>`;
  if (!data.length) h += '<p style="color:var(--text-muted);font-size:0.84rem;">Nenhum imóvel cadastrado.</p>';
  data.forEach(p => {
    const th = (p.imgs && p.imgs.length)
      ? `<img src="${p.imgs[0]}" style="width:68px;height:54px;object-fit:cover;border-radius:8px;">`
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
  b.innerHTML = h;
}

/* ── RENDER CORRETORES ADMIN ── */
function renderAdminCorretores() {
  const b    = document.getElementById('admin-body-content');
  const list = getCorretores();
  let h = `<div class="admin-sec-title">Corretores Ativos (${list.length})</div>`;
  list.forEach(c => {
    const avatarStyle = c.card === '1'
      ? 'background:linear-gradient(135deg,#B8862A,#8B6420);'
      : 'background:linear-gradient(135deg,#C45C2A,#8B3A0A);';
    const avatarInner = c.foto
      ? `<img src="${c.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${c.nome}">`
      : c.sigla;
    h += `
    <div class="corretor-item">
      <div class="corretor-av" style="${avatarStyle}overflow:hidden;">${avatarInner}</div>
      <div style="flex:1;">
        <div class="corretor-name">${c.nome}</div>
        <div class="corretor-meta">${c.creci} · ${c.tel}</div>
      </div>
      <button class="btn-edit" onclick="openCorretorModal(${c.id})">✏ Editar Perfil</button>
    </div>`;
  });
  h += `<p style="font-size:0.73rem;color:var(--text-muted);margin-top:16px;">
    Edite os dados e adicione a foto de cada corretor. As alterações refletem imediatamente nos cartões do site.
  </p>`;
  b.innerHTML = h;
}

/* ── MODAL EDITAR CORRETOR ── */
let editCorretorId   = null;
let pendCorretorFoto = null;

function openCorretorModal(id) {
  const c = getCorretores().find(x => x.id === id);
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
  document.getElementById('cf-badges').value = (c.badges || []).join(', ');

  /* preview do avatar atual */
  const prev = document.getElementById('cf-foto-preview');
  const avatarStyle = c.card === '1'
    ? 'background:linear-gradient(135deg,#B8862A,#8B6420);'
    : 'background:linear-gradient(135deg,#C45C2A,#8B3A0A);';

  if (c.foto) {
    prev.innerHTML  = `<img src="${c.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    prev.style.cssText = 'width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;';
  } else {
    prev.innerHTML  = c.sigla;
    prev.style.cssText = `width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:#fff;${avatarStyle}`;
  }

  document.getElementById('corretor-modal').classList.add('open');
}

function closeCorretorModal() {
  document.getElementById('corretor-modal').classList.remove('open');
  editCorretorId   = null;
  pendCorretorFoto = null;
}

function handleCorretorFoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    pendCorretorFoto = ev.target.result;
    const prev = document.getElementById('cf-foto-preview');
    prev.innerHTML  = `<img src="${pendCorretorFoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    prev.style.cssText = 'width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;';
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removeCorretorFoto() {
  pendCorretorFoto = '__remove__';
  const c = getCorretores().find(x => x.id === editCorretorId);
  if (!c) return;
  const avatarStyle = c.card === '1'
    ? 'background:linear-gradient(135deg,#B8862A,#8B6420);'
    : 'background:linear-gradient(135deg,#C45C2A,#8B3A0A);';
  const prev = document.getElementById('cf-foto-preview');
  prev.innerHTML  = c.sigla;
  prev.style.cssText = `width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:#fff;${avatarStyle}`;
}

function saveCorretor() {
  if (!editCorretorId) return;
  const list = getCorretores();
  const idx  = list.findIndex(x => x.id === editCorretorId);
  if (idx === -1) return;

  const badges = document.getElementById('cf-badges').value
    .split(',').map(b => b.trim()).filter(Boolean);

  list[idx] = {
    ...list[idx],
    nome:   document.getElementById('cf-nome').value.trim(),
    role:   document.getElementById('cf-role').value.trim(),
    creci:  document.getElementById('cf-creci').value.trim(),
    tel:    document.getElementById('cf-tel').value.trim(),
    email:  document.getElementById('cf-email').value.trim(),
    cidade: document.getElementById('cf-cidade').value.trim(),
    wa:     document.getElementById('cf-wa').value.trim(),
    ig:     document.getElementById('cf-ig').value.trim(),
    badges,
    foto: pendCorretorFoto === '__remove__' ? ''
        : pendCorretorFoto  ? pendCorretorFoto
        : list[idx].foto,
  };

  saveCorretores(list);
  applyCorretorCards();
  closeCorretorModal();
  renderAdminCorretores();
  showToast('✅ Perfil do corretor atualizado!');
}

/* ── CRUD IMÓVEIS ── */
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
function openModalEdit(id) {
  const p = getListings().find(x => x.id === id);
  if (!p) return;
  editId = id;
  pendImgs = (p.imgs || []).map(u => ({ dataUrl: u }));
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
    const r = new FileReader();
    r.onload = ev => { pendImgs.push({ dataUrl: ev.target.result }); renderImgPrev(); };
    r.readAsDataURL(file);
  });
  e.target.value = '';
}
function renderImgPrev() {
  const g = document.getElementById('img-previews');
  g.innerHTML = '';
  pendImgs.forEach((img, i) => {
    const w = document.createElement('div'); w.className = 'img-tw';
    w.innerHTML = `<img src="${img.dataUrl}" alt="foto ${i+1}">
      <button class="img-tw-del" onclick="removeImg(${i})">✕</button>`;
    g.appendChild(w);
  });
}
function removeImg(i) { pendImgs.splice(i, 1); renderImgPrev(); }
function saveImovel() {
  const titulo = document.getElementById('f-titulo').value.trim();
  if (!titulo) { showToast('⚠️ Informe o título do imóvel'); return; }
  const data = getListings();
  const obj = {
    id: editId || Date.now(), titulo,
    tipo:      document.getElementById('f-tipo').value,
    modal:     document.getElementById('f-modal').value,
    preco:     document.getElementById('f-preco').value,
    area:      document.getElementById('f-area').value,
    quartos:   document.getElementById('f-quartos').value,
    suites:    document.getElementById('f-suites').value,
    vagas:     document.getElementById('f-vagas').value,
    banheiros: document.getElementById('f-banheiros').value,
    local:     document.getElementById('f-local').value,
    desc:      document.getElementById('f-desc').value,
    imgs:      pendImgs.map(i => i.dataUrl),
    emoji: '🏠', grad: 'ig1',
  };
  if (editId) { const i = data.findIndex(x => x.id === editId); if(i>-1) data[i]=obj; }
  else data.push(obj);
  saveListings(data);
  closeModal();
  renderListings();
  renderAdminImoveis();
  showToast(editId ? '✅ Anúncio atualizado!' : '✅ Anúncio publicado!');
}
function deleteImovel(id) {
  if (!confirm('Remover este imóvel do site?')) return;
  saveListings(getListings().filter(x => x.id !== id));
  renderListings();
  renderAdminImoveis();
  showToast('🗑 Imóvel removido.');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', applyCorretorCards);
