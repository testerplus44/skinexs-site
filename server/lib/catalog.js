/**
 * Каталог: JSON + колонки steam_market_hash_name, icon_url_large.
 */
const crypto = require("crypto");

const RARITY_MAP = {
  arcana: "arcana",
  immortal: "immortal",
  mythical: "mythical",
  legendary: "immortal",
  rare: "mythical",
  uncommon: "mythical",
  common: "mythical",
};

function normalizeRarity(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (RARITY_MAP[s]) return RARITY_MAP[s];
  if (s.includes("arcana")) return "arcana";
  if (s.includes("immortal")) return "immortal";
  if (s.includes("mythical")) return "mythical";
  return "mythical";
}

function slugId(name) {
  const base = String(name || "item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return (base || "item") + "_" + crypto.randomBytes(4).toString("hex");
}

function normalizeCatalogItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || raw.steam_market_hash_name || raw.steamMarketHashName || "").trim();
  if (!name) return null;

  const iconUrlLarge = String(raw.icon_url_large || raw.iconUrlLarge || "").trim();
  const steamHash = String(
    raw.steam_market_hash_name || raw.steamMarketHashName || name,
  ).trim();

  const item = Object.assign({}, raw, {
    id: String(raw.id || "").trim() || slugId(name),
    name,
    hero: raw.hero != null ? String(raw.hero).trim() : "",
    rarity: normalizeRarity(raw.rarity),
    price: Math.max(0, Math.round(Number(raw.price) || 0)),
    listPrice: raw.listPrice != null ? Math.max(0, Math.round(Number(raw.listPrice) || 0)) : raw.listPrice,
    icon: String(raw.icon || "📦").slice(0, 8),
    imageUrl: String(raw.imageUrl || "").trim(),
    videoUrl: String(raw.videoUrl || "").trim(),
    collectionId: String(raw.collectionId || "general").trim() || "general",
    category: String(raw.category || "tradeable").trim() || "tradeable",
    steam_market_hash_name: steamHash,
    steamMarketHashName: steamHash,
    icon_url_large: iconUrlLarge,
    iconUrlLarge: iconUrlLarge,
    traderListingsAllowed: raw.traderListingsAllowed !== false,
  });

  if (item.listPrice == null || !Number.isFinite(item.listPrice)) delete item.listPrice;

  return item;
}

function rowToItem(row) {
  if (!row || !row.json) return null;
  let parsed;
  try {
    parsed = JSON.parse(row.json);
  } catch {
    return null;
  }
  const merged = Object.assign({}, parsed, {
    id: parsed.id || row.id,
    steam_market_hash_name:
      row.steam_market_hash_name != null && String(row.steam_market_hash_name).trim()
        ? String(row.steam_market_hash_name).trim()
        : parsed.steam_market_hash_name || parsed.steamMarketHashName,
    icon_url_large:
      row.icon_url_large != null && String(row.icon_url_large).trim()
        ? String(row.icon_url_large).trim()
        : parsed.icon_url_large || parsed.iconUrlLarge,
  });
  return normalizeCatalogItem(merged);
}

function listCatalogItems(db) {
  const rows = db.prepare("SELECT id, json, steam_market_hash_name, icon_url_large FROM catalog_items").all();
  return rows.map(rowToItem).filter(Boolean);
}

function getCatalogItem(db, id) {
  const row = db
    .prepare("SELECT id, json, steam_market_hash_name, icon_url_large FROM catalog_items WHERE id = ?")
    .get(String(id || ""));
  return row ? rowToItem(row) : null;
}

function saveCatalogItem(db, raw) {
  const item = normalizeCatalogItem(raw);
  if (!item) throw new Error("Некорректный товар.");
  const json = JSON.stringify(item);
  db.prepare(
    `INSERT OR REPLACE INTO catalog_items (id, json, steam_market_hash_name, icon_url_large)
     VALUES (?, ?, ?, ?)`,
  ).run(item.id, json, item.steam_market_hash_name || "", item.icon_url_large || "");
  return item;
}

function deleteCatalogItem(db, id) {
  return db.prepare("DELETE FROM catalog_items WHERE id = ?").run(String(id || "")).changes > 0;
}

function importCatalogItems(db, payloads) {
  const list = Array.isArray(payloads) ? payloads : [payloads];
  const saved = [];
  const errors = [];
  const tx = db.transaction((items) => {
    items.forEach((raw, idx) => {
      try {
        const item = normalizeCatalogItem(raw);
        if (!item) throw new Error("Пустое имя или данные.");
        saveCatalogItem(db, item);
        saved.push(item);
      } catch (e) {
        errors.push({ index: idx, message: String(e.message || e) });
      }
    });
  });
  tx(list);
  return { saved, errors };
}

module.exports = {
  normalizeRarity,
  normalizeCatalogItem,
  rowToItem,
  listCatalogItems,
  getCatalogItem,
  saveCatalogItem,
  deleteCatalogItem,
  importCatalogItems,
};
