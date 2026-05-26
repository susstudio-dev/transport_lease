/**
 * Indian-numbering-system number-to-words for amounts.
 * Handles values up to 99 Crore. Returns e.g.
 *   125000.5 → "Indian Rupee One Lakh Twenty Five Thousand Only and Fifty Paise"
 *
 * Designed for GST invoice "amount in words" lines.
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n] ?? '';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (TENS[tens] ?? '') + (ones ? ' ' + ONES[ones] : '');
}

function threeDigit(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigit(rest));
  return parts.join(' ').trim();
}

function integerToWordsIndian(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  const hundreds = n;

  if (crore) parts.push(`${integerToWordsIndian(crore)} Crore`);
  if (lakh) parts.push(`${twoDigit(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigit(thousand)} Thousand`);
  if (hundreds) parts.push(threeDigit(hundreds));
  return parts.join(' ').trim();
}

/**
 * Format an INR amount as a GST-friendly "amount in words" string.
 *   formatInrInWords('125000.50') → "Indian Rupee One Lakh Twenty Five Thousand Only and Fifty Paise"
 */
export function formatInrInWords(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return '';

  const rupees = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - rupees) * 100);

  const rupeeWords = `Indian Rupee ${integerToWordsIndian(rupees)} Only`;
  if (paise === 0) return rupeeWords;
  return `${rupeeWords} and ${twoDigit(paise)} Paise`;
}
