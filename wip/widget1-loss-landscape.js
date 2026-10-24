
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
    "잡음 σ",
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
    "β=전염률, γ=회복률(둘 다 1/day), R₀=β/γ입니다. I(t)는 N=1000명 중 감염자 수(명), 시간은 일(day), 손실은 people²(명²)입니다. 관측 시점이 하나뿐이면 두 모수가 식별되지 않을 수 있습니다. 오른쪽은 로그 손실을 명암으로 표시합니다."
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
    candidateLossSol = simulate(candBeta, candGamma, GRID_DT);
    candidateLoss = lossFromSolution(candidateLossSol);

    drawLeft();
    drawRightFromCache();
    updateReadout();
  }

  precomputeGridTrajectories();

  candidateSol = simulate(candBeta, candGamma, 0.1);
  candidateLossSol = simulate(candBeta, candGamma, GRID_DT);

  refreshDataAndGrid();
});
