/**
 * Карусель баннеров в hero (главная), автопереключение каждые 10 с.
 */
(function (w) {
  var INTERVAL_MS = 10000;

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isHttpUrl(u) {
    var s = String(u || "").trim();
    return /^https?:\/\//i.test(s);
  }

  function slideInnerHtml(b) {
    var img = isHttpUrl(b.imageUrl)
      ? '<div class="hero-banner-bg" style="background-image:url(' + esc(b.imageUrl) + ')"></div>'
      : "";
    var badge = b.badge ? '<span class="badge">' + esc(b.badge) + "</span>" : "";
    var title = b.title ? '<h2 class="hero-card-title">' + esc(b.title) + "</h2>" : "";
    var meta = b.meta ? '<p class="hero-card-meta">' + esc(b.meta) + "</p>" : "";
    return (
      '<div class="hero-card-inner">' +
      img +
      '<div class="hero-orbs" aria-hidden="true"></div>' +
      badge +
      title +
      meta +
      "</div>"
    );
  }

  function renderSlide(b, index, active) {
    var inner = slideInnerHtml(b);
    var link = String(b.linkHref || "").trim();
    var cardInner = link ? '<a class="hero-banner-link" href="' + esc(link) + '">' + inner + "</a>" : inner;
    return (
      '<div class="hero-banner-slide' +
      (active ? " is-active" : "") +
      '" data-banner-index="' +
      index +
      '" role="group" aria-roledescription="slide" aria-label="' +
      esc(b.title || "Баннер " + (index + 1)) +
      '">' +
      '<div class="hero-card">' +
      cardInner +
      "</div>" +
      "</div>"
    );
  }

  function renderDots(count, active) {
    if (count < 2) return "";
    var html = '<div class="hero-banner-dots" role="tablist" aria-label="Выбор баннера">';
    for (var i = 0; i < count; i++) {
      html +=
        '<button type="button" class="hero-banner-dot' +
        (i === active ? " is-active" : "") +
        '" role="tab" aria-selected="' +
        (i === active ? "true" : "false") +
        '" aria-label="Баннер ' +
        (i + 1) +
        '" data-banner-dot="' +
        i +
        '"></button>';
    }
    html += "</div>";
    return html;
  }

  function mountCarousel(root, banners) {
    if (!root || !banners.length) return null;

    var slidesHtml = banners
      .map(function (b, i) {
        return renderSlide(b, i, i === 0);
      })
      .join("");
    root.innerHTML =
      '<div class="hero-banner-viewport">' +
      slidesHtml +
      renderDots(banners.length, 0) +
      "</div>";

    var slides = root.querySelectorAll(".hero-banner-slide");
    var dots = root.querySelectorAll(".hero-banner-dot");
    var current = 0;
    var timer = null;
    var paused = false;

    function setActive(idx) {
      if (!slides.length) return;
      current = ((idx % slides.length) + slides.length) % slides.length;
      slides.forEach(function (el, i) {
        el.classList.toggle("is-active", i === current);
      });
      dots.forEach(function (el, i) {
        el.classList.toggle("is-active", i === current);
        el.setAttribute("aria-selected", i === current ? "true" : "false");
      });
    }

    function next() {
      setActive(current + 1);
    }

    function startTimer() {
      if (timer) clearInterval(timer);
      if (slides.length < 2) return;
      timer = setInterval(function () {
        if (!paused) next();
      }, INTERVAL_MS);
    }

    root.addEventListener("mouseenter", function () {
      paused = true;
    });
    root.addEventListener("mouseleave", function () {
      paused = false;
    });

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var i = parseInt(dot.getAttribute("data-banner-dot"), 10);
        if (isFinite(i)) {
          setActive(i);
          startTimer();
        }
      });
    });

    startTimer();
    return { setActive: setActive, next: next };
  }

  function init() {
    var root = document.getElementById("heroBannerSlider");
    if (!root) return;
    var Store = w.SkinexHomeBanners;
    if (!Store) return;

    function run(list) {
      var banners = (list || []).filter(function (b) {
        return b && b.enabled !== false;
      });
      if (!banners.length) banners = Store.defaultBanners();
      mountCarousel(root, banners);
    }

    if (typeof Store.fetchPublic === "function") {
      Store.fetchPublic().then(run).catch(function () {
        run(Store.getPublicBanners());
      });
    } else {
      run(Store.getPublicBanners());
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  w.SkinexHomeBannerCarousel = { init: init, INTERVAL_MS: INTERVAL_MS };
})(window);
