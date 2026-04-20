import HttpResponses from "../traits/HttpResponses.js"; // manejador de respuestas HTTP
import { attemptLogin } from "../services/loginService.js"; // lógica de login
import { clearAuthCookies, setAuthCookies } from "../shared/cookies.js"; // cookies de autenticación
import { // funciones para obtener tokens de la request
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
} from "../shared/requestTokens.js";
import { revokeToken } from "../shared/revokedTokens.js";

const loginController = {}; // objeto controlador para login

// Controlador para manejar la ruta POST /api/login
loginController.login = async (req, res) => {
  const { email, password } = req.validatedBody; // obtenemos email y password del body
  try {
    const result = await attemptLogin(email, password); // intentamos loguear al usuario
    if (!result.ok) {
      const handlers = {
        // manejadores específicos para cada tipo de error de login
        not_found: () => HttpResponses.notFound(res, result.message),
        blocked: () => HttpResponses.forbidden(res, result.message),
        wrong_password: () => HttpResponses.unauthorized(res, result.message),
      };
      return (
        handlers[result.status]?.() ?? // manejamos el error específico o badRequest
        HttpResponses.badRequest(res, result.message)
      );
    }

    setAuthCookies(res, result.accessToken, result.refreshToken); // seteamos cookies de autenticación

    return HttpResponses.ok(
      // respondemos con el token y datos del usuario
      res,
      { accessToken: result.accessToken, user: result.user },
      "Login exitoso", // mensaje de éxito
    );
  } catch (error) {
    // manejamos errores inesperados con un 500
    return HttpResponses.serverError(
      res,
      "Error interno del servidor",
      error.message,
    );
  }
};

loginController.logout = async (req, res) => {
  try { // revocamos los tokens de acceso y refresh obtenidos de la request y limpiamos las cookies de autenticación
    revokeToken(getAccessTokenFromRequest(req));
    revokeToken(getRefreshTokenFromRequest(req));
    clearAuthCookies(res);
    return HttpResponses.ok(res, null, "Logout exitoso"); // respondemos con un mensaje de éxito
  } catch (error) {
    return HttpResponses.serverError( // manejamos errores inesperados con un 500
      res,
      "Error interno del servidor",
      error.message,
    );
  }
};

export default loginController; // exportamos el controlador para usarlo en las rutas
