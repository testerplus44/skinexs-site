(function () {
  var R = window.SkinexReviews;
  var U = window.SkinexUtils;
  var mountList = document.getElementById("reviewsList");
  var mountForm = document.getElementById("reviewsFormMount");
  var fabTop = document.getElementById("reviewsFabTop");
  if (!mountList || !R) return;

  function esc(s) {
    return U && U.escapeHtml ? U.escapeHtml(s == null ? "" : String(s)) : String(s || "");
  }

  function getCatalog() {
    var C = window.SkinexCatalog;
    if (C && typeof C.getCatalog === "function") return C.getCatalog();
    return window.SKINEX_CATALOG && Array.isArray(window.SKINEX_CATALOG) ? window.SKINEX_CATALOG : [];
  }

  function getItemById(id) {
    var pid = String(id || "");
    if (!pid) return null;
    var list = getCatalog();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === pid) return list[i];
    }
    return null;
  }

  function collectionName(cid) {
    var id = String(cid || "general");
    var M = window.SkinexCatalogMeta;
    var rows = M && typeof M.getCollections === "function" ? M.getCollections() : window.SKINEX_COLLECTIONS || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && String(rows[i].id) === id) return String(rows[i].name || id);
    }
    return id;
  }

  function pathLineForReview(r) {
    if (r.seed && r.productId) {
      var it = getItemById(r.productId);
      if (it) {
        return esc(it.hero) + " / " + esc(collectionName(it.collectionId)) + " / " + esc(it.name);
      }
    }
    if (!r.seed && r.productId) {
      var it2 = getItemById(r.productId);
      if (it2) {
        return esc(it2.hero) + " / " + esc(collectionName(it2.collectionId)) + " / " + esc(it2.name);
      }
      return esc(r.productHero || "") + " / " + esc(r.productName || "Товар");
    }
    return "Skinexs · " + esc(r.caption || "отзыв");
  }

  function thumbForReview(r) {
    if (r.productId) {
      var it = getItemById(r.productId);
      if (it && it.icon) return '<span class="review-v2-thumb-ico" aria-hidden="true">' + esc(it.icon) + "</span>";
    }
    return '<span class="review-v2-thumb-ico review-v2-thumb-ico--ph" aria-hidden="true">📦</span>';
  }

  function initials(label) {
    var s = String(label || "?").trim();
    var parts = s.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    return s.slice(0, 2).toUpperCase() || "?";
  }

  function fmtDateTime(ts) {
    if (!ts) return "—";
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(ts));
    } catch (e) {
      return String(ts);
    }
  }

  function starsRowHtml(n) {
    var out = '<span class="review-v2-stars" data-stars-display="' + String(n) + '">';
    for (var i = 1; i <= 5; i++) {
      out += '<span class="review-v2-star' + (i <= n ? " is-on" : "") + '">★</span>';
    }
    return out + "</span>";
  }

  function renderCard(r) {
    var path = pathLineForReview(r);
    var thumb = thumbForReview(r);
    var author = r.seed ? esc(r.authorLabel || r.caption || "Покупатель") : esc(r.authorLabel || "Покупатель");
    var stars = Number(r.stars) || 5;
    var dt = fmtDateTime(r.createdAt);
    var text = esc(r.text);
    var ordersN = 0;
    if (!r.seed && r.authorEmail) {
      ordersN = R.countCompletedOrdersForBuyer(r.authorEmail);
    } else if (r.seed) {
      ordersN = 1;
    }

    var Auth = window.SkinexAuth;
    var adminDel = "";
    if (Auth && Auth.isAdmin && Auth.isAdmin() && r.id) {
      adminDel =
        '<button type="button" class="review-v2-admin-del" data-review-delete="' +
        esc(String(r.id)) +
        '">Удалить</button>';
    }

    return (
      "<li>" +
      '<article class="review-card-v2">' +
      '<div class="review-v2-path">' +
      path +
      "</div>" +
      '<div class="review-v2-mid">' +
      '<div class="review-v2-thumb">' +
      thumb +
      "</div>" +
      '<div class="review-v2-user">' +
      '<div class="review-v2-avatar" aria-hidden="true">' +
      initials(r.seed ? r.authorLabel || r.caption : r.authorLabel) +
      "</div>" +
      "<div>" +
      '<div class="review-v2-name">' +
      author +
      "</div>" +
      starsRowHtml(stars) +
      '<span class="review-v2-orders-badge">Заказов: ' +
      String(ordersN) +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="review-v2-aside">' +
      '<time class="review-v2-time" datetime="' +
      (r.createdAt ? new Date(r.createdAt).toISOString() : "") +
      '">' +
      dt +
      "</time>" +
      adminDel +
      "</div>" +
      "</div>" +
      '<div class="review-v2-quote"><p>' +
      "«" +
      text +
      "»" +
      "</p></div>" +
      "</article>" +
      "</li>"
    );
  }

  function renderList() {
    var all = R.listForDisplay();
    mountList.className = "reviews-grid-v2";
    mountList.innerHTML = all.map(renderCard).join("");

    mountList.querySelectorAll("[data-review-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-review-delete");
        if (!id || !window.confirm("Удалить этот отзыв? Действие нельзя отменить.")) return;
        var res = R.adminDeleteReview(id);
        if (!res || !res.ok) {
          window.alert((res && res.message) || "Не удалось удалить отзыв.");
          return;
        }
        fullRender();
      });
    });
  }

  function renderForm() {
    if (!mountForm) return;
    var Auth = window.SkinexAuth;
    var eligible = R.getEligibleProducts();

    if (!Auth || !Auth.isLoggedIn || !Auth.isLoggedIn()) {
      mountForm.hidden = false;
      mountForm.className = "reviews-compose-inner reviews-form-mount--hint";
      mountForm.innerHTML =
        '<p class="reviews-form-hint">Чтобы оставить отзыв, <a href="/auth?next=' +
        encodeURIComponent("/reviews") +
        '">войдите</a> и завершите заказ (подтвердите получение в личном кабинете).</p>';
      return;
    }

    if (!eligible.length) {
      mountForm.hidden = false;
      mountForm.className = "reviews-compose-inner reviews-form-mount--hint";
      mountForm.innerHTML =
        '<p class="reviews-form-hint">Отзыв можно добавить по товару из <strong>завершённого</strong> заказа. Подтвердите получение в разделе «Активные покупки», затем вернитесь сюда.</p>';
      return;
    }

    mountForm.hidden = false;
    mountForm.className = "reviews-compose-inner reviews-form-mount--active";
    var opts = eligible
      .map(function (p) {
        return (
          '<option value="' +
          esc(p.productId) +
          '">' +
          esc(p.name) +
          (p.hero ? " — " + esc(p.hero) : "") +
          "</option>"
        );
      })
      .join("");

    mountForm.innerHTML =
      '<h3 class="reviews-compose-title">Оставить отзыв о покупке</h3>' +
      '<p class="reviews-compose-lead">По одному отзыву на товар из завершённых заказов.</p>' +
      '<form class="reviews-form-v2" id="skinexReviewForm" novalidate>' +
      '<div class="reviews-form-v2-grid">' +
      '<label class="reviews-field-v2">' +
      '<span class="reviews-field-v2-label">Предмет</span>' +
      '<select name="productId" id="skinexReviewProduct" required>' +
      opts +
      "</select>" +
      "</label>" +
      '<label class="reviews-field-v2">' +
      '<span class="reviews-field-v2-label">Оценка</span>' +
      '<select name="stars" id="skinexReviewStars" required>' +
      '<option value="5">5 — отлично</option>' +
      '<option value="4">4</option>' +
      '<option value="3">3</option>' +
      '<option value="2">2</option>' +
      '<option value="1">1</option>' +
      "</select>" +
      "</label>" +
      "</div>" +
      '<label class="reviews-field-v2 reviews-field-v2--block">' +
      '<span class="reviews-field-v2-label">Текст</span>' +
      '<textarea name="text" id="skinexReviewText" rows="4" maxlength="2000" minlength="10" required placeholder="Минимум 10 символов"></textarea>' +
      "</label>" +
      '<button type="submit" class="btn-cs-cart reviews-form-v2-submit">Опубликовать</button>' +
      '<p class="form-note reviews-form-note" id="skinexReviewNote" role="status" aria-live="polite"></p>' +
      "</form>";

    var form = document.getElementById("skinexReviewForm");
    var note = document.getElementById("skinexReviewNote");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (note) {
          note.textContent = "";
          note.style.color = "";
        }
        var fd = new FormData(form);
        var res = R.addReview(String(fd.get("productId") || ""), String(fd.get("text") || ""), fd.get("stars"));
        if (!res.ok) {
          if (note) {
            note.style.color = "#f87171";
            note.textContent = res.message || "Не удалось сохранить.";
          }
          return;
        }
        if (note) {
          note.style.color = "var(--cs-stock, #86d759)";
          note.textContent = "Отзыв опубликован.";
        }
        form.reset();
        fullRender();
      });
    }
  }

  function fullRender() {
    renderList();
    renderForm();
  }

  function init() {
    fullRender();
    if (fabTop) {
      fabTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      window.addEventListener("scroll", function () {
        fabTop.hidden = window.scrollY < 400;
      });
      fabTop.hidden = true;
    }
  }

  init();

  window.addEventListener("storage", function (e) {
    if (!e) return;
    if (
      e.key === "skinex_orders" ||
      e.key === R.KEY ||
      e.key === R.HIDDEN_SEEDS_KEY ||
      e.key === "skinex_session"
    ) {
      fullRender();
    }
  });
})();
