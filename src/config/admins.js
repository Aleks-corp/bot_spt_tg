// Telegram ID адміністраторів техвідділу
export const ADMIN_IDS = [
  505182524, // Aleks_corp
  // 385541809, // Nimuer
];

export const isAdmin = (userId) => ADMIN_IDS.includes(userId);
