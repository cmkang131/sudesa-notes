/* v6-ml-extension.js : MATH432 수리데이터사이언스 (sudesa-notes) - c6/c8 추가 인터랙티브 (손실 지형, 뉴런 결정 경계)
   Requires assets/v6.js (window.V6). Self-contained: helpers below are the same implementations as v6-extra.js
   (v6-extra.js keeps its helpers closure-private, so this file carries its own copies; both may load together).
   Style: white bg, ink #1a1a1a, red #9e2b25 accent only, grays for secondary. Canvas only, no libraries.
   Every widget: <div class="v6-widget" data-widget="NAME" data-config='{...}'></div>  (config optional) */
(function(){
"use strict";
if(!window.V6){console.warn("v6-ml-extension: V6 runtime missing");return;}
var V6=window.V6, INK="#1a1a1a", RED="#9e2b25", G1="#1a1a1a", G2="#1a1a1a", G3="#e8e6e0", GRID="#e8e6e0";
var FONT="'Noto Sans KR',sans-serif";
var DPR=Math.max(1,Math.min(2,window.devicePixelRatio||1));
var X={}; /* pure math, local to this file (v6-extra.js owns V6.x) */

/* ---------- css (kept here so only this file is needed) ---------- */
(function(){
  if(document.getElementById("v6x-mlcss"))return;
  var s=document.createElement("style");
  s.id="v6x-mlcss";
  s.textContent=
    ".v6x-read{margin-top:8px;border-top:1px dashed #1a1a1a;padding-top:7px;font-size:13px;line-height:1.65;color:#1a1a1a;font-family:"+FONT+"}"+
    ".v6x-read b{font-weight:700}.v6x-read .r{color:#9e2b25;font-weight:700}.v6x-read .m{color:#1a1a1a}"+
    ".v6x-read table{border-collapse:collapse;margin:4px 0}.v6x-read td,.v6x-read th{border:1px solid #1a1a1a;padding:3px 8px;font-size:13px}"+
    ".v6x-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:8px 0}"+
    ".v6x-ctl label{display:inline-flex;align-items:center;gap:5px;white-space:normal;font-size:13px;color:#1a1a1a;min-height:32px}"+
    ".v6x-ctl select{font-family:inherit;font-size:13px;border:1.2px solid #1a1a1a;border-radius:4px;background:#fff;padding:5px;color:#1a1a1a;min-height:32px}"+
    ".v6x-ctl input[type=range]{width:135px;max-width:35vw;accent-color:#1a1a1a}"+
    ".v6x-ctl input[type=checkbox]{accent-color:#1a1a1a}"+
    ".v6x-ctl .v6-btn{font:inherit;font-size:13px;min-height:36px;padding:6px 10px;border:1px solid #1a1a1a;border-radius:4px;background:#fff;color:#1a1a1a;cursor:pointer}"+
    ".v6x-ctl .v6-btn:hover,.v6x-ctl .v6-btn.on{background:#1a1a1a;color:#fff}"+
    ".v6x-ctl .v6-btn{white-space:nowrap;flex:0 0 auto}"+
    ".v6x-ctl .v6-btn:disabled{opacity:.55;cursor:not-allowed}"+
    ".v6x-cap{font-size:13px;color:#1a1a1a;margin-top:6px;line-height:1.6}"+
    ".v6-widget{overflow:hidden}.v6-val{font-variant-numeric:tabular-nums}"+
    "@media (max-width:560px){.v6-widget[data-widget=loss-landscape],.v6-widget[data-widget=logistic-boundary]{overflow-x:auto}.v6-widget[data-widget=loss-landscape] canvas,.v6-widget[data-widget=logistic-boundary] canvas{min-width:720px}.v6-widget[data-widget=loss-landscape] .v6x-ctl .v6-btn,.v6-widget[data-widget=logistic-boundary] .v6x-ctl .v6-btn{min-height:44px}.v6-widget[data-widget=loss-landscape] .v6x-ctl label,.v6-widget[data-widget=logistic-boundary] .v6x-ctl label{min-height:44px}}";
  document.head.appendChild(s);
})();

/* ---------- helpers ---------- */
function div(el,cls,html){var d=document.createElement("div");if(cls)d.className=cls;if(html!=null)d.innerHTML=html;el.appendChild(d);return d;}
function fmt(x,d){if(!isFinite(x))return "—";var s=x.toFixed(d==null?2:d);return s;}
function fmtg(x,d){ // general: trims trailing zeros
  if(!isFinite(x))return "—";var s=Number(x.toPrecision(d||3)).toString();return s;}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function canvas(el,h){
  var c=document.createElement("canvas");
  c.width=720*DPR;c.height=h*DPR;
  c.style.width="100%";c.style.height="auto";c.style.maxWidth="100%";
  el.appendChild(c);
  var ctx=c.getContext("2d");
  ctx.setTransform(DPR,0,0,DPR,0,0);
  return {c:c,ctx:ctx,W:720,H:h,clear:function(){
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,720,h);
    ctx.fillStyle="#fff";ctx.fillRect(0,0,720,h);
  }};
}
function ctlBar(el){return div(el,"v6-controls v6x-ctl");}
function slider(bar,label,p,cb,f){ // p=[min,max,init,step]
  var lab=document.createElement("label");lab.appendChild(document.createTextNode(label+" "));
  var r=document.createElement("input");r.type="range";r.min=p[0];r.max=p[1];r.step=p[3]==null?0.01:p[3];if(p[3]==="any")r.step="any";r.value=p[2];
  var v=document.createElement("span");v.className="v6-val";
  var o={el:r,get:function(){return parseFloat(r.value);},set:function(x){r.value=x;show();},show:show};
  function show(){v.textContent=f?f(o.get()):fmtg(o.get(),4);}
  r.addEventListener("input",function(){show();cb&&cb(o.get());});
  lab.appendChild(r);lab.appendChild(v);bar.appendChild(lab);show();return o;
}
function select(bar,label,opts,init,cb){ // opts=[[value,label],...]
  var lab=document.createElement("label");if(label)lab.appendChild(document.createTextNode(label+" "));
  var s=document.createElement("select");
  opts.forEach(function(o){var op=document.createElement("option");op.value=o[0];op.textContent=o[1];s.appendChild(op);});
  s.value=init==null?opts[0][0]:init;
  s.addEventListener("change",function(){cb&&cb(s.value);});
  lab.appendChild(s);bar.appendChild(lab);
  return {el:s,get:function(){return s.value;},set:function(x){s.value=x;}};
}
function button(bar,label,cb){var b=document.createElement("button");b.className="v6-btn";b.textContent=label;b.type="button";
  b.addEventListener("click",function(){cb&&cb(b);});bar.appendChild(b);return b;}
function check(bar,label,init,cb){var lab=document.createElement("label");var c=document.createElement("input");c.type="checkbox";c.checked=!!init;
  c.addEventListener("change",function(){cb&&cb(c.checked);});lab.appendChild(c);lab.appendChild(document.createTextNode(" "+label));bar.appendChild(lab);
  return {el:c,get:function(){return c.checked;},set:function(x){c.checked=!!x;}};}
function note(el,html){return div(el,"v6x-cap",html);}
function readout(el){return div(el,"v6x-read");}
/* deterministic rng */
function rng(seed){var a=(seed>>>0)||1;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function gauss(r){var u=r()||1e-12,v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
X.rng=rng;
/* drawing */
function txt(ctx,s,x,y,o){
  o=o||{};ctx.save();
  ctx.fillStyle=o.color||INK;
  ctx.font=(o.weight||"400")+" "+Math.max(12,o.size||12)+"px "+FONT;
  ctx.textAlign=o.align||"left";
  ctx.textBaseline=o.base||"alphabetic";
  if(o.halo){ctx.save();ctx.strokeStyle="#fff";ctx.lineWidth=o.halo;ctx.lineJoin="round";ctx.strokeText(String(s),x,y);ctx.restore();}
  ctx.fillText(String(s),x,y);
  ctx.restore();
}
function niceTicks(lo,hi,n){
  var span=hi-lo;if(!(span>0))return [lo];var raw=span/(n||5),p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p;
  var st=(f<1.5?1:f<3?2:f<7?5:10)*p,t=[],v=Math.ceil(lo/st-1e-9)*st;
  for(;v<=hi+st*1e-6;v+=st)t.push(Math.abs(v)<st*1e-9?0:v);return t;}
function tickLabel(v){var a=Math.abs(v);if(a>=10000)return (v/1000)+"k";return Number(v.toPrecision(6)).toString();}
/* frame(ctx, box, xr, yr, opts{xl,yl,xt,yt,noGrid,xticks,yticks}) */
function frame(ctx,b,xr,yr,o){
  o=o||{};ctx.save();
  var px=function(x){return b.x+(x-xr[0])/(xr[1]-xr[0])*b.w;};
  var py=function(y){return b.y+b.h-(y-yr[0])/(yr[1]-yr[0])*b.h;};
  var xt=o.xticks||niceTicks(xr[0],xr[1],o.xt||6);
  var yt=o.yticks||niceTicks(yr[0],yr[1],o.yt||5);
  if(!o.noGrid){
    ctx.strokeStyle=GRID;ctx.lineWidth=1;ctx.beginPath();
    xt.forEach(function(t){var x=Math.round(px(t))+.5;ctx.moveTo(x,b.y);ctx.lineTo(x,b.y+b.h);});
    yt.forEach(function(t){var y=Math.round(py(t))+.5;ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y);});
    ctx.stroke();
  }
  ctx.strokeStyle=INK;ctx.lineWidth=1.2;
  if(xr[0]<0&&xr[1]>0){
    var zx=Math.round(px(0))+.5;ctx.beginPath();
    ctx.moveTo(zx,b.y);ctx.lineTo(zx,b.y+b.h);ctx.stroke();
  }
  if(yr[0]<0&&yr[1]>0){
    var zy=Math.round(py(0))+.5;ctx.beginPath();
    ctx.moveTo(b.x,zy);ctx.lineTo(b.x+b.w,zy);ctx.stroke();
  }
  ctx.strokeRect(b.x+.5,b.y+.5,b.w,b.h);
  ctx.fillStyle=INK;ctx.font="12px "+FONT;
  ctx.textAlign="center";ctx.textBaseline="top";
  xt.forEach(function(t){ctx.fillText((o.xf||tickLabel)(t),px(t),b.y+b.h+4);});
  ctx.textAlign="right";ctx.textBaseline="middle";
  yt.forEach(function(t){ctx.fillText((o.yf||tickLabel)(t),b.x-5,py(t));});
  if(o.xl){ctx.textAlign="right";ctx.textBaseline="alphabetic";ctx.fillText(o.xl,b.x+b.w,b.y+b.h+28);}
  if(o.yl){ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillText(o.yl,b.x,b.y-6);}
  ctx.restore();
  return {px:px,py:py,b:b,
    ix:function(p){return xr[0]+(p-b.x)/b.w*(xr[1]-xr[0]);},
    iy:function(p){return yr[0]+(b.y+b.h-p)/b.h*(yr[1]-yr[0]);},
    xr:xr,yr:yr};
}
function clipBox(ctx,b){ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();}
function path(ctx,pts,o){ // pts=[[x,y]...] in pixel coords; NaN breaks
  o=o||{};ctx.save();ctx.strokeStyle=o.color||INK;ctx.lineWidth=o.w||2;ctx.setLineDash(o.dash||[]);ctx.lineJoin="round";ctx.lineCap="round";
  ctx.beginPath();var st=false;
  for(var i=0;i<pts.length;i++){var p=pts[i];if(!isFinite(p[0])||!isFinite(p[1])){st=false;continue;}
    if(!st){ctx.moveTo(p[0],p[1]);st=true;}else ctx.lineTo(p[0],p[1]);}
  ctx.stroke();ctx.restore();}
function curve(ctx,m,fn,x0,x1,o){ // function curve on frame m
  var n=(o&&o.n)||300,pts=[];for(var i=0;i<=n;i++){var x=x0+(x1-x0)*i/n,y=fn(x);var py=m.py(y);
    pts.push(isFinite(y)&&Math.abs(py)<1e5?[m.px(x),py]:[NaN,NaN]);}
  path(ctx,pts,o);}
function seg(ctx,x0,y0,x1,y1,o){o=o||{};ctx.save();ctx.strokeStyle=o.color||INK;ctx.lineWidth=o.w||1.2;ctx.setLineDash(o.dash||[]);
  ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();ctx.restore();}
function dot(ctx,x,y,r,o){o=o||{};ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,6.2832);
  if(o.fill!==false){ctx.fillStyle=o.color||RED;ctx.fill();}
  if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=o.w||1.4;ctx.stroke();}ctx.restore();}
function marker(ctx,k,x,y,r,o){ // shapes: 0 circle,1 square,2 triangle,3 diamond,4 plus,5 cross
  o=o||{};ctx.save();ctx.fillStyle=o.color||INK;ctx.strokeStyle=o.color||INK;ctx.lineWidth=o.w||1.5;ctx.beginPath();
  k=k%6;
  if(k===0){ctx.arc(x,y,r,0,6.2832);o.hollow?ctx.stroke():ctx.fill();}
  else if(k===1){ctx.rect(x-r,y-r,2*r,2*r);o.hollow?ctx.stroke():ctx.fill();}
  else if(k===2){ctx.moveTo(x,y-r*1.15);ctx.lineTo(x+r*1.05,y+r*.8);ctx.lineTo(x-r*1.05,y+r*.8);ctx.closePath();o.hollow?ctx.stroke():ctx.fill();}
  else if(k===3){ctx.moveTo(x,y-r*1.2);ctx.lineTo(x+r*1.2,y);ctx.lineTo(x,y+r*1.2);ctx.lineTo(x-r*1.2,y);ctx.closePath();o.hollow?ctx.stroke():ctx.fill();}
  else if(k===4){ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();}
  else{ctx.moveTo(x-r,y-r);ctx.lineTo(x+r,y+r);ctx.moveTo(x-r,y+r);ctx.lineTo(x+r,y-r);ctx.stroke();}
  ctx.restore();}
function legend(ctx,x,y,items){
  items.forEach(function(it,i){
    var yy=y+i*19;
    seg(ctx,x,yy-4,x+22,yy-4,{color:it.color,dash:it.dash,w:it.w||2});
    txt(ctx,it.label,x+28,yy,{size:12,color:INK});
  });
}
function arrow(ctx,x0,y0,x1,y1,o){o=o||{};seg(ctx,x0,y0,x1,y1,o);var a=Math.atan2(y1-y0,x1-x0),s=o.head||7;
  ctx.save();ctx.fillStyle=o.color||INK;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-s*Math.cos(a-.4),y1-s*Math.sin(a-.4));
  ctx.lineTo(x1-s*Math.cos(a+.4),y1-s*Math.sin(a+.4));ctx.closePath();ctx.fill();ctx.restore();}
X.names=[];X.fns={};
function mount(name,fn){var w=function(el,cfg){if(el.hasAttribute("data-v6x"))return;el.setAttribute("data-v6x",name);cfg=cfg||{};V6.title(el,cfg.title);fn(el,cfg);};X.names.push(name);X.fns[name]=function(el,cfg){w(el,cfg);refont(el);};V6.register(name,X.fns[name]);}
function refont(el){ /* redraw once webfont is ready (canvas text is drawn before Noto Sans KR loads) */
  if(!(document.fonts&&document.fonts.ready))return;
  document.fonts.ready.then(function(){var r=el.querySelector("input[type=range]");if(r){r.dispatchEvent(new Event("input"));return;}var s=el.querySelector("select");if(s)s.dispatchEvent(new Event("change"));});}
/* canvas pointer -> logical coords */
function ptr(cv,e){var r=cv.c.getBoundingClientRect();return [(e.clientX-r.left)/r.width*cv.W,(e.clientY-r.top)/r.height*cv.H];}
/* numerical tools */
function rk4(f,y0,t0,t1,dt){ // returns {t:[],y:[[..],..]}
  var n=Math.max(1,Math.round((t1-t0)/dt)),h=(t1-t0)/n,t=[t0],Y=[y0.slice()],y=y0.slice(),k=y0.length,i,j;
  for(i=0;i<n;i++){var tt=t0+i*h,k1=f(tt,y),y2=[],k2,y3=[],k3,y4=[],k4,yn=[];
    for(j=0;j<k;j++)y2[j]=y[j]+h/2*k1[j];k2=f(tt+h/2,y2);
    for(j=0;j<k;j++)y3[j]=y[j]+h/2*k2[j];k3=f(tt+h/2,y3);
    for(j=0;j<k;j++)y4[j]=y[j]+h*k3[j];k4=f(tt+h,y4);
    for(j=0;j<k;j++)yn[j]=y[j]+h/6*(k1[j]+2*k2[j]+2*k3[j]+k4[j]);
    y=yn;t.push(t0+(i+1)*h);Y.push(y);}
  return {t:t,y:Y};}
X.rk4=rk4;
function euler(f,y0,t0,t1,dt){var n=Math.max(1,Math.round((t1-t0)/dt)),h=(t1-t0)/n,t=[t0],Y=[y0.slice()],y=y0.slice(),i,j;
  for(i=0;i<n;i++){var d=f(t0+i*h,y),yn=[];for(j=0;j<y.length;j++)yn[j]=y[j]+h*d[j];y=yn;t.push(t0+(i+1)*h);Y.push(y);}return {t:t,y:Y};}
/* SSP RK3 (Shu-Osher): course form  y1=y+h f(y); y2=3/4 y+1/4(y1+h f(y1,t+h)); y_{n+1}=1/3 y+2/3(y2+h f(y2,t+h/2)) */
function rk3(f,y0,t0,t1,dt){var n=Math.max(1,Math.round((t1-t0)/dt)),h=(t1-t0)/n,t=[t0],Y=[y0.slice()],y=y0.slice(),i,j,k=y0.length;
  for(i=0;i<n;i++){var tt=t0+i*h,a=f(tt,y),y1=[],y2=[],yn=[],b,c;
    for(j=0;j<k;j++)y1[j]=y[j]+h*a[j];
    b=f(tt+h,y1);for(j=0;j<k;j++)y2[j]=0.75*y[j]+0.25*(y1[j]+h*b[j]);
    c=f(tt+h/2,y2);for(j=0;j<k;j++)yn[j]=y[j]/3+2/3*(y2[j]+h*c[j]);
    y=yn;t.push(t0+(i+1)*h);Y.push(y);}
  return {t:t,y:Y};}
X.euler=euler;X.rk3=rk3;
/* ================= SIR family (주제 3, 4, 5) ================= */
function sirF(beta,gamma,N){return function(t,y){var inf=beta*y[0]*y[1]/N;return [-inf,inf-gamma*y[1],gamma*y[1]];};}
function sirImax(beta,gamma,N,S0,I0){var R0=beta/gamma;if(R0*S0/N<=1)return I0;return I0+S0-(N/R0)*(1+Math.log(R0*S0/N));}
function sirFinal(beta,gamma,N,S0,I0){ // R(0)=0 : ln(S/S0) = -(R0/N)(S0+I0-S)
  var R0=beta/gamma,g=function(s){return Math.log(s/S0)+R0/N*(S0+I0-s);},lo=S0*1e-14,hi=S0;
  for(var i=0;i<200;i++){var m=(lo+hi)/2;if(g(m)>0)hi=m;else lo=m;}return (lo+hi)/2;}
X.sirImax=sirImax;X.sirFinal=sirFinal;X.sirF=sirF;
function peakOf(sim){var k=0;for(var i=1;i<sim.y.length;i++)if(sim.y[i][1]>sim.y[k][1])k=i;return {t:sim.t[k],I:sim.y[k][1],k:k};}

/* ================= 추가 위젯 (c6/c8) ================= */

mount("loss-landscape", function(el, cfg) {
  var H = 410;
  var N = 1000;
  var S0 = 995;
  var I0 = 5;
  var INIT_R = 0;

  var BTRUE = 0.45;
  var GTRUE = 0.14;
  var RTRUE = BTRUE / GTRUE;

  var BMIN = 0.15;
  var BMAX = 0.80;
  var GMIN = 0.05;
  var GMAX = 0.30;

  var GRID_DT = 0.2;
  var GRID_STEPS = 300;
  var BSTEP = 0.01;
  var GSTEP = 0.005;
  var NB = Math.round((BMAX - BMIN) / BSTEP) + 1;
  var NG = Math.round((GMAX - GMIN) / GSTEP) + 1;
  var LOG_EPS = 1e-6;

  var LEFT_BOX = {x: 52, y: 55, w: 275, h: 235};
  var RIGHT_BOX = {x: 414, y: 55, w: 260, h: 235};

  var candBeta = 0.30;
  var candGamma = 0.20;
  var k = 8;
  var sigma = 0.12;
  var seed = 432432;
  var settingMin = false;

  var obsTimes = [];
  var obsValues = [];

  var gridBeta = new Float64Array(NB);
  var gridGamma = new Float64Array(NG);
  var gridTraj = new Array(NB * NG);
  var gridLoss = new Float64Array(NB * NG);

  var gridMin = {
    beta: BTRUE,
    gamma: GTRUE,
    loss: Infinity
  };

  var lossLogMin = 0;
  var lossLogMax = 1;
  var candidateSol = null;
  var candidateLossSol = null;
  var candidateLoss = 0;
  var rightFrame = null;

  var trueSol = rk4(
    sirF(BTRUE, GTRUE, N),
    [S0, I0, INIT_R],
    0,
    60,
    0.1
  );

  var bar1 = ctlBar(el);
  var bar2 = ctlBar(el);

  var betaCtl;
  var gammaCtl;
  var kCtl;
  var sigmaCtl;

  betaCtl = slider(
    bar1,
    "후보 β (1/day)",
    [BMIN, BMAX, candBeta, 0.005],
    function(v) {
      candBeta = clamp(Number(v), BMIN, BMAX);
      if (!settingMin) candidateChanged();
    },
    function(v) {
      return fmt(v, 3);
    }
  );

  gammaCtl = slider(
    bar1,
    "후보 γ (1/day)",
    [GMIN, GMAX, candGamma, 0.005],
    function(v) {
      candGamma = clamp(Number(v), GMIN, GMAX);
      if (!settingMin) candidateChanged();
    },
    function(v) {
      return fmt(v, 3);
    }
  );

  kCtl = slider(
    bar2,
    "관측 시점 수 k",
    [3, 15, 8, 1],
    function(v) {
      k = clamp(Math.round(Number(v)), 3, 15);
      refreshDataAndGrid();
    },
    function(v) {
      return String(Math.round(v));
    }
  );

  sigmaCtl = slider(
    bar2,
    "상대 잡음 σ",
    [0, 0.35, 0.12, 0.01],
    function(v) {
      sigma = clamp(Number(v), 0, 0.35);
      refreshDataAndGrid();
    },
    function(v) {
      return fmt(v, 2);
    }
  );

  button(bar2, "격자 최솟값으로 이동", function() {
    if (!gridMin || !isFinite(gridMin.loss)) return;

    settingMin = true;

    betaCtl.set(gridMin.beta);
    gammaCtl.set(gridMin.gamma);

    candBeta = gridMin.beta;
    candGamma = gridMin.gamma;

    settingMin = false;
    candidateChanged();
  });

  button(bar2, "새 데이터", function() {
    seed = (seed + 104729) >>> 0;
    refreshDataAndGrid();
  });

  var cv = canvas(el, H);
  var c = cv.c;
  var ctx = cv.ctx;

  var scaleX = c.width / 720;
  var scaleY = c.height / H;

  var cacheCanvas = c.ownerDocument.createElement("canvas");
  cacheCanvas.width = c.width;
  cacheCanvas.height = c.height;

  var cacheCtx = cacheCanvas.getContext("2d");
  cacheCtx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  note(
    el,
    "loss landscape(손실 지형): 각 (β, γ)에서 SIR 모형(감수성–감염–회복)의 궤적을 구하고, 관측 I(t)와의 squared-error loss(제곱오차 손실)를 합산합니다. 손실이 가장 작은 격자점은 least squares(최소제곱) 추정값의 근사입니다."
  );

  note(
    el,
    "β=전염률, γ=회복률(둘 다 1/day), R₀=β/γ입니다. I(t)는 N=1000명 중 감염자 수(명), 시간은 일(day), 손실은 people²(명²)입니다. 관측값은 I_obs = max(0, I(t)·(1+σZ)) (Z는 표준정규, σ는 무차원 상대 잡음)로 만듭니다. 관측 시점이 너무 적으면 두 모수를 식별하기 어렵습니다. 오른쪽은 로그 손실을 명암으로 표시하며, 격자 손실은 계산 비용을 줄이기 위해 RK4 간격 0.2일의 근사 궤적으로 계산합니다(후보 곡선·손실은 0.1일)."
  );

  var out = readout(el);

  function simulate(beta, gamma, dt) {
    return rk4(
      sirF(beta, gamma, N),
      [S0, I0, INIT_R],
      0,
      60,
      dt
    );
  }

  function interpSolI(sol, t) {
    var ts = sol.t;
    var ys = sol.y;
    var n = ts.length;

    if (!n || !ys || !ys.length) return 0;
    if (t <= ts[0]) return ys[0][1];
    if (t >= ts[n - 1]) return ys[n - 1][1];

    var lo = 0;
    var hi = n - 1;

    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;

      if (ts[mid] <= t) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    var span = ts[hi] - ts[lo];
    var f = span > 0 ? (t - ts[lo]) / span : 0;

    return ys[lo][1] * (1 - f) + ys[hi][1] * f;
  }

  function interpArray(arr, t, dt) {
    if (!arr || !arr.length) return 0;

    var p = clamp(t / dt, 0, arr.length - 1);
    var i = Math.floor(p);

    if (i >= arr.length - 1) {
      return arr[arr.length - 1];
    }

    var f = p - i;

    return arr[i] * (1 - f) + arr[i + 1] * f;
  }

  function precomputeGridTrajectories() {
    for (var i = 0; i < NB; i++) {
      gridBeta[i] = i === NB - 1
        ? BMAX
        : BMIN + i * BSTEP;
    }

    for (var j = 0; j < NG; j++) {
      gridGamma[j] = j === NG - 1
        ? GMAX
        : GMIN + j * GSTEP;
    }

    for (var bi = 0; bi < NB; bi++) {
      for (var gi = 0; gi < NG; gi++) {
        var sol = simulate(
          gridBeta[bi],
          gridGamma[gi],
          GRID_DT
        );

        var arr = new Float64Array(GRID_STEPS + 1);

        for (var q = 0; q <= GRID_STEPS; q++) {
          if (q < sol.y.length) {
            arr[q] = sol.y[q][1];
          } else {
            arr[q] = interpSolI(sol, q * GRID_DT);
          }
        }

        gridTraj[bi * NG + gi] = arr;
      }
    }
  }

  function makeObservations() {
    obsTimes = [];
    obsValues = [];

    var random = rng(seed);

    for (var i = 0; i < k; i++) {
      var t = 6 + (54 * i) / (k - 1);
      var trueI = interpSolI(trueSol, t);
      var z = gauss(random);
      var observed = Math.max(0, trueI * (1 + sigma * z));

      obsTimes.push(t);
      obsValues.push(observed);
    }
  }

  function lossFromSolution(sol) {
    var total = 0;

    for (var i = 0; i < obsTimes.length; i++) {
      var diff = interpSolI(sol, obsTimes[i]) - obsValues[i];
      total += diff * diff;
    }

    return total;
  }

  function computeGridLoss() {
    var bestLoss = Infinity;
    var bestBeta = BMIN;
    var bestGamma = GMIN;
    var minLog = Infinity;
    var maxLog = -Infinity;

    for (var bi = 0; bi < NB; bi++) {
      for (var gi = 0; gi < NG; gi++) {
        var idx = bi * NG + gi;
        var trajectory = gridTraj[idx];
        var total = 0;

        for (var oi = 0; oi < obsTimes.length; oi++) {
          var modelI = interpArray(
            trajectory,
            obsTimes[oi],
            GRID_DT
          );

          var diff = modelI - obsValues[oi];
          total += diff * diff;
        }

        gridLoss[idx] = total;

        if (total < bestLoss) {
          bestLoss = total;
          bestBeta = gridBeta[bi];
          bestGamma = gridGamma[gi];
        }

        var lv = Math.log(Math.max(0, total) + LOG_EPS);

        if (lv < minLog) minLog = lv;
        if (lv > maxLog) maxLog = lv;
      }
    }

    gridMin = {
      beta: bestBeta,
      gamma: bestGamma,
      loss: bestLoss
    };

    lossLogMin = minLog;
    lossLogMax = maxLog;
  }

  function drawLeft() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 370, H);

    txt(ctx, "관측 I(t)와 SIR 궤적", 48, 28, {
      size: 13,
      color: INK,
      weight: "bold",
      base: "middle"
    });

    var maxI = 100;

    for (var i = 0; i < trueSol.y.length; i++) {
      maxI = Math.max(maxI, trueSol.y[i][1]);
    }

    for (var j = 0; j < candidateSol.y.length; j++) {
      maxI = Math.max(maxI, candidateSol.y[j][1]);
    }

    for (var oi = 0; oi < obsValues.length; oi++) {
      maxI = Math.max(maxI, obsValues[oi]);
    }

    var yMax = clamp(
      Math.ceil((maxI * 1.12) / 100) * 100,
      100,
      1000
    );

    var f = frame(
      ctx,
      LEFT_BOX,
      [0, 60],
      [0, yMax],
      {
        xl: "시간 t (day)",
        yl: "I(t) (명)",
        xt: 4,
        yt: 4
      }
    );

    clipBox(ctx, LEFT_BOX);

    var truePoints = [];

    for (var ti = 0; ti < trueSol.t.length; ti++) {
      truePoints.push([
        f.px(trueSol.t[ti]),
        f.py(trueSol.y[ti][1])
      ]);
    }

    path(ctx, truePoints, {
      color: INK,
      w: 1.8,
      dash: [5, 4]
    });

    var candidatePoints = [];

    for (var ci = 0; ci < candidateSol.t.length; ci++) {
      candidatePoints.push([
        f.px(candidateSol.t[ci]),
        f.py(candidateSol.y[ci][1])
      ]);
    }

    path(ctx, candidatePoints, {
      color: RED,
      w: 2.2
    });

    for (var oi = 0; oi < obsTimes.length; oi++) {
      dot(
        ctx,
        f.px(obsTimes[oi]),
        f.py(obsValues[oi]),
        3,
        {
          color: INK,
          fill: INK,
          stroke: INK
        }
      );
    }

    ctx.restore();

    seg(ctx, 50, 345, 71, 345, {
      color: INK,
      w: 1.8,
      dash: [5, 4]
    });

    txt(ctx, "참 궤적", 76, 345, {
      size: 10,
      color: INK,
      base: "middle"
    });

    dot(ctx, 144, 345, 2.8, {
      color: INK,
      fill: INK,
      stroke: INK
    });

    txt(ctx, "관측", 152, 345, {
      size: 10,
      color: INK,
      base: "middle"
    });

    seg(ctx, 198, 345, 219, 345, {
      color: RED,
      w: 2.2
    });

    txt(ctx, "후보", 224, 345, {
      size: 10,
      color: INK,
      base: "middle"
    });
  }

  function drawRightStatic(targetCtx) {
    targetCtx.fillStyle = "#ffffff";
    targetCtx.fillRect(370, 0, 350, H);

    seg(targetCtx, 370, 16, 370, 398, {
      color: G3,
      w: 1
    });

    txt(targetCtx, "손실 지형 L(β, γ)", 402, 28, {
      size: 13,
      color: INK,
      weight: "bold",
      base: "middle"
    });

    clipBox(targetCtx, RIGHT_BOX);

    var logRange = lossLogMax - lossLogMin;

    if (!isFinite(logRange) || logRange < 1e-12) {
      logRange = 1;
    }

    for (var bi = 0; bi < NB; bi++) {
      var betaLo = bi === 0
        ? BMIN
        : (gridBeta[bi - 1] + gridBeta[bi]) / 2;

      var betaHi = bi === NB - 1
        ? BMAX
        : (gridBeta[bi] + gridBeta[bi + 1]) / 2;

      var x0 = RIGHT_BOX.x +
        ((betaLo - BMIN) / (BMAX - BMIN)) * RIGHT_BOX.w;

      var x1 = RIGHT_BOX.x +
        ((betaHi - BMIN) / (BMAX - BMIN)) * RIGHT_BOX.w;

      for (var gi = 0; gi < NG; gi++) {
        var gammaLo = gi === 0
          ? GMIN
          : (gridGamma[gi - 1] + gridGamma[gi]) / 2;

        var gammaHi = gi === NG - 1
          ? GMAX
          : (gridGamma[gi] + gridGamma[gi + 1]) / 2;

        var y0 = RIGHT_BOX.y +
          ((GMAX - gammaHi) / (GMAX - GMIN)) * RIGHT_BOX.h;

        var y1 = RIGHT_BOX.y +
          ((GMAX - gammaLo) / (GMAX - GMIN)) * RIGHT_BOX.h;

        var loss = gridLoss[bi * NG + gi];
        var lv = Math.log(Math.max(0, loss) + LOG_EPS);
        var norm = clamp((lv - lossLogMin) / logRange, 0, 1);
        var shade = Math.round(26 + 229 * norm);

        targetCtx.fillStyle =
          "rgb(" + shade + "," + shade + "," + shade + ")";

        targetCtx.fillRect(
          x0,
          y0,
          x1 - x0 + 0.25,
          y1 - y0 + 0.25
        );
      }
    }

    targetCtx.restore();

    rightFrame = frame(
      targetCtx,
      RIGHT_BOX,
      [BMIN, BMAX],
      [GMIN, GMAX],
      {
        xl: "β (1/day)",
        yl: "γ (1/day)",
        xt: 4,
        yt: 5
      }
    );

    clipBox(targetCtx, RIGHT_BOX);

    var tx = rightFrame.px(BTRUE);
    var ty = rightFrame.py(GTRUE);

    targetCtx.strokeStyle = INK;
    targetCtx.lineWidth = 1.8;
    targetCtx.strokeRect(tx - 5, ty - 5, 10, 10);

    var mx = rightFrame.px(gridMin.beta);
    var my = rightFrame.py(gridMin.gamma);

    targetCtx.beginPath();
    targetCtx.arc(mx, my, 7, 0, Math.PI * 2);
    targetCtx.strokeStyle = RED;
    targetCtx.lineWidth = 2;
    targetCtx.stroke();

    targetCtx.restore();

    dot(targetCtx, 414, 345, 3, {
      color: RED,
      fill: RED,
      stroke: RED
    });

    txt(targetCtx, "후보", 422, 345, {
      size: 10,
      color: INK,
      base: "middle"
    });

    targetCtx.beginPath();
    targetCtx.arc(466, 345, 5.5, 0, Math.PI * 2);
    targetCtx.strokeStyle = RED;
    targetCtx.lineWidth = 1.8;
    targetCtx.stroke();

    txt(targetCtx, "격자 최솟값", 476, 345, {
      size: 10,
      color: INK,
      base: "middle"
    });

    targetCtx.strokeStyle = INK;
    targetCtx.lineWidth = 1.6;
    targetCtx.strokeRect(565, 340, 10, 10);

    txt(targetCtx, "참값", 580, 345, {
      size: 10,
      color: INK,
      base: "middle"
    });

    var gradient = targetCtx.createLinearGradient(
      RIGHT_BOX.x,
      370,
      RIGHT_BOX.x + RIGHT_BOX.w,
      370
    );

    gradient.addColorStop(0, INK);
    gradient.addColorStop(1, "#ffffff");

    targetCtx.fillStyle = gradient;
    targetCtx.fillRect(RIGHT_BOX.x, 370, RIGHT_BOX.w, 8);

    targetCtx.strokeStyle = G2;
    targetCtx.lineWidth = 0.7;
    targetCtx.strokeRect(RIGHT_BOX.x, 370, RIGHT_BOX.w, 8);

    txt(targetCtx, "낮은 손실", RIGHT_BOX.x, 393, {
      size: 10,
      color: INK,
      base: "middle"
    });

    txt(
      targetCtx,
      "높은 손실",
      RIGHT_BOX.x + RIGHT_BOX.w,
      393,
      {
        size: 10,
        color: INK,
        align: "right",
        base: "middle"
      }
    );
  }

  function buildRightCache() {
    cacheCtx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    cacheCtx.clearRect(0, 0, 720, H);
    drawRightStatic(cacheCtx);
  }

  function drawRightFromCache() {
    ctx.drawImage(
      cacheCanvas,
      370 * scaleX,
      0,
      350 * scaleX,
      H * scaleY,
      370,
      0,
      350,
      H
    );

    clipBox(ctx, RIGHT_BOX);

    dot(
      ctx,
      rightFrame.px(candBeta),
      rightFrame.py(candGamma),
      4,
      {
        color: RED,
        fill: RED,
        stroke: RED
      }
    );

    ctx.restore();
  }

  function updateReadout() {
    var distance = Math.sqrt(
      Math.pow(gridMin.beta - BTRUE, 2) +
      Math.pow(gridMin.gamma - GTRUE, 2)
    );

    var candidateR0 = candBeta / candGamma;
    var teaching;

    if (k <= 5) {
      teaching =
        "관측 시점이 적으면 평평한 골짜기가 생길 수 있습니다. " +
        "여러 (β, γ)가 비슷한 손실을 내므로 모수를 식별하기 어려울 수 있습니다.";
    } else if (k >= 10) {
      teaching =
        "관측 시점이 많으면 참값 주변의 최소점이 더 뚜렷해지는 경향이 있습니다. " +
        "다만 잡음이 크면 추정값이 참값에서 벗어날 수 있습니다.";
    } else {
      teaching =
        "관측 시점이 늘면 모수 조합을 구분하기 쉬워질 수 있습니다. " +
        "잡음과 관측 시점의 배치도 추정 결과에 영향을 줍니다.";
    }

    out.innerHTML =
      "<b>후보 손실</b> L = <span class=\"r\">" +
      fmtg(candidateLoss, 4) +
      " people²</span> · R₀ = β/γ = " +
      fmt(candidateR0, 3) +
      " (참값 " + fmt(RTRUE, 3) + ")" +
      "<br><b>격자 최솟값</b> L = " +
      fmtg(gridMin.loss, 4) +
      " people² · (β̂, γ̂) = (" +
      fmt(gridMin.beta, 3) + ", " +
      fmt(gridMin.gamma, 3) +
      ") 1/day · 참값과의 거리 = " +
      fmt(distance, 4) + " 1/day" +
      "<br><span class=\"r\">" + teaching + "</span>";
  }

  function drawAll() {
    cv.clear();
    drawLeft();
    buildRightCache();
    drawRightFromCache();
    updateReadout();
  }

  function refreshDataAndGrid() {
    makeObservations();
    computeGridLoss();
    candidateLoss = lossFromSolution(candidateLossSol);
    drawAll();
  }

  function candidateChanged() {
    candidateSol = simulate(candBeta, candGamma, 0.1);
    candidateLossSol = candidateSol;
    candidateLoss = lossFromSolution(candidateLossSol);

    drawAll();
  }

  precomputeGridTrajectories();

  candidateSol = simulate(candBeta, candGamma, 0.1);
  candidateLossSol = candidateSol;

  refreshDataAndGrid();
});

mount("logistic-boundary",function(el,cfg){
  var H=400;
  var INK="#1a1a1a";
  var RED="#9e2b25";
  var GRAY="#777777";
  var GRID="#e8e6e0";
  var BOX={x:76,y:49,w:570,h:282};
  var NCELLS=48;
  var NCLASS=45;
  var SD=0.12;
  var LOG3=Math.log(3);

  var theta=30;
  var magnitude=8;
  var offset=0.375;
  var overlap=0.4;
  var seed=432432;
  var settingControls=false;

  var center0={x:0.3,y:0.5};
  var center1={x:0.7,y:0.5};
  var points0=[];
  var points1=[];
  var points=[];
  var bestSearch={theta:0,bias:-3,accuracy:0};

  var bar1=ctlBar(el);
  var bar2=ctlBar(el);

  var thetaCtl;
  var magnitudeCtl;
  var offsetCtl;
  var overlapCtl;

  var cv=canvas(el,H);
  var ctx=cv.ctx;
  var out=readout(el);

  thetaCtl=slider(
    bar1,
    "법선 방향 θ (도)",
    [0,360,30,1],
    function(v){
      theta=clamp(Number(v),0,360);
      if(!settingControls) drawAll();
    },
    function(v){return fmt(v,0)+"°";}
  );

  magnitudeCtl=slider(
    bar1,
    "크기 |w|",
    [0.5,30,8,0.5],
    function(v){
      magnitude=clamp(Number(v),0.5,30);
      if(!settingControls) drawAll();
    },
    function(v){return fmt(v,1);}
  );

  offsetCtl=slider(
    bar1,
    "경계 위치 d",
    [-0.2,1.2,0.375,0.01],
    function(v){
      offset=clamp(Number(v),-0.2,1.2);
      if(!settingControls) drawAll();
    },
    function(v){return fmt(v,2);}
  );

  overlapCtl=slider(
    bar2,
    "클래스 중심 거리",
    [0.18,0.55,0.4,0.01],
    function(v){
      overlap=clamp(Number(v),0.18,0.55);
      regenerateData();
      findBestBoundary();
      drawAll();
    },
    function(v){return fmt(v,2);}
  );

  button(bar2,"격자 탐색 최고 경계",function(){
    if(!bestSearch) return;

    settingControls=true;
    thetaCtl.set(bestSearch.theta);
    magnitudeCtl.set(12);
    offsetCtl.set(-bestSearch.bias/12);

    theta=bestSearch.theta;
    magnitude=12;
    offset=-bestSearch.bias/12;

    settingControls=false;
    drawAll();
  });

  button(bar2,"새 데이터",function(){
    seed=(seed+104729)>>>0;
    regenerateData();
    findBestBoundary();
    drawAll();
  });

  note(
    el,
    "뉴런 하나의 sigmoid output(시그모이드 출력)은 p=σ(w·x+b)입니다. 아래에서는 법선 방향 각도 θ·크기 |w|·위치 d로 w와 b를 나타냅니다. p≥0.5이면 클래스 1, 그렇지 않으면 클래스 0으로 분류합니다. MLP(다층 퍼셉트론)는 선형 연산과 activation(활성화 함수)을 반복해 분류 라벨을 냅니다."
  );

  note(
    el,
    "z=|w|(cosθ·x₁+sinθ·x₂−d)라 하면 decision boundary(결정 경계)는 z=0, 즉 cosθ·x₁+sinθ·x₂=d인 직선입니다. θ는 경계의 법선 방향 각도(경계 직선의 방향각은 θ+90°), d는 원점에서 경계까지의 부호 있는 거리, |w|는 sigmoid 전이의 가파름만 바꾸고 경계 위치는 바꾸지 않습니다. 직선 하나로는 비선형 패턴을 나눌 수 없어 층을 쌓아 비선형 경계를 표현합니다. 다만 클래스 분포 자체가 겹치면 어떤 경계로도 오분류는 남습니다."
  );

  function sigmoid(z){
    if(z>=0){
      var e=Math.exp(-z);
      return 1/(1+e);
    }
    var e2=Math.exp(z);
    return e2/(1+e2);
  }

  function curBias(){return -magnitude*offset;}

  function weights(angleDeg,mag){
    var a=angleDeg*Math.PI/180;
    return {
      x:mag*Math.cos(a),
      y:mag*Math.sin(a)
    };
  }

  function logitForLevel(p){
    return Math.log(p/(1-p));
  }

  function probability(x,y,angleDeg,mag,b){
    var w=weights(angleDeg,mag);
    return sigmoid(w.x*x+w.y*y+curBias());
  }

  function classify(x,y,angleDeg,mag,b){
    var w=weights(angleDeg,mag);
    return w.x*x+w.y*y+curBias()>=0?1:0;
  }

  function makeBlob(random,cx,cy,n,label){
    var arr=[];
    for(var i=0;i<n;i++){
      var x,y,tries=0;
      do{
        x=cx+SD*gauss(random);
        y=cy+SD*gauss(random);
        tries++;
      }while((x<0||x>1||y<0||y>1)&&tries<40);
      x=clamp(x,0.005,0.995);
      y=clamp(y,0.005,0.995);
      arr.push({x:x,y:y,label:label});
    }
    return arr;
  }

  function regenerateData(){
    center0={x:0.5-overlap/2,y:0.5};
    center1={x:0.5+overlap/2,y:0.5};

    var random=rng(seed);
    points0=makeBlob(random,center0.x,center0.y,NCLASS,0);
    points1=makeBlob(random,center1.x,center1.y,NCLASS,1);
    points=points0.concat(points1);
  }

  function accuracyAt(angleDeg,mag,b){
    var correct=0;
    for(var i=0;i<points.length;i++){
      var p=points[i];
      if(classify(p.x,p.y,angleDeg,mag,b)===p.label){
        correct++;
      }
    }
    return correct/points.length;
  }

  function findBestBoundary(){
    var bestAcc=-1;
    var bestTheta=0;
    var bestBias=-3;
    var fixedMag=12;

    for(var deg=0;deg<=357;deg+=3){
      var w=weights(deg,fixedMag);

      for(var bi=0;bi<=100;bi++){
        var d=-0.2+bi*0.014;
        var b=-fixedMag*d;
        var correct=0;

        for(var pi=0;pi<points.length;pi++){
          var p=points[pi];
          var predicted=w.x*p.x+w.y*p.y+b>=0?1:0;
          if(predicted===p.label) correct++;
        }

        var acc=correct/points.length;
        if(acc>bestAcc){
          bestAcc=acc;
          bestTheta=deg;
          bestBias=b;
        }
      }
    }

    bestSearch={
      theta:bestTheta,
      bias:bestBias,
      accuracy:bestAcc
    };
  }

  function lineIntersections(level){
    var w=weights(theta,magnitude);
    var pts=[];
    var eps=1e-8;
    var target=level-curBias();

    function add(x,y){
      if(!isFinite(x)||!isFinite(y)) return;
      if(x < -eps || x > 1+eps || y < -eps || y > 1+eps) return;

      x=clamp(x,0,1);
      y=clamp(y,0,1);

      for(var i=0;i<pts.length;i++){
        if(Math.abs(pts[i].x-x)<1e-7 &&
           Math.abs(pts[i].y-y)<1e-7){
          return;
        }
      }

      pts.push({x:x,y:y});
    }

    if(Math.abs(w.x)>eps){
      add(target/w.x,0);
      add((target-w.y)/w.x,1);
    }

    if(Math.abs(w.y)>eps){
      add(0,target/w.y);
      add(1,(target-w.x)/w.y);
    }

    if(pts.length<2) return null;

    var bestA=pts[0];
    var bestB=pts[1];
    var bestD=-1;

    for(var i=0;i<pts.length;i++){
      for(var j=i+1;j<pts.length;j++){
        var dx=pts[i].x-pts[j].x;
        var dy=pts[i].y-pts[j].y;
        var d=dx*dx+dy*dy;

        if(d>bestD){
          bestD=d;
          bestA=pts[i];
          bestB=pts[j];
        }
      }
    }

    return bestD>eps?{a:bestA,b:bestB}:null;
  }

  function drawLine(f,level,color,width,dash){
    var ends=lineIntersections(level);
    if(!ends) return false;

    path(ctx,[
      [f.px(ends.a.x),f.py(ends.a.y)],
      [f.px(ends.b.x),f.py(ends.b.y)]
    ],{
      color:color,
      w:width,
      dash:dash
    });

    return true;
  }

  function drawNormalArrow(f){
    var ends=lineIntersections(0);
    if(!ends) return;

    var w=weights(theta,magnitude);
    var norm=Math.sqrt(w.x*w.x+w.y*w.y);
    if(norm<1e-12) return;

    var ux=w.x/norm;
    var uy=w.y/norm;

    var start={
      x:(ends.a.x+ends.b.x)/2,
      y:(ends.a.y+ends.b.y)/2
    };

    var available=Infinity;

    if(ux>1e-9){
      available=Math.min(available,(1-start.x)/ux);
    }else if(ux<-1e-9){
      available=Math.min(available,(0-start.x)/ux);
    }

    if(uy>1e-9){
      available=Math.min(available,(1-start.y)/uy);
    }else if(uy<-1e-9){
      available=Math.min(available,(0-start.y)/uy);
    }

    var length=clamp(1.2/magnitude,0.04,0.22);
    length=Math.min(length,Math.max(0,available*0.8));

    if(length<=0.005) return;

    var end={
      x:start.x+ux*length,
      y:start.y+uy*length
    };

    arrow(
      ctx,
      f.px(start.x),
      f.py(start.y),
      f.px(end.x),
      f.py(end.y),
      {color:RED,w:2}
    );

    txt(ctx,"w",f.px(end.x)+7,f.py(end.y)-7,{
      size:12,
      color:RED,
      weight:"bold",
      base:"middle",
      halo:true
    });
  }

  function drawProbabilityBackground(){
    clipBox(ctx,BOX);

    var cw=BOX.w/NCELLS;
    var ch=BOX.h/NCELLS;

    for(var j=0;j<NCELLS;j++){
      var y=1-(j+0.5)/NCELLS;
      var py=BOX.y+j*ch;

      for(var i=0;i<NCELLS;i++){
        var x=(i+0.5)/NCELLS;
        var p=probability(x,y,theta,magnitude);
        var shade=Math.round(255-76.5*p);

        ctx.fillStyle="rgb("+shade+","+shade+","+shade+")";
        ctx.fillRect(
          BOX.x+i*cw,
          py,
          cw+0.25,
          ch+0.25
        );
      }
    }

    ctx.restore();
  }

  function drawPoints(f){
    for(var i=0;i<points.length;i++){
      var p=points[i];
      var px=f.px(p.x);
      var py=f.py(p.y);
      var predicted=classify(p.x,p.y,theta,magnitude);
      var wrong=predicted!==p.label;

      if(p.label===0){
        marker(ctx,0,px,py,3.5,{
          color:INK,
          hollow:false
        });
      }else{
        marker(ctx,1,px,py,4,{
          color:RED,
          hollow:false
        });
      }

      if(wrong){
        ctx.beginPath();
        ctx.arc(px,py,7.2,0,Math.PI*2);
        ctx.strokeStyle=RED;
        ctx.lineWidth=2.5;
        ctx.stroke();
      }
    }
  }

  function drawLegend(){
    dot(ctx,81,366,3.2,{
      color:INK,
      fill:INK,
      stroke:INK
    });

    txt(ctx,"클래스 0",90,366,{
      size:10,
      color:INK,
      base:"middle"
    });

    marker(ctx,1,157,366,4,{
      color:RED,
      hollow:false
    });

    txt(ctx,"클래스 1",166,366,{
      size:10,
      color:INK,
      base:"middle"
    });

    seg(ctx,242,366,263,366,{
      color:INK,
      w:2
    });

    txt(ctx,"p=0.5 경계",269,366,{
      size:10,
      color:INK,
      base:"middle"
    });

    seg(ctx,361,366,382,366,{
      color:GRAY,
      w:1.5,
      dash:[5,4]
    });

    txt(ctx,"p=0.25/0.75",388,366,{
      size:10,
      color:INK,
      base:"middle"
    });

    ctx.beginPath();
    ctx.arc(516,366,6,0,Math.PI*2);
    ctx.strokeStyle=RED;
    ctx.lineWidth=2.2;
    ctx.stroke();

    txt(ctx,"오분류",527,366,{
      size:10,
      color:INK,
      base:"middle"
    });
  }

  function currentStats(){
    var correct=0;
    var misclassified=0;

    for(var i=0;i<points.length;i++){
      var p=points[i];
      var predicted=classify(p.x,p.y,theta,magnitude);

      if(predicted===p.label){
        correct++;
      }else{
        misclassified++;
      }
    }

    return {
      accuracy:correct/points.length,
      misclassified:misclassified,
      p0:probability(center0.x,center0.y,theta,magnitude),
      p1:probability(center1.x,center1.y,theta,magnitude)
    };
  }

  function teachingSentence(stats){
    if(overlap<=0.30 && bestSearch.accuracy<0.90){
      return "현재 표본에서 격자로 탐색한 최고 정확도가 90%에 못 미칩니다. 클래스 분포가 실제로 겹치면 어떤 경계를 써도 오분류가 남고, 비선형 경계가 필요한 패턴은 층을 쌓아 표현합니다.";
    }

    if(magnitude<4){
      return "|w|가 작으면 시그모이드 전이가 완만합니다. 경계 주변에서 p가 서서히 변해 확률적 판단이 두드러집니다.";
    }

    if(magnitude>=20){
      return "|w|가 크면 시그모이드 출력이 계단 함수에 가까워집니다. p=0.5 경계 근처에서 출력이 급격히 바뀝니다.";
    }

    return "θ는 경계의 법선 방향 각도(경계 직선의 방향각은 θ+90°), d는 원점에서 경계까지의 거리를 바꿉니다. |w|는 경계를 고정한 채 sigmoid 출력의 전이 가파름만 바꿉니다.";
  }

  function updateReadout(){
    var s=currentStats();

    out.innerHTML=
      "<b>현재 표본 정확도</b> <span class=\"r\">"+
      fmt(100*s.accuracy,1)+"%</span> · 오분류 "+
      s.misclassified+"/"+points.length+
      "<br><b>두 클래스 중심의 sigmoid 출력</b> p₀ = "+
      fmt(s.p0,3)+" · p₁ = "+fmt(s.p1,3)+
      " · 같은 표본 격자 탐색 최고 정확도 (|w|=12, θ 3°·d 0.014 간격, d −0.2~1.2) "+
      fmt(100*bestSearch.accuracy,1)+"%"+
      "<br><span class=\"r\">"+teachingSentence(s)+"</span>";
  }

  function drawAll(){
    cv.clear();

    txt(ctx,"뉴런 하나의 결정 경계",36,24,{
      size:14,
      color:INK,
      weight:"bold",
      base:"middle"
    });

    drawProbabilityBackground();

    var f=frame(
      ctx,
      BOX,
      [0,1],
      [0,1],
      {
        xl:"x₁",
        yl:"x₂",
        xt:5,
        yt:5
      }
    );

    clipBox(ctx,BOX);

    drawLine(f,logitForLevel(0.25),GRAY,1.2,[5,4]);
    drawLine(f,logitForLevel(0.75),GRAY,1.2,[5,4]);

    var hasBoundary=drawLine(f,0,INK,2.1,null);

    if(hasBoundary){
      drawNormalArrow(f);
    }else{
      txt(ctx,"p=0.5 경계가 화면 밖",BOX.x+10,BOX.y+15,{
        size:11,
        color:RED,
        weight:"bold",
        base:"middle",
        halo:true
      });
    }

    drawPoints(f);
    ctx.restore();

    drawLegend();
    updateReadout();
  }

  regenerateData();
  findBestBoundary();
  drawAll();
});

})();
