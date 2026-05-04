(function () {
  function currentPage() {
    var n = location.pathname.split("/").pop();
    return n && n.endsWith(".html") ? n : "index.html";
  }

  function loginNextPage() {
    var p = currentPage();
    return p === "auth.html" ? "index.html" : p;
  }

  /** Ссылка «Личный кабинет» только справа в шапке; старый пункт из nav убираем. */
  function syncCabinetNavLink() {
    var navPrimary = document.querySelector(".nav.nav-primary");
    if (!navPrimary) return;
    var existing = navPrimary.querySelector("a[data-skinex-cabinet]");
    if (existing) existing.remove();
  }

  /** Пункт «Steam» в основной навигации (рядом с Каталог / Поддержка / Отзывы), тот же стиль что и остальные ссылки. */
  function syncSteamTopupNavLink() {
    var legacy = document.querySelector(".header-actions a[data-skinex-steam-topup]");
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
    var navPrimary = document.querySelector(".nav.nav-primary");
    if (!navPrimary) return;
    var existing = navPrimary.querySelector("a[data-skinex-steam-topup]");
    if (existing) return;
    var a = document.createElement("a");
    a.href = "steam-topup.html";
    a.setAttribute("data-skinex-steam-topup", "1");
    a.textContent = "Пополнение Steam";
    a.setAttribute("aria-label", "Пополнение кошелька Steam");
    if (currentPage() === "steam-topup.html") {
      a.setAttribute("aria-current", "page");
      a.classList.add("nav-active");
    }
    navPrimary.appendChild(a);
  }

  /** Подсветка «Каталог» на главной и карточке товара (остальные страницы — из разметки или Steam). */
  function syncCatalogNavActive() {
    var p = currentPage();
    if (p !== "index.html" && p !== "product.html") return;
    var nav = document.querySelector(".site-header .nav.nav-primary");
    if (!nav) return;
    var cat = nav.querySelector('a[href="index.html#catalog"]');
    if (!cat) return;
    nav.querySelectorAll("a").forEach(function (el) {
      el.classList.remove("nav-active");
      el.removeAttribute("aria-current");
    });
    cat.classList.add("nav-active");
    cat.setAttribute("aria-current", "page");
    var steam = nav.querySelector("a[data-skinex-steam-topup]");
    if (steam) nav.appendChild(steam);
  }

  function syncCartAndAdminHeader() {
    var Auth = window.SkinexAuth;
    var cart = document.querySelector(".header-actions .cart-toggle");
    var repl = document.getElementById("skinexHeaderAdminAsCart");
    if (repl && repl.parentNode) {
      repl.parentNode.removeChild(repl);
    }
    if (cart) {
      cart.removeAttribute("hidden");
      cart.style.display = "";
    }
    if (!Auth || !Auth.isLoggedIn || !Auth.isLoggedIn()) return;
    var isAd = Auth.isAdmin && Auth.isAdmin();
    var isMan = Auth.isManager && Auth.isManager();
    if (cart && (isAd || isMan)) {
      cart.setAttribute("hidden", "");
      cart.style.display = "none";
    }
    if (isAd && cart && cart.parentNode) {
      var am = document.createElement("a");
      am.id = "skinexHeaderAdminAsCart";
      am.href = "admin.html";
      am.className = "btn btn-ghost cart-toggle nav-admin-link";
      am.textContent = "Админка";
      am.setAttribute("aria-label", "Панель администратора");
      if (currentPage() === "admin.html") am.setAttribute("aria-current", "page");
      cart.parentNode.insertBefore(am, cart.nextSibling);
    }
  }

  function run() {
    var Auth = window.SkinexAuth;
    var userSlot = document.getElementById("userNavSlot");
    if (userSlot && Auth) {
      userSlot.innerHTML = "";
      var s = Auth.getSession();
      if (s && Auth.isLoggedIn && Auth.isLoggedIn()) {
        var cluster = document.createElement("div");
        cluster.className = "header-user-cluster";
        var isAdmin = Auth.isAdmin && Auth.isAdmin();
        if (currentPage() !== "account.html" && !isAdmin) {
          var cab = document.createElement("a");
          cab.href = "account.html";
          cab.className = "nav-user-cabinet";
          cab.textContent = "Личный кабинет";
          cab.setAttribute("aria-label", "Личный кабинет");
          cluster.appendChild(cab);
        }
        var out = document.createElement("button");
        out.type = "button";
        out.className = "btn btn-ghost nav-user-out";
        out.textContent = "Выйти";
        out.addEventListener("click", function () {
          Auth.logout();
          location.reload();
        });
        cluster.appendChild(out);
        userSlot.appendChild(cluster);
      } else {
        var login = document.createElement("a");
        login.href = "auth.html?next=" + encodeURIComponent(loginNextPage());
        login.className = "nav-user-login";
        login.textContent = "Войти";
        userSlot.appendChild(login);
      }
    }
    syncCabinetNavLink();
    syncSteamTopupNavLink();
    syncCatalogNavActive();
    syncCartAndAdminHeader();

    var adminSlot = document.getElementById("adminNavSlot");
    if (adminSlot) {
      adminSlot.innerHTML = "";
    }
    if (window.SkinexNotificationsUI && typeof window.SkinexNotificationsUI.tryMount === "function") {
      window.SkinexNotificationsUI.tryMount();
    }
  }

  function start() {
    var Auth = window.SkinexAuth;
    if (window.SKINEX_USE_SERVER_API && Auth && typeof Auth.hydrateFromServer === "function") {
      Auth.hydrateFromServer().finally(function () {
        run();
      });
      return;
    }
    run();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.SkinexNavRefresh = function () {
    var Auth = window.SkinexAuth;
    if (window.SKINEX_USE_SERVER_API && Auth && typeof Auth.hydrateFromServer === "function") {
      Auth.hydrateFromServer().finally(run);
    } else run();
  };
})();
