import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Box, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";

// ─── Formulario — 4 campos del backend ────────────────────
const emptyProductForm = {
  name: "",
  description: "",
  price: "",
  stock: "0",
};

const statusFilterOptions = [
  { value: "all",    label: "Todos los estados" },
  { value: "top",    label: "Top" },
  { value: "stable", label: "Estable" },
  { value: "low",    label: "Stock bajo" },
];

const categoryFilterOptions = [
  { value: "all",           label: "Todas las categorias" },
  { value: "accesorios",    label: "Accesorios" },
  { value: "tecnologia",    label: "Tecnologia" },
  { value: "pantallas",     label: "Pantallas" },
  { value: "conectividad",  label: "Conectividad" },
  { value: "almacenamiento",label: "Almacenamiento" },
  { value: "audio",         label: "Audio" },
  { value: "mobiliario",    label: "Mobiliario" },
  { value: "video",         label: "Video" },
  { value: "redes",         label: "Redes" },
];

const sortOptions = [
  { value: "name-asc",   label: "Nombre A-Z" },
  { value: "name-desc",  label: "Nombre Z-A" },
  { value: "price-desc", label: "Precio mayor" },
  { value: "price-asc",  label: "Precio menor" },
  { value: "stock-desc", label: "Stock mayor" },
  { value: "stock-asc",  label: "Stock menor" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatPrice = (value) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const validateProductForm = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = "El nombre es requerido";
  if (!form.price) {
    errors.price = "El precio es requerido";
  } else if (Number(form.price) <= 0) {
    errors.price = "El precio debe ser mayor a 0";
  }
  if (form.stock === "" || form.stock === null) {
    errors.stock = "El stock es requerido";
  } else if (Number(form.stock) < 0) {
    errors.stock = "El stock no puede ser negativo";
  }
  return errors;
};

// El precio viene como Decimal128 de MongoDB: { $numberDecimal: "99.99" }
const normalizeProduct = (product = {}) => ({
  id:          product._id ?? product.id ?? "",
  name:        product.name ?? "",
  description: product.description ?? "",
  price:       Number(product.price?.$numberDecimal ?? product.price ?? 0),
  stock:       Number(product.stock ?? 0),
  category:    product.category ?? "",
  status:      product.status ?? "",
});

const getToken = () =>
  localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

// ─────────────────────────────────────────────────────────────────────────
function Products() {

  // Compatible si useAuth retorna array [API, logout] u objeto { API, logout }
  const authResult = useAuth();
  const API    = Array.isArray(authResult) ? authResult[0] : authResult?.API;
  const logout = Array.isArray(authResult) ? authResult[1] : authResult?.logout;

  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing]   = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [expandedRowId, setExpandedRowId] = useState(null);
  const [currentPage, setCurrentPage]     = useState(1);
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen]       = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null);

  const [createForm, setCreateForm]     = useState(emptyProductForm);
  const [editForm, setEditForm]         = useState({ ...emptyProductForm, id: "" });
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors]     = useState({});

  // Filtros visuales
  const [searchText,     setSearchText]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy,         setSortBy]         = useState("name-asc");

  const rowsPerPage = 10;

  // ── GET /products ──────────────────────────────────────────────────────
  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) {
        await logout?.({ reason: "expired", callApi: false });
        throw new Error("No se encontró el token de sesión.");
      }

      const response = await fetch(`${API}/products`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

      const data = await response.json();

      // Acepta respuesta directa [] o envuelta { data: [] }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setProducts(list.map(normalizeProduct));
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, [API]);

  // ── POST /products ─────────────────────────────────────────────────────
  const createProduct = async (event) => {
    event.preventDefault();
    const errors = validateProductForm(createForm);
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsCreating(true);
    try {
      const response = await fetch(`${API}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name:        createForm.name.trim(),
          description: createForm.description.trim(),
          price:       Number(createForm.price),
          stock:       Number(createForm.stock),
        }),
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json();
      const newProduct = normalizeProduct(data?.data ?? data);

      setProducts((prev) => [newProduct, ...prev]);
      setCreateForm(emptyProductForm);
      setCreateErrors({});
      setIsCreateOpen(false);
      toast.success("Producto creado correctamente");
    } catch (err) {
      console.error("Error creando producto:", err);
      toast.error("Error al crear el producto");
    } finally {
      setIsCreating(false);
    }
  };

  // ── PUT /products/:id ──────────────────────────────────────────────────
  const editSubmit = async (event) => {
    event.preventDefault();
    const errors = validateProductForm(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsEditing(true);
    try {
      const response = await fetch(`${API}/products/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name:        editForm.name.trim(),
          description: editForm.description.trim(),
          price:       Number(editForm.price),
          stock:       Number(editForm.stock),
        }),
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json();
      const updated = normalizeProduct(data?.data ?? data);

      setProducts((prev) =>
        prev.map((item) => (item.id === editForm.id ? updated : item))
      );
      setIsEditOpen(false);
      setEditErrors({});
      toast.success("Producto actualizado correctamente");
    } catch (err) {
      console.error("Error actualizando:", err);
      toast.error("Error al actualizar el producto");
    } finally {
      setIsEditing(false);
    }
  };

  // ── DELETE /products/:id ───────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API}/products/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      if (expandedRowId === deleteTarget.id) setExpandedRowId(null);
      setDeleteTarget(null);
      toast.success("Producto eliminado correctamente");
    } catch (err) {
      console.error("Error eliminando:", err);
      toast.error("Error al eliminar el producto");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (product) => {
    setEditForm({
      id:          product.id,
      name:        product.name,
      description: product.description,
      price:       String(product.price),
      stock:       String(product.stock),
    });
    setEditErrors({});
    setIsEditOpen(true);
  };

  // ── Filtrado y ordenado ───────────
  const filteredProducts = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    const matches = products.filter((item) => {
      const bySearch =
        !term ||
        item.name?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.id?.toLowerCase().includes(term);

      // Estos filtros solo funcionarán cuando el backend retorne category/status
      const byStatus   = statusFilter === "all"   || item.status === statusFilter;
      const byCategory = categoryFilter === "all" || item.category?.toLowerCase() === categoryFilter;

      return bySearch && byStatus && byCategory;
    });

    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case "name-desc":  return b.name.localeCompare(a.name, "es", { sensitivity: "base" });
        case "price-desc": return b.price - a.price;
        case "price-asc":  return a.price - b.price;
        case "stock-desc": return b.stock - a.stock;
        case "stock-asc":  return a.stock - b.stock;
        case "name-asc":
        default:           return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      }
    });
  }, [products, searchText, statusFilter, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredProducts.slice(start, start + rowsPerPage);
  }, [currentPage, filteredProducts]);

  const topCount    = products.filter((p) => p.status === "top").length;
  const stableCount = products.filter((p) => p.status === "stable").length;
  const lowCount    = products.filter((p) => p.status === "low").length;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => { setExpandedRowId(null); }, [currentPage]);
  useEffect(() => { setCurrentPage(1); }, [searchText, statusFilter, categoryFilter, sortBy]);

  const hasActiveFilters =
    searchText.trim().length > 0 ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    sortBy !== "name-asc";

  // ── Pantalla de error ──────────────────────────────────────────────────
  if (error && products.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <Button onClick={loadProducts} className="mt-4 bg-[#822727]">Reintentar</Button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 pb-3">

      {/* ── Barra de filtros ── */}
      <div className="space-y-3 rounded-[28px] border border-white/8 bg-black/20 px-4 py-4 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_220px_230px_auto]">
          <InputGroup className="h-10 rounded-full border-white/15 bg-black/25 text-white shadow-none">
            <InputGroupAddon className="pl-4 text-white/35">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por nombre, categoria, proveedor, SKU o ID..."
              className="h-10 rounded-full border-0 bg-transparent text-white placeholder:text-white/35"
              aria-label="Buscar productos"
            />
          </InputGroup>

          <Combobox
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            options={categoryFilterOptions}
            placeholder="Filtrar por categoria"
            searchPlaceholder="Buscar categoria..."
            icon={<Box className="h-4 w-4" />}
          />

          <Combobox
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={statusFilterOptions}
            placeholder="Filtrar por estado"
            searchPlaceholder="Buscar estado..."
            icon={<ChevronDown className="h-4 w-4" />}
          />

          <Combobox
            value={sortBy}
            onValueChange={setSortBy}
            options={sortOptions}
            placeholder="Ordenar por"
            searchPlaceholder="Buscar orden..."
            icon={<ArrowUpDown className="h-4 w-4" />}
          />

          <Button
            variant="outline"
            className="h-10 rounded-full border-[#822727]/70 bg-transparent px-4 text-sm font-semibold text-white hover:bg-[#822727]/15 hover:text-white"
            onClick={() => { setCreateForm(emptyProductForm); setCreateErrors({}); setIsCreateOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Button>
        </div>

        {/* Tabs de estado */}
        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-2">
          {[
            { key: "all",    label: "Todos",      count: products.length },
            { key: "top",    label: "Top",         count: topCount },
            { key: "stable", label: "Estables",    count: stableCount },
            { key: "low",    label: "Stock bajo",  count: lowCount },
          ].map((item) => {
            const isActive = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`inline-flex items-center gap-2 border-b-2 px-1 py-1 text-sm font-semibold transition-colors ${
                  isActive ? "border-[#822727] text-white" : "border-transparent text-white/55 hover:text-white"
                }`}
                onClick={() => setStatusFilter(item.key)}
              >
                {item.label}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? "bg-[#822727] text-white" : "bg-white/10 text-white/75"}`}>
                  {item.count}
                </span>
              </button>
            );
          })}

          <div className="ml-auto text-xs text-white/45">{filteredProducts.length} resultados</div>

          {hasActiveFilters && (
            <Button
              type="button" variant="ghost"
              className="h-8 rounded-full px-3 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => { setSearchText(""); setStatusFilter("all"); setCategoryFilter("all"); setSortBy("name-asc"); }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabla ── */}
      <Card className="min-h-0 flex-1 border-white/10 bg-[#111111]/90 text-white shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col pt-3">
          <div className="scrollbar-invisible min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-[#151515]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#151515]">
                <TableRow className="border-white/10 bg-[#151515] hover:bg-[#151515]">
                  <TableHead className="w-12 text-white/45"><Checkbox aria-label="Seleccionar todos" /></TableHead>
                  <TableHead className="text-white/45">ID No.</TableHead>
                  <TableHead className="text-white/45">Producto</TableHead>
                  <TableHead className="text-white/45">Descripción</TableHead>
                  <TableHead className="text-white/45">Precio</TableHead>
                  <TableHead className="text-white/45">Stock</TableHead>
                  <TableHead className="w-32 text-right text-white/45">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Skeletons */}
                {loading && Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={`sk-${i}`} className="border-white/10">
                    <TableCell><Skeleton className="h-4 w-4 rounded-sm bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-6 bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48 bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-white/10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 bg-white/10" /></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                        <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                        <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && paginatedProducts.length === 0 && (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={7} className="py-8 text-center text-white/55">
                      No hay productos para mostrar.
                    </TableCell>
                  </TableRow>
                )}

                {!loading && paginatedProducts.map((item, index) => {
                  const rowNum     = (currentPage - 1) * rowsPerPage + index + 1;
                  const isExpanded = expandedRowId === item.id;

                  return (
                    <Fragment key={item.id}>
                      <TableRow className={`border-white/10 hover:bg-white/4 ${isExpanded ? "bg-white/4" : ""}`}>
                        <TableCell><Checkbox aria-label={`Seleccionar ${item.name}`} /></TableCell>
                        <TableCell className="text-white/65">{rowNum}</TableCell>
                        <TableCell className="font-medium text-white">
                          <span className="inline-flex items-center gap-2">
                            <Box className="h-4 w-4 text-[#822727]" />
                            {item.name}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-white/65">
                          {item.description || <span className="italic text-white/30">Sin descripción</span>}
                        </TableCell>
                        <TableCell className="text-white/65">{formatPrice(item.price)}</TableCell>
                        <TableCell className="text-white/65">{item.stock}</TableCell>
                        <TableCell className="w-32 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button type="button" variant="ghost" size="icon-sm"
                              className="h-8 w-8 rounded-md border border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                              onClick={() => setExpandedRowId(isExpanded ? null : item.id)}>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <Button type="button" variant="ghost" size="icon-sm"
                              className="h-8 w-8 rounded-md border border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                              onClick={() => openEditModal(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-sm"
                              className="h-8 w-8 rounded-md border border-[#822727]/35 bg-[#822727]/10 text-[#ff8f8f] hover:bg-[#822727]/20 hover:text-[#ffb6b6]"
                              onClick={() => setDeleteTarget(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="border-white/10 bg-white/4">
                          <TableCell colSpan={7}>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wider text-white/40">ID (MongoDB)</p>
                                <p className="mt-1 break-all text-sm text-white">{item.id}</p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wider text-white/40">Stock</p>
                                <p className="mt-1 text-sm text-white">{item.stock} unidades</p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wider text-white/40">Precio</p>
                                <p className="mt-1 text-sm text-white">{formatPrice(item.price)}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
            <p className="text-xs text-white/55">
              {filteredProducts.length === 0
                ? "Mostrando 0 de 0"
                : `Mostrando ${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, filteredProducts.length)} de ${filteredProducts.length}`}
            </p>
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="outline"
                className="h-9 rounded-full border-white/15 bg-transparent px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button key={page} type="button" variant="outline"
                  className={`h-9 min-w-9 rounded-full border px-3 text-sm ${
                    currentPage === page
                      ? "border-[#822727] bg-[#822727] text-white hover:bg-[#9b2f2f]"
                      : "border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setCurrentPage(page)}>
                  {page}
                </Button>
              ))}

              <Button type="button" variant="outline"
                className="h-9 rounded-full border-white/15 bg-transparent px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal Crear ───────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border border-white/10 bg-[#161616] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
            <DialogDescription className="text-white/55">
              Completa los campos para registrar un nuevo producto.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createProduct}>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nombre *</Label>
              <Input id="c-name" className="h-11" autoComplete="off" placeholder="Ej. Laptop X14"
                value={createForm.name} aria-invalid={!!createErrors.name}
                onChange={(e) => {
                  setCreateForm((p) => ({ ...p, name: e.target.value }));
                  if (createErrors.name) setCreateErrors((p) => ({ ...p, name: "" }));
                }} />
              {createErrors.name && <p className="text-xs text-red-500">{createErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Descripción</Label>
              <Input id="c-desc" className="h-11" autoComplete="off" placeholder="Descripción opcional"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-price">Precio (USD) *</Label>
                <Input id="c-price" className="h-11" type="number" min="0" step="0.01" placeholder="0.00"
                  value={createForm.price} aria-invalid={!!createErrors.price}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, price: e.target.value }));
                    if (createErrors.price) setCreateErrors((p) => ({ ...p, price: "" }));
                  }} />
                {createErrors.price && <p className="text-xs text-red-500">{createErrors.price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-stock">Stock *</Label>
                <Input id="c-stock" className="h-11" type="number" min="0"
                  value={createForm.stock} aria-invalid={!!createErrors.stock}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, stock: e.target.value }));
                    if (createErrors.stock) setCreateErrors((p) => ({ ...p, stock: "" }));
                  }} />
                {createErrors.stock && <p className="text-xs text-red-500">{createErrors.stock}</p>}
              </div>
            </div>

            <Separator className="bg-white/10" />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="h-11 px-5 text-black"
                onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}
                className="h-11 bg-[#822727] px-5 text-base hover:bg-[#9b2f2f]">
                {isCreating ? "Guardando..." : "Guardar producto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal Editar ──────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border border-white/10 bg-[#161616] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription className="text-white/55">
              Modifica los datos y guarda los cambios.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={editSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Nombre *</Label>
              <Input id="e-name" className="h-11" autoComplete="off"
                value={editForm.name} aria-invalid={!!editErrors.name}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, name: e.target.value }));
                  if (editErrors.name) setEditErrors((p) => ({ ...p, name: "" }));
                }} />
              {editErrors.name && <p className="text-xs text-red-500">{editErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-desc">Descripción</Label>
              <Input id="e-desc" className="h-11" autoComplete="off"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-price">Precio (USD) *</Label>
                <Input id="e-price" className="h-11" type="number" min="0" step="0.01"
                  value={editForm.price} aria-invalid={!!editErrors.price}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, price: e.target.value }));
                    if (editErrors.price) setEditErrors((p) => ({ ...p, price: "" }));
                  }} />
                {editErrors.price && <p className="text-xs text-red-500">{editErrors.price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-stock">Stock *</Label>
                <Input id="e-stock" className="h-11" type="number" min="0"
                  value={editForm.stock} aria-invalid={!!editErrors.stock}
                  onChange={(e) => {
                    setEditForm((p) => ({ ...p, stock: e.target.value }));
                    if (editErrors.stock) setEditErrors((p) => ({ ...p, stock: "" }));
                  }} />
                {editErrors.stock && <p className="text-xs text-red-500">{editErrors.stock}</p>}
              </div>
            </div>

            <Separator className="bg-white/10" />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="h-11 px-5"
                onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isEditing}
                className="h-11 bg-[#822727] px-5 text-base hover:bg-[#9b2f2f]">
                {isEditing ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminación ─────────────────────────────────────────── */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="border border-white/10 bg-[#161616] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">
              {`¿Estás seguro de eliminar "${deleteTarget?.name ?? "este producto"}"? Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t-0 bg-transparent">
            <AlertDialogCancel variant="outline" className="text-black hover:text-black">Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} className="bg-[#822727] hover:bg-[#9b2f2f]" onClick={confirmDelete}>
              {isDeleting ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Products;