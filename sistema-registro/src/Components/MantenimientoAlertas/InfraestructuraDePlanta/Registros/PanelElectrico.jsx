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

/* ===================== Helpers de fecha (seguros) ===================== */
// Construye Date local sin cambiar de día por zona horaria
const parseYMD = (isoDateStr) => {
    if (!isoDateStr) return null;
    const [y, m, d] = isoDateStr.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const toDateISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toHM = (d = new Date()) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

// Para columnas DATE (YYYY-MM-DD)
const fmtDMY = (iso) => {
    if (!iso) return "—";
    const d = parseYMD(iso);
    if (!d) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
};

// Para timestamps (created_at)
const fmtDMYHM = (isoOrDate) => {
    if (!isoOrDate) return "—";
    const d = new Date(isoOrDate);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

const addDays = (iso, days) => {
    const d = parseYMD(iso) ?? new Date();
    d.setDate(d.getDate() + days);
    return toDateISO(d);
};
const addMonths = (iso, months) => {
    const d = parseYMD(iso) ?? new Date();
    const origDay = d.getDate();
    d.setMonth(d.getMonth() + months);
    while (d.getDate() < origDay) d.setDate(d.getDate() - 1); // ajusta fin de mes
    return toDateISO(d);
};

/* ===================== Constantes ===================== */
const POSICION_ID = "IN1";
const EQUIPO = "Paneles Eléctricos";
const PERIODICIDAD = "MENSUAL";

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];

const QUESTIONS = [
    { key: "q1", label: "Botoneras y selectores: revisar funcionamiento" },
    { key: "q2", label: "Luces: revisar indicadores/luminarias, cambiar si es necesario" },
    { key: "q3", label: "Cables: revisar estado del cableado y realizar su acomodo" },
    { key: "q4", label: "Puertas/llavines: verificar funcionamiento, reparar si es necesario" },
    { key: "q5", label: "Panel interior/exterior: limpieza de polvo y suciedad" },
    { key: "q6", label: "Dispositivos eléctricos: verificar sujeción de bornes/contacto" },
    { key: "q7", label: "Bornero: fijación de cables, síntomas de calentamiento" },
    { key: "q8", label: "Tornillería/etiquetado general en orden" },
];

/* ===================== Estado inicial ===================== */
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

const packRow = (r) => ({
    ...r,
    tecnico: r.tecnico ?? "",
    observaciones: r.observaciones ?? "",
});

/* ===================== Componente ===================== */
export default function PanelElectrico() {
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

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    /* --------------------- Carga --------------------- */
    const fetchRows = async () => {
        try {
            setLoading(true);
            let q = supabase
                .from("mto_paneles_electrico")
                .select(`
          id, created_at,
          fecha_registro, hora_registro,
          posicion_id, equipo, registro, cantidad, tecnico,
          ejecutado, observaciones,
          respuesta_q1, respuesta_q2, respuesta_q3, respuesta_q4,
          respuesta_q5, respuesta_q6, respuesta_q7, respuesta_q8,
          periodicidad, ultimo_mantenimiento, proximo_mantenimiento,
          semana_proximo, anio_proximo,
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

    const onChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));
    const onYesNoChange = (key, value) =>
        setForm((p) => ({ ...p, items: { ...p.items, [key]: { respuesta: value } } }));

    /* --------------------- Validación --------------------- */
    const validate = () => {
        const errs = [];
        if (!form.tecnico?.trim()) errs.push("El campo Técnico es requerido.");
        if (!form.ejecutado) errs.push("Indique si se va a efectuar el mantenimiento.");
        if (form.ejecutado === "NO" && !form.observaciones.trim())
            errs.push("Explique por qué NO se efectuó (Observaciones).");
        if (form.ejecutado === "SI") {
            QUESTIONS.forEach((q) => {
                if (!form.items[q.key]?.respuesta) errs.push(`Responda: ${q.label}`);
            });
        }
        return errs;
    };

    /* --------------------- Guardado --------------------- */
    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) { showToast("warn", "Validación", errs[0]); return; }

        try {
            const baseDate = form.fecha_registro || toDateISO();
            const proximo_mantenimiento =
                form.ejecutado === "NO" ? addDays(baseDate, 7) : addMonths(baseDate, 1);

            const payload = {
                fecha_registro: form.fecha_registro, // YYYY-MM-DD (local)
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

                periodicidad: PERIODICIDAD,
                ultimo_mantenimiento: form.ejecutado === "SI" ? baseDate : null,
                proximo_mantenimiento,
            };

            const { error } = await supabase.from("mto_paneles_electrico").insert([payload]);
            if (error) throw error;

            showToast("success", "Éxito", "Registro guardado");
            setDialogOpen(false);
            await fetchRows();
        } catch (e) {
            console.error(e);
            showToast("error", "Error", e.message || "No se pudo guardar");
        }
    };

    const countSiNo = (row, val) =>
        [1, 2, 3, 4, 5, 6, 7, 8].reduce(
            (acc, i) => acc + ((row[`respuesta_q${i}`] || "") === val ? 1 : 0),
            0
        );

    /* --------------------- Columna Revisado --------------------- */
    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;
        const onToggle = async (next) => {
            const { error } = await supabase
                .from("mto_paneles_electrico")
                .update({
                    revisado: next,
                    revisado_por_username: next ? username : null,
                    revisado_fecha: next ? new Date().toISOString() : null,
                })
                .eq("id", row.id);
            if (error) { showToast("error", "No se guardó", error.message); return; }
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
                <Checkbox
                    inputId={`chk-rev-${row.id}`}
                    checked={!!row.revisado}
                    onChange={(e) => onToggle(e.checked)}
                />
                <label htmlFor={`chk-rev-${row.id}`} className="text-sm">Revisado</label>
            </div>
        );
    };

    /* --------------------- Header tabla --------------------- */
    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    type="search"
                    value={globalFilter}
                    onInput={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar (ej. IN1, técnico, notas)"
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

    const semanaBody = (r) =>
        r.proximo_mantenimiento ? `${r.semana_proximo} año ${r.anio_proximo}` : "—";

    /* --------------------- Exportación Excel --------------------- */
    const exportXlsx = () => {
        if (!rows?.length) { showToast("warn", "Exportación", "No hay datos"); return; }
        const out = rows.map((r) => ({
            posicion: r.posicion_id,
            equipo: r.equipo,
            registro: r.registro ?? "",
            periodicidad: r.periodicidad ?? "",
            ultimo_mantenimiento: fmtDMY(r.ultimo_mantenimiento),
            proximo_mantenimiento: fmtDMY(r.proximo_mantenimiento),
            semana: semanaBody(r),
            tecnico: r.tecnico ?? "",
            fecha_intervencion: fmtDMY(r.fecha_registro),
            hora_intervencion: r.hora_registro || "",
            "#SI": countSiNo(r, "SI"),
            "#NO": countSiNo(r, "NO"),
            revisado: r.revisado ? "Sí" : "No",
            creado: fmtDMYHM(r.created_at),
        }));
        const ws = XLSX.utils.json_to_sheet(out);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Paneles Eléctricos");
        XLSX.writeFile(wb, `Paneles_Electricos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    /* --------------------- Render --------------------- */
    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Mantenimiento – Paneles Eléctricos
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
                left={() => (<Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={openNew} />)}
                right={() => (<Button label="Exportar a Excel" icon="pi pi-upload" className="p-button-help" onClick={exportXlsx} />)}
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
                dataKey="id"
                showGridlines
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
                <Column header="Semana" body={semanaBody} />
                <Column field="tecnico" header="Técnico" sortable />
                <Column field="created_at" header="Fecha de Registro" body={(r) => fmtDMYHM(r.created_at)} sortable />
                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
            </DataTable>

            <Dialog
                visible={dialogOpen}
                style={{ width: "72vw", maxWidth: 1100 }}
                header="Nuevo registro – Paneles Eléctricos"
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
                    {/* Intervención */}
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
                        <label className="font-bold">
                            Técnico* {submitted && !form.tecnico && (<small className="p-error"> Requerido</small>)}
                        </label>
                        <InputText value={form.tecnico} onChange={(e) => onChange("tecnico", e.target.value)} placeholder="Nombre del técnico" />
                    </div>
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Cantidad (referencia)</label>
                        <InputText value={form.cantidad} onChange={(e) => onChange("cantidad", e.target.value ? e.target.value.replace(/\D/g, "") : "")} placeholder="Ej. 2" />
                    </div>

                    {/* ¿Se ejecuta? */}
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            ¿Se va a efectuar el mantenimiento?* {submitted && !form.ejecutado && (<small className="p-error"> Requerido</small>)}
                        </label>
                        <Dropdown value={form.ejecutado} options={YESNO} onChange={(e) => onChange("ejecutado", e.value)} placeholder="Seleccione" />
                    </div>

                    {form.ejecutado === "NO" && (
                        <div className="field col-12">
                            <label className="font-bold">
                                Observaciones (obligatorio si NO) {submitted && !form.observaciones.trim() && (<small className="p-error"> Requerido</small>)}
                            </label>
                            <InputText value={form.observaciones} onChange={(e) => onChange("observaciones", e.target.value)} placeholder="Explique el motivo" />
                            <small className="block mt-2">Se reprogramará automáticamente para dentro de <b>7 días</b>.</small>
                        </div>
                    )}

                    {form.ejecutado === "SI" && (
                        <div className="field col-12">
                            <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 12 }}>
                                <div style={{ fontWeight: 700, marginBottom: 8 }}>PANEL – Lista de verificación</div>
                                <div className="grid">
                                    {QUESTIONS.map((q) => {
                                        const val = form.items[q.key]?.respuesta || "";
                                        return (
                                            <div key={q.key} className="col-12 md:col-6">
                                                <label className="font-bold">
                                                    {q.label}* {submitted && !val && (<small className="p-error"> Requerido</small>)}
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
