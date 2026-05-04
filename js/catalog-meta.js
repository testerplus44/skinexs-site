/**
 * Коллекции (сундуки / ивенты) и категории маркетплейса — для сайдбара каталога.
 * Копии по умолчанию в SKINEX_*_DEFAULT; правки админа подмешиваются через catalog-meta-store.js.
 * У коллекции или категории можно задать parentId (ID другой строки верхнего уровня) — вложенный список на главной.
 */
(function (w) {
  var collections = [
    { id: "all", name: "Все коллекции" },
    { id: "winter-2025", name: "Winter 2025 Collector's Cache" },
    { id: "cosmic-2025", name: "Cosmic 2025 Heroes' Hoard" },
    { id: "ti-2022", name: "The International 2022" },
    { id: "ti-2024", name: "The International 2024" },
    { id: "cache-2024", name: "Collector's Cache 2024" },
    { id: "frostivus-2023", name: "Frostivus 2023" },
    { id: "general", name: "General / Other" },
  ];

  var categories = [
    { id: "all", name: "Все категории" },
    { id: "tradeable", name: "Обмениваемые товары" },
    { id: "accounts", name: "Аккаунты" },
    { id: "services", name: "Услуги" },
    { id: "physical", name: "Физические товары" },
  ];

  w.SKINEX_COLLECTIONS_DEFAULT = JSON.parse(JSON.stringify(collections));
  w.SKINEX_CATEGORIES_DEFAULT = JSON.parse(JSON.stringify(categories));
  w.SKINEX_COLLECTIONS = collections;
  w.SKINEX_CATEGORIES = categories;
})(window);
