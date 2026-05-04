(function () {
  var FEE_RATE = 0.07;
  var KEY_PRICE = 156;

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

  function updateLoginTotals() {
    var input = document.getElementById("stAmountRub");
    var receiveEl = document.getElementById("stSumReceive");
    var feeEl = document.getElementById("stSumFee");
    var totalEl = document.getElementById("stPayTotalLogin");
    if (!input || !receiveEl || !feeEl || !totalEl) return;
    var base = parseFloat(String(input.value).replace(/\s/g, ""));
    if (!isFinite(base) || base < 0) base = 0;
    var fee = Math.round(base * FEE_RATE);
    var total = Math.round(base + fee);
    receiveEl.textContent = formatRub(base);
    feeEl.textContent = formatRub(fee);
    totalEl.textContent = formatRub(total);
  }

  function updateKeysTotals(count) {
    var label = document.getElementById("stKeysLabel");
    var countEl = document.getElementById("stKeyCount");
    var line = document.getElementById("stKeyPriceLine");
    var recv = document.getElementById("stKeysReceive");
    var pay = document.getElementById("stPayTotalKeys");
    if (countEl) countEl.textContent = String(count);
    if (label) label.textContent = declKeys(count);
    var sum = count * KEY_PRICE;
    if (line) line.textContent = formatRubTilde(sum);
    if (recv) recv.textContent = formatRubTilde(sum);
    if (pay) pay.textContent = formatRub(sum);
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

  function initPayTiles(root) {
    if (!root) return;
    var group = root.querySelector(".steam-topup-paygrid");
    if (!group) return;
    group.addEventListener("click", function (e) {
      var t = e.target.closest(".steam-topup-paytile");
      if (!t || !group.contains(t)) return;
      group.querySelectorAll(".steam-topup-paytile").forEach(function (btn) {
        btn.classList.toggle("is-active", btn === t);
        btn.setAttribute("aria-checked", btn === t ? "true" : "false");
      });
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

  function init() {
    initTabs();
    initPayTiles(document.getElementById("steam-topup-mode-instant"));
    initPayTiles(document.getElementById("steam-topup-mode-value"));

    var amount = document.getElementById("stAmountRub");
    if (amount) {
      amount.addEventListener("input", updateLoginTotals);
      amount.addEventListener("change", updateLoginTotals);
      updateLoginTotals();
    }

    initKeysStepper();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
