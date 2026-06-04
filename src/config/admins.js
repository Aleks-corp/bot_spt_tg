// Telegram ID адміністраторів техвідділу
export const ADMIN_IDS = [
  505182524, // Aleks_corp
  385541809, // Nimuer
  6241446031, // Alexander
  1699784029, // Vladislav
];

export const isAdmin = (userId) => ADMIN_IDS.includes(userId);
