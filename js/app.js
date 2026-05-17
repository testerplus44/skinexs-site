(function () {
  const U = window.SkinexUtils;
  const grid = document.getElementById("catalogGrid");
  const cartBtn = document.getElementById("cartBtn");
  const cartCount = document.getElementById("cartCount");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const closeCart = document.getElementById("closeCart");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const contactForm = document.getElementById("contactForm");
  const formNote = document.getElementById("formNote");
  const statLots = document.getElementById("statLots");
  const checkoutOrderBtn = document.getElementById("checkoutOrder");
  const cartCheckoutNote = document.getElementById("cartCheckoutNote");
  const cartLoginCta = document.getElementById("cartLoginCta");

  /** @type {Map<string, number>} id -> qty */
  let cart = new Map();
  let activeHeroFilter = "all";
  let activeItemTypeFilter = "all";
  let activeCollectionId = "all";
  let activeCategory = "all";
  let activeRarityFilter = "all";
  let searchQuery = "";
  let sortMode = "default";
  const catalogSearch = document.getElementById("catalogSearch");
  const catalogFound = document.getElementById("catalogFound");
  const catalogSort = document.getElementById("catalogSort");
  const catalogHero = document.getElementById("catalogHero");
  const catalogItemType = document.getElementById("catalogItemType");
  const catalogRarity = document.getElementById("catalogRarity");
  const catalogResetAll = document.getElementById("catalogResetAll");
  const collectionFilterGroup = document.getElementById("collectionFilterGroup");
  const categoryFilterGroup = document.getElementById("categoryFilterGroup");

  function formatPrice(n) {
    if (U) return U.formatPrice(n);
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  function escapeHtml(s) {
    if (U) return U.escapeHtml(s);
    const div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function productUrl(id) {
    return U ? U.productUrl(id) : "/product?id=" + encodeURIComponent(String(id));
  }

  function getCatalogList() {
    return window.SkinexCatalog ? window.SkinexCatalog.getCatalog() : window.SKINEX_CATALOG || [];
  }

  function getItem(id) {
    return getCatalogList().find((x) => String(x.id) === String(id));
  }

  function displayPriceForItem(item) {
    if (!item) return 0;
    const base = Number(item.price);
    const M = window.SkinexMarketOffers;
    if (!M || typeof M.getEffectivePrice !== "function") return base;
    return M.getEffectivePrice(item.id, base);
  }

  function cartAuthReturnUrl() {
    const path = location.pathname || "/";
    const tail = location.search + location.hash;
    if (path === "/" || path === "/index") return "/#catalog";
    return path + tail;
  }

  function cartHasCheckoutLines() {
    let any = false;
    cart.forEach((qty, id) => {
      const item = getItem(id);
      if (item && Number(qty) > 0) any = true;
    });
    return any;
  }

  function syncCartCheckoutAuth() {
    if (!checkoutOrderBtn) return;
    const Auth = window.SkinexAuth;
    const isClient = Auth && typeof Auth.isClient === "function" && Auth.isClient();
    const loggedIn = Auth && typeof Auth.isLoggedIn === "function" && Auth.isLoggedIn();
    const hasLines = cartHasCheckoutLines();
    const showCheckout = hasLines && isClient;
    const showLoginCta = hasLines && !isClient && !loggedIn;

    checkoutOrderBtn.hidden = !showCheckout;
    checkoutOrderBtn.disabled = !showCheckout;
    if (cartLoginCta) {
      cartLoginCta.hidden = !showLoginCta;
      if (showLoginCta) {
        cartLoginCta.removeAttribute("aria-hidden");
        cartLoginCta.href = "/auth?next=" + encodeURIComponent(cartAuthReturnUrl());
      } else {
        cartLoginCta.setAttribute("aria-hidden", "true");
      }
    }
  }

  function cartStorageKey() {
    const Auth = window.SkinexAuth;
    if (Auth && typeof Auth.getCartStorageKey === "function") return Auth.getCartStorageKey();
    return "skinex_cart";
  }

  function saveCart() {
    try {
      const obj = Object.fromEntries(cart);
      localStorage.setItem(cartStorageKey(), JSON.stringify(obj));
    } catch (_) {}
  }

  function loadCart() {
    try {
      const Auth = window.SkinexAuth;
      const key = cartStorageKey();
      let raw = localStorage.getItem(key);
      if (!raw && Auth && Auth.LEGACY_CART_KEY) {
        const leg = localStorage.getItem(Auth.LEGACY_CART_KEY);
        if (leg) {
          try {
            localStorage.setItem(key, leg);
            localStorage.removeItem(Auth.LEGACY_CART_KEY);
            raw = leg;
          } catch (_) {}
        }
      }
      if (!raw) return;
      const obj = JSON.parse(raw);
      cart = new Map(Object.entries(obj).map(([k, v]) => [k, Number(v) || 0]));
    } catch (_) {
      cart = new Map();
    }
  }

  function updateCartUI() {
    if (!cartDrawer) return;
    let count = 0;
    let sum = 0;
    cart.forEach((qty, id) => {
      const item = getItem(id);
      if (item && qty > 0) {
        count += qty;
        sum += displayPriceForItem(item) * qty;
      }
    });
    if (cartCount) cartCount.textContent = String(count);
    if (cartTotal) cartTotal.textContent = formatPrice(sum);

    if (cartItems) {
      if (count === 0) {
        cartItems.innerHTML = '<p class="cart-empty">Корзина пуста. Добавьте сеты из каталога.</p>';
      } else {
        cartItems.innerHTML = "";
        cart.forEach((qty, id) => {
          const item = getItem(id);
          if (!item || qty < 1) return;
          const line = document.createElement("div");
          line.className = "cart-line";
          const cartThumb =
            window.SkinexSteamImages && SkinexSteamImages.hasItemImage(item)
              ? `<img class="cart-line-thumb" src="${SkinexSteamImages.escAttr(SkinexSteamImages.resolveItemImageUrl(item))}" alt="" loading="lazy" decoding="async" data-fallback-icon="${SkinexSteamImages.escAttr(SkinexSteamImages.placeholderEmoji(item))}" onerror="SkinexSteamImages.onImgError(this)" />`
              : `<span class="cart-line-icon" aria-hidden="true">${item.icon}</span>`;
          line.innerHTML = `
            ${cartThumb}
            <div class="cart-line-info">
              <strong><a class="cart-line-title" href="${productUrl(id)}">${escapeHtml(item.name)}</a></strong>
              <span>${qty} × ${formatPrice(displayPriceForItem(item))}</span>
            </div>
            <button type="button" class="cart-line-remove" data-remove="${id}" aria-label="Удалить">×</button>
          `;
          cartItems.appendChild(line);
        });
        cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
          btn.addEventListener("click", () => {
            cart.delete(btn.getAttribute("data-remove"));
            saveCart();
            updateCartUI();
            renderCatalog();
          });
        });
      }
    }
    syncCartCheckoutAuth();
  }

  function openDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
  }

  function closeDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
  }

  function addToCart(id) {
    const prev = cart.get(id) || 0;
    cart.set(id, prev + 1);
    saveCart();
    updateCartUI();
    renderCatalog();
  }

  function changeCartQty(id, delta) {
    const prev = cart.get(id) || 0;
    const next = prev + delta;
    if (next < 1) cart.delete(id);
    else cart.set(id, next);
    saveCart();
    updateCartUI();
    renderCatalog();
  }

  function normalizeSearch(s) {
    return String(s || "")
      .trim()
      .toLowerCase();
  }

  /** URL картинки фильтра: https или data:image (из админки). */
  function sidebarFilterImageUrl(u) {
    const s = String(u || "").trim();
    if (!s) return "";
    if (s.startsWith("data:image/")) return s;
    if (U && typeof U.validHttpUrl === "function") {
      const ok = U.validHttpUrl(s);
      if (ok) return ok;
    }
    if (/^https?:\/\//i.test(s)) return s;
    return "";
  }

  function buildSidebarFilterButton(row, isActive, kind) {
    const img = sidebarFilterImageUrl(row.image);
    const b = document.createElement("button");
    b.type = "button";
    b.className =
      "catalog-side-pill" +
      (isActive ? " is-active" : "") +
      (img ? " catalog-side-pill--media" : "");
    if (kind === "collection") b.dataset.collectionId = row.id;
    else b.dataset.categoryFilter = row.id;

    if (img) {
      const safe = String(img).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      b.style.setProperty("--pill-bg", `url("${safe}")`);
      const label = document.createElement("span");
      label.className = "catalog-side-pill-label";
      label.textContent = row.name;
      b.appendChild(label);
    } else {
      b.textContent = row.name;
    }
    return b;
  }

  function parseFiltersFromUrl() {
    const cols = window.SKINEX_COLLECTIONS || [];
    const cats = window.SKINEX_CATEGORIES || [];
    const colSet = new Set(cols.map((c) => String(c.id)));
    const catSet = new Set(cats.map((c) => String(c.id)));
    const p = new URLSearchParams(location.search);
    let c = p.get("collection") || "all";
    let k = p.get("category") || "all";
    if (!colSet.has(c)) c = "all";
    if (!catSet.has(k)) k = "all";
    activeCollectionId = c;
    activeCategory = k;
  }

  function writeFiltersToUrl() {
    const p = new URLSearchParams(location.search);
    if (activeCollectionId === "all") p.delete("collection");
    else p.set("collection", activeCollectionId);
    if (activeCategory === "all") p.delete("category");
    else p.set("category", activeCategory);
    const qs = p.toString();
    const next = location.pathname + (qs ? "?" + qs : "") + location.hash;
    const cur = location.pathname + location.search + location.hash;
    if (next !== cur) history.replaceState(null, "", next);
  }

  function renderCatalogFilters() {
    const Tax = window.SkinexTaxonomy;
    const colRows = window.SKINEX_COLLECTIONS;
    const catRows = window.SKINEX_CATEGORIES;

    if (collectionFilterGroup && Array.isArray(colRows)) {
      collectionFilterGroup.innerHTML = "";
      const colByParent = new Map();
      colRows.forEach((row) => {
        if (!row || !row.parentId) return;
        const pid = String(row.parentId);
        if (!colByParent.has(pid)) colByParent.set(pid, []);
        colByParent.get(pid).push(row);
      });
      colRows.forEach((row) => {
        if (!row || row.parentId) return;
        const subs = colByParent.get(String(row.id));
        if (subs && subs.length) {
          const group = document.createElement("div");
          group.className = "catalog-side-group";
          const childActive = subs.some((s) => activeCollectionId === s.id);
          const parentBtn = buildSidebarFilterButton(row, activeCollectionId === row.id, "collection");
          if (childActive && activeCollectionId !== row.id) parentBtn.classList.add("is-parent-of-active");
          group.appendChild(parentBtn);
          const subNav = document.createElement("div");
          subNav.className = "catalog-side-sublist";
          subs.forEach((sub) => {
            const b = buildSidebarFilterButton(sub, activeCollectionId === sub.id, "collection");
            b.classList.add("catalog-side-pill--sub");
            subNav.appendChild(b);
          });
          group.appendChild(subNav);
          collectionFilterGroup.appendChild(group);
        } else {
          collectionFilterGroup.appendChild(
            buildSidebarFilterButton(row, activeCollectionId === row.id, "collection"),
          );
        }
      });
      collectionFilterGroup.querySelectorAll("[data-collection-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeCollectionId = btn.getAttribute("data-collection-id") || "all";
          writeFiltersToUrl();
          renderCatalogFilters();
          renderCatalog();
        });
      });
    }

    if (categoryFilterGroup && Array.isArray(catRows)) {
      categoryFilterGroup.innerHTML = "";
      const byParent = new Map();
      catRows.forEach((row) => {
        if (!row || !row.parentId) return;
        const pid = String(row.parentId);
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid).push(row);
      });
      catRows.forEach((row) => {
        if (!row || row.parentId) return;
        const subs = byParent.get(String(row.id));
        if (subs && subs.length) {
          const group = document.createElement("div");
          group.className = "catalog-side-group";
          const childActive = subs.some((s) => activeCategory === s.id);
          const parentBtn = buildSidebarFilterButton(row, activeCategory === row.id, "category");
          if (childActive && activeCategory !== row.id) parentBtn.classList.add("is-parent-of-active");
          group.appendChild(parentBtn);
          const subNav = document.createElement("div");
          subNav.className = "catalog-side-sublist";
          subs.forEach((sub) => {
            const b = buildSidebarFilterButton(sub, activeCategory === sub.id, "category");
            b.classList.add("catalog-side-pill--sub");
            subNav.appendChild(b);
          });
          group.appendChild(subNav);
          categoryFilterGroup.appendChild(group);
        } else {
          categoryFilterGroup.appendChild(buildSidebarFilterButton(row, activeCategory === row.id, "category"));
        }
      });
      categoryFilterGroup.querySelectorAll("[data-category-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeCategory = btn.getAttribute("data-category-filter") || "all";
          writeFiltersToUrl();
          renderCatalogFilters();
          renderCatalog();
        });
      });
    }

    if (!Tax) return;
    const { heroes, itemTypes } = Tax.getTaxonomy();

    if (catalogHero) {
      catalogHero.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = "all";
      opt0.textContent = "Все герои";
      catalogHero.appendChild(opt0);
      heroes.forEach((h) => {
        const o = document.createElement("option");
        o.value = h;
        o.textContent = h;
        catalogHero.appendChild(o);
      });
      catalogHero.value = activeHeroFilter;
    }
    if (catalogItemType) {
      catalogItemType.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value = "all";
      o0.textContent = "Все типы";
      catalogItemType.appendChild(o0);
      itemTypes.forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t;
        catalogItemType.appendChild(o);
      });
      catalogItemType.value = activeItemTypeFilter;
    }
    if (catalogRarity) catalogRarity.value = activeRarityFilter;
  }

  function getFilteredAll() {
    const q = normalizeSearch(searchQuery);
    let list = getCatalogList().slice();

    if (activeCollectionId !== "all") {
      const Meta = window.SkinexCatalogMeta;
      const colMatch =
        Meta && typeof Meta.collectionFilterMatchIds === "function"
          ? Meta.collectionFilterMatchIds(activeCollectionId)
          : null;
      if (colMatch && typeof colMatch === "object") {
        list = list.filter((x) => !!colMatch[String(x.collectionId || "general")]);
      } else {
        list = list.filter((x) => String(x.collectionId || "general") === activeCollectionId);
      }
    }
    if (activeCategory !== "all") {
      const Meta = window.SkinexCatalogMeta;
      const match =
        Meta && typeof Meta.categoryFilterMatchIds === "function"
          ? Meta.categoryFilterMatchIds(activeCategory)
          : null;
      if (match && typeof match === "object") {
        list = list.filter((x) => !!match[String(x.category || "tradeable")]);
      } else {
        list = list.filter((x) => String(x.category || "tradeable") === activeCategory);
      }
    }

    if (activeHeroFilter !== "all") {
      list = list.filter((x) => String(x.hero) === activeHeroFilter);
    }
    if (activeItemTypeFilter !== "all") {
      list = list.filter((x) => String(x.itemType || "") === activeItemTypeFilter);
    }
    if (activeRarityFilter !== "all") {
      list = list.filter((x) => String(x.rarity) === activeRarityFilter);
    }

    if (q) {
      list = list.filter((x) => {
        const hay = `${x.name} ${x.hero} ${x.itemType || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (sortMode === "price-asc") list.sort((a, b) => displayPriceForItem(a) - displayPriceForItem(b));
    else if (sortMode === "price-desc") list.sort((a, b) => displayPriceForItem(b) - displayPriceForItem(a));
    else if (sortMode === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ru"));

    return list;
  }

  function renderCatalog() {
    if (!grid) return;
    const filtered = getFilteredAll();
    const total = filtered.length;

    if (catalogFound) {
      const word =
        total % 10 === 1 && total % 100 !== 11
          ? "товар"
          : total % 10 >= 2 && total % 10 <= 4 && (total % 100 < 10 || total % 100 >= 20)
            ? "товара"
            : "товаров";
      catalogFound.textContent = `Найдено: ${total} ${word}`;
    }

    grid.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "catalog-empty";
      empty.textContent =
        "По вашему запросу ничего не найдено. Сбросьте фильтры или измените условия поиска.";
      grid.appendChild(empty);
      return;
    }

    filtered.forEach((item) => {
      const qty = cart.get(item.id) || 0;
      const badgeCls = U ? U.rarityBadgeClass(item.rarity) : "cs-badge";
      const rLabel = (U && U.rarityLabels[item.rarity]) || item.rarity;
      const pUrl = productUrl(item.id);
      const SI = window.SkinexSteamImages;
      const imgHref = SI ? SI.resolveItemImageUrl(item) : U && U.validHttpUrl ? U.validHttpUrl(item.imageUrl || "") : "";
      const isSteam = SI && SI.isSteamCdnImage(item);
      const mediaClass = imgHref
        ? "cs-card-media cs-card-media--image" + (isSteam ? " cs-card-media--steam " + SI.rarityMediaClass(item.rarity) : "")
        : "cs-card-media";
      const rarityOnImage = !imgHref
        ? `<span class="${badgeCls} cs-card-badge-rarity">${escapeHtml(rLabel)}</span>`
        : "";
      const fallbackIcon = SI ? SI.placeholderEmoji(item) : item.icon || "📦";
      const mediaInner = imgHref
        ? `<div class="cs-card-img-shell"><img class="cs-card-img cs-steam-img" src=${JSON.stringify(imgHref)} alt=${JSON.stringify(item.name || "")} loading="lazy" decoding="async" data-fallback-icon=${JSON.stringify(fallbackIcon)} onerror="SkinexSteamImages.onImgError(this)" /></div>`
        : SI
          ? SI.placeholderHtml(item)
          : `<span class="cs-card-emoji cs-item-placeholder" aria-hidden="true">${item.icon || "📦"}</span>`;
      const listPrice = Number(item.listPrice);
      const catalogBase = Number(item.price);
      const disp = displayPriceForItem(item);
      let oldStrike = 0;
      if (listPrice > disp && listPrice > 0) oldStrike = listPrice;
      else if (catalogBase > disp && catalogBase > 0) oldStrike = catalogBase;
      let discountHtml = "";
      if (listPrice > disp && listPrice > 0) {
        const pct = Math.round((1 - disp / listPrice) * 100);
        if (pct > 0 && pct < 100) {
          discountHtml = `<span class="cs-card-discount">Скидка ${pct}%</span>`;
        }
      } else if (catalogBase > disp && catalogBase > 0) {
        const pct = Math.round((1 - disp / catalogBase) * 100);
        if (pct > 0 && pct < 100) {
          discountHtml = `<span class="cs-card-discount">−${pct}%</span>`;
        }
      }
      const inCartBadge = qty > 0 ? `<span class="cs-card-in-cart">Товар в корзине</span>` : "";
      const footPrice =
        oldStrike > disp
          ? `<div class="cs-card-price-wrap"><span class="cs-card-price-old">${formatPrice(oldStrike)}</span><span class="cs-card-price">${formatPrice(disp)}</span></div>`
          : `<span class="cs-card-price">${formatPrice(disp)}</span>`;
      const stepper =
        qty > 0
          ? `<div class="cs-card-stepper" role="group" aria-label="Количество в корзине">
              <button type="button" class="cs-card-step-btn" data-qty-dec="${item.id}" aria-label="Уменьшить">−</button>
              <span class="cs-card-step-qty">${qty}</span>
              <button type="button" class="cs-card-step-btn" data-qty-inc="${item.id}" aria-label="Добавить">+</button>
            </div>`
          : `<button type="button" class="btn-cs-cart" data-add="${item.id}">В корзину</button>`;

      const card = document.createElement("article");
      card.className =
        "cs-card cs-card--v2" + (imgHref ? " cs-card--with-photo" : "") + (qty > 0 ? " is-in-cart" : "");
      card.dataset.rarity = item.rarity;
      card.innerHTML = `
        <a class="cs-card-media-link" href="${pUrl}" aria-label="Подробнее: ${escapeHtml(item.name)}">
          <div class="${mediaClass}">
            ${discountHtml}
            ${inCartBadge}
            ${rarityOnImage}
            ${mediaInner}
          </div>
        </a>
        <div class="cs-card-body cs-card-body--v2">
          <div class="cs-card-title-row">
            <h3 class="cs-card-name">
              <a class="cs-card-name-link" href="${pUrl}">${escapeHtml(item.name)}</a>
            </h3>
            <div class="cs-card-title-price">${footPrice}</div>
          </div>
          <div class="cs-card-actions">${stepper}</div>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(btn.getAttribute("data-add"));
      });
    });
    grid.querySelectorAll("[data-qty-inc]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(btn.getAttribute("data-qty-inc"));
      });
    });
    grid.querySelectorAll("[data-qty-dec]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        changeCartQty(btn.getAttribute("data-qty-dec"), -1);
      });
    });
  }

  window.addEventListener("storage", (e) => {
    if (grid) {
      if (
        e.key === "skinex_taxonomy" ||
        e.key === (window.SkinexCatalog && SkinexCatalog.STORAGE_KEY) ||
        e.key === (window.SkinexCatalogMeta && window.SkinexCatalogMeta.STORAGE_KEY)
      ) {
        if (
          e.key === (window.SkinexCatalogMeta && window.SkinexCatalogMeta.STORAGE_KEY) &&
          window.SkinexCatalogMeta &&
          typeof window.SkinexCatalogMeta.reloadFromStorage === "function"
        ) {
          window.SkinexCatalogMeta.reloadFromStorage();
        }
        renderCatalogFilters();
        renderCatalog();
      }
    }
    const AuthEv = window.SkinexAuth;
    const cartKeyList = ["skinex_cart", "skinex_cart_guest"];
    if (AuthEv && typeof AuthEv.getCartStorageKey === "function") {
      cartKeyList.push(AuthEv.getCartStorageKey());
    }
    if (AuthEv && AuthEv.LEGACY_CART_KEY) cartKeyList.push(AuthEv.LEGACY_CART_KEY);
    if (cartKeyList.indexOf(e.key) >= 0) {
      loadCart();
      updateCartUI();
      if (grid) renderCatalog();
    }
    if (e.key === "skinex_session") {
      updateCartUI();
      if (window.SkinexNavRefresh) window.SkinexNavRefresh();
    }
  });

  function resetAllCatalogFilters() {
    activeHeroFilter = "all";
    activeItemTypeFilter = "all";
    activeCollectionId = "all";
    activeCategory = "all";
    activeRarityFilter = "all";
    searchQuery = "";
    sortMode = "default";
    if (catalogSearch) catalogSearch.value = "";
    if (catalogSort) catalogSort.value = "default";
    writeFiltersToUrl();
    renderCatalogFilters();
    renderCatalog();
  }

  let searchTimer;
  if (catalogSearch) {
    catalogSearch.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = catalogSearch.value;
        renderCatalog();
      }, 160);
    });
  }

  if (catalogSort) {
    catalogSort.addEventListener("change", () => {
      sortMode = catalogSort.value || "default";
      renderCatalog();
    });
  }

  if (catalogHero) {
    catalogHero.addEventListener("change", () => {
      activeHeroFilter = catalogHero.value || "all";
      renderCatalogFilters();
      renderCatalog();
    });
  }
  if (catalogItemType) {
    catalogItemType.addEventListener("change", () => {
      activeItemTypeFilter = catalogItemType.value || "all";
      renderCatalogFilters();
      renderCatalog();
    });
  }
  if (catalogRarity) {
    catalogRarity.addEventListener("change", () => {
      activeRarityFilter = catalogRarity.value || "all";
      renderCatalog();
    });
  }

  if (catalogResetAll) {
    catalogResetAll.addEventListener("click", () => {
      resetAllCatalogFilters();
    });
  }

  if (grid) {
    window.addEventListener("popstate", () => {
      parseFiltersFromUrl();
      renderCatalogFilters();
      renderCatalog();
    });
  }

  if (cartBtn && cartDrawer) {
    cartBtn.addEventListener("click", () => {
      if (cartCheckoutNote) {
        cartCheckoutNote.textContent = "";
        cartCheckoutNote.style.color = "";
      }
      updateCartUI();
      openDrawer();
    });
  }

  if (checkoutOrderBtn) {
    checkoutOrderBtn.addEventListener("click", () => {
      if (cartCheckoutNote) {
        cartCheckoutNote.textContent = "";
        cartCheckoutNote.style.color = "";
      }
      const Auth = window.SkinexAuth;
      if (!Auth || typeof Auth.isClient !== "function" || !Auth.isClient()) {
        if (cartCheckoutNote) {
          cartCheckoutNote.style.color = "#f87171";
          cartCheckoutNote.textContent = "Войдите в аккаунт, чтобы оформить заказ.";
        }
        return;
      }
      const Acc = window.SkinexAccount;
      if (!Acc) {
        if (cartCheckoutNote) {
          cartCheckoutNote.style.color = "#f87171";
          cartCheckoutNote.textContent = "Модуль кабинета не загружен. Обновите страницу.";
        }
        return;
      }
      const res = Acc.checkoutCart(cart, getCatalogList());
      if (!res.ok) {
        if (cartCheckoutNote) {
          cartCheckoutNote.style.color = "#f87171";
          if (res.code === "auth") {
            cartCheckoutNote.textContent = res.message || "Войдите в аккаунт, чтобы оформить заказ.";
            syncCartCheckoutAuth();
          } else if (res.code === "funds" && typeof res.need === "number") {
            cartCheckoutNote.textContent =
              res.message + " Не хватает " + formatPrice(res.need) + ". Пополните баланс в личном кабинете.";
          } else if (res.code === "market") {
            cartCheckoutNote.textContent = res.message || "Лоты изменились. Обновите страницу и проверьте корзину.";
          } else {
            cartCheckoutNote.textContent = res.message || "Не удалось оформить заказ.";
          }
        }
        return;
      }
      cart = new Map();
      saveCart();
      updateCartUI();
      renderCatalog();
      if (cartCheckoutNote) {
        cartCheckoutNote.style.color = "#86d759";
        cartCheckoutNote.textContent =
          "Заказ № " +
          (res.order.orderNumber != null ? String(res.order.orderNumber) : String(res.order.id).slice(0, 8)) +
          " создан. Детали — в разделе «Активные покупки».";
      }
      const N = window.SkinexNotifications;
      if (N && typeof N.pushLocal === "function") {
        const num =
          res.order.orderNumber != null ? String(res.order.orderNumber) : String(res.order.id).slice(0, 8);
        N.pushLocal({
          kind: "order",
          title: "Заказ № " + num + " создан",
          body: "Откройте личный кабинет, чтобы отслеживать статус.",
          link: "/account",
        });
        if (window.SkinexNotificationsUI && typeof window.SkinexNotificationsUI.tryMount === "function") {
          window.SkinexNotificationsUI.tryMount();
        }
      }
      setTimeout(closeDrawer, 1100);
    });
  }
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeDrawer);
  if (closeCart) closeCart.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  if (contactForm && formNote) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      formNote.textContent = "";
      const fd = new FormData(contactForm);
      const name = String(fd.get("name") || "").trim();
      const contact = String(fd.get("contact") || "").trim();
      const message = String(fd.get("message") || "").trim();

      if (!name || !contact) {
        formNote.style.color = "#f87171";
        formNote.textContent = "Заполните имя и контакт.";
        return;
      }

      let body = `Заявка с сайта Skinexs\nИмя: ${name}\nКонтакт: ${contact}\n\n`;
      if (message) body += `${message}\n\n`;

      const sellerEmail = window.SKINEX_SELLER_EMAIL || "you@example.com";
      const mailto =
        "mailto:" +
        sellerEmail +
        "?subject=" +
        encodeURIComponent("Skinexs — заявка на сеты") +
        "&body=" +
        encodeURIComponent(body);

      formNote.style.color = "var(--green)";
      formNote.textContent =
        sellerEmail === "you@example.com"
          ? "Укажите свой email в js/data.js (переменная SKINEX_SELLER_EMAIL), затем отправьте снова."
          : "Открывается почтовый клиент с готовым письмом. Если окно не появилось, проверьте настройки браузера.";

      setTimeout(() => {
        window.location.href = mailto;
      }, 80);
    });
  }

  loadCart();
  if (grid) {
    parseFiltersFromUrl();
    if (statLots) statLots.textContent = `${getCatalogList().length}+`;
    renderCatalogFilters();
    renderCatalog();
  }
  updateCartUI();

  window.addEventListener("skinex-cart-changed", () => {
    loadCart();
    updateCartUI();
    if (grid) renderCatalog();
  });
})();
