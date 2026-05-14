/**
 * User-defined formula for estimate calculations.
 * Expression can reference measurement keys (e.g. roof_area_sqft, valleys_ft) and use +, -, *, /, ().
 */

export interface Formula {
  id: string;
  name: string;
  key: string;
  expression: string;
  description?: string;
  sortOrder: number;
}
