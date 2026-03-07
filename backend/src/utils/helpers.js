// backend/src/utils/helpers.js
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

/**
 * Generate 8-character alphanumeric reset ticket
 */
export function generateResetTicket() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ticket = '';
  for (let i = 0; i < 8; i++) {
    ticket += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ticket;
}

/**
 * Generate Employee ID: 4-digit year + 5-digit sequence
 */
export function generateEmployeeId(year, sequence) {
  const yr = year || new Date().getFullYear();
  const seq = String(sequence).padStart(5, '0');
  return `${yr}${seq}`;
}

/**
 * Generate ULI Number placeholder (T2MIS generates actual one)
 * Format: PH-[region]-[sequence]
 */
export function generateULIPlaceholder() {
  const seq = Math.floor(100000 + Math.random() * 900000);
  return `PH-IVA-${seq}`;
}

/**
 * Calculate age from birth components
 */
export function calculateAge(month, day, year) {
  if (!month || !day || !year) return null;
  const months = {
    January: 0, February: 1, March: 2, April: 3,
    May: 4, June: 5, July: 6, August: 7,
    September: 8, October: 9, November: 10, December: 11
  };
  const monthIndex = typeof month === 'string' ? (months[month] ?? parseInt(month) - 1) : month - 1;
  const birthDate = new Date(year, monthIndex, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

/**
 * Format date for display
 */
export function formatDate(date) {
  return dayjs(date).format('MMMM DD, YYYY');
}

/**
 * Sanitize string input
 */
export function sanitize(str) {
  if (!str) return '';
  return String(str).trim().replace(/[<>]/g, '');
}
