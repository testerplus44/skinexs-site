-- =============================================================================
-- Skinex — схема + пример начальных данных (MySQL 8.0+, InnoDB, utf8mb4)
-- Часть 1: DDL. Часть 2: демо-seed (теги + товар; без пользователей).
-- Хранит: пользователей (логин/хеш пароля), заказы, финансы, товары и теги.
-- Пароли НИКОГДА не хранятся в открытом виде — только password_hash (bcrypt/argon2).
-- UUID: CHAR(36) + DEFAULT (UUID()) — требуется MySQL 8.0.13+.
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- Роли пользователей (расширяемо) — как ENUM колонки
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              CHAR(36) NOT NULL DEFAULT (UUID()) COMMENT 'UUID',
    email           VARCHAR(320) NOT NULL COMMENT 'Уникальный email',
    username        VARCHAR(64) DEFAULT NULL,
    password_hash   VARCHAR(255) NOT NULL COMMENT 'Результат bcrypt/argon2, например $2b$12$...',
    role            ENUM('user', 'admin', 'manager', 'trader') NOT NULL DEFAULT 'user' COMMENT 'user — клиент; admin — полный доступ; manager — поддержка; trader — заявки на цену',
    display_name    VARCHAR(120) DEFAULT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at   DATETIME(6) DEFAULT NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username),
    KEY idx_users_email_lower ((LOWER(email))),
    KEY idx_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Учётные записи: email/username + хеш пароля.';

-- -----------------------------------------------------------------------------
-- Сессии / refresh-токены (опционально для JWT)
-- -----------------------------------------------------------------------------
CREATE TABLE user_sessions (
    id              CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id         CHAR(36) NOT NULL,
    refresh_hash    VARCHAR(128) NOT NULL,
    user_agent      VARCHAR(512) DEFAULT NULL,
    ip_inet         VARCHAR(45) DEFAULT NULL COMMENT 'IPv4/IPv6 текстом',
    expires_at      DATETIME(6) NOT NULL,
    revoked_at      DATETIME(6) DEFAULT NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_sessions_user (user_id),
    KEY idx_sessions_user_active (user_id, revoked_at),
    KEY idx_sessions_expires (expires_at),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Теги товаров (справочник)
-- -----------------------------------------------------------------------------
CREATE TABLE tags (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(64) NOT NULL,
    name        VARCHAR(128) NOT NULL,
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Теги для фильтрации и SEO (arcana, immortal, ti2024).';

-- -----------------------------------------------------------------------------
-- Товары (сеты / лоты на витрине)
-- -----------------------------------------------------------------------------
CREATE TABLE products (
    id              CHAR(36) NOT NULL DEFAULT (UUID()),
    external_sku    VARCHAR(64) DEFAULT NULL,
    name            VARCHAR(200) NOT NULL,
    hero            VARCHAR(120) NOT NULL,
    rarity          ENUM('arcana', 'immortal', 'mythical') NOT NULL DEFAULT 'mythical',
    price_amount    DECIMAL(12, 2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'RUB',
    description     TEXT,
    details         JSON DEFAULT NULL COMMENT 'JSON-массив строк, напр. ["пункт 1","пункт 2"]',
    icon_emoji      VARCHAR(16) DEFAULT NULL,
    image_url       VARCHAR(2000) DEFAULT NULL,
    video_url       VARCHAR(2000) DEFAULT NULL,
    is_published    TINYINT(1) NOT NULL DEFAULT 1,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_external_sku (external_sku),
    KEY idx_products_published (is_published, sort_order),
    KEY idx_products_rarity_pub (rarity, is_published),
    KEY idx_products_hero_lower ((LOWER(hero))),
    CONSTRAINT chk_products_price CHECK (price_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Ассортимент сайта: цена, медиа, описание.';

-- Связь товар ↔ тег (M:N)
CREATE TABLE product_tags (
    product_id  CHAR(36) NOT NULL,
    tag_id      INT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, tag_id),
    KEY idx_product_tags_tag (tag_id),
    CONSTRAINT fk_pt_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Заказы (история покупок)
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
    id              CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id         CHAR(36) NOT NULL,
    status          ENUM(
                        'draft',
                        'awaiting_payment',
                        'paid',
                        'processing',
                        'completed',
                        'cancelled',
                        'refunded'
                    ) NOT NULL DEFAULT 'awaiting_payment',
    total_amount    DECIMAL(12, 2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'RUB',
    note            TEXT,
    paid_at         DATETIME(6) DEFAULT NULL,
    completed_at    DATETIME(6) DEFAULT NULL,
    cancelled_at    DATETIME(6) DEFAULT NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_orders_user_created (user_id, created_at DESC),
    KEY idx_orders_status (status),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_orders_total CHECK (total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='История покупок: активные и завершённые.';

CREATE TABLE order_items (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id        CHAR(36) NOT NULL,
    product_id      CHAR(36) NOT NULL,
    quantity        INT NOT NULL,
    unit_price      DECIMAL(12, 2) NOT NULL,
    snapshot_name   VARCHAR(200) NOT NULL,
    snapshot_hero   VARCHAR(120) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT chk_oi_qty CHECK (quantity > 0),
    CONSTRAINT chk_oi_price CHECK (unit_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Движение средств: пополнение, вывод, оплата заказа, возврат
-- -----------------------------------------------------------------------------
CREATE TABLE wallet_ledger (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         CHAR(36) NOT NULL,
    kind            ENUM(
                        'deposit',
                        'withdrawal',
                        'order_hold',
                        'order_capture',
                        'order_refund',
                        'fee',
                        'admin_adjustment'
                    ) NOT NULL,
    status          ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    amount          DECIMAL(12, 2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'RUB',
    balance_after   DECIMAL(14, 2) DEFAULT NULL COMMENT 'Опционально: баланс после проводки',
    reference_type  VARCHAR(32) DEFAULT NULL,
    reference_id    CHAR(36) DEFAULT NULL,
    external_ref    VARCHAR(256) DEFAULT NULL,
    meta            JSON DEFAULT NULL,
    idempotency_key VARCHAR(128) DEFAULT NULL COMMENT 'Защита от двойного списания',
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at    DATETIME(6) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_wallet_idempotency (idempotency_key),
    KEY idx_ledger_user_time (user_id, created_at DESC),
    KEY idx_ledger_kind (kind, status),
    KEY idx_ledger_reference (reference_type, reference_id),
    CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_wallet_amount_nonzero CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Пополнения и списания: amount > 0 зачисление, < 0 списание (см. kind).';

-- -----------------------------------------------------------------------------
-- updated_at: колонки users / products / orders — ON UPDATE CURRENT_TIMESTAMP(6)
-- (аналог триггеров set_updated_at в PostgreSQL).
-- Представление user_balances: баланс = сумма amount по завершённым проводкам.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW user_balances AS
SELECT
    u.id AS user_id,
    CAST(COALESCE(SUM(CASE WHEN l.status = 'completed' THEN l.amount ELSE 0 END), 0) AS DECIMAL(14, 2)) AS balance
FROM users u
LEFT JOIN wallet_ledger l ON l.user_id = u.id
GROUP BY u.id;

-- =============================================================================
-- Часть 2: демо-данные (опционально; для чистой БД после всех CREATE / VIEW)
-- Замените password_hash на реальный bcrypt-хеш, если добавите INSERT в users.
-- =============================================================================

INSERT IGNORE INTO tags (slug, name) VALUES
    ('arcana', 'Arcana'),
    ('immortal', 'Immortal'),
    ('mythical', 'Mythical'),
    ('collector', 'Коллекционное'),
    ('ti', 'The International');

INSERT INTO products (external_sku, name, hero, rarity, price_amount, description, details, icon_emoji, is_published, sort_order)
SELECT
    'demo-001',
    'Пример сета',
    'Invoker',
    'immortal',
    9900.00,
    'Демонстрационная карточка из seed.',
    CAST('["Доставка Steam", "Tradable"]' AS JSON),
    '✨',
    1,
    0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE external_sku = 'demo-001');
