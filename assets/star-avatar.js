
(function () {
  "use strict";
  var REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOUCH = matchMedia("(pointer: coarse)").matches;
  var SHEET = "assets/memoji/track/star-expr.webp";
  var FALLBACK = "assets/memoji/star-source.png";
  var NAMES = ["neutral","hmm","stern","frown","down-glance",
               "side-look","grin","soft","eye-roll","wonder"];
  var NF = 10, COLS = 5, ROWS = 2;
  var TARGET = 46000, ATH = 130, CONTRAST = 1.08;
  var OVERSIZE = 1.9;
  var DUR = 0.5;
  var INTRO_DUR = 0.9;

  function mount(host) {
    if (!host || host.__vishStars) return;
    host.__vishStars = true;
    host.style.position = "relative";
    host.style.aspectRatio = "1 / 1";
    host.setAttribute("role", "img");
    host.setAttribute("aria-label",
      "Vishal's Memoji avatar formed by thousands of stars. On a computer, " +
      "circling the mouse around it cycles his expressions; on a phone, tap " +
      "the avatar to change his expression.");
    var im = new Image();
    im.onload = function () { build(host, im); };
    im.onerror = function () { fallback(host); };
    im.decoding = "async";
    im.src = SHEET;
  }

  function fallback(host) {
    if (host.__vishFell) return; host.__vishFell = true;
    var im = document.createElement("img");
    im.src = FALLBACK; im.alt = "";
    im.style.cssText = "position:absolute;inset:0;margin:auto;max-width:72%;max-height:80%;";
    host.appendChild(im);
  }

  function build(host, img) {
    var sw = img.naturalWidth, shh = img.naturalHeight;
    var TW = (sw / COLS) | 0, TH = (shh / ROWS) | 0;
    var off = document.createElement("canvas"); off.width = sw; off.height = shh;
    var g2 = off.getContext("2d", { willReadFrequently: true });
    g2.drawImage(img, 0, 0);
    var D;
    try { D = g2.getImageData(0, 0, sw, shh).data; }
    catch (e) { console.warn("star-avatar: canvas tainted (serve over http)."); return fallback(host); }

    function A(e,x,y){ var tx=(e%COLS)*TW+x, ty=((e/COLS)|0)*TH+y; return D[(ty*sw+tx)*4+3]; }
    function RGBv(e,x,y){ var tx=(e%COLS)*TW+x, ty=((e/COLS)|0)*TH+y, i=(ty*sw+tx)*4; return [D[i],D[i+1],D[i+2]]; }
    function punch(v){ var c=((v/255)-0.5)*CONTRAST+0.5; return c<0?0:c>1?1:c; }

    var det=[], maxA=new Float32Array(TW*TH), detAvg=new Float32Array(TW*TH);
    var nb=[[1,0],[-1,0],[0,1],[0,-1]], e,x,y,q;
    for (e=0;e<NF;e++){
      var dm=new Float32Array(TW*TH);
      for (y=0;y<TH;y++) for (x=0;x<TW;x++){
        var a0=A(e,x,y); var id=y*TW+x; if(a0>maxA[id])maxA[id]=a0;
        if(a0<=ATH){dm[id]=0;continue;}
        var c0=RGBv(e,x,y),gg=0,k=0;
        for(q=0;q<4;q++){var nx=x+nb[q][0],ny=y+nb[q][1];
          if(nx<0||ny<0||nx>=TW||ny>=TH)continue;
          if(A(e,nx,ny)<=ATH){gg+=190;k++;continue;}
          var cn=RGBv(e,nx,ny); gg+=Math.abs(c0[0]-cn[0])+Math.abs(c0[1]-cn[1])+Math.abs(c0[2]-cn[2]);k++;
        }
        dm[id]=Math.min((k?gg/k:0)/120,1);
      }
      det.push(dm);
    }
    for (var i2=0;i2<TW*TH;i2++){ var sd=0; for(e=0;e<NF;e++) sd+=det[e][i2]; detAvg[i2]=sd/NF; }

    var opaque=0; for(i2=0;i2<TW*TH;i2++) if(maxA[i2]>ATH) opaque++;
    var density=TARGET/Math.max(1,opaque), unit=2/TH;
    var pos=[], startArr=[], rnd=[], slotX=[], slotY=[];
    for (y=0;y<TH;y++) for (x=0;x<TW;x++){
      if(maxA[y*TW+x]<=ATH) continue;
      var dt=detAvg[y*TW+x], ex=density*(1.0+0.5*dt);
      var n=Math.floor(ex)+((Math.random()<(ex-Math.floor(ex)))?1:0);
      var jamp=0.32*(1-0.5*dt);
      for(var s=0;s<n;s++){
        var jx=(Math.random()-0.5)*jamp, jy=(Math.random()-0.5)*jamp;
        slotX.push(x+jx); slotY.push(y+jy);
        pos.push(((x+0.5+jx)-TW/2)*unit, (TH/2-(y+0.5+jy))*unit);

        var ang=Math.random()*6.283, R0=2.0+Math.random()*1.6;
        startArr.push(Math.cos(ang)*R0, Math.sin(ang)*R0*1.08);
        rnd.push(Math.random(),Math.random(),Math.random(),Math.random()*6.283);
      }
    }
    var P=slotX.length;
    var POS=new Float32Array(pos), START=new Float32Array(startArr), RAND=new Float32Array(rnd);

    var ECOL=[],EAL=[],EDET=[];
    for(e=0;e<NF;e++){
      var col=new Float32Array(P*3), al=new Float32Array(P), dd=new Float32Array(P);
      for(i2=0;i2<P;i2++){
        var xx=slotX[i2]|0, yy=slotY[i2]|0; if(xx<0)xx=0; if(yy<0)yy=0; if(xx>=TW)xx=TW-1; if(yy>=TH)yy=TH-1;
        var c=RGBv(e,xx,yy);
        col[i2*3]=punch(c[0]); col[i2*3+1]=punch(c[1]); col[i2*3+2]=punch(c[2]);
        al[i2]=(A(e,xx,yy)>ATH)?1:0; dd[i2]=det[e][yy*TW+xx];
      }
      ECOL.push(col); EAL.push(al); EDET.push(dd);
    }

    var canvas=document.createElement("canvas");
    canvas.style.cssText="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);"+
      "width:"+(OVERSIZE*100)+"%;height:"+(OVERSIZE*100)+"%;pointer-events:none;display:block;";
    host.appendChild(canvas);
    var gl=canvas.getContext("webgl",{alpha:true,antialias:false,premultipliedAlpha:true});
    if(!gl){canvas.remove(); return fallback(host);}

    var VS=
    "precision mediump float;"+
    "attribute vec2 aPos,aStart;attribute vec4 aRand;"+
    "attribute vec3 cFrom,cTo;attribute float aFrom,aTo,dFrom,dTo;"+
    "uniform float uTime,uCell,uMix,uWob,uIntro,uShift;uniform vec2 uProj;"+
    "varying vec3 vColor;varying float vBright,vAngle,vAlpha,vHero,vDetail;"+
    "void main(){"+
     "float det=mix(dFrom,dTo,uMix);"+
     "float al=mix(aFrom,aTo,uMix);"+
     "vec3 col=mix(cFrom,cTo,uMix);"+
     "float hp=clamp((uIntro-aRand.x*0.32)/(1.0-0.32),0.0,1.0);"+
     "float e=1.0-pow(1.0-hp,3.0);"+
     "vec2 home=aPos;"+
     "vec2 pos=mix(aStart,home,e);"+
     "vec2 tc=home-aStart;"+
     "vec2 perp=normalize(vec2(-tc.y,tc.x)+vec2(1e-4));"+
     "pos+=perp*sin(3.14159*hp)*0.13*(aRand.y-0.5)*2.0;"+
     "float dir=aRand.w;"+
     "pos+=vec2(cos(dir),sin(dir*1.7))*0.02*uWob;"+
     "pos+=vec2(sin(uTime*0.7+aRand.y*40.0),cos(uTime*0.55+aRand.y*23.0))*0.0026*e;"+
     "pos.y-=uShift;"+
     "gl_Position=vec4(pos*uProj,0.0,1.0);"+
     "vHero=step(0.988,aRand.z)*(1.0-step(0.5,det));"+
     "float twk=1.0+sin(uTime*(1.2+aRand.y*2.2)+aRand.y*40.0)*mix(0.16,0.05,det);"+
     "float sw=exp(-pow(aPos.x+aPos.y*0.35-(mod(uTime,7.0)*1.4-4.5),2.0)*7.0);"+
     "vBright=(twk+sw*mix(0.5,0.2,det)+vHero*0.15+det*0.20)*1.0;"+
     "float size=uCell*(0.80+aRand.z*0.5*(1.0-0.5*det)+vHero*0.9)*(twk*0.2+0.83);"+
     "gl_PointSize=min(size,64.0);"+
     "vAngle=aRand.w;vColor=col;vDetail=det;vAlpha=al*e;"+
    "}";
    var FS=
    "precision mediump float;"+
    "varying vec3 vColor;varying float vBright,vAngle,vAlpha,vHero,vDetail;"+
    "void main(){vec2 p=gl_PointCoord*2.0-1.0;float c=cos(vAngle),s=sin(vAngle);p=mat2(c,-s,s,c)*p;"+
    "float d=length(p);float core=smoothstep(0.60,0.03,d);"+
    "float spike=(1.0-smoothstep(0.0,0.14,abs(p.x)))*(1.0-smoothstep(0.0,1.0,abs(p.y)))"+
    "+(1.0-smoothstep(0.0,0.14,abs(p.y)))*(1.0-smoothstep(0.0,1.0,abs(p.x)));"+
    "float a=clamp(core+spike*(0.32*(1.0-0.55*vDetail)+vHero*0.55),0.0,1.0)*vAlpha;"+
    "if(a<0.02)discard;gl_FragColor=vec4(vColor*vBright*a,a);}";

    function shd(t,src){var o=gl.createShader(t);gl.shaderSource(o,src);gl.compileShader(o);
      if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error("star-avatar shader:",gl.getShaderInfoLog(o));return o;}
    var prog=gl.createProgram();
    gl.attachShader(prog,shd(gl.VERTEX_SHADER,VS));
    gl.attachShader(prog,shd(gl.FRAGMENT_SHADER,FS));
    gl.linkProgram(prog);gl.useProgram(prog);

    function stat(name,arr,sz){var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
      gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);var l=gl.getAttribLocation(prog,name);
      gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,sz,gl.FLOAT,false,0,0);}
    function dyn(name,sz){var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(P*sz),gl.DYNAMIC_DRAW);var l=gl.getAttribLocation(prog,name);
      gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,sz,gl.FLOAT,false,0,0);return b;}
    stat("aPos",POS,2); stat("aStart",START,2); stat("aRand",RAND,4);
    var bcF=dyn("cFrom",3),bcT=dyn("cTo",3),baF=dyn("aFrom",1),baT=dyn("aTo",1),bdF=dyn("dFrom",1),bdT=dyn("dTo",1);
    function put(b,a){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferSubData(gl.ARRAY_BUFFER,0,a);}
    var fromE=0,toE=0,current=0,active=false,uMix=1;
    function setPair(f,t){put(bcF,ECOL[f]);put(bcT,ECOL[t]);put(baF,EAL[f]);put(baT,EAL[t]);put(bdF,EDET[f]);put(bdT,EDET[t]);fromE=f;toE=t;}
    function startTransition(f,t){ if(f===t)return; setPair(f,t); uMix=0; active=true; }

    var U={}; ["uTime","uCell","uMix","uWob","uIntro","uShift","uProj"].forEach(function(n){U[n]=gl.getUniformLocation(prog,n);});
    gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);

    var dprv=Math.min(devicePixelRatio||1,2);
    function resize(){
      var mobile=matchMedia("(max-width: 980px)").matches;
      var FIT=mobile?1.122:0.858;
      gl.uniform1f(U.uShift, mobile?0.02:0.112);
      var r=canvas.getBoundingClientRect();
      canvas.width=Math.max(2,Math.round(r.width*dprv));
      canvas.height=Math.max(2,Math.round(r.height*dprv));
      gl.viewport(0,0,canvas.width,canvas.height);
      var py=FIT/OVERSIZE;
      gl.uniform2f(U.uProj, py*canvas.height/canvas.width, py);
      gl.uniform1f(U.uCell, (py*canvas.height/2)*(2/TH));
    }
    setPair(0,0); resize();
    if("ResizeObserver" in window) new ResizeObserver(resize).observe(host); else addEventListener("resize",resize);

    var queued=0, MAXQ=3;
    if(!TOUCH){
      var STEP=2*Math.PI/NF, rotAcc=0, lastAng=null;
      addEventListener("mousemove",function(ev){
        var r=host.getBoundingClientRect();
        var dx=ev.clientX-(r.left+r.width/2), dy=ev.clientY-(r.top+r.height/2);
        var a=Math.atan2(dy,dx);
        if(lastAng!==null){var da=a-lastAng; if(da>Math.PI)da-=2*Math.PI; if(da<-Math.PI)da+=2*Math.PI;
          if(Math.abs(da)<0.6) rotAcc+=da;}
        lastAng=a;
        while(rotAcc>STEP){rotAcc-=STEP; queued=Math.min(MAXQ,queued+1);}
        while(rotAcc<-STEP){rotAcc+=STEP; queued=Math.max(-MAXQ,queued-1);}
      },{passive:true});
    } else {
      var tapTimer=null,tX=0,tY=0,tT=0,moved=false;
      function enq(d){queued=Math.max(-MAXQ,Math.min(MAXQ,queued+d));}
      host.addEventListener("touchstart",function(ev){var t=ev.changedTouches[0];tX=t.clientX;tY=t.clientY;tT=performance.now();moved=false;},{passive:true});
      host.addEventListener("touchmove",function(ev){var t=ev.changedTouches[0];if(Math.abs(t.clientX-tX)>12||Math.abs(t.clientY-tY)>12)moved=true;},{passive:true});
      host.addEventListener("touchend",function(){if(moved||performance.now()-tT>500)return;
        if(tapTimer){clearTimeout(tapTimer);tapTimer=null;enq(-1);}
        else{tapTimer=setTimeout(function(){tapTimer=null;enq(1);},250);}},{passive:true});
    }

    var uIntro=REDUCED?1:0, ready=REDUCED, t0=performance.now(), lastNow=0, running=false, raf=0, acc=0;
    setTimeout(function(){ ready=true; }, 3500);
    function frame(now){
      raf=requestAnimationFrame(frame);
      var dt=Math.min((now-(lastNow||now))/1000,0.05); lastNow=now;
      if(!ready && document.body.classList.contains("booted")) ready=true;
      if(ready && uIntro<1) uIntro=Math.min(1,uIntro+dt/INTRO_DUR);
      if(ready){
        if(!active && queued!==0){var d=queued>0?1:-1; startTransition(current,(current+d+NF)%NF); queued-=d;}
        if(active){ uMix+=dt/DUR; if(uMix>=1){uMix=1;active=false;current=toE;} }
      }
      gl.uniform1f(U.uTime,(now-t0)/1000);
      gl.uniform1f(U.uMix,uMix); gl.uniform1f(U.uWob,Math.sin(Math.PI*uMix));
      gl.uniform1f(U.uIntro,uIntro);
      gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.POINTS,0,P);
      if(REDUCED && uIntro>=1 && !active) stop();
    }
    function start(){ if(running)return; running=true; lastNow=0; raf=requestAnimationFrame(frame); }
    function stop(){ if(!running)return; running=false; cancelAnimationFrame(raf); }

    var offScreen=false;
    if("IntersectionObserver" in window){
      new IntersectionObserver(function(es){ offScreen=!es[0].isIntersecting; offScreen?stop():start(); },{threshold:0.02}).observe(host);
    } else start();
    document.addEventListener("visibilitychange",function(){ document.hidden?stop():(offScreen||start()); });
    start();

    window.VishStars={
      count:P, names:NAMES,
      replay:function(){ uIntro=0; start(); },
      setGaze:function(){},
      setExpression:function(i){ var to=(((i|0)%NF)+NF)%NF; if(to===current&&!active)return; startTransition(current,to); },
      state:function(){ return {uIntro:uIntro,ready:ready,running:running,current:current,active:active,P:P,booted:document.body.classList.contains("booted")}; }
    };
  }

  function init(){ mount(document.getElementById("vish-avatar")); }
  document.readyState==="loading"
    ? document.addEventListener("DOMContentLoaded",init)
    : init();
})();
