// Components/Inocuidad/LimpiezaAreaHatchery.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../supabaseClient";
import logo2 from "../../assets/mosca.png";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import { Toast } from "primereact/toast";
import { Toolbar } from "primereact/toolbar";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";


{/* SUPA BASE
    SELECT * FROM public.limpieza_area_hatchery
ORDER BY fecha_registro DESC, hora_registro DESC
LIMIT 10; 
*/}
// Permisos (solo Mantenimiento01 / Produccion01)
import useCanReview from "./Registros/Hooks/useCanReview.js";
// Catálogos / utilidades

const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    // Semestral
    { key: "pisos", label: "Pisos (Semestral)", frecuencia: "Semestral" },
    { key: "paredes", label: "Paredes (Semestral)", frecuencia: "Semestral" },
    // Diario
    { key: "cajas_colores", label: "Cajas de colores (Diario)", frecuencia: "Diario" },
    { key: "cajas_plasticas", label: "Cajas plásticas (Diario)", frecuencia: "Diario" },
    { key: "mesas_laboratorio", label: "Mesas de laboratorio (Diario)", frecuencia: "Diario" },
    { key: "equipo_laboratorio", label: "Equipo de laboratorio (Diario)", frecuencia: "Diario" },
    { key: "estante_neonatos", label: "Estante de neonatos (Diario)", frecuencia: "Diario" },
    { key: "cuarto_oscuro", label: "Cuarto oscuro (Diario)", frecuencia: "Diario" },
];

const TABLE = "limpieza_area_hatchery"; // 👈 tabla en PUBLIC

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHM = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const emptyRegistro = () => ({
    // id lo genera la BD (uuid default)
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    responsable: "",
    firma_encargado: "",
    observaciones_generales: "",
    // preview informativo; el valor real lo pone la BD en created_at
    fecha_registro_preview: new Date().toLocaleString(),
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "", comentario: "" };
        return acc;
    }, {}),
});

// Aplanar form -> columnas BD
const toDb = (form) => ({
    fecha_registro: form.fecha_registro,
    hora_registro: form.hora_registro,
    responsable: form.responsable,
    firma_encargado: form.firma_encargado || null,
    observaciones_generales: form.observaciones_generales || null,

    pisos_estado: form.items.pisos?.estado || null,
    pisos_comentario: form.items.pisos?.comentario || null,

    paredes_estado: form.items.paredes?.estado || null,
    paredes_comentario: form.items.paredes?.comentario || null,

    cajas_colores_estado: form.items.cajas_colores?.estado || null,
    cajas_colores_comentario: form.items.cajas_colores?.comentario || null,

    cajas_plasticas_estado: form.items.cajas_plasticas?.estado || null,
    cajas_plasticas_comentario: form.items.cajas_plasticas?.comentario || null,

    mesas_laboratorio_estado: form.items.mesas_laboratorio?.estado || null,
    mesas_laboratorio_comentario: form.items.mesas_laboratorio?.comentario || null,

    equipo_laboratorio_estado: form.items.equipo_laboratorio?.estado || null,
    equipo_laboratorio_comentario: form.items.equipo_laboratorio?.comentario || null,

    estante_neonatos_estado: form.items.estante_neonatos?.estado || null,
    estante_neonatos_comentario: form.items.estante_neonatos?.comentario || null,

    cuarto_oscuro_estado: form.items.cuarto_oscuro?.estado || null,
    cuarto_oscuro_comentario: form.items.cuarto_oscuro?.comentario || null,
});

// Desaplanar BD -> shape UI
const fromDb = (row) => ({
    id: row.id,
    fecha_registro: row.fecha_registro,
    hora_registro: row.hora_registro,
    responsable: row.responsable,
    firma_encargado: row.firma_encargado,
    observaciones_generales: row.observaciones_generales,

    // ⬇️ usamos created_at como "Fecha de Registro (sistema)"
    fecha_registro_sistema: row.created_at ?? row.fecha_correccion ?? null,

    // campos de revisión
    revisado: row.revisado ?? false,
    revisado_por_username: row.revisado_por_username ?? null,
    revisado_fecha: row.revisado_fecha ?? null,

    items: {
        pisos: { estado: row.pisos_estado || "", comentario: row.pisos_comentario || "" },
        paredes: { estado: row.paredes_estado || "", comentario: row.paredes_comentario || "" },
        cajas_colores: { estado: row.cajas_colores_estado || "", comentario: row.cajas_colores_comentario || "" },
        cajas_plasticas: { estado: row.cajas_plasticas_estado || "", comentario: row.cajas_plasticas_comentario || "" },
        mesas_laboratorio: { estado: row.mesas_laboratorio_estado || "", comentario: row.mesas_laboratorio_comentario || "" },
        equipo_laboratorio: { estado: row.equipo_laboratorio_estado || "", comentario: row.equipo_laboratorio_comentario || "" },
        estante_neonatos: { estado: row.estante_neonatos_estado || "", comentario: row.estante_neonatos_comentario || "" },
        cuarto_oscuro: { estado: row.cuarto_oscuro_estado || "", comentario: row.cuarto_oscuro_comentario || "" },
    },
});

const validateRegistro = (form) => {
    const errs = [];
    if (!form.responsable?.trim()) errs.push("Responsable es requerido.");
    ITEMS.forEach((it) => {
        const v = form.items?.[it.key]?.estado;
        if (!v) errs.push(`Seleccione estado para: ${it.label}`);
        if (v && v !== "C" && !form.items[it.key].comentario?.trim()) {
            errs.push(`Comentario requerido en ${it.label} (NC/NA).`);
        }
    });
    return errs;
};

const flattenForExport = (row) => {
    const base = {
        fecha_registro: row.fecha_registro,
        hora_registro: row.hora_registro,
        responsable: row.responsable,
        "fecha registro (sistema)": row.fecha_registro_sistema ? new Date(row.fecha_registro_sistema).toLocaleString() : "",
        revisado: row.revisado ? "Sí" : "No",
    };
    ITEMS.forEach((it) => {
        base[`${it.label}`] = row.items?.[it.key]?.estado || "";
        base[`${it.label} - comentario`] = row.items?.[it.key]?.comentario || "";
    });
    base["firma_encargado"] = row.firma_encargado || "";
    base["observaciones"] = row.observaciones_generales || "";
    return base;
};

// -----------------------------
// Componente
// -----------------------------
export default function LimpiezaAreaHatchery() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    // Filtro por revisado
    const [filtroRevisado, setFiltroRevisado] = useState("all"); // 'all' | 'checked' | 'unchecked'

    // Permisos (solo Mantenimiento01 / Produccion01 pueden ver/marcar)
    const { canReview, username } = useCanReview();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyRegistro());

    const grupos = {
        Semestral: ITEMS.filter((i) => i.frecuencia === "Semestral"),
        Diario: ITEMS.filter((i) => i.frecuencia === "Diario"),
    };

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    // Cargar registros existentes
    const fetchRegistros = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from(TABLE)
                .select(`
          id,
          fecha_registro,
          hora_registro,
          responsable,
          firma_encargado,
          observaciones_generales,
          created_at,
          pisos_estado, pisos_comentario,
          paredes_estado, paredes_comentario,
          cajas_colores_estado, cajas_colores_comentario,
          cajas_plasticas_estado, cajas_plasticas_comentario,
          mesas_laboratorio_estado, mesas_laboratorio_comentario,
          equipo_laboratorio_estado, equipo_laboratorio_comentario,
          estante_neonatos_estado, estante_neonatos_comentario,
          cuarto_oscuro_estado, cuarto_oscuro_comentario,
          revisado, revisado_por_username, revisado_fecha
        `)
                .order("fecha_registro", { ascending: false });

            if (filtroRevisado === "checked") query = query.eq("revisado", true);
            if (filtroRevisado === "unchecked") query = query.eq("revisado", false);

            const { data, error } = await query;
            if (error) throw error;
            setRows((data || []).map(fromDb));
        } catch (err) {
            console.error(err);
            showToast("error", "Error", "Error al cargar registros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistros();
    }, [filtroRevisado]);

    const openNew = () => {
        setForm(emptyRegistro());
        setSubmitted(false);
        setDialogOpen(true);
    };

    const hideDialog = () => {
        setDialogOpen(false);
        setSubmitted(false);
    };

    const onHeaderChange = (e, field) => setForm((p) => ({ ...p, [field]: e.target.value }));
    const onItemChange = (key, field, value) =>
        setForm((p) => ({
            ...p,
            items: { ...p.items, [key]: { ...(p.items[key] || { estado: "", comentario: "" }), [field]: value } },
        }));

    const save = async () => {
        setSubmitted(true);
        const errs = validateRegistro(form);
        if (errs.length) {
            showToast("error", "Validación", errs[0]);
            return;
        }

        try {
            const payload = toDb(form);
            const { error } = await supabase.from(TABLE).insert([payload]);
            if (error) throw error;

            showToast("success", "Guardado", "Registro creado correctamente");
            setDialogOpen(false);
            setForm(emptyRegistro());
            await fetchRegistros();
        } catch (err) {
            console.error(err);
            showToast("error", "Error", err.message || "No se pudo guardar");
        }
    };

    const countBy = (row, val) => ITEMS.reduce((acc, it) => acc + (row.items?.[it.key]?.estado === val ? 1 : 0), 0);

    // Columna final: checkbox de Revisado (solo si canReview)
    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            if (!username) {
                showToast("warn", "Sesión", "No se detectó el usuario actual.");
                return;
            }
            const { error } = await supabase
                .from(TABLE)
                .update({
                    revisado: next,
                    revisado_por_username: next ? username : null,
                    revisado_fecha: next ? new Date().toISOString() : null,
                })
                .eq("id", row.id);

            if (error) {
                showToast("error", "No se guardó", error.message);
                return;
            }

            setRows((prev) =>
                prev.map((r) =>
                    r.id === row.id
                        ? {
                            ...r,
                            revisado: next,
                            revisado_por_username: next ? username : null,
                            revisado_fecha: next ? new Date().toISOString() : null,
                        }
                        : r
                )
            );
            showToast("success", "OK", next ? "Marcado revisado" : "Marcado no revisado");
        };

        return (
            <div className="flex align-items-center justify-content-center gap-2">
                <Checkbox inputId={`chk-rev-hat-${row.id}`} checked={!!row.revisado} onChange={(e) => onToggle(e.checked)} />
                <label htmlFor={`chk-rev-hat-${row.id}`} className="text-sm">
                    Revisado
                </label>
            </div>
        );
    };

    // Header con búsqueda + filtro de revisado
    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    type="search"
                    value={globalFilter}
                    onInput={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar Registros"
                />
            </span>

            <div className="flex align-items-center gap-2">
                <span className="text-sm font-medium">Filtro:</span>
                <Dropdown
                    value={filtroRevisado}
                    onChange={(e) => setFiltroRevisado(e.value)}
                    options={[
                        { label: "Todos", value: "all" },
                        { label: "Revisado", value: "checked" },
                        { label: "Sin revisar", value: "unchecked" },
                    ]}
                    style={{ minWidth: 160 }}
                />
            </div>
        </div>
    );

    const leftToolbarTemplate = () => (
        <div className="flex gap-2">
            <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={openNew} />
        </div>
    );
    const rightToolbarTemplate = () => (
        <div className="exportar-container flex flex-wrap gap-2">
            <Button
                label="Exportar a Excel"
                icon="pi pi-upload"
                className="p-button-help"
                onClick={async () => {
                    if (selected.length === 0) {
                        showToast("warn", "Advertencia", "Seleccione registros");
                        return;
                    }
                    try {
                        const XLSX = await import("xlsx");
                        const rowsToExport = selected.map(flattenForExport);
                        const ws = XLSX.utils.json_to_sheet(rowsToExport);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Limpieza Hatchery");
                        XLSX.writeFile(wb, `Limpieza_Hatchery_${new Date().toISOString().slice(0, 10)}.xlsx`);
                    } catch (err) {
                        console.error(err);
                        showToast("error", "Exportación", "No se pudo exportar a Excel");
                    }
                }}
            />
            <Button
                label="Exportar a PDF"
                icon="pi pi-file-pdf"
                className="p-button-danger"
                onClick={async () => {
                    if (selected.length === 0) {
                        showToast("warn", "Advertencia", "Seleccione registros");
                        return;
                    }
                    try {
                        const { default: jsPDF } = await import("jspdf");
                        await import("jspdf-autotable");
                        const doc = new jsPDF({ orientation: "landscape" });
                        doc.setFontSize(14);
                        doc.text("Registro de Limpieza - Área de Hatchery", 14, 14);
                        const body = selected.map((r) => Object.values(flattenForExport(r)));
                        const head = Object.keys(flattenForExport(selected[0]));
                        doc.autoTable({ head: [head], body, styles: { fontSize: 8 }, startY: 20 });
                        doc.save(`Limpieza_Hatchery_${new Date().toISOString().slice(0, 10)}.pdf`);
                    } catch (err) {
                        console.error(err);
                        showToast("error", "Exportación", "No se pudo exportar a PDF");
                    }
                }}
            />
        </div>
    );

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Limpieza del Área de Hatchery
            </h1>

            <div className="welcome-message">
                <p>
                    <span>
                        Selecciona: <b className="bold-space">C</b> (Cumple),
                        <b className="bold-space">NC</b> (No cumple) o
                        <b className="bold-space">NA</b> (No aplica).
                    </span>
                    <br />
                    <span>
                        Para <b className="bold-space">NC/NA</b> el comentario es obligatorio.
                    </span>
                    <br />

                </p>
            </div>

            <div className="buttons-container">
                <button onClick={() => navigate(-1)} className="return-button">
                    Volver
                </button>
                <button onClick={() => navigate(-2)} className="menu-button">
                    Menú principal
                </button>
            </div>

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            <DataTable
                value={rows}
                loading={loading}
                selection={selected}
                onSelectionChange={(e) => setSelected(e.value)}
                selectionMode="multiple"
                header={header}
                globalFilter={globalFilter}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Registros"
                dataKey="id"
                showGridlines
            >
                <Column selectionMode="multiple" exportable={false} />
                <Column field="fecha_registro" header="Fecha" sortable />
                <Column field="hora_registro" header="Hora" />
                <Column field="responsable" header="Operario" sortable />

                {/* ⬇️ NUEVA COLUMNA visible: Fecha de Registro (sistema) */}
                <Column
                    field="fecha_registro_sistema"
                    header="Fecha de Registro"
                    body={(r) => (r.fecha_registro_sistema ? new Date(r.fecha_registro_sistema).toLocaleString() : "")}
                    sortable
                />

                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />
                {ITEMS.map((it) => (
                    <Column key={it.key} header={it.label} body={(row) => row.items?.[it.key]?.estado || ""} />
                ))}
                {/* Última columna: checkbox de revisado */}
                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
            </DataTable>

            <Dialog
                visible={dialogOpen}
                style={{ width: "70vw", maxWidth: 1100 }}
                header="Nuevo registro de limpieza"
                modal
                onHide={hideDialog}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancelar" icon="pi pi-times" outlined onClick={hideDialog} />
                        <Button label="Guardar" icon="pi pi-check" onClick={save} />
                    </div>
                }
            >
                <div className="p-fluid grid">
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Fecha</label>
                        <InputText value={form.fecha_registro} onChange={(e) => onHeaderChange(e, "fecha_registro")} type="date" />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora</label>
                        <InputText value={form.hora_registro} onChange={(e) => onHeaderChange(e, "hora_registro")} type="time" />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">
                            Operario* {submitted && !form.responsable && <small className="p-error"> Requerido</small>}
                        </label>
                        <InputText value={form.responsable} onChange={(e) => onHeaderChange(e, "responsable")} />
                    </div>

                    {["Semestral", "Diario"].map((freq) => (
                        <div key={freq} className="col-12">
                            <div className="font-bold text-lg mb-2">{freq}</div>
                            <div className="grid">
                                {ITEMS.filter((i) => i.frecuencia === freq).map((it) => {
                                    const val = form.items[it.key] || { estado: "", comentario: "" };
                                    const necesitaComentario = val.estado && val.estado !== "C";
                                    return (
                                        <div className="field col-12 md:col-6" key={it.key}>
                                            <label className="font-bold">
                                                {it.label}* {submitted && !val.estado && <small className="p-error"> Requerido</small>}
                                            </label>
                                            <Dropdown
                                                value={val.estado}
                                                options={ESTADOS}
                                                onChange={(e) => onItemChange(it.key, "estado", e.value)}
                                                placeholder="Seleccione"
                                                className="mb-2"
                                            />
                                            {necesitaComentario && (
                                                <>
                                                    <small className="campo-note">Comentario obligatorio para NC o NA</small>
                                                    <InputText
                                                        value={val.comentario}
                                                        onChange={(e) => onItemChange(it.key, "comentario", e.target.value)}
                                                        placeholder="Explique la causa/acción correctiva"
                                                    />
                                                    {submitted && !val.comentario?.trim() && <small className="p-error"> Requerido</small>}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* ⬇️ Fecha de Registro (auto) solo lectura */}
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Fecha de Registro (auto)</label>
                        <InputText value={form.fecha_registro_preview} disabled />
                        <small className="text-color-secondary">Se genera automáticamente al guardar.</small>
                    </div>


                    {<div className="field col-12">
                        <label className="font-bold">Observaciones</label>
                        <InputText
                            value={form.observaciones_generales}
                            onChange={(e) => onHeaderChange(e, "observaciones_generales")}
                        />
                    </div>}
                </div>
            </Dialog>
        </div>
    );
}
