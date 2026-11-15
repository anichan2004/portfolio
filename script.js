/* All content comes from resume.json. Edit that file to update the site. */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage may be blocked */ } }
};

let toastT;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 1800);
}

// Wrap figures such as 34.6%, about 90% or 10,000 in a highlight.
function highlightNums(text) {
  return esc(text).replace(/(about )?\d[\d,]*(?:\.\d+)?%|\b\d{1,3}(?:,\d{3})+\b/g, (m) => `<mark class="num">${m}</mark>`);
}

const ICON = {
  arrowR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  dl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  ext: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  in: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/></svg>'
};

let DATA;
let currentLens = "all";
let currentJob = 0;

/* ================= Hero ================= */
function renderHero(b) {
  $("status").textContent = b.status;
  $("nFirst").textContent = b.firstName;
  $("nLast").textContent = b.lastName;
  $("roleSr").textContent = b.role;
  $("summary").textContent = b.summary;
  $("topResume").href = b.resume;
  $("heroActions").innerHTML = `
    <a class="btn btn-primary" href="#impact">See my impact ${ICON.arrowR}</a>
    <a class="btn" href="${esc(b.resume)}" download>${ICON.dl} Download resume</a>
    ${b.linkedin ? `<a class="btn" href="${esc(b.linkedin)}" target="_blank" rel="noopener">${ICON.in} LinkedIn</a>` : ""}`;
  $("marquee").innerHTML = [...b.tools, ...b.tools].map((t) => `<span>${esc(t)}</span>`).join("");
}

// Keep the name on one line when it fits; otherwise put first and last name on separate lines.
// It never breaks inside a word.
function fitName() {
  const h = $("name");
  h.classList.remove("stack");
  h.style.display = "";
  const box = h.clientWidth;
  if (!box) return;
  h.style.fontSize = "100px";
  h.style.display = "inline-block";
  const all = h.getBoundingClientRect().width;
  const first = $("nFirst").getBoundingClientRect().width;
  const last = $("nLast").getBoundingClientRect().width;
  h.style.display = "";
  const oneLine = (100 * box) / all;
  if (oneLine >= 46) {
    h.style.fontSize = `${Math.min(oneLine * 0.985, 112)}px`;
  } else {
    h.classList.add("stack");
    h.style.fontSize = `${Math.min(((100 * box) / Math.max(first, last)) * 0.985, 96)}px`;
  }
}

function startRotator(words) {
  const el = $("rot");
  if (reduceMotion || !words?.length) { el.textContent = words?.[0] || ""; return; }
  let w = 0, i = 0, deleting = false;
  const tick = () => {
    const word = words[w];
    if (!deleting) {
      i++;
      el.textContent = word.slice(0, i);
      if (i === word.length) { deleting = true; return setTimeout(tick, 1900); }
      return setTimeout(tick, 55);
    }
    i--;
    el.textContent = word.slice(0, i);
    if (i === 0) { deleting = false; w = (w + 1) % words.length; return setTimeout(tick, 300); }
    setTimeout(tick, 28);
  };
  tick();
}

/* ================= 3D support check ================= */
function has3D() {
  if (typeof THREE === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

/* ================= 3D hero: a field of bars that grows like a chart ================= */
function heroScene3D() {
  const cv = $("heroBg"), hero = $("hero");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);

  const NX = 24, NZ = 12, GAP = 0.5;
  const geo = new THREE.BoxGeometry(0.34, 1, 0.34);
  geo.translate(0, 0.5, 0);
  const bars = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.12 }), NX * NZ);
  const group = new THREE.Group();
  group.add(bars);
  scene.add(group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa0d8, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(4, 9, 6);
  scene.add(sun);

  // An orange ball hops along the bars, a nod to table tennis.
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 28, 28),
    new THREE.MeshStandardMaterial({ color: 0xff6b2c, roughness: 0.35, emissive: 0xff6b2c, emissiveIntensity: 0.3 })
  );
  group.add(ball);

  const cA = new THREE.Color(0x2b59ff), cB = new THREE.Color(0x7a5cff), cC = new THREE.Color(0xff6b2c), col = new THREE.Color();
  const dummy = new THREE.Object3D();
  const heightAt = (i, k, t) => {
    const u = i / (NX - 1);
    return Math.max(0.12, 0.25 + u * u * 2.5 + 0.45 * Math.sin(i * 0.55 + t * 1.1) * (0.35 + u) + 0.3 * Math.cos(k * 0.7 + t * 0.8 + i * 0.2));
  };

  let mx = 0, my = 0, tx = 0, ty = 0, running = false, visible = true, small = false;
  const t0 = performance.now();

  function size() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    small = w < 860;
  }

  function frame(t) {
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    let n = 0;
    for (let i = 0; i < NX; i++) {
      for (let k = 0; k < NZ; k++) {
        const h = heightAt(i, k, t);
        dummy.position.set((i - (NX - 1) / 2) * GAP, 0, (k - (NZ - 1) / 2) * GAP);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        bars.setMatrixAt(n, dummy.matrix);
        const p = Math.min(h / 3.2, 1);
        if (p < 0.5) col.copy(cA).lerp(cB, p * 2); else col.copy(cB).lerp(cC, (p - 0.5) * 2);
        bars.setColorAt(n, col);
        n++;
      }
    }
    bars.instanceMatrix.needsUpdate = true;
    if (bars.instanceColor) bars.instanceColor.needsUpdate = true;

    const bi = (t * 2.4) % (NX - 1), k0 = Math.floor(NZ / 2);
    const i0 = Math.floor(bi), f = bi - i0;
    const base = heightAt(i0, k0, t) * (1 - f) + heightAt(Math.min(i0 + 1, NX - 1), k0, t) * f;
    ball.position.set((bi - (NX - 1) / 2) * GAP, base + 0.2 + Math.abs(Math.sin(f * Math.PI)) * 0.7, (k0 - (NZ - 1) / 2) * GAP);

    const scroll = Math.min(window.scrollY / 700, 1);
    if (small) {
      // On phones the bars sit in the space below the text.
      group.position.set(-1.2, 0, 0);
      group.rotation.y = -0.45 + mx * 0.1 + scroll * 0.5;
      camera.position.set(0, 9, 26);
      camera.lookAt(0, 6.6, 0);
    } else {
      group.position.set(6.0, -3.3, 0);
      group.rotation.y = -0.55 + mx * 0.14 + scroll * 0.6;
      camera.position.set(-0.6 + mx * 0.9, 4.6 - my * 0.7 + scroll * 1.5, 12.5);
      camera.lookAt(2.0, -1.0, 0);
    }
    renderer.render(scene, camera);
  }
  function loop(now) {
    if (!running) return;
    frame((now - t0) / 1000);
    requestAnimationFrame(loop);
  }
  const start = () => { if (reduceMotion || running || !visible || document.hidden) return; running = true; requestAnimationFrame(loop); };
  const stop = () => { running = false; };

  size();
  frame(0.6);
  cv.classList.add("is-3d");
  start();
  window.addEventListener("resize", () => { size(); if (!running) frame(0.6); });
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
  });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
}

/* ================= Impact ================= */
const fmtNum = (v, dec) => Number(v).toFixed(dec);
const decimalsOf = (n) => { const s = String(n); return s.includes(".") ? s.split(".")[1].length : 0; };

function kpiCard(k, i) {
  let num = "", viz = "";
  if (k.type === "beforeAfter" || k.type === "compare") {
    const start = k.type === "beforeAfter" ? k.from : k.baseline;
    const end = k.type === "beforeAfter" ? k.to : k.value;
    const l1 = k.type === "beforeAfter" ? "Before" : "Baseline";
    const l2 = k.type === "beforeAfter" ? "After" : k.where;
    num = `<span data-count data-from="${start}" data-to="${end}" data-dec="${decimalsOf(end)}" data-suffix="${esc(k.unit)}">${start}${esc(k.unit)}</span>`;
    viz = `<span class="bars">
        <span class="bar-row"><span>${esc(l1)}</span><span class="bar"><i class="was" data-w="100"></i></span><b>${start}${esc(k.unit)}</b></span>
        <span class="bar-row"><span>${esc(l2)}</span><span class="bar"><i class="now" data-w="${((end / start) * 100).toFixed(1)}"></i></span><b>${end}${esc(k.unit)}</b></span>
      </span>`;
  } else if (k.type === "ring") {
    num = `<span data-count data-from="0" data-to="${k.value}" data-dec="${decimalsOf(k.value)}" data-prefix="${esc(k.prefix || "")}" data-suffix="${esc(k.unit)}">${esc(k.prefix || "")}${k.value}${esc(k.unit)}</span>`;
    viz = `<span class="ring-wrap">
        <svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="rt" cx="32" cy="32" r="26"/><circle class="rv" cx="32" cy="32" r="26" pathLength="1" data-f="${k.value / 100}"/></svg>
        <span class="kpi-note">${esc(k.note || "")}</span>
      </span>`;
  } else {
    const sign = k.dir === "down" ? "−" : "+";
    num = `<span class="arrow">${k.dir === "down" ? ICON.down : ICON.up}</span><span data-count data-from="0" data-to="${k.value}" data-dec="0" data-prefix="${sign}" data-suffix="${esc(k.unit)}">${sign}${k.value}${esc(k.unit)}</span>`;
    viz = `<span class="kpi-note">${esc(k.note || "")}</span>`;
  }
  return `
    <button class="card kpi spot reveal tilt" type="button" data-i="${i}" style="--d:${(i % 3) * 0.08}s"
      aria-label="${esc(k.label)}, ${esc(k.where)}. Open details.">
      <span class="kpi-top"><span class="kpi-where">${esc(k.where)}</span><span class="kpi-more">How ${ICON.arrowR}</span></span>
      <span class="kpi-num">${num}</span>
      <span class="kpi-label">${esc(k.label)}</span>
      <span class="kpi-viz">${viz}</span>
    </button>`;
}

function countUp(el) {
  const from = Number(el.dataset.from), to = Number(el.dataset.to), dec = Number(el.dataset.dec || 0);
  const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
  if (reduceMotion) { el.textContent = `${pre}${fmtNum(to, dec)}${suf}`; return; }
  const dur = 1400, t0 = performance.now();
  const step = (now) => {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = `${pre}${fmtNum(from + (to - from) * e, dec)}${suf}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderImpact(list) {
  // One shared gradient for the progress rings.
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.setAttribute("aria-hidden", "true");
  defs.style.position = "absolute";
  defs.innerHTML = '<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2B59FF"/><stop offset="1" stop-color="#FF6B2C"/></linearGradient></defs>';
  document.body.appendChild(defs);

  const grid = $("impactGrid");
  grid.innerHTML = list.map(kpiCard).join("");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const c = en.target;
      c.querySelectorAll("[data-count]").forEach(countUp);
      c.querySelectorAll(".bar i").forEach((b) => (b.style.width = `${b.dataset.w}%`));
      c.querySelectorAll(".rv").forEach((r) => (r.style.strokeDashoffset = String(1 - Number(r.dataset.f))));
      io.unobserve(c);
    });
  }, { threshold: 0.35 });
  grid.querySelectorAll(".kpi").forEach((c) => io.observe(c));
  grid.addEventListener("click", (e) => {
    const c = e.target.closest(".kpi");
    if (c) openStory(list[Number(c.dataset.i)]);
  });
}

function openStory(k) {
  const s = k.story;
  let big;
  if (k.type === "beforeAfter") big = `${k.from}${k.unit} → ${k.to}${k.unit}`;
  else if (k.type === "compare") big = `${k.value}${k.unit} vs ${k.baseline}${k.unit}`;
  else if (k.type === "ring") big = `${k.prefix || ""}${k.value}${k.unit}`;
  else big = `${k.dir === "down" ? "−" : "+"}${k.value}${k.unit}`;
  $("storyBody").innerHTML = `
    <button class="icon-btn story-x" type="button" data-close aria-label="Close">${ICON.x}</button>
    <p class="where">${esc(s.where)}</p>
    <h3 id="storyTitle">${esc(s.title)}</h3>
    <div class="big-num">${esc(big)}</div>
    <h4>How I did it</h4>
    <ol class="steps">${s.how.map((h) => `<li>${esc(h)}</li>`).join("")}</ol>
    <h4>Tools</h4>
    <ul class="tags">${s.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
  $("story").showModal();
}

/* ================= Experience with hiring focus ================= */
function bulletsHtml(list) {
  return `<ul class="blist">${list.map((b) => {
    const state = currentLens === "all" ? "" : (b.lens || []).includes(currentLens) ? "on" : "dim";
    return `<li data-lens="${esc((b.lens || []).join(" "))}" class="${state}">${highlightNums(b.t)}</li>`;
  }).join("")}</ul>`;
}

function renderExpTabs() {
  $("expTabs").innerHTML = DATA.experience.map((j, i) => {
    const n = currentLens === "all" ? 0 : j.bullets.filter((b) => (b.lens || []).includes(currentLens)).length;
    return `<button class="exp-tab" role="tab" type="button" id="jt-${i}" aria-controls="expPanel" aria-selected="${i === currentJob}" tabindex="${i === currentJob ? 0 : -1}" data-i="${i}">
      ${n ? `<span class="match">${n} match${n > 1 ? "es" : ""}</span>` : ""}
      <b>${esc(j.short)}</b><span>${esc(j.title)}</span><span>${esc(j.start)} – ${esc(j.end)}</span>
    </button>`;
  }).join("");
}

function renderExpPanel(animate) {
  const j = DATA.experience[currentJob];
  const p = $("expPanel");
  p.setAttribute("aria-labelledby", `jt-${currentJob}`);
  p.className = "exp-panel card";
  if (animate) { void p.offsetWidth; p.classList.add("flip-in"); }
  p.innerHTML = `
    <h3>${esc(j.title)}</h3>
    <p class="exp-meta"><strong>${esc(j.company)}</strong><span>${esc(j.start)} – ${esc(j.end)}</span><span>${esc(j.location)}</span></p>
    ${bulletsHtml(j.bullets)}`;
}

function initExperience() {
  renderExpTabs();
  renderExpPanel(false);
  const tabs = $("expTabs");
  const select = (i, focus) => {
    currentJob = i;
    renderExpTabs(); renderExpPanel(true);
    if (focus) $(`jt-${i}`).focus();
  };
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest(".exp-tab");
    if (b) select(Number(b.dataset.i), false);
  });
  tabs.addEventListener("keydown", (e) => {
    const n = DATA.experience.length;
    if (["ArrowDown", "ArrowRight"].includes(e.key)) { e.preventDefault(); select((currentJob + 1) % n, true); }
    if (["ArrowUp", "ArrowLeft"].includes(e.key)) { e.preventDefault(); select((currentJob - 1 + n) % n, true); }
  });
}

function initLens() {
  const lenses = DATA.lenses;
  const def = "Pick a focus to highlight the most relevant work across experience, projects, and skills.";
  $("lensRow").innerHTML = `<button class="chip-btn" type="button" data-id="all" aria-pressed="true">Show everything</button>` +
    lenses.map((l) => `<button class="chip-btn" type="button" data-id="${esc(l.id)}" aria-pressed="false">${esc(l.label)}</button>`).join("");
  $("lensPitch").textContent = def;
  $("lensRow").addEventListener("click", (e) => {
    const b = e.target.closest(".chip-btn");
    if (!b) return;
    currentLens = b.dataset.id;
    $("lensRow").querySelectorAll(".chip-btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const l = lenses.find((x) => x.id === currentLens);
    $("lensPitch").textContent = l ? l.pitch : def;

    // Jump to the employer with the most matches.
    if (currentLens !== "all") {
      let best = currentJob, bestN = -1;
      DATA.experience.forEach((j, i) => {
        const n = j.bullets.filter((x) => (x.lens || []).includes(currentLens)).length;
        if (n > bestN) { bestN = n; best = i; }
      });
      currentJob = best;
    }
    renderExpTabs(); renderExpPanel(true);
    document.querySelectorAll("#projList [data-lens], #skillList [data-lens]").forEach((el) => {
      const tags = (el.dataset.lens || "").split(" ").filter(Boolean);
      el.classList.remove("dim", "on");
      if (currentLens === "all" || !tags.length) return;
      el.classList.add(tags.includes(currentLens) ? "on" : "dim");
    });
  });
}

/* ================= Projects, skills, education ================= */
function renderProjects(list) {
  $("projList").innerHTML = list.map((p, i) => `
    <article class="card proj spot reveal tilt${p.featured ? " featured" : ""}" data-tilt="2.5" style="--d:${i * 0.08}s">
      <span class="proj-tag">${p.featured ? "Featured project" : "Research"}</span>
      <h3>${esc(p.name)}</h3>
      <p class="sub">${esc(p.subtitle)}</p>
      ${p.stats?.length ? `<div class="stats">${p.stats.map((s) => `<div class="stat"><b>${esc(s.v)}</b><span>${esc(s.k)}</span></div>`).join("")}</div>` : ""}
      ${bulletsHtml(p.bullets)}
      <ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <div class="proj-links">${p.links.filter((l) => l.url).map((l, k) =>
        `<a class="btn ${k === 0 ? "btn-primary" : ""}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ${ICON.ext}</a>`).join("")}</div>
    </article>`).join("");
}

function renderSkills(list) {
  $("skillList").innerHTML = list.map((s, i) => `
    <div class="card skill spot reveal" data-lens="${esc(s.lens.join(" "))}" style="--d:${(i % 2) * 0.06}s">
      <h3>${esc(s.group)}</h3>
      <ul class="chips">${s.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>`).join("");
}

function renderEducation(list) {
  $("eduList").innerHTML = list.map((e, i) => `
    <article class="card edu-item reveal tilt" data-tilt="4" style="--d:${i * 0.08}s">
      <span class="edu-when">${esc(e.end)}</span>
      <h3>${esc(e.school)}</h3>
      ${e.unit ? `<p class="unit">${esc(e.unit)}</p>` : ""}
      <p class="deg">${esc(e.degree)}</p>
      ${e.focus ? `<p class="focus">${esc(e.focus)}</p>` : ""}
      <p class="loc">${esc(e.location)}</p>
      ${e.note ? `<p class="note">${esc(e.note)}</p>` : ""}
    </article>`).join("");
}

/* ================= 3D skills sphere ================= */
function initSphere(d) {
  const box = $("sphere");
  const seen = new Set(), items = [];
  [...d.basics.tools, ...d.skills.flatMap((g) => g.items.slice(0, 2))].forEach((t) => {
    const key = t.toLowerCase();
    if (!seen.has(key) && items.length < 24) { seen.add(key); items.push(t); }
  });
  box.innerHTML = items.map((t, i) => `<span class="${i % 4 === 0 ? "a" : i % 4 === 2 ? "b" : ""}">${esc(t)}</span>`).join("");
  const els = [...box.children], n = els.length;
  // Spread the labels evenly over a sphere.
  const pts = els.map((_, i) => {
    const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    return { x: Math.cos(th) * r, y, z: Math.sin(th) * r };
  });
  const REST_X = 0.00012, REST_Y = 0.00045;
  let ax = 0.3, ay = 0, vx = REST_X, vy = REST_Y, tvx = vx, tvy = vy, running = false, last = 0;
  function paint() {
    const R = box.clientWidth * 0.36;
    const sx = Math.sin(ax), cx = Math.cos(ax), sy = Math.sin(ay), cy = Math.cos(ay);
    pts.forEach((p, i) => {
      const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
      const y2 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
      const depth = (z2 + 1) / 2;
      const el = els[i];
      el.style.transform = `translate(-50%, -50%) translate3d(${(x1 * R).toFixed(1)}px, ${(y2 * R).toFixed(1)}px, 0) scale(${(0.6 + depth * 0.5).toFixed(3)})`;
      el.style.opacity = (0.2 + depth * 0.8).toFixed(2);
      el.style.zIndex = String(Math.round(depth * 100));
    });
  }
  function loop(t) {
    if (!running) return;
    const dt = Math.min(t - last, 50); last = t;
    vx += (tvx - vx) * 0.06; vy += (tvy - vy) * 0.06;
    ax += vx * dt; ay += vy * dt;
    paint();
    requestAnimationFrame(loop);
  }
  box.addEventListener("pointermove", (e) => {
    const r = box.getBoundingClientRect();
    tvy = ((e.clientX - r.left) / r.width - 0.5) * 0.004;
    tvx = -((e.clientY - r.top) / r.height - 0.5) * 0.004;
  });
  box.addEventListener("pointerleave", () => { tvx = REST_X; tvy = REST_Y; });
  paint();
  window.addEventListener("resize", paint);
  if (reduceMotion) return;
  new IntersectionObserver((en) => {
    const visible = en[0].isIntersecting;
    if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    if (!visible) running = false;
  }).observe(box);
}

/* ================= Demo 1: budget vs actuals ================= */
const kMoney = (n) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}K`;
const kSigned = (n) => (Math.round(n) === 0 ? "$0K" : `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}K`);
const pSigned = (n) => (Math.abs(n) < 0.05 ? "0.0%" : `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}%`);

function initVariance(cfg) {
  const root = $("panel-var");
  const lines = cfg.lines;
  const mult = lines.map(() => 100);
  root.innerHTML = `
    <h3>${esc(cfg.title)}</h3>
    <p class="intro">${esc(cfg.intro)}</p>
    <div class="presets" id="vPresets">${cfg.presets.map((p, i) => `<button type="button" data-p="${i}" class="${i === 0 ? "on" : ""}">${esc(p.label)}</button>`).join("")}</div>
    <table class="vtable">
      <thead><tr><th>Line item (${esc(cfg.unit)})</th><th>Budget</th><th>Actual</th><th>Variance</th><th>Var %</th><th>Result</th></tr></thead>
      <tbody>
        ${lines.map((l, i) => `
        <tr data-i="${i}">
          <td>${esc(l.name)}</td>
          <td data-l="Budget">${kMoney(l.budget)}</td>
          <td data-l="Actual" class="slider-cell"><div><input type="range" min="70" max="130" step="1" value="100" aria-label="${esc(l.name)} actual, percent of budget"><span class="aval"></span></div></td>
          <td data-l="Variance" class="vbar-cell"><span class="vd"></span><div class="vbar"><i></i></div></td>
          <td data-l="Var %" class="vp"></td>
          <td data-l="Result" class="vr"></td>
        </tr>`).join("")}
        <tr class="tot">
          <td>Operating income</td>
          <td data-l="Budget" id="oiB"></td>
          <td data-l="Actual" id="oiA"></td>
          <td data-l="Variance" id="oiV"></td>
          <td data-l="Var %" id="oiP"></td>
          <td data-l="Result" id="oiR"></td>
        </tr>
      </tbody>
    </table>
    <div class="commentary"><h4>Auto-generated commentary</h4><div id="vComm" aria-live="polite"></div></div>`;

  const rows = [...root.querySelectorAll("tr[data-i]")];
  const badge = (k) => `<span class="badge ${k}">${k === "f" ? "Favorable" : k === "u" ? "Unfavorable" : "On plan"}</span>`;

  function update() {
    let oiB = 0, oiA = 0, revB = 0, revA = 0;
    const impacts = [];
    lines.forEach((l, i) => {
      const act = Math.round((l.budget * mult[i]) / 100);
      const v = act - l.budget, p = (v / l.budget) * 100;
      const isRev = l.type === "revenue";
      const kind = v === 0 ? "n" : (isRev ? v > 0 : v < 0) ? "f" : "u";
      oiB += isRev ? l.budget : -l.budget;
      oiA += isRev ? act : -act;
      if (isRev) { revB += l.budget; revA += act; }
      impacts.push({ name: l.name, isRev, v, p, impact: isRev ? v : -v });
      const r = rows[i];
      r.querySelector(".aval").textContent = kMoney(act);
      r.querySelector(".vd").textContent = kSigned(v);
      r.querySelector(".vp").textContent = pSigned(p);
      r.querySelector(".vr").innerHTML = badge(kind);
      const bar = r.querySelector(".vbar i");
      const w = (Math.min(Math.abs(p), 30) / 30) * 50;
      bar.style.width = `${w}%`;
      bar.style.left = p >= 0 ? "50%" : `${50 - w}%`;
      bar.style.background = kind === "f" ? "var(--good)" : kind === "u" ? "var(--bad)" : "var(--muted)";
    });
    const oiV = oiA - oiB, oiP = (oiV / oiB) * 100;
    $("oiB").textContent = kMoney(oiB);
    $("oiA").textContent = kMoney(oiA);
    $("oiV").textContent = kSigned(oiV);
    $("oiP").textContent = pSigned(oiP);
    $("oiR").innerHTML = badge(oiV === 0 ? "n" : oiV > 0 ? "f" : "u");

    const out = [];
    out.push(Math.abs(oiP) < 0.5
      ? `Operating income is on plan at ${kMoney(oiA)}.`
      : `Operating income is ${kMoney(Math.abs(oiV))} (${Math.abs(oiP).toFixed(1)}%) ${oiV > 0 ? "above" : "below"} budget: ${kMoney(oiA)} actual vs ${kMoney(oiB)} budget.`);
    const sorted = [...impacts].sort((a, b) => a.impact - b.impact);
    const worst = sorted[0], best = sorted[sorted.length - 1];
    if (worst.impact < 0) out.push(`Biggest drag: ${worst.name}, ${kMoney(Math.abs(worst.v))} (${Math.abs(worst.p).toFixed(1)}%) ${worst.isRev ? "below" : "over"} budget.`);
    if (best.impact > 0) out.push(`Biggest help: ${best.name}, ${kMoney(Math.abs(best.v))} (${Math.abs(best.p).toFixed(1)}%) ${best.isRev ? "above" : "under"} budget.`);
    out.push(`Operating margin is ${((oiA / revA) * 100).toFixed(1)}% vs ${((oiB / revB) * 100).toFixed(1)}% budgeted.`);
    $("vComm").innerHTML = out.map((t) => `<p>${esc(t)}</p>`).join("");
  }

  rows.forEach((r, i) => r.querySelector("input").addEventListener("input", (e) => {
    mult[i] = Number(e.target.value);
    $("vPresets").querySelectorAll("button").forEach((b) => b.classList.remove("on"));
    update();
  }));
  $("vPresets").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-p]");
    if (!b) return;
    $("vPresets").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    cfg.presets[Number(b.dataset.p)].mult.forEach((m, i) => {
      mult[i] = Math.round(m * 100);
      rows[i].querySelector("input").value = mult[i];
    });
    update();
  });
  update();
}

/* ================= Demo 2: Monte Carlo ================= */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function initMonteCarlo(cfg) {
  const PATHS = 1500, MAXM = 480;
  const root = $("panel-mc");
  const d = cfg.defaults;
  const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
  const compact = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
  const ctl = [
    { id: "start", label: "Starting balance", min: 0, max: 250000, step: 1000, v: d.start, f: money },
    { id: "monthly", label: "Added each month", min: 0, max: 5000, step: 50, v: d.monthly, f: money },
    { id: "ret", label: "Expected yearly return", min: 0, max: 15, step: 0.5, v: d.ret, f: (x) => `${x}%` },
    { id: "vol", label: "Yearly volatility", min: 5, max: 35, step: 1, v: d.vol, f: (x) => `${x}%` },
    { id: "years", label: "Years", min: 5, max: 40, step: 1, v: d.years, f: (x) => `${x}` }
  ];
  root.innerHTML = `
    <h3>${esc(cfg.title)}</h3>
    <p class="intro">${esc(cfg.intro)}</p>
    <div class="mc-grid">
      <div class="mc-ctl">${ctl.map((c) => `
        <label for="mc-${c.id}">${esc(c.label)} <output id="mco-${c.id}"></output></label>
        <input id="mc-${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.v}">`).join("")}
      </div>
      <div>
        <div class="mc-chart"><canvas id="mcCanvas" role="img" aria-label="Fan chart of simulated balances over time"></canvas></div>
        <p class="mc-note" id="mcNote"></p>
        <div class="mc-read" id="mcRead"></div>
      </div>
    </div>`;

  // Fixed random draws, so slider changes move the chart smoothly instead of reshuffling it.
  const rand = mulberry32(2026);
  const Z = new Float32Array(PATHS * MAXM);
  for (let i = 0; i < Z.length; i += 2) {
    const u1 = Math.max(rand(), 1e-12), u2 = rand(), m = Math.sqrt(-2 * Math.log(u1));
    Z[i] = m * Math.cos(2 * Math.PI * u2);
    if (i + 1 < Z.length) Z[i + 1] = m * Math.sin(2 * Math.PI * u2);
  }
  const cv = $("mcCanvas"), ctx = cv.getContext("2d");
  let res = null, hover = null, geom = null;
  const val = (id) => Number($(`mc-${id}`).value);

  function simulate() {
    const start = val("start"), monthly = val("monthly");
    const mu = val("ret") / 1200, sig = val("vol") / 100 / Math.sqrt(12), M = val("years") * 12;
    const bal = new Float64Array(PATHS).fill(start), tmp = new Float64Array(PATHS);
    const q = { p10: new Float64Array(M + 1), p25: new Float64Array(M + 1), p50: new Float64Array(M + 1), p75: new Float64Array(M + 1), p90: new Float64Array(M + 1) };
    const fill = (m) => {
      tmp.set(bal); tmp.sort();
      q.p10[m] = tmp[Math.floor(PATHS * 0.1)]; q.p25[m] = tmp[Math.floor(PATHS * 0.25)]; q.p50[m] = tmp[Math.floor(PATHS * 0.5)];
      q.p75[m] = tmp[Math.floor(PATHS * 0.75)]; q.p90[m] = tmp[Math.floor(PATHS * 0.9)];
    };
    fill(0);
    for (let m = 1; m <= M; m++) {
      const off = (m - 1) * PATHS;
      for (let p = 0; p < PATHS; p++) bal[p] = (bal[p] + monthly) * (1 + Math.max(mu + sig * Z[off + p], -0.95));
      fill(m);
    }
    res = { M, start, monthly, ...q };
  }

  function readout() {
    const r = res, M = r.M;
    $("mcRead").innerHTML = `
      <div><small>Unlucky case (10th percentile)</small><b>${money(r.p10[M])}</b></div>
      <div class="mid"><small>Middle case (median)</small><b>${money(r.p50[M])}</b></div>
      <div><small>Lucky case (90th percentile)</small><b>${money(r.p90[M])}</b></div>
      <div><small>Total you put in</small><b>${money(r.start + r.monthly * M)}</b></div>`;
  }

  function draw() {
    if (!res || root.hidden) return;
    const rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rect.width * dpr); cv.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height, pad = { l: 58, r: 16, t: 34, b: 30 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, r = res, M = r.M;
    const yMax = Math.max(r.p90[M], 1) * 1.06;
    const X = (m) => pad.l + (m / M) * iw, Y = (v) => pad.t + ih - (v / yMax) * ih;
    ctx.clearRect(0, 0, W, H);
    ctx.font = "500 12px 'Instrument Sans', system-ui, sans-serif";
    ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1;
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) { const v = (yMax * i) / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); ctx.fillText(compact(v), pad.l - 8, y + 4); }
    const yrs = M / 12, st = yrs <= 10 ? 2 : yrs <= 20 ? 5 : 10;
    for (let y = 0; y <= yrs; y += st) { ctx.textAlign = y === 0 ? "left" : y + st > yrs ? "right" : "center"; ctx.fillText(`Yr ${y}`, X(y * 12), H - 9); }
    const band = (lo, hi, col) => { ctx.beginPath(); for (let m = 0; m <= M; m++) ctx[m ? "lineTo" : "moveTo"](X(m), Y(hi[m])); for (let m = M; m >= 0; m--) ctx.lineTo(X(m), Y(lo[m])); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
    band(r.p10, r.p90, "rgba(110,140,255,.20)");
    band(r.p25, r.p75, "rgba(110,140,255,.38)");
    ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let m = 0; m <= M; m++) ctx[m ? "lineTo" : "moveTo"](X(m), Y(r.start + r.monthly * m)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "#FF8A4C"; ctx.lineWidth = 2.5;
    ctx.beginPath(); for (let m = 0; m <= M; m++) ctx[m ? "lineTo" : "moveTo"](X(m), Y(r.p50[m])); ctx.stroke();
    // Legend, kept above the plot area
    ctx.textAlign = "left"; ctx.font = "600 12px 'Instrument Sans', system-ui, sans-serif";
    const lg = [["#FF8A4C", "Median"], ["rgba(110,140,255,.75)", "Middle 50%"], ["rgba(110,140,255,.4)", "Middle 80%"], ["rgba(255,255,255,.5)", "Money put in"]];
    let lx = pad.l;
    lg.forEach(([c, t]) => {
      const w = ctx.measureText(t).width + 30;
      if (lx + w > W - pad.r) return;
      ctx.fillStyle = c; ctx.fillRect(lx, 12, 12, 8);
      ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillText(t, lx + 17, 20);
      lx += w;
    });
    if (hover !== null) {
      const x = X(hover);
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ih); ctx.stroke();
      [[r.p90, "#C9D4FF"], [r.p50, "#FF8A4C"], [r.p10, "#C9D4FF"]].forEach(([a, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, Y(a[hover]), 4.5, 0, 7); ctx.fill(); });
    }
    geom = { pad, iw, M };
  }

  function note() {
    const el = $("mcNote");
    if (hover === null) { el.textContent = "Hover over or touch the chart to read any year."; return; }
    const r = res, m = hover;
    el.textContent = `Year ${(m / 12).toFixed(1)}: median ${money(r.p50[m])}. 1 in 10 runs ends below ${money(r.p10[m])}, and 1 in 10 above ${money(r.p90[m])}.`;
  }
  const onPtr = (e) => {
    if (!geom) return;
    const rect = cv.getBoundingClientRect();
    hover = Math.max(0, Math.min(geom.M, Math.round(((e.clientX - rect.left - geom.pad.l) / geom.iw) * geom.M)));
    draw(); note();
  };
  cv.addEventListener("pointermove", onPtr);
  cv.addEventListener("pointerdown", onPtr);
  cv.addEventListener("pointerleave", () => { hover = null; draw(); note(); });

  function refresh() {
    ctl.forEach((c) => ($(`mco-${c.id}`).textContent = c.f(val(c.id))));
    simulate(); readout();
    if (hover !== null) hover = Math.min(hover, res.M);
    draw(); note();
  }
  let raf = 0;
  ctl.forEach((c) => $(`mc-${c.id}`).addEventListener("input", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(refresh); }));
  window.addEventListener("resize", draw);
  refresh();
  return { redraw: draw };
}

function initDemoTabs(mc) {
  const tabs = [$("tab-var"), $("tab-mc")], panels = [$("panel-var"), $("panel-mc")];
  const show = (i, focus) => {
    tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(i === j)); t.tabIndex = i === j ? 0 : -1; });
    panels.forEach((p, j) => { p.hidden = i !== j; if (i === j) { p.classList.remove("panel-in"); void p.offsetWidth; p.classList.add("panel-in"); } });
    if (i === 1) mc.redraw();
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(i));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); show((i + 1) % 2, true); }
    });
  });
}

/* ================= Table tennis (3D) ================= */
function renderTT(tt) {
  $("ttBox").innerHTML = `
    <div>
      <p class="kicker">07 · Off the clock</p>
      <h2 id="h-tt">${esc(tt.title)}</h2>
      <div class="big" aria-hidden="true">${esc(tt.stat)}</div>
      <p class="big-l">${esc(tt.statLabel)}</p>
      <p class="txt">${esc(tt.text)}</p>
    </div>
    <div class="game-box" id="gameBox">
      <h3>${esc(tt.gameTitle)} <small id="bestLbl"></small></h3>
      <div class="game-wrap">
        <canvas class="game" id="game" width="800" height="450" tabindex="0" role="application"
          aria-label="Table tennis rally game. Move the paddle with the mouse, touch, or the arrow keys. Press Enter to serve."></canvas>
        <div class="g-score" id="gScore"><b>0</b><span>RALLY</span></div>
        <div class="g-msg" id="gMsg"><b></b><span></span></div>
      </div>
      <p class="game-hint">${esc(tt.gameHint)}</p>
    </div>`;
}

function initGame3D() {
  const cv = $("game");
  const scoreEl = $("gScore"), msgEl = $("gMsg");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0b1330);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1330, 13, 30);
  const cam = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 80);
  const L = 9, WD = 5;

  // Table, lines, and a practice wall at the far end.
  const table = new THREE.Mesh(new THREE.BoxGeometry(WD, 0.18, L), new THREE.MeshStandardMaterial({ color: 0x1f49c7, roughness: 0.5 }));
  table.position.set(0, -0.09, -L / 2);
  scene.add(table);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const line = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), white); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); scene.add(m); };
  line(WD, 0.08, 0, -0.04); line(WD, 0.08, 0, -L + 0.04);
  line(0.08, L, -WD / 2 + 0.04, -L / 2); line(0.08, L, WD / 2 - 0.04, -L / 2); line(0.04, L, 0, -L / 2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf5, roughness: 0.8, emissive: 0xffb020, emissiveIntensity: 0 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(WD, 2.4, 0.2), wallMat);
  wall.position.set(0, 1.2, -L - 0.1);
  scene.add(wall);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1a2340, roughness: 0.9 });
  [[-2.1, -0.6], [2.1, -0.6], [-2.1, -L + 0.6], [2.1, -L + 0.6]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), legMat);
    leg.position.set(x, -0.93, z); scene.add(leg);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x101a3a, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.68; scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1c2a5a, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(3, 8, 5); scene.add(sun);

  const ballM = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 24), new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.4, emissive: 0xff6b2c, emissiveIntensity: 0.25 }));
  scene.add(ballM);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; scene.add(shadow);
  const paddle = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.07, 40), new THREE.MeshStandardMaterial({ color: 0xd7263d, roughness: 0.6 }));
  face.rotation.x = Math.PI / 2;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.08), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.7 }));
  handle.position.y = -0.62;
  paddle.add(face, handle);
  paddle.position.set(0, 0.62, 0.25);
  scene.add(paddle);

  // Game logic runs on a flat 800 x 450 board; the 3D scene draws it in perspective.
  // Board x runs from the paddle to the far wall, board y runs across the table.
  const W = 800, H = 450, M = 26, PX = 44, PW = 14, PH = 84, R = 9;
  const FAR = W - M - 10;
  const across = (y) => ((y - H / 2) / (H - 2 * M)) * WD;
  const depth = (x) => -((x - (PX + PW)) / (FAR - (PX + PW))) * L;
  let state = "idle", py = H / 2, ty = H / 2, score = 0, flash = 0, pulse = 0;
  let best = Number(store.get("rallyBest")) || 0;
  let ball = { x: PX + PW + 40, y: H / 2, vx: 0, vy: 0 };
  const keys = { l: false, r: false };
  let running = false, visible = false, last = 0;
  const bestLbl = $("bestLbl");
  const setBest = () => (bestLbl.textContent = best ? `Your best: ${best}` : "");
  setBest();

  function overlay() {
    scoreEl.firstElementChild.textContent = String(score);
    msgEl.hidden = state === "play";
    msgEl.firstElementChild.textContent = state === "idle" ? "Click or tap to serve" : `Rally over: ${score}`;
    msgEl.lastElementChild.textContent = state === "idle" ? "Move left and right to return the ball" : "Click or tap to play again";
  }
  function serve() {
    ball = { x: PX + PW + 40, y: py, vx: 500, vy: (Math.random() * 2 - 1) * 200 };
    score = 0; state = "play"; overlay();
  }
  function update(dt) {
    if (keys.l) ty -= 520 * dt;
    if (keys.r) ty += 520 * dt;
    ty = Math.max(M + PH / 2, Math.min(H - M - PH / 2, ty));
    py += (ty - py) * Math.min(1, dt * 26);
    if (flash > 0) flash -= dt;
    if (pulse > 0) pulse -= dt;
    if (state !== "play") return;
    const prevX = ball.x;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y < M + R) { ball.y = M + R; ball.vy = Math.abs(ball.vy); }
    if (ball.y > H - M - R) { ball.y = H - M - R; ball.vy = -Math.abs(ball.vy); }
    if (ball.x > FAR - R) { ball.x = FAR - R; ball.vx = -Math.abs(ball.vx); flash = 0.18; }
    // Checked against where the ball started this frame, so a fast ball cannot skip through the paddle.
    if (ball.vx < 0 && ball.x - R <= PX + PW && prevX > PX - 6 && Math.abs(ball.y - py) <= PH / 2 + R) {
      ball.x = PX + PW + R;
      ball.vx = Math.min(Math.abs(ball.vx) * 1.05, 1050);
      ball.vy = Math.max(-480, Math.min(480, ((ball.y - py) / (PH / 2)) * 380 + ball.vy * 0.25));
      score++; pulse = 0.14;
      if (score > best) { best = score; store.set("rallyBest", String(best)); setBest(); }
      overlay();
    }
    if (ball.x < -R * 6) { state = "over"; overlay(); }
  }
  function draw() {
    const px = across(py);
    paddle.position.x = px;
    paddle.rotation.z = -px * 0.08;
    const s = 1 + Math.max(pulse, 0) * 1.6;
    paddle.scale.set(s, s, 1);
    const bx = across(ball.y), bz = depth(ball.x), d = -bz / L;
    const by = d >= 0 ? 0.12 + 0.52 * Math.abs(Math.cos(Math.PI * d * 1.1)) : Math.max(-1.4, 0.64 + d * 6);
    ballM.visible = state !== "idle";
    ballM.position.set(bx, by, bz);
    shadow.visible = state !== "idle" && d >= 0;
    shadow.position.x = bx; shadow.position.z = bz;
    const sc = 1 - Math.min(by, 0.7) * 0.5;
    shadow.scale.set(sc, sc, 1);
    wallMat.emissiveIntensity = flash > 0 ? 0.9 : 0;
    cam.position.set(px * 0.32, 3.05, 4.9);
    cam.lookAt(px * 0.14, 0.3, -3.6);
    renderer.render(scene, cam);
  }
  function size() {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function frame(t) {
    if (!running) return;
    const dt = Math.min((t - last) / 1000, 0.033) || 0.016; last = t;
    update(dt); draw();
    if (state === "play" || Math.abs(ty - py) > 0.5 || keys.l || keys.r || flash > 0 || pulse > 0) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() { if (!visible) { draw(); return; } if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  // The near edge of the table is narrower than the view, so scale pointer travel to match.
  const setX = (e) => {
    const r = cv.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width - 0.5;
    const viewW = 2 * 5.7 * Math.tan((23 * Math.PI) / 180) * (r.width / r.height);
    ty = H / 2 + ((fx * viewW) / WD) * (H - 2 * M);
    kick();
  };
  cv.addEventListener("pointermove", setX);
  cv.addEventListener("pointerdown", (e) => { setX(e); if (state !== "play") serve(); kick(); });
  cv.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { keys.l = true; e.preventDefault(); kick(); }
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { keys.r = true; e.preventDefault(); kick(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (state !== "play") serve(); kick(); }
  });
  cv.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") keys.l = false;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") keys.r = false;
  });
  cv.addEventListener("blur", () => (keys.l = keys.r = false));
  window.addEventListener("resize", () => { size(); draw(); });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { size(); draw(); kick(); } else running = false; }, { threshold: 0.2 }).observe(cv);
  size(); overlay(); draw();
}

/* ================= Contact ================= */
function renderContact(b) {
  $("contactBox").innerHTML = `
    <p class="kicker">08 · Contact</p>
    <h2 id="h-contact">Let's talk.</h2>
    <p class="lead">I'm looking for FP&amp;A and BI analyst roles. Email is the fastest way to reach me.</p>
    <a class="mail" href="mailto:${esc(b.email)}">${esc(b.email)}</a>
    <div class="actions">
      <button class="btn btn-white" type="button" id="copyMail">${ICON.copy} Copy email</button>
      ${b.linkedin ? `<a class="btn" href="${esc(b.linkedin)}" target="_blank" rel="noopener">${ICON.in} LinkedIn</a>` : ""}
      <a class="btn" href="${esc(b.resume)}" download>${ICON.dl} Resume (PDF)</a>
    </div>
    <p class="loc">Based in ${esc(b.location)}</p>`;
  $("copyMail").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.email); toast("Email copied"); }
    catch { window.location.href = `mailto:${b.email}`; }
  });
  $("footText").textContent = `© ${new Date().getFullYear()} ${b.firstName} ${b.lastName}`;
}

/* ================= Page chrome ================= */
function initChrome() {
  // Theme: always set an explicit value so icons and colors stay in sync.
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const btn = $("themeBtn");
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = (t) => {
    root.dataset.theme = t;
    btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    if (meta) meta.content = t === "dark" ? "#0A0F1E" : "#F5F7FC";
  };
  const saved = store.get("theme");
  apply(saved === "dark" || saved === "light" ? saved : mq.matches ? "dark" : "light");
  mq.addEventListener?.("change", (e) => { if (!store.get("theme")) apply(e.matches ? "dark" : "light"); });
  btn.addEventListener("click", () => { const t = root.dataset.theme === "dark" ? "light" : "dark"; store.set("theme", t); apply(t); });

  // Mobile menu
  const nav = $("nav"), menu = $("menuBtn");
  const closeMenu = () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); };
  menu.addEventListener("click", () => { const o = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(o)); });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".top")) closeMenu(); });

  // Scroll progress, header border, back-to-top
  const bar = $("progressBar"), top = $("top"), toTop = $("toTop");
  let tick = false;
  const onScroll = () => {
    tick = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
    top.classList.toggle("scrolled", scrollY > 8);
    toTop.classList.toggle("show", scrollY > 700);
  };
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  // Active nav link
  const links = [...nav.querySelectorAll("a")];
  const spy = new IntersectionObserver((en) => en.forEach((x) => {
    if (x.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${x.target.id}`));
  }), { rootMargin: "-40% 0px -55% 0px" });
  ["impact", "experience", "projects", "playground", "skills", "education", "tt", "contact"].forEach((id) => $(id) && spy.observe($(id)));

  // Reveal on scroll. Once a card has finished arriving it is marked ready, so the tilt effect can take over.
  document.querySelectorAll(".sec-head, .lens, .exp, .seg, .sphere-box, .contact, .tt").forEach((el) => el.classList.add("reveal"));
  const rev = new IntersectionObserver((en) => en.forEach((x) => {
    if (!x.isIntersecting) return;
    x.target.classList.add("in");
    rev.unobserve(x.target);
    setTimeout(() => x.target.classList.add("ready"), 1100);
  }), { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach((el) => rev.observe(el));

  // Spotlight and 3D tilt that follow the pointer on cards
  const canHover = window.matchMedia("(hover: hover)").matches;
  let tilted = null;
  const untilt = () => { if (tilted) { tilted.style.setProperty("--rx", "0deg"); tilted.style.setProperty("--ry", "0deg"); tilted = null; } };
  document.addEventListener("pointermove", (e) => {
    const s = e.target.closest?.(".spot");
    if (s) {
      const r = s.getBoundingClientRect();
      s.style.setProperty("--mx", `${e.clientX - r.left}px`);
      s.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
    if (reduceMotion || !canHover) return;
    const c = e.target.closest?.(".tilt.ready");
    if (tilted && tilted !== c) untilt();
    if (!c) return;
    tilted = c;
    const r = c.getBoundingClientRect(), max = Number(c.dataset.tilt || 6);
    c.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 2 * max).toFixed(2)}deg`);
    c.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height - 0.5) * 2 * max).toFixed(2)}deg`);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", untilt);

  // Story drawer close
  const dlg = $("story");
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });

  // Name sizing
  let rz = 0;
  addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(fitName); });
  if (document.fonts) document.fonts.ready.then(fitName);
}

/* ================= Start ================= */
fetch("resume.json", { cache: "no-cache" })
  .then((r) => { if (!r.ok) throw new Error(`resume.json returned ${r.status}`); return r.json(); })
  .then((d) => {
    DATA = d;
    renderHero(d.basics);
    fitName();
    startRotator(d.basics.rotating);
    renderImpact(d.impact);
    initExperience();
    renderProjects(d.projects);
    renderSkills(d.skills);
    renderEducation(d.education);
    initLens();
    initVariance(d.playground.variance);
    initDemoTabs(initMonteCarlo(d.playground.monteCarlo));
    initSphere(d);
    renderTT(d.tableTennis);
    renderContact(d.basics);
    initChrome();

    // 3D parts. If a device has 3D graphics switched off, the hero keeps its plain gradient and the game is hidden.
    const ok = has3D();
    if (ok) { try { heroScene3D(); } catch (e) { console.warn("3D hero unavailable", e); } }
    let gameOK = false;
    if (ok) { try { initGame3D(); gameOK = true; } catch (e) { console.warn("3D game unavailable", e); } }
    if (!gameOK) $("gameBox").hidden = true;
  })
  .catch((e) => {
    const p = document.createElement("p");
    p.className = "wrap";
    p.textContent = "The page content could not load. If you opened index.html straight from your files, run a local server instead (see README). " + e.message;
    $("main").prepend(p);
    console.error(e);
  });
