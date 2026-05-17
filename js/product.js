(function () {
  const U = window.SkinexUtils;
  const mount = document.getElementById("productMount");
  const bcTitle = document.getElementById("bcTitle");
  const metaDesc = document.getElementById("metaDesc");
  const cartCount = document.getElementById("cartCount");
  const Market = window.SkinexMarketOffers;
  const Auth = window.SkinexAuth;

  if (!U || !mount) return;

  function getCatalogList() {
    return window.SkinexCatalog ? window.SkinexCatalog.getCatalog() : window.SKINEX_CATALOG || [];
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const item = id == null ? null : getCatalogList().find((x) => String(x.id) === String(id));

  function displayPrice(it) {
    if (!it) return 0;
    const base = Number(it.price);
    if (!Market || typeof Market.getEffectivePrice !== "function") return base;
    return Market.getEffectivePrice(it.id, base);
  }

  function cartStorageKey() {
    if (Auth && typeof Auth.getCartStorageKey === "function") return Auth.getCartStorageKey();
    return "skinex_cart";
  }

  function loadCart() {
    try {
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
      if (!raw) return new Map();
      const obj = JSON.parse(raw);
      return new Map(Object.entries(obj).map(([k, v]) => [k, Number(v) || 0]));
    } catch (_) {
      return new Map();
    }
  }

  function saveCart(map) {
    try {
      localStorage.setItem(cartStorageKey(), JSON.stringify(Object.fromEntries(map)));
    } catch (_) {}
  }

  function updateCartBadge() {
    if (!cartCount) return;
    let n = 0;
    loadCart().forEach((q) => {
      if (q > 0) n += q;
    });
    cartCount.textContent = String(n);
  }

  function addToCart(itemId) {
    const map = loadCart();
    const prev = map.get(itemId) || 0;
    map.set(itemId, prev + 1);
    saveCart(map);
    updateCartBadge();
    window.dispatchEvent(new Event("skinex-cart-changed"));
    const note = document.getElementById("productCartNote");
    if (note) {
      const q = map.get(itemId) || 0;
      const it = getCatalogList().find((x) => String(x.id) === String(itemId));
      const dp = it ? displayPrice(it) : 0;
      note.textContent = `В корзине: ${q} шт. Оформление — кнопка «Корзина» в шапке; списание по лучшей цене на момент заказа (${U.formatPrice ? U.formatPrice(dp) : dp} ₽/шт. при текущем стакане).`;
    }
  }

  function buildVideoBlock() {
    const raw = String(item.videoUrl || "").trim();
    const embed = U.youtubeEmbedUrl ? U.youtubeEmbedUrl(raw) : "";
    if (embed) {
      return `<div class="product-video-wrap"><iframe class="product-video-frame" title="Видео о предмете" src=${JSON.stringify(embed)} allowfullscreen loading="lazy"></iframe></div>`;
    }
    const direct = U.validHttpUrl ? U.validHttpUrl(raw) : "";
    if (direct && /\.(mp4|webm|ogg)(\?|$)/i.test(direct)) {
      return `<div class="product-video-wrap"><video class="product-video-tag" controls src=${JSON.stringify(direct)}></video></div>`;
    }
    if (direct) {
      return `<p class="product-video-link"><a href=${JSON.stringify(direct)} target="_blank" rel="noopener noreferrer">Открыть видео</a></p>`;
    }
    return "";
  }

  function buildOrderBookHtml() {
    if (!Market || typeof Market.getVisibleOffers !== "function") return "";
    if (item && item.traderListingsAllowed === false) {
      return `<div class="product-market-block">
        <h2 class="product-subtitle">Стакан заявок</h2>
        <p class="product-market-empty">Лоты трейдеров для этого товара отключены в каталоге. Действует цена из каталога.</p>
      </div>`;
    }
    const isAdmin = Auth && typeof Auth.isAdmin === "function" && Auth.isAdmin();
    const rows = Market.getVisibleOffers(item.id);
    if (!rows.length) {
      return `<div class="product-market-block">
        <h2 class="product-subtitle">Стакан заявок</h2>
        <p class="product-market-empty">Пока нет лотов от трейдеров — действует цена из каталога.</p>
      </div>`;
    }
    const adminTh = isAdmin ? '<th class="product-market-col-admin" scope="col" aria-label="Удалить лот"></th>' : "";
    const body = rows
      .map((r) => {
        const em = String(r.traderEmail || "").trim();
        let deals = "—";
        let ratingCell = "—";
        if (Market && typeof Market.getTraderPublicStats === "function" && em) {
          const st = Market.getTraderPublicStats(em);
          deals = String(st.completedOrders);
          ratingCell =
            st.ratingCount > 0 ? `★ ${st.ratingAvg} <span class="product-market-rating-n">(${st.ratingCount})</span>` : "—";
        }
        const rid = U.escapeHtml(String(r.id || ""));
        const adminCell = isAdmin
          ? `<td class="product-market-col-admin">
              <button type="button" class="product-market-offer-del" data-offer-delete="${rid}" title="Удалить лот" aria-label="Удалить лот">🗑</button>
            </td>`
          : "";
        return `<tr>
            <td>${U.escapeHtml(r.traderDisplayName || r.traderEmail || "—")}</td>
            <td class="product-market-num">${deals}</td>
            <td class="product-market-rating">${ratingCell}</td>
            <td class="product-market-price">${U.formatPrice(r.price)}</td>
            <td>${r.qty} шт.</td>
            ${adminCell}
          </tr>`;
      })
      .join("");
    return `<div class="product-market-block${isAdmin ? " product-market-block--admin" : ""}">
      <h2 class="product-subtitle">Стакан заявок</h2>
      <p class="product-market-lead">Покупка идёт по наименьшей цене; в таблице — все активные лоты (от дешёвых к дорогим). У трейдера не больше одного лота на сет: правки через форму или снятие лота и новая заявка.</p>
      <div class="product-market-table-wrap">
        <table class="product-market-table">
          <thead><tr><th>Трейдер</th><th>Сделок</th><th>Рейтинг</th><th>Цена</th><th>Остаток</th>${adminTh}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
  }

  function buildTraderPanelHtml(eff, catalogBase) {
    const isTrader = Auth && typeof Auth.isTrader === "function" && Auth.isTrader() && Auth.isLoggedIn && Auth.isLoggedIn();
    if (!isTrader) return "";
    const listingsOff = item && item.traderListingsAllowed === false;
    const ownOffer =
      Market && typeof Market.getOwnOfferForItem === "function" ? Market.getOwnOfferForItem(item.id) : null;
    const withdrawBtn = ownOffer
      ? `<button type="button" class="btn btn-outline product-trader-withdraw" id="traderWithdrawBtn">Снять мой лот</button>`
      : "";

    if (listingsOff) {
      return `<div class="product-trader-panel">
      <h2 class="product-subtitle">Трейдер</h2>
      <p class="product-trader-lead">Для этого предмета выставление лотов отключено администратором. Покупатели видят только цену из каталога.${
        ownOffer ? " У вас остаётся ранее выставленный лот — его можно снять." : ""
      }</p>
      ${ownOffer ? `<div class="product-trader-actions">${withdrawBtn}</div>` : ""}
      <p class="product-trader-note" id="traderOfferNote" role="status" aria-live="polite"></p>
    </div>`;
    }

    const bestAsk =
      Market && typeof Market.getCurrentBestAsk === "function" ? Market.getCurrentBestAsk(item.id, catalogBase) : catalogBase;
    return `<div class="product-trader-panel">
      <h2 class="product-subtitle">Трейдер</h2>
      <p class="product-trader-lead">Один лот на этот сет: цена <strong>любая от 1 ₽</strong>, в том числе выше текущей лучшей для покупателя (<strong>${U.formatPrice(bestAsk)}</strong> — справочно). Изменить лот — кнопка ниже; полностью убрать и выставить заново — «Снять мой лот».</p>
      <div class="product-trader-actions">
        <button type="button" class="btn btn-outline product-trader-btn" id="traderBeatBtn">Выставить или изменить лот</button>
        ${withdrawBtn}
      </div>
      <p class="product-trader-note" id="traderOfferNote" role="status" aria-live="polite"></p>
    </div>
    <div class="modal" id="traderOfferModal" aria-hidden="true">
      <div class="modal-backdrop" id="traderOfferModalBackdrop" tabindex="-1"></div>
      <div class="modal-box modal-box-wide" role="dialog" aria-labelledby="traderModalTitle">
        <div class="modal-head">
          <h2 id="traderModalTitle">Лот</h2>
        </div>
        <div class="modal-body">
          <p class="modal-hint" id="traderModalHint">Сейчас для покупателя выгоднее всего: <strong id="traderModalBest">${U.formatPrice(bestAsk)}</strong> — это не ограничение для вашей цены.</p>
          <label class="field">
            <span>Ваша цена, ₽</span>
            <input type="number" id="traderPriceInput" min="1" step="1" required />
          </label>
          <label class="field">
            <span>Количество лотов</span>
            <input type="number" id="traderQtyInput" min="1" step="1" value="1" required />
          </label>
        </div>
        <div class="admin-modal-actions">
          <button type="button" class="btn btn-outline" id="traderModalCancel">Закрыть</button>
          <button type="button" class="btn-cs-cart" id="traderModalConfirm">Сохранить лот</button>
        </div>
      </div>
    </div>`;
  }

  function wireTraderModal(catalogBase) {
    const listingsOff = item && item.traderListingsAllowed === false;
    const modal = document.getElementById("traderOfferModal");
    const btn = document.getElementById("traderBeatBtn");
    const withdrawBtn = document.getElementById("traderWithdrawBtn");
    const backdrop = document.getElementById("traderOfferModalBackdrop");
    const cancel = document.getElementById("traderModalCancel");
    const confirm = document.getElementById("traderModalConfirm");
    const priceIn = document.getElementById("traderPriceInput");
    const qtyIn = document.getElementById("traderQtyInput");
    const note = document.getElementById("traderOfferNote");
    const bestEl = document.getElementById("traderModalBest");
    const modalTitle = document.getElementById("traderModalTitle");

    if (listingsOff && withdrawBtn) {
      withdrawBtn.addEventListener("click", () => {
        if (!Market || typeof Market.withdrawMyOfferForItem !== "function") return;
        if (!window.confirm("Снять ваш лот с этого товара?")) return;
        const res = Market.withdrawMyOfferForItem(item.id);
        if (note) {
          note.style.color = res.ok ? "#86d759" : "#f87171";
          note.textContent = res.ok ? "Лот снят." : res.message || "Не удалось снять лот.";
        }
        if (res.ok) renderProduct();
      });
      return;
    }

    if (!modal || !btn) return;

    function bestAsk() {
      return Market && typeof Market.getCurrentBestAsk === "function"
        ? Market.getCurrentBestAsk(item.id, catalogBase)
        : catalogBase;
    }

    function ownOffer() {
      return Market && typeof Market.getOwnOfferForItem === "function" ? Market.getOwnOfferForItem(item.id) : null;
    }

    function openModal() {
      const b = bestAsk();
      if (bestEl) bestEl.textContent = U.formatPrice(b);
      const own = ownOffer();
      if (modalTitle) modalTitle.textContent = own ? "Изменить лот" : "Новый лот";
      if (priceIn) {
        priceIn.removeAttribute("max");
        if (own && own.price > 0) {
          priceIn.value = String(own.price);
        } else {
          priceIn.value = String(Math.max(1, Math.floor(Number(catalogBase)) || 1));
        }
      }
      if (qtyIn) {
        qtyIn.value = own && own.qty > 0 ? String(own.qty) : "1";
      }
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    }

    btn.addEventListener("click", () => openModal());
    backdrop && backdrop.addEventListener("click", () => closeModal());
    cancel && cancel.addEventListener("click", () => closeModal());

    withdrawBtn &&
      withdrawBtn.addEventListener("click", () => {
        if (!Market || typeof Market.withdrawMyOfferForItem !== "function") return;
        if (!window.confirm("Снять ваш лот с этого товара? Потом можно выставить заново с любой ценой.")) return;
        const res = Market.withdrawMyOfferForItem(item.id);
        if (note) {
          note.style.color = res.ok ? "#86d759" : "#f87171";
          note.textContent = res.ok ? "Лот снят. Можно выставить новый." : res.message || "Не удалось снять лот.";
        }
        if (res.ok) renderProduct();
      });

    confirm &&
      confirm.addEventListener("click", () => {
        if (!Market || typeof Market.submitOffer !== "function") return;
        const price = Math.floor(Number(priceIn && priceIn.value));
        const qty = Math.floor(Number(qtyIn && qtyIn.value));
        const res = Market.submitOffer({
          itemId: item.id,
          catalogPrice: catalogBase,
          price,
          qty,
        });
        if (!res.ok) {
          if (note) {
            note.style.color = "#f87171";
            note.textContent = res.message || "Не удалось сохранить лот.";
          }
          return;
        }
        if (note) {
          note.style.color = "#86d759";
          note.textContent = res.updated
            ? "Лот обновлён. Стакан и цены пересчитаны."
            : "Лот выставлен. Стакан и цены обновлены.";
        }
        closeModal();
        renderProduct();
      });
  }

  function renderProduct() {
    const badgeCls = U.rarityBadgeClass(item.rarity);
    const label = U.rarityLabels[item.rarity] || item.rarity;
    const catalogBase = Number(item.price);
    const eff = displayPrice(item);
    const listPrice = Number(item.listPrice);

    document.title = `${item.name} — Skinexs`;
    if (metaDesc)
      metaDesc.setAttribute("content", `${item.name} · ${item.hero} · от ${U.formatPrice(eff)} · Skinexs`);
    if (bcTitle) bcTitle.textContent = item.name;

    const imgHref = U.validHttpUrl ? U.validHttpUrl(item.imageUrl || "") : "";
    const mediaCls = imgHref ? "product-media product-media--image" : "product-media";
    const visual = imgHref
      ? `<div class="product-img-shell"><img class="product-full-img" src=${JSON.stringify(imgHref)} alt=${JSON.stringify(item.name || "")} loading="lazy" decoding="async" /></div>`
      : `<span class="product-emoji" aria-hidden="true">${item.icon || "📦"}</span>`;

    const videoBlock = buildVideoBlock();

    let oldStrike = 0;
    if (listPrice > eff && listPrice > 0) oldStrike = listPrice;
    else if (catalogBase > eff && catalogBase > 0) oldStrike = catalogBase;

    const priceMain =
      oldStrike > eff
        ? `<div class="cs-card-price-wrap product-price-wrap"><span class="cs-card-price-old">${U.formatPrice(oldStrike)}</span><span class="product-price">${U.formatPrice(eff)}</span></div>`
        : `<span class="product-price">${U.formatPrice(eff)}</span>`;

    const orderBook = buildOrderBookHtml();
    const traderPanel = buildTraderPanelHtml(eff, catalogBase);

    const rawDesc = String(item.description || "").trim();
    const descPlaque = rawDesc
      ? `<div class="product-desc-inline">${rawDesc
          .split(/\n/)
          .map((line) => U.escapeHtml(line))
          .join("<br />")}</div>`
      : "";

    mount.innerHTML = `
      <article class="product-card">
        <div class="product-card__top">
          <div class="product-showcase">
            <span class="${badgeCls} product-showcase-badge">${U.escapeHtml(label)}</span>
            <div class="${mediaCls}">
              ${visual}
            </div>
          </div>
          <div class="product-info">
            <div class="product-info__stack">
              <div class="product-kicker">
                <span class="product-hero">${U.escapeHtml(item.hero)}</span>
              </div>
              <p class="product-type-line">Тип предмета: <strong>${U.escapeHtml(item.itemType || (window.SkinexTaxonomy && SkinexTaxonomy.defaultItemTypeFromRarity ? SkinexTaxonomy.defaultItemTypeFromRarity(item.rarity) : ""))}</strong></p>
              <h1 class="product-title">${U.escapeHtml(item.name)}</h1>
              <div class="product-price-block">
                <div class="product-price-block-main">
                  ${priceMain}
                  <span class="product-price-hint">покупка по лучшей цене из каталога и лотов трейдеров; итог фиксируется при оформлении</span>
                </div>
              </div>
              ${descPlaque}
              <p class="product-cart-note" id="productCartNote" role="status" aria-live="polite"></p>
              ${videoBlock}
            </div>
            <div class="product-info__foot">
              <button type="button" class="btn-cs-cart product-add-btn" id="productAddBtn">В корзину</button>
            </div>
          </div>
        </div>
        <div class="product-card__full">
          ${orderBook}
          ${traderPanel}
        </div>
      </article>
    `;

    const btn = document.getElementById("productAddBtn");
    if (btn) btn.addEventListener("click", () => addToCart(item.id));

    mount.querySelectorAll("[data-offer-delete]").forEach((delBtn) => {
      delBtn.addEventListener("click", () => {
        const oid = delBtn.getAttribute("data-offer-delete");
        if (!oid || !window.confirm("Удалить этот лот трейдера?")) return;
        if (!Market || typeof Market.adminRemoveOffer !== "function") return;
        const res = Market.adminRemoveOffer(oid);
        if (!res || !res.ok) {
          window.alert((res && res.message) || "Не удалось удалить лот.");
          return;
        }
        renderProduct();
      });
    });

    wireTraderModal(catalogBase);

    const q0 = loadCart().get(item.id) || 0;
    const note = document.getElementById("productCartNote");
    if (note && q0 > 0) note.textContent = `Уже в корзине: ${q0} шт.`;
  }

  function renderNotFound() {
    document.title = "Товар не найден — Skinexs";
    if (metaDesc) metaDesc.setAttribute("content", "Запрошенный лот не найден в каталоге Skinexs.");
    if (bcTitle) bcTitle.textContent = "Не найдено";
    mount.innerHTML = `
      <div class="product-error">
        <h1>Товар не найден</h1>
        <p>Проверьте ссылку или вернитесь в каталог.</p>
        <a class="btn btn-primary" href="/#catalog">В каталог</a>
      </div>
    `;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    const m = document.getElementById("traderOfferModal");
    if (m && m.classList.contains("is-open")) {
      m.classList.remove("is-open");
      m.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    }
  });

  updateCartBadge();
  if (!item) renderNotFound();
  else renderProduct();
})();
