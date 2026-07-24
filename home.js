
(function(){
"use strict";
const M = window.Mission || {REDUCED:false,TOUCH:false};
const REDUCED = M.REDUCED, TOUCH = M.TOUCH;
const qs  = (s,c)=>(c||document).querySelector(s);
const qsa = (s,c)=>Array.from((c||document).querySelectorAll(s));

const TECH_DIR="assets/logos/techstack/";
const ORG_DIR="assets/logos/organisations/";
const EDU_DIR="assets/logos/education/";

let TECH_CATEGORIES=[];
let ORGS=[];
let EDUCATION=[];
let PERSONAS=[];

function buildTech(rows){
  const cats=[], byKey={};
  rows.forEach(r=>{
    let cat=byKey[r.Category];
    if(!cat){ cat={key:r.Category,label:r.Category,color:r.Color,subs:[],_by:{}}; byKey[r.Category]=cat; cats.push(cat); }
    let sub=cat._by[r["Sub-Category"]];
    if(!sub){ sub={label:r["Sub-Category"],color:r.Sub_Color,tools:[]}; cat._by[r["Sub-Category"]]=sub; cat.subs.push(sub); }
    // Scale (fetch.xlsx, techstack sheet): how much bigger/smaller
    // this one logo should render vs. the others, applied live via CSS
    // transform - the source image file is never touched. 1 = unchanged.
    // Uses the shared logoSF() clamp (0.2-8x, same as orgs/education) so
    // sheet edits above the old 2.5 cap actually take effect. Heavily-padded
    // low-res logos legitimately need a large factor to reach uniform height;
    // the tile has overflow:hidden so an over-large value just clips.
    sub.tools.push({n:r.Tool,i:r.Image,sf:logoSF(r.Scale)});
  });
  cats.forEach(c=>delete c._by);
  return cats;
}
// Scale (fetch.xlsx): per-logo CSS scale, applied live in the browser
// exactly like the techstack sheet. Source PNGs are never rewritten, so a
// value is relative to how object-fit:contain first fits the raw logo into
// its box. 1 = unchanged. Clamped to a sane range so a typo can't blow up
// the layout. (Replaces the old boolean "Small" column for organisations.)
function logoSF(v){
  let sf=parseFloat(v);
  if(!isFinite(sf) || sf<=0) sf=1;
  return Math.max(0.2, Math.min(14, sf));
}
function buildOrgs(rows){
  return rows.map(r=>({name:r.Name,img:r.Image,year:r.Year,tag:r.Tag,role:r.Role,start:r.Start,end:r.End,location:r.Location,sf:logoSF(r.Scale),back:(r.Back_Description||"").trim()}));
}
function buildEducation(rows){
  return rows.map(r=>({name:r.Name,img:r.Image,years:r.Years,loc:r.Location,title:r.Title,blurb:r.Blurb,sf:logoSF(r.Scale)}));
}
function buildPersonas(rows){
  return rows.map(r=>({img:r.Image,tag:r.Tag}));
}

function runBoot(){
  const skip = REDUCED || document.documentElement.classList.contains("pt-enter");
  const nEl=qs("#boot-n"), bar=qs("#boot-bar"), lines=qsa("#boot-lines div");
  const finish=()=>{
    document.body.classList.add("booted");
    document.body.style.overflow="";
    ["hl1","hl2","hl3"].forEach(id=>{ const el=qs("#"+id); if(el) el.classList.add("sp-run"); });
  };
  if(skip || !nEl){ finish(); return; }
  document.body.style.overflow="hidden";
  scrollTo(0,0);
  const D=1450, t0=performance.now();
  const marks=[14,34,56,78,95];
  (function step(){
    const p=Math.min(1,(performance.now()-t0)/D);
    const e=1-Math.pow(1-p,2.6);
    const v=Math.round(e*100);
    nEl.textContent=String(v).padStart(3,"0");
    bar.style.width=(e*100)+"%";
    lines.forEach((l,i)=>{ if(v>=marks[i]) l.classList.add("done"); });
    if(p<1) requestAnimationFrame(step);
    else setTimeout(finish,240);
  })();
}

function prepHeadline(){
  const conf=[["hl1",0,26],["hl2",240,26],["hl3",480,30]];
  conf.forEach(([id,delay,step])=>{
    const el=qs("#"+id); if(!el) return;
    el.dataset.split="chars"; el.dataset.splitDelay=String(delay); el.dataset.splitStep=String(step);
    if(M.splitEl) M.splitEl(el);
  });
}

function initPersona(){
  const img=qs("#persona-img"), tagEl=qs("#persona-tag");
  if(!img||!tagEl) return;
  if(!PERSONAS.length) return;

  const csK = qs(".cs-k");

  let i=0;
  const total = PERSONAS.length;

  if (csK) csK.textContent = "CALLSIGN 1/" + total;

  setInterval(()=>{
    i=(i+1)%PERSONAS.length;
    const p=PERSONAS[i];
    img.style.transition="opacity 200ms ease, transform 200ms ease";
    img.style.opacity="0"; img.style.transform="scale(0.7)";
    setTimeout(()=>{
      img.src="assets/memoji/"+p.img;
      img.style.opacity="1"; img.style.transform="scale(1)";
    },200);
    if(REDUCED){ tagEl.textContent=p.tag; }
    else { tagEl.dataset.scrambleText=p.tag; M.scramble(tagEl,460); }

    if (csK) csK.textContent = "CALLSIGN " + (i + 1) + "/" + total;
  },3000);
}

function initOrbit(){
  if(TOUCH||REDUCED) return;
  const wrap=qs("#orbit-wrap"); if(!wrap) return;
  const t={x:0,y:0}, c={x:0,y:0};
  addEventListener("mousemove",e=>{
    t.x=(e.clientX/innerWidth-0.5); t.y=(e.clientY/innerHeight-0.5);
  },{passive:true});
  M.ticker.add(()=>{
    c.x=M.lerp(c.x,t.x,0.04); c.y=M.lerp(c.y,t.y,0.04);
    wrap.style.transform=`translate(${(c.x*18).toFixed(1)}px,${(c.y*14).toFixed(1)}px) rotate(${(c.x*2).toFixed(2)}deg)`;
  });
}

function wrapScrubWords(el){
  const wrap=node=>{
    Array.from(node.childNodes).forEach(ch=>{
      if(ch.nodeType===3){
        const frag=document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(tok=>{
          if(/^\s+$/.test(tok)||tok===""){ frag.appendChild(document.createTextNode(tok)); return; }
          const sp=document.createElement("span"); sp.className="w"; sp.textContent=tok;
          frag.appendChild(sp);
        });
        node.replaceChild(frag,ch);
      } else if(ch.nodeType===1) wrap(ch);
    });
  };
  wrap(el);
  return qsa(".w",el);
}

const PF_DIR="assets/me/web/";
const PF_FILES=["1.jpg","2.jpg","3.jpg","4.jpg"];

const CASCADE=[
  {l:1,  t:3,  w:47, r:-1, z:2},
  {l:44, t:10, w:52, r:4,  z:3},
  {l:-1,  t:43, w:47, r:2,  z:4},
  {l:39, t:40, w:53, r:2, z:5},
];

function pfRand(seed){ const x=Math.sin(seed*127.1+311.7)*43758.5453; return x-Math.floor(x); }

function buildPhotos(files){
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const n=files.length;
  if(!n) return [];
  const cols=Math.ceil(Math.sqrt(n));
  const rows=Math.ceil(n/cols);
  const w=Math.round(cl(400/cols,120,196));
  const stepX=cols>1 ? Math.min(35,75/(cols-1)) : 0;
  const stepY=rows>1 ? Math.min(40,70/(rows-1)) : 0;
  return files.map((f,i)=>{
    const col=i%cols, row=Math.floor(i/cols);
    const inRow=(row===rows-1)?(n-row*cols):cols;
    const cx=50+(col-(inRow-1)/2)*stepX;
    const cy=50+(row-(rows-1)/2)*stepY;
    const jx=(pfRand(i+1)-0.5)*4, jy=(pfRand(i+7)-0.5)*4;
    const cxF=cl(cx+jx,10,90), cyF=cl(cy+jy,12,88);
    const rot=+((pfRand(i+3)-0.5)*12).toFixed(2);
    const ivx=Math.round((cxF-50)*6), ivy=Math.round((cyF-50)*6);
    return { f, ar:1, w, cx:cxF, cy:cyF, rot, ivx, ivy };
  });
}
const PHOTOS=buildPhotos(PF_FILES);

function initProfile(){
  const el=qs("#scrub"), wrap=qs("#pf-wrap"), stage=qs("#pf-stage");
  if(!el) return;
  const words=wrapScrubWords(el);

  if(stage){
    stage.innerHTML=PHOTOS.map((ph,i)=>{
      const c=CASCADE[i]||{l:(i%2)*46,t:Math.floor(i/2)*40,w:48,r:(i%2?4:-4),z:2+i};
      return '<div class="pol" style="left:'+c.l+'%;top:'+c.t+'%;width:'+c.w+'%;z-index:'+c.z+';--ar:'+ph.ar+';--rr:'+c.r+'deg;--mr:'+ph.rot+'deg;--i:'+i+'">'
        +'<div class="frame"><img src="'+PF_DIR+ph.f+'" alt="" loading="lazy" decoding="async"></div></div>';
    }).join("");
  }
  const pols=stage?qsa(".pol",stage):[];

  let pending=pols.length;
  pols.forEach(pol=>{
    const img=qs("img",pol); if(!img) { pending--; return; }
    const apply=()=>{
      if(img.naturalWidth&&img.naturalHeight)
        pol.style.setProperty("--ar",(img.naturalWidth/img.naturalHeight).toFixed(4));
      if(--pending<=0) requestAnimationFrame(()=>measure());
    };
    if(img.complete) apply(); else img.addEventListener("load",apply,{once:true}),
      img.addEventListener("error",apply,{once:true});
  });

  const PHOTO_AT=[0.03,0.24,0.42,0.60];

  if(stage && pols.length && !("IntersectionObserver" in window) && !window.requestAnimationFrame){
    pols.forEach(pol=>pol.classList.add("pol-in"));
  }

  const mq=window.matchMedia("(max-width:900px)");
  const easeOut=t=>1-Math.pow(1-t,3);
  const cl=(v,a,bb)=>Math.max(a,Math.min(bb,v));

  const maskEl=document.createElement("div");
  maskEl.className="scrub-mask";
  if(el.parentNode){ el.parentNode.insertBefore(maskEl,el); maskEl.appendChild(el); }

  const staticMode=()=>{
    if(wrap) wrap.style.height="";
    if(stage) stage.classList.add("no-anim");
    if(maskEl) maskEl.classList.remove("mob-teleprompt");
    el.style.transform="";
    words.forEach(w=>w.classList.add("lit"));
    pols.forEach(pp=>pp.classList.add("pol-in"));
  };
  if(REDUCED){ staticMode(); return; }

  const P0=0.06, P1=0.62, WIN=0.2, span=(P1-P0-WIN);
  let pinLen=0, wrapTop=0, mobile=false, mDist=0, wordTops=[], curP=null;

  const measure=()=>{
    mobile=mq.matches;
    if(mobile){

      maskEl.classList.remove("mob-teleprompt");
      el.style.transform="";
      if(stage) stage.classList.remove("no-anim");
      if(wrap) wrap.style.height="";
      pinLen=0; mDist=0;
      pols.forEach(pp=>{ pp.style.transform=""; pp.style.opacity=""; });
      return;
    }
    maskEl.classList.remove("mob-teleprompt");
    el.style.transform="";
    if(stage) stage.classList.remove("no-anim");
    pinLen=innerHeight*1.8;
    const stickyH=(wrap&&wrap.firstElementChild)?wrap.firstElementChild.getBoundingClientRect().height:innerHeight;
    if(wrap){ wrap.style.height=(pinLen+stickyH)+"px"; wrapTop=wrap.getBoundingClientRect().top+scrollY; }
  };

  const frame=()=>{
    if(!pinLen && !mobile) return;
    if(mobile){

      const r=el.getBoundingClientRect();
      const readLine=innerHeight*0.72;
      const p=cl((readLine-r.top)/Math.max(1,r.height),0,1);
      const lit=Math.floor(cl(p/0.9,0,1)*words.length);
      words.forEach((w,i)=>w.classList.toggle("lit",i<lit));
      for(let i=0;i<pols.length;i++){
        const t=(i<PHOTO_AT.length)?PHOTO_AT[i]:(0.03+0.6*i/Math.max(1,pols.length-1));
        if(p>=t) pols[i].classList.add("pol-in");
      }
      return;
    }
    const p=cl((scrollY-wrapTop)/pinLen,0,1);

    const lit=Math.floor(cl(p/0.9,0,1)*words.length);
    words.forEach((w,i)=>w.classList.toggle("lit",i<lit));

    for(let i=0;i<pols.length;i++){
      const t=(i<PHOTO_AT.length)?PHOTO_AT[i]:(0.03+0.6*i/Math.max(1,pols.length-1));
      if(p>=t) pols[i].classList.add("pol-in");
    }
  };

  measure();
  if(M.ticker) M.ticker.add(frame); else { addEventListener("scroll",frame,{passive:true}); frame(); }
  addEventListener("resize",measure);
  addEventListener("load",measure);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(measure);
}

function initSystems(){
  const rail=qs("#sys-rail"), grid=qs("#sys-grid");
  if(!rail||!grid) return;
  TECH_CATEGORIES.forEach(cat=>cat.subs.forEach((sub,j)=>{ sub.skey=cat.key+":"+j; }));

  let ti=0;
  grid.innerHTML=TECH_CATEGORIES.flatMap(cat=>
    cat.subs.flatMap(sub=>sub.tools.map(t=>{
      const d=(ti++)*22;
      return `<div class="tile" data-cat="${cat.key}" data-sub="${sub.skey}" title="${t.n} · ${sub.label}"
        style="--sc:${sub.color};--rd:${d}ms;--sf:${t.sf}">
        <div class="imgwrap"><img src="${TECH_DIR}${t.i}" alt="${t.n}" loading="lazy" decoding="async"></div>
        <span class="name">${t.n}</span>
      </div>`;
    }))
  ).join("");

  const tiles=qsa(".tile",grid);

  if(REDUCED||!("IntersectionObserver" in window)){ tiles.forEach(t=>t.classList.add("is-inview")); }
  else{
    const io=new IntersectionObserver(en=>en.forEach(x=>{
      if(x.isIntersecting){ x.target.classList.add("is-inview"); io.unobserve(x.target); }
    }),{threshold:0.1});
    tiles.forEach(t=>io.observe(t));
  }

  const total=ti, cEl=qs("#sys-count");
  if(cEl){
    if(REDUCED) cEl.textContent=total;
    else{
      const io2=new IntersectionObserver(en=>{
        if(!en[0].isIntersecting) return; io2.disconnect();
        const t0=performance.now();
        (function st(){
          const p=Math.min(1,(performance.now()-t0)/1300);
          cEl.textContent=Math.round(total*(1-Math.pow(1-p,3)));
          if(p<1) requestAnimationFrame(st);
        })();
      },{threshold:0.4});
      io2.observe(cEl);
    }
  }

  const setDim=(key,on)=>tiles.forEach(el=>el.classList.toggle("dim",on&&el.dataset.cat!==key));
  const setDimSub=(sk,on)=>tiles.forEach(el=>el.classList.toggle("dim",on&&el.dataset.sub!==sk));

  rail.innerHTML=TECH_CATEGORIES.map(cat=>{
    const total=cat.subs.reduce((a,s)=>a+s.tools.length,0);
    const rows=cat.subs.map(sub=>
      `<div class="sys-sub" data-sub="${sub.skey}" style="--sub:${sub.color}">
        <span class="sdot"></span>${sub.label}<span class="scnt">${sub.tools.length}</span>
      </div>`).join("");
    return `<div class="sys-cat-wrap" data-cat="${cat.key}">
      <button class="sys-cat" type="button" style="--cat:${cat.color}">
        <span class="dot"></span>${cat.label}<span class="cnt">${total}</span>
      </button>
      <div class="sys-subs">${rows}</div>
    </div>`;
  }).join("");

  qsa(".sys-cat-wrap",rail).forEach(wrap=>{
    const key=wrap.dataset.cat, btn=qs(".sys-cat",wrap);
    const on =()=>{ wrap.classList.add("open"); btn.classList.add("on"); setDim(key,true); };
    const off=()=>{ wrap.classList.remove("open"); btn.classList.remove("on"); setDim(key,false); };
    if(!TOUCH){
      wrap.addEventListener("mouseenter",on);
      wrap.addEventListener("mouseleave",off);
    }
    btn.addEventListener("click",()=>{
      const was=wrap.classList.contains("open");
      qsa(".sys-cat-wrap",rail).forEach(w=>{ w.classList.remove("open"); qs(".sys-cat",w).classList.remove("on"); });
      if(!was){ on(); } else setDim(key,false);
    });
    qsa(".sys-sub",wrap).forEach(row=>{
      row.addEventListener("mouseenter",()=>setDimSub(row.dataset.sub,true));
      row.addEventListener("mouseleave",()=>setDim(key,true));
    });
  });
}

function initFlightLog(){
  const wrap=qs("#fl-wrap"), track=qs("#fl-track");
  if(!wrap||!track) return;

  track.insertAdjacentHTML("beforeend", ORGS.map(o=>`
    <article class="fl-card${o.end==="Present"?" now":""}">
      <span class="fnode" aria-hidden="true"></span>
      <div class="flogo"><img src="${ORG_DIR}${o.img}" alt="${o.name}" loading="lazy" decoding="async" style="--osf:${o.sf}"></div>
      <div class="frole">${o.role}</div>
      <div class="fmeta"><b>${o.name}</b><br>${o.start} — ${o.end} · ${o.location}</div>
      <span class="ftag">${o.tag}</span>
      <div class="fyr">${o.end==="Present"?'<span class="factive"><span class="blip"></span>ACTIVE</span>':""}<span class="fyr-num">#${o.year}</span></div>
      <div class="fl-back" aria-hidden="true">
        <div class="fb-name">${esc(o.name)}</div>
        <div class="fb-desc">${esc(o.back||"More details coming soon.")}</div>
      </div>
    </article>`).join(""));

  /* Flip affordance: tease the first card (periodic back-side peek + FLIP
     cue) so viewers discover the cards flip; retire it on the first flip. */
  const cards=qsa(".fl-card",track);
  if(cards.length && !REDUCED){
    const first=cards[0];
    first.classList.add("fl-tease");
    const cue=document.createElement("span");
    cue.className="flip-cue";
    cue.setAttribute("aria-hidden","true");
    cue.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>FLIP';
    first.appendChild(cue);
  }
  const clearTease=()=>{
    qsa(".fl-tease",track).forEach(c=>c.classList.remove("fl-tease"));
    qsa(".flip-cue",track).forEach(q=>{
      q.classList.add("cue-off");
      setTimeout(()=>q.remove(),450);
    });
  };
  cards.forEach(card=>{
    let ft=null;
    card.addEventListener("click",()=>{
      clearTease();
      const willFlip=!card.classList.contains("flipped");
      card.classList.toggle("flipped");
      if(ft){ clearTimeout(ft); ft=null; }
      if(willFlip) ft=setTimeout(()=>{ card.classList.remove("flipped"); ft=null; },5000);
    });
  });

  const rocket=qs("#fl-rocket"), prog=qs("#fl-progress"), path=qs(".fl-path",track);
  const mqMobile=window.matchMedia("(max-width: 820px)");
  if(REDUCED) return;

  const NOZZLE=55, NOSE=133.5;

  let lenA=0, lenB=0, wrapTop=0, active=false;
  let rocketStart=innerWidth*0.5, rocketEnd=0, routeEnd=0;

  let activeM=false, lastSM=0;
  const clM=(v,a,b)=>Math.max(a,Math.min(b,v));
  const measureMobile=()=>{
    active=false; activeM=true;
    wrap.style.height=""; track.style.transform="";

    if(path){ path.style.width=""; path.style.left=""; }
    if(prog){ prog.style.width=""; prog.style.left=""; }
    qsa(".fl-card",track).forEach(c=>{ c.style.transform=""; c.style.opacity=""; c.style.zIndex=""; });
  };
  const updMobile=()=>{
    if(!activeM) return;
    const r=track.getBoundingClientRect();
    const trackH=r.height||1;
    const p=clM((innerHeight*0.5 - r.top)/trackH,0,1);
    const RH=120*0.62;
    const cTop=8+RH/2, cBot=Math.max(cTop, trackH-8-RH/2);
    const center=cTop+(cBot-cTop)*p;
    const ty=center-21;
    const vel=scrollY-lastSM; lastSM=scrollY;
    const th=1+Math.min(1.15,Math.abs(vel)*0.02);
    rocket.style.transform="translateY("+ty.toFixed(1)+"px) rotate(90deg) scale(0.62)";
    rocket.style.setProperty("--thrust",th.toFixed(3));
    rocket.classList.toggle("is-thrusting",Math.abs(vel)>0.5);
    if(prog) prog.style.height=Math.max(0,center-8).toFixed(1)+"px";
  };

const measure=()=>{
  if(mqMobile.matches){ measureMobile(); return; }
  active=true; activeM=false;

  qsa(".fl-card",track).forEach(c=>{ c.style.transform=""; c.style.opacity=""; c.style.zIndex=""; });
  if(prog) prog.style.height="";
  const vw=innerWidth;
  const tR=track.getBoundingClientRect();
  const nodes=qsa(".fnode",track);
  const cards=qsa(".fl-card",track);
  const cx=el=>{ const r=el.getBoundingClientRect(); return r.left+r.width/2-tR.left; };
  rocketStart=nodes.length?cx(nodes[0]):vw*0.5;

  const lastCard = cards[cards.length - 1];
  let lastCardRight = track.scrollWidth;
  if(lastCard) {
    const r = lastCard.getBoundingClientRect();
    lastCardRight = r.right - tR.left + 30;
  }

  routeEnd = nodes.length ? cx(nodes[nodes.length-1]) : track.scrollWidth;
  rocketEnd = Math.max(rocketStart, lastCardRight - (NOSE - NOZZLE));
  lenA=Math.max(0, track.scrollWidth - vw);
  lenB=Math.max(0, rocketEnd-(lenA+rocketStart));
  wrap.style.height=(lenA+lenB+innerHeight)+"px";
  wrapTop=wrap.getBoundingClientRect().top + scrollY;
  if(path) path.style.width=routeEnd+"px";
};

  let rx=rocketStart, lastS=0, tgtVel=0, curVel=0, curTh=1, raf=0, idle=0;
  const paint=()=>{
    curVel+=(tgtVel-curVel)*0.16;
    tgtVel*=0.9;
    const rot=Math.max(-12,Math.min(12,-curVel*0.5));
    const th=1+Math.min(1.15,Math.abs(curVel)*0.055);
    curTh+=(th-curTh)*0.2;
    rocket.style.transform=`translateX(${rx.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
    rocket.style.setProperty("--thrust",curTh.toFixed(3));
    rocket.classList.toggle("is-thrusting",Math.abs(curVel)>0.5);
  };
  const loop=()=>{ paint(); idle++; raf=(idle<140)?requestAnimationFrame(loop):0; };
  const kick=()=>{ idle=0; if(!raf) raf=requestAnimationFrame(loop); };

  const upd=()=>{
    if(activeM){ updMobile(); return; }
    if(!active) return;
    const s=Math.max(0,Math.min(lenA+lenB, scrollY-wrapTop));
    track.style.transform=`translate3d(${(-Math.min(s,lenA)).toFixed(1)}px,0,0)`;
    rx=Math.min(rocketEnd, rocketStart+s);
    prog.style.width=Math.max(0,rx).toFixed(1)+"px";
    tgtVel=Math.max(-42,Math.min(42, s-lastS)); lastS=s;
    kick();
  };

  measure(); rx=rocketStart; lastS=Math.max(0,Math.min(lenA+lenB, scrollY-wrapTop)); upd();
  addEventListener("resize",()=>{ measure(); upd(); });
  addEventListener("load",()=>{ measure(); upd(); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ measure(); upd(); });
  addEventListener("scroll",upd,{passive:true});
}

function initEducation(){
  const grid=qs("#edu-grid"); if(!grid) return;
  grid.className="edu-ledger";
  grid.innerHTML=EDUCATION.map((e,i)=>`
    <article class="edu-row" data-reveal style="--rd:${i*110}ms">
      <div class="edu-head">
        <div class="edu-idx">
          <span class="n">0${i+1}</span>
          <span class="yrs">${e.years}</span>
          <span class="loc">${e.loc}</span>
        </div>
        <div class="edu-main">
          <h3 class="name">${e.name}</h3>
          <p class="deg">${e.title}</p>
        </div>
      </div>
      <div class="edu-logo"><img src="${EDU_DIR}${e.img}" alt="${e.name}" loading="lazy" decoding="async" style="--esf:${e.sf}"></div>
      <p class="blurb">${e.blurb}</p>
    </article>`).join("");
  qsa(".edu-row",grid).forEach(el=>{ if(M.observe) M.observe(el); });

  const rows=qsa(".edu-row",grid);
  const setActive=()=>{
    const mid=innerHeight*0.5; let best=null,bd=Infinity;
    for(const r of rows){
      const b=r.getBoundingClientRect();
      if(b.bottom<40||b.top>innerHeight-40) continue;
      const d=Math.abs(b.top+b.height/2-mid);
      if(d<bd){ bd=d; best=r; }
    }
    for(const r of rows) r.classList.toggle("lit",r===best);
  };
  if(M.ticker) M.ticker.add(setActive); else addEventListener("scroll",setActive,{passive:true});
  addEventListener("resize",setActive); setActive();
}

const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

async function initMissions(){
  const root=qs("#mrows"); if(!root) return;
  let projects=[];
  try{
    const rows=await PortfolioData.load("projects");
    projects=rows.map(r=>({
      id:(r.ID||"").trim(), title:(r.Title||"").trim(), desc:(r.Description||"").trim(),
      thumb:(r.Thumbnail||"").trim(), tags:(r.Tags||"").trim()
    })).sort((a,b)=>b.id.localeCompare(a.id,undefined,{numeric:true})); // descending: newest (highest ID) first
  }catch(_){
    root.innerHTML=`<div class="empty-state" style="padding:44px 10px;">MISSION DATA OFFLINE — run the local server (see README) or visit the Projects page.</div>`;
    return;
  }

  root.innerHTML=projects.map((p,i)=>{
    const award=p.desc||"In development";
    const isAward=/win|award|grant|semi|best/i.test(award);
    return `<a class="mrow" href="projects/index.html" data-cursor="OPEN" data-thumb="${p.thumb?("projects/"+esc(p.thumb)):""}" data-tag="${esc(p.tags)}">
      <span class="mi">${String(i+1).padStart(2,"0")}</span>
      <span class="mt">
        <h3>${esc(p.title)}</h3>
        <span class="md${isAward?" aw":""}">${isAward?'<span class="aw">◆ </span>':""}${esc(award)}</span>
      </span>
      <span class="ma"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
    </a>`;
  }).join("");

  qsa(".mrow",root).forEach((el,i)=>{
    el.setAttribute("data-reveal","");
    el.style.setProperty("--rd",(i*60)+"ms");
    if(M.observe) M.observe(el);
  });

  const prev=qs("#mprev"), pimg=qs("#mprev-img"), ptag=qs("#mprev-tag");
  if(!prev||TOUCH||REDUCED) return;
  const pos={x:0,y:0}, cur={x:0,y:0};
  let show=false;
  addEventListener("mousemove",e=>{ pos.x=e.clientX; pos.y=e.clientY; },{passive:true});
  M.ticker.add(()=>{
    cur.x=M.lerp(cur.x,pos.x,0.12); cur.y=M.lerp(cur.y,pos.y,0.12);
    prev.style.left=(cur.x+26)+"px";
    prev.style.top =(cur.y-90)+"px";
  });
  qsa(".mrow",root).forEach(el=>{
    el.addEventListener("mouseenter",()=>{
      const t=el.dataset.thumb;
      if(!t){ prev.classList.remove("on"); show=false; return; }
      pimg.src=t; ptag.textContent=el.dataset.tag||"";
      prev.classList.add("on"); show=true;
    });
    el.addEventListener("mouseleave",()=>{ prev.classList.remove("on"); show=false; });
  });
}

async function initCounts(){
  const grab=async(sheet)=>{
    try{ return (await PortfolioData.load(sheet)).length; }
    catch(_){ return null; }
  };
  const [p,c,f]=await Promise.all([ grab("projects"), grab("certificates"), grab("featured") ]);
  const set=(id,v)=>{ const el=qs("#"+id); if(el&&v!=null) el.textContent="["+String(v).padStart(2,"0")+"]"; };
  set("cnt-projects",p); set("cnt-certs",c); set("cnt-featured",f);
}

function initAceWord(){
  const el=qs("#ace-word"); if(!el) return;
  const from="NONE", to="SOME";
  const GLYPHS="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_";

  if(REDUCED){ el.textContent=to; el.style.color="var(--burn)"; return; }

  const run=()=>{

    setTimeout(()=>{
      const D=420, t0=performance.now();
      const timer=setInterval(()=>{
        const p=Math.min(1,(performance.now()-t0)/D);
        const solid=Math.floor(to.length*p);
        let out=to.slice(0,solid);
        for(let i=solid;i<to.length;i++)
          out+=GLYPHS[Math.floor(Math.random()*GLYPHS.length)];
        el.textContent=out;
        if(p>=1){
          clearInterval(timer);
          el.textContent=to;
          el.style.color="var(--burn)";
        }
      },28);
    }, 640+900+2500);
  };

  if(document.body.classList.contains("booted")){ run(); return; }
  const mo=new MutationObserver(()=>{
    if(document.body.classList.contains("booted")){ mo.disconnect(); run(); }
  });
  mo.observe(document.body,{attributes:true,attributeFilter:["class"]});
}

function initPeek(){
  const peek=qs("#c-peek"); if(!peek) return;
  peek.addEventListener("click",()=>{
    peek.classList.remove("boop"); void peek.offsetWidth; peek.classList.add("boop");
  });
}

async function init(){
  prepHeadline();
  runBoot();
  initOrbit();
  initProfile();
  initAceWord();
  initPeek();
  try{
    const [tech,orgs,edu,personas]=await Promise.all([
      PortfolioData.load("techstack"),
      PortfolioData.load("organisations"),
      PortfolioData.load("education"),
      PortfolioData.load("personas")
    ]);
    TECH_CATEGORIES=buildTech(tech);
    ORGS=buildOrgs(orgs);
    EDUCATION=buildEducation(edu);
    PERSONAS=buildPersonas(personas);
  }catch(err){ console.error("Portfolio data failed to load:",err); }
  initPersona();
  initSystems();
  initFlightLog();
  initEducation();
  initMissions();
  initCounts();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
else init();
})();
