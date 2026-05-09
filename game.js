(() => {
  "use strict";

  const W = 800;
  const H = 240;
  const GROUND_Y = 198;

  const DINO_C = {
    body:   "#4ecf7a",
    bodyDk: "#3aa05f",
    belly:  "#bdebc3",
    spike:  "#2c8a52",
    eye:    "#ffffff",
    pupil:  "#0e1219",
    mouth:  "#0e1219",
    tongue: "#ff5e7a",
    claws:  "#ffd24d",
  };
  const BIRD_C = {
    body:   "#7c8cff",
    wing:   "#5867d6",
    wingHi: "#a4afff",
    beak:   "#ffb84d",
    eye:    "#0e1219",
  };
  const CACTUS_C = {
    main:   "#3aa15a",
    shade:  "#1f6e3a",
    spine:  "#7fd193",
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const overlay = document.getElementById("overlay");
  const subtitle = document.getElementById("subtitle");
  const primaryBtn = document.getElementById("primary-btn");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const btnSound = document.getElementById("btn-sound");
  const btnPause = document.getElementById("btn-pause");
  const btnReset = document.getElementById("btn-reset");
  const btnJump = document.getElementById("btn-jump");
  const btnDuck = document.getElementById("btn-duck");

  const STORE = {
    best: "dinorunner.best",
    sound: "dinorunner.sound",
  };

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function readBest() {
    const v = parseInt(localStorage.getItem(STORE.best) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  }
  function writeBest(v) {
    try { localStorage.setItem(STORE.best, String(v)); } catch (_) {}
  }
  function readSound() {
    const v = localStorage.getItem(STORE.sound);
    return v === null ? true : v === "1";
  }
  function writeSound(on) {
    try { localStorage.setItem(STORE.sound, on ? "1" : "0"); } catch (_) {}
  }

  function pad(n) { return String(Math.floor(n)).padStart(5, "0"); }

  let DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  function fitCanvas() {
    DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * DPR);
    canvas.height = Math.floor(cssH * DPR);
  }
  window.addEventListener("resize", fitCanvas, { passive: true });

  function palette() {
    const dark = prefersDark.matches;
    if (game && game.night) {
      return {
        sky:       dark ? "#05080f" : "#0d1320",
        skyTop:    dark ? "#0a1226" : "#0e1830",
        ground:    "#cdd2db",
        groundDot: "#5b6478",
        fg:        "#f1f3f7",
        cloud:     "#1c2230",
        star:      "#fff8b0",
        moon:      "#fff2c0",
      };
    }
    return {
      sky:       dark ? "#0f1320" : "#eaf3ff",
      skyTop:    dark ? "#1a2240" : "#cfe5ff",
      ground:    dark ? "#1f2330" : "#3a3f4b",
      groundDot: dark ? "#3a4055" : "#9aa3b2",
      fg:        dark ? "#e9ecf1" : "#2b2b2b",
      cloud:     dark ? "#3a4055" : "#dde6f4",
      star:      "#fff8b0",
      moon:      "#fff2c0",
    };
  }

  let audioCtx = null;
  function audio() {
    if (!game.soundOn) return null;
    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function beep(freq, dur, type = "square", vol = 0.06) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  const sfx = {
    jump: () => beep(660, 0.12, "square", 0.05),
    point: () => { beep(880, 0.08, "triangle", 0.05); setTimeout(() => beep(1320, 0.10, "triangle", 0.05), 90); },
    hit:  () => { beep(180, 0.18, "sawtooth", 0.08); setTimeout(() => beep(110, 0.22, "sawtooth", 0.08), 80); },
    duck: () => beep(330, 0.05, "square", 0.04),
  };

  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawDino(d) {
    const x = d.x, y = d.y;
    if (d.dead) { drawDinoStanding(x, y, 0); drawDinoDeadEye(x, y); return; }
    if (d.ducking && !d.jumping) { drawDinoDucking(x, y, d.frame); return; }
    if (d.jumping) { drawDinoStanding(x, y, "jump"); return; }
    drawDinoStanding(x, y, d.frame === 0 ? "run1" : "run2");
  }

  function drawDinoStanding(x, y, pose) {
    const C = DINO_C;
    rect(x + 0,  y + 18, 6,  6,  C.body);
    rect(x + 4,  y + 22, 10, 10, C.body);
    rect(x + 6,  y + 16, 4,  4,  C.bodyDk);
    rect(x + 24, y + 0,  3,  2,  C.spike);
    rect(x + 30, y + 0,  3,  2,  C.spike);
    rect(x + 36, y + 0,  3,  2,  C.spike);
    rect(x + 22, y + 2,  18, 16, C.body);
    rect(x + 40, y + 6,  3,  3,  C.body);
    rect(x + 33, y + 8,  4,  4,  C.eye);
    rect(x + 34, y + 9,  2,  2,  C.pupil);
    rect(x + 30, y + 14, 8,  3,  C.mouth);
    if (pose === "run1") rect(x + 35, y + 15, 2, 1, C.tongue);
    rect(x + 12, y + 18, 28, 14, C.body);
    rect(x + 14, y + 16, 10, 4,  C.bodyDk);
    rect(x + 40, y + 16, 4,  6,  C.body);
    rect(x + 26, y + 22, 4,  6,  C.body);
    rect(x + 28, y + 26, 3,  2,  C.claws);
    rect(x + 12, y + 28, 26, 5,  C.belly);
    rect(x + 8,  y + 26, 6,  6,  C.belly);
    rect(x + 16, y + 32, 6,  12, C.body);
    rect(x + 26, y + 32, 6,  12, C.body);
    rect(x + 16, y + 36, 1,  6,  C.bodyDk);
    rect(x + 26, y + 36, 1,  6,  C.bodyDk);

    if (pose === "run1") {
      rect(x + 14, y + 44, 9, 3, C.claws);
      rect(x + 28, y + 42, 5, 2, C.bodyDk);
    } else if (pose === "run2") {
      rect(x + 14, y + 42, 5, 2, C.bodyDk);
      rect(x + 25, y + 44, 9, 3, C.claws);
    } else if (pose === "jump") {
      rect(x + 14, y + 44, 8, 3, C.claws);
      rect(x + 26, y + 44, 8, 3, C.claws);
    } else {
      rect(x + 14, y + 44, 8, 3, C.claws);
      rect(x + 26, y + 44, 8, 3, C.claws);
    }
  }

  function drawDinoDeadEye(x, y) {
    const C = DINO_C;
    rect(x + 33, y + 8, 4, 4, C.eye);
    rect(x + 33, y + 8, 1, 1, C.pupil);
    rect(x + 36, y + 8, 1, 1, C.pupil);
    rect(x + 34, y + 9, 2, 2, C.pupil);
    rect(x + 33, y + 11, 1, 1, C.pupil);
    rect(x + 36, y + 11, 1, 1, C.pupil);
  }

  function drawDinoDucking(x, y, frame) {
    const C = DINO_C;
    rect(x + 0,  y + 22, 8,  10, C.body);
    rect(x + 6,  y + 20, 30, 14, C.body);
    rect(x + 12, y + 18, 4,  2,  C.spike);
    rect(x + 18, y + 18, 4,  2,  C.spike);
    rect(x + 24, y + 18, 4,  2,  C.spike);
    rect(x + 30, y + 16, 22, 14, C.body);
    rect(x + 50, y + 18, 4,  10, C.body);
    rect(x + 32, y + 14, 2,  2,  C.spike);
    rect(x + 38, y + 14, 2,  2,  C.spike);
    rect(x + 44, y + 14, 2,  2,  C.spike);
    rect(x + 8,  y + 28, 26, 4,  C.belly);
    rect(x + 44, y + 22, 4,  3,  C.eye);
    rect(x + 45, y + 22, 2,  2,  C.pupil);
    rect(x + 46, y + 26, 6,  2,  C.mouth);
    if (frame === 0) {
      rect(x + 18, y + 34, 5, 8, C.body);
      rect(x + 18, y + 41, 6, 2, C.claws);
      rect(x + 30, y + 34, 5, 6, C.body);
      rect(x + 30, y + 39, 6, 2, C.claws);
    } else {
      rect(x + 18, y + 34, 5, 6, C.body);
      rect(x + 18, y + 39, 6, 2, C.claws);
      rect(x + 30, y + 34, 5, 8, C.body);
      rect(x + 30, y + 41, 6, 2, C.claws);
    }
  }

  function drawCactus(o) {
    const C = CACTUS_C;
    for (const part of o.parts) {
      const px = o.x + part.dx;
      const py = GROUND_Y - part.h - part.dy;
      rect(px, py, part.w, part.h, C.main);
      rect(px + part.w - 2, py + 2, 2, part.h - 2, C.shade);
      rect(px - 3, py + part.h * 0.25, 3, part.h * 0.4, C.main);
      rect(px - 3 + 1, py + part.h * 0.25 + 2, 2, part.h * 0.35, C.shade);
      rect(px + part.w, py + part.h * 0.45, 3, part.h * 0.4, C.main);
      rect(px + part.w + 1, py + part.h * 0.45 + 2, 2, part.h * 0.32, C.shade);
      rect(px + 1, py + 2, 1, 2, C.spine);
      rect(px + 1, py + Math.floor(part.h * 0.4), 1, 2, C.spine);
      rect(px + part.w - 1, py + Math.floor(part.h * 0.6), 1, 2, C.spine);
    }
  }

  function drawBird(o) {
    const C = BIRD_C;
    const x = o.x, y = o.y;
    rect(x + 18, y + 6, 16, 8, C.body);
    rect(x + 30, y + 4, 8,  4, C.body);
    rect(x + 36, y + 6, 4,  2, C.beak);
    rect(x + 33, y + 5, 1,  1, C.eye);
    rect(x + 22, y + 12, 4, 2, C.body);
    if (o.frame === 0) {
      rect(x + 6,  y - 4, 18, 4, C.wing);
      rect(x + 0,  y - 6, 10, 4, C.wing);
      rect(x + 8,  y - 3, 14, 1, C.wingHi);
    } else {
      rect(x + 6,  y + 14, 18, 4, C.wing);
      rect(x + 0,  y + 16, 10, 4, C.wing);
      rect(x + 8,  y + 15, 14, 1, C.wingHi);
    }
  }

  function drawCloud(c, p) {
    const col = p.cloud;
    rect(c.x + 6,  c.y + 4, 26, 6, col);
    rect(c.x + 0,  c.y + 6, 38, 4, col);
    rect(c.x + 4,  c.y + 0, 18, 4, col);
    rect(c.x + 14, c.y - 2, 10, 4, col);
  }

  function drawGround(g, p) {
    const lineY = GROUND_Y;
    rect(0, lineY, W, 1, p.ground);
    ctx.fillStyle = p.groundDot;
    for (let i = 0; i < g.dots.length; i++) {
      const d = g.dots[i];
      ctx.fillRect(Math.round(d.x), Math.round(lineY + 3 + (d.s ? 0 : 2)), d.s ? 2 : 1, 1);
    }
  }

  function drawStars(stars, p) {
    if (!game.night) return;
    ctx.fillStyle = p.star;
    for (const s of stars) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
  }

  function drawMoon(m, p) {
    if (!game.night) return;
    const x = m.x, y = m.y;
    ctx.fillStyle = p.moon;
    const r = 14;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette().sky;
    ctx.beginPath();
    ctx.arc(x - 5, y - 2, r - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const game = {
    state: "ready",
    speed: 6.0,
    speedMax: 13.0,
    speedAccel: 0.0009,
    score: 0,
    best: readBest(),
    distance: 0,
    lastMilestone: 0,
    night: false,
    soundOn: readSound(),
    dino: null,
    obstacles: [],
    clouds: [],
    stars: [],
    ground: { dots: [] },
    moon: { x: -100, y: 50 },
    last: 0,
    accumulator: 0,
    frameStep: 1000 / 60,
    spawnTimer: 0,
    nextSpawnIn: 1200,
    duckHeld: false,
    jumpQueued: false,
    paused: false,
    flashAlpha: 0,
    particles: [],
    dustTimer: 0,
    shake: 0,
  };

  function spawnDust(x, y) {
    if (game.particles.length > 60) return;
    game.particles.push({
      type: "dust",
      x, y,
      vx: -1.4 - Math.random() * 0.6,
      vy: -0.3 - Math.random() * 0.4,
      life: 0,
      maxLife: 420 + Math.random() * 120,
      size: 2 + (Math.random() < 0.4 ? 1 : 0),
    });
  }
  function spawnPopup(x, y, text) {
    game.particles.push({
      type: "popup",
      x, y,
      vy: -0.55,
      life: 0,
      maxLife: 900,
      text,
    });
  }

  function makeDino() {
    return {
      x: 40,
      y: GROUND_Y - 47,
      vy: 0,
      jumping: false,
      ducking: false,
      dead: false,
      frame: 0,
      tFrame: 0,
      h: 47,
      w: 44,
      duckW: 54,
      duckH: 30,
    };
  }

  function reset() {
    game.speed = 6.0;
    game.score = 0;
    game.distance = 0;
    game.lastMilestone = 0;
    game.night = false;
    game.dino = makeDino();
    game.obstacles = [];
    game.clouds = [];
    game.stars = makeStars();
    game.ground.dots = makeDots();
    game.moon = { x: -200, y: 50, phase: Math.floor(Math.random() * 4) };
    game.spawnTimer = 0;
    game.nextSpawnIn = 1400;
    game.flashAlpha = 0;
    game.particles = [];
    game.dustTimer = 0;
    game.shake = 0;
    game.duckHeld = false;
    game.jumpQueued = false;
    bestEl.textContent = pad(game.best);
    scoreEl.textContent = pad(0);
  }

  function makeDots() {
    const dots = [];
    let x = 0;
    while (x < W * 1.5) {
      dots.push({ x, s: Math.random() < 0.5 });
      x += 8 + Math.random() * 28;
    }
    return dots;
  }

  function makeStars() {
    const stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * (GROUND_Y - 60) + 8 });
    }
    return stars;
  }

  function spawnObstacle() {
    const r = Math.random();
    const minSpeedForBird = 7.5;
    if (game.speed > minSpeedForBird && r < 0.28) {
      const heights = [GROUND_Y - 70, GROUND_Y - 48, GROUND_Y - 26];
      const y = heights[Math.floor(Math.random() * heights.length)];
      game.obstacles.push({
        type: "bird",
        x: W + 20,
        y,
        w: 42,
        h: 24,
        frame: 0,
        tFrame: 0,
      });
    } else {
      const big = r > 0.6;
      const groups = big ? [1, 2, 3] : [1, 2, 3, 4];
      const count = groups[Math.floor(Math.random() * groups.length)];
      const parts = [];
      let dx = 0;
      for (let i = 0; i < count; i++) {
        const w = big ? 14 : 10;
        const h = big ? (38 + Math.floor(Math.random() * 8)) : (24 + Math.floor(Math.random() * 8));
        parts.push({ dx, dy: 0, w, h });
        dx += w + 2;
      }
      const totalW = dx;
      game.obstacles.push({
        type: "cactus",
        x: W + 10,
        y: GROUND_Y,
        w: totalW,
        h: big ? 46 : 32,
        parts,
      });
    }
  }

  function maybeSpawnCloud() {
    if (game.clouds.length < 4 && Math.random() < 0.012) {
      game.clouds.push({
        x: W + 20,
        y: 20 + Math.random() * 80,
        speed: 0.35 + Math.random() * 0.35,
      });
    }
  }

  function jump() {
    if (game.state === "gameover") { restart(); return; }
    if (game.state !== "playing") { start(); return; }
    const d = game.dino;
    if (d.dead) return;
    if (!d.jumping) {
      d.vy = -10.5;
      d.jumping = true;
      d.ducking = false;
      sfx.jump();
    }
  }

  function setDuck(on) {
    if (game.state !== "playing") return;
    const d = game.dino;
    if (d.dead) return;
    if (on && !d.ducking) sfx.duck();
    if (d.jumping && on) {
      d.vy = Math.max(d.vy, 8);
    }
    d.ducking = on && !d.jumping;
    game.duckHeld = on;
  }

  function start() {
    if (game.state === "playing") return;
    audio();
    if (game.state === "ready" || game.state === "gameover") reset();
    game.state = "playing";
    overlay.dataset.state = "playing";
    game.last = performance.now();
  }

  function pause() {
    if (game.state !== "playing") return;
    game.state = "paused";
    overlay.dataset.state = "paused";
    subtitle.textContent = "Fasilə verildi — davam etmək üçün P düyməsini bas və ya ekrana toxun";
    primaryBtn.textContent = "Davam et";
    setPauseUI(true);
  }
  function resume() {
    if (game.state !== "paused") return;
    game.state = "playing";
    overlay.dataset.state = "playing";
    game.last = performance.now();
    setPauseUI(false);
  }
  function setPauseUI(paused) {
    const ic = btnPause.querySelector(".ic");
    const lb = btnPause.querySelector(".lb");
    if (!ic || !lb) return;
    if (paused) { ic.textContent = "▶"; lb.textContent = "Davam et"; }
    else { ic.textContent = "❚❚"; lb.textContent = "Fasilə"; }
  }
  function gameover() {
    game.state = "gameover";
    game.dino.dead = true;
    sfx.hit();
    if (game.score > game.best) {
      game.best = Math.floor(game.score);
      writeBest(game.best);
      bestEl.textContent = pad(game.best);
    }
    overlay.dataset.state = "gameover";
    subtitle.textContent = `Oyun bitdi — topladığınız xal: ${pad(game.score)}`;
    primaryBtn.textContent = "Yenidən başla";
    game.flashAlpha = 0.35;
    game.shake = 8;
  }
  function restart() {
    reset();
    start();
  }

  function update(dt) {
    const d = game.dino;

    game.speed = Math.min(game.speedMax, game.speed + game.speedAccel * dt);
    const advance = game.speed * (dt / 16.6667);
    game.distance += advance;
    const newScore = Math.floor(game.distance / 4);
    if (newScore !== game.score) {
      game.score = newScore;
      scoreEl.textContent = pad(game.score);
      if (game.score > 0 && game.score % 100 === 0 && game.score !== game.lastMilestone) {
        game.lastMilestone = game.score;
        sfx.point();
        game.flashAlpha = 0.18;
        spawnPopup(d.x + 50, d.y - 6, "+100");
        if (game.score % 300 === 0) game.night = !game.night;
      }
    }

    d.tFrame += dt;
    if (d.tFrame > 80) { d.frame = (d.frame + 1) % 2; d.tFrame = 0; }

    if (d.jumping) {
      d.vy += 0.55 * (dt / 16.6667);
      d.y += d.vy * (dt / 16.6667);
      if (d.y >= GROUND_Y - 47) {
        d.y = GROUND_Y - 47;
        d.vy = 0;
        d.jumping = false;
        if (game.duckHeld) d.ducking = true;
      }
    } else if (d.ducking) {
      d.y = GROUND_Y - 30;
    } else {
      d.y = GROUND_Y - 47;
    }

    if (!d.jumping && !d.dead) {
      game.dustTimer += dt;
      const interval = Math.max(70, 220 - game.speed * 12);
      if (game.dustTimer > interval) {
        game.dustTimer = 0;
        spawnDust(d.x + (d.ducking ? 18 : 14), GROUND_Y - 1);
      }
    }

    for (let i = game.particles.length - 1; i >= 0; i--) {
      const part = game.particles[i];
      part.life += dt;
      if (part.type === "dust") {
        part.x += (part.vx * (dt / 16.6667)) - advance * 0.15;
        part.y += part.vy * (dt / 16.6667);
        part.vy += 0.02 * (dt / 16.6667);
      } else if (part.type === "popup") {
        part.y += part.vy * (dt / 16.6667);
      }
      if (part.life >= part.maxLife) game.particles.splice(i, 1);
    }

    for (const c of game.clouds) c.x -= c.speed * (dt / 16.6667) * (game.speed * 0.18);
    game.clouds = game.clouds.filter(c => c.x + 40 > 0);
    maybeSpawnCloud();

    if (game.night) {
      game.moon.x -= 0.05 * (dt / 16.6667);
      if (game.moon.x < -40) { game.moon.x = W + 40; game.moon.y = 30 + Math.random() * 40; }
    } else {
      game.moon.x = W + 100;
    }

    for (const dot of game.ground.dots) dot.x -= advance;
    while (game.ground.dots.length && game.ground.dots[0].x < -10) game.ground.dots.shift();
    let last = game.ground.dots.length ? game.ground.dots[game.ground.dots.length - 1].x : 0;
    while (last < W + 30) {
      last += 8 + Math.random() * 28;
      game.ground.dots.push({ x: last, s: Math.random() < 0.5 });
    }

    game.spawnTimer += dt;
    if (game.spawnTimer >= game.nextSpawnIn) {
      game.spawnTimer = 0;
      const base = 900 - (game.speed - 6) * 70;
      game.nextSpawnIn = Math.max(420, base + Math.random() * 700);
      spawnObstacle();
    }

    for (const o of game.obstacles) {
      o.x -= advance;
      if (o.type === "bird") {
        o.tFrame = (o.tFrame || 0) + dt;
        if (o.tFrame > 140) { o.frame = (o.frame + 1) % 2; o.tFrame = 0; }
      }
    }
    game.obstacles = game.obstacles.filter(o => o.x + (o.w || 40) > -10);

    const hit = checkHit(d);
    if (hit) gameover();

    if (game.flashAlpha > 0) game.flashAlpha = Math.max(0, game.flashAlpha - dt * 0.001);
  }

  function dinoBox(d) {
    if (d.ducking && !d.jumping) {
      return { x: d.x + 6, y: d.y + 14, w: 46, h: 14 };
    }
    return { x: d.x + 8, y: d.y + 6, w: 30, h: 38 };
  }

  function checkHit(d) {
    const a = dinoBox(d);
    for (const o of game.obstacles) {
      let b;
      if (o.type === "bird") {
        b = { x: o.x + 6, y: o.y - 2, w: 32, h: 18 };
      } else {
        b = { x: o.x + 2, y: GROUND_Y - o.h, w: o.w - 4, h: o.h };
      }
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) return true;
    }
    return false;
  }

  function render() {
    const p = palette();
    const cw = canvas.width, ch = canvas.height;
    const sx = cw / W, sy = ch / H;
    const scale = Math.min(sx, sy);
    const ox = (cw - W * scale) / 2;
    const oy = (ch - H * scale) / 2;

    const shx = game.shake > 0 ? (Math.random() - 0.5) * game.shake * scale : 0;
    const shy = game.shake > 0 ? (Math.random() - 0.5) * game.shake * scale : 0;
    if (game.shake > 0) game.shake = Math.max(0, game.shake - 0.45);

    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, p.skyTop);
    grad.addColorStop(1, p.sky);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
    ctx.translate(ox + shx, oy + shy);
    ctx.scale(scale, scale);

    drawStars(game.stars, p);
    drawMoon(game.moon, p);
    for (const c of game.clouds) drawCloud(c, p);
    drawGround(game.ground, p);

    for (const o of game.obstacles) {
      if (o.type === "bird") drawBird(o);
      else drawCactus(o);
    }
    drawDino(game.dino);
    drawParticles(p);

    if (game.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${game.flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function drawParticles(p) {
    for (const part of game.particles) {
      const a = Math.max(0, 1 - part.life / part.maxLife);
      if (part.type === "dust") {
        ctx.fillStyle = `rgba(180,190,205,${0.55 * a})`;
        ctx.fillRect(Math.round(part.x), Math.round(part.y), part.size, part.size);
      } else if (part.type === "popup") {
        ctx.fillStyle = `rgba(94,234,212,${a})`;
        ctx.font = "bold 14px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(part.text, part.x, part.y);
      }
    }
  }

  function loop(t) {
    requestAnimationFrame(loop);
    if (game.state !== "playing") {
      render();
      return;
    }
    if (!game.last) game.last = t;
    let dt = t - game.last;
    game.last = t;
    if (dt > 100) dt = 100;
    game.accumulator += dt;
    while (game.accumulator >= game.frameStep) {
      update(game.frameStep);
      game.accumulator -= game.frameStep;
    }
    render();
  }

  function onKey(e) {
    const k = e.key;
    if (k === " " || k === "ArrowUp" || k === "Spacebar" || k === "Up") {
      e.preventDefault();
      if (game.state === "paused") { resume(); return; }
      jump();
    } else if (k === "ArrowDown" || k === "Down") {
      e.preventDefault();
      setDuck(true);
    } else if (k === "p" || k === "P") {
      e.preventDefault();
      if (game.state === "playing") pause();
      else if (game.state === "paused") resume();
    } else if (k === "Enter") {
      if (game.state !== "playing") {
        e.preventDefault();
        primaryBtn.click();
      }
    } else if (k === "r" || k === "R") {
      if (game.state === "gameover") restart();
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowDown" || e.key === "Down") setDuck(false);
  }
  window.addEventListener("keydown", onKey, { passive: false });
  window.addEventListener("keyup", onKeyUp);

  function pressOn(el, onDown, onUp) {
    let held = false;
    const down = (e) => { e.preventDefault(); if (held) return; held = true; onDown && onDown(); };
    const up   = (e) => { if (!held) return; held = false; onUp && onUp(); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }

  pressOn(btnJump, () => jump(), null);
  pressOn(btnDuck, () => setDuck(true), () => setDuck(false));

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (game.state !== "playing") {
      if (game.state === "paused") resume();
      else if (game.state === "gameover") restart();
      else start();
      return;
    }
    jump();
  });

  primaryBtn.addEventListener("click", () => {
    if (game.state === "paused") resume();
    else if (game.state === "gameover") restart();
    else start();
  });
  btnPause.addEventListener("click", () => {
    if (game.state === "playing") pause();
    else if (game.state === "paused") resume();
  });
  btnSound.addEventListener("click", () => {
    game.soundOn = !game.soundOn;
    writeSound(game.soundOn);
    btnSound.setAttribute("aria-pressed", String(game.soundOn));
  });
  btnReset.addEventListener("click", () => {
    if (!confirm("Rekordu sıfırlamaq istədiyinizə əminsiniz?")) return;
    game.best = 0;
    writeBest(0);
    bestEl.textContent = pad(0);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.state === "playing") pause();
  });

  prefersDark.addEventListener?.("change", () => render());

  function init() {
    fitCanvas();
    reset();
    btnSound.setAttribute("aria-pressed", String(game.soundOn));
    setPauseUI(false);
    bestEl.textContent = pad(game.best);
    requestAnimationFrame(loop);
  }
  init();
})();
