(function () {
  var cfg = {
    instantCommissionPct: 7,
    keysPriceRub: 156,
    keysClientProfitPct: 10,
  };

  function formatPctRu(n) {
    var x = Number(n);
    if (!isFinite(x)) return "0";
    var y = Math.round(x * 10) / 10;
    if (Math.abs(y - Math.round(y)) < 1e-6) return String(Math.round(y));
    return String(y).replace(".", ",");
  }

  function formatRub(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
  }

  function formatRubTilde(n) {
    return "~" + formatRub(n).replace(" ₽", "") + " ₽";
  }

  function declKeys(n) {
    var m = n % 10;
    var m100 = n % 100;
    if (m100 >= 11 && m100 <= 14) return n + " ключей";
    if (m === 1) return n + " ключ";
    if (m >= 2 && m <= 4) return n + " ключа";
    return n + " ключей";
  }

  function mergeSettingsFromResponse(data) {
    if (!data || !data.ok) return;
    if (typeof data.instantCommissionPct === "number" && isFinite(data.instantCommissionPct)) {
      cfg.instantCommissionPct = data.instantCommissionPct;
    }
    if (typeof data.keysPriceRub === "number" && isFinite(data.keysPriceRub)) {
      cfg.keysPriceRub = Math.round(data.keysPriceRub);
    }
    if (typeof data.keysClientProfitPct === "number" && isFinite(data.keysClientProfitPct)) {
      cfg.keysClientProfitPct = data.keysClientProfitPct;
    }
  }

  function applySteamTopupLabels() {
    var pctLabel = document.getElementById("stInstantFeePctLabel");
    var promoPct = document.getElementById("stPromoInstantPct");
    var s = formatPctRu(cfg.instantCommissionPct);
    if (pctLabel) pctLabel.textContent = s + "%";
    if (promoPct) promoPct.textContent = s;
    var profitEl = document.getElementById("stPromoKeysProfit");
    if (profitEl) profitEl.textContent = formatPctRu(cfg.keysClientProfitPct);
    var cap = document.getElementById("stKeysSteamBalanceCaption");
    if (cap) {
      cap.textContent = "(оценка: +" + formatPctRu(cfg.keysClientProfitPct) + "% к оплате на сайте)";
    }
  }

  function updateLoginTotals() {
    var input = document.getElementById("stAmountRub");
    var receiveEl = document.getElementById("stSumReceive");
    var feeEl = document.getElementById("stSumFee");
    var totalEl = document.getElementById("stPayTotalLogin");
    if (!input || !receiveEl || !feeEl || !totalEl) return;
    var base = parseFloat(String(input.value).replace(/\s/g, ""));
    if (!isFinite(base) || base < 0) base = 0;
    var feeRate = cfg.instantCommissionPct / 100;
    var fee = Math.round(base * feeRate);
    var total = Math.round(base + fee);
    receiveEl.textContent = formatRub(base);
    feeEl.textContent = formatRub(fee);
    totalEl.textContent = formatRub(total);
  }

  function updateKeysTotals(count) {
    var label = document.getElementById("stKeysLabel");
    var countEl = document.getElementById("stKeyCount");
    var line = document.getElementById("stKeyPriceLine");
    var paySiteEl = document.getElementById("stKeysPaySite");
    var steamEl = document.getElementById("stKeysSteamBalance");
    var pay = document.getElementById("stPayTotalKeys");
    if (countEl) countEl.textContent = String(count);
    if (label) label.textContent = declKeys(count);
    var paySite = count * cfg.keysPriceRub;
    var steamEst = Math.round(paySite * (1 + cfg.keysClientProfitPct / 100));
    if (line) line.textContent = formatRubTilde(paySite);
    if (paySiteEl) paySiteEl.textContent = formatRub(paySite);
    if (steamEl) steamEl.textContent = formatRubTilde(steamEst);
    if (pay) pay.textContent = formatRub(paySite);
  }

  /** Два независимых блока: показывается только выбранный режим (как отдельные страницы). */
  function initTabs() {
    var tabInstant = document.getElementById("tab-steam-instant");
    var tabValue = document.getElementById("tab-steam-value");
    var modeInstant = document.getElementById("steam-topup-mode-instant");
    var modeValue = document.getElementById("steam-topup-mode-value");
    if (!tabInstant || !tabValue || !modeInstant || !modeValue) return;

    function select(mode) {
      var instant = mode === "instant";
      tabInstant.setAttribute("aria-selected", instant ? "true" : "false");
      tabValue.setAttribute("aria-selected", instant ? "false" : "true");
      tabInstant.tabIndex = instant ? 0 : -1;
      tabValue.tabIndex = instant ? -1 : 0;
      modeInstant.hidden = !instant;
      modeValue.hidden = instant;
    }

    tabInstant.addEventListener("click", function () {
      select("instant");
    });
    tabValue.addEventListener("click", function () {
      select("value");
    });

    tabInstant.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        tabValue.focus();
        select("value");
      }
    });
    tabValue.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        tabInstant.focus();
        select("instant");
      }
    });
  }

  function initKeysStepper() {
    var minus = document.getElementById("stKeyMinus");
    var plus = document.getElementById("stKeyPlus");
    if (!minus || !plus) return;
    var count = 1;
    function sync() {
      count = Math.max(1, Math.min(99, count));
      minus.disabled = count <= 1;
      plus.disabled = count >= 99;
      updateKeysTotals(count);
    }
    minus.addEventListener("click", function () {
      count -= 1;
      sync();
    });
    plus.addEventListener("click", function () {
      count += 1;
      sync();
    });
    sync();
  }

  function setKeysPayMsg(text, isError) {
    var el = document.getElementById("stKeysPayMsg");
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
    el.classList.toggle("steam-topup-inline-msg--err", !!isError);
  }

  function handleSteamKeysReturn() {
    var params = new URLSearchParams(window.location.search || "");
    var oid = params.get("steam_keys_order");
    if (!oid || !window.SKINEX_USE_SERVER_API) return Promise.resolve(null);
    return fetch(apiUrl("/api/v1/payments/yookassa/steam-keys/complete-check"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steamKeysOrderId: oid }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        var url = new URL(window.location.href);
        url.searchParams.delete("steam_keys_order");
        var next = url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState({}, "", next);
        var el = document.getElementById("stKeysPayMsg");
        if (el) {
          el.hidden = false;
          if (data && data.ok) {
            var ds = data.deliveryState || "";
            var extra = "";
            if (ds === "webhook_ok") extra = " Запрос на выдачу ключей по трейду отправлен боту.";
            else if (ds === "webhook_fail")
              extra = " Автовыдача не ответила — напишите в поддержку, приложите номер заказа.";
            else if (ds === "skipped") extra = " Ожидайте отправку по трейду (бот не настроен на сервере — обработка вручную).";
            el.textContent =
              (data.already ? "Этот заказ уже был оплачен ранее." : "Оплата прошла. Ключей: " + (data.keyCount || "—") + ".") +
              extra;
            el.classList.toggle("steam-topup-inline-msg--err", false);
          } else if (data && data.pending) {
            el.textContent = data.message || "Ожидаем подтверждение оплаты.";
            el.classList.toggle("steam-topup-inline-msg--err", false);
          } else {
            el.textContent = (data && data.message) || "Не удалось подтвердить оплату.";
            el.classList.toggle("steam-topup-inline-msg--err", true);
          }
        }
        return data;
      })
      .catch(function () {
        return null;
      });
  }

  function initKeysCheckoutIntent() {
    var btn = document.getElementById("stPayKeys");
    if (!btn || btn.tagName !== "BUTTON") return;
    btn.addEventListener("click", function () {
      var countEl = document.getElementById("stKeyCount");
      var count = parseInt(String(countEl && countEl.textContent ? countEl.textContent : "1"), 10);
      if (!isFinite(count) || count < 1) count = 1;
      var tradeInput = document.getElementById("stTradeUrl");
      var tradeUrl = tradeInput ? String(tradeInput.value || "").trim() : "";
      if (!window.SKINEX_USE_SERVER_API || typeof fetch === "undefined") {
        window.location.href = "auth.html?next=" + encodeURIComponent("steam-topup.html");
        return;
      }
      btn.disabled = true;
      setKeysPayMsg("", false);
      postJson("/api/v1/payments/yookassa/steam-keys/create", {
        keyCount: count,
        tradeUrl: tradeUrl,
      })
        .then(function (r) {
          var d = r.data;
          if (r.res.status === 401) {
            setKeysPayMsg("Войдите в аккаунт, чтобы оплатить ключи.", true);
            window.setTimeout(function () {
              window.location.href = "auth.html?next=" + encodeURIComponent("steam-topup.html");
            }, 900);
            return;
          }
          if (r.res.status === 503) {
            setKeysPayMsg((d && d.message) || "Платежи на сервере не настроены.", true);
            return;
          }
          if (!d || !d.ok) {
            setKeysPayMsg((d && d.message) || "Не удалось создать платёж (HTTP " + r.res.status + ").", true);
            return;
          }
          if (d.confirmationUrl) {
            window.location.href = d.confirmationUrl;
          }
        })
        .catch(function () {
          setKeysPayMsg("Сеть или сервер недоступны. Попробуйте позже.", true);
        })
        .then(function () {
          btn.disabled = false;
        });
    });
  }

  function apiUrl(p) {
    var base = window.SKINEX_API_BASE != null ? String(window.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
    if (!p || p.charAt(0) !== "/") p = "/" + (p || "");
    return base + p;
  }

  function setInstantPayMsg(text, isError) {
    var el = document.getElementById("stInstantPayMsg");
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
    el.classList.toggle("steam-topup-inline-msg--err", !!isError);
  }

  function postJson(path, body) {
    return fetch(apiUrl(path), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = null;
        }
        return { res: res, data: data, raw: text };
      });
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function pollAvatarixStatus(tid, triesLeft) {
    return postJson("/api/v1/partner/avatarix/steam/status", { transactionId: tid }).then(function (r) {
      if (r.data && r.data.ok) return r;
      if (triesLeft <= 1) return r;
      return delay(1600).then(function () {
        return pollAvatarixStatus(tid, triesLeft - 1);
      });
    });
  }

  function steamLoginValid(s) {
    return /^[a-zA-Z0-9_]{3,32}$/.test(String(s || "").trim());
  }

  /** Моментальное пополнение: POST на сервер → Avatarix Protocol v2.0 */
  function initInstantAvatarixPay() {
    var btn = document.getElementById("stPayLogin");
    if (!btn || btn.tagName !== "BUTTON") return;
    btn.addEventListener("click", function () {
      setInstantPayMsg("", false);
      if (!window.SKINEX_USE_SERVER_API) {
        setInstantPayMsg(
          "Моментальное пополнение доступно только при открытии сайта через сервер (npm start в папке server). В статическом режиме заявка не отправляется.",
          true
        );
        return;
      }
      var loginInput = document.getElementById("stLoginInput");
      var amountInput = document.getElementById("stAmountRub");
      var steamLogin = loginInput ? String(loginInput.value || "").trim() : "";
      var amountRub = Math.round(Number(amountInput && amountInput.value != null ? amountInput.value : NaN));
      if (!steamLoginValid(steamLogin)) {
        setInstantPayMsg("Укажите логин Steam: латиница, цифры и подчёркивание, от 3 до 32 символов.", true);
        return;
      }
      if (!Number.isFinite(amountRub) || amountRub < 100 || amountRub > 500000) {
        setInstantPayMsg("Сумма к зачислению на Steam: от 100 до 500 000 ₽.", true);
        return;
      }
      btn.disabled = true;
      setInstantPayMsg("Отправляем заявку партнёру…", false);
      postJson("/api/v1/partner/avatarix/steam/pay", { steamLogin: steamLogin, amountRub: amountRub })
        .then(function (first) {
          var d = first.data;
          var tid = d && d.transactionId ? String(d.transactionId) : "";
          if (!first.res.ok) {
            var errText =
              (d && d.message) ||
              (first.res.status === 503
                ? "Сервис временно недоступен: на сервере не заданы AVATARIX_AGENT_ID, AVATARIX_AGENT_PASSWORD и AVATARIX_SERVICE_STEAM."
                : "Ошибка запроса (HTTP " + first.res.status + ").");
            setInstantPayMsg(errText, true);
            return null;
          }
          if (d && d.ok) {
            var ax0 = d.avatarix || {};
            setInstantPayMsg(d.message || ax0.Message || "Заявка обработана партнёром.", false);
            return null;
          }
          if (!tid) {
            setInstantPayMsg((d && d.message) || "Ответ без номера транзакции. Обратитесь в поддержку.", true);
            return null;
          }
          setInstantPayMsg("Заявка создана, проверяем статус… (№ " + tid + ")", false);
          return pollAvatarixStatus(tid, 8);
        })
        .then(function (polled) {
          if (!polled) return;
          var d2 = polled.data;
          var ax2 = d2 && d2.avatarix ? d2.avatarix : {};
          if (d2 && d2.ok) {
            setInstantPayMsg(ax2.Message || "Операция подтверждена партнёром.", false);
          } else {
            var st = ax2.ResponseStatus != null ? String(ax2.ResponseStatus) : "";
            var tail = st ? " Код ответа партнёра: " + st + "." : "";
            setInstantPayMsg(
              ax2.Message ||
                "Статус ещё не подтверждён — проверьте баланс Steam позже или сохраните номер транзакции и напишите в поддержку." +
                  tail,
              true
            );
          }
        })
        .catch(function () {
          setInstantPayMsg("Сеть или сервер недоступны. Попробуйте позже.", true);
        })
        .then(function () {
          btn.disabled = false;
        });
    });
  }

  function fetchSteamTopupSettingsFromServer() {
    if (!window.SKINEX_USE_SERVER_API || typeof fetch === "undefined") {
      return Promise.resolve();
    }
    return fetch(apiUrl("/api/v1/public/steam-topup-settings"), { credentials: "same-origin" })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        mergeSettingsFromResponse(data);
      })
      .catch(function () {});
  }

  function init() {
    var keysReturnOrder = new URLSearchParams(window.location.search || "").get("steam_keys_order");
    fetchSteamTopupSettingsFromServer().then(function () {
      applySteamTopupLabels();
      initTabs();

      var amount = document.getElementById("stAmountRub");
      if (amount) {
        amount.addEventListener("input", updateLoginTotals);
        amount.addEventListener("change", updateLoginTotals);
        updateLoginTotals();
      }

      initKeysStepper();
      initKeysCheckoutIntent();
      initInstantAvatarixPay();
      return handleSteamKeysReturn();
    }).then(function () {
      if (keysReturnOrder) {
        var tabV = document.getElementById("tab-steam-value");
        if (tabV) tabV.click();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
