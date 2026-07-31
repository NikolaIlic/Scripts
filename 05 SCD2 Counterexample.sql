/*
    Meridian Bikes - virtualized silver layer benchmark
    Script 05: the counterexample - SCD Type 2 stays materialized

    Article section: "Where this breaks", objection 1.

    An SCD2 dimension must compare incoming state against previously
    RECORDED state to close old rows and open new ones. "Previously
    recorded" is by definition a materialized concept - a view would
    have to re-derive all of history on every query.

    Rule of thumb from the article:
      If the transformation needs to REMEMBER something -> materialize.
      If it only looks at what's in front of it        -> virtualize.

    This script demonstrates the pattern as a table with an explicit
    upsert flow. Run it after a simulated change lands in bronze.
*/

-- ---------------------------------------------------------------
-- One-time: initialize the SCD2 customer dimension
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS silver_mat.customers_scd2;
GO
CREATE TABLE silver_mat.customers_scd2 AS
SELECT
    customer_business_key,
    first_name,
    last_name,
    email_masked,
    country_code,
    city,
    CAST('1900-01-01' AS DATETIME2(6))  AS valid_from,
    CAST('9999-12-31' AS DATETIME2(6))  AS valid_to,
    CAST(1 AS BIT)                      AS is_current
FROM silver.customers;   -- note: reads through the stateless view - the two patterns compose
GO

-- ---------------------------------------------------------------
-- Simulate a change arriving in bronze: customer 42 moves city
-- ---------------------------------------------------------------
INSERT INTO bronze.crm_customers
    (customer_business_key, first_name, last_name, email,
     country_raw, city, load_timestamp, source_system)
SELECT
    customer_business_key,
    first_name,
    last_name,
    'user42@example.com',
    country_raw,
    'Linz',                -- the change
    SYSDATETIME(),
    'CRM'
FROM bronze.crm_customers
WHERE customer_business_key = 'CUST-0000042'
  AND load_timestamp = (SELECT MAX(load_timestamp)
                        FROM bronze.crm_customers
                        WHERE customer_business_key = 'CUST-0000042');
GO

-- ---------------------------------------------------------------
-- Incremental SCD2 maintenance: close changed rows, insert new versions
-- (Two-step flow; wrap in a stored procedure in production.)
-- ---------------------------------------------------------------

-- Step 1: close current rows where the incoming state differs
UPDATE silver_mat.customers_scd2
SET valid_to  = SYSDATETIME(),
    is_current = 0
FROM silver_mat.customers_scd2 AS d
JOIN silver.customers          AS s
    ON d.customer_business_key = s.customer_business_key
WHERE d.is_current = 1
  AND (   d.city         <> s.city
       OR d.country_code <> s.country_code
       OR d.last_name    <> s.last_name);
GO

-- Step 2: open new versions for those keys
INSERT INTO silver_mat.customers_scd2
    (customer_business_key, first_name, last_name, email_masked,
     country_code, city, valid_from, valid_to, is_current)
SELECT
    s.customer_business_key,
    s.first_name,
    s.last_name,
    s.email_masked,
    s.country_code,
    s.city,
    SYSDATETIME(),
    CAST('9999-12-31' AS DATETIME2(6)),
    1
FROM silver.customers          AS s
JOIN silver_mat.customers_scd2 AS d
    ON s.customer_business_key = d.customer_business_key
WHERE d.is_current = 0
  AND NOT EXISTS (SELECT 1
                  FROM silver_mat.customers_scd2 AS cur
                  WHERE cur.customer_business_key = s.customer_business_key
                    AND cur.is_current = 1);
GO

-- ---------------------------------------------------------------
-- Verify: customer 42 now has two versions with validity intervals
-- ---------------------------------------------------------------
SELECT customer_business_key, city, valid_from, valid_to, is_current
FROM silver_mat.customers_scd2
WHERE customer_business_key = 'CUST-0000042'
ORDER BY valid_from;
GO

/*
    The point to make in the article:

    The incremental flow above touched only the changed keys. A
    view-based "SCD2" would need to reconstruct every validity
    interval from the full bronze history on every single query -
    the exact work incremental processing exists to avoid, and no
    amount of GPU changes the asymptotics of recomputing history
    versus appending to it.

    Also worth showing: the stateless silver.customers VIEW feeds
    the stateful materialized dimension. Virtualized and materialized
    silver are not competing architectures - they compose, per entity.
*/