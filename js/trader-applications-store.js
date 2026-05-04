/**
 * Заявки «стать трейдером»: сервер (SQLite) или localStorage + уведомления персоналу.
 */
(function (w) {
  var KEY = "skinex_trader_applications_v1";

  function apiPath(p) {
    var base = w.SKINEX_API_BASE != null ? String(w.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
    if (!p || p.charAt(0) !== "/") p = "/" + (p || "");
    return base ? base + p : p;
  }

  function useServer() {
    return !!w.SKINEX_USE_SERVER_API;
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (!data || !Array.isArray(data.applications)) return { applications: [] };
      return data;
    } catch (e) {
      return { applications: [] };
    }
  }

  function writeLocal(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ applications: (data.applications || []).slice(0, 500) }));
    } catch (e) {}
  }

  function normalizeTelegram(tag) {
    var s = String(tag || "").trim();
    if (s.charAt(0) === "@") s = s.slice(1);
    return s;
  }

  function validateTelegram(tag) {
    var s = normalizeTelegram(tag);
    if (s.length < 3 || s.length > 64) return { ok: false, message: "Тег Telegram: от 3 до 64 символов." };
    if (!/^[a-zA-Z0-9_]+$/.test(s)) return { ok: false, message: "Тег Telegram: только латиница, цифры и подчёркивание." };
    return { ok: true, value: s };
  }

  function validateSteamUrl(url) {
    var s = String(url || "").trim();
    if (!/^https?:\/\//i.test(s)) return { ok: false, message: "Укажите полную ссылку (https://…)." };
    var lower = s.toLowerCase();
    if (lower.indexOf("steamcommunity.com") < 0 && lower.indexOf("steampowered.com") < 0) {
      return { ok: false, message: "Ссылка должна вести на Steam (steamcommunity.com или steampowered.com)." };
    }
    return { ok: true, value: s };
  }

  function uid() {
    return "ta_" + Date.now() + "_" + String(Math.random()).slice(2, 9);
  }

  function submitLocal(telegramTag, steamUrl) {
    var Auth = w.SkinexAuth;
    var N = w.SkinexNotifications;
    var sess = Auth && typeof Auth.getSession === "function" ? Auth.getSession() : null;
    if (!sess || sess.userId == null) return { ok: false, message: "Войдите в аккаунт." };
    if (!Auth.isUser || !Auth.isUser()) return { ok: false, message: "Заявку могут подать только клиенты (роль «пользователь»)." };
    var vt = validateTelegram(telegramTag);
    if (!vt.ok) return vt;
    var vs = validateSteamUrl(steamUrl);
    if (!vs.ok) return vs;
    var data = readLocal();
    var pending = data.applications.some(function (a) {
      return a.status === "pending" && String(a.userId) === String(sess.userId);
    });
    if (pending) return { ok: false, message: "У вас уже есть заявка на рассмотрении." };
    var app = {
      id: uid(),
      userId: String(sess.userId),
      userEmail: sess.email || "",
      displayName: String((sess.displayName || "").trim()),
      telegramTag: vt.value,
      steamUrl: vs.value,
      status: "pending",
      createdAt: Date.now(),
      resolvedAt: null,
    };
    data.applications.unshift(app);
    writeLocal(data);
    if (N && typeof N.enqueueForStaffSupport === "function") {
      N.enqueueForStaffSupport({
        kind: "trader_apply",
        title: "Заявка на роль трейдера",
        body: (sess.email || "Пользователь") + " — Telegram @" + vt.value,
        link: "/admin.html?traderApp=" + encodeURIComponent(app.id) + "#traders",
      });
    }
    return { ok: true, application: app };
  }

  function submit(telegramTag, steamUrl) {
    if (useServer()) {
      return fetch(apiPath("/api/v1/trader-applications"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramTag: telegramTag, steamUrl: steamUrl }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data.ok) {
              return { ok: false, message: (data && data.message) || "Не удалось отправить заявку." };
            }
            return { ok: true, application: data.application };
          });
        })
        .catch(function () {
          return { ok: false, message: "Ошибка сети." };
        });
    }
    return Promise.resolve(submitLocal(telegramTag, steamUrl));
  }

  function listAllLocal() {
    return readLocal().applications.slice().sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function listAll() {
    if (useServer()) {
      return fetch(apiPath("/api/v1/admin/trader-applications"), { credentials: "include" })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data || !data.ok) return [];
            return data.applications || [];
          });
        })
        .catch(function () {
          return [];
        });
    }
    return Promise.resolve(listAllLocal());
  }

  function decideLocal(id, action) {
    var Auth = w.SkinexAuth;
    var N = w.SkinexNotifications;
    var data = readLocal();
    var idx = data.applications.findIndex(function (a) {
      return String(a.id) === String(id);
    });
    if (idx < 0) return Promise.resolve({ ok: false, message: "Заявка не найдена." });
    var app = data.applications[idx];
    if (app.status !== "pending") return Promise.resolve({ ok: false, message: "Заявка уже обработана." });
    if (action === "approve") {
      if (!Auth || typeof Auth.setAccountRole !== "function") {
        return Promise.resolve({ ok: false, message: "Нет доступа." });
      }
      return Auth.setAccountRole(app.userId, "trader").then(function (r) {
        if (!r.ok) return r;
        data.applications[idx] = Object.assign({}, app, { status: "approved", resolvedAt: Date.now() });
        writeLocal(data);
        if (app.userEmail && N && typeof N.enqueueForRecipientEmail === "function") {
          N.enqueueForRecipientEmail(app.userEmail, {
            kind: "trader_apply",
            title: "Трейдер: заявка одобрена",
            body: "Вам присвоена роль трейдера. Откройте личный кабинет.",
            link: "/account.html",
          });
        }
        return { ok: true };
      });
    }
    if (action === "reject") {
      data.applications[idx] = Object.assign({}, app, { status: "rejected", resolvedAt: Date.now() });
      writeLocal(data);
      if (app.userEmail && N && typeof N.enqueueForRecipientEmail === "function") {
        N.enqueueForRecipientEmail(app.userEmail, {
          kind: "trader_apply",
          title: "Трейдер: по заявке отказано",
          body: "При необходимости уточните данные и подайте заявку снова.",
          link: "/account.html",
        });
      }
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({ ok: false, message: "Неизвестное действие." });
  }

  function decide(id, action) {
    if (useServer()) {
      var path =
        action === "approve"
          ? "/api/v1/admin/trader-applications/" + encodeURIComponent(String(id)) + "/approve"
          : "/api/v1/admin/trader-applications/" + encodeURIComponent(String(id)) + "/reject";
      return fetch(apiPath(path), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data.ok) {
              return { ok: false, message: (data && data.message) || "Ошибка." };
            }
            return { ok: true };
          });
        })
        .catch(function () {
          return { ok: false, message: "Сеть." };
        });
    }
    return decideLocal(id, action);
  }

  function hasPendingLocal() {
    var Auth = w.SkinexAuth;
    var sess = Auth && typeof Auth.getSession === "function" ? Auth.getSession() : null;
    if (!sess || sess.userId == null) return false;
    return readLocal().applications.some(function (a) {
      return a.status === "pending" && String(a.userId) === String(sess.userId);
    });
  }

  function hasPending() {
    if (useServer()) {
      return fetch(apiPath("/api/v1/trader-applications/me"), { credentials: "include" })
        .then(function (res) {
          return res.json().then(function (data) {
            return !!(data && data.ok && data.pending);
          });
        })
        .catch(function () {
          return false;
        });
    }
    return Promise.resolve(hasPendingLocal());
  }

  w.SkinexTraderApplications = {
    submit: submit,
    listAll: listAll,
    decide: decide,
    hasPending: hasPending,
  };
})(window);
