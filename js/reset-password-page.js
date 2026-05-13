(function () {
  var Auth = window.SkinexAuth;
  var form = document.getElementById("formReset");
  var msg = document.getElementById("resetMsg");
  var lead = document.getElementById("resetLead");
  var params = new URLSearchParams(window.location.search);
  var token = params.get("token") || "";

  function setMsg(text, ok) {
    if (!msg) return;
    msg.textContent = text || "";
    msg.style.color = ok ? "#86d759" : text ? "#f87171" : "";
  }

  if (Auth && Auth.isLoggedIn && Auth.isLoggedIn()) {
    if (lead) lead.textContent = "Вы уже вошли.";
    setMsg("Перенаправление…", true);
    setTimeout(function () {
      window.location.href = "index.html";
    }, 400);
    if (form) form.hidden = true;
    return;
  }

  if (!token || String(token).length < 64) {
    if (lead) lead.textContent = "Ссылка неполная или устарела.";
    setMsg("Запросите новую ссылку на странице «Забыли пароль?».", false);
    if (form) form.hidden = true;
    return;
  }

  if (form) form.hidden = false;

  form &&
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setMsg("", false);
      var p1 = document.getElementById("resetPassword");
      var p2 = document.getElementById("resetPassword2");
      var a = p1 ? String(p1.value) : "";
      var b = p2 ? String(p2.value) : "";
      if (a !== b) {
        setMsg("Пароли не совпадают.", false);
        return;
      }
      Auth.resetPasswordWithToken(token, a).then(function (res) {
        if (res.ok) {
          setMsg(res.message || "Готово. Сейчас перенаправим на вход…", true);
          setTimeout(function () {
            window.location.href = "auth.html";
          }, 1200);
        } else {
          setMsg(res.message || "Ошибка.", false);
        }
      });
    });
})();
