/**
 * Настройки страницы пополнения Steam (админка + публичный API).
 */
const { getDb } = require("./db");

const DEFAULTS = {
  instantCommissionPct: 7,
  keysPriceRub: 156,
  keysClientProfitPct: 10,
};

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function rowToClient(row) {
  if (!row) return { ...DEFAULTS, updatedAt: null };
  return {
    instantCommissionPct: Number(row.instant_commission_pct),
    keysPriceRub: Math.round(Number(row.keys_price_rub)),
    keysClientProfitPct: Number(row.keys_client_profit_pct),
    updatedAt: row.updated_at != null ? Number(row.updated_at) : null,
  };
}

function getSteamTopupSettings() {
  const db = getDb();
  let row = db.prepare("SELECT * FROM steam_topup_settings WHERE id = 1").get();
  if (!row) {
    db.prepare(
      "INSERT OR IGNORE INTO steam_topup_settings (id, instant_commission_pct, keys_price_rub, keys_client_profit_pct, updated_at) VALUES (1, 7, 156, 10, 0)",
    ).run();
    row = db.prepare("SELECT * FROM steam_topup_settings WHERE id = 1").get();
  }
  return rowToClient(row);
}

function updateSteamTopupSettings(patch) {
  const cur = getSteamTopupSettings();
  const next = {
    instantCommissionPct:
      patch && patch.instantCommissionPct != null
        ? clamp(Number(patch.instantCommissionPct), 0, 100)
        : cur.instantCommissionPct,
    keysPriceRub:
      patch && patch.keysPriceRub != null ? Math.round(clamp(Number(patch.keysPriceRub), 1, 10_000_000)) : cur.keysPriceRub,
    keysClientProfitPct:
      patch && patch.keysClientProfitPct != null
        ? clamp(Number(patch.keysClientProfitPct), 0, 500)
        : cur.keysClientProfitPct,
  };
  const db = getDb();
  db.prepare(
    `UPDATE steam_topup_settings SET
      instant_commission_pct = ?,
      keys_price_rub = ?,
      keys_client_profit_pct = ?,
      updated_at = ?
    WHERE id = 1`,
  ).run(next.instantCommissionPct, next.keysPriceRub, next.keysClientProfitPct, Date.now());
  return getSteamTopupSettings();
}

module.exports = {
  DEFAULTS,
  getSteamTopupSettings,
  updateSteamTopupSettings,
};
