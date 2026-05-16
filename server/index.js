/**
 * Skinexs: статика + SQLite API v1 + legacy GET /collections, /listings, POST /api/auth/steam/verify
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const fs = require("fs");
const vm = require("vm");
const session = require("express-session");
const rateLimit = require("express-rate-limit");

const { open: openDb, getDb } = require("./lib/db");
const { runSeed } = require("./lib/seed");
const { verifySteamQueryString } = require("./lib/steam-openid");
const { startWorker: startNotifyWorker } = require("./lib/notify");
const apiV1 = require("./routes/apiV1");

const ROOT = path.join(__dirname, "..");

openDb();
runSeed();

function runJsWindow(fileRel) {
  const filePath = path.join(ROOT, fileRel);
  const code = fs.readFileSync(filePath, "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.window;
}

function loadCatalogFromFile() {
  const w = runJsWindow(path.join("js", "data.js"));
  return Array.isArray(w.SKINEX_CATALOG) ? w.SKINEX_CATALOG.slice() : [];
}

function loadCatalogMerged() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT json FROM catalog_items").all();
    if (rows.length > 0) {
      return rows.map((r) => JSON.parse(r.json));
    }
  } catch (e) {
    /* fall through */
  }
  return loadCatalogFromFile();
}

function loadCollectionsMeta() {
  const w = runJsWindow(path.join("js", "catalog-meta.js"));
  const rows = w.SKINEX_COLLECTIONS;
  if (!Array.isArray(rows)) return [];
  return rows.filter((c) => c && c.id && c.id !== "all");
}

function loadCategoriesMeta() {
  const w = runJsWindow(path.join("js", "catalog-meta.js"));
  const rows = w.SKINEX_CATEGORIES;
  return Array.isArray(rows) ? rows : [];
}

function categoryMatchesFilter(itemCategory, filterId, categories) {
  const cat = String(itemCategory || "tradeable");
  const fid = String(filterId);
  if (cat === fid) return true;
  for (let i = 0; i < categories.length; i++) {
    const r = categories[i];
    if (r && String(r.parentId) === fid && String(r.id) === cat) return true;
  }
  return false;
}

function collectionMatchesFilter(itemCollection, filterId, collections) {
  const col = String(itemCollection || "general");
  const fid = String(filterId);
  if (col === fid) return true;
  for (let i = 0; i < collections.length; i++) {
    const r = collections[i];
    if (r && String(r.parentId) === fid && String(r.id) === col) return true;
  }
  return false;
}

const app = express();
app.set("trust proxy", 1);

const sessionSecret = process.env.SKINEX_SESSION_SECRET || "skinex-dev-change-me";
app.use(
  session({
    name: "skinex.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.SKINEX_RATE_LIMIT_MAX) || 400,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.SKINEX_AUTH_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "512kb" }));
app.use("/api/", apiLimiter);
app.use("/api/v1/auth", authLimiter);
app.use("/api/auth", authLimiter);

app.use("/api/v1", apiV1);

app.get("/api/health", (req, res) => {
  try {
    getDb().prepare("SELECT 1 AS ok").get();
    res.json({ ok: true, db: true, uptime: process.uptime() });
  } catch (e) {
    res.status(503).json({ ok: false, db: false, message: String(e.message) });
  }
});

/** Legacy: только steamId (клиент без cookie-сессии). */
app.post("/api/auth/steam/verify", async (req, res) => {
  try {
    const q = req.body && req.body.query;
    if (typeof q !== "string") {
      return res.status(400).json({ ok: false, message: "Нет параметра query." });
    }
    const vr = await verifySteamQueryString(q);
    if (!vr.ok) {
      return res.status(401).json({ ok: false, message: vr.message || "Ошибка Steam." });
    }
    return res.json({ ok: true, steamId: vr.steamId });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: String(e && e.message ? e.message : e),
    });
  }
});

app.get("/collections", (req, res) => {
  try {
    res.json(loadCollectionsMeta());
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

app.get("/listings", (req, res) => {
  try {
    let list = loadCatalogMerged();
    const collectionId = req.query.collectionId;
    const category = req.query.category;
    if (collectionId != null && String(collectionId) !== "" && String(collectionId) !== "all") {
      const cid = String(collectionId);
      const colls = loadCollectionsMeta();
      list = list.filter((x) => collectionMatchesFilter(x.collectionId, cid, colls));
    }
    if (category != null && String(category) !== "" && String(category) !== "all") {
      const cat = String(category);
      const cats = loadCategoriesMeta();
      list = list.filter((x) => categoryMatchesFilter(x.category, cat, cats));
    }
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

app.use(express.static(ROOT));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Skinexs: http://localhost:${PORT}`);
  console.log(`API v1: http://localhost:${PORT}/api/v1/catalog`);
  startNotifyWorker(20000);
  try {
    const { startSteamBotServer } = require("./steam-bot");
    startSteamBotServer();
  } catch (e) {
    console.error("[steam-bot] не запущен:", e.message || e);
    console.error("[steam-bot] выполните: cd server && npm install");
  }
});
