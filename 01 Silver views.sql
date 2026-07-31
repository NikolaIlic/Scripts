/*
    Meridian Bikes - virtualized silver layer benchmark
    Script 01: silver as views (the article's proposal)

    Silver is a schema of view definitions - transformation logic as code.
    No pipeline, no load, no storage. Executes against bronze-current data
    on every read.
*/

-- ---------------------------------------------------------------
-- silver.customers
-- Dedup on business key (latest load wins), trim names,
-- mask PII, conform country chaos to ISO2.
-- ---------------------------------------------------------------
CREATE VIEW silver.customers AS
WITH deduplicated AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY customer_business_key
            ORDER BY load_timestamp DESC
        ) AS rn
    FROM bronze.crm_customers
)
SELECT
    customer_business_key,
    TRIM(first_name)                                             AS first_name,
    TRIM(last_name)                                              AS last_name,
    -- PII masking is structural: raw email never leaves bronze
    LEFT(email, 2) + '***@' +
        RIGHT(email, LEN(email) - CHARINDEX('@', email))         AS email_masked,
    CASE UPPER(TRIM(country_raw))
        WHEN 'AT'           THEN 'AT'
        WHEN 'AUT'          THEN 'AT'
        WHEN 'AUSTRIA'      THEN 'AT'
        WHEN 'DE'           THEN 'DE'
        WHEN 'GERMANY'      THEN 'DE'
        WHEN 'DEUTSCHLAND'  THEN 'DE'
        WHEN 'CH'           THEN 'CH'
        WHEN 'SWITZERLAND'  THEN 'CH'
        WHEN 'IT'           THEN 'IT'
        WHEN 'ITALY'        THEN 'IT'
        WHEN 'ITALIA'       THEN 'IT'
        ELSE 'UNKNOWN'
    END                                                          AS country_code,
    city,
    load_timestamp
FROM deduplicated
WHERE rn = 1;
GO

-- ---------------------------------------------------------------
-- silver.sales_orders
-- Dedup on (order_id, source_system), normalize EU decimal format,
-- cast dates, filter test orders.
-- ---------------------------------------------------------------
CREATE VIEW silver.sales_orders AS
WITH deduplicated AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY order_id, source_system
            ORDER BY load_timestamp DESC
        ) AS rn
    FROM bronze.sales_orders
)
SELECT
    order_id,
    customer_business_key,
    product_id,
    CAST(order_date_raw AS DATE)                                 AS order_date,
    quantity,
    CAST(
        CASE
            -- EU format '1.249,99': strip thousands dot, comma becomes decimal point
            WHEN CHARINDEX(',', unit_price_raw) > 0
                THEN REPLACE(REPLACE(unit_price_raw, '.', ''), ',', '.')
            -- US format '1249.99': already castable
            ELSE unit_price_raw
        END
        AS DECIMAL(18,2)
    )                                                            AS unit_price,
    source_system
FROM deduplicated
WHERE rn = 1
  AND is_test_order = 0;
GO

-- ---------------------------------------------------------------
-- silver.products
-- Light conforming: stable category labels.
-- ---------------------------------------------------------------
CREATE VIEW silver.products AS
SELECT
    product_id,
    product_name,
    CASE category_raw
        WHEN 'Road'   THEN 'Road'
        WHEN 'Gravel' THEN 'Gravel'
        WHEN 'City'   THEN 'City'
        WHEN 'E-Bike' THEN 'E-Bike'
        WHEN 'Kids'   THEN 'Kids'
        ELSE 'Other'
    END                                                          AS category,
    list_price
FROM bronze.products;
GO

-- ---------------------------------------------------------------
-- Sanity checks: dedup and conforming worked
-- ---------------------------------------------------------------
SELECT 'silver.customers'   AS entity, COUNT(*) AS row_count FROM silver.customers
UNION ALL
SELECT 'silver.sales_orders',          COUNT(*)              FROM silver.sales_orders
UNION ALL
SELECT 'silver.products',              COUNT(*)              FROM silver.products;
GO

-- Expect exactly one row per business key
SELECT TOP 10 customer_business_key, COUNT(*) AS cnt
FROM silver.customers
GROUP BY customer_business_key
HAVING COUNT(*) > 1;
GO

-- Expect zero UNKNOWN countries with this generator
SELECT country_code, COUNT(*) AS cnt
FROM silver.customers
GROUP BY country_code
ORDER BY cnt DESC;
GO