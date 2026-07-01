export function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

export function normalizeOwnerName(value) {
  return normalizeText(value).toUpperCase();
}

export function normalizePan(value) {
  return normalizeText(value).toUpperCase();
}

export function normalizeTruckNumber(value) {
  return normalizeText(value).toUpperCase().replace(/\s+/g, '');
}
