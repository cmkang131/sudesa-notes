You are writing one production widget for a Korean university course-notes site (MATH432 수리데이터사이언스 / Mathematical Data Science). Output ONLY JavaScript code, no prose, no markdown fences explanation.

## Runtime contract

The site has a widget runtime. Your code must be EXACTLY ONE block:

mount("loss-landscape",function(el,cfg){
  // your code
});

Available helpers already in scope (use them, do not redefine):
- mount(name,fn): registers the widget. cfg may be {}, cfg.title is rendered automatically.
- canvas(el,h) -> {c,ctx,W:720,H:h,clear()}: creates a DPR-scaled canvas, 720 css px wide. clear() fills white.
- ctlBar(el) -> div: control bar container (call once per row).
- slider(bar,label,[min,max,init,step],onInput,fmtFn) -> {get(),set(x)}: labeled range slider with live value.
- button(bar,label,onClick), check(bar,label,init,onChange), select(bar,label,[[value,label],...],init,onChange).
- readout(el) -> div: bottom readout, set .innerHTML (supports <b>, <span class="r"> for red emphasis).
- note(el,html): small caption line.
- frame(ctx,box,xr,yr,opts) -> {px(x),py(y),ix(pixel),iy(pixel),b}: draws axes box+ticks+grid. box={x,y,w,h} in css px. opts={xl,yl,xt,yt,noGrid}.
- clipBox(ctx,box): clips to box (call ctx.restore() after drawing).
- path(ctx,[[x,y],...],{color,w,dash}), curve(ctx,frame,fn,x0,x1,{color,w,n}), seg(ctx,x0,y0,x1,y1,{color,w,dash}), dot(ctx,x,y,r,{color,fill,stroke}), legend(ctx,x,y,[{label,color,dash,w}]), txt(ctx,s,x,y,{size,color,weight,align,base,halo}), arrow(ctx,x0,y0,x1,y1,{color,w}).
- rng(seed) -> function() deterministic PRNG in [0,1); gauss(r) -> standard normal sample.
- rk4(f,y0,t0,t1,dt) -> {t:[...],y:[[...],...]}; sirF(beta,gamma,N) -> f(t,y) for SIR with y=[S,I,R]: dS=-b*S*I/N, dI=b*S*I/N-g*I, dR=g*I.
- fmt(x,d), fmtg(x,d), clamp(x,a,b). Colors: INK="#1a1a1a", RED="#9e2b25", G1,G2 grays, G3=GRID="#e8e6e0".

## Style rules (hard requirements)

- White background only. Ink #1a1a1a for primary, #9e2b25 red as the ONLY accent, grays for grid/secondary. Absolutely no blue, green, pastel, or other hues. Heatmaps must be grayscale (white = high loss, dark ink = low loss).
- Canvas only. No external libraries, no DOM chart libs, no images.
- All UI text in natural Korean, compact and human-written in tone (no AI-ish filler). Technical terms as English(한국어) on first use, e.g. loss landscape(손실 지형).
- Buttons/sliders come from the helpers (already styled). Canvas 720 wide, height 360-420.
- Code must be robust: no crashes on slider extremes; cache expensive computations and only recompute what changed.

## Widget spec: loss-landscape (주제 6: SIR 모수 β,γ를 데이터로 추정)

Course context the widget must teach (source-bounded to the actual lecture): 격자(β,γ 위의 점)마다 SIR을 풀어 궤적을 만들고, 관측과의 제곱오차 손실(squared-error loss)을 최소화하는 (β,γ)가 least squares 해다. 시뮬레이션 궤적의 여러 시점 관측을 써야 한다 — 단일 시점만으로는 모수가 식별(identify)되지 않을 수 있다. 관측 시점이 적으면 손실 지형에 평평한 골짜기가 생긴다.

Units must be real and stated: β,γ in 1/day (β=전염률, γ=회복률, R₀=β/γ), I(t) in people out of N=1000, time in days, loss in people^2. Do not invent a generic measurement model beyond noisy readings of I(t).

Behavior:
1. Hidden ground truth: β*=0.45, γ*=0.14, N=1000, S0=995, I0=5, R0=0, simulate t in [0,60] with rk4 dt=0.1. Observations: noisy readings of I(t) at k equally spaced days starting day 6 (obs = true I * (1 + σ*gauss), clipped at >=0). Seed from rng(seed); "새 데이터" button re-seeds.
2. Left panel: I(t) over time. Draw observations as ink dots, the true curve as ink dashed, and the current candidate (β,γ) curve as red solid. Legend in Korean.
3. Right panel: loss landscape over (β,γ) in [0.15,0.8]x[0.05,0.30]: L(β,γ)=sum over observation times of (I_model(t_i)-I_obs(t_i))^2, computed on a grid (about 56x56, rk4 dt=0.2 is fine, cache it). Render as grayscale heatmap (white high, ink low; use log-scaled loss for dynamic range) plus the candidate as a red dot, the grid minimum as a red ring, and the true (β*,γ*) as an ink hollow square. Redraw heatmap only when data/noise/k changes, not when candidate sliders move.
4. Controls row 1: sliders 후보 β [0.15,0.8,0.3,0.005], 후보 γ [0.05,0.30,0.20,0.005]. Controls row 2: slider 관측 일수 k [3,15,8,1], slider 잡음 σ [0,0.35,0.12,0.01], buttons "격자 최솟값으로 이동" and "새 데이터".
5. Readout (Korean, compact): current candidate loss, grid-min loss and its (β̂,γ̂) and its distance from truth, and one teaching sentence that changes with k: with small k note the flat valley (여러 (β,γ)가 비슷한 손실 → 식별 불가), with large k note the sharp minimum near the truth. Mention R₀=β/γ of candidate vs truth.
End the code with the initial compute+draw call.
