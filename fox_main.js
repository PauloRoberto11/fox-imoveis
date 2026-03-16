/* ══════════════════════════════════════════
   FOX IMÓVEIS — JS Principal v2
   Listings · WA Agent (c/ escolha corretor) · Utils
══════════════════════════════════════════ */

/* ── DADOS LISTINGS ── */
const STORAGE_KEY = 'fox_listings_v3';

const defaultListings = [
  { id:1, titulo:'Casa Alto Padrão com Piscina', tipo:'Casa', modal:'venda',
    preco:'R$ 750.000', area:'280', quartos:'4', suites:'3', vagas:'2', banheiros:'3',
    local:'Ponta Negra, Natal – RN', desc:'', imgs:[], emoji:'🏠', grad:'ig1' },
  { id:2, titulo:'Apartamento Vista Mar 3 Quartos', tipo:'Apartamento', modal:'aluguel',
    preco:'R$ 3.200', area:'95', quartos:'3', suites:'1', vagas:'1', banheiros:'2',
    local:'Capim Macio, Natal – RN', desc:'', imgs:[], emoji:'🏢', grad:'ig2' },
  { id:3, titulo:'Casa de Luxo Condomínio Fechado', tipo:'Casa', modal:'lancamento',
    preco:'R$ 1.200.000', area:'420', quartos:'5', suites:'4', vagas:'3', banheiros:'5',
    local:'Neópolis, Natal – RN', desc:'', imgs:[], emoji:'🏡', grad:'ig3' },
  { id:4, titulo:'Casa Geminada 2 Quartos + Quintal', tipo:'Casa', modal:'venda',
    preco:'R$ 320.000', area:'95', quartos:'2', suites:'1', vagas:'1', banheiros:'2',
    local:'Candelária, Natal – RN', desc:'', imgs:[], emoji:'🏠', grad:'ig4' },
  { id:5, titulo:'Terreno Residencial Plano', tipo:'Terreno', modal:'venda',
    preco:'R$ 180.000', area:'360', quartos:'', suites:'', vagas:'', banheiros:'',
    local:'Parnamirim – RN', desc:'', imgs:[], emoji:'🏗️', grad:'ig5' },
  { id:6, titulo:'Studio Moderno Mobiliado', tipo:'Apartamento', modal:'aluguel',
    preco:'R$ 1.800', area:'42', quartos:'1', suites:'', vagas:'1', banheiros:'1',
    local:'Petrópolis, Natal – RN', desc:'', imgs:[], emoji:'🏢', grad:'ig6' },
];

const labelMap = { venda:'label-sale', aluguel:'label-rent', lancamento:'label-new' };
const labelTxt = { venda:'Venda', aluguel:'Aluguel', lancamento:'Lançamento' };

function getListings() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : defaultListings; }
  catch { return defaultListings; }
}
function saveListings(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
}
if (!localStorage.getItem(STORAGE_KEY)) saveListings(defaultListings);

/* ── RENDER CARDS ── */
function renderListings() {
  const grid = document.getElementById('listings-grid');
  if (!grid) return;
  const data = getListings();
  grid.innerHTML = '';
  data.forEach(p => {
    const imgH = (p.imgs && p.imgs.length)
      ? `<img class="prop-img" src="${p.imgs[0]}" alt="${p.titulo}">`
      : `<div class="card-img-bg ${p.grad||''}">${p.emoji||'🏠'}</div>`;
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
function triggerSearch() {
  openWA();
  setTimeout(() => addMsg('🔍 Recebi sua busca! Deixa eu verificar as melhores opções para você...'), 400);
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════════
   WHATSAPP AGENT — com escolha de corretor
══════════════════════════════════════════ */

/* Lê nomes e WA dos corretores do storage (ou usa defaults) */
function getCorretoresWA() {
  try {
    const list = JSON.parse(localStorage.getItem('fox_corretores_v2') || '[]');
    if (list.length) return list.map(c => ({ nome: c.nome, wa: c.wa }));
  } catch {}
  return [
    { nome: 'Ricardo Carvalho', wa: '5584987289132' },
    { nome: 'Ricardo Alves',    wa: '5584987290501' },
  ];
}

/* Contexto da conversa — rastreia modalidade para bifurcar faixa de preço */
let waCtx = { modalidade: 'compra' }; // 'compra' | 'aluguel'

const flows = {
  /* ── COMPRA ── */
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

  /* ── ALUGUEL ── */
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
    opts: [
      'R$ 500 – R$ 1.499/mês',
      'R$ 1.500 – R$ 3.000/mês',
      'R$ 3.001 – R$ 4.999/mês',
      'R$ 5.000 – R$ 10.000/mês',
      'Acima de R$ 10.000/mês',
    ],
    next: 'preco_al'
  },
  preco_al: {
    bot: ['Precisa de vaga de garagem?'],
    opts: ['Sim, 1 vaga', 'Sim, 2+ vagas', 'Não preciso'],
    next: 'garagem'
  },

  /* ── COMPARTILHADO (compra) ── */
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

  /* ── FIM DO FUNIL (comum) ── */
  garagem: {
    bot: ['Vai precisar de financiamento bancário?'],
    opts: ['Sim, preciso', 'Não, à vista', 'Tenho dúvidas'],
    next: 'corretor'
  },
  corretor: {
    bot: ['Quase lá! 😊 Com qual dos nossos corretores você prefere ser atendido?'],
    opts: [], // preenchido dinamicamente
    next: 'fim'
  },
  fim: {
    bot: [],
    opts: [],
    next: 'wa_open'
  },
};

function openWA() {
  waCtx = { modalidade: 'compra' }; // reset contexto a cada nova conversa
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
  /* ── Botão final "Abrir WhatsApp" ── */
  if (opt.startsWith('📲')) {
    const waUrl = opt.match(/\|WA:([\d]+)/);
    const num   = waUrl ? waUrl[1] : '5584987289132';
    window.open(`https://wa.me/${num}?text=Olá! Vim pelo site da FOX Imóveis e gostaria de atendimento.`, '_blank');
    return;
  }

  addMsg(opt, true);
  document.getElementById('wa-quick').innerHTML = '';

  /* ── Roteamento inicial ── */
  let nx;
  if (opt === 'Comprar') {
    waCtx.modalidade = 'compra';
    nx = 'inicio';
  } else if (opt === 'Alugar') {
    waCtx.modalidade = 'aluguel';
    nx = 'alugar';
  } else if (opt === 'Só estou olhando') {
    setTimeout(() => addMsg('Sem problema! 😊 Explore à vontade. Qualquer dúvida, é só chamar!'), 600);
    return;
  } else if (step) {
    nx = flows[step]?.next;
  } else {
    nx = 'inicio';
  }

  /* ── Etapa especial: corretor ── */
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

  /* ── Etapa especial: fim (depois de escolher corretor) ── */
  if (step === 'corretor') {
    const corretores = getCorretoresWA();
    let waNum   = corretores[0]?.wa || '5584987289132';
    let nomeEsc = corretores[0]?.nome || 'nosso corretor';

    if (!opt.includes('Tanto faz')) {
      const match = corretores.find(c => opt.includes(c.nome));
      if (match) { waNum = match.wa; nomeEsc = match.nome; }
    } else {
      const rnd = corretores[Math.floor(Math.random() * corretores.length)];
      waNum   = rnd.wa;
      nomeEsc = rnd.nome;
    }

    setTimeout(() => {
      addMsg(`✅ Perfeito! O corretor <strong>${nomeEsc}</strong> será seu atendente. Clique abaixo para conversar agora:`);
      setTimeout(() => setQBtns([`📲 Falar com ${nomeEsc}|WA:${waNum}`], 'fim'), 300);
    }, 600);
    return;
  }

  /* ── Fluxo padrão ── */
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
  const corretores = getCorretoresWA();
  const waNum = corretores[0]?.wa || '5584987289132';
  setTimeout(() => addMsg(`Obrigado! 😊 Nossa equipe responderá logo. Ou <a href="https://wa.me/${waNum}" target="_blank" style="color:#25D366;font-weight:600;">clique aqui</a> para falar agora.`), 800);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderListings();
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
