/* ---------------------------------------------- analytics (GoatCounter) --
   Defined here because mission.js is the one file every page loads, so
   views are recorded sitewide and the header counters read the same
   source. initStats() below reads window.GC_CODE.
   Note: localhost is deliberately NOT counted, so local previews via
   serve.bat never pollute the real numbers.                              */
window.GC_CODE = "vcperera";
(function loadGoatCounter(){
  if(!window.GC_CODE) return;
  var s=document.createElement("script");
  s.async=true;
  s.src="//gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter","https://"+window.GC_CODE+".goatcounter.com/count");
  (document.head||document.documentElement).appendChild(s);
})();


(function(){
"use strict";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TOUCH   = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const qs  = (s,c)=> (c||document).querySelector(s);
const qsa = (s,c)=> Array.from((c||document).querySelectorAll(s));
const lerp = (a,b,t)=> a+(b-a)*t;
const clamp = (v,mn,mx)=> Math.max(mn,Math.min(mx,v));

const ticker = (()=> {
  const fns = new Set();
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.05,(now-last)/1000); last = now;
    fns.forEach(f=>f(dt,now));
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return { add:f=>fns.add(f), remove:f=>fns.delete(f) };
})();

const scrollState = { y:window.scrollY, vel:0 };
(function(){
  let lastY = window.scrollY;
  ticker.add(()=>{
    const y = window.scrollY;
    scrollState.vel = lerp(scrollState.vel, y-lastY, 0.12);
    scrollState.y = y; lastY = y;
  });
})();

function initStars(){
  const cv = qs("#stars"); if(!cv || REDUCED) return;
  const ctx = cv.getContext("2d");
  const DPR = Math.min(1.6, window.devicePixelRatio||1);
  let W,H,stars=[],shoot=null,shootTimer=4,warpLevel=0;
  const mouse = {x:0.5,y:0.5,tx:0.5,ty:0.5};

  function size(){
    W = cv.width  = Math.floor(innerWidth*DPR);
    H = cv.height = Math.floor(innerHeight*DPR);
    cv.style.width = innerWidth+"px"; cv.style.height = innerHeight+"px";
    const n = Math.floor((innerWidth*innerHeight)/3400);
    stars = Array.from({length:n},()=>({
      x:Math.random()*W, y:Math.random()*H,
      z:Math.random(),
      r:(Math.random()*1.1+0.3)*DPR,
      tw:Math.random()*Math.PI*2,
      ts:0.4+Math.random()*1.4
    }));
  }
  size(); addEventListener("resize",size);
  if(!TOUCH) addEventListener("mousemove",e=>{ mouse.tx=e.clientX/innerWidth; mouse.ty=e.clientY/innerHeight; },{passive:true});

  let visible = true;
  new IntersectionObserver(en=>{visible = en[0].isIntersecting;}).observe(cv);
  document.addEventListener("visibilitychange",()=>{ visible = !document.hidden; });

  ticker.add((dt,now)=>{
    if(!visible) return;
    mouse.x = lerp(mouse.x,mouse.tx,0.03); mouse.y = lerp(mouse.y,mouse.ty,0.03);
    ctx.clearRect(0,0,W,H);
    const px=(mouse.x-0.5)*30*DPR, py=(mouse.y-0.5)*22*DPR, sy=scrollState.y*0.04*DPR;
    for(const s of stars){
      const d=0.25+s.z*0.75;
      let x=s.x - px*d, y=(s.y - py*d - sy*d);
      y=((y%H)+H)%H; x=((x%W)+W)%W;
      const a=(0.18 + 0.5*s.z + 0.32*Math.sin(now/1000*s.ts + s.tw))*(1-warpLevel*0.88);
      ctx.globalAlpha=clamp(a,0.05,0.85);
      ctx.fillStyle = s.z>0.82 ? "#cfe0ff" : "#8fa8d8";
      ctx.beginPath(); ctx.arc(x,y,s.r*d,0,7); ctx.fill();
    }

    shootTimer-=dt;
    if(shootTimer<=0 && !shoot){
      shootTimer=6+Math.random()*9;
      shoot={x:Math.random()*W*0.7+W*0.15, y:Math.random()*H*0.35, vx:(0.5+Math.random()*0.4)*W, vy:(0.16+Math.random()*0.12)*H, life:0.9};
    }
    if(shoot){
      shoot.life-=dt; shoot.x+=shoot.vx*dt; shoot.y+=shoot.vy*dt;
      const g=ctx.createLinearGradient(shoot.x,shoot.y,shoot.x-shoot.vx*0.12,shoot.y-shoot.vy*0.12);
      g.addColorStop(0,"rgba(200,220,255,"+clamp(shoot.life,0,0.8)+")"); g.addColorStop(1,"rgba(200,220,255,0)");
      ctx.strokeStyle=g; ctx.lineWidth=1.4*DPR; ctx.globalAlpha=1;
      ctx.beginPath(); ctx.moveTo(shoot.x,shoot.y);
      ctx.lineTo(shoot.x-shoot.vx*0.12,shoot.y-shoot.vy*0.12); ctx.stroke();
      if(shoot.life<=0||shoot.x>W+60||shoot.y>H+60) shoot=null;
    }

    {
      const wd=window._starWarpDir||0;
      if(wd!==0){
        warpLevel=clamp(warpLevel+wd*dt*2.5,0,1);
        if(warpLevel>=1||warpLevel<=0) window._starWarpDir=0;
      }
      if(warpLevel>0){
        const cx=W/2,cy=H/2;

        if(!stars[0]._wi){
          for(const s of stars){
            s._wi=true;
            s.wx=s.x; s.wy=s.y;
            const dx=s.wx-cx,dy=s.wy-cy,m=Math.sqrt(dx*dx+dy*dy)||0.01;
            s.wdx=dx/m; s.wdy=dy/m;
            s.wbase=(0.35+s.z*0.65)*220;
          }
        }
        for(const s of stars){
          const spd=s.wbase*warpLevel*3*DPR;
          s.wx+=s.wdx*spd*dt; s.wy+=s.wdy*spd*dt;

          if(s.wx<-90||s.wx>W+90||s.wy<-90||s.wy>H+90){
            const ang=Math.random()*Math.PI*2,d2=Math.random()*60;
            s.wx=cx+Math.cos(ang)*d2; s.wy=cy+Math.sin(ang)*d2;
            s.wdx=Math.cos(ang); s.wdy=Math.sin(ang);
            s.wbase=(0.35+s.z*0.65)*220; s._wi=true;
          }
          const tl=clamp(spd*dt*9,3,280);
          const wa=clamp(0.38+s.z*0.52+warpLevel*0.28,0,0.96);
          ctx.globalAlpha=1;
          if(tl>7){
            const gw=ctx.createLinearGradient(s.wx,s.wy,s.wx-s.wdx*tl,s.wy-s.wdy*tl);
            gw.addColorStop(0,`rgba(210,230,255,${wa})`);
            gw.addColorStop(1,"rgba(210,230,255,0)");
            ctx.strokeStyle=gw;
            ctx.lineWidth=(s.r*(0.75+s.z*0.5))*DPR*(1+warpLevel*0.65);
            ctx.beginPath(); ctx.moveTo(s.wx,s.wy);
            ctx.lineTo(s.wx-s.wdx*tl,s.wy-s.wdy*tl); ctx.stroke();
          } else {
            ctx.globalAlpha=wa; ctx.fillStyle="#cfe0ff";
            ctx.beginPath(); ctx.arc(s.wx,s.wy,s.r*DPR,0,7); ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha=1;
  });
}

function initCursor(){
  if(TOUCH || REDUCED) return;
  const dot=document.createElement("div"); dot.className="cur-dot";
  const ring=document.createElement("div"); ring.className="cur-ring";
  const label=document.createElement("span"); label.className="cur-label";
  ring.appendChild(label);
  document.body.appendChild(dot); document.body.appendChild(ring);
  document.body.classList.add("has-cursor","cur-hidden");

  const pos={x:innerWidth/2,y:innerHeight/2}, rp={x:pos.x,y:pos.y};
  let seen=false;
  addEventListener("mousemove",e=>{
    pos.x=e.clientX; pos.y=e.clientY;
    if(!seen){ seen=true; rp.x=pos.x; rp.y=pos.y; document.body.classList.remove("cur-hidden"); }
  },{passive:true});
  document.addEventListener("mouseleave",()=>document.body.classList.add("cur-hidden"));
  document.addEventListener("mouseenter",()=>{ if(seen) document.body.classList.remove("cur-hidden"); });

  ticker.add(()=>{
    rp.x=lerp(rp.x,pos.x,0.16); rp.y=lerp(rp.y,pos.y,0.16);
    dot.style.transform=`translate(${pos.x}px,${pos.y}px)`;
    ring.style.transform=`translate(${rp.x}px,${rp.y}px)`;
  });

  const HOT="a,button,[role='button'],.dd-btn,.tag,.so-row,input,textarea,select,summary";
  document.addEventListener("mouseover",e=>{
    const lab=e.target.closest("[data-cursor]");
    if(lab){ label.textContent=lab.getAttribute("data-cursor")||"VIEW";
      ring.classList.add("is-label"); ring.classList.remove("is-hover"); return; }
    ring.classList.remove("is-label");
    ring.classList.toggle("is-hover", !!e.target.closest(HOT));
  });
  document.addEventListener("mouseout",e=>{
    if(e.target.closest("[data-cursor]") && !(e.relatedTarget&&e.relatedTarget.closest("[data-cursor]")))
      ring.classList.remove("is-label");
  });
}

function initMagnetic(){
  if(TOUCH || REDUCED) return;
  qsa("[data-magnetic]").forEach(el=>{
    const strength = parseFloat(el.dataset.magnetic)||0.3;
    let raf=null;
    el.addEventListener("mousemove",e=>{
      const r=el.getBoundingClientRect();
      const dx=(e.clientX-(r.left+r.width/2))*strength;
      const dy=(e.clientY-(r.top+r.height/2))*strength;
      if(raf) cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{ el.style.transform=`translate(${dx}px,${dy}px)`; });
    });
    el.addEventListener("mouseleave",()=>{
      if(raf) cancelAnimationFrame(raf);
      el.style.transition="transform 600ms cubic-bezier(0.22,1,0.36,1)";
      el.style.transform="translate(0,0)";
      setTimeout(()=>{ el.style.transition=""; },600);
    });
  });
}

function splitEl(el){
  if(el.dataset.splitDone) return;
  el.dataset.splitDone="1";
  const mode = el.dataset.split||"words";
  const step = parseFloat(el.dataset.splitStep|| (mode==="chars"?24:46));
  const base = parseFloat(el.dataset.splitDelay||0);
  const text = el.textContent;
  el.textContent="";
  el.setAttribute("aria-label",text);
  let i=0;
  text.split(/(\s+)/).forEach(tok=>{
    if(!tok) return;
    if(/^\s+$/.test(tok)){ el.appendChild(document.createTextNode(" ")); return; }
    if(mode==="chars"){
      /* Wrap each word's chars in a no-wrap holder so narrow viewports can
         only break between words, never mid-word. */
      const word=document.createElement("span");
      word.className="sp-word"; word.setAttribute("aria-hidden","true");
      word.style.whiteSpace="nowrap"; word.style.display="inline-block";
      for(const ch of tok){
        const w=document.createElement("span"); w.className="sp-w"; w.setAttribute("aria-hidden","true");
        const s=document.createElement("span"); s.className="sp-i"; s.textContent=ch;
        s.style.setProperty("--sd",(base+i*step)+"ms");
        w.appendChild(s); word.appendChild(w); i++;
      }
      el.appendChild(word);
    } else {
      const w=document.createElement("span"); w.className="sp-w"; w.setAttribute("aria-hidden","true");
      const s=document.createElement("span"); s.className="sp-i"; s.textContent=tok;
      s.style.setProperty("--sd",(base+i*step)+"ms");
      w.appendChild(s); el.appendChild(w); i++;
    }
  });
}

let revealIO=null;
function observe(el){ if(revealIO) revealIO.observe(el); else el.classList.add("is-inview"); }
function initReveal(){
  qsa("[data-split]").forEach(splitEl);
  const targets = qsa("[data-reveal],[data-split],.sec-head");
  if(REDUCED || !("IntersectionObserver" in window)){
    targets.forEach(el=>el.classList.add("is-inview")); return;
  }
  revealIO = new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(en.isIntersecting){ en.target.classList.add("is-inview"); revealIO.unobserve(en.target); }
    });
  },{threshold:0.12,rootMargin:"0px 0px -8% 0px"});
  targets.forEach(el=>revealIO.observe(el));
}

const GLYPHS="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_";
function scramble(el,duration){
  const target=el.dataset.scrambleText||el.textContent;
  el.dataset.scrambleText=target;
  if(el._scrTimer) clearInterval(el._scrTimer);
  const D=duration||420; const t0=performance.now();
  el._scrTimer=setInterval(()=>{
    const p=clamp((performance.now()-t0)/D,0,1);
    const solid=Math.floor(target.length*p);
    let out=target.slice(0,solid);
    for(let i=solid;i<target.length;i++)
      out += target[i]===" "?" ":GLYPHS[Math.floor(Math.random()*GLYPHS.length)];
    el.textContent=out;
    if(p>=1){ clearInterval(el._scrTimer); el._scrTimer=null; el.textContent=target; }
  },28);
}
function initScramble(){
  if(REDUCED) return;
  qsa("[data-scramble]").forEach(el=>{
    const idxSpan=el.querySelector(".idx");
    if(idxSpan){

      el.addEventListener("mouseenter",()=>{
        let textNode=null;
        for(const n of el.childNodes){
          if(n.nodeType===3&&n.textContent.trim()){textNode=n;break;}
        }
        if(!textNode) return;
        const target=textNode.textContent;
        if(el._scrTimer) clearInterval(el._scrTimer);
        const D=420,t0=performance.now();
        el._scrTimer=setInterval(()=>{
          const p=clamp((performance.now()-t0)/D,0,1);
          const solid=Math.floor(target.length*p);
          let out=target.slice(0,solid);
          for(let i=solid;i<target.length;i++)
            out+=target[i]===" "?" ":GLYPHS[Math.floor(Math.random()*GLYPHS.length)];
          textNode.textContent=out;
          if(p>=1){clearInterval(el._scrTimer);el._scrTimer=null;textNode.textContent=target;}
        },28);
      });
    } else {
      el.addEventListener("mouseenter",()=>scramble(el));
    }
  });
}

function initCounters(){
  const els=qsa("[data-count]");
  if(!els.length) return;
  const run=el=>{
    const end=parseFloat(el.dataset.count)||0;
    const dur=parseFloat(el.dataset.countDur)||1600;
    const pad=el.dataset.countPad?parseInt(el.dataset.countPad,10):0;
    const suf=el.dataset.countSuffix||"";
    if(REDUCED){ el.textContent=String(end).padStart(pad,"0")+suf; return; }
    const t0=performance.now();
    (function step(){
      const p=clamp((performance.now()-t0)/dur,0,1);
      const e=1-Math.pow(1-p,4);
      let v=String(Math.round(end*e));
      if(pad) v=v.padStart(pad,"0");
      el.textContent=v+suf;
      if(p<1) requestAnimationFrame(step);
    })();
  };
  const io=new IntersectionObserver(en=>{
    en.forEach(x=>{ if(x.isIntersecting){ run(x.target); io.unobserve(x.target); } });
  },{threshold:0.5});
  els.forEach(el=>io.observe(el));
}

function initMarquee(){
  qsa(".mq").forEach(mq=>{
    const track=qs(".mq-track",mq); if(!track||REDUCED) return;
    const seg=qs(".mq-seg",track); if(!seg) return;
    /* Ensure the track always covers the viewport with a full spare segment,
       re-checking after web fonts land and on resize/rotation so no end of
       the banner is ever left chopped. */
    const ensure=()=>{
      const w0=seg.offsetWidth; if(w0<=0) return;
      let guard=0;
      while(track.scrollWidth < innerWidth + 2*w0 && guard++<40)
        track.appendChild(seg.cloneNode(true));
    };
    ensure();
    addEventListener("resize",ensure);
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(ensure);
    let x=0; const base=parseFloat(mq.dataset.speed)||55;
    let visible=true;
    new IntersectionObserver(en=>{visible=en[0].isIntersecting;}).observe(mq);
    ticker.add(dt=>{
      if(!visible) return;
      const w=seg.offsetWidth;
      if(w<=0) return;
      x -= (base + Math.min(340,Math.abs(scrollState.vel)*26))*dt;
      if(-x>=w) x+=w;
      track.style.transform=`translate3d(${x}px,0,0)`;
    });
  });
}

function initNav(){
  const bar=qs(".nav");
  if(bar){
    let last=scrollY;
    addEventListener("scroll",()=>{
      const y=scrollY;
      if(Math.abs(y-last)<6) return;
      if(document.body.classList.contains("menu-open")){ last=y; return; }
      bar.classList.toggle("nav-hidden", y>last && y>90);
      last=y;
    },{passive:true});
  }

  const burger=qs(".nav-burger");
  if(burger){
    burger.addEventListener("click",()=>{
      const open=document.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded",open?"true":"false");
      document.body.style.overflow=open?"hidden":"";
    });
    qsa(".mmenu a").forEach(a=>a.addEventListener("click",()=>{
      document.body.classList.remove("menu-open");
      document.body.style.overflow="";
    }));
  }

  const clock=qs("[data-clock]");
  if(clock){
    const tick=()=>{ clock.innerHTML="<b>UTC</b> "+new Date().toISOString().slice(11,19); };
    tick(); setInterval(tick,1000);
  }

  const alt=qs("[data-alt]");
  if(alt){
    const upd=()=>{
      const max=document.documentElement.scrollHeight-innerHeight;
      const p = max > 0 ? Math.round((max - scrollY) / max * 100) : 0;
      alt.innerHTML="ALT <b>"+String(p).padStart(3,"0")+"%</b>";
    };
    addEventListener("scroll",upd,{passive:true}); upd();
  }
}

function initStats(){
  const viewsEl=qs("#stat-views"), visEl=qs("#stat-visitors");
  if(!viewsEl && !visEl) return;
  const code=window.GC_CODE;
  const fmt=n=>{
    n=+n||0;
    const c=(v,s)=>{ let t=v.toFixed(1); if(t.slice(-2)===".0") t=t.slice(0,-2); return t+s; };
    if(n>=1e6) return c(n/1e6,"M");
    if(n>=1e3) return c(n/1e3,"k");
    return String(n);
  };
  const set=(el,v)=>{ if(el){ el.textContent=fmt(v); el.classList.remove("loading"); } };
  if(!code || code==="YOUR_CODE_HERE"){ if(viewsEl)viewsEl.textContent="—"; if(visEl)visEl.textContent="—"; return; }
  const base="https://"+code+".goatcounter.com/counter/";
  fetch(base+"TOTAL.json").then(r=>r.json()).then(d=>set(viewsEl,d.count)).catch(()=>{});
  fetch(base+"TOTAL.json?unique=1").then(r=>r.json()).then(d=>set(visEl,d.count)).catch(()=>{});
}

function initTransitions(){

  if(document.documentElement.classList.contains("pt-enter")){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      document.documentElement.classList.add("pt-leave");
      setTimeout(()=>{ document.documentElement.classList.remove("pt-enter","pt-leave"); },780);
    }));
  }
  if(REDUCED) return;

  document.addEventListener("click",e=>{
    const a=e.target.closest("a[href]");
    if(!a) return;
    if(a.target==="_blank"||a.hasAttribute("download")||a.getAttribute("href").startsWith("#")) return;
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    const url=new URL(a.href,location.href);
    if(url.origin!==location.origin) return;
    if(url.pathname===location.pathname && url.hash) return;
    e.preventDefault();
    try{ sessionStorage.setItem("ptNav","1"); }catch(_){}
    document.body.classList.add("pt-exiting");
    window._starWarpDir=1;
    setTimeout(()=>{ location.href=url.href; },460);
  });

  addEventListener("pageshow",e=>{
    if(e.persisted){
      document.body.classList.remove("pt-exiting");
      document.documentElement.classList.remove("pt-enter","pt-leave");
      window._starWarpDir=0;
    }
  });
}

function initTilt(){
  if(TOUCH||REDUCED) return;
  qsa("[data-tilt]").forEach(el=>{
    const max=parseFloat(el.dataset.tilt)||6;
    el.style.transformStyle="preserve-3d";
    el.addEventListener("mousemove",e=>{
      const r=el.getBoundingClientRect();
      const rx=((e.clientY-r.top)/r.height-0.5)*-2*max;
      const ry=((e.clientX-r.left)/r.width-0.5)*2*max;
      el.style.transform=`perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    });
    el.addEventListener("mouseleave",()=>{
      el.style.transition="transform 700ms cubic-bezier(0.22,1,0.36,1)";
      el.style.transform="perspective(900px) rotateX(0) rotateY(0)";
      setTimeout(()=>{ el.style.transition=""; },700);
    });
  });
}

function initParallax(){
  if(REDUCED) return;
  const els=qsa("[data-plx]").map(el=>({el,f:parseFloat(el.dataset.plx)||0.15}));
  if(!els.length) return;
  ticker.add(()=>{
    const vh=innerHeight;
    for(const o of els){
      const r=o.el.getBoundingClientRect();
      if(r.bottom<-140||r.top>vh+140) continue;
      const d=(r.top+r.height/2-vh/2)*o.f;
      o.el.style.transform=`translate3d(0,${d.toFixed(1)}px,0)`;
    }
  });
}

function boot(){
  initStars(); initCursor(); initMagnetic(); initReveal(); initScramble();
  initCounters(); initMarquee(); initNav(); initStats(); initTransitions();
  initTilt(); initParallax();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();

window.Mission={REDUCED,TOUCH,ticker,scrollState,splitEl,observe,scramble,lerp,clamp};
})();
