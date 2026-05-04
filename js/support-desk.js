(function () {
  var mount = document.getElementById("supportDeskMount");
  var Auth = window.SkinexAuth;
  var U = window.SkinexUtils;
  var S = window.SkinexSupport;
  if (!mount || !Auth || !S || !U) return;

  var selectedId = "";
  /** all | open | closed — только для админа/менеджера */
  var staffFilter = "all";
  /** Поиск по номеру SUP-xxxx, теме, email (для персонала) */
  var listSearchQuery = "";
  var searchTimer = null;
  var restoreSearchFocus = false;


  function esc(s) {
    return U.escapeHtml(s == null ? "" : String(s));
  }

  function fmtWhen(ts) {
    if (!ts) return "—";
    try {
      return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
    } catch (e) {
      return String(ts);
    }
  }

  function isStaff() {
    return (Auth.isAdmin && Auth.isAdmin()) || (Auth.isManager && Auth.isManager());
  }

  function isClientAllowed() {
    return (Auth.isUser && Auth.isUser()) || (Auth.isTrader && Auth.isTrader());
  }

  function listTicketsRaw() {
    return isStaff() ? S.listAllTickets() : isClientAllowed() ? S.listMyTickets() : [];
  }

  function ticketMatchesSearch(t, q) {
    if (!t || !q) return true;
    var low = q.toLowerCase();
    var ref = S.formatTicketRef ? String(S.formatTicketRef(t)).toLowerCase() : "";
    if (ref.indexOf(low) >= 0) return true;
    var digits = low.replace(/^#?\s*/, "").replace(/^sup-?\s*/i, "").trim();
    if (/^\d+$/.test(digits) && String(t.ticketNo || "") === digits) return true;
    if (String(t.subject || "").toLowerCase().indexOf(low) >= 0) return true;
    if (isStaff()) {
      if (String(t.userEmail || "").toLowerCase().indexOf(low) >= 0) return true;
      if (String(t.userDisplayName || "").toLowerCase().indexOf(low) >= 0) return true;
    }
    return false;
  }

  function listTickets() {
    var raw = listTicketsRaw();
    if (!isStaff()) {
      var q = String(listSearchQuery || "").trim();
      if (q) {
        raw = raw.filter(function (t) {
          return ticketMatchesSearch(t, q);
        });
      }
      return raw;
    }
    if (staffFilter === "open") {
      raw = raw.filter(function (t) {
        return t && t.status === "open";
      });
    } else if (staffFilter === "closed") {
      raw = raw.filter(function (t) {
        return t && t.status === "closed";
      });
    }
    var qs = String(listSearchQuery || "").trim();
    if (qs) {
      raw = raw.filter(function (t) {
        return ticketMatchesSearch(t, qs);
      });
    }
    return raw;
  }

  function findTicket(id) {
    if (!id) return null;
    return S.getTicketById(id);
  }

  function ensureSelected() {
    var list = listTickets();
    if (!list.length) {
      selectedId = "";
      return;
    }
    if (selectedId && list.some(function (t) { return String(t.id) === String(selectedId); })) return;
    selectedId = String(list[0].id);
  }

  function ticketBadge(t) {
    var st = t.status === "closed" ? "Закрыт" : "Открыт";
    var cls = t.status === "closed" ? "support-pill support-pill--closed" : "support-pill support-pill--open";
    return '<span class="' + cls + '">' + esc(st) + "</span>";
  }

  function renderEmptyState() {
    if (!Auth.isLoggedIn || !Auth.isLoggedIn()) {
      mount.innerHTML =
        '<div class="support-desk-card">' +
        "<h2>Обращения в поддержку</h2>" +
        '<p class="support-muted">Чтобы написать в поддержку и видеть историю обращений, войдите в аккаунт.</p>' +
        '<a class="btn btn-outline" href="auth.html?next=' +
        encodeURIComponent("support.html") +
        '">Войти</a>' +
        "</div>";
      return;
    }
    if (!isStaff() && !isClientAllowed()) {
      mount.innerHTML =
        '<div class="support-desk-card">' +
        "<h2>Обращения в поддержку</h2>" +
        '<p class="support-muted">Этот раздел доступен для ролей «Пользователь», «Трейдер», «Менеджер» и «Админ».</p>' +
        "</div>";
      return;
    }
    var lead = isStaff()
      ? "Здесь отображаются обращения клиентов. Выберите запрос слева и ответьте в чате."
      : "Создайте обращение и следите за ответами поддержки.";
    mount.innerHTML =
      '<div class="support-desk-card">' +
      "<h2>Обращения в поддержку</h2>" +
      '<p class="support-muted">' +
      esc(lead) +
      "</p>" +
      "</div>";
  }

  function render() {
    if (!Auth.isLoggedIn || !Auth.isLoggedIn() || (!isStaff() && !isClientAllowed())) {
      renderEmptyState();
      return;
    }

    ensureSelected();
    var tickets = listTickets();
    if (isStaff() && selectedId) {
      S.markStaffTicketSeen(selectedId);
    }
    var active = selectedId ? findTicket(selectedId) : null;

    var leftHtml = "";
    var rightHtml = "";

    var clientMode = !isStaff();
    if (clientMode) {
      var formHtml =
        '<div class="support-desk-card support-desk-form">' +
        "<h2>Написать в поддержку</h2>" +
        '<form id="supportCreateForm" class="support-form" novalidate>' +
        '<label class="field"><span>Тема</span><input type="text" name="subject" maxlength="140" required placeholder="Например, вопрос по покупке" /></label>' +
        '<label class="field"><span>Сообщение</span><textarea name="message" rows="5" maxlength="4000" required placeholder="Опишите проблему или вопрос"></textarea></label>' +
        '<button type="submit" class="btn-cs-cart">Отправить</button>' +
        '<p class="form-note" id="supportCreateNote" role="status" aria-live="polite"></p>' +
        "</form>" +
        "</div>";
      var histHtml = renderTicketList(tickets, true, {
        compact: true,
        showSearch: listTicketsRaw().length > 2,
        filterActive: !!String(listSearchQuery).trim(),
      });
      var chatHtml = renderChatPanel(active, false, { tall: true });
      mount.innerHTML =
        '<div class="support-desk-grid support-desk-grid--client">' +
        '<div class="support-desk-slot support-desk-slot--form">' +
        formHtml +
        "</div>" +
        '<div class="support-desk-slot support-desk-slot--history">' +
        histHtml +
        "</div>" +
        '<div class="support-desk-slot support-desk-slot--chat">' +
        chatHtml +
        "</div>" +
        "</div>";
    } else {
      leftHtml += renderTicketList(tickets, false, {
        staffFilter: staffFilter,
        showSearch: true,
        filterActive: !!String(listSearchQuery).trim(),
      });
      rightHtml += renderChatPanel(active, true, { tall: false });
      mount.innerHTML =
        '<div class="support-desk-grid support-desk-grid--staff">' +
        '<div class="support-desk-col">' +
        leftHtml +
        "</div>" +
        '<div class="support-desk-col">' +
        rightHtml +
        "</div>" +
        "</div>";
    }

    wireHandlers();

    if (restoreSearchFocus) {
      var si2 = document.getElementById("supportTicketSearch");
      if (si2) {
        si2.focus();
        try {
          var le = si2.value.length;
          si2.setSelectionRange(le, le);
        } catch (e2) {}
      }
      restoreSearchFocus = false;
    }
  }

  function renderSearchBox(forClient) {
    var ph = forClient
      ? "Номер (SUP-0012) или тема…"
      : "Номер SUP-, email клиента или тема…";
    return (
      '<div class="support-ticket-search-wrap">' +
      '<label class="visually-hidden" for="supportTicketSearch">Поиск обращений</label>' +
      '<input type="search" id="supportTicketSearch" class="support-ticket-search" autocomplete="off" placeholder="' +
      esc(ph) +
      '" value="' +
      esc(listSearchQuery) +
      '" />' +
      "</div>"
    );
  }

  function renderTicketList(tickets, forClient, opts) {
    opts = opts || {};
    var compact = !!opts.compact;
    var sf = opts.staffFilter || "all";
    var title = forClient ? "История обращений" : "Входящие обращения";
    var cardCls = "support-desk-card support-desk-list" + (compact ? " support-desk-list--compact" : "");
    var listCls = "support-ticket-list" + (compact ? " support-ticket-list--compact" : "");
    var rawCount = forClient ? 0 : listTicketsRaw().length;
    var showSearchLine = forClient ? !!opts.showSearch : opts.showSearch !== false;
    var searchActive = !!String(listSearchQuery || "").trim();
    var anyStored = listTicketsRaw().length > 0;
    if (!tickets.length) {
      var emptyMsg = "Пока нет обращений.";
      if (!forClient && rawCount > 0 && !searchActive) {
        emptyMsg = "Нет обращений с выбранным фильтром.";
      }
      if (searchActive && anyStored) {
        emptyMsg =
          "Ничего не найдено. Попробуйте другой номер (например SUP-0001) или слова из темы.";
      }
      var filtersHtml = "";
      if (!forClient && isStaff()) {
        filtersHtml = renderStaffFilters(sf);
      }
      var searchHtml = showSearchLine ? renderSearchBox(forClient) : "";
      return (
        searchHtml +
        '<div class="' +
        cardCls +
        '">' +
        "<h2>" +
        esc(title) +
        "</h2>" +
        filtersHtml +
        '<p class="support-muted">' +
        esc(emptyMsg) +
        "</p>" +
        "</div>"
      );
    }
    var items = tickets
      .map(function (t) {
        var on = String(t.id) === String(selectedId);
        var unread = isStaff() && S.staffTicketHasUnreadClient(t);
        var unreadCls = unread ? " support-ticket--unread" : "";
        var unreadDot =
          unread
            ? '<span class="support-ticket-unread-dot" title="Новое сообщение от клиента" aria-label="Новое сообщение"></span>'
            : "";
        var who = isStaff()
          ? '<span class="support-ticket-who">' +
            esc(t.userDisplayName || (t.userEmail || "").split("@")[0] || "—") +
            "</span>"
          : "";
        var ref = S.formatTicketRef ? S.formatTicketRef(t) : "";
        var titleHint = ref ? ref + " · " + String(t.subject || "") : String(t.subject || "");
        var refEl =
          '<span class="support-ticket-ref" title="Номер обращения">' + esc(ref) + "</span>";
        var titleRow =
          '<div class="support-ticket-top-main">' +
          refEl +
          unreadDot +
          '<span class="support-ticket-subject">' +
          esc(t.subject || "Без темы") +
          "</span>" +
          "</div>";
        if (compact) {
          return (
            '<button type="button" class="support-ticket support-ticket--compact' +
            unreadCls +
            (on ? " is-active" : "") +
            '" data-ticket="' +
            esc(t.id) +
            '" title="' +
            esc(titleHint) +
            '">' +
            '<div class="support-ticket-top">' +
            titleRow +
            ticketBadge(t) +
            "</div>" +
            '<div class="support-ticket-meta">' +
            '<span class="support-ticket-time">' +
            esc(fmtWhen(t.updatedAt || t.createdAt)) +
            "</span>" +
            "</div>" +
            "</button>"
          );
        }
        return (
          '<button type="button" class="support-ticket' +
          unreadCls +
          (on ? " is-active" : "") +
          '" data-ticket="' +
          esc(t.id) +
          '" title="' +
          esc(titleHint) +
          '">' +
          '<div class="support-ticket-top">' +
          titleRow +
          ticketBadge(t) +
          "</div>" +
          '<div class="support-ticket-meta">' +
          who +
          '<span class="support-ticket-time">' +
          esc(fmtWhen(t.updatedAt || t.createdAt)) +
          "</span>" +
          "</div>" +
          "</button>"
        );
      })
      .join("");
    var staffFiltersBlock = !forClient && isStaff() ? renderStaffFilters(sf) : "";
    var searchHtml2 = showSearchLine ? renderSearchBox(forClient) : "";
    return (
      searchHtml2 +
      '<div class="' +
      cardCls +
      '">' +
      "<h2>" +
      esc(title) +
      "</h2>" +
      staffFiltersBlock +
      '<div class="' +
      listCls +
      '" role="list">' +
      items +
      "</div>" +
      "</div>"
    );
  }

  function renderStaffFilters(active) {
    function pill(name, label) {
      var isOn = active === name;
      return (
        '<button type="button" class="support-filter-btn' +
        (isOn ? " is-active" : "") +
        '" data-support-filter="' +
        esc(name) +
        '">' +
        esc(label) +
        "</button>"
      );
    }
    return (
      '<div class="support-desk-filters" role="toolbar" aria-label="Фильтр обращений">' +
      pill("all", "Все") +
      pill("open", "Открытые") +
      pill("closed", "Закрытые") +
      "</div>"
    );
  }

  function renderChatPanel(t, staffMode, opts) {
    opts = opts || {};
    var tall = !!opts.tall;
    var chatCls = "support-desk-card support-desk-chat" + (tall ? " support-desk-chat--tall" : "");
    var title = staffMode ? "Чат с клиентом" : "Чат по выбранному обращению";
    if (!t) {
      var note = staffMode ? "Выберите обращение слева." : "После отправки обращения вы увидите переписку здесь.";
      return (
        '<div class="' +
        chatCls +
        '">' +
        "<h2>" +
        esc(title) +
        "</h2>" +
        '<p class="support-muted">' +
        esc(note) +
        "</p>" +
        "</div>"
      );
    }

    var headMeta = "";
    if (staffMode) {
      headMeta =
        '<div class="support-chat-head-meta">' +
        "<div><strong>" +
        esc(t.userDisplayName || (t.userEmail || "").split("@")[0] || "—") +
        "</strong><span class=\"support-muted-inline\"> · " +
        esc(t.userEmail || "") +
        "</span></div>" +
        "<div>" +
        ticketBadge(t) +
        "</div>" +
        "</div>";
    } else {
      headMeta =
        '<div class="support-chat-head-meta">' +
        "<div>" +
        ticketBadge(t) +
        "</div>" +
        "</div>";
    }

    var msgs = (t.messages || [])
      .map(function (m) {
        var cls = m.side === "staff" ? "support-msg support-msg--staff" : "support-msg support-msg--client";
        var who =
          m.side === "staff"
            ? "Поддержка"
            : t.userDisplayName || (t.userEmail || "").split("@")[0] || "Вы";
        return (
          '<div class="' +
          cls +
          '">' +
          '<div class="support-msg-head">' +
          '<span class="support-msg-who">' +
          esc(who) +
          "</span>" +
          '<span class="support-msg-time">' +
          esc(fmtWhen(m.at)) +
          "</span>" +
          "</div>" +
          '<div class="support-msg-body">' +
          esc(m.text).replace(/\n/g, "<br/>") +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    var actions = "";
    if (staffMode) {
      actions =
        '<div class="support-chat-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-status="' +
        esc(t.id) +
        '" data-to="open">Открыть</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-status="' +
        esc(t.id) +
        '" data-to="closed">Закрыть</button>' +
        "</div>";
    }

    var disabled = t.status === "closed" && !staffMode;
    var composer =
      '<form class="support-chat-composer" id="supportChatForm" data-ticket-id="' +
      esc(t.id) +
      '">' +
      '<textarea name="text" rows="3" maxlength="4000" placeholder="' +
      esc(disabled ? "Запрос закрыт — ответы доступны только поддержке." : "Напишите сообщение…") +
      '" ' +
      (disabled ? "disabled" : "") +
      "></textarea>" +
      '<div class="support-chat-send">' +
      '<button type="submit" class="btn-cs-cart" ' +
      (disabled ? "disabled" : "") +
      ">Отправить</button>" +
      '<p class="form-note" id="supportChatNote" role="status" aria-live="polite"></p>' +
      "</div>" +
      "</form>";

    var chatRef = S.formatTicketRef ? S.formatTicketRef(t) : "";
    return (
      '<div class="' +
      chatCls +
      '">' +
      "<h2>" +
      esc(title) +
      "</h2>" +
      '<p class="support-chat-subject">' +
      '<span class="support-chat-ref" title="Номер обращения">' +
      esc(chatRef) +
      "</span> " +
      "<strong>" +
      esc(t.subject || "Без темы") +
      "</strong> · создан: " +
      esc(fmtWhen(t.createdAt)) +
      "</p>" +
      headMeta +
      actions +
      '<div class="support-chat-scroll" id="supportChatScroll">' +
      (msgs || '<p class="support-muted">Сообщений пока нет.</p>') +
      "</div>" +
      composer +
      "</div>"
    );
  }

  function wireHandlers() {
    var createForm = document.getElementById("supportCreateForm");
    var createNote = document.getElementById("supportCreateNote");
    if (createForm) {
      createForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (createNote) {
          createNote.textContent = "";
          createNote.style.color = "";
        }
        var fd = new FormData(createForm);
        var subj = String(fd.get("subject") || "");
        var msg = String(fd.get("message") || "");
        var r = S.createTicket(subj, msg);
        if (!r.ok) {
          if (createNote) {
            createNote.style.color = "#f87171";
            createNote.textContent = r.message || "Не удалось отправить.";
          }
          return;
        }
        selectedId = String(r.ticket.id);
        createForm.reset();
        if (createNote) {
          createNote.style.color = "var(--cs-stock, #86d759)";
          var refOk = r.ticket && S.formatTicketRef ? S.formatTicketRef(r.ticket) : "";
          createNote.textContent = refOk
            ? "Обращение " + refOk + " создано. Переписка — в чате справа."
            : "Запрос отправлен. Переписка — в чате справа.";
        }
        render();
      });
    }

    mount.querySelectorAll("[data-ticket]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedId = String(btn.getAttribute("data-ticket") || "");
        render();
      });
    });

    var si = document.getElementById("supportTicketSearch");
    if (si) {
      si.addEventListener("input", function (e) {
        listSearchQuery = String((e.target && e.target.value) || "");
        restoreSearchFocus = true;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          render();
        }, 140);
      });
    }

    mount.querySelectorAll("[data-support-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = String(btn.getAttribute("data-support-filter") || "all");
        if (v !== "all" && v !== "open" && v !== "closed") v = "all";
        staffFilter = v;
        render();
      });
    });

    var chatForm = document.getElementById("supportChatForm");
    var chatNote = document.getElementById("supportChatNote");
    if (chatForm) {
      chatForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (chatNote) {
          chatNote.textContent = "";
          chatNote.style.color = "";
        }
        var tid = String(chatForm.getAttribute("data-ticket-id") || "");
        var fd = new FormData(chatForm);
        var text = String(fd.get("text") || "");
        var r = S.addMessage(tid, text);
        if (!r.ok) {
          if (chatNote) {
            chatNote.style.color = "#f87171";
            chatNote.textContent = r.message || "Не удалось отправить.";
          }
          return;
        }
        chatForm.reset();
        render();
      });
    }

    mount.querySelectorAll("[data-status]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tid = String(btn.getAttribute("data-status") || "");
        var to = String(btn.getAttribute("data-to") || "");
        var r = S.setStatus(tid, to);
        if (!r.ok) return;
        render();
      });
    });

    var sc = document.getElementById("supportChatScroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  }

  render();
  window.addEventListener("storage", function (e) {
    if (e && e.key === S.KEY) render();
  });
})();

