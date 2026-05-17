/**
 * Баннеры главной: сервер (SQLite) или localStorage.
 */
(function (w) {
  var KEY = "skinex_home_banners";

  function apiPath(p) {
    var base = w.SKINEX_API_BASE != null ? String(w.SKINEX_API_BASE).trim().replace(/\/?$/, "") : "";
    if (!p || p.charAt(0) !== "/") p = "/" + (p || "");
    return base ? base + p : p;
  }

  function useServer() {
    return !!w.SKINEX_USE_SERVER_API;
  }

  function uid() {
    if (w.crypto && typeof w.crypto.randomUUID === "function") return "bn_" + w.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    return "bn_" + Date.now() + "_" + String(Math.random()).slice(2, 9);
  }

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return fallback;
    }
  }

  function defaultBanners() {
    return [
      {
        id: uid(),
        badge: "Эксклюзив",
        title: "Архивная коллекция",
        meta: "Immortal · Mythical · Collector's Cache",
        imageUrl: "",
        linkHref: "#catalog",
        sortOrder: 0,
        enabled: true,
      },
    ];
  }

  function normalizeBanner(b) {
    if (!b || typeof b !== "object") return null;
    var id = typeof b.id === "string" && b.id.trim() ? b.id.trim() : uid();
    return {
      id: id,
      badge: String(b.badge || "").trim(),
      title: String(b.title || "").trim() || "Баннер",
      meta: String(b.meta || "").trim(),
      imageUrl: String(b.imageUrl || b.image_url || "").trim(),
      linkHref: String(b.linkHref || b.link_href || "").trim(),
      sortOrder: typeof b.sortOrder === "number" && isFinite(b.sortOrder) ? Math.floor(b.sortOrder) : 0,
      enabled: b.enabled !== false,
    };
  }

  function sortList(list) {
    return list.slice().sort(function (a, b) {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function readLocal() {
    var raw = localStorage.getItem(KEY);
    if (raw == null || raw === "") {
      var seeded = defaultBanners();
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded.map(normalizeBanner).filter(Boolean);
    }
    var arr = safeParse(raw, []);
    if (!Array.isArray(arr) || !arr.length) {
      var d = defaultBanners();
      localStorage.setItem(KEY, JSON.stringify(d));
      return d.map(normalizeBanner).filter(Boolean);
    }
    return sortList(arr.map(normalizeBanner).filter(Boolean));
  }

  function writeLocal(list) {
    var clean = sortList(list.map(normalizeBanner).filter(Boolean));
    localStorage.setItem(KEY, JSON.stringify(clean));
    return clean;
  }

  function getBanners() {
    return readLocal();
  }

  function getPublicBanners() {
    return sortList(getBanners().filter(function (b) {
      return b.enabled;
    }));
  }

  function cacheFromServerList(banners) {
    if (!Array.isArray(banners)) return getBanners();
    var clean = sortList(
      banners.map(normalizeBanner).filter(Boolean),
    );
    if (clean.length) writeLocal(clean);
    return clean.length ? clean : getBanners();
  }

  function fetchPublic() {
    if (!useServer() || typeof w.fetch !== "function") {
      return Promise.resolve(getPublicBanners());
    }
    return w
      .fetch(apiPath("/api/v1/public/home-banners"), { credentials: "include" })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (r) {
        if (!r.res.ok || !r.data || !r.data.ok) throw new Error((r.data && r.data.message) || "Ошибка загрузки баннеров.");
        return cacheFromServerList(r.data.banners);
      })
      .then(function (all) {
        return sortList(all.filter(function (b) {
          return b.enabled;
        }));
      })
      .catch(function () {
        return getPublicBanners();
      });
  }

  function fetchAdmin() {
    if (!useServer() || typeof w.fetch !== "function") {
      return Promise.resolve({ ok: true, banners: getBanners() });
    }
    return w
      .fetch(apiPath("/api/v1/admin/home-banners"), { credentials: "include" })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (r) {
        if (!r.res.ok || !r.data || !r.data.ok) throw new Error((r.data && r.data.message) || "Нет доступа.");
        var list = cacheFromServerList(r.data.banners);
        return { ok: true, banners: list };
      });
  }

  function addBannerLocal(patch) {
    var list = getBanners();
    var maxSort = -1;
    list.forEach(function (b) {
      if (b.sortOrder > maxSort) maxSort = b.sortOrder;
    });
    var b = normalizeBanner(
      Object.assign({}, patch || {}, {
        id: uid(),
        sortOrder: patch && patch.sortOrder != null ? patch.sortOrder : maxSort + 1,
      }),
    );
    list.push(b);
    writeLocal(list);
    return b;
  }

  function updateBannerLocal(id, patch) {
    var list = getBanners();
    var idx = list.findIndex(function (x) {
      return String(x.id) === String(id);
    });
    if (idx < 0) return null;
    list[idx] = normalizeBanner(Object.assign({}, list[idx], patch || {}, { id: list[idx].id }));
    writeLocal(list);
    return list[idx];
  }

  function removeBannerLocal(id) {
    var list = getBanners().filter(function (x) {
      return String(x.id) !== String(id);
    });
    writeLocal(list);
    return list;
  }

  function createBanner(patch) {
    if (!useServer()) {
      return Promise.resolve({ ok: true, banner: addBannerLocal(patch) });
    }
    return w
      .fetch(apiPath("/api/v1/admin/home-banners"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch || {}),
      })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (r) {
        if (!r.res.ok || !r.data || !r.data.ok) throw new Error((r.data && r.data.message) || "Ошибка сохранения.");
        return fetchAdmin().then(function (out) {
          return { ok: true, banner: r.data.banner };
        });
      });
  }

  function updateBanner(id, patch) {
    if (!useServer()) {
      var b = updateBannerLocal(id, patch);
      return b ? Promise.resolve({ ok: true, banner: b }) : Promise.reject(new Error("Баннер не найден."));
    }
    return w
      .fetch(apiPath("/api/v1/admin/home-banners/" + encodeURIComponent(id)), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch || {}),
      })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (r) {
        if (!r.res.ok || !r.data || !r.data.ok) throw new Error((r.data && r.data.message) || "Ошибка сохранения.");
        updateBannerLocal(id, r.data.banner);
        return { ok: true, banner: r.data.banner };
      });
  }

  function removeBanner(id) {
    if (!useServer()) {
      removeBannerLocal(id);
      return Promise.resolve({ ok: true });
    }
    return w
      .fetch(apiPath("/api/v1/admin/home-banners/" + encodeURIComponent(id)), {
        method: "DELETE",
        credentials: "include",
      })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (r) {
        if (!r.res.ok || !r.data || !r.data.ok) throw new Error((r.data && r.data.message) || "Ошибка удаления.");
        removeBannerLocal(id);
        return { ok: true };
      });
  }

  w.SkinexHomeBanners = {
    KEY: KEY,
    getBanners: getBanners,
    getPublicBanners: getPublicBanners,
    fetchPublic: fetchPublic,
    fetchAdmin: fetchAdmin,
    cacheFromServerList: cacheFromServerList,
    addBannerLocal: addBannerLocal,
    updateBannerLocal: updateBannerLocal,
    removeBannerLocal: removeBannerLocal,
    createBanner: createBanner,
    updateBanner: updateBanner,
    removeBanner: removeBanner,
    defaultBanners: defaultBanners,
  };
})(window);
