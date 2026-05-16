/**
 * HTTP-приложение бота (можно запускать отдельно или из server/index.js).
 */
const crypto = require("crypto");
const express = require("express");
const { sendKeysTrade, isDryRun, credentialsConfigured, ensureReady } = require("./lib/bot");
const processed = require("./lib/processed-orders");

function getWebhookSecret() {
  return String(
    process.env.SKINEX_STEAM_KEYS_WEBHOOK_SECRET || process.env.STEAM_BOT_WEBHOOK_SECRET || "",
  ).trim();
}

function verifySignature(rawBody, signatureHeader) {
  const SECRET = getWebhookSecret();
  if (!SECRET) {
    console.warn("[steam-bot] SKINEX_STEAM_KEYS_WEBHOOK_SECRET не задан — подпись не проверяется.");
    return true;
  }
  const sig = String(signatureHeader || "").trim();
  if (!sig) return false;
  const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

function createSteamBotApp() {
  const app = express();

  app.get("/health", (req, res) => {
    res.json({
      ok: true,
      dryRun: isDryRun(),
      credentials: credentialsConfigured(),
      processedFile: processed.storePath,
    });
  });

  app.post("/deliver", express.raw({ type: "application/json", limit: "32kb" }), async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body || ""), "utf8");
    if (!verifySignature(raw, req.headers["x-skinex-signature"])) {
      return res.status(401).json({ ok: false, message: "Неверная подпись X-Skinex-Signature." });
    }
    let payload;
    try {
      payload = JSON.parse(raw.toString("utf8"));
    } catch {
      return res.status(400).json({ ok: false, message: "Некорректный JSON." });
    }

    const orderId = String(payload.orderId || "").trim();
    const keyCount = Math.round(Number(payload.keyCount));
    const tradeUrl = String(payload.tradeUrl || "").trim();

    if (!orderId) return res.status(400).json({ ok: false, message: "Нет orderId." });
    if (!tradeUrl) return res.status(400).json({ ok: false, message: "Нет tradeUrl." });
    if (!Number.isFinite(keyCount) || keyCount < 1 || keyCount > 99) {
      return res.status(400).json({ ok: false, message: "keyCount от 1 до 99." });
    }

    if (processed.wasProcessed(orderId)) {
      return res.json({ ok: true, already: true, orderId });
    }

    try {
      const result = await sendKeysTrade({ orderId, keyCount, tradeUrl });
      processed.markProcessed(orderId, result);
      console.log("[steam-bot] delivered", orderId, keyCount, "keys", result.tradeOfferId || "(dry-run)");
      res.json({
        ok: true,
        orderId,
        keyCount,
        tradeOfferId: result.tradeOfferId || null,
        status: result.status || "sent",
        dryRun: !!result.dryRun,
      });
    } catch (e) {
      const msg = String(e.message || e);
      console.error("[steam-bot] deliver fail", orderId, msg);
      res.status(500).json({ ok: false, message: msg, orderId });
    }
  });

  return app;
}

function startSteamBotServer() {
  const disabled = String(process.env.STEAM_BOT_ENABLED || "").toLowerCase();
  if (disabled === "0" || disabled === "false" || disabled === "no") {
    console.log("[steam-bot] отключён (STEAM_BOT_ENABLED=0)");
    return null;
  }

  const PORT = parseInt(String(process.env.STEAM_BOT_PORT || "3847"), 10);
  const app = createSteamBotApp();
  const server = app.listen(PORT, () => {
    console.log(`[steam-bot] http://127.0.0.1:${PORT} — POST /deliver`);
    if (isDryRun()) {
      console.log("[steam-bot] STEAM_BOT_DRY_RUN=1 — трейды не отправляются");
    } else if (!credentialsConfigured()) {
      console.warn(
        "[steam-bot] Задайте STEAM_BOT_ACCOUNT_NAME, STEAM_BOT_PASSWORD, STEAM_BOT_SHARED_SECRET (см. server/steam-bot/.env.example)",
      );
    } else {
      ensureReady()
        .then(() => console.log("[steam-bot] Steam: вход выполнен"))
        .catch((e) => console.error("[steam-bot] Steam login failed:", e.message || e));
    }
  });
  return server;
}

module.exports = {
  createSteamBotApp,
  startSteamBotServer,
  isDryRun,
  credentialsConfigured,
};
