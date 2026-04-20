import { Fragment, useEffect, useMemo, useState } from "react"; // Importación de hooks de React
import { ArrowUpDown, CalendarRange, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from "lucide-react"; // Importación de iconos
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Importación de componentes de alerta personalizados para la interfaz de usuario
import { Badge } from "@/components/ui/badge"; // Importación de componente de badge personalizado para mostrar el estado de verificación del usuario
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // Importación de componentes de diálogo de alerta personalizados para confirmar acciones como la eliminación de un usuario
import { Button } from "@/components/ui/button"; // Importación de componente de botón personalizado para la interfaz de usuario
import { Card, CardContent } from "@/components/ui/card"; // Importación de componentes de tarjeta personalizados para la interfaz de usuario
import { Checkbox } from "@/components/ui/checkbox"; // Importación de componente de checkbox personalizado para seleccionar usuarios en la tabla
import { Combobox } from "@/components/ui/combobox"; // Importación de componente de combobox personalizado para los filtros y opciones de ordenamiento
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Importación de componentes de diálogo personalizados para crear y editar usuarios
import { Input } from "@/components/ui/input"; // Importación de componente de entrada personalizado para la interfaz de usuario
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"; // Importación de componentes de grupo de entrada personalizados para el campo de búsqueda
import { Label } from "@/components/ui/label"; // Importación de componente de etiqueta personalizado para la interfaz de usuario
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"; // Importación de componentes de selección personalizados para el campo de tipo de usuario en los formularios de creación y edición
import { Separator } from "@/components/ui/separator"; // Importación de componente de separador personalizado para dividir secciones en los formularios
import { Skeleton } from "@/components/ui/skeleton"; // Importación de componente de esqueleto personalizado
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Importación de componentes de tabla personalizados para mostrar la lista de usuarios
import useUserData from "@/components/users/hooks/useUserData"; // Importación de hook personalizado para manejar la lógica de datos de usuarios, como la obtención de la lista de usuarios, creación, actualización y eliminación de usuarios

// Definición de constantes y funciones auxiliares
const emptyUserForm = {
  name: "", // nombre del usuario
  lastName: "", // apellido del usuario
  email: "", // correo electrónico del usuario
  birthDate: "", // fecha de nacimiento del usuario
  password: "", // contraseña del usuario
  userType: "usuario", // tipo de usuario
  isVerified: false, // estado de verificación del usuario
};

// Opciones para el campo de tipo de usuario en los formularios de creación y edición
const userTypeOptions = [
  { value: "admin", label: "Admin" }, // opción para usuario administrador con valor "admin" y etiqueta "Admin"
  { value: "supervisor", label: "Supervisor" }, // opción para usuario supervisor con valor "supervisor" y etiqueta "Supervisor"
  { value: "vendedor", label: "Vendedor" }, // opción para usuario vendedor con valor "vendedor" y etiqueta "Vendedor"
  { value: "usuario", label: "Usuario" }, // opción para usuario regular con valor "usuario" y etiqueta "Usuario"
];

// Clase de estilos para el badge que muestra el estado de verificación del usuario en la tabla
const badgeCellClassName = "inline-flex h-7 min-w-24 justify-center rounded-full px-3 text-center text-xs font-semibold";

// Función para validar el formato del correo electrónico utilizando una expresión regular
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Función para validar el formato de la contraseña utilizando una expresión regular
const validatePassword = (password) => {
  const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return regex.test(password);
};

// Función para validar los campos del formulario de creación y edición de usuarios
const validateUserForm = (form, isEdit = false) => {
  const errors = {};
  
  if (!form.name.trim()) {
    errors.name = "El nombre es requerido";
  }
  if (!form.lastName.trim()) {
    errors.lastName = "El apellido es requerido";
  }
  if (!form.email.trim()) {
    errors.email = "El correo es requerido";
  } else if (!validateEmail(form.email)) {
    errors.email = "El correo debe ser válido";
  }
  if (!form.birthDate) {
    errors.birthDate = "La fecha de nacimiento es requerida";
  }
  if (!isEdit && !form.password) {
    errors.password = "La contraseña es requerida";
  } else if (!isEdit && form.password && !validatePassword(form.password)) {
    errors.password = "Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo";
  }
  if (!form.userType) {
    errors.userType = "El tipo de usuario es requerido";
  }
  
  return errors;
};

// Opciones para los filtros de fecha y estado de verificación, así como para el ordenamiento de la lista de usuarios
const dateFilterOptions = [
  { value: "all", label: "Todos los cumpleaños" }, // opción para mostrar todos los cumpleaños
  { value: "current-month", label: "Este mes" }, // opción para mostrar los cumpleaños del mes actual
  { value: "next-30-days", label: "Próximos 30 días" }, // opción para mostrar los cumpleaños en los próximos 30 días
];

// Opciones para el filtro de estado de verificación de los usuarios en la tabla
const verificationFilterOptions = [
  { value: "all", label: "Todos los estados" }, // opción para mostrar todos los estados de verificación
  { value: "verified", label: "Verificados" }, // opción para mostrar solo los usuarios verificados
  { value: "pending", label: "Pendientes" }, // opción para mostrar solo los usuarios pendientes de verificación
];

// Opciones para el ordenamiento de la lista de usuarios en la tabla
const sortOptions = [
  { value: "name-asc", label: "Nombre A-Z" }, // opción para ordenar por nombre en orden ascendente (A-Z)
  { value: "name-desc", label: "Nombre Z-A" }, // opción para ordenar por nombre en orden descendente (Z-A)
  { value: "verified-first", label: "Verificados primero" }, // opción para ordenar mostrando primero los usuarios verificados
  { value: "date-desc", label: "Cumpleaños más próximos" }, // opción para ordenar por fecha de nacimiento mostrando primero los cumpleaños más próximos
  { value: "date-asc", label: "Cumpleaños más lejanos" }, // opción para ordenar por fecha de nacimiento mostrando primero los cumpleaños más lejanos
];

// Función para calcular la distancia en días hasta el próximo cumpleaños de un usuario
const getNextBirthdayDistance = (birthDateValue) => {
  if (!birthDateValue) {
    return Number.POSITIVE_INFINITY;
  }

  // Se crea un objeto Date para la fecha de nacimiento del usuario y se verifica si es una fecha válida
  const today = new Date();
  const birthDate = new Date(birthDateValue);

  // Si la fecha de nacimiento no es válida, se devuelve infinito
  if (Number.isNaN(birthDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  // Se calcula la fecha del próximo cumpleaños del usuario y se compara con la fecha actual
  const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  nextBirthday.setHours(0, 0, 0, 0);

  // Se normaliza la fecha actual para comparar solo las fechas sin considerar la hora
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  // Si el próximo cumpleaños ya pasó en el año actual, se ajusta al siguiente año
  if (nextBirthday < normalizedToday) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  }

  // Se calcula la distancia en días entre la fecha actual y el próximo cumpleaños
  return Math.round((nextBirthday - normalizedToday) / 86400000);
};

// Componente principal de la página de usuarios que muestra la lista de usuarios, filtros, opciones de ordenamiento y permite crear, editar y eliminar usuarios
function Users() {
  const {
    users, // lista de usuarios obtenida del hook personalizado
    loading, // estado de carga de los datos de usuarios
    errorUser, // error relacionado con la obtención de datos de usuarios
    handleaSubmit, // función para manejar la creación de un nuevo usuario
    deleteUser, // función para manejar la eliminación de un usuario
    handleUpdateSubmit, // función para manejar la actualización de un usuario existente
  } = useUserData(); // Se obtiene la lógica de datos de usuarios del hook personalizado
  const [expandedRowId, setExpandedRowId] = useState(null); // Estado para controlar qué fila de la tabla está expandida para mostrar las acciones de editar y eliminar
  const [currentPage, setCurrentPage] = useState(1); // Estado para controlar la página actual en la paginación de la tabla de usuarios
  const [isCreateOpen, setIsCreateOpen] = useState(false); // Estado para controlar la apertura del diálogo de creación de un nuevo usuario
  const [isEditOpen, setIsEditOpen] = useState(false); // Estado para controlar la apertura del diálogo de edición de un usuario existente
  const [deleteTarget, setDeleteTarget] = useState(null); // Estado para almacenar el usuario que se desea eliminar, utilizado para mostrar la información del usuario en el diálogo de confirmación de eliminación
  const [createForm, setCreateForm] = useState(emptyUserForm); // Estado para almacenar los datos del formulario de creación de un nuevo usuario
  const [editForm, setEditForm] = useState({ ...emptyUserForm, id: "" }); // Estado para almacenar los datos del formulario de edición de un usuario existente
  const [createErrors, setCreateErrors] = useState({}); // Estado para almacenar los errores de validación del formulario de creación
  const [editErrors, setEditErrors] = useState({}); // Estado para almacenar los errores de validación del formulario de edición
  const [searchText, setSearchText] = useState(""); // Estado para almacenar el texto de búsqueda ingresado por el usuario
  const [dateFilter, setDateFilter] = useState("all"); // Estado para almacenar el filtro de fecha seleccionado por el usuario
  const [verificationFilter, setVerificationFilter] = useState("all"); // Estado para almacenar el filtro de verificación seleccionado por el usuario
  const [sortBy, setSortBy] = useState("name-asc"); // Estado para almacenar el criterio de ordenamiento seleccionado por el usuario

  const rowsPerPage = 10; // Número de filas a mostrar por página en la tabla de usuarios
  const filteredUsers = useMemo(() => { // Memoización de la lista de usuarios filtrada y ordenada para optimizar el rendimiento al evitar cálculos innecesarios en cada renderizado
    const term = searchText.trim().toLowerCase();

    const matches = users.filter((user) => {
      const fullName = `${user.name} ${user.lastName}`.toLowerCase(); // Se crea una cadena con el nombre completo del usuario para facilitar la búsqueda por nombre y apellido
      const bySearch =
        !term ||
        fullName.includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term); // Se verifica si el término de búsqueda coincide con el nombre completo, correo electrónico o ID del usuario

      const byVerification =
        verificationFilter === "all" ||
        (verificationFilter === "verified" && user.isVerified === true) ||
        (verificationFilter === "pending" && user.isVerified === false); // Se verifica si el usuario coincide con el filtro de verificación seleccionado (todos, verificados o pendientes)

      const daysUntilBirthday = getNextBirthdayDistance(user.birthDate); // Se calcula la distancia en días hasta el próximo cumpleaños del usuario para aplicar el filtro de fecha
      const byDateFilter =
        dateFilter === "all" ||
        (dateFilter === "current-month" && user.birthDate && new Date(user.birthDate).getMonth() === new Date().getMonth()) ||
        (dateFilter === "next-30-days" && daysUntilBirthday <= 30);

      return bySearch && byVerification && byDateFilter;
    });

    // Se ordena la lista de usuarios filtrada según el criterio de ordenamiento seleccionado por el usuario
    return [...matches].sort((firstUser, secondUser) => {
      switch (sortBy) { // Se utiliza un switch para determinar el criterio de ordenamiento seleccionado y aplicar la comparación correspondiente entre los usuarios
        case "name-desc":
          return `${secondUser.name} ${secondUser.lastName}`.localeCompare(`${firstUser.name} ${firstUser.lastName}`, "es", { sensitivity: "base" }); // Ordenamiento por nombre en orden descendente (Z-A)
        case "date-desc":
          return new Date(secondUser.birthDate || 0) - new Date(firstUser.birthDate || 0); // Ordenamiento por fecha de nacimiento en orden descendente
        case "date-asc":
          return new Date(firstUser.birthDate || 0) - new Date(secondUser.birthDate || 0); // Ordenamiento por fecha de nacimiento en orden ascendente
        case "verified-first":
          return Number(secondUser.isVerified) - Number(firstUser.isVerified) || `${firstUser.name} ${firstUser.lastName}`.localeCompare(`${secondUser.name} ${secondUser.lastName}`, "es", { sensitivity: "base" }); // Se ordena primero por verificación y luego por nombre
        case "name-asc":
        default:
          return `${firstUser.name} ${firstUser.lastName}`.localeCompare(`${secondUser.name} ${secondUser.lastName}`, "es", { sensitivity: "base" }); // Ordenamiento por nombre en orden ascendente (A-Z) como valor predeterminado
      }
    });
  }, [dateFilter, users, searchText, sortBy, verificationFilter]); // Las dependencias del useMemo incluyen los estados que afectan el filtrado y ordenamiento de la lista de usuarios para recalcular la lista filtrada solo cuando alguno de estos estados cambie

  // Cálculo del número total de páginas para la paginación de la tabla de usuarios y obtención de la lista
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = useMemo(() => { // Memoización de la lista de usuarios paginada para optimizar el rendimiento al evitar cálculos innecesarios en cada renderizado
    const start = (currentPage - 1) * rowsPerPage; // Cálculo del índice de inicio para la página actual en función del número de filas por página
    return filteredUsers.slice(start, start + rowsPerPage); // Se obtiene la porción de la lista de usuarios filtrada correspondiente a la página actual utilizando el método slice
  }, [currentPage, filteredUsers]); // Las dependencias del useMemo incluyen el estado de la página actual y la lista de usuarios filtrada para recalcular la lista paginada solo cuando alguno de estos estados cambie

  // Cálculo del número de usuarios verificados y pendientes para mostrar en los filtros y estadísticas de la página
  const verifiedCount = users.filter((user) => user.isVerified === true).length;
  const pendingCount = users.filter((user) => user.isVerified === false).length;

  useEffect(() => { // Efecto para ajustar la página actual si el número total de páginas cambia y la página actual excede el total de páginas disponibles después de aplicar los filtros
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => { // Efecto para colapsar cualquier fila expandida en la tabla de usuarios al cambiar la página actual, asegurando que las acciones de edición y eliminación no queden abiertas al navegar entre páginas
    setExpandedRowId(null);
  }, [currentPage]);

  useEffect(() => { // Efecto para restablecer la página actual a la primera página cada vez que se cambian los filtros de fecha, estado de verificación o el texto de búsqueda, asegurando que el usuario vea los resultados filtrados desde el inicio de la lista
    setCurrentPage(1);
  }, [dateFilter, searchText, verificationFilter]);

  useEffect(() => { // Efecto para restablecer la página actual a la primera página cada vez que se cambia el criterio de ordenamiento, asegurando que el usuario vea los resultados ordenados desde el inicio de la lista
    setCurrentPage(1);
  }, [sortBy]);

  const hasActiveFilters = dateFilter !== "all" || verificationFilter !== "all" || searchText.trim() || sortBy !== "name-asc"; // Variable para determinar si hay filtros activos, utilizada para mostrar un indicador visual en el botón de filtros

  const toggleExpandRow = (rowId) => { // Función para expandir o colapsar las acciones de edición y eliminación de una fila en la tabla de usuarios al hacer clic en el botón correspondiente, se utiliza el estado expandedRowId para controlar qué fila está expandida
    setExpandedRowId((prev) => (prev === rowId ? null : rowId));
  };

  const requestDelete = (user) => {
    setDeleteTarget(user); // Función para solicitar la eliminación de un usuario, se establece el usuario objetivo en el estado deleteTarget para mostrar su información en el diálogo de confirmación de eliminación
  };

  const confirmDelete = () => { // Función para confirmar la eliminación de un usuario, se llama a la función deleteUser con el ID del usuario objetivo y luego se colapsa cualquier fila expandida y se restablece el estado deleteTarget
    if (!deleteTarget) return;

    deleteUser(deleteTarget.id); // Se llama a la función deleteUser con el ID del usuario
    setExpandedRowId((prev) => (prev === deleteTarget.id ? null : prev)); // Se colapsa la fila expandida si el usuario eliminado es el mismo que el que estaba expandido
    setDeleteTarget(null); // Se restablece el estado deleteTarget después de confirmar la eliminación
  };

  // Función para abrir el diálogo de edición de un usuario, se establece el estado editForm con los datos del usuario seleccionado y se abre el diálogo de edición
  const openEditModal = (user) => {
    setEditForm({
      id: user.id, // ID del usuario para identificar qué usuario se está editando
      name: user.name, // Nombre del usuario para mostrar en el formulario de edición
      lastName: user.lastName, // Apellido del usuario para mostrar en el formulario de edición
      email: user.email, // Correo electrónico del usuario para mostrar en el formulario de edición
      userType: user.userType || "usuario", // Tipo de usuario para mostrar en el formulario de edición
      birthDate: user.birthDate, // Fecha de nacimiento del usuario para mostrar en el formulario de edición
      isVerified: user.isVerified, // Estado de verificación del usuario para mostrar en el formulario de edición
      password: "", // Contraseña del usuario para mostrar en el formulario de edición, se deja vacía para que el usuario ingrese una nueva contraseña si desea cambiarla, de lo contrario se mantendrá la contraseña actual al enviar el formulario de edición
    });
    setIsEditOpen(true); // Se abre el diálogo de edición estableciendo el estado isEditOpen en true
  };

  // Función para manejar el envío del formulario de creación de un nuevo usuario
  const handleCreateSubmit = async (event) => {
    event.preventDefault(); // Se previene el comportamiento predeterminado del formulario para evitar recargas de página
    const errors = validateUserForm(createForm); // Se validan los campos del formulario de creación utilizando la función validateUserForm
    setCreateErrors(errors); // Se establecen los errores de validación en el estado createErrors para mostrar mensajes de error en la interfaz de usuario

    if (Object.keys(errors).length > 0) {
      return; // Si hay errores de validación, se detiene el envío del formulario para que el usuario pueda corregir los errores antes de intentar crear el usuario nuevamente
    }

    const created = await handleaSubmit(createForm);
    if (created) { // Si la creación del usuario es exitosa, se restablecen los campos del formulario, se limpian los errores de validación y se cierra el diálogo de creación
      setCreateForm(emptyUserForm);
      setCreateErrors({});
      setIsCreateOpen(false);
    }
  };

  const handleEditSubmit = async (event) => { // Función para manejar el envío del formulario de edición de un usuario existente
    event.preventDefault(); // Se previene el comportamiento predeterminado del formulario para evitar recargas de página
    const errors = validateUserForm(editForm, true);
    setEditErrors(errors); // Se validan los campos del formulario de edición utilizando la función validateUserForm

    if (Object.keys(errors).length > 0) {
      return; // Si hay errores de validación, se detiene el envío del formulario para que el usuario pueda corregir los errores antes de intentar actualizar el usuario nuevamente
    }

    const updated = await handleUpdateSubmit(editForm, editForm.id);
    if (updated) { // Si la actualización del usuario es exitosa, se limpian los errores de validación y se cierra el diálogo de edición
      setEditErrors({});
      setIsEditOpen(false);
    }
  };

  // Renderizado del componente de la página de usuarios, incluyendo la barra de filtros y acciones, la tabla de usuarios con paginación, y los diálogos para crear, editar y eliminar usuarios
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 pb-3">
      <div className="space-y-3 rounded-[28px] border border-white/8 bg-black/20 px-4 py-4 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mt-1 text-sm text-white/45"></p>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_230px_230px_250px_auto]">
          <InputGroup className="h-10 rounded-full border-white/15 bg-black/25 text-white shadow-none">
            <InputGroupAddon className="pl-4 text-white/35">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchText} // Campo de entrada para el texto de búsqueda, se vincula al estado searchText
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar usuario, correo o ID..."
              className="h-10 rounded-full border-0 bg-transparent text-white placeholder:text-white/35"
              aria-label="Buscar usuarios"
            />
          </InputGroup>

          <Combobox // Componente de combobox para el filtro de fecha, se vincula al estado dateFilter
            value={dateFilter}
            onValueChange={setDateFilter}
            options={dateFilterOptions}
            placeholder="Filtrar por fecha"
            searchPlaceholder="Buscar filtro de fecha..."
            icon={<CalendarRange className="h-4 w-4" />}
          />

          <Combobox // Componente de combobox para el filtro de verificación, se vincula al estado verificationFilter
            value={verificationFilter}
            onValueChange={setVerificationFilter}
            options={verificationFilterOptions}
            placeholder="Filtrar por estado"
            searchPlaceholder="Buscar estado..."
            icon={<ChevronDown className="h-4 w-4" />}
          />

          <Combobox // Componente de combobox para el filtro de orden, se vincula al estado sortBy 
            value={sortBy}
            onValueChange={setSortBy}
            options={sortOptions}
            placeholder="Ordenar por"
            searchPlaceholder="Buscar orden..."
            icon={<ArrowUpDown className="h-4 w-4" />}
          />

          <Button // Botón para abrir el diálogo de creación de un nuevo usuario, se establece el estado isCreateOpen
            variant="outline"
            className="h-10 rounded-full border-[#822727]/70 bg-transparent px-4 text-sm font-semibold text-white hover:bg-[#822727]/15 hover:text-white"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-2">
          {[
            { key: "all", label: "Todos los usuarios", count: users.length },
            { key: "verified", label: "Verificados", count: verifiedCount },
            { key: "pending", label: "Pendientes", count: pendingCount },
          ].map((item) => {
            const isActive = verificationFilter === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={`inline-flex items-center gap-2 border-b-2 px-1 py-1 text-sm font-semibold transition-colors ${isActive
                    ? "border-[#822727] text-white"
                    : "border-transparent text-white/55 hover:text-white"
                  }`}
                onClick={() => setVerificationFilter(item.key)}
              >
                {item.label}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? "bg-[#822727] text-white" : "bg-white/10 text-white/75"}`}>{item.count}</span>
              </button>
            );
          })}

          <div className="ml-auto text-xs text-white/45">
            {filteredUsers.length} resultados
          </div>

          {hasActiveFilters ? (
            <Button // Botón para limpiar los filtros activos, se restablecen los estados de búsqueda
              type="button"
              variant="ghost"
              className="h-8 rounded-full px-3 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => {
                setSearchText("");
                  setDateFilter("all");
                setVerificationFilter("all");
                setSortBy("name-asc");
              }}
            >
              Limpiar
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="min-h-0 flex-1 border-white/10 bg-[#111111]/90 text-white shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col pt-3">
          {errorUser ? (
            <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {errorUser}
            </div>
          ) : null}

          <div className="scrollbar-invisible min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-[#151515]"> 
            <Table> 
              <TableHeader className="sticky top-0 z-10 bg-[#151515]">
                <TableRow className="border-white/10 bg-[#151515] hover:bg-[#151515]">
                  <TableHead className="w-12 text-white/45">
                    <Checkbox aria-label="Seleccionar todos" />
                  </TableHead>
                  <TableHead className="text-white/45">ID No.</TableHead> 
                  <TableHead className="text-white/45">Nombre</TableHead>
                  <TableHead className="text-white/45">Usuario</TableHead>
                  <TableHead className="text-white/45">Correo</TableHead>
                  <TableHead className="text-white/45">Estado</TableHead>
                  <TableHead className="text-white/45">Tipo</TableHead>
                  <TableHead className="w-32 text-right text-white/45">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }, (_, index) => ( // Se muestran filas de esqueleto mientras se cargan los datos de usuarios, utilizando el componente Skeleton para simular el contenido de cada celda en la tabla
                    <TableRow key={`loading-row-${index}`} className="border-white/10">
                      <TableCell><Skeleton className="h-4 w-4 rounded-sm bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40 bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full bg-white/10" /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                          <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                          <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}

                {!loading && paginatedUsers.length === 0 ? ( // Si no se están cargando los datos y la lista de usuarios paginada está vacía, se muestra un mensaje indicando que no hay usuarios para mostrar
                  <TableRow className="border-white/10">
                    <TableCell colSpan={8} className="py-8 text-center text-white/55">
                      No hay usuarios para mostrar.
                    </TableCell>
                  </TableRow>
                ) : null}

                {paginatedUsers.map((user, index) => { // Se itera sobre la lista de usuarios paginada para renderizar cada fila de la tabla
                  const cardinalId = (currentPage - 1) * rowsPerPage + index + 1;

                  return ( // Se utiliza un Fragment para agrupar la fila principal del usuario y la fila expandida con las acciones de edición y eliminación, permitiendo mostrar ambas filas juntas sin necesidad de un elemento contenedor adicional en el DOM
                  <Fragment key={`${user.id}-group`}>
                    <TableRow className={`border-white/10 hover:bg-white/4 ${expandedRowId === user.id ? "bg-white/4" : ""}`}>
                      <TableCell>
                        <Checkbox aria-label={`Seleccionar ${user.name}`} />
                      </TableCell>
                      <TableCell className="text-white/65">{cardinalId}</TableCell>
                      <TableCell className="font-medium text-white">{`${user.name} ${user.lastName}`.trim()}</TableCell>
                      <TableCell className="text-white/65">{user.email.split("@")[0] || user.email}</TableCell>
                      <TableCell className="text-white/65">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${badgeCellClassName} ${user.isVerified ? "border-white/30 bg-white text-black" : "border-white/15 bg-transparent text-white/75"}`}
                        >
                          {user.isVerified ? "Activo" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${badgeCellClassName} ${user.userType === "admin" ? "border-[#822727] bg-[#822727] text-white" : "border-white/15 bg-transparent text-white/80"}`}
                        >
                          {userTypeOptions.find((option) => option.value === user.userType)?.label || "Usuario"}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-32 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 rounded-md border border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={() => toggleExpandRow(user.id)}
                          >
                            {expandedRowId === user.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 rounded-md border border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 rounded-md border border-[#822727]/35 bg-[#822727]/10 text-[#ff8f8f] hover:bg-[#822727]/20 hover:text-[#ffb6b6]"
                            onClick={() => requestDelete(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedRowId === user.id ? (
                      <TableRow className="border-white/10 bg-white/4">
                        <TableCell colSpan={8}>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wider text-white/40">ID</p>
                              <p className="mt-1 text-sm text-white">{cardinalId}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wider text-white/40">Nacimiento</p>
                              <p className="mt-1 text-sm text-white">{user.birthDate || "N/A"}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wider text-white/40">Estado</p>
                              <p className="mt-1 text-sm text-white">{user.isVerified ? "Verificado" : "Pendiente"}</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
            <p className="text-xs text-white/55">
              {filteredUsers.length === 0 // Si no hay usuarios para mostrar después de aplicar los filtros, se muestra un mensaje indicando que se están mostrando 0 de 0 usuarios
                ? "Mostrando 0 de 0"
                : `Mostrando ${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, filteredUsers.length)} de ${filteredUsers.length}`}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-white/15 bg-transparent px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <Button // Botones para la paginación de la tabla de usuarios, se generan dinámicamente según el número total de páginas y se vinculan al estado currentPage para controlar la página actual
                  key={page}
                  type="button"
                  variant="outline"
                  className={`h-9 min-w-9 rounded-full border px-3 text-sm ${
                    currentPage === page
                      ? "border-[#822727] bg-[#822727] text-white hover:bg-[#9b2f2f]"
                      : "border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}

              <Button // Botón para ir a la siguiente página en la paginación de la tabla de usuarios, se vincula al estado currentPage para controlar la página actual y se deshabilita si ya se está en la última página
                type="button"
                variant="outline"
                className="h-9 rounded-full border-white/15 bg-transparent px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}> 
        <DialogContent className="border border-white/10 bg-[#161616] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription className="text-white/55">Completa el formulario y confirma para agregar el usuario al directorio.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <Alert className="border-[#822727]/40 bg-[#822727]/10 text-white">
              <AlertTitle className="text-sm">Requisitos de seguridad</AlertTitle>
              <AlertDescription className="text-white/70">
                La contraseña debe tener mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Nombre</Label>
                <Input 
                  id="create-name" 
                  className="h-11" 
                  autoComplete="off" 
                  value={createForm.name} 
                  onChange={(event) => {
                    setCreateForm((prev) => ({ ...prev, name: event.target.value }));
                    if (createErrors.name) setCreateErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="Ej. Carlos"
                  aria-invalid={!!createErrors.name}
                />
                {createErrors.name && <p className="text-xs text-red-500">{createErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-last-name">Apellido</Label>
                <Input 
                  id="create-last-name" 
                  className="h-11" 
                  autoComplete="off" 
                  value={createForm.lastName} 
                  onChange={(event) => {
                    setCreateForm((prev) => ({ ...prev, lastName: event.target.value }));
                    if (createErrors.lastName) setCreateErrors((prev) => ({ ...prev, lastName: "" }));
                  }}
                  placeholder="Ej. Pérez"
                  aria-invalid={!!createErrors.lastName}
                />
                {createErrors.lastName && <p className="text-xs text-red-500">{createErrors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email</Label>
              <Input 
                id="create-email" 
                className="h-11" 
                type="email" 
                autoComplete="off" 
                value={createForm.email} 
                onChange={(event) => {
                  setCreateForm((prev) => ({ ...prev, email: event.target.value }));
                  if (createErrors.email) setCreateErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="correo@dominio.com"
                aria-invalid={!!createErrors.email}
              />
              {createErrors.email && <p className="text-xs text-red-500">{createErrors.email}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-birth-date">Fecha de nacimiento</Label>
                <Input 
                  id="create-birth-date" 
                  className="h-11" 
                  type="date" 
                  value={createForm.birthDate} 
                  onChange={(event) => {
                    setCreateForm((prev) => ({ ...prev, birthDate: event.target.value }));
                    if (createErrors.birthDate) setCreateErrors((prev) => ({ ...prev, birthDate: "" }));
                  }}
                  aria-invalid={!!createErrors.birthDate}
                />
                {createErrors.birthDate && <p className="text-xs text-red-500">{createErrors.birthDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-password">Contraseña</Label>
                <Input 
                  id="create-password" 
                  className="h-11" 
                  type="password" 
                  autoComplete="off" 
                  value={createForm.password} 
                  onChange={(event) => {
                    setCreateForm((prev) => ({ ...prev, password: event.target.value }));
                    if (createErrors.password) setCreateErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="Mínimo 8 caracteres"
                  aria-invalid={!!createErrors.password}
                />
                {createErrors.password && <p className="text-xs text-red-500">{createErrors.password}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-user-type">Tipo de usuario</Label>
              <Select 
                value={createForm.userType} 
                onValueChange={(value) => {
                  setCreateForm((prev) => ({ ...prev, userType: value }));
                  if (createErrors.userType) setCreateErrors((prev) => ({ ...prev, userType: "" }));
                }}
              >
                <SelectTrigger 
                  id="create-user-type" 
                  size="lg"
                  style={{ height: "44px", paddingTop: "10px", paddingBottom: "10px" }}
                  className="rounded-lg border-white/10 bg-black/20 text-white"
                  aria-invalid={!!createErrors.userType}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#161616]">
                  {userTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white cursor-pointer hover:bg-white/10">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createErrors.userType && <p className="text-xs text-red-500">{createErrors.userType}</p>}
              <Label htmlFor="create-verification-status">Estado de verificación</Label>
              <Input
                id="create-verification-status"
                disabled
                value="Pendiente hasta verificación por OTP"
                className="h-11 border-white/10 bg-black/20 text-white/70"
              />
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="h-11 px-5 text-black" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="h-11 bg-[#822727] px-5 text-base hover:bg-[#9b2f2f]">
                {loading ? "Guardando..." : "Guardar usuario"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border border-white/10 bg-[#161616] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription className="text-white/55">Actualiza la información del usuario y guarda para aplicar cambios.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <Alert className="border-white/15 bg-black/20 text-white">
              <AlertTitle className="text-sm">Edición segura</AlertTitle>
              <AlertDescription className="text-white/70">
                Revisa email y fecha antes de guardar para evitar inconsistencias en el perfil.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input 
                  id="edit-name" 
                  className="h-11" 
                  autoComplete="off" 
                  value={editForm.name} 
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, name: event.target.value }));
                    if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="Nombre completo"
                  aria-invalid={!!editErrors.name}
                />
                {editErrors.name && <p className="text-xs text-red-500">{editErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-last-name">Apellido</Label>
                <Input 
                  id="edit-last-name" 
                  className="h-11" 
                  autoComplete="off" 
                  value={editForm.lastName} 
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, lastName: event.target.value }));
                    if (editErrors.lastName) setEditErrors((prev) => ({ ...prev, lastName: "" }));
                  }}
                  placeholder="Apellido"
                  aria-invalid={!!editErrors.lastName}
                />
                {editErrors.lastName && <p className="text-xs text-red-500">{editErrors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email" 
                className="h-11" 
                type="email" 
                autoComplete="off" 
                value={editForm.email} 
                onChange={(event) => {
                  setEditForm((prev) => ({ ...prev, email: event.target.value }));
                  if (editErrors.email) setEditErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="correo@dominio.com"
                aria-invalid={!!editErrors.email}
              />
              {editErrors.email && <p className="text-xs text-red-500">{editErrors.email}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-birth-date">Fecha de nacimiento</Label>
                <Input 
                  id="edit-birth-date" 
                  className="h-11" 
                  type="date" 
                  value={editForm.birthDate || ""} 
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, birthDate: event.target.value }));
                    if (editErrors.birthDate) setEditErrors((prev) => ({ ...prev, birthDate: "" }));
                  }}
                  aria-invalid={!!editErrors.birthDate}
                />
                {editErrors.birthDate && <p className="text-xs text-red-500">{editErrors.birthDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-user-type">Tipo de usuario</Label>
                <Select
                  value={editForm.userType || "usuario"} 
                  onValueChange={(value) => {
                    setEditForm((prev) => ({ ...prev, userType: value }));
                    if (editErrors.userType) setEditErrors((prev) => ({ ...prev, userType: "" }));
                  }}
                >
                  <SelectTrigger 
                    id="edit-user-type" 
                    size="lg"
                    style={{ height: "44px", paddingTop: "10px", paddingBottom: "10px" }}
                    className="rounded-lg border-white/10 bg-black/20 text-white"
                    aria-invalid={!!editErrors.userType}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#161616]">
                    {userTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white cursor-pointer hover:bg-white/10">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editErrors.userType && <p className="text-xs text-red-500">{editErrors.userType}</p>}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-verification-status">Estado de verificación</Label>
                <Input
                  id="edit-verification-status"
                  disabled
                  value={editForm.isVerified ? "Verificado por OTP" : "Pendiente de verificación"}
                  className="h-11 border-white/10 bg-black/20 text-white/70"
                />
              </div>
            </div>

            {editForm.isVerified ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Este usuario ya fue verificado. El administrador solo puede visualizar este estado.
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/60">
                Este usuario aún no se ha verificado y el estado no puede modificarse manualmente desde este panel.
              </div>
            )}

            <Separator className="bg-white/10" />

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="h-11 px-5 text-black" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="h-11 bg-[#822727] px-5 text-base hover:bg-[#9b2f2f]">
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <AlertDialogContent className="border border-white/10 bg-[#161616] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">
              {`¿Estás seguro de eliminar ${deleteTarget?.name ?? "este usuario"}? Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-transparent border-t-0">
            <AlertDialogCancel variant="outline" className="text-black hover:text-black">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-[#822727] hover:bg-[#9b2f2f]" onClick={confirmDelete}>
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Users; // Exporta el componente Users
