/**
 * Колокол уведомлений в шапке (рядом с ЛК). Вызывайте tryMount после inject-nav.
 */
(function (w) {
  var mounted = false;
  var pollId = null;
  var POLL_MS = 40000;

  function esc(s) {
    var U = w.SkinexUtils;
    if (U && typeof U.escapeHtml === "function") return U.escapeHtml(s);
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function formatTime(ts) {
    if (!ts) return "";
    try {
      var d = new Date(ts);
      return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function setBadge(el, n) {
    if (!el) return;
    var b = el.querySelector(".skinex-notif-badge");
    if (!b) return;
    if (n > 0) {
      b.hidden = false;
      b.textContent = n > 99 ? "99+" : String(n);
    } else {
      b.hidden = true;
      b.textContent = "0";
    }
  }

  function renderPanel(panel, items, onPick) {
    panel.innerHTML = "";
    if (!items || !items.length) {
      var empty = document.createElement("p");
      empty.className = "skinex-notif-empty";
      empty.textContent = "Пока нет уведомлений";
      panel.appendChild(empty);
      return;
    }
    var ul = document.createElement("ul");
    ul.className = "skinex-notif-list";
    for (var i = 0; i < items.length; i++) {
      (function (it) {
        var li = document.createElement("li");
        li.className = "skinex-notif-item" + (it.readAt == null ? " is-unread" : "");
        var title = document.createElement("div");
        title.className = "skinex-notif-item-title";
        title.innerHTML = esc(it.title || "");
        var body = document.createElement("div");
        body.className = "skinex-notif-item-body";
        body.innerHTML = esc(it.body || "");
        var meta = document.createElement("div");
        meta.className = "skinex-notif-item-meta";
        meta.textContent = formatTime(it.createdAt);
        li.appendChild(title);
        if (it.body) li.appendChild(body);
        li.appendChild(meta);
        li.addEventListener("click", function () {
          onPick(it);
        });
        ul.appendChild(li);
      })(items[i]);
    }
    panel.appendChild(ul);
  }

  function goLink(href) {
    if (!href) return;
    var h = String(href).trim();
    if (h.indexOf("/") === 0) h = h.replace(/^\//, "");
    w.location.href = h;
  }

  function refresh(wrap, scrollEl, badgeBtn) {
    var Store = w.SkinexNotifications;
    if (!Store || typeof Store.list !== "function") return;
    Store.list()
      .then(function (data) {
        setBadge(badgeBtn, data.unreadCount || 0);
        renderPanel(scrollEl, data.notifications || [], function (it) {
          if (it.readAt == null && Store.markRead) {
            Store.markRead(it.id).catch(function () {});
          }
          if (String(it.kind || "") === "broadcast") return;
          if (it.link) goLink(it.link);
        });
      })
      .catch(function () {
        setBadge(badgeBtn, 0);
      });
  }

  function tryMount() {
    var Auth = w.SkinexAuth;
    var Store = w.SkinexNotifications;
    if (!Auth || !Store || !Auth.isLoggedIn || !Auth.isLoggedIn()) {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
      var old = document.querySelector(".skinex-notif-mount");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      mounted = false;
      return;
    }
    var slot = document.getElementById("userNavSlot");
    if (!slot) return;
    if (slot.querySelector(".skinex-notif-mount")) {
      mounted = true;
      var ex = slot.querySelector(".skinex-notif-wrap");
      if (ex) {
        var sc = ex.querySelector(".skinex-notif-scroll");
        refresh(ex, sc, ex.querySelector(".skinex-notif-bell"));
      }
      return;
    }
    var cluster = slot.querySelector(".header-user-cluster");
    if (!cluster) return;

    var wrap = document.createElement("div");
    wrap.className = "skinex-notif-mount skinex-notif-wrap";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skinex-notif-bell btn btn-ghost";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-label", "Уведомления");
    btn.innerHTML =
      '<span class="skinex-notif-bell-glyph" aria-hidden="true">🔔</span><span class="skinex-notif-badge" hidden>0</span>';

    var panel = document.createElement("div");
    panel.className = "skinex-notif-panel";
    panel.hidden = true;
    panel.setAttribute("role", "menu");

    var scroll = document.createElement("div");
    scroll.className = "skinex-notif-scroll";

    var footer = document.createElement("div");
    footer.className = "skinex-notif-footer";
    var footerRow = document.createElement("div");
    footerRow.className = "skinex-notif-footer-row";

    var markAll = document.createElement("button");
    markAll.type = "button";
    markAll.className = "btn btn-ghost skinex-notif-markall";
    markAll.textContent = "Прочитать все";
    markAll.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!Store.markAllRead) return;
      Store.markAllRead()
        .then(function () {
          refresh(wrap, scroll, btn);
        })
        .finally(function () {
          close();
        });
    });

    var closePanelBtn = document.createElement("button");
    closePanelBtn.type = "button";
    closePanelBtn.className = "skinex-notif-close";
    closePanelBtn.setAttribute("aria-label", "Закрыть список уведомлений");
    closePanelBtn.innerHTML = '<span aria-hidden="true">×</span>';
    closePanelBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      close();
    });

    footerRow.appendChild(markAll);
    footerRow.appendChild(closePanelBtn);
    footer.appendChild(footerRow);
    panel.appendChild(scroll);
    panel.appendChild(footer);

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    var cabLink = cluster.querySelector(".nav-user-cabinet");
    if (cabLink) cluster.insertBefore(wrap, cabLink);
    else cluster.insertBefore(wrap, cluster.firstChild);

    var open = false;
    function close() {
      open = false;
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }
    function toggle() {
      open = !open;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var wasOpen = open;
      toggle();
      if (!wasOpen) refresh(wrap, scroll, btn);
    });

    document.addEventListener("click", function (ev) {
      if (!wrap.contains(ev.target)) close();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") close();
    });

    mounted = true;
    refresh(wrap, scroll, btn);

    if (pollId) clearInterval(pollId);
    pollId = setInterval(function () {
      if (!document.body.contains(wrap)) {
        clearInterval(pollId);
        pollId = null;
        return;
      }
      if (panel.hidden) {
        Store.list()
          .then(function (data) {
            setBadge(btn, data.unreadCount || 0);
          })
          .catch(function () {});
      } else {
        refresh(wrap, scroll, btn);
      }
    }, POLL_MS);
  }

  w.SkinexNotificationsUI = {
    tryMount: tryMount,
  };
})(window);
