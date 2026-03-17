/* ══════════════════════════════════════════
   FOX IMÓVEIS — fox_main.js v3
   Supabase + Cloudinary integrado
══════════════════════════════════════════ */

/* ── CONFIGURAÇÃO ── */
const SB_URL    = 'https://jhknkeewysbbnvreckcb.supabase.co';
const SB_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impoa25rZWV3eXNiYm52cmVja2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTM1NjEsImV4cCI6MjA4OTI2OTU2MX0.1Ht37h-xlWv-ZRcqvwwnzSoAQ862BYSh5KwIpQB9Usc';
const CLD_NAME  = 'dtyrgv4ut';
const CLD_PRESET = 'fox_unsigned';

/* ── CLIENTE SUPABASE (via fetch REST) ── */
const sb = {
  from: (table) => ({
    select: async (cols = '*') => {
      const r = await fetch(`${SB_URL}/rest/v1/${table}?select=${cols}&order=id.asc`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
      });
      return r.json();
    },
    insert: async (data) => {
      const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=representation'
        },
        body: JSON.stringify(data)
      });
      return r.json();
    },
    update: async (data, match) => {
      const params = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join('&');
      const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
        method: 'PATCH',
        headers: {
          apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=representation'
        },
        body: JSON.stringify(data)
      });
      return r.json();
    },
    delete: async (match) => {
      const params = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join('&');
      const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
        method: 'DELETE',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
      });
      return r.ok;
    }
  })
};

/* ── UPLOAD CLOUDINARY ── */
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLD_PRESET);
  fd.append('folder', 'fox-imoveis');
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLD_NAME}/image/upload`, {
    method: 'POST', body: fd
  });
  const data = await r.json();
  return data.secure_url;
}

/* ── LABELS ── */
const labelMap = { venda:'label-sale', aluguel:'label-rent', lancamento:'label-new' };
const labelTxt = { venda:'Venda', aluguel:'Aluguel', lancamento:'Lançamento' };

/* ── RENDER CARDS DO SITE ── */
async function renderListings(filtros = {}) {
  const grid = document.getElementById('listings-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);font-size:0.9rem;">Carregando imóveis...</div>';
  try {
    let data = await sb.from('imoveis').select('*');
    if (!data) data = [];

    /* ── aplicar filtros localmente ── */
    const { local, tipo, preco, quartos, modal, lancamentos } = filtros;

    if (modal)      data = data.filter(p => p.modal === modal);
    /* lançamentos: mostra TUDO (compra + aluguel) ordenado do mais recente */
    if (lancamentos) data = data.sort((a, b) => (b.id || 0) - (a.id || 0));
    if (tipo)    data = data.filter(p => p.tipo?.toLowerCase() === tipo.toLowerCase());
    if (local)   data = data.filter(p =>
      p.local?.toLowerCase().includes(local) ||
      p.titulo?.toLowerCase().includes(local)
    );
    if (quartos) {
      data = data.filter(p => {
        const q = parseInt(p.quartos) || 0;
        if (quartos === '4') return q >= 4;
        return q === parseInt(quartos);
      });
    }
    if (preco) {
      data = data.filter(p => {
        /* extrai número do preço — remove R$, pontos, /mês etc */
        const num = parseFloat(
          (p.preco || '').replace(/[^\d,]/g,'').replace(',','.') || '0'
        );
        const emMil = num > 10000 ? num / 1000 : num; /* normaliza para milhares */
        if (preco === '0-200')    return emMil <= 200;
        if (preco === '200-500')  return emMil > 200  && emMil <= 500;
        if (preco === '500-1000') return emMil > 500  && emMil <= 1000;
        if (preco === '1000+')    return emMil > 1000;
        return true;
      });
    }

    /* ── atualizar título da seção ── */
    const titulo = document.querySelector('.section-title');
    const btnVerTodos = document.querySelector('.view-all');
    if (titulo) {
      const temFiltro = local || tipo || preco || quartos || modal || lancamentos;
      titulo.innerHTML = lancamentos
        ? `✨ Lançamentos <span>(${data.length} imóvel${data.length !== 1 ? 'is' : ''})</span>`
        : temFiltro
          ? `Resultados <span>(${data.length} encontrado${data.length !== 1 ? 's' : ''})</span>`
          : 'Imóveis em <span>Destaque</span>';
    }
    if (btnVerTodos) {
      btnVerTodos.style.display = (local || tipo || preco || quartos || modal) ? 'none' : '';
    }

    if (data.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 20px;">
        <div style="font-size:2.5rem;margin-bottom:12px;">🔍</div>
        <div style="font-weight:600;font-size:1rem;color:var(--text);margin-bottom:8px;">Nenhum imóvel encontrado</div>
        <div style="font-size:0.88rem;color:var(--text-muted);margin-bottom:20px)">Tente outros filtros ou fale com nossa equipe.</div>
        <button onclick="limparFiltros()" style="background:var(--gold);color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.88rem;">Ver todos os imóveis</button>
      </div>`;
      return;
    }

    grid.innerHTML = '';
    data.forEach(p => {
      const imgsArr = p.imgs ? p.imgs.split(',').map(s => s.trim()).filter(Boolean) : [];
      const imgH = imgsArr.length
        ? `<img class="prop-img" src="${imgsArr[0]}" alt="${p.titulo}">`
        : `<div class="card-img-bg ${p.grad||'ig1'}">${p.emoji||'🏠'}</div>`;
      const feats = [];
      if (p.quartos)  feats.push(`<div class="feature">🛏 <strong>${p.quartos}</strong>&nbsp;qtos</div>`);
      if (p.suites)   feats.push(`<div class="feature">🚿 <strong>${p.suites}</strong>&nbsp;suítes</div>`);
      if (p.vagas)    feats.push(`<div class="feature">🚗 <strong>${p.vagas}</strong>&nbsp;vagas</div>`);
      if (p.area)     feats.push(`<div class="feature">📐 <strong>${p.area}</strong>&nbsp;m²</div>`);
      const pSub = p.modal === 'aluguel' ? '<span class="card-price-sub">/mês</span>' : '';
      grid.innerHTML += `
        <div class="listing-card reveal">
          <div class="card-img">
            ${imgH}
            <span class="card-label ${labelMap[p.modal]||'label-sale'}">${labelTxt[p.modal]||p.modal}</span>
            <div class="card-fav" onclick="toggleFav(this)">🤍</div>
          </div>
          <div class="card-body">
            <div class="card-price">${p.preco}${pSub}</div>
            <div class="card-title-prop">${p.titulo}</div>
            <div class="card-location">📍 ${p.local}</div>
            <div class="card-features">${feats.join('')}</div>
          </div>
        </div>`;
    });
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
  } catch(e) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Erro ao carregar imóveis. Verifique a conexão.</div>';
  }
}

/* ── CARREGAR CORRETORES DO SUPABASE E APLICAR NOS CARDS ── */
async function loadAndApplyCorretores() {
  try {
    const list = await sb.from('corretores').select('*');
    if (!list || !list.length) return;
    window._corretoresCache = list;
    list.forEach(c => {
      const card = document.querySelector(`.biz-card-${c.card}`);
      if (!card) return;
      const av = card.querySelector('.biz-avatar');
      if (av) {
        if (c.foto) {
          av.innerHTML = `<img src="${c.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${c.nome}">`;
          av.style.padding = '0';
        } else {
          av.innerHTML = c.sigla || '';
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
      if (badgesWrap && c.badges) {
        const bArr = c.badges.split(',').map(b => b.trim()).filter(Boolean);
        badgesWrap.innerHTML = bArr.map(b => `<span class="biz-badge">${b}</span>`).join('');
      }
      const waBtn = card.querySelector('.biz-btn-wa');
      if (waBtn && c.wa) {
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
  } catch(e) {
    console.warn('Erro ao carregar corretores:', e);
  }
}

/* ── SCROLL REVEAL ── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });

/* ── UTILS ── */
function setTab(el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}
function toggleFav(el) { el.textContent = el.textContent === '🤍' ? '❤️' : '🤍'; }
function shareCard() {
  if (navigator.share) navigator.share({ title:'FOX Imóveis', url:window.location.href });
  else { navigator.clipboard.writeText(window.location.href); showToast('🔗 Link copiado!'); }
}
/* ── FILTRO DE BUSCA ── */
function triggerSearch() {
  const local   = (document.getElementById('f-search-local')?.value   || '').trim().toLowerCase();
  const tipo    = (document.getElementById('f-search-tipo')?.value    || '');
  const preco   = (document.getElementById('f-search-preco')?.value   || '');
  const quartos = (document.getElementById('f-search-quartos')?.value || '');

  /* lê a aba ativa para filtrar por modalidade */
  const tabAtiva = document.querySelector('.tab.active')?.textContent || '';
  let modal = '';
  let lancamentos = false;
  if (tabAtiva.includes('Comprar'))     modal = 'venda';
  else if (tabAtiva.includes('Alugar')) modal = 'aluguel';
  else if (tabAtiva.includes('Lança')) { lancamentos = true; modal = ''; }

  renderListings({ local, tipo, preco, quartos, modal, lancamentos });

  /* rola suavemente para os resultados */
  document.getElementById('listings')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ── LIMPAR FILTROS ── */
function limparFiltros() {
  const el = document.getElementById('f-search-local');   if (el) el.value = '';
  const et = document.getElementById('f-search-tipo');    if (et) et.value = '';
  const ep = document.getElementById('f-search-preco');   if (ep) ep.value = '';
  const eq = document.getElementById('f-search-quartos'); if (eq) eq.value = '';
  /* volta para aba Comprar */
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab')?.classList.add('active');
  renderListings();
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════════
   WHATSAPP AGENT
══════════════════════════════════════════ */
function getCorretoresWA() {
  if (window._corretoresCache && window._corretoresCache.length)
    return window._corretoresCache.map(c => ({ nome: c.nome, wa: c.wa }));
  return [
    { nome: 'Ricardo Carvalho', wa: '5584987289132' },
    { nome: 'Ricardo Alves',    wa: '5584987290501' },
  ];
}

let waCtx = { modalidade: 'compra' };

const flows = {
  inicio: {
    bot: ['Ótimo! Que tipo de imóvel você procura?'],
    opts: ['🏠 Casa', '🏢 Apartamento', '🌿 Chácara/Sítio', '🏗 Terreno', '🏬 Comercial'],
    next: 'tipo'
  },
  tipo: {
    bot: ['Qual cidade ou bairro você prefere?'],
    opts: ['Ponta Negra', 'Capim Macio', 'Petrópolis', 'Parnamirim', 'Outro bairro'],
    next: 'local'
  },
  alugar: {
    bot: ['Para locação, qual tipo de imóvel?'],
    opts: ['🏠 Casa', '🏢 Apartamento', '🏬 Comercial', '🛋 Studio'],
    next: 'tipo_al'
  },
  tipo_al: {
    bot: ['Em qual bairro ou cidade?'],
    opts: ['Ponta Negra', 'Capim Macio', 'Neópolis', 'Parnamirim', 'Outro bairro'],
    next: 'local_al'
  },
  local_al: {
    bot: ['Quantos quartos você precisa?'],
    opts: ['1 quarto', '2 quartos', '3 quartos', '4+ quartos'],
    next: 'quartos_al'
  },
  quartos_al: {
    bot: ['Qual a faixa de aluguel mensal que você busca?'],
    opts: ['R$ 500 – R$ 1.499/mês','R$ 1.500 – R$ 3.000/mês','R$ 3.001 – R$ 4.999/mês','R$ 5.000 – R$ 10.000/mês','Acima de R$ 10.000/mês'],
    next: 'preco_al'
  },
  preco_al: {
    bot: ['Precisa de vaga de garagem?'],
    opts: ['Sim, 1 vaga', 'Sim, 2+ vagas', 'Não preciso'],
    next: 'garagem'
  },
  local: {
    bot: ['Quantos quartos você precisa?'],
    opts: ['1 quarto', '2 quartos', '3 quartos', '4+ quartos'],
    next: 'quartos'
  },
  quartos: {
    bot: ['Qual a faixa de preço que você pretende investir?'],
    opts: ['Até R$ 200 mil', 'R$ 200 mil – R$ 500 mil', 'R$ 500 mil – R$ 1 milhão', 'Acima de R$ 1 milhão'],
    next: 'preco'
  },
  preco: {
    bot: ['Precisa de vaga de garagem?'],
    opts: ['Sim, 1 vaga', 'Sim, 2+ vagas', 'Não preciso'],
    next: 'garagem'
  },
  garagem: {
    bot: ['Vai precisar de financiamento bancário?'],
    opts: ['Sim, preciso', 'Não, à vista', 'Tenho dúvidas'],
    next: 'corretor'
  },
  corretor: {
    bot: ['Quase lá! 😊 Com qual dos nossos corretores você prefere ser atendido?'],
    opts: [], next: 'fim'
  },
  fim: { bot: [], opts: [], next: 'wa_open' },
};

function openWA() {
  waCtx = { modalidade: 'compra' };
  document.getElementById('wa-chat').classList.add('open');
  document.getElementById('wa-bubble').style.display = 'none';
}
function closeWA() {
  document.getElementById('wa-chat').classList.remove('open');
  document.getElementById('wa-bubble').style.display = 'flex';
}
function toggleWA() {
  document.getElementById('wa-chat').classList.contains('open') ? closeWA() : openWA();
}
function addMsg(text, isUser = false) {
  const m = document.getElementById('wa-msgs');
  const d = document.createElement('div');
  d.className = `msg ${isUser ? 'msg-user' : 'msg-bot'}`;
  d.innerHTML = text;
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
}
function setQBtns(opts, step) {
  const c = document.getElementById('wa-quick');
  c.innerHTML = '';
  opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'q-btn';
    b.textContent = o;
    b.onclick = () => selectOpt(o, step);
    c.appendChild(b);
  });
}
function selectOpt(opt, step) {
  if (opt.startsWith('📲')) {
    const m = opt.match(/\|WA:([\d]+)/);
    window.open(`https://wa.me/${m ? m[1] : '5584987289132'}?text=Olá! Vim pelo site da FOX Imóveis.`, '_blank');
    return;
  }
  addMsg(opt, true);
  document.getElementById('wa-quick').innerHTML = '';
  let nx;
  if (opt === 'Comprar')           { waCtx.modalidade = 'compra';  nx = 'inicio'; }
  else if (opt === 'Alugar')       { waCtx.modalidade = 'aluguel'; nx = 'alugar'; }
  else if (opt === 'Só estou olhando') {
    setTimeout(() => addMsg('Sem problema! 😊 Explore à vontade. Qualquer dúvida, é só chamar!'), 600);
    return;
  }
  else if (step) nx = flows[step]?.next;
  else           nx = 'inicio';

  if (nx === 'corretor') {
    const corretores = getCorretoresWA();
    const nomes = corretores.map(c => `👤 ${c.nome}`);
    nomes.push('🤝 Tanto faz, qualquer um');
    setTimeout(() => {
      addMsg(flows.corretor.bot[0]);
      setTimeout(() => setQBtns(nomes, 'corretor'), 300);
    }, 600);
    return;
  }
  if (step === 'corretor') {
    const corretores = getCorretoresWA();
    let waNum = corretores[0]?.wa || '5584987289132';
    let nome  = corretores[0]?.nome || 'nosso corretor';
    if (!opt.includes('Tanto faz')) {
      const match = corretores.find(c => opt.includes(c.nome));
      if (match) { waNum = match.wa; nome = match.nome; }
    } else {
      const rnd = corretores[Math.floor(Math.random() * corretores.length)];
      waNum = rnd.wa; nome = rnd.nome;
    }
    setTimeout(() => {
      addMsg(`✅ Perfeito! O corretor <strong>${nome}</strong> será seu atendente. Clique abaixo:`);
      setTimeout(() => setQBtns([`📲 Falar com ${nome}|WA:${waNum}`], 'fim'), 300);
    }, 600);
    return;
  }
  if (nx && flows[nx]) {
    const f = flows[nx];
    setTimeout(() => {
      f.bot.forEach(b => addMsg(b));
      setTimeout(() => setQBtns(f.opts, nx), 300);
    }, 600);
  }
}
function sendWA() {
  const i = document.getElementById('wa-inp');
  const v = i.value.trim();
  if (!v) return;
  addMsg(v, true);
  i.value = '';
  const num = getCorretoresWA()[0]?.wa || '5584987289132';
  setTimeout(() => addMsg(`Obrigado! 😊 Nossa equipe responderá logo. Ou <a href="https://wa.me/${num}" target="_blank" style="color:#25D366;font-weight:600;">clique aqui</a>.`), 800);
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndApplyCorretores();
  await renderListings();
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
