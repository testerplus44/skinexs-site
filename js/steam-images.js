/**
 * Steam Economy CDN: превью предметов Dota 2.
 */
(function (w) {
  var STEAM_ECONOMY_BASE = "https://community.cloudflare.steamstatic.com/economy/image/";
  var DEFAULT_SIZE = "600fx600f";

  function escAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function validHttpUrl(s) {
    if (w.SkinexUtils && typeof w.SkinexUtils.validHttpUrl === "function") {
      return w.SkinexUtils.validHttpUrl(s);
    }
    if (s == null || !String(s).trim()) return "";
    try {
      var u = new URL(String(s).trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      return u.href;
    } catch (e) {
      return "";
    }
  }

  /** @param {string} iconUrl — hash или полный URL из Steam API */
  function getSteamImageUrl(iconUrl, sizeSuffix) {
    if (iconUrl == null || !String(iconUrl).trim()) return "";
    var icon = String(iconUrl).trim();
    if (/^https?:\/\//i.test(icon)) return icon;
    icon = icon.replace(/^\//, "");
    var suffix = sizeSuffix && String(sizeSuffix).trim() ? String(sizeSuffix).trim() : DEFAULT_SIZE;
    if (suffix.charAt(0) !== "/") suffix = "/" + suffix;
    return STEAM_ECONOMY_BASE + icon + suffix;
  }

  function getItemIconHash(item) {
    if (!item || typeof item !== "object") return "";
    return String(item.icon_url_large || item.iconUrlLarge || "").trim();
  }

  /** Превью для страницы товара — без квадратного кадра (типичное 330×192). */
  function getSteamImageUrlProduct(iconUrl) {
    return getSteamImageUrl(iconUrl, "330x192");
  }

  function resolveItemImageUrl(item) {
    if (!item) return "";
    var steam = getSteamImageUrl(getItemIconHash(item));
    if (steam) return steam;
    return validHttpUrl(item.imageUrl || "");
  }

  function resolveItemImageUrlProduct(item) {
    if (!item) return "";
    var hash = getItemIconHash(item);
    if (hash) return getSteamImageUrlProduct(hash);
    return validHttpUrl(item.imageUrl || "");
  }

  function hasItemImage(item) {
    return !!resolveItemImageUrl(item);
  }

  function isSteamCdnImage(item) {
    return !!getSteamImageUrl(getItemIconHash(item));
  }

  function rarityMediaClass(rarity) {
    var r = String(rarity || "mythical").toLowerCase();
    if (r !== "arcana" && r !== "immortal" && r !== "mythical") r = "mythical";
    return "cs-card-media--rarity-" + r;
  }

  function placeholderEmoji(item) {
    return String((item && item.icon) || "📦").slice(0, 8);
  }

  function placeholderHtml(item, className) {
    var cls = className || "cs-card-emoji cs-item-placeholder";
    return '<span class="' + cls + '" aria-hidden="true">' + escAttr(placeholderEmoji(item)) + "</span>";
  }

  function onImgError(img) {
    if (!img || !img.parentNode) return;
    var shell = img.closest(".cs-card-img-shell, .product-img-shell");
    var itemIcon = img.getAttribute("data-fallback-icon") || "📦";
    var span = document.createElement("span");
    span.className = shell && shell.classList.contains("product-img-shell")
      ? "product-emoji cs-item-placeholder"
      : "cs-card-emoji cs-item-placeholder";
    span.setAttribute("aria-hidden", "true");
    span.textContent = itemIcon;
    if (shell) {
      shell.classList.add("is-placeholder");
      img.replaceWith(span);
    } else {
      img.replaceWith(span);
    }
  }

  w.SkinexSteamImages = {
    STEAM_ECONOMY_BASE: STEAM_ECONOMY_BASE,
    getSteamImageUrl: getSteamImageUrl,
    getSteamImageUrlProduct: getSteamImageUrlProduct,
    getItemIconHash: getItemIconHash,
    resolveItemImageUrl: resolveItemImageUrl,
    resolveItemImageUrlProduct: resolveItemImageUrlProduct,
    hasItemImage: hasItemImage,
    isSteamCdnImage: isSteamCdnImage,
    rarityMediaClass: rarityMediaClass,
    placeholderEmoji: placeholderEmoji,
    placeholderHtml: placeholderHtml,
    onImgError: onImgError,
    escAttr: escAttr,
  };

  if (w.SkinexUtils) {
    w.SkinexUtils.getSteamImageUrl = getSteamImageUrl;
    w.SkinexUtils.resolveItemImageUrl = resolveItemImageUrl;
    w.SkinexUtils.hasItemImage = hasItemImage;
  }
})(window);
