/**
 * Поддержка: обращения (тикеты) и сообщения (чат) в localStorage.
 * Роли:
 * - user / trader: создают обращения, видят свои, пишут в чат
 * - admin / manager: видят все обращения, отвечают, закрывают/открывают
 */
(function (w) {
  var KEY = "skinex_support_tickets";
  var STAFF_READ_KEY = "skinex_support_staff_reads";

  function safeParse(raw, fb) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fb;
    }
  }

  function uid() {
    if (w.crypto && typeof w.crypto.randomUUID === "function") return w.crypto.randomUUID();
    return "sup_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  /** Назначить порядковый номер обращениям без него (для поиска и ссылок SUP-0001). */
  function migrateTicketNumbers(list) {
    if (!Array.isArray(list) || !list.length) return false;
    var changed = false;
    var maxNo = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      var x = list[i];
      if (x && typeof x.ticketNo === "number" && x.ticketNo > maxNo) maxNo = x.ticketNo;
    }
    var pending = [];
    for (i = 0; i < list.length; i++) {
      var raw = list[i];
      if (!raw || typeof raw !== "object") continue;
      if (typeof raw.ticketNo === "number" && raw.ticketNo > 0) continue;
      pending.push({
        idx: i,
        ca: typeof raw.createdAt === "number" ? raw.createdAt : 0,
      });
    }
    pending.sort(function (a, b) {
      return a.ca - b.ca;
    });
    pending.forEach(function (p) {
      maxNo++;
      list[p.idx].ticketNo = maxNo;
      changed = true;
    });
    return changed;
  }

  function nextTicketNo(list) {
    var m = 0;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var n = t && typeof t.ticketNo === "number" ? t.ticketNo : 0;
      if (n > m) m = n;
    }
    return m + 1;
  }

  /** Короткий номер для поиска и переписки (например SUP-0042). */
  function formatTicketRef(t) {
    if (!t || typeof t !== "object") return "—";
    var n = typeof t.ticketNo === "number" && t.ticketNo > 0 ? t.ticketNo : 0;
    if (!n) return String(t.id || "").slice(0, 12) + (t.id && String(t.id).length > 12 ? "…" : "");
    return "SUP-" + String(n).padStart(4, "0");
  }

  function normEmail(e) {
    return String(e || "")
      .trim()
      .toLowerCase();
  }

  function now() {
    return Date.now();
  }

  function readRaw() {
    var raw = localStorage.getItem(KEY);
    var list = raw ? safeParse(raw, []) : [];
    if (!Array.isArray(list)) list = [];
    if (migrateTicketNumbers(list)) saveRaw(list);
    return list;
  }

  function saveRaw(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function readStaffReadMap() {
    var raw = localStorage.getItem(STAFF_READ_KEY);
    var o = raw ? safeParse(raw, {}) : {};
    return o && typeof o === "object" ? o : {};
  }

  function saveStaffReadMap(map) {
    localStorage.setItem(STAFF_READ_KEY, JSON.stringify(map));
  }

  /**
   * Есть ли от клиента сообщения новее отметки «просмотрено» (для админа/менеджера).
   */
  function staffTicketHasUnreadClient(ticket) {
    if (!ticket || typeof ticket !== "object") return false;
    var map = readStaffReadMap();
    var seen = map[String(ticket.id)];
    if (typeof seen !== "number" || seen < 0) seen = 0;
    var msgs = Array.isArray(ticket.messages) ? ticket.messages : [];
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (!m || m.side !== "client") continue;
      var at = typeof m.at === "number" ? m.at : 0;
      if (at > seen) return true;
    }
    return false;
  }

  /**
   * Отметить обращение просмотренным (все текущие сообщения клиента считаются прочитанными).
   */
  function markStaffTicketSeen(ticketId) {
    if (!canStaffWrite()) return;
    var id = String(ticketId || "");
    if (!id) return;
    var map = readStaffReadMap();
    map[id] = now();
    saveStaffReadMap(map);
  }

  function normalizeMsg(m) {
    if (!m || typeof m !== "object") return null;
    return {
      id: String(m.id || uid()),
      at: typeof m.at === "number" ? m.at : now(),
      text: String(m.text || "").trim(),
      side: m.side === "staff" ? "staff" : "client",
      fromEmail: String(m.fromEmail || ""),
      fromName: String(m.fromName || ""),
      fromRole: String(m.fromRole || ""),
    };
  }

  function normalizeTicket(t) {
    if (!t || typeof t !== "object") return null;
    var msgs = Array.isArray(t.messages) ? t.messages.map(normalizeMsg).filter(Boolean) : [];
    msgs = msgs.filter(function (x) {
      return x.text && x.text.length;
    });
    msgs.sort(function (a, b) {
      return a.at - b.at;
    });
    var st = String(t.status || "open");
    if (st !== "open" && st !== "closed") st = "open";
    var tno = typeof t.ticketNo === "number" && t.ticketNo > 0 ? Math.floor(t.ticketNo) : 0;
    return {
      id: String(t.id || uid()),
      ticketNo: tno,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : now(),
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : (msgs.length ? msgs[msgs.length - 1].at : now()),
      status: st,
      subject: String(t.subject || "").trim(),
      userEmail: String(t.userEmail || ""),
      userDisplayName: String(t.userDisplayName || ""),
      userRole: String(t.userRole || ""),
      messages: msgs,
    };
  }

  function getAuthSession() {
    var A = w.SkinexAuth;
    return A && typeof A.getSession === "function" ? A.getSession() : null;
  }

  function canClientWrite() {
    var A = w.SkinexAuth;
    return (
      A &&
      typeof A.isLoggedIn === "function" &&
      A.isLoggedIn() &&
      ((typeof A.isUser === "function" && A.isUser()) || (typeof A.isTrader === "function" && A.isTrader()))
    );
  }

  function canStaffWrite() {
    var A = w.SkinexAuth;
    return (
      A &&
      typeof A.isLoggedIn === "function" &&
      A.isLoggedIn() &&
      ((typeof A.isAdmin === "function" && A.isAdmin()) || (typeof A.isManager === "function" && A.isManager()))
    );
  }

  function listMyTickets() {
    var sess = getAuthSession();
    var me = sess && sess.email ? normEmail(sess.email) : "";
    if (!me) return [];
    return readRaw()
      .map(normalizeTicket)
      .filter(function (t) {
        return t && normEmail(t.userEmail) === me;
      })
      .sort(function (a, b) {
        return b.updatedAt - a.updatedAt;
      });
  }

  function listAllTickets() {
    if (!canStaffWrite()) return [];
    return readRaw()
      .map(normalizeTicket)
      .filter(Boolean)
      .sort(function (a, b) {
        return b.updatedAt - a.updatedAt;
      });
  }

  function getTicketById(ticketId) {
    var id = String(ticketId || "");
    if (!id) return null;
    var list = readRaw().map(normalizeTicket).filter(Boolean);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id) return list[i];
    }
    return null;
  }

  function createTicket(subject, firstMessageText) {
    if (!canClientWrite()) {
      return { ok: false, code: "auth", message: "Войти могут только роли «Пользователь» и «Трейдер»." };
    }
    var subj = String(subject || "").trim();
    var msg = String(firstMessageText || "").trim();
    if (subj.length < 3) return { ok: false, code: "bad", message: "Тема слишком короткая (минимум 3 символа)." };
    if (msg.length < 5) return { ok: false, code: "bad", message: "Опишите проблему (минимум 5 символов)." };
    if (subj.length > 140) subj = subj.slice(0, 140);
    if (msg.length > 4000) msg = msg.slice(0, 4000);

    var sess = getAuthSession();
    var email = sess && sess.email ? String(sess.email) : "";
    var disp =
      sess && sess.displayName
        ? String(sess.displayName)
        : email
          ? String(email).split("@")[0]
          : "Пользователь";
    var role = sess && sess.role ? String(sess.role) : "user";

    var list = readRaw();
    var ticketNo = nextTicketNo(list);

    var t = {
      id: uid(),
      ticketNo: ticketNo,
      createdAt: now(),
      updatedAt: now(),
      status: "open",
      subject: subj,
      userEmail: email,
      userDisplayName: disp,
      userRole: role,
      messages: [
        {
          id: uid(),
          at: now(),
          text: msg,
          side: "client",
          fromEmail: email,
          fromName: disp,
          fromRole: role,
        },
      ],
    };
    list.push(t);
    saveRaw(list);
    return { ok: true, ticket: normalizeTicket(t) };
  }

  function addMessage(ticketId, text) {
    var id = String(ticketId || "");
    var body = String(text || "").trim();
    if (!id) return { ok: false, code: "bad", message: "Не выбран запрос." };
    if (body.length < 1) return { ok: false, code: "bad", message: "Сообщение пустое." };
    if (body.length > 4000) body = body.slice(0, 4000);

    var sess = getAuthSession();
    if (!sess) return { ok: false, code: "auth", message: "Войдите в аккаунт." };

    var A = w.SkinexAuth;
    var isStaff = (A && typeof A.isAdmin === "function" && A.isAdmin()) || (A && typeof A.isManager === "function" && A.isManager());
    var isClient = (A && typeof A.isUser === "function" && A.isUser()) || (A && typeof A.isTrader === "function" && A.isTrader());
    if (!isStaff && !isClient) return { ok: false, code: "auth", message: "Недостаточно прав." };

    var list = readRaw();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      var t = normalizeTicket(list[i]);
      if (!t || String(t.id) !== id) continue;
      // доступ: клиент — только свои тикеты
      if (isClient && normEmail(t.userEmail) !== normEmail(sess.email)) {
        return { ok: false, code: "auth", message: "Вы не можете писать в чужой запрос." };
      }
      found = true;
      var side = isStaff ? "staff" : "client";
      var name = sess.displayName ? String(sess.displayName) : sess.email ? String(sess.email).split("@")[0] : "—";
      var msg = {
        id: uid(),
        at: now(),
        text: body,
        side: side,
        fromEmail: sess.email ? String(sess.email) : "",
        fromName: name,
        fromRole: sess.role ? String(sess.role) : "",
      };
      var raw = list[i];
      var msgs = Array.isArray(raw.messages) ? raw.messages.slice() : [];
      msgs.push(msg);
      list[i] = Object.assign({}, raw, { messages: msgs, updatedAt: msg.at });
      break;
    }
    if (!found) return { ok: false, code: "nf", message: "Запрос не найден." };
    saveRaw(list);
    try {
      var updated = normalizeTicket(list[i]);
      var N = w.SkinexNotifications;
      var ref = formatTicketRef(updated);
      if (N && updated) {
        if (side === "staff" && typeof N.enqueueForRecipientEmail === "function" && updated.userEmail) {
          N.enqueueForRecipientEmail(updated.userEmail, {
            kind: "support",
            title: "Сообщение от поддержки",
            body: "Обращение " + ref + ": новый ответ в чате.",
            link: "/support",
          });
        } else if (side === "client" && typeof N.enqueueForStaffSupport === "function") {
          N.enqueueForStaffSupport({
            kind: "support",
            title: "Новое сообщение в тикете",
            body: ref + " — ответ клиента.",
            link: "/support",
          });
        }
      }
    } catch (e) {}
    return { ok: true };
  }

  function setStatus(ticketId, status) {
    if (!canStaffWrite()) return { ok: false, code: "auth", message: "Только админ/менеджер может менять статус." };
    var id = String(ticketId || "");
    var st = String(status || "").trim();
    if (st !== "open" && st !== "closed") return { ok: false, code: "bad", message: "Неизвестный статус." };
    var list = readRaw();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      var t = normalizeTicket(list[i]);
      if (!t || String(t.id) !== id) continue;
      found = true;
      var raw = list[i];
      list[i] = Object.assign({}, raw, { status: st, updatedAt: now() });
      break;
    }
    if (!found) return { ok: false, code: "nf", message: "Запрос не найден." };
    saveRaw(list);
    return { ok: true };
  }

  w.SkinexSupport = {
    KEY: KEY,
    STAFF_READ_KEY: STAFF_READ_KEY,
    listMyTickets: listMyTickets,
    listAllTickets: listAllTickets,
    getTicketById: getTicketById,
    createTicket: createTicket,
    addMessage: addMessage,
    setStatus: setStatus,
    staffTicketHasUnreadClient: staffTicketHasUnreadClient,
    markStaffTicketSeen: markStaffTicketSeen,
    formatTicketRef: formatTicketRef,
  };
})(window);

