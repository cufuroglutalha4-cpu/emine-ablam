const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.main-nav');
if(toggle&&nav){
  toggle.addEventListener('click',()=>{
    nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded',String(nav.classList.contains('open')));
  });
}

document.querySelectorAll('.acc-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const current=btn.closest('.acc-item');
    const wasOpen=current.classList.contains('open');
    document.querySelectorAll('.acc-item').forEach(item=>{
      item.classList.remove('open');
      const itemBtn=item.querySelector('.acc-btn');
      if(itemBtn) itemBtn.setAttribute('aria-expanded','false');
    });
    if(!wasOpen){
      current.classList.add('open');
      btn.setAttribute('aria-expanded','true');
    }
  });
});

document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

const gallerySources=[];
let activeGalleryIndex=0;

function lightboxElements(){
  return {
    box:document.querySelector('[data-lightbox]'),
    img:document.querySelector('[data-lightbox-image]'),
    counter:document.querySelector('[data-lightbox-counter]'),
    stage:document.querySelector('[data-lightbox-stage]')
  };
}

function renderLightbox(){
  const {img,counter}=lightboxElements();
  if(!img || gallerySources.length===0) return;
  activeGalleryIndex=(activeGalleryIndex+gallerySources.length)%gallerySources.length;
  img.src=gallerySources[activeGalleryIndex];
  img.alt=`Crémine galeri ${activeGalleryIndex+1}`;
  if(counter) counter.textContent=`${activeGalleryIndex+1} / ${gallerySources.length}`;
}

function openLightbox(index){
  const {box}=lightboxElements();
  if(!box || !gallerySources.length) return;
  activeGalleryIndex=index;
  renderLightbox();
  box.classList.add('open');
  box.setAttribute('aria-hidden','false');
  document.body.classList.add('lightbox-open');
  const close=box.querySelector('[data-lightbox-close]');
  if(close) close.focus({preventScroll:true});
}

function closeLightbox(){
  const {box}=lightboxElements();
  if(!box) return;
  box.classList.remove('open');
  box.setAttribute('aria-hidden','true');
  document.body.classList.remove('lightbox-open');
}

function moveLightbox(step){
  if(!gallerySources.length) return;
  activeGalleryIndex+=step;
  renderLightbox();
}

function setupLightbox(){
  const {box,stage}=lightboxElements();
  if(!box) return;
  box.querySelector('[data-lightbox-close]')?.addEventListener('click',closeLightbox);
  box.querySelector('[data-lightbox-prev]')?.addEventListener('click',()=>moveLightbox(-1));
  box.querySelector('[data-lightbox-next]')?.addEventListener('click',()=>moveLightbox(1));
  box.addEventListener('click',e=>{ if(e.target===box) closeLightbox(); });

  document.addEventListener('keydown',e=>{
    if(!box.classList.contains('open')) return;
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft') moveLightbox(-1);
    if(e.key==='ArrowRight') moveLightbox(1);
  });

  if(stage){
    let startX=0, startY=0;
    stage.addEventListener('touchstart',e=>{
      const t=e.changedTouches[0]; startX=t.clientX; startY=t.clientY;
    },{passive:true});
    stage.addEventListener('touchend',e=>{
      const t=e.changedTouches[0];
      const dx=t.clientX-startX, dy=t.clientY-startY;
      if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.25) moveLightbox(dx<0?1:-1);
    },{passive:true});
  }
}

function loadGallery(){
  const box=document.querySelector('[data-auto-gallery]');
  if(!box) return;

  const extensions=['jpg','jpeg','png','webp','avif'];
  let index=1;
  let missesInRow=0;
  let loaded=0;
  const maxConsecutiveMisses=12;

  function finishIfNeeded(){
    if(missesInRow<maxConsecutiveMisses) return false;
    const empty=document.querySelector('[data-gallery-empty]');
    if(empty && loaded===0) empty.hidden=false;
    return true;
  }

  function tryExtension(extIndex){
    if(finishIfNeeded()) return;
    if(extIndex>=extensions.length){
      missesInRow++;
      index++;
      tryExtension(0);
      return;
    }

    const currentIndex=index;
    const src=`assets/gallery/${currentIndex}.${extensions[extIndex]}`;
    const probe=new Image();
    probe.onload=()=>{
      const figure=document.createElement('figure');
      figure.tabIndex=0;
      figure.setAttribute('role','button');
      figure.setAttribute('aria-label',`Crémine galeri fotoğrafı ${currentIndex} — büyüt`);
      const img=document.createElement('img');
      img.src=src;
      img.alt=`Crémine galeri ${currentIndex}`;
      img.loading='lazy';
      img.decoding='async';
      const lightboxIndex=gallerySources.length;
      gallerySources.push(src);
      figure.addEventListener('click',()=>openLightbox(lightboxIndex));
      figure.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openLightbox(lightboxIndex); }
      });
      figure.appendChild(img);
      box.appendChild(figure);
      loaded++;
      missesInRow=0;
      index++;
      tryExtension(0);
    };
    probe.onerror=()=>tryExtension(extIndex+1);
    probe.src=src;
  }

  tryExtension(0);
}

setupLightbox();
loadGallery();
