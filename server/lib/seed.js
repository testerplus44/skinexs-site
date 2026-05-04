/**
 * Первичное заполнение: каталог из js/data.js, админ из env.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { getDb } = require("./db");

const ROOT = path.join(__dirname, "..", "..");

function loadCatalogFromDataJs() {
  const filePath = path.join(ROOT, "js", "data.js");
  const code = fs.readFileSync(filePath, "utf8");
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return Array.isArray(ctx.window.SKINEX_CATALOG) ? ctx.window.SKINEX_CATALOG : [];
}

function seedCatalogIfEmpty() {
  const db = getDb();
  const n = db.prepare("SELECT COUNT(*) AS c FROM catalog_items").get();
  if (n && n.c > 0) return;
  const rows = loadCatalogFromDataJs();
  const ins = db.prepare("INSERT OR REPLACE INTO catalog_items (id, json) VALUES (?, ?)");
  const tx = db.transaction((items) => {
    for (const it of items) {
      if (!it || !it.id) continue;
      ins.run(String(it.id), JSON.stringify(it));
    }
  });
  tx(rows);
  console.log("[seed] catalog_items:", rows.length);
}

function seedAdminUser() {
  const email = (process.env.SKINEX_ADMIN_EMAIL || "admin@skinex.local").trim().toLowerCase();
  const password = process.env.SKINEX_ADMIN_PASSWORD || "SkinexsAdmin2026";
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return;
  const id = "usr_" + crypto.randomBytes(8).toString("hex");
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, role, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, email, hash, "admin", "Администратор", Date.now());
  console.log("[seed] admin user:", email);
}

function runSeed() {
  seedCatalogIfEmpty();
  seedAdminUser();
}

module.exports = { runSeed, loadCatalogFromDataJs };
