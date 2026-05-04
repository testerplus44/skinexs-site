/**
 * Тексты главной (блок «Связь», футер) — localStorage, правка из админки.
 */
(function (w) {
  var KEY = "skinex_site_settings";

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return fallback;
    }
  }

  function defaults() {
    return {
      contactLead: "",
      contactBullets: "",
      footerBrand: "",
      footerDisclaimer: "",
    };
  }

  function get() {
    var raw = localStorage.getItem(KEY);
    var o = raw ? safeParse(raw, null) : null;
    if (!o || typeof o !== "object") return defaults();
    var d = defaults();
    return {
      contactLead: typeof o.contactLead === "string" ? o.contactLead : d.contactLead,
      contactBullets: typeof o.contactBullets === "string" ? o.contactBullets : d.contactBullets,
      footerBrand: typeof o.footerBrand === "string" ? o.footerBrand : d.footerBrand,
      footerDisclaimer: typeof o.footerDisclaimer === "string" ? o.footerDisclaimer : d.footerDisclaimer,
    };
  }

  function save(partial) {
    var cur = get();
    var next = Object.assign({}, cur, partial || {});
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function applyToPage() {
    var s = get();
    var fb = document.getElementById("siteFooterBrand");
    if (fb && s.footerBrand.trim()) fb.textContent = s.footerBrand.trim();
    var fd = document.getElementById("siteFooterDisclaimer");
    if (fd && s.footerDisclaimer.trim()) fd.textContent = s.footerDisclaimer.trim();
    var cl = document.getElementById("siteContactLead");
    if (cl && s.contactLead.trim()) cl.textContent = s.contactLead.trim();
    var ul = document.getElementById("siteContactList");
    if (ul && s.contactBullets.trim()) {
      var lines = s.contactBullets
        .split("\n")
        .map(function (l) {
          return l.trim();
        })
        .filter(Boolean);
      if (lines.length) {
        ul.innerHTML = lines
          .map(function (l) {
            return "<li>" + esc(l) + "</li>";
          })
          .join("");
      }
    }
  }

  w.SkinexSiteSettings = {
    KEY: KEY,
    get: get,
    save: save,
    applyToPage: applyToPage,
  };
})(window);
