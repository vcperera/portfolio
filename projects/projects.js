

const IMG_VERSION = 2;

let PROJECTS = [];
let activeTag = "all";

// Absolute-path helper: pages are served at /projects (no trailing slash),
// so relative asset paths would resolve against the site root and 404.
const ASSET = p => (!p || /^(https?:)?\/\//.test(p) || p.charAt(0)==="/") ? p : "/projects/" + p.replace(/^\.\//,"");


function parseTags(raw){
  return String(raw||"")
    .split(/[,\s]+/)
    .map(t=>t.replace(/^#/,"").trim())
    .filter(Boolean);
}

async function loadProjects(){
  const data=await PortfolioData.load("projects");
  const cols=Object.keys(data[0]||{});
  const rows=data.length?[cols,...data.map(o=>cols.map(h=>o[h]))]:[];

  if(rows.length === 0) {
    PROJECTS = [];
    return;
  }

  const head=rows.shift().map(s=>s.trim());
  const idx=n=>head.indexOf(n);
  const iId=idx("ID"), iTitle=idx("Title"), iDesc=idx("Description"),
      iExpl=idx("Explanation"), iTags=idx("Tags"), iThumb=idx("Thumbnail"), iMedia=idx("Media"),
      iScaleThumb=idx("Scale");

  PROJECTS = rows
  .map(r=>{

    const id = (r[iId] || "").trim();
    const title = (r[iTitle] || "").trim();
    if(!id || !title) return null;

    const thumb=ASSET((r[iThumb]||"").trim());
    const mediaRaw=(r[iMedia]||"").trim();
    const media = mediaRaw ? mediaRaw.split("|").map(s=>ASSET(s.trim())).filter(Boolean) : [];
    const explanation=(r[iExpl]||"").trim();
    const scaleThumb = (r[iScaleThumb] || "YES").trim();
    return {
      id: id,
      title: title,
      desc:(r[iDesc]||"").trim(),
      explanation,
      paragraphs: explanation.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean),
      tags:parseTags(r[iTags]),
      thumb,
      media: media.length ? media : (thumb ? [thumb] : []),
      hasMedia: !!thumb,
      scaleThumb: scaleThumb
    };
  })
  .filter(p => p !== null)
  .sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
}

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function attr(s){return String(s).replace(/"/g,"&quot;");}
function cacheBust(src){
  if(!src) return "";
  const base = attr(src);
  const cacheKey = IMG_VERSION + (window.DEV_MODE ? Date.now() : "");
  return base + (base.indexOf("?")<0 ? "?v="+cacheKey : "");
}

const ICON_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
const ICON_CHECK = `<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>`;
const ICON_CLOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

function postMatches(p){ return activeTag==="all" || p.tags.includes(activeTag); }

function tagOptions(){
  const present = [...new Set(PROJECTS.flatMap(p=>p.tags))].sort((a,b)=>a.localeCompare(b));
  return [{value:"all",label:"All",count:PROJECTS.length},
    ...present.map(t=>({value:t,label:"#"+t,count:PROJECTS.filter(p=>p.tags.includes(t)).length}))];
}

function buildDropdown(){
  const dd=document.querySelector('.dd[data-group="tag"]');
  const btn=dd.querySelector(".dd-btn");
  btn.addEventListener("click",e=>{
    e.stopPropagation();
    const wasOpen=dd.classList.contains("open");
    closeAll();
    if(!wasOpen){ rebuildMenu(dd); dd.classList.add("open"); }
  });
  document.addEventListener("click",closeAll);
  syncLabel();
}
function rebuildMenu(dd){
  const menu=dd.querySelector(".dd-menu");
  menu.innerHTML = tagOptions().map(o=>
    `<div class="dd-opt ${activeTag===o.value?'selected':''}" data-value="${attr(o.value)}">
       <span>${esc(o.label)}</span>
       <span style="display:flex;align-items:center;gap:8px"><span class="count">${o.count}</span>${ICON_CHECK}</span>
     </div>`).join("");
  menu.querySelectorAll(".dd-opt").forEach(opt=>{
    opt.addEventListener("click",ev=>{
      ev.stopPropagation();
      activeTag=opt.dataset.value;
      closeAll(); syncLabel(); render();
    });
  });
}
function closeAll(){ document.querySelectorAll(".dd").forEach(d=>d.classList.remove("open")); }
function syncLabel(){
  const dd=document.querySelector('.dd[data-group="tag"]');
  dd.querySelector(".dd-val").textContent = activeTag==="all" ? "All" : "#"+activeTag;
  dd.querySelector(".dd-btn").classList.toggle("has-value", activeTag!=="all");
  document.getElementById("clear-filters").style.display = activeTag!=="all" ? "inline-flex" : "none";
}
document.getElementById("clear-filters").addEventListener("click",()=>{ activeTag="all"; syncLabel(); render(); });

function cardHTML(p){
  const tags = p.tags.map(t=>`<span class="tag" data-tag="${attr(t)}">#${esc(t)}</span>`).join("");

  if(!p.hasMedia){
    return `
    <article class="card">
      <div class="thumb cs"><span class="cs-badge">${ICON_CLOCK}Coming Soon</span></div>
      <div class="card-body">
        <h3 class="card-title" title="${attr(p.title)}">${esc(p.title)}</h3>
        <p class="card-desc">${esc(p.desc||"In development.")}</p>
        <div class="card-foot">
          <div class="card-tags">${tags}</div>
          <a class="btn btn-open" aria-disabled="true" title="Coming soon">${ICON_OPEN} View More</a>
        </div>
      </div>
    </article>`;
  }

  const thumbSrc = cacheBust(p.thumb);
  const objectFit = p.scaleThumb === "NO" ? "contain" : "cover";
  return `
  <article class="card">
    <div class="thumb">
      <img src="${thumbSrc}" alt="${attr(p.title)}" loading="lazy" decoding="async" style="object-fit: ${objectFit}; object-position: ${objectFit === 'cover' ? 'top center' : 'center'}">
      <div class="thumb-click" data-open="${attr(p.id)}" role="button" aria-label="View ${attr(p.title)}"></div>
    </div>
    <div class="card-body">
      <h3 class="card-title" title="${attr(p.title)}">${esc(p.title)}</h3>
      <p class="card-desc">${esc(p.desc)}</p>
      <div class="card-foot">
        <div class="card-tags">${tags}</div>
        <button class="btn btn-open" data-open="${attr(p.id)}">${ICON_OPEN} View More</button>
      </div>
    </div>
  </article>`;
}

function attachEvents() {
  const root = document.getElementById("render-root");
  root.querySelectorAll(".tag").forEach(el => {
    el.addEventListener("click", () => {
      activeTag = el.dataset.tag;
      syncLabel();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  root.querySelectorAll("[data-open]").forEach(el => {
    el.addEventListener("click", () => {
      if (el.getAttribute("aria-disabled") === "true") return;
      openDetail(el.dataset.open);
    });
  });
}

function render(){
  const root=document.getElementById("render-root");
  const matches=PROJECTS.filter(postMatches);
  document.getElementById("results-meta").textContent=`Displaying ${matches.length} of ${PROJECTS.length} Projects`;
  if(matches.length===0){
    root.innerHTML=`<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><p>No projects match this topic.</p></div>`;
    return;
  }
  root.style.opacity="0";

  const batchSize = 6;
  let index = 0;
  const grid = document.createElement('div');
  grid.className = 'grid';

  function renderBatch() {
    const end = Math.min(index + batchSize, matches.length);
    for (let i = index; i < end; i++) {
      const temp = document.createElement('div');
      temp.innerHTML = cardHTML(matches[i]);
      grid.appendChild(temp.firstElementChild);
    }
    index = end;

    if (index < matches.length) {

      if (window.requestIdleCallback) {
        requestIdleCallback(renderBatch);
      } else {
        setTimeout(renderBatch, 50);
      }
    } else {
      root.appendChild(grid);
      requestAnimationFrame(() => { root.style.opacity = "1"; });
      attachEvents();
    }
  }

  renderBatch();
}

let currentProject = null;
let currentMediaIdx = 0;

function detailBodyHTML(p){
  const hasMulti = p.media.length > 1;

  const strip = hasMulti ? `<div class="media-strip" id="media-strip">${
    p.media.map((m,i)=>`<div class="media-thumb${i===0?' active':''}" data-idx="${i}"><img src="${i < 3 ? cacheBust(m) : ''}" data-src="${i >= 3 ? cacheBust(m) : ''}" alt="" loading="lazy" decoding="async"></div>`).join("")
  }</div>` : "";

  const tags = p.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join("");
  const paras = (p.paragraphs.length ? p.paragraphs : [p.explanation]).map(t=>`<p>${esc(t)}</p>`).join("");

  return `
    <div class="detail-media">
      <div class="media-main" id="media-main">
        <img id="media-img" src="${cacheBust(p.media[0])}" alt="${attr(p.title)}" loading="eager" decoding="async">
      </div>
      ${strip}
    </div>
    <div class="detail-text">
      <h2 class="detail-title">${esc(p.title)}</h2>
      <p class="detail-desc">${esc(p.desc)}</p>
      <div class="detail-tags">${tags}</div>
      <div class="detail-explanation">${paras}</div>
    </div>`;
}

function setMediaIndex(i){
  const p=currentProject; if(!p) return;
  const n=p.media.length;
  currentMediaIdx=((i%n)+n)%n;
  const img = document.getElementById("media-img");
  if(img) {
    img.src = cacheBust(p.media[currentMediaIdx]);
    img.loading = "eager";
  }
  document.querySelectorAll("#media-strip .media-thumb").forEach(el=>{
    el.classList.toggle("active", parseInt(el.dataset.idx,10)===currentMediaIdx);
  });
}

function lazyLoadThumbnails() {
  const thumbs = document.querySelectorAll('#media-strip .media-thumb img[data-src]');
  thumbs.forEach(img => {
    if(img.getAttribute('data-src')) {
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    }
  });
}

function preloadImages(urls) {
  return Promise.all(urls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = url;
    });
  }));
}

const SLIDESHOW_MS = 3000;
let slideshowTimer = null;

function startSlideshow(){
  stopSlideshow();
  if(!currentProject || currentProject.media.length<2) return;
  slideshowTimer = setInterval(()=> setMediaIndex(currentMediaIdx+1), SLIDESHOW_MS);
}
function stopSlideshow(){
  if(slideshowTimer){ clearInterval(slideshowTimer); slideshowTimer=null; }
}

const detailModal = document.getElementById("detail-view");
const detailCloseBtn = document.getElementById("detail-close");
const projectNavEl = document.getElementById("project-nav");
const projectPrevBtn = document.getElementById("project-prev");
const projectNextBtn = document.getElementById("project-next");

function navigableProjects(){ return PROJECTS.filter(p=>p.hasMedia); }

function goToProjectOffset(offset){
  const list = navigableProjects();
  if(!currentProject || list.length<2) return;
  const idx = list.findIndex(p=>p.id===currentProject.id);
  if(idx===-1) return;
  const nextIdx = ((idx+offset)%list.length + list.length) % list.length;
  openDetail(list[nextIdx].id);
}

async function openDetail(id) {
  const p = PROJECTS.find(x => x.id === id);
  if (!p || !p.hasMedia) return;
  currentProject = p;
  currentMediaIdx = 0;

  await preloadImages([cacheBust(p.media[0])]);

  const body = document.getElementById("detail-body");
  body.innerHTML = detailBodyHTML(p);

  document.querySelectorAll("#media-strip .media-thumb").forEach(el => {
    el.addEventListener("click", () => setMediaIndex(parseInt(el.dataset.idx, 10)));
  });

  const mediaMain = document.getElementById("media-main");
  if(mediaMain){
    mediaMain.addEventListener("mouseenter", stopSlideshow);
    mediaMain.addEventListener("mouseleave", startSlideshow);
  }

  detailModal.classList.add("open");
  detailCloseBtn.style.display = "flex";
  projectNavEl.style.display = navigableProjects().length > 1 ? "flex" : "none";
  document.body.style.overflow = "hidden";

  setTimeout(lazyLoadThumbnails, 300);
  startSlideshow();
}

function closeDetail(){
  stopSlideshow();
  detailModal.classList.remove("open");
  detailCloseBtn.style.display="none";
  projectNavEl.style.display="none";
  document.body.style.overflow="";
  document.getElementById("detail-body").innerHTML="";
  currentProject=null;
}

detailCloseBtn.addEventListener("click", closeDetail);
projectPrevBtn.addEventListener("click", ()=>goToProjectOffset(-1));
projectNextBtn.addEventListener("click", ()=>goToProjectOffset(1));
detailModal.addEventListener("click", e=>{ if(e.target===detailModal) closeDetail(); });
document.addEventListener("keydown",e=>{
  if(e.key==="Escape" && detailModal.classList.contains("open")) closeDetail();
});

(async function init(){
  try{ await loadProjects(); }
  catch(err){
    document.getElementById("render-root").innerHTML =
      '<div class="empty-state"><p>'+err.message+'<br><small>If viewing locally, run a local server (see README) - browsers block file:// fetches.</small></p></div>';
    return;
  }
  buildDropdown();
  render();
})();