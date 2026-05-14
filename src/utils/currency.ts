
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Use this for displaying prices with decimals (e.g. $34,207.23)
export const formatPrice = (value: number | string | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num)) return "$0.00";

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};