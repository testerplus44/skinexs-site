/**
 * События пополнения Steam (моментальное через партнёра, заявки по ключам) — аналитика в админке.
 */
const crypto = require("crypto");
const { getDb } = require("./db");

function newId() {
  return "ste_" + crypto.randomBytes(8).toString("hex");
}

/**
 * @param {{
 *   method: 'instant'|'keys',
 *   kind?: string,
 *   userId?: string|null,
 *   steamRef?: string,
 *   keyCount?: number|null,
 *   amountSteamRub: number,
 *   amountSiteRub: number,
 *   partnerTxId?: string|null,
 *   partnerOk?: boolean|null,
 *   payMethod?: string|null,
 *   createdAt?: number,
 * }} opts
 */
function insertSteamTopupEvent(opts) {
  const db = getDb();
  const id = newId();
  const method = String(opts.method || "instant");
  const kind = String(opts.kind || "event");
  const createdAt = opts.createdAt != null ? Number(opts.createdAt) : Date.now();
  const userId = opts.userId != null && String(opts.userId).trim() ? String(opts.userId).trim() : null;
  const steamRef = opts.steamRef != null ? String(opts.steamRef).slice(0, 500) : "";
  const keyCount = opts.keyCount != null && Number.isFinite(Number(opts.keyCount)) ? Math.round(Number(opts.keyCount)) : null;
  const amountSteamRub = Math.round(Number(opts.amountSteamRub) || 0);
  const amountSiteRub = Math.round(Number(opts.amountSiteRub) || 0);
  const partnerTxId = opts.partnerTxId != null && String(opts.partnerTxId).trim() ? String(opts.partnerTxId).slice(0, 40) : null;
  let partnerOk = null;
  if (opts.partnerOk === true) partnerOk = 1;
  else if (opts.partnerOk === false) partnerOk = 0;
  const payMethod = opts.payMethod != null && String(opts.payMethod).trim() ? String(opts.payMethod).slice(0, 16) : null;

  db.prepare(
    `INSERT INTO steam_topup_events (
      id, method, kind, created_at, user_id, steam_ref, key_count,
      amount_steam_rub, amount_site_rub, partner_tx_id, partner_ok, pay_method
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    method,
    kind,
    createdAt,
    userId,
    steamRef,
    keyCount,
    amountSteamRub,
    amountSiteRub,
    partnerTxId,
    partnerOk,
    payMethod,
  );
  return id;
}

function rowToClient(r) {
  return {
    id: r.id,
    method: r.method,
    kind: r.kind,
    createdAt: r.created_at,
    userId: r.user_id,
    steamRef: r.steam_ref,
    keyCount: r.key_count,
    amountSteamRub: r.amount_steam_rub,
    amountSiteRub: r.amount_site_rub,
    partnerTxId: r.partner_tx_id,
    partnerOk: r.partner_ok === 1 ? true : r.partner_ok === 0 ? false : null,
    payMethod: r.pay_method,
  };
}

/**
 * @param {{ fromMs?: number, toMs?: number, method?: string, limit?: number, offset?: number }} q
 */
function querySteamTopupEventsAdmin(q) {
  const db = getDb();
  const now = Date.now();
  const fromMs = q.fromMs != null && Number.isFinite(Number(q.fromMs)) ? Number(q.fromMs) : now - 30 * 86400000;
  const toMs = q.toMs != null && Number.isFinite(Number(q.toMs)) ? Number(q.toMs) : now;
  const method = String(q.method || "all").toLowerCase();
  const limit = Math.min(500, Math.max(1, parseInt(String(q.limit), 10) || 200));
  const offset = Math.max(0, parseInt(String(q.offset), 10) || 0);

  const where = ["created_at >= ?", "created_at <= ?"];
  const params = [fromMs, toMs];
  if (method === "instant" || method === "keys") {
    where.push("method = ?");
    params.push(method);
  }
  const w = where.join(" AND ");

  const aggRows = db
    .prepare(
      `SELECT method,
        COUNT(*) AS cnt,
        COALESCE(SUM(amount_site_rub), 0) AS sum_site,
        COALESCE(SUM(amount_steam_rub), 0) AS sum_steam
      FROM steam_topup_events WHERE ${w} GROUP BY method`,
    )
    .all(...params);

  const summary = {
    instant: { count: 0, sumSiteRub: 0, sumSteamRub: 0 },
    keys: { count: 0, sumSiteRub: 0, sumSteamRub: 0 },
  };
  aggRows.forEach((r) => {
    const m = r.method;
    if (m === "instant" || m === "keys") {
      summary[m].count = r.cnt;
      summary[m].sumSiteRub = r.sum_site;
      summary[m].sumSteamRub = r.sum_steam;
    }
  });
  summary.total = {
    count: summary.instant.count + summary.keys.count,
    sumSiteRub: summary.instant.sumSiteRub + summary.keys.sumSiteRub,
    sumSteamRub: summary.instant.sumSteamRub + summary.keys.sumSteamRub,
  };

  const rows = db
    .prepare(`SELECT * FROM steam_topup_events WHERE ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM steam_topup_events WHERE ${w}`).get(...params);

  return {
    fromMs,
    toMs,
    summary,
    rows: rows.map(rowToClient),
    totalCount: totalRow ? totalRow.c : 0,
  };
}

module.exports = {
  insertSteamTopupEvent,
  querySteamTopupEventsAdmin,
};
