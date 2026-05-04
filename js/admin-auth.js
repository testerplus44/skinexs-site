/**
 * Совместимость админ-панели: делегирует в SkinexAuth (единая сессия).
 * Старый вызов login(толькоПароль) поддерживается для обратной совместимости.
 */
(function (w) {
  var Auth = w.SkinexAuth;
  if (!Auth) return;

  function getAdminEmail() {
    return Auth.normEmail(w.SKINEX_ADMIN_EMAIL || "admin@skinex.local");
  }

  w.SkinexAdmin = {
    SESSION_KEY: Auth.SESSION_KEY,
    isLoggedIn: function () {
      return Auth.isAdmin();
    },
    /** (email, password) или устаревший вариант (password) — подставится email админа из конфига. */
    login: function (a, b) {
      if (arguments.length === 1) return Auth.login(getAdminEmail(), a);
      return Auth.login(a, b);
    },
    logout: function () {
      Auth.logout();
    },
  };
})(window);
