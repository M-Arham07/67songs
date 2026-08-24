// Non-ambiguous 30-character uppercase alphanumeric alphabet (excluding 0/O, 1/I/L)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length: number = 4): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    code += ALPHABET[randomIndex];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  if (!input) return "";
  let clean = input.trim().toUpperCase();

  // Substitute easily confused characters
  clean = clean
    .replace(/0/g, "O")
    .replace(/1/g, "L")
    .replace(/I/g, "L")
    .replace(/[^A-Z0-9]/g, "");

  return clean.slice(0, 4);
}
