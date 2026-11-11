/* All content comes from resume.json. Edit that file and push to update the site. */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage may be blocked */ } }
};
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

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
  const box = h.clientWidth; // content width of the hero column
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
    h.style.fontSize = `${Math.min((100 * box) / Math.max(first, last) * 0.985, 96)}px`;
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

// Animated "data lines" behind the hero. They drift slowly and lean toward the pointer.
function heroCanvas() {
  const cv = $("heroBg");
  const ctx = cv.getContext("2d");
  const hero = $("hero");
  let W = 0, H = 0, colors = [], mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, running = false, visible = true, t0 = performance.now();
  const lines = [
    { c: "--primary", a: 0.42, base: 0.62, amp: 34, f: 0.0052, s: 0.32, ph: 0.2, depth: 30 },
    { c: "--accent", a: 0.38, base: 0.74, amp: 26, f: 0.0068, s: 0.42, ph: 2.1, depth: 22 },
    { c: "--good", a: 0.32, base: 0.84, amp: 20, f: 0.0082, s: 0.27, ph: 4.0, depth: 14 },
    { c: "--primary", a: 0.18, base: 0.5, amp: 42, f: 0.0038, s: 0.2, ph: 1.3, depth: 40 }
  ];
  function readColors() { colors = lines.map((l) => cssVar(l.c)); }
  function size() {
    const r = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(t) {
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    ctx.clearRect(0, 0, W, H);
    const xStart = W * 0.28;
    lines.forEach((l, k) => {
      ctx.beginPath();
      let lastX = 0, lastY = 0;
      for (let x = xStart; x <= W + 10; x += 8) {
        const p = (x - xStart) / (W - xStart);
        const y = H * l.base
          + l.amp * Math.sin(x * l.f + t * l.s + l.ph)
          + l.amp * 0.5 * Math.sin(x * l.f * 2.3 - t * l.s * 0.7)
          - p * 60 * (k === 0 ? 1 : 0.6)
          + (my - 0.5) * l.depth * p
          + (mx - 0.5) * l.depth * 0.4;
        x === xStart ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        lastX = x; lastY = y;
      }
      const g = ctx.createLinearGradient(xStart, 0, W, 0);
      g.addColorStop(0, "transparent");
      g.addColorStop(0.35, colors[k]);
      g.addColorStop(1, colors[k]);
      ctx.strokeStyle = g;
      ctx.globalAlpha = l.a;
      ctx.lineWidth = k === 0 ? 2.5 : 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }
  function loop(now) {
    if (!running) return;
    draw((now - t0) / 1000);
    requestAnimationFrame(loop);
  }
  function start() { if (reduceMotion || running || !visible || document.hidden) return; running = true; requestAnimationFrame(loop); }
  function stop() { running = false; }

  readColors(); size(); draw(0); start();
  window.addEventListener("resize", () => { size(); draw(0); });
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height;
  });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  document.addEventListener("themechange", () => { readColors(); draw(0); });
}

/* ================= Impact ================= */
function fmtNum(v, dec) { return Number(v).toFixed(dec); }
function decimalsOf(n) { const s = String(n); return s.includes(".") ? s.split(".")[1].length : 0; }

function kpiCard(k, i) {
  let num = "", viz = "";
  if (k.type === "beforeAfter") {
    num = `<span data-count data-from="${k.from}" data-to="${k.to}" data-dec="${decimalsOf(k.to)}" data-suffix="${esc(k.unit)}">${k.from}${esc(k.unit)}</span>`;
    viz = `<div class="bars">
        <div class="bar-row"><span>Before</span><div class="bar"><i class="was" data-w="100"></i></div><b>${k.from}${esc(k.unit)}</b></div>
        <div class="bar-row"><span>After</span><div class="bar"><i class="now" data-w="${((k.to / k.from) * 100).toFixed(1)}"></i></div><b>${k.to}${esc(k.unit)}</b></div>
      </div>`;
  } else if (k.type === "compare") {
    num = `<span data-count data-from="${k.baseline}" data-to="${k.value}" data-dec="${decimalsOf(k.value)}" data-suffix="${esc(k.unit)}">${k.baseline}${esc(k.unit)}</span>`;
    viz = `<div class="bars">
        <div class="bar-row"><span>Baseline</span><div class="bar"><i class="was" data-w="100"></i></div><b>${k.baseline}${esc(k.unit)}</b></div>
        <div class="bar-row"><span>${esc(k.where)}</span><div class="bar"><i class="now" data-w="${((k.value / k.baseline) * 100).toFixed(1)}"></i></div><b>${k.value}${esc(k.unit)}</b></div>
      </div>`;
  } else if (k.type === "ring") {
    num = `<span data-count data-from="0" data-to="${k.value}" data-dec="${decimalsOf(k.value)}" data-prefix="${esc(k.prefix || "")}" data-suffix="${esc(k.unit)}">${esc(k.prefix || "")}${k.value}${esc(k.unit)}</span>`;
    viz = `<div class="ring-wrap">
        <svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="rt" cx="32" cy="32" r="26"/><circle class="rv" cx="32" cy="32" r="26" pathLength="1" data-f="${k.value / 100}"/></svg>
        <span class="ring-note">${esc(k.note || "")}</span>
      </div>`;
  } else if (k.type === "delta") {
    const sign = k.dir === "down" ? "−" : "+";
    num = `<span class="arrow good">${k.dir === "down" ? ICON.down : ICON.up}</span><span data-count data-from="0" data-to="${k.value}" data-dec="0" data-prefix="${sign}" data-suffix="${esc(k.unit)}">${sign}${k.value}${esc(k.unit)}</span>`;
    viz = `<span class="delta-note">${esc(k.note || "")}</span>`;
  }
  return `
    <button class="card kpi spot reveal" type="button" data-i="${i}" style="--d:${(i % 3) * 0.08}s"
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
  let big = "";
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
function bulletsHtml(list, cls = "blist") {
  return `<ul class="${cls}">${list.map((b) => {
    const state = currentLens === "all" ? "" : (b.lens || []).includes(currentLens) ? "on" : "dim";
    return `<li data-lens="${esc((b.lens || []).join(" "))}" class="${state}">${highlightNums(b.t)}</li>`;
  }).join("")}</ul>`;
}

function renderExpTabs() {
  const jobs = DATA.experience;
  $("expTabs").innerHTML = jobs.map((j, i) => {
    const n = currentLens === "all" ? 0 : j.bullets.filter((b) => (b.lens || []).includes(currentLens)).length;
    return `<button class="exp-tab" role="tab" type="button" id="jt-${i}" aria-controls="expPanel" aria-selected="${i === currentJob}" tabindex="${i === currentJob ? 0 : -1}" data-i="${i}">
      ${n ? `<em class="match">${n} match${n > 1 ? "es" : ""}</em>` : ""}
      <b>${esc(j.short)}</b><span>${esc(j.title)}</span><span>${esc(j.start)} – ${esc(j.end)}</span>
    </button>`;
  }).join("").replaceAll("<em class", "<span class").replaceAll("</em>", "</span>");
}

function renderExpPanel(animate) {
  const j = DATA.experience[currentJob];
  const p = $("expPanel");
  p.setAttribute("aria-labelledby", `jt-${currentJob}`);
  p.className = "exp-panel card" + (animate ? " panel-in" : "");
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
    // Projects and skills
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
    <article class="card proj spot reveal${p.featured ? " featured" : ""}" style="--d:${i * 0.08}s">
      ${p.featured ? `<span class="proj-tag">Featured project</span>` : `<span class="proj-tag">Research</span>`}
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
    <div class="card skill spot reveal" data-lens="${esc(s.lens.join(" "))}" style="--d:${(i % 3) * 0.06}s">
      <h3>${esc(s.group)}</h3>
      <ul class="chips">${s.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>`).join("");
}

function renderEducation(list) {
  $("eduList").innerHTML = list.map((e, i) => `
    <article class="card edu-item reveal" style="--d:${i * 0.08}s">
      <span class="edu-when">${esc(e.end)}</span>
      <h3>${esc(e.school)}</h3>
      ${e.unit ? `<p class="unit">${esc(e.unit)}</p>` : ""}
      <p class="deg">${esc(e.degree)}</p>
      ${e.focus ? `<p class="focus">${esc(e.focus)}</p>` : ""}
      <p class="loc">${esc(e.location)}</p>
      ${e.note ? `<p class="note">${esc(e.note)}</p>` : ""}
    </article>`).join("");
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
    const W = rect.width, H = rect.height, pad = { l: 58, r: 16, t: 16, b: 30 };
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
    // legend
    ctx.textAlign = "left"; ctx.font = "600 12px 'Instrument Sans', system-ui, sans-serif";
    const lg = [["#FF8A4C", "Median"], ["rgba(110,140,255,.7)", "Middle 50%"], ["rgba(110,140,255,.35)", "Middle 80%"], ["rgba(255,255,255,.5)", "Money put in"]];
    let lx = pad.l + 10;
    lg.forEach(([c, t]) => { ctx.fillStyle = c; ctx.fillRect(lx, pad.t + 6, 12, 8); ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillText(t, lx + 17, pad.t + 14); lx += ctx.measureText(t).width + 34; });
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

/* ================= Table tennis ================= */
function renderTT(tt) {
  $("ttBox").innerHTML = `
    <div>
      <p class="kicker">07 · Off the clock</p>
      <h2 id="h-tt">${esc(tt.title)}</h2>
      <div class="big" aria-hidden="true">${esc(tt.stat)}</div>
      <p class="big-l">${esc(tt.statLabel)}</p>
      <p class="txt">${esc(tt.text)}</p>
    </div>
    <div class="game-box">
      <h3>${esc(tt.gameTitle)} <small id="bestLbl"></small></h3>
      <canvas class="game" id="game" width="800" height="450" tabindex="0" role="application"
        aria-label="Table tennis rally game. Move the paddle with the mouse, touch, or the up and down arrow keys. Press Enter to serve."></canvas>
      <p class="game-hint">${esc(tt.gameHint)}</p>
    </div>`;
}

function initGame() {
  const cv = $("game");
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const M = 26;                       // table margin
  const PX = 44, PW = 14, PH = 84, R = 9;
  let state = "idle", py = H / 2, ty = H / 2, score = 0, flash = 0;
  let best = Number(store.get("rallyBest")) || 0;
  let ball = { x: 0, y: 0, vx: 0, vy: 0 };
  const trail = [];
  const keys = { up: false, down: false };
  let running = false, visible = false, last = 0;
  const bestLbl = $("bestLbl");
  const setBest = () => (bestLbl.textContent = best ? `Your best: ${best}` : "");
  setBest();

  function serve() {
    ball = { x: PX + PW + 40, y: py, vx: 360, vy: (Math.random() * 2 - 1) * 170 };
    trail.length = 0; score = 0; state = "play";
  }
  function update(dt) {
    if (keys.up) ty -= 520 * dt;
    if (keys.down) ty += 520 * dt;
    ty = Math.max(M + PH / 2, Math.min(H - M - PH / 2, ty));
    py += (ty - py) * Math.min(1, dt * 26);
    if (flash > 0) flash -= dt;
    if (state !== "play") return;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    trail.push({ x: ball.x, y: ball.y }); if (trail.length > 10) trail.shift();
    if (ball.y < M + R) { ball.y = M + R; ball.vy = Math.abs(ball.vy); }
    if (ball.y > H - M - R) { ball.y = H - M - R; ball.vy = -Math.abs(ball.vy); }
    if (ball.x > W - M - 10 - R) { ball.x = W - M - 10 - R; ball.vx = -Math.abs(ball.vx); }
    if (ball.vx < 0 && ball.x - R <= PX + PW && ball.x > PX - 6 && Math.abs(ball.y - py) <= PH / 2 + R) {
      ball.x = PX + PW + R;
      ball.vx = Math.min(Math.abs(ball.vx) * 1.06, 900);
      const off = (ball.y - py) / (PH / 2);
      ball.vy = Math.max(-480, Math.min(480, off * 380 + ball.vy * 0.25));
      score++; flash = 0.15;
      if (score > best) { best = score; store.set("rallyBest", String(best)); setBest(); }
    }
    if (ball.x < -R * 2) state = "over";
  }
  function draw() {
    // Table: classic blue top with white lines; the far half is folded up as a practice wall.
    ctx.fillStyle = "#0E1A3D"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1F49C7"; ctx.fillRect(M, M, W - 2 * M, H - 2 * M);
    const g = ctx.createRadialGradient(W * 0.4, H * 0.4, 40, W * 0.5, H * 0.5, W * 0.7);
    g.addColorStop(0, "rgba(255,255,255,.08)"); g.addColorStop(1, "rgba(0,0,0,.18)");
    ctx.fillStyle = g; ctx.fillRect(M, M, W - 2 * M, H - 2 * M);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.strokeRect(M, M, W - 2 * M, H - 2 * M);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, H / 2); ctx.lineTo(W - M, H / 2); ctx.stroke();
    ctx.fillStyle = flash > 0 ? "#FFB020" : "#E8ECF5"; ctx.fillRect(W - M - 10, M, 10, H - 2 * M);
    // Score
    ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.textAlign = "center";
    ctx.font = "800 44px 'Bricolage Grotesque', system-ui, sans-serif";
    ctx.fillText(String(score), W / 2, 86);
    ctx.font = "600 15px 'Instrument Sans', system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.fillText("RALLY", W / 2, 108);
    // Paddle
    ctx.fillStyle = "#D7263D"; ctx.beginPath(); ctx.roundRect(PX, py - PH / 2, PW, PH, 7); ctx.fill();
    ctx.fillStyle = "#7A3E1D"; ctx.fillRect(PX - 14, py - 5, 14, 10);
    // Ball and trail
    if (state !== "idle") {
      trail.forEach((p, i) => { ctx.fillStyle = `rgba(255,140,60,${(i / trail.length) * 0.35})`; ctx.beginPath(); ctx.arc(p.x, p.y, R * (0.4 + i / trail.length * 0.5), 0, 7); ctx.fill(); });
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(ball.x + 4, ball.y + 6, R, R * 0.7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#FF8A3D"; ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, 7); ctx.fill();
    }
    if (state !== "play") {
      ctx.fillStyle = "rgba(10,15,30,.62)"; ctx.fillRect(M, H / 2 - 62, W - 2 * M, 124);
      ctx.fillStyle = "#fff"; ctx.font = "800 38px 'Bricolage Grotesque', system-ui, sans-serif";
      ctx.fillText(state === "idle" ? "Click or press Enter to serve" : `Rally over: ${score}`, W / 2, H / 2 - 4);
      ctx.font = "500 18px 'Instrument Sans', system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.fillText(state === "idle" ? "Move up and down to return the ball" : "Click or press Enter to play again", W / 2, H / 2 + 30);
    }
  }
  function frame(t) {
    if (!running) return;
    const dt = Math.min((t - last) / 1000, 0.033) || 0.016; last = t;
    update(dt); draw();
    if (state === "play" || Math.abs(ty - py) > 0.5 || keys.up || keys.down || flash > 0) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() { if (!visible) { draw(); return; } if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  const setY = (e) => { const r = cv.getBoundingClientRect(); ty = ((e.clientY - r.top) / r.height) * H; kick(); };
  cv.addEventListener("pointermove", setY);
  cv.addEventListener("pointerdown", (e) => { setY(e); if (state !== "play") serve(); kick(); });
  cv.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { keys.up = true; e.preventDefault(); kick(); }
    else if (e.key === "ArrowDown") { keys.down = true; e.preventDefault(); kick(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (state !== "play") serve(); kick(); }
  });
  cv.addEventListener("keyup", (e) => { if (e.key === "ArrowUp") keys.up = false; if (e.key === "ArrowDown") keys.down = false; });
  cv.addEventListener("blur", () => (keys.up = keys.down = false));
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? kick() : (running = false); }, { threshold: 0.25 }).observe(cv);
  if (document.fonts) document.fonts.ready.then(draw);
  draw();
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
    document.dispatchEvent(new Event("themechange"));
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

  // Reveal on scroll
  document.querySelectorAll(".sec-head, .lens, .exp, .seg, .contact, .tt").forEach((el) => el.classList.add("reveal"));
  const rev = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); rev.unobserve(x.target); } }), { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => rev.observe(el));

  // Spotlight that follows the pointer on cards
  document.addEventListener("pointermove", (e) => {
    const c = e.target.closest?.(".spot");
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`);
    c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

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
    renderTT(d.tableTennis);
    initGame();
    renderContact(d.basics);
    initChrome();
    heroCanvas();
  })
  .catch((e) => {
    const p = document.createElement("p");
    p.className = "wrap";
    p.textContent = "The page content could not load. If you opened index.html straight from your files, run a local server instead (see README). " + e.message;
    $("main").prepend(p);
    console.error(e);
  });
