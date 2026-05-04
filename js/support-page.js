(function () {
  var mount = document.getElementById("supportHintsMount");
  var H = window.SkinexHintsStore;
  if (!mount || !H) return;

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var openId = null;

  function bindAccordion(root) {
    var items = root.querySelectorAll(".support-faq-item");
    items.forEach(function (item) {
      var btn = item.querySelector(".support-faq-trigger");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var id = item.getAttribute("data-hint-id");
        var willOpen = openId !== id;
        items.forEach(function (it) {
          it.classList.remove("is-open");
          var b = it.querySelector(".support-faq-trigger");
          if (b) b.setAttribute("aria-expanded", "false");
        });
        if (willOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          openId = id;
        } else {
          openId = null;
        }
      });
    });
  }

  function render() {
    var list = H.getPublicHints();
    if (!list.length) {
      mount.innerHTML =
        '<div class="support-faq-empty">' +
        "<p>Пока нет опубликованных вопросов. Загляните позже или напишите в форму обращения выше.</p>" +
        "</div>";
      mount.hidden = false;
      return;
    }
    openId = String(list[0].id);
    var parts = [];
    parts.push('<div class="support-faq-inner">');
    parts.push('<p class="support-faq-badge" aria-hidden="true"><span class="support-faq-badge-dot"></span> FAQ</p>');
    parts.push('<h2 id="support-faq-title" class="support-faq-title">Частые вопросы и ответы</h2>');
    parts.push(
      '<p class="support-faq-lead">Прозрачный процесс от выбора лота до передачи предметов в инвентарь.</p>',
    );
    parts.push('<div class="support-faq-list" role="list">');
    list.forEach(function (h, idx) {
      var id = String(h.id);
      var sid = id.replace(/[^a-zA-Z0-9_-]/g, "_") || "item";
      var isOpen = idx === 0;
      var panelId = "support-faq-panel-" + sid;
      parts.push(
        '<div class="support-faq-item' +
          (isOpen ? " is-open" : "") +
          '" data-hint-id="' +
          esc(id) +
          '" role="listitem">',
      );
      parts.push(
        '<button type="button" class="support-faq-trigger" id="support-faq-btn-' +
          esc(sid) +
          '" aria-expanded="' +
          (isOpen ? "true" : "false") +
          '" aria-controls="' +
          panelId +
          '">',
      );
      parts.push('<span class="support-faq-q">' + esc(h.title) + "</span>");
      parts.push('<span class="support-faq-chevron" aria-hidden="true"></span>');
      parts.push("</button>");
      parts.push('<div class="support-faq-panel" id="' + panelId + '" role="region">');
      parts.push('<div class="support-faq-panel-inner">');
      parts.push(
        '<div class="support-faq-a">' + esc(h.body).replace(/\n/g, "<br/>") + "</div>",
      );
      parts.push("</div></div></div>");
    });
    parts.push("</div></div>");
    mount.innerHTML = parts.join("");
    mount.hidden = false;
    bindAccordion(mount);
  }

  render();
  window.addEventListener("storage", function (e) {
    if (e.key === H.KEY) render();
  });
})();
