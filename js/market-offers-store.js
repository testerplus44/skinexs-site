/**
 * Лоты трейдеров на товары каталога: стакан заявок (любая цена ≥ 1),
 * покупка по лучшей (минимальной) цене, списание с дешёвых лотов, скрытие лотов админом.
 * Данные: localStorage key skinex_market_offers
 */
(function (w) {
  var KEY = "skinex_market_offers";
  var STATS_KEY = "skinex_trader_stats";
  var CATALOG_SLICE_CAP = 1000000;

  function normEmail(e) {
    return String(e || "")
      .trim()
      .toLowerCase();
  }

  function safeParse(raw, fb) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fb;
    }
  }

  function uid() {
    return "mof_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  function readRaw() {
    var raw = localStorage.getItem(KEY);
    var arr = raw ? safeParse(raw, []) : [];
    return Array.isArray(arr) ? arr : [];
  }

  function saveRaw(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  /** Соответствует полю каталога traderListingsAllowed (по умолчанию разрешено). */
  function itemAllowsTraderListings(itemId) {
    var Cat = w.SkinexCatalog;
    if (!Cat || typeof Cat.getCatalog !== "function") return true;
    var list = Cat.getCatalog();
    var id = String(itemId || "");
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it && String(it.id) === id) return it.traderListingsAllowed !== false;
    }
    return true;
  }

  function normalizeOffer(o) {
    if (!o || typeof o !== "object") return null;
    return {
      id: String(o.id || ""),
      itemId: String(o.itemId || ""),
      traderEmail: String(o.traderEmail || ""),
      traderDisplayName: String(o.traderDisplayName || "").trim() || String(o.traderEmail || "—").split("@")[0],
      price: Math.max(0, Math.floor(Number(o.price))),
      qty: Math.max(0, Math.floor(Number(o.qty))),
      createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
      hidden: !!o.hidden,
    };
  }

  function getVisibleOffers(itemId) {
    var id = String(itemId);
    if (!itemAllowsTraderListings(id)) return [];
    return readRaw()
      .map(normalizeOffer)
      .filter(function (x) {
        return x && x.itemId === id && !x.hidden && x.qty > 0 && x.price > 0;
      })
      .sort(function (a, b) {
        if (a.price !== b.price) return a.price - b.price;
        return a.createdAt - b.createdAt;
      });
  }

  /**
   * Лучшая цена для покупателя: минимум среди видимых лотов и цены из каталога.
   */
  function getEffectivePrice(itemId, catalogPrice) {
    var base = Math.max(0, Math.floor(Number(catalogPrice)) || 0);
    var vis = getVisibleOffers(itemId);
    if (!vis.length) return base;
    var minOffer = vis[0].price;
    return Math.min(base, minOffer);
  }

  /** Лучшая цена для покупателя (справочно): минимум каталога и лотов. */
  function getCurrentBestAsk(itemId, catalogPrice) {
    return getEffectivePrice(itemId, catalogPrice);
  }

  function readStatsRaw() {
    var raw = localStorage.getItem(STATS_KEY);
    var o = raw ? safeParse(raw, null) : null;
    return o && typeof o === "object" ? o : {};
  }

  function saveStatsRaw(obj) {
    localStorage.setItem(STATS_KEY, JSON.stringify(obj));
  }

  function getTraderPublicStats(email) {
    var k = normEmail(email);
    var s = readStatsRaw()[k];
    if (!s || typeof s !== "object") {
      return { completedOrders: 0, ratingAvg: null, ratingCount: 0 };
    }
    var n = Math.max(0, Math.floor(Number(s.ratingCount)) || 0);
    var sum = Math.max(0, Number(s.ratingSum) || 0);
    var avg = n > 0 ? Math.round((sum / n) * 10) / 10 : null;
    return {
      completedOrders: Math.max(0, Math.floor(Number(s.completedOrders)) || 0),
      ratingAvg: avg,
      ratingCount: n,
    };
  }

  function bumpCompletedForEmail(email) {
    var k = normEmail(email);
    if (!k) return;
    var all = readStatsRaw();
    var cur = all[k] && typeof all[k] === "object" ? all[k] : {};
    var co = Math.max(0, Math.floor(Number(cur.completedOrders)) || 0) + 1;
    all[k] = Object.assign({}, cur, { completedOrders: co });
    saveStatsRaw(all);
  }

  /** Учесть завершённый заказ для трейдеров (по email в строках). Не вызывать повторно для того же заказа — см. traderStatsRecorded в заказе. */
  function recordTradersOrderCompleted(order) {
    if (!order || order.traderStatsRecorded) return;
    var seen = {};
    var items = order.items || [];
    for (var i = 0; i < items.length; i++) {
      var line = items[i];
      var te = line && line.traderEmail ? normEmail(line.traderEmail) : "";
      if (!te) continue;
      if (seen[te]) continue;
      seen[te] = true;
      bumpCompletedForEmail(te);
    }
  }

  function getAllTraderStats() {
    return readStatsRaw();
  }

  function addTraderRating(email, stars) {
    var k = normEmail(email);
    if (!k) return { ok: false, message: "Нет email трейдера." };
    var n = Math.floor(Number(stars));
    if (!isFinite(n) || n < 1 || n > 5) return { ok: false, message: "Оценка от 1 до 5." };
    var all = readStatsRaw();
    var cur = all[k] && typeof all[k] === "object" ? all[k] : {};
    var rc = Math.max(0, Math.floor(Number(cur.ratingCount)) || 0) + 1;
    var rs = Math.max(0, Number(cur.ratingSum) || 0) + n;
    all[k] = Object.assign({}, cur, { ratingCount: rc, ratingSum: rs });
    saveStatsRaw(all);
    return { ok: true };
  }

  /** Схлопывает несколько лотов одного трейдера по одному товару (наследие/ошибки) в один: минимальная цена, суммарный остаток. */
  function squashDupesForTraderItem(list, itemId, emailNorm) {
    var id = String(itemId);
    var matches = [];
    for (var i = 0; i < list.length; i++) {
      var o = normalizeOffer(list[i]);
      if (!o || o.itemId !== id || normEmail(o.traderEmail) !== emailNorm) continue;
      matches.push({ idx: i, o: o });
    }
    if (matches.length <= 1) return;
    matches.sort(function (a, b) {
      if (a.o.price !== b.o.price) return a.o.price - b.o.price;
      return a.o.createdAt - b.o.createdAt;
    });
    var keeper = matches[0].o;
    var qty = 0;
    var hiddenAny = false;
    for (var j = 0; j < matches.length; j++) {
      qty += matches[j].o.qty;
      if (matches[j].o.hidden) hiddenAny = true;
    }
    for (var ri = list.length - 1; ri >= 0; ri--) {
      var o2 = normalizeOffer(list[ri]);
      if (!o2 || o2.itemId !== id || normEmail(o2.traderEmail) !== emailNorm) continue;
      list.splice(ri, 1);
    }
    list.push({
      id: keeper.id,
      itemId: id,
      traderEmail: keeper.traderEmail,
      traderDisplayName: keeper.traderDisplayName,
      price: keeper.price,
      qty: qty,
      createdAt: Date.now(),
      hidden: hiddenAny || keeper.hidden,
    });
  }

  function listAllOffers() {
    return readRaw().map(normalizeOffer).filter(Boolean);
  }

  function adminSetHidden(offerId, hidden) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isAdmin !== "function" || !Auth.isAdmin()) {
      return { ok: false, message: "Только администратор может скрывать лоты." };
    }
    var id = String(offerId || "");
    if (!id) return { ok: false, message: "Нет ID лота." };
    var list = readRaw();
    var hit = false;
    for (var i = 0; i < list.length; i++) {
      var o = normalizeOffer(list[i]);
      if (!o || o.id !== id) continue;
      list[i] = Object.assign({}, list[i], { hidden: !!hidden });
      hit = true;
      break;
    }
    if (!hit) return { ok: false, message: "Лот не найден." };
    saveRaw(list);
    return { ok: true };
  }

  /**
   * Лот текущего трейдера по товару (любой: скрытый, с нулевым остатком и т.д.), если есть.
   */
  function getOwnOfferForItem(itemId) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isTrader !== "function" || !Auth.isTrader()) return null;
    if (!Auth.isLoggedIn || !Auth.isLoggedIn()) return null;
    var sess = typeof Auth.getSession === "function" ? Auth.getSession() : null;
    var emailNorm = normEmail(sess && sess.email);
    if (!emailNorm) return null;
    var id = String(itemId || "");
    var list = readRaw();
    for (var i = 0; i < list.length; i++) {
      var o = normalizeOffer(list[i]);
      if (!o || o.itemId !== id || normEmail(o.traderEmail) !== emailNorm) continue;
      return o;
    }
    return null;
  }

  /** Удалить свой лот по товару (чтобы выставить заново или сменить цену с нуля). */
  function withdrawMyOfferForItem(itemId) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isTrader !== "function" || !Auth.isTrader()) {
      return { ok: false, code: "auth", message: "Только трейдер может снять свой лот." };
    }
    if (!Auth.isLoggedIn || !Auth.isLoggedIn()) {
      return { ok: false, code: "auth", message: "Войдите в аккаунт трейдера." };
    }
    var sess = typeof Auth.getSession === "function" ? Auth.getSession() : null;
    var emailNorm = normEmail(sess && sess.email);
    if (!emailNorm) return { ok: false, message: "В сессии нет email." };
    var id = String(itemId || "");
    if (!id) return { ok: false, message: "Не указан товар." };
    var list = readRaw();
    var removed = 0;
    for (var i = list.length - 1; i >= 0; i--) {
      var o = normalizeOffer(list[i]);
      if (!o || o.itemId !== id || normEmail(o.traderEmail) !== emailNorm) continue;
      list.splice(i, 1);
      removed++;
    }
    if (!removed) return { ok: false, message: "У вас нет лота по этому товару." };
    saveRaw(list);
    return { ok: true };
  }

  function adminRemoveOffer(offerId) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isAdmin !== "function" || !Auth.isAdmin()) {
      return { ok: false, message: "Только администратор может удалять лоты." };
    }
    var id = String(offerId || "");
    if (!id) return { ok: false, message: "Нет ID лота." };
    var list = readRaw();
    var next = list.filter(function (x) {
      var o = normalizeOffer(x);
      return o && o.id !== id;
    });
    if (next.length === list.length) return { ok: false, message: "Лот не найден." };
    saveRaw(next);
    return { ok: true };
  }

  /**
   * @param {{ itemId: string, catalogPrice: number, price: number, qty: number }} p
   */
  function submitOffer(p) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isTrader !== "function" || !Auth.isTrader()) {
      return { ok: false, code: "auth", message: "Только аккаунт с ролью «Трейдер» может выставлять лоты." };
    }
    if (!Auth.isLoggedIn || !Auth.isLoggedIn()) {
      return { ok: false, code: "auth", message: "Войдите в аккаунт трейдера." };
    }
    var itemId = String((p && p.itemId) || "");
    var catalogPrice = Math.max(0, Math.floor(Number(p && p.catalogPrice)) || 0);
    var price = Math.floor(Number(p && p.price));
    var qty = Math.floor(Number(p && p.qty));
    if (!itemId) return { ok: false, code: "bad", message: "Не указан товар." };
    if (!itemAllowsTraderListings(itemId)) {
      return {
        ok: false,
        code: "blocked",
        message: "Для этого предмета лоты трейдеров отключены администратором.",
      };
    }
    if (!isFinite(price) || price < 1) return { ok: false, code: "bad", message: "Укажите цену не менее 1 ₽." };
    if (!isFinite(qty) || qty < 1) return { ok: false, code: "bad", message: "Укажите количество не менее 1 шт." };
    var sess = typeof Auth.getSession === "function" ? Auth.getSession() : null;
    var email = sess && sess.email ? String(sess.email) : "";
    var emailNorm = normEmail(email);
    if (!emailNorm) {
      return { ok: false, code: "auth", message: "В сессии нет email — выставление лота невозможно." };
    }
    var disp =
      sess && sess.displayName
        ? String(sess.displayName).trim()
        : email
          ? email.split("@")[0]
          : "Трейдер";

    var list = readRaw();
    squashDupesForTraderItem(list, itemId, emailNorm);

    var existingIdx = -1;
    var existing = null;
    for (var ei = 0; ei < list.length; ei++) {
      var row = normalizeOffer(list[ei]);
      if (!row || row.itemId !== itemId || normEmail(row.traderEmail) !== emailNorm) continue;
      existingIdx = ei;
      existing = row;
      break;
    }

    if (existing) {
      if (existing.hidden) {
        return {
          ok: false,
          code: "blocked",
          message:
            "По этому товару у вас уже есть лот, снятый с витрины администратором. Обратитесь в поддержку или дождитесь восстановления лота.",
        };
      }
      var raw = list[existingIdx];
      list[existingIdx] = Object.assign({}, raw, {
        price: price,
        qty: qty,
        traderDisplayName: disp,
        createdAt: Date.now(),
        hidden: false,
      });
      saveRaw(list);
      return { ok: true, offer: normalizeOffer(list[existingIdx]), updated: true };
    }

    var off = {
      id: uid(),
      itemId: itemId,
      traderEmail: email,
      traderDisplayName: disp,
      price: price,
      qty: qty,
      createdAt: Date.now(),
      hidden: false,
    };
    list.push(off);
    saveRaw(list);
    return { ok: true, offer: normalizeOffer(off), updated: false };
  }

  function visibleRowsFromList(list, itemId) {
    var id = String(itemId);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var o = normalizeOffer(list[i]);
      if (!o || o.itemId !== id || o.hidden || o.qty < 1 || o.price < 1) continue;
      out.push({ idx: i, o: o });
    }
    out.sort(function (a, b) {
      if (a.o.price !== b.o.price) return a.o.price - b.o.price;
      return a.o.createdAt - b.o.createdAt;
    });
    return out;
  }

  /**
   * Списание на переданном массиве (без записи в localStorage).
   * @returns {{ ok: boolean, segments?: Array, total?: number, message?: string }}
   */
  function mutateConsumeOnList(list, itemId, qtyWant, catalogPrice) {
    var id = String(itemId || "");
    var need = Math.floor(Number(qtyWant));
    if (!id || need < 1) return { ok: false, message: "Некорректное количество." };
    var cat = Math.max(0, Math.floor(Number(catalogPrice)) || 0);
    var segments = [];
    var remaining = need;

    function pushSeg(offerId, unitPrice, sellerLabel, qty, traderEmail) {
      var last = segments[segments.length - 1];
      var te = traderEmail ? String(traderEmail) : "";
      if (
        last &&
        last.unitPrice === unitPrice &&
        last.sellerLabel === sellerLabel &&
        String(last.offerId || "") === String(offerId || "") &&
        String(last.traderEmail || "") === te
      ) {
        last.qty += qty;
      } else {
        segments.push({
          offerId: offerId || "",
          qty: qty,
          unitPrice: unitPrice,
          sellerLabel: sellerLabel,
          traderEmail: te,
        });
      }
    }

    while (remaining > 0) {
      var rows = visibleRowsFromList(list, id);
      var cand = [];
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        cand.push({
          kind: "offer",
          price: row.o.price,
          tie: row.o.createdAt,
          idx: row.idx,
          qty: row.o.qty,
          id: row.o.id,
          seller: row.o.traderDisplayName || row.o.traderEmail || "Трейдер",
          traderEmail: row.o.traderEmail || "",
        });
      }
      cand.push({
        kind: "cat",
        price: cat,
        tie: 9e15,
        idx: -1,
        qty: CATALOG_SLICE_CAP,
        id: "",
        seller: "Skinexs",
      });
      cand.sort(function (a, b) {
        if (a.price !== b.price) return a.price - b.price;
        if (a.tie !== b.tie) return a.tie - b.tie;
        if (a.kind !== b.kind) return a.kind === "offer" ? -1 : 1;
        return 0;
      });
      var head = cand[0];
      if (!head) {
        return { ok: false, message: "Недостаточно предложений по этому товару." };
      }
      var take = Math.min(remaining, head.qty);
      if (take < 1) {
        return { ok: false, message: "Недостаточно предложений по этому товару." };
      }

      if (head.kind === "offer") {
        var raw = list[head.idx];
        var o = normalizeOffer(raw);
        if (!o || o.qty < take) {
          return {
            ok: false,
            message: "Часть лотов уже куплена другим покупателем. Обновите корзину и попробуйте снова.",
          };
        }
        list[head.idx] = Object.assign({}, raw, { qty: o.qty - take });
        pushSeg(head.id, head.price, head.seller, take, head.traderEmail || "");
      } else {
        pushSeg("", cat, "Skinexs", take, "");
      }
      remaining -= take;
    }

    var total = 0;
    for (var s = 0; s < segments.length; s++) {
      total += segments[s].unitPrice * segments[s].qty;
    }
    return { ok: true, segments: segments, total: total };
  }

  function consumeForPurchase(itemId, qtyWant, catalogPrice) {
    var list = readRaw();
    var r = mutateConsumeOnList(list, itemId, qtyWant, catalogPrice);
    if (r.ok) saveRaw(list);
    return r;
  }

  /**
   * Атомарно списывает лоты по всей корзине: при любой ошибке состояние рынка не меняется.
   * @param {Array<{ itemId: string, qty: number, catalogPrice: number }>} entries
   * @returns {{ ok: boolean, lines?: Array<{itemId:string,segments:Array}>, total?: number, message?: string }}
   */
  function consumeCartEntries(entries) {
    if (!entries || !entries.length) return { ok: false, message: "Пустая корзина." };
    var list;
    try {
      list = JSON.parse(JSON.stringify(readRaw()));
    } catch (e) {
      list = readRaw().slice();
    }
    var allSegments = [];
    var grand = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var id = String(e.itemId || "");
      var q = Math.floor(Number(e.qty));
      var cat = Math.max(0, Math.floor(Number(e.catalogPrice)) || 0);
      if (!id || q < 1) continue;
      var r = mutateConsumeOnList(list, id, q, cat);
      if (!r.ok) return { ok: false, message: r.message || "Ошибка списания лотов." };
      grand += r.total;
      allSegments.push({ itemId: id, segments: r.segments });
    }
    saveRaw(list);
    return { ok: true, lines: allSegments, total: grand };
  }

  w.SkinexMarketOffers = {
    getVisibleOffers: getVisibleOffers,
    getEffectivePrice: getEffectivePrice,
    getCurrentBestAsk: getCurrentBestAsk,
    getOwnOfferForItem: getOwnOfferForItem,
    withdrawMyOfferForItem: withdrawMyOfferForItem,
    getTraderPublicStats: getTraderPublicStats,
    getAllTraderStats: getAllTraderStats,
    recordTradersOrderCompleted: recordTradersOrderCompleted,
    addTraderRating: addTraderRating,
    submitOffer: submitOffer,
    adminSetHidden: adminSetHidden,
    adminRemoveOffer: adminRemoveOffer,
    listAllOffers: listAllOffers,
    consumeForPurchase: consumeForPurchase,
    consumeCartEntries: consumeCartEntries,
  };
})(window);
