// Mirrors App\Support\TicketCode on the backend.
export const TICKET_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 10;

/** Normalise scanner/keyboard input: trims, upper-cases, fixes the dash. Unknown formats pass through trimmed. */
export function normalizeTicketCode(input: string): string {
  const trimmed = input.trim();
  const compact = trimmed.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (compact.length === LENGTH && [...compact].every((c) => TICKET_ALPHABET.includes(c))) {
    return `${compact.slice(0, 5)}-${compact.slice(5)}`;
  }
  return trimmed;
}
