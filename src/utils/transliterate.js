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
