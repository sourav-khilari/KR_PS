import { normalizeText } from './normalize.js';

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function normalizeSeederText(value) {
  return normalizeText(value);
}

export function normalizeSeederOwnerName(value) {
  return normalizeSeederText(value);
}

export function normalizeSeederOwnerKey(value) {
  return normalizeSeederText(value).toUpperCase();
}

export function normalizeSeederPan(value) {
  return normalizeSeederText(value).toUpperCase();
}

export function normalizeSeederTruckNumber(value) {
  return normalizeSeederText(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hasMeaningfulValue(value) {
  return normalizeSeederText(value).length > 0;
}

export function isValidSeederPan(value) {
  return PAN_PATTERN.test(normalizeSeederPan(value));
}

export function pickPreferredDisplayValue(currentValue, incomingValue) {
  const current = normalizeSeederText(currentValue);
  const incoming = normalizeSeederText(incomingValue);

  if (!current) return incoming;
  if (!incoming) return current;
  if (incoming.length > current.length) return incoming;
  return current;
}