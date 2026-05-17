/**
 * Промо-баннеры на главной (карусель).
 */
const crypto = require("crypto");
const { getDb } = require("./db");

const DEFAULT_BANNERS = [
  {
    badge: "Эксклюзив",
    title: "Архивная коллекция",
    meta: "Immortal · Mythical · Collector's Cache",
    imageUrl: "",
    linkHref: "#catalog",
    sortOrder: 0,
    enabled: true,
  },
];

function newId() {
  return "bn_" + crypto.randomBytes(8).toString("hex");
}

function rowToClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    badge: String(row.badge || ""),
    title: String(row.title || ""),
    meta: String(row.meta || ""),
    imageUrl: String(row.image_url || ""),
    linkHref: String(row.link_href || ""),
    sortOrder: Number(row.sort_order) || 0,
    enabled: row.enabled !== 0,
    createdAt: row.created_at != null ? Number(row.created_at) : null,
    updatedAt: row.updated_at != null ? Number(row.updated_at) : null,
  };
}

function sortBanners(list) {
  return list.slice().sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function seedIfEmpty() {
  const db = getDb();
  const n = db.prepare("SELECT COUNT(*) AS c FROM home_banners").get();
  if (n && n.c > 0) return;
  const now = Date.now();
  const ins = db.prepare(
    `INSERT INTO home_banners (id, badge, title, meta, image_url, link_href, sort_order, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  DEFAULT_BANNERS.forEach((b, i) => {
    ins.run(
      newId(),
      b.badge,
      b.title,
      b.meta,
      b.imageUrl || "",
      b.linkHref || "",
      b.sortOrder != null ? b.sortOrder : i,
      b.enabled === false ? 0 : 1,
      now,
      now,
    );
  });
}

function listHomeBanners({ publicOnly = false } = {}) {
  seedIfEmpty();
  const db = getDb();
  const rows = db.prepare("SELECT * FROM home_banners ORDER BY sort_order ASC, created_at ASC").all();
  let list = rows.map(rowToClient).filter(Boolean);
  if (publicOnly) list = list.filter((b) => b.enabled);
  return sortBanners(list);
}

function normalizePatch(patch) {
  const p = patch || {};
  return {
    badge: p.badge != null ? String(p.badge).trim().slice(0, 80) : undefined,
    title: p.title != null ? String(p.title).trim().slice(0, 200) : undefined,
    meta: p.meta != null ? String(p.meta).trim().slice(0, 400) : undefined,
    imageUrl: p.imageUrl != null ? String(p.imageUrl).trim().slice(0, 2000) : undefined,
    linkHref: p.linkHref != null ? String(p.linkHref).trim().slice(0, 500) : undefined,
    sortOrder: p.sortOrder != null ? Math.floor(Number(p.sortOrder)) || 0 : undefined,
    enabled: p.enabled != null ? (p.enabled === false || p.enabled === 0 ? false : true) : undefined,
  };
}

function createHomeBanner(patch) {
  seedIfEmpty();
  const p = normalizePatch(patch);
  const title = p.title != null ? p.title : "Новый баннер";
  const now = Date.now();
  const id = newId();
  const db = getDb();
  const maxRow = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM home_banners").get();
  const sortOrder = p.sortOrder != null ? p.sortOrder : (maxRow ? maxRow.m + 1 : 0);
  db.prepare(
    `INSERT INTO home_banners (id, badge, title, meta, image_url, link_href, sort_order, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    p.badge != null ? p.badge : "",
    title,
    p.meta != null ? p.meta : "",
    p.imageUrl != null ? p.imageUrl : "",
    p.linkHref != null ? p.linkHref : "",
    sortOrder,
    p.enabled === false ? 0 : 1,
    now,
    now,
  );
  return rowToClient(db.prepare("SELECT * FROM home_banners WHERE id = ?").get(id));
}

function updateHomeBanner(id, patch) {
  seedIfEmpty();
  const db = getDb();
  const cur = db.prepare("SELECT * FROM home_banners WHERE id = ?").get(String(id || ""));
  if (!cur) return null;
  const p = normalizePatch(patch);
  const next = {
    badge: p.badge != null ? p.badge : cur.badge,
    title: p.title != null ? p.title : cur.title,
    meta: p.meta != null ? p.meta : cur.meta,
    image_url: p.imageUrl != null ? p.imageUrl : cur.image_url,
    link_href: p.linkHref != null ? p.linkHref : cur.link_href,
    sort_order: p.sortOrder != null ? p.sortOrder : cur.sort_order,
    enabled: p.enabled != null ? (p.enabled ? 1 : 0) : cur.enabled,
    updated_at: Date.now(),
  };
  if (!next.title.trim()) return null;
  db.prepare(
    `UPDATE home_banners SET badge = ?, title = ?, meta = ?, image_url = ?, link_href = ?, sort_order = ?, enabled = ?, updated_at = ? WHERE id = ?`,
  ).run(
    next.badge,
    next.title,
    next.meta,
    next.image_url,
    next.link_href,
    next.sort_order,
    next.enabled,
    next.updated_at,
    cur.id,
  );
  return rowToClient(db.prepare("SELECT * FROM home_banners WHERE id = ?").get(cur.id));
}

function deleteHomeBanner(id) {
  seedIfEmpty();
  const db = getDb();
  const info = db.prepare("DELETE FROM home_banners WHERE id = ?").run(String(id || ""));
  return info.changes > 0;
}

module.exports = {
  DEFAULT_BANNERS,
  listHomeBanners,
  createHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
};
