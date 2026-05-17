/**
 * Чистые URL без .html (см. server/index.js).
 */
(function (w) {
  var P = {
    home: "/",
    support: "/support",
    reviews: "/reviews",
    steamTopup: "/steam-topup",
    auth: "/auth",
    account: "/account",
    admin: "/admin",
    product: "/product",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    steamCallback: "/steam-callback",
    legalTerms: "/legal/terms",
    legalPrivacy: "/legal/privacy",
    legalMarketplace: "/legal/marketplace",
  };

  var LEGACY = {
    "/": P.home,
    "/support": P.support,
    "/reviews": P.reviews,
    "steam-topup.html": P.steamTopup,
    "/auth": P.auth,
    "/account": P.account,
    "/admin": P.admin,
    "product.html": P.product,
    "forgot-password.html": P.forgotPassword,
    "reset-password.html": P.resetPassword,
    "/steam-callback": P.steamCallback,
    "legal/terms.html": P.legalTerms,
    "legal/privacy.html": P.legalPrivacy,
    "legal/marketplace.html": P.legalMarketplace,
  };

  var PATH_TO_SLUG = {
    "/": "index",
    "/support": "support",
    "/reviews": "reviews",
    "/steam-topup": "steam-topup",
    "/auth": "auth",
    "/account": "account",
    "/admin": "admin",
    "/product": "product",
    "/forgot-password": "forgot-password",
    "/reset-password": "reset-password",
    "/steam-callback": "steam-callback",
    "/legal/terms": "legal-terms",
    "/legal/privacy": "legal-privacy",
    "/legal/marketplace": "legal-marketplace",
  };

  function productUrl(id) {
    return P.product + "?id=" + encodeURIComponent(String(id));
  }

  function indexUrl(hash) {
    var h = hash && String(hash).startsWith("#") ? hash : hash ? "#" + hash : "";
    return P.home + h;
  }

  function normalizeHref(raw) {
    var s = String(raw || "").trim();
    if (!s) return P.home;
    if (s.charAt(0) === "/") return s;
    var hash = "";
    var hi = s.indexOf("#");
    if (hi >= 0) {
      hash = s.slice(hi);
      s = s.slice(0, hi);
    }
    var q = "";
    var qi = s.indexOf("?");
    if (qi >= 0) {
      q = s.slice(qi);
      s = s.slice(0, qi);
    }
    if (LEGACY[s]) return LEGACY[s] + q + hash;
    if (/\.html$/i.test(s)) return "/" + s.replace(/\.html$/i, "").replace(/^\//, "") + q + hash;
    return s + q + hash;
  }

  function currentSlug() {
    var path = location.pathname.replace(/\/+$/, "") || "/";
    if (PATH_TO_SLUG[path]) return PATH_TO_SLUG[path];
    var n = path.split("/").pop();
    return n || "index";
  }

  w.SkinexPaths = {
    P: P,
    productUrl: productUrl,
    indexUrl: indexUrl,
    normalizeHref: normalizeHref,
    currentSlug: currentSlug,
    catalogHref: "/#catalog",
  };
})(window);
