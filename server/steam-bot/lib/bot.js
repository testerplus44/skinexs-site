/**
 * Вход бота в Steam и отправка TF2-ключей по trade URL.
 */
const SteamUser = require("steam-user");
const SteamCommunity = require("steamcommunity");
const TradeOfferManager = require("steam-tradeoffer-manager");
const SteamTotp = require("steam-totp");
const fs = require("fs");
const path = require("path");

const TF2_APPID = 440;
const TF2_CONTEXT = 2;
const KEY_NAMES = new Set(["Mann Co. Supply Crate Key", "Mann Co. Supply Crate Key (Tradable)"]);

let client = null;
let community = null;
let manager = null;
let readyPromise = null;
let loggedIn = false;

function env(name, fallback) {
  const v = process.env[name];
  return v != null && String(v).trim() !== "" ? String(v).trim() : fallback;
}

function isDryRun() {
  const v = String(process.env.STEAM_BOT_DRY_RUN || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function credentialsConfigured() {
  return !!(env("STEAM_BOT_ACCOUNT_NAME") && env("STEAM_BOT_PASSWORD"));
}

function buildLoginOptions() {
  const accountName = env("STEAM_BOT_ACCOUNT_NAME");
  const password = env("STEAM_BOT_PASSWORD");
  const opts = { accountName, password };
  const shared = env("STEAM_BOT_SHARED_SECRET");
  if (shared) {
    opts.twoFactorCode = SteamTotp.generateAuthCode(shared);
  }
  return opts;
}

function initManager() {
  if (manager) return manager;
  client = new SteamUser();
  community = new SteamCommunity();
  manager = new TradeOfferManager({
    steam: client,
    community,
    language: "en",
    pollInterval: 12_000,
  });
  return manager;
}

function loginBot() {
  if (isDryRun()) {
    loggedIn = true;
    return Promise.resolve({ dryRun: true });
  }
  if (!credentialsConfigured()) {
    return Promise.reject(
      new Error("Задайте STEAM_BOT_ACCOUNT_NAME и STEAM_BOT_PASSWORD (или STEAM_BOT_DRY_RUN=1 для теста)."),
    );
  }
  initManager();
  if (loggedIn) return Promise.resolve({ ok: true });

  return new Promise((resolve, reject) => {
    const onError = (err) => {
      client.removeListener("webSession", onWebSession);
      client.removeListener("loggedOn", onLoggedOn);
      reject(err);
    };
    const onLoggedOn = () => {
      client.setPersona(SteamUser.EPersonaState.Online);
    };
    const onWebSession = (_sessionId, cookies) => {
      community.setCookies(cookies);
      manager.setCookies(cookies, (err) => {
        client.removeListener("error", onError);
        if (err) return reject(err);
        loggedIn = true;
        resolve({ ok: true });
      });
    };
    client.once("loggedOn", onLoggedOn);
    client.once("webSession", onWebSession);
    client.once("error", onError);
    client.logOn(buildLoginOptions());
  });
}

function ensureReady() {
  if (!readyPromise) {
    readyPromise = loginBot().catch((e) => {
      readyPromise = null;
      throw e;
    });
  }
  return readyPromise;
}

function filterKeys(inventory) {
  return (inventory || []).filter((item) => {
    const n = item.market_hash_name || item.name || "";
    return KEY_NAMES.has(n) || /Mann Co\. Supply Crate Key/i.test(n);
  });
}

function getKeysFromInventory(count) {
  const m = initManager();
  return new Promise((resolve, reject) => {
    m.getInventoryContents(TF2_APPID, TF2_CONTEXT, true, (err, inv) => {
      if (err) return reject(err);
      const keys = filterKeys(inv);
      if (keys.length < count) {
        return reject(
          new Error(`В инвентаре бота только ${keys.length} ключ(ей), нужно ${count}. Пополните инвентарь TF2.`),
        );
      }
      resolve(
        keys.slice(0, count).map((k) => ({
          appid: TF2_APPID,
          contextid: String(TF2_CONTEXT),
          assetid: String(k.assetid),
        })),
      );
    });
  });
}

/**
 * @param {{ orderId: string, keyCount: number, tradeUrl: string }} order
 */
async function sendKeysTrade(order) {
  const keyCount = Math.round(Number(order.keyCount));
  const tradeUrl = String(order.tradeUrl || "").trim();
  const orderId = String(order.orderId || "").trim();
  if (!orderId) throw new Error("Нет orderId.");
  if (!tradeUrl) throw new Error("Нет tradeUrl.");
  if (!Number.isFinite(keyCount) || keyCount < 1 || keyCount > 99) {
    throw new Error("keyCount от 1 до 99.");
  }

  if (isDryRun()) {
    console.log("[steam-bot dry-run] would send", keyCount, "keys to", tradeUrl, "order", orderId);
    return { dryRun: true, tradeOfferId: null, status: "dry_run" };
  }

  await ensureReady();
  const items = await getKeysFromInventory(keyCount);
  const m = initManager();

  return new Promise((resolve, reject) => {
    m.createOffer(tradeUrl, (err, offer) => {
      if (err) return reject(err);
      offer.addMyItems(items);
      offer.setMessage(`Skinexs · заказ ${orderId} · ${keyCount} ключ(ей)`);
      offer.send((sendErr, status) => {
        if (sendErr) return reject(sendErr);
        resolve({
          tradeOfferId: offer.id,
          status: status || "unknown",
        });
      });
    });
  });
}

module.exports = {
  ensureReady,
  sendKeysTrade,
  isDryRun,
  credentialsConfigured,
};
