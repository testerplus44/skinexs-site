/**
 * Проверка ссылки «Новое торговое предложение» Steam.
 * @returns {{ ok: true, value: string } | { ok: false, message: string }}
 */
function validateSteamTradeUrl(raw) {
  const s0 = String(raw || "").trim();
  if (!s0) return { ok: false, message: "Укажите трейд-ссылку." };
  const s = /^https?:\/\//i.test(s0) ? s0 : `https://${s0}`;
  let u;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, message: "Некорректная ссылка." };
  }
  const host = u.hostname.toLowerCase();
  if (host !== "steamcommunity.com" && host !== "www.steamcommunity.com") {
    return { ok: false, message: "Ссылка должна быть с домена steamcommunity.com." };
  }
  if (!u.pathname.includes("tradeoffer/new")) {
    return { ok: false, message: "Нужна ссылка создания торгового предложения (…/tradeoffer/new/?…)." };
  }
  const partner = u.searchParams.get("partner");
  const token = u.searchParams.get("token");
  if (!partner || !token) {
    return { ok: false, message: "В ссылке должны быть параметры partner и token." };
  }
  if (!/^\d+$/.test(partner) || token.length < 4) {
    return { ok: false, message: "Некорректные partner или token в ссылке." };
  }
  return { ok: true, value: u.href };
}

/**
 * После успешной оплаты заказа ключей — HTTP POST на URL бота/воркера,
 * который создаёт trade offer по trade_url (Steam не отдаёт это через простой REST сайта).
 *
 * SKINEX_STEAM_KEYS_WEBHOOK_URL — HTTPS endpoint вашего бота.
 * SKINEX_STEAM_KEYS_WEBHOOK_SECRET — если задан, тело подписывается HMAC-SHA256 в заголовке X-Skinex-Signature (hex).
 */
const crypto = require("crypto");
const { getDb } = require("./db");

function updateOrderDelivery(db, orderId, state, errMsg) {
  db.prepare(
    "UPDATE steam_keys_orders SET delivery_state = ?, delivery_error = ?, updated_at = ? WHERE id = ?",
  ).run(String(state || "none"), errMsg != null ? String(errMsg).slice(0, 500) : null, Date.now(), orderId);
}

/**
 * @param {object} order — строка steam_keys_orders
 * @returns {Promise<{ skipped?: boolean, ok?: boolean }>}
 */
async function sendDeliveryWebhook(order) {
  const url = String(process.env.SKINEX_STEAM_KEYS_WEBHOOK_URL || "").trim();
  if (!url) {
    return { skipped: true };
  }
  const secret = String(process.env.SKINEX_STEAM_KEYS_WEBHOOK_SECRET || "").trim();
  const payload = {
    orderId: order.id,
    userId: order.user_id,
    keyCount: order.key_count,
    tradeUrl: order.trade_url,
    amountRub: order.amount_rub,
    yookassaPaymentId: order.yookassa_payment_id || null,
  };
  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json", "User-Agent": "Skinexs-SteamKeys/1" };
  if (secret) {
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Skinex-Signature"] = sig;
  }
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 18_000);
  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`webhook HTTP ${res.status}${txt ? `: ${txt.slice(0, 200)}` : ""}`);
  }
  return { ok: true };
}

function queueDeliveryAfterPayment(orderId) {
  setImmediate(() => {
    const db = getDb();
    const order = db.prepare("SELECT * FROM steam_keys_orders WHERE id = ?").get(orderId);
    if (!order || order.status !== "succeeded") return;
    sendDeliveryWebhook(order)
      .then((r) => {
        const d = getDb();
        if (r && r.skipped) updateOrderDelivery(d, orderId, "skipped", null);
        else updateOrderDelivery(d, orderId, "webhook_ok", null);
      })
      .catch((e) => {
        const msg = e && e.name === "AbortError" ? "webhook timeout" : String(e.message || e);
        updateOrderDelivery(getDb(), orderId, "webhook_fail", msg.slice(0, 500));
        console.error("[steam-keys webhook]", orderId, msg);
      });
  });
}

module.exports = {
  validateSteamTradeUrl,
  sendDeliveryWebhook,
  updateOrderDelivery,
  queueDeliveryAfterPayment,
};
