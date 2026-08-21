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

  // Orijinal görsel sadece lightbox açıldığında / değiştirildiğinde yüklenir.
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
  const {box,img}=lightboxElements();
  if(!box) return;
  box.classList.remove('open');
  box.setAttribute('aria-hidden','true');
  document.body.classList.remove('lightbox-open');

  // Kapatınca büyük görseli bellekte tutmaya zorlamayalım.
  if(img) img.removeAttribute('src');
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

function addGalleryItem(box,item,index){
  if(!item || !item.thumb || !item.full) return;

  const figure=document.createElement('figure');
  figure.tabIndex=0;
  figure.setAttribute('role','button');
  figure.setAttribute('aria-label',`Crémine galeri fotoğrafı ${index+1} — büyüt`);

  const img=document.createElement('img');
  img.src=item.thumb;
  img.alt=`Crémine galeri ${index+1}`;

  // Thumbnail'ların tamamı sayfa açılır açılmaz yüklenir.
  // Böylece aşağı kaydırınca galeri eksikmiş gibi görünmez.
  img.loading='eager';
  img.decoding='async';
  img.fetchPriority='low';
  img.width=640;
  img.height=640;

  const lightboxIndex=gallerySources.length;
  gallerySources.push(item.full);

  figure.addEventListener('click',()=>openLightbox(lightboxIndex));
  figure.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();
      openLightbox(lightboxIndex);
    }
  });

  figure.appendChild(img);
  box.appendChild(figure);
}

async function loadGallery(){
  const box=document.querySelector('[data-auto-gallery]');
  if(!box) return;

  const empty=document.querySelector('[data-gallery-empty]');

  try{
    // GitHub Action tarafından otomatik oluşturulan küçücük manifest dosyası.
    const response=await fetch('assets/gallery/gallery.json',{cache:'no-store'});
    if(!response.ok) throw new Error(`gallery.json yüklenemedi (${response.status})`);

    const items=await response.json();
    if(!Array.isArray(items)) throw new Error('gallery.json biçimi geçersiz');

    gallerySources.length=0;
    box.replaceChildren();

    items.forEach((item,index)=>addGalleryItem(box,item,index));

    if(empty) empty.hidden=items.length!==0;
  }catch(error){
    console.error('Galeri yüklenemedi:',error);
    if(empty){
      empty.hidden=false;
      empty.textContent='Galeri hazırlanıyor. Lütfen kısa süre sonra tekrar deneyin.';
    }
  }
}

setupLightbox();
loadGallery();
