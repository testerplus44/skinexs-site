(function () {
  var Auth = window.SkinexAdmin;
  var SkinexAuth = window.SkinexAuth;
  var Cat = window.SkinexCatalog;
  var Tax = window.SkinexTaxonomy;
  var U = window.SkinexUtils;
  if (!Auth || !Cat || !Tax) return;

  var loginBlock = document.getElementById("loginBlock");
  var panelBlock = document.getElementById("panelBlock");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var tableBody = document.getElementById("adminTableBody");
  var btnAdd = document.getElementById("btnAddItem");
  var btnReset = document.getElementById("btnResetCatalog");
  var globalNote = document.getElementById("adminGlobalNote");
  var itemModal = document.getElementById("itemModal");
  var itemForm = document.getElementById("itemForm");
  var itemModalClose = document.getElementById("itemModalClose");
  var itemModalBackdrop = document.getElementById("itemModalBackdrop");
  var itemModalCancel = document.getElementById("itemModalCancel");
  var itemFormNote = document.getElementById("itemFormNote");
  var heroTaxList = document.getElementById("heroTaxList");
  var itemTypeTaxList = document.getElementById("itemTypeTaxList");
  var heroTaxInput = document.getElementById("heroTaxInput");
  var itemTypeTaxInput = document.getElementById("itemTypeTaxInput");
  var heroTaxAdd = document.getElementById("heroTaxAdd");
  var itemTypeTaxAdd = document.getElementById("itemTypeTaxAdd");
  var btnSaveTaxonomy = document.getElementById("btnSaveTaxonomy");
  var taxonomyNote = document.getElementById("taxonomyNote");
  var tabBtnDashboard = document.getElementById("adminTabBtnDashboard");
  var tabBtnProducts = document.getElementById("adminTabBtnProducts");
  var tabBtnUsers = document.getElementById("adminTabBtnUsers");
  var tabBtnTraders = document.getElementById("adminTabBtnTraders");
  var tabBtnOrders = document.getElementById("adminTabBtnOrders");
  var tabBtnMarket = document.getElementById("adminTabBtnMarket");
  var tabBtnSite = document.getElementById("adminTabBtnSite");
  var tabBtnSteam = document.getElementById("adminTabBtnSteam");
  var tabPanelDashboard = document.getElementById("adminTabDashboard");
  var tabPanelProducts = document.getElementById("adminTabProducts");
  var tabPanelUsers = document.getElementById("adminTabUsers");
  var tabPanelTraders = document.getElementById("adminTabTraders");
  var tabPanelOrders = document.getElementById("adminTabOrders");
  var tabPanelMarket = document.getElementById("adminTabMarket");
  var tabPanelSite = document.getElementById("adminTabSite");
  var tabPanelSteam = document.getElementById("adminTabSteam");
  var adminDashBoard = document.getElementById("adminDashBoard");
  var adminDashNote = document.getElementById("adminDashNote");
  var btnExportBackup = document.getElementById("btnExportBackup");
  var adminOrdersBody = document.getElementById("adminOrdersBody");
  var adminMarketBody = document.getElementById("adminMarketBody");
  var adminMarketNote = document.getElementById("adminMarketNote");
  var adminOrdersNote = document.getElementById("adminOrdersNote");
  var adminOrderModal = document.getElementById("adminOrderModal");
  var adminOrderModalBackdrop = document.getElementById("adminOrderModalBackdrop");
  var adminOrderModalClose = document.getElementById("adminOrderModalClose");
  var adminOrderModalBody = document.getElementById("adminOrderModalBody");
  var adminOrderModalTitle = document.getElementById("adminOrderModalTitle");
  var adminSiteForm = document.getElementById("adminSiteForm");
  var adminSiteFormNote = document.getElementById("adminSiteFormNote");
  var adminSteamTopupForm = document.getElementById("adminSteamTopupForm");
  var adminSteamTopupFormNote = document.getElementById("adminSteamTopupFormNote");
  var ADMIN_TAB_STORAGE = "skinex_admin_tab";
  var TAB_KEYS = ["dashboard", "products", "filters", "users", "traders", "orders", "market", "site", "steam", "hints", "broadcast"];
  var traderAppsCache = [];
  var traderAppDetailId = null;

  var Acc = window.SkinexAccount;
  var Site = window.SkinexSiteSettings;
  var HomeBanners = window.SkinexHomeBanners;
  var Hints = window.SkinexHintsStore;
  var Meta = window.SkinexCatalogMeta;

  var tabBtnFilters = document.getElementById("adminTabBtnFilters");
  var tabPanelFilters = document.getElementById("adminTabFilters");
  var adminMetaCollectionsBody = document.getElementById("adminMetaCollectionsBody");
  var adminMetaCategoriesBody = document.getElementById("adminMetaCategoriesBody");
  var btnSaveSidebarMeta = document.getElementById("btnSaveSidebarMeta");
  var btnResetSidebarMeta = document.getElementById("btnResetSidebarMeta");
  var btnMetaAddCollection = document.getElementById("btnMetaAddCollection");
  var btnMetaAddCategory = document.getElementById("btnMetaAddCategory");
  var adminMetaNote = document.getElementById("adminMetaNote");

  var tabBtnHints = document.getElementById("adminTabBtnHints");
  var tabPanelHints = document.getElementById("adminTabHints");
  var tabBtnBroadcast = document.getElementById("adminTabBtnBroadcast");
  var tabPanelBroadcast = document.getElementById("adminTabBroadcast");
  var adminBroadcastForm = document.getElementById("adminBroadcastForm");
  var bcNote = document.getElementById("bcNote");
  var adminHintsBody = document.getElementById("adminHintsBody");
  var adminHintEditorForm = document.getElementById("adminHintEditorForm");
  var hintEditorId = document.getElementById("hintEditorId");
  var hintFieldTitle = document.getElementById("hintFieldTitle");
  var hintFieldBody = document.getElementById("hintFieldBody");
  var hintFieldSort = document.getElementById("hintFieldSort");
  var hintFieldEnabled = document.getElementById("hintFieldEnabled");
  var hintEditorReset = document.getElementById("hintEditorReset");
  var adminHintEditorNote = document.getElementById("adminHintEditorNote");
  var adminBannerForm = document.getElementById("adminBannerForm");
  var adminBannerFormNote = document.getElementById("adminBannerFormNote");
  var adminBannersBody = document.getElementById("adminBannersBody");
  var bannerEditorId = document.getElementById("bannerEditorId");
  var bannerFieldBadge = document.getElementById("bannerFieldBadge");
  var bannerFieldTitle = document.getElementById("bannerFieldTitle");
  var bannerFieldMeta = document.getElementById("bannerFieldMeta");
  var bannerFieldImageUrl = document.getElementById("bannerFieldImageUrl");
  var bannerFieldLinkHref = document.getElementById("bannerFieldLinkHref");
  var bannerFieldSort = document.getElementById("bannerFieldSort");
  var bannerFieldEnabled = document.getElementById("bannerFieldEnabled");
  var bannerFormSubmitBtn = document.getElementById("bannerFormSubmitBtn");
  var bannerFormResetBtn = document.getElementById("bannerFormResetBtn");

  function syncAdminTabButtons() {
    TAB_KEYS.forEach(function (k) {
      var btn = document.querySelector('.admin-tab[data-admin-tab="' + k + '"]');
      if (!btn) return;
      btn.disabled = false;
      btn.classList.remove("is-disabled");
      btn.removeAttribute("aria-disabled");
    });
  }

  function applyAdminTab(which) {
    if (TAB_KEYS.indexOf(which) < 0) which = "dashboard";
    var map = {
      dashboard: { btn: tabBtnDashboard, panel: tabPanelDashboard },
      products: { btn: tabBtnProducts, panel: tabPanelProducts },
      filters: { btn: tabBtnFilters, panel: tabPanelFilters },
      users: { btn: tabBtnUsers, panel: tabPanelUsers },
      traders: { btn: tabBtnTraders, panel: tabPanelTraders },
      orders: { btn: tabBtnOrders, panel: tabPanelOrders },
      market: { btn: tabBtnMarket, panel: tabPanelMarket },
      site: { btn: tabBtnSite, panel: tabPanelSite },
      steam: { btn: tabBtnSteam, panel: tabPanelSteam },
      hints: { btn: tabBtnHints, panel: tabPanelHints },
      broadcast: { btn: tabBtnBroadcast, panel: tabPanelBroadcast },
    };
    TAB_KEYS.forEach(function (k) {
      var on = k === which;
      var m = map[k];
      if (!m) return;
      if (m.btn) {
        m.btn.classList.toggle("is-active", on);
        m.btn.setAttribute("aria-selected", on ? "true" : "false");
        m.btn.tabIndex = on ? 0 : -1;
        m.btn.disabled = false;
        m.btn.classList.remove("is-disabled");
        m.btn.removeAttribute("aria-disabled");
      }
      if (m.panel) m.panel.hidden = !on;
    });
    try {
      sessionStorage.setItem(ADMIN_TAB_STORAGE, which);
    } catch (e) {}
    if (which === "users") renderUsersTable();
    if (which === "traders") renderTradersTable();
    if (which === "orders") renderOrdersTable();
    if (which === "dashboard") renderDashboard();
    if (which === "site") {
      loadSiteForm();
      loadBannersAdmin();
    }
    if (which === "steam") loadSteamTopupForm();
    if (which === "hints") renderHintsTable();
    if (which === "filters") renderSidebarMetaTables();
    if (which === "market") renderMarketTable();
    if (which === "broadcast" && bcNote) bcNote.textContent = "";
  }

  function restoreAdminTab() {
    var w = "dashboard";
    var hash = (location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (hash && TAB_KEYS.indexOf(hash) >= 0) w = hash;
    else
      try {
        var s = sessionStorage.getItem(ADMIN_TAB_STORAGE);
        if (s && TAB_KEYS.indexOf(s) >= 0) w = s;
      } catch (e) {}
    applyAdminTab(w);
  }

  tabBtnDashboard &&
    tabBtnDashboard.addEventListener("click", function () {
      applyAdminTab("dashboard");
    });
  tabBtnProducts &&
    tabBtnProducts.addEventListener("click", function () {
      applyAdminTab("products");
    });
  tabBtnUsers &&
    tabBtnUsers.addEventListener("click", function () {
      applyAdminTab("users");
    });
  tabBtnTraders &&
    tabBtnTraders.addEventListener("click", function () {
      applyAdminTab("traders");
    });
  tabBtnOrders &&
    tabBtnOrders.addEventListener("click", function () {
      applyAdminTab("orders");
    });
  tabBtnMarket &&
    tabBtnMarket.addEventListener("click", function () {
      applyAdminTab("market");
    });
  tabBtnSite &&
    tabBtnSite.addEventListener("click", function () {
      applyAdminTab("site");
    });
  tabBtnSteam &&
    tabBtnSteam.addEventListener("click", function () {
      applyAdminTab("steam");
    });
  tabBtnHints &&
    tabBtnHints.addEventListener("click", function () {
      applyAdminTab("hints");
    });
  tabBtnBroadcast &&
    tabBtnBroadcast.addEventListener("click", function () {
      applyAdminTab("broadcast");
    });

  tabBtnFilters &&
    tabBtnFilters.addEventListener("click", function () {
      applyAdminTab("filters");
    });

  var adminTabsBar = document.querySelector(".admin-tabs");
  if (adminTabsBar) {
    adminTabsBar.addEventListener("click", function (e) {
      var btn = e.target.closest(".admin-tab[data-admin-tab]");
      if (!btn || !adminTabsBar.contains(btn) || btn.disabled || btn.classList.contains("is-disabled")) return;
      var key = String(btn.getAttribute("data-admin-tab") || "").trim();
      if (TAB_KEYS.indexOf(key) >= 0) applyAdminTab(key);
    });
  }

  syncAdminTabButtons();

  /** Коллекции и категории: чтение строк с колонкой «Родитель». */
  function readMetaRowsWithParentFromTbody(tbody) {
    if (!tbody) return [];
    var out = [];
    tbody.querySelectorAll("tr").forEach(function (tr) {
      var idInp = tr.querySelector(".admin-meta-input-id");
      var nameInp = tr.querySelector(".admin-meta-input-name");
      var parSel = tr.querySelector(".admin-meta-parent-id");
      var hid = tr.querySelector(".admin-meta-input-image");
      var urlInp = tr.querySelector(".admin-meta-url");
      if (!idInp || !nameInp) return;
      var fromHid = hid ? String(hid.value || "").trim() : "";
      var fromUrl = urlInp ? String(urlInp.value || "").trim() : "";
      var image = fromHid;
      if (!image && fromUrl && /^https?:\/\//i.test(fromUrl)) image = fromUrl;
      var row = {
        id: String(idInp.value || "").trim(),
        name: String(nameInp.value || "").trim(),
      };
      if (image) row.image = image;
      if (parSel && !parSel.disabled) {
        var pv = String(parSel.value || "").trim();
        if (pv) row.parentId = pv;
      }
      out.push(row);
    });
    return out;
  }

  function syncMetaRowThumb(tr) {
    if (!tr) return;
    var hid = tr.querySelector(".admin-meta-input-image");
    var thumb = tr.querySelector(".admin-meta-thumb");
    if (!hid || !thumb) return;
    var v = String(hid.value || "").trim();
    if (v) {
      thumb.src = v;
      thumb.removeAttribute("hidden");
    } else {
      thumb.removeAttribute("src");
      thumb.setAttribute("hidden", "true");
    }
  }

  function onMetaImageFileChange(ev) {
    var t = ev.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains("admin-meta-file")) return;
    var tr = t.closest("tr");
    if (!tr) return;
    var hid = tr.querySelector(".admin-meta-input-image");
    var urlEl = tr.querySelector(".admin-meta-url");
    var f = t.files && t.files[0];
    if (!f || !hid) return;
    var maxBytes = 280 * 1024;
    if (f.size > maxBytes) {
      if (adminMetaNote) {
        adminMetaNote.style.color = "#f87171";
        adminMetaNote.textContent = "Файл больше ~280 KB — сожмите изображение или укажите ссылку https://";
      }
      t.value = "";
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      var res = String(fr.result || "");
      if (res.length > 420000) {
        if (adminMetaNote) {
          adminMetaNote.style.color = "#f87171";
          adminMetaNote.textContent = "Картинка слишком большая для сохранения в браузере.";
        }
        t.value = "";
        return;
      }
      hid.value = res;
      if (urlEl) urlEl.value = "";
      syncMetaRowThumb(tr);
      t.value = "";
      if (adminMetaNote) {
        adminMetaNote.textContent = "";
        adminMetaNote.style.color = "";
      }
    };
    fr.readAsDataURL(f);
  }

  function onMetaUrlInput(ev) {
    var t = ev.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains("admin-meta-url")) return;
    var tr = t.closest("tr");
    if (!tr) return;
    var hid = tr.querySelector(".admin-meta-input-image");
    if (!hid) return;
    var u = String(t.value || "").trim();
    if (u && /^https?:\/\//i.test(u)) {
      hid.value = u;
      syncMetaRowThumb(tr);
    }
  }

  /** Строка таблицы «Фильтры витрины» с колонкой родитель (коллекции и категории). */
  function createMetaRowWithParentTr(item, allRows) {
    var rows = Array.isArray(allRows) ? allRows : [];
    var selfId = String(item.id || "").trim();
    var tr = document.createElement("tr");
    var td0 = document.createElement("td");
    var inpId = document.createElement("input");
    inpId.type = "text";
    inpId.className = "admin-meta-input-id";
    inpId.value = item.id || "";
    inpId.setAttribute("spellcheck", "false");
    inpId.setAttribute("autocomplete", "off");
    if (String(item.id) === "all") {
      inpId.disabled = true;
      inpId.title = "Зарезервированный ID";
    }
    td0.appendChild(inpId);

    var td1 = document.createElement("td");
    var inpName = document.createElement("input");
    inpName.type = "text";
    inpName.className = "admin-meta-input-name";
    inpName.value = item.name || "";
    inpName.maxLength = 200;
    td1.appendChild(inpName);

    var tdPar = document.createElement("td");
    tdPar.className = "admin-meta-parent-cell";
    var selPar = document.createElement("select");
    selPar.className = "admin-meta-parent-id";
    selPar.title = "Родитель верхнего уровня для вложенного списка на витрине (необязательно)";
    if (String(item.id) === "all") {
      selPar.disabled = true;
      var oa = document.createElement("option");
      oa.value = "";
      oa.textContent = "—";
      selPar.appendChild(oa);
    } else {
      var opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "— нет (верхний уровень) —";
      selPar.appendChild(opt0);
      rows.forEach(function (r) {
        if (!r || !r.id || r.id === "all" || r.id === selfId) return;
        if (r.parentId) return;
        var o = document.createElement("option");
        o.value = r.id;
        o.textContent = r.name || r.id;
        selPar.appendChild(o);
      });
      var want = String(item.parentId || "").trim();
      if (want) selPar.value = want;
    }
    tdPar.appendChild(selPar);

    var tdImg = document.createElement("td");
    tdImg.className = "admin-meta-img-cell";
    var hidImg = document.createElement("input");
    hidImg.type = "hidden";
    hidImg.className = "admin-meta-input-image";
    hidImg.value = item.image || "";
    var thumbWrap = document.createElement("div");
    thumbWrap.className = "admin-meta-thumb-wrap";
    var thumb = document.createElement("img");
    thumb.className = "admin-meta-thumb";
    thumb.alt = "";
    if (item.image) {
      thumb.src = item.image;
    } else {
      thumb.setAttribute("hidden", "true");
    }
    thumbWrap.appendChild(thumb);
    var fileInp = document.createElement("input");
    fileInp.type = "file";
    fileInp.accept = "image/png,image/jpeg,image/webp,image/gif,image/avif";
    fileInp.className = "admin-meta-file";
    fileInp.title = "Картинка для витрины (до ~280 KB)";
    var urlInp = document.createElement("input");
    urlInp.type = "url";
    urlInp.className = "admin-meta-url";
    urlInp.placeholder = "https://…";
    if (item.image && /^https?:\/\//i.test(String(item.image))) urlInp.value = item.image;
    var bClrImg = document.createElement("button");
    bClrImg.type = "button";
    bClrImg.className = "btn btn-outline btn-sm";
    bClrImg.textContent = "Убрать";
    bClrImg.setAttribute("data-meta-clear-img", "1");
    tdImg.appendChild(hidImg);
    tdImg.appendChild(thumbWrap);
    tdImg.appendChild(fileInp);
    tdImg.appendChild(urlInp);

    var td2 = document.createElement("td");
    td2.className = "admin-meta-actions";
    var bUp = document.createElement("button");
    bUp.type = "button";
    bUp.className = "btn btn-outline btn-sm";
    bUp.textContent = "↑";
    bUp.setAttribute("data-meta-move", "up");
    var bDown = document.createElement("button");
    bDown.type = "button";
    bDown.className = "btn btn-outline btn-sm";
    bDown.textContent = "↓";
    bDown.setAttribute("data-meta-move", "down");
    var bDel = document.createElement("button");
    bDel.type = "button";
    bDel.className = "btn btn-outline btn-sm";
    bDel.textContent = "Удалить";
    bDel.setAttribute("data-meta-del", "1");
    if (String(item.id) === "all") {
      bDel.disabled = true;
    }
    td2.appendChild(bUp);
    td2.appendChild(document.createTextNode(" "));
    td2.appendChild(bDown);
    td2.appendChild(document.createTextNode(" "));
    td2.appendChild(bClrImg);
    td2.appendChild(document.createTextNode(" "));
    td2.appendChild(bDel);
    tr.appendChild(td0);
    tr.appendChild(td1);
    tr.appendChild(tdPar);
    tr.appendChild(tdImg);
    tr.appendChild(td2);
    return tr;
  }

  function renderSidebarMetaTables() {
    if (!Meta || !adminMetaCollectionsBody || !adminMetaCategoriesBody) return;
    var cols = Meta.getCollections();
    var cats = Meta.getCategories();
    adminMetaCollectionsBody.innerHTML = "";
    adminMetaCategoriesBody.innerHTML = "";
    cols.forEach(function (it) {
      adminMetaCollectionsBody.appendChild(createMetaRowWithParentTr(it, cols));
    });
    cats.forEach(function (it) {
      adminMetaCategoriesBody.appendChild(createMetaRowWithParentTr(it, cats));
    });
  }

  function metaSwapRow(tbody, tr, delta) {
    var rows = Array.from(tbody.querySelectorAll("tr"));
    var i = rows.indexOf(tr);
    if (i < 0) return;
    var j = i + delta;
    if (j < 0 || j >= rows.length) return;
    var list = readMetaRowsWithParentFromTbody(tbody);
    var t = list[i];
    list[i] = list[j];
    list[j] = t;
    tbody.innerHTML = "";
    list.forEach(function (it) {
      tbody.appendChild(createMetaRowWithParentTr(it, list));
    });
  }

  function bindMetaTableActions(tbody) {
    if (!tbody) return;
    tbody.addEventListener(
      "click",
      function (ev) {
        var t = ev.target;
        if (!(t instanceof HTMLElement)) return;
        var tr = t.closest("tr");
        if (!tr || tr.closest("tbody") !== tbody) return;
        var move = t.getAttribute("data-meta-move");
        if (move === "up") {
          ev.preventDefault();
          metaSwapRow(tbody, tr, -1);
          return;
        }
        if (move === "down") {
          ev.preventDefault();
          metaSwapRow(tbody, tr, 1);
          return;
        }
        if (t.getAttribute("data-meta-clear-img")) {
          ev.preventDefault();
          var hid = tr.querySelector(".admin-meta-input-image");
          var urlEl = tr.querySelector(".admin-meta-url");
          var fi = tr.querySelector(".admin-meta-file");
          if (hid) hid.value = "";
          if (urlEl) urlEl.value = "";
          if (fi) fi.value = "";
          syncMetaRowThumb(tr);
          return;
        }
        if (t.getAttribute("data-meta-del")) {
          ev.preventDefault();
          var idInp = tr.querySelector(".admin-meta-input-id");
          if (idInp && String(idInp.value).trim() === "all") return;
          if (!confirm("Удалить эту строку?")) return;
          tr.remove();
        }
      },
      false
    );
  }

  bindMetaTableActions(adminMetaCollectionsBody);
  bindMetaTableActions(adminMetaCategoriesBody);

  if (adminMetaCollectionsBody) {
    adminMetaCollectionsBody.addEventListener("change", onMetaImageFileChange);
    adminMetaCollectionsBody.addEventListener("change", onMetaUrlInput);
    adminMetaCollectionsBody.addEventListener("blur", onMetaUrlInput, true);
  }
  if (adminMetaCategoriesBody) {
    adminMetaCategoriesBody.addEventListener("change", onMetaImageFileChange);
    adminMetaCategoriesBody.addEventListener("change", onMetaUrlInput);
    adminMetaCategoriesBody.addEventListener("blur", onMetaUrlInput, true);
  }

  btnMetaAddCollection &&
    btnMetaAddCollection.addEventListener("click", function () {
      if (!adminMetaCollectionsBody) return;
      var nid = "item-" + String(Date.now()).slice(-8);
      var snap = readMetaRowsWithParentFromTbody(adminMetaCollectionsBody);
      snap.push({ id: nid, name: "Новая коллекция" });
      adminMetaCollectionsBody.appendChild(createMetaRowWithParentTr(snap[snap.length - 1], snap));
    });

  btnMetaAddCategory &&
    btnMetaAddCategory.addEventListener("click", function () {
      if (!adminMetaCategoriesBody) return;
      var nid = "item-" + String(Date.now()).slice(-8);
      var snap = readMetaRowsWithParentFromTbody(adminMetaCategoriesBody);
      snap.push({ id: nid, name: "Новая категория" });
      adminMetaCategoriesBody.appendChild(createMetaRowWithParentTr(snap[snap.length - 1], snap));
    });

  btnSaveSidebarMeta &&
    btnSaveSidebarMeta.addEventListener("click", function () {
      if (!Auth.isLoggedIn() || !Meta) return;
      if (adminMetaNote) {
        adminMetaNote.textContent = "";
        adminMetaNote.style.color = "";
      }
      try {
        Meta.save({
          collections: readMetaRowsWithParentFromTbody(adminMetaCollectionsBody),
          categories: readMetaRowsWithParentFromTbody(adminMetaCategoriesBody),
        });
        renderSidebarMetaTables();
        renderDashboard();
        if (adminMetaNote) {
          adminMetaNote.style.color = "#86d759";
          adminMetaNote.textContent = "Сохранено. Обновите главную страницу каталога.";
        }
      } catch (err) {
        if (adminMetaNote) {
          adminMetaNote.style.color = "#f87171";
          adminMetaNote.textContent = err.message || "Ошибка сохранения.";
        }
      }
    });

  btnResetSidebarMeta &&
    btnResetSidebarMeta.addEventListener("click", function () {
      if (!Auth.isLoggedIn() || !Meta) return;
      if (!confirm("Вернуть списки фильтров к значениям из кода (как после установки)?")) return;
      if (adminMetaNote) {
        adminMetaNote.textContent = "";
        adminMetaNote.style.color = "";
      }
      Meta.reset();
      renderSidebarMetaTables();
      if (adminMetaNote) {
        adminMetaNote.style.color = "#fbbf24";
        adminMetaNote.textContent = "Сброшено. Обновите главную.";
      }
      renderDashboard();
    });

  function resetHintForm() {
    if (hintEditorId) hintEditorId.value = "";
    if (hintFieldTitle) hintFieldTitle.value = "";
    if (hintFieldBody) hintFieldBody.value = "";
    if (hintFieldSort) hintFieldSort.value = "0";
    if (hintFieldEnabled) hintFieldEnabled.checked = true;
    if (adminHintEditorNote) {
      adminHintEditorNote.textContent = "";
      adminHintEditorNote.style.color = "";
    }
  }

  function fillHintForm(h) {
    if (!h) return resetHintForm();
    if (hintEditorId) hintEditorId.value = h.id || "";
    if (hintFieldTitle) hintFieldTitle.value = h.title || "";
    if (hintFieldBody) hintFieldBody.value = h.body || "";
    if (hintFieldSort) hintFieldSort.value = String(h.sort != null ? h.sort : 0);
    if (hintFieldEnabled) hintFieldEnabled.checked = h.enabled !== false;
    if (adminHintEditorNote) {
      adminHintEditorNote.textContent = "";
      adminHintEditorNote.style.color = "";
    }
  }

  function renderHintsTable() {
    if (!adminHintsBody || !Hints) return;
    var list = Hints.getHints().slice();
    list.sort(function (a, b) {
      if (a.sort !== b.sort) return a.sort - b.sort;
      return (a.title || "").localeCompare(b.title || "", "ru");
    });
    if (!list.length) {
      adminHintsBody.innerHTML =
        '<tr><td colspan="4" class="admin-table-empty">Пунктов FAQ пока нет — заполните форму выше и нажмите «Сохранить».</td></tr>';
      return;
    }
    adminHintsBody.innerHTML = "";
    list.forEach(function (h) {
      var tr = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.textContent = String(h.sort != null ? h.sort : 0);
      var td1 = document.createElement("td");
      td1.textContent = h.title || "—";
      var td2 = document.createElement("td");
      td2.textContent = h.enabled !== false ? "Да" : "Нет";
      var td3 = document.createElement("td");
      td3.className = "admin-table-actions";
      var b1 = document.createElement("button");
      b1.type = "button";
      b1.className = "btn btn-outline btn-sm";
      b1.textContent = "Изменить";
      b1.setAttribute("data-hint-edit", h.id);
      var b2 = document.createElement("button");
      b2.type = "button";
      b2.className = "btn btn-outline btn-sm";
      b2.textContent = "Удалить";
      b2.setAttribute("data-hint-del", h.id);
      td3.appendChild(b1);
      td3.appendChild(document.createTextNode(" "));
      td3.appendChild(b2);
      tr.appendChild(td0);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      adminHintsBody.appendChild(tr);
    });
  }

  adminHintsBody &&
    adminHintsBody.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!Hints || !(t instanceof HTMLElement)) return;
      var editId = t.getAttribute("data-hint-edit");
      if (editId) {
        var found = Hints.getHints().find(function (x) {
          return String(x.id) === String(editId);
        });
        if (found) {
          fillHintForm(found);
          if (hintFieldTitle) hintFieldTitle.focus();
        }
        return;
      }
      var delId = t.getAttribute("data-hint-del");
      if (delId) {
        if (!confirm("Удалить этот пункт FAQ?")) return;
        Hints.removeHint(delId);
        resetHintForm();
        renderHintsTable();
        if (adminHintEditorNote) {
          adminHintEditorNote.style.color = "#fbbf24";
          adminHintEditorNote.textContent = "Удалено.";
        }
      }
    });

  hintEditorReset &&
    hintEditorReset.addEventListener("click", function () {
      resetHintForm();
    });

  adminHintEditorForm &&
    adminHintEditorForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!Hints) return;
      if (adminHintEditorNote) {
        adminHintEditorNote.textContent = "";
        adminHintEditorNote.style.color = "";
      }
      var title = hintFieldTitle ? String(hintFieldTitle.value || "").trim() : "";
      var body = hintFieldBody ? String(hintFieldBody.value || "").trim() : "";
      if (!title || !body) {
        if (adminHintEditorNote) {
          adminHintEditorNote.style.color = "#f87171";
          adminHintEditorNote.textContent = "Укажите заголовок и текст.";
        }
        return;
      }
      var sort = hintFieldSort ? parseInt(String(hintFieldSort.value || "0"), 10) : 0;
      if (!isFinite(sort)) sort = 0;
      var enabled = !!(hintFieldEnabled && hintFieldEnabled.checked);
      var id = hintEditorId ? String(hintEditorId.value || "").trim() : "";
      if (id) {
        Hints.updateHint(id, { title: title, body: body, sort: sort, enabled: enabled });
        if (adminHintEditorNote) {
          adminHintEditorNote.style.color = "#86d759";
          adminHintEditorNote.textContent = "Пункт обновлён.";
        }
      } else {
        Hints.addHint({ title: title, body: body, sort: sort, enabled: enabled });
        if (adminHintEditorNote) {
          adminHintEditorNote.style.color = "#86d759";
          adminHintEditorNote.textContent = "Пункт добавлен.";
        }
      }
      resetHintForm();
      renderHintsTable();
    });

  adminBroadcastForm &&
    adminBroadcastForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var titleEl = document.getElementById("bcTitle");
      var bodyEl = document.getElementById("bcBody");
      var linkEl = document.getElementById("bcLink");
      var title = titleEl ? String(titleEl.value || "").trim() : "";
      var body = bodyEl ? String(bodyEl.value || "").trim() : "";
      var link = linkEl ? String(linkEl.value || "").trim() : "";
      var bcAllEl = document.getElementById("bcAll");
      var all = !!(bcAllEl && bcAllEl.checked);
      var roles = [];
      if (!all) {
        var wrap = document.getElementById("bcRolesWrap");
        if (wrap) {
          wrap.querySelectorAll('input[name="bcRole"]:checked').forEach(function (cb) {
            roles.push(String(cb.value || "").toLowerCase());
          });
        }
      }
      if (!all && !roles.length) {
        if (bcNote) {
          bcNote.style.color = "#f87171";
          bcNote.textContent = "Выберите роли или «Все зарегистрированные».";
        }
        return;
      }
      var Notif = window.SkinexNotifications;
      if (window.SKINEX_USE_SERVER_API && typeof fetch === "function") {
        var base = window.SKINEX_API_BASE != null ? String(window.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
        var path = base + "/api/v1/admin/broadcast";
        fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: title,
            body: body,
            link: link || null,
            all: all,
            roles: roles,
          }),
        })
          .then(function (res) {
            return res.json().then(function (data) {
              if (!res.ok || !data.ok) throw new Error((data && data.message) || "Ошибка");
              if (bcNote) {
                bcNote.style.color = "#86d759";
                bcNote.textContent = "Отправлено уведомлений: " + (data.sent != null ? data.sent : "?");
              }
            });
          })
          .catch(function (err) {
            if (bcNote) {
              bcNote.style.color = "#f87171";
              bcNote.textContent = err.message || "Ошибка сети.";
            }
          });
        return;
      }
      if (!Notif || typeof Notif.sendBroadcastLocal !== "function") {
        if (bcNote) {
          bcNote.style.color = "#f87171";
          bcNote.textContent = "Модуль уведомлений не загружен.";
        }
        return;
      }
      var payload = { title: title, body: body, link: link };
      payload.roles = all ? ["all"] : roles;
      var r = Notif.sendBroadcastLocal(payload);
      if (bcNote) {
        bcNote.style.color = r.ok ? "#86d759" : "#f87171";
        bcNote.textContent = r.ok
          ? "В очередь: " + (r.queued != null ? r.queued : 0) + " (доставка при входе пользователя)."
          : r.message || "Ошибка.";
      }
    });

  function formatPrice(n) {
    return U ? U.formatPrice(n) : String(n);
  }

  function escapeHtml(s) {
    return U ? U.escapeHtml(s) : String(s);
  }

  function renderMarketTable() {
    if (!adminMarketBody) return;
    var Mo = window.SkinexMarketOffers;
    if (!Mo || typeof Mo.listAllOffers !== "function") {
      adminMarketBody.innerHTML = '<tr><td colspan="9">Модуль рынка не подключён.</td></tr>';
      return;
    }
    var rows = Mo.listAllOffers();
    rows.sort(function (a, b) {
      if (String(a.itemId) !== String(b.itemId)) return String(a.itemId).localeCompare(String(b.itemId));
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    if (!rows.length) {
      adminMarketBody.innerHTML = '<tr><td colspan="9">Лотов пока нет.</td></tr>';
      if (adminMarketNote) adminMarketNote.textContent = "";
      return;
    }
    var cat = Cat.getCatalog();
    function itemName(id) {
      for (var i = 0; i < cat.length; i++) {
        if (String(cat[i].id) === String(id)) return cat[i].name || id;
      }
      return id;
    }
    adminMarketBody.innerHTML = "";
    rows.forEach(function (o) {
      var tr = document.createElement("tr");
      var tdName = document.createElement("td");
      tdName.textContent = itemName(o.itemId);
      var tdId = document.createElement("td");
      tdId.textContent = String(o.itemId);
      var tdTr = document.createElement("td");
      tdTr.textContent = o.traderDisplayName || o.traderEmail || "—";
      var tdDeals = document.createElement("td");
      var tdRate = document.createElement("td");
      if (Mo.getTraderPublicStats && o.traderEmail) {
        var st = Mo.getTraderPublicStats(o.traderEmail);
        tdDeals.textContent = String(st.completedOrders);
        tdRate.textContent =
          st.ratingCount > 0 ? "★ " + String(st.ratingAvg) + " (" + String(st.ratingCount) + ")" : "—";
      } else {
        tdDeals.textContent = "—";
        tdRate.textContent = "—";
      }
      var tdPrice = document.createElement("td");
      tdPrice.textContent = formatPrice(o.price);
      var tdQty = document.createElement("td");
      tdQty.textContent = String(o.qty) + " шт.";
      var tdHi = document.createElement("td");
      tdHi.textContent = o.hidden ? "да" : "нет";
      var tdAct = document.createElement("td");
      var wrap = document.createElement("div");
      wrap.className = "admin-order-actions";
      if (!o.hidden) {
        var bHide = document.createElement("button");
        bHide.type = "button";
        bHide.className = "btn btn-outline btn-sm";
        bHide.textContent = "Скрыть с витрины";
        bHide.addEventListener("click", function () {
          Mo.adminSetHidden(o.id, true);
          if (adminMarketNote) {
            adminMarketNote.style.color = "#fbbf24";
            adminMarketNote.textContent = "Лот скрыт со страницы товара.";
          }
          renderMarketTable();
        });
        wrap.appendChild(bHide);
      } else {
        var bShow = document.createElement("button");
        bShow.type = "button";
        bShow.className = "btn btn-outline btn-sm";
        bShow.textContent = "Вернуть";
        bShow.addEventListener("click", function () {
          Mo.adminSetHidden(o.id, false);
          renderMarketTable();
        });
        wrap.appendChild(bShow);
      }
      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn-outline btn-sm";
      bDel.textContent = "Удалить";
      bDel.addEventListener("click", function () {
        if (!confirm("Удалить лот безвозвратно?")) return;
        Mo.adminRemoveOffer(o.id);
        if (adminMarketNote) {
          adminMarketNote.style.color = "#fbbf24";
          adminMarketNote.textContent = "Лот удалён.";
        }
        renderMarketTable();
      });
      wrap.appendChild(bDel);
      tdAct.appendChild(wrap);
      tr.appendChild(tdName);
      tr.appendChild(tdId);
      tr.appendChild(tdTr);
      tr.appendChild(tdDeals);
      tr.appendChild(tdRate);
      tr.appendChild(tdPrice);
      tr.appendChild(tdQty);
      tr.appendChild(tdHi);
      tr.appendChild(tdAct);
      adminMarketBody.appendChild(tr);
    });
    if (adminMarketNote) adminMarketNote.textContent = "";
  }

  function validHttp(s) {
    return U && U.validHttpUrl ? U.validHttpUrl(s) : "";
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return String(Date.now()) + "-" + String(Math.random()).slice(2, 9);
  }

  function renderTaxonomyLists() {
    if (!heroTaxList || !itemTypeTaxList) return;
    var t = Tax.getTaxonomy();
    heroTaxList.innerHTML = "";
    itemTypeTaxList.innerHTML = "";

    function appendLi(ul, label) {
      var li = document.createElement("li");
      li.className = "admin-taxonomy-li";
      var span = document.createElement("span");
      span.textContent = label;
      li.appendChild(span);
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "admin-tax-remove";
      rm.setAttribute("aria-label", "Удалить из списка");
      rm.textContent = "×";
      rm.addEventListener("click", function () {
        li.remove();
      });
      li.appendChild(rm);
      ul.appendChild(li);
    }

    t.heroes.forEach(function (h) {
      appendLi(heroTaxList, h);
    });
    t.itemTypes.forEach(function (x) {
      appendLi(itemTypeTaxList, x);
    });
  }

  function collectTaxonomyFromDom() {
    function vals(ul) {
      if (!ul) return [];
      return Array.from(ul.querySelectorAll("li span:first-child")).map(function (sp) {
        return String(sp.textContent || "").trim();
      }).filter(Boolean);
    }
    return {
      heroes: vals(heroTaxList),
      itemTypes: vals(itemTypeTaxList),
    };
  }

  function fillTaxonomySelects(selectedHero, selectedItemType) {
    var sh = document.getElementById("fieldHeroSelect");
    var si = document.getElementById("fieldItemTypeSelect");
    if (!sh || !si) return;
    var t = Tax.getTaxonomy();
    sh.innerHTML = "";
    si.innerHTML = "";
    t.heroes.forEach(function (h) {
      var o = document.createElement("option");
      o.value = h;
      o.textContent = h;
      sh.appendChild(o);
    });
    t.itemTypes.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x;
      o.textContent = x;
      si.appendChild(o);
    });

    function ensureOption(select, val) {
      if (!val) return;
      var ok = Array.from(select.options).some(function (o) {
        return o.value === val;
      });
      if (!ok) {
        var o = document.createElement("option");
        o.value = val;
        o.textContent = val + " (из карточки)";
        select.appendChild(o);
      }
      select.value = val;
    }

    ensureOption(sh, selectedHero || (t.heroes[0] || ""));
    ensureOption(si, selectedItemType || (t.itemTypes[0] || ""));
  }

  function fillCatalogMetaSelects(collectionVal, categoryVal) {
    var sc = document.getElementById("fieldCollectionSelect");
    var sk = document.getElementById("fieldCategorySelect");
    if (!sc || !sk) return;
    var cols = window.SKINEX_COLLECTIONS && window.SKINEX_COLLECTIONS.length ? window.SKINEX_COLLECTIONS : [];
    var cats = window.SKINEX_CATEGORIES && window.SKINEX_CATEGORIES.length ? window.SKINEX_CATEGORIES : [];
    sc.innerHTML = "";
    cols.forEach(function (c) {
      if (!c || c.id === "all" || c.parentId) return;
      var children = cols.filter(function (x) {
        return x && x.parentId === c.id;
      });
      if (children.length) {
        var ogc = document.createElement("optgroup");
        ogc.label = c.name || c.id;
        var oRootC = document.createElement("option");
        oRootC.value = c.id;
        oRootC.textContent = (c.name || c.id) + " — вся группа";
        ogc.appendChild(oRootC);
        children.forEach(function (ch) {
          var o2c = document.createElement("option");
          o2c.value = ch.id;
          o2c.textContent = ch.name || ch.id;
          ogc.appendChild(o2c);
        });
        sc.appendChild(ogc);
      } else {
        var oc = document.createElement("option");
        oc.value = c.id;
        oc.textContent = c.name || c.id;
        sc.appendChild(oc);
      }
    });
    sk.innerHTML = "";
    cats.forEach(function (c) {
      if (!c || c.id === "all" || c.parentId) return;
      var children = cats.filter(function (x) {
        return x && x.parentId === c.id;
      });
      if (children.length) {
        var og = document.createElement("optgroup");
        og.label = c.name || c.id;
        var oRoot = document.createElement("option");
        oRoot.value = c.id;
        oRoot.textContent = (c.name || c.id) + " — вся группа";
        og.appendChild(oRoot);
        children.forEach(function (ch) {
          var o2 = document.createElement("option");
          o2.value = ch.id;
          o2.textContent = ch.name || ch.id;
          og.appendChild(o2);
        });
        sk.appendChild(og);
      } else {
        var o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.name || c.id;
        sk.appendChild(o);
      }
    });
    function ensureOptionMeta(select, val, suffix) {
      var v = String(val || "").trim();
      if (!v) return;
      var ok = Array.from(select.options).some(function (o) {
        return o.value === v;
      });
      if (!ok) {
        var o = document.createElement("option");
        o.value = v;
        o.textContent = v + (suffix || "");
        select.appendChild(o);
      }
      select.value = v;
    }
    var colV = String(collectionVal || "general").trim() || "general";
    var catV = String(categoryVal || "tradeable").trim() || "tradeable";
    ensureOptionMeta(sc, colV, " (из карточки)");
    ensureOptionMeta(sk, catV, " (из карточки)");
  }

  function renderUsersTable() {
    var tbody = document.getElementById("adminUsersBody");
    var note = document.getElementById("adminUsersNote");
    if (!tbody || !SkinexAuth || typeof SkinexAuth.listClientAccounts !== "function") return;
    if (note) {
      note.textContent = "";
      note.style.color = "";
    }
    function paintRows(rows) {
    tbody.innerHTML = "";
    if (!rows.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 3;
      td0.textContent = "Нет зарегистрированных пользователей.";
      td0.style.color = "var(--cs-muted, #a1a8ce)";
      tr0.appendChild(td0);
      tbody.appendChild(tr0);
      return;
    }
    var labels = { user: "Пользователь", manager: "Менеджер", trader: "Трейдер" };
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      var tdEmail = document.createElement("td");
      tdEmail.textContent = row.email || "";
      if (row.steamId) {
        var sm = document.createElement("span");
        sm.className = "admin-user-steam-mark";
        sm.textContent = " · Steam " + row.steamId;
        tdEmail.appendChild(sm);
      }
      var tdName = document.createElement("td");
      tdName.textContent = row.displayName || "—";
      var tdRole = document.createElement("td");
      var sel = document.createElement("select");
      sel.className = "admin-user-role-select";
      sel.setAttribute("aria-label", "Роль: " + (row.email || ""));
      ["user", "manager", "trader"].forEach(function (rv) {
        var o = document.createElement("option");
        o.value = rv;
        o.textContent = labels[rv] || rv;
        sel.appendChild(o);
      });
      sel.value = row.role;
      sel.addEventListener("change", function () {
        var prev = row.role;
        SkinexAuth.setAccountRole(row.id, sel.value).then(function (r) {
        if (r.ok) {
          row.role = sel.value;
          if (note) {
            note.style.color = "#86d759";
            note.textContent = "Роль обновлена: " + (row.email || "") + " → " + (labels[sel.value] || sel.value) + ".";
          }
          if (window.SkinexNavRefresh) window.SkinexNavRefresh();
        } else {
          sel.value = prev;
          if (note) {
            note.style.color = "#f87171";
            note.textContent = r.message || "Не удалось сохранить.";
          }
        }
        });
      });
      tdRole.appendChild(sel);
      tr.appendChild(tdEmail);
      tr.appendChild(tdName);
      tr.appendChild(tdRole);
      tbody.appendChild(tr);
    });
    }

    if (window.SKINEX_USE_SERVER_API && SkinexAuth.listClientAccountsFromServer) {
      SkinexAuth.listClientAccountsFromServer().then(paintRows);
      return;
    }
    paintRows(SkinexAuth.listClientAccounts());
  }

  function formatWhen(ts) {
    if (!ts) return "—";
    try {
      return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
    } catch (e) {
      return String(ts);
    }
  }

  var traderAppModal = document.getElementById("traderAppModal");
  var traderAppModalBackdrop = document.getElementById("traderAppModalBackdrop");
  var traderAppModalClose = document.getElementById("traderAppModalClose");
  var traderAppModalDl = document.getElementById("traderAppModalDl");
  var traderAppModalActions = document.getElementById("traderAppModalActions");
  var traderAppModalNote = document.getElementById("traderAppModalNote");
  var traderAppApproveBtn = document.getElementById("traderAppApproveBtn");
  var traderAppRejectBtn = document.getElementById("traderAppRejectBtn");

  function closeTraderAppModal() {
    if (!traderAppModal) return;
    traderAppModal.classList.remove("is-open");
    traderAppModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    traderAppDetailId = null;
  }

  function tryOpenTraderAppFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var appId = params.get("traderApp");
      if (!appId || !String(appId).trim()) return;
      appId = String(appId).trim();
      var TA = window.SkinexTraderApplications;
      if (!TA || typeof TA.listAll !== "function") return;
      applyAdminTab("traders");
      TA.listAll().then(function (rows) {
        var list = Array.isArray(rows) ? rows : [];
        var row = list.find(function (r) {
          return r && String(r.id) === appId;
        });
        if (row) {
          openTraderAppModal(row);
        } else {
          var note = document.getElementById("adminTradersNote");
          if (note) {
            note.style.color = "#fbbf24";
            note.textContent = "Заявка по ссылке не найдена или уже обработана.";
          }
        }
        var url = new URL(window.location.href);
        url.searchParams.delete("traderApp");
        if (!url.hash || url.hash === "#") url.hash = "traders";
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      });
    } catch (e) {}
  }

  function openTraderAppModal(row) {
    if (!traderAppModal || !traderAppModalDl || !row) return;
    traderAppDetailId = row.id;
    var st = String(row.status || "");
    var labels = { pending: "На рассмотрении", approved: "Одобрена", rejected: "Отклонена" };
    var su = String(row.steamUrl || "").trim();
    var steamLinkHtml;
    if (su && /^https?:\/\//i.test(su)) {
      steamLinkHtml =
        '<a class="trader-app-review-steam-link" href="' +
        su.replace(/"/g, "&quot;") +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(su) +
        "</a>";
    } else {
      steamLinkHtml = '<span class="trader-app-review-steam-plain">' + escapeHtml(su || "—") + "</span>";
    }
    var badgeClass =
      st === "pending"
        ? "trader-app-review-status--pending"
        : st === "approved"
          ? "trader-app-review-status--approved"
          : "trader-app-review-status--rejected";
    function card(label, innerHtml) {
      return (
        '<div class="trader-app-review-card">' +
        '<span class="trader-app-review-k">' +
        escapeHtml(label) +
        "</span>" +
        '<div class="trader-app-review-v">' +
        innerHtml +
        "</div></div>"
      );
    }
    var html = [];
    html.push('<div class="trader-app-review-hero">');
    html.push('<code class="trader-app-review-id" title="ID заявки">' + escapeHtml(String(row.id || "")) + "</code>");
    html.push(
      '<span class="trader-app-review-status ' +
        badgeClass +
        '">' +
        escapeHtml(labels[st] || st) +
        "</span>",
    );
    html.push("</div>");
    html.push('<div class="trader-app-review-grid">');
    html.push(card("Дата подачи", escapeHtml(formatWhen(row.createdAt))));
    html.push(card("Email", escapeHtml(String(row.userEmail || "—"))));
    if (row.displayName && String(row.displayName).trim()) {
      html.push(card("Имя в кабинете", escapeHtml(String(row.displayName).trim())));
    }
    var tgRaw = String(row.telegramTag || "").trim();
    var tgClean = tgRaw.charAt(0) === "@" ? tgRaw.slice(1) : tgRaw;
    var tgHtml;
    if (tgClean && /^[a-zA-Z0-9_]+$/.test(tgClean)) {
      var tgHref = "https://t.me/" + encodeURIComponent(tgClean);
      tgHtml =
        '<a class="trader-app-review-tg-link" href="' +
        tgHref.replace(/"/g, "&quot;") +
        '" target="_blank" rel="noopener noreferrer" title="Открыть в Telegram">' +
        '<span class="trader-app-review-tg-at">@</span>' +
        escapeHtml(tgClean) +
        "</a>";
    } else {
      tgHtml =
        '<span class="trader-app-review-tg-fallback"><span class="trader-app-review-tg-at">@</span>' +
        escapeHtml(tgRaw || "—") +
        "</span>";
    }
    html.push(card("Telegram", tgHtml));
    html.push(card("Профиль Steam", '<div class="trader-app-review-steam">' + steamLinkHtml + "</div>"));
    html.push("</div>");
    traderAppModalDl.innerHTML = html.join("");
    if (traderAppModalActions) {
      traderAppModalActions.hidden = st !== "pending";
    }
    if (traderAppModalNote) traderAppModalNote.textContent = "";
    traderAppModal.classList.add("is-open");
    traderAppModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function renderTradersTable() {
    var tbody = document.getElementById("adminTradersBody");
    var note = document.getElementById("adminTradersNote");
    var TA = window.SkinexTraderApplications;
    if (!tbody || !TA || typeof TA.listAll !== "function") return;
    if (note) {
      note.textContent = "";
      note.style.color = "";
    }
    tbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">Загрузка…</td></tr>';
    TA.listAll().then(function (rows) {
      traderAppsCache = Array.isArray(rows) ? rows : [];
      tbody.innerHTML = "";
      if (!traderAppsCache.length) {
        var tr0 = document.createElement("tr");
        var td0 = document.createElement("td");
        td0.colSpan = 6;
        td0.className = "admin-table-empty";
        td0.textContent = "Нет заявок.";
        tr0.appendChild(td0);
        tbody.appendChild(tr0);
        return;
      }
      var stLabel = { pending: "На рассмотрении", approved: "Одобрена", rejected: "Отклонена" };
      traderAppsCache.forEach(function (r) {
        var tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        var st = String(r.status || "");
        tr.addEventListener("click", function () {
          openTraderAppModal(r);
        });
        function td(text) {
          var t = document.createElement("td");
          t.textContent = text;
          return t;
        }
        tr.appendChild(td(formatWhen(r.createdAt)));
        tr.appendChild(td(String(r.userEmail || "—")));
        tr.appendChild(td("@" + String(r.telegramTag || "")));
        var tdSteam = document.createElement("td");
        var su = String(r.steamUrl || "").trim();
        if (su && /^https?:\/\//i.test(su)) {
          var a = document.createElement("a");
          a.href = su;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = su.length > 48 ? su.slice(0, 45) + "…" : su;
          tdSteam.appendChild(a);
        } else tdSteam.textContent = su || "—";
        tr.appendChild(tdSteam);
        tr.appendChild(td(stLabel[st] || st));
        var tdAct = document.createElement("td");
        tdAct.className = "admin-table-actions";
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn btn-outline btn-sm";
        b.textContent = "Открыть";
        b.addEventListener("click", function (ev) {
          ev.stopPropagation();
          openTraderAppModal(r);
        });
        tdAct.appendChild(b);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
    });
  }

  var DASH_PREFS_KEY = "skinex_admin_dash_prefs_v1";
  var DASH_STATE_KEY = "skinex_admin_dash_state_v1";
  var dashState = { preset: "30d", dateFrom: "", dateTo: "" };
  try {
    var dsRaw = localStorage.getItem(DASH_STATE_KEY);
    if (dsRaw) {
      var ds = JSON.parse(dsRaw);
      if (ds && typeof ds === "object") {
        if (ds.preset) dashState.preset = String(ds.preset);
        if (typeof ds.dateFrom === "string") dashState.dateFrom = ds.dateFrom;
        if (typeof ds.dateTo === "string") dashState.dateTo = ds.dateTo;
      }
    }
  } catch (e) {}

  function saveDashState() {
    try {
      localStorage.setItem(DASH_STATE_KEY, JSON.stringify(dashState));
    } catch (e) {}
  }

  function loadDashPrefs() {
    try {
      var raw = localStorage.getItem(DASH_PREFS_KEY);
      var o = raw ? JSON.parse(raw) : {};
      return {
        catalog: o.catalog !== false,
        market: o.market !== false,
        breakdown: o.breakdown !== false,
        ordersTable: o.ordersTable !== false,
        topItems: o.topItems !== false,
        reviews: o.reviews !== false,
      };
    } catch (e) {
      return { catalog: true, market: true, breakdown: true, ordersTable: true, topItems: true, reviews: true };
    }
  }

  function saveDashPrefs(p) {
    try {
      localStorage.setItem(DASH_PREFS_KEY, JSON.stringify(p));
    } catch (e) {}
  }

  function orderTs(o) {
    var t = o && (o.createdAt || (o.timeline && o.timeline[0] && o.timeline[0].at));
    return typeof t === "number" ? t : 0;
  }

  function getDashRange() {
    var preset = dashState.preset;
    if (preset === "custom" && dashState.dateFrom && dashState.dateTo) {
      var a = new Date(dashState.dateFrom + "T00:00:00");
      var b = new Date(dashState.dateTo + "T23:59:59.999");
      if (isNaN(a.getTime()) || isNaN(b.getTime())) return { start: null, end: null, label: "всё время" };
      return {
        start: a.getTime(),
        end: b.getTime(),
        label: dashState.dateFrom + " — " + dashState.dateTo,
      };
    }
    if (preset === "all") return { start: null, end: null, label: "всё время" };
    var end = new Date();
    end.setHours(23, 59, 59, 999);
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var label = "";
    if (preset === "today") {
      label = "сегодня";
    } else if (preset === "7d") {
      start.setDate(start.getDate() - 6);
      label = "7 дней";
    } else if (preset === "30d") {
      start.setDate(start.getDate() - 29);
      label = "30 дней";
    } else if (preset === "90d") {
      start.setDate(start.getDate() - 89);
      label = "90 дней";
    } else if (preset === "month") {
      start.setDate(1);
      label = "этот месяц";
    } else if (preset === "prev_month") {
      var now = new Date();
      var firstThis = new Date(now.getFullYear(), now.getMonth(), 1);
      var lastPrevMs = firstThis.getTime() - 1;
      var lastPrev = new Date(lastPrevMs);
      start = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(lastPrev.getFullYear(), lastPrev.getMonth() + 1, 0, 23, 59, 59, 999);
      label = "прошлый месяц";
      return { start: start.getTime(), end: end.getTime(), label: label };
    } else if (preset === "year") {
      start = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0);
      label = "этот год";
    } else {
      start.setDate(start.getDate() - 29);
      label = "30 дней";
    }
    return { start: start.getTime(), end: end.getTime(), label: label };
  }

  function orderInRange(o, range) {
    if (range.start == null && range.end == null) return true;
    var t = orderTs(o);
    if (!t) return false;
    if (range.start != null && t < range.start) return false;
    if (range.end != null && t > range.end) return false;
    return true;
  }

  var STATUS_LABEL_SHORT = {
    CREATED: "Создан",
    ASSIGNED: "В работе",
    WAITING_PERIOD: "30 дн.",
    READY_TO_DELIVER: "К отправке",
    DELIVERED: "У клиента",
    COMPLETED: "Готово",
    CANCELLED: "Отмена",
    placed: "Создан",
    awaiting_seller: "В работе",
    transfer_pending: "30 дн.",
    item_sent: "У клиента",
    completed: "Готово",
    cancelled: "Отмена",
    active: "Активен",
  };

  function statusShort(s) {
    var k = Acc && Acc.migrateLegacyStatus ? Acc.migrateLegacyStatus(String(s || "")) : String(s || "");
    return STATUS_LABEL_SHORT[k] || k || "—";
  }

  var dashBoardEventsBound = false;

  function bindDashBoardEvents() {
    if (dashBoardEventsBound || !adminDashBoard) return;
    dashBoardEventsBound = true;
    adminDashBoard.addEventListener("change", function (e) {
      var t = e.target;
      if (!t || !t.id) return;
      if (t.id === "adminDashPreset") {
        dashState.preset = String(t.value || "30d");
        if (dashState.preset !== "custom") {
          dashState.dateFrom = "";
          dashState.dateTo = "";
        }
        saveDashState();
        renderDashboard();
        return;
      }
      if (t.getAttribute("data-dash-pref")) {
        var prefs = loadDashPrefs();
        var key = t.getAttribute("data-dash-pref");
        prefs[key] = !!t.checked;
        saveDashPrefs(prefs);
        renderDashboard();
      }
    });
    adminDashBoard.addEventListener("click", function (e) {
      if (e.target && e.target.id === "adminDashApplyCustom") {
        var df = document.getElementById("adminDashDateFrom");
        var dt = document.getElementById("adminDashDateTo");
        dashState.preset = "custom";
        dashState.dateFrom = df ? String(df.value || "").trim() : "";
        dashState.dateTo = dt ? String(dt.value || "").trim() : "";
        if (dashState.dateFrom && dashState.dateTo && dashState.dateFrom > dashState.dateTo) {
          var tmp = dashState.dateFrom;
          dashState.dateFrom = dashState.dateTo;
          dashState.dateTo = tmp;
        }
        saveDashState();
        renderDashboard();
      }
    });
  }

  function renderDashboard() {
    if (!adminDashBoard) return;
    bindDashBoardEvents();
    var prefs = loadDashPrefs();
    var range = getDashRange();
    var orders = Acc && Acc.getOrders ? Acc.getOrders() : [];
    var filtered = orders.filter(function (o) {
      return orderInRange(o, range);
    });

    var sumTotalAll = 0;
    var sumTotalCompleted = 0;
    var countCompleted = 0;
    var countCancelled = 0;
    var countActive = 0;
    var itemsQty = 0;
    var buyers = {};
    var statusCount = {};
    var heroRevenue = {};

    filtered.forEach(function (o) {
      var tot = Math.max(0, Math.floor(Number(o.total)) || 0);
      sumTotalAll += tot;
      var st = String(o.status || "");
      statusCount[st] = (statusCount[st] || 0) + 1;
      if (st === "COMPLETED" || st === "completed") {
        countCompleted++;
        sumTotalCompleted += tot;
        (o.items || []).forEach(function (line) {
          var q = Math.max(0, Math.floor(Number(line.qty)) || 0);
          itemsQty += q;
          var hero = line && line.hero ? String(line.hero) : "—";
          var lt = Math.max(0, Math.floor(Number(line.unitPrice)) || 0) * q;
          heroRevenue[hero] = (heroRevenue[hero] || 0) + lt;
        });
      } else if (st === "CANCELLED" || st === "cancelled") {
        countCancelled++;
      } else {
        countActive++;
      }
      var em = o.buyerEmail ? String(o.buyerEmail).toLowerCase().trim() : "";
      if (em) buyers[em] = true;
    });
    var uniqueBuyers = Object.keys(buyers).length;
    var avgCheck =
      countCompleted > 0 ? Math.round(sumTotalCompleted / countCompleted) : 0;

    var list = Cat.getCatalog();
    var count = list.length;
    var sumCatalog = list.reduce(function (a, it) {
      return a + (Number(it.price) || 0);
    }, 0);
    var tax = Tax.getTaxonomy();
    var users = SkinexAuth && SkinexAuth.listClientAccounts ? SkinexAuth.listClientAccounts().length : 0;

    var Mo = window.SkinexMarketOffers;
    var marketRows = Mo && typeof Mo.listAllOffers === "function" ? Mo.listAllOffers() : [];
    var offersInRange = marketRows.filter(function (off) {
      var ct = typeof off.createdAt === "number" ? off.createdAt : 0;
      if (range.start == null && range.end == null) return true;
      if (!ct) return false;
      if (range.start != null && ct < range.start) return false;
      if (range.end != null && ct > range.end) return false;
      return true;
    });
    var offersVisible = marketRows.filter(function (x) {
      return x && !x.hidden && (x.qty || 0) > 0;
    });
    var sumOfferQty = offersVisible.reduce(function (a, o) {
      return a + Math.max(0, Math.floor(Number(o.qty)) || 0);
    }, 0);

    var Reviews = window.SkinexReviews;
    var revList =
      Reviews && typeof Reviews.listForDisplay === "function" ? Reviews.listForDisplay() : [];
    var revInRange = revList.filter(function (r) {
      var ct = r && r.createdAt ? Number(r.createdAt) : 0;
      if (!ct) return false;
      if (range.start != null && ct < range.start) return false;
      if (range.end != null && ct > range.end) return false;
      return true;
    });

    function card(label, val, hint) {
      return (
        '<div class="admin-dash-card">' +
        '<span class="admin-dash-card-label">' +
        escapeHtml(label) +
        "</span>" +
        '<strong class="admin-dash-card-value">' +
        val +
        "</strong>" +
        (hint ? '<span class="admin-dash-card-hint">' + escapeHtml(hint) + "</span>" : "") +
        "</div>"
      );
    }

    function barRow(label, n, max, color, numDisplay) {
      var pct = max > 0 ? Math.min(100, Math.round((n / max) * 100)) : 0;
      var numOut = numDisplay != null ? numDisplay : String(n);
      return (
        '<div class="admin-dash-bar-row">' +
        '<span class="admin-dash-bar-label">' +
        escapeHtml(label) +
        "</span>" +
        '<div class="admin-dash-bar-track" role="presentation"><span class="admin-dash-bar-fill" style="width:' +
        pct +
        "%;background:" +
        (color || "linear-gradient(90deg,#6366f1,#8b5cf6)") +
        '"></span></div>' +
        '<span class="admin-dash-bar-num">' +
        numOut +
        "</span>" +
        "</div>"
      );
    }

    var maxStatus = 0;
    Object.keys(statusCount).forEach(function (k) {
      if (statusCount[k] > maxStatus) maxStatus = statusCount[k];
    });

    var topHeroes = Object.keys(heroRevenue)
      .map(function (h) {
        return { h: h, v: heroRevenue[h] };
      })
      .sort(function (a, b) {
        return b.v - a.v;
      })
      .slice(0, 8);
    var maxHero = topHeroes.length ? topHeroes[0].v : 0;

    var recentRows = filtered
      .slice()
      .sort(function (a, b) {
        return orderTs(b) - orderTs(a);
      })
      .slice(0, 20);

    var presetOpts = [
      ["today", "Сегодня"],
      ["7d", "7 дней"],
      ["30d", "30 дней"],
      ["90d", "90 дней"],
      ["month", "Этот месяц"],
      ["prev_month", "Прошлый месяц"],
      ["year", "Этот год"],
      ["all", "Всё время"],
      ["custom", "Свой период"],
    ]
      .map(function (x) {
        return (
          '<option value="' +
          escapeHtml(x[0]) +
          '"' +
          (dashState.preset === x[0] ? " selected" : "") +
          ">" +
          escapeHtml(x[1]) +
          "</option>"
        );
      })
      .join("");

    var customHiddenAttr = dashState.preset !== "custom" ? " hidden" : "";
    var toolbar =
      '<div class="admin-dash-toolbar">' +
      '<div class="admin-dash-toolbar-row">' +
      '<label class="admin-dash-field"><span class="admin-dash-field-lbl">Период</span>' +
      '<select id="adminDashPreset" class="admin-dash-select">' +
      presetOpts +
      "</select></label>" +
      '<div class="admin-dash-custom" id="adminDashCustomWrap"' +
      customHiddenAttr +
      ">" +
      '<input type="date" id="adminDashDateFrom" class="admin-dash-date" value="' +
      escapeHtml(dashState.dateFrom) +
      '" />' +
      '<span class="admin-dash-date-sep">—</span>' +
      '<input type="date" id="adminDashDateTo" class="admin-dash-date" value="' +
      escapeHtml(dashState.dateTo) +
      '" />' +
      '<button type="button" class="btn btn-outline admin-dash-apply" id="adminDashApplyCustom">Применить</button>' +
      "</div>" +
      '<span class="admin-dash-range-badge">' +
      escapeHtml(range.label) +
      "</span>" +
      "</div>" +
      '<div class="admin-dash-toolbar-flags" role="group" aria-label="Блоки сводки">' +
      '<label class="admin-dash-check"><input type="checkbox" data-dash-pref="catalog"' +
      (prefs.catalog ? " checked" : "") +
      " /> Каталог</label>" +
      '<label class="admin-dash-check"><input type="checkbox" data-dash-pref="market"' +
      (prefs.market ? " checked" : "") +
      " /> Рынок (лоты)</label>" +
      '<label class="admin-dash-check"><input type="checkbox" data-dash-pref="breakdown"' +
      (prefs.breakdown ? " checked" : "") +
      " /> Статусы заказов</label>" +
      '<label class="admin-dash-check"><input type="checkbox" data-dash-pref="ordersTable"' +
      (prefs.ordersTable ? " checked" : "") +
      " /> Таблица заказов</label>" +
      '<label class="admin-dash-check"><input type="checkbox" data-dash-pref="topItems"' +
      (prefs.topItems ? " checked" : "") +
      " /> Герои по выручке</label>" +
      '<label class="admin-dash-check"><input type="checkbox" data-dash-pref="reviews"' +
      (prefs.reviews ? " checked" : "") +
      " /> Отзывы</label>" +
      "</div></div>";

    var kpiBlock =
      '<section class="admin-dash-section"><h2 class="admin-dash-section-title">Заказы в выбранном периоде</h2>' +
      '<div class="admin-dash-grid admin-dash-grid--kpi">' +
      card("Заказов всего", String(filtered.length), "в интервале") +
      card("Завершено", String(countCompleted), "заказов") +
      card("Активных / отмен", String(countActive) + " / " + String(countCancelled), "не завершены / отмена") +
      card("Оборот (все в периоде)", escapeHtml(formatPrice(sumTotalAll)), "сумма total") +
      card("Выручка завершённых", escapeHtml(formatPrice(sumTotalCompleted)), "только completed") +
      card("Средний чек (заверш.)", escapeHtml(formatPrice(avgCheck)), "по завершённым") +
      card("Позиций продано", String(itemsQty), "шт. в строках completed") +
      card("Уникальных покупателей", String(uniqueBuyers), "по email") +
      "</div></section>";

    var breakdownHtml = "";
    if (prefs.breakdown && maxStatus > 0) {
      breakdownHtml =
        '<section class="admin-dash-section"><h2 class="admin-dash-section-title">Распределение по статусам</h2><div class="admin-dash-bars">';
      Object.keys(statusCount)
        .sort(function (a, b) {
          return statusCount[b] - statusCount[a];
        })
        .forEach(function (k) {
          breakdownHtml += barRow(statusShort(k) + " (" + k + ")", statusCount[k], maxStatus);
        });
      breakdownHtml += "</div></section>";
    }

    var catalogHtml = "";
    if (prefs.catalog) {
      catalogHtml =
        '<section class="admin-dash-section"><h2 class="admin-dash-section-title">Каталог и аккаунты <span class="admin-dash-snap">(снимок)</span></h2>' +
        '<div class="admin-dash-grid">' +
        card("Товаров в каталоге", String(count)) +
        card("Сумма цен витрины", escapeHtml(formatPrice(sumCatalog))) +
        card("Теги герои / типы", String(tax.heroes.length) + " / " + String(tax.itemTypes.length)) +
        card("Аккаунтов клиентов", String(users)) +
        "</div></section>";
    }

    var marketHtml = "";
    if (prefs.market) {
      marketHtml =
        '<section class="admin-dash-section"><h2 class="admin-dash-section-title">Рынок <span class="admin-dash-snap">(лоты)</span></h2>' +
        '<div class="admin-dash-grid">' +
        card("Лотов на витрине", String(offersVisible.length), "активных") +
        card("Остаток по лотам", String(sumOfferQty), "шт.") +
        card("Лотов в периоде (созд.)", String(offersInRange.length), "по дате создания") +
        "</div></section>";
    }

    var topHtml = "";
    if (prefs.topItems && countCompleted > 0 && topHeroes.length) {
      topHtml =
        '<section class="admin-dash-section"><h2 class="admin-dash-section-title">Выручка по героям (завершённые заказы)</h2><div class="admin-dash-bars">';
      topHeroes.forEach(function (row) {
        topHtml += barRow(
          row.h,
          row.v,
          maxHero,
          "linear-gradient(90deg,#f59e0b,#ea580c)",
          escapeHtml(formatPrice(row.v)),
        );
      });
      topHtml += "</div></section>";
    }

    var reviewsHtml = "";
    if (prefs.reviews) {
      reviewsHtml =
        '<section class="admin-dash-section"><h2 class="admin-dash-section-title">Отзывы</h2>' +
        '<div class="admin-dash-grid">' +
        card("Отзывов в периоде", String(revInRange.length), "по дате публикации") +
        card("Всего отзывов", String(revList.length), "все время") +
        "</div></section>";
    }

    var tableHtml = "";
    if (prefs.ordersTable) {
      tableHtml =
        '<section class="admin-dash-section"><h2 class="admin-dash-section-title">Заказы в периоде (до 20)</h2>' +
        '<div class="admin-dash-table-wrap"><table class="admin-dash-table"><thead><tr>' +
        "<th>№</th><th>Дата</th><th>Покупатель</th><th>Статус</th><th>Сумма</th>" +
        "</tr></thead><tbody>";
      if (!recentRows.length) {
        tableHtml += '<tr><td colspan="5" class="admin-dash-table-empty">Нет заказов в выбранном периоде.</td></tr>';
      } else {
        recentRows.forEach(function (o) {
          tableHtml +=
            "<tr><td>" +
            escapeHtml(String(o.orderNumber != null ? o.orderNumber : "—")) +
            "</td><td>" +
            escapeHtml(formatWhen(orderTs(o))) +
            "</td><td>" +
            escapeHtml((o.buyerEmail || "").split("@")[0] || "—") +
            "</td><td>" +
            escapeHtml(statusShort(o.status)) +
            "</td><td>" +
            escapeHtml(formatPrice(Math.floor(Number(o.total)) || 0)) +
            "</td></tr>";
        });
      }
      tableHtml += "</tbody></table></div></section>";
    }

    adminDashBoard.innerHTML = toolbar + kpiBlock + breakdownHtml + catalogHtml + marketHtml + topHtml + reviewsHtml + tableHtml;
    if (adminDashNote) adminDashNote.textContent = "";
  }

  function closeAdminOrderModal() {
    if (!adminOrderModal) return;
    adminOrderModal.classList.remove("is-open");
    adminOrderModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function openAdminOrderModal(orderId) {
    if (!adminOrderModal || !adminOrderModalBody || !Acc) return;
    var orders = Acc.getOrders();
    var o = orders.find(function (x) {
      return String(x.id) === String(orderId);
    });
    if (!o) return;
    if (adminOrderModalTitle) {
      adminOrderModalTitle.textContent =
        "Заказ № " + (o.orderNumber != null ? String(o.orderNumber) : String(o.id).slice(0, 8));
    }
    adminOrderModalBody.innerHTML = buildAdminOrderDetailHtml(o);
    adminOrderModalBody.querySelectorAll("[data-admin-order-status-apply]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wrap = btn.closest(".admin-order-status-form");
        if (!wrap) return;
        var sel = wrap.querySelector("[data-order-status-select]");
        var noteEl = wrap.querySelector("[data-order-status-note]");
        var st = sel ? String(sel.value || "").trim() : "";
        var note = noteEl ? String(noteEl.value || "").trim() : "";
        if (!st) return;
        var r = Acc.setOrderStatus(o.id, st, note);
        if (adminOrdersNote) {
          adminOrdersNote.style.color = r.ok ? "#86d759" : "#f87171";
          adminOrdersNote.textContent = r.ok ? "Статус обновлён." : r.message || "Ошибка.";
        }
        renderOrdersTable();
        renderDashboard();
        if (r.ok) openAdminOrderModal(o.id);
      });
    });
    adminOrderModal.classList.add("is-open");
    adminOrderModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function buildAdminOrderDetailHtml(o) {
    var buyer =
      (o.buyerDisplayName ? escapeHtml(o.buyerDisplayName) : "—") +
      (o.buyerEmail ? " · " + escapeHtml(o.buyerEmail) : "");
    var steam = o.buyerSteamId ? escapeHtml(String(o.buyerSteamId)) : "—";
    var seller = o.sellerLabel ? escapeHtml(String(o.sellerLabel)) : "Skinexs";
    var stLabel = Acc.orderStatusLabel ? Acc.orderStatusLabel(o.status) : String(o.status || "");
    var stCanonModal = Acc.migrateLegacyStatus ? Acc.migrateLegacyStatus(o.status) : String(o.status || "");
    var dealStrip = "";
    if (stCanonModal === "CANCELLED") {
      dealStrip = '<div class="admin-deal-strip admin-deal-strip--cancelled">Сделка отменена</div>';
    } else {
      var PIPE = [
        "CREATED",
        "ASSIGNED",
        "WAITING_PERIOD",
        "READY_TO_DELIVER",
        "DELIVERED",
        "COMPLETED",
      ];
      var idx = PIPE.indexOf(stCanonModal);
      if (idx < 0) idx = 0;
      dealStrip =
        '<div class="admin-deal-strip" aria-label="Этапы сделки">' +
        PIPE.map(function (k, i) {
          var done = i < idx;
          var cur = i === idx;
          var cls = "admin-deal-step";
          if (done) cls += " is-done";
          if (cur) cls += " is-current";
          if (!done && !cur) cls += " is-pending";
          return (
            '<span class="' +
            cls +
            '" title="' +
            escapeHtml(Acc.orderStatusLabel(k)) +
            '"><span class="admin-deal-step-dot"></span><span class="admin-deal-step-t">' +
            escapeHtml(String(i + 1)) +
            "</span></span>"
          );
        }).join("") +
        "</div>";
    }
    var lines = (o.items || [])
      .map(function (l) {
        var ts = Acc.transferStatusLabel ? Acc.transferStatusLabel(l.transferStatus) : l.transferStatus;
        return (
          "<tr><td>" +
          escapeHtml(l.name) +
          "</td><td>" +
          escapeHtml(l.hero || "—") +
          "</td><td>" +
          Number(l.qty) +
          "</td><td>" +
          escapeHtml(formatPrice(l.unitPrice)) +
          "</td><td>" +
          escapeHtml(ts) +
          "</td></tr>"
        );
      })
      .join("");
    var timeline = (o.timeline || [])
      .slice()
      .sort(function (a, b) {
        return Number(a.at) - Number(b.at);
      })
      .map(function (ev) {
        var tlab = Acc.orderStatusLabel ? Acc.orderStatusLabel(ev.status) : String(ev.status || "");
        return (
          "<li class=\"admin-order-timeline-item\"><time datetime=\"" +
          String(ev.at) +
          "\">" +
          escapeHtml(formatWhen(ev.at)) +
          "</time> — <strong>" +
          escapeHtml(tlab) +
          "</strong>" +
          (ev.note ? "<span class=\"admin-order-timeline-note\"> — " + escapeHtml(ev.note) + "</span>" : "") +
          "</li>"
        );
      })
      .join("");
    var keys = Acc.listOrderStatusKeys ? Acc.listOrderStatusKeys() : [];
    var opts = keys
      .map(function (k) {
        var lab = Acc.orderStatusLabel(k);
        return (
          "<option value=\"" +
          escapeHtml(k) +
          "\"" +
          (String(o.status) === k ? " selected" : "") +
          ">" +
          escapeHtml(lab) +
          "</option>"
        );
      })
      .join("");
    return (
      "<div class=\"admin-order-detail\">" +
      "<dl class=\"admin-order-dl\">" +
      "<div><dt>Внутренний ID</dt><dd><code>" +
      escapeHtml(String(o.id)) +
      "</code></dd></div>" +
      "<div><dt>Покупатель</dt><dd>" +
      buyer +
      "</dd></div>" +
      "<div><dt>Steam ID покупателя</dt><dd>" +
      steam +
      "</dd></div>" +
      "<div><dt>Продавец / исполнитель</dt><dd>" +
      seller +
      " → передача покупателю (учётная запись выше)</dd></div>" +
      "<div><dt>Статус сделки</dt><dd><span class=\"admin-order-status-pill\" data-deal-status=\"" +
      escapeHtml(stCanonModal) +
      "\">" +
      escapeHtml(stLabel) +
      "</span></dd></div>" +
      "<div><dt>Этапы сделки</dt><dd class=\"admin-dd-deal\">" +
      dealStrip +
      "</dd></div>" +
      "<div><dt>Создан</dt><dd>" +
      escapeHtml(formatWhen(o.createdAt)) +
      "</dd></div>" +
      (o.completedAt
        ? "<div><dt>Завершён / закрыт</dt><dd>" + escapeHtml(formatWhen(o.completedAt)) + "</dd></div>"
        : "") +
      "<div><dt>Сумма</dt><dd>" +
      escapeHtml(formatPrice(o.total || 0)) +
      "</dd></div>" +
      "</dl>" +
      "<h3 class=\"admin-order-subtitle\">Позиции</h3>" +
      "<div class=\"admin-table-wrap\">" +
      "<table class=\"admin-table admin-order-lines-table\"><thead><tr>" +
      "<th>Предмет / сет</th><th>Герой</th><th>Кол-во</th><th>Цена за ед.</th><th>Статус передачи</th>" +
      "</tr></thead><tbody>" +
      (lines || "<tr><td colspan=\"5\">—</td></tr>") +
      "</tbody></table></div>" +
      "<h3 class=\"admin-order-subtitle\">История</h3>" +
      "<ol class=\"admin-order-timeline\">" +
      (timeline || "<li>Нет записей</li>") +
      "</ol>" +
      "<div class=\"admin-order-status-form\" data-admin-order-status-form>" +
      "<label class=\"field\"><span>Сменить статус</span>" +
      "<select data-order-status-select class=\"admin-order-status-select\">" +
      opts +
      "</select></label>" +
      "<label class=\"field\"><span>Комментарий к событию (необязательно)</span>" +
      "<input type=\"text\" data-order-status-note maxlength=\"500\" placeholder=\"Например: отправил trade\" /></label>" +
      "<button type=\"button\" class=\"btn-cs-cart btn-sm\" data-admin-order-status-apply>Применить статус</button>" +
      "</div>" +
      "<p class=\"admin-order-hint\">Статусы сделки: создан → трейдер → 30 дн. → отправка → у клиента → подтверждение. Полный список в <code>js/account-store.js</code>.</p>" +
      "</div>"
    );
  }

  function renderOrdersTable() {
    if (!adminOrdersBody || !Acc) return;
    if (adminOrdersNote) {
      if (!adminOrdersNote.textContent) {
        adminOrdersNote.style.color = "";
      }
    }
    var orders = Acc.getOrders().slice();
    orders.sort(function (a, b) {
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });
    adminOrdersBody.innerHTML = "";
    if (!orders.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 7;
      td0.textContent = "Нет заказов. Оформление — из корзины на главной (под аккаунтом клиента в этом браузере).";
      td0.style.color = "var(--cs-muted, #a1a8ce)";
      tr0.appendChild(td0);
      adminOrdersBody.appendChild(tr0);
      return;
    }
    orders.forEach(function (o) {
      var tr = document.createElement("tr");
      var tdNum = document.createElement("td");
      tdNum.innerHTML =
        "<strong>№ " +
        escapeHtml(String(o.orderNumber != null ? o.orderNumber : "—")) +
        '</strong><br/><span class="admin-order-id-muted"><code>' +
        escapeHtml(String(o.id).slice(0, 10)) +
        "…</code></span>";
      var tdWhen = document.createElement("td");
      tdWhen.textContent = formatWhen(o.createdAt);
      var tdBuyer = document.createElement("td");
      tdBuyer.className = "admin-order-buyer";
      tdBuyer.innerHTML =
        escapeHtml(o.buyerDisplayName || "—") +
        (o.buyerEmail ? "<br/><span class=\"admin-order-email\">" + escapeHtml(o.buyerEmail) + "</span>" : "");
      var tdSum = document.createElement("td");
      tdSum.textContent = formatPrice(o.total || 0);
      var tdSt = document.createElement("td");
      var stCanon = Acc.migrateLegacyStatus ? Acc.migrateLegacyStatus(o.status) : String(o.status || "");
      var stLab = Acc.orderStatusLabel ? Acc.orderStatusLabel(o.status) : o.status || "";
      tdSt.innerHTML =
        '<span class="admin-order-status-chip" data-deal-status="' +
        escapeHtml(stCanon) +
        '">' +
        escapeHtml(stLab) +
        "</span>";
      var tdBrief = document.createElement("td");
      tdBrief.className = "admin-order-lines";
      if (o.items && o.items.length) {
        tdBrief.innerHTML = o.items
          .map(function (l) {
            return escapeHtml(l.name) + " ×" + Number(l.qty);
          })
          .join("<br/>");
      } else tdBrief.textContent = "—";
      var tdAct = document.createElement("td");
      tdAct.className = "admin-table-actions";
      var b0 = document.createElement("button");
      b0.type = "button";
      b0.className = "btn btn-outline btn-sm";
      b0.textContent = "Подробнее";
      b0.addEventListener("click", function () {
        openAdminOrderModal(o.id);
      });
      tdAct.appendChild(b0);
      tdAct.appendChild(document.createTextNode(" "));
      if (Acc.isOrderActive && Acc.isOrderActive(o)) {
        var b1 = document.createElement("button");
        b1.type = "button";
        b1.className = "btn btn-outline btn-sm";
        b1.textContent = "Завершить";
        b1.addEventListener("click", function () {
          if (Acc.setOrderStatus) {
            Acc.setOrderStatus(o.id, "COMPLETED", "Принудительно завершено администратором");
          } else {
            Acc.completeOrder(o.id);
          }
          renderOrdersTable();
          renderDashboard();
          if (adminOrdersNote) {
            adminOrdersNote.style.color = "#86d759";
            adminOrdersNote.textContent = "Заказ отмечен завершённым.";
          }
          closeAdminOrderModal();
        });
        tdAct.appendChild(b1);
        tdAct.appendChild(document.createTextNode(" "));
      }
      var b2 = document.createElement("button");
      b2.type = "button";
      b2.className = "btn btn-outline btn-sm";
      b2.textContent = "Удалить";
      b2.addEventListener("click", function () {
        if (!confirm("Удалить заказ из списка в этом браузере?")) return;
        Acc.removeOrder(o.id);
        renderOrdersTable();
        renderDashboard();
        closeAdminOrderModal();
        if (adminOrdersNote) {
          adminOrdersNote.style.color = "#fbbf24";
          adminOrdersNote.textContent = "Запись удалена.";
        }
      });
      tdAct.appendChild(b2);
      tr.appendChild(tdNum);
      tr.appendChild(tdWhen);
      tr.appendChild(tdBuyer);
      tr.appendChild(tdSum);
      tr.appendChild(tdSt);
      tr.appendChild(tdBrief);
      tr.appendChild(tdAct);
      adminOrdersBody.appendChild(tr);
    });
  }

  if (adminOrderModalClose) {
    adminOrderModalClose.addEventListener("click", closeAdminOrderModal);
  }
  if (adminOrderModalBackdrop) {
    adminOrderModalBackdrop.addEventListener("click", closeAdminOrderModal);
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && adminOrderModal && adminOrderModal.classList.contains("is-open")) {
      closeAdminOrderModal();
    }
    if (e.key === "Escape" && traderAppModal && traderAppModal.classList.contains("is-open")) {
      closeTraderAppModal();
    }
  });

  if (traderAppModalClose) {
    traderAppModalClose.addEventListener("click", closeTraderAppModal);
  }
  if (traderAppModalBackdrop) {
    traderAppModalBackdrop.addEventListener("click", closeTraderAppModal);
  }
  function runTraderAppDecision(action) {
    var TA = window.SkinexTraderApplications;
    if (!TA || !traderAppDetailId || typeof TA.decide !== "function") return;
    if (traderAppModalNote) {
      traderAppModalNote.textContent = "";
      traderAppModalNote.style.color = "";
    }
    TA.decide(traderAppDetailId, action).then(function (r) {
      if (r.ok) {
        closeTraderAppModal();
        renderTradersTable();
        renderUsersTable();
        if (window.SkinexNavRefresh) window.SkinexNavRefresh();
        var note = document.getElementById("adminTradersNote");
        if (note) {
          note.style.color = "#86d759";
          note.textContent = action === "approve" ? "Заявка одобрена." : "Заявка отклонена.";
        }
      } else if (traderAppModalNote) {
        traderAppModalNote.style.color = "#f87171";
        traderAppModalNote.textContent = r.message || "Не удалось выполнить действие.";
      }
    });
  }
  if (traderAppApproveBtn) {
    traderAppApproveBtn.addEventListener("click", function () {
      runTraderAppDecision("approve");
    });
  }
  if (traderAppRejectBtn) {
    traderAppRejectBtn.addEventListener("click", function () {
      if (!window.confirm("Отказать по этой заявке?")) return;
      runTraderAppDecision("reject");
    });
  }

  function loadSiteForm() {
    if (!Site) return;
    var elL = document.getElementById("siteFormContactLead");
    if (!elL) return;
    var s = Site.get();
    elL.value = s.contactLead || "";
    document.getElementById("siteFormContactBullets").value = s.contactBullets || "";
    document.getElementById("siteFormFooterBrand").value = s.footerBrand || "";
    document.getElementById("siteFormFooterDisclaimer").value = s.footerDisclaimer || "";
    if (adminSiteFormNote) adminSiteFormNote.textContent = "";
  }

  function resetBannerForm() {
    if (bannerEditorId) bannerEditorId.value = "";
    if (bannerFieldBadge) bannerFieldBadge.value = "";
    if (bannerFieldTitle) bannerFieldTitle.value = "";
    if (bannerFieldMeta) bannerFieldMeta.value = "";
    if (bannerFieldImageUrl) bannerFieldImageUrl.value = "";
    if (bannerFieldLinkHref) bannerFieldLinkHref.value = "";
    if (bannerFieldSort) bannerFieldSort.value = "0";
    if (bannerFieldEnabled) bannerFieldEnabled.checked = true;
    if (bannerFormSubmitBtn) bannerFormSubmitBtn.textContent = "Добавить баннер";
    if (adminBannerFormNote) {
      adminBannerFormNote.textContent = "";
      adminBannerFormNote.style.color = "";
    }
  }

  function fillBannerForm(b) {
    if (!b) return resetBannerForm();
    if (bannerEditorId) bannerEditorId.value = b.id || "";
    if (bannerFieldBadge) bannerFieldBadge.value = b.badge || "";
    if (bannerFieldTitle) bannerFieldTitle.value = b.title || "";
    if (bannerFieldMeta) bannerFieldMeta.value = b.meta || "";
    if (bannerFieldImageUrl) bannerFieldImageUrl.value = b.imageUrl || "";
    if (bannerFieldLinkHref) bannerFieldLinkHref.value = b.linkHref || "";
    if (bannerFieldSort) bannerFieldSort.value = String(b.sortOrder != null ? b.sortOrder : 0);
    if (bannerFieldEnabled) bannerFieldEnabled.checked = b.enabled !== false;
    if (bannerFormSubmitBtn) bannerFormSubmitBtn.textContent = "Сохранить изменения";
    if (adminBannerFormNote) {
      adminBannerFormNote.textContent = "";
      adminBannerFormNote.style.color = "";
    }
  }

  function renderBannersTable(list) {
    if (!adminBannersBody || !HomeBanners) return;
    var banners = (list || HomeBanners.getBanners()).slice();
    banners.sort(function (a, b) {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return String(a.title || "").localeCompare(String(b.title || ""), "ru");
    });
    if (!banners.length) {
      adminBannersBody.innerHTML =
        '<tr><td colspan="4" class="admin-table-empty">Баннеров нет — добавьте первый в форме выше.</td></tr>';
      return;
    }
    adminBannersBody.innerHTML = "";
    banners.forEach(function (b) {
      var tr = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.textContent = String(b.sortOrder != null ? b.sortOrder : 0);
      var td1 = document.createElement("td");
      td1.textContent = b.title || "—";
      var td2 = document.createElement("td");
      td2.textContent = b.enabled !== false ? "Да" : "Нет";
      var td3 = document.createElement("td");
      td3.className = "admin-table-actions";
      var b1 = document.createElement("button");
      b1.type = "button";
      b1.className = "btn btn-outline btn-sm";
      b1.textContent = "Изменить";
      b1.setAttribute("data-banner-edit", b.id);
      var b2 = document.createElement("button");
      b2.type = "button";
      b2.className = "btn btn-outline btn-sm";
      b2.textContent = "Удалить";
      b2.setAttribute("data-banner-del", b.id);
      td3.appendChild(b1);
      td3.appendChild(document.createTextNode(" "));
      td3.appendChild(b2);
      tr.appendChild(td0);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      adminBannersBody.appendChild(tr);
    });
  }

  function loadBannersAdmin() {
    if (!HomeBanners) return;
    if (adminBannerFormNote) {
      adminBannerFormNote.textContent = "";
      adminBannerFormNote.style.color = "";
    }
    if (window.SKINEX_USE_SERVER_API && typeof HomeBanners.fetchAdmin === "function") {
      if (adminBannerFormNote) adminBannerFormNote.textContent = "Загрузка баннеров…";
      HomeBanners.fetchAdmin()
        .then(function (out) {
          renderBannersTable(out.banners);
          if (adminBannerFormNote) adminBannerFormNote.textContent = "";
        })
        .catch(function (err) {
          renderBannersTable(HomeBanners.getBanners());
          if (adminBannerFormNote) {
            adminBannerFormNote.style.color = "#f87171";
            adminBannerFormNote.textContent = err.message || "Ошибка загрузки (показан локальный кэш).";
          }
        });
      return;
    }
    renderBannersTable(HomeBanners.getBanners());
  }

  function readBannerFormPatch() {
    return {
      badge: bannerFieldBadge ? String(bannerFieldBadge.value || "") : "",
      title: bannerFieldTitle ? String(bannerFieldTitle.value || "").trim() : "",
      meta: bannerFieldMeta ? String(bannerFieldMeta.value || "") : "",
      imageUrl: bannerFieldImageUrl ? String(bannerFieldImageUrl.value || "").trim() : "",
      linkHref: bannerFieldLinkHref ? String(bannerFieldLinkHref.value || "").trim() : "",
      sortOrder: bannerFieldSort ? parseInt(String(bannerFieldSort.value || "0"), 10) : 0,
      enabled: bannerFieldEnabled ? !!bannerFieldEnabled.checked : true,
    };
  }

  function adminApiUrl(path) {
    var base = window.SKINEX_API_BASE != null ? String(window.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
    if (!path || path.charAt(0) !== "/") path = "/" + (path || "");
    return base + path;
  }

  function loadSteamTopupForm() {
    var note = adminSteamTopupFormNote;
    if (!adminSteamTopupForm) {
      loadSteamTopupDashboard();
      return;
    }
    if (note) {
      note.textContent = "";
      note.style.color = "";
    }
    if (!window.SKINEX_USE_SERVER_API) {
      if (note) {
        note.style.color = "#f87171";
        note.textContent = "Настройки доступны только при работе через сервер API.";
      }
      loadSteamTopupDashboard();
      return;
    }
    if (note) note.textContent = "Загрузка…";
    fetch(adminApiUrl("/api/v1/admin/steam-topup-settings"), { credentials: "include" })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (r) {
        if (!r.res.ok || !r.data || !r.data.ok) {
          throw new Error((r.data && r.data.message) || "Нет доступа или ошибка сервера.");
        }
        var s = r.data.settings || {};
        var pct = document.getElementById("steamFormInstantPct");
        var price = document.getElementById("steamFormKeyPrice");
        var prof = document.getElementById("steamFormKeysProfitPct");
        if (pct) pct.value = s.instantCommissionPct != null ? s.instantCommissionPct : 7;
        if (price) price.value = s.keysPriceRub != null ? s.keysPriceRub : 156;
        if (prof) prof.value = s.keysClientProfitPct != null ? s.keysClientProfitPct : 10;
        if (note) note.textContent = "";
      })
      .catch(function (err) {
        if (note) {
          note.style.color = "#f87171";
          note.textContent = err.message || "Ошибка загрузки.";
        }
      })
      .finally(function () {
        loadSteamTopupDashboard();
      });
  }

  function toDatetimeLocal(ms) {
    var d = new Date(ms);
    function z(n) {
      return n < 10 ? "0" + n : String(n);
    }
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "T" + z(d.getHours()) + ":" + z(d.getMinutes());
  }

  function formatRubSteamDash(n) {
    var x = Math.round(Number(n) || 0);
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
  }

  function renderSteamDashboard(data) {
    var kpi = document.getElementById("steamDashKpi");
    var tbody = document.getElementById("steamDashTableBody");
    var badge = document.getElementById("steamDashRangeBadge");
    var sur = data.summary || {};
    var ins = sur.instant || {};
    var keys = sur.keys || {};
    var tot = sur.total || {};

    if (badge) {
      badge.textContent =
        "Период: " +
        new Date(data.fromMs).toLocaleString("ru-RU") +
        " — " +
        new Date(data.toMs).toLocaleString("ru-RU") +
        " · записей: " +
        (tot.count || 0);
    }

    function dashCard(lbl, val, hint) {
      return (
        '<div class="admin-dash-card"><span class="admin-dash-card-label">' +
        escapeHtml(lbl) +
        '</span><strong class="admin-dash-card-value">' +
        val +
        "</strong>" +
        (hint ? '<span class="admin-dash-card-hint">' + escapeHtml(hint) + "</span>" : "") +
        "</div>"
      );
    }

    if (kpi) {
      kpi.innerHTML =
        dashCard("Моментальное: событий", String(ins.count || 0), "Запросы к партнёру") +
        dashCard("Моментальное: сумма на сайте", formatRubSteamDash(ins.sumSiteRub || 0), "С учётом комиссии") +
        dashCard("Моментальное: на Steam", formatRubSteamDash(ins.sumSteamRub || 0), "К зачислению") +
        dashCard("Ключи: событий", String(keys.count || 0), "Переход в поддержку") +
        dashCard("Ключи: сумма на сайте", formatRubSteamDash(keys.sumSiteRub || 0), "Расчёт при клике") +
        dashCard("Ключи: оценка Steam", formatRubSteamDash(keys.sumSteamRub || 0), "По % профита") +
        dashCard("Всего: на сайте", formatRubSteamDash(tot.sumSiteRub || 0), "") +
        dashCard("Всего: на Steam (оценка)", formatRubSteamDash(tot.sumSteamRub || 0), "");
    }

    var rows = data.rows || [];
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="admin-dash-table-empty">Нет записей за выбранный период.</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map(function (ev) {
        var dt = new Date(ev.createdAt).toLocaleString("ru-RU");
        var m = ev.method === "keys" ? "Ключи" : "Моментальное";
        var ref = String(ev.steamRef || "").trim();
        if (ref.length > 48) ref = ref.slice(0, 45) + "…";
        var kc = ev.keyCount != null ? String(ev.keyCount) : "—";
        var okc = ev.partnerOk === true ? "да" : ev.partnerOk === false ? "нет" : "—";
        var tx = String(ev.partnerTxId || "").trim() || "—";
        return (
          "<tr><td>" +
          escapeHtml(dt) +
          "</td><td>" +
          escapeHtml(m) +
          "</td><td>" +
          escapeHtml(ref) +
          "</td><td>" +
          escapeHtml(kc) +
          "</td><td>" +
          escapeHtml(formatRubSteamDash(ev.amountSteamRub)) +
          "</td><td>" +
          escapeHtml(formatRubSteamDash(ev.amountSiteRub)) +
          "</td><td>" +
          escapeHtml(tx) +
          "</td><td>" +
          escapeHtml(okc) +
          "</td></tr>"
        );
      })
      .join("");
  }

  function loadSteamTopupDashboard() {
    var kpi = document.getElementById("steamDashKpi");
    var tbody = document.getElementById("steamDashTableBody");
    var note = document.getElementById("steamDashNote");
    var fromInp = document.getElementById("steamDashFrom");
    var toInp = document.getElementById("steamDashTo");
    var methodSel = document.getElementById("steamDashMethod");
    if (!fromInp || !toInp || !methodSel) return;
    if (note) {
      note.textContent = "";
      note.style.color = "";
    }
    var now = Date.now();
    if (!String(fromInp.value || "").trim()) fromInp.value = toDatetimeLocal(now - 30 * 86400000);
    if (!String(toInp.value || "").trim()) toInp.value = toDatetimeLocal(now);

    var fromMs = new Date(fromInp.value).getTime();
    var toMs = new Date(toInp.value).getTime();
    if (!isFinite(fromMs) || !isFinite(toMs)) {
      if (note) {
        note.style.color = "#f87171";
        note.textContent = "Укажите корректный период (дата и время).";
      }
      return;
    }
    if (fromMs > toMs) {
      var tmp = fromMs;
      fromMs = toMs;
      toMs = tmp;
      fromInp.value = toDatetimeLocal(fromMs);
      toInp.value = toDatetimeLocal(toMs);
    }

    if (!window.SKINEX_USE_SERVER_API) {
      if (kpi) kpi.innerHTML = "";
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="admin-dash-table-empty">Включите серверный API.</td></tr>';
      return;
    }

    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="admin-dash-table-empty">Загрузка…</td></tr>';

    var qs =
      "?from=" +
      fromMs +
      "&to=" +
      toMs +
      "&method=" +
      encodeURIComponent(methodSel.value || "all") +
      "&limit=250";
    fetch(adminApiUrl("/api/v1/admin/steam-topup-events" + qs), { credentials: "include" })
      .then(function (res) {
        return res.json().then(function (d) {
          return { res: res, d: d };
        });
      })
      .then(function (r) {
        if (!r.res.ok || !r.d || !r.d.ok) {
          throw new Error((r.d && r.d.message) || "Ошибка");
        }
        renderSteamDashboard(r.d);
      })
      .catch(function (err) {
        if (tbody) {
          tbody.innerHTML =
            '<tr><td colspan="8" class="admin-dash-table-empty">' + escapeHtml(err.message || "Ошибка") + "</td></tr>";
        }
        if (kpi) kpi.innerHTML = "";
      });
  }

  function exportBackupJson() {
    try {
      var payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        catalog: Cat.getCatalog(),
        taxonomy: Tax.getTaxonomy(),
        site: Site ? Site.get() : {},
        hints: Hints ? Hints.getHints() : [],
        orders: Acc && Acc.getOrders ? Acc.getOrders() : [],
        sidebarMeta:
          window.SkinexCatalogMeta && typeof window.SkinexCatalogMeta.getCollections === "function"
            ? {
                collections: window.SkinexCatalogMeta.getCollections(),
                categories: window.SkinexCatalogMeta.getCategories(),
              }
            : undefined,
        marketOffers:
          window.SkinexMarketOffers && typeof window.SkinexMarketOffers.listAllOffers === "function"
            ? window.SkinexMarketOffers.listAllOffers()
            : [],
        traderStats:
          window.SkinexMarketOffers && typeof window.SkinexMarketOffers.getAllTraderStats === "function"
            ? window.SkinexMarketOffers.getAllTraderStats()
            : {},
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "skinex-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(a.href);
      if (adminDashNote) {
        adminDashNote.style.color = "#86d759";
        adminDashNote.textContent = "Файл сохранён.";
      }
    } catch (e) {
      if (adminDashNote) {
        adminDashNote.style.color = "#f87171";
        adminDashNote.textContent = e.message || "Ошибка экспорта.";
      }
    }
  }

  btnExportBackup &&
    btnExportBackup.addEventListener("click", function () {
      exportBackupJson();
    });

  adminSiteForm &&
    adminSiteForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!Site) return;
      if (adminSiteFormNote) {
        adminSiteFormNote.textContent = "";
        adminSiteFormNote.style.color = "";
      }
      Site.save({
        contactLead: String(document.getElementById("siteFormContactLead").value || ""),
        contactBullets: String(document.getElementById("siteFormContactBullets").value || ""),
        footerBrand: String(document.getElementById("siteFormFooterBrand").value || ""),
        footerDisclaimer: String(document.getElementById("siteFormFooterDisclaimer").value || ""),
      });
      if (adminSiteFormNote) {
        adminSiteFormNote.style.color = "#86d759";
        adminSiteFormNote.textContent = "Сохранено. Обновите главную и другие страницы, чтобы увидеть тексты.";
      }
    });

  bannerFormResetBtn &&
    bannerFormResetBtn.addEventListener("click", function () {
      resetBannerForm();
    });

  adminBannersBody &&
    adminBannersBody.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!HomeBanners || !(t instanceof HTMLElement)) return;
      var editId = t.getAttribute("data-banner-edit");
      if (editId) {
        var found = HomeBanners.getBanners().find(function (x) {
          return String(x.id) === String(editId);
        });
        if (found) {
          fillBannerForm(found);
          if (bannerFieldTitle) bannerFieldTitle.focus();
        }
        return;
      }
      var delId = t.getAttribute("data-banner-del");
      if (delId) {
        if (!window.confirm("Удалить этот баннер?")) return;
        if (adminBannerFormNote) {
          adminBannerFormNote.textContent = "";
          adminBannerFormNote.style.color = "";
        }
        HomeBanners.removeBanner(delId)
          .then(function () {
            resetBannerForm();
            loadBannersAdmin();
            if (adminBannerFormNote) {
              adminBannerFormNote.style.color = "#86d759";
              adminBannerFormNote.textContent = "Баннер удалён. Обновите главную.";
            }
          })
          .catch(function (err) {
            if (adminBannerFormNote) {
              adminBannerFormNote.style.color = "#f87171";
              adminBannerFormNote.textContent = err.message || "Ошибка удаления.";
            }
          });
      }
    });

  adminBannerForm &&
    adminBannerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!HomeBanners) return;
      if (adminBannerFormNote) {
        adminBannerFormNote.textContent = "";
        adminBannerFormNote.style.color = "";
      }
      var patch = readBannerFormPatch();
      if (!patch.title) {
        if (adminBannerFormNote) {
          adminBannerFormNote.style.color = "#f87171";
          adminBannerFormNote.textContent = "Укажите заголовок баннера.";
        }
        return;
      }
      if (!isFinite(patch.sortOrder)) patch.sortOrder = 0;
      var editId = bannerEditorId ? String(bannerEditorId.value || "").trim() : "";
      var promise = editId
        ? HomeBanners.updateBanner(editId, patch)
        : HomeBanners.createBanner(patch);
      promise
        .then(function () {
          resetBannerForm();
          loadBannersAdmin();
          if (adminBannerFormNote) {
            adminBannerFormNote.style.color = "#86d759";
            adminBannerFormNote.textContent = "Сохранено. Обновите главную, чтобы увидеть карусель.";
          }
        })
        .catch(function (err) {
          if (adminBannerFormNote) {
            adminBannerFormNote.style.color = "#f87171";
            adminBannerFormNote.textContent = err.message || "Ошибка сохранения.";
          }
        });
    });

  var adminCatalogImportForm = document.getElementById("adminCatalogImportForm");
  var catalogImportJson = document.getElementById("catalogImportJson");
  var catalogImportNote = document.getElementById("catalogImportNote");

  function refreshCatalogFromServer() {
    if (!window.SKINEX_USE_SERVER_API || typeof fetch !== "function") return Promise.resolve();
    return fetch(adminApiUrl("/api/v1/catalog"), { credentials: "include" })
      .then(function (res) {
        return res.json();
      })
      .then(function (list) {
        if (Array.isArray(list) && Cat) {
          Cat.saveCatalog(list);
        }
      });
  }

  function importCatalogLocal(payloads) {
    var list = Cat.getCatalog().slice();
    var saved = 0;
    payloads.forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      var name = String(raw.name || raw.steam_market_hash_name || "").trim();
      if (!name) return;
      var id = String(raw.id || "").trim() || newId();
      var rarity = String(raw.rarity || "mythical").toLowerCase();
      if (rarity.indexOf("arcana") >= 0) rarity = "arcana";
      else if (rarity.indexOf("immortal") >= 0) rarity = "immortal";
      else if (rarity.indexOf("mythical") >= 0) rarity = "mythical";
      else if (["arcana", "immortal", "mythical"].indexOf(rarity) < 0) rarity = "mythical";
      var iconLarge = String(raw.icon_url_large || raw.iconUrlLarge || "").trim();
      var steamHash = String(raw.steam_market_hash_name || raw.steamMarketHashName || name).trim();
      var item = Object.assign({}, raw, {
        id: id,
        name: name,
        hero: String(raw.hero || "").trim(),
        rarity: rarity,
        price: Math.max(0, Math.round(Number(raw.price) || 0)),
        icon: String(raw.icon || "📦").slice(0, 8),
        steam_market_hash_name: steamHash,
        steamMarketHashName: steamHash,
        icon_url_large: iconLarge,
        iconUrlLarge: iconLarge,
        collectionId: String(raw.collectionId || "general"),
        category: String(raw.category || "tradeable"),
        traderListingsAllowed: raw.traderListingsAllowed !== false,
      });
      var idx = list.findIndex(function (x) {
        return String(x.id) === String(id);
      });
      if (idx >= 0) list[idx] = item;
      else list.push(item);
      saved++;
    });
    Cat.saveCatalog(list);
    return saved;
  }

  adminCatalogImportForm &&
    adminCatalogImportForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (catalogImportNote) {
        catalogImportNote.textContent = "";
        catalogImportNote.style.color = "";
      }
      var rawText = catalogImportJson ? String(catalogImportJson.value || "").trim() : "";
      if (!rawText) {
        if (catalogImportNote) {
          catalogImportNote.style.color = "#f87171";
          catalogImportNote.textContent = "Вставьте JSON.";
        }
        return;
      }
      var parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (err) {
        if (catalogImportNote) {
          catalogImportNote.style.color = "#f87171";
          catalogImportNote.textContent = "Некорректный JSON: " + (err.message || "");
        }
        return;
      }
      var payloads = Array.isArray(parsed) ? parsed : [parsed];
      if (window.SKINEX_USE_SERVER_API && typeof fetch === "function") {
        if (catalogImportNote) catalogImportNote.textContent = "Импорт…";
        fetch(adminApiUrl("/api/v1/admin/catalog/import"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloads),
        })
          .then(function (res) {
            return res.json().then(function (data) {
              return { res: res, data: data };
            });
          })
          .then(function (r) {
            if (!r.res.ok || !r.data || !r.data.ok) {
              throw new Error((r.data && r.data.message) || "Ошибка импорта.");
            }
            return refreshCatalogFromServer().then(function () {
              return r.data;
            });
          })
          .then(function (data) {
            if (catalogImportJson) catalogImportJson.value = "";
            renderTable();
            renderDashboard();
            if (catalogImportNote) {
              catalogImportNote.style.color = "#86d759";
              var errN = (data.errors && data.errors.length) || 0;
              catalogImportNote.textContent =
                "Импортировано: " +
                (data.saved || 0) +
                (errN ? ". Ошибок: " + errN : "") +
                ". Обновите главную.";
            }
          })
          .catch(function (err) {
            if (catalogImportNote) {
              catalogImportNote.style.color = "#f87171";
              catalogImportNote.textContent = err.message || "Ошибка.";
            }
          });
        return;
      }
      var n = importCatalogLocal(payloads);
      if (catalogImportJson) catalogImportJson.value = "";
      renderTable();
      renderDashboard();
      if (catalogImportNote) {
        catalogImportNote.style.color = "#86d759";
        catalogImportNote.textContent = "Импортировано локально: " + n + ". Обновите главную.";
      }
    });

  adminSteamTopupForm &&
    adminSteamTopupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = adminSteamTopupFormNote;
      if (note) {
        note.textContent = "";
        note.style.color = "";
      }
      if (!window.SKINEX_USE_SERVER_API) {
        if (note) {
          note.style.color = "#f87171";
          note.textContent = "Включите серверный API.";
        }
        return;
      }
      var instantPct = parseFloat(String(document.getElementById("steamFormInstantPct").value || "0"));
      var keyPrice = parseInt(String(document.getElementById("steamFormKeyPrice").value || "0"), 10);
      var profitPct = parseFloat(String(document.getElementById("steamFormKeysProfitPct").value || "0"));
      if (!isFinite(instantPct) || instantPct < 0 || instantPct > 100) {
        if (note) {
          note.style.color = "#f87171";
          note.textContent = "Комиссия: число от 0 до 100.";
        }
        return;
      }
      if (!isFinite(keyPrice) || keyPrice < 1) {
        if (note) {
          note.style.color = "#f87171";
          note.textContent = "Цена ключа: целое число от 1.";
        }
        return;
      }
      if (!isFinite(profitPct) || profitPct < 0 || profitPct > 500) {
        if (note) {
          note.style.color = "#f87171";
          note.textContent = "Профит: число от 0 до 500.";
        }
        return;
      }
      fetch(adminApiUrl("/api/v1/admin/steam-topup-settings"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instantCommissionPct: instantPct,
          keysPriceRub: keyPrice,
          keysClientProfitPct: profitPct,
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          });
        })
        .then(function (r) {
          if (!r.res.ok || !r.data || !r.data.ok) {
            throw new Error((r.data && r.data.message) || "Ошибка сохранения.");
          }
          if (note) {
            note.style.color = "#86d759";
            note.textContent = "Сохранено. Обновите страницу пополнения Steam.";
          }
          loadSteamTopupDashboard();
        })
        .catch(function (err) {
          if (note) {
            note.style.color = "#f87171";
            note.textContent = err.message || "Ошибка сети.";
          }
        });
    });

  var steamDashApply = document.getElementById("steamDashApply");
  steamDashApply &&
    steamDashApply.addEventListener("click", function () {
      loadSteamTopupDashboard();
    });

  function refreshAuthUI() {
    var ok = Auth.isLoggedIn();
    if (loginBlock) loginBlock.hidden = ok;
    if (panelBlock) panelBlock.hidden = !ok;
    if (ok) {
      syncAdminTabButtons();
      renderTaxonomyLists();
      renderSidebarMetaTables();
      renderTable();
      renderUsersTable();
      renderTradersTable();
      renderMarketTable();
      restoreAdminTab();
      tryOpenTraderAppFromUrl();
    } else {
      if (tableBody) tableBody.innerHTML = "";
      var ub = document.getElementById("adminUsersBody");
      if (ub) ub.innerHTML = "";
      var tb = document.getElementById("adminTradersBody");
      if (tb) tb.innerHTML = "";
      var ob = document.getElementById("adminOrdersBody");
      if (ob) ob.innerHTML = "";
      if (adminDashBoard) adminDashBoard.innerHTML = "";
    }
  }

  function openItemModal(item) {
    if (!itemModal || !itemForm) return;
    itemForm.reset();
    if (itemFormNote) itemFormNote.textContent = "";
    fillTaxonomySelects(item && item.hero, item && item.itemType);
    fillCatalogMetaSelects(
      item && item.collectionId ? item.collectionId : "general",
      item && item.category ? item.category : "tradeable",
    );

    var editId = document.getElementById("fieldEditId");
    var fid = document.getElementById("fieldId");
    if (item) {
      if (editId) editId.value = item.id;
      if (fid) {
        fid.value = item.id;
        fid.readOnly = true;
      }
      document.getElementById("fieldName").value = item.name || "";
      document.getElementById("fieldHeroSelect").value = item.hero || "";
      document.getElementById("fieldItemTypeSelect").value =
        item.itemType || Tax.defaultItemTypeFromRarity(item.rarity || "mythical");
      document.getElementById("fieldRarity").value = item.rarity || "mythical";
      document.getElementById("fieldPrice").value = Number(item.price) || 0;
      document.getElementById("fieldIcon").value = item.icon || "📦";
      var fSteam = document.getElementById("fieldSteamMarketHashName");
      var fIcon = document.getElementById("fieldIconUrlLarge");
      if (fSteam) fSteam.value = item.steam_market_hash_name || item.steamMarketHashName || "";
      if (fIcon) fIcon.value = item.icon_url_large || item.iconUrlLarge || "";
      document.getElementById("fieldImageUrl").value = item.imageUrl || "";
      document.getElementById("fieldVideoUrl").value = item.videoUrl || "";
      document.getElementById("fieldDescription").value = item.description || "";
      var det = Array.isArray(item.details) ? item.details.join("\n") : "";
      document.getElementById("fieldDetailsText").value = det;
      var trLot = document.getElementById("fieldTraderListingsAllowed");
      if (trLot) trLot.checked = item.traderListingsAllowed !== false;
      document.getElementById("itemModalTitle").textContent = "Редактирование";
    } else {
      if (editId) editId.value = "";
      if (fid) {
        fid.value = "";
        fid.readOnly = false;
      }
      document.getElementById("fieldRarity").value = "immortal";
      document.getElementById("fieldIcon").value = "📦";
      var trLotNew = document.getElementById("fieldTraderListingsAllowed");
      if (trLotNew) trLotNew.checked = true;
      document.getElementById("itemModalTitle").textContent = "Новый сет";
    }
    itemModal.classList.add("is-open");
    itemModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeItemModal() {
    if (!itemModal) return;
    itemModal.classList.remove("is-open");
    itemModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function renderTable() {
    if (!tableBody) return;
    var list = Cat.getCatalog();
    if (!list.length) {
      tableBody.innerHTML =
        '<tr><td colspan="9" class="admin-table-empty">Каталог пуст. Добавьте сет или сбросьте к умолчанию.</td></tr>';
      return;
    }
    tableBody.innerHTML = list
      .map(function (it) {
        var steamIcon = String(it.icon_url_large || it.iconUrlLarge || "").trim();
        var img = validHttp(it.imageUrl);
        var vid = validHttp(it.videoUrl);
        var media = steamIcon ? "STEAM" : img ? "IMG" : vid ? "VIDEO" : "—";
        var itt = it.itemType || Tax.defaultItemTypeFromRarity(it.rarity);
        return (
          "<tr>" +
          "<td><code>" +
          escapeHtml(String(it.id).slice(0, 12)) +
          "…</code></td>" +
          "<td>" +
          escapeHtml(it.name) +
          "</td>" +
          "<td>" +
          escapeHtml(it.hero) +
          "</td>" +
          "<td>" +
          escapeHtml(itt) +
          "</td>" +
          "<td>" +
          escapeHtml(it.rarity) +
          "</td>" +
          "<td>" +
          escapeHtml(formatPrice(it.price)) +
          "</td>" +
          "<td>" +
          (it.traderListingsAllowed === false ? "Нет" : "Да") +
          "</td>" +
          "<td>" +
          media +
          "</td>" +
          '<td class="admin-table-actions"><button type="button" class="btn btn-outline btn-sm admin-edit" data-item-id="' +
          encodeURIComponent(String(it.id)) +
          '">Изменить</button> ' +
          '<button type="button" class="btn btn-outline btn-sm admin-del" data-item-id="' +
          encodeURIComponent(String(it.id)) +
          '">Удалить</button></td>' +
          "</tr>"
        );
      })
      .join("");

    tableBody.querySelectorAll(".admin-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = decodeURIComponent(btn.getAttribute("data-item-id") || "");
        var it = Cat.getCatalog().find(function (x) {
          return String(x.id) === String(id);
        });
        if (it) openItemModal(it);
      });
    });
    tableBody.querySelectorAll(".admin-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = decodeURIComponent(btn.getAttribute("data-item-id") || "");
        if (!confirm("Удалить этот сет из каталога?")) return;
        var next = Cat.getCatalog().filter(function (x) {
          return String(x.id) !== String(id);
        });
        Cat.saveCatalog(next);
        if (window.SKINEX_USE_SERVER_API && window.fetch) {
          var base = window.SKINEX_API_BASE != null ? String(window.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
          var delUrl = base + "/api/v1/catalog/" + encodeURIComponent(String(id));
          window.fetch(delUrl, { method: "DELETE", credentials: "include" }).catch(function () {});
        }
        if (globalNote) {
          globalNote.textContent = "Сет удалён. Обновите витрину на главной.";
          globalNote.style.color = "#86d759";
        }
        renderTable();
        renderDashboard();
      });
    });
  }

  function normalizeItemFromForm() {
    var editIdEl = document.getElementById("fieldEditId");
    var fid = document.getElementById("fieldId");
    var name = String(document.getElementById("fieldName").value || "").trim();
    var hero = String(document.getElementById("fieldHeroSelect").value || "").trim();
    var itemType = String(document.getElementById("fieldItemTypeSelect").value || "").trim();
    var rarity = String(document.getElementById("fieldRarity").value || "mythical");
    var price = Math.max(0, Math.floor(Number(document.getElementById("fieldPrice").value) || 0));
    var icon = String(document.getElementById("fieldIcon").value || "").trim() || "📦";
    var steamMarketHashName = String(
      (document.getElementById("fieldSteamMarketHashName") &&
        document.getElementById("fieldSteamMarketHashName").value) ||
        "",
    ).trim();
    var iconUrlLarge = String(
      (document.getElementById("fieldIconUrlLarge") && document.getElementById("fieldIconUrlLarge").value) || "",
    ).trim();
    var imageUrl = validHttp(document.getElementById("fieldImageUrl").value);
    var videoUrl = validHttp(document.getElementById("fieldVideoUrl").value);
    var description = String(document.getElementById("fieldDescription").value || "").trim();
    var detailsRaw = String(document.getElementById("fieldDetailsText").value || "");
    var details = detailsRaw
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);

    var idExisting = editIdEl && editIdEl.value ? String(editIdEl.value).trim() : "";
    var idForm = fid ? String(fid.value || "").trim() : "";
    var id = idExisting || idForm || newId();

    if (!name) throw new Error("Укажите название.");
    if (!hero) throw new Error("Выберите героя из списка.");
    if (!itemType) throw new Error("Выберите тип предмета из списка.");
    if (["arcana", "immortal", "mythical"].indexOf(rarity) < 0) rarity = "mythical";

    var collectionId = String(document.getElementById("fieldCollectionSelect").value || "").trim() || "general";
    var category = String(document.getElementById("fieldCategorySelect").value || "").trim() || "tradeable";
    var traderListingsAllowed = true;
    var trLotEl = document.getElementById("fieldTraderListingsAllowed");
    if (trLotEl) traderListingsAllowed = !!trLotEl.checked;

    return {
      id: id,
      name: name,
      hero: hero,
      itemType: itemType,
      rarity: rarity,
      price: price,
      icon: icon.slice(0, 8),
      steam_market_hash_name: steamMarketHashName || name,
      steamMarketHashName: steamMarketHashName || name,
      icon_url_large: iconUrlLarge,
      iconUrlLarge: iconUrlLarge,
      imageUrl: imageUrl || "",
      videoUrl: videoUrl || "",
      description: description,
      details: details,
      collectionId: collectionId,
      category: category,
      traderListingsAllowed: traderListingsAllowed,
    };
  }

  loginForm &&
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (loginError) loginError.textContent = "";
      var fd = new FormData(loginForm);
      var email = fd.get("email");
      var pw = fd.get("password");
      var lp = Auth.login(email, pw);
      var done = function (ok) {
        if (ok) {
          refreshAuthUI();
          loginForm.reset();
          if (window.SkinexNavRefresh) window.SkinexNavRefresh();
        } else if (loginError) {
          loginError.textContent = "Неверный email или пароль.";
        }
      };
      if (lp && typeof lp.then === "function") {
        lp.then(function (r) {
          done(r && r.ok);
        });
      } else {
        done(lp && lp.ok);
      }
    });

  btnAdd &&
    btnAdd.addEventListener("click", function () {
      if (!Auth.isLoggedIn()) return;
      openItemModal(null);
    });

  btnReset &&
    btnReset.addEventListener("click", function () {
      if (!Auth.isLoggedIn()) return;
      if (!confirm("Сбросить каталог к исходному из data.js? Все правки админа пропадут.")) return;
      Cat.resetCatalog();
      if (globalNote) {
        globalNote.textContent = "Каталог сброшен к значениям по умолчанию.";
        globalNote.style.color = "#86d759";
      }
      renderTaxonomyLists();
      renderTable();
      renderDashboard();
    });

  heroTaxAdd &&
    heroTaxAdd.addEventListener("click", function () {
      var v = String(heroTaxInput && heroTaxInput.value ? heroTaxInput.value : "").trim();
      if (!v) return;
      var li = document.createElement("li");
      li.className = "admin-taxonomy-li";
      var span = document.createElement("span");
      span.textContent = v;
      li.appendChild(span);
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "admin-tax-remove";
      rm.textContent = "×";
      rm.addEventListener("click", function () {
        li.remove();
      });
      li.appendChild(rm);
      heroTaxList.appendChild(li);
      if (heroTaxInput) heroTaxInput.value = "";
    });

  itemTypeTaxAdd &&
    itemTypeTaxAdd.addEventListener("click", function () {
      var v = String(itemTypeTaxInput && itemTypeTaxInput.value ? itemTypeTaxInput.value : "").trim();
      if (!v) return;
      var li = document.createElement("li");
      li.className = "admin-taxonomy-li";
      var span = document.createElement("span");
      span.textContent = v;
      li.appendChild(span);
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "admin-tax-remove";
      rm.textContent = "×";
      rm.addEventListener("click", function () {
        li.remove();
      });
      li.appendChild(rm);
      itemTypeTaxList.appendChild(li);
      if (itemTypeTaxInput) itemTypeTaxInput.value = "";
    });

  btnSaveTaxonomy &&
    btnSaveTaxonomy.addEventListener("click", function () {
      if (taxonomyNote) {
        taxonomyNote.textContent = "";
        taxonomyNote.style.color = "";
      }
      try {
        var data = collectTaxonomyFromDom();
        Tax.saveTaxonomy(data);
        if (taxonomyNote) {
          taxonomyNote.style.color = "#86d759";
          taxonomyNote.textContent = "Справочники сохранены. Обновите главную страницу каталога.";
        }
        renderTaxonomyLists();
        renderDashboard();
      } catch (err) {
        if (taxonomyNote) {
          taxonomyNote.style.color = "#f87171";
          taxonomyNote.textContent = err.message || "Ошибка сохранения.";
        }
      }
    });

  itemForm &&
    itemForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (itemFormNote) {
        itemFormNote.textContent = "";
        itemFormNote.style.color = "";
      }
      var row;
      try {
        row = normalizeItemFromForm();
      } catch (err) {
        if (itemFormNote) {
          itemFormNote.style.color = "#f87171";
          itemFormNote.textContent = err.message || "Ошибка.";
        }
        return;
      }

      var list = Cat.getCatalog().slice();
      var editId = document.getElementById("fieldEditId").value;
      var idx = list.findIndex(function (x) {
        return String(x.id) === String(row.id);
      });

      if (editId) {
        if (idx < 0) {
          if (itemFormNote) {
            itemFormNote.style.color = "#f87171";
            itemFormNote.textContent = "Запись не найдена.";
          }
          return;
        }
        list[idx] = Object.assign({}, list[idx], row);
      } else {
        if (idx >= 0) {
          if (itemFormNote) {
            itemFormNote.style.color = "#f87171";
            itemFormNote.textContent = "ID уже занят. Очистите поле ID для автогенерации.";
          }
          return;
        }
        list.push(row);
      }

      Cat.saveCatalog(list);
      var savedItem = list.find(function (x) {
        return String(x.id) === String(row.id);
      });
      if (window.SKINEX_USE_SERVER_API && savedItem && window.fetch) {
        var base = window.SKINEX_API_BASE != null ? String(window.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
        var putUrl = base + "/api/v1/catalog/" + encodeURIComponent(String(savedItem.id));
        window
          .fetch(putUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(savedItem),
          })
          .catch(function () {});
      }
      if (itemFormNote) {
        itemFormNote.style.color = "#86d759";
        itemFormNote.textContent = "Сохранено.";
      }
      if (globalNote) {
        globalNote.textContent = "Каталог обновлён. Откройте главную страницу, чтобы увидеть изменения.";
        globalNote.style.color = "#86d759";
      }
      closeItemModal();
      renderTaxonomyLists();
      renderTable();
      renderDashboard();
    });

  itemModalClose && itemModalClose.addEventListener("click", closeItemModal);
  itemModalBackdrop && itemModalBackdrop.addEventListener("click", closeItemModal);
  itemModalCancel && itemModalCancel.addEventListener("click", closeItemModal);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeItemModal();
  });

  refreshAuthUI();
})();
