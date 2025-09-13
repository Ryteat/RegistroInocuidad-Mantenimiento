import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient";
import logo2 from "../../../assets/mosca.png";

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
import * as XLSX from "xlsx";

// 👇 igual que en otros registros
import useCanReview from "./Hooks/useCanReview.js";

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHM = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

/** Áreas y estaciones (según tu excel, ya ajustado por ti) */
const AREAS = [
    { label: "Dieta", value: "DIETA" },
    { label: "Engorde", value: "ENGORDE" },
    { label: "Bodega", value: "BODEGA" },
    { label: "Comedor", value: "COMEDOR" },
    { label: "Horno", value: "HORNO" },
    { label: "Hatchery", value: "HATCHERY" },
];

const UBICACIONES = [
    { label: "Interna", value: "Interna" },
    { label: "Externa", value: "Externa" },
];

/** Mapa editable si cambian rangos (dejé los tuyos tal como los pegaste) */
const STATIONS = {
    DIETA: {
        Interna: [61, 62, 63, 64, 65, 66, 67],
        Externa: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76],
    },
    ENGORDE: {
        Interna: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
        Externa: [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56],
    },
    BODEGA: {
        Interna: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
        Externa: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
    },
    COMEDOR: {
        Interna: [14, 15, 16, 17, 18, 19],
        Externa: [77, 78, 79, 80, 81, 82, 83, 84],
    },
    HORNO: {
        Interna: [53, 54, 55, 56, 57],
        Externa: [57, 58, 59, 60, 61, 62, 63, 64, 65, 66],
    },
    HATCHERY: {
        Interna: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        Externa: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
    },
};

const opcionesSiNo = [
    { label: "Sí", value: true },
    { label: "No", value: false },
];

// Indicadores para Roedores (E, CM, P, MC, IV, IM)
const ROEDORES_INDICADORES = [
    { key: "E", label: "E (Excremento)" },
    { key: "CM", label: "CM (Cebo mordido)" },
    { key: "P", label: "P (Pelos)" },
    { key: "MC", label: "MC (Marcas corporales)" },
    { key: "IV", label: "IV (Individuos vivos)" },
    { key: "IM", label: "IM (Individuos muertos)" },
];

const emptyForm = () => ({
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    area: "",
    ubicacion_estacion: "",
    numero_estacion: null,

    evidencia_roedores: null,
    cambio_agente_control: null,

    // ▶ nuevos de evidencia
    plaga_roedores: false,
    roedores_indicadores: [], // array de strings: ["E","CM",...]
    plaga_hormigas: false,
    hormigas_iv: false,

    tiene_observacion: false,
    observaciones: "",

    // revisión
    revisado: false,

    fecha_correccion_preview: new Date().toLocaleString(), // solo UI
});

export default function ControlPlagasRoedores() {
    const navigate = useNavigate();
    const toast = useRef(null);

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    // Abrir/cerrar modal
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    const openNew = () => {
        setForm(emptyForm());
        setSubmitted(false);
        setDialogOpen(true);
    };

    const hideDialog = () => {
        setDialogOpen(false);
        setSubmitted(false);
    };

    // ▼ Filtro por revisado
    const [filtroRevisado, setFiltroRevisado] = useState("all"); // 'all' | 'checked' | 'unchecked'

    // Permisos para marcar revisado (igual que otros)
    const { canReview, username } = useCanReview();

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    // ───────────────────────────────── fetch
    const fetchRows = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from("control_plagas_roedores")
                .select("*")
                .order("fecha_registro", { ascending: false })
                .order("created_at", { ascending: false });

            if (filtroRevisado === "checked") query = query.eq("revisado", true);
            if (filtroRevisado === "unchecked") query = query.eq("revisado", false);

            const { data, error } = await query;
            if (error) throw error;
            setRows(data || []);
        } catch (e) {
            console.error(e);
            showToast("error", "Error", "No se pudieron cargar registros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, [filtroRevisado]);

    // ───────────────────────────────── helpers
    const stationOptions = useMemo(() => {
        if (!form.area || !form.ubicacion_estacion) return [];
        const arr = STATIONS[form.area]?.[form.ubicacion_estacion] || [];
        return arr.map((n) => ({ label: String(n), value: n }));
    }, [form.area, form.ubicacion_estacion]);

    const onChange = (field, value) => {
        if (field === "area") {
            setForm((p) => ({ ...p, area: value, numero_estacion: null }));
            return;
        }
        if (field === "ubicacion_estacion") {
            setForm((p) => ({ ...p, ubicacion_estacion: value, numero_estacion: null }));
            return;
        }
        if (field === "evidencia_roedores") {
            // Si NO hay evidencia, resetea subcampos de plaga
            setForm((p) => ({
                ...p,
                evidencia_roedores: value,
                plaga_roedores: value ? p.plaga_roedores : false,
                roedores_indicadores: value ? p.roedores_indicadores : [],
                plaga_hormigas: value ? p.plaga_hormigas : false,
                hormigas_iv: value ? p.hormigas_iv : false,
            }));
            return;
        }
        setForm((p) => ({ ...p, [field]: value }));
    };

    const toggleRoedorIndicador = (code, checked) => {
        setForm((p) => {
            const set = new Set(p.roedores_indicadores);
            if (checked) set.add(code);
            else set.delete(code);
            return { ...p, roedores_indicadores: Array.from(set) };
        });
    };

    const validate = () => {
        const errs = [];
        if (!form.area) errs.push("Seleccione el área.");
        if (!form.ubicacion_estacion) errs.push("Seleccione la ubicación de la estación.");
        if (form.numero_estacion === null) errs.push("Seleccione el número de estación.");
        if (form.evidencia_roedores === null) errs.push("Indique si hay evidencia de roedores.");
        if (form.cambio_agente_control === null) errs.push("Indique si hubo cambio de agente de control.");

        if (form.evidencia_roedores === true) {
            if (!form.plaga_roedores && !form.plaga_hormigas) {
                errs.push("Seleccione ‘Roedores’ y/o ‘Hormigas’ para detallar la evidencia.");
            }
            if (form.plaga_roedores && (!form.roedores_indicadores || form.roedores_indicadores.length === 0)) {
                errs.push("Seleccione al menos un indicador en ‘Roedores’ (E, CM, P, MC, IV o IM).");
            }
            if (form.plaga_hormigas && !form.hormigas_iv) {
                errs.push("Marque IV en ‘Hormigas’ si corresponde (Individuos vivos).");
            }
        }

        if (form.tiene_observacion && !form.observaciones.trim()) {
            errs.push("Ingrese la observación/comentario.");
        }
        return errs;
    };

    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) {
            showToast("warn", "Validación", errs[0]);
            return;
        }
        try {
            const payload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                area: form.area,
                ubicacion_estacion: form.ubicacion_estacion,
                numero_estacion: form.numero_estacion,

                evidencia_roedores: !!form.evidencia_roedores,
                cambio_agente_control: !!form.cambio_agente_control,

                // ▼ nuevos campos
                plaga_roedores: form.evidencia_roedores ? !!form.plaga_roedores : false,
                roedores_indicadores:
                    form.evidencia_roedores && form.plaga_roedores ? (form.roedores_indicadores || []).join(",") : null,
                plaga_hormigas: form.evidencia_roedores ? !!form.plaga_hormigas : false,
                hormigas_iv: form.evidencia_roedores && form.plaga_hormigas ? !!form.hormigas_iv : false,

                observaciones: form.tiene_observacion ? form.observaciones.trim() : null,
                // revisado: default false en BD (opcional enviarlo)
            };

            const { error } = await supabase.from("control_plagas_roedores").insert([payload]);
            if (error) throw error;

            showToast("success", "Éxito", "Registro guardado");
            setDialogOpen(false);
            await fetchRows();
        } catch (e) {
            console.error(e);
            showToast("error", "Error", e.message || "No se pudo guardar");
        }
    };

    const exportXlsx = () => {
        if (selected.length === 0) {
            showToast("warn", "Advertencia", "Seleccione registros");
            return;
        }
        const toFlat = (r) => ({
            fecha: r.fecha_registro,
            hora: r.hora_registro,
            area: r.area || "",
            ubicacion_estacion: r.ubicacion_estacion || "",
            numero_estacion: r.numero_estacion ?? "",
            evidencia_roedores: r.evidencia_roedores ? "Sí" : "No",
            cambio_agente_control: r.cambio_agente_control ? "Sí" : "No",
            plaga_roedores: r.plaga_roedores ? "Sí" : "No",
            roedores_indicadores: r.roedores_indicadores || "",
            plaga_hormigas: r.plaga_hormigas ? "Sí" : "No",
            hormigas_iv: r.hormigas_iv ? "Sí" : "No",
            revisado: r.revisado ? "Sí" : "No",
            observaciones: r.observaciones || "",
            fecha_correccion: r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "",
        });
        const ws = XLSX.utils.json_to_sheet(selected.map(toFlat));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Control Plagas - Roedores");
        XLSX.writeFile(wb, `Control_Plagas_Roedores_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // ─────────── columna “Revisado” (igual patrón que otros módulos)
    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            if (!username) {
                showToast("warn", "Sesión", "No se detectó el usuario actual.");
                return;
            }
            const { error } = await supabase
                .from("control_plagas_roedores")
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
                <Checkbox inputId={`chk-rev-plg-${row.id}`} checked={!!row.revisado} onChange={(e) => onToggle(e.checked)} />
                <label htmlFor={`chk-rev-plg-${row.id}`} className="text-sm">
                    Revisado
                </label>
            </div>
        );
    };

    // Render columna resumen plagas
    const plagaResumen = (r) => {
        const parts = [];
        if (r.plaga_roedores) {
            parts.push(`Roedores [${r.roedores_indicadores || "-"}]`);
        }
        if (r.plaga_hormigas) {
            parts.push(`Hormigas [${r.hormigas_iv ? "IV" : "-"}]`);
        }
        return parts.length ? parts.join(" | ") : "—";
    };

    // ─────────── header (búsqueda + filtro revisado)
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
                        { label: "Con check", value: "checked" },
                        { label: "Sin check", value: "unchecked" },
                    ]}
                    style={{ minWidth: 160 }}
                />
            </div>
        </div>
    );

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Control de Plagas – Hoja de Chequeo (Estación de Roedores)
            </h1>

            <div className="welcome-message">
                <p>
                    Primero elija el <b>Área</b>, luego la <b>Ubicación</b> (interna/externa) y finalmente el <b>Nº de estación</b>.
                    La <b>fecha de corrección</b> se genera automáticamente al guardar.
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

            <Toolbar
                className="mb-4"
                left={() => <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={openNew} />}
                right={() => (
                    <Button label="Exportar a Excel" icon="pi pi-upload" className="p-button-help" onClick={exportXlsx} />
                )}
            />

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
                <Column field="area" header="Área" sortable />
                <Column field="ubicacion_estacion" header="Ubicación" sortable />
                <Column field="numero_estacion" header="Nº Estación" sortable />
                <Column header="Evidencia de roedores" body={(r) => (r.evidencia_roedores ? "Sí" : "No")} sortable />
                <Column header="Cambio agente de control" body={(r) => (r.cambio_agente_control ? "Sí" : "No")} sortable />
                <Column header="Plaga detectada" body={plagaResumen} />
                <Column field="observaciones" header="Observaciones" body={(r) => r.observaciones || "—"} />
                <Column
                    field="fecha_correccion"
                    header="Fecha de Revision"
                    body={(r) => (r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "—")}
                    sortable
                />
                {/* última: Revisado */}
                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
            </DataTable>

            {/* Dialog */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "55vw", maxWidth: 900 }}
                header="Nuevo registro de control de plagas"
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
                        <InputText
                            type="date"
                            value={form.fecha_registro}
                            onChange={(e) => onChange("fecha_registro", e.target.value)}
                        />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora</label>
                        <InputText type="time" value={form.hora_registro} onChange={(e) => onChange("hora_registro", e.target.value)} />
                    </div>

                    <div className="field col-12 md:col-4">
                        <label className="font-bold">
                            Área* {submitted && !form.area && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown value={form.area} options={AREAS} onChange={(e) => onChange("area", e.value)} placeholder="Seleccione" />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Ubicación de estación*
                            {submitted && !form.ubicacion_estacion && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.ubicacion_estacion}
                            options={UBICACIONES}
                            onChange={(e) => onChange("ubicacion_estacion", e.value)}
                            placeholder="Seleccione"
                            disabled={!form.area}
                        />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Nº de estación*
                            {submitted && form.numero_estacion === null && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.numero_estacion}
                            options={stationOptions}
                            onChange={(e) => onChange("numero_estacion", e.value)}
                            placeholder={form.area && form.ubicacion_estacion ? "Seleccione" : "Primero elija área y ubicación"}
                            disabled={!form.area || !form.ubicacion_estacion}
                        />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Evidencia de roedores*
                            {submitted && form.evidencia_roedores === null && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.evidencia_roedores}
                            options={opcionesSiNo}
                            onChange={(e) => onChange("evidencia_roedores", e.value)}
                            placeholder="Seleccione"
                        />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Cambio de agente de control*
                            {submitted && form.cambio_agente_control === null && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.cambio_agente_control}
                            options={opcionesSiNo}
                            onChange={(e) => onChange("cambio_agente_control", e.value)}
                            placeholder="Seleccione"
                        />
                    </div>

                    {/* ▼ Sección dinámica cuando hay evidencia */}
                    {form.evidencia_roedores === true && (
                        <>
                            <div className="col-12">
                                {/* Título con formato distintivo, reutilizando tu clase estándar */}
                                <div className="subarea-title" style={{ marginBottom: ".5rem" }}>
                                    Tipo de plaga detectada
                                </div>

                                <div className="grid">
                                    {/* Roedores */}
                                    <div className="field col-12 md:col-6">
                                        {/* Etiqueta grande + checkbox AL FINAL */}
                                        <div
                                            className="plaga-row"
                                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem" }}
                                        >
                                            <label htmlFor="plg_roedores" className="subarea-title" style={{ margin: ".25rem 0" }}>
                                                Roedores
                                            </label>
                                            <Checkbox
                                                inputId="plg_roedores"
                                                checked={form.plaga_roedores}
                                                onChange={(e) => onChange("plaga_roedores", e.checked)}
                                            />
                                        </div>

                                        {form.plaga_roedores && (
                                            <div className="mt-2">
                                                {/* Indicadores con checkbox AL FINAL de cada línea */}
                                                {ROEDORES_INDICADORES.map((opt) => (
                                                    <div
                                                        key={opt.key}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            gap: ".75rem",
                                                            padding: ".25rem 0",
                                                        }}
                                                    >
                                                        <label htmlFor={`rod_${opt.key}`}>{opt.label}</label>
                                                        <Checkbox
                                                            inputId={`rod_${opt.key}`}
                                                            checked={form.roedores_indicadores.includes(opt.key)}
                                                            onChange={(e) => toggleRoedorIndicador(opt.key, e.checked)}
                                                        />
                                                    </div>
                                                ))}

                                                {submitted && form.roedores_indicadores.length === 0 && (
                                                    <small className="p-error"> Seleccione al menos uno</small>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Hormigas */}
                                    <div className="field col-12 md:col-6">
                                        {/* Etiqueta grande + checkbox AL FINAL */}
                                        <div
                                            className="plaga-row"
                                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem" }}
                                        >
                                            <label htmlFor="plg_hormigas" className="subarea-title" style={{ margin: ".25rem 0" }}>
                                                Hormigas
                                            </label>
                                            <Checkbox
                                                inputId="plg_hormigas"
                                                checked={form.plaga_hormigas}
                                                onChange={(e) => onChange("plaga_hormigas", e.checked)}
                                            />
                                        </div>

                                        {form.plaga_hormigas && (
                                            <div className="mt-2">
                                                {/* Único indicador (IV) con checkbox al final */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        gap: ".75rem",
                                                        padding: ".25rem 0",
                                                    }}
                                                >
                                                    <label htmlFor="ant_iv">IV (Individuos vivos)</label>
                                                    <Checkbox
                                                        inputId="ant_iv"
                                                        checked={form.hormigas_iv}
                                                        onChange={(e) => onChange("hormigas_iv", e.checked)}
                                                    />
                                                </div>

                                                {submitted && !form.hormigas_iv && (
                                                    <small className="p-error"> Marque IV si corresponde</small>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="field col-12">
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="chkObs"
                                checked={form.tiene_observacion}
                                onChange={(e) => onChange("tiene_observacion", e.checked)}
                            />
                        </div>
                        <label htmlFor="chkObs" className="font-bold" style={{ cursor: "pointer" }}>
                            Agregar observación (daños/reemplazo/ausencia/presencia de insectos)
                        </label>

                        {form.tiene_observacion && (
                            <>
                                <InputText
                                    className="mt-2"
                                    value={form.observaciones}
                                    onChange={(e) => onChange("observaciones", e.target.value)}
                                    placeholder="Detalle la observación"
                                />
                                {submitted && !form.observaciones.trim() && (
                                    <small className="p-error"> Campo requerido</small>
                                )}
                            </>
                        )}
                    </div>

                    <div className="field col-12">
                        <label className="font-bold">Fecha de Registro (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
