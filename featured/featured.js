
// Canonical spellings only. This list NO LONGER decides which tags appear -
// the dropdown is built from the unique Tags actually present in the sheet.
// It just normalises casing, so "aerospace" and "Aerospace" don't split in two.
const TOPICS = ["Aerospace", "Entrepreneurship", "Tech", "Economics", "Finance", "Wellbeing", "Cricket", "Sports"];

const IMG_VERSION = 5;

let POSTS = [];
let activeTag = "all";

// Absolute-path helper: pages are served at /featured (no trailing slash),
// so relative asset paths would resolve against the site root and 404.
const ASSET = p => (!p || /^(https?:)?\/\//.test(p) || p.charAt(0)==="/") ? p : "/featured/" + p.replace(/^\.\//,"");


function parseTags(raw){
  // Split on COMMAS only, so multi-word tags like "Clean Energy" stay intact.
  return String(raw||"")
    .split(",")
    .map(t=>t.replace(/^#/,"").trim())
    .filter(Boolean)
    .map(t=>{
      const hit = TOPICS.find(x=>x.toLowerCase()===t.toLowerCase());
      return hit || t;   // normalise casing to the canonical spelling if known
    });
}

async function loadPosts(){
  const data=await PortfolioData.load("featured");
  const head=Object.keys(data[0]||{});
  const rows=data.map(o=>head.map(h=>o[h]));
  const idx=n=>head.indexOf(n);
  const iId=idx("ID"), iTitle=idx("Title"), iDesc=idx("Description"),
      iThumb=idx("Thumbnail"), iLink=idx("Post_Link"), iTags=idx("Tags"),
      iScaleThumb=idx("Scale");
POSTS = rows.map(r=>{
  const scaleThumb = (r[iScaleThumb] || "YES").trim();
  return {
    id:(r[iId]||"").trim(),
    title:(r[iTitle]||"").trim(),
    desc:(r[iDesc]||"").trim(),

    thumb:ASSET((r[iThumb]||"").trim() || `thumbs/${(r[iId]||"").trim()}.webp`),
    link:(r[iLink]||"").trim(),
    tags:parseTags(r[iTags]),
    scaleThumb: scaleThumb
  };
}).sort((a,b)=>b.id.localeCompare(a.id,undefined,{numeric:true})); // descending: newest (highest ID) first
}

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function attr(s){return String(s).replace(/"/g,"&quot;");}

const ICON_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
const ICON_CHECK = `<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>`;

function postMatches(p){ return activeTag==="all" || p.tags.includes(activeTag); }

function tagOptions(){

  // Unique tags straight from the sheet (Column F), same approach as projects.js
  const present = [...new Set(POSTS.flatMap(p=>p.tags))].sort((a,b)=>a.localeCompare(b));
  return [{value:"all",label:"All",count:POSTS.length},
    ...present.map(t=>({value:t,label:"#"+t,count:POSTS.filter(p=>p.tags.includes(t)).length}))];
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

  const thumbSrc = p.thumb ? attr(p.thumb) + (p.thumb.indexOf("?")<0 ? "?v=" + IMG_VERSION : "") : "";
  const objectFit = p.scaleThumb === "NO" ? "contain" : "cover";
  const thumb = thumbSrc ? `<img src="${thumbSrc}" alt="${attr(p.title)}" loading="lazy" style="object-fit: ${objectFit}; object-position: ${objectFit === 'cover' ? 'top center' : 'center'}">` : "";

  const openAttrs = p.link
    ? `href="${attr(p.link)}" target="_blank" rel="noopener"`
    : `href="#" data-preview="${attr(thumbSrc)}" data-title="${attr(p.title)}"`;
  return `
  <article class="card">
    <div class="thumb">
      ${thumb}
      <a class="thumb-click" ${openAttrs} aria-label="Open ${attr(p.title)}"></a>
    </div>
    <div class="card-body">
      <h3 class="card-title">${esc(p.title)}</h3>
      <p class="card-desc">${esc(p.desc)}</p>
      <div class="card-foot">
        <div class="card-tags">${tags}</div>
        <a class="btn btn-open" ${openAttrs}>${ICON_OPEN} View</a>
      </div>
    </div>
  </article>`;
}

function render(){
  const root=document.getElementById("render-root");
  const matches=POSTS.filter(postMatches);
  document.getElementById("results-meta").textContent=`Displaying ${matches.length} of ${POSTS.length} Featured`;
  if(matches.length===0){
    root.innerHTML=`<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><p>No featured posts match this topic.</p></div>`;
    return;
  }
  root.style.opacity="0";
  root.innerHTML=`<div class="grid">${matches.map(cardHTML).join("")}</div>`;
  requestAnimationFrame(()=>{root.style.opacity="1";});

  root.querySelectorAll(".tag").forEach(el=>el.addEventListener("click",()=>{
    activeTag=el.dataset.tag; syncLabel(); render();
    window.scrollTo({top:0,behavior:"smooth"});
  }));
  root.querySelectorAll("a[data-preview]").forEach(a=>a.addEventListener("click",e=>{
    e.preventDefault();
    openPreview(a.getAttribute("data-preview"), a.getAttribute("data-title")||"");
  }));
}

(async function init(){
  try{ await loadPosts(); }
  catch(err){
    document.getElementById("render-root").innerHTML =
      '<div class="empty-state"><p>'+err.message+'<br><small>If viewing locally, run a local server (see README) - browsers block file:// fetches.</small></p></div>';
    return;
  }
  buildDropdown();
  render();
})();

const fModal = document.getElementById("f-modal");
const fClose = document.getElementById("f-close");
const fWrap  = document.getElementById("f-imgwrap");

function openPreview(src, title){
  if(!fModal) return;
  fWrap.innerHTML = `<img class="modal-img" src="${attr(src)}" alt="${attr(title)}" decoding="async">`;
  fModal.classList.add("open");
  fClose.style.display = "flex";
  document.body.style.overflow = "hidden";
}
function closePreview(){
  fModal.classList.remove("open");
  fClose.style.display = "none";
  document.body.style.overflow = "";
  fWrap.innerHTML = "";
}
if(fModal){
  fClose.addEventListener("click", closePreview);
  fModal.addEventListener("click", e=>{ if(e.target===fModal || e.target.id==="f-imgwrap") closePreview(); });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && fModal.classList.contains("open")) closePreview(); });
}
