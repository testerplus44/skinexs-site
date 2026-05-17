(function () {
  var Auth = window.SkinexAuth;
  var form = document.getElementById("formForgot");
  var msg = document.getElementById("forgotMsg");

  function setMsg(text, ok) {
    if (!msg) return;
    msg.textContent = text || "";
    msg.style.color = ok ? "#86d759" : text ? "#f87171" : "";
  }

  if (Auth && Auth.isLoggedIn && Auth.isLoggedIn()) {
    setMsg("Вы уже вошли. Перенаправление…", true);
    setTimeout(function () {
      window.location.href = "/";
    }, 400);
    if (form) form.hidden = true;
    return;
  }

  form &&
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setMsg("", false);
      var fd = new FormData(form);
      var email = fd.get("email");
      Auth.requestPasswordReset(email).then(function (res) {
        if (res.ok) {
          setMsg(res.message || "Проверьте почту.", true);
        } else {
          setMsg(res.message || "Не удалось отправить.", false);
        }
      });
    });
})();
