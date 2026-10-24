/* v6-extra.js : MATH432 수리데이터사이언스 (sudesa-notes) interactive widget pack
   Requires assets/v6.js (window.V6). Registers widgets with V6.register(name, mountFn(el,cfg)).
   Style: white bg, ink #1a1a1a, red #9e2b25 accent only, grays for secondary. Canvas only, no libraries.
   Every widget: <div class="v6-widget" data-widget="NAME" data-config='{...}'></div>  (config optional) */
(function(){
"use strict";
if(!window.V6){console.warn("v6-extra: V6 runtime missing");return;}
var V6=window.V6, INK="#1a1a1a", RED="#9e2b25", G1="#1a1a1a", G2="#1a1a1a", G3="#e8e6e0", GRID="#e8e6e0";
var FONT="'Noto Sans KR',sans-serif";
var DPR=Math.max(1,Math.min(2,window.devicePixelRatio||1));
var X={}; /* pure math, exposed as V6.x for self-checks */
V6.x=X;

/* ---------- css (kept here so only this file is needed) ---------- */
(function(){
  if(document.getElementById("v6x-css"))return;
  var s=document.createElement("style");
  s.id="v6x-css";
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
    ".v6x-ctl .v6-btn:active{transform:translateY(1px)}"+
    ".v6x-ctl .v6-btn:disabled{opacity:.55;cursor:not-allowed}"+
    ".v6x-cap{font-size:13px;color:#1a1a1a;margin-top:6px;line-height:1.6}"+
    ".v6-widget{overflow:hidden}.v6-val{font-variant-numeric:tabular-nums}";
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
function mount(name,fn){var w=function(el,cfg){if(el.hasAttribute("data-v6x"))return;el.setAttribute("data-v6x",name);V6.title(el,cfg.title);fn(el,cfg||{});};X.names.push(name);X.fns[name]=function(el,cfg){w(el,cfg);refont(el);};V6.register(name,X.fns[name]);}
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

mount("sir-model",function(el,cfg){
  var N=cfg.N||40,I0=cfg.I0==null?1:cfg.I0,T=cfg.T||120;
  var cv=canvas(el,cfg.h||360),ctx=cv.ctx;
  var bar=ctlBar(el),st={t:0};
  var sb=slider(bar,"β (접촉률)",cfg.beta||[0.02,1,1/3,"any"],draw,function(v){return fmt(v,3);});
  var sg=slider(bar,"γ (회복률)",cfg.gamma||[0.02,0.5,1/14,"any"],draw,function(v){return fmt(v,3);});
  var stT=slider(bar,"시각 t",[0,T,0,0.5],draw,function(v){return fmt(v,1);});
  var eu=check(bar,"Euler(Δt=1) 겹쳐보기",false,draw);
  button(bar,"기본값(β=1/3, γ=1/14)",function(){sb.set(1/3);sg.set(1/14);draw();});
  var ro=readout(el);
  var BL={x:50,y:30,w:300,h:270},BR={x:412,y:30,w:290,h:270};
  function draw(){
    var beta=sb.get(),gamma=sg.get(),R0=beta/gamma,S0=N-I0;
    var sim=rk4(sirF(beta,gamma,N),[S0,I0,0],0,T,0.1),pk=peakOf(sim);
    var es=eu.get()?euler(sirF(beta,gamma,N),[S0,I0,0],0,T,1):null;
    cv.clear();
    var m=frame(ctx,BL,[0,T],[0,N],{xl:"t (일)",yl:"인원 (N="+N+")"});
    clipBox(ctx,BL);
    [[0,INK,[],"S"],[2,G1,[6,4],"R"],[1,RED,[],"I"]].forEach(function(s){
      path(ctx,sim.t.map(function(t,i){return [m.px(t),m.py(sim.y[i][s[0]])];}),{color:s[1],dash:s[2],w:s[0]===1?2.6:2});
      if(es&&s[0]===1)path(ctx,es.t.map(function(t,i){return [m.px(t),m.py(es.y[i][1])];}),{color:G1,dash:[2,3],w:2});});
    ctx.restore();
    seg(ctx,BL.x,m.py(pk.I),BL.x+BL.w,m.py(pk.I),{color:G2,dash:[3,3]});
    dot(ctx,m.px(pk.t),m.py(pk.I),4.5,{fill:false,stroke:RED,w:1.6});
    txt(ctx,"I_max="+fmt(pk.I,1),BL.x+BL.w-4,m.py(pk.I)-5,{align:"right",size:11,color:RED});
    var tt=stT.get(),k=Math.min(sim.y.length-1,Math.round(tt/0.1)),cur=sim.y[k];
    seg(ctx,m.px(tt),BL.y,m.px(tt),BL.y+BL.h,{color:G2,dash:[2,3]});
    [[0,INK],[1,RED],[2,G1]].forEach(function(s){dot(ctx,m.px(tt),m.py(cur[s[0]]),3.6,{color:s[1]});});
    legend(ctx,BL.x+BL.w-70,BL.y+16,[{label:"S",color:INK},{label:"I (현재 감염자)",color:RED,w:2.6},{label:"R",color:G1,dash:[6,4]}]);
    if(es)txt(ctx,"점선: Euler Δt=1  (I_max="+fmt(Math.max.apply(null,es.y.map(function(y){return y[1];})),1)+")",BL.x+6,BL.y+BL.h-8,{size:11,color:G1});
    /* phase plane */
    var yM=Math.max(pk.I,I0)*1.2+1;
    var p=frame(ctx,BR,[0,N],[0,yM],{xl:"S",yl:"I",xt:5});
    clipBox(ctx,BR);
    seg(ctx,p.px(N),p.py(0),p.px(N-yM),p.py(yM),{color:G2,dash:[5,4]});
    if(R0*S0/N>1)seg(ctx,p.px(N/R0),BR.y,p.px(N/R0),BR.y+BR.h,{color:RED,dash:[5,4],w:1.3});
    if(es)path(ctx,es.y.map(function(y){return [p.px(y[0]),p.py(y[1])];}),{color:G1,dash:[2,3],w:2});
    path(ctx,sim.y.map(function(y){return [p.px(y[0]),p.py(y[1])];}),{color:INK,w:2.4});
    ctx.restore();
    if(R0*S0/N>1)txt(ctx,"S=N/R₀",p.px(N/R0)+4,BR.y+12,{size:11,color:RED});
    dot(ctx,p.px(sim.y[0][0]),p.py(sim.y[0][1]),3.6,{color:INK});
    dot(ctx,p.px(pk.k?sim.y[pk.k][0]:S0),p.py(pk.I),4.5,{fill:false,stroke:RED,w:1.6});
    dot(ctx,p.px(cur[0]),p.py(cur[1]),4.2,{color:RED});
    txt(ctx,"S+I=N (R=0)",p.px(N)-4,p.py(0)-14,{size:10.5,color:G1,align:"right"});
    var Sinf=sirFinal(beta,gamma,N,S0,I0),Im=sirImax(beta,gamma,N,S0,I0);
    ro.innerHTML="<b>R₀ = β/γ = "+fmt(R0,2)+"</b> &nbsp;"+(R0*S0/N>1?"<span class='r'>R₀S₀/N = "+fmt(R0*S0/N,3)+" > 1 : I가 처음엔 증가한다 (유행)</span>":"<span class='r'>R₀S₀/N = "+fmt(R0*S0/N,3)+" ≤ 1 : I가 처음부터 줄어든다 (유행 없음)</span>")+
     " &nbsp;<span class='m'>(접촉 간격 1/β = "+fmt(1/beta,1)+"일, 회복 1/γ = "+fmt(1/gamma,1)+"일)</span><br>"+
     "I_max : 수치해 <b>"+fmt(pk.I,2)+"</b> (t="+fmt(pk.t,1)+"일) · 공식 I₀+S₀−(N/R₀)(1+ln(R₀S₀/N)) = <b>"+fmt(Im,2)+"</b> &nbsp;|&nbsp; "+
     "최종 S<sub>∞</sub> : 수치 "+fmt(sim.y[sim.y.length-1][0],2)+" · final-size 방정식 "+fmt(Sinf,2)+" &nbsp;|&nbsp; 피크는 S가 N/R₀ = "+(R0*S0/N>1?fmt(N/R0,2):"— (피크가 t=0)")+" 일 때";
  }
  draw();
});

mount("sir-phase",function(el,cfg){
  var N=cfg.N||40,cv=canvas(el,cfg.h||380),ctx=cv.ctx,bar=ctlBar(el);
  var sR=slider(bar,"R₀ = β/γ",cfg.R0||[0.3,8,4.67,0.01],draw,function(v){return fmt(v,2);});
  var pts=[];button(bar,"초기점 지우기",function(){pts=[];draw();});
  button(bar,"기본 초기점 다시",function(){pts=def();draw();});
  function def(){return [[N-1,1],[N*0.8,N*0.2],[N*0.55,N*0.45],[N*0.3,N*0.2]];}
  pts=def();
  var ro=readout(el);var B={x:54,y:26,w:640,h:310},m;
  function traj(R0,S0,I0){ // I(S)=I0+S0-S+(N/R0)ln(S/S0), S from S0 down to I=0
    var out=[],S=S0,k=0,hi=S0,fin;
    // find S_inf: I(S)=0 root below S0 (or S0 if R0*S0/N<=1 => I falls to 0 at S0? then I decreasing in S so S stays)
    var I=function(s){return I0+S0-s+(N/R0)*Math.log(s/S0);};
    var lo=S0*1e-12;hi=S0;for(var i=0;i<200;i++){var mid=(lo+hi)/2;if(I(mid)>0)hi=mid;else lo=mid;}fin=(lo+hi)/2;
    for(var j=0;j<=240;j++){var s=S0+(fin-S0)*j/240;out.push([s,Math.max(0,I(s))]);}
    return {pts:out,Sinf:fin,I:I};}
  function draw(){
    var R0=sR.get();cv.clear();var ym=N*(R0>1?0.62:0.6);
    m=frame(ctx,B,[0,N],[0,ym],{xl:"S",yl:"I",xt:8});
    clipBox(ctx,B);
    seg(ctx,m.px(N),m.py(0),m.px(N-ym),m.py(ym),{color:G2,dash:[5,4]});
    if(R0>1)seg(ctx,m.px(N/R0),B.y,m.px(N/R0),B.y+B.h,{color:RED,dash:[5,4],w:1.4});
    // direction arrows along trajectories
    var res=[];
    pts.forEach(function(p0){var tr=traj(R0,p0[0],p0[1]);path(ctx,tr.pts.map(function(q){return [m.px(q[0]),m.py(q[1])];}),{color:INK,w:2});
      var a=Math.floor(tr.pts.length*0.30),q0=tr.pts[a],q1=tr.pts[a+4];
      arrow(ctx,m.px(q0[0]),m.py(q0[1]),m.px(q1[0]),m.py(q1[1]),{color:INK,w:2,head:8});
      res.push(tr);});
    ctx.restore();
    res.forEach(function(tr,i){var p0=pts[i];dot(ctx,m.px(p0[0]),m.py(p0[1]),4,{color:INK});
      dot(ctx,m.px(tr.Sinf),m.py(0),4,{fill:false,stroke:RED,w:1.6});
      if(R0*p0[0]/N>1){var pk=sirImax(1,1/R0,N,p0[0],p0[1]);dot(ctx,m.px(N/R0),m.py(pk),4.2,{color:RED});}});
    if(R0>1)txt(ctx,"S = N/R₀ (임계값, 피크 위치)",m.px(N/R0)+5,B.y+14,{size:11.5,color:RED});
    txt(ctx,"클릭하면 그 점에서 시작하는 궤적이 추가된다",B.x+B.w-6,B.y+14,{size:11,color:G1,align:"right"});
    ro.innerHTML="궤적은 <b>항상 왼쪽으로</b> 간다 (S는 비증가). 각 궤적은 I = I₀+S₀−S+(N/R₀)·ln(S/S₀) &nbsp;·&nbsp; 붉은 점 = 피크(S=N/R₀), 붉은 빈 원 = 정상상태 S<sub>∞</sub>(I=0, x축 위)<br>"+
     "R₀ = <b>"+fmt(R0,2)+"</b> "+(R0>1?"→ 임계값 N/R₀ = "+fmt(N/R0,2)+" 보다 오른쪽(S가 클 때)에서 시작하면 I가 먼저 증가한 뒤 감소":"→ N/R₀ ≥ N 이라 어느 초기점에서도 I는 단조 감소");
  }
  cv.c.addEventListener("click",function(e){var q=ptr(cv,e),S=m.ix(q[0]),I=m.iy(q[1]);
    if(S>0&&I>0&&S+I<=N&&pts.length<14){pts.push([S,I]);draw();}});
  draw();
});

mount("sir-final-size",function(el,cfg){
  var cv=canvas(el,cfg.h||340),ctx=cv.ctx,bar=ctlBar(el);
  var sR=slider(bar,"R₀",cfg.R0||[0.2,6,2.5,0.05],draw,function(v){return fmt(v,2);});
  var s0s=slider(bar,"초기 S₀/N",cfg.s0||[0.5,0.999,0.975,0.001],draw,function(v){return fmt(v,3);});
  var ro=readout(el);var BL={x:50,y:28,w:300,h:250},BR={x:412,y:28,w:290,h:250};
  function root(R0,s0){var lo=s0*1e-14,hi=s0;for(var i=0;i<200;i++){var m=(lo+hi)/2;if(m-s0*Math.exp(-R0*(1-m))>0)hi=m;else lo=m;}return (lo+hi)/2;}
  X.finalRoot=root;
  function draw(){
    var R0=sR.get(),s0=s0s.get(),sf=root(R0,s0);cv.clear();
    var m=frame(ctx,BL,[0,1],[0,1],{xl:"s = S/N",yl:"y",xt:5,yt:5});
    clipBox(ctx,BL);seg(ctx,m.px(0),m.py(0),m.px(1),m.py(1),{color:INK,w:1.6});
    curve(ctx,m,function(s){return s0*Math.exp(-R0*(1-s));},0,1,{color:RED,w:2.4});ctx.restore();
    txt(ctx,"y = s",m.px(0.78),m.py(0.84)+4,{size:11.5});
    txt(ctx,"y = s₀·exp(−R₀(1−s))",m.px(0.02),m.py(Math.min(0.95,s0*Math.exp(-R0))+0.12),{size:11.5,color:RED});
    seg(ctx,m.px(sf),m.py(0),m.px(sf),m.py(sf),{color:RED,dash:[3,3]});dot(ctx,m.px(sf),m.py(sf),5,{color:RED});
    txt(ctx,"s∞="+fmt(sf,3),m.px(sf),BL.y+BL.h+30,{size:11.5,color:RED,align:"center"});
    var m2=frame(ctx,BR,[0,6],[0,1],{xl:"R₀",yl:"s∞ = S∞/N",xt:6,yt:5});
    clipBox(ctx,BR);curve(ctx,m2,function(r){return root(Math.max(r,1e-6),s0);},0.0001,6,{color:INK,w:2.2,n:240});ctx.restore();
    seg(ctx,m2.px(1),BR.y,m2.px(1),BR.y+BR.h,{color:G2,dash:[4,4]});
    txt(ctx,"R₀=1",m2.px(1)+4,BR.y+12,{size:11,color:G1});
    dot(ctx,m2.px(R0),m2.py(sf),5,{color:RED});
    ro.innerHTML="유행이 끝난 뒤 <b>걸린 비율 1−s∞ = "+fmt(1-sf,3)+"</b>, 안 걸린 비율 s∞ = "+fmt(sf,3)+" &nbsp;·&nbsp; 방정식 s∞ = s₀·exp(−R₀(1−s∞)) (R(0)=0일 때, S∞=N·s∞)<br>"+
     "왼쪽: 두 곡선 y=s 와 y=s₀e<sup>−R₀(1−s)</sup> 의 <b>교점</b>이 s∞ (s=s₀는 교점이 아니다 : I₀&gt;0 이므로). 오른쪽: R₀가 클수록 s∞는 0에 가까워지지만 <b>0이 되지는 않는다</b> — 결국 유행은 끝나도 S는 남는다.";
  }
  draw();
});

/* 수치해법 비교: Euler vs RK3 (주제 4) */
mount("ode-methods",function(el,cfg){
  var cv=canvas(el,cfg.h||370),ctx=cv.ctx,bar=ctlBar(el);
  var prob=select(bar,"문제",[
    ["decay","y′ = −y, y(0)=1"],
    ["grow","y′ = y, y(0)=1"],
    ["sir","SIR의 I(t)"]
  ],cfg.problem||"decay",draw);
  var sh=slider(bar,"Δt",[.05,2.2,.5,.05],draw,function(v){return fmt(v,2);});
  /* Keep page-level left/right navigation from consuming slider/select keys. */
  bar.addEventListener("keydown",function(e){if(e.key==="ArrowLeft"||e.key==="ArrowRight")e.stopPropagation();});
  bar.querySelectorAll("select,input").forEach(function(e){e.style.minHeight="44px";});
  var ro=readout(el),BL={x:52,y:30,w:320,h:260},BR={x:450,y:30,w:245,h:260};
  var refCache={};
  function layout(){
    var w=Math.max(240,Math.min(720,el.clientWidth-24)),stack=w<560;
    var h=stack?640:370;
    cv.c.width=Math.round(w*DPR);cv.c.height=h*DPR;
    cv.c.style.width=w+"px";cv.c.style.maxWidth="100%";
    cv.clear=function(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);};
    if(stack){BL={x:48,y:30,w:w-64,h:240};BR={x:48,y:355,w:w-64,h:240};}
    else{BL={x:52,y:30,w:w*.45-4,h:260};BR={x:w*.64,y:30,w:w*.36-25,h:260};}
  }

  function spec(){
    var p=prob.get();
    if(p==="decay")return {f:function(t,y){return [-y[0]];},y0:[1],T:5,ex:function(t){return Math.exp(-t);},idx:0,yr:[-1.2,1.4],name:"y(t)",lambda:-1};
    if(p==="grow")return {f:function(t,y){return [y[0]];},y0:[1],T:2,ex:function(t){return Math.exp(t);},idx:0,yr:[0,8],name:"y(t)",lambda:1};
    var f=sirF(1/3,1/14,40);
    return {f:f,y0:[39,1,0],T:60,ex:null,idx:1,yr:[0,26],name:"I(t)",lambda:null};
  }
  function exact(sp,p){
    if(sp.ex)return sp.ex;
    if(!refCache[p])refCache[p]=rk4(sp.f,sp.y0,0,sp.T,.005);
    var r=refCache[p];
    return function(t){var k=Math.min(r.y.length-1,Math.round(t/.005));return r.y[k][1];};
  }
  function errAt(sp,ex,method,h){
    var r=method(sp.f,sp.y0,0,sp.T,h);
    return Math.abs(r.y[r.y.length-1][sp.idx]-ex(sp.T));
  }
  function draw(){
    var p=prob.get(),sp=spec(),ex=exact(sp,p),n=Math.max(1,Math.round(sp.T/sh.get())),h=sp.T/n;
    var eu=euler(sp.f,sp.y0,0,sp.T,h),r3=rk3(sp.f,sp.y0,0,sp.T,h);
    layout();cv.clear();
    var m=frame(ctx,BL,[0,sp.T],sp.yr,{xl:"t",yl:sp.name});
    clipBox(ctx,BL);
    curve(ctx,m,ex,0,sp.T,{color:INK,w:2.2,n:400});
    path(ctx,eu.t.map(function(t,i){return [m.px(t),m.py(eu.y[i][sp.idx])];}),{color:RED,w:1.6,dash:[4,3]});
    path(ctx,r3.t.map(function(t,i){return [m.px(t),m.py(r3.y[i][sp.idx])];}),{color:INK,w:1.5,dash:[8,4,2,4]});
    ctx.restore();
    legend(ctx,BL.x+BL.w-135,BL.y+16,[
      {label:"참고 해",color:INK},
      {label:"Euler",color:RED,dash:[4,3]},
      {label:"RK3",color:INK,dash:[8,4,2,4]}
    ]);
    var hs=[],eE=[],eR=[];
    for(var k=0;k<=12;k++){
      var requested=.5*Math.pow(2,-k/2);
      var hv=sp.T/Math.max(1,Math.round(sp.T/requested));hs.push(hv);
      eE.push(errAt(sp,ex,euler,hv));eR.push(errAt(sp,ex,rk3,hv));
    }
    var all=eE.concat(eR).filter(function(v){return v>0&&isFinite(v);}).map(Math.log10);
    var ylo=Math.max(-14,Math.floor(Math.min.apply(null,all))-1);
    var yhi=Math.ceil(Math.max.apply(null,all))+1;
    var xr=[Math.log10(hs[hs.length-1])-.1,Math.log10(hs[0])+.1];
    txt(ctx,"오차 비교: 왼쪽일수록 작은 h",BR.x,BR.y-21,{size:12});
    var m2=frame(ctx,BR,xr,[ylo,yhi],{xl:"log₁₀ h",yl:"log₁₀ error",xt:4,yt:4});
    clipBox(ctx,BR);
    path(ctx,hs.map(function(v,i){return [m2.px(Math.log10(v)),m2.py(Math.log10(Math.max(eE[i],1e-14)))];}),{color:RED,w:2,dash:[4,3]});
    path(ctx,hs.map(function(v,i){return [m2.px(Math.log10(v)),m2.py(Math.log10(Math.max(eR[i],1e-14)))];}),{color:INK,w:2,dash:[8,4,2,4]});
    ctx.restore();
    legend(ctx,BR.x+10,BR.y+18,[{label:"Euler",color:RED,dash:[4,3]},{label:"RK3",color:INK,dash:[8,4,2,4]}]);
    var ee=errAt(sp,ex,euler,h),er=errAt(sp,ex,rk3,h),warn="";
    if(sp.lambda===-1){
      var z=1-h;
      warn="Euler 증폭인자 q=1−h="+fmt(z,3)+", |q|="+fmt(Math.abs(z),3)+". ";
      if(z===0)warn+="q=0: 한 스텝 뒤 0이 된다. (h=1)";
      else if(h<1)warn+="0&lt;q&lt;1: 부호를 유지하며 0으로 줄어든다.";
      else if(Math.abs(z)<1)warn+="−1&lt;q&lt;0: 부호가 번갈아 바뀌며 0으로 줄어든다.";
      else if(Math.abs(z)===1)warn+="|q|=1: 중립 경계, 오차가 감쇠하지 않음.";
      else warn+="|q|>1: 작은 교란이 증폭됨.";
    }else if(sp.lambda===1){
      warn="Euler 증폭인자 q=1+h>1: 이 성장 문제에서는 수치해도 성장함.";
    }else{
      warn="SIR은 비선형 시스템이므로 단일 λ의 증폭인자만으로 전체 안정성을 판정할 수 없음.";
    }
    ro.innerHTML="요청 Δt="+fmt(sh.get(),2)+" → 실제 h="+fmt(h,3)+" ("+n+" steps) · t=T 오차: Euler <b>"+ee.toExponential(2)+
      "</b>, RK3 <b>"+er.toExponential(2)+"</b><br>"+warn+
      "<p style='margin:8px 0 0'>RK3는 스텝당 3회 함수 평가를 사용하는 3차 SSP Runge–Kutta 방법이다. 매끄러운 문제의 충분히 작은 스텝에서는 전역 오차가 대략 O(h³), Euler는 O(h)다.</p>"+
      "<p style='margin:8px 0 0'>종료 시각 T에 맞게 스텝 수를 정수로 정하므로 실제 h는 요청 Δt와 다를 수 있다. 오차 비교 그래프의 가로축은 실제 h의 log₁₀ 값이다.</p><p style='margin:8px 0 0'>오차 기울기는 유한한 h 범위에서 측정한 값이다. 큰 스텝, 부동소수점 한계, SIR의 비선형성 때문에 이론 차수와 정확히 일치하지 않을 수 있다.</p>";
  }
  draw();
  var lastWidth=el.clientWidth;
  if(window.ResizeObserver)new ResizeObserver(function(){if(el.clientWidth!==lastWidth){lastWidth=el.clientWidth;draw();}}).observe(el);
});

/* 확장 SIR (주제 4, 프로젝트 1) */
mount("sir-extended",function(el,cfg){
  var N=cfg.N||40,T=cfg.T||200,cv=canvas(el,cfg.h||360),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var cl=check(bar,"잠복기 L (S→L→I)",false,draw),cm=check(bar,"사망 D",false,draw),cr=check(bar,"재감염 (R→S)",false,draw);
  var sl=slider(bar2,"ℓ (L→I)",[0.1,1,0.5,0.05],draw,function(v){return fmt(v,2);});
  var sd=slider(bar2,"δ (사망률)",[0,0.2,0.03,0.005],draw,function(v){return fmt(v,3);});
  var sr=slider(bar2,"r (재감염률)",[0.01,0.2,1/21,0.005],draw,function(v){return fmt(v,3);});
  var ro=readout(el);var B={x:50,y:28,w:650,h:280};
  var beta=1/3,gamma=1/14;
  function draw(){
    var L=cl.get(),D=cm.get(),Rr=cr.get(),ell=sl.get(),del=D?sd.get():0,r=Rr?sr.get():0;
    var f=function(t,y){var S=y[0],Lc=y[1],I=y[2],R=y[3],inf=beta*S*I/N,lat=L?ell*Lc:0;
      return [-inf+r*R, L?inf-ell*Lc:0, (L?lat:inf)-gamma*I-del*I, gamma*I-r*R, del*I];};
    var sim=rk4(f,[N-1,0,1,0,0],0,T,0.1);cv.clear();
    var m=frame(ctx,B,[0,T],[0,N],{xl:"t (일)",yl:"인원"});clipBox(ctx,B);
    var names=[["S",INK,[],0],["L",G1,[2,3],1],["I",RED,[],2],["R",G1,[6,4],3],["D",INK,[10,3,2,3],4]];
    names.forEach(function(s){if(s[3]===1&&!L)return;if(s[3]===4&&!D)return;
      path(ctx,sim.t.map(function(t,i){return [m.px(t),m.py(sim.y[i][s[3]])];}),{color:s[1],dash:s[2],w:s[3]===2?2.8:2});});ctx.restore();
    var items=[];names.forEach(function(s){if(s[3]===1&&!L)return;if(s[3]===4&&!D)return;items.push({label:s[0],color:s[1],dash:s[2],w:s[3]===2?2.8:2});});
    legend(ctx,B.x+B.w-60,B.y+16,items);
    var y=sim.y[sim.y.length-1],sum=y[0]+y[1]+y[2]+y[3]+y[4],R0=beta/(gamma+del);
    var eq="";if(Rr&&!D&&!L)eq=" · 이론 정상상태 I*=(N−N/R₀)/(1+γ/r)="+fmt((N-N/(beta/gamma))/(1+gamma/r),2);
    ro.innerHTML="t="+T+" 에서 S="+fmt(y[0],2)+", L="+fmt(y[1],2)+", I=<b>"+fmt(y[2],2)+"</b>, R="+fmt(y[3],2)+", D="+fmt(y[4],2)+" &nbsp;|&nbsp; <b>S+L+I+R+D = "+fmt(sum,4)+"</b> (보존) "+eq+"<br>"+
     "β=1/3, γ=1/14 고정, N="+N+". 항 규칙: 한 식에서 빠진 양은 다른 식에 더해진다 → 모두 더하면 우변이 0. "+
     (Rr&&!D&&!L?"재감염만 켜면 I가 0이 아니라 양의 값(≈12)에 머문다.":"")+(D?" 사망을 켜면 D가 쌓여 살아있는 인구가 줄지만, N=S+L+I+R+D는 그대로.":"");
  }
  draw();
});
/* ================= 합성함수 f∘g · 신경망 · 범용 근사 (주제 6) ================= */
var sigm=function(u){return 1/(1+Math.exp(-u));};
X.sigm=sigm;
var FNS={relu:{n:"ReLU  max(0,u)",f:function(u){return Math.max(0,u);},dom:"ℝ"},
  sig:{n:"sigmoid  σ(u)",f:sigm,dom:"ℝ"},
  tanh:{n:"tanh u",f:Math.tanh,dom:"ℝ"},
  sq:{n:"u²",f:function(u){return u*u;},dom:"ℝ"},
  sqrt:{n:"√u",f:function(u){return u<0?NaN:Math.sqrt(u);},dom:"u ≥ 0"},
  log:{n:"ln u",f:function(u){return u<=0?NaN:Math.log(u);},dom:"u > 0"}};
mount("compose",function(el,cfg){
  var cv=canvas(el,cfg.h||330),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var gsel=select(bar,"안쪽 g(x)",[
    ["lin","ax+b"],["sq","x²−1"],["sin","sin 2x"],["abs","|x|−1"]
  ],cfg.g||"lin",draw);
  var fsel=select(bar,"바깥 f(u)",Object.keys(FNS).map(function(k){return [k,FNS[k].n];}),cfg.f||"relu",draw);
  var sa=slider(bar2,"a",[-3,3,1.5,.1],draw,function(v){return fmt(v,1);});
  var sb=slider(bar2,"b",[-3,3,-1,.1],draw,function(v){return fmt(v,1);});
  var sx=slider(bar2,"입력 x",[-3,3,.8,.05],draw,function(v){return fmt(v,2);});
  var ro=readout(el);
  var P=[{x:45,y:46,w:185,h:190},{x:277,y:46,w:185,h:190},{x:510,y:46,w:185,h:190}],R=[-3,3];

  function G(x){
    var t=gsel.get();
    return t==="lin"?sa.get()*x+sb.get():t==="sq"?x*x-1:t==="sin"?Math.sin(2*x):Math.abs(x)-1;
  }
  function F(u){return FNS[fsel.get()].f(u);}
  function gprime(x){
    var t=gsel.get();
    return t==="lin"?sa.get():t==="sq"?2*x:t==="sin"?2*Math.cos(2*x):Math.abs(x)<1e-8?NaN:(x>0?1:-1);
  }
  function fprime(u){
    var t=fsel.get();
    if(t==="relu")return u>1e-8?1:u< -1e-8?0:NaN;
    if(typeof FNS[t].df==="function")return FNS[t].df(u);
    var h=1e-5;
    return (F(u+h)-F(u-h))/(2*h);
  }
  function diff(fn,x){
    var h=1e-5,a=fn(x-h),b=fn(x+h);
    return isFinite(a)&&isFinite(b)?(b-a)/(2*h):NaN;
  }
  function draw(){
    var x=sx.get(),u=G(x),y=F(u),gf=G(F(x));
    cv.clear();
    var m1=frame(ctx,P[0],R,R,{xl:"x",xt:4,yt:4});
    var m2=frame(ctx,P[1],R,R,{xl:"u",xt:4,yt:4});
    var m3=frame(ctx,P[2],R,R,{xl:"x",xt:4,yt:4});
    txt(ctx,"① g(x)",P[0].x,P[0].y-18,{size:12,weight:700});
    txt(ctx,"② f(u)",P[1].x,P[1].y-18,{size:12,weight:700});
    txt(ctx,"③ f(g(x))",P[2].x,P[2].y-18,{size:12,weight:700});
    clipBox(ctx,P[0]);curve(ctx,m1,G,-3,3,{color:INK,w:2.2});ctx.restore();
    clipBox(ctx,P[1]);curve(ctx,m2,F,-3,3,{color:INK,w:2.2});ctx.restore();
    clipBox(ctx,P[2]);
    curve(ctx,m3,function(t){return F(G(t));},-3,3,{color:RED,w:2.4});
    curve(ctx,m3,function(t){return G(F(t));},-3,3,{color:INK,w:1.5,dash:[5,4]});
    ctx.restore();
    txt(ctx,"점선: g(f(x))",P[2].x+P[2].w,P[2].y+P[2].h+17,{size:12,align:"right"});

    if(isFinite(u)&&u>=R[0]&&u<=R[1]){
      dot(ctx,m1.px(x),m1.py(u),4,{color:RED});
      if(isFinite(y)&&y>=R[0]&&y<=R[1]){
        dot(ctx,m2.px(u),m2.py(y),4,{color:RED});
        dot(ctx,m3.px(x),m3.py(y),4,{color:RED});
      }
    }

    var gp=gprime(x),fp=fprime(u),chain=fp*gp;
    var comp=function(t){return F(G(t));};
    var numeric=diff(comp,x);
    var kink=(gsel.get()==="abs"&&Math.abs(x)<1e-8)||
      (fsel.get()==="relu"&&Math.abs(u)<1e-8);
    var defined=isFinite(u)&&isFinite(y);
    var differentiable=defined&&!kink&&isFinite(chain);
    var match=differentiable&&isFinite(numeric)&&Math.abs(chain-numeric)<1e-3*(1+Math.abs(chain));
    var dom=FNS[fsel.get()].dom;
    var inRange=isFinite(u)&&Math.abs(u)<=3;
    ro.innerHTML="x="+fmt(x,3)+" → g(x)="+fmt(u,5)+" → f(g(x))="+(isFinite(y)?fmt(y,5):"정의되지 않음")+
      "<br>g(f(x))="+(isFinite(gf)?fmt(gf,5):"정의되지 않음")+
      (isFinite(y)&&isFinite(gf)&&Math.abs(y-gf)>1e-6?" · <span class='r'>합성 순서가 다름</span>":"")+
      "<br>"+(differentiable?
        "연쇄법칙: f′(g(x))g′(x)="+fmt(chain,6)+" · 수치 미분="+fmt(numeric,6)+
          (match?" (일치)":" (차이 확인 필요)"):
        "<span class='r'>현재 점에서는 연쇄법칙의 미분 판정을 확정할 수 없음: 정의역 또는 미분 가능성 확인 필요.</span>")+
      (!inRange?"<br><span class='r'>u가 표시 범위 [−3,3] 밖이므로 해당 입력점은 그림에서 생략됨.</span>":"")+
      "<br><span class='m'>합성 f∘g가 정의되려면 g(x)가 f의 정의역에 속해야 한다. 연쇄법칙은 g가 x에서, f가 g(x)에서 미분 가능할 때 적용한다. 유한 차분은 수치 검산이며 증명은 아니다.</span>";
  }
  draw();
});

/* 신경망 한 개의 은닉층 = 합성 (주제 6) */
mount("nn-layers",function(el,cfg){
  var cv=canvas(el,cfg.h||330),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el),bar3=ctlBar(el);
  var act=select(bar,"activation σ",[["sig","sigmoid"],["relu","ReLU"]],cfg.act||"sig",draw);
  var P={w1:[-12,12,6,0.5],b1:[-12,12,-2,0.5],w2:[-12,12,-5,0.5],b2:[-12,12,4,0.5],a1:[-3,3,1.5,0.1],a2:[-3,3,1,0.1],B:[-2,2,-0.5,0.1]},S={};
  var rows={w1:bar,b1:bar,w2:bar2,b2:bar2,a1:bar3,a2:bar3,B:bar3},labs={w1:"w₁",b1:"b₁",w2:"w₂",b2:"b₂",a1:"α₁",a2:"α₂",B:"B"};
  Object.keys(P).forEach(function(k){S[k]=slider(rows[k],labs[k],P[k],draw,function(v){return fmt(v,1);});});
  button(bar3,"무작위",function(){var r=rng((Math.random()*1e9)|0);Object.keys(P).forEach(function(k){var p=P[k];var v=Math.round((p[0]+(p[1]-p[0])*r())/p[3])*p[3];S[k].set(v);});draw();});
  var ro=readout(el),B={x:50,y:26,w:640,h:250};
  function sg(){return act.get()==="sig"?sigm:function(u){return Math.max(0,u);};}
  function draw(){
    var s=sg(),v={};Object.keys(S).forEach(function(k){v[k]=S[k].get();});
    var n1=function(x){return s(v.w1*x+v.b1);},n2=function(x){return s(v.w2*x+v.b2);},y=function(x){return v.a1*n1(x)+v.a2*n2(x)+v.B;};
    cv.clear();var ym0=0;for(var q=0;q<=120;q++){var xq=-3+6*q/120;ym0=Math.max(ym0,Math.abs(y(xq)),Math.abs(n1(xq)),Math.abs(n2(xq)));}var yb=Math.max(act.get()==="sig"?4:6,Math.ceil(ym0*1.1)),yr=[-yb,yb],m=frame(ctx,B,[-3,3],yr,{xl:"x",yl:"y",xt:6,yt:6});
    clipBox(ctx,B);
    curve(ctx,m,n1,-3,3,{color:G1,w:1.6,dash:[6,4]});curve(ctx,m,n2,-3,3,{color:G1,w:1.6,dash:[2,3]});
    curve(ctx,m,y,-3,3,{color:RED,w:2.8,n:400});ctx.restore();
    legend(ctx,B.x+10,B.y+18,[{label:"neuron 1 : σ(w₁x+b₁)",color:G1,dash:[6,4],w:1.6},{label:"neuron 2 : σ(w₂x+b₂)",color:G1,dash:[2,3],w:1.6},{label:"출력 y = α₁n₁+α₂n₂+B",color:RED,w:2.8}]);
    var c1=-v.b1/v.w1,c2=-v.b2/v.w2;
    ro.innerHTML="구조: x → <b>선형</b>(wx+b) → <b>비선형 σ</b> → <b>선형 합</b>(α·n+B) = 합성함수 &nbsp;|&nbsp; 미지수 : w,b가 2개씩 + α 2개 + B = <b>7</b> = (d+2)N+1 (d=1, N=2)<br>"+
     (act.get()==="sig"?"σ(wx+b)=σ(w(x−b′)), b′=−b/w : neuron 1 중심 b′₁ = <b>"+(isFinite(c1)?fmt(c1,2):"—")+"</b>, neuron 2 중심 b′₂ = <b>"+(isFinite(c2)?fmt(c2,2):"—")+"</b> (그 점에서 σ=½). |w|가 클수록 가파른 계단(step)에 가까워진다.":
      "ReLU : 꺾이는 위치 −b/w ("+(isFinite(c1)?fmt(c1,2):"—")+", "+(isFinite(c2)?fmt(c2,2):"—")+"), 출력은 꺾은선. activation이 없다면(σ=항등) y는 x의 일차함수밖에 못 된다.");
  }
  draw();
});

/* UAT 증명 아이디어와 근사 오차 (주제 6) */
mount("uat",function(el,cfg){
  var cv=canvas(el,cfg.h||360),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var TG={
    sin:{n:"sin 2πx",f:function(x){return Math.sin(2*Math.PI*x);},r:[-1.3,1.3]},
    abs:{n:"|x−½|",f:function(x){return Math.abs(x-.5);},r:[-.1,.6]},
    bump:{n:"exp(−40(x−½)²)",f:function(x){return Math.exp(-40*(x-.5)*(x-.5));},r:[-.15,1.2]},
    wig:{n:"x sin 8x",f:function(x){return x*Math.sin(8*x);},r:[-1,1]}
  };
  var tg=select(bar,"목표 f",Object.keys(TG).map(function(k){return [k,TG[k].n];}),cfg.target||"sin",draw);
  var md=select(bar,"방식",[
    ["sig","Sigmoid 계단 차"],
    ["relu","ReLU 꺾은선"]
  ],cfg.mode||"sig",draw);
  var sN=slider(bar2,"N",[1,40,6,1],draw,function(v){return String(v);});
  var sw=slider(bar2,"log₁₀ w",[.5,3,2,.05],draw,function(v){return "w="+fmtg(Math.pow(10,v),3);});
  var ro=readout(el),B={x:50,y:30,w:365,h:250},B2={x:470,y:30,w:225,h:250};
  var EPS=1e-12;

  function approx(mode,f,N,w){
    if(mode==="sig"){
      var c=[];
      for(var i=0;i<N;i++)c.push(f((i+.5)/N));
      return function(x){
        var s=0;
        for(var j=0;j<N;j++){
          s+=c[j]*(sigm(w*(x-j/N))-sigm(w*(x-(j+1)/N)));
        }
        return s;
      };
    }
    var kn=[];
    for(var i=0;i<=N;i++)kn.push(f(i/N));
    return function(x){
      var j=Math.min(N-1,Math.max(0,Math.floor(x*N)));
      var x0=j/N;
      return kn[j]+(kn[j+1]-kn[j])*(x-x0)*N;
    };
  }
  function sup(a,f){
    var mx=0;
    for(var i=0;i<=800;i++){
      var x=i/800,e=Math.abs(f(x)-a(x));
      if(isFinite(e)&&e>mx)mx=e;
    }
    return mx;
  }
  X.uatApprox=approx;

  function draw(){
    var T=TG[tg.get()],mode=md.get(),N=sN.get(),w=Math.pow(10,sw.get());
    var a=approx(mode,T.f,N,w),err=sup(a,T.f);
    cv.clear();
    var m=frame(ctx,B,[0,1],T.r,{xl:"x",yl:"y",xt:5,yt:5});
    clipBox(ctx,B);
    if(mode==="sig"&&N<=10){
      for(var i=0;i<N;i++){
        (function(j){
          var c=T.f((j+.5)/N);
          curve(ctx,m,function(x){
            return c*(sigm(w*(x-j/N))-sigm(w*(x-(j+1)/N)));
          },0,1,{color:GRID,w:1.2,n:250});
        })(i);
      }
    }
    curve(ctx,m,T.f,0,1,{color:INK,w:2.2,n:400});
    curve(ctx,m,a,0,1,{color:RED,w:2.2,n:700});
    ctx.restore();
    legend(ctx,B.x+B.w-145,B.y+16,[
      {label:"목표 f",color:INK},
      {label:"근사 y(x)",color:RED}
    ]);

    var Ns=[],es=[];
    for(var k=1;k<=40;k++){
      Ns.push(k);es.push(sup(approx(mode,T.f,k,w),T.f));
    }
    // The floor is solely for log-plot rendering; the reported error is unchanged.
    var plotFloor=1e-12;
    var logs=es.map(function(e){return Math.log10(Math.max(e,plotFloor));});
    var lo=Math.min(-12,Math.floor(Math.min.apply(null,logs))-1);
    var hi=Math.ceil(Math.max.apply(null,logs))+1;
    if(hi<=lo)hi=lo+1;
    var m2=frame(ctx,B2,[1,40],[lo,hi],{xl:"N",yl:"log₁₀ sampled error",xt:4,yt:5});
    clipBox(ctx,B2);
    path(ctx,Ns.map(function(n,i){
      return [m2.px(n),m2.py(logs[i])];
    }),{color:INK,w:2});
    ctx.restore();
    dot(ctx,m2.px(N),m2.py(Math.log10(Math.max(err,plotFloor))),4.5,{color:RED});

    var description=mode==="sig"?
      "각 box의 높이는 구간 중앙의 f 값이다. sigmoid 두 개의 차로 매끄러운 계단 근사를 만들며, 유한한 w에서는 경계가 완전히 날카롭지 않다. 끝점의 출력도 별도로 확인해야 한다.":
      "ReLU 근사는 격자점의 함수값을 직선으로 연결한다. 연속 함수의 균등연속성을 이용하면 격자를 세분할수록 선형 보간 오차가 감소하지만, 일반적으로 N을 2배로 했을 때 항상 정확히 1/4이 되는 것은 아니다.";

    ro.innerHTML="801개 표본에서 측정한 최대 오차: <b>"+fmt(err,6)+"</b>"+
      "<br>"+(mode==="sig"?"Sigmoid neuron "+(2*N)+"개":"ReLU 근사 조각 "+N+"개")+
      " · w="+fmtg(w,4)+
      "<br>"+description+
      "<br><span class='m'>오른쪽 그래프는 같은 801개 표본에서 구한 근사 오차를 N에 따라 나타낸다. 로그 그래프에서는 0 오차를 그릴 수 없으므로 "+plotFloor+"를 시각화에만 사용한다. 수치 하한을 실제 오차로 해석하면 안 된다.</span>"+
      "<br><span class='m'>UAT는 적절한 신경망 파라미터가 존재한다는 정리이지, 이 구성의 오차가 항상 단조 감소한다거나 학습 알고리즘이 그 파라미터를 찾는다는 보장은 아니다. 유한 표본의 최댓값 역시 연속 구간 전체의 sup norm을 증명하지 않는다.</span>";
  }
  draw();
});
/* ================= 분포 · CLT · random walk (주제 8) ================= */
function erf(x){ // Numerical Recipes erfc Chebyshev, |err|<1.2e-7
  var z=Math.abs(x),t=1/(1+0.5*z),r=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));
  return x>=0?1-r:r-1;}
function Phi(x){return 0.5*(1+erf(x/Math.SQRT2));}
function phi(x){return Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);}
function lgam(n){var s=0;for(var i=2;i<=n;i++)s+=Math.log(i);return s;} // log n!
X.erf=erf;X.Phi=Phi;
function binPmf(n,p,k){if(k<0||k>n)return 0;if(p<=0)return k===0?1:0;if(p>=1)return k===n?1:0;
  return Math.exp(lgam(n)-lgam(k)-lgam(n-k)+k*Math.log(p)+(n-k)*Math.log(1-p));}
function poiPmf(l,k){return Math.exp(-l+k*Math.log(l)-lgam(k));}
X.binPmf=binPmf;
function simpson(f,a,b,n){n=n||400;if(n%2)n++;var h=(b-a)/n,s=f(a)+f(b);for(var i=1;i<n;i++)s+=f(a+i*h)*(i%2?4:2);return s*h/3;}
X.simpson=simpson;

var DIST={
 normal:{n:"정규분포 N(μ,σ²)",disc:false,view:[-8,8],
   par:{mu:["μ",[-3,3,0,0.1]],sig:["σ",[0.3,3,1,0.1]]},
   pdf:function(x,p){return phi((x-p.mu)/p.sig)/p.sig;},mean:function(p){return p.mu;},vr:function(p){return p.sig*p.sig;},
   samp:function(r,p){return p.mu+p.sig*gauss(r);}},
 exp:{n:"지수분포 Exp(λ)",disc:false,view:[0,8],
   par:{lam:["λ",[0.2,3,1,0.1]]},
   pdf:function(x,p){return x<0?0:p.lam*Math.exp(-p.lam*x);},mean:function(p){return 1/p.lam;},vr:function(p){return 1/(p.lam*p.lam);},
   samp:function(r,p){return -Math.log(1-r())/p.lam;}},
 unif:{n:"균등분포 U[a,b]",disc:false,view:[-2,9],
   par:{a:["a",[-2,4,0,0.1]],w:["b−a",[0.3,6,2,0.1]]},
   pdf:function(x,p){return x>=p.a&&x<=p.a+p.w?1/p.w:0;},mean:function(p){return p.a+p.w/2;},vr:function(p){return p.w*p.w/12;},
   samp:function(r,p){return p.a+p.w*r();}},
 binom:{n:"이항분포 Bin(n,p)",disc:true,view:[0,50],
   par:{n:["n",[1,50,20,1]],p:["p",[0.02,0.98,0.4,0.01]]},
   pdf:function(k,p){return binPmf(p.n,p.p,k);},mean:function(p){return p.n*p.p;},vr:function(p){return p.n*p.p*(1-p.p);},
   samp:function(r,p){var c=0;for(var i=0;i<p.n;i++)if(r()<p.p)c++;return c;}},
 pois:{n:"푸아송분포 Poisson(λ)",disc:true,view:[0,40],
   par:{lam:["λ",[0.5,25,4,0.5]]},
   pdf:function(k,p){return poiPmf(p.lam,k);},mean:function(p){return p.lam;},vr:function(p){return p.lam;},
   samp:function(r,p){var L=Math.exp(-p.lam),k=0,q=1;do{k++;q*=r();}while(q>L);return k-1;}}
};
X.DIST=DIST;
mount("dist-playground",function(el,cfg){
  var cv=canvas(el,cfg.h||340),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el),bar3=ctlBar(el);
  var ds=select(bar,"분포",Object.keys(DIST).map(function(k){return [k,DIST[k].n];}),cfg.dist||"normal",function(){build();draw();});
  var parBar=ctlBar(el),S={},seed=7,samples=null,nS=500;
  var sLo=slider(bar2,"구간 시작 a",[-8,8,-1,0.1],draw,function(v){return fmt(v,1);});
  var sHi=slider(bar2,"구간 끝 b",[-8,8,1,0.1],draw,function(v){return fmt(v,1);});
  button(bar3,"표본 500개 뽑기",function(){seed=(seed*1103515245+12345)>>>0;var D=DIST[ds.get()],r=rng(seed),p=pars();samples=[];for(var i=0;i<nS;i++)samples.push(D.samp(r,p));draw();});
  button(bar3,"표본 지우기",function(){samples=null;draw();});
  var ro=readout(el),B={x:50,y:26,w:640,h:270};
  function pars(){var p={};Object.keys(S).forEach(function(k){p[k]=S[k].get();});return p;}
  function build(){
    parBar.innerHTML="";S={};var D=DIST[ds.get()];parBar.className="v6-controls v6x-ctl";
    Object.keys(D.par).forEach(function(k){S[k]=slider(parBar,D.par[k][0],D.par[k][1],function(){samples=null;draw();},function(v){return fmtg(v,3);});});
    var v=D.view;sLo.el.min=v[0];sLo.el.max=v[1];sHi.el.min=v[0];sHi.el.max=v[1];
    var c=D.disc?[Math.round(D.mean(pars())-D.vr(pars())**0.5),Math.round(D.mean(pars())+D.vr(pars())**0.5)]:[D.mean(pars())-Math.sqrt(D.vr(pars())),D.mean(pars())+Math.sqrt(D.vr(pars()))];
    sLo.set(Math.max(v[0],c[0]));sHi.set(Math.min(v[1],c[1]));samples=null;
    var st=D.disc?1:0.1;sLo.el.step=st;sHi.el.step=st;sLo.set(Math.max(v[0],c[0]));sHi.set(Math.min(v[1],c[1]));
  }
  function prob(D,p,a,b){if(b<a)return 0;if(D.disc){var s=0;for(var k=Math.ceil(a-1e-9);k<=Math.floor(b+1e-9);k++)s+=D.pdf(k,p);return s;}
    return simpson(function(x){return D.pdf(x,p);},a,b,600);}
  X.distProb=prob;
  function draw(){
    var D=DIST[ds.get()],p=pars(),v=D.view,a=sLo.get(),b=sHi.get();cv.clear();
    var mx=0,N=400;
    if(D.disc){for(var k=v[0];k<=v[1];k++)mx=Math.max(mx,D.pdf(k,p));}else for(var i=0;i<=N;i++)mx=Math.max(mx,D.pdf(v[0]+(v[1]-v[0])*i/N,p));
    var m=frame(ctx,B,v,[0,mx*1.18],{xl:"x",yl:D.disc?"P(X=k)":"밀도 f(x)",xt:8,yt:5});
    var mu=D.mean(p),sd=Math.sqrt(D.vr(p));
    if(samples){ // histogram overlay
      if(D.disc){var cnt={};samples.forEach(function(s){cnt[s]=(cnt[s]||0)+1;});
        Object.keys(cnt).forEach(function(k){var h=cnt[k]/samples.length,x0=m.px(+k-0.35),x1=m.px(+k+0.35);ctx.fillStyle=G3;ctx.fillRect(x0,m.py(h),x1-x0,m.py(0)-m.py(h));ctx.strokeStyle=G2;ctx.strokeRect(x0+.5,m.py(h)+.5,x1-x0,m.py(0)-m.py(h));});}
      else{var nb=36,w=(v[1]-v[0])/nb,c=new Array(nb).fill(0);samples.forEach(function(s){var j=Math.floor((s-v[0])/w);if(j>=0&&j<nb)c[j]++;});
        c.forEach(function(q,j){var h=q/samples.length/w,x0=m.px(v[0]+j*w),x1=m.px(v[0]+(j+1)*w);ctx.fillStyle=G3;ctx.fillRect(x0,m.py(h),x1-x0-1,m.py(0)-m.py(h));ctx.strokeStyle=G2;ctx.strokeRect(x0+.5,m.py(h)+.5,x1-x0-1,m.py(0)-m.py(h));});}}
    clipBox(ctx,B);
    if(D.disc){for(var k=Math.max(0,v[0]);k<=v[1];k++){var h=D.pdf(k,p),inside=k>=a-1e-9&&k<=b+1e-9,x0=m.px(k-0.18),x1=m.px(k+0.18);
        ctx.fillStyle=inside?RED:INK;ctx.fillRect(x0,m.py(h),x1-x0,m.py(0)-m.py(h));}}
    else{ // shaded area
      ctx.save();ctx.beginPath();ctx.moveTo(m.px(Math.max(a,v[0])),m.py(0));
      for(var i=0;i<=200;i++){var x=Math.max(a,v[0])+(Math.min(b,v[1])-Math.max(a,v[0]))*i/200;ctx.lineTo(m.px(x),m.py(D.pdf(x,p)));}
      ctx.lineTo(m.px(Math.min(b,v[1])),m.py(0));ctx.closePath();ctx.fillStyle="rgba(158,43,37,0.22)";if(b>a)ctx.fill();ctx.restore();
      curve(ctx,m,function(x){return D.pdf(x,p);},v[0],v[1],{color:INK,w:2.4,n:500});
      seg(ctx,m.px(a),m.py(0),m.px(a),m.py(D.pdf(a,p)),{color:RED,w:1.4});seg(ctx,m.px(b),m.py(0),m.px(b),m.py(D.pdf(b,p)),{color:RED,w:1.4});}
    ctx.restore();
    seg(ctx,m.px(mu),B.y,m.px(mu),B.y+B.h,{color:RED,dash:[4,4],w:1.2});
    arrow(ctx,m.px(mu),B.y+14,m.px(Math.min(v[1],mu+sd)),B.y+14,{color:RED,w:1.2,head:5});arrow(ctx,m.px(mu),B.y+14,m.px(Math.max(v[0],mu-sd)),B.y+14,{color:RED,w:1.2,head:5});
    txt(ctx,"μ, ±σ",m.px(mu)+4,B.y+28,{size:11,color:RED});
    var P=prob(D,p,a,b),extra="";
    if(samples){var sm=samples.reduce(function(s,x){return s+x;},0)/samples.length,sv=samples.reduce(function(s,x){return s+(x-sm)*(x-sm);},0)/(samples.length-1),inS=samples.filter(function(x){return x>=a-1e-9&&x<=b+1e-9;}).length/samples.length;
      extra="<br>표본 "+samples.length+"개 : 평균 "+fmt(sm,3)+", 분산 "+fmt(sv,3)+", 구간 안 비율 <b>"+fmt(inS,3)+"</b> (이론 "+fmt(P,3)+") — 표본이 많을수록 이론값에 가까워진다 (큰 수의 법칙).";}
    ro.innerHTML="<b>P("+fmtg(a,3)+" ≤ X ≤ "+fmtg(b,3)+") = "+fmt(P,4)+"</b> "+(D.disc?"(구간 안 정수들의 pmf 합)":"(밀도의 넓이 = 적분)")+" &nbsp;|&nbsp; 평균 E[X] = <b>"+fmt(mu,3)+"</b>, 분산 Var(X) = <b>"+fmt(sd*sd,3)+"</b>"+
      (ds.get()==="unif"?" &nbsp;<span class='m'>(균등: 밀도 1/(b−a), 분산 (b−a)²/12)</span>":"")+extra;
  }
  build();draw();
});

/* 중심극한정리 */
mount("clt",function(el,cfg){
  var cv=canvas(el,cfg.h||350),ctx=cv.ctx,bar=ctlBar(el),seed=11,M=cfg.M||2500;
  var BASE={unif:{n:"균등 U(0,1)",mu:0.5,sd:Math.sqrt(1/12),sk:0,samp:function(r){return r();}},
    exp:{n:"지수 Exp(1)",mu:1,sd:1,sk:2,samp:function(r){return -Math.log(1-r());}},
    bern:{n:"베르누이(0.15)",mu:0.15,sd:Math.sqrt(0.15*0.85),sk:(1-0.3)/Math.sqrt(0.15*0.85),samp:function(r){return r()<0.15?1:0;}},
    coin:{n:"±1 동전 (random walk 한 걸음)",mu:0,sd:1,sk:0,samp:function(r){return r()<0.5?1:-1;}},
    dice:{n:"주사위 1~6",mu:3.5,sd:Math.sqrt(35/12),sk:0,samp:function(r){return 1+Math.floor(6*r());}}};
  X.cltBase=BASE;
  var bs=select(bar,"원래 분포",Object.keys(BASE).map(function(k){return [k,BASE[k].n];}),cfg.base||"exp",draw);
  var sn=slider(bar,"표본 크기 n",[0,2.3,0,0.05],draw,function(v){return String(Math.round(Math.pow(10,v)));});
  button(bar,"다시 뽑기",function(){seed=(seed*69069+1)>>>0;draw();});
  var ro=readout(el),BL={x:44,y:34,w:240,h:240},BR={x:348,y:34,w:350,h:240};
  function Zs(b,n,sd0){var r=rng(sd0),out=new Array(M),q=Math.sqrt(n);
    for(var i=0;i<M;i++){var s=0;for(var j=0;j<n;j++)s+=b.samp(r);out[i]=q*(s/n-b.mu)/b.sd;}return out;}
  X.cltZ=Zs;
  function stats(z){var m=0,i;for(i=0;i<z.length;i++)m+=z[i];m/=z.length;var v=0,s3=0;for(i=0;i<z.length;i++){var d=z[i]-m;v+=d*d;s3+=d*d*d;}v/=z.length;
    var zs=z.slice().sort(function(a,b){return a-b;}),ks=0;for(i=0;i<zs.length;i++){var F=Phi(zs[i]);ks=Math.max(ks,Math.abs(F-i/zs.length),Math.abs(F-(i+1)/zs.length));}
    return {m:m,sd:Math.sqrt(v),sk:s3/z.length/Math.pow(v,1.5),ks:ks};}
  function draw(){
    var key=bs.get(),b=BASE[key],n=Math.round(Math.pow(10,sn.get())),z=Zs(b,n,seed+n*7919),st=stats(z);cv.clear();
    // left: base distribution
    var base1=Zs(b,1,seed+99),lo,hi;
    txt(ctx,"원래 분포 (표본 1개)",BL.x,BL.y-12,{size:12,weight:700});txt(ctx,"표본평균의 분포 (n="+n+", 표준화 Z=√n(X̄−μ)/σ)",BR.x,BR.y-12,{size:12,weight:700});
    var raw=[];var r0=rng(seed+5);for(var i=0;i<M;i++)raw.push(b.samp(r0));
    var vlo=Math.min.apply(null,raw),vhi=Math.max.apply(null,raw),discrete=(key==="bern"||key==="coin"||key==="dice");
    var xl=discrete?[vlo-0.8,vhi+0.8]:[vlo,vhi+1e-9],cnt;
    var nb=discrete?(vhi-vlo+1):30,w=(xl[1]-xl[0])/nb;cnt=new Array(nb).fill(0);
    raw.forEach(function(s){var j=discrete?Math.round(s-vlo):Math.min(nb-1,Math.floor((s-xl[0])/w));cnt[j]++;});
    var hmax=Math.max.apply(null,cnt)/M/(discrete?1:w)*1.15;
    var m=frame(ctx,BL,xl,[0,hmax],{xt:4,yt:4,noGrid:false});
    cnt.forEach(function(q,j){var h=q/M/(discrete?1:w),x0=discrete?m.px(vlo+j-0.35):m.px(xl[0]+j*w),x1=discrete?m.px(vlo+j+0.35):m.px(xl[0]+(j+1)*w);
      ctx.fillStyle=G3;ctx.fillRect(x0,m.py(h),x1-x0-(discrete?0:1),m.py(0)-m.py(h));ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.strokeRect(x0+.5,m.py(h)+.5,x1-x0-(discrete?0:1),m.py(0)-m.py(h));});
    seg(ctx,m.px(b.mu),BL.y,m.px(b.mu),BL.y+BL.h,{color:RED,dash:[4,3]});txt(ctx,"μ="+fmtg(b.mu,3),m.px(b.mu)+4,BL.y+12,{size:11,color:RED});
    // right
    var zb=40,zr=[-4,4],zw=(zr[1]-zr[0])/zb,zc=new Array(zb).fill(0);z.forEach(function(q){var j=Math.floor((q-zr[0])/zw);if(j>=0&&j<zb)zc[j]++;});
    var disc1=(n<=1&&discrete);
    var zmax=Math.max(0.5,Math.max.apply(null,zc)/M/zw*1.1);
    var m2=frame(ctx,BR,zr,[0,zmax],{xt:8,yt:5,xl:"z"});
    zc.forEach(function(q,j){var h=q/M/zw,x0=m2.px(zr[0]+j*zw),x1=m2.px(zr[0]+(j+1)*zw);ctx.fillStyle=G3;ctx.fillRect(x0,m2.py(h),x1-x0-1,m2.py(0)-m2.py(h));ctx.strokeStyle=G1;ctx.lineWidth=1;ctx.strokeRect(x0+.5,m2.py(h)+.5,x1-x0-1,m2.py(0)-m2.py(h));});
    clipBox(ctx,BR);curve(ctx,m2,phi,-4,4,{color:RED,w:2.4,n:300});ctx.restore();
    txt(ctx,"N(0,1) 밀도",BR.x+BR.w-6,BR.y+14,{size:11.5,color:RED,align:"right"});
    ro.innerHTML="n = <b>"+n+"</b> (M="+M+"번 반복) &nbsp;|&nbsp; Z의 표본평균 "+fmt(st.m,3)+" (이론 0), 표준편차 "+fmt(st.sd,3)+" (이론 1) &nbsp;|&nbsp; 왜도 "+fmt(st.sk,3)+" (이론 γ/√n = "+fmt(b.sk/Math.sqrt(n),3)+") &nbsp;|&nbsp; N(0,1)과의 최대 CDF 차이 <b>"+fmt(st.ks,3)+"</b><br>"+
     "원래 분포가 어떤 모양이든(치우침·불연속) n이 커지면 표준화한 평균의 분포가 N(0,1)로 간다. 치우친 분포(지수, 베르누이)는 n이 작을 때 왜도가 남고 √n에 반비례로 줄어든다. 동전(±1)의 n번 합 = random walk의 위치 (주제 8).";
  }
  draw();
});

/* random walk → diffusion (주제 8) */
mount("random-walk",function(el,cfg){
  var KMAX=400,cv=canvas(el,cfg.h||360),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el),seed=3,K=cfg.K||2000,U=null;
  function gen(){var r=rng(seed);U=new Float32Array(K*KMAX);for(var i=0;i<U.length;i++)U[i]=r();}
  var sk=slider(bar,"스텝 수 k (시간 t=kΔt)",[1,KMAX,60,1],draw,function(v){return String(v);});
  var sp=slider(bar,"오른쪽 확률 p",[0.3,0.7,0.5,0.01],draw,function(v){return fmt(v,2);});
  var sx=slider(bar2,"공간 간격 Δx",[0.5,2,1,0.1],draw,function(v){return fmt(v,1);});
  var kk=select(bar2,"걸음꾼 수",[["100","100명"],["500","500명"],["2000","2000명"],["5000","5000명"]],String(K),function(v){K=+v;gen();draw();});
  button(bar2,"다시 뽑기",function(){seed=(seed*69069+7)>>>0;gen();draw();});
  var ro=readout(el),BL={x:44,y:34,w:300,h:250},BR={x:408,y:34,w:292,h:250};
  gen();
  function pos(w,k,p){var s=0,o=w*KMAX;for(var j=0;j<k;j++)s+=U[o+j]<p?1:-1;return s;}
  function draw(){
    var k=sk.get(),p=sp.get(),dx=sx.get(),sd=Math.sqrt(4*p*(1-p)*k)*dx,mu=(2*p-1)*k*dx;cv.clear();
    txt(ctx,"걸음꾼 몇 명의 경로",BL.x+60,BL.y-6,{size:12,weight:700});txt(ctx,"k="+k+" 스텝 뒤 위치 분포",BR.x+60,BR.y-6,{size:12,weight:700});
    var yr=Math.max(10,Math.ceil(2.6*Math.sqrt(KMAX*4*p*(1-p))+Math.abs(2*p-1)*KMAX));yr=Math.min(yr,KMAX);
    var m=frame(ctx,BL,[0,KMAX],[-yr*dx,yr*dx],{xl:"스텝 k",yl:"위치 x",xt:4,yt:4});clipBox(ctx,BL);
    var cols=[INK,G1,G2,INK,G1,G2];
    for(var w=0;w<6;w++){var pts=[],s=0;pts.push([m.px(0),m.py(0)]);for(var j=0;j<KMAX;j++){s+=U[w*KMAX+j]<p?1:-1;pts.push([m.px(j+1),m.py(s*dx)]);}
      path(ctx,pts,{color:cols[w],w:1.2,dash:w>2?[4,3]:[]});}
    var up=[],dn=[];for(j=0;j<=KMAX;j++){var q=2*Math.sqrt(4*p*(1-p)*j)*dx,c=(2*p-1)*j*dx;up.push([m.px(j),m.py(c+q)]);dn.push([m.px(j),m.py(c-q)]);}
    path(ctx,up,{color:RED,w:1.4,dash:[5,4]});path(ctx,dn,{color:RED,w:1.4,dash:[5,4]});ctx.restore();
    seg(ctx,m.px(k),BL.y,m.px(k),BL.y+BL.h,{color:RED,w:1.2});
    txt(ctx,"붉은 점선: 평균 ±2σ (σ ∝ √k)",BL.x+6,BL.y+BL.h-8,{size:11,color:RED});
    // histogram
    var cnt={},sum=0,sq=0;for(var i=0;i<K;i++){var n=pos(i,k,p);cnt[n]=(cnt[n]||0)+1;sum+=n*dx;sq+=n*dx*n*dx;}
    var sm=sum/K,sv=sq/K-sm*sm,span=Math.max(6,Math.ceil(4*sd/dx))*dx,xc=mu,xr=[xc-span,xc+span];
    var pm=0;Object.keys(cnt).forEach(function(n){pm=Math.max(pm,cnt[n]/K);});
    var ymax=Math.max(pm,2*phi(0)/Math.max(sd,1e-9)*dx)*1.15;
    var m2=frame(ctx,BR,xr,[0,ymax],{xl:"위치 x",yl:"비율",xt:5,yt:4});clipBox(ctx,BR);
    Object.keys(cnt).forEach(function(n){var h=cnt[n]/K,x0=m2.px(n*dx-dx*0.9),x1=m2.px(n*dx+dx*0.9);ctx.fillStyle=G3;ctx.fillRect(x0,m2.py(h),x1-x0,m2.py(0)-m2.py(h));ctx.strokeStyle=G1;ctx.strokeRect(x0+.5,m2.py(h)+.5,x1-x0,m2.py(0)-m2.py(h));});
    // gaussian (diffusion solution) with bin width 2dx; binomial pmf dots
    curve(ctx,m2,function(x){return 2*dx*Math.exp(-(x-mu)*(x-mu)/(2*sd*sd))/(sd*Math.sqrt(2*Math.PI));},xr[0],xr[1],{color:RED,w:2.4,n:300});
    for(var A=0;A<=k;A++){var nn=2*A-k,pr=binPmf(k,p,A);if(nn*dx>xr[0]&&nn*dx<xr[1])dot(ctx,m2.px(nn*dx),m2.py(pr),2.8,{color:INK});}
    ctx.restore();
    var D=dx*dx/2; // Δt=1
    ro.innerHTML="k = <b>"+k+"</b>, 걸음꾼 "+K+"명 &nbsp;|&nbsp; 평균 : 표본 "+fmt(sm,2)+" · 이론 (2p−1)kΔx = "+fmt(mu,2)+" &nbsp;|&nbsp; 분산 : 표본 <b>"+fmt(sv,2)+"</b> · 이론 4p(1−p)kΔx² = <b>"+fmt(sd*sd,2)+"</b><br>"+
     "검은 점 = 정확한 확률 C(k,A)pᴬqᴮ (A=오른쪽 걸음 수, 위치 n=A−B), 붉은 곡선 = 가우스 근사. p=½ 이면 분산 = kΔx² = <b>2Dt</b> (Δt=1, D=Δx²/(2Δt)="+fmt(D,3)+") → 확산 방정식 ∂P/∂t=D∂²P/∂x² 의 해와 같다. 분산이 t에 <b>선형</b>으로 커지는 것을 k를 움직여 확인.<br><span class='m'>k와 위치의 홀짝이 같은 칸에만 걸음꾼이 있다 (k+n 이 홀수면 확률 0).</span>";
  }
  draw();
});
/* ================= logistic map · 고정점 · Lipschitz · ODE 유일성 (주제 2, 6, 7) ================= */
function lmap(r){return function(x){return r*x*(1-x);};}
function attractor(r,x0,trans,maxp){ // returns {period (0 if none), orbit[], lyap}
  var f=lmap(r),x=x0,i;for(i=0;i<trans;i++)x=f(x);
  var orb=[x];for(i=0;i<(maxp||64)+1;i++){x=f(x);orb.push(x);}
  var per=0;for(var p=1;p<=(maxp||64);p++){if(Math.abs(orb[p]-orb[0])<1e-7){per=p;break;}}
  var l=0,y=orb[0],n=4000;for(i=0;i<n;i++){l+=Math.log(Math.abs(r*(1-2*y))+1e-300);y=f(y);}
  return {period:per,orbit:orb.slice(0,per||8),lyap:l/n};}
X.attractor=attractor;
mount("logistic-cobweb",function(el,cfg){
  var cv=canvas(el,cfg.h||350),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var sr=slider(bar,"r",cfg.r||[.5,4,3.2,.01],draw,function(v){return fmt(v,2);});
  var sx=slider(bar,"x₀",[.01,.99,.2,.01],draw,function(v){return fmt(v,2);});
  var sn=slider(bar2,"반복 횟수",[1,60,20,1],draw,function(v){return String(v);});
  [[.5,"0.5"],[1,"1"],[2.8,"2.8"],[3,"3"],[3.2,"3.2"],[3.5,"3.5"],[3.8,"3.8"]].forEach(function(q){
    button(bar2,"r="+q[1],function(){sr.set(q[0]);draw();});
  });
  var ro=readout(el),BL={x:48,y:28,w:270,h:260},BR={x:390,y:28,w:300,h:260},narrowMode=null;
  function layout(){ // 좁은 화면: 두 패널을 세로로 쌓고 캔버스 논리 폭을 줄여 라벨이 줄어들지 않게 한다
    var nar=(el.clientWidth||720)<560;
    if(nar===narrowMode)return;narrowMode=nar;
    [].forEach.call(el.querySelectorAll("button"),function(bt){bt.style.minHeight=nar?"44px":"";});
    if(nar){cv.c.width=300*DPR;cv.c.height=620*DPR;BL={x:44,y:24,w:240,h:230};BR={x:44,y:340,w:240,h:230};}
    else{cv.c.width=720*DPR;cv.c.height=(cfg.h||350)*DPR;BL={x:48,y:28,w:270,h:260};BR={x:390,y:28,w:300,h:260};}
  }
  window.addEventListener("resize",function(){draw();});
  function draw(){
    layout();
    var r=sr.get(),x0=sx.get(),n=sn.get(),f=lmap(r);
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.c.width,cv.c.height);ctx.fillStyle="#fff";ctx.fillRect(0,0,cv.c.width,cv.c.height);cv.clear(); // 좁은 화면 캔버스는 기본 clear 범위(720×h)보다 높으므로 전체를 지운다
    var m=frame(ctx,BL,[0,1],[0,1],{xl:"x",yl:"y",xt:5,yt:5});
    clipBox(ctx,BL);
    curve(ctx,m,f,0,1,{color:INK,w:2.2});
    seg(ctx,m.px(0),m.py(0),m.px(1),m.py(1),{color:INK,w:1.4,dash:[5,4]});
    var x=x0,pts=[[m.px(x),m.py(0)]];
    for(var i=0;i<n;i++){
      var y=f(x);pts.push([m.px(x),m.py(y)],[m.px(y),m.py(y)]);x=y;
    }
    path(ctx,pts,{color:RED,w:1.5});ctx.restore();
    txt(ctx,"f(x)=rx(1−x)",BL.x+BL.w,BL.y-9,{size:12,align:"right"});
    txt(ctx,"y=x",m.px(.9),m.py(.9)+16,{size:12});
    var xf=r>1?1-1/r:0;
    dot(ctx,m.px(xf),m.py(xf),4.5,{fill:false,stroke:RED,w:1.8});
    dot(ctx,m.px(x0),m.py(0),3.5,{color:INK});

    var ser=[],xx=x0,ly=0,lyN=0;
    for(i=0;i<=60;i++){
      ser.push(xx);
      if(i<60){
        var der=Math.abs(r*(1-2*xx));
        if(der>0&&isFinite(der))ly+=Math.log(der);
        else lyN++;
        xx=f(xx);
      }
    }
    var lyTxt;
    if(lyN){
      if(Math.abs(x0-.5)<1e-12)lyTxt="−∞ — x₀=0.5는 f′(0.5)=0인 임계점이라 첫 항부터 ln 0. 이 경우는 float 오류가 아니라 유한 평균의 참값도 −∞.";
      else if(Math.abs(r-2)<1e-9)lyTxt="−∞로 표시됨 — r=2의 고정점 x*=0.5는 f′(x*)=0인 초안정 고정점이라 float 궤도가 정확히 0.5에 착지해 머물고, ln 0이 "+lyN+"회 발생. 정확한 실수 궤도는 0.5에 도달하지 않으므로 유한 60단계 평균의 참값은 유한. 다만 점근 λ = −∞는 참값.";
      else lyTxt="−∞로 표시됨 — float 궤도가 우연히 정확히 0.5에 착지하는 단계가 "+lyN+"회 있어 ln 0 발생. 정확한 실수 궤도가 0.5를 실제로 지나는 특수한 초기값이 아니라면 유한 평균의 참값은 유한이며, x₀를 아주 조금 바꾸면 유한 추정치로 돌아올 수 있음.";
    }else lyTxt=fmt(ly/60,4);
    var m2=frame(ctx,BR,[0,60],[0,1],{xl:"n",yl:"xₙ",xt:6,yt:5});
    clipBox(ctx,BR);
    path(ctx,ser.map(function(v,i){return [m2.px(i),m2.py(v)];}),{color:INK,w:1.5});
    ctx.restore();
    ser.forEach(function(v,i){dot(ctx,m2.px(i),m2.py(v),i<=n?3.2:2,{color:i<=n?RED:INK});});
    if(r>1)seg(ctx,BR.x,m2.py(xf),BR.x+BR.w,m2.py(xf),{color:RED,dash:[4,4],w:1});

    var at=attractor(r,x0,2000,64),res;
    if(r<1)res="x=0은 국소 안정: 0&lt;r&lt;1.";
    else if(r===1)res="r=1: f′(0)=1인 비쌍곡적 경계. 0&lt;x₀&lt;1에서는 xₙ→0이지만 선형 수축률은 아니다.";
    else if(Math.abs(r-2)<1e-9)res="비영 고정점 x*=0.5는 f′(x*)=0인 초안정 고정점 (r=2). 오차가 매 단계 제곱으로 감소하는 2차 수렴이며 점근 Lyapunov 지수는 −∞.";
    else if(r<3)res="비영 고정점 x*=1−1/r은 국소 안정 (1&lt;r&lt;3).";
    else if(r===3)res="r=3: 비영 고정점의 경계 f′(x*)=−1. 국소 수렴은 느리며 선형 수축 판정만으로 결론을 내릴 수 없다.";
    else if(r<1+Math.sqrt(6))res="비영 고정점은 불안정. 주기 궤도 또는 과도 거동은 시작점과 매개변수에 따라 달라진다.";
    else res=at.period>1?"수치 탐색에서 "+at.period+"주기 후보가 관측됨.":"긴 과도 구간 뒤에도 유한 탐색만으로 궤도를 확정 분류할 수 없음.";

    ro.innerHTML="r="+fmt(r,3)+" · x₀="+fmt(x0,4)+"<br>"+res+
      "<br><br>고정점 x=0, "+(r>1?"x*=1−1/r="+fmt(xf,4)+" · f′(x*)="+fmt(2-r,4):"비영 고정점은 r>1에서 존재")+
      "<br>유한 궤도에서의 평균 log |f′(xₙ)| (60단계) = "+lyTxt+
      "<br><br><span class='m'>평균 Lyapunov 추정치는 양수이면 가까운 두 시작점이 벌어지는 경향, 음수이면 모이는 경향을 뜻한다. 이 값은 길이 60의 궤도에 대한 수치값이며, 그 부호만으로 모든 초기값의 점근 거동을 증명할 수 없다. 0&lt;r≤4에서 [0,1]은 불변 구간이다.</span>";
  }
  draw();
});

mount("bifurcation",function(el,cfg){
  var cv=canvas(el,cfg.h||400),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var lo=slider(bar,"r 시작",[2.4,3.9,2.5,0.01],render,function(v){return fmt(v,2);});
  var hi=slider(bar,"r 끝",[2.6,4,4,0.01],render,function(v){return fmt(v,2);});
  var tr=slider(bar2,"버리는 횟수(transient)",[0,500,100,10],render,function(v){return String(v);});
  var mk=slider(bar2,"표시할 r",[2.4,4,3.2,0.005],mark,function(v){return fmt(v,3);});
  button(bar2,"3.4~3.6 확대",function(){lo.set(3.4);hi.set(3.6);render();});
  button(bar2,"3.8~3.9 (주기 3 창)",function(){lo.set(3.8);hi.set(3.9);render();});
  button(bar2,"전체",function(){lo.set(2.5);hi.set(4);render();});
  var ro=readout(el),B={x:50,y:20,w:640,h:330},off=null;
  function render(){
    var a=lo.get(),b=hi.get();if(b<=a+0.02){b=a+0.02;}
    mk.el.min=a;mk.el.max=b;if(mk.get()<a)mk.set(a);if(mk.get()>b)mk.set(b);
    var o=document.createElement("canvas");o.width=B.w*DPR;o.height=B.h*DPR;var c=o.getContext("2d");c.scale(DPR,DPR);c.fillStyle="#1a1a1a";
    var T=tr.get(),cols=B.w;
    for(var i=0;i<cols;i++){var r=a+(b-a)*i/(cols-1),x=0.5,j;for(j=0;j<T;j++)x=r*x*(1-x);
      for(j=0;j<130;j++){x=r*x*(1-x);var py=B.h-x*B.h;c.globalAlpha=0.55;c.fillRect(i,py,1,1);}}
    off=o;mark();}
  function mark(){
    var a=lo.get(),b=Math.max(hi.get(),lo.get()+0.02),r=mk.get();cv.clear();
    var m=frame(ctx,B,[a,b],[0,1],{xl:"r",yl:"x (오래 반복한 뒤의 값)",xt:7,yt:5,noGrid:true});
    ctx.drawImage(off,B.x,B.y,B.w,B.h);
    ctx.strokeStyle=INK;ctx.lineWidth=1.4;ctx.strokeRect(B.x+.5,B.y+.5,B.w,B.h);
    var sp=[[3,"r=3 : 2주기 시작"],[1+Math.sqrt(6),"1+√6≈3.449 : 4주기"],[3.5699456,"≈3.5699 : 카오스 시작"],[1+Math.sqrt(8),"1+√8≈3.828 : 주기 3 창"]];
    sp.forEach(function(s,i){if(s[0]>a&&s[0]<b){seg(ctx,m.px(s[0]),B.y,m.px(s[0]),B.y+B.h,{color:G2,dash:[3,4],w:1});
      var rt=m.px(s[0])>B.x+B.w-170;txt(ctx,s[1],m.px(s[0])+(rt?-3:3),B.y+12+i*13,{size:10.5,color:G1,align:rt?"right":"left"});}});
    seg(ctx,m.px(r),B.y,m.px(r),B.y+B.h,{color:RED,w:1.6});
    var at=attractor(r,0.5,Math.max(tr.get(),400),64);at.orbit.forEach(function(v){dot(ctx,m.px(r),m.py(v),3.2,{color:RED});});
    ro.innerHTML="r = <b>"+fmt(r,3)+"</b> : "+(at.period>0?"<span class='r'>"+at.period+"주기</span> ("+at.orbit.slice(0,8).map(function(v){return fmt(v,4);}).join(", ")+(at.orbit.length>=8&&at.period>8?" …":"")+")":(at.lyap>0?"<span class='r'>카오스</span> (λ="+fmt(at.lyap,3)+")":"긴 주기/느린 수렴"))+
      " &nbsp;|&nbsp; Lyapunov λ = "+fmt(at.lyap,3)+"<br>각 r마다 x₀=0.5에서 시작해 앞쪽 "+tr.get()+"번을 버리고 그 뒤 130개를 찍은 것. 점 1개 → 2개 → 4개 …로 갈라지는 <b>period doubling</b>이 쌓여 카오스(띠)가 되고, 그 안에 주기 3 같은 창이 다시 나타난다. 붉은 점 = 선택한 r의 장기 거동.";
  }
  render();
});

/* 고정점 반복과 Banach 수축 (주제 6) */
mount("banach",function(el,cfg){
  var cv=canvas(el,cfg.h||350),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var G={
    lin:{n:"g(x) = ax + 1",view:[-1,6]},
    cos:{n:"g(x) = cos x",view:[0,1.2]},
    newton:{n:"g(x) = (x + 2/x)/2",view:[.5,2.5]}
  };
  var gs=select(bar,"함수",Object.keys(G).map(function(k){return [k,G[k].n];}),cfg.g||"lin",function(){setup();draw();});
  var sa=slider(bar,"a",[-1.6,1.6,.6,.05],draw,function(v){return fmt(v,2);});
  var sx=slider(bar2,"x₀",[0,1,.5,.01],draw,function(v){return fmt(v,2);});
  var sn=slider(bar2,"반복 n",[1,25,6,1],draw,function(v){return String(v);});
  var ro=readout(el),BL={x:50,y:30,w:290,h:260},BR={x:410,y:30,w:285,h:260};

  function gfun(){
    var k=gs.get(),a=sa.get();
    return k==="lin"?function(x){return a*x+1;}:
      k==="cos"?function(x){return Math.cos(x);}:function(x){return (x+2/x)/2;};
  }
  function info(){
    var k=gs.get(),a=sa.get();
    if(k==="lin")return {I:[-1,6],L:Math.abs(a),fp:Math.abs(a-1)>1e-12?1/(1-a):NaN};
    if(k==="cos")return {I:[0,1],L:Math.sin(1),fp:0.7390851332151607};
    return {I:[1,2],L:.5,fp:Math.SQRT2};
  }
  function setup(){
    var I=G[gs.get()].view;
    sx.el.min=I[0];sx.el.max=I[1];sx.el.step=.01;
    sx.set({lin:.5,cos:.2,newton:1.9}[gs.get()]);
  }
  function draw(){
    var k=gs.get(),g=gfun(),inf=info(),I=inf.I,x0=sx.get(),n=sn.get();
    var selfMap=false,derivativeBound=inf.L;
    if(k==="lin"){
      var v=[g(I[0]),g(I[1])];
      selfMap=Math.min(v[0],v[1])>=I[0]&&Math.max(v[0],v[1])<=I[1];
    }else if(k==="cos"){
      selfMap=true;
    }else{
      selfMap=true;
    }
    var xs=[x0],x=x0,failed=false;
    for(var i=0;i<n;i++){
      var y=g(x);
      if(!isFinite(y)||Math.abs(y)>1e6){failed=true;break;}
      xs.push(y);x=y;
    }
    cv.clear();
    var v=G[k].view,m=frame(ctx,BL,v,v,{xl:"x",yl:"y",xt:5,yt:5});
    clipBox(ctx,BL);
    curve(ctx,m,g,v[0],v[1],{color:INK,w:2.2});
    seg(ctx,m.px(v[0]),m.py(v[0]),m.px(v[1]),m.py(v[1]),{color:INK,dash:[5,4],w:1.4});
    var pts=[[m.px(xs[0]),m.py(xs[0])]];
    for(i=0;i<xs.length-1;i++){
      pts.push([m.px(xs[i]),m.py(xs[i+1])]);
      pts.push([m.px(xs[i+1]),m.py(xs[i+1])]);
    }
    path(ctx,pts,{color:RED,w:1.6});
    ctx.restore();
    if(isFinite(inf.fp))dot(ctx,m.px(inf.fp),m.py(inf.fp),4,{fill:false,stroke:RED,w:1.8});
    dot(ctx,m.px(x0),m.py(x0),3.5,{color:INK});

    var intervalInvariant=xs.every(function(z){return z>=I[0]-1e-10&&z<=I[1]+1e-10;});
    var allErr=xs.map(function(z){return Math.abs(z-inf.fp);});
    var L=derivativeBound;
    var contract=L<1;
    var boundApplicable=selfMap&&contract&&intervalInvariant&&x0>=I[0]&&x0<=I[1];
    var ser=allErr.map(function(e){return Math.log10(Math.max(e,1e-14));});
    var lo=-14,hi=Math.max(1,Math.ceil(Math.max.apply(null,ser))+.5);
    var m2=frame(ctx,BR,[0,Math.max(25,n)],[lo,hi],{xl:"n",yl:"log₁₀ |xₙ−x*|",xt:5,yt:5});
    clipBox(ctx,BR);
    path(ctx,ser.map(function(e,i){return [m2.px(i),m2.py(e)];}),{color:RED,w:2});
    ctx.restore();
    ser.forEach(function(e,i){dot(ctx,m2.px(i),m2.py(e),i<=n?3:2,{color:RED});});

    var status=selfMap&&contract?
      "두 조건 모두 확인됨: Banach 정리의 유일 고정점·수렴 결론 적용 가능.":
      (!selfMap&&!contract?
       "자기 사상 조건과 수축 조건이 모두 충족되지 않음.":
       (!selfMap?"자기 사상 조건 g(I)⊆I가 실패함.":"L<1 수축 조건이 실패함."));
    var extra=k==="lin"?
      "선형 함수에서는 |a|<1이면 수축이다. 고정점이 존재하는 경우에도 수축 조건을 별도로 확인해야 한다.":
      k==="cos"?
      "I=[0,1]에서 cos(I)=[cos 1,1]⊆I, sup|g′|=sin 1<1.":
      "I=[1,2]에서 g(I)=[1.5,1.5]가 아니라 [√2,1.5]이며, sup|g′|=1/2<1.";

    ro.innerHTML="xₙ = <b>"+fmt(xs[xs.length-1],6)+"</b> · 고정점 x* = "+fmt(inf.fp,6)+
      "<br>구간 I=["+I.join(", ")+"] · 자기 사상: <b>"+(selfMap?"충족":"미충족")+
      "</b> · 수축 조건 L="+fmt(L,4)+"<b>"+(contract?" < 1":" ≥ 1")+"</b><br>"+
      status+"<br>"+extra+
      (failed?"<br><span class='r'>반복값이 커지거나 정의역을 벗어나 계산을 중단함.</span>":"")+
      (!intervalInvariant?"<br><span class='r'>실제 반복 궤도가 선택한 구간 밖으로 나감.</span>":"")+
      (boundApplicable?"<br>이 구간에서는 Banach 정리의 오차 상계가 적용된다.":"<br>일반적인 Banach 오차 상계를 이 궤도에 적용할 수 없다.")+
      "<br><span class='m'>고정점 정리는 자기 사상과 수축 조건을 모두 요구한다. 조건 실패는 정리의 적용 실패이지, 그 자체로 고정점의 부재나 반복의 발산을 증명하지 않는다.</span>";
  }
  setup();draw();
});

/* Lipschitz 연속 (주제 2) */
mount("lipschitz",function(el,cfg){
  var cv=canvas(el,cfg.h||340),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var F={
    abs:{n:"|x|",f:Math.abs,d:[-2,2],yr:[-0.5,2.5]},
    sq:{n:"x²",f:function(x){return x*x;},d:[-2,2],yr:[-0.5,4.5]},
    sqrt:{n:"√x",f:function(x){return x<0?NaN:Math.sqrt(x);},d:[0,1],yr:[-0.2,1.4]},
    sin:{n:"sin x",f:Math.sin,d:[-3,3],yr:[-1.6,1.6]},
    cbrt:{n:"x^(1/3)",f:function(x){return x<0?-Math.pow(-x,1/3):Math.pow(x,1/3);},d:[-1,1],yr:[-1.4,1.4]}
  };
  var fs=select(bar,"함수 f",Object.keys(F).map(function(k){return [k,F[k].n];}),cfg.f||"sq",function(){setup();draw();});
  var slo=slider(bar,"구간 왼쪽 끝",[-3,2,-2,.05],draw,function(v){return fmt(v,2);});
  var shi=slider(bar,"오른쪽 끝",[-2,3,2,.05],draw,function(v){return fmt(v,2);});
  var sx=slider(bar2,"중심 x₀",[-2,2,.5,.05],draw,function(v){return fmt(v,2);});
  var ro=readout(el),B={x:60,y:30,w:620,h:250};

  function setup(){
    var d=F[fs.get()].d;
    slo.el.min=d[0];slo.el.max=d[1]-.05;
    shi.el.min=d[0]+.05;shi.el.max=d[1];
    slo.set(d[0]);shi.set(d[1]);
    sx.el.min=d[0];sx.el.max=d[1];sx.set((d[0]+d[1])/2);
  }
  function Lest(f,a,b,n){
    var best=0,bi=a,h=(b-a)/n;
    for(var i=0;i<n;i++){
      var x=a+i*h,y=a+(i+1)*h,u=f(x),v=f(y);
      if(!isFinite(u)||!isFinite(v))continue;
      var q=Math.abs(v-u)/h;
      if(q>best){best=q;bi=x;}
    }
    return {L:best,x:bi,h:h};
  }
  X.lipEst=Lest;

  function draw(){
    var k=fs.get(),f=F[k].f,a=slo.get(),b=shi.get();
    if(b<=a){ro.textContent="구간 오른쪽 끝은 왼쪽 끝보다 커야 합니다.";return;}
    var x0=clamp(sx.get(),a,b),y0=f(x0);
    cv.clear();
    var xr=[Math.min(F[k].d[0],a)-.2,Math.max(F[k].d[1],b)+.2];
    var m=frame(ctx,B,xr,F[k].yr,{xl:"x",yl:"y",xt:8,yt:5});
    var e1=Lest(f,a,b,200),e2=Lest(f,a,b,2000);
    var L=e2.L,viol=0,invalid=0,maxRatio=0;
    clipBox(ctx,B);

    // Correct cone: y0 ± L|x-x0|, with vertex at x0.
    var upper=[],lower=[];
    for(var i=0;i<=300;i++){
      var x=a+(b-a)*i/300,r=L*Math.abs(x-x0);
      upper.push([m.px(x),m.py(y0+r)]);
      lower.push([m.px(x),m.py(y0-r)]);
    }
    path(ctx,upper,{color:RED,w:1.5,dash:[5,4]});
    path(ctx,lower,{color:RED,w:1.5,dash:[5,4]});

    curve(ctx,m,f,xr[0],xr[1],{color:GRID,w:1.5,n:500});
    curve(ctx,m,f,a,b,{color:INK,w:2.5,n:500});
    ctx.restore();

    // Verify the displayed inequality at the same points used for diagnostics.
    for(i=0;i<=2000;i++){
      x=a+(b-a)*i/2000;
      var y=f(x),bound=L*Math.abs(x-x0),diff=Math.abs(y-y0);
      if(!isFinite(y)){invalid++;continue;}
      if(diff>bound+1e-8*Math.max(1,diff,bound)){
        viol++;
        if(i%10===0)dot(ctx,m.px(x),m.py(y),2,{color:RED});
      }
      if(Math.abs(x-x0)>1e-12)maxRatio=Math.max(maxRatio,diff/Math.abs(x-x0));
    }
    dot(ctx,m.px(x0),m.py(y0),4.5,{color:RED});

    var known={
      abs:"|x|는 전체 실수에서 L=1",
      sq:"x²의 구간 Lipschitz 상수는 max |2x| = "+fmt(2*Math.max(Math.abs(a),Math.abs(b)),3),
      sin:"sin x는 전체 실수에서 L=1",
      sqrt:a>0?"√x의 [a,b]에서 L=1/(2√a) = "+fmt(1/(2*Math.sqrt(a)),3):
        "√x는 [0,b]에서 Lipschitz 연속이 아님",
      cbrt:a<=0&&b>=0?"x^(1/3)은 0을 포함하는 구간에서 Lipschitz 연속이 아님":
        "0에서 떨어진 구간에서는 도함수가 유계"
    }[k];

    ro.innerHTML="구간 ["+fmt(a,2)+", "+fmt(b,2)+"] · 중심 x₀="+fmt(x0,2)+"<br>"+
      "최대 인접 차분: 200칸 L≈<b>"+fmt(e1.L,4)+"</b>, 2000칸 L≈<b>"+fmt(e2.L,4)+"</b>.<br>"+
      "2001개 점에서 관측한 최대 비율 |f(x)−f(x₀)|/|x−x₀| = <b>"+fmt(maxRatio,4)+"</b>."+
      (viol? "<br><span class='r'>검사한 점 중 "+viol+"개에서 그려진 원뿔 부등식이 위반됨.</span>":
       "<br>검사한 유한 표본에서는 부등식 위반이 관측되지 않음.")+
      (invalid?"<br>함수값이 정의되지 않는 검사점: "+invalid+"개.":"")+
      "<br>이론적 참고: "+known+"."+
      "<br><span class='m'>격자에서 얻은 L은 표본 기반 추정치일 뿐이다. 표본에서 위반이 없다는 사실만으로 구간 전체의 Lipschitz 조건을 증명할 수는 없다. 빨간 점선은 추정 L로 만든 부등식의 경계다.</span>";
  }
  setup();draw();
});

/* ODE 유일성: y' = 3 y^(2/3), y(0)=0 (주제 2) */
mount("ode-nonunique",function(el,cfg){
  var cv=canvas(el,cfg.h||340),ctx=cv.ctx,bar=ctlBar(el);
  var ps=select(bar,"문제 (모두 y(0)=0)",[["c","y′ = 3y^(2/3)"],["s","y′ = √y"]],cfg.p||"c",draw);
  var sc=slider(bar,"출발 시각 c",[0,2.5,1,0.05],draw,function(v){return fmt(v,2);});
  var ro=readout(el),BL={x:48,y:30,w:240,h:250},BR={x:352,y:30,w:346,h:250};
  function sol(p,c){return p==="c"?function(t){return t<=c?0:Math.pow(t-c,3);}:function(t){return t<=c?0:(t-c)*(t-c)/4;};}
  function rhs(p){return p==="c"?function(y){return 3*Math.pow(Math.max(y,0),2/3);}:function(y){return Math.sqrt(Math.max(y,0));};}
  X.odeSol=sol;X.odeRhs=rhs;
  function draw(){
    var p=ps.get(),c=sc.get(),f=rhs(p);cv.clear();
    txt(ctx,"우변 f(y)",BL.x,BL.y-12,{size:12,weight:700});txt(ctx,"y(0)=0 에서 출발하는 해들",BR.x+16,BR.y-12,{size:12,weight:700});
    var ym=p==="c"?3:1.2,m=frame(ctx,BL,[0,1],[0,ym],{xl:"y",xt:4,yt:4});clipBox(ctx,BL);curve(ctx,m,f,0,1,{color:INK,w:2.4,n:300});
    // secant from 0
    var hh=0.15,sl=f(hh)/hh;seg(ctx,m.px(0),m.py(0),m.px(hh*3),m.py(Math.min(ym,sl*hh*3)),{color:RED,dash:[4,3],w:1.3});ctx.restore();
    txt(ctx,"y=0 근처에서 기울기가 끝없이 커진다",BL.x+6,BL.y+BL.h-8,{size:11,color:RED});
    var T=3,ymx=p==="c"?(T*T*T)*0.9:(T*T/4)*1.1;ymx=p==="c"?8:2.4;
    var m2=frame(ctx,BR,[0,T],[-0.2,ymx],{xl:"t",yl:"y",xt:6,yt:5});clipBox(ctx,BR);
    [0,0.5,1,1.5,2,2.5].forEach(function(cc){curve(ctx,m2,sol(p,cc),0,T,{color:G3,w:1.6,n:300});});
    curve(ctx,m2,sol(p,c),0,T,{color:RED,w:2.8,n:400});ctx.restore();
    seg(ctx,m2.px(0),m2.py(0),m2.px(T),m2.py(0),{color:INK,w:1.4,dash:[2,3]});dot(ctx,m2.px(c),m2.py(0),4.5,{color:RED});
    // verify residual
    var s=sol(p,c),res=0;for(var i=0;i<=300;i++){var t=0.01+(T-0.02)*i/300,h=1e-5,d=(s(t+h)-s(t-h))/(2*h);if(Math.abs(t-c)>0.01)res=Math.max(res,Math.abs(d-f(s(t))));}
    ro.innerHTML="<b>해 y(t) = "+(p==="c"?"(t−"+fmt(c,2)+")³":"(t−"+fmt(c,2)+")²/4")+" (t&gt;c), 0 (t≤c)</b> — 미분방정식에 대입한 최대 잔차 "+res.toExponential(1)+" (≈0, 진짜 해)<br>"+
     "c를 어떻게 잡아도 해이므로 <span class='r'>해가 무수히 많다</span> (y≡0 도 그중 하나, c→∞). f는 연속이라 <b>존재성</b>(Peano)은 있지만, y=0에서 Lipschitz가 아니라서 <b>유일성</b>이 깨진다. 반면 y′=−y 처럼 f가 Lipschitz이면 해는 하나뿐이다 (주제 2).";
  }
  draw();
});
/* ================= Sobol 지수 · β,γ 선형 풀이 (주제 5, 6) ================= */
function sobolExact(a,b,c){ // f=aβ+bγ+cβγ, β,γ~U[0,1] independent
  var V1=Math.pow(a+c/2,2)/12,V2=Math.pow(b+c/2,2)/12,V12=c*c/144,V=V1+V2+V12;
  return {V:V,V1:V1,V2:V2,V12:V12,S1:V>0?V1/V:NaN,S2:V>0?V2/V:NaN,S12:V>0?V12/V:NaN,ST1:V>0?(V1+V12)/V:NaN,ST2:V>0?(V2+V12)/V:NaN,f0:a/2+b/2+c/4};}
X.sobolExact=sobolExact;
function sobolMC(a,b,c,N,seed){ // pick-freeze: Saltelli(2010) first order, Jansen total
  var r=rng(seed),f=function(x,y){return a*x+b*y+c*x*y;},fa=[],fb=[],A=[],Bm=[],i;
  for(i=0;i<N;i++){A.push([r(),r()]);Bm.push([r(),r()]);fa.push(f(A[i][0],A[i][1]));fb.push(f(Bm[i][0],Bm[i][1]));}
  var m=0,v=0;for(i=0;i<N;i++){m+=fa[i];}m/=N;for(i=0;i<N;i++)v+=(fa[i]-m)*(fa[i]-m);v/=N;
  var s1=0,s2=0,t1=0,t2=0;
  for(i=0;i<N;i++){var ab1=f(Bm[i][0],A[i][1]),ab2=f(A[i][0],Bm[i][1]); // A with column i taken from B
    s1+=fb[i]*(ab1-fa[i]);s2+=fb[i]*(ab2-fa[i]);t1+=Math.pow(fa[i]-ab1,2);t2+=Math.pow(fa[i]-ab2,2);}
  return {S1:s1/N/v,S2:s2/N/v,ST1:t1/(2*N)/v,ST2:t2/(2*N)/v,V:v};}
X.sobolMC=sobolMC;
mount("sobol",function(el,cfg){
  var plot=div(el,"v6x-sobol-plot");
  plot.style.overflowX="auto";plot.setAttribute("tabindex","0");
  plot.setAttribute("role","region");plot.setAttribute("aria-label","Sobol 그래프: 작은 화면에서는 좌우로 스크롤");
  plot.addEventListener("keydown",function(e){if(e.key==="ArrowLeft"||e.key==="ArrowRight")e.stopPropagation();});
  var cv=canvas(plot,cfg.h||340),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el),mc=null,seed=5;
  cv.c.style.minWidth="720px";
  var hint=div(el,"v6x-cap","작은 화면에서는 그래프를 좌우로 밀어 라벨과 값을 확인하세요.");
  el.insertBefore(hint,plot);
  [bar,bar2].forEach(function(b){b.style.rowGap="10px";});
  var sa=slider(bar,"a (β 계수)",[-3,3,1,0.1],reset,function(v){return fmt(v,1);});
  var sb=slider(bar,"b (γ 계수)",[-3,3,2,0.1],reset,function(v){return fmt(v,1);});
  var sc=slider(bar,"c (βγ 계수)",[-3,3,1,0.1],reset,function(v){return fmt(v,1);});
  button(bar2,"f=β+2γ+βγ (노트 예)",function(){sa.set(1);sb.set(2);sc.set(1);reset();});
  button(bar2,"f=βγ",function(){sa.set(0);sb.set(0);sc.set(1);reset();});
  button(bar2,"선형 f=β+2γ",function(){sa.set(1);sb.set(2);sc.set(0);reset();});
  button(bar2,"몬테카를로로 확인 (N=20000)",function(){seed=(seed*69069+1)>>>0;mc=sobolMC(sa.get(),sb.get(),sc.get(),20000,seed);draw();});
  var ro=readout(el),BL={x:44,y:30,w:270,h:240},BR={x:380,y:30,w:318,h:240};
  function reset(){mc=null;draw();}
  function draw(){
    var a=sa.get(),b=sb.get(),c=sc.get(),E=sobolExact(a,b,c);cv.clear();
    txt(ctx,"단독 효과 f_β(β), f_γ(γ)",BL.x,BL.y-12,{size:12,weight:700});txt(ctx,"분산 비율 (검은 막대=정확값)"+(mc?", 붉은 마름모=MC":""),BR.x,BR.y-12,{size:12,weight:700});
    var k1=a+c/2,k2=b+c/2,mx=Math.max(0.5,Math.abs(k1)/2,Math.abs(k2)/2)*1.2;
    var m=frame(ctx,BL,[0,1],[-mx,mx],{xl:"β 또는 γ",xt:4,yt:4});clipBox(ctx,BL);
    curve(ctx,m,function(x){return k1*(x-0.5);},0,1,{color:INK,w:2.4});curve(ctx,m,function(x){return k2*(x-0.5);},0,1,{color:RED,w:2.4,dash:[6,4]});ctx.restore();
    legend(ctx,BL.x+8,BL.y+16,[{label:"f_β=(a+c/2)(β−½)",color:INK},{label:"f_γ=(b+c/2)(γ−½)",color:RED,dash:[6,4]}]);
    // bars
    var rows=[["S_β",E.S1,mc&&mc.S1],["S_γ",E.S2,mc&&mc.S2],["S_βγ",E.S12,null],["ST_β",E.ST1,mc&&mc.ST1],["ST_γ",E.ST2,mc&&mc.ST2]];
    var bx=BR.x+54,bw=BR.w-110,rh=BR.h/5;
    rows.forEach(function(r,i){var y=BR.y+i*rh+rh*0.25,h=rh*0.5;txt(ctx,r[0],BR.x+48,y+h/2+4,{size:12,align:"right"});
      ctx.fillStyle=i===2?RED:INK;ctx.fillRect(bx,y,Math.max(0,r[1])*bw,h);ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.strokeRect(bx+.5,y+.5,bw,h);
      txt(ctx,fmt(r[1],3),bx+bw+8,y+h/2+4,{size:11,color:G1});
      if(r[2]!=null)marker(ctx,3,bx+clamp(r[2],0,1)*bw,y+h/2,5,{color:RED,hollow:false});});
    seg(ctx,bx,BR.y,bx,BR.y+BR.h,{color:INK,w:1.4});
    var ex=(E.V===0);
    if(ex){
      ro.innerHTML="<b>Var(f)=0: f는 상수 0입니다.</b> 입력이 바뀌어도 출력은 변하지 않습니다.<br>"+
        "Sobol 지수는 각 성분의 분산을 전체 분산 Var(f)로 나눈 값입니다. 지금은 0/0이므로 <b>모든 Sobol 지수가 정의되지 않습니다.</b> (막대 옆 —)<br>"+
        "S_β+S_γ+S_βγ=1은 Var(f)&gt;0일 때 성립합니다. a, b, c 중 하나를 0이 아닌 값으로 바꾸면 지수를 비교할 수 있습니다.";
      return;
    }
    ro.innerHTML="Var(f) = "+fmt(E.V1*144,3)+"/144 + "+fmt(E.V2*144,3)+"/144 + "+fmt(E.V12*144,3)+"/144 = <b>"+fmt(E.V,4)+"</b> &nbsp;(Var f_β=(a+c/2)²/12, Var f_γ=(b+c/2)²/12, Var f_βγ=c²/144) &nbsp;|&nbsp; f₀=E[f]="+fmt(E.f0,3)+"<br>"+
      "<b>S_β+S_γ+S_βγ = "+fmt(E.S1+E.S2+E.S12,3)+"</b> (Var(f)&gt;0일 때 1) · S_β="+fmt(E.S1,3)+", S_γ="+fmt(E.S2,3)+", S_βγ="+fmt(E.S12,3)+" · ST_β=S_β+S_βγ="+fmt(E.ST1,3)+", ST_γ="+fmt(E.ST2,3)+" (합이 1을 넘을 수 있다)<br>"+
      (c===0?"c=0 (상호작용 없음) → S_βγ=0, ST=S : 합이 1.":"지수비 ≠ 계수비 : 상호작용항의 평균 부분이 선형항에 흡수되어 실효 계수가 a+c/2, b+c/2 가 된다. 노트 예(1,2,1)는 S_β=27/103, S_γ=75/103, S_βγ=1/103.")+
      (mc?"<br>pick-freeze 몬테카를로(N=20000) : S_β≈"+fmt(mc.S1,3)+", S_γ≈"+fmt(mc.S2,3)+", ST_β≈"+fmt(mc.ST1,3)+", ST_γ≈"+fmt(mc.ST2,3)+" — 함수식을 몰라도 시뮬레이션 값만으로 계산해 정확값에 가까워진다.":"");
  }
  draw();
});

/* S,I,dS/dt,dI/dt 로부터 β,γ 풀기 (주제 6) */
mount("beta-gamma-solve",function(el,cfg){
  var cv=canvas(el,cfg.h||330),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var sN=slider(bar,"N",[50,200,100,5],draw,function(v){return String(v);});
  var sS=slider(bar,"S",[10,150,80,1],draw,function(v){return String(v);});
  var sI=slider(bar,"I",[1,60,10,1],draw,function(v){return String(v);});
  var sdS=slider(bar2,"dS/dt",[-10,-0.2,-2,0.1],draw,function(v){return fmt(v,1);});
  var sdI=slider(bar2,"dI/dt",[-5,8,1,0.1],draw,function(v){return fmt(v,1);});
  var ro=readout(el),B={x:50,y:26,w:640,h:260};
  function solve(N,S,I,dS,dI){var k=I*S/N,beta=-dS/k,gamma=(beta*k-dI)/I;return {beta:beta,gamma:gamma,k:k,det:I*I*S/N};}
  X.bgSolve=solve;
  function draw(){
    var N=sN.get(),S=Math.min(sS.get(),N-1),I=Math.min(sI.get(),N-S),dS=sdS.get(),dI=sdI.get(),r=solve(N,S,I,dS,dI);cv.clear();
    var xr=[0,Math.max(1,Math.ceil(r.beta*1.6*10)/10+0.2)],yr=[Math.min(-0.1,Math.floor(r.gamma*1.4*10)/10-0.1),Math.max(0.5,Math.ceil(r.gamma*1.8*10)/10+0.2)];
    var m=frame(ctx,B,xr,yr,{xl:"β",yl:"γ",xt:6,yt:5});clipBox(ctx,B);
    seg(ctx,m.px(xr[0]),m.py(xr[0]),m.px(xr[1]),m.py(xr[1]),{color:G2,dash:[5,4],w:1.3});
    seg(ctx,m.px(r.beta),B.y,m.px(r.beta),B.y+B.h,{color:INK,w:2.2});
    // (IS/N)β − Iγ = dI -> γ=(k β − dI)/I
    var g0=(r.k*xr[0]-dI)/I,g1=(r.k*xr[1]-dI)/I;seg(ctx,m.px(xr[0]),m.py(g0),m.px(xr[1]),m.py(g1),{color:INK,w:2.2,dash:[7,4]});ctx.restore();
    dot(ctx,m.px(r.beta),m.py(r.gamma),5.5,{color:RED});
    txt(ctx,"식 1 : −(IS/N)β = dS/dt  (세로선)",m.px(r.beta)+6,B.y+16,{size:11.5});txt(ctx,"식 2 : (IS/N)β − Iγ = dI/dt",B.x+B.w-6,B.y+B.h-10,{size:11.5,align:"right"});
    txt(ctx,"R₀=1 (γ=β)",m.px(xr[1])-6,m.py(xr[1])-6>B.y?m.py(xr[1])-6:B.y+12,{size:10.5,color:G1,align:"right"});
    var R0=r.beta/r.gamma;
    ro.innerHTML="행렬 A = [ −IS/N , 0 ; IS/N , −I ] = [ −"+fmt(r.k,2)+" , 0 ; "+fmt(r.k,2)+" , −"+fmt(I,0)+" ], <b>det A = I²S/N = "+fmt(r.det,2)+" ≠ 0</b> (S,I&gt;0) → 역행렬 존재<br>"+
     "<b>β = "+fmt(r.beta,3)+"</b>, <b>γ = "+(r.gamma>0?fmt(r.gamma,3):"<span class='r'>"+fmt(r.gamma,3)+" (음수 : 이 자료는 SIR로 설명 불가)</span>")+"</b>, R₀ = β/γ = "+(r.gamma>0?fmt(R0,2)+(R0>1?" &gt; 1 → 유행 지속":" ≤ 1 → 종식"):"—")+
     "<br><span class='m'>두 식의 그래프(선)의 교점이 (β,γ). 노트 예 N=100,S=80,I=10,dS/dt=−2,dI/dt=1 → β=1/4, γ=1/10, R₀=2.5. 날짜가 여러 개면 식이 쌓여 최소제곱 AᵀAθ=Aᵀb.</span>";
  }
  draw();
});
/* ================= 일반 ML 위젯: overfitting · bias-variance · k-means ================= */
function solveLin(A,b){var n=b.length,i,j,k,M=A.map(function(r,i){return r.concat([b[i]]);});
  for(i=0;i<n;i++){var p=i;for(j=i+1;j<n;j++)if(Math.abs(M[j][i])>Math.abs(M[p][i]))p=j;var t=M[i];M[i]=M[p];M[p]=t;
    var d=M[i][i];if(Math.abs(d)<1e-14)d=1e-14;for(j=i+1;j<n;j++){var f=M[j][i]/d;for(k=i;k<=n;k++)M[j][k]-=f*M[i][k];}}
  var x=new Array(n);for(i=n-1;i>=0;i--){var s=M[i][n];for(j=i+1;j<n;j++)s-=M[i][j]*x[j];x[i]=s/(M[i][i]||1e-14);}return x;}
function cheb(x,d){var t=2*x-1,o=[1,t];for(var j=2;j<=d;j++)o.push(2*t*o[j-1]-o[j-2]);return o.slice(0,d+1);}
function polyFit(xs,ys,d){var m=d+1,A=[],b=[],i,j,k;for(j=0;j<m;j++){A.push(new Array(m).fill(0));b.push(0);}
  for(i=0;i<xs.length;i++){var ph=cheb(xs[i],d);for(j=0;j<m;j++){b[j]+=ph[j]*ys[i];for(k=0;k<m;k++)A[j][k]+=ph[j]*ph[k];}}
  for(j=0;j<m;j++)A[j][j]+=1e-9;var w=solveLin(A,b);
  return function(x){var ph=cheb(x,d),s=0;for(var j=0;j<m;j++)s+=w[j]*ph[j];return s;};}
X.polyFit=polyFit;
var TRUTH=function(x){return Math.sin(2*Math.PI*x);};
mount("overfit",function(el,cfg){
  var cv=canvas(el,cfg.h||360),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el),seed=4,DMAX=12;
  var sd=slider(bar,"다항식 차수 d",[0,DMAX,3,1],draw,function(v){return String(v);});
  var sn=slider(bar,"훈련 데이터 n",[6,40,14,1],newd,function(v){return String(v);});
  var sg=slider(bar2,"잡음 σ",[0,0.6,0.25,0.05],newd,function(v){return fmt(v,2);});
  button(bar2,"새 데이터",function(){seed=(seed*69069+3)>>>0;newd();});
  var ro=readout(el),BL={x:44,y:26,w:350,h:270},BR={x:456,y:26,w:244,h:270},D=null;
  function newd(){var r=rng(seed),n=sn.get(),s=sg.get(),xs=[],ys=[];for(var i=0;i<n;i++){var x=(i+r()*0.9)/n;xs.push(x);ys.push(TRUTH(x)+s*gauss(r));}
    var fits=[];for(var d=0;d<=DMAX;d++)fits.push(polyFit(xs,ys,d));
    var tr=[],te=[],G=400;fits.forEach(function(f){var a=0,b=0,i;for(i=0;i<n;i++)a+=Math.pow(f(xs[i])-ys[i],2);for(i=0;i<G;i++){var x=(i+0.5)/G;b+=Math.pow(f(x)-TRUTH(x),2);}tr.push(a/n);te.push(b/G+s*s);});
    D={xs:xs,ys:ys,fits:fits,tr:tr,te:te,s:s};draw();}
  function draw(){
    if(!D)return;var d=sd.get(),f=D.fits[d];cv.clear();
    var m=frame(ctx,BL,[0,1],[-1.8,1.8],{xl:"x",yl:"y",xt:5,yt:6});clipBox(ctx,BL);
    curve(ctx,m,TRUTH,0,1,{color:INK,w:2,n:300});curve(ctx,m,f,0,1,{color:RED,w:2.6,n:500});ctx.restore();
    D.xs.forEach(function(x,i){dot(ctx,m.px(x),m.py(clamp(D.ys[i],-1.8,1.8)),3.6,{color:INK});});
    legend(ctx,BL.x+BL.w-150,BL.y+16,[{label:"진짜 함수 sin 2πx",color:INK,w:2},{label:"차수 "+d+" 다항식 적합",color:RED,w:2.6}]);
    var lg=function(v){return Math.log10(Math.max(v,1e-8));},all=D.tr.concat(D.te).map(lg);
    var lo=Math.floor(Math.min.apply(null,all)),hi=Math.ceil(Math.max.apply(null,all));if(hi-lo<2)hi=lo+2;
    var xs=[];for(var k=0;k<=DMAX;k++)xs.push(k);
    var m2=frame(ctx,BR,[0,DMAX],[lo,Math.min(hi,3)],{xl:"차수 d",yl:"log₁₀ 오차(MSE)",xt:6,yt:5});clipBox(ctx,BR);
    path(ctx,xs.map(function(k){return [m2.px(k),m2.py(lg(D.tr[k]))];}),{color:INK,w:2,dash:[6,4]});path(ctx,xs.map(function(k){return [m2.px(k),m2.py(lg(D.te[k]))];}),{color:RED,w:2.4});ctx.restore();
    xs.forEach(function(k){dot(ctx,m2.px(k),m2.py(lg(D.te[k])),k===d?5:2.4,{color:RED});});
    legend(ctx,BR.x+10,BR.y+BR.h-26,[{label:"훈련 오차",color:INK,dash:[6,4]},{label:"일반화(테스트) 오차",color:RED,w:2.4}]);
    var best=0;D.te.forEach(function(v,i){if(v<D.te[best])best=i;});
    ro.innerHTML="차수 d=<b>"+d+"</b> : 훈련 오차 <b>"+(D.tr[d]).toExponential(2)+"</b> · 테스트 오차 <b>"+fmt(D.te[d],4)+"</b> (잡음 분산 σ²="+fmt(D.s*D.s,3)+" 포함) &nbsp;|&nbsp; 이 데이터에서 테스트 오차 최소는 d="+best+"<br>"+
     "차수를 올리면 <b>훈련 오차는 계속 줄지만</b> 테스트 오차는 어느 지점부터 다시 커진다 (overfitting: 잡음까지 외운다). 데이터 수 n=파라미터 수(d+1)이면 점을 정확히 지나간다 → 훈련 오차≈0. 새 데이터를 뽑으면 최적 차수가 조금씩 달라진다.";
  }
  newd();
});

mount("bias-variance",function(el,cfg){
  var cv=canvas(el,cfg.h||360),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el),seed=9,DMAX=9,K=60,cache=null;
  var sd=slider(bar,"차수 d",[0,DMAX,3,1],draw,function(v){return String(v);});
  var sn=slider(bar,"데이터 수 n",[10,60,20,1],recalc,function(v){return String(v);});
  var sg=slider(bar2,"잡음 σ",[0.05,0.6,0.3,0.05],recalc,function(v){return fmt(v,2);});
  button(bar2,"데이터셋 다시 뽑기",function(){seed=(seed*69069+5)>>>0;recalc();});
  var ro=readout(el),BL={x:44,y:26,w:350,h:270},BR={x:456,y:26,w:244,h:270};
  var G=100;
  function recalc(){
    var n=sn.get(),s=sg.get(),r=rng(seed),xs=[],i,k,d;for(i=0;i<n;i++)xs.push((i+0.5)/n);
    var fits=[];for(d=0;d<=DMAX;d++)fits.push([]);
    var Y=[];for(k=0;k<K;k++){var ys=xs.map(function(x){return TRUTH(x)+s*gauss(r);});Y.push(ys);}
    var grid=[];for(i=0;i<G;i++)grid.push((i+0.5)/G);
    var res=[];
    for(d=0;d<=DMAX;d++){var P=[];for(k=0;k<K;k++){var f=polyFit(xs,Y[k],d);P.push(grid.map(f));}
      var b2=0,v=0,tst=0;for(i=0;i<G;i++){var mean=0;for(k=0;k<K;k++)mean+=P[k][i];mean/=K;var vv=0;for(k=0;k<K;k++)vv+=Math.pow(P[k][i]-mean,2);vv/=K;
        b2+=Math.pow(mean-TRUTH(grid[i]),2);v+=vv;
        for(k=0;k<K;k++)tst+=Math.pow(P[k][i]-TRUTH(grid[i]),2)/K;}
      res.push({P:P,b2:b2/G,v:v/G,err:tst/G});}
    cache={res:res,s:s,grid:grid};draw();}
  X.biasVar=function(){return cache;};
  function draw(){
    if(!cache)return;var d=sd.get(),R=cache.res[d],s=cache.s;cv.clear();
    var m=frame(ctx,BL,[0,1],[-1.8,1.8],{xl:"x",yl:"y",xt:5,yt:6});clipBox(ctx,BL);
    for(var k=0;k<30;k++)path(ctx,cache.grid.map(function(x,i){return [m.px(x),m.py(R.P[k][i])];}),{color:G3,w:1.2});
    var mean=cache.grid.map(function(x,i){var t=0;for(var k=0;k<K;k++)t+=R.P[k][i];return t/K;});
    curve(ctx,m,TRUTH,0,1,{color:INK,w:2.2,n:300});path(ctx,cache.grid.map(function(x,i){return [m.px(x),m.py(mean[i])];}),{color:RED,w:2.6});ctx.restore();
    legend(ctx,BL.x+BL.w-190,BL.y+16,[{label:"진짜 f",color:INK,w:2.2},{label:"적합들의 평균 E[f̂]",color:RED,w:2.6},{label:"데이터셋마다의 적합 f̂ (30개)",color:G2,w:1.4}]);
    var xs=[],B2=[],V=[],T=[];for(var q=0;q<=DMAX;q++){xs.push(q);B2.push(cache.res[q].b2);V.push(cache.res[q].v);T.push(cache.res[q].b2+cache.res[q].v);}
    var hi=Math.min(0.6,Math.max.apply(null,T.slice(1))*1.15+s*s);
    var m2=frame(ctx,BR,[0,DMAX],[0,Math.max(hi,s*s*2+0.02)],{xl:"차수 d",xt:5,yt:5});clipBox(ctx,BR);
    path(ctx,xs.map(function(q){return [m2.px(q),m2.py(B2[q])];}),{color:INK,w:2,dash:[6,4]});path(ctx,xs.map(function(q){return [m2.px(q),m2.py(V[q])];}),{color:G1,w:2});path(ctx,xs.map(function(q){return [m2.px(q),m2.py(T[q]+s*s)];}),{color:RED,w:2.6});
    seg(ctx,BR.x,m2.py(s*s),BR.x+BR.w,m2.py(s*s),{color:G2,dash:[2,3]});ctx.restore();
    dot(ctx,m2.px(d),m2.py(T[d]+s*s),5,{color:RED});
    legend(ctx,BR.x+96,BR.y+18,[{label:"bias²",color:INK,dash:[6,4]},{label:"variance",color:G1},{label:"bias²+var+σ²",color:RED,w:2.6},{label:"σ² (줄일 수 없음)",color:G2,dash:[2,3]}]);
    ro.innerHTML="d=<b>"+d+"</b> : bias² = <b>"+fmt(R.b2,4)+"</b>, variance = <b>"+fmt(R.v,4)+"</b>, 잡음 σ² = "+fmt(s*s,4)+" → <b>기대 테스트 오차 = bias²+var+σ² = "+fmt(R.b2+R.v+s*s,4)+"</b> (60개 데이터셋 평균으로 계산)<br>"+
     "차수가 낮으면 <b>bias가 크다</b> (평균 적합이 진짜 f에서 멀다), 차수가 높으면 <b>variance가 크다</b> (데이터셋마다 적합이 들쭉날쭉). 합이 최소인 곳이 알맞은 복잡도. 데이터 수 n을 늘리면 variance가 줄어든다.";
  }
  recalc();
});

mount("kmeans",function(el,cfg){
  var cv=canvas(el,cfg.h||380),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el),seed=2,P=[],C=[],A=[],it=0,phase="assign";
  var sk=slider(bar,"k (군집 수)",[1,6,3,1],function(){init();},function(v){return String(v);});
  var ro=readout(el),B={x:44,y:22,w:360,h:330},BR={x:470,y:22,w:228,h:330},elbow=null;
  button(bar2,"초기화(무작위)",function(){seed=(seed*69069+1)>>>0;init();});
  button(bar2,"한 단계",function(){step();draw();});
  button(bar2,"수렴까지",function(){var g=0;while(g++<200){if(phase==="update"){step();}var before=A.join(",");step();step();if(A.join(",")===before){break;}}draw();});
  button(bar2,"나쁜 초기화(한 덩어리에 몰림)",function(){init(true);});
  button(bar2,"새 데이터",function(){seed=(seed*1103515245+12345)>>>0;gen();init();});
  function gen(){var r=rng(seed+100),cs=[[0.25,0.3],[0.72,0.3],[0.5,0.76]];P=[];cs.forEach(function(c){for(var i=0;i<30;i++)P.push([clamp(c[0]+0.075*gauss(r),0.02,0.98),clamp(c[1]+0.075*gauss(r),0.02,0.98)]);});elbow=null;}
  function d2(a,b){return (a[0]-b[0])*(a[0]-b[0])+(a[1]-b[1])*(a[1]-b[1]);}
  function assign(Cc){return P.map(function(p){var b=0;for(var j=1;j<Cc.length;j++)if(d2(p,Cc[j])<d2(p,Cc[b]))b=j;return b;});}
  function update(Cc,As){return Cc.map(function(c,j){var sx=0,sy=0,n=0;P.forEach(function(p,i){if(As[i]===j){sx+=p[0];sy+=p[1];n++;}});return n?[sx/n,sy/n]:c;});}
  function J(Cc,As){var s=0;P.forEach(function(p,i){s+=d2(p,Cc[As[i]]);});return s;}
  X.kmeansJ=J;
  function init(bad){var r=rng(seed+7),k=sk.get();C=[];
    if(bad){for(var j=0;j<k;j++)C.push([0.25+0.06*r(),0.3+0.06*r()]);}
    else{var idx=[];while(idx.length<k){var q=Math.floor(r()*P.length);if(idx.indexOf(q)<0)idx.push(q);}C=idx.map(function(q){return P[q].slice();});}
    A=assign(C);it=0;phase="update";draw();}
  function step(){if(phase==="update"){C=update(C,A);phase="assign";it++;}else{A=assign(C);phase="update";}}
  function best(k){var bj=1e9,r=rng(77+k);for(var t=0;t<8;t++){var idx=[];while(idx.length<k){var q=Math.floor(r()*P.length);if(idx.indexOf(q)<0)idx.push(q);}
      var Cc=idx.map(function(q){return P[q].slice();}),As=assign(Cc);for(var g=0;g<40;g++){Cc=update(Cc,As);As=assign(Cc);}bj=Math.min(bj,J(Cc,As));}return bj;}
  function draw(){
    cv.clear();var m=frame(ctx,B,[0,1],[0,1],{xt:5,yt:5,noGrid:false});
    // lines to centers
    P.forEach(function(p,i){var c=C[A[i]];seg(ctx,m.px(p[0]),m.py(p[1]),m.px(c[0]),m.py(c[1]),{color:"#e3e0da",w:1});});
    P.forEach(function(p,i){marker(ctx,A[i],m.px(p[0]),m.py(p[1]),3.8,{color:A[i]%3===0?INK:A[i]%3===1?G1:INK,hollow:A[i]>=3});});
    C.forEach(function(c,j){var x=m.px(c[0]),y=m.py(c[1]);ctx.save();ctx.strokeStyle=RED;ctx.lineWidth=2.6;ctx.beginPath();ctx.arc(x,y,9,0,6.3);ctx.stroke();ctx.restore();marker(ctx,4,x,y,6,{color:RED,w:2.4});txt(ctx,String(j+1),x+11,y-9,{size:11.5,color:RED,weight:700});});
    var Jc=J(C,A);
    if(!elbow){elbow=[];for(var k=1;k<=8;k++)elbow.push(best(k));}
    var mx=Math.max.apply(null,elbow)*1.08,m2=frame(ctx,BR,[1,8],[0,mx],{xl:"k",yl:"J(k) = Σ‖x−μ‖²",xt:7,yt:5});clipBox(ctx,BR);
    path(ctx,elbow.map(function(e,i){return [m2.px(i+1),m2.py(e)];}),{color:INK,w:2});ctx.restore();
    elbow.forEach(function(e,i){dot(ctx,m2.px(i+1),m2.py(e),i+1===sk.get()?5:2.6,{color:i+1===sk.get()?RED:INK});});
    txt(ctx,"best of 8 runs",BR.x+BR.w-6,BR.y+BR.h-8,{size:10.5,color:G1,align:"right"});
    var cnt=C.map(function(c,j){return A.filter(function(a){return a===j;}).length;});
    ro.innerHTML="반복 <b>"+it+"</b> · 다음은 <b>"+(phase==="update"?"중심 갱신(군집 평균으로 이동)":"재배정(가장 가까운 중심으로)")+"</b> &nbsp;|&nbsp; 현재 J = Σ‖x−μ<sub>군집</sub>‖² = <b>"+fmt(Jc,3)+"</b> &nbsp;|&nbsp; 군집 크기 "+cnt.join(" / ")+"<br>"+
     "Lloyd 알고리즘: ① 각 점을 가장 가까운 중심에 배정 ② 중심을 군집 평균으로 옮김 — 두 단계 모두 J를 <b>줄이거나 유지</b>한다. 그러나 <b>지역 최솟값</b>에 멈출 수 있으니 '나쁜 초기화'와 '무작위'를 비교해 보자. 오른쪽: k를 늘리면 J는 항상 줄지만 진짜 군집 수(3) 뒤로는 감소가 둔해진다 (elbow).";
  }
  gen();init();
});
/* ---------- boot (handles v6.js having already booted, since both are deferred) ---------- */
function bootExtra(){
  var els=document.querySelectorAll(".v6-widget[data-widget]");
  Array.prototype.forEach.call(els,function(el){
    var n=el.getAttribute("data-widget");
    if(X.names.indexOf(n)<0||el.hasAttribute("data-v6x"))return;
    var cfg={};try{cfg=JSON.parse(el.getAttribute("data-config")||"{}");}catch(e){el.insertAdjacentHTML("beforeend","<div style='color:#9e2b25;font-size:12px'>widget config error</div>");return;}
    try{el.__v6x=1;X.fns[n](el,cfg);}catch(err){el.insertAdjacentHTML("beforeend","<div style='color:#9e2b25;font-size:12px'>widget error: "+n+"</div>");if(window.console)console.error(n,err);}
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootExtra);else bootExtra();
})();
