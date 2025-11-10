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

/* ---------- helpers fecha (seguros en zona horaria) ---------- */
// Parse seguro para strings "YYYY-MM-DD" sin convertir a UTC
const parseYMD = (isoDateStr) => {
    if (!isoDateStr) return null;
    const [y, m, d] = isoDateStr.split("-").map(Number);
    if (!y || !m || !d) return null;
    // Date local en medianoche local => sin desfases
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const toDateISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const toHM = (d = new Date()) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

// Formatea campos DATE (YYYY-MM-DD)
const fmtDMY = (iso) => {
    if (!iso) return "—";
    const d = parseYMD(iso);
    if (!d) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

// Para timestamps (created_at) sí usamos Date normal
const fmtDMYHM = (isoOrDate) => {
    if (!isoOrDate) return "—";
    const d = new Date(isoOrDate);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

// Sumar días a una fecha DATE (YYYY-MM-DD) sin UTC
const addDays = (iso, days) => {
    const d = parseYMD(iso) ?? new Date();
    d.setDate(d.getDate() + days);
    return toDateISO(d);
};

// Sumar meses a una fecha DATE (YYYY-MM-DD) sin UTC
const addMonths = (iso, months) => {
    const d = parseYMD(iso) ?? new Date();
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);

    // Ajuste de fin de mes (p.ej., sumar 1 mes a 31/01 -> 29/02 o 28/02)
    while (d.getDate() < day) {
        d.setDate(d.getDate() - 1);
    }
    return toDateISO(d);
};

const POSICION_ID = "IN3";
const EQUIPO = "Cuartos Eléctricos";
const PERIODICIDAD = "MENSUAL";

const YESNO = [{ label: "Sí", value: "SI" }, { label: "No", value: "NO" }];

// Lista ampliada
const QUESTIONS = [
    { key: "q1", label: "480V: Verificar el estado del tablero, puertas y rotulación." },
    { key: "q2", label: "480V: Medición de temperatura a cada breaker o circuito" },
    { key: "q3", label: "480V: Verificar sujeción de cables eléctricos" },
    { key: "q4", label: "480V: Verificar inexistencia de plagas en el tablero" },
    { key: "q5", label: "208V: Verificar el estado del tablero, puertas y rotulación." },
    { key: "q6", label: "208V: Medición de temperatura a cada breaker o circuito" },
    { key: "q7", label: "208V: Verificar sujeción de cables eléctricos" },
    { key: "q8", label: "208V: Verificar inexistencia de plagas en el tablero" },
    { key: "q9", label: "Transformador seco: Verifique estado de la estructura, ruidos o calentamiento." },
    { key: "q10", label: "Cuarto: Limpieza general del área" },
    { key: "q11", label: "Cuarto: Verificar funcionamiento de la iluminación; reparar si es necesario" },
];

const emptyForm = () => ({
    fecha_registro: toDateISO(),
    hora_registro: toHM(),
    posicion_id: POSICION_ID,
    equipo: EQUIPO,
    registro: "",
    cantidad: "",
    tecnico: "",
    ejecutado: "",
    observaciones: "",
    items: QUESTIONS.reduce((a, q) => ({ ...a, [q.key]: { respuesta: "" } }), {}),
    fecha_correccion_preview: fmtDMYHM(new Date()),
});

const packRow = (r) => ({ ...r, tecnico: r.tecnico ?? "", observaciones: r.observaciones ?? "" });

export default function CuartosElectricos() {
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
    const { canReview, username } = useCanReview();

    const showToast = (sev, sum, det, life = 3000) =>
        toast.current?.show({ severity: sev, summary: sum, detail: det, life });

    const fetchRows = async () => {
        try {
            setLoading(true);
            let q = supabase.from("mto_cuartos_electricos").select(`
        id, created_at,
        fecha_registro, hora_registro,
        posicion_id, equipo, registro, cantidad, tecnico,
        ejecutado, observaciones,
        respuesta_q1, respuesta_q2, respuesta_q3, respuesta_q4,
        respuesta_q5, respuesta_q6, respuesta_q7, respuesta_q8,
        respuesta_q9, respuesta_q10, respuesta_q11,
        periodicidad, ultimo_mantenimiento, proximo_mantenimiento,
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
            console.error(e); showToast("error", "Error", "No se pudieron cargar registros");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchRows(); }, [filtroRevisado]);

    const openNew = () => { setForm(emptyForm()); setSubmitted(false); setDialogOpen(true); };
    const hideDialog = () => { setDialogOpen(false); setSubmitted(false); };
    const onChange = (field, val) => setForm(p => ({ ...p, [field]: val }));
    const onYesNoChange = (key, val) => setForm(p => ({ ...p, items: { ...p.items, [key]: { respuesta: val } } }));

    const validate = () => {
        const errs = [];
        if (!form.tecnico?.trim()) errs.push("El campo Técnico es requerido.");
        if (!form.ejecutado) errs.push("Indique si se va a efectuar el mantenimiento.");
        if (form.ejecutado === "NO" && !form.observaciones.trim()) errs.push("Explique por qué NO se efectuó (Observaciones).");
        if (form.ejecutado === "SI") { QUESTIONS.forEach(q => { if (!form.items[q.key]?.respuesta) errs.push(`Responda: ${q.label}`); }); }
        return errs;
    };

    const save = async () => {
        setSubmitted(true);
        const errs = validate(); if (errs.length) { showToast("warn", "Validación", errs[0]); return; }
        try {
            const baseDate = form.fecha_registro || toDateISO();
            const proximo_mantenimiento = form.ejecutado === "NO" ? addDays(baseDate, 7) : addMonths(baseDate, 1);

            const payload = {
                fecha_registro: form.fecha_registro, // YYYY-MM-DD
                hora_registro: form.hora_registro,   // HH:mm
                posicion_id: POSICION_ID,
                equipo: EQUIPO,
                registro: null,
                cantidad: form.cantidad ? Number(String(form.cantidad).replace(/\D/g, "")) : null,
                tecnico: form.tecnico,
                ejecutado: form.ejecutado,
                observaciones: form.observaciones || null,

                respuesta_q1: form.ejecutado === "SI" ? form.items.q1?.respuesta || null : null,
                respuesta_q2: form.ejecutado === "SI" ? form.items.q2?.respuesta || null : null,
                respuesta_q3: form.ejecutado === "SI" ? form.items.q3?.respuesta || null : null,
                respuesta_q4: form.ejecutado === "SI" ? form.items.q4?.respuesta || null : null,
                respuesta_q5: form.ejecutado === "SI" ? form.items.q5?.respuesta || null : null,
                respuesta_q6: form.ejecutado === "SI" ? form.items.q6?.respuesta || null : null,
                respuesta_q7: form.ejecutado === "SI" ? form.items.q7?.respuesta || null : null,
                respuesta_q8: form.ejecutado === "SI" ? form.items.q8?.respuesta || null : null,
                respuesta_q9: form.ejecutado === "SI" ? form.items.q9?.respuesta || null : null,
                respuesta_q10: form.ejecutado === "SI" ? form.items.q10?.respuesta || null : null,
                respuesta_q11: form.ejecutado === "SI" ? form.items.q11?.respuesta || null : null,

                periodicidad: PERIODICIDAD,
                ultimo_mantenimiento: form.ejecutado === "SI" ? baseDate : null, // YYYY-MM-DD sin desfase
                proximo_mantenimiento, // YYYY-MM-DD sin desfase
            };

            const { error } = await supabase.from("mto_cuartos_electricos").insert([payload]);
            if (error) throw error;

            showToast("success", "Éxito", "Registro guardado");
            setDialogOpen(false);
            await fetchRows();
        } catch (e) {
            console.error(e); showToast("error", "Error", e.message || "No se pudo guardar");
        }
    };

    const countSiNo = (row, val) =>
        Array.from({ length: 11 }).reduce((acc, _, i) => acc + (((row[`respuesta_q${i + 1}`] || "") === val) ? 1 : 0), 0);

    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;
        const onToggle = async (next) => {
            const { error } = await supabase.from("mto_cuartos_electricos").update({
                revisado: next,
                revisado_por_username: next ? username : null,
                revisado_fecha: next ? new Date().toISOString() : null,
            }).eq("id", row.id);
            if (error) { showToast("error", "No se guardó", error.message); return; }
            setRows(prev => prev.map(r => r.id === row.id ? { ...r, revisado: next, revisado_por_username: next ? username : null, revisado_fecha: next ? new Date().toISOString() : null } : r));
            showToast("success", "OK", next ? "Marcado revisado" : "Marcado no revisado");
        };
        return (
            <div className="flex align-items-center justify-content-center gap-2">
                <Checkbox inputId={`chk-rev-${row.id}`} checked={!!row.revisado} onChange={(e) => onToggle(e.checked)} />
                <label htmlFor={`chk-rev-${row.id}`} className="text-sm">Revisado</label>
            </div>
        );
    };

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText type="search" value={globalFilter} onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Buscar (ej. IN3, técnico, notas)" />
            </span>
        </div>
    );

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Mantenimiento – Cuartos Eléctricos
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición (ID):</b> {POSICION_ID} &nbsp; | &nbsp; <b>Equipo:</b> {EQUIPO} &nbsp; | &nbsp;
                    <b>Periodicidad:</b> {PERIODICIDAD}
                </p>
            </div>

            <div className="buttons-container">
                <button onClick={() => navigate(-1)} className="return-button">Volver</button>
                <button onClick={() => navigate(-2)} className="menu-button">Menú principal</button>
            </div>

            <Toolbar
                className="mb-4"
                left={() => <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={openNew} />}
                right={() => {
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
                            "#SI": countSiNo(r, "SI"), "#NO": countSiNo(r, "NO"),
                            revisado: r.revisado ? "Sí" : "No",
                            creado: fmtDMYHM(r.created_at),
                        }));
                        const ws = XLSX.utils.json_to_sheet(out);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Cuartos Electricos");
                        XLSX.writeFile(wb, `Cuartos_Electricos_${new Date().toISOString().slice(0, 10)}.xlsx`);
                    };
                    return (<Button label="Exportar a Excel" icon="pi pi-upload" className="p-button-help" onClick={exportXlsx} />);
                }}
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
                header="Nuevo registro – Cuartos Eléctricos"
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
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">Fecha intervención</label>
                        <InputText type="date" value={form.fecha_registro} onChange={(e) => onChange("fecha_registro", e.target.value)} />
                    </div>
                    <div className="field col-12 md:col-3">
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

                    {/* ¿Se ejecuta? */}
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">¿Se va a efectuar el mantenimiento?* {submitted && !form.ejecutado && <small className="p-error"> Requerido</small>}</label>
                        <Dropdown value={form.ejecutado} options={YESNO} onChange={(e) => onChange("ejecutado", e.value)} placeholder="Seleccione" />
                    </div>

                    {form.ejecutado === "NO" && (
                        <div className="field col-12">
                            <label className="font-bold">Observaciones (obligatorio si NO) {submitted && !form.observaciones.trim() && <small className="p-error"> Requerido</small>}</label>
                            <InputText value={form.observaciones} onChange={(e) => onChange("observaciones", e.target.value)} placeholder="Explique el motivo" />
                            <small className="block mt-2">Se reprogramará automáticamente para dentro de <b>7 días</b>.</small>
                        </div>
                    )}

                    {form.ejecutado === "SI" && (
                        <div className="field col-12">
                            <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 12 }}>
                                <div style={{ fontWeight: 700, marginBottom: 8 }}>CUARTO ELÉCTRICO – Lista de verificación</div>
                                <div className="grid">
                                    {QUESTIONS.map(q => {
                                        const val = form.items[q.key]?.respuesta || "";
                                        return (
                                            <div key={q.key} className="col-12 md:col-6">
                                                <label className="font-bold">{q.label}* {submitted && !val && <small className="p-error"> Requerido</small>}</label>
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
