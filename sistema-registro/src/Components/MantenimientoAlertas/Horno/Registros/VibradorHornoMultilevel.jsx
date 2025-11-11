// src/Components/MantenimientoAlertas/Horno/Registros/VibradorHornoMultilevel.jsx
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

/* ===== Helpers de fecha (idénticos al resto) ===== */
// Construye Date local a partir de YYYY-MM-DD (evita desfases por zona horaria)
const parseYMD = (isoDateStr) => {
    if (!isoDateStr) return null;
    const [y, m, d] = String(isoDateStr).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};

// DD/MM/AAAA
const fmtDMY = (iso) => {
    const d = parseYMD(iso);
    if (!d) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
};

// DD/MM/AAAA HH:mm
const fmtDMYHM = (isoOrDate) => {
    if (!isoOrDate) return "—";
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

// YYYY-MM-DD y HH:mm
const toDateISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toHM = (d = new Date()) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

// Sumas seguras sin TZ shift (operan sobre YYYY-MM-DD)
const addDays = (ymd, days) => {
    const base = parseYMD(ymd);
    base.setDate(base.getDate() + Number(days || 0));
    return toDateISO(base);
};
const addMonths = (ymd, months) => {
    const base = parseYMD(ymd);
    base.setMonth(base.getMonth() + Number(months || 0));
    return toDateISO(base);
};

/* ===== Constantes del registro ===== */
const POSICION_ID = "H-HM-V"; // Horno Multilevel — Vibrador
const EQUIPO = "HORNO MULTILEVEL";
const REGISTRO = "VIBRADOR";
const TABLE = "mto_horno_multilevel_vibrador";

const YESNO = [{ label: "Sí", value: "SI" }, { label: "No", value: "NO" }];
const PERIODOS = [{ label: "Mensual", value: "MENSUAL" }];

/* ===== Checklist mensual (texto literal de la OM) ===== */
// Sistema eléctrico (3)
const Q_MENSUAL = [
    { key: "q1", label: "Revisar conexiones eléctricas, terminales, cables y tierra física." },
    { key: "q2", label: "Verificar amperaje y voltaje del electroimán (comparar con especificación de placa)." },
    { key: "q3", label: "Comprobar la integridad del control electrónico (si aplica)." },

    // Electroimán y armadura (3)
    { key: "q4", label: "Inspeccionar bobinas por calentamiento excesivo, desgaste o daño de aislamiento." },
    { key: "q5", label: "Revisar que el armadura móvil no presente suciedad, óxido o desgaste." },
    { key: "q6", label: "Medir resistencia eléctrica de las bobinas (comparar con manual del fabricante)." },

    // Resortes / láminas (2)
    { key: "q7", label: "Revisar desgaste, corrosión y pérdida de elasticidad." },
    { key: "q8", label: "Cambiar si presentan fisuras o fatiga." },

    // Estructura y alineación (2)
    { key: "q9", label: "Asegurar que la bandeja esté nivelada y centrada." },
    { key: "q10", label: "Verificar que la base no presente desajustes." },
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
    periodicidad: "MENSUAL", // fija
    items: Q_MENSUAL.reduce((acc, q) => ({ ...acc, [q.key]: { respuesta: "" } }), {}),
    fecha_correccion_preview: fmtDMYHM(new Date()),
});

const packRow = (r) => ({ ...r, tecnico: r.tecnico ?? "", observaciones: r.observaciones ?? "" });

export default function VibradorHornoMultilevel() {
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

    /* ----------- carga ----------- */
    const fetchRows = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from(TABLE)
                .select(`
          id, created_at,
          fecha_registro, hora_registro,
          posicion_id, equipo, registro, cantidad, tecnico,
          ejecutado, observaciones, periodicidad,
          ${Array.from({ length: 14 }, (_, i) => `respuesta_q${i + 1}`).join(", ")},
          ultimo_mantenimiento, proximo_mantenimiento,
          revisado, revisado_por_username, revisado_fecha
        `)
                .order("fecha_registro", { ascending: false })
                .order("created_at", { ascending: false });

            if (error) throw error;

            let filtered = data || [];
            if (filtroRevisado === "checked") filtered = filtered.filter((r) => r.revisado);
            if (filtroRevisado === "unchecked") filtered = filtered.filter((r) => !r.revisado);

            setRows(filtered.map(packRow));
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

    /* ----------- validación ----------- */
    const validate = () => {
        const errs = [];
        if (!form.tecnico?.trim()) errs.push("El campo Técnico es requerido.");
        if (!form.ejecutado) errs.push("Indique si se va a efectuar el mantenimiento.");
        if (form.ejecutado === "NO" && !form.observaciones.trim()) errs.push("Explique por qué NO se efectuó (Observaciones).");
        if (form.ejecutado === "SI") {
            Q_MENSUAL.forEach(q => { if (!form.items[q.key]?.respuesta) errs.push(`Responda: ${q.label}`); });
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
                    : addMonths(baseDate, 1); // MENSUAL

            // Mapear solo q1..q10 y pad hasta q14 en null para consistencia
            const answers = Object.fromEntries(
                Q_MENSUAL.map((q, idx) => [
                    `respuesta_q${idx + 1}`,
                    form.ejecutado === "SI" ? (form.items[q.key]?.respuesta || null) : null
                ])
            );
            const padding = Object.fromEntries(
                Array.from({ length: 14 - Q_MENSUAL.length }, (_, i) => [
                    `respuesta_q${Q_MENSUAL.length + i + 1}`, null
                ])
            );

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
                periodicidad: "MENSUAL",
                ...answers,
                ...padding,
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
                <InputText
                    type="search"
                    value={globalFilter}
                    onInput={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar (ej. H-HM-V, técnico, notas)"
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

    const countSiNo = (row, val) =>
        Array.from({ length: Q_MENSUAL.length }, (_, i) => i + 1)
            .reduce((acc, i) => acc + (((row[`respuesta_q${i}`] || "") === val) ? 1 : 0), 0);

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
            "#SI": countSiNo(r, "SI"),
            "#NO": countSiNo(r, "NO"),
            revisado: r.revisado ? "Sí" : "No",
            creado: fmtDMYHM(r.created_at),
        }));
        const ws = XLSX.utils.json_to_sheet(out);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vibrador Horno ML");
        XLSX.writeFile(wb, `Horno_VibradorMultilevel_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1 className="flex align-items-center gap-2">
                <img src={logo2} alt="mosca" className="logo2" />
                Registro — Vibrador (Horno Multilevel)
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
                header="Nuevo registro — Vibrador (Horno Multilevel)"
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
                    {/* Periodicidad fija MENSUAL (se muestra como lectura) */}
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Periodicidad</label>
                        <InputText value="MENSUAL" disabled />
                        <small className="block mt-2">El próximo mantenimiento se programa a <b>1 mes</b> si se ejecuta.</small>
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

                    {form.ejecutado === "SI" && (
                        <div className="field col-12">
                            <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 12 }}>
                                <div style={{ fontWeight: 700, marginBottom: 8 }}>Checklist — MENSUAL</div>
                                <div className="grid">
                                    {Q_MENSUAL.map(q => {
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
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
