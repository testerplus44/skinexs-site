/**
 * Клиент Avatarix Protocol v2.0 (POST /home/index, x-www-form-urlencoded, ответ JSON).
 * @see https://apidoc.avatarix.net/docs/introduction/
 * @see https://apidoc.avatarix.net/docs/payment/
 * @see https://apidoc.avatarix.net/docs/status/
 */
const crypto = require("crypto");

const DEFAULT_DEV_BASE = "https://processingdev.avatarix.net";
const DEFAULT_PROD_BASE = "https://processing.avatarix.net";

function getBaseUrl() {
  const u = process.env.AVATARIX_BASE_URL;
  if (u && String(u).trim()) return String(u).trim().replace(/\/$/, "");
  if (process.env.AVATARIX_SANDBOX === "1" || process.env.AVATARIX_SANDBOX === "true") {
    return DEFAULT_DEV_BASE;
  }
  return DEFAULT_PROD_BASE;
}

function isConfigured() {
  const id = process.env.AVATARIX_AGENT_ID;
  const pw = process.env.AVATARIX_AGENT_PASSWORD;
  const svc = process.env.AVATARIX_SERVICE_STEAM;
  return !!(id && String(id).trim() && pw != null && String(pw) !== "" && svc && String(svc).trim());
}

/** Дата запроса в GMT+6 (как в документации). */
function formatRequestDateGmt6(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const g = (t) => parts.find((p) => p.type === t)?.value || "00";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")}`;
}

/** Уникальный TransactionID до 15 символов (идемпотентность на стороне Avatarix). */
function makeTransactionId() {
  const hex = crypto.randomBytes(4).toString("hex");
  const tail = String(Date.now() % 1e9);
  const s = hex + tail;
  return s.length <= 15 ? s : s.slice(0, 15);
}

/**
 * @param {Record<string, string>} fields
 * @returns {Promise<object>}
 */
async function postHomeIndex(fields) {
  const base = getBaseUrl();
  const url = `${base}/home/index`;
  const body = new URLSearchParams(fields).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/plain, */*",
    },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const err = new Error(`Avatarix: ответ не JSON (HTTP ${res.status})`);
    err.rawBody = text.slice(0, 500);
    throw err;
  }
  json._httpStatus = res.status;
  return json;
}

function agentAuthFields() {
  const agentId = String(process.env.AVATARIX_AGENT_ID || "").trim();
  const agentPassword = String(process.env.AVATARIX_AGENT_PASSWORD || "");
  if (!agentId || !agentPassword) {
    const e = new Error("Avatarix не настроен: задайте AVATARIX_AGENT_ID, AVATARIX_AGENT_PASSWORD.");
    e.code = "NOT_CONFIGURED";
    throw e;
  }
  return {
    AgentID: agentId,
    AgentPassword: agentPassword,
    RequestDate: formatRequestDateGmt6(),
  };
}

function steamServiceFields() {
  const service = String(process.env.AVATARIX_SERVICE_STEAM || "").trim();
  const currency = String(process.env.AVATARIX_CURRENCY || "RUB").trim().toUpperCase() || "RUB";
  if (!service) {
    const e = new Error("Задайте AVATARIX_SERVICE_STEAM (ID услуги Steam у менеджера Avatarix).");
    e.code = "NOT_CONFIGURED";
    throw e;
  }
  return { Service: service, Currency: currency };
}

/** Сумма в формате документации 0.00 */
function formatAmountRub(rub) {
  const n = Math.round(Number(rub));
  if (!Number.isFinite(n) || n < 1) throw new Error("Некорректная сумма.");
  return `${n}.00`;
}

/**
 * Платёж (зачисление на услугу — Steam по логину Account).
 * @param {{ account: string, amountRub: number, transactionId?: string }} opts
 */
async function requestPayment(opts) {
  const account = String(opts.account || "").trim();
  const amountRub = Number(opts.amountRub);
  const tid = (opts.transactionId && String(opts.transactionId).trim()) || makeTransactionId();
  if (tid.length > 15) {
    const e = new Error("TransactionID длиннее 15 символов.");
    e.code = "BAD_TXN_ID";
    throw e;
  }
  const auth = agentAuthFields();
  const steam = steamServiceFields();
  const fields = Object.assign({}, auth, steam, {
    RequestType: "Payment",
    Amount: formatAmountRub(amountRub),
    TransactionID: tid,
    Account: account,
  });
  const data = await postHomeIndex(fields);
  return { transactionId: tid, data };
}

/**
 * Статус транзакции.
 * @param {string} transactionId
 */
async function requestStatus(transactionId) {
  const tid = String(transactionId || "").trim();
  if (!tid) throw new Error("Нет TransactionID.");
  const auth = agentAuthFields();
  const fields = Object.assign({}, auth, {
    RequestType: "Status",
    TransactionID: tid,
  });
  const data = await postHomeIndex(fields);
  return { transactionId: tid, data };
}

/** В документации успех примерно ResponseStatus === 10 */
function isSuccessResponse(data) {
  const st = data && data.ResponseStatus;
  return st === 10 || st === "10";
}

module.exports = {
  getBaseUrl,
  isConfigured,
  formatRequestDateGmt6,
  makeTransactionId,
  requestPayment,
  requestStatus,
  isSuccessResponse,
};
