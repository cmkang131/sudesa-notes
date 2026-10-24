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
  var bias=-3;
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
  var biasCtl;
  var overlapCtl;

  var cv=canvas(el,H);
  var ctx=cv.ctx;
  var out=readout(el);

  thetaCtl=slider(
    bar1,
    "방향 θ (도)",
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

  biasCtl=slider(
    bar1,
    "절편 b",
    [-8,2,-3,0.1],
    function(v){
      bias=clamp(Number(v),-8,2);
      if(!settingControls) drawAll();
    },
    function(v){return fmt(v,1);}
  );

  overlapCtl=slider(
    bar2,
    "겹침 (중심 거리)",
    [0.18,0.55,0.4,0.01],
    function(v){
      overlap=clamp(Number(v),0.18,0.55);
      regenerateData();
      findBestBoundary();
      drawAll();
    },
    function(v){return fmt(v,2);}
  );

  button(bar2,"정확도 최대 경계 찾기",function(){
    if(!bestSearch) return;

    settingControls=true;
    thetaCtl.set(bestSearch.theta);
    magnitudeCtl.set(12);
    biasCtl.set(bestSearch.bias);

    theta=bestSearch.theta;
    magnitude=12;
    bias=bestSearch.bias;

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
    "뉴런 하나의 sigmoid output(시그모이드 출력)은 p=σ(w₁x₁+w₂x₂+b)입니다. p≥0.5이면 클래스 1, 그렇지 않으면 클래스 0으로 분류합니다. MLP(다층 퍼셉트론)는 선형 연산과 activation(활성화 함수)을 반복해 분류 라벨을 냅니다."
  );

  note(
    el,
    "decision boundary(결정 경계)는 p=0.5, 즉 w₁x₁+w₂x₂+b=0인 직선입니다. w는 경계의 법선 방향, |w|는 시그모이드 전이의 가파름, b는 경계 위치를 정합니다. 겹치는 데이터는 직선 하나로 완전히 나누기 어려워 층을 쌓습니다."
  );

  function sigmoid(z){
    if(z>=0){
      var e=Math.exp(-z);
      return 1/(1+e);
    }
    var e2=Math.exp(z);
    return e2/(1+e2);
  }

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
    return sigmoid(w.x*x+w.y*y+b);
  }

  function classify(x,y,angleDeg,mag,b){
    var w=weights(angleDeg,mag);
    return w.x*x+w.y*y+b>=0?1:0;
  }

  function makeBlob(random,cx,cy,n,label){
    var arr=[];
    for(var i=0;i<n;i++){
      var x=clamp(cx+SD*gauss(random),0,1);
      var y=clamp(cy+SD*gauss(random),0,1);
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

    for(var deg=0;deg<=179;deg+=3){
      var w=weights(deg,fixedMag);

      for(var bi=0;bi<=50;bi++){
        var b=-8+bi*0.2;
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
    var target=level-bias;

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
        var p=probability(x,y,theta,magnitude,bias);
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
      var predicted=classify(p.x,p.y,theta,magnitude,bias);
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
      var predicted=classify(p.x,p.y,theta,magnitude,bias);

      if(predicted===p.label){
        correct++;
      }else{
        misclassified++;
      }
    }

    return {
      accuracy:correct/points.length,
      misclassified:misclassified,
      p0:probability(center0.x,center0.y,theta,magnitude,bias),
      p1:probability(center1.x,center1.y,theta,magnitude,bias)
    };
  }

  function teachingSentence(stats){
    if(overlap<=0.30 && bestSearch.accuracy<0.90){
      return "두 클래스가 많이 겹쳐 최선의 직선도 정확도 90%에 못 미칩니다. 뉴런 하나의 직선 경계로는 겹치는 데이터를 완전히 분리할 수 없어 층을 쌓습니다.";
    }

    if(magnitude<4){
      return "|w|가 작으면 시그모이드 전이가 완만합니다. 경계 주변에서 p가 서서히 변해 확률적 판단이 두드러집니다.";
    }

    if(magnitude>=20){
      return "|w|가 크면 시그모이드 출력이 계단 함수에 가까워집니다. p=0.5 경계 근처에서 출력이 급격히 바뀝니다.";
    }

    return "w는 경계의 법선 방향이고 b는 위치를 바꿉니다. |w|를 바꾸면 경계의 방향보다 sigmoid 출력의 전이 가파름이 달라집니다.";
  }

  function updateReadout(){
    var s=currentStats();

    out.innerHTML=
      "<b>정확도</b> <span class=\"r\">"+
      fmt(100*s.accuracy,1)+"%</span> · 오분류 "+
      s.misclassified+"/"+points.length+
      "<br><b>두 클래스 중심의 sigmoid 출력</b> p₀ = "+
      fmt(s.p0,3)+" · p₁ = "+fmt(s.p1,3)+
      " · 최대 탐색 정확도 (|w|=12) "+
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