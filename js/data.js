/** Укажите свой email для кнопки «Отправить заявку» (mailto). */
window.SKINEX_SELLER_EMAIL = "you@example.com";

/**
 * Каталог. Поля description и details показываются на странице товара (/product?id=…).
 * rarity: immortal | mythical | arcana
 */
window.SKINEX_CATALOG = [
  {
    id: "1",
    name: "Feast of Abscession",
    hero: "Pudge",
    rarity: "arcana",
    collectionId: "winter-2025",
    category: "tradeable",
    listPrice: 35000,
    price: 28900,
    icon: "🪝",
    description:
      "Аркана для Pudge с полной сменой модели, анимаций и звуков. Один из самых узнаваемых лотов в Dota 2 — подходит и для игры, и для коллекции.",
    details: [
      "Тип: Arcana, слот «голова» / комплект эффектов",
      "Состояние: tradable после оговорённого срока удержания (если применимо)",
      "Доставка: Steam trade или подарок из магазина по договорённости",
      "По запросу: скриншот из инвентаря и история лота",
    ],
  },
  {
    id: "2",
    name: "Manifold Paradox",
    hero: "Phantom Assassin",
    rarity: "arcana",
    collectionId: "cosmic-2025",
    category: "tradeable",
    price: 31500,
    icon: "🗡️",
    description:
      "Аркана Phantom Assassin с уникальными эффектами на Stifling Dagger и криты. Популярный лот среди коллекционеров и мейнеров героя.",
    details: [
      "Тип: Arcana",
      "В комплекте: кастомные частицы и озвучка",
      "Передача: trade / gift — как удобнее покупателю",
      "Цена может быть пересмотрена при редких вариантах (например, gem)",
    ],
  },
  {
    id: "3",
    name: "Fractal Horns of Inner Abysm",
    hero: "Terrorblade",
    rarity: "arcana",
    collectionId: "ti-2022",
    category: "tradeable",
    price: 27200,
    icon: "👿",
    description:
      "Аркана Terrorblade с демоническими формами и Metamorphosis. Классика премиум-косметики для любителей carry и «двойной» модели героя.",
    details: [
      "Тип: Arcana",
      "Цветовые prism / gem — уточняйте отдельно",
      "Передача через Steam после согласования времени",
      "Возможна съёмка короткого видео превью в клиенте",
    ],
  },
  {
    id: "4",
    name: "Cult of the Demon Trickster",
    hero: "Rubick",
    rarity: "immortal",
    collectionId: "general",
    category: "tradeable",
    price: 4200,
    icon: "🎭",
    description:
      "Тематический сет на Rubick в демоническом стиле: качественная модель и эффекты без статуса Arcana — выгодная точка входа в коллекцию.",
    details: [
      "Тип: Immortal / набор слотов (см. актуальный состав в переписке)",
      "Удобен как подарок или для основного инвентаря",
      "Проверка подлинности через trade window",
    ],
  },
  {
    id: "5",
    name: "Golden Fin of the First Spear",
    hero: "Slardar",
    rarity: "immortal",
    collectionId: "ti-2024",
    category: "tradeable",
    price: 18500,
    icon: "🐟",
    description:
      "Золотая immortal-версия с заметными эффектами на оружие Slardar. Редкий вариант для коллекционеров золотой линейки.",
    details: [
      "Тип: Immortal (golden)",
      "Высокая визуальная заметность в игре",
      "Рекомендуем заранее согласовать способ оплаты",
    ],
  },
  {
    id: "6",
    name: "Magus Accord",
    hero: "Invoker",
    rarity: "immortal",
    collectionId: "cache-2024",
    category: "tradeable",
    price: 9800,
    icon: "✨",
    description:
      "Immortal-предмет для Invoker с эффектами на способности. Отличное дополнение к дорогим сетам на самого техничного mid-героя.",
    details: [
      "Тип: Immortal",
      "Совместимость слотов — уточняется по скриншоту",
      "Передача: trade",
    ],
  },
  {
    id: "7",
    name: "Frostivus 2023 Treasure Bundle",
    hero: "Набор сокровищ",
    rarity: "mythical",
    collectionId: "frostivus-2023",
    category: "physical",
    price: 2100,
    icon: "🎁",
    description:
      "Набор сокровищ Frostivus 2023 — шанс на косметику ограниченного ивента. Подходит, если вы собираете сезонные релизы.",
    details: [
      "Тип: Treasure bundle (неоткрытый / по договорённости)",
      "Состав сундуков фиксируется в переписке",
      "Доставка gift из магазина Steam при наличии такой опции",
    ],
  },
  {
    id: "8",
    name: "Collector’s Cache II (архив)",
    hero: "The International",
    rarity: "mythical",
    collectionId: "ti-2022",
    category: "services",
    price: 5600,
    icon: "📦",
    description:
      "Архивный Collector’s Cache с The International — коллекционная ценность для тех, кто собирает линейку TI.",
    details: [
      "Тип: Mythical treasure (архив)",
      "Точное издание и состояние — по запросу",
      "Возможна продажа нескольких штук со скидкой за объём",
    ],
  },
  {
    id: "9",
    name: "Crimson Witness Bundle",
    hero: "TI редкость",
    rarity: "immortal",
    collectionId: "ti-2024",
    category: "tradeable",
    price: 12400,
    icon: "🔴",
    description:
      "Пакет Crimson Witness — редкость, связанная с просмотром TI. Сильный коллекционный акцент и ограниченная массовая доступность.",
    details: [
      "Тип: Immortal / bundle (уточняется)",
      "Попросите подтверждение происхождения лота",
      "Передача trade после проверки сторон",
    ],
  },
  {
    id: "10",
    name: "Dark Artistry Bundle",
    hero: "Invoker",
    rarity: "immortal",
    collectionId: "general",
    category: "tradeable",
    price: 15200,
    icon: "📜",
    description:
      "Комплект Dark Artistry для Invoker — премиальный образ в тёмной магической эстетике. Часто берут как «ядро» инвентаря на героя.",
    details: [
      "Тип: Immortal bundle",
      "Проверка комплектации по списку слотов",
      "Возможен комплектный trade одним лотом",
    ],
  },
  {
    id: "11",
    name: "Dragonclaw Hook",
    hero: "Pudge",
    rarity: "immortal",
    collectionId: "winter-2025",
    category: "tradeable",
    price: 19800,
    icon: "🐉",
    description:
      "Легендарный Dragonclaw Hook для Pudge — один из самых известных immortal-предметов в экосистеме Dota 2. Высокая ликвидность и узнаваемость.",
    details: [
      "Тип: Immortal, крюк",
      "Просим заранее указать регион и способ оплаты",
      "По желанию: сопровождение первой сделки пошагово",
    ],
  },
  {
    id: "12",
    name: "Axia of Metira",
    hero: "Mirana",
    rarity: "immortal",
    collectionId: "cosmic-2025",
    category: "accounts",
    price: 8900,
    icon: "🌙",
    description:
      "Immortal для Mirana с эффектами на стрелы и лунную тематику. Сбалансированная цена для редкого лота на популярного героя.",
    details: [
      "Тип: Immortal",
      "Совместимость с садами / другими слотами — уточняется",
      "Передача: trade",
    ],
  },
];
