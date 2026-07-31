/*
    Meridian Bikes - virtualized silver layer benchmark
    Script 00: bronze setup and synthetic data generation

    Target: Microsoft Fabric Data Warehouse
    Creates deliberately messy bronze data:
      - bronze.crm_customers : 500K rows, ~5% duplicates, inconsistent country values, raw PII
      - bronze.sales_orders  : 10M rows, ~2% duplicates, EU decimal formats, test orders
      - bronze.products      : 100 rows, light mess

    Volumes are controlled by the cross-join depth in each CTAS - see comments.
    Runtime note: generate data once; all benchmark arms read the same bronze.
*/

-- ---------------------------------------------------------------
-- Schemas
-- ---------------------------------------------------------------
CREATE SCHEMA bronze;
GO
CREATE SCHEMA silver;
GO
CREATE SCHEMA silver_mat;   -- comparison arm: materialized silver
GO
CREATE SCHEMA gold;
GO
CREATE SCHEMA gold_mat;     -- gold built from materialized silver
GO

-- ---------------------------------------------------------------
-- Numbers helper: 10 base rows, cross-joined for volume
-- ---------------------------------------------------------------
-- Each cross join of "ten" multiplies row count by 10.
-- customers: 10^6 * 0.5 -> 500K   | orders: 10^7 -> 10M

-- ---------------------------------------------------------------
-- bronze.products (100 rows)
-- ---------------------------------------------------------------
CREATE TABLE bronze.products AS
WITH ten AS (
    SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) AS t(n)
),
nums AS (
    SELECT a.n * 10 + b.n AS n
    FROM ten a CROSS JOIN ten b
)
SELECT
    n + 1                                                        AS product_id,
    CASE n % 5
        WHEN 0 THEN 'Meridian Apex '      + CAST(n AS VARCHAR(10))
        WHEN 1 THEN 'Meridian Gravel '    + CAST(n AS VARCHAR(10))
        WHEN 2 THEN 'Meridian Urban '     + CAST(n AS VARCHAR(10))
        WHEN 3 THEN 'Meridian E-Drive '   + CAST(n AS VARCHAR(10))
        ELSE        'Meridian Junior '    + CAST(n AS VARCHAR(10))
    END                                                          AS product_name,
    CASE n % 5
        WHEN 0 THEN 'Road'
        WHEN 1 THEN 'Gravel'
        WHEN 2 THEN 'City'
        WHEN 3 THEN 'E-Bike'
        ELSE        'Kids'
    END                                                          AS category_raw,
    CAST(299 + (n % 40) * 100 AS DECIMAL(18,2))                  AS list_price,
    CAST(SYSDATETIME() AS DATETIME2(6))                            AS load_timestamp
FROM nums;
GO

-- ---------------------------------------------------------------
-- bronze.crm_customers (500K clean + ~25K duplicate rows)
-- ---------------------------------------------------------------
-- Mess included on purpose:
--   * country_raw arrives as ISO2, ISO3, English name, or local name
--   * every 20th business key is re-sent with a later load_timestamp (CRM retry)
--   * raw emails (PII) - masking is silver's job
CREATE TABLE bronze.crm_customers AS
WITH ten AS (
    SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) AS t(n)
),
nums AS (
    -- 10^6 rows, keep 500K
    SELECT
        a.n * 100000 + b.n * 10000 + c.n * 1000 +
        d.n * 100    + e.n * 10    + f.n          AS n
    FROM ten a CROSS JOIN ten b CROSS JOIN ten c
               CROSS JOIN ten d CROSS JOIN ten e CROSS JOIN ten f
),
base AS (
    SELECT n FROM nums WHERE n < 500000
),
customers AS (
    SELECT
        'CUST-' + RIGHT('0000000' + CAST(n AS VARCHAR(10)), 7)   AS customer_business_key,
        CASE n % 8
            WHEN 0 THEN 'Anna'   WHEN 1 THEN 'Lukas'
            WHEN 2 THEN 'Maria'  WHEN 3 THEN 'David'
            WHEN 4 THEN 'Sofia'  WHEN 5 THEN 'Jonas'
            WHEN 6 THEN 'Elena'  ELSE        'Felix'
        END                                                      AS first_name,
        CASE n % 6
            WHEN 0 THEN ' Gruber'      -- leading space: silver trims it
            WHEN 1 THEN 'Huber'
            WHEN 2 THEN 'Wagner '      -- trailing space
            WHEN 3 THEN 'Novak'
            WHEN 4 THEN 'Schmidt'
            ELSE        'Weber'
        END                                                      AS last_name,
        'user' + CAST(n AS VARCHAR(10)) + '@example.com'         AS email,
        -- the country chaos: same country, four spellings
        CASE n % 12
            WHEN 0  THEN 'AT'      WHEN 1  THEN 'Austria'
            WHEN 2  THEN 'AUT'     WHEN 3  THEN 'at'
            WHEN 4  THEN 'DE'      WHEN 5  THEN 'Germany'
            WHEN 6  THEN 'Deutschland'
            WHEN 7  THEN 'CH'      WHEN 8  THEN 'Switzerland'
            WHEN 9  THEN 'IT'      WHEN 10 THEN 'Italy'
            ELSE         'italia'
        END                                                      AS country_raw,
        CASE n % 7
            WHEN 0 THEN 'Vienna'   WHEN 1 THEN 'Salzburg'
            WHEN 2 THEN 'Munich'   WHEN 3 THEN 'Zurich'
            WHEN 4 THEN 'Milan'    WHEN 5 THEN 'Graz'
            ELSE        'Innsbruck'
        END                                                      AS city,
        DATEADD(DAY, -(n % 730), CAST('2026-07-01' AS DATETIME2(6))) AS load_timestamp,
        'CRM'                                                    AS source_system
    FROM base
)
SELECT * FROM customers
UNION ALL
-- duplicate wave: every 20th customer re-sent one day later (CRM retry snapshot)
SELECT
    customer_business_key,
    first_name,
    last_name,
    email,
    country_raw,
    city,
    DATEADD(DAY, 1, load_timestamp) AS load_timestamp,
    'CRM'                           AS source_system
FROM customers
WHERE CAST(RIGHT(customer_business_key, 7) AS INT) % 20 = 0;
GO

-- ---------------------------------------------------------------
-- bronze.sales_orders (10M rows + ~200K duplicates + test orders)
-- ---------------------------------------------------------------
-- Mess included on purpose:
--   * unit_price_raw as VARCHAR: EU sources send '1.249,99', US sources '1249.99'
--   * every 50th order duplicated with a later load_timestamp (ingestion retry)
--   * ~1% test orders flagged is_test_order = 1 (must be filtered in silver)
CREATE TABLE bronze.sales_orders AS
WITH ten AS (
    SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) AS t(n)
),
nums AS (
    -- 10^7 rows = 10M. Drop one CROSS JOIN for a 1M smoke-test run.
    SELECT
        a.n * 1000000 + b.n * 100000 + c.n * 10000 + d.n * 1000 +
        e.n * 100     + f.n * 10     + g.n                       AS n
    FROM ten a CROSS JOIN ten b CROSS JOIN ten c CROSS JOIN ten d
               CROSS JOIN ten e CROSS JOIN ten f CROSS JOIN ten g
),
orders AS (
    SELECT
        'ORD-' + RIGHT('00000000' + CAST(n AS VARCHAR(12)), 8)   AS order_id,
        'CUST-' + RIGHT('0000000' + CAST(n % 500000 AS VARCHAR(10)), 7)
                                                                 AS customer_business_key,
        (n % 100) + 1                                            AS product_id,
        CONVERT(VARCHAR(10),
                DATEADD(DAY, -(n % 730), CAST('2026-07-01' AS DATE)),
                120)                                             AS order_date_raw,
        (n % 3) + 1                                              AS quantity,
        -- EU sources: '1.249,99' | US sources: '1249.99'
        CASE WHEN n % 2 = 0
             THEN CAST((n % 15) + 1 AS VARCHAR(5)) + '.' +
                  RIGHT('000' + CAST((n % 900) + 100 AS VARCHAR(5)), 3) + ',' +
                  RIGHT('00'  + CAST(n % 100 AS VARCHAR(4)), 2)
             ELSE CAST(((n % 15) + 1) * 1000 + (n % 900) + 100 AS VARCHAR(10)) + '.' +
                  RIGHT('00'  + CAST(n % 100 AS VARCHAR(4)), 2)
        END                                                      AS unit_price_raw,
        CASE WHEN n % 100 = 99 THEN 1 ELSE 0 END                 AS is_test_order,
        CASE WHEN n % 2 = 0 THEN 'SHOP_EU' ELSE 'SHOP_US' END    AS source_system,
        DATEADD(SECOND, n % 86400,
                DATEADD(DAY, -(n % 730), CAST('2026-07-01' AS DATETIME2(6))))
                                                                 AS load_timestamp
    FROM nums
)
SELECT * FROM orders
UNION ALL
-- duplicate wave: every 50th order re-ingested an hour later
SELECT
    order_id,
    customer_business_key,
    product_id,
    order_date_raw,
    quantity,
    unit_price_raw,
    is_test_order,
    source_system,
    DATEADD(HOUR, 1, load_timestamp) AS load_timestamp
FROM orders
WHERE CAST(RIGHT(order_id, 8) AS INT) % 50 = 0;
GO

-- ---------------------------------------------------------------
-- Sanity checks
-- ---------------------------------------------------------------
SELECT 'bronze.products'      AS table_name, COUNT(*) AS row_count FROM bronze.products
UNION ALL
SELECT 'bronze.crm_customers',              COUNT(*)              FROM bronze.crm_customers
UNION ALL
SELECT 'bronze.sales_orders',               COUNT(*)              FROM bronze.sales_orders;
GO