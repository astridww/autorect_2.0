import express from "express"; // framework web para Node.js
import cookieParser from "cookie-parser"; // middleware para parsear cookies
import cors from "cors"; // middleware para habilitar CORS
import productsRoutes from "./src/routes/products.js"; // rutas para productos
import loginRoutes from "./src/routes/login.js"; // rutas para login/logout
import logoutRoutes from "./src/routes/logout.js"; // rutas para logout
import userRoutes from "./src/routes/users.js"; // rutas para usuarios
import registerUsersRoutes from "./src/routes/registerUsers.js"; // rutas para registro de usuarios
import refreshRoutes from "./src/routes/refresh.js"; // rutas para refresh de tokens


const app = express(); // creamos una instancia de la aplicación Express

const allowedOrigins = [ // definimos los orígenes permitidos para CORS, incluyendo la URL del frontend desde la configuración o un valor por defecto
	process.env.FRONTEND_URL,
	"http://localhost:5173",
].filter(Boolean);

app.use( // configuramos CORS para permitir solicitudes desde los orígenes permitidos, con credenciales y métodos específicos
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error("Origen no permitido por CORS"));
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);

app.use(cookieParser()); // middleware para parsear cookies en las solicitudes

app.use(express.json()); // middleware para parsear JSON de las solicitudes
app.use(express.urlencoded({ extended: true })); // middleware para parsear datos de form

//Rutas
app.use("/api/login", loginRoutes);
app.use("/api/logout", logoutRoutes);
app.use("/api/refresh", refreshRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/register", registerUsersRoutes);

export default app;