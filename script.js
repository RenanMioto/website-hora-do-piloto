// ====== MENU MOBILE ======
function setupMobileMenu(){
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('mainnav');
  if(!btn || !nav) return;

  const toggle = () => {
    const open = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', toggle);

  // Fecha ao tocar num link
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    if(nav.classList.contains('is-open')){
      nav.classList.remove('is-open');
      btn.setAttribute('aria-expanded','false');
    }
  }));

  // Calcula a altura do topbar para ancorar o menu (mobile)
  const topbar = document.querySelector('.topbar');
  const setVar = () => {
    if(!topbar) return;
    const rect = topbar.getBoundingClientRect();
    const h = Math.round(rect.height);
    document.documentElement.style.setProperty('--topbar-bottom', h + 'px');
  };
  window.addEventListener('resize', setVar, { passive:true });
  setVar();
}

// ====== GALERIA ======
const ALBUMS = {
  calendario: [ 'assets/album/calendario/calendario.jpg' ],
  pilotos:    [ 'assets/album/pilotos/pilotos.png' ],
  construtores:[ 'assets/album/construtores/construtores.png' ],
  resultados: [
    'assets/album/resultados/gp1.png',
    'assets/album/resultados/gp2.png',
    'assets/album/resultados/gp3.png',
    'assets/album/resultados/gp4.png'
  ],
  midia: [ 'assets/album/midia/pilotos.png' ]
};

const TITLES = {
  calendario: 'Calendário',
  pilotos: 'Classificação de Pilotos',
  construtores: 'Classificação de Construtores',
  resultados: 'Resultados das Etapas',
  midia: 'Mídia'
};

function getParam(name){
  const q = new URLSearchParams(location.search);
  return (q.get(name) || '').toLowerCase();
}

function loadGallery(){
  const grid = document.getElementById('gallery-grid');
  if(!grid) return;

  const album = getParam('album');
  const list = ALBUMS[album] || [];

  // título
  const h2 = document.getElementById('album-title');
  if(h2) h2.textContent = TITLES[album] || 'Galeria';

  if(!list.length){
    grid.innerHTML = `<p style="color:var(--muted)">Nenhuma imagem configurada para o álbum <strong>${album || '(vazio)'}</strong>.</p>`;
    return;
  }

  grid.innerHTML = '';
  list.forEach((src, i) => {
    const fig = document.createElement('figure');
    fig.className = 'figure';

    const img = document.createElement('img');
    img.src = src;
    img.alt = `${album} ${i+1}`;
    img.loading = 'lazy';
    img.decoding = 'async';

    const cap = document.createElement('figcaption');
    cap.className = 'cap';
    cap.textContent = '';

    fig.appendChild(img);
    fig.appendChild(cap);
    grid.appendChild(fig);
  });
}

// ====== BOOT ======
document.addEventListener('DOMContentLoaded', ()=>{
  setupMobileMenu();
  loadGallery();
});
