/**
 * In-app уведомления: при SKINEX_USE_SERVER_API — GET /api/v1/notifications, иначе localStorage по scope.
 * Очередь skinex_notif_outbox — доставка другому email в этом браузере (поддержка, смена статуса заказа).
 */
(function (w) {
  var OUTBOX_KEY = "skinex_notif_outbox";

  function apiPath(p) {
    var base = w.SKINEX_API_BASE != null ? String(w.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
    if (!p || p.charAt(0) !== "/") p = "/" + (p || "");
    return base ? base + p : p;
  }

  function normEmail(e) {
    return String(e || "")
      .trim()
      .toLowerCase();
  }

  function localStorageKey() {
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.getStorageScope !== "function") return "skinex_inapp_notifications_guest";
    var sc = Auth.getStorageScope();
    if (!sc) return "skinex_inapp_notifications_guest";
    return "skinex_inapp_notifications_" + encodeURIComponent(sc);
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(localStorageKey());
      var data = raw ? JSON.parse(raw) : null;
      if (!data || !Array.isArray(data.items)) return { items: [] };
      return { items: data.items };
    } catch (e) {
      return { items: [] };
    }
  }

  function writeLocal(items) {
    try {
      localStorage.setItem(localStorageKey(), JSON.stringify({ items: items }));
    } catch (e) {}
  }

  function readOutbox() {
    try {
      var raw = localStorage.getItem(OUTBOX_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeOutbox(arr) {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr.slice(0, 500)));
    } catch (e) {}
  }

  /** Переносит записи из outbox в inbox текущего пользователя (по email). */
  function flushOutboxForCurrentUser() {
    if (useServer()) return;
    var Auth = w.SkinexAuth;
    var sess = Auth && typeof Auth.getSession === "function" ? Auth.getSession() : null;
    var me = sess && sess.email ? normEmail(sess.email) : "";
    if (!me) return;
    var ob = readOutbox();
    var keep = [];
    var mine = [];
    var i;
    for (i = 0; i < ob.length; i++) {
      if (normEmail(ob[i].toEmail) === me) mine.push(ob[i]);
      else keep.push(ob[i]);
    }
    if (!mine.length) return;
    writeOutbox(keep);
    var st = readLocal();
    for (i = 0; i < mine.length; i++) {
      var m = mine[i];
      st.items.unshift({
        id: m.id,
        kind: m.kind || "system",
        title: m.title || "Уведомление",
        body: m.body || "",
        link: m.link != null ? m.link : null,
        readAt: null,
        createdAt: m.createdAt || Date.now(),
      });
    }
    if (st.items.length > 80) st.items = st.items.slice(0, 80);
    writeLocal(st.items);
  }

  function useServer() {
    return !!w.SKINEX_USE_SERVER_API && typeof w.fetch === "function";
  }

  function fetchJson(path, options) {
    return fetch(apiPath(path), Object.assign({ credentials: "include" }, options || {})).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error((data && data.message) || res.statusText);
        return data;
      });
    });
  }

  /**
   * Уведомление для другого email (тот же браузер, после входа получателя).
   */
  function enqueueForRecipientEmail(email, payload) {
    if (useServer() || !email) return;
    var o = payload || {};
    var row = {
      toEmail: normEmail(email),
      kind: String(o.kind || "system"),
      title: String(o.title || "Уведомление"),
      body: String(o.body || ""),
      link: o.link != null ? String(o.link) : null,
      createdAt: Date.now(),
      id: "out_" + Date.now() + "_" + String(Math.random()).slice(2, 10),
    };
    var ob = readOutbox();
    ob.push(row);
    writeOutbox(ob);
  }

  /** Уведомить всех админов и менеджеров (локально). */
  function enqueueForStaffSupport(payload) {
    if (useServer()) return;
    var Auth = w.SkinexAuth;
    if (!Auth || typeof Auth.listAccountEmailsByRoles !== "function") return;
    var emails = Auth.listAccountEmailsByRoles(["admin", "manager"]);
    var o = payload || {};
    var i;
    for (i = 0; i < emails.length; i++) {
      enqueueForRecipientEmail(emails[i], o);
    }
  }

  /**
   * Рассылка из админки (локально): roles — массив ролей или ["all"].
   */
  function sendBroadcastLocal(payload) {
    if (useServer()) return { ok: false, message: "Используйте API." };
    var Auth = w.SkinexAuth;
    if (!Auth || !Auth.listClientAccounts || typeof Auth.listClientAccounts !== "function") return { ok: false, message: "Нет списка пользователей." };
    var accounts = Auth.listClientAccounts();
    if (!Array.isArray(accounts)) accounts = [];
    var o = payload || {};
    var title = String(o.title || "").trim();
    var body = String(o.body || "").trim();
    var linkRaw = o.link != null ? String(o.link).trim() : "";
    var roles = Array.isArray(o.roles) ? o.roles.map(function (r) { return String(r).toLowerCase(); }) : ["user"];
    if (!title || !body) return { ok: false, message: "Заполните заголовок и текст." };
    var all = roles.indexOf("all") >= 0;
    var n = 0;
    var i;
    var seen = {};
    for (i = 0; i < accounts.length; i++) {
      var a = accounts[i];
      if (!a || !a.email) continue;
      if (!all && roles.indexOf(String(a.role || "").toLowerCase()) < 0) continue;
      var e = normEmail(a.email);
      if (seen[e]) continue;
      seen[e] = true;
      enqueueForRecipientEmail(a.email, {
        kind: "broadcast",
        title: title,
        body: body,
        link: linkRaw ? linkRaw : null,
      });
      n++;
    }
    return { ok: true, queued: n };
  }

  function list() {
    if (useServer()) {
      return fetchJson("/api/v1/notifications?limit=50").then(function (data) {
        return {
          notifications: data.notifications || [],
          unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
        };
      });
    }
    flushOutboxForCurrentUser();
    var st = readLocal();
    var items = st.items.slice().sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    var unread = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].readAt == null) unread++;
    }
    return Promise.resolve({ notifications: items, unreadCount: unread });
  }

  function markRead(id) {
    if (useServer()) {
      return fetchJson("/api/v1/notifications/" + encodeURIComponent(id) + "/read", { method: "POST" }).then(function () {
        return { ok: true };
      });
    }
    return Promise.resolve().then(function () {
      var st = readLocal();
      var next = st.items.map(function (x) {
        if (String(x.id) !== String(id)) return x;
        return Object.assign({}, x, { readAt: Date.now() });
      });
      writeLocal(next);
      return { ok: true };
    });
  }

  function markAllRead() {
    if (useServer()) {
      return fetchJson("/api/v1/notifications/read-all", { method: "POST" }).then(function () {
        return { ok: true };
      });
    }
    return Promise.resolve().then(function () {
      var st = readLocal();
      var now = Date.now();
      var next = st.items.map(function (x) {
        return Object.assign({}, x, { readAt: x.readAt != null ? x.readAt : now });
      });
      writeLocal(next);
      return { ok: true };
    });
  }

  function pushLocal(payload) {
    if (useServer()) return null;
    var o = payload || {};
    var id = "loc_" + Date.now() + "_" + String(Math.random()).slice(2, 8);
    var item = {
      id: id,
      kind: String(o.kind || "local"),
      title: String(o.title || "Уведомление"),
      body: String(o.body || ""),
      link: o.link != null ? String(o.link) : null,
      readAt: null,
      createdAt: Date.now(),
    };
    var st = readLocal();
    st.items.unshift(item);
    if (st.items.length > 80) st.items = st.items.slice(0, 80);
    writeLocal(st.items);
    return item;
  }

  w.SkinexNotifications = {
    list: list,
    markRead: markRead,
    markAllRead: markAllRead,
    pushLocal: pushLocal,
    enqueueForRecipientEmail: enqueueForRecipientEmail,
    enqueueForStaffSupport: enqueueForStaffSupport,
    sendBroadcastLocal: sendBroadcastLocal,
  };
})(window);
