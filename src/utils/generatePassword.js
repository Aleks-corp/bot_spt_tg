import crypto from "crypto";

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*_-+=";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function randomChar(charset) {
  const idx = crypto.randomInt(0, charset.length);
  return charset[idx];
}

function shuffle(str) {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

// Генерує пароль, що задовольняє вимоги Google Workspace (8-100 символів,
// ASCII). Гарантує наявність хоча б одного символу кожного типу.
export function generatePassword(length = 14) {
  const required = [
    randomChar(LOWER),
    randomChar(UPPER),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];
  let rest = "";
  for (let i = required.length; i < length; i++) {
    rest += randomChar(ALL);
  }
  return shuffle(required.join("") + rest);
}
