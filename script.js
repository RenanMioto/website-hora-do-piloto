function abs(path){
  return `/website-hora-do-piloto${path.startsWith('/') ? path : '/' + path}`;
}

function setupMobileMenu(){
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('mainnav');
  if(!btn || !nav) return;
  const toggle = () => {
    const open = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', toggle);
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded','false');
  }));
}

function loadGallery(){
  const grid = document.getElementById('gallery-grid');
  if(!grid) return;
  const url = new URL(window.location.href);
  const album = url.searchParams.get('album') || 'midia';
  const title = document.getElementById('gallery-title');
  if(title){
    title.textContent = album.charAt(0).toUpperCase()+album.slice(1);
  }
  const exts = ['jpg','png','webp'];
  let items = [];
  for(let i=1;i<=20;i++){
    for(const ext of exts){
      items.push(`/website-hora-do-piloto/assets/album/${album}/${album}${i}.${ext}`);
    }
  }
  items.forEach(src=>{
    const img = new Image();
    img.src = src;
    img.loading = 'lazy';
    img.onload = ()=>{
      const fig = document.createElement('figure');
      fig.className='figure';
      fig.innerHTML = `<img src="${src}" alt=""><figcaption class="cap"></figcaption>`;
      grid.appendChild(fig);
    };
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  setupMobileMenu();
  loadGallery();
});
