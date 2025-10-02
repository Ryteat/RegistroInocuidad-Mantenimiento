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
import { MultiSelect } from "primereact/multiselect";
import * as XLSX from "xlsx";


{/* PARA VERIFICAR EN SUPA BASE
     SELECT *
FROM public.control_plagas_roedores
ORDER BY fecha_registro DESC, hora_registro DESC
LIMIT 10;
*/}
// permiso de revisión (igual que en otros módulos)
import useCanReview from "./Hooks/useCanReview.js";

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHM = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

/** Áreas y estaciones (según tu Excel) */
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

const STATIONS = {
    DIETA: { Interna: [61, 62, 63, 64, 65, 66, 67], Externa: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76] },
    ENGORDE: {
        Interna: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
        Externa: [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56],
    },
    BODEGA: { Interna: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29], Externa: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37] },
    COMEDOR: { Interna: [14, 15, 16, 17, 18, 19], Externa: [77, 78, 79, 80, 81, 82, 83, 84] },
    HORNO: { Interna: [53, 54, 55, 56, 57], Externa: [57, 58, 59, 60, 61, 62, 63, 64, 65, 66] },
    HATCHERY: {
        Interna: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        Externa: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
    },
};

const opcionesSiNo = [
    { label: "Sí", value: true },
    { label: "No", value: false },
];

// Indicadores de roedores (MultiSelect)
const ROEDORES_INDICADORES = [
    { key: "E", label: "E (Excremento)" },
    { key: "CM", label: "CM (Cebo mordido)" },
    { key: "P", label: "P (Pelos)" },
    { key: "MC", label: "MC (Marcas corporales)" },
    { key: "IV", label: "IV (Individuos vivos)" },
    { key: "IM", label: "IM (Individuos muertos)" },
];
const ROEDORES_MS_OPTIONS = ROEDORES_INDICADORES.map((o) => ({ label: o.label, value: o.key }));

// Indicador de hormigas (Dropdown de una sola opción IV)
const HORMIGAS_OPTIONS = [{ label: "IV (Individuos vivos)", value: "IV" }];

const emptyForm = () => ({
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    area: "",
    ubicacion_estacion: "",
    numero_estacion: null,

    evidencia_roedores: null,
    cambio_agente_control: null,

    // Sección dinámica
    roedores_indicadores: [], // MultiSelect -> array de códigos
    plaga_hormigas: false, // “Evidencia de Hormigas” (Sí/No)
    hormigas_indicador: "", // "IV" cuando aplica

    tiene_observacion: false,
    observaciones: "",

    revisado: false,
    fecha_correccion_preview: new Date().toLocaleString(),
});

export default function ControlPlagasRoedores() {
    const navigate = useNavigate();
    const toast = useRef(null);

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    const [filtroRevisado, setFiltroRevisado] = useState("all"); // 'all' | 'checked' | 'unchecked'
    const { canReview, username } = useCanReview();

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    // Fetch con filtro revisado
    const fetchRows = async () => {
        try {
            setLoading(true);
            let q = supabase
                .from("control_plagas_roedores")
                .select("*")
                .order("fecha_registro", { ascending: false })
                .order("created_at", { ascending: false });

            if (filtroRevisado === "checked") q = q.eq("revisado", true);
            if (filtroRevisado === "unchecked") q = q.eq("revisado", false);

            const { data, error } = await q;
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

    const stationOptions = useMemo(() => {
        if (!form.area || !form.ubicacion_estacion) return [];
        const arr = STATIONS[form.area]?.[form.ubicacion_estacion] || [];
        return arr.map((n) => ({ label: String(n), value: n }));
    }, [form.area, form.ubicacion_estacion]);

    const openNew = () => {
        setForm(emptyForm());
        setSubmitted(false);
        setDialogOpen(true);
    };
    const hideDialog = () => {
        setDialogOpen(false);
        setSubmitted(false);
    };

    const onChange = (field, value) => {
        if (field === "area") return setForm((p) => ({ ...p, area: value, numero_estacion: null }));
        if (field === "ubicacion_estacion")
            return setForm((p) => ({ ...p, ubicacion_estacion: value, numero_estacion: null }));

        if (field === "evidencia_roedores") {
            // Si NO hay evidencia, limpiar todo lo dependiente
            return setForm((p) => ({
                ...p,
                evidencia_roedores: value,
                roedores_indicadores: value ? p.roedores_indicadores : [],
                plaga_hormigas: value ? p.plaga_hormigas : false,
                hormigas_indicador: value ? p.hormigas_indicador : "",
            }));
        }

        if (field === "plaga_hormigas" && !value) {
            // Si el usuario marca "No" en Evidencia de Hormigas, limpia el indicador
            return setForm((p) => ({ ...p, plaga_hormigas: false, hormigas_indicador: "" }));
        }

        setForm((p) => ({ ...p, [field]: value }));
    };

    const validate = () => {
        const errs = [];
        if (!form.area) errs.push("Seleccione el área.");
        if (!form.ubicacion_estacion) errs.push("Seleccione la ubicación de la estación.");
        if (form.numero_estacion === null) errs.push("Seleccione el número de estación.");
        if (form.evidencia_roedores === null) errs.push("Indique si hay evidencia de roedores.");
        if (form.cambio_agente_control === null) errs.push("Indique si hubo cambio de agente de control.");

        if (form.evidencia_roedores === true) {
            if (form.roedores_indicadores.length === 0) {
                errs.push("Seleccione al menos un indicador de roedores (E, CM, P, MC, IV o IM).");
            }
            if (form.plaga_hormigas === null) {
                errs.push("Indique si hay evidencia de hormigas.");
            }
            if (form.plaga_hormigas === true && !form.hormigas_indicador) {
                errs.push("Seleccione el indicador de hormigas (IV).");
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

                // Guardado:
                plaga_roedores: !!form.evidencia_roedores, // si hay evidencia de roedores -> true
                roedores_indicadores:
                    form.evidencia_roedores && form.roedores_indicadores.length
                        ? form.roedores_indicadores.join(",")
                        : null,

                plaga_hormigas: form.evidencia_roedores ? !!form.plaga_hormigas : false,
                hormigas_iv: form.evidencia_roedores && form.plaga_hormigas ? form.hormigas_indicador === "IV" : false,

                observaciones: form.tiene_observacion ? form.observaciones.trim() : null,
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

    const { canReview: _canReview } = useCanReview();

    const revisadoTemplate = (row) => {
        if (!_canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

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

    const plagaResumen = (r) => {
        const parts = [];
        if (r.plaga_roedores) parts.push(`Roedores [${r.roedores_indicadores || "-"}]`);
        if (r.plaga_hormigas) parts.push(`Hormigas [${r.hormigas_iv ? "IV" : "-"}]`);
        return parts.length ? parts.join(" | ") : "—";
    };

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

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Control de Plagas – Hoja de Chequeo (Estación de Roedores)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Hoja de chequeo de estaciones de Control de Plagas y Roedores:</b>
                </p>
            </div>


            <div className="buttons-container">
                <button onClick={() => navigate(-1)} className="return-button">Volver</button>
                <button onClick={() => navigate(-2)} className="menu-button">Menú principal</button>
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
                    header="Fecha de Registro"
                    body={(r) => (r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "—")}
                    sortable
                />
                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
            </DataTable>

            {/* Dialog */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "58vw", maxWidth: 980 }}
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
                        <InputText type="date" value={form.fecha_registro} onChange={(e) => onChange("fecha_registro", e.target.value)} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora</label>
                        <InputText type="time" value={form.hora_registro} onChange={(e) => onChange("hora_registro", e.target.value)} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Área* {submitted && !form.area && <small className="p-error"> Requerido</small>}</label>
                        <Dropdown value={form.area} options={AREAS} onChange={(e) => onChange("area", e.value)} placeholder="Seleccione" />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Ubicación de estación* {submitted && !form.ubicacion_estacion && <small className="p-error"> Requerido</small>}
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
                            Nº de estación* {submitted && form.numero_estacion === null && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.numero_estacion}
                            options={stationOptions}
                            onChange={(e) => onChange("numero_estacion", e.value)}
                            placeholder={form.area && form.ubicacion_estacion ? "Seleccione" : "Primero elija área y ubicación"}
                            disabled={!form.area || !form.ubicacion_estacion}
                        />
                    </div>
                    {/* Cambio de agente de control (Sí/No) */}
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Cambio de agente de control*
                            {submitted && form.cambio_agente_control === null && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <Dropdown
                            value={form.cambio_agente_control}
                            options={opcionesSiNo}
                            onChange={(e) => onChange("cambio_agente_control", e.value)}
                            placeholder="Seleccione"
                        />
                    </div>

                    {/* Evidencia de roedores -> despliegue de indicadores (MultiSelect) */}
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Evidencia de Roedores u Hormigas*{" "}
                            {submitted && form.evidencia_roedores === null && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.evidencia_roedores}
                            options={opcionesSiNo}
                            onChange={(e) => onChange("evidencia_roedores", e.value)}
                            placeholder="Seleccione"
                        />
                    </div>


                    {form.evidencia_roedores === true && (
                        <>
                            {/* Bloque ROEDORES */}
                            <div className="field col-12">
                                <div className="plaga-box">
                                    <div className="subarea-title">Roedores</div>

                                    <label className="font-bold">
                                        Indicadores (uno o más)
                                        {submitted && form.roedores_indicadores.length === 0 && (
                                            <small className="p-error"> Requerido</small>
                                        )}
                                    </label>

                                    <MultiSelect
                                        value={form.roedores_indicadores}
                                        options={ROEDORES_MS_OPTIONS}
                                        onChange={(e) => onChange("roedores_indicadores", e.value)}
                                        placeholder="Seleccione indicadores"
                                        display="chip"
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* Bloque HORMIGAS */}
                            <div className="field col-12">
                                <div className="plaga-box">
                                    <div className="subarea-title">Hormigas</div>

                                    <div className="grid">
                                        <div className="col-12 md:col-6">
                                            <label className="font-bold">
                                                Evidencia de Hormigas*
                                                {submitted && form.plaga_hormigas === null && (
                                                    <small className="p-error"> Requerido</small>
                                                )}
                                            </label>
                                            <Dropdown
                                                value={form.plaga_hormigas}
                                                options={opcionesSiNo}
                                                onChange={(e) => onChange("plaga_hormigas", e.value)}
                                                placeholder="Seleccione"
                                            />
                                        </div>

                                        {form.plaga_hormigas === true && (
                                            <div className="col-12 md:col-6">
                                                <label className="font-bold">
                                                    Indicador de hormigas*
                                                    {submitted && !form.hormigas_indicador && (
                                                        <small className="p-error"> Requerido</small>
                                                    )}
                                                </label>
                                                <Dropdown
                                                    value={form.hormigas_indicador}
                                                    options={HORMIGAS_OPTIONS}
                                                    onChange={(e) => onChange("hormigas_indicador", e.value)}
                                                    placeholder="Seleccione indicador"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}


                    {/* Observación opcional */}
                    <div className="field col-12">
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="chkObs"
                                checked={form.tiene_observacion}
                                onChange={(e) => onChange("tiene_observacion", e.checked)}
                            />
                            <label htmlFor="chkObs" className="font-bold" style={{ cursor: "pointer" }}>
                                Agregar observación (daños/reemplazo/ausencia/presencia de insectos)
                            </label>
                        </div>
                        {form.tiene_observacion && (
                            <>
                                <InputText
                                    className="mt-2"
                                    value={form.observaciones}
                                    onChange={(e) => onChange("observaciones", e.target.value)}
                                    placeholder="Detalle la observación"
                                />
                                {submitted && !form.observaciones.trim() && <small className="p-error"> Campo requerido</small>}
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
