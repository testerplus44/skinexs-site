(function () {
  var Auth = window.SkinexAuth;
  if (!Auth) return;

  var tabLogin = document.getElementById("tabLogin");
  var tabRegister = document.getElementById("tabRegister");
  var panelLogin = document.getElementById("panelLogin");
  var panelRegister = document.getElementById("panelRegister");
  var formLogin = document.getElementById("formLogin");
  var formRegister = document.getElementById("formRegister");
  var loginMsg = document.getElementById("loginMsg");
  var registerMsg = document.getElementById("registerMsg");
  var btnSteamLogin = document.getElementById("btnSteamLogin");

  function nextUrl() {
    var p = new URLSearchParams(window.location.search).get("next");
    if (p && /^[a-zA-Z0-9._-]+\.html(#?[a-zA-Z0-9._-]*)?$/.test(p)) return p;
    if (p && p.startsWith("/")) return p.replace(/^\//, "") || "index.html";
    return "index.html";
  }

  /** Личный кабинет только для role=user; иначе цикл auth ↔ account для админа. */
  function postLoginTarget(role) {
    var t = nextUrl();
    if (role === "admin" && t === "account.html") return "admin.html";
    return t;
  }

  function goAfterAuth(role) {
    window.location.href = postLoginTarget(role);
  }

  function setMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok ? "#86d759" : text ? "#f87171" : "";
  }

  tabLogin &&
    tabLogin.addEventListener("click", function () {
      tabLogin.classList.add("is-active");
      tabRegister.classList.remove("is-active");
      tabLogin.setAttribute("aria-selected", "true");
      tabRegister.setAttribute("aria-selected", "false");
      panelLogin.hidden = false;
      panelRegister.hidden = true;
      setMsg(loginMsg, "", false);
      setMsg(registerMsg, "", false);
    });

  tabRegister &&
    tabRegister.addEventListener("click", function () {
      tabRegister.classList.add("is-active");
      tabLogin.classList.remove("is-active");
      tabRegister.setAttribute("aria-selected", "true");
      tabLogin.setAttribute("aria-selected", "false");
      panelRegister.hidden = false;
      panelLogin.hidden = true;
      setMsg(loginMsg, "", false);
      setMsg(registerMsg, "", false);
    });

  btnSteamLogin &&
    btnSteamLogin.addEventListener("click", function () {
      var SO = window.SkinexSteamOpenID;
      if (!SO || typeof SO.buildSteamLoginUrl !== "function") return;
      setMsg(loginMsg, "", false);
      try {
        sessionStorage.setItem("skinex_steam_next", nextUrl());
      } catch (e) {}
      window.location.href = SO.buildSteamLoginUrl();
    });

  formLogin &&
    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      setMsg(loginMsg, "", false);
      var fd = new FormData(formLogin);
      var email = fd.get("email");
      var password = fd.get("password");
      Auth.login(email, password).then(function (res) {
        if (res.ok) {
          setMsg(loginMsg, res.role === "admin" ? "Добро пожаловать, администратор." : "Вход выполнен.", true);
          setTimeout(function () {
            goAfterAuth(res.role);
          }, 400);
        } else {
          setMsg(loginMsg, res.message || "Ошибка входа.", false);
        }
      });
    });

  formRegister &&
    formRegister.addEventListener("submit", function (e) {
      e.preventDefault();
      setMsg(registerMsg, "", false);
      var fd = new FormData(formRegister);
      var email = fd.get("email");
      var displayName = fd.get("displayName");
      var password = fd.get("password");
      var password2 = fd.get("password2");
      if (String(password) !== String(password2)) {
        setMsg(registerMsg, "Пароли не совпадают.", false);
        return;
      }
      Auth.register(email, password, displayName).then(function (res) {
        if (res.ok) {
          setMsg(registerMsg, "Аккаунт создан. Перенаправление…", true);
          setTimeout(function () {
            goAfterAuth("user");
          }, 500);
        } else {
          setMsg(registerMsg, res.message || "Не удалось зарегистрироваться.", false);
        }
      });
    });

  if (Auth.isLoggedIn()) {
    var sess = Auth.getSession();
    var role = (sess && sess.role) || "user";
    setMsg(loginMsg, "Вы уже вошли. Переход на сайт…", true);
    setTimeout(function () {
      goAfterAuth(role);
    }, 500);
  }
})();
