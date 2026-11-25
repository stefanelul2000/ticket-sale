// Mirrors App\Support\TicketCode on the backend.
export const TICKET_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 10;

/**
 * Normalise scanner/keyboard input: accepts the public URL from the QR code
 * (https://host/t/CODE), lower case and missing dashes. Unknown formats pass through trimmed.
 */
export function normalizeTicketCode(input: string): string {
  let trimmed = input.trim();
  const fromUrl = trimmed.match(/\/t\/([A-Za-z0-9_-]{3,32})\/?(?:[?#].*)?$/);
  if (fromUrl) trimmed = fromUrl[1];
  const compact = trimmed.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (compact.length === LENGTH && [...compact].every((c) => TICKET_ALPHABET.includes(c))) {
    return `${compact.slice(0, 5)}-${compact.slice(5)}`;
  }
  return trimmed;
}

export const ticketUrl = (publicUrl: string, code: string) => `${publicUrl.replace(/\/+$/, '')}/t/${code}`;
