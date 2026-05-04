(function () {
  var Auth = window.SkinexAuth;
  if (Auth && Auth.isAdmin()) {
    window.location.replace("admin.html");
    return;
  }
  if (!Auth || !Auth.isClient()) {
    window.location.replace("auth.html?next=" + encodeURIComponent("account.html"));
    return;
  }

  var U = window.SkinexUtils;
  var A = window.SkinexAccount;
  if (!A) return;

  var balanceEl = document.getElementById("balanceValue");
  var ordersActive = document.getElementById("ordersActive");
  var ordersDone = document.getElementById("ordersDone");
  var traderSection = document.getElementById("trader-deals");
  var ordersTraderActive = document.getElementById("ordersTraderActive");
  var ordersTraderDone = document.getElementById("ordersTraderDone");

  var DEAL_PIPELINE = [
    { k: "CREATED", short: "Оплачен" },
    { k: "ASSIGNED", short: "В работе" },
    { k: "WAITING_PERIOD", short: "30 дн." },
    { k: "READY_TO_DELIVER", short: "К отправке" },
    { k: "DELIVERED", short: "У клиента" },
    { k: "COMPLETED", short: "Закрыт" },
  ];

  var TRADER_BTN = {
    CREATED: "Взять заказ",
    ASSIGNED: "Зафиксировать ожидание (30 дн.)",
    WAITING_PERIOD: "Период прошёл — готов к отправке",
    READY_TO_DELIVER: "Подарок отправлен",
  };
  var displayNameInput = document.getElementById("displayName");
  var nameForm = document.getElementById("nameForm");
  var nameNote = document.getElementById("nameNote");
  var modal = document.getElementById("topupModal");
  var openTopup = document.getElementById("openTopup");
  var closeTopup = document.getElementById("closeTopup");
  var topupBackdrop = document.getElementById("topupBackdrop");
  var topupForm = document.getElementById("topupForm");
  var topupNote = document.getElementById("topupNote");
  var topupSubmitBtn = document.getElementById("topupSubmitBtn");
  var topupModalBalance = document.getElementById("topupModalBalance");
  var topupYooSteps = document.getElementById("topupYooSteps");
  var topupAmountInput = document.getElementById("topupAmount");
  var useYooKassaTopup = false;

  var traderApplyModal = document.getElementById("traderApplyModal");
  var traderApplyBackdrop = document.getElementById("traderApplyBackdrop");
  var closeTraderApplyBtn = document.getElementById("closeTraderApply");
  var btnOpenTraderApply = document.getElementById("openTraderApply");
  var traderApplyForm = document.getElementById("traderApplyForm");
  var traderApplyFormNote = document.getElementById("traderApplyFormNote");

  function apiUrl(p) {
    var base = window.SKINEX_API_BASE != null ? String(window.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
    if (!p || p.charAt(0) !== "/") p = "/" + (p || "");
    return base + p;
  }

  function updateBalanceHints() {
    var hint = document.getElementById("accountBalanceHint");
    var mh = document.getElementById("topupModalHint");
    if (window.SKINEX_USE_SERVER_API) {
      if (hint) {
        var hintLong = useYooKassaTopup
          ? "Баланс на сервере. Пополнение — через ЮKassa (безопасная оплата)."
          : "Баланс на сервере. Пополнение через ЮKassa. Если оплата не открывается — обновите страницу и проверьте, что запущен API (npm start в папке server).";
        hint.textContent = useYooKassaTopup
          ? "ЮKassa · баланс на сервере. Списание при заказах."
          : "ЮKassa: при ошибке оплаты — npm start в папке server.";
        hint.title = hintLong;
      }
      if (mh) {
        mh.textContent =
          "После нажатия кнопки вы перейдёте на страницу ЮKassa. После успешной оплаты откроется кабинет с обновлённым балансом.";
      }
      if (topupYooSteps) topupYooSteps.hidden = false;
      if (topupSubmitBtn) topupSubmitBtn.textContent = "Перейти к оплате в ЮKassa";
    } else {
      if (hint) {
        hint.textContent =
          "Списание при оплате заказов. Локальный режим — демо-зачисление только в этом браузере.";
        hint.title = "";
      }
      if (mh) mh.textContent = "Сумма будет добавлена к балансу только в этом браузере (без реальной оплаты).";
      if (topupYooSteps) topupYooSteps.hidden = true;
      if (topupSubmitBtn) topupSubmitBtn.textContent = "Пополнить (демо)";
    }
  }

  function syncBalanceFromServer() {
    if (!window.SKINEX_USE_SERVER_API || !Auth || !Auth.isLoggedIn || !Auth.isLoggedIn()) {
      useYooKassaTopup = false;
      updateBalanceHints();
      return Promise.resolve(null);
    }
    return fetch(apiUrl("/api/v1/auth/me"), { credentials: "include" })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok && data.user && typeof data.user.balanceRub === "number" && A.setBalanceRub) {
          A.setBalanceRub(data.user.balanceRub);
        }
        if (data && data.ok && data.user && Auth.syncSessionFromServerUser) {
          Auth.syncSessionFromServerUser(data.user);
        }
        useYooKassaTopup = !!(data && data.yookassaTopup);
        updateBalanceHints();
        return data;
      })
      .catch(function () {
        useYooKassaTopup = false;
        updateBalanceHints();
        return null;
      });
  }

  function handleTopupReturn() {
    var params = new URLSearchParams(window.location.search);
    var topupId = params.get("topup");
    if (!topupId || !window.SKINEX_USE_SERVER_API) return Promise.resolve();
    return fetch(apiUrl("/api/v1/payments/yookassa/complete-check"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topupId: topupId }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        var url = new URL(window.location.href);
        url.searchParams.delete("topup");
        var next = url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState({}, "", next);
        if (data && data.ok && data.user && typeof data.user.balanceRub === "number" && A.setBalanceRub) {
          A.setBalanceRub(data.user.balanceRub);
        }
        var rm = document.getElementById("accountReturnMsg");
        if (rm) {
          if (data && data.ok) {
            rm.hidden = false;
            rm.textContent = data.already
              ? "Этот платёж уже был учтён ранее."
              : "Баланс пополнен на " + formatPrice(data.creditedRub || 0) + ".";
            rm.style.color = "var(--cs-stock, #86d759)";
          } else if (data && data.pending) {
            rm.hidden = false;
            rm.textContent = data.message || "Ожидаем подтверждение оплаты.";
            rm.style.color = "rgba(255, 200, 160, 0.95)";
          }
        }
        return data;
      })
      .catch(function () {});
  }

  function runInitialRender() {
    renderBalance();
    renderName();
    renderRoleNote();
    renderTraderApplyCard();
    renderIdentity();
    var sessPost = Auth.getSession();
    if (sessPost && sessPost.displayName && A.getProfile().displayName === "Пользователь") {
      A.updateDisplayName(sessPost.displayName);
      renderName();
    }
    if (window.SKINEX_USE_SERVER_API && A.fetchOrdersFromServer) {
      A.fetchOrdersFromServer().finally(function () {
        renderAccountStats();
        renderOrders();
      });
    } else {
      renderAccountStats();
      renderOrders();
    }
  }

  function formatPrice(n) {
    return U ? U.formatPrice(n) : String(n) + " ₽";
  }

  function escapeHtml(s) {
    return U ? U.escapeHtml(s) : String(s);
  }

  function formatWhen(ts) {
    if (!ts) return "—";
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(ts));
    } catch (e) {
      return String(ts);
    }
  }

  function isPlatformSellerLabel(lab) {
    var s = String(lab || "").trim();
    return s === "Skinex" || s === "Skinexs";
  }

  function renderBalance() {
    if (balanceEl) balanceEl.textContent = formatPrice(A.getProfile().balance);
  }

  function renderName() {
    if (displayNameInput) displayNameInput.value = A.getProfile().displayName;
  }

  function dealStatusCanon(st) {
    return A.migrateLegacyStatus ? A.migrateLegacyStatus(st) : String(st || "");
  }

  function dealPairHintHtml(o, perspective) {
    var did = A.getDealId ? A.getDealId(o) : String((o && o.id) || "");
    if (!did) return "";
    var p =
      perspective === "trader"
        ? "У покупателя тот же номер и статус — одна сделка в системе."
        : "Исполнитель (трейдер или площадка) видит ту же сделку по этому ID — статус общий.";
    return (
      '<p class="account-deal-pair-hint">ID сделки: <code>' +
      escapeHtml(did) +
      "</code>. " +
      escapeHtml(p) +
      "</p>"
    );
  }

  function statusPillClass(st) {
    var key = String(st || "CREATED").replace(/[^A-Z_]/g, "") || "CREATED";
    return "account-status-pill account-status-pill--" + key;
  }

  function buildDealTrackHtml(status) {
    var st = dealStatusCanon(status);
    if (st === "CANCELLED") {
      return (
        '<div class="deal-track deal-track--cancelled deal-track--compact" role="status">' +
        '<span class="deal-track-cancel-msg">Сделка отменена</span></div>'
      );
    }
    var idx = -1;
    for (var i = 0; i < DEAL_PIPELINE.length; i++) {
      if (DEAL_PIPELINE[i].k === st) {
        idx = i;
        break;
      }
    }
    if (idx < 0) idx = 0;
    var parts = ['<div class="deal-track deal-track--compact" aria-label="Этапы сделки">'];
    for (var j = 0; j < DEAL_PIPELINE.length; j++) {
      var p = DEAL_PIPELINE[j];
      var done = j < idx;
      var cur = j === idx;
      var cls = "deal-track-step";
      if (done) cls += " is-done";
      if (cur) cls += " is-current";
      if (!done && !cur) cls += " is-pending";
      var full = A.orderStatusLabel ? A.orderStatusLabel(p.k) : p.k;
      parts.push(
        '<div class="' +
          cls +
          '" role="listitem" title="' +
          escapeHtml(full) +
          '">' +
          '<span class="deal-track-dot" aria-hidden="true"></span>' +
          '<span class="deal-track-short">' +
          escapeHtml(p.short) +
          "</span>" +
          '<span class="deal-track-hint">' +
          escapeHtml(full) +
          "</span>" +
          "</div>",
      );
    }
    parts.push("</div>");
    return parts.join("");
  }

  function buildTraderRatingSection(o) {
    if (dealStatusCanon(o.status) !== "COMPLETED") return "";
    var traders = {};
    (o.items || []).forEach(function (line) {
      var te = String(line.traderEmail || "").trim().toLowerCase();
      if (!te) return;
      var label = line.sellerLabel ? String(line.sellerLabel) : te.split("@")[0];
      traders[te] = label;
    });
    var keys = Object.keys(traders);
    if (!keys.length) return "";
    var ratings = o.traderRatings && typeof o.traderRatings === "object" ? o.traderRatings : {};
    var unrated = keys.filter(function (te) {
      return ratings[te] == null;
    });
    var parts = ['<div class="account-trader-ratings">'];
    if (unrated.length) {
      parts.push('<p class="account-trader-ratings-title">Оцените трейдеров (1–5)</p>');
    }
    keys.forEach(function (te) {
      var nm = escapeHtml(traders[te]);
      var rdone = ratings[te];
      if (rdone != null) {
        parts.push('<p class="account-trader-rated">' + nm + ": оценка " + String(rdone) + "/5</p>");
      } else {
        parts.push(
          '<div class="account-trader-rate-row" data-order="' +
            escapeHtml(o.id) +
            '" data-trader="' +
            escapeHtml(te) +
            '">',
        );
        parts.push('<span class="account-trader-rate-name">' + nm + "</span>");
        parts.push('<span class="account-trader-stars" role="group">');
        for (var s = 1; s <= 5; s++) {
          parts.push(
            '<button type="button" class="account-star-btn" data-stars="' +
              s +
              '" aria-label="' +
              s +
              ' из 5">' +
              s +
              "</button>",
          );
        }
        parts.push("</span></div>");
      }
    });
    parts.push("</div>");
    return parts.join("");
  }

  function orderCard(o, allowComplete) {
    var itemsHtml = (o.items || [])
      .map(function (line) {
        var seller =
          line.sellerLabel && !isPlatformSellerLabel(line.sellerLabel)
            ? " · " + escapeHtml(line.sellerLabel)
            : "";
        return (
          "<li>" +
          escapeHtml(line.name) +
          " · " +
          escapeHtml(line.hero) +
          " — " +
          line.qty +
          " × " +
          formatPrice(line.unitPrice) +
          seller +
          "</li>"
        );
      })
      .join("");

    var ratingBlock = !allowComplete ? buildTraderRatingSection(o) : "";

    var stLabel = A.orderStatusLabel ? A.orderStatusLabel(o.status) : String(o.status || "");
    var stCanon = dealStatusCanon(o.status);
    var statusLine =
      "<p class=\"account-order-meta\">" +
      "Создан: " +
      escapeHtml(formatWhen(o.createdAt)) +
      (o.completedAt
        ? " · Завершён: " + escapeHtml(formatWhen(o.completedAt))
        : "") +
      "</p>";
    var canComplete =
      allowComplete && A.isOrderActive && A.isOrderActive(o) && stCanon === "DELIVERED";
    var btn = canComplete
      ? "<button type=\"button\" class=\"btn btn-outline account-complete-btn\" data-complete=\"" +
        escapeHtml(o.id) +
        "\">Подтвердить получение</button>"
      : "";
    var waitHint =
      allowComplete && stCanon !== "DELIVERED" && stCanon !== "CANCELLED" && stCanon !== "COMPLETED"
        ? '<p class="account-order-wait">Когда трейдер отправит подарок, появится кнопка подтверждения.</p>'
        : "";

    var numDisp = o.orderNumber != null ? String(o.orderNumber) : String(o.id).slice(0, 8) + "…";

    return (
      "<article class=\"account-order\" data-order-id=\"" +
      escapeHtml(o.id) +
      "\">" +
      "<div class=\"account-order-head\">" +
      "<span class=\"account-order-head-main\">" +
      "<span class=\"account-order-id\">№ " +
      escapeHtml(numDisp) +
      "</span>" +
      "<span class=\"" +
      statusPillClass(stCanon) +
      "\">" +
      escapeHtml(stLabel) +
      "</span>" +
      "</span>" +
      "<span class=\"account-order-total\">" +
      formatPrice(o.total) +
      "</span>" +
      "</div>" +
      dealPairHintHtml(o, "buyer") +
      buildDealTrackHtml(o.status) +
      statusLine +
      "<ul class=\"account-order-items\">" +
      itemsHtml +
      "</ul>" +
      waitHint +
      ratingBlock +
      btn +
      "</article>"
    );
  }

  function orderCardTrader(o) {
    var itemsHtml = (o.items || [])
      .map(function (line) {
        var seller =
          line.sellerLabel && !isPlatformSellerLabel(line.sellerLabel)
            ? " · " + escapeHtml(line.sellerLabel)
            : "";
        return (
          "<li>" +
          escapeHtml(line.name) +
          " · " +
          escapeHtml(line.hero) +
          " — " +
          line.qty +
          " × " +
          formatPrice(line.unitPrice) +
          seller +
          "</li>"
        );
      })
      .join("");
    var stCanon = dealStatusCanon(o.status);
    var stLabel = A.orderStatusLabel ? A.orderStatusLabel(o.status) : String(o.status || "");
    var buyer =
      escapeHtml(
        (o.buyerDisplayName || (o.buyerEmail ? String(o.buyerEmail).split("@")[0] : "—")) +
          (o.buyerEmail ? " · " + String(o.buyerEmail) : ""),
      );
    var numDisp = o.orderNumber != null ? String(o.orderNumber) : String(o.id).slice(0, 8) + "…";
    var canAdvance =
      Auth.isTrader &&
      Auth.isTrader() &&
      stCanon !== "CANCELLED" &&
      stCanon !== "COMPLETED" &&
      stCanon !== "DELIVERED" &&
      A.traderAdvanceOrder;
    var advBtn = canAdvance
      ? '<button type="button" class="btn-cs-cart account-trader-advance-btn" data-advance="' +
        escapeHtml(o.id) +
        '">' +
        escapeHtml(TRADER_BTN[stCanon] || "Следующий этап") +
        "</button>"
      : "";
    var hint =
      stCanon === "DELIVERED"
        ? '<p class="account-trader-wait-msg">Ожидаем подтверждение покупателя.</p>'
        : "";
    return (
      "<article class=\"account-order account-order--trader\" data-order-id=\"" +
      escapeHtml(o.id) +
      "\">" +
      "<div class=\"account-order-head\">" +
      "<span class=\"account-order-head-main\">" +
      "<span class=\"account-order-id\">№ " +
      escapeHtml(numDisp) +
      "</span>" +
      "<span class=\"" +
      statusPillClass(stCanon) +
      "\">" +
      escapeHtml(stLabel) +
      "</span>" +
      "</span>" +
      "<span class=\"account-order-total\">" +
      formatPrice(o.total) +
      "</span>" +
      "</div>" +
      dealPairHintHtml(o, "trader") +
      "<p class=\"account-order-buyer-ref\">Покупатель: " +
      buyer +
      "</p>" +
      buildDealTrackHtml(o.status) +
      '<p class="account-order-meta">Создан: ' +
      escapeHtml(formatWhen(o.createdAt)) +
      "</p>" +
      "<ul class=\"account-order-items\">" +
      itemsHtml +
      "</ul>" +
      advBtn +
      hint +
      "</article>"
    );
  }

  function renderAccountStats() {
    var grid = document.getElementById("accountStatsGrid");
    if (!grid) return;
    var all = A.getBuyerOrders ? A.getBuyerOrders() : A.getOrders();
    var active = all.filter(function (o) {
      return A.isOrderActive ? A.isOrderActive(o) : false;
    });
    var archived = all.filter(function (o) {
      var s = dealStatusCanon(o.status);
      return s === "COMPLETED" || s === "CANCELLED";
    });
    var sumAll = all.reduce(function (acc, o) {
      return acc + (Number(o.total) || 0);
    }, 0);
    grid.innerHTML =
      '<div class="account-stat-cell">' +
      '<span class="account-stat-value">' +
      String(all.length) +
      "</span>" +
      '<span class="account-stat-label">Заказов</span></div>' +
      '<div class="account-stat-cell">' +
      '<span class="account-stat-value">' +
      String(active.length) +
      "</span>" +
      '<span class="account-stat-label">Активных</span></div>' +
      '<div class="account-stat-cell">' +
      '<span class="account-stat-value">' +
      formatPrice(sumAll) +
      "</span>" +
      '<span class="account-stat-label">Оборот</span></div>' +
      '<div class="account-stat-cell account-stat-cell--muted">' +
      '<span class="account-stat-value">' +
      String(archived.length) +
      "</span>" +
      '<span class="account-stat-label">В архиве</span></div>';
  }

  function renderIdentity() {
    var dl = document.getElementById("accountIdentityDl");
    if (!dl || !Auth.getSession) return;
    var sess = Auth.getSession();
    if (!sess) return;
    var rows = [];
    if (sess.email) {
      rows.push(
        "<div><dt>Email</dt><dd>" + escapeHtml(String(sess.email)) + "</dd></div>",
      );
    }
    if (sess.steamId) {
      rows.push(
        "<div><dt>Steam ID</dt><dd><code>" + escapeHtml(String(sess.steamId)) + "</code></dd></div>",
      );
    }
    if (sess.authProvider === "steam") {
      rows.push(
        "<div><dt>Вход</dt><dd>через Steam</dd></div>",
      );
    }
    if (sess.role && sess.role !== "user") {
      rows.push(
        "<div><dt>Роль</dt><dd>" + escapeHtml(String(sess.role)) + "</dd></div>",
      );
    }
    if (!rows.length) {
      rows.push("<div><dt>Аккаунт</dt><dd>Данные сессии</dd></div>");
    }
    dl.innerHTML = rows.join("");
  }

  function renderOrders() {
    var all = A.getBuyerOrders ? A.getBuyerOrders() : A.getOrders();
    var active = all.filter(function (o) {
      return A.isOrderActive ? A.isOrderActive(o) : false;
    });
    var done = all.filter(function (o) {
      return dealStatusCanon(o.status) === "COMPLETED";
    });

    if (ordersActive) {
      ordersActive.innerHTML = active.length
        ? active.map(function (o) {
            return orderCard(o, true);
          }).join("")
        : "<p class=\"account-empty\">Нет активных заказов. <a href=\"index.html#catalog\">В каталог</a></p>";
    }
    if (ordersDone) {
      var cancelled = all.filter(function (o) {
        return dealStatusCanon(o.status) === "CANCELLED";
      });
      var doneHtml = done
        .map(function (o) {
          return orderCard(o, false);
        })
        .concat(
          cancelled.map(function (o) {
            return orderCard(o, false);
          }),
        );
      ordersDone.innerHTML = doneHtml.length
        ? doneHtml.join("")
        : "<p class=\"account-empty\">Архив пуст.</p>";
    }

    ordersActive &&
      ordersActive.querySelectorAll("[data-complete]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-complete");
          var r = A.completeOrder(id);
          function applyResult(ret) {
            if (ret && ret.ok) {
              renderOrders();
              renderBalance();
              renderAccountStats();
            } else if (window.alert) window.alert((ret && ret.message) || "Не удалось подтвердить.");
          }
          if (r && typeof r.then === "function") {
            r.then(applyResult).catch(function () {
              if (window.alert) window.alert("Ошибка сети.");
            });
          } else {
            applyResult(r);
          }
        });
      });

    if (ordersDone) {
      ordersDone.querySelectorAll(".account-star-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var row = btn.closest(".account-trader-rate-row");
          if (!row) return;
          var oid = row.getAttribute("data-order");
          var te = row.getAttribute("data-trader");
          var stars = Number(btn.getAttribute("data-stars"));
          if (!oid || !te || !A.rateTraderForCompletedOrder) return;
          var r = A.rateTraderForCompletedOrder(oid, te, stars);
          if (r.ok) renderOrders();
          else if (window.console && console.warn) console.warn(r.message || r);
        });
      });
    }

    if (Auth.isTrader && Auth.isTrader() && ordersTraderActive && ordersTraderDone && traderSection) {
      traderSection.hidden = false;
      var tro = A.getTraderOrders ? A.getTraderOrders() : [];
      var tActive = tro.filter(function (o) {
        return A.isOrderActive(o);
      });
      var tDone = tro.filter(function (o) {
        var s = dealStatusCanon(o.status);
        return s === "COMPLETED" || s === "CANCELLED";
      });
      ordersTraderActive.innerHTML = tActive.length
        ? tActive.map(orderCardTrader).join("")
        : '<p class="account-empty">Нет заказов в работе.</p>';
      ordersTraderDone.innerHTML = tDone.length
        ? tDone.map(orderCardTrader).join("")
        : '<p class="account-empty muted">Архив исполнения пуст.</p>';
      ordersTraderActive.querySelectorAll(".account-trader-advance-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-advance");
          var r = A.traderAdvanceOrder(id);
          function applyResult(ret) {
            if (ret && ret.ok) {
              renderOrders();
              renderAccountStats();
            } else if (window.alert) window.alert((ret && ret.message) || "Не удалось обновить статус.");
          }
          if (r && typeof r.then === "function") {
            r.then(applyResult).catch(function () {
              if (window.alert) window.alert("Ошибка сети.");
            });
          } else {
            applyResult(r);
          }
        });
      });
    } else if (traderSection) {
      traderSection.hidden = true;
    }
  }

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (topupNote) topupNote.textContent = "";
    if (topupModalBalance) topupModalBalance.textContent = formatPrice(A.getProfile().balance);
    if (topupAmountInput && !String(topupAmountInput.value || "").trim()) {
      topupAmountInput.value = "1000";
    }
    updateBalanceHints();
    if (topupAmountInput) {
      try {
        topupAmountInput.focus();
        topupAmountInput.select();
      } catch (e) {}
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!traderApplyModal || !traderApplyModal.classList.contains("is-open")) {
      document.body.classList.remove("modal-open");
    }
  }

  function openTraderApplyModal() {
    if (!traderApplyModal) return;
    traderApplyModal.classList.add("is-open");
    traderApplyModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (traderApplyFormNote) traderApplyFormNote.textContent = "";
  }

  function closeTraderApplyModal() {
    if (!traderApplyModal) return;
    traderApplyModal.classList.remove("is-open");
    traderApplyModal.setAttribute("aria-hidden", "true");
    if (!modal || !modal.classList.contains("is-open")) {
      document.body.classList.remove("modal-open");
    }
  }

  function renderTraderApplyCard() {
    var card = document.getElementById("accountTraderApplyCard");
    if (!card) return;
    var TA = window.SkinexTraderApplications;
    if (!Auth.isUser || !Auth.isUser() || !TA || typeof TA.hasPending !== "function") {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    TA.hasPending().then(function (pen) {
      var btn = document.getElementById("openTraderApply");
      var note = document.getElementById("traderApplyCardNote");
      if (btn) {
        btn.disabled = !!pen;
        btn.textContent = pen ? "Заявка на рассмотрении" : "Стать трейдером";
      }
      if (note) {
        note.hidden = !pen;
        note.textContent = pen ? "Ожидайте решения администратора." : "";
      }
    });
  }

  function renderRoleNote() {
    var el = document.getElementById("accountRoleNote");
    var pill = document.getElementById("accountRolePill");
    var navTrader = document.getElementById("accountNavTrader");
    var sess = Auth.getSession();
    var r = sess && sess.role;
    var pillText = { user: "Клиент", trader: "Трейдер", manager: "Менеджер" };
    if (pill) {
      if (r && pillText[r]) {
        pill.hidden = false;
        pill.textContent = pillText[r];
      } else {
        pill.hidden = true;
        pill.textContent = "";
      }
    }
    if (navTrader) {
      navTrader.hidden = !(Auth.isTrader && Auth.isTrader());
    }
    if (!el) return;
    if (r === "manager") {
      el.hidden = false;
      el.textContent =
        "Менеджер: тикеты — в «Поддержке». Здесь — баланс и заказы как у клиента.";
    } else if (r === "trader") {
      el.hidden = false;
      el.textContent =
        "Трейдер: лоты на карточке товара; в кабинете — исполнение заказов и ваши покупки.";
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }

  syncBalanceFromServer()
    .then(function () {
      return handleTopupReturn();
    })
    .finally(function () {
      runInitialRender();
    });

  if (nameForm && displayNameInput) {
    nameForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (nameNote) nameNote.textContent = "";
      var r = A.updateDisplayName(displayNameInput.value);
      if (nameNote) {
        nameNote.style.color = r.ok ? "var(--cs-stock, #86d759)" : "#f87171";
        nameNote.textContent = r.ok ? "Имя сохранено." : r.message || "Ошибка.";
      }
      if (r.ok) renderName();
    });
  }

  if (openTopup) {
    openTopup.addEventListener("click", function () {
      syncBalanceFromServer().finally(function () {
        openModal();
      });
    });
  }
  if (closeTopup) closeTopup.addEventListener("click", closeModal);
  if (topupBackdrop) topupBackdrop.addEventListener("click", closeModal);

  if (topupForm) {
    topupForm.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-topup-snap]") : null;
      if (!t || !topupForm.contains(t)) return;
      var v = Math.floor(Number(t.getAttribute("data-topup-snap")));
      if (!topupAmountInput || !isFinite(v) || v < 10) return;
      topupAmountInput.value = String(v);
      if (topupNote) {
        topupNote.textContent = "";
        topupNote.style.color = "";
      }
      try {
        topupAmountInput.focus();
      } catch (err) {}
    });
  }

  if (btnOpenTraderApply) {
    btnOpenTraderApply.addEventListener("click", function () {
      openTraderApplyModal();
    });
  }
  if (closeTraderApplyBtn) closeTraderApplyBtn.addEventListener("click", closeTraderApplyModal);
  if (traderApplyBackdrop) traderApplyBackdrop.addEventListener("click", closeTraderApplyModal);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (traderApplyModal && traderApplyModal.classList.contains("is-open")) {
      closeTraderApplyModal();
      return;
    }
    closeModal();
  });

  if (traderApplyForm) {
    traderApplyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var TA = window.SkinexTraderApplications;
      var tgEl = document.getElementById("traderApplyTelegram");
      var stEl = document.getElementById("traderApplySteam");
      if (traderApplyFormNote) {
        traderApplyFormNote.textContent = "";
        traderApplyFormNote.style.color = "";
      }
      if (!TA || typeof TA.submit !== "function") {
        if (traderApplyFormNote) traderApplyFormNote.textContent = "Модуль заявок не загружен.";
        return;
      }
      TA.submit(tgEl ? tgEl.value : "", stEl ? stEl.value : "").then(function (r) {
        if (traderApplyFormNote) {
          traderApplyFormNote.style.color = r.ok ? "var(--cs-stock, #86d759)" : "#f87171";
          traderApplyFormNote.textContent = r.ok ? "Заявка отправлена." : r.message || "Ошибка.";
        }
        if (r.ok) {
          closeTraderApplyModal();
          renderTraderApplyCard();
          renderRoleNote();
        }
      });
    });
  }

  if (topupForm) {
    topupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (topupNote) {
        topupNote.textContent = "";
        topupNote.style.color = "";
      }
      var fd = new FormData(topupForm);
      var amount = fd.get("amount");
      var n = Math.floor(Number(amount));

      if (window.SKINEX_USE_SERVER_API) {
        if (!isFinite(n) || n < 10) {
          if (topupNote) {
            topupNote.style.color = "#f87171";
            topupNote.textContent = "Минимальное пополнение — 10 ₽.";
          }
          return;
        }
        function showTopupErr(msg) {
          if (topupNote) {
            topupNote.style.color = "#f87171";
            topupNote.textContent = msg || "Ошибка.";
          }
        }
        fetch(apiUrl("/api/v1/payments/yookassa/topup"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountRub: n }),
        })
          .then(function (res) {
            return res.json().then(function (j) {
              return { status: res.status, okHttp: res.ok, body: j };
            });
          })
          .then(function (pack) {
            var j = pack.body;
            if (pack.okHttp && j && j.ok && j.confirmationUrl) {
              window.location.href = j.confirmationUrl;
              return;
            }
            if (pack.status === 401) {
              showTopupErr("Войдите в аккаунт заново, затем попробуйте пополнение.");
              return;
            }
            showTopupErr(
              (j && j.message) ||
                "Не удалось создать платёж. Запустите сервер из папки server (npm start) и проверьте ключи ЮKassa.",
            );
          })
          .catch(function () {
            showTopupErr("Нет связи с сервером. Запустите API (npm start в папке server) и откройте сайт с того же адреса.");
          });
        return;
      }

      var r = A.topUp(amount);
      if (topupNote) {
        topupNote.style.color = r.ok ? "var(--cs-stock, #86d759)" : "#f87171";
        topupNote.textContent = r.ok
          ? "Баланс пополнен на " + formatPrice(r.added) + "."
          : r.message || "Не удалось пополнить.";
      }
      if (r.ok) {
        renderBalance();
        renderAccountStats();
        var Sn = window.SkinexNotifications;
        if (Sn && typeof Sn.pushLocal === "function") {
          Sn.pushLocal({
            kind: "balance",
            title: "Баланс пополнен",
            body: "Зачислено " + formatPrice(r.added) + ".",
            link: "account.html",
          });
          if (window.SkinexNotificationsUI && typeof window.SkinexNotificationsUI.tryMount === "function") {
            window.SkinexNotificationsUI.tryMount();
          }
        }
        setTimeout(closeModal, 600);
      }
    });
  }
})();
