/*
    Meridian Bikes - virtualized silver layer benchmark
    Script 03: the comparison arm - traditional materialized silver

    Same transformation logic as the views in script 01, but persisted
    as tables (the classic medallion approach), plus gold built from
    those tables.

    For a fair end-to-end comparison, the "tables arm" total time is:
        (silver_mat load)  +  (gold_mat refresh)
    versus the "views arm":
        (gold refresh through views)   -- script 02 only

    Storage comparison: after running this script, compare OneLake
    storage consumed by the silver_mat schema against zero for silver.
*/

-- ---------------------------------------------------------------
-- Bronze-to-silver load (this step does not exist in the views arm)
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS silver_mat.customers;
GO
CREATE TABLE silver_mat.customers AS
SELECT * FROM silver.customers;   -- identical logic, now persisted
GO

DROP TABLE IF EXISTS silver_mat.sales_orders;
GO
CREATE TABLE silver_mat.sales_orders AS
SELECT * FROM silver.sales_orders;
GO

DROP TABLE IF EXISTS silver_mat.products;
GO
CREATE TABLE silver_mat.products AS
SELECT * FROM silver.products;
GO

SELECT 'silver_mat load complete' AS status, SYSDATETIME() AS finished_at;
GO

-- ---------------------------------------------------------------
-- Gold refresh from materialized silver
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS gold_mat.dim_product;
GO
CREATE TABLE gold_mat.dim_product AS
SELECT
    ROW_NUMBER() OVER (ORDER BY product_id)  AS product_key,
    product_id,
    product_name,
    category,
    list_price
FROM silver_mat.products;
GO

DROP TABLE IF EXISTS gold_mat.dim_customer;
GO
CREATE TABLE gold_mat.dim_customer AS
SELECT
    ROW_NUMBER() OVER (ORDER BY customer_business_key) AS customer_key,
    customer_business_key,
    first_name,
    last_name,
    email_masked,
    country_code,
    city
FROM silver_mat.customers;
GO

DROP TABLE IF EXISTS gold_mat.fact_sales;
GO
CREATE TABLE gold_mat.fact_sales AS
SELECT
    CAST(CONVERT(VARCHAR(8), s.order_date, 112) AS INT) AS date_key,
    c.customer_key,
    p.product_key,
    s.order_id,
    s.quantity,
    s.unit_price,
    CAST(s.quantity * s.unit_price AS DECIMAL(18,2))    AS gross_amount,
    s.source_system
FROM silver_mat.sales_orders AS s
JOIN gold_mat.dim_customer   AS c
    ON s.customer_business_key = c.customer_business_key
JOIN gold_mat.dim_product    AS p
    ON s.product_id = p.product_id;
GO

SELECT 'gold_mat refresh complete' AS status, SYSDATETIME() AS finished_at;
GO

-- Row counts must match the views arm exactly - same logic, same bronze
SELECT 'gold.fact_sales'     AS table_name, COUNT(*) AS row_count FROM gold.fact_sales
UNION ALL
SELECT 'gold_mat.fact_sales',               COUNT(*)              FROM gold_mat.fact_sales;
GO