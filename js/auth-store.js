/**
 * Клиентская авторизация (демо): пользователи в localStorage, сессия с ролью.
 * Роли: user (клиент), admin (из конфига), manager (поддержка — UI позже), trader (заявки на цену — позже).
 */
(function (w) {
  var USERS_KEY = "skinex_users";
  var SESSION_KEY = "skinex_session";
  var LEGACY_ADMIN_KEY = "skinex_admin_session";

  /** Роли зарегистрированных аккаунтов (не admin — он отдельно по email конфига). */
  var ACCOUNT_ROLES = ["user", "manager", "trader"];

  function normalizeAccountRole(r) {
    var x = String(r || "")
      .trim()
      .toLowerCase();
    if (ACCOUNT_ROLES.indexOf(x) >= 0) return x;
    return "user";
  }

  function normEmail(s) {
    return String(s || "")
      .trim()
      .toLowerCase();
  }

  function getAdminEmail() {
    return normEmail(w.SKINEX_ADMIN_EMAIL || "admin@skinex.local");
  }

  function getAdminPassword() {
    return w.SKINEX_ADMIN_PASSWORD != null ? String(w.SKINEX_ADMIN_PASSWORD) : "admin";
  }

  function useServerApi() {
    return !!w.SKINEX_USE_SERVER_API;
  }

  function apiUrl(path) {
    var base = w.SKINEX_API_BASE != null ? String(w.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
    if (!path || path.charAt(0) !== "/") path = "/" + (path || "");
    if (base) return base + path;
    return path;
  }

  function applyServerUserToSession(user, roleHint) {
    if (!user) return;
    var r = roleHint != null ? roleHint : user.role;
    var role =
      r === "admin" ? "admin" : normalizeAccountRole(typeof r === "string" ? r : user.role || "user");
    setSession({
      role: role,
      userId: user.id || user.userId,
      email: user.email,
      displayName: user.displayName || (user.email ? user.email.split("@")[0] : "Пользователь"),
      authProvider: user.steamId ? "steam" : undefined,
      steamId: user.steamId ? String(user.steamId) : undefined,
    });
  }

  function hydrateFromServer() {
    if (!useServerApi()) return Promise.resolve(null);
    return fetch(apiUrl("/api/v1/auth/me"), { credentials: "include" })
      .then(function (res) {
        if (res.status === 401) {
          clearLocalSession();
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.ok || !data.user) return null;
        applyServerUserToSession(data.user, data.user.role);
        return data.user;
      })
      .catch(function () {
        return null;
      });
  }

  /** Обновить локальную сессию из ответа GET /auth/me (роль, баланс и т.д. уже в объекте user). */
  function syncSessionFromServerUser(user) {
    if (!useServerApi() || !user) return;
    applyServerUserToSession(user, user.role);
  }

  function clearLocalSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_ADMIN_KEY);
  }

  function maxAgeMs() {
    var h = Number(w.SKINEX_ADMIN_SESSION_HOURS);
    if (!isFinite(h) || h < 1) h = 12;
    return h * 3600000;
  }

  function randomSalt() {
    var arr = new Uint8Array(16);
    if (w.crypto && w.crypto.getRandomValues) w.crypto.getRandomValues(arr);
    else for (var i = 0; i < arr.length; i++) arr[i] = (Math.random() * 256) | 0;
    return Array.from(arr)
      .map(function (b) {
        return ("0" + b.toString(16)).slice(-2);
      })
      .join("");
  }

  function simpleFallbackHash(salt, password) {
    var s = salt + "|" + password;
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return "fb:" + salt + ":" + String(h);
  }

  function hashPassword(salt, password) {
    if (w.crypto && w.crypto.subtle) {
      return w.crypto.subtle
        .digest("SHA-256", new TextEncoder().encode(salt + "|" + password))
        .then(function (buf) {
          return Array.from(new Uint8Array(buf))
            .map(function (b) {
              return ("0" + b.toString(16)).slice(-2);
            })
            .join("");
        });
    }
    return Promise.resolve(simpleFallbackHash(salt, password));
  }

  function readUsers() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      var changed = false;
      for (var i = 0; i < arr.length; i++) {
        var u = arr[i];
        if (!u || typeof u !== "object") continue;
        var nr = normalizeAccountRole(u.role);
        if (u.role !== nr) {
          u.role = nr;
          changed = true;
        }
      }
      if (changed) writeUsers(arr);
      return arr;
    } catch (e) {
      return [];
    }
  }

  function writeUsers(arr) {
    localStorage.setItem(USERS_KEY, JSON.stringify(arr));
  }

  function migrateLegacyAdmin() {
    try {
      var raw = localStorage.getItem(LEGACY_ADMIN_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && s.ok && !localStorage.getItem(SESSION_KEY)) {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            role: "admin",
            email: getAdminEmail(),
            at: Number(s.at) || Date.now(),
          }),
        );
      }
      localStorage.removeItem(LEGACY_ADMIN_KEY);
    } catch (e) {}
  }

  function getSession() {
    if (!useServerApi()) migrateLegacyAdmin();
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.role) return null;
      if (!useServerApi() && Date.now() - Number(s.at || 0) > maxAgeMs()) {
        logout();
        return null;
      }
      return s;
    } catch (e) {
      return null;
    }
  }

  function setSession(obj) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(Object.assign({}, obj, { at: Date.now() })));
  }

  function logout() {
    clearLocalSession();
    if (useServerApi()) {
      fetch(apiUrl("/api/v1/auth/logout"), { method: "POST", credentials: "include" }).catch(function () {});
    }
  }

  function isLoggedIn() {
    return !!getSession();
  }

  /**
   * Стабильный идентификатор для ключей localStorage (профиль, корзина) — у каждого аккаунта свой.
   * Предпочтительно userId; иначе нормализованный email (например, только админ без id в демо).
   */
  function getStorageScope() {
    var s = getSession();
    if (!s) return null;
    if (s.userId != null && String(s.userId).trim() !== "") return "uid:" + String(s.userId).trim();
    if (s.email) return "em:" + normEmail(s.email);
    return null;
  }

  var LEGACY_CART_KEY = "skinex_cart";

  /** Ключ localStorage для корзины — отдельно для гостя и для каждого аккаунта. */
  function getCartStorageKey() {
    var sc = getStorageScope();
    if (!sc) return "skinex_cart_guest";
    return "skinex_cart_" + encodeURIComponent(sc);
  }

  /** Только обычный клиент (без staff / trader привилегий в будущей логике). */
  function isUser() {
    var s = getSession();
    return !!(s && s.role === "user");
  }

  /** Клиентский кабинет: пользователь, менеджер или трейдер. */
  function isClient() {
    var s = getSession();
    return !!(s && ACCOUNT_ROLES.indexOf(s.role) >= 0);
  }

  function isAdmin() {
    var s = getSession();
    return !!(s && s.role === "admin");
  }

  function isManager() {
    var s = getSession();
    return !!(s && s.role === "manager");
  }

  function isTrader() {
    var s = getSession();
    return !!(s && s.role === "trader");
  }

  function loginAdmin(email, password) {
    var e = normEmail(email);
    if (e === getAdminEmail() && String(password) === getAdminPassword()) {
      setSession({ role: "admin", email: e });
      return { ok: true, role: "admin" };
    }
    return { ok: false, message: "Неверный email или пароль администратора." };
  }

  function isSteamOnlyUser(u) {
    return !!(u && (u.authProvider === "steam" || String(u.passwordHash || "").indexOf("__STEAM_ONLY__") === 0));
  }

  function steamSyntheticEmail(steamId) {
    return "steam_" + String(steamId) + "@steam.skinex.local";
  }

  function loginUser(email, password) {
    return Promise.resolve().then(function () {
      var e = normEmail(email);
      var users = readUsers();
      var u = users.find(function (x) {
        return normEmail(x.email) === e;
      });
      if (!u) return { ok: false, message: "Пользователь с таким email не найден." };
      if (isSteamOnlyUser(u)) {
        return { ok: false, message: "Этот аккаунт привязан к Steam. Войдите через «Войти через Steam»." };
      }
      return hashPassword(u.salt, password).then(function (h) {
        if (h !== u.passwordHash) return { ok: false, message: "Неверный пароль." };
        var accRole = normalizeAccountRole(u.role);
        setSession({
          role: accRole,
          userId: u.id,
          email: u.email,
          displayName: u.displayName || u.email.split("@")[0],
        });
        return { ok: true, role: accRole };
      });
    });
  }

  /**
   * Регистрация или вход по Steam ID (после OpenID callback).
   */
  function registerOrLoginSteam(steamId) {
    var sid = String(steamId || "").trim();
    if (!/^\d{5,20}$/.test(sid)) return { ok: false, message: "Некорректный Steam ID." };
    var users = readUsers();
    var existing = users.find(function (x) {
      return String(x.steamId) === sid;
    });
    if (existing) {
      var accRole = normalizeAccountRole(existing.role);
      setSession({
        role: accRole,
        userId: existing.id,
        email: existing.email,
        displayName: existing.displayName || "Игрок " + sid.slice(-6),
        authProvider: "steam",
        steamId: sid,
      });
      return { ok: true, role: accRole };
    }
    var email = steamSyntheticEmail(sid);
    if (users.some(function (x) {
      return normEmail(x.email) === normEmail(email);
    })) {
      return { ok: false, message: "Конфликт email для Steam-аккаунта." };
    }
    var salt = randomSalt();
    var u = {
      id: w.crypto && w.crypto.randomUUID ? w.crypto.randomUUID() : String(Date.now()) + "-" + String(Math.random()).slice(2, 9),
      email: email,
      steamId: sid,
      authProvider: "steam",
      salt: salt,
      passwordHash: "__STEAM_ONLY__",
      displayName: "Игрок " + sid.slice(-6),
      role: "user",
      createdAt: Date.now(),
    };
    users.push(u);
    writeUsers(users);
    setSession({
      role: "user",
      userId: u.id,
      email: u.email,
      displayName: u.displayName,
      authProvider: "steam",
      steamId: sid,
    });
    return { ok: true, role: "user" };
  }

  /**
   * Обработка query после редиректа Steam (нужен SkinexSteamOpenID).
   * Без серверной проверки — только для совместимости / демо (см. completeSteamLoginAsync).
   */
  function completeSteamLogin(search) {
    var SO = w.SkinexSteamOpenID;
    if (!SO || typeof SO.parseSteamReturn !== "function") {
      return { ok: false, message: "Модуль Steam не загружен." };
    }
    var pr = SO.parseSteamReturn(search);
    if (!pr.ok) return pr;
    return registerOrLoginSteam(pr.steamId);
  }

  function steamVerifyEndpointUrl() {
    var custom = w.SKINEX_STEAM_VERIFY_URL != null ? String(w.SKINEX_STEAM_VERIFY_URL).trim() : "";
    if (custom) return custom;
    try {
      return new URL("/api/auth/steam/verify", w.location.origin).href;
    } catch (e) {
      return "/api/auth/steam/verify";
    }
  }

  /**
   * Безопасный вход: POST на backend — Steam OpenID check_authentication.
   * При SKINEX_STEAM_ALLOW_INSECURE_PARSE=true при ошибке сети/404 можно откатиться на completeSteamLogin (не для продакшена).
   */
  function completeSteamLoginAsync(search) {
    var allowInsecure = !!w.SKINEX_STEAM_ALLOW_INSECURE_PARSE;
    var q = typeof search === "string" ? search : w.location.search || "";
    if (useServerApi()) {
      return fetch(apiUrl("/api/v1/auth/steam/session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: q }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data.ok || !data.user) {
              return {
                ok: false,
                message: (data && data.message) || "Не удалось войти через Steam.",
              };
            }
            applyServerUserToSession(data.user, data.user.role);
            return { ok: true, role: data.user.role };
          });
        })
        .catch(function () {
          return { ok: false, message: "Нет связи с сервером." };
        });
    }
    var url = steamVerifyEndpointUrl();
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
      credentials: "same-origin",
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (e) {
            data = null;
          }
          if (res.ok && data && data.ok && data.steamId) {
            return registerOrLoginSteam(data.steamId);
          }
          if (allowInsecure) return completeSteamLogin(q);
          return {
            ok: false,
            message:
              (data && data.message) ||
              (res.status === 404
                ? "Нет API проверки Steam. Запустите сервер из папки server (npm start) или задайте SKINEX_STEAM_VERIFY_URL."
                : "Сервер не подтвердил вход Steam."),
          };
        });
      })
      .catch(function () {
        if (allowInsecure) return completeSteamLogin(q);
        return {
          ok: false,
          message:
            "Нет связи с сервером проверки Steam. Откройте сайт через node server или включите SKINEX_STEAM_ALLOW_INSECURE_PARSE (только для разработки).",
        };
      });
  }

  /** Админ — только по email из конфига; иначе вход пользователя. */
  function login(email, password) {
    var e = normEmail(email);
    if (useServerApi()) {
      return fetch(apiUrl("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: e, password: String(password) }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data.ok) {
              return { ok: false, message: (data && data.message) || "Ошибка входа." };
            }
            applyServerUserToSession(data.user, data.role);
            return { ok: true, role: data.role };
          });
        })
        .catch(function () {
          return { ok: false, message: "Нет связи с сервером." };
        });
    }
    if (e === getAdminEmail()) return Promise.resolve(loginAdmin(email, password));
    return loginUser(email, password);
  }

  function requestPasswordReset(email) {
    var e = normEmail(email);
    if (!useServerApi()) {
      return Promise.resolve({
        ok: false,
        message: "Сброс пароля доступен при работе сайта через сервер (API). Включите режим сервера или обратитесь в поддержку.",
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return Promise.resolve({ ok: false, message: "Укажите корректный email." });
    }
    return fetch(apiUrl("/api/v1/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: e }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) {
            return { ok: false, message: (data && data.message) || "Не удалось отправить запрос." };
          }
          return { ok: true, message: data.message || "Проверьте почту." };
        });
      })
      .catch(function () {
        return { ok: false, message: "Нет связи с сервером." };
      });
  }

  function resetPasswordWithToken(token, password) {
    if (!useServerApi()) {
      return Promise.resolve({
        ok: false,
        message: "Сброс пароля доступен при работе сайта через сервер (API).",
      });
    }
    var t = String(token || "").trim();
    if (!t || t.length < 64) {
      return Promise.resolve({ ok: false, message: "Ссылка недействительна или устарела." });
    }
    if (!password || String(password).length < 6) {
      return Promise.resolve({ ok: false, message: "Пароль не короче 6 символов." });
    }
    return fetch(apiUrl("/api/v1/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token: t, password: String(password) }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) {
            return { ok: false, message: (data && data.message) || "Не удалось сменить пароль." };
          }
          return { ok: true, message: data.message || "Пароль обновлён." };
        });
      })
      .catch(function () {
        return { ok: false, message: "Нет связи с сервером." };
      });
  }

  function register(email, password, displayName) {
    var e = normEmail(email);
    if (useServerApi()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return Promise.resolve({ ok: false, message: "Укажите корректный email." });
      if (!password || String(password).length < 6) return Promise.resolve({ ok: false, message: "Пароль не короче 6 символов." });
      if (e === getAdminEmail()) return Promise.resolve({ ok: false, message: "Этот email зарезервирован для администратора." });
      return fetch(apiUrl("/api/v1/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: e, password: String(password), displayName: String(displayName || "").trim() }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data.ok) {
              return { ok: false, message: (data && data.message) || "Ошибка регистрации." };
            }
            applyServerUserToSession(data.user, data.role);
            return { ok: true, role: data.role };
          });
        })
        .catch(function () {
          return { ok: false, message: "Нет связи с сервером." };
        });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return Promise.resolve({ ok: false, message: "Укажите корректный email." });
    if (e.indexOf("@steam.skinex.local") >= 0 || /^steam_\d+@/.test(e)) {
      return Promise.resolve({ ok: false, message: "Этот формат email зарезервирован для входа через Steam." });
    }
    if (!password || String(password).length < 6) return Promise.resolve({ ok: false, message: "Пароль не короче 6 символов." });
    if (e === getAdminEmail()) return Promise.resolve({ ok: false, message: "Этот email зарезервирован для администратора." });

    var users = readUsers();
    if (users.some(function (x) {
      return normEmail(x.email) === e;
    })) {
      return Promise.resolve({ ok: false, message: "Пользователь с таким email уже существует." });
    }

    var salt = randomSalt();
    return hashPassword(salt, password).then(function (hash) {
      var u = {
        id: w.crypto && w.crypto.randomUUID ? w.crypto.randomUUID() : String(Date.now()) + "-" + String(Math.random()).slice(2, 9),
        email: e,
        salt: salt,
        passwordHash: hash,
        displayName: String(displayName || "").trim() || e.split("@")[0],
        role: "user",
        createdAt: Date.now(),
      };
      users.push(u);
      writeUsers(users);
      setSession({
        role: "user",
        userId: u.id,
        email: u.email,
        displayName: u.displayName,
      });
      return { ok: true, role: "user" };
    });
  }

  /**
   * Email аккаунтов с указанными ролями (локальный режим). Для рассылок и уведомлений персоналу.
   * Роль admin добавляет email из конфига SKINEX_ADMIN_EMAIL, если он в списке ролей.
   */
  function listAccountEmailsByRoles(rolesWanted) {
    var want = Array.isArray(rolesWanted) ? rolesWanted.map(function (r) { return String(r || "").toLowerCase(); }) : [];
    if (!want.length) return [];
    if (useServerApi()) return [];
    var users = readUsers();
    var out = [];
    var seen = {};
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (!u || !u.email) continue;
      var r = normalizeAccountRole(u.role);
      if (want.indexOf(r) < 0) continue;
      var e = normEmail(u.email);
      if (!seen[e]) {
        seen[e] = true;
        out.push(e);
      }
    }
    if (want.indexOf("admin") >= 0) {
      var ae = normEmail(getAdminEmail());
      if (ae && !seen[ae]) {
        seen[ae] = true;
        out.push(ae);
      }
    }
    return out;
  }

  function listClientAccounts() {
    if (!isAdmin()) return [];
    if (useServerApi()) return [];
    return readUsers().map(function (u) {
      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName || "",
        role: normalizeAccountRole(u.role),
        steamId: u.steamId || null,
        authProvider: u.authProvider || null,
      };
    });
  }

  function listClientAccountsFromServer() {
    if (!useServerApi() || !isAdmin()) return Promise.resolve([]);
    return fetch(apiUrl("/api/v1/admin/users"), { credentials: "include" })
      .then(function (res) {
        return res.json();
      })
      .then(function (rows) {
        if (!Array.isArray(rows)) return [];
        return rows.map(function (u) {
          return {
            id: u.id,
            email: u.email,
            displayName: u.displayName || "",
            role: normalizeAccountRole(u.role),
            steamId: u.steamId || null,
            authProvider: u.steamId ? "steam" : null,
          };
        });
      })
      .catch(function () {
        return [];
      });
  }

  function setAccountRole(userId, role) {
    if (!isAdmin()) return Promise.resolve({ ok: false, message: "Только администратор может менять роли." });
    var r = normalizeAccountRole(role);
    if (ACCOUNT_ROLES.indexOf(r) < 0) return Promise.resolve({ ok: false, message: "Недопустимая роль." });
    if (useServerApi()) {
      return fetch(apiUrl("/api/v1/admin/users/" + encodeURIComponent(String(userId)) + "/role"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: r }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data.ok) {
              return { ok: false, message: (data && data.message) || "Ошибка." };
            }
            var sess = getSession();
            if (sess && sess.userId != null && String(sess.userId) === String(userId)) {
              setSession(Object.assign({}, sess, { role: r }));
            }
            return { ok: true };
          });
        })
        .catch(function () {
          return { ok: false, message: "Сеть." };
        });
    }
    var users = readUsers();
    var idx = users.findIndex(function (x) {
      return String(x.id) === String(userId);
    });
    if (idx < 0) return Promise.resolve({ ok: false, message: "Пользователь не найден." });
    users[idx].role = r;
    writeUsers(users);
    var sess = getSession();
    if (sess && sess.userId != null && String(sess.userId) === String(userId)) {
      setSession(Object.assign({}, sess, { role: r }));
    }
    return Promise.resolve({ ok: true });
  }

  w.SkinexAuth = {
    USERS_KEY: USERS_KEY,
    SESSION_KEY: SESSION_KEY,
    ACCOUNT_ROLES: ACCOUNT_ROLES.slice(),
    normalizeAccountRole: normalizeAccountRole,
    getStorageScope: getStorageScope,
    getCartStorageKey: getCartStorageKey,
    LEGACY_CART_KEY: LEGACY_CART_KEY,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    isUser: isUser,
    isClient: isClient,
    isAdmin: isAdmin,
    isManager: isManager,
    isTrader: isTrader,
    login: login,
    loginAdmin: loginAdmin,
    loginUser: loginUser,
    register: register,
    requestPasswordReset: requestPasswordReset,
    resetPasswordWithToken: resetPasswordWithToken,
    logout: logout,
    normEmail: normEmail,
    listAccountEmailsByRoles: listAccountEmailsByRoles,
    listClientAccounts: listClientAccounts,
    setAccountRole: setAccountRole,
    registerOrLoginSteam: registerOrLoginSteam,
    completeSteamLogin: completeSteamLogin,
    completeSteamLoginAsync: completeSteamLoginAsync,
    isSteamOnlyUser: isSteamOnlyUser,
    hydrateFromServer: hydrateFromServer,
    syncSessionFromServerUser: syncSessionFromServerUser,
    listClientAccountsFromServer: listClientAccountsFromServer,
  };
})(window);
