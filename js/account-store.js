/**
 * Локальный «личный кабинет»: профиль (баланс), заказы.
 * Данные в localStorage — для демо без сервера.
 *
 * Заказы: orderNumber (короткий №), id (UUID), dealId (= id сделки для пары «покупатель ↔ исполнитель»),
 * статусы и timeline — см. ORDER_STATUS_LABELS. Одна запись заказа — одна сделка; статус общий для обеих сторон.
 *
 * Профиль (баланс, имя) хранится отдельно на каждого пользователя (ключ по getStorageScope()).
 * Заказы — общий список skinex_orders; в ЛК показываются через getBuyerOrders() по email покупателя.
 */
(function (w) {
  var LEGACY_PROFILE_KEY = "skinex_profile";
  var ORDERS_KEY = "skinex_orders";

  function profileStorageKey() {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.getStorageScope !== "function") return LEGACY_PROFILE_KEY;
    var sc = Auth.getStorageScope();
    if (!sc) return "skinex_profile_guest";
    return "skinex_profile_" + encodeURIComponent(sc);
  }

  /**
   * Статусы сделки (единые для клиента, трейдера, админа).
   * Внутренние ключи — латиница; подписи на русском.
   */
  var ORDER_STATUS_LABELS = {
    CREATED: "Создан и оплачен",
    ASSIGNED: "Трейдер взял заказ",
    WAITING_PERIOD: "Период ожидания (30 дней)",
    READY_TO_DELIVER: "Можно отправить подарок",
    DELIVERED: "Подарок отправлен",
    COMPLETED: "Получение подтверждено",
    CANCELLED: "Сделка отменена",
  };

  var TERMINAL_STATUSES = { COMPLETED: true, CANCELLED: true };

  /** Старые ключи → новые (миграция localStorage). */
  function migrateLegacyStatus(st) {
    var s = String(st || "");
    var map = {
      placed: "CREATED",
      active: "CREATED",
      awaiting_seller: "ASSIGNED",
      transfer_pending: "WAITING_PERIOD",
      item_sent: "DELIVERED",
      completed: "COMPLETED",
      cancelled: "CANCELLED",
    };
    return map[s] || s;
  }

  var TRADER_NEXT_NOTE = {
    ASSIGNED: "Трейдер принял заказ в работу",
    WAITING_PERIOD: "Добавление в друзья зафиксировано, идёт 30-дневный период",
    READY_TO_DELIVER: "Прошло 30 дней, можно отправлять подарок",
    DELIVERED: "Подарок отправлен покупателю",
  };

  /** Статус передачи по строке заказа (предмет/сет). */
  var TRANSFER_STATUS_LABELS = {
    pending: "Ожидает передачи",
    seller_preparing: "Продавец готовит передачу",
    sent_to_buyer: "Отправлено покупателю",
    delivered: "Получено покупателем",
    cancelled_line: "Позиция отменена",
  };

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return fallback;
    }
  }

  function uid() {
    if (w.crypto && typeof w.crypto.randomUUID === "function") return w.crypto.randomUUID();
    return String(Date.now()) + "-" + String(Math.random()).slice(2, 10);
  }

  function useServerOrdersApi() {
    return !!w.SKINEX_USE_SERVER_API && typeof w.fetch === "function";
  }

  function ordersApiUrl(path) {
    var base = w.SKINEX_API_BASE != null ? String(w.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
    if (!path || path.charAt(0) !== "/") path = "/" + (path || "");
    return base + path;
  }

  /** Слияние ответа API с локальным списком: по id сделки одна запись — статус общий для покупателя и исполнителя. */
  function mergeOrdersFromServer(list) {
    if (!list || !Array.isArray(list) || !list.length) return;
    var finalized = finalizeOrdersSnapshot(readOrdersRaw());
    var byId = {};
    for (var fi = 0; fi < finalized.length; fi++) {
      var lo = finalized[fi];
      if (lo && lo.id) byId[String(lo.id)] = lo;
    }
    for (var si = 0; si < list.length; si++) {
      var s = list[si];
      if (!s || !s.id) continue;
      byId[String(s.id)] = migrateOneOrder(s);
    }
    var next = [];
    for (var k in byId) {
      if (Object.prototype.hasOwnProperty.call(byId, k)) next.push(byId[k]);
    }
    next.sort(function (a, b) {
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });
    saveOrders(next);
  }

  function fetchOrdersFromServer() {
    if (!useServerOrdersApi()) return Promise.resolve(null);
    return w
      .fetch(ordersApiUrl("/api/v1/orders"), { credentials: "include" })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length) mergeOrdersFromServer(data);
        return data;
      })
      .catch(function () {
        return null;
      });
  }

  /** Публичный ID сделки (покупатель и трейдер/площадка ссылаются на одно и то же значение). */
  function getDealId(order) {
    if (!order || typeof order !== "object") return "";
    var d = order.dealId;
    if (typeof d === "string" && d.trim()) return d.trim();
    return String(order.id || "");
  }

  function defaultProfile() {
    return { displayName: "Пользователь", balance: 0 };
  }

  function getProfile() {
    var key = profileStorageKey();
    var raw = localStorage.getItem(key);
    var p = raw ? safeParse(raw, null) : null;
    if (!p || typeof p !== "object") p = {};
    var d = defaultProfile();
    return {
      displayName: typeof p.displayName === "string" && p.displayName.trim() ? p.displayName.trim() : d.displayName,
      balance: typeof p.balance === "number" && !isNaN(p.balance) ? Math.max(0, Math.floor(p.balance)) : d.balance,
    };
  }

  function saveProfile(profile) {
    localStorage.setItem(profileStorageKey(), JSON.stringify(profile));
  }

  function readOrdersRaw() {
    var raw = localStorage.getItem(ORDERS_KEY);
    var arr = raw ? safeParse(raw, []) : [];
    return Array.isArray(arr) ? arr : [];
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function isTerminalStatus(status) {
    return !!TERMINAL_STATUSES[String(status)];
  }

  function orderStatusLabel(status) {
    var s = migrateLegacyStatus(String(status || ""));
    return ORDER_STATUS_LABELS[s] || s || "—";
  }

  /** Уведомить покупателя и трейдеров по строкам заказа (локальная очередь). */
  function emitOrderParticipants(order, prevSt, newSt) {
    if (!order || prevSt === newSt) return;
    var N = w.SkinexNotifications;
    if (!N || typeof N.enqueueForRecipientEmail !== "function") return;
    var label = orderStatusLabel(newSt);
    var num = order.orderNumber != null ? order.orderNumber : String(order.id || "").slice(0, 10);
    var title = "Заказ № " + num;
    var body = "Статус сделки: " + label + ".";
    var link = "account.html";
    var buyer = normEmailAcc(order.buyerEmail);
    if (buyer) {
      N.enqueueForRecipientEmail(buyer, { kind: "order", title: title, body: body, link: link });
    }
    var seen = {};
    if (buyer) seen[buyer] = true;
    var items = order.items || [];
    var i;
    for (i = 0; i < items.length; i++) {
      var te = normEmailAcc(items[i] && items[i].traderEmail);
      if (!te || seen[te]) continue;
      seen[te] = true;
      N.enqueueForRecipientEmail(te, {
        kind: "order",
        title: title + " (исполнитель)",
        body: body,
        link: link,
      });
    }
  }

  function transferStatusLabel(key) {
    var k = String(key || "pending");
    return TRANSFER_STATUS_LABELS[k] || k;
  }

  function isOrderActive(o) {
    return !!(o && !isTerminalStatus(o.status));
  }

  function migrateOneOrder(o) {
    if (!o || typeof o !== "object") return o;
    var x = Object.assign({}, o);
    x.status = migrateLegacyStatus(x.status || "CREATED");
    if (!Array.isArray(x.items)) x.items = [];
    x.items = x.items.map(function (line) {
      if (!line || typeof line !== "object") return line;
      var L = Object.assign({}, line);
      if (!L.transferStatus) L.transferStatus = "pending";
      if (typeof L.marketOfferId !== "string") L.marketOfferId = "";
      if (typeof L.traderEmail !== "string") L.traderEmail = "";
      return L;
    });
    if (!x.sellerLabel) x.sellerLabel = "Skinexs";
    if (!x.traderRatings || typeof x.traderRatings !== "object") x.traderRatings = {};
    if (x.traderStatsRecorded !== true) x.traderStatsRecorded = !!x.traderStatsRecorded;
    var hasTraderLine = (x.items || []).some(function (L) {
      return L && String(L.traderEmail || "").trim();
    });
    if (x.status === "COMPLETED" && !hasTraderLine) x.traderStatsRecorded = true;
    if (typeof x.buyerEmail !== "string") x.buyerEmail = "";
    if (typeof x.buyerDisplayName !== "string") x.buyerDisplayName = "";
    if (typeof x.buyerSteamId !== "string") x.buyerSteamId = "";
    if (typeof x.dealId !== "string" || !x.dealId.trim()) x.dealId = String(x.id || "");
    return x;
  }

  function resolveOrderNumbers(list) {
    var maxN = 0;
    for (var i = 0; i < list.length; i++) {
      var n = Number(list[i] && list[i].orderNumber);
      if (isFinite(n) && n > maxN) maxN = n;
    }
    var next = maxN + 1;
    return list.map(function (o) {
      if (o.orderNumber != null && isFinite(Number(o.orderNumber))) return o;
      return Object.assign({}, o, { orderNumber: next++ });
    });
  }

  function ensureTimeline(o) {
    if (o.timeline && o.timeline.length) return o;
    return Object.assign({}, o, {
      timeline: [
        {
          at: o.createdAt || Date.now(),
          status: o.status,
          note: "Импорт: история ранее не сохранялась",
        },
      ],
    });
  }

  function finalizeOrdersSnapshot(raw) {
    var list = raw.map(migrateOneOrder);
    list = resolveOrderNumbers(list);
    list = list.map(ensureTimeline);
    return list;
  }

  function ordersSnapshotDirty(raw, finalized) {
    if (raw.length !== finalized.length) return true;
    try {
      return JSON.stringify(raw) !== JSON.stringify(finalized);
    } catch (e) {
      return true;
    }
  }

  function getOrders() {
    var raw = readOrdersRaw();
    var finalized = finalizeOrdersSnapshot(raw);
    if (ordersSnapshotDirty(raw, finalized)) saveOrders(finalized);
    return finalized;
  }

  function appendTimelineEntry(o, status, note) {
    var prev = Array.isArray(o.timeline) ? o.timeline.slice() : [];
    prev.push({
      at: Date.now(),
      status: String(status || ""),
      note: String(note || ""),
    });
    return prev;
  }

  /**
   * @param {Map<string, number>} cartMap
   * @param {Array<{id:string,name:string,hero:string,price:number}>} catalog
   */
  function checkoutCart(cartMap, catalog) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isClient !== "function" || !Auth.isClient()) {
      return { ok: false, code: "auth", message: "Войдите в аккаунт, чтобы оформить заказ." };
    }

    var getItem = function (id) {
      for (var i = 0; i < catalog.length; i++) {
        if (String(catalog[i].id) === String(id)) return catalog[i];
      }
      return null;
    };

    var lines = [];
    var total = 0;
    var Market = w.SkinexMarketOffers;
    var entries = [];
    cartMap.forEach(function (qty, id) {
      var item = getItem(id);
      var q = Number(qty) || 0;
      if (!item || q < 1) return;
      entries.push({
        itemId: String(item.id),
        qty: q,
        catalogPrice: item.price,
        item: item,
      });
    });

    if (Market && typeof Market.consumeCartEntries === "function" && entries.length) {
      var slim = entries.map(function (e) {
        return { itemId: e.itemId, qty: e.qty, catalogPrice: e.catalogPrice };
      });
      var pack = Market.consumeCartEntries(slim);
      if (!pack.ok) {
        return {
          ok: false,
          code: "market",
          message: pack.message || "Не удалось оформить заказ по текущим лотам.",
        };
      }
      total = pack.total;
      var byId = {};
      for (var ei = 0; ei < entries.length; ei++) {
        byId[entries[ei].itemId] = entries[ei].item;
      }
      var plines = pack.lines || [];
      for (var pi = 0; pi < plines.length; pi++) {
        var prow = plines[pi];
        var item = byId[prow.itemId];
        if (!item) continue;
        var segs = prow.segments || [];
        for (var si = 0; si < segs.length; si++) {
          var seg = segs[si];
          lines.push({
            itemId: String(item.id),
            name: item.name,
            hero: item.hero,
            qty: seg.qty,
            unitPrice: seg.unitPrice,
            transferStatus: "pending",
            sellerLabel: seg.sellerLabel || "Skinexs",
            marketOfferId: seg.offerId ? String(seg.offerId) : "",
            traderEmail: seg.traderEmail ? String(seg.traderEmail) : "",
          });
        }
      }
    } else {
      cartMap.forEach(function (qty, id) {
        var item = getItem(id);
        var q = Number(qty) || 0;
        if (!item || q < 1) return;
        var lineTotal = item.price * q;
        total += lineTotal;
        lines.push({
          itemId: String(item.id),
          name: item.name,
          hero: item.hero,
          qty: q,
          unitPrice: item.price,
          transferStatus: "pending",
          sellerLabel: "Skinexs",
          marketOfferId: "",
          traderEmail: "",
        });
      });
    }

    if (!lines.length) {
      return { ok: false, code: "empty", message: "Корзина пуста." };
    }

    var profile = getProfile();
    if (profile.balance < total) {
      return {
        ok: false,
        code: "funds",
        message: "Недостаточно средств на балансе.",
        need: total - profile.balance,
        total: total,
      };
    }

    profile.balance -= total;
    saveProfile(profile);

    var sess = typeof Auth.getSession === "function" ? Auth.getSession() : null;
    var buyerEmail = sess && sess.email ? String(sess.email) : "";
    var buyerDisplayName =
      sess && sess.displayName
        ? String(sess.displayName)
        : buyerEmail
          ? buyerEmail.split("@")[0]
          : "";
    var buyerSteamId = sess && sess.steamId ? String(sess.steamId) : "";

    var rawList = readOrdersRaw();
    var finalized = finalizeOrdersSnapshot(rawList);
    var orderNumber = 1;
    for (var ni = 0; ni < finalized.length; ni++) {
      var nn = Number(finalized[ni].orderNumber);
      if (isFinite(nn) && nn >= orderNumber) orderNumber = nn + 1;
    }

    var now = Date.now();
    var oid = uid();
    var order = {
      id: oid,
      dealId: oid,
      orderNumber: orderNumber,
      status: "CREATED",
      createdAt: now,
      completedAt: null,
      items: lines,
      total: total,
      buyerEmail: buyerEmail,
      buyerDisplayName: buyerDisplayName,
      buyerSteamId: buyerSteamId,
      sellerLabel: "Skinexs",
      timeline: [
        {
          at: now,
          status: "CREATED",
          note: "Заказ создан, оплата списана с баланса",
        },
      ],
    };

    var orders = [order].concat(finalized);
    saveOrders(orders);

    return { ok: true, order: order, profile: getProfile() };
  }

  function markOrderTraderBumpDone(id) {
    var rawList = readOrdersRaw();
    var finalized = finalizeOrdersSnapshot(rawList);
    var next = finalized.map(function (o) {
      if (String(o.id) !== String(id)) return o;
      return Object.assign({}, o, { traderStatsRecorded: true });
    });
    saveOrders(next);
  }

  function maybeRecordTraderStatsAfterCompletion(orderId) {
    var ord = getOrders().find(function (x) {
      return String(x.id) === String(orderId);
    });
    if (!ord || ord.status !== "COMPLETED" || ord.traderStatsRecorded) return;
    var M = w.SkinexMarketOffers;
    if (M && typeof M.recordTradersOrderCompleted === "function") M.recordTradersOrderCompleted(ord);
    markOrderTraderBumpDone(orderId);
  }

  function completeOrder(orderId) {
    if (useServerOrdersApi()) {
      return w
        .fetch(ordersApiUrl("/api/v1/orders/" + encodeURIComponent(String(orderId)) + "/complete"), {
          method: "POST",
          credentials: "include",
        })
        .then(function (res) {
          return res.json().then(function (j) {
            return { okHttp: res.ok, j: j };
          });
        })
        .then(function (pack) {
          if (pack.okHttp && pack.j && pack.j.ok && pack.j.order) {
            mergeOrdersFromServer([pack.j.order]);
            maybeRecordTraderStatsAfterCompletion(String(orderId));
            return { ok: true };
          }
          return {
            ok: false,
            message: (pack.j && pack.j.message) || "Не удалось подтвердить получение.",
          };
        })
        .catch(function () {
          return { ok: false, message: "Ошибка сети." };
        });
    }
    var orders = getOrders();
    var found = false;
    var next = orders.map(function (o) {
      if (String(o.id) !== String(orderId)) return o;
      if (isTerminalStatus(o.status)) return o;
      var st = migrateLegacyStatus(o.status);
      if (st !== "DELIVERED") {
        found = "bad_status";
        return o;
      }
      found = true;
      return Object.assign({}, o, {
        status: "COMPLETED",
        completedAt: Date.now(),
        timeline: appendTimelineEntry(o, "COMPLETED", "Покупатель подтвердил получение"),
      });
    });
    if (found === "bad_status") {
      return {
        ok: false,
        message: "Подтвердить получение можно после статуса «Подарок отправлен».",
      };
    }
    if (!found) return { ok: false, message: "Заказ не найден или уже завершён." };
    saveOrders(next);
    var done = next.find(function (x) {
      return String(x.id) === String(orderId);
    });
    if (done) emitOrderParticipants(done, "DELIVERED", "COMPLETED");
    maybeRecordTraderStatsAfterCompletion(orderId);
    return { ok: true };
  }

  function removeOrder(orderId) {
    var next = getOrders().filter(function (o) {
      return String(o.id) !== String(orderId);
    });
    saveOrders(next);
    return { ok: true };
  }

  /**
   * Смена статуса заказа (админка). Добавляет запись в timeline.
   * @param {string} note — комментарий к событию (необязательно)
   */
  function setOrderStatus(orderId, newStatus, note) {
    var key = migrateLegacyStatus(String(newStatus || "").trim());
    if (!ORDER_STATUS_LABELS[key]) return { ok: false, message: "Неизвестный статус: " + key };
    var orders = getOrders();
    var prevStatus = "";
    for (var pi = 0; pi < orders.length; pi++) {
      if (String(orders[pi].id) === String(orderId)) {
        prevStatus = migrateLegacyStatus(String(orders[pi].status || ""));
        break;
      }
    }
    var found = false;
    var next = orders.map(function (o) {
      if (String(o.id) !== String(orderId)) return o;
      found = true;
      var patch = {
        status: key,
        timeline: appendTimelineEntry(o, key, note != null && String(note) !== "" ? note : orderStatusLabel(key)),
      };
      if (key === "COMPLETED") patch.completedAt = Date.now();
      else if (key === "CANCELLED") patch.completedAt = o.completedAt || Date.now();
      return Object.assign({}, o, patch);
    });
    if (!found) return { ok: false, message: "Заказ не найден." };
    saveOrders(next);
    if (prevStatus !== key) {
      var o = getOrders().find(function (x) {
        return String(x.id) === String(orderId);
      });
      if (o) emitOrderParticipants(o, prevStatus, key);
    }
    if (key === "COMPLETED" && prevStatus !== "COMPLETED") {
      maybeRecordTraderStatsAfterCompletion(orderId);
    }
    return { ok: true };
  }

  function normEmailAcc(e) {
    return String(e || "")
      .trim()
      .toLowerCase();
  }

  function getBuyerOrders() {
    var Auth = w.SkinexAuth;
    var sess = Auth && typeof Auth.getSession === "function" ? Auth.getSession() : null;
    var em = normEmailAcc(sess && sess.email);
    if (!em) return getOrders();
    return getOrders().filter(function (o) {
      return normEmailAcc(o.buyerEmail) === em;
    });
  }

  function getTraderOrders() {
    var Auth = w.SkinexAuth;
    var sess = Auth && typeof Auth.getSession === "function" ? Auth.getSession() : null;
    var em = normEmailAcc(sess && sess.email);
    if (!em) return [];
    return getOrders().filter(function (o) {
      return (o.items || []).some(function (line) {
        return normEmailAcc(line.traderEmail) === em;
      });
    });
  }

  function isTraderOnOrder(order, traderEmail) {
    var em = normEmailAcc(traderEmail);
    return (
      (order.items || []).some(function (line) {
        return normEmailAcc(line.traderEmail) === em;
      }) && em.length > 0
    );
  }

  function traderAdvanceOrder(orderId) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isTrader !== "function" || !Auth.isTrader()) {
      return { ok: false, message: "Доступно только трейдерам." };
    }
    if (useServerOrdersApi()) {
      return w
        .fetch(ordersApiUrl("/api/v1/orders/" + encodeURIComponent(String(orderId)) + "/advance"), {
          method: "POST",
          credentials: "include",
        })
        .then(function (res) {
          return res.json().then(function (j) {
            return { okHttp: res.ok, j: j };
          });
        })
        .then(function (pack) {
          if (pack.okHttp && pack.j && pack.j.ok && pack.j.order) {
            mergeOrdersFromServer([pack.j.order]);
            return { ok: true };
          }
          return { ok: false, message: (pack.j && pack.j.message) || "Не удалось обновить статус." };
        })
        .catch(function () {
          return { ok: false, message: "Ошибка сети." };
        });
    }
    var sess = Auth.getSession();
    var my = normEmailAcc(sess && sess.email);
    var orders = getOrders();
    var order = orders.find(function (o) {
      return String(o.id) === String(orderId);
    });
    if (!order) return { ok: false, message: "Заказ не найден." };
    if (!isTraderOnOrder(order, my)) return { ok: false, message: "Вы не исполнитель по этому заказу." };
    var st = migrateLegacyStatus(order.status);
    if (st === "CANCELLED" || st === "COMPLETED") {
      return { ok: false, message: "Сделка уже закрыта." };
    }
    if (st === "DELIVERED") {
      return { ok: false, message: "Ожидайте подтверждения от покупателя." };
    }
    var chain = {
      CREATED: "ASSIGNED",
      ASSIGNED: "WAITING_PERIOD",
      WAITING_PERIOD: "READY_TO_DELIVER",
      READY_TO_DELIVER: "DELIVERED",
    };
    var next = chain[st];
    if (!next) return { ok: false, message: "Нельзя перевести дальше с текущего этапа." };
    var note = TRADER_NEXT_NOTE[next] || orderStatusLabel(next);
    return setOrderStatus(orderId, next, note);
  }

  function rateTraderForCompletedOrder(orderId, traderEmail, stars) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isClient !== "function" || !Auth.isClient()) {
      return { ok: false, message: "Войдите в аккаунт покупателя." };
    }
    var sess = typeof Auth.getSession === "function" ? Auth.getSession() : null;
    var buyer = sess && sess.email ? String(sess.email).trim().toLowerCase() : "";
    var tRaw = String(traderEmail || "").trim();
    var tnorm = tRaw.toLowerCase();
    var n = Math.floor(Number(stars));
    if (!tnorm) return { ok: false, message: "Не указан трейдер." };
    if (!isFinite(n) || n < 1 || n > 5) return { ok: false, message: "Оценка от 1 до 5." };

    var orders = getOrders();
    var order = orders.find(function (o) {
      return String(o.id) === String(orderId);
    });
    if (!order) return { ok: false, message: "Заказ не найден." };
    if (String(order.buyerEmail || "").trim().toLowerCase() !== buyer) {
      return { ok: false, message: "Это не ваш заказ." };
    }
    if (migrateLegacyStatus(order.status) !== "COMPLETED") return { ok: false, message: "Оценить можно только завершённый заказ." };

    var hasLine = (order.items || []).some(function (line) {
      return String(line.traderEmail || "").trim().toLowerCase() === tnorm;
    });
    if (!hasLine) return { ok: false, message: "В этом заказе нет позиций у выбранного трейдера." };

    var ratings = order.traderRatings && typeof order.traderRatings === "object" ? order.traderRatings : {};
    if (ratings[tnorm] != null) return { ok: false, message: "Вы уже оценили этого трейдера по этому заказу." };

    var M = w.SkinexMarketOffers;
    if (!M || typeof M.addTraderRating !== "function") return { ok: false, message: "Модуль рейтинга не загружен." };
    var rr = M.addTraderRating(tnorm, n);
    if (!rr.ok) return rr;

    var nextRatings = Object.assign({}, ratings);
    nextRatings[tnorm] = n;
    var nextOrders = orders.map(function (o) {
      if (String(o.id) !== String(orderId)) return o;
      return Object.assign({}, o, { traderRatings: nextRatings });
    });
    saveOrders(nextOrders);
    return { ok: true };
  }

  function listOrderStatusKeys() {
    return Object.keys(ORDER_STATUS_LABELS);
  }

  function topUp(amount) {
    var n = Math.floor(Number(amount));
    if (!isFinite(n) || n < 10) return { ok: false, message: "Минимальное пополнение — 10 ₽." };
    if (n > 500000) return { ok: false, message: "Слишком большая сумма для демо-формы." };
    var profile = getProfile();
    profile.balance += n;
    saveProfile(profile);
    return { ok: true, profile: profile, added: n };
  }

  /** Синхронизация с балансом на сервере (руб., целые) после оплаты ЮKassa. */
  function setBalanceRub(rub) {
    var profile = getProfile();
    profile.balance = Math.max(0, Math.floor(Number(rub) || 0));
    saveProfile(profile);
  }

  function updateDisplayName(name) {
    var s = String(name || "").trim();
    if (s.length > 40) s = s.slice(0, 40);
    if (!s) return { ok: false, message: "Введите имя или ник." };
    var profile = getProfile();
    profile.displayName = s;
    saveProfile(profile);
    return { ok: true, profile: profile };
  }

  w.SkinexAccount = {
    /** @deprecated Используйте getProfileStorageKey(); старый общий ключ — только для совместимости. */
    PROFILE_KEY: LEGACY_PROFILE_KEY,
    getProfileStorageKey: profileStorageKey,
    ORDERS_KEY: ORDERS_KEY,
    getProfile: getProfile,
    saveProfile: saveProfile,
    getOrders: getOrders,
    getBuyerOrders: getBuyerOrders,
    getTraderOrders: getTraderOrders,
    traderAdvanceOrder: traderAdvanceOrder,
    saveOrders: saveOrders,
    checkoutCart: checkoutCart,
    completeOrder: completeOrder,
    removeOrder: removeOrder,
    setOrderStatus: setOrderStatus,
    orderStatusLabel: orderStatusLabel,
    transferStatusLabel: transferStatusLabel,
    listOrderStatusKeys: listOrderStatusKeys,
    isOrderActive: isOrderActive,
    topUp: topUp,
    setBalanceRub: setBalanceRub,
    updateDisplayName: updateDisplayName,
    rateTraderForCompletedOrder: rateTraderForCompletedOrder,
    migrateLegacyStatus: migrateLegacyStatus,
    getDealId: getDealId,
    mergeOrdersFromServer: mergeOrdersFromServer,
    fetchOrdersFromServer: fetchOrdersFromServer,
  };
})(window);
