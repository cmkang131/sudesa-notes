/* v6-extra.js : MATH432 수리데이터사이언스 (sudesa-notes) interactive widget pack
   Requires assets/v6.js (window.V6). Registers widgets with V6.register(name, mountFn(el,cfg)).
   Style: white bg, ink #1a1a1a, red #9e2b25 accent only, grays for secondary. Canvas only, no libraries.
   Every widget: <div class="v6-widget" data-widget="NAME" data-config='{...}'></div>  (config optional) */
(function(){
"use strict";
if(!window.V6){console.warn("v6-extra: V6 runtime missing");return;}
var V6=window.V6, INK="#1a1a1a", RED="#9e2b25", G1="#6b6b6b", G2="#a8a5a0", G3="#d9d6cf", GRID="#ece9e3";
var FONT="'Noto Sans KR',sans-serif";
var DPR=Math.max(1,Math.min(2,window.devicePixelRatio||1));
var X={}; /* pure math, exposed as V6.x for self-checks */
V6.x=X;

/* ---------- css (kept here so only this file is needed) ---------- */
(function(){
  if(document.getElementById("v6x-css"))return;
  var s=document.createElement("style");s.id="v6x-css";
  s.textContent=
  ".v6x-read{margin-top:8px;border-top:1px dashed #1a1a1a;padding-top:7px;font-size:12.5px;line-height:1.65;color:#1a1a1a;font-family:"+FONT+"}"+
  ".v6x-read b{font-weight:700}.v6x-read .r{color:#9e2b25;font-weight:700}.v6x-read .m{color:#6b6b6b}"+
  ".v6x-read table{border-collapse:collapse;margin:2px 0}.v6x-read td,.v6x-read th{border:1px solid #1a1a1a;padding:1px 8px;font-size:12.5px;font-variant-numeric:tabular-nums}"+
  ".v6x-ctl select{font-family:inherit;font-size:12.5px;border:1.2px solid #1a1a1a;border-radius:3px;background:#fff;padding:1px 4px;color:#1a1a1a}"+
  ".v6x-ctl input[type=checkbox]{accent-color:#1a1a1a}"+
  ".v6x-ctl .v6-btn.on{background:#1a1a1a;color:#fff}"+
  ".v6x-ctl label{white-space:nowrap}"+
  ".v6x-cap{font-size:12px;color:#444;margin-top:6px;line-height:1.55}"+
  ".v6x-ctl input[type=range]{width:150px}.v6-widget input[type=range],.v6-widget input[type=checkbox]{accent-color:#1a1a1a!important}.v6-widget{overflow:hidden}";
  document.head.appendChild(s);
})();

/* ---------- helpers ---------- */
function div(el,cls,html){var d=document.createElement("div");if(cls)d.className=cls;if(html!=null)d.innerHTML=html;el.appendChild(d);return d;}
function fmt(x,d){if(!isFinite(x))return "—";var s=x.toFixed(d==null?2:d);return s;}
function fmtg(x,d){ // general: trims trailing zeros
  if(!isFinite(x))return "—";var s=Number(x.toPrecision(d||3)).toString();return s;}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function canvas(el,h){
  var c=document.createElement("canvas");c.width=720*DPR;c.height=h*DPR;
  c.style.width="100%";c.style.height="auto";c.style.maxWidth="100%";
  el.appendChild(c);var ctx=c.getContext("2d");ctx.setTransform(DPR,0,0,DPR,0,0);
  return {c:c,ctx:ctx,W:720,H:h,clear:function(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,720,h);ctx.fillStyle="#fff";ctx.fillRect(0,0,720,h);}};
}
function ctlBar(el){var d=div(el,"v6-controls v6x-ctl");return d;}
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
function txt(ctx,s,x,y,o){o=o||{};ctx.save();ctx.fillStyle=o.color||INK;ctx.font=(o.weight||"400")+" "+(o.size||12)+"px "+FONT;
  ctx.textAlign=o.align||"left";ctx.textBaseline=o.base||"alphabetic";ctx.fillText(s,x,y);ctx.restore();}
function niceTicks(lo,hi,n){
  var span=hi-lo;if(!(span>0))return [lo];var raw=span/(n||5),p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p;
  var st=(f<1.5?1:f<3?2:f<7?5:10)*p,t=[],v=Math.ceil(lo/st-1e-9)*st;
  for(;v<=hi+st*1e-6;v+=st)t.push(Math.abs(v)<st*1e-9?0:v);return t;}
function tickLabel(v){var a=Math.abs(v);if(a>=10000)return (v/1000)+"k";return Number(v.toPrecision(6)).toString();}
/* frame(ctx, box, xr, yr, opts{xl,yl,xt,yt,noGrid,xticks,yticks}) */
function frame(ctx,b,xr,yr,o){
  o=o||{};ctx.save();
  var px=function(x){return b.x+(x-xr[0])/(xr[1]-xr[0])*b.w;},py=function(y){return b.y+b.h-(y-yr[0])/(yr[1]-yr[0])*b.h;};
  var xt=o.xticks||niceTicks(xr[0],xr[1],o.xt||6),yt=o.yticks||niceTicks(yr[0],yr[1],o.yt||5);
  if(!o.noGrid){ctx.strokeStyle=GRID;ctx.lineWidth=1;ctx.beginPath();
    xt.forEach(function(t){var x=Math.round(px(t))+.5;ctx.moveTo(x,b.y);ctx.lineTo(x,b.y+b.h);});
    yt.forEach(function(t){var y=Math.round(py(t))+.5;ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y);});ctx.stroke();}
  ctx.strokeStyle=INK;ctx.lineWidth=1.2;
  if(xr[0]<0&&xr[1]>0){var zx=Math.round(px(0))+.5;ctx.beginPath();ctx.moveTo(zx,b.y);ctx.lineTo(zx,b.y+b.h);ctx.stroke();}
  if(yr[0]<0&&yr[1]>0){var zy=Math.round(py(0))+.5;ctx.beginPath();ctx.moveTo(b.x,zy);ctx.lineTo(b.x+b.w,zy);ctx.stroke();}
  ctx.lineWidth=1.4;ctx.strokeRect(b.x+.5,b.y+.5,b.w,b.h);
  ctx.fillStyle="#333";ctx.font="11px "+FONT;ctx.textAlign="center";ctx.textBaseline="top";
  xt.forEach(function(t){ctx.fillText((o.xf||tickLabel)(t),px(t),b.y+b.h+4);});
  ctx.textAlign="right";ctx.textBaseline="middle";
  yt.forEach(function(t){ctx.fillText((o.yf||tickLabel)(t),b.x-5,py(t));});
  ctx.textBaseline="alphabetic";
  if(o.xl){ctx.textAlign="right";ctx.fillStyle=INK;ctx.font="12px "+FONT;ctx.fillText(o.xl,b.x+b.w,b.y+b.h+28);}
  if(o.yl){ctx.textAlign="left";ctx.fillStyle=INK;ctx.font="12px "+FONT;ctx.fillText(o.yl,b.x,b.y-6);}
  ctx.restore();
  return {px:px,py:py,b:b,ix:function(p){return xr[0]+(p-b.x)/b.w*(xr[1]-xr[0]);},iy:function(p){return yr[0]+(b.y+b.h-p)/b.h*(yr[1]-yr[0]);},xr:xr,yr:yr};
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
function legend(ctx,x,y,items){ // items [{label,color,dash,w}]
  items.forEach(function(it,i){var yy=y+i*16;seg(ctx,x,yy-4,x+22,yy-4,{color:it.color,dash:it.dash,w:it.w||2});
    txt(ctx,it.label,x+28,yy,{size:11.5,color:INK});});}
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
    if(R0>1)seg(ctx,p.px(N/R0),BR.y,p.px(N/R0),BR.y+BR.h,{color:RED,dash:[5,4],w:1.3});
    if(es)path(ctx,es.y.map(function(y){return [p.px(y[0]),p.py(y[1])];}),{color:G1,dash:[2,3],w:2});
    path(ctx,sim.y.map(function(y){return [p.px(y[0]),p.py(y[1])];}),{color:INK,w:2.4});
    ctx.restore();
    if(R0>1)txt(ctx,"S=N/R₀",p.px(N/R0)+4,BR.y+12,{size:11,color:RED});
    dot(ctx,p.px(sim.y[0][0]),p.py(sim.y[0][1]),3.6,{color:INK});
    dot(ctx,p.px(pk.k?sim.y[pk.k][0]:S0),p.py(pk.I),4.5,{fill:false,stroke:RED,w:1.6});
    dot(ctx,p.px(cur[0]),p.py(cur[1]),4.2,{color:RED});
    txt(ctx,"S+I=N (R=0)",p.px(N)-4,p.py(0)-14,{size:10.5,color:G1,align:"right"});
    var Sinf=sirFinal(beta,gamma,N,S0,I0),Im=sirImax(beta,gamma,N,S0,I0);
    ro.innerHTML="<b>R₀ = β/γ = "+fmt(R0,2)+"</b> &nbsp;"+(R0>1?"<span class='r'>R₀>1 : 유행이 커진다 (I가 증가하는 구간이 있다)</span>":"<span class='r'>R₀≤1 : I가 처음부터 줄어든다 (유행 없음)</span>")+
     " &nbsp;<span class='m'>(접촉 간격 1/β = "+fmt(1/beta,1)+"일, 회복 1/γ = "+fmt(1/gamma,1)+"일)</span><br>"+
     "I_max : 수치해 <b>"+fmt(pk.I,2)+"</b> (t="+fmt(pk.t,1)+"일) · 공식 I₀+S₀−(N/R₀)(1+ln(R₀S₀/N)) = <b>"+fmt(Im,2)+"</b> &nbsp;|&nbsp; "+
     "최종 S<sub>∞</sub> : 수치 "+fmt(sim.y[sim.y.length-1][0],2)+" · final-size 방정식 "+fmt(Sinf,2)+" &nbsp;|&nbsp; 피크는 S가 N/R₀ = "+(R0>1?fmt(N/R0,2):"—")+" 일 때";
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
  var prob=select(bar,"문제",[["decay","y′ = −y , y(0)=1"],["grow","y′ = y , y(0)=1"],["sir","SIR의 I(t) (N=40, β=1/3, γ=1/14)"]],cfg.problem||"decay",draw);
  var sh=slider(bar,"Δt",cfg.h_||[0.05,2.2,0.5,0.05],draw,function(v){return fmt(v,2);});
  var ro=readout(el);var BL={x:50,y:28,w:320,h:270},BR={x:432,y:28,w:270,h:270};
  function spec(){var p=prob.get();
    if(p==="decay")return {f:function(t,y){return [-y[0]];},y0:[1],T:5,ex:function(t){return Math.exp(-t);},idx:0,yr:[-1.2,1.4],name:"y(t)"};
    if(p==="grow")return {f:function(t,y){return [y[0]];},y0:[1],T:2,ex:function(t){return Math.exp(t);},idx:0,yr:[0,8],name:"y(t)"};
    var f=sirF(1/3,1/14,40);return {f:f,y0:[39,1,0],T:60,ex:null,idx:1,yr:[0,26],name:"I(t)"};}
  var refCache={};
  function exact(sp,p){ if(sp.ex)return sp.ex; if(!refCache[p]){var r=rk4(sp.f,sp.y0,0,sp.T,0.005);refCache[p]=r;}
    var r2=refCache[p];return function(t){var k=Math.min(r2.y.length-1,Math.round(t/0.005));return r2.y[k][1];};}
  function errAt(sp,ex,method,h){var r=method(sp.f,sp.y0,0,sp.T,h);var y=r.y[r.y.length-1][sp.idx];return Math.abs(y-ex(sp.T));}
  function draw(){
    var p=prob.get(),sp=spec(),ex=exact(sp,p),h=sh.get();
    var n=Math.max(1,Math.round(sp.T/h)),hh=sp.T/n;
    var eu=euler(sp.f,sp.y0,0,sp.T,hh),r3=rk3(sp.f,sp.y0,0,sp.T,hh);
    cv.clear();var m=frame(ctx,BL,[0,sp.T],sp.yr,{xl:"t",yl:sp.name});
    clipBox(ctx,BL);
    curve(ctx,m,ex,0,sp.T,{color:INK,w:2.2,n:400});
    path(ctx,eu.t.map(function(t,i){return [m.px(t),m.py(eu.y[i][sp.idx])];}),{color:RED,w:1.6,dash:[4,3]});
    path(ctx,r3.t.map(function(t,i){return [m.px(t),m.py(r3.y[i][sp.idx])];}),{color:G1,w:1.4});
    ctx.restore();
    eu.t.forEach(function(t,i){dot(ctx,m.px(t),m.py(eu.y[i][sp.idx]),3,{color:RED});});
    r3.t.forEach(function(t,i){var q=m.py(r3.y[i][sp.idx]);if(q>BL.y&&q<BL.y+BL.h)marker(ctx,1,m.px(t),q,2.6,{color:G1});});
    legend(ctx,BL.x+BL.w-150,BL.y+16,[{label:"정확한 해",color:INK},{label:"Euler (●)",color:RED,dash:[4,3]},{label:"RK3 (■)",color:G1}]);
    /* error vs dt (log-log) */
    var hs=[],eE=[],eR=[];for(var k=0;k<=12;k++){var hv=0.5*Math.pow(2,-k/2);hs.push(hv);eE.push(errAt(sp,ex,euler,hv));eR.push(errAt(sp,ex,rk3,hv));}
    var lo=-6,hi=0.4,all=eE.concat(eR).filter(function(v){return v>0;}).map(Math.log10),ylo=Math.max(-13,Math.floor(Math.min.apply(null,all))-1),yhi=Math.ceil(Math.max.apply(null,all))+0.5;
    var xr=[Math.log10(hs[hs.length-1])-0.1,Math.log10(hs[0])+0.1];
    var m2=frame(ctx,BR,xr,[ylo,yhi],{xl:"log₁₀ Δt",yl:"log₁₀ |전역 오차 (t=T)|",xt:4,yt:5});
    clipBox(ctx,BR);
    path(ctx,hs.map(function(v,i){return [m2.px(Math.log10(v)),m2.py(Math.log10(eE[i]))];}),{color:RED,w:2});
    path(ctx,hs.map(function(v,i){return [m2.px(Math.log10(v)),m2.py(Math.log10(Math.max(eR[i],1e-14)))];}),{color:G1,w:2});
    ctx.restore();
    function sl(a,b){var u=Math.log10(a),v=Math.log10(b);return (Math.log10(Math.max(b,1e-14))-Math.log10(a))/1;}
    var i0=2,i1=8,sE=(Math.log10(eE[i1])-Math.log10(eE[i0]))/(Math.log10(hs[i1])-Math.log10(hs[i0]));
    var sR=(Math.log10(Math.max(eR[i1],1e-14))-Math.log10(Math.max(eR[i0],1e-14)))/(Math.log10(hs[i1])-Math.log10(hs[i0]));
    var cx=Math.log10(h);if(cx>=xr[0]&&cx<=xr[1])seg(ctx,m2.px(cx),BR.y,m2.px(cx),BR.y+BR.h,{color:RED,dash:[3,3]});
    txt(ctx,"기울기 ≈ "+fmt(sE,2)+" (Euler, 1차)",BR.x+8,BR.y+BR.h-26,{size:11,color:RED});
    txt(ctx,"기울기 ≈ "+fmt(sR,2)+" (RK3, 3차)",BR.x+8,BR.y+BR.h-10,{size:11,color:G1});
    var eEh=errAt(sp,ex,euler,hh),eRh=errAt(sp,ex,rk3,hh);
    var warn="";if(p==="decay"&&hh>2-1e-9)warn=" <span class='r'>Δt≥2 : |1−Δt|≥1 이라 Euler가 발산한다</span>";else if(p==="decay"&&hh>1)warn=" <span class='r'>Δt&gt;1 : Euler 값이 부호를 바꾸며 진동 (곱해지는 인자 1−Δt &lt; 0)</span>";
    ro.innerHTML="Δt = <b>"+fmt(hh,3)+"</b> ("+n+" 스텝) &nbsp;|&nbsp; t=T 에서 오차 : Euler <b>"+eEh.toExponential(2)+"</b> · RK3 <b>"+eRh.toExponential(2)+"</b>"+warn+"<br>"+
     "RK3 : y⁽¹⁾=yₙ+Δt f(yₙ), y⁽²⁾=¾yₙ+¼(y⁽¹⁾+Δt f(y⁽¹⁾)), yₙ₊₁=⅓yₙ+⅔(y⁽²⁾+Δt f(y⁽²⁾)) (f를 스텝당 3번). Δt를 절반으로 하면 Euler 오차는 ≈½, RK3 오차는 ≈⅛.";
  }
  draw();
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
  var gsel=select(bar,"안쪽 g(x)",[["lin","a·x + b"],["sq","x²"],["sin","sin x"],["abs","|x|"]],cfg.g||"lin",draw);
  var fsel=select(bar,"바깥쪽 f(u)",Object.keys(FNS).map(function(k){return [k,FNS[k].n];}),cfg.f||"relu",draw);
  var sa=slider(bar2,"a",[-3,3,1.5,0.1],draw,function(v){return fmt(v,1);});
  var sb=slider(bar2,"b",[-3,3,-1,0.1],draw,function(v){return fmt(v,1);});
  var sx=slider(bar2,"입력 x",[-3,3,0.8,0.05],draw,function(v){return fmt(v,2);});
  var ro=readout(el);
  var P=[{x:46,y:44,w:186,h:200},{x:276,y:44,w:186,h:200},{x:506,y:44,w:186,h:200}],R=[-3,3];
  function G(x){var t=gsel.get();return t==="lin"?sa.get()*x+sb.get():t==="sq"?x*x-1:t==="sin"?Math.sin(2*x):Math.abs(x)-1;}
  function gname(){var t=gsel.get();return t==="lin"?"g(x)="+fmt(sa.get(),1)+"x"+(sb.get()<0?"−":"+")+fmt(Math.abs(sb.get()),1):t==="sq"?"g(x)=x²−1":t==="sin"?"g(x)=sin 2x":"g(x)=|x|−1";}
  function F(u){return FNS[fsel.get()].f(u);}
  function d(fn,x){var h=1e-5;return (fn(x+h)-fn(x-h))/(2*h);}
  function draw(){
    var x=sx.get(),u=G(x),y=F(u),gf=G(F(x));cv.clear();
    var m1=frame(ctx,P[0],R,R,{xl:"x",xt:4,yt:4}),m2=frame(ctx,P[1],R,R,{xl:"u",xt:4,yt:4}),m3=frame(ctx,P[2],R,R,{xl:"x",xt:4,yt:4});
    txt(ctx,"① g : x → u",P[0].x,P[0].y-18,{size:12,weight:700});txt(ctx,"② f : u → y",P[1].x,P[1].y-18,{size:12,weight:700});txt(ctx,"③ f∘g : x → y = f(g(x))",P[2].x,P[2].y-18,{size:12,weight:700});
    clipBox(ctx,P[0]);curve(ctx,m1,G,-3,3,{color:INK,w:2.2});ctx.restore();
    clipBox(ctx,P[1]);curve(ctx,m2,F,-3,3,{color:INK,w:2.2});ctx.restore();
    clipBox(ctx,P[2]);curve(ctx,m3,function(t){return F(G(t));},-3,3,{color:RED,w:2.6});
    curve(ctx,m3,function(t){return G(F(t));},-3,3,{color:G2,w:1.8,dash:[5,4]});ctx.restore();
    txt(ctx,"점선: g∘f",P[2].x+P[2].w-4,P[2].y+P[2].h-6,{size:11,color:G1,align:"right"});
    // tracers
    var ux=clamp(u,-3,3);
    seg(ctx,m1.px(x),m1.py(0),m1.px(x),m1.py(ux),{color:RED,dash:[3,3]});seg(ctx,m1.px(x),m1.py(ux),P[0].x+P[0].w,m1.py(ux),{color:RED,dash:[3,3]});
    dot(ctx,m1.px(x),m1.py(ux),4.5,{color:RED});
    arrow(ctx,P[0].x+P[0].w+2,m1.py(ux),P[1].x-18,m1.py(ux)<P[1].y?P[1].y+2:Math.min(m1.py(ux),P[1].y+P[1].h),{color:G1,w:1,head:5});
    if(isFinite(y)){seg(ctx,m2.px(ux),m2.py(0),m2.px(ux),m2.py(clamp(y,-3,3)),{color:RED,dash:[3,3]});dot(ctx,m2.px(ux),m2.py(clamp(y,-3,3)),4.5,{color:RED});
      dot(ctx,m3.px(x),m3.py(clamp(y,-3,3)),4.5,{color:RED});seg(ctx,m3.px(x),m3.py(0),m3.px(x),m3.py(clamp(y,-3,3)),{color:RED,dash:[3,3]});}
    else {seg(ctx,m2.px(ux),P[1].y,m2.px(ux),P[1].y+P[1].h,{color:RED,dash:[2,3]});txt(ctx,"f 정의역 밖",m2.px(ux),P[1].y+14,{size:11,color:RED,align:ux>0?"right":"left"});}
    txt(ctx,gname(),P[0].x+4,P[0].y+P[0].h+42,{size:11.5,color:G1});
    var fp=d(F,u),gp=d(G,x),cp=d(function(t){return F(G(t));},x);
    var dom=FNS[fsel.get()].dom;
    ro.innerHTML="x = <b>"+fmt(x,2)+"</b> → u = g(x) = <b>"+fmt(u,3)+"</b> → y = f(u) = <b>"+(isFinite(y)?fmt(y,3):"정의되지 않음")+"</b> &nbsp;|&nbsp; 반대 순서 g(f(x)) = "+(isFinite(gf)?fmt(gf,3):"—")+(isFinite(gf)&&isFinite(y)&&Math.abs(gf-y)>1e-6?" <span class='r'>≠ f(g(x)) : 합성은 순서가 중요</span>":"")+"<br>"+
      (isFinite(y)?"연쇄법칙 (f∘g)′(x) = f′(g(x))·g′(x) = "+fmt(fp,3)+" × "+fmt(gp,3)+" = <b>"+fmt(fp*gp,3)+"</b> (수치 미분 "+fmt(cp,3)+")":"")+
      "<br><span class='m'>f∘g가 정의되려면 g의 치역이 f의 정의역("+dom+") 안에 들어가야 한다. ReLU는 u=0에서 미분 불가(꺾임), 그 외엔 위 식이 성립.</span>";
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
    cv.clear();var yr=act.get()==="sig"?[-4,4]:[-6,6],m=frame(ctx,B,[-3,3],yr,{xl:"x",yl:"y",xt:6,yt:6});
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
  var TG={sin:{n:"sin 2πx",f:function(x){return Math.sin(2*Math.PI*x);},r:[-1.3,1.3]},
          abs:{n:"|x−½|  (꺾인 점)",f:function(x){return Math.abs(x-0.5);},r:[-0.1,0.6]},
          bump:{n:"e^{−40(x−½)²}",f:function(x){return Math.exp(-40*(x-0.5)*(x-0.5));},r:[-0.15,1.2]},
          wig:{n:"x·sin 8x",f:function(x){return x*Math.sin(8*x);},r:[-1,1]}};
  var tg=select(bar,"목표 f",Object.keys(TG).map(function(k){return [k,TG[k].n];}),cfg.target||"sin",draw);
  var md=select(bar,"방식",[["sig","sigmoid : 두 계단의 차 = box"],["relu","ReLU : 꺾은선 (N개)"]],cfg.mode||"sig",draw);
  var sN=slider(bar2,"N (box/조각 수)",[1,40,6,1],draw,function(v){return String(v);});
  var sw=slider(bar2,"log₁₀ w (가파름)",[0.5,3,2,0.05],draw,function(v){return "w="+fmtg(Math.pow(10,v),3);});
  var ro=readout(el),B={x:48,y:26,w:370,h:262},B2={x:470,y:26,w:226,h:262};
  function approx(mode,f,N,w){
    if(mode==="sig"){var c=[];for(var i=0;i<N;i++)c.push(f((i+0.5)/N));
      return function(x){var s=0;for(var i=0;i<N;i++)s+=c[i]*(sigm(w*(x-i/N))-sigm(w*(x-(i+1)/N)));return s;};}
    var kn=[];for(i=0;i<=N;i++)kn.push(f(i/N));
    return function(x){var i=Math.min(N-1,Math.max(0,Math.floor(x*N))),x0=i/N;return kn[i]+(kn[i+1]-kn[i])*(x-x0)*N;};}
  function sup(a,f){var mx=0;for(var i=0;i<=800;i++){var x=i/800,e=Math.abs(f(x)-a(x));if(e>mx)mx=e;}return mx;}
  X.uatApprox=approx;
  function draw(){
    var T=TG[tg.get()],mode=md.get(),N=sN.get(),w=Math.pow(10,sw.get());cv.clear();
    var a=approx(mode,T.f,N,w),err=sup(a,T.f);
    var m=frame(ctx,B,[0,1],T.r,{xl:"x",yl:"y",xt:5,yt:5});clipBox(ctx,B);
    if(mode==="sig"&&N<=10){for(var i=0;i<N;i++){var c=T.f((i+0.5)/N);curve(ctx,m,function(x){return c*(sigm(w*(x-i/N))-sigm(w*(x-(i+1)/N)));},0,1,{color:G3,w:1.2,n:300});} }
    curve(ctx,m,T.f,0,1,{color:INK,w:2.2,n:400});curve(ctx,m,a,0,1,{color:RED,w:2.2,n:700});ctx.restore();
    legend(ctx,B.x+B.w-150,B.y+16,[{label:"목표 f",color:INK},{label:"신경망 y(x)",color:RED}]);
    // error vs N
    var Ns=[],es=[];for(var k=1;k<=40;k++){Ns.push(k);es.push(sup(approx(mode,T.f,k,w),T.f));}
    var lo=Math.log10(Math.max(1e-4,Math.min.apply(null,es)))-0.2,hi=Math.log10(Math.max.apply(null,es))+0.2;
    var m2=frame(ctx,B2,[1,40],[lo,hi],{xl:"N",yl:"log₁₀ max|f−y|",xt:4,yt:5});clipBox(ctx,B2);
    path(ctx,Ns.map(function(n,i){return [m2.px(n),m2.py(Math.log10(Math.max(es[i],1e-4)))];}),{color:INK,w:2});ctx.restore();
    dot(ctx,m2.px(N),m2.py(Math.log10(Math.max(err,1e-4))),4.5,{color:RED});
    ro.innerHTML="sup norm 오차 ‖f−y‖∞ = <b>"+fmt(err,4)+"</b> &nbsp;|&nbsp; "+(mode==="sig"?"neuron "+(2*N)+"개 (box 하나 = 계단 둘의 차)":"ReLU neuron "+N+"개")+"<br>"+
      (mode==="sig"?"box의 높이 = 구간 가운데에서의 f 값 → <b>조각 상수 근사</b>. N이 커질수록(좁은 box) 오차가 줄고, w가 작으면 경계가 뭉개져 오차가 남는다 (w가 N에 비해 충분히 커야 한다). 끝점 x=0,1 에서는 σ=½ 라 값이 어긋난다.":
        "ReLU 꺾은선은 각 꺾임 위치에서 기울기만 바꾼다 → 연속 함수를 이어 붙인 꺾은선으로 근사. 매끈한 f는 N이 2배면 오차가 약 ¼ (오른쪽 그림의 기울기). 꺾인 점이 있는 f도 근사된다 (UAT 가정은 연속뿐).")+
      "<br><span class='m'>UAT는 이런 파라미터가 <b>존재</b>한다고만 말한다. 위는 존재를 보이는 구성이고, 실제 학습으로 찾는 방법은 아니다.</span>";
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
  var sr=slider(bar,"r",cfg.r||[0.5,4,3.2,0.01],draw,function(v){return fmt(v,2);});
  var sx=slider(bar,"x₀",[0.01,0.99,0.2,0.01],draw,function(v){return fmt(v,2);});
  var sn=slider(bar2,"반복 횟수",[1,60,20,1],draw,function(v){return String(v);});
  [["0.5",0.5],["1.5",1.5],["2.8",2.8],["3.2",3.2],["3.5",3.5],["3.8",3.8]].forEach(function(q){button(bar2,"r="+q[0],function(){sr.set(q[1]);draw();});});
  var ro=readout(el),BL={x:44,y:24,w:270,h:270},BR={x:372,y:24,w:326,h:270};
  function draw(){
    var r=sr.get(),x0=sx.get(),n=sn.get(),f=lmap(r);cv.clear();
    var m=frame(ctx,BL,[0,1],[0,1],{xl:"x",yl:"y",xt:5,yt:5});clipBox(ctx,BL);
    curve(ctx,m,f,0,1,{color:INK,w:2.2});seg(ctx,m.px(0),m.py(0),m.px(1),m.py(1),{color:G1,w:1.4,dash:[5,4]});
    var x=x0,pts=[[m.px(x),m.py(0)]],xs=[x];
    for(var i=0;i<n;i++){var y=f(x);pts.push([m.px(x),m.py(y)]);pts.push([m.px(y),m.py(y)]);x=y;xs.push(x);}
    path(ctx,pts,{color:RED,w:1.5});ctx.restore();
    txt(ctx,"y=rx(1−x)",m.px(0.55),m.py(Math.min(0.98,r/4))-5,{size:11});txt(ctx,"y=x",m.px(0.9),m.py(0.9)+16,{size:11,color:G1});
    var xf=r>1?1-1/r:0;dot(ctx,m.px(xf),m.py(xf),4.6,{fill:false,stroke:RED,w:1.8});dot(ctx,m.px(x0),m.py(0),3.6,{color:INK});
    // time series
    var ser=[],xx=x0;for(i=0;i<=60;i++){ser.push(xx);xx=f(xx);}
    var m2=frame(ctx,BR,[0,60],[0,1],{xl:"n",yl:"xₙ",xt:6,yt:5});clipBox(ctx,BR);
    path(ctx,ser.map(function(v,i){return [m2.px(i),m2.py(v)];}),{color:G2,w:1.2});ctx.restore();
    ser.forEach(function(v,i){dot(ctx,m2.px(i),m2.py(v),i<=n?3.2:2.2,{color:i<=n?RED:G2});});
    if(r>1)seg(ctx,BR.x,m2.py(xf),BR.x+BR.w,m2.py(xf),{color:RED,dash:[4,4],w:1});
    var at=attractor(r,x0,2000,64),res;
    if(r<=1)res="x<sub>n</sub> → 0 (고정점 0이 안정)";
    else if(at.period===1)res="한 점으로 수렴 : x* = 1−1/r = "+fmt(xf,4)+(r<=2?" (단조)":" (위아래로 흔들리며)");
    else if(at.period>1)res="<span class='r'>"+at.period+"주기</span> : "+at.orbit.map(function(v){return fmt(v,4);}).join(" ↔ ");
    else res=at.lyap>0?"<span class='r'>카오스</span> (주기 없음, Lyapunov λ="+fmt(at.lyap,3)+">0)":"주기가 64보다 길거나 수렴이 매우 느림";
    ro.innerHTML="r = <b>"+fmt(r,2)+"</b> : "+res+"<br>고정점 x=0, "+(r>1?"x*=1−1/r=<b>"+fmt(xf,4)+"</b> &nbsp;·&nbsp; f′(x*) = r(1−2x*) = 2−r = <b>"+fmt(2-r,3)+"</b> → |f′(x*)|"+(Math.abs(2-r)<1?" &lt; 1 : <b>안정</b> (끌려 들어옴)":" &gt; 1 : <b>불안정</b> (밀려남)"):"f′(0)=r="+fmt(r,2)+" &lt; 1 → 0이 안정")+
      " &nbsp;|&nbsp; Lyapunov 지수 λ = 평균 ln|r(1−2xₙ)| = "+fmt(at.lyap,3)+(at.lyap>0?" (&gt;0 : 초기값에 민감)":" (&lt;0 : 안정)")+"<br><span class='m'>붉은 선=cobweb: 포물선까지 수직 → 대각선까지 수평을 반복. 붉은 빈 원=고정점(교점). r≤4 라야 [0,1]에 머문다.</span>";
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
    var at=attractor(r,0.3,3000,64);at.orbit.forEach(function(v){dot(ctx,m.px(r),m.py(v),3.2,{color:RED});});
    ro.innerHTML="r = <b>"+fmt(r,3)+"</b> : "+(at.period>0?"<span class='r'>"+at.period+"주기</span> ("+at.orbit.slice(0,8).map(function(v){return fmt(v,4);}).join(", ")+(at.orbit.length>=8&&at.period>8?" …":"")+")":(at.lyap>0?"<span class='r'>카오스</span> (λ="+fmt(at.lyap,3)+")":"긴 주기/느린 수렴"))+
      " &nbsp;|&nbsp; Lyapunov λ = "+fmt(at.lyap,3)+"<br>각 r마다 x₀=0.5에서 시작해 앞쪽 "+tr.get()+"번을 버리고 그 뒤 130개를 찍은 것. 점 1개 → 2개 → 4개 …로 갈라지는 <b>period doubling</b>이 쌓여 카오스(띠)가 되고, 그 안에 주기 3 같은 창이 다시 나타난다. 붉은 점 = 선택한 r의 장기 거동.";
  }
  render();
});

/* 고정점 반복과 Banach 수축 (주제 6) */
mount("banach",function(el,cfg){
  var cv=canvas(el,cfg.h||350),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var G={lin:{n:"g(x) = a·x + 1",view:[-1,6],yv:[-1,6]},cos:{n:"g(x) = cos x",view:[0,1.2],yv:[0,1.2]},newton:{n:"g(x) = (x + 2/x)/2  (√2)",view:[0.5,2.5],yv:[0.5,2.5]}};
  var gs=select(bar,"함수",Object.keys(G).map(function(k){return [k,G[k].n];}),cfg.g||"lin",function(){setup();draw();});
  var sa=slider(bar,"a (선형일 때)",[-1.6,1.6,0.6,0.05],draw,function(v){return fmt(v,2);});
  var sx=slider(bar2,"x₀",[0,1,0.5,0.01],draw,function(v){return fmt(v,2);});
  var sn=slider(bar2,"반복 n",[1,25,6,1],draw,function(v){return String(v);});
  var ro=readout(el),BL={x:44,y:24,w:290,h:270},BR={x:396,y:24,w:302,h:270};
  function gfun(){var k=gs.get(),a=sa.get();return k==="lin"?function(x){return a*x+1;}:k==="cos"?Math.cos:function(x){return (x+2/x)/2;};}
  function info(){var k=gs.get(),a=sa.get();
    if(k==="lin")return {xs:Math.abs(a-1)<1e-9?NaN:1/(1-a),L:Math.abs(a),dom:[-1e9,1e9]};
    if(k==="cos"){var x=1;for(var i=0;i<400;i++)x=Math.cos(x);return {xs:x,L:Math.sin(1),dom:[0,1]};}
    return {xs:Math.SQRT2,L:0.5,dom:[1,2]};}
  function setup(){var v=G[gs.get()].view;sx.el.min=v[0];sx.el.max=v[1];sx.el.step=0.01;var d={lin:0.5,cos:0.2,newton:1.9}[gs.get()];sx.set(d);}
  function draw(){
    var k=gs.get(),g=gfun(),inf=info(),v=G[k].view,yv=G[k].yv,x0=sx.get(),n=sn.get();cv.clear();
    var m=frame(ctx,BL,v,yv,{xl:"x",yl:"y",xt:5,yt:5});clipBox(ctx,BL);
    curve(ctx,m,g,v[0],v[1],{color:INK,w:2.2});seg(ctx,m.px(v[0]),m.py(v[0]),m.px(v[1]),m.py(v[1]),{color:G1,dash:[5,4],w:1.4});
    var x=x0,pts=[[m.px(x),m.py(x)]],xs=[x0];
    for(var i=0;i<n;i++){var y=g(x);pts.push([m.px(x),m.py(y)]);pts.push([m.px(y),m.py(y)]);x=y;xs.push(x);}
    path(ctx,pts,{color:RED,w:1.5});ctx.restore();
    if(isFinite(inf.xs))dot(ctx,m.px(inf.xs),m.py(inf.xs),4.6,{fill:false,stroke:RED,w:1.8});
    dot(ctx,m.px(x0),m.py(x0),3.6,{color:INK});
    // errors
    var N=25,ser=[],xx=x0;for(i=0;i<=N;i++){ser.push(Math.abs(xx-inf.xs));xx=g(xx);}
    var contr=inf.L<1&&x0>=inf.dom[0]&&x0<=inf.dom[1];
    var bound=null;if(contr){bound=[];var d01=Math.abs(g(x0)-x0);for(i=0;i<=N;i++)bound.push(Math.pow(inf.L,i)*d01/(1-inf.L));}
    var lg=function(e){return Math.log10(Math.max(e,1e-16));},all=ser.map(lg);
    var ylo=-16,yhi=Math.min(8,Math.max(0.5,Math.ceil(Math.max.apply(null,all))+0.3));
    var m2=frame(ctx,BR,[0,N],[ylo,yhi],{xl:"n",yl:"log₁₀ |xₙ − x*|",xt:5,yt:5});clipBox(ctx,BR);
    if(bound)path(ctx,bound.map(function(e,i){return [m2.px(i),m2.py(lg(e))];}),{color:G1,w:1.6,dash:[6,4]});
    path(ctx,ser.map(function(e,i){return [m2.px(i),m2.py(lg(e))];}),{color:RED,w:2});ctx.restore();
    ser.forEach(function(e,i){dot(ctx,m2.px(i),m2.py(lg(e)),i<=n?3.2:2,{color:i<=n?RED:G2});});
    var st;
    if(k==="lin"){var a=sa.get();st=Math.abs(a)<1?"|a|="+fmt(Math.abs(a),2)+" &lt; 1 : <b>수축</b> (L=|a|). 오차가 매 스텝 |a|배 → 직선(로그축)":"|a|="+fmt(Math.abs(a),2)+" ≥ 1 : 수축 아님 → <span class='r'>반복이 x*로 안 간다</span>"+(a<0?" (a&lt;0 : 부호를 바꾸며 진동)":"");}
    else if(k==="cos")st="구간 [0,1]에서 L = max|g′| = sin 1 ≈ 0.841 &lt; 1, g([0,1])=[cos 1, 1] ⊂ [0,1] → Banach 조건 만족";
    else st="구간 [1,2]에서 |g′(x)| = |½−1/x²| ≤ ½ = L, g([1,2]) = [1.414, 1.5] ⊂ [1,2]. 실제 수렴은 L=½보다 훨씬 빠르다 (오차가 제곱으로 준다).";
    ro.innerHTML="x<sub>"+n+"</sub> = <b>"+fmt(xs[n],6)+"</b> , 고정점 x* = "+(isFinite(inf.xs)?fmt(inf.xs,6):"없음")+" , 오차 |x<sub>"+n+"</sub>−x*| = <b>"+(ser[n]).toExponential(2)+"</b><br>"+st+
      (bound?"<br>점선 = 사전 오차 한계 Lⁿ/(1−L)·|x₁−x₀| (실제 오차는 항상 그 아래).":"")+"<br><span class='m'>붉은 선 = cobweb. 고정점 Thm: g가 구간을 자기 자신으로 보내고 L&lt;1 이면 고정점이 유일하고 반복이 그리로 수렴한다.</span>";
  }
  setup();draw();
});

/* Lipschitz 연속 (주제 2) */
mount("lipschitz",function(el,cfg){
  var cv=canvas(el,cfg.h||340),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el);
  var F={abs:{n:"|x|",f:Math.abs,d:[-2,2],yr:[-0.5,2.5]},sq:{n:"x²",f:function(x){return x*x;},d:[-2,2],yr:[-0.5,4.5]},
    sqrt:{n:"√x",f:function(x){return x<0?NaN:Math.sqrt(x);},d:[0,1],yr:[-0.2,1.4]},sin:{n:"sin x",f:Math.sin,d:[-3,3],yr:[-1.6,1.6]},
    cbrt:{n:"x^(1/3)",f:function(x){return x<0?-Math.pow(-x,1/3):Math.pow(x,1/3);},d:[-1,1],yr:[-1.4,1.4]}};
  var fs=select(bar,"함수 f",Object.keys(F).map(function(k){return [k,F[k].n];}),cfg.f||"sq",function(){setup();draw();});
  var slo=slider(bar,"구간 왼쪽 끝",[-3,2,-2,0.05],draw,function(v){return fmt(v,2);});
  var shi=slider(bar,"오른쪽 끝",[-2,3,2,0.05],draw,function(v){return fmt(v,2);});
  var sx=slider(bar2,"원뿔 중심 x₀",[-2,2,0.5,0.05],draw,function(v){return fmt(v,2);});
  var ro=readout(el),B={x:50,y:24,w:640,h:260};
  function setup(){var d=F[fs.get()].d;slo.el.min=Math.min(d[0],0)-1;slo.el.max=d[1]-0.1;shi.el.min=d[0]+0.1;shi.el.max=d[1]+1;slo.set(d[0]);shi.set(d[1]);sx.el.min=d[0];sx.el.max=d[1];sx.set((d[0]+d[1])/2+(d[1]-d[0])*0.2);}
  function Lest(f,a,b,n){var best=0,bi=0,h=(b-a)/n;for(var i=0;i<n;i++){var s=Math.abs((f(a+(i+1)*h)-f(a+i*h))/h);if(s>best){best=s;bi=i;}}return {L:best,x:a+bi*h,h:h};}
  X.lipEst=Lest;
  function draw(){
    var k=fs.get(),f=F[k].f,a=slo.get(),b=shi.get();if(b<=a+0.05)b=a+0.05;var x0=clamp(sx.get(),a,b);cv.clear();
    var xr=[Math.min(F[k].d[0],a)-0.3,Math.max(F[k].d[1],b)+0.3],m=frame(ctx,B,xr,F[k].yr,{xl:"x",yl:"y",xt:8,yt:5});
    var e1=Lest(f,a,b,200),e2=Lest(f,a,b,2000),L=e1.L,y0=f(x0),bad=0;
    clipBox(ctx,B);
    // cone
    ctx.save();ctx.beginPath();ctx.moveTo(m.px(a),m.py(y0+L*(a-x0)));ctx.lineTo(m.px(b),m.py(y0+L*(b-x0)));ctx.lineTo(m.px(b),m.py(y0-L*(b-x0)));ctx.lineTo(m.px(a),m.py(y0-L*(a-x0)));ctx.closePath();
    ctx.fillStyle="rgba(158,43,37,0.07)";ctx.fill();ctx.restore();
    seg(ctx,m.px(a),m.py(y0+L*(a-x0)),m.px(b),m.py(y0+L*(b-x0)),{color:RED,w:1.2,dash:[5,4]});seg(ctx,m.px(a),m.py(y0-L*(a-x0)),m.px(b),m.py(y0-L*(b-x0)),{color:RED,w:1.2,dash:[5,4]});
    ctx.restore();
    // graph on [a,b] thick, outside faint
    clipBox(ctx,B);curve(ctx,m,f,xr[0],xr[1],{color:G3,w:1.8,n:500});curve(ctx,m,f,a,b,{color:INK,w:2.6,n:500});ctx.restore();
    for(var i=0;i<=1000;i++){var x=a+(b-a)*i/1000,y=f(x);if(isFinite(y)&&Math.abs(y-y0)>Math.abs(L*(x-x0))+1e-9){bad++;dot(ctx,m.px(x),m.py(y),1.6,{color:RED});}}
    seg(ctx,m.px(a),B.y+B.h-4,m.px(b),B.y+B.h-4,{color:INK,w:3});
    dot(ctx,m.px(x0),m.py(y0),4.5,{color:RED});
    var ratio=e2.L/e1.L,unb=ratio>1.8&&e2.L>15;
    var known={abs:"L=1",sq:"L=2·max|x|="+fmt(2*Math.max(Math.abs(a),Math.abs(b)),2),sin:"L=1",sqrt:a>0?"L=1/(2√"+fmt(a,2)+")="+fmt(1/(2*Math.sqrt(a)),2):"유계 아님 (a=0)",cbrt:a<=0&&b>=0?"유계 아님 (x=0 근처)":"유한"}[k];
    ro.innerHTML="구간 [a,b]=["+fmt(a,2)+", "+fmt(b,2)+"] 에서 기울기의 최댓값 (격자 200칸) <b>L ≈ "+fmt(e1.L,2)+"</b> (x≈"+fmt(e1.x,2)+"), 격자 2000칸 → "+fmt(e2.L,2)+" &nbsp;|&nbsp; 이론 : "+known+"<br>"+
      (unb?"<span class='r'>격자를 촘촘히 할수록 L이 계속 커진다 → 이 구간에서 f는 Lipschitz가 아니다</span> (|f(x)−f(y)| ≤ L|x−y| 를 만족하는 상수 L이 없음).":"격자를 10배 촘촘히 해도 L이 거의 그대로 → Lipschitz 상수가 존재.")+
      "<br>붉은 점선 원뿔 : |f(x)−f(x₀)| ≤ L|x−x₀| 가 허용하는 영역. 그래프가 원뿔 안에 있으면 OK, 밖으로 나가는 점은 붉게 표시"+(bad?" → <b>현재 원뿔 밖 점 "+bad+"개</b> (L 추정이 부족).":" (현재 모두 안쪽).");
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
  return {V:V,V1:V1,V2:V2,V12:V12,S1:V1/V,S2:V2/V,S12:V12/V,ST1:(V1+V12)/V,ST2:(V2+V12)/V,f0:a/2+b/2+c/4};}
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
  var cv=canvas(el,cfg.h||340),ctx=cv.ctx,bar=ctlBar(el),bar2=ctlBar(el),mc=null,seed=5;
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
    ro.innerHTML="Var(f) = "+fmt(E.V1*144,3)+"/144 + "+fmt(E.V2*144,3)+"/144 + "+fmt(E.V12*144,3)+"/144 = <b>"+fmt(E.V,4)+"</b> &nbsp;(Var f_β=(a+c/2)²/12, Var f_γ=(b+c/2)²/12, Var f_βγ=c²/144) &nbsp;|&nbsp; f₀=E[f]="+fmt(E.f0,3)+"<br>"+
      "<b>S_β+S_γ+S_βγ = "+fmt(E.S1+E.S2+E.S12,3)+"</b> (항상 1) · S_β="+fmt(E.S1,3)+", S_γ="+fmt(E.S2,3)+", S_βγ="+fmt(E.S12,3)+" · ST_β=S_β+S_βγ="+fmt(E.ST1,3)+", ST_γ="+fmt(E.ST2,3)+" (합이 1을 넘을 수 있다)<br>"+
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
    var xr=[0,Math.max(1,Math.ceil(r.beta*1.6*10)/10+0.2)],yr=[-0.1,Math.max(0.5,Math.ceil(r.gamma*1.8*10)/10+0.2)];
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
  button(bar2,"수렴까지",function(){var g=0;while(g++<60){var before=A.join(",");step();step();if(A.join(",")===before&&phase==="assign")break;}draw();});
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
