// Спрощена практична транслітерація кирилиці в латиницю для логінів пошти
// (НЕ державний стандарт паспортної транслітерації — тут "ю"->"u", "я"->"a"
// без вставки "i", щоб логіни вийшли короткими, напр. Березнюк -> bereznuk).
const MAP = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "e",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "u",
  я: "a",
  "'": "",
  "’": "",
  ʼ: "",
  "-": "-",
  " ": "",
};

export function transliterate(text) {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => {
      if (ch in MAP) return MAP[ch];
      if (/[a-z0-9]/.test(ch)) return ch;
      return "";
    })
    .join("");
}

// Формує логін пошти: транслітероване прізвище + "." + перша літера імені.
// Приклад: buildEmailLogin("Березнюк", "Олена") -> "bereznuk.o"
export function buildEmailLogin(lastName, firstName) {
  const lastPart = transliterate(lastName.trim());
  const firstInitial = transliterate(firstName.trim()).charAt(0);
  return `${lastPart}.${firstInitial}`;
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Формує пароль за замовчуванням: транслітероване прізвище з великої
// літери + "2026". Приклад: buildPasswordFromName("Березнюк") -> "Bereznuk2026"
export function buildPasswordFromName(lastName) {
  return `${capitalize(transliterate(lastName.trim()))}2026`;
}

// Те саме, але з логіна пошти (напр. "bereznuk.o" або "bereznuk.o@domain"),
// коли прізвище окремо не відоме (скидання пароля).
// Приклад: buildPasswordFromLogin("bereznuk.o") -> "Bereznuk2026"
export function buildPasswordFromLogin(login) {
  const surname = login.trim().split("@")[0].split(".")[0];
  return `${capitalize(surname)}2026`;
}
