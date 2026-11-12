/* Content for the index. Edit this list; the page renders it.
   type: "folder" | "text" | "pictures" | "quiz"
   A picture frame uses src when a real file is ready, otherwise a plain stand-in. */
const TREE = [
  {
    id: "notes",
    name: "Notes",
    type: "folder",
    children: [
      {
        id: "read-me",
        name: "Read me",
        type: "text",
        paragraphs: [
          "Sample text. Replace this when the page has real writing.",
          "Each page in the index is writing, a set of pictures, or a short quiz.",
        ],
      },
      {
        id: "drafts",
        name: "Drafts",
        type: "folder",
        children: [
          {
            id: "monday",
            name: "Monday",
            type: "text",
            paragraphs: [
              "Monday is a placeholder note. A few sentences stand in until the real entry is written.",
            ],
          },
          {
            id: "tuesday",
            name: "Tuesday",
            type: "text",
            paragraphs: [
              "Tuesday is another placeholder.",
              "The folder above this page only shows how nesting works.",
              "Nothing on this page is final.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "pictures",
    name: "Pictures",
    type: "folder",
    children: [
      {
        id: "streets",
        name: "Streets",
        type: "pictures",
        frames: [
          { caption: "Picture 1" },
          { caption: "Picture 2" },
          { caption: "Picture 3" },
        ],
      },
      {
        id: "rooms",
        name: "Rooms",
        type: "folder",
        children: [
          {
            id: "kitchen",
            name: "Kitchen",
            type: "pictures",
            frames: [{ caption: "Picture 1" }, { caption: "Picture 2" }],
          },
          {
            id: "window",
            name: "Window",
            type: "pictures",
            frames: [{ caption: "Picture 1" }, { caption: "Picture 2" }],
          },
        ],
      },
    ],
  },
  {
    id: "quiz",
    name: "Quiz",
    type: "folder",
    children: [
      {
        id: "practice",
        name: "Practice",
        type: "quiz",
        intro: "Sample questions. Swap them out later.",
        questions: [
          {
            prompt: "What does the Index button do?",
            choices: ["Changes the page color", "Opens the folder list", "Starts the quiz"],
            answer: 1,
          },
          {
            prompt: "Where do nested folders appear?",
            choices: ["In a new window", "Under the folder you open", "Only inside a quiz"],
            answer: 1,
          },
          {
            prompt: "What can a page hold?",
            choices: ["Writing, pictures, or a quiz", "Only pictures", "Only writing"],
            answer: 0,
          },
        ],
      },
      {
        id: "quick-check",
        name: "Quick check",
        type: "quiz",
        intro: "Another sample quiz.",
        questions: [
          {
            prompt: "Which folder holds the picture pages?",
            choices: ["Notes", "Pictures", "Quiz"],
            answer: 1,
          },
          {
            prompt: "Drafts sits inside which folder?",
            choices: ["Notes", "Pictures", "Quiz"],
            answer: 0,
          },
        ],
      },
    ],
  },
];

const KIND = { text: "Text", pictures: "Images", quiz: "Quiz" };
const FILLS = ["#e4e0d6", "#d7e0d8", "#e6d6cc", "#d9dde3"];

const indexBtn = document.getElementById("index-btn");
const sidebar = document.getElementById("sidebar");
const scrim = document.getElementById("scrim");
const treeEl = document.getElementById("tree");
const view = document.getElementById("view");
const narrowQuery = window.matchMedia("(max-width: 800px)");

const openFolders = new Set();
const quizState = {};
let activeId = null;
let sidebarOpen = false;

function isNarrow() {
  return narrowQuery.matches;
}

function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function findPath(nodes, id, trail = []) {
  for (const node of nodes) {
    const next = trail.concat(node);
    if (node.id === id) return next;
    if (node.children) {
      const hit = findPath(node.children, id, next);
      if (hit) return hit;
    }
  }
  return null;
}

function placeholder(index) {
  const fill = FILLS[index % FILLS.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">` +
    `<rect width="960" height="640" fill="${fill}"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function quizMemory(id) {
  if (!quizState[id]) quizState[id] = { picks: {}, submitted: false, message: "" };
  return quizState[id];
}

function setSidebar(open, nextFocus, silent) {
  sidebarOpen = open;
  sidebar.classList.toggle("is-open", open);
  sidebar.inert = !open;
  sidebar.setAttribute("aria-hidden", String(!open));
  indexBtn.setAttribute("aria-expanded", String(open));
  const overlay = open && isNarrow();
  scrim.hidden = !overlay;
  document.body.classList.toggle("lock", overlay);
  document.body.classList.toggle("sidebar-open", open);
  if (silent) return;
  if (nextFocus) nextFocus.focus();
  else if (open) sidebar.focus();
}

function renderTree(focusId) {
  treeEl.replaceChildren();
  treeEl.append(renderNodes(TREE, 0));
  if (!focusId) return;
  const current = treeEl.querySelector(`[data-id="${CSS.escape(focusId)}"]`);
  if (current) current.focus();
}

function renderNodes(nodes, depth) {
  const group = document.createElement("div");
  for (const node of nodes) group.append(renderNode(node, depth));
  return group;
}

function renderNode(node, depth) {
  const folder = node.type === "folder";
  const open = openFolders.has(node.id);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "row" + (folder ? " is-folder" : "") + (activeId === node.id ? " is-active" : "");
  btn.dataset.id = node.id;
  btn.style.paddingLeft = `${12 + depth * 16}px`;
  if (folder) btn.setAttribute("aria-expanded", String(open));
  if (!folder && activeId === node.id) btn.setAttribute("aria-current", "page");

  const chev = document.createElement("span");
  chev.className = "chev" + (folder ? "" : " is-leaf") + (open ? " is-open" : "");
  chev.setAttribute("aria-hidden", "true");

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = node.name;
  btn.append(chev, name);

  if (!folder) {
    const kind = document.createElement("span");
    kind.className = "kind";
    kind.textContent = KIND[node.type] || "";
    btn.append(kind);
  }

  btn.addEventListener("click", () => {
    if (folder) {
      if (open) openFolders.delete(node.id);
      else openFolders.add(node.id);
      renderTree(node.id);
      return;
    }
    activeId = node.id;
    renderTree();
    renderView({ focus: "heading" });
    if (isNarrow()) setSidebar(false);
  });

  const wrap = document.createElement("div");
  wrap.append(btn);
  if (folder && open && node.children) wrap.append(renderNodes(node.children, depth + 1));
  return wrap;
}

function renderView(options = {}) {
  const node = activeId ? findNode(TREE, activeId) : null;
  view.replaceChildren();
  document.title = node ? `${node.name} — Iconoquest` : "Iconoquest";

  if (!node) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Open the index and choose a page.";
    view.append(p);
    return;
  }

  const path = findPath(TREE, node.id) || [];
  if (path.length > 1) {
    const crumb = document.createElement("p");
    crumb.className = "crumb";
    crumb.textContent = path.slice(0, -1).map((item) => item.name).join(" / ");
    view.append(crumb);
  }

  const heading = document.createElement("h1");
  heading.textContent = node.name;
  view.append(heading);

  if (node.type === "text") appendText(node);
  if (node.type === "pictures") appendPictures(node);
  if (node.type === "quiz") appendQuiz(node);

  if (options.focus === "heading") {
    heading.tabIndex = -1;
    heading.focus();
  } else if (options.focus === "check") {
    view.querySelector(".check")?.focus();
  }
}

function appendText(node) {
  for (const paragraph of node.paragraphs) {
    const p = document.createElement("p");
    p.className = "prose";
    p.textContent = paragraph;
    view.append(p);
  }
}

function appendPictures(node) {
  node.frames.forEach((frame, index) => {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.src = frame.src || placeholder(index);
    img.alt = frame.caption;
    const cap = document.createElement("figcaption");
    cap.textContent = frame.caption;
    fig.append(img, cap);
    view.append(fig);
  });
}

function appendQuiz(node) {
  const state = quizMemory(node.id);

  if (node.intro) {
    const intro = document.createElement("p");
    intro.className = "prose";
    intro.textContent = node.intro;
    view.append(intro);
  }

  node.questions.forEach((question, qi) => {
    const field = document.createElement("fieldset");
    field.className = "q";
    const legend = document.createElement("legend");
    legend.textContent = question.prompt;
    field.append(legend);

    question.choices.forEach((choice, ci) => {
      const label = document.createElement("label");
      label.className = "option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `${node.id}-${qi}`;
      input.value = String(ci);
      input.checked = state.picks[qi] === ci;
      if (state.submitted) {
        input.disabled = true;
        if (ci === question.answer) label.classList.add("is-correct");
        else if (state.picks[qi] === ci) label.classList.add("is-wrong");
      }
      input.addEventListener("change", () => {
        state.picks[qi] = ci;
        const result = view.querySelector(".result");
        if (result && state.message && !state.submitted) {
          state.message = "";
          result.textContent = "";
        }
      });
      const span = document.createElement("span");
      span.textContent = choice;
      label.append(input, span);
      field.append(label);
    });

    view.append(field);
  });

  const actions = document.createElement("div");
  actions.className = "actions";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "check";
  btn.textContent = state.submitted ? "Try again" : "Check";
  const result = document.createElement("p");
  result.className = "result";
  result.setAttribute("role", "status");
  result.textContent = state.message;

  btn.addEventListener("click", () => {
    if (state.submitted) {
      state.picks = {};
      state.submitted = false;
      state.message = "";
      renderView({ focus: "check" });
      return;
    }
    if (Object.keys(state.picks).length < node.questions.length) {
      state.message = "Answer each question first.";
      result.textContent = state.message;
      return;
    }
    let correct = 0;
    node.questions.forEach((question, index) => {
      if (state.picks[index] === question.answer) correct += 1;
    });
    state.submitted = true;
    state.message = `${correct} of ${node.questions.length} correct.`;
    renderView({ focus: "check" });
  });

  actions.append(btn, result);
  view.append(actions);
}

indexBtn.addEventListener("click", () => setSidebar(!sidebarOpen));
scrim.addEventListener("click", () => setSidebar(false, indexBtn));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sidebarOpen) setSidebar(false, indexBtn);
});

narrowQuery.addEventListener("change", () => {
  if (sidebarOpen) setSidebar(true, null, true);
});

renderTree();
renderView();
setSidebar(false, null, true);
