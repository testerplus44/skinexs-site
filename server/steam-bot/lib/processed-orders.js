const fs = require("fs");
const path = require("path");

const storePath =
  process.env.STEAM_BOT_PROCESSED_FILE ||
  path.join(__dirname, "..", "data", "processed-orders.json");

function load() {
  try {
    const raw = fs.readFileSync(storePath, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function save(map) {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(map, null, 2), "utf8");
}

function wasProcessed(orderId) {
  const m = load();
  return !!m[orderId];
}

function markProcessed(orderId, meta) {
  const m = load();
  m[orderId] = Object.assign({ at: Date.now() }, meta || {});
  save(m);
}

module.exports = {
  wasProcessed,
  markProcessed,
  storePath,
};
