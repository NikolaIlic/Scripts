export type DaxRow = Record<string, unknown>;

/**
 * Read a column out of a Power BI `executeQueries` row.
 *
 * Power BI returns either the bare alias or a qualified name (`[alias]`,
 * `'Table'[alias]`) depending on the query shape, so match on both.
 */
export function daxRaw(row: DaxRow, alias: string): unknown {
  if (alias in row) return row[alias];
  for (const key of Object.keys(row)) {
    if (key === `[${alias}]` || key.endsWith(`[${alias}]`)) return row[key];
  }
  return undefined;
}

export function daxString(row: DaxRow, alias: string): string {
  const value = daxRaw(row, alias);
  return value == null ? '' : String(value);
}

export function daxNumber(row: DaxRow, alias: string): number {
  const value = daxRaw(row, alias);
  if (value == null || value === '') return NaN;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}
