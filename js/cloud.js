let firebaseReady;

function firebaseDb() {
  if (!firebaseReady) {
    firebaseReady = (async () => {
      const appMod = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const dbMod = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const app = appMod.initializeApp({ projectId: "iconoquest-ai", authDomain: "iconoquest-ai.firebaseapp.com" });
      return { db: dbMod.getFirestore(app), dbMod };
    })();
  }
  return firebaseReady;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(false), ms)),
  ]);
}

function saveRecord(team, activity, question, answer) {
  const job = (async () => {
    const { db, dbMod } = await firebaseDb();
    const now = new Date();
    await dbMod.addDoc(dbMod.collection(db, "iconoquest_submissions"), {
      lesson: "Εικονομαχία",
      team,
      activity,
      question,
      answer: answer.trim().slice(0, 3000),
      time: now.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" }),
      timestamp: now.toISOString(),
    });
    return true;
  })().catch((e) => {
    console.error(e);
    return false;
  });
  return withTimeout(job, 1500);
}

async function loadRecords() {
  const { db, dbMod } = await firebaseDb();
  const snap = await dbMod.getDocs(dbMod.collection(db, "iconoquest_submissions"));
  return snap.docs.map((d) => d.data()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
