/* Everything on the page comes from resume.json.
   To update the site, edit that file and push to Git. */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage can be blocked */ } }
};

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- gauge geometry ---------- */
const START = -135;
const SWEEP = 270;
const angleFor = (v, max) => START + SWEEP * Math.min(Math.max(v / max, 0), 1);

function polar(cx, cy, r, deg) {
  const t = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
}
function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function bigGauge(g, idx) {
  const cx = 200, cy = 200, r = 165;
  const track = arcPath(cx, cy, r, START, START + SWEEP);
  const frac = Math.min(g.value / g.max, 1);

  let ticks = "";
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const a = START + (SWEEP * i) / steps;
    const major = i % 4 === 0;
    const [x0, y0] = polar(cx, cy, 148, a);
    const [x1, y1] = polar(cx, cy, major ? 128 : 138, a);
    ticks += `<line class="g-tick${major ? "" : " minor"}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
    if (major) {
      const [tx, ty] = polar(cx, cy, 106, a);
      ticks += `<text class="g-num" x="${tx.toFixed(1)}" y="${(ty + 6).toFixed(1)}">${Math.round((g.max * i) / steps)}</text>`;
    }
  }

  let ghost = "";
  if (typeof g.before === "number") {
    const a = angleFor(g.before, g.max);
    const [gx0, gy0] = polar(cx, cy, 152, a);
    const [gx1, gy1] = polar(cx, cy, 182, a);
    const [tx, ty] = polar(cx, cy, 198, a);
    ghost = `<line class="g-ghost" x1="${gx0.toFixed(1)}" y1="${gy0.toFixed(1)}" x2="${gx1.toFixed(1)}" y2="${gy1.toFixed(1)}"/>
             <text class="g-ghost-t" x="${tx.toFixed(1)}" y="${(ty + 5).toFixed(1)}">before</text>`;
  }

  return `
  <button class="dial" type="button" data-story="${idx}" aria-label="${esc(g.label)}: ${esc(g.value)}${esc(g.unit || "")}. ${esc(g.caption || "")}. Open details.">
    <svg class="big" viewBox="-24 0 448 366" aria-hidden="true">
      <path class="g-track" d="${track}" stroke-width="16"/>
      <path class="g-val" d="${track}" pathLength="1" stroke-width="16" style="--f:${frac}"/>
      ${ticks}
      ${ghost}
      <g class="needle" style="--a:${angleFor(g.value, g.max)}deg">
        <polygon points="196.5,206 203.5,206 201,86 199,86" fill="#D3202F"/>
      </g>
      <circle cx="200" cy="200" r="15" fill="#1d1f22" stroke="#555a61" stroke-width="2"/>
      <text class="g-read" x="200" y="326">${esc(g.value)}${esc(g.unit || "")}</text>
      <text class="g-lab" x="200" y="354">${esc(g.label)}</text>
    </svg>
  </button>
  <p class="big-cap">${esc(g.caption || "")}</p>`;
}

function miniGauge(g, idx) {
  const cx = 100, cy = 100, r = 78;
  const track = arcPath(cx, cy, r, START, START + SWEEP);
  const frac = Math.min(g.value / g.max, 1);
  return `
  <button class="dial mini" type="button" data-story="${idx}" aria-label="${esc(g.label)}: ${esc(g.display)}. ${esc(g.caption || "")}. Open details.">
    <svg viewBox="0 0 200 190" aria-hidden="true">
      <path class="g-track" d="${track}" stroke-width="12"/>
      <path class="g-val" d="${track}" pathLength="1" stroke-width="12" style="--f:${frac}"/>
      <text class="g-read sm" x="100" y="112">${esc(g.display)}</text>
    </svg>
    <p class="lab">${esc(g.label)}</p>
    <p class="cap">${esc(g.caption || "")}</p>
  </button>`;
}

/* ---------- static sections ---------- */
function bulletsHtml(list) {
  return `<ul class="plain">${(list || [])
    .map((b) => {
      const o = typeof b === "string" ? { t: b, lens: [] } : b;
      return `<li data-lens="${esc((o.lens || []).join(" "))}">${esc(o.t)}</li>`;
    })
    .join("")}</ul>`;
}
function linkList(links) {
  return (links || [])
    .filter((l) => l.url)
    .map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
    .join("");
}

let DATA;
let stories = [];

function render(d) {
  DATA = d;
  const b = d.basics;
  document.title = `${b.name} | ${b.role}`;

  $("status").textContent = b.status || "";
  $("status").hidden = !b.status;
  $("name").textContent = b.name;
  $("role").textContent = b.role;
  $("headline").textContent = b.headline;
  $("summary").textContent = b.summary;

  const extra = (b.links || [])
    .filter((l) => l.url)
    .map((l) => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
    .join("");
  $("heroActions").innerHTML =
    `<a class="btn solid" href="${esc(b.resume)}" download>Download resume</a>` +
    `<a class="btn" href="mailto:${esc(b.email)}">Email me</a>` + extra;

  // Dials
  stories = [d.gauges.main, ...d.gauges.small];
  $("cluster").innerHTML =
    bigGauge(d.gauges.main, 0) +
    `<div class="minis">${d.gauges.small.map((g, i) => miniGauge(g, i + 1)).join("")}</div>`;

  $("expList").innerHTML = d.experience
    .map(
      (j) => `
    <article class="job">
      <div class="job-when">${esc(j.start)} – ${esc(j.end)}<span>${esc(j.location)}</span></div>
      <div class="job-body">
        <h3>${esc(j.title)}</h3>
        <p class="co">${esc(j.company)}</p>
        ${bulletsHtml(j.bullets)}
      </div>
    </article>`
    )
    .join("");

  $("projList").innerHTML = d.projects
    .map((p) => {
      const links = linkList(p.links);
      return `
    <article class="project">
      <h3>${esc(p.name)}</h3>
      ${links ? `<div class="proj-links">${links}</div>` : ""}
      ${bulletsHtml(p.bullets)}
      ${p.tags?.length ? `<ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
    </article>`;
    })
    .join("");

  $("skillList").innerHTML = d.skills
    .map(
      (s) => `
    <div data-lens="${esc((s.lens || []).join(" "))}">
      <h3>${esc(s.group)}</h3>
      <ul class="chips">${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
    </div>`
    )
    .join("");

  $("eduList").innerHTML = d.education
    .map(
      (e) => `
    <article class="edu-item">
      <div class="when">${esc(e.end)}</div>
      <div>
        <h3>${esc(e.school)}</h3>
        <p>${esc(e.degree)}</p>
        <p class="where">${esc(e.location)}</p>
        ${e.notes?.length ? bulletsHtml(e.notes) : ""}
      </div>
    </article>`
    )
    .join("");

  const tt = d.beyond.tableTennis;
  const sp = d.beyond.spyder;
  $("beyondList").innerHTML = `
    <div class="tt">
      <h3>${esc(tt.title)}</h3>
      <div class="head">
        <div class="stat" aria-hidden="true">${esc(tt.stat)}</div>
        <p class="stat-l">${esc(tt.statLabel)}</p>
      </div>
      <p>${esc(tt.text)}</p>
      <div class="game-wrap">
        <canvas class="game" id="game" width="640" height="360" tabindex="0"
          role="application" aria-label="Table tennis rally game. Move the paddle with the mouse, touch, or the up and down arrow keys. Press Enter or click to serve."></canvas>
        <p class="game-hint">${esc(tt.gameHint || "")}</p>
      </div>
    </div>
    <div class="spyder">
      <h3>${esc(sp.title)}</h3>
      <p>${esc(sp.text)}</p>
      <dl class="specs">
        ${sp.specs.map((s) => `<div><dt>${esc(s.k)}</dt><dd>${esc(s.v)}</dd></div>`).join("")}
      </dl>
    </div>`;

  $("contactBox").innerHTML = `
    <a class="mail" href="mailto:${esc(b.email)}">${esc(b.email)}</a>
    <button class="btn" type="button" id="copyMail">Copy email</button>
    <span class="meta">${esc(b.location)}</span>
    ${linkList(b.links)}
    <a href="${esc(b.resume)}" download>Resume (PDF)</a>`;

  $("footText").textContent = `© ${new Date().getFullYear()} ${b.name}`;
}

/* ---------- hiring-focus switch ---------- */
function initLens(d) {
  const row = $("lensRow");
  const lenses = d.lenses || [];
  const defaultPitch = "Pick a focus and I will highlight the work that fits it best.";
  row.innerHTML =
    `<button class="chip-btn" type="button" data-lens-id="all" aria-pressed="true">Show everything</button>` +
    lenses.map((l) => `<button class="chip-btn" type="button" data-lens-id="${esc(l.id)}" aria-pressed="false">${esc(l.label)}</button>`).join("");
  $("lensPitch").textContent = defaultPitch;

  function apply(id) {
    row.querySelectorAll(".chip-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lensId === id)));
    document.querySelectorAll("[data-lens]").forEach((el) => {
      const tags = (el.dataset.lens || "").split(" ").filter(Boolean);
      el.classList.remove("dim", "on");
      if (id === "all" || !tags.length) return;
      el.classList.add(tags.includes(id) ? "on" : "dim");
    });
    const l = lenses.find((x) => x.id === id);
    $("lensPitch").textContent = l ? l.pitch : defaultPitch;
  }
  row.addEventListener("click", (e) => {
    const b = e.target.closest(".chip-btn");
    if (b) apply(b.dataset.lensId);
  });
}

/* ---------- dial stories ---------- */
function initStories() {
  const dlg = $("story");
  function open(i) {
    const g = stories[i];
    const s = g?.story;
    if (!s) return;
    $("storyBody").innerHTML = `
      <p class="where">${esc(s.where)}</p>
      <h3 id="storyTitle">${esc(s.title)}</h3>
      <p class="result">${esc(s.result)}</p>
      <h4>How I did it</h4>
      <ul>${s.how.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
      <ul class="tags">${(s.tools || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <button class="story-close" type="button">Close</button>`;
    dlg.showModal();
  }
  $("cluster").addEventListener("click", (e) => {
    const btn = e.target.closest(".dial");
    if (!btn) return;
    const i = Number(btn.dataset.story);
    if (i === 0 && !reduceMotion) {
      // Rev the needle to the redline, then open the card.
      const c = $("cluster");
      c.classList.add("rev");
      setTimeout(() => { c.classList.remove("rev"); open(i); }, 380);
    } else {
      open(i);
    }
  });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest(".story-close")) dlg.close();
  });
}

/* ---------- demo 1: budget vs actuals ---------- */
const money = (n) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}K`;
const signed = (n) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}K`;
const pct = (n, d = 1) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(d)}%`;

function initVariance(cfg) {
  const root = $("panel-var");
  const lines = cfg.lines;
  const mult = lines.map(() => 100);

  root.innerHTML = `
    <h3>${esc(cfg.title)}</h3>
    <p class="intro">${esc(cfg.intro)}</p>
    <div class="presets" id="vPresets">${cfg.presets.map((p, i) => `<button type="button" data-p="${i}">${esc(p.label)}</button>`).join("")}</div>
    <table class="vtable">
      <thead><tr><th>Line item (${esc(cfg.unit)})</th><th>Budget</th><th>Actual</th><th>Variance</th><th>Variance %</th><th>Result</th></tr></thead>
      <tbody id="vBody">
        ${lines.map((l, i) => `
          <tr data-i="${i}">
            <td>${esc(l.name)}</td>
            <td data-l="Budget">${money(l.budget)}</td>
            <td class="sl" data-l="Actual"><input type="range" min="70" max="130" step="1" value="100" aria-label="${esc(l.name)} actual as a percent of budget"><span class="aval"></span></td>
            <td data-l="Variance"><span class="vd"></span><div class="vbar"><i></i></div></td>
            <td data-l="Variance %" class="vp"></td>
            <td data-l="Result" class="vr"></td>
          </tr>`).join("")}
        <tr class="tot">
          <td>Operating income</td>
          <td data-l="Budget" id="oiB"></td>
          <td data-l="Actual" id="oiA"></td>
          <td data-l="Variance" id="oiV"></td>
          <td data-l="Variance %" id="oiP"></td>
          <td data-l="Result" id="oiR"></td>
        </tr>
      </tbody>
    </table>
    <div class="commentary" id="vComm" aria-live="polite"></div>`;

  const rows = [...root.querySelectorAll("tbody tr[data-i]")];

  function badge(kind) {
    const t = kind === "f" ? "Favorable" : kind === "u" ? "Unfavorable" : "On plan";
    return `<span class="badge ${kind}">${t}</span>`;
  }

  function update() {
    let oiBud = 0, oiAct = 0;
    const impacts = [];
    lines.forEach((l, i) => {
      const act = Math.round((l.budget * mult[i]) / 100);
      const v = act - l.budget;
      const p = (v / l.budget) * 100;
      const fav = l.type === "revenue" ? v > 0 : v < 0;
      const kind = v === 0 ? "n" : fav ? "f" : "u";
      const impact = l.type === "revenue" ? v : -v;
      oiBud += l.type === "revenue" ? l.budget : -l.budget;
      oiAct += l.type === "revenue" ? act : -act;
      impacts.push({ name: l.name, type: l.type, v, p, impact });

      const r = rows[i];
      r.querySelector(".aval").textContent = ` ${money(act)}`;
      r.querySelector(".vd").textContent = v === 0 ? "$0K" : signed(v);
      r.querySelector(".vp").textContent = v === 0 ? "0.0%" : pct(p);
      r.querySelector(".vr").innerHTML = badge(kind);
      const bar = r.querySelector(".vbar i");
      const w = Math.min(Math.abs(p), 30) / 30 * 50;
      bar.style.width = `${w}%`;
      bar.style.left = p >= 0 ? "50%" : `${50 - w}%`;
      bar.style.background = kind === "f" ? "var(--ok)" : kind === "u" ? "var(--bad)" : "var(--muted)";
    });

    const oiV = oiAct - oiBud;
    const oiP = (oiV / oiBud) * 100;
    const oiKind = oiV === 0 ? "n" : oiV > 0 ? "f" : "u";
    $("oiB").textContent = money(oiBud);
    $("oiA").textContent = money(oiAct);
    $("oiV").textContent = oiV === 0 ? "$0K" : signed(oiV);
    $("oiP").textContent = oiV === 0 ? "0.0%" : pct(oiP);
    $("oiR").innerHTML = badge(oiKind);

    // Auto-generated driver commentary
    const revBud = lines.filter((l) => l.type === "revenue").reduce((s, l) => s + l.budget, 0);
    const revAct = lines.reduce((s, l, i) => s + (l.type === "revenue" ? Math.round((l.budget * mult[i]) / 100) : 0), 0);
    const mBud = (oiBud / revBud) * 100;
    const mAct = (oiAct / revAct) * 100;
    const out = [];
    if (Math.abs(oiP) < 0.5) {
      out.push(`Operating income is on plan at ${money(oiAct)}.`);
    } else {
      out.push(`Operating income is ${money(Math.abs(oiV))} (${Math.abs(oiP).toFixed(1)}%) ${oiV > 0 ? "above" : "below"} budget, at ${money(oiAct)} against ${money(oiBud)}.`);
    }
    const sorted = [...impacts].sort((a, b) => a.impact - b.impact);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    if (worst.impact < -0.5) {
      const dir = worst.type === "revenue" ? "below" : "above";
      out.push(`Biggest drag: ${worst.name}, ${money(Math.abs(worst.v))} (${Math.abs(worst.p).toFixed(1)}%) ${dir} budget.`);
    }
    if (best.impact > 0.5) {
      const dir = best.type === "revenue" ? "above" : "below";
      out.push(`Biggest help: ${best.name}, ${money(Math.abs(best.v))} (${Math.abs(best.p).toFixed(1)}%) ${dir} budget.`);
    }
    out.push(`Operating margin is ${mAct.toFixed(1)}% against ${mBud.toFixed(1)}% budgeted.`);
    $("vComm").innerHTML = out.map((t) => `<p>${esc(t)}</p>`).join("");
  }

  rows.forEach((r, i) => {
    r.querySelector("input").addEventListener("input", (e) => {
      mult[i] = Number(e.target.value);
      update();
    });
  });
  $("vPresets").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-p]");
    if (!b) return;
    const p = cfg.presets[Number(b.dataset.p)];
    p.mult.forEach((m, i) => {
      mult[i] = Math.round(m * 100);
      rows[i].querySelector("input").value = mult[i];
    });
    update();
  });
  update();
}

/* ---------- demo 2: Monte Carlo planner ---------- */
const MC = { paths: 1500, maxMonths: 480 };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function initMonteCarlo(cfg) {
  const root = $("panel-mc");
  const df = cfg.defaults;
  const fmtMoney = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
  const compact = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);

  const controls = [
    { id: "start", label: "Starting balance", min: 0, max: 250000, step: 1000, val: df.start, fmt: fmtMoney },
    { id: "monthly", label: "Added each month", min: 0, max: 5000, step: 50, val: df.monthly, fmt: fmtMoney },
    { id: "ret", label: "Expected yearly return", min: 0, max: 15, step: 0.5, val: df.ret, fmt: (v) => `${v}%` },
    { id: "vol", label: "Yearly volatility", min: 5, max: 35, step: 1, val: df.vol, fmt: (v) => `${v}%` },
    { id: "years", label: "Years", min: 5, max: 40, step: 1, val: df.years, fmt: (v) => `${v}` }
  ];

  root.innerHTML = `
    <h3>${esc(cfg.title)}</h3>
    <p class="intro">${esc(cfg.intro)}</p>
    <div class="mc-grid">
      <div class="mc-ctl">
        ${controls.map((c) => `
          <label for="mc-${c.id}">${esc(c.label)} <output id="mco-${c.id}"></output></label>
          <input id="mc-${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.val}">`).join("")}
      </div>
      <div>
        <div class="mc-chart"><canvas id="mcCanvas" role="img" aria-label="Fan chart of simulated balances over time"></canvas></div>
        <p class="mc-note" id="mcNote">Hover or touch the chart to read a year.</p>
        <div class="mc-read" id="mcRead"></div>
      </div>
    </div>`;

  // Fixed random numbers, so moving a slider changes the result smoothly instead of reshuffling it.
  const rand = mulberry32(918);
  const Z = new Float32Array(MC.paths * MC.maxMonths);
  for (let i = 0; i < Z.length; i += 2) {
    const u1 = Math.max(rand(), 1e-12), u2 = rand();
    const m = Math.sqrt(-2 * Math.log(u1));
    Z[i] = m * Math.cos(2 * Math.PI * u2);
    if (i + 1 < Z.length) Z[i + 1] = m * Math.sin(2 * Math.PI * u2);
  }

  const canvas = $("mcCanvas");
  const ctx = canvas.getContext("2d");
  let res = null;
  let hoverMonth = null;

  function val(id) { return Number($(`mc-${id}`).value); }

  function simulate() {
    const start = val("start"), monthly = val("monthly");
    const mu = val("ret") / 100 / 12;
    const sig = val("vol") / 100 / Math.sqrt(12);
    const months = val("years") * 12;
    const P = MC.paths;
    const bal = new Float64Array(P).fill(start);
    const p10 = new Float64Array(months + 1), p25 = new Float64Array(months + 1), p50 = new Float64Array(months + 1),
      p75 = new Float64Array(months + 1), p90 = new Float64Array(months + 1);
    const slice = new Float64Array(P);
    const fill = (m) => {
      slice.set(bal);
      slice.sort();
      p10[m] = slice[Math.floor(P * 0.1)]; p25[m] = slice[Math.floor(P * 0.25)];
      p50[m] = slice[Math.floor(P * 0.5)]; p75[m] = slice[Math.floor(P * 0.75)]; p90[m] = slice[Math.floor(P * 0.9)];
    };
    fill(0);
    for (let m = 1; m <= months; m++) {
      const off = (m - 1) * P;
      for (let p = 0; p < P; p++) {
        const r = Math.max(mu + sig * Z[off + p], -0.95);
        bal[p] = (bal[p] + monthly) * (1 + r);
      }
      fill(m);
    }
    res = { months, start, monthly, p10, p25, p50, p75, p90 };
  }

  function readout() {
    const r = res, m = r.months;
    const contributed = r.start + r.monthly * m;
    $("mcRead").innerHTML = `
      <div><small>Unlucky case (10th percentile)</small><b>${fmtMoney(r.p10[m])}</b></div>
      <div><small>Middle case (median)</small><b>${fmtMoney(r.p50[m])}</b></div>
      <div><small>Lucky case (90th percentile)</small><b>${fmtMoney(r.p90[m])}</b></div>
      <div style="grid-column:1/-1"><small>Total you put in over ${m / 12} years</small><b>${fmtMoney(contributed)}</b></div>`;
  }

  function draw() {
    if (!res || root.hidden) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;
    const pad = { l: 58, r: 14, t: 14, b: 30 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const r = res, M = r.months;
    const yMax = Math.max(r.p90[M], 1) * 1.05;
    const X = (m) => pad.l + (m / M) * iw;
    const Y = (v) => pad.t + ih - (v / yMax) * ih;

    ctx.clearRect(0, 0, W, H);
    ctx.font = "500 12px Barlow, Arial, sans-serif";
    ctx.fillStyle = "#8b9097";
    ctx.strokeStyle = "#2b2e33";
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = (yMax * i) / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText(compact(v), pad.l - 8, y + 4);
    }
    const yrs = M / 12;
    const stepY = yrs <= 10 ? 2 : yrs <= 20 ? 5 : 10;
    for (let y = 0; y <= yrs; y += stepY) {
      ctx.textAlign = y === 0 ? "left" : y + stepY > yrs ? "right" : "center";
      ctx.fillText(`Yr ${y}`, X(y * 12), H - 10);
    }

    const band = (lo, hi, color) => {
      ctx.beginPath();
      for (let m = 0; m <= M; m++) ctx[m ? "lineTo" : "moveTo"](X(m), Y(hi[m]));
      for (let m = M; m >= 0; m--) ctx.lineTo(X(m), Y(lo[m]));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    };
    band(r.p10, r.p90, "rgba(78,155,214,.22)");
    band(r.p25, r.p75, "rgba(78,155,214,.38)");

    ctx.setLineDash([5, 5]); ctx.strokeStyle = "#8b9097"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let m = 0; m <= M; m++) ctx[m ? "lineTo" : "moveTo"](X(m), Y(r.start + r.monthly * m));
    ctx.stroke(); ctx.setLineDash([]);

    ctx.strokeStyle = "#7CC0F0"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let m = 0; m <= M; m++) ctx[m ? "lineTo" : "moveTo"](X(m), Y(r.p50[m]));
    ctx.stroke();

    if (hoverMonth !== null) {
      const m = hoverMonth, x = X(m);
      ctx.strokeStyle = "#D3202F"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ih); ctx.stroke();
      [[r.p90, "#fff"], [r.p50, "#7CC0F0"], [r.p10, "#fff"]].forEach(([arr, c]) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, Y(arr[m]), 4, 0, 7); ctx.fill();
      });
    }
    canvas._geom = { pad, iw, M };
  }

  function note() {
    const el = $("mcNote");
    if (hoverMonth === null) { el.textContent = "Hover or touch the chart to read a year."; return; }
    const m = hoverMonth, r = res;
    el.textContent = `Year ${(m / 12).toFixed(1)}: middle case ${fmtMoney(r.p50[m])}. In 1 of 10 runs it is below ${fmtMoney(r.p10[m])}, and in 1 of 10 it is above ${fmtMoney(r.p90[m])}.`;
  }

  function onPointer(e) {
    if (!canvas._geom) return;
    const { pad, iw, M } = canvas._geom;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - pad.l;
    hoverMonth = Math.max(0, Math.min(M, Math.round((x / iw) * M)));
    draw(); note();
  }
  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("pointerdown", onPointer);
  canvas.addEventListener("pointerleave", () => { hoverMonth = null; draw(); note(); });

  function refresh() {
    controls.forEach((c) => { $(`mco-${c.id}`).textContent = c.fmt(val(c.id)); });
    simulate(); readout(); draw();
    if (hoverMonth !== null) { hoverMonth = Math.min(hoverMonth, res.months); note(); }
  }
  let raf = 0;
  controls.forEach((c) => $(`mc-${c.id}`).addEventListener("input", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(refresh);
  }));
  window.addEventListener("resize", () => draw());
  refresh();
  return { redraw: () => { refresh(); } };
}

function initTabs(mc) {
  const tabs = [$("tab-var"), $("tab-mc")];
  const panels = [$("panel-var"), $("panel-mc")];
  function show(i) {
    tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(i === j)); t.tabIndex = i === j ? 0 : -1; });
    panels.forEach((p, j) => { p.hidden = i !== j; });
    if (i === 1) mc.redraw();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(i));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const n = (i + (e.key === "ArrowRight" ? 1 : 1 * -1) + tabs.length) % tabs.length;
        show(n); tabs[n].focus();
      }
    });
  });
}

/* ---------- table tennis rally game ---------- */
function initGame() {
  const cv = $("game");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const PW = 10, PH = 68, PX = 24, R = 7;
  let state = "idle"; // idle | play | over
  let paddleY = H / 2, targetY = H / 2;
  let ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let score = 0;
  let best = Number(store.get("rallyBest")) || 0;
  let last = 0, running = false, visible = false;
  const keys = { up: false, down: false };

  function serve() {
    ball = { x: PX + PW + 30, y: paddleY, vx: 290, vy: (Math.random() * 2 - 1) * 140 };
    score = 0; state = "play";
  }

  function update(dt) {
    if (keys.up) targetY -= 420 * dt;
    if (keys.down) targetY += 420 * dt;
    targetY = Math.max(PH / 2, Math.min(H - PH / 2, targetY));
    paddleY += (targetY - paddleY) * Math.min(1, dt * 28);
    if (state !== "play") return;

    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }
    if (ball.y > H - R) { ball.y = H - R; ball.vy = -Math.abs(ball.vy); }
    if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }

    if (ball.vx < 0 && ball.x - R <= PX + PW && ball.x > PX - 4 && Math.abs(ball.y - paddleY) <= PH / 2 + R) {
      ball.x = PX + PW + R;
      ball.vx = Math.min(Math.abs(ball.vx) * 1.06, 680);
      const off = (ball.y - paddleY) / (PH / 2);
      ball.vy = Math.max(-380, Math.min(380, off * 300 + ball.vy * 0.25));
      score++;
      if (score > best) { best = score; store.set("rallyBest", String(best)); }
    }
    if (ball.x < -R) state = "over";
  }

  function draw() {
    ctx.fillStyle = "#121315"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#2b2e33"; ctx.lineWidth = 2; ctx.strokeRect(8, 8, W - 16, H - 16);
    ctx.setLineDash([8, 10]); ctx.beginPath(); ctx.moveTo(W - 12, 8); ctx.lineTo(W - 12, H - 8); ctx.stroke(); ctx.setLineDash([]);

    ctx.textAlign = "center";
    ctx.fillStyle = "#D6D9DC";
    ctx.font = "700 26px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.fillText(`Rally ${score}   Best ${best}`, W / 2, 40);

    ctx.fillStyle = "#D3202F";
    ctx.beginPath(); ctx.roundRect(PX, paddleY - PH / 2, PW, PH, 5); ctx.fill();

    if (state !== "idle") {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2); ctx.fill();
    }
    if (state !== "play") {
      ctx.fillStyle = "rgba(18,19,21,.72)"; ctx.fillRect(0, H / 2 - 52, W, 104);
      ctx.fillStyle = "#fff";
      ctx.font = "700 34px 'Barlow Condensed', 'Arial Narrow', sans-serif";
      ctx.fillText(state === "idle" ? "Click or press Enter to serve" : `Missed it. Rally of ${score}`, W / 2, H / 2 - 4);
      ctx.fillStyle = "#9AA0A6";
      ctx.font = "500 18px Barlow, Arial, sans-serif";
      ctx.fillText(state === "idle" ? "Move your mouse or finger up and down" : "Click or press Enter to go again", W / 2, H / 2 + 28);
    }
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min((t - last) / 1000, 0.033) || 0.016;
    last = t;
    update(dt); draw();
    if (state === "play" || Math.abs(targetY - paddleY) > 0.5 || keys.up || keys.down) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() {
    if (running || !visible) { if (!visible) draw(); return; }
    running = true; last = performance.now(); requestAnimationFrame(frame);
  }

  function setY(e) {
    const rect = cv.getBoundingClientRect();
    targetY = ((e.clientY - rect.top) / rect.height) * H;
    kick();
  }
  cv.addEventListener("pointermove", setY);
  cv.addEventListener("pointerdown", (e) => {
    setY(e);
    if (state !== "play") serve();
    kick();
  });
  cv.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { keys.up = true; e.preventDefault(); kick(); }
    else if (e.key === "ArrowDown") { keys.down = true; e.preventDefault(); kick(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (state !== "play") serve(); kick(); }
  });
  cv.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp") keys.up = false;
    if (e.key === "ArrowDown") keys.down = false;
  });
  cv.addEventListener("blur", () => { keys.up = keys.down = false; });

  // Only run while on screen.
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) kick(); else running = false;
  }, { threshold: 0.2 }).observe(cv);

  draw();
}

/* ---------- scroll gauge, nav highlight, theme, copy ---------- */
function initChrome() {
  // Scroll gauge
  const track = $("tachTrack"), val = $("tachVal"), needle = $("tachNeedle"), gear = $("tachGear"), tach = $("tach");
  const d = arcPath(50, 50, 40, START, START + SWEEP);
  track.setAttribute("d", d); val.setAttribute("d", d);
  const gearMap = { top: 1, lens: 1, experience: 2, projects: 3, playground: 4, skills: 5, education: 5, beyond: 6, contact: 7 };
  const names = { top: "Top", lens: "Top", experience: "Experience", projects: "Projects", playground: "Try it", skills: "Skills", education: "Education", beyond: "Beyond the desk", contact: "Contact" };
  let current = "top", ticking = false;

  function paint() {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    val.style.strokeDashoffset = String(1 - p);
    needle.style.transform = `rotate(${START + SWEEP * p}deg)`;
    gear.textContent = String(gearMap[current] || 1);
    tach.setAttribute("aria-label", `Back to top. Now in ${names[current] || "Top"}.`);
  }
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  tach.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  // Section tracking
  const ids = Object.keys(gearMap);
  const links = [...document.querySelectorAll("#nav a")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      current = en.target.id;
      links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${current}`));
      queue();
    });
  }, { rootMargin: "-35% 0px -60% 0px" });
  ids.forEach((id) => { const el = $(id); if (el) io.observe(el); });
  paint();

  // Hero dials sweep once after first paint
  requestAnimationFrame(() => requestAnimationFrame(() => $("cluster").classList.add("live")));

  // Theme
  const root = document.documentElement;
  const btn = $("themeBtn");
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const effective = () => root.dataset.theme || (mq.matches ? "dark" : "light");
  const label = () => { btn.textContent = effective() === "dark" ? "Light mode" : "Dark mode"; };
  const saved = store.get("theme");
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  label();
  btn.addEventListener("click", () => {
    const next = effective() === "dark" ? "light" : "dark";
    root.dataset.theme = next; store.set("theme", next); label();
  });

  // Copy email
  const copy = $("copyMail");
  if (copy) copy.addEventListener("click", async () => {
    const mail = DATA.basics.email;
    try { await navigator.clipboard.writeText(mail); toast("Email copied"); }
    catch { window.location.href = `mailto:${mail}`; }
  });
}

/* ---------- start ---------- */
fetch("resume.json", { cache: "no-cache" })
  .then((r) => {
    if (!r.ok) throw new Error(`resume.json returned ${r.status}`);
    return r.json();
  })
  .then((d) => {
    render(d);
    initLens(d);
    initStories();
    initVariance(d.playground.variance);
    const mc = initMonteCarlo(d.playground.monteCarlo);
    initTabs(mc);
    initGame();
    initChrome();
  })
  .catch((e) => {
    const p = document.createElement("p");
    p.className = "err";
    p.textContent = "Could not load the page content. If you opened index.html directly from your files, run a local server instead (see README). " + e.message;
    document.querySelector("main").prepend(p);
    console.error(e);
  });
