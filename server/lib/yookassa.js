/**
 * ЮKassa API v3: создание платежа и получение статуса.
 * Переменные: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY
 *
 * Если обе переменные не заданы, подставляются встроенные тестовые ключи (удобно для локальной отладки).
 * В продакшене всегда задавайте YOOKASSA_* в окружении и не полагайтесь на встроенные значения.
 */
const crypto = require("crypto");

const API = "https://api.yookassa.ru/v3";

/** Тестовый магазин ЮKassa — только если в process.env нет пары ключей. */
const EMBEDDED_TEST_SHOP_ID = "1336236";
const EMBEDDED_TEST_SECRET_KEY = "test_Pp6xKvaPDIUNxIJQcRC_zF7U3KoE8Z43Lto9r3XfaaE";

function resolveCredentials() {
  const envShop = String(process.env.YOOKASSA_SHOP_ID || "").trim();
  const envSecret = String(process.env.YOOKASSA_SECRET_KEY || "").trim();
  if (envShop && envSecret) {
    return { shopId: envShop, secret: envSecret, embedded: false };
  }
  if (envShop || envSecret) {
    console.warn(
      "[yookassa] Задана только одна из YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY — для работы нужны обе; используются встроенные тестовые ключи.",
    );
  } else {
    console.warn(
      "[yookassa] Переменные YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY не заданы — используются встроенные ТЕСТОВЫЕ ключи. Для продакшена задайте переменные окружения.",
    );
  }
  return { shopId: EMBEDDED_TEST_SHOP_ID, secret: EMBEDDED_TEST_SECRET_KEY, embedded: true };
}

function authHeader() {
  const { shopId, secret } = resolveCredentials();
  if (!shopId || !secret) return null;
  return `Basic ${Buffer.from(`${shopId}:${secret}`).toString("base64")}`;
}

function isConfigured() {
  return !!authHeader();
}

async function createPayment(body) {
  const auth = authHeader();
  if (!auth) {
    const err = new Error("YooKassa: не удалось сформировать авторизацию");
    err.code = "not_configured";
    throw err;
  }
  const idempotenceKey = crypto.randomUUID();
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.description || data.code || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function getPayment(paymentId) {
  const auth = authHeader();
  if (!auth) throw new Error("YooKassa не настроена");
  const res = await fetch(`${API}/payments/${encodeURIComponent(String(paymentId))}`, {
    headers: { Authorization: auth },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.description || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

module.exports = {
  isConfigured,
  createPayment,
  getPayment,
};
