You are writing one production widget for a Korean university course-notes site (MATH432 수리데이터사이언스 / Mathematical Data Science). Output ONLY JavaScript code, no prose, no markdown fences explanation.

## Runtime contract

The site has a widget runtime. Your code must be EXACTLY ONE block:

mount("logistic-boundary",function(el,cfg){
  // your code
});

Available helpers already in scope (use them, do not redefine):
- mount(name,fn): registers the widget. cfg may be {}, cfg.title is rendered automatically.
- canvas(el,h) -> {c,ctx,W:720,H:h,clear()}: DPR-scaled canvas, 720 css px wide. clear() fills white.
- ctlBar(el) -> div control bar (one per row).
- slider(bar,label,[min,max,init,step],onInput,fmtFn) -> {get(),set(x)}.
- button(bar,label,onClick), check(bar,label,init,onChange), select(bar,label,[[value,label],...],init,onChange).
- readout(el) -> div, set .innerHTML (<b> ok, <span class="r"> red).
- note(el,html): small caption.
- frame(ctx,box,xr,yr,opts) -> {px(x),py(y),ix,iy,b}: axes box+ticks+grid. box={x,y,w,h}. opts={xl,yl,xt,yt,noGrid}.
- clipBox(ctx,box) then ctx.restore() after.
- path(ctx,[[x,y],...],{color,w,dash}), seg(ctx,x0,y0,x1,y1,{color,w,dash}), dot(ctx,x,y,r,{color,fill,stroke}), marker(ctx,k,x,y,r,{color,hollow}) with k=0 circle,1 square,2 triangle,3 diamond,4 plus,5 cross, legend(ctx,x,y,[{label,color,dash,w}]), txt(ctx,s,x,y,{size,color,weight,align,base,halo}), arrow(ctx,x0,y0,x1,y1,{color,w}).
- rng(seed) -> deterministic PRNG; gauss(r) -> standard normal. fmt(x,d), fmtg(x,d), clamp(x,a,b). Colors: INK="#1a1a1a", RED="#9e2b25", grays G1,G2, GRID="#e8e6e0".

## Style rules (hard requirements)

- White background. Ink #1a1a1a primary, #9e2b25 red the ONLY accent, grays secondary. No blue/green/pastel hues anywhere. Class-0 points ink, class-1 points red is fine; probability shading must be grayscale.
- Canvas only, no libraries, no images. All UI text natural compact Korean, human tone; technical terms as English(한국어) first use, e.g. decision boundary(결정 경계).
- Controls via helpers. Canvas 720 wide, height ~380.
- Robust at slider extremes; cache what does not change.

## Widget spec: logistic-boundary (주제 8: 뉴런 하나 = 선형 결정 경계)

Naming/labeling constraint: this is a PEDAGOGICAL EXTENSION of the course's actual neural-network content (MLP = 선형 연산자 + activation 반복 → 분류 라벨). The professor did NOT teach logistic regression as a topic. Never use the term "로지스틱 회귀" or claim it was taught; label everything as 뉴런 하나의 결정 경계 / sigmoid 출력.

Course context the widget must teach: MLP는 입력에 선형 연산자와 activation을 반복해 분류 라벨을 낸다. 그 가장 작은 단위인 뉴런 하나는 p=σ(w₁x₁+w₂x₂+b)로, p=0.5인 곳(즉 w·x+b=0)이 선형 결정 경계다. w는 경계의 법선 방향, |w|는 0→1 전이의 가파름(sigmoid의 scaling), b는 경계의 위치. 선형으로 나뉘지 않는(겹치는) 데이터는 뉴런 하나로 분리할 수 없다 → 층을 쌓는 이유.

Behavior:
1. Data: two 2D Gaussian blobs in [0,1]^2, 45 points each, class centers separated by slider 겹침(overlap) (center distance from 0.55 down to 0.18; lower = more overlap). Seed from rng(seed); "새 데이터" re-seeds.
2. Neuron: p=σ(w·x+b) with w=(|w|cosθ, |w|sinθ). Sliders row 1: 방향 θ [0,360,30,1] degrees, 크기 |w| [0.5,30,8,0.5], 절편 b [-8,2,-3,0.1].
3. Main panel: frame [0,1]x[0,1]. Background: grayscale p shading on a coarse grid (about 48x48 cells; white where p near 0 for class-0 side, light gray darkening toward p near 1 — keep subtle, max ~30% ink). Draw the decision boundary w·x+b=0 as a solid ink line, and the p=0.25 / p=0.75 lines dashed gray. Draw a red arrow from a boundary point along w direction (length ∝ 1/|w| clamped) labeled "w". Points: class 0 = ink circles, class 1 = red squares; misclassified points get a bold ring highlight.
4. Buttons row 2: "정확도 최대 경계 찾기" (coarse search over θ in 0..179 and b over a range at fixed |w|=12, pick max accuracy, set sliders), "새 데이터". Second slider row keeps overlap slider 겹침 [0.18,0.55,0.4,0.01].
5. Readout (Korean, compact): 정확도 accuracy %, number misclassified, current p at the two class centers, and one teaching sentence: when overlap is high and accuracy caps below ~90%, note that one neuron draws only a straight boundary so overlapping classes cannot be separated — this is why layers are stacked; when |w| is small note the transition is gradual (확률적 판단), when large it approaches a step.
End the code with the initial compute+draw call.
