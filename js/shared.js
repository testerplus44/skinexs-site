(function (w) {
  w.SkinexUtils = {
    formatPrice(n) {
      return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
      }).format(Number(n) || 0);
    },
    escapeHtml(s) {
      const div = document.createElement("div");
      div.textContent = s == null ? "" : String(s);
      return div.innerHTML;
    },
    productUrl(id) {
      return "product.html?id=" + encodeURIComponent(String(id));
    },
    indexUrl(hash) {
      const h = hash && String(hash).startsWith("#") ? hash : hash ? "#" + hash : "";
      return "index.html" + h;
    },
    rarityLabels: {
      arcana: "Arcana",
      immortal: "Immortal",
      mythical: "Mythical",
    },
    rarityBadgeClass(r) {
      const m = {
        arcana: "cs-badge cs-badge--arcana",
        immortal: "cs-badge cs-badge--immortal",
        mythical: "cs-badge cs-badge--mythical",
      };
      return m[r] || "cs-badge";
    },
    /** Безопасный URL для img/video: только http(s). */
    validHttpUrl(s) {
      if (s == null || !String(s).trim()) return "";
      try {
        const u = new URL(String(s).trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") return "";
        return u.href;
      } catch {
        return "";
      }
    },
    /** Ссылка YouTube → embed URL или пусто. */
    youtubeEmbedUrl(input) {
      try {
        const u = new URL(String(input).trim());
        if (u.hostname === "youtu.be") {
          const id = u.pathname.split("/").filter(Boolean)[0];
          return id ? "https://www.youtube.com/embed/" + encodeURIComponent(id) : "";
        }
        if (u.hostname.includes("youtube.com")) {
          const v = u.searchParams.get("v");
          if (v) return "https://www.youtube.com/embed/" + encodeURIComponent(v);
          const m = u.pathname.match(/^\/embed\/([^/]+)/);
          if (m) return "https://www.youtube.com/embed/" + encodeURIComponent(m[1]);
        }
      } catch {
        return "";
      }
      return "";
    },
  };
})(window);
