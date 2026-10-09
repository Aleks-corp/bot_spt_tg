import fs from "fs";
import { JWT } from "google-auth-library";
import { generatePassword } from "../utils/generatePassword.js";
import { buildEmailLogin } from "../utils/transliterate.js";

const SCOPES = ["https://www.googleapis.com/auth/admin.directory.user"];
const DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN || "oano.ukr.education";

let jwtClient = null;

// Ліниво створює JWT-клієнт на основі Service Account Key (JSON),
// делегованого через "Domain-wide delegation" в Admin console.
function getClient() {
  if (jwtClient) return jwtClient;

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;

  if (!keyPath || !adminEmail) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS або GOOGLE_WORKSPACE_ADMIN_EMAIL не задані в .env",
    );
  }

  const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

  jwtClient = new JWT({
    email: keyFile.client_email,
    key: keyFile.private_key,
    scopes: SCOPES,
    subject: adminEmail, // імперсонований супер-адмін домену
  });

  return jwtClient;
}

// Складає повну адресу пошти з логіна (без @domain), якщо потрібно.
function toEmail(login) {
  return login.includes("@") ? login : `${login}@${DOMAIN}`;
}

// Скидає пароль користувача Google Workspace і повертає новий пароль.
// Вимагає, щоб сервісний акаунт мав domain-wide delegation зі scope
// https://www.googleapis.com/auth/admin.directory.user.
export async function resetWorkspacePassword(login) {
  const client = getClient();
  const email = toEmail(login);
  const newPassword = generatePassword();

  await client.request({
    url: `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}`,
    method: "PUT",
    data: {
      password: newPassword,
      changePasswordAtNextLogin: true,
    },
  });

  return { email, newPassword };
}

function isDuplicateEmailError(err) {
  if (err?.response?.status === 409) return true;
  const reason = err?.response?.data?.error?.errors?.[0]?.reason;
  return reason === "duplicate";
}

// Створює нового користувача Google Workspace. Логін пошти формується з
// прізвища та першої літери імені (транслітерація), напр. bereznuk.o.
// Якщо такий логін вже зайнятий — додає цифру (bereznuk.o1, bereznuk.o2, ...).
export async function createWorkspaceUser({ firstName, lastName, department }) {
  const client = getClient();
  const baseLogin = buildEmailLogin(lastName, firstName);
  const newPassword = generatePassword();

  let login = baseLogin;
  let attempt = 0;

  while (attempt < 5) {
    const email = toEmail(login);
    try {
      await client.request({
        url: "https://admin.googleapis.com/admin/directory/v1/users",
        method: "POST",
        data: {
          primaryEmail: email,
          name: { givenName: firstName, familyName: lastName },
          password: newPassword,
          changePasswordAtNextLogin: true,
          organizations: [{ department, primary: true }],
        },
      });
      return { email, newPassword };
    } catch (err) {
      if (!isDuplicateEmailError(err)) throw err;
      attempt += 1;
      login = `${baseLogin}${attempt}`;
    }
  }

  throw new Error(`Не вдалося підібрати вільний логін для ${baseLogin}`);
}
