/**
 * Отзывы о товарах (localStorage). Публикация только у клиентов (user/trader/manager)
 * с завершённым заказом, в котором был этот товар.
 */
(function (w) {
  var KEY = "skinex_reviews_v1";
  var LIKES_KEY = "skinex_review_likes_v1";
  /** id демо-отзывов, скрытых администратором */
  var HIDDEN_SEEDS_KEY = "skinex_reviews_hidden_seeds_v1";

  /** Демо-отзывы привязаны к id из каталога для пути и превью. */
  var SEED_REVIEWS = [
    {
      id: "seed_1",
      seed: true,
      productId: "1",
      text: "Сет пришёл в оговорённые сроки, всё прозрачно по цене и передаче. Буду брать ещё.",
      caption: "покупатель из Steam",
      authorLabel: "Steam buyer",
      createdAt: Date.now() - 86400000 * 90,
    },
    {
      id: "seed_2",
      seed: true,
      productId: "2",
      text: "Помогли подобрать лот под бюджет, ответили быстро. Рекомендую.",
      caption: "клиент Skinexs",
      authorLabel: "Клиент",
      createdAt: Date.now() - 86400000 * 60,
    },
    {
      id: "seed_3",
      seed: true,
      productId: "3",
      text: "Редкие комплекты без сюрпризов — как на скриншотах. Спасибо за аккуратную сделку.",
      caption: "коллекционер Dota 2",
      authorLabel: "Коллекционер",
      createdAt: Date.now() - 86400000 * 30,
    },
  ];

  function safeParse(raw, fb) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fb;
    }
  }

  function uid() {
    if (w.crypto && typeof w.crypto.randomUUID === "function") return w.crypto.randomUUID();
    return "rev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  function normEmail(e) {
    return String(e || "")
      .trim()
      .toLowerCase();
  }

  function readList() {
    var raw = localStorage.getItem(KEY);
    var arr = raw ? safeParse(raw, []) : [];
    return Array.isArray(arr) ? arr : [];
  }

  function saveList(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function readLikes() {
    var raw = localStorage.getItem(LIKES_KEY);
    var o = raw ? safeParse(raw, {}) : {};
    return o && typeof o === "object" ? o : {};
  }

  function saveLikes(obj) {
    localStorage.setItem(LIKES_KEY, JSON.stringify(obj));
  }

  function readHiddenSeedIds() {
    var raw = localStorage.getItem(HIDDEN_SEEDS_KEY);
    var arr = raw ? safeParse(raw, []) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(String);
  }

  function saveHiddenSeedIds(ids) {
    localStorage.setItem(HIDDEN_SEEDS_KEY, JSON.stringify(ids));
  }

  function removeLikeEntry(reviewId) {
    var id = String(reviewId || "");
    if (!id) return;
    var m = readLikes();
    if (!m[id]) return;
    delete m[id];
    saveLikes(m);
  }

  function getLikeCount(reviewId) {
    var n = Number(readLikes()[String(reviewId)]);
    return isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function incrementLike(reviewId) {
    var id = String(reviewId || "");
    if (!id) return 0;
    var m = readLikes();
    m[id] = (Number(m[id]) || 0) + 1;
    saveLikes(m);
    return m[id];
  }

  /** Число завершённых заказов покупателя (для бейджа «Заказов»). */
  function countCompletedOrdersForBuyer(email) {
    var em = normEmail(email);
    if (!em) return 0;
    var Acc = w.SkinexAccount;
    if (!Acc || typeof Acc.getOrders !== "function") return 0;
    var n = 0;
    var orders = Acc.getOrders();
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      if (o && String(o.status) === "COMPLETED" && normEmail(o.buyerEmail) === em) n += 1;
    }
    return n;
  }

  /** Сумма позиций в завершённых заказах (для «доставлено предметов»). */
  function countDeliveredItemsForBuyer(email) {
    var em = normEmail(email);
    if (!em) return 0;
    var Acc = w.SkinexAccount;
    if (!Acc || typeof Acc.getOrders !== "function") return 0;
    var n = 0;
    Acc.getOrders().forEach(function (o) {
      if (!o || String(o.status) !== "COMPLETED" || normEmail(o.buyerEmail) !== em) return;
      (o.items || []).forEach(function (line) {
        n += Math.max(0, Math.floor(Number(line.qty) || 0));
      });
    });
    return n;
  }

  function userBoughtProductInCompletedOrder(buyerEmail, productId) {
    var Acc = w.SkinexAccount;
    if (!Acc || typeof Acc.getOrders !== "function") return false;
    var em = normEmail(buyerEmail);
    var pid = String(productId || "");
    if (!em || !pid) return false;
    var orders = Acc.getOrders();
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      if (!o || String(o.status) !== "COMPLETED") continue;
      if (normEmail(o.buyerEmail) !== em) continue;
      var items = o.items || [];
      for (var j = 0; j < items.length; j++) {
        var line = items[j];
        if (line && String(line.itemId) === pid) return true;
      }
    }
    return false;
  }

  function hasReviewForUserProduct(authorEmail, productId) {
    var em = normEmail(authorEmail);
    var pid = String(productId || "");
    var list = readList();
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || r.seed) continue;
      if (normEmail(r.authorEmail) === em && String(r.productId) === pid) return true;
    }
    return false;
  }

  /**
   * Товары из завершённых заказов текущего пользователя, на которые ещё нет отзыва.
   */
  function getEligibleProducts() {
    var Auth = w.SkinexAuth;
    var Acc = w.SkinexAccount;
    if (!Auth || !Acc || typeof Auth.isClient !== "function" || !Auth.isClient()) return [];
    if (typeof Auth.getSession !== "function" || typeof Acc.getOrders !== "function") return [];
    var sess = Auth.getSession();
    if (!sess || !sess.email) return [];
    var email = sess.email;
    var orders = Acc.getOrders();
    var map = {};
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      if (!o || String(o.status) !== "COMPLETED") continue;
      if (normEmail(o.buyerEmail) !== normEmail(email)) continue;
      var items = o.items || [];
      for (var j = 0; j < items.length; j++) {
        var line = items[j];
        if (!line || !line.itemId) continue;
        var id = String(line.itemId);
        if (hasReviewForUserProduct(email, id)) continue;
        if (!map[id]) {
          map[id] = {
            productId: id,
            name: String(line.name || "Товар"),
            hero: String(line.hero || ""),
          };
        }
      }
    }
    var out = [];
    for (var k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) out.push(map[k]);
    }
    out.sort(function (a, b) {
      return a.name.localeCompare(b.name, "ru");
    });
    return out;
  }

  function addReview(productId, text, stars) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.getSession !== "function" || typeof Auth.isClient !== "function") {
      return { ok: false, message: "Сервис авторизации недоступен." };
    }
    if (!Auth.isClient()) {
      return { ok: false, message: "Отзывы оставляют покупатели (аккаунты клиентов)." };
    }
    var sess = Auth.getSession();
    if (!sess || !sess.email) {
      return { ok: false, message: "Войдите в аккаунт." };
    }
    var pid = String(productId || "").trim();
    if (!pid) return { ok: false, message: "Выберите товар." };
    var body = String(text || "").trim();
    if (body.length < 10) return { ok: false, message: "Минимум 10 символов в отзыве." };
    if (body.length > 2000) return { ok: false, message: "Максимум 2000 символов." };
    var n = Math.floor(Number(stars));
    if (!isFinite(n) || n < 1 || n > 5) return { ok: false, message: "Укажите оценку от 1 до 5." };

    var email = sess.email;
    if (!userBoughtProductInCompletedOrder(email, pid)) {
      return {
        ok: false,
        message: "Отзыв можно оставить только на товар из завершённого заказа (после подтверждения получения).",
      };
    }
    if (hasReviewForUserProduct(email, pid)) {
      return { ok: false, message: "Вы уже оставили отзыв на этот товар." };
    }

    var eligible = getEligibleProducts();
    var meta = null;
    for (var i = 0; i < eligible.length; i++) {
      if (String(eligible[i].productId) === pid) {
        meta = eligible[i];
        break;
      }
    }
    if (!meta) {
      return { ok: false, message: "Этот товар недоступен для отзыва." };
    }

    var authorLabel =
      sess.displayName && String(sess.displayName).trim()
        ? String(sess.displayName).trim()
        : String(email)
            .split("@")[0]
            .replace(/[._-]+/g, " ");

    var rec = {
      id: uid(),
      seed: false,
      productId: pid,
      productName: meta.name,
      productHero: meta.hero,
      text: body,
      stars: n,
      authorEmail: String(email),
      authorLabel: authorLabel,
      createdAt: Date.now(),
    };

    var list = readList();
    list.unshift(rec);
    saveList(list);
    return { ok: true, review: rec };
  }

  function deleteUserReviewById(reviewId) {
    var id = String(reviewId || "");
    if (!id) return false;
    var list = readList();
    var next = list.filter(function (r) {
      return r && String(r.id) !== id;
    });
    if (next.length === list.length) return false;
    saveList(next);
    removeLikeEntry(id);
    return true;
  }

  /**
   * Удаление отзыва (только администратор): пользовательский из хранилища или демо по id.
   */
  function adminDeleteReview(reviewId) {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.isAdmin !== "function" || !Auth.isAdmin()) {
      return { ok: false, message: "Только администратор может удалять отзывы." };
    }
    var id = String(reviewId || "").trim();
    if (!id) return { ok: false, message: "Не указан отзыв." };

    for (var i = 0; i < SEED_REVIEWS.length; i++) {
      if (String(SEED_REVIEWS[i].id) === id) {
        var hidden = readHiddenSeedIds();
        if (hidden.indexOf(id) < 0) {
          hidden.push(id);
          saveHiddenSeedIds(hidden);
        }
        removeLikeEntry(id);
        return { ok: true };
      }
    }

    if (deleteUserReviewById(id)) return { ok: true };
    return { ok: false, message: "Отзыв не найден." };
  }

  /**
   * Все отзывы для отображения: демо + пользовательские, новее сверху.
   */
  function listForDisplay() {
    var user = readList().filter(function (r) {
      return r && !r.seed && r.text;
    });
    var hiddenSet = {};
    readHiddenSeedIds().forEach(function (x) {
      hiddenSet[String(x)] = true;
    });
    var seeds = SEED_REVIEWS.filter(function (s) {
      return s && !hiddenSet[String(s.id)];
    }).map(function (s) {
      return Object.assign({ stars: 5 }, s, { seed: true });
    });
    var merged = user.concat(seeds);
    merged.sort(function (a, b) {
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });
    return merged;
  }

  w.SkinexReviews = {
    KEY: KEY,
    LIKES_KEY: LIKES_KEY,
    HIDDEN_SEEDS_KEY: HIDDEN_SEEDS_KEY,
    getEligibleProducts: getEligibleProducts,
    addReview: addReview,
    adminDeleteReview: adminDeleteReview,
    listForDisplay: listForDisplay,
    getLikeCount: getLikeCount,
    incrementLike: incrementLike,
    countCompletedOrdersForBuyer: countCompletedOrdersForBuyer,
    countDeliveredItemsForBuyer: countDeliveredItemsForBuyer,
  };
})(window);
