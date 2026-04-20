import bcrypt from "bcryptjs"; // bcrypt para comparar contraseñas hasheadas
import users from "../models/users.js"; // modelo de usuarios
import { signAccessToken, signRefreshToken } from "../shared/jwt.js"; // funciones para generar tokens de acceso y refresh

const MAX_ATTEMPTS = 5; // número máximo de intentos de login
const BLOCK_DURATION_MS = 5 * 60 * 1000; // duración del bloqueo (5 minutos)

/**
 * Resultado de intento de login.
 * @typedef {{ ok: true, token: string, user: object }
 *          | { ok: false, status: 'not_found'|'blocked'|'wrong_password', message: string }} LoginResult
 */

/**
 * Busca el usuario, valida la contraseña y gestiona el bloqueo por intentos.
 * No sabe nada de HTTP — devuelve un objeto de resultado que el controlador interpreta.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<LoginResult>}
 */
export const attemptLogin = async (email, password) => {
  const user = await users.findOne({ email }); // buscamos el usuario

  if (!user) { // si no encontramos el usuario, devolvemos un resultado con ok: false y un mensaje de error específico
    return { ok: false, status: "not_found", message: "Usuario no encontrado" };
  }

  if (isBlocked(user)) { // si el usuario está bloqueado, devolvemos un resultado con ok: false y un mensaje de error específico
    return { ok: false, status: "blocked", message: "Cuenta bloqueada temporalmente" };
  }

  // comparamos la contraseña proporcionada con la contraseña hasheada
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) { // si la contraseña no coincide, registramos el intento
    await registerFailedAttempt(user);
    const blocked = isBlocked(user); // verificamos si el usuario se bloqueó después de registrar el intento fallido
    return { // devolvemos un resultado con ok: false, el estado específico (blocked o wrong_password) y un mensaje de error específico
      ok: false,
      status: blocked ? "blocked" : "wrong_password",
      message: blocked
        ? "Cuenta bloqueada por múltiples intentos fallidos"
        : "Contraseña incorrecta",
    };
  }

  await resetAttempts(user); // si la contraseña coincide, reiniciamos los intentos fallidos

  // generamos los tokens de acceso y refresh con el payload
  const tokenPayload = { id: user._id, userType: user.userType || "usuario" };
  const accessToken  = signAccessToken(tokenPayload); // generamos el token
  const refreshToken = signRefreshToken(tokenPayload); // firmamos el token

  return { // devolvemos un resultado con ok: true, los tokens y los datos del usuario (sin la contraseña)
    ok: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      userType: user.userType || "usuario",
    },
  };
};

// Función para verificar si un usuario está bloqueado por intentos fallidos
const isBlocked = (user) =>
  Boolean(user.timeOut && user.timeOut > Date.now());

// Función para registrar un intento fallido de login
const registerFailedAttempt = async (user) => {
  user.loginAttemps = (user.loginAttemps || 0) + 1;

  // si el número de intentos supera el máximo permitido, bloqueamos al usuario por un tiempo determinado
  if (user.loginAttemps >= MAX_ATTEMPTS) {
    user.timeOut = Date.now() + BLOCK_DURATION_MS;
    user.loginAttemps = 0;
  }

  // guardamos los cambios en el usuario
  await user.save();
};

// Función para reiniciar los intentos fallidos después de un login exitoso
const resetAttempts = async (user) => {
  user.loginAttemps = 0; // reiniciamos el contador de intentos fallidos
  user.timeOut = null; // eliminamos cualquier bloqueo temporal
  await user.save(); // guardamos los cambios en la base de datos
};


