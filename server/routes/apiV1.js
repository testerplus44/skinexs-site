/**
 * REST API v1: сессии cookie, каталог в SQLite, лоты, заказы, отзывы, тикеты, платежи-заглушка.
 */
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getDb } = require("../lib/db");
const { audit } = require("../lib/audit");
const { enqueue, notifyInApp, notifyStaffInApp } = require("../lib/notify");
const { verifySteamQueryString } = require("../lib/steam-openid");
const yk = require("../lib/yookassa");
const avatarix = require("../lib/avatarix");
const steamTopupSettings = require("../lib/steam-topup-settings");
const steamTopupEvents = require("../lib/steam-topup-events");
const homeBanners = require("../lib/home-banners");
const catalogLib = require("../lib/catalog");
const steamKeysDelivery = require("../lib/steam-keys-delivery");

const router = express.Router();

function uid(prefix) {
  return prefix + crypto.randomBytes(10).toString("hex");
}

function normEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

const ORDER_TRADER_CHAIN = {
  CREATED: "ASSIGNED",
  ASSIGNED: "WAITING_PERIOD",
  WAITING_PERIOD: "READY_TO_DELIVER",
  READY_TO_DELIVER: "DELIVERED",
};

const ORDER_TRADER_NEXT_NOTE = {
  ASSIGNED: "Трейдер принял заказ в работу",
  WAITING_PERIOD: "Добавление в друзья зафиксировано, идёт 30-дневный период",
  READY_TO_DELIVER: "Прошло 30 дней, можно отправлять подарок",
  DELIVERED: "Подарок отправлен покупателю",
};

function ordersRowToClient(r) {
  const doc = Object.assign(JSON.parse(r.json || "{}"), {
    id: r.id,
    orderNumber: r.order_number,
    status: r.status,
    createdAt: r.created_at,
  });
  if (!doc.dealId) doc.dealId = r.id;
  return doc;
}

function orderItemsReferToTrader(doc, sessionEmail, sessionUserId) {
  const em = normEmail(sessionEmail);
  const items = doc.items || [];
  return items.some((line) => {
    if (line && line.traderUserId != null && String(line.traderUserId) === String(sessionUserId)) return true;
    return normEmail(line && line.traderEmail) === em;
  });
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ ok: false, message: "Требуется вход." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId || req.session.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Нужны права администратора." });
  }
  next();
}

function requireTrader(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ ok: false, message: "Требуется вход." });
  }
  if (req.session.role !== "trader" && req.session.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Нужна роль трейдера." });
  }
  next();
}

function formatUserRow(row) {
  if (!row) return null;
  const br = typeof row.balance_rub === "number" ? row.balance_rub : 0;
  return {
    id: row.id,
    userId: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name || (row.email ? row.email.split("@")[0] : ""),
    steamId: row.steam_id || null,
    balanceRub: Math.max(0, Math.floor(br)),
  };
}

function publicOrigin(req) {
  const env = process.env.SKINEX_PUBLIC_ORIGIN;
  if (env) return String(env).replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function rubFromYooAmount(amount) {
  if (!amount || amount.value == null) return 0;
  return Math.round(Number(amount.value));
}

/** Зачислить баланс по успешному платежу ЮKassa (идемпотентно). */
function finalizeTopupFromPayment(db, payment) {
  const pid = payment && payment.id ? String(payment.id) : "";
  const meta = (payment && payment.metadata) || {};
  if (!pid) return { ok: false, reason: "no_id" };
  if (String(meta.kind || "") !== "balance_topup") return { ok: false, reason: "not_topup" };
  const topupId = String(meta.topup_id || "").trim();
  if (!topupId) return { ok: false, reason: "no_topup" };

  const row = db.prepare("SELECT * FROM balance_topups WHERE id = ?").get(topupId);
  if (!row) return { ok: false, reason: "topup_not_found" };
  if (row.status === "succeeded") return { ok: true, already: true };
  if (payment.status !== "succeeded") return { ok: false, reason: "not_succeeded" };

  const amountRub = rubFromYooAmount(payment.amount);
  if (amountRub < 1 || amountRub !== row.amount_rub) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const run = () => {
    db.prepare("UPDATE users SET balance_rub = balance_rub + ? WHERE id = ?").run(amountRub, row.user_id);
    db.prepare("UPDATE balance_topups SET status = ?, yookassa_payment_id = ?, updated_at = ? WHERE id = ?").run(
      "succeeded",
      pid,
      Date.now(),
      topupId,
    );
    db.prepare(
      "INSERT INTO payments (id, order_id, provider, external_id, amount, status, json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      uid("pay_"),
      `topup:${topupId}`,
      "yookassa",
      pid,
      amountRub,
      "succeeded",
      JSON.stringify({ topupId, yookassaPaymentId: pid }),
      Date.now(),
    );
  };
  db.transaction(run)();
  try {
    notifyInApp(row.user_id, {
      kind: "balance",
      title: "Баланс пополнен",
      body: `Зачислено ${amountRub} ₽.`,
      link: "/account",
    });
  } catch (e) {
    console.error("[notifyInApp topup]", e.message || e);
  }
  return { ok: true, userId: row.user_id, amountRub };
}

/** Зафиксировать оплату заказа ключей (выгодное пополнение) и поставить в очередь вебхук боту. */
function finalizeSteamKeysOrderFromPayment(db, payment) {
  const pid = payment && payment.id ? String(payment.id) : "";
  const meta = (payment && payment.metadata) || {};
  if (!pid) return { ok: false, reason: "no_id" };
  if (String(meta.kind || "") !== "steam_keys_order") return { ok: false, reason: "not_steam_keys" };
  const orderId = String(meta.steam_keys_order_id || "").trim();
  if (!orderId) return { ok: false, reason: "no_order" };

  const row = db.prepare("SELECT * FROM steam_keys_orders WHERE id = ?").get(orderId);
  if (!row) return { ok: false, reason: "order_not_found" };
  if (row.status === "succeeded") return { ok: true, already: true, orderId };
  if (payment.status !== "succeeded") return { ok: false, reason: "not_succeeded" };

  const amountRub = rubFromYooAmount(payment.amount);
  if (amountRub < 1 || amountRub !== row.amount_rub) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const run = () => {
    db.prepare(
      "UPDATE steam_keys_orders SET status = 'succeeded', yookassa_payment_id = ?, updated_at = ? WHERE id = ?",
    ).run(pid, Date.now(), orderId);
    db.prepare(
      "INSERT INTO payments (id, order_id, provider, external_id, amount, status, json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      uid("pay_"),
      orderId,
      "yookassa",
      pid,
      amountRub,
      "succeeded",
      JSON.stringify({ steamKeysOrderId: orderId, yookassaPaymentId: pid }),
      Date.now(),
    );
  };
  db.transaction(run)();

  try {
    steamTopupEvents.insertSteamTopupEvent({
      method: "keys",
      kind: "yookassa_succeeded",
      userId: row.user_id,
      steamRef: row.trade_url,
      keyCount: row.key_count,
      amountSteamRub: row.amount_steam_estimate_rub,
      amountSiteRub: row.amount_rub,
      partnerTxId: pid,
      partnerOk: true,
      payMethod: row.pay_method,
    });
  } catch (e) {
    console.error("[steam_topup_events keys yookassa]", e.message || e);
  }
  if (row.user_id) {
    try {
      notifyInApp(row.user_id, {
        kind: "steam_keys",
        title: "Оплата ключей принята",
        body: `Заказ ${row.key_count} шт. Отправка по трейд-ссылке обрабатывается.`,
        link: "/steam-topup",
      });
    } catch (e) {
      console.error("[notifyInApp steam keys]", e.message || e);
    }
  }

  steamKeysDelivery.queueDeliveryAfterPayment(orderId);
  return { ok: true, already: false, orderId, userId: row.user_id, amountRub };
}

function setSessionFromUser(req, row) {
  req.session.userId = row.id;
  req.session.role = row.role;
  req.session.email = row.email;
  req.session.displayName = row.display_name || row.email.split("@")[0];
}

// ——— Auth ———

router.get("/auth/me", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ ok: false, message: "Не авторизован." });
  }
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, email, role, display_name, steam_id, trader_banned, balance_rub FROM users WHERE id = ?",
    )
    .get(req.session.userId);
  if (!row) {
    req.session.destroy(() => {});
    return res.status(401).json({ ok: false, message: "Сессия недействительна." });
  }
  return res.json({
    ok: true,
    yookassaTopup: yk.isConfigured(),
    yookassaSteamKeys: yk.isConfigured(),
    user: Object.assign({}, formatUserRow(row), { traderBanned: !!row.trader_banned }),
  });
});

router.post("/auth/register", (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const password = req.body && req.body.password;
  const displayName = String((req.body && req.body.displayName) || "").trim() || email.split("@")[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: "Некорректный email." });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ ok: false, message: "Пароль не короче 6 символов." });
  }
  const adminEmail = (process.env.SKINEX_ADMIN_EMAIL || "admin@skinex.local").toLowerCase();
  if (email === adminEmail) {
    return res.status(400).json({ ok: false, message: "Этот email зарезервирован." });
  }
  const db = getDb();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    return res.status(400).json({ ok: false, message: "Пользователь уже существует." });
  }
  const id = uid("usr_");
  const hash = bcrypt.hashSync(String(password), 10);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, role, display_name, created_at) VALUES (?, ?, ?, 'user', ?, ?)",
  ).run(id, email, hash, displayName, Date.now());
  setSessionFromUser(req, {
    id,
    email,
    role: "user",
    display_name: displayName,
  });
  audit(req, "auth.register", email);
  enqueue(id, "email", {
    to: email,
    subject: "Регистрация Skinexs",
    text: "Вы зарегистрировались на Skinexs. Это автоматическое уведомление.",
  });
  try {
    notifyInApp(id, {
      kind: "welcome",
      title: "Добро пожаловать в Skinexs",
      body: "Аккаунт создан. Пополните баланс в личном кабинете, чтобы оформлять заказы.",
      link: "/account",
    });
  } catch (e) {
    console.error("[notifyInApp register]", e.message || e);
  }
  const urow = db
    .prepare("SELECT id, email, role, display_name, steam_id, balance_rub FROM users WHERE id = ?")
    .get(id);
  res.json({ ok: true, role: "user", user: formatUserRow(urow) });
});

router.post("/auth/login", (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const password = req.body && req.body.password;
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row || !row.password_hash) {
    return res.status(401).json({ ok: false, message: "Неверный email или пароль." });
  }
  if (!bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ ok: false, message: "Неверный email или пароль." });
  }
  setSessionFromUser(req, row);
  audit(req, "auth.login", email);
  const urow = db
    .prepare("SELECT id, email, role, display_name, steam_id, balance_rub FROM users WHERE id = ?")
    .get(row.id);
  res.json({ ok: true, role: urow.role, user: formatUserRow(urow) });
});

router.post("/auth/logout", (req, res) => {
  audit(req, "auth.logout", req.session && req.session.email);
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ ok: false, message: err.message });
    res.json({ ok: true });
  });
});

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRES_MS = 60 * 60 * 1000;

function sha256hex(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("hex");
}

/** Одинаковый ответ при отсутствии пользователя — без утечки существования email. */
const FORGOT_PASSWORD_OK_MESSAGE =
  "Если указанный email зарегистрирован и для него включён вход по паролю, на него отправлена ссылка для сброса. Проверьте почту (и папку «Спам»).";

router.post("/auth/forgot-password", (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const okPayload = { ok: true, message: FORGOT_PASSWORD_OK_MESSAGE };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: "Некорректный email." });
  }
  const adminEmail = (process.env.SKINEX_ADMIN_EMAIL || "admin@skinex.local").toLowerCase();
  if (email === adminEmail) {
    return res.json(okPayload);
  }
  const db = getDb();
  const row = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email);
  if (!row || !row.password_hash) {
    audit(req, "auth.forgot_password_miss", email);
    return res.json(okPayload);
  }
  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = sha256hex(rawToken);
  const now = Date.now();
  const expiresAt = now + RESET_EXPIRES_MS;
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(row.id);
  const prId = uid("prt_");
  db.prepare(
    "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(prId, row.id, tokenHash, expiresAt, now);
  const origin = publicOrigin(req);
  const link = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const text =
    "Здравствуйте.\n\nЧтобы задать новый пароль для аккаунта Skinexs, перейдите по ссылке (действует 1 час):\n\n" +
    link +
    "\n\nЕсли вы не запрашивали сброс, проигнорируйте это письмо.\n";
  enqueue(row.id, "email", {
    to: row.email,
    subject: "Skinexs — сброс пароля",
    text,
  });
  audit(req, "auth.forgot_password", email);
  if (process.env.SKINEX_LOG_PASSWORD_RESET_LINK === "1") {
    console.log("[password-reset] link for", email, link);
  }
  res.json(okPayload);
});

router.post("/auth/reset-password", (req, res) => {
  const token = String((req.body && req.body.token) || "").trim();
  const password = req.body && req.body.password;
  if (!token || token.length < 64) {
    return res.status(400).json({ ok: false, message: "Ссылка недействительна или устарела." });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ ok: false, message: "Пароль не короче 6 символов." });
  }
  const tokenHash = sha256hex(token);
  const db = getDb();
  const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token_hash = ?").get(tokenHash);
  if (!row || row.expires_at < Date.now()) {
    return res.status(400).json({ ok: false, message: "Ссылка недействительна или устарела. Запросите новую." });
  }
  const hash = bcrypt.hashSync(String(password), 10);
  const run = () => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, row.user_id);
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(row.user_id);
  };
  db.transaction(run)();
  audit(req, "auth.reset_password", row.user_id);
  res.json({ ok: true, message: "Пароль обновлён. Можно войти с новым паролем." });
});

router.post("/auth/steam/session", async (req, res) => {
  try {
    const q = req.body && req.body.query;
    if (typeof q !== "string") {
      return res.status(400).json({ ok: false, message: "Нет query." });
    }
    const vr = await verifySteamQueryString(q);
    if (!vr.ok || !vr.steamId) {
      return res.status(401).json({ ok: false, message: vr.message || "Steam." });
    }
    const steamId = vr.steamId;
    const synthEmail = `steam_${steamId}@steam.skinex.local`;
    const db = getDb();
    let row = db.prepare("SELECT * FROM users WHERE steam_id = ?").get(steamId);
    if (!row) {
      row = db.prepare("SELECT * FROM users WHERE email = ?").get(synthEmail);
    }
    var createdSteamUser = false;
    if (!row) {
      createdSteamUser = true;
      const id = uid("usr_");
      db.prepare(
        "INSERT INTO users (id, email, password_hash, role, display_name, steam_id, created_at) VALUES (?, ?, NULL, 'user', ?, ?, ?)",
      ).run(id, synthEmail, `Игрок ${steamId.slice(-6)}`, steamId, Date.now());
      row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    } else if (!row.steam_id) {
      db.prepare("UPDATE users SET steam_id = ? WHERE id = ?").run(steamId, row.id);
      row.steam_id = steamId;
    }
    setSessionFromUser(req, row);
    audit(req, "auth.steam", steamId);
    if (createdSteamUser) {
      try {
        notifyInApp(row.id, {
          kind: "welcome",
          title: "Аккаунт Steam подключён",
          body: "Добро пожаловать! Пополните баланс в личном кабинете для покупок.",
          link: "/account",
        });
      } catch (e) {
        console.error("[notifyInApp steam]", e.message || e);
      }
    }
    res.json({
      ok: true,
      user: formatUserRow(row),
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.get("/public/steam-topup-settings", (req, res) => {
  try {
    const s = steamTopupSettings.getSteamTopupSettings();
    res.json({
      ok: true,
      instantCommissionPct: s.instantCommissionPct,
      keysPriceRub: s.keysPriceRub,
      keysClientProfitPct: s.keysClientProfitPct,
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.get("/public/home-banners", (req, res) => {
  try {
    const banners = homeBanners.listHomeBanners({ publicOnly: true });
    res.json({ ok: true, banners });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

/** Лог намерения оплатить выгодное пополнение (ключи) — для дашборда; не подтверждение оплаты. */
router.post("/public/steam-topup/keys-intent", (req, res) => {
  try {
    const b = req.body || {};
    const keyCount = Math.round(Number(b.keyCount));
    const amountSiteRub = Math.round(Number(b.amountSiteRub));
    const amountSteamRub = Math.round(Number(b.amountSteamRub));
    const tradeUrl = String(b.tradeUrl || "").trim().slice(0, 500);
    if (!Number.isFinite(keyCount) || keyCount < 1 || keyCount > 99) {
      return res.status(400).json({ ok: false, message: "keyCount от 1 до 99." });
    }
    if (!Number.isFinite(amountSiteRub) || amountSiteRub < 1 || amountSiteRub > 50_000_000) {
      return res.status(400).json({ ok: false, message: "Некорректная сумма на сайте." });
    }
    if (!Number.isFinite(amountSteamRub) || amountSteamRub < 1 || amountSteamRub > 50_000_000) {
      return res.status(400).json({ ok: false, message: "Некорректная оценка Steam." });
    }
    const userId = req.session && req.session.userId ? String(req.session.userId) : null;
    steamTopupEvents.insertSteamTopupEvent({
      method: "keys",
      kind: "checkout_intent",
      userId,
      steamRef: tradeUrl,
      keyCount,
      amountSteamRub,
      amountSiteRub,
      partnerTxId: null,
      partnerOk: null,
      payMethod: b.payMethod != null ? String(b.payMethod).slice(0, 16) : null,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("[keys-intent]", e.message || e);
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

// ——— Catalog ———

router.get("/catalog", (req, res) => {
  try {
    const db = getDb();
    const list = catalogLib.listCatalogItems(db);
    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json(list);
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.put("/catalog/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ ok: false, message: "Нет id." });
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, message: "Нет JSON товара." });
  }
  try {
    const db = getDb();
    const item = catalogLib.saveCatalogItem(db, Object.assign({}, body, { id }));
    audit(req, "catalog.put", id);
    res.json({ ok: true, item });
  } catch (e) {
    res.status(400).json({ ok: false, message: String(e.message || e) });
  }
});

router.delete("/catalog/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ ok: false, message: "Нет id." });
  try {
    const db = getDb();
    const ok = catalogLib.deleteCatalogItem(db, id);
    if (!ok) return res.status(404).json({ ok: false, message: "Товар не найден." });
    audit(req, "catalog.delete", id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

/** Импорт товаров (один объект или массив) с полями Steam Economy. */
router.post("/admin/catalog/import", requireAdmin, (req, res) => {
  try {
    const body = req.body;
    const payloads = Array.isArray(body) ? body : body && body.items ? body.items : [body];
    const db = getDb();
    const result = catalogLib.importCatalogItems(db, payloads);
    audit(req, "admin.catalog_import", JSON.stringify({ saved: result.saved.length, errors: result.errors.length }));
    res.json({
      ok: true,
      saved: result.saved.length,
      errors: result.errors,
      items: result.saved,
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

// ——— Market ———

router.get("/market/offers", (req, res) => {
  const itemId = req.query.itemId != null ? String(req.query.itemId) : "";
  const db = getDb();
  let q = "SELECT * FROM market_offers WHERE hidden = 0 AND qty > 0 AND price > 0";
  const args = [];
  if (itemId) {
    q += " AND item_id = ?";
    args.push(itemId);
  }
  q += " ORDER BY price ASC, created_at ASC";
  const rows = db.prepare(q).all(...args);
  res.json(rows.map((r) => {
    const urow = db.prepare("SELECT email FROM users WHERE id = ?").get(r.trader_user_id);
    return {
    id: r.id,
    itemId: r.item_id,
    traderEmail: (urow && urow.email) || "",
    traderDisplayName: r.trader_display_name || "",
    price: r.price,
    qty: r.qty,
    createdAt: r.created_at,
  };
  }));
});

router.post("/market/offers", requireTrader, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT trader_banned, email, display_name FROM users WHERE id = ?").get(req.session.userId);
  if (user && user.trader_banned) {
    return res.status(403).json({ ok: false, message: "Трейдер заблокирован для лотов." });
  }
  const itemId = String((req.body && req.body.itemId) || "");
  const price = Math.floor(Number(req.body && req.body.price));
  const qty = Math.floor(Number(req.body && req.body.qty));
  if (!itemId) return res.status(400).json({ ok: false, message: "Нет товара." });
  const row = db.prepare("SELECT json FROM catalog_items WHERE id = ?").get(itemId);
  if (!row) return res.status(404).json({ ok: false, message: "Товар не в каталоге." });
  let item;
  try {
    item = JSON.parse(row.json);
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Битый JSON каталога." });
  }
  if (item.traderListingsAllowed === false) {
    return res.status(403).json({ ok: false, message: "Лоты для этого товара отключены." });
  }
  if (!Number.isFinite(price) || price < 1 || !Number.isFinite(qty) || qty < 1) {
    return res.status(400).json({ ok: false, message: "Некорректная цена или количество." });
  }
  const existing = db
    .prepare("SELECT id FROM market_offers WHERE item_id = ? AND trader_user_id = ?")
    .get(itemId, req.session.userId);
  const disp = (user && user.display_name) || (user && user.email) || "";
  if (existing) {
    db.prepare(
      "UPDATE market_offers SET price = ?, qty = ?, hidden = 0, trader_display_name = ?, created_at = ? WHERE id = ?",
    ).run(price, qty, disp, Date.now(), existing.id);
    audit(req, "market.offer.update", itemId);
    return res.json({ ok: true, updated: true, id: existing.id });
  }
  const oid = uid("mof_");
  db.prepare(
    "INSERT INTO market_offers (id, item_id, trader_user_id, price, qty, hidden, created_at, trader_display_name) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
  ).run(oid, itemId, req.session.userId, price, qty, Date.now(), disp);
  audit(req, "market.offer.create", itemId);
  res.json({ ok: true, updated: false, id: oid });
});

router.delete("/market/offers/:id", requireTrader, (req, res) => {
  const db = getDb();
  const id = String(req.params.id || "");
  const row = db.prepare("SELECT * FROM market_offers WHERE id = ?").get(id);
  if (!row || row.trader_user_id !== req.session.userId) {
    return res.status(404).json({ ok: false, message: "Лот не найден." });
  }
  db.prepare("DELETE FROM market_offers WHERE id = ?").run(id);
  audit(req, "market.offer.delete", id);
  res.json({ ok: true });
});

// ——— Orders (упрощённое оформление) ———

router.get("/orders", requireAuth, (req, res) => {
  const db = getDb();
  const uid = req.session.userId;
  const buyerRows = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(uid);
  const seen = new Set(buyerRows.map((r) => r.id));
  const extra = [];
  if (req.session.role === "trader" || req.session.role === "admin") {
    const cap = 2000;
    const all = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?").all(cap);
    for (const r of all) {
      if (seen.has(r.id)) continue;
      try {
        const doc = JSON.parse(r.json || "{}");
        if (orderItemsReferToTrader(doc, req.session.email, uid)) extra.push(r);
      } catch (e) {
        /* skip */
      }
    }
  }
  const rows = buyerRows.concat(extra).sort((a, b) => b.created_at - a.created_at);
  res.json(rows.map(ordersRowToClient));
});

router.post("/orders/checkout", requireAuth, (req, res) => {
  const cart = (req.body && req.body.cart) || {};
  const db = getDb();
  const uidUser = req.session.userId;
  const lines = [];
  let total = 0;
  for (const itemId of Object.keys(cart)) {
    const q = Math.floor(Number(cart[itemId])) || 0;
    if (q < 1) continue;
    const crow = db.prepare("SELECT json FROM catalog_items WHERE id = ?").get(String(itemId));
    if (!crow) continue;
    const it = JSON.parse(crow.json);
    const unit = Math.max(0, Math.floor(Number(it.price)) || 0);
    total += unit * q;
    lines.push({
      itemId: String(itemId),
      name: it.name,
      qty: q,
      unitPrice: unit,
      lineTotal: unit * q,
    });
  }
  if (!lines.length) {
    return res.status(400).json({ ok: false, message: "Корзина пуста." });
  }
  const maxN = db.prepare("SELECT MAX(order_number) AS m FROM orders").get();
  const nextNum = (maxN && maxN.m ? Number(maxN.m) : 0) + 1;
  const oid = uid("ord_");
  const order = {
    id: oid,
    dealId: oid,
    orderNumber: nextNum,
    status: "CREATED",
    items: lines,
    total,
    buyerEmail: req.session.email,
    timeline: [{ at: Date.now(), status: "CREATED", note: "Заказ создан и оплачен (сервер)" }],
  };
  db.prepare(
    "INSERT INTO orders (id, user_id, order_number, status, json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(oid, uidUser, nextNum, "CREATED", JSON.stringify(order), Date.now());
  audit(req, "order.create", oid);
  enqueue(uidUser, "email", {
    to: req.session.email,
    subject: `Заказ №${nextNum} принят`,
    text: `Ваш заказ №${nextNum} на сумму ${total} ₽ создан.`,
  });
  try {
    notifyInApp(uidUser, {
      kind: "order",
      title: `Заказ №${nextNum} принят`,
      body: `Сумма ${total} ₽. Статус можно отслеживать в личном кабинете.`,
      link: "/account",
    });
  } catch (e) {
    console.error("[notifyInApp order]", e.message || e);
  }
  res.json({ ok: true, order });
});

/** Следующий этап сделки (трейдер/админ): одна запись заказа — общий статус для покупателя и исполнителя. */
router.post("/orders/:dealId/advance", requireTrader, (req, res) => {
  const dealId = String(req.params.dealId || "");
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(dealId);
  if (!row) return res.status(404).json({ ok: false, message: "Заказ не найден." });
  let doc;
  try {
    doc = JSON.parse(row.json || "{}");
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Битые данные заказа." });
  }
  if (!orderItemsReferToTrader(doc, req.session.email, req.session.userId)) {
    return res.status(403).json({ ok: false, message: "Вы не исполнитель по этому заказу." });
  }
  const st = String(doc.status || row.status || "CREATED");
  if (st === "CANCELLED" || st === "COMPLETED") {
    return res.status(400).json({ ok: false, message: "Сделка уже закрыта." });
  }
  if (st === "DELIVERED") {
    return res.status(400).json({ ok: false, message: "Ожидайте подтверждения от покупателя." });
  }
  const next = ORDER_TRADER_CHAIN[st];
  if (!next) {
    return res.status(400).json({ ok: false, message: "Нельзя перевести дальше с текущего этапа." });
  }
  if (!doc.timeline) doc.timeline = [];
  const note = ORDER_TRADER_NEXT_NOTE[next] || next;
  doc.timeline.push({ at: Date.now(), status: next, note });
  doc.status = next;
  doc.dealId = doc.dealId || doc.id || dealId;
  db.prepare("UPDATE orders SET status = ?, json = ? WHERE id = ?").run(next, JSON.stringify(doc), dealId);
  audit(req, "order.advance", dealId);
  const out = ordersRowToClient(Object.assign({}, row, { json: JSON.stringify(doc), status: next }));
  try {
    notifyInApp(row.user_id, {
      kind: "order",
      title: `Заказ №${out.orderNumber != null ? out.orderNumber : dealId}`,
      body: `Статус сделки: ${next}.`,
      link: "/account",
    });
  } catch (e) {
    console.error("[notifyInApp order advance]", e.message || e);
  }
  res.json({ ok: true, order: out });
});

/** Подтверждение получения покупателем. */
router.post("/orders/:dealId/complete", requireAuth, (req, res) => {
  const dealId = String(req.params.dealId || "");
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(dealId);
  if (!row) return res.status(404).json({ ok: false, message: "Заказ не найден." });
  if (row.user_id !== req.session.userId) {
    return res.status(403).json({ ok: false, message: "Только покупатель может подтвердить получение." });
  }
  let doc;
  try {
    doc = JSON.parse(row.json || "{}");
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Битые данные заказа." });
  }
  const st = String(doc.status || row.status || "");
  if (st !== "DELIVERED") {
    return res.status(400).json({ ok: false, message: "Подтвердить можно после статуса «Подарок отправлен»." });
  }
  doc.status = "COMPLETED";
  doc.completedAt = Date.now();
  if (!doc.timeline) doc.timeline = [];
  doc.timeline.push({ at: Date.now(), status: "COMPLETED", note: "Покупатель подтвердил получение" });
  doc.dealId = doc.dealId || doc.id || dealId;
  db.prepare("UPDATE orders SET status = ?, json = ? WHERE id = ?").run("COMPLETED", JSON.stringify(doc), dealId);
  audit(req, "order.complete", dealId);
  const out = ordersRowToClient(Object.assign({}, row, { json: JSON.stringify(doc), status: "COMPLETED" }));
  try {
    const items = doc.items || [];
    const seen = {};
    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      const te = normEmail(line && line.traderEmail);
      if (!te || seen[te]) continue;
      seen[te] = true;
      const urow = db.prepare("SELECT id FROM users WHERE lower(trim(email)) = ?").get(te);
      if (urow && urow.id) {
        notifyInApp(urow.id, {
          kind: "order",
          title: `Заказ №${out.orderNumber != null ? out.orderNumber : dealId} завершён`,
          body: "Покупатель подтвердил получение.",
          link: "/account",
        });
      }
    }
    notifyInApp(req.session.userId, {
      kind: "order",
      title: `Заказ №${out.orderNumber != null ? out.orderNumber : dealId} завершён`,
      body: "Сделка закрыта.",
      link: "/account",
    });
  } catch (e) {
    console.error("[notifyInApp order complete]", e.message || e);
  }
  res.json({ ok: true, order: out });
});

// ——— Reviews & tickets (JSON storage) ———

router.get("/reviews", (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT json FROM reviews ORDER BY created_at DESC LIMIT 500").all();
  res.json(rows.map((r) => JSON.parse(r.json)));
});

router.post("/reviews", requireAuth, (req, res) => {
  const db = getDb();
  const rid = uid("rev_");
  const doc = Object.assign({}, req.body, {
    id: rid,
    authorEmail: req.session.email,
    createdAt: Date.now(),
  });
  db.prepare("INSERT INTO reviews (id, json, created_at) VALUES (?, ?, ?)").run(rid, JSON.stringify(doc), Date.now());
  audit(req, "review.create", rid);
  res.json({ ok: true, review: doc });
});

router.get("/tickets", requireAuth, (req, res) => {
  const db = getDb();
  const all = db.prepare("SELECT json FROM tickets ORDER BY created_at DESC").all();
  const parsed = all.map((r) => JSON.parse(r.json));
  if (req.session.role === "admin" || req.session.role === "manager") return res.json(parsed);
  res.json(parsed.filter((t) => t && normEmail(t.userEmail) === normEmail(req.session.email)));
});

function nextSupportTicketNo(db) {
  const rows = db.prepare("SELECT json FROM tickets").all();
  let maxNo = 0;
  for (const r of rows) {
    try {
      const j = JSON.parse(r.json || "{}");
      if (j && typeof j.ticketNo === "number" && j.ticketNo > maxNo) maxNo = j.ticketNo;
    } catch (e) {
      /* ignore */
    }
  }
  return maxNo + 1;
}

router.post("/tickets", requireAuth, (req, res) => {
  const db = getDb();
  const tid = uid("tkt_");
  const ticketNo = nextSupportTicketNo(db);
  const doc = Object.assign({}, req.body, {
    id: tid,
    ticketNo,
    userEmail: req.session.email,
    status: "open",
    createdAt: Date.now(),
  });
  db.prepare("INSERT INTO tickets (id, json, created_at) VALUES (?, ?, ?)").run(tid, JSON.stringify(doc), Date.now());
  audit(req, "ticket.create", tid);
  enqueue(req.session.userId, "email", {
    to: process.env.SKINEX_SUPPORT_EMAIL || req.session.email,
    subject: "Новое обращение",
    text: JSON.stringify(doc, null, 2),
  });
  try {
    notifyInApp(req.session.userId, {
      kind: "ticket",
      title: "Обращение зарегистрировано",
      body: `Тикет №${ticketNo}. Ответ придёт на email или смотрите раздел «Поддержка».`,
      link: "/support",
    });
    notifyStaffInApp({
      kind: "ticket",
      title: "Новое обращение в поддержку",
      body: `№${ticketNo} от ${req.session.email}`,
      link: "/admin",
    });
  } catch (e) {
    console.error("[notifyInApp ticket]", e.message || e);
  }
  res.json({ ok: true, ticket: doc });
});

router.post("/tickets/:id/messages", requireAuth, (req, res) => {
  const id = String(req.params.id || "");
  const text = String((req.body && req.body.text) || "").trim();
  if (!text) return res.status(400).json({ ok: false, message: "Пустое сообщение." });
  const db = getDb();
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ ok: false, message: "Не найдено." });
  let doc = {};
  try {
    doc = JSON.parse(row.json || "{}");
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Битые данные тикета." });
  }
  const ownerEmail = normEmail(doc.userEmail || "");
  const isStaff = req.session.role === "admin" || req.session.role === "manager";
  const isOwner = normEmail(req.session.email) === ownerEmail;
  if (!isStaff && !isOwner) return res.status(403).json({ ok: false, message: "Нет доступа." });
  const messages = Array.isArray(doc.messages) ? doc.messages : [];
  const side = isStaff ? "staff" : "client";
  const mid = uid("msg_");
  messages.push({
    id: mid,
    at: Date.now(),
    text,
    side,
    fromEmail: req.session.email,
    fromName: req.session.displayName || "",
    fromRole: req.session.role || "",
  });
  doc.messages = messages;
  doc.updatedAt = Date.now();
  db.prepare("UPDATE tickets SET json = ? WHERE id = ?").run(JSON.stringify(doc), id);
  audit(req, "ticket.message", id);
  const ticketNo = doc.ticketNo != null ? doc.ticketNo : "";
  try {
    if (isStaff && doc.userEmail) {
      const urow = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(String(doc.userEmail));
      if (urow) {
        notifyInApp(urow.id, {
          kind: "support",
          title: "Сообщение от поддержки",
          body: `Тикет №${ticketNo}. Откройте раздел «Поддержка».`,
          link: "/support",
        });
      }
    } else {
      notifyStaffInApp({
        kind: "support",
        title: "Новое сообщение в тикете",
        body: `№${ticketNo} от ${req.session.email}`,
        link: "/admin",
      });
    }
  } catch (e) {
    console.error("[notifyInApp ticket msg]", e.message || e);
  }
  res.json({ ok: true });
});

// ——— Disputes ———

router.post("/disputes", requireAuth, (req, res) => {
  const db = getDb();
  const id = uid("dsp_");
  const orderId = String((req.body && req.body.orderId) || "");
  const notes = String((req.body && req.body.notes) || "");
  if (!orderId) return res.status(400).json({ ok: false, message: "Нет orderId." });
  db.prepare("INSERT INTO disputes (id, order_id, status, notes, created_at) VALUES (?, ?, 'open', ?, ?)").run(
    id,
    orderId,
    notes,
    Date.now(),
  );
  audit(req, "dispute.open", orderId);
  try {
    notifyInApp(req.session.userId, {
      kind: "dispute",
      title: "Спор зарегистрирован",
      body: `По заказу ${orderId}. Поддержка рассмотрит обращение.`,
      link: "/account",
    });
    const noteShort = notes.length > 180 ? `${notes.slice(0, 177)}…` : notes;
    notifyStaffInApp({
      kind: "dispute",
      title: "Открыт спор по заказу",
      body: `Заказ ${orderId}. ${noteShort}`,
      link: "/admin",
    });
  } catch (e) {
    console.error("[notifyInApp dispute]", e.message || e);
  }
  res.json({ ok: true, id });
});

// ——— In-app уведомления (колокол в шапке) ———

router.get("/notifications", requireAuth, (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
  const db = getDb();
  const userId = req.session.userId;
  const rows = db
    .prepare(
      "SELECT id, kind, title, body, link, read_at AS readAt, created_at AS createdAt FROM in_app_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(userId, limit);
  const unreadRow = db
    .prepare("SELECT COUNT(*) AS c FROM in_app_notifications WHERE user_id = ? AND read_at IS NULL")
    .get(userId);
  const c = unreadRow && typeof unreadRow.c === "number" ? unreadRow.c : 0;
  res.json({ ok: true, notifications: rows, unreadCount: c });
});

router.post("/notifications/:id/read", requireAuth, (req, res) => {
  const db = getDb();
  const nid = String(req.params.id || "");
  const info = db
    .prepare("UPDATE in_app_notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL")
    .run(Date.now(), nid, req.session.userId);
  res.json({ ok: true, changed: info.changes });
});

router.post("/notifications/read-all", requireAuth, (req, res) => {
  const db = getDb();
  const info = db
    .prepare("UPDATE in_app_notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .run(Date.now(), req.session.userId);
  res.json({ ok: true, marked: info.changes });
});

function validateTraderTelegramTag(tag) {
  let s = String(tag || "").trim();
  if (s.startsWith("@")) s = s.slice(1);
  if (s.length < 3 || s.length > 64) return { ok: false, message: "Тег Telegram: от 3 до 64 символов." };
  if (!/^[a-zA-Z0-9_]+$/.test(s)) return { ok: false, message: "Тег Telegram: только латиница, цифры и подчёркивание." };
  return { ok: true, value: s };
}

function validateTraderSteamUrl(url) {
  const s = String(url || "").trim();
  if (!/^https?:\/\//i.test(s)) return { ok: false, message: "Укажите полную ссылку (https://…)." };
  const lower = s.toLowerCase();
  if (!lower.includes("steamcommunity.com") && !lower.includes("steampowered.com")) {
    return { ok: false, message: "Ссылка должна вести на Steam (steamcommunity.com или steampowered.com)." };
  }
  return { ok: true, value: s };
}

router.get("/trader-applications/me", requireAuth, (req, res) => {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM trader_applications WHERE user_id = ? AND status = 'pending' LIMIT 1")
    .get(req.session.userId);
  res.json({ ok: true, pending: !!row });
});

router.post("/trader-applications", requireAuth, (req, res) => {
  if (req.session.role !== "user") {
    return res.status(403).json({ ok: false, message: "Заявку могут подать только клиенты (роль «пользователь»)." });
  }
  const db = getDb();
  const urow = db.prepare("SELECT id, trader_banned, role FROM users WHERE id = ?").get(req.session.userId);
  if (!urow) return res.status(401).json({ ok: false, message: "Пользователь не найден." });
  if (urow.trader_banned) {
    return res.status(403).json({ ok: false, message: "Для этого аккаунта заявки в трейдеры недоступны." });
  }
  const tg = validateTraderTelegramTag(req.body && req.body.telegramTag);
  if (!tg.ok) return res.status(400).json(tg);
  const st = validateTraderSteamUrl(req.body && req.body.steamUrl);
  if (!st.ok) return res.status(400).json(st);
  const has = db.prepare("SELECT id FROM trader_applications WHERE user_id = ? AND status = 'pending'").get(req.session.userId);
  if (has) return res.status(409).json({ ok: false, message: "У вас уже есть заявка на рассмотрении." });
  const id = uid("tap_");
  const now = Date.now();
  db.prepare(
    "INSERT INTO trader_applications (id, user_id, telegram_tag, steam_url, status, created_at, resolved_at, resolved_by_user_id) VALUES (?, ?, ?, ?, 'pending', ?, NULL, NULL)",
  ).run(id, req.session.userId, tg.value, st.value, now);
  audit(req, "trader_application.create", id);
  try {
    notifyStaffInApp({
      kind: "trader_apply",
      title: "Заявка на роль трейдера",
      body: `${normEmail(req.session.email) || "—"} — Telegram @${tg.value}`,
      link: `/admin?traderApp=${encodeURIComponent(id)}#traders`,
    });
  } catch (e) {
    console.error("[trader_application notify]", e.message || e);
  }
  res.json({
    ok: true,
    application: {
      id,
      userId: req.session.userId,
      userEmail: req.session.email,
      telegramTag: tg.value,
      steamUrl: st.value,
      status: "pending",
      createdAt: now,
    },
  });
});

router.get("/admin/trader-applications", requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ta.id, ta.user_id AS userId, u.email AS userEmail, u.display_name AS displayName,
        ta.telegram_tag AS telegramTag, ta.steam_url AS steamUrl, ta.status, ta.created_at AS createdAt,
        ta.resolved_at AS resolvedAt
       FROM trader_applications ta
       JOIN users u ON u.id = ta.user_id
       ORDER BY ta.created_at DESC LIMIT 200`,
    )
    .all();
  res.json({ ok: true, applications: rows });
});

router.post("/admin/trader-applications/:id/approve", requireAdmin, (req, res) => {
  const db = getDb();
  const id = String(req.params.id || "");
  const app = db.prepare("SELECT * FROM trader_applications WHERE id = ?").get(id);
  if (!app) return res.status(404).json({ ok: false, message: "Заявка не найдена." });
  if (app.status !== "pending") return res.status(400).json({ ok: false, message: "Заявка уже обработана." });
  const trader = db.prepare("SELECT trader_banned, role FROM users WHERE id = ?").get(app.user_id);
  if (!trader) return res.status(404).json({ ok: false, message: "Пользователь не найден." });
  if (trader.trader_banned) {
    return res.status(400).json({ ok: false, message: "У пользователя запрет на роль трейдера." });
  }
  const now = Date.now();
  const run = () => {
    db.prepare(
      "UPDATE trader_applications SET status = ?, resolved_at = ?, resolved_by_user_id = ? WHERE id = ?",
    ).run("approved", now, req.session.userId, id);
    if (trader.role === "user") {
      db.prepare("UPDATE users SET role = 'trader' WHERE id = ?").run(app.user_id);
    }
  };
  db.transaction(run)();
  audit(req, "trader_application.approve", id);
  try {
    notifyInApp(app.user_id, {
      kind: "trader_apply",
      title: "Заявка одобрена",
      body: "Вам присвоена роль трейдера. Обновите страницу кабинета, чтобы увидеть раздел исполнения.",
      link: "/account",
    });
  } catch (e) {
    console.error("[trader_application approve notify]", e.message || e);
  }
  res.json({ ok: true });
});

router.post("/admin/trader-applications/:id/reject", requireAdmin, (req, res) => {
  const db = getDb();
  const id = String(req.params.id || "");
  const app = db.prepare("SELECT * FROM trader_applications WHERE id = ?").get(id);
  if (!app) return res.status(404).json({ ok: false, message: "Заявка не найдена." });
  if (app.status !== "pending") return res.status(400).json({ ok: false, message: "Заявка уже обработана." });
  const now = Date.now();
  db.prepare(
    "UPDATE trader_applications SET status = ?, resolved_at = ?, resolved_by_user_id = ? WHERE id = ?",
  ).run("rejected", now, req.session.userId, id);
  audit(req, "trader_application.reject", id);
  try {
    notifyInApp(app.user_id, {
      kind: "trader_apply",
      title: "По заявке в трейдеры отказано",
      body: "При необходимости уточните данные и подайте заявку снова.",
      link: "/account",
    });
  } catch (e) {
    console.error("[trader_application reject notify]", e.message || e);
  }
  res.json({ ok: true });
});

// ——— Admin ———

router.get("/admin/users", requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, email, role, display_name, steam_id, trader_banned, created_at FROM users")
    .all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      displayName: r.display_name,
      steamId: r.steam_id || null,
      traderBanned: !!r.trader_banned,
      createdAt: r.created_at,
    })),
  );
});

router.post("/admin/users/:id/ban-trader", requireAdmin, (req, res) => {
  const db = getDb();
  const id = String(req.params.id || "");
  const banned = !!(req.body && req.body.banned);
  db.prepare("UPDATE users SET trader_banned = ? WHERE id = ?").run(banned ? 1 : 0, id);
  audit(req, "admin.trader_ban", `${id}:${banned}`);
  res.json({ ok: true });
});

router.patch("/admin/users/:id/role", requireAdmin, (req, res) => {
  const db = getDb();
  const id = String(req.params.id || "");
  const role = String((req.body && req.body.role) || "").toLowerCase();
  if (["user", "manager", "trader"].indexOf(role) < 0) {
    return res.status(400).json({ ok: false, message: "Недопустимая роль." });
  }
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ ok: false, message: "Пользователь не найден." });
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  audit(req, "admin.user_role", `${id}→${role}`);
  res.json({ ok: true });
});

router.get("/admin/audit", requireAdmin, (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  const db = getDb();
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?").all(limit);
  res.json(rows);
});

router.get("/admin/steam-topup-settings", requireAdmin, (req, res) => {
  try {
    res.json({ ok: true, settings: steamTopupSettings.getSteamTopupSettings() });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.put("/admin/steam-topup-settings", requireAdmin, (req, res) => {
  const b = req.body || {};
  try {
    const settings = steamTopupSettings.updateSteamTopupSettings({
      instantCommissionPct: b.instantCommissionPct,
      keysPriceRub: b.keysPriceRub,
      keysClientProfitPct: b.keysClientProfitPct,
    });
    audit(req, "admin.steam_topup_settings", JSON.stringify(settings));
    res.json({ ok: true, settings });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.get("/admin/home-banners", requireAdmin, (req, res) => {
  try {
    res.json({ ok: true, banners: homeBanners.listHomeBanners() });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.post("/admin/home-banners", requireAdmin, (req, res) => {
  try {
    const banner = homeBanners.createHomeBanner(req.body || {});
    if (!banner) return res.status(400).json({ ok: false, message: "Не удалось создать баннер." });
    audit(req, "admin.home_banner_create", banner.id);
    res.json({ ok: true, banner });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.put("/admin/home-banners/:id", requireAdmin, (req, res) => {
  try {
    const banner = homeBanners.updateHomeBanner(req.params.id, req.body || {});
    if (!banner) return res.status(404).json({ ok: false, message: "Баннер не найден." });
    audit(req, "admin.home_banner_update", banner.id);
    res.json({ ok: true, banner });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.delete("/admin/home-banners/:id", requireAdmin, (req, res) => {
  try {
    const ok = homeBanners.deleteHomeBanner(req.params.id);
    if (!ok) return res.status(404).json({ ok: false, message: "Баннер не найден." });
    audit(req, "admin.home_banner_delete", String(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.get("/admin/steam-topup-events", requireAdmin, (req, res) => {
  try {
    const fromMs = req.query.from != null ? parseInt(String(req.query.from), 10) : undefined;
    const toMs = req.query.to != null ? parseInt(String(req.query.to), 10) : undefined;
    const method = String(req.query.method || "all");
    const limit = req.query.limit != null ? parseInt(String(req.query.limit), 10) : undefined;
    const offset = req.query.offset != null ? parseInt(String(req.query.offset), 10) : undefined;
    const out = steamTopupEvents.querySteamTopupEventsAdmin({
      fromMs: Number.isFinite(fromMs) ? fromMs : undefined,
      toMs: Number.isFinite(toMs) ? toMs : undefined,
      method,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.get("/admin/steam-keys-orders", requireAdmin, (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "200"), 10) || 200));
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, user_id, key_count, amount_rub, amount_steam_estimate_rub, trade_url, pay_method,
          yookassa_payment_id, status, delivery_state, delivery_error, created_at, updated_at
        FROM steam_keys_orders ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit);
    res.json({ ok: true, rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.post("/admin/broadcast", requireAdmin, (req, res) => {
  const title = String((req.body && req.body.title) || "").trim();
  const body = String((req.body && req.body.body) || "").trim();
  let link = null;
  const rawLink = req.body && req.body.link != null ? String(req.body.link).trim() : "";
  if (rawLink) {
    link = rawLink.charAt(0) === "/" ? rawLink : "/" + rawLink.replace(/^\/+/, "");
  }
  const all = !!(req.body && req.body.all);
  const roles = req.body && Array.isArray(req.body.roles) ? req.body.roles.map((r) => String(r).toLowerCase()) : [];
  if (!title || !body) return res.status(400).json({ ok: false, message: "Нет заголовка или текста." });
  const db = getDb();
  let rows;
  if (all) {
    rows = db.prepare("SELECT id FROM users").all();
  } else if (roles.length) {
    const ph = roles.map(() => "?").join(",");
    rows = db.prepare(`SELECT id FROM users WHERE role IN (${ph})`).all(...roles);
  } else {
    return res.status(400).json({ ok: false, message: "Укажите получателей или all." });
  }
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    try {
      notifyInApp(rows[i].id, { kind: "broadcast", title, body, link });
      n++;
    } catch (e) {
      console.error("[broadcast]", e.message || e);
    }
  }
  audit(req, "admin.broadcast", String(n));
  res.json({ ok: true, sent: n });
});

// ——— ЮKassa: пополнение баланса ———

router.post("/payments/yookassa/topup", requireAuth, async (req, res) => {
  if (!yk.isConfigured()) {
    return res.status(503).json({
      ok: false,
      message: "Платежи ЮKassa не настроены. Задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.",
    });
  }
  const amountRub = Math.floor(Number(req.body && req.body.amountRub));
  if (!Number.isFinite(amountRub) || amountRub < 10 || amountRub > 500000) {
    return res.status(400).json({ ok: false, message: "Сумма от 10 до 500 000 ₽." });
  }
  const db = getDb();
  const topupId = uid("tup_");
  const returnUrl = `${publicOrigin(req)}/account?topup=${encodeURIComponent(topupId)}`;

  db.prepare(
    "INSERT INTO balance_topups (id, user_id, amount_rub, status, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?)",
  ).run(topupId, req.session.userId, amountRub, Date.now(), Date.now());

  try {
    const payment = await yk.createPayment({
      amount: { value: amountRub.toFixed(2), currency: "RUB" },
      capture: true,
      confirmation: { type: "redirect", return_url: returnUrl },
      description: `Пополнение баланса Skinexs (${amountRub} ₽)`,
      metadata: {
        topup_id: topupId,
        user_id: String(req.session.userId),
        kind: "balance_topup",
      },
    });
    const confUrl = payment.confirmation && payment.confirmation.confirmation_url;
    if (!confUrl) {
      db.prepare("DELETE FROM balance_topups WHERE id = ?").run(topupId);
      return res.status(500).json({ ok: false, message: "ЮKassa не вернула ссылку на оплату." });
    }
    db.prepare("UPDATE balance_topups SET yookassa_payment_id = ?, updated_at = ? WHERE id = ?").run(
      payment.id,
      Date.now(),
      topupId,
    );
    audit(req, "yookassa.topup.create", `${topupId}:${payment.id}`);
    res.json({
      ok: true,
      confirmationUrl: confUrl,
      topupId,
      paymentId: payment.id,
    });
  } catch (e) {
    db.prepare("DELETE FROM balance_topups WHERE id = ?").run(topupId);
    const msg = e && e.message ? String(e.message) : "Ошибка ЮKassa";
    res.status(500).json({ ok: false, message: msg });
  }
});

router.post("/payments/yookassa/complete-check", requireAuth, async (req, res) => {
  const topupId = String((req.body && req.body.topupId) || "").trim();
  if (!topupId) return res.status(400).json({ ok: false, message: "Нет topupId." });
  const db = getDb();
  const row = db.prepare("SELECT * FROM balance_topups WHERE id = ?").get(topupId);
  if (!row || row.user_id !== req.session.userId) {
    return res.status(404).json({ ok: false, message: "Запись не найдена." });
  }
  if (row.status === "succeeded") {
    const u = db
      .prepare("SELECT id, email, role, display_name, steam_id, trader_banned, balance_rub FROM users WHERE id = ?")
      .get(req.session.userId);
    return res.json({
      ok: true,
      already: true,
      user: Object.assign({}, formatUserRow(u), { traderBanned: !!u.trader_banned }),
    });
  }
  if (!row.yookassa_payment_id) {
    return res.json({ ok: false, message: "Платёж ещё не создан." });
  }
  if (!yk.isConfigured()) {
    return res.status(503).json({ ok: false, message: "ЮKassa не настроена." });
  }
  try {
    const pay = await yk.getPayment(row.yookassa_payment_id);
    const fin = finalizeTopupFromPayment(db, pay);
    if (fin.ok) {
      const u = db
        .prepare("SELECT id, email, role, display_name, steam_id, trader_banned, balance_rub FROM users WHERE id = ?")
        .get(req.session.userId);
      if (!fin.already) {
        audit(req, "yookassa.topup.complete", topupId);
      }
      return res.json({
        ok: true,
        already: !!fin.already,
        user: Object.assign({}, formatUserRow(u), { traderBanned: !!u.trader_banned }),
        creditedRub: fin.already ? 0 : fin.amountRub,
      });
    }
    if (fin.reason === "not_succeeded") {
      return res.json({
        ok: false,
        pending: true,
        message: "Оплата ещё не прошла. Обновите страницу через минуту.",
      });
    }
    return res.status(400).json({ ok: false, message: fin.reason || "Не удалось зачислить." });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

// ——— ЮKassa: выгодное пополнение (ключи по трейд-ссылке) ———

function optionalSessionUserId(req) {
  return req.session && req.session.userId ? String(req.session.userId) : null;
}

router.post("/payments/yookassa/steam-keys/create", async (req, res) => {
  if (!yk.isConfigured()) {
    return res.status(503).json({
      ok: false,
      message: "Платежи ЮKassa не настроены. Задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.",
    });
  }
  const b = req.body || {};
  const keyCount = Math.round(Number(b.keyCount));
  if (!Number.isFinite(keyCount) || keyCount < 1 || keyCount > 99) {
    return res.status(400).json({ ok: false, message: "Количество ключей: от 1 до 99." });
  }
  const tradeCheck = steamKeysDelivery.validateSteamTradeUrl(b.tradeUrl);
  if (!tradeCheck.ok) {
    return res.status(400).json({ ok: false, message: tradeCheck.message });
  }
  const payMethod = b.payMethod != null ? String(b.payMethod).slice(0, 16) : null;

  let settings;
  try {
    settings = steamTopupSettings.getSteamTopupSettings();
  } catch (e) {
    return res.status(500).json({ ok: false, message: String(e.message || e) });
  }
  const price = Math.max(1, Math.round(Number(settings.keysPriceRub) || 156));
  const profitPct = Number(settings.keysClientProfitPct);
  const amountRub = keyCount * price;
  if (amountRub < 10 || amountRub > 500_000) {
    return res.status(400).json({ ok: false, message: "Сумма заказа вне допустимого диапазона." });
  }
  const steamEst = Math.round(amountRub * (1 + (Number.isFinite(profitPct) ? profitPct : 0) / 100));

  const db = getDb();
  const orderId = uid("stk_");
  const returnUrl = `${publicOrigin(req)}/steam-topup?steam_keys_order=${encodeURIComponent(orderId)}`;
  const now = Date.now();

  db.prepare(
    `INSERT INTO steam_keys_orders (
      id, user_id, key_count, amount_rub, amount_steam_estimate_rub, trade_url, pay_method,
      yookassa_payment_id, status, delivery_state, delivery_error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'pending', 'none', NULL, ?, ?)`,
  ).run(
    orderId,
    optionalSessionUserId(req),
    keyCount,
    amountRub,
    steamEst,
    tradeCheck.value,
    payMethod,
    now,
    now,
  );

  try {
    const payment = await yk.createPayment({
      amount: { value: amountRub.toFixed(2), currency: "RUB" },
      capture: true,
      confirmation: { type: "redirect", return_url: returnUrl },
      description: `Skinexs: ключи Steam ×${keyCount} (${amountRub} ₽)`,
      metadata: {
        steam_keys_order_id: orderId,
        user_id: optionalSessionUserId(req) || "",
        kind: "steam_keys_order",
      },
    });
    const confUrl = payment.confirmation && payment.confirmation.confirmation_url;
    if (!confUrl) {
      db.prepare("DELETE FROM steam_keys_orders WHERE id = ?").run(orderId);
      return res.status(500).json({ ok: false, message: "ЮKassa не вернула ссылку на оплату." });
    }
    db.prepare("UPDATE steam_keys_orders SET yookassa_payment_id = ?, updated_at = ? WHERE id = ?").run(
      payment.id,
      Date.now(),
      orderId,
    );
    audit(req, "yookassa.steam_keys.create", `${orderId}:${payment.id}`);
    res.json({
      ok: true,
      confirmationUrl: confUrl,
      steamKeysOrderId: orderId,
      paymentId: payment.id,
      amountRub,
      keyCount,
    });
  } catch (e) {
    db.prepare("DELETE FROM steam_keys_orders WHERE id = ?").run(orderId);
    const msg = e && e.message ? String(e.message) : "Ошибка ЮKassa";
    res.status(500).json({ ok: false, message: msg });
  }
});

router.post("/payments/yookassa/steam-keys/complete-check", async (req, res) => {
  const orderId = String((req.body && req.body.steamKeysOrderId) || "").trim();
  if (!orderId) return res.status(400).json({ ok: false, message: "Нет steamKeysOrderId." });
  const db = getDb();
  const row = db.prepare("SELECT * FROM steam_keys_orders WHERE id = ?").get(orderId);
  if (!row) {
    return res.status(404).json({ ok: false, message: "Заказ не найден." });
  }
  const sessionUid = optionalSessionUserId(req);
  if (row.user_id && sessionUid && row.user_id !== sessionUid) {
    return res.status(403).json({ ok: false, message: "Нет доступа к этому заказу." });
  }
  if (row.status === "succeeded") {
    const r2 = db.prepare("SELECT delivery_state, delivery_error FROM steam_keys_orders WHERE id = ?").get(orderId);
    return res.json({
      ok: true,
      already: true,
      deliveryState: r2 ? r2.delivery_state : row.delivery_state,
      deliveryError: r2 && r2.delivery_error,
      keyCount: row.key_count,
      amountRub: row.amount_rub,
    });
  }
  if (!row.yookassa_payment_id) {
    return res.json({ ok: false, message: "Платёж ещё не создан." });
  }
  if (!yk.isConfigured()) {
    return res.status(503).json({ ok: false, message: "ЮKassa не настроена." });
  }
  try {
    const pay = await yk.getPayment(row.yookassa_payment_id);
    const fin = finalizeSteamKeysOrderFromPayment(db, pay);
    if (fin.ok) {
      const r2 = db.prepare("SELECT delivery_state, delivery_error FROM steam_keys_orders WHERE id = ?").get(orderId);
      if (!fin.already) {
        audit(req, "yookassa.steam_keys.complete", orderId);
      }
      return res.json({
        ok: true,
        already: !!fin.already,
        deliveryState: r2 ? r2.delivery_state : "none",
        deliveryError: r2 && r2.delivery_error,
        keyCount: row.key_count,
        amountRub: row.amount_rub,
      });
    }
    if (fin.reason === "not_succeeded") {
      return res.json({
        ok: false,
        pending: true,
        message: "Оплата ещё не прошла. Обновите страницу через минуту.",
      });
    }
    return res.status(400).json({ ok: false, message: fin.reason || "Не удалось подтвердить заказ." });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e.message || e) });
  }
});

router.post("/payments/yookassa/webhook", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const obj = body.object || {};
    const payId = obj.id ? String(obj.id) : "";
    if (!payId || !yk.isConfigured()) {
      return res.status(200).json({ ok: true });
    }
    const pay = await yk.getPayment(payId);
    const db = getDb();
    const finTopup = finalizeTopupFromPayment(db, pay);
    const finKeys = finalizeSteamKeysOrderFromPayment(db, pay);
    if (finTopup.ok && !finTopup.already) {
      audit(req, "yookassa.webhook", payId);
    }
    if (finKeys.ok && !finKeys.already) {
      audit(req, "yookassa.webhook.steam_keys", payId);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[yookassa webhook]", e.message || e);
    res.status(500).json({ ok: false });
  }
});

// ——— Payments webhook (заглушка под эквайринг) ———

router.post("/payments/webhook", (req, res) => {
  const secret = process.env.SKINEX_PAYMENT_WEBHOOK_SECRET || "";
  const hdr = req.headers["x-skinex-secret"] || req.headers["x-skinex-signature"] || "";
  if (secret && String(hdr) !== secret) {
    audit(req, "payment.webhook.denied", "bad secret");
    return res.status(401).json({ ok: false });
  }
  const payload =
    req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
      ? req.body
      : {};
  const db = getDb();
  const pid = uid("pay_");
  db.prepare(
    "INSERT INTO payments (id, order_id, provider, external_id, amount, status, json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    pid,
    String(payload.orderId || ""),
    String(payload.provider || "stub"),
    String(payload.externalId || ""),
    Math.floor(Number(payload.amount) || 0),
    String(payload.status || "captured"),
    JSON.stringify(payload),
    Date.now(),
  );
  audit(req, "payment.webhook", pid);
  res.json({ ok: true, id: pid });
});

/** Моментальное пополнение Steam через Avatarix (см. https://apidoc.avatarix.net/docs/payment/). */
router.post("/partner/avatarix/steam/pay", async (req, res) => {
  if (!avatarix.isConfigured()) {
    return res.status(503).json({
      ok: false,
      message:
        "Интеграция Avatarix не настроена. Укажите AVATARIX_AGENT_ID, AVATARIX_AGENT_PASSWORD, AVATARIX_SERVICE_STEAM и при необходимости AVATARIX_BASE_URL.",
    });
  }
  const account = String((req.body && req.body.steamLogin) || (req.body && req.body.account) || "").trim();
  const amountRub = Math.round(Number((req.body && req.body.amountRub) != null ? req.body.amountRub : NaN));
  const transactionId = (req.body && req.body.transactionId && String(req.body.transactionId).trim()) || "";
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(account)) {
    return res.status(400).json({ ok: false, message: "Укажите корректный логин Steam (латиница, цифры, _)." });
  }
  if (!Number.isFinite(amountRub) || amountRub < 100 || amountRub > 500000) {
    return res.status(400).json({ ok: false, message: "Сумма от 100 до 500 000 ₽." });
  }
  const userId = req.session && req.session.userId ? String(req.session.userId) : null;
  const payMethod = req.body && req.body.payMethod != null ? String(req.body.payMethod).slice(0, 16) : null;
  const settings = steamTopupSettings.getSteamTopupSettings();
  const amountSiteRub = Math.round(amountRub * (1 + settings.instantCommissionPct / 100));

  function logInstantEvent(partnerTx, okVal) {
    try {
      steamTopupEvents.insertSteamTopupEvent({
        method: "instant",
        kind: "avatarix_pay",
        userId,
        steamRef: account,
        keyCount: null,
        amountSteamRub: amountRub,
        amountSiteRub,
        partnerTxId: partnerTx,
        partnerOk: okVal,
        payMethod,
      });
    } catch (err) {
      console.error("[steam_topup_events instant]", err.message || err);
    }
  }

  try {
    const out = await avatarix.requestPayment({
      account,
      amountRub,
      transactionId: transactionId || undefined,
    });
    const ok = avatarix.isSuccessResponse(out.data);
    logInstantEvent(out.transactionId, ok);
    audit(req, "avatarix.steam.pay", `${out.transactionId}:${account}:${amountRub}:${ok ? "ok" : "fail"}`);
    res.json({
      ok,
      transactionId: out.transactionId,
      avatarix: out.data,
      message: (out.data && out.data.Message) || (ok ? "Операция принята." : "Ответ получен, проверьте статус."),
    });
  } catch (e) {
    const code = e && e.code;
    if (code === "NOT_CONFIGURED" || code === "BAD_TXN_ID") {
      logInstantEvent(null, false);
      return res.status(503).json({ ok: false, message: String(e.message || e) });
    }
    logInstantEvent(null, false);
    console.error("[avatarix pay]", e.message || e);
    res.status(502).json({ ok: false, message: String(e.message || "Ошибка связи с Avatarix.") });
  }
});

router.post("/partner/avatarix/steam/status", async (req, res) => {
  if (!avatarix.isConfigured()) {
    return res.status(503).json({ ok: false, message: "Avatarix не настроен." });
  }
  const transactionId = String((req.body && req.body.transactionId) || "").trim();
  if (!transactionId) return res.status(400).json({ ok: false, message: "Нет transactionId." });
  try {
    const out = await avatarix.requestStatus(transactionId);
    const ok = avatarix.isSuccessResponse(out.data);
    audit(req, "avatarix.steam.status", `${transactionId}:${ok ? "ok" : "pending"}`);
    res.json({
      ok,
      transactionId: out.transactionId,
      avatarix: out.data,
    });
  } catch (e) {
    console.error("[avatarix status]", e.message || e);
    res.status(502).json({ ok: false, message: String(e.message || "Ошибка связи с Avatarix.") });
  }
});

module.exports = router;
