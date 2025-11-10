// src/Components/MantenimientoAlertas/Horno/Registros/MotorReductor.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../../supabaseClient.js";
import logo2 from "../../../../assets/mosca.png";

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
import useCanReview from "../../../Inocuidad/Registros/Hooks/useCanReview.js";

/* ===== Helpers de fecha (sin desfases de TZ) ===== */
const parseYMD = (isoDateStr) => {
    if (!isoDateStr) return null;
    const [y, m, d] = String(isoDateStr).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const toDateISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toHM = (d = new Date()) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const addDays = (ymd, days) => { const base = parseYMD(ymd); base.setDate(base.getDate() + Number(days || 0)); return toDateISO(base); };
const addMonths = (ymd, months) => { const base = parseYMD(ymd); base.setMonth(base.getMonth() + Number(months || 0)); return toDateISO(base); };

const fmtDMY = (iso) => {
    const d = parseYMD(iso); if (!d) return "—";
    const dd = String(d.getDate()).padStart(2, "0"); const mm = String(d.getMonth() + 1).padStart(2, "0"); const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
};
const fmtDMYHM = (isoOrDate) => {
    if (!isoOrDate) return "—";
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    const dd = String(d.getDate()).padStart(2, "0"); const mm = String(d.getMonth() + 1).padStart(2, "0"); const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0"); const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

/* ===== Constantes del registro ===== */
const POSICION_ID = "H-EL-MR";
const EQUIPO = "EMPACADORA DE LARVA";
const REGISTRO = "MOTOR REDUCTOR";
const TABLE = "mto_horno_empacadora_motor_reductor";

const YESNO = [{ label: "Sí", value: "SI" }, { label: "No", value: "NO" }];
const PERIODOS = [
    { label: "Trimestral", value: "TRIMESTRAL" },
    { label: "Anual", value: "ANUAL" },
];

/* ===== Checklists (texto EXACTO de las OMs) ===== */
/* TRIMESTRAL */
const Q_TRIMESTRAL = [
    { key: "q1", label: "Revisar y verificar estado general del motor, limpieza" },
    { key: "q2", label: "Revisar y verificar estado general del motor, pintura" },
    { key: "q3", label: "Revisar estado del cable de alimentación, conector o manguito" },
    { key: "q4", label: "Abrir caja de coneciones y verificar estado y apriete de los bornes de conecion" },
    { key: "q5", label: "Verificar presencia de agua en la caja de coneción, si lo hay utilice desplazador de humedad" },
    { key: "q6", label: "Realizar medición de aislamiento al bobinado, Reporte" },
    { key: "q7", label: "Tomar lecturas de amperaje y comparar con los datos de placa, Reporte" },
    { key: "q8", label: "Revisar temperatura del motor, Reporte" },
    { key: "q9", label: "Revisar que no halla presencia de vibraciones o ruidos extraños" },
    { key: "q10", label: "Verificar que el cobertor del motor y abanico se encuentre en su lugar, Reporte" },
    { key: "q11", label: "Revisar estado y nivel del aceite" },
    { key: "q12", label: "Verificar que no existan fugas" },
    { key: "q13", label: "Lubricar" },
];

/* ANUAL */
const Q_ANUAL = [
    { key: "q1", label: "Desarme el motor, no dañe el bobinado" },
    { key: "q2", label: "Lavar, secar y barnizar el bobinado" },
    { key: "q3", label: "Cambiar los rodamientos del rotor" },
    { key: "q4", label: "Realizar medición de aislamiento al bobinado" },
    { key: "q5", label: "Armar el motor" },
    { key: "q6", label: "Pinte si se requiere" },
    { key: "q7", label: "Desarme el reductor y realice lavado" },
    { key: "q8", label: "Cambie todos los rodamientos" },
    { key: "q9", label: "Cambie los retenedores" },
    { key: "q10", label: "Cambie el oring" },
    { key: "q11", label: "Armar el reductor con cuidado de no dañar los retenedores y los roles" },
    { key: "q12", label: "Pinte si es necesario" },
    { key: "q13", label: "Rellene con aceite nuevo" },
];

const emptyForm = () => ({
    fecha_registro: toDateISO(),
    hora_registro: toHM(),
    posicion_id: POSICION_ID,
    equipo: EQUIPO,
    registro: REGISTRO,
    cantidad: "",
    tecnico: "",
    ejecutado: "",
    observaciones: "",
    periodicidad: "",
    items: {},
    fecha_correccion_preview: fmtDMYHM(new Date()),
});

const packRow = (r) => ({ ...r, tecnico: r.tecnico ?? "", observaciones: r.observaciones ?? "" });

export default function MotorReductor() {
    const navigate = useNavigate();
    const toast = useRef(null);

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    const [filtroRevisado, setFiltroRevisado] = useState("all");
    // 👇 SOLO UNA VEZ
    const { canReview, username } = useCanReview();

    const showToast = (sev, sum, det, life = 3000) =>
        toast.current?.show({ severity: sev, summary: sum, detail: det, life });

    /* ----------- carga ----------- */
    const fetchRows = async () => {
        try {
            setLoading(true);
            let q = supabase
                .from(TABLE)
                .select(`
          id, created_at,
          fecha_registro, hora_registro,
          posicion_id, equipo, registro, cantidad, tecnico,
          ejecutado, observaciones, periodicidad,
          respuesta_q1, respuesta_q2, respuesta_q3, respuesta_q4, respuesta_q5, respuesta_q6,
          respuesta_q7, respuesta_q8, respuesta_q9, respuesta_q10, respuesta_q11, respuesta_q12, respuesta_q13,
          ultimo_mantenimiento, proximo_mantenimiento,
          revisado, revisado_por_username, revisado_fecha
        `)
                .order("fecha_registro", { ascending: false })
                .order("created_at", { ascending: false });

            if (filtroRevisado === "checked") q = q.eq("revisado", true);
            if (filtroRevisado === "unchecked") q = q.eq("revisado", false);

            const { data, error } = await q;
            if (error) throw error;
            setRows((data || []).map(packRow));
        } catch (e) {
            console.error(e);
            showToast("error", "Error", "No se pudieron cargar registros");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [filtroRevisado]);

    const openNew = () => { setForm(emptyForm()); setSubmitted(false); setDialogOpen(true); };
    const hideDialog = () => { setDialogOpen(false); setSubmitted(false); };

    const onChange = (field, value) => setForm(p => ({ ...p, [field]: value }));

    const onPeriodoChange = (value) => {
        const base = value === "TRIMESTRAL" ? Q_TRIMESTRAL : Q_ANUAL;
        const items = base.reduce((acc, q) => ({ ...acc, [q.key]: { respuesta: "" } }), {});
        setForm(p => ({ ...p, periodicidad: value, items }));
    };

    const onYesNoChange = (key, value) =>
        setForm(p => ({ ...p, items: { ...p.items, [key]: { respuesta: value } } }));

    /* ----------- validación ----------- */
    const validate = () => {
        const errs = [];
        if (!form.periodicidad) errs.push("Seleccione la periodicidad (Trimestral o Anual).");
        if (!form.tecnico?.trim()) errs.push("El campo Técnico es requerido.");
        if (!form.ejecutado) errs.push("Indique si se va a efectuar el mantenimiento.");
        if (form.ejecutado === "NO" && !form.observaciones.trim()) errs.push("Explique por qué NO se efectuó (Observaciones).");
        if (form.ejecutado === "SI") {
            const list = form.periodicidad === "TRIMESTRAL" ? Q_TRIMESTRAL : Q_ANUAL;
            list.forEach(q => { if (!form.items[q.key]?.respuesta) errs.push(`Responda: ${q.label}`); });
        }
        return errs;
    };

    /* ----------- guardado ----------- */
    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) { showToast("warn", "Validación", errs[0]); return; }

        try {
            const baseDate = form.fecha_registro || toDateISO();
            const proximo =
                form.ejecutado === "NO"
                    ? addDays(baseDate, 7)
                    : (form.periodicidad === "TRIMESTRAL" ? addMonths(baseDate, 3) : addMonths(baseDate, 12));

            const payload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                posicion_id: POSICION_ID,
                equipo: EQUIPO,
                registro: REGISTRO,
                cantidad: form.cantidad ? Number(String(form.cantidad).replace(/\D/g, "")) : null,
                tecnico: form.tecnico,
                ejecutado: form.ejecutado,
                observaciones: form.observaciones || null,
                periodicidad: form.periodicidad,

                // 13 respuestas (si ejecutado = SI)
                ...Object.fromEntries(
                    Array.from({ length: 13 }, (_, i) => {
                        const k = `q${i + 1}`;
                        return [`respuesta_${k}`, form.ejecutado === "SI" ? (form.items[k]?.respuesta || null) : null];
                    })
                ),

                ultimo_mantenimiento: form.ejecutado === "SI" ? baseDate : null,
                proximo_mantenimiento: proximo,
            };

            const { error } = await supabase.from(TABLE).insert([payload]);
            if (error) throw error;

            showToast("success", "Éxito", "Registro guardado");
            setDialogOpen(false);
            await fetchRows();
        } catch (e) {
            console.error(e);
            showToast("error", "Error", e.message || "No se pudo guardar");
        }
    };

    /* ----------- revisado ----------- */
    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;
        const onToggle = async (next) => {
            const { error } = await supabase.from(TABLE).update({
                revisado: next,
                revisado_por_username: next ? username : null,
                revisado_fecha: next ? new Date().toISOString() : null,
            }).eq("id", row.id);
            if (error) { showToast("error", "No se guardó", error.message); return; }
            setRows(prev => prev.map(r => r.id === row.id ? {
                ...r, revisado: next,
                revisado_por_username: next ? username : null,
                revisado_fecha: next ? new Date().toISOString() : null
            } : r));
            showToast("success", "OK", next ? "Marcado revisado" : "Marcado no revisado");
        };
        return (
            <div className="flex align-items-center justify-content-center gap-2">
                <Checkbox checked={!!row.revisado} onChange={(e) => onToggle(e.checked)} />
                <span className="text-sm">Revisado</span>
            </div>
        );
    };

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText type="search" value={globalFilter} onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Buscar (ej. H-EL-MR, técnico, notas)" />
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

    const activeQuestions =
        form.periodicidad === "TRIMESTRAL" ? Q_TRIMESTRAL :
            form.periodicidad === "ANUAL" ? Q_ANUAL : [];

    const countYN = (row, val) =>
        Array.from({ length: 13 }, (_, i) => `respuesta_q${i + 1}`)
            .reduce((acc, k) => acc + ((row[k] || "") === val ? 1 : 0), 0);

    const exportXlsx = () => {
        if (!rows?.length) { showToast("warn", "Exportación", "No hay datos"); return; }
        const out = rows.map(r => ({
            posicion: r.posicion_id,
            equipo: r.equipo,
            registro: r.registro ?? "",
            periodicidad: r.periodicidad ?? "",
            ultimo_mantenimiento: fmtDMY(r.ultimo_mantenimiento),
            proximo_mantenimiento: fmtDMY(r.proximo_mantenimiento),
            tecnico: r.tecnico ?? "",
            fecha_intervencion: fmtDMY(r.fecha_registro),
            hora_intervencion: r.hora_registro || "",
            "#SI": countYN(r, "SI"),
            "#NO": countYN(r, "NO"),
            revisado: r.revisado ? "Sí" : "No",
            creado: fmtDMYHM(r.created_at),
        }));
        const ws = XLSX.utils.json_to_sheet(out);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Motor Reductor");
        XLSX.writeFile(wb, `Horno_MotorReductor_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1 className="flex align-items-center gap-2">
                <img src={logo2} alt="mosca" className="logo2" />
                Registro — Motor Reductor (Empacadora de Larva)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición (ID):</b> {POSICION_ID} &nbsp; | &nbsp; <b>Equipo:</b> {EQUIPO} &nbsp; | &nbsp;
                    <b>Registro:</b> {REGISTRO}
                </p>
            </div>

            <div className="buttons-container">
                <button onClick={() => navigate(-1)} className="return-button">Volver</button>
                <button onClick={() => navigate(-2)} className="menu-button">Menú principal</button>
            </div>

            <Toolbar
                className="mb-4"
                left={() => <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={openNew} />}
                right={() => <Button label="Exportar a Excel" icon="pi pi-upload" className="p-button-help" onClick={exportXlsx} />}
            />

            <DataTable
                value={rows}
                loading={loading}
                selection={selected}
                onSelectionChange={(e) => setSelected(e.value)}
                selectionMode="multiple"
                header={header}
                globalFilter={globalFilter}
                paginator rows={10} rowsPerPageOptions={[5, 10, 25]}
                dataKey="id" showGridlines
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Registros"
            >
                <Column selectionMode="multiple" exportable={false} />
                <Column field="posicion_id" header="Posición" sortable />
                <Column field="equipo" header="Equipo" sortable />
                <Column field="registro" header="Registro" />
                <Column field="periodicidad" header="Periodicidad" />
                <Column header="Último Mto." body={(r) => fmtDMY(r.ultimo_mantenimiento)} sortable />
                <Column header="Próximo Mto." body={(r) => fmtDMY(r.proximo_mantenimiento)} sortable />
                <Column field="tecnico" header="Técnico" sortable />
                <Column header="Fecha de Registro" body={(r) => fmtDMYHM(r.created_at)} sortable />
                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
            </DataTable>

            <Dialog
                visible={dialogOpen}
                style={{ width: "72vw", maxWidth: 1100 }}
                header="Nuevo registro — Motor Reductor"
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
                    {/* Periodicidad */}
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">
                            Periodicidad* {submitted && !form.periodicidad && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown value={form.periodicidad} options={PERIODOS} onChange={(e) => onPeriodoChange(e.value)} placeholder="Seleccione" />
                        <small className="block mt-2">
                            <b>Trimestral</b>: próximo mto en <b>3 meses</b>; <b>Anual</b>: en <b>12 meses</b>. Si NO se ejecuta: <b>+7 días</b>.
                        </small>
                    </div>

                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Fecha intervención</label>
                        <InputText type="date" value={form.fecha_registro} onChange={(e) => onChange("fecha_registro", e.target.value)} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora intervención</label>
                        <InputText type="time" value={form.hora_registro} onChange={(e) => onChange("hora_registro", e.target.value)} />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Posición (ID)</label>
                        <InputText value={form.posicion_id} disabled />
                    </div>
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Equipo</label>
                        <InputText value={form.equipo} disabled />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Técnico* {submitted && !form.tecnico && <small className="p-error"> Requerido</small>}</label>
                        <InputText value={form.tecnico} onChange={(e) => onChange("tecnico", e.target.value)} placeholder="Nombre del técnico" />
                    </div>
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Cantidad (referencia)</label>
                        <InputText value={form.cantidad} onChange={(e) => onChange("cantidad", e.target.value ? e.target.value.replace(/\D/g, "") : "")} placeholder="Ej. 1" />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            ¿Se va a efectuar el mantenimiento?* {submitted && !form.ejecutado && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown value={form.ejecutado} options={YESNO} onChange={(e) => onChange("ejecutado", e.value)} placeholder="Seleccione" />
                    </div>

                    {form.ejecutado === "NO" && (
                        <div className="field col-12">
                            <label className="font-bold">
                                Observaciones (obligatorio si NO) {submitted && !form.observaciones.trim() && <small className="p-error"> Requerido</small>}
                            </label>
                            <InputText value={form.observaciones} onChange={(e) => onChange("observaciones", e.target.value)} placeholder="Explique el motivo" />
                            <small className="block mt-2">Se reprogramará automáticamente para dentro de <b>7 días</b>.</small>
                        </div>
                    )}

                    {form.ejecutado === "SI" && !!activeQuestions.length && (
                        <div className="field col-12">
                            <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 12 }}>
                                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                                    {form.periodicidad === "TRIMESTRAL" ? "Checklist — TRIMESTRAL" : "Checklist — ANUAL"}
                                </div>
                                <div className="grid">
                                    {activeQuestions.map(q => {
                                        const val = form.items[q.key]?.respuesta || "";
                                        return (
                                            <div key={q.key} className="col-12 md:col-6">
                                                <label className="font-bold">
                                                    {q.label}* {submitted && !val && <small className="p-error"> Requerido</small>}
                                                </label>
                                                <Dropdown value={val} options={YESNO} onChange={(e) => onYesNoChange(q.key, e.value)} placeholder="Seleccione" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {form.ejecutado === "SI" && (
                        <div className="field col-12">
                            <label className="font-bold">Observaciones (opcional)</label>
                            <InputText value={form.observaciones} onChange={(e) => onChange("observaciones", e.target.value)} />
                        </div>
                    )}

                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Fecha de Registro (auto)</label>
                        <InputText value={fmtDMYHM(new Date())} disabled />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
