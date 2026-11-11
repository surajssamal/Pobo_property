/**
 * Phone Number Normalization and Validation Utilities for Indian Mobile Numbers
 */

/**
 * Extracts normalized 10-digit mobile number by removing country code (+91, 0) and formatting characters.
 */
export function getClean10DigitPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  // If user entered +91 or 91 or 0 prefix, take the last 10 digits
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Formats a clean 10-digit number into standard Indian display format: +91 98765 43210
 */
export function formatIndianDisplayPhone(raw: string): string {
  const clean = getClean10DigitPhone(raw);
  if (clean.length !== 10) return raw.trim();
  return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
}

/**
 * Validates whether string contains a valid 10-digit Indian mobile number
 * (Starts with 6, 7, 8, or 9)
 */
export function isValidIndianPhone(raw: string): boolean {
  const clean = getClean10DigitPhone(raw);
  return /^[6-9]\d{9}$/.test(clean);
}

/**
 * Local storage submission tracker to detect client-side duplicates
 */
export interface LocalSubmission {
  phone: string;
  cleanPhone: string;
  name: string;
  referenceId: string;
  submittedAt: string;
}

const LOCAL_STORAGE_KEY = 'pobo_submitted_enquiries_v1';

export function getLocalSubmissions(): LocalSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalSubmission[];
  } catch {
    return [];
  }
}

export function saveLocalSubmission(entry: Omit<LocalSubmission, 'submittedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalSubmissions();
    const newEntry: LocalSubmission = {
      ...entry,
      submittedAt: new Date().toISOString(),
    };
    // Keep most recent 20 submissions
    const updated = [newEntry, ...existing.filter((e) => e.cleanPhone !== entry.cleanPhone)].slice(0, 20);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save local submission history:', e);
  }
}

export function findLocalDuplicate(rawPhone: string): LocalSubmission | undefined {
  const clean = getClean10DigitPhone(rawPhone);
  if (!clean || clean.length < 10) return undefined;
  const list = getLocalSubmissions();
  return list.find((item) => item.cleanPhone === clean);
}
