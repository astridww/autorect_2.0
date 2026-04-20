import crypto from "crypto"; // para generar códigos de verificación aleatorios
import bcryptjs from "bcryptjs"; // para hashear contraseñas
import userModel from "../models/users.js"; // modelo de usuarios para interactuar con la base de datos
import sendEmail from "./emailService.js"; // función para enviar correos electrónicos
import { signVerificationToken, verifyToken } from "../shared/jwt.js"; // funciones para firmar y verificar tokens de verificación
import { config } from "../../config.js"; // configuración de la aplicación, incluyendo datos de correo y URL del frontend

/**
 * Inicia el flujo de registro:
 * verifica duplicado, hashea password, genera código, firma token y envía correo.
 *
 * @returns {{ ok: true, token: string }
 *          | { ok: false, status: 'already_exists'|'email_config_missing', message: string }}
 */
export const initiateRegistration = async ({ name, lastName, birthDate, email, password, userType }) => {
  const existing = await userModel.findOne({ email });
  if (existing) {
    return { ok: false, status: "already_exists", message: "El usuario ya existe" };
  }

  if (!config.email.senderEmail || !config.email.senderPassword) {
    return { ok: false, status: "email_config_missing", message: "Configuración de correo incompleta" };
  }

  const passwordHashed = await bcryptjs.hash(password, 10);
  const verificationCode = crypto.randomBytes(3).toString("hex");

  const token = signVerificationToken(
    { verificationCode, name, lastName, birthDate, email, password: passwordHashed, userType },
  );

  const otpRoute = "/register/otp";
  const frontendBase = (config.app.frontendUrl || "http://localhost:5173").replace(/\/+$/, "");
  const otpUrl = `${frontendBase}${otpRoute}`;

  await sendEmail(config.email.senderEmail, config.email.senderPassword, email, verificationCode, otpUrl);

  return { ok: true, token };
};

/**
 * Confirma el registro comparando el código del usuario con el token de la cookie.
 *
 * @returns {{ ok: true, user: object }
 *          | { ok: false, status: 'missing_cookie'|'invalid_token'|'incomplete_token'|'wrong_code', message: string }}
 */
export const confirmRegistration = async (verificationCodeRequest, registrationToken) => {
  if (!registrationToken) {
    return { ok: false, status: "missing_cookie", message: "Cookie de registro no encontrada o expirada" };
  }

  const verification = verifyToken(registrationToken, "access");
  if (!verification.ok) {
    return { ok: false, status: "invalid_token", message: "El enlace de verificación ha expirado" };
  }
  const decoded = verification.payload;

  const {
    verificationCode: storedCode,
    name,
    lastName,
    birthDate,
    email,
    password,
    userType,
  } = decoded;

  if (!name || !lastName || !birthDate || !email || !password) {
    return {
      ok: false,
      status: "incomplete_token",
      message: "Datos de registro incompletos, vuelve a registrarte",
    };
  }

  if (verificationCodeRequest !== storedCode) {
    return { ok: false, status: "wrong_code", message: "Código de verificación inválido" };
  }

  const newUser = new userModel({ // creamos el nuevo usuario con los datos del token decodificado
    name, // el nombre del usuario
    lastName, // el apellido del usuario
    birthDate, // la fecha de nacimiento del usuario
    email, // el correo electrónico del usuario
    password, // la contraseña hasheada del usuario
    userType: userType || "usuario", // el tipo de usuario, si no se especifica se asigna "usuario"
    isVerified: false, // inicialmente el usuario no está verificado
  });
  // guardamos el nuevo usuario en la base de datos
  await newUser.save();

  return { ok: true, user: newUser }; // devolvemos un resultado con ok: true
};
