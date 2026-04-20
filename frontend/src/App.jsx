import { BrowserRouter as Router } from "react-router"; // Importación del componente Router para manejar la navegación en la aplicación
import AnimatedRoutes from "./components/AnimatedRoutes"; // Importación del componente AnimatedRoutes para manejar las rutas con animaciones
import AdminLayout from "./components/AdminLayout"; // Importación del componente AdminLayout para envolver las rutas que requieren autenticación de administrador
import Login from "./pages/Login"; // Importación de la página de inicio de sesión
import Register from "./pages/Register"; // Importación de la página de registro de usuario
import OtpVerification from "./pages/OtpVerification"; // Importación de la página de verificación OTP para el proceso de registro
import Products from "./pages/Products"; // Importación de la página de gestión de productos para administradores
import Dashboard from "./pages/Dashboard"; // Importación de la página de dashboard para administradores
import Users from "./pages/Users"; // Importación de la página de gestión de usuarios para administradores
import { Toaster } from "sonner"; // Importación del componente Toaster para mostrar notificaciones al usuario
import { AuthProvider } from "./contexts/authContext"; // Importación del componente AuthProvider para envolver la aplicación y proporcionar el contexto de autenticación a los componentes hijos

// Definición de las rutas de la aplicación, cada ruta se asocia con un componente que se renderizará cuando el usuario navegue a esa ruta
const appRoutes = [
  { path: "/", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/register/otp", element: <OtpVerification /> },
  {
    element: <AdminLayout />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/products", element: <Products /> },
      { path: "/users", element: <Users /> },
    ],
  },
];

// Componente principal de la aplicación que envuelve las rutas con el Router y el AuthProvider, y renderiza el Toaster para mostrar notificaciones al usuario
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen">
          <main className="w-full">
            <AnimatedRoutes routes={appRoutes} />
          </main>
          <Toaster
            position="top-right"
            richColors
            theme="dark"
            toastOptions={{
              style: {
                background: "#161616",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#ffffff",
              },
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App; // Exporta el componente App como el componente principal de la aplicación
