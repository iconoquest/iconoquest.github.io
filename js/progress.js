var KEY = "iconoquest-run";

function load() {
  let run = { group: "", done: [] };
  try { run = { group: "", done: [], ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) {}
  if (!Array.isArray(run.done)) run.done = [];
  return run;
}

var run = load();

function saveRun() {
  try { localStorage.setItem(KEY, JSON.stringify(run)); } catch (e) {}
}

function setGroup(key) {
  if (!TEAMS[key]) return;
  run.group = key;
  saveRun();
}

function markDone(id) {
  if (!run.done.includes(id)) run.done.push(id);
  saveRun();
}

function isUnlocked(id) {
  const i = STAGES.findIndex((s) => s.id === id);
  return i <= 0 || STAGES.slice(0, i).every((s) => run.done.includes(s.id));
}

function groupLabel() {
  return TEAMS[run.group] ? TEAMS[run.group].name : "";
}

function nextHref(id, root) {
  const i = STAGES.findIndex((s) => s.id === id);
  const next = STAGES[i + 1];
  if (!next) return root + "index.html";
  return root + next.dir + "/index.html";
}
