/**
 * Копия SQLite: из папки server выполните: node scripts/backup-db.js
 */
const fs = require("fs");
const path = require("path");

const def = path.join(__dirname, "..", "data", "skinex.db");
const src = process.env.SKINEX_DB_PATH || def;

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(path.dirname(src), `skinex-backup-${stamp}.db`);

if (!fs.existsSync(src)) {
  console.error("Файл БД не найден:", src);
  process.exit(1);
}
fs.copyFileSync(src, dest);
console.log("Backup:", dest);
