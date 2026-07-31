/*
    Meridian Bikes - virtualized silver layer benchmark
    Script 02: gold star schema, built THROUGH silver views

    Gold stays materialized (BI concurrency wants physical tables).
    The refresh reads through silver views, so it always sees
    bronze-current data. This is the "views arm" of the benchmark -
    time this script end to end.

    Re-run pattern: drop and CTAS. In production you would wrap this
    in a stored procedure; kept flat here for benchmark clarity.
*/

DECLARE @t_start DATETIME2(3) = SYSDATETIME();

-- ---------------------------------------------------------------
-- gold.dim_product
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS gold.dim_product;
GO
CREATE TABLE gold.dim_product AS
SELECT
    ROW_NUMBER() OVER (ORDER BY product_id)  AS product_key,
    product_id,
    product_name,
    category,
    list_price
FROM silver.products;
GO

-- ---------------------------------------------------------------
-- gold.dim_customer
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS gold.dim_customer;
GO
CREATE TABLE gold.dim_customer AS
SELECT
    ROW_NUMBER() OVER (ORDER BY customer_business_key) AS customer_key,
    customer_business_key,
    first_name,
    last_name,
    email_masked,
    country_code,
    city
FROM silver.customers;
GO

-- ---------------------------------------------------------------
-- gold.dim_date (covers the generated 2-year window)
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS gold.dim_date;
GO
CREATE TABLE gold.dim_date AS
WITH ten AS (
    SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) AS t(n)
),
nums AS (
    SELECT a.n * 100 + b.n * 10 + c.n AS n
    FROM ten a CROSS JOIN ten b CROSS JOIN ten c
),
days AS (
    SELECT DATEADD(DAY, -n, CAST('2026-07-01' AS DATE)) AS date_value
    FROM nums
    WHERE n < 731
)
SELECT
    CAST(CONVERT(VARCHAR(8), date_value, 112) AS INT)  AS date_key,
    date_value,
    YEAR(date_value)                                   AS year_number,
    MONTH(date_value)                                  AS month_number,
    DATENAME(MONTH, date_value)                        AS month_name,
    DATEPART(QUARTER, date_value)                      AS quarter_number
FROM days;
GO

-- ---------------------------------------------------------------
-- gold.fact_sales
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS gold.fact_sales;
GO
CREATE TABLE gold.fact_sales AS
SELECT
    CAST(CONVERT(VARCHAR(8), s.order_date, 112) AS INT) AS date_key,
    c.customer_key,
    p.product_key,
    s.order_id,
    s.quantity,
    s.unit_price,
    CAST(s.quantity * s.unit_price AS DECIMAL(18,2))    AS gross_amount,
    s.source_system
FROM silver.sales_orders AS s
JOIN gold.dim_customer   AS c
    ON s.customer_business_key = c.customer_business_key
JOIN gold.dim_product    AS p
    ON s.product_id = p.product_id;
GO

-- ---------------------------------------------------------------
-- Elapsed time for the full gold refresh through views
-- ---------------------------------------------------------------
-- Note: GO separates batches, so @t_start does not survive.
-- For precise numbers use script 04 (query insights based timing).
SELECT 'gold refresh through views complete' AS status, SYSDATETIME() AS finished_at;
GO

SELECT 'gold.fact_sales' AS table_name, COUNT(*) AS row_count FROM gold.fact_sales;
GO