/*
    Meridian Bikes - virtualized silver layer benchmark
    Script 04 (v2): measurement

    STRUCTURE (changed vs v1):
      Section A - the six benchmark queries. Run this section 3x
                  back-to-back for warm medians, and once more
                  after a capacity pause/resume for a cold run.
      Section B - the queryinsights export, now at the END and
                  with automatic labeling of every statement.

    WHY THE RESTRUCTURE:
      queryinsights ingests with a delay (up to ~15 minutes). In v1
      the export ran FIRST, so each export only showed the previous
      run - and a pause/resume made even that unreliable. Section B
      must therefore be executed as a separate run, at least 15
      minutes after the last Section A execution.
*/

-- ================================================================
-- SECTION A - benchmark queries
-- Run order inside one pass: B1 views, B1 tables, B2 views,
-- B2 tables, B3 views, B3 tables.
-- ================================================================

/* B1. Ad-hoc aggregation: revenue by country and month */

-- B1 views arm: transformation logic executes now, against bronze
SELECT
    c.country_code,
    YEAR(s.order_date)  AS year_number,
    MONTH(s.order_date) AS month_number,
    COUNT(*)            AS order_count,
    SUM(CAST(s.quantity * s.unit_price AS DECIMAL(18,2))) AS revenue
FROM silver.sales_orders AS s
JOIN silver.customers    AS c
    ON s.customer_business_key = c.customer_business_key
GROUP BY c.country_code, YEAR(s.order_date), MONTH(s.order_date)
ORDER BY revenue DESC;
GO

-- B1 tables arm
SELECT
    c.country_code,
    YEAR(s.order_date)  AS year_number,
    MONTH(s.order_date) AS month_number,
    COUNT(*)            AS order_count,
    SUM(CAST(s.quantity * s.unit_price AS DECIMAL(18,2))) AS revenue
FROM silver_mat.sales_orders AS s
JOIN silver_mat.customers    AS c
    ON s.customer_business_key = c.customer_business_key
GROUP BY c.country_code, YEAR(s.order_date), MONTH(s.order_date)
ORDER BY revenue DESC;
GO

/* B2. Selective lookup: one customer's order history.
   Views-arm warning for the article: the ROW_NUMBER() dedup blocks
   predicate pushdown, so this executes the dedup over ALL rows to
   serve one customer - expect the worst views-arm ratio here. */

-- B2 views arm
SELECT s.order_id, s.order_date, s.quantity, s.unit_price
FROM silver.sales_orders AS s
WHERE s.customer_business_key = 'CUST-0000042'
ORDER BY s.order_date;
GO

-- B2 tables arm
SELECT s.order_id, s.order_date, s.quantity, s.unit_price
FROM silver_mat.sales_orders AS s
WHERE s.customer_business_key = 'CUST-0000042'
ORDER BY s.order_date;
GO

/* B3. Wide scan: full-history aggregate with the expensive bits */

-- B3 views arm
SELECT source_system, COUNT(*) AS orders, AVG(unit_price) AS avg_price
FROM silver.sales_orders
GROUP BY source_system;
GO

-- B3 tables arm
SELECT source_system, COUNT(*) AS orders, AVG(unit_price) AS avg_price
FROM silver_mat.sales_orders
GROUP BY source_system;
GO

-- ================================================================
-- SECTION B - labeled timing export
-- RUN THIS SEPARATELY, AT LEAST 15 MINUTES AFTER THE LAST
-- SECTION A PASS. Adjust @since to cover your whole session
-- (build phase + all benchmark passes). Times in queryinsights
-- are UTC - set @since generously wide rather than too narrow.
-- ================================================================

DECLARE @since DATETIME2(6) = DATEADD(HOUR, -6, SYSUTCDATETIME());

SELECT
    CASE
        -- build phase
        WHEN command LIKE 'CREATE TABLE bronze.%'                THEN '00 bronze data generation'
        WHEN command LIKE 'CREATE VIEW silver.%'                 THEN '01 silver view creation'
        WHEN command LIKE 'CREATE TABLE gold.%'                  THEN '02 gold refresh (views arm)'
        WHEN command LIKE 'CREATE TABLE silver_mat.%'            THEN '03 silver_mat load (tables arm)'
        WHEN command LIKE 'CREATE TABLE gold_mat.%'              THEN '03 gold_mat refresh (tables arm)'
        -- benchmark queries: check _mat variants first is not
        -- needed - 'silver.' never matches 'silver_mat.'
        WHEN command LIKE '%FROM silver_mat.sales_orders%country_code%'      THEN 'B1 tables'
        WHEN command LIKE '%FROM silver.sales_orders%country_code%'          THEN 'B1 views'
        WHEN command LIKE '%FROM silver_mat.sales_orders%CUST-0000042%'      THEN 'B2 tables'
        WHEN command LIKE '%FROM silver.sales_orders%CUST-0000042%'          THEN 'B2 views'
        WHEN command LIKE '%AVG(unit_price)%FROM silver_mat.sales_orders%'   THEN 'B3 tables'
        WHEN command LIKE '%AVG(unit_price)%FROM silver.sales_orders%'       THEN 'B3 views'
        ELSE NULL
    END                                        AS benchmark_step,
    start_time,
    total_elapsed_time_ms,
    allocated_cpu_time_ms,
    data_scanned_disk_mb,
    data_scanned_memory_mb,
    LEFT(command, 100)                         AS command_preview
FROM queryinsights.exec_requests_history
WHERE start_time > @since
  AND (
        command LIKE 'CREATE TABLE bronze.%'
     OR command LIKE 'CREATE VIEW silver.%'
     OR command LIKE 'CREATE TABLE gold%'
     OR command LIKE 'CREATE TABLE silver_mat.%'
     OR command LIKE '%FROM silver.sales_orders%'
     OR command LIKE '%FROM silver_mat.sales_orders%'
      )
ORDER BY start_time;
GO

/*
    Reading the export:
    - benchmark_step labels every relevant statement; NULL rows are
      incidental statements you can ignore
    - consecutive passes of Section A appear as repeating
      B1v/B1t/B2v/B2t/B3v/B3t blocks - the gaps in start_time
      separate the passes
    - the first pass after build = cold-ish, passes 2-3 = warm,
      the pass after capacity pause/resume = cold
    - report the MEDIAN of the warm passes per step

    Results template for the article:

    | Scenario                                | Tables arm | Views arm |
    |-----------------------------------------|-----------:|----------:|
    | Bronze-to-silver load                   |       [n]s |        0s |
    | Gold refresh                            |       [n]s |      [n]s |
    | End-to-end fresh bronze -> fresh gold   |       [n]s |      [n]s |
    | B1 aggregation (warm, median of 3)      |       [n]s |      [n]s |
    | B2 point lookup (warm, median of 3)     |       [n]s |      [n]s |
    | B3 wide scan (warm, median of 3)        |       [n]s |      [n]s |
    | Silver storage footprint                |      [n]GB |      0 GB |

    Storage footprint: check the silver_mat schema tables in the
    OneLake catalog or the capacity metrics app - that number is
    the storage cost of materialization.
*/