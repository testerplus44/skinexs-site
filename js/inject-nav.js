(function () {
  var Paths = window.SkinexPaths;

  function currentSlug() {
    if (Paths && Paths.currentSlug) return Paths.currentSlug();
    var n = location.pathname.split("/").pop();
    return n && n.endsWith(".html") ? n.replace(/\.html$/, "") : n || "index";
  }

  function loginNextPage() {
    var slug = currentSlug();
    return slug === "auth" ? (Paths && Paths.P ? Paths.P.home : "/") : location.pathname + location.search + location.hash;
  }

  function syncCabinetNavLink() {
    var navPrimary = document.querySelector(".nav.nav-primary");
    if (!navPrimary) return;
    var existing = navPrimary.querySelector("a[data-skinex-cabinet]");
    if (existing) existing.remove();
  }

  function syncSteamTopupNavLink() {
    var legacy = document.querySelector(".header-actions a[data-skinex-steam-topup]");
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
    var navPrimary = document.querySelector(".nav.nav-primary");
    if (!navPrimary) return;
    var existing = navPrimary.querySelector("a[data-skinex-steam-topup]");
    if (existing) return;
    var a = document.createElement("a");
    a.href = Paths && Paths.P ? Paths.P.steamTopup : "/steam-topup";
    a.setAttribute("data-skinex-steam-topup", "1");
    a.textContent = "Пополнение Steam";
    a.setAttribute("aria-label", "Пополнение кошелька Steam");
    if (currentSlug() === "steam-topup") {
      a.setAttribute("aria-current", "page");
      a.classList.add("nav-active");
    }
    navPrimary.appendChild(a);
  }

  function syncCatalogNavActive() {
    var slug = currentSlug();
    if (slug !== "index" && slug !== "product") return;
    var nav = document.querySelector(".site-header .nav.nav-primary");
    if (!nav) return;
    var catHref = Paths && Paths.catalogHref ? Paths.catalogHref : "/#catalog";
    var cat = nav.querySelector('a[href="' + catHref + '"]') || nav.querySelector('a[href*="catalog"]');
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
      am.href = Paths && Paths.P ? Paths.P.admin : "/admin";
      am.className = "btn btn-ghost cart-toggle nav-admin-link";
      am.textContent = "Админка";
      am.setAttribute("aria-label", "Админ-панель");
      if (currentSlug() === "admin") am.setAttribute("aria-current", "page");
      cart.parentNode.insertBefore(am, cart);
    }
  }

  function syncHeaderAuthSlot() {
    var Auth = window.SkinexAuth;
    var slot = document.querySelector(".header-auth-slot");
    if (!slot || !Auth) return;
    slot.innerHTML = "";
    if (Auth.isLoggedIn && Auth.isLoggedIn()) {
      var isAdmin = Auth.isAdmin && Auth.isAdmin();
      var cab = document.createElement("a");
      cab.className = "nav-user-cabinet";
      cab.href = Paths && Paths.P ? Paths.P.account : "/account";
      cab.textContent = "Личный кабинет";
      if (currentSlug() === "account" && !isAdmin) {
        cab.setAttribute("aria-current", "page");
      }
      slot.appendChild(cab);
      var out = document.createElement("button");
      out.type = "button";
      out.className = "nav-user-out btn btn-ghost";
      out.textContent = "Выйти";
      out.addEventListener("click", function () {
        Auth.logout();
        window.location.reload();
      });
      slot.appendChild(out);
    } else {
      var login = document.createElement("a");
      login.className = "nav-user-login btn btn-outline";
      login.href =
        (Paths && Paths.P ? Paths.P.auth : "/auth") +
        "?next=" +
        encodeURIComponent(loginNextPage());
      login.textContent = "Войти";
      slot.appendChild(login);
    }
  }

  function init() {
    syncCabinetNavLink();
    syncSteamTopupNavLink();
    syncCatalogNavActive();
    syncCartAndAdminHeader();
    syncHeaderAuthSlot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("storage", function (e) {
    if (e.key === "skinex_session_v1") syncHeaderAuthSlot();
  });

  var Auth = window.SkinexAuth;
  if (window.SKINEX_USE_SERVER_API && Auth && typeof Auth.hydrateFromServer === "function") {
    Auth.hydrateFromServer().then(function () {
      syncHeaderAuthSlot();
      syncCartAndAdminHeader();
    });
  }
})();
