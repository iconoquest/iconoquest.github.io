const root = document.body.dataset.root || "";
const page = document.body.dataset.page || "home";
const $ = (id) => document.getElementById(id);

const DEF = { theme: "parchment", bg: "", accent: "", fs: 16, vol: 80, rate: 95, sfx: true, motion: true, anon: false };
let S = { ...DEF };
try { S = { ...DEF, ...JSON.parse(localStorage.getItem("iconoquest") || "{}") }; } catch (e) {}
const saveSettings = () => { try { localStorage.setItem("iconoquest", JSON.stringify(S)); } catch (e) {} };

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

function applySettings() {
  const r = document.documentElement;
  const st = r.style;
  r.dataset.theme = S.theme;
  r.dataset.motion = S.motion ? "on" : "off";
  st.setProperty("--fs", S.fs + "px");
  ["--bg", "--text", "--accent-ink"].forEach((p) => st.removeProperty(p));
  if (S.bg) {
    const dark = lum(S.bg) < 0.55;
    st.setProperty("--bg", S.bg);
    st.setProperty("--text", dark ? "#f1f5f9" : "#1c1a16");
  }
  if (S.accent) {
    st.setProperty("--accent", S.accent);
    st.setProperty("--accent-ink", lum(S.accent) > 0.55 ? "#14110a" : "#fff");
  } else st.removeProperty("--accent");
}

let toastT;
function toast(msg, type = "") {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast on " + type;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.className = "toast"; }, 3200);
}

let actx;
function beep(freq = 660) {
  if (!S.sfx || !S.vol) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.frequency.value = freq;
    o.type = "sine";
    g.gain.setValueAtTime((S.vol / 100) * 0.25, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.25);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + 0.25);
  } catch (e) {}
}

function speak(text) {
  if (!("speechSynthesis" in window)) return toast("Ο browser δεν υποστηρίζει φωνητική ανάγνωση.", "bad");
  speechSynthesis.cancel();
  const m = new SpeechSynthesisUtterance(text);
  m.lang = "el-GR";
  m.volume = S.vol / 100;
  m.rate = S.rate / 100;
  speechSynthesis.speak(m);
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function goNext(id) {
  location.href = nextHref(id, root);
}

async function submitAndGo(id, team, activity, question, answer) {
  markDone(id);
  await saveRecord(team, activity, question, answer);
  goNext(id);
}

function paintGroupNote() {
  const note = $("groupNote");
  if (!note) return;
  note.textContent = groupLabel() ? `Ομάδα: ${groupLabel()}` : "";
}

function renderHome() {
  const line = $("groupLine");
  if (line) line.textContent = groupLabel() || "Στο 1ο στάδιο δηλώνετε την ομάδα σας. Ισχύει για όλα τα επόμενα.";
  const box = $("cards");
  if (!box) return;
  box.innerHTML = STAGES.map((s) => {
    const locked = !isUnlocked(s.id);
    const done = run.done.includes(s.id);
    const href = locked ? "#" : `${root}${s.dir}/index.html`;
    return `<a class="card${locked ? " is-locked" : ""}${done ? " is-done" : ""}" href="${href}" ${locked ? 'aria-disabled="true"' : ""}>
      <span class="tag">${s.tag}</span>
      <span class="t">${s.title}<span class="d">${locked ? "Κλειδωμένο — ολοκληρώστε το προηγούμενο στάδιο" : s.blurb}</span></span>
    </a>`;
  }).join("");
  box.onclick = (e) => {
    const a = e.target.closest("a.is-locked");
    if (a) e.preventDefault();
  };
}

function guard() {
  const stage = STAGES.find((s) => s.dir === page);
  if (!stage) return true;
  if (!isUnlocked(stage.id)) {
    $("stage").innerHTML = `<h1>${stage.tag}</h1><p class="sec-note">Αυτό το στάδιο είναι ακόμη κλειδωμένο.</p><p><a class="btn" href="${root}index.html">Επιστροφή</a></p>`;
    return false;
  }
  if (stage.id !== "stage1" && !groupLabel()) {
    location.href = `${root}eisagogi/index.html`;
    return false;
  }
  return true;
}

function bindEisagogi() {
  const tabs = document.querySelectorAll("[data-team]");
  const note = $("groupNote");
  const paint = () => {
    tabs.forEach((b) => b.classList.toggle("on", b.dataset.team === run.group));
    if (note) note.textContent = run.group ? `${TEAMS[run.group].name} — ισχύει για όλα τα στάδια.` : "Η επιλογή γίνεται μία φορά, εδώ.";
  };
  tabs.forEach((b) => b.addEventListener("click", () => { setGroup(b.dataset.team); paint(); }));
  paint();
  $("send").addEventListener("click", () => {
    if (!groupLabel()) return toast("Διαλέξτε την ομάδα σας. Ισχύει για όλα τα στάδια.", "bad");
    const answer = $("answer").value;
    if (!answer.trim()) return toast("Συμπληρώστε την απάντηση πριν την αποστολή.", "bad");
    submitAndGo("stage1", groupLabel(), "1ο Στάδιο: Εισαγωγή", "Παρατήρηση και Υποθέσεις", answer);
  });
}

function bindChronologio() {
  paintGroupNote();
  $("listen").addEventListener("click", () => speak(SPEECH));
  $("check").addEventListener("click", () => {
    const ok = EV.every((e, i) => $("ev" + i).value === e[1]);
    const fb = $("tlFb");
    fb.className = "fb " + (ok ? "ok" : "bad");
    fb.textContent = ok ? "Σωστά. Πάμε στο επόμενο στάδιο." : "Λάθος σειρά. Ελέγξτε τις χρονολογίες και προσπαθήστε ξανά.";
    beep(ok ? 880 : 220);
    if (ok) {
      markDone("chronologio");
      setTimeout(() => goNext("chronologio"), 600);
    }
  });
}

function bindPiges() {
  const d = TEAMS[run.group];
  $("mission").innerHTML = `<h2>${d.name}</h2><p><strong>Αποστολή:</strong> ${d.mission}</p><p style="color:var(--info)"><strong>Ερώτηση: ${d.question}</strong></p><p class="sec-note">${d.source}</p>`;
  $("send").addEventListener("click", () => {
    const answer = $("answer").value;
    if (!answer.trim()) return toast("Συμπληρώστε την απάντηση πριν την αποστολή.", "bad");
    submitAndGo("piges", groupLabel(), "Ιστορικές Πηγές", "Ερωτήσεις ανά Ομάδα", answer);
  });
}

function bindDecode() {
  paintGroupNote();
  $("send").addEventListener("click", () => {
    const answer = $("answer").value;
    if (!answer.trim()) return toast("Συμπληρώστε την απάντηση πριν την αποστολή.", "bad");
    submitAndGo("decode", groupLabel(), "Decode the Icon", "Συμβολισμοί και Θεολογικό Μήνυμα", answer);
  });
}

function bindQuiz() {
  paintGroupNote();
  const host = $("quiz");
  const send = $("send");
  const picks = [];
  let idx = -1;
  let left = 0;
  let total = 0;
  let timer = null;
  let gen = 0;

  host.innerHTML = `<p class="sec-note">Οι ερωτήσεις έρχονται μία μία. Η 1η διαρκεί 20 δευτερόλεπτα και οι επόμενες 30. Μόλις τελειώσει ο χρόνος, περνάει η επόμενη.</p>`;
  send.textContent = "Έναρξη";

  const stop = () => { clearInterval(timer); timer = null; };
  window.addEventListener("pagehide", stop);

  const paintTime = () => {
    const t = $("qTime");
    const bar = $("qBar");
    if (t) {
      t.textContent = String(left);
      t.classList.toggle("low", left <= 5);
    }
    if (bar) bar.style.width = (total ? Math.max(0, left / total) * 100 : 0) + "%";
  };

  const currentPick = () => {
    const r = host.querySelector('input[name="q"]:checked');
    return r ? +r.value : -1;
  };

  const finish = () => {
    stop();
    const name = $("qName").value.trim();
    const score = picks.filter((p, i) => p === QUIZ[i].c).length;
    const answerText = (p, i) => (p < 0 ? "Χωρίς απάντηση" : QUIZ[i].a[p]);
    const detail = picks.map((p, i) => `${i + 1}) ${p === QUIZ[i].c ? "✓" : "✗"} ${answerText(p, i)}`).join(" | ");
    markDone("challenge");
    host.innerHTML = `<div class="score">${score} / 5 — ${score * 20}%</div>` + QUIZ.map((q, i) => `
      <div class="box"><strong>${i + 1}. ${esc(q.q)}</strong>
      <p style="margin-top:6px">Η απάντησή σου: ${esc(answerText(picks[i], i))}</p>
      <p style="font-weight:600;color:var(--${picks[i] === q.c ? "ok" : "bad"})">${picks[i] === q.c ? "✓ Σωστή απάντηση" : "✗ Λάθος — Σωστό: " + esc(q.a[q.c])}</p></div>`).join("");
    send.hidden = true;
    beep(score >= 3 ? 880 : 330);
    saveRecord(`${groupLabel()} · ${name}`, "Quiz Εικονομαχίας", "Quiz 5 ερωτήσεων", `Βαθμός: ${score}/5 (${score * 20}%) | ${detail}`);
    setTimeout(() => goNext("challenge"), 1600);
  };

  const advance = () => {
    if (idx < 0) return;
    const i = idx;
    idx = -1;
    gen += 1;
    stop();
    picks[i] = currentPick();
    if (i + 1 >= QUIZ.length) finish();
    else show(i + 1);
  };

  const show = (i) => {
    stop();
    const g = ++gen;
    idx = i;
    const q = QUIZ[i];
    total = q.t;
    left = total;
    host.innerHTML = `
      <div class="q-meta"><span>Ερώτηση ${i + 1} / ${QUIZ.length}</span><span class="q-time" id="qTime">${left}</span></div>
      <div class="q-bar" aria-hidden="true"><span id="qBar"></span></div>
      <div class="q-title">${esc(q.q)}</div>
      ${q.a.map((a, j) => `<label class="opt"><input type="radio" name="q" value="${j}">${esc(a)}</label>`).join("")}`;
    send.textContent = i === QUIZ.length - 1 ? "Τέλος" : "Επόμενη";
    paintTime();
    timer = setInterval(() => {
      if (g !== gen) return;
      left -= 1;
      paintTime();
      if (left <= 0) advance();
    }, 1000);
  };

  send.addEventListener("click", () => {
    if (idx < 0 && !picks.length) {
      if (!$("qName").value.trim()) return toast("Συμπληρώστε το όνομά σας.", "bad");
      $("qName").readOnly = true;
      show(0);
      return;
    }
    advance();
  });
}

function bindTeliki() {
  paintGroupNote();
  $("send").addEventListener("click", () => {
    if (!$("f1").value.trim()) return toast("Απαντήστε τουλάχιστον στην ερώτηση 1.", "bad");
    const who = $("fId").value.trim();
    const c = `1) Εικονομαχία: ${$("f1").value} | 2) Λατρεία vs Προσκύνηση: ${$("f2").value} | 3) Νέο μήνυμα: ${$("f3").value}`;
    submitAndGo("stage6", who ? `${groupLabel()} · ${who}` : groupLabel(), "Τελική Αποστολή (Exit Ticket)", "Ατομικές ερωτήσεις αξιολόγησης", c);
  });
}

let cloudRows = [];
function renderDash() {
  const list = $("dashList");
  if (!list) return;
  const f = $("dashFilter").value;
  const rows = f ? cloudRows.filter((r) => r.activity === f) : cloudRows;
  $("dashCount").textContent = rows.length;
  list.innerHTML = rows.length ? rows.map((r, i) => `
    <div class="entry"><div class="h"><span>${S.anon ? "Ανώνυμη υποβολή #" + (rows.length - i) : esc(r.team)} · ${esc(r.activity)}</span><span>${esc(r.time || "")}</span></div>
    <div>${esc(r.answer)}</div></div>`).join("")
    : '<p style="text-align:center;padding:20px;color:var(--muted)">Δεν υπάρχουν υποβολές ακόμη.</p>';
}

async function bindDash() {
  const load = async () => {
    $("dashList").innerHTML = '<p style="text-align:center;padding:20px;color:var(--muted)">Φόρτωση δεδομένων…</p>';
    try {
      cloudRows = await loadRecords();
      renderDash();
    } catch (e) {
      console.error(e);
      $("dashList").innerHTML = '<p style="color:var(--bad);text-align:center;padding:20px">Σφάλμα φόρτωσης δεδομένων από τη βάση.</p>';
    }
  };
  $("reload").addEventListener("click", load);
  $("anon").addEventListener("click", () => { S.anon = !S.anon; saveSettings(); renderDash(); });
  $("csv").addEventListener("click", () => {
    if (!cloudRows.length) return toast("Δεν υπάρχουν δεδομένα για εξαγωγή.", "bad");
    const q = (v) => { v = String(v ?? ""); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const csv = "\uFEFF" + "Μάθημα,Ομάδα/Μαθητής,Δραστηριότητα,Ερώτηση,Απάντηση,Χρόνος\n" +
      cloudRows.map((r) => [r.lesson, S.anon ? "Ανώνυμο" : r.team, r.activity, r.question, r.answer, r.time].map(q).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "Iconoquest_Results.csv";
    a.click();
  });
  $("dashFilter").addEventListener("change", renderDash);
  load();
}

function bindArxeio() {
  const nav = $("srcNav");
  if (!nav) return;
  const show = (id) => {
    nav.querySelectorAll("[data-src]").forEach((b) => b.classList.toggle("on", b.dataset.src === id));
    document.querySelectorAll("#sources > section").forEach((s) => {
      s.classList.toggle("is-off", id !== "all" && s.dataset.src !== id);
    });
  };
  nav.addEventListener("click", (e) => {
    const b = e.target.closest("[data-src]");
    if (b) show(b.dataset.src);
  });
}

function bindSettings() {
  const themes = [["navy", "#101b2b", "Μπλε νύχτας"], ["night", "#0b0d12", "Σκούρο"], ["parchment", "#f3ecdc", "Περγαμηνή"], ["contrast", "#000", "Υψηλή αντίθεση"]];
  const accents = ["#d4af37", "#38bdf8", "#34d399", "#f472b6", "#f97316"];
  $("themes").innerHTML = themes.map((t) => `<button type="button" class="${!S.bg && S.theme === t[0] ? "on" : ""}" style="background:${t[1]}" data-theme="${t[0]}" aria-label="${t[2]}"></button>`).join("");
  $("accents").innerHTML = accents.map((c) => `<button type="button" style="background:${c}" data-accent="${c}" class="${S.accent === c ? "on" : ""}" aria-label="${c}"></button>`).join("");
  const paint = () => {
    $("v-fs").textContent = S.fs + "px";
    $("v-vol").textContent = S.vol + "%";
    $("v-rate").textContent = S.rate + "%";
    $("r-fs").value = S.fs;
    $("r-vol").value = S.vol;
    $("r-rate").value = S.rate;
    $("motion").checked = S.motion;
    $("sfx").checked = S.sfx;
    $("anon").checked = S.anon;
  };
  $("themes").onclick = (e) => {
    const b = e.target.closest("[data-theme]");
    if (!b) return;
    S.bg = "";
    S.theme = b.dataset.theme;
    saveSettings();
    applySettings();
    bindSettings();
  };
  $("accents").onclick = (e) => {
    const b = e.target.closest("[data-accent]");
    if (!b) return;
    S.accent = b.dataset.accent;
    saveSettings();
    applySettings();
    bindSettings();
  };
  $("bg").value = S.bg || "#101b2b";
  $("bg").onchange = () => { S.bg = $("bg").value; saveSettings(); applySettings(); };
  $("accent").value = S.accent || "#d4af37";
  $("accent").onchange = () => { S.accent = $("accent").value; saveSettings(); applySettings(); };
  $("r-fs").oninput = () => { S.fs = +$("r-fs").value; saveSettings(); applySettings(); $("v-fs").textContent = S.fs + "px"; };
  $("r-vol").oninput = () => { S.vol = +$("r-vol").value; saveSettings(); $("v-vol").textContent = S.vol + "%"; };
  $("r-vol").onchange = () => beep();
  $("r-rate").oninput = () => { S.rate = +$("r-rate").value; saveSettings(); $("v-rate").textContent = S.rate + "%"; };
  $("motion").onchange = () => { S.motion = $("motion").checked; saveSettings(); applySettings(); };
  $("sfx").onchange = () => { S.sfx = $("sfx").checked; saveSettings(); if (S.sfx) beep(); };
  $("anon").onchange = () => { S.anon = $("anon").checked; saveSettings(); };
  $("voice").onclick = () => speak("Καλώς ήρθατε στο Ικονοκουέστ. Αυτή είναι μια δοκιμή φωνής.");
  $("reset").onclick = () => { S = { ...DEF }; saveSettings(); applySettings(); bindSettings(); toast("Οι ρυθμίσεις επανήλθαν.", "ok"); };
  paint();
}

applySettings();
if (!guard()) {
  /* locked page */
} else if (page === "home") renderHome();
else if (page === "eisagogi") bindEisagogi();
else if (page === "chronologio") bindChronologio();
else if (page === "piges") bindPiges();
else if (page === "decode") bindDecode();
else if (page === "quiz") bindQuiz();
else if (page === "teliki") bindTeliki();
else if (page === "ekpaideftikos") bindDash();
else if (page === "rythmiseis") bindSettings();
else if (page === "arxeio") bindArxeio();
