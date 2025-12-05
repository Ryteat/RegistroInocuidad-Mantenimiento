// src/Components/MantenimientoAlertas/Cosecha/Registros/TamizRevisionEstructuraMalla.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

/* ===== Helpers de fecha ===== */
const parseYMD = (s) => {
    if (!s) return null;
    const [y, m, d] = String(s).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const fmtDMY = (iso) => {
    const d = parseYMD(iso);
    if (!d) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
};

const fmtDMYHM = (v) => {
    if (!v) return "—";
    const d = v instanceof Date ? v : new Date(v);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

const toDateISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;

const toHM = (d = new Date()) =>
    d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

const addDays = (ymd, days) => {
    const b = parseYMD(ymd);
    b.setDate(b.getDate() + Number(days || 0));
    return toDateISO(b);
};

/* ===== Constantes de este registro (COS-T-REM-01..06) ===== */
const POSICION_ID_BASE = "COS-T-REM";
const EQUIPO = "TAMIZ";
const REGISTRO = "REVISIÓN DE ESTRUCTURA Y MALLA";
const TABLE = "mto_cosecha_tamiz_revision_estructura_malla";

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];

// Solo tiene periodicidad SEMANAL
const PERIODOS = [{ label: "Semanal", value: "SEMANAL" }];

// Cantidad fija 01..06
const CANTIDAD_OPTIONS = [
    { label: "01", value: "01" },
    { label: "02", value: "02" },
    { label: "03", value: "03" },
    { label: "04", value: "04" },
    { label: "05", value: "05" },
    { label: "06", value: "06" },
];

const Q_SEMANAL = [
    // ESTRUCTURA
    {
        key: "q1",
        label: "Verificar el estado de la estructura, reventaduras o fisuras",
    },
    { key: "q2", label: "Verificar sus anclajes, reporte" },
    // MALLAS
    { key: "q3", label: "Revisar el estado de las mallas, reporte" },
    {
        key: "q4",
        label:
            "Revisar la sujeción de las mallas, que tenga todos los remaches y en buen estado",
    },
    {
        key: "q5",
        label: "Revisar el estado de las hawaianas, cambie si es necesario",
    },
];

const getQuestionsFor = (periodicidad) => {
    if (periodicidad === "SEMANAL") return Q_SEMANAL;
    return [];
};

const emptyForm = () => ({
    fecha_registro: toDateISO(),
    hora_registro: toHM(),
    posicion_id: `${POSICION_ID_BASE}-01`,
    equipo: EQUIPO,
    registro: REGISTRO,
    cantidad: "01",
    tecnico: "",
    ejecutado: "",
    observaciones: "",
    periodicidad: "",
    items: {},
    fecha_correccion_preview: fmtDMYHM(new Date()),
});

const packRow = (r) => ({
    ...r,
    tecnico: r.tecnico ?? "",
    observaciones: r.observaciones ?? "",
    cantidad:
        r.cantidad != null
            ? String(r.cantidad).padStart(2, "0")
            : r.cantidad,
});

export default function TamizRevisionEstructuraMalla() {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useRef(null);

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [editingId, setEditingId] = useState(null);

    const [filtroRevisado, setFiltroRevisado] = useState("all");
    const { canReview, username } = useCanReview();

    // Dialog de VER
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewRecord, setViewRecord] = useState(null);

    const showToast = (sev, sum, det, life = 3000) =>
        toast.current?.show({ severity: sev, summary: sum, detail: det, life });

    const fetchRows = async () => {
        try {
            setLoading(true);
            let q = supabase
                .from(TABLE)
                .select(
                    `
          id, created_at,
          fecha_registro, hora_registro,
          posicion_id, equipo, registro, cantidad, tecnico,
          ejecutado, observaciones, periodicidad,
          ${Array.from({ length: 14 }, (_, i) => `respuesta_q${i + 1}`).join(
                        ", "
                    )},
          ultimo_mantenimiento, proximo_mantenimiento,
          completado, pendiente_nuevo,
          revisado, revisado_por_username, revisado_fecha
        `
                )
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

    useEffect(() => {
        fetchRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroRevisado]);

    /*// Si venimos desde la campanita con un focusId, abrir directamente en editar
    useEffect(() => {
        const focusId = location.state?.focusId;
        if (!focusId || !rows.length) return;
        const row = rows.find((r) => r.id === focusId);
        if (row) openEdit(row);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state, rows]);*/

    const openNew = () => {
        setForm(emptyForm());
        setEditingId(null);
        setSubmitted(false);
        setDialogOpen(true);
    };

    const openEdit = (row) => {
        const baseQuestions = getQuestionsFor(row.periodicidad);
        const items = {};
        baseQuestions.forEach((q, idx) => {
            const col = `respuesta_q${idx + 1}`;
            items[q.key] = { respuesta: row[col] || "" };
        });

        // Derivar cantidad (01..06) desde la columna cantidad o desde el sufijo del ID
        let cantidadStr = "";
        if (row.cantidad != null) {
            cantidadStr = String(row.cantidad).padStart(2, "0");
        } else if (row.posicion_id) {
            const parts = row.posicion_id.split("-");
            const last = parts[parts.length - 1];
            if (CANTIDAD_OPTIONS.some((o) => o.value === last)) {
                cantidadStr = last;
            }
        }
        if (!cantidadStr) cantidadStr = "01";

        setForm({
            fecha_registro: row.fecha_registro || toDateISO(),
            hora_registro: row.hora_registro || toHM(),
            posicion_id:
                row.posicion_id || `${POSICION_ID_BASE}-${cantidadStr}`,
            equipo: row.equipo || EQUIPO,
            registro: row.registro || REGISTRO,
            cantidad: cantidadStr,
            tecnico: row.tecnico || "",
            ejecutado: row.ejecutado || "",
            observaciones: row.observaciones || "",
            periodicidad: row.periodicidad || "",
            items,
            fecha_correccion_preview: fmtDMYHM(row.created_at),
        });

        setEditingId(row.id);
        setSubmitted(false);
        setDialogOpen(true);
    };

    const openView = (row) => {
        setViewRecord(row);
        setViewDialogOpen(true);
    };

    const hideDialog = () => {
        setDialogOpen(false);
        setSubmitted(false);
        setEditingId(null);
    };

    const onChange = (field, value) =>
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));

    const onCantidadChange = (value) => {
        setForm((prev) => ({
            ...prev,
            cantidad: value,
            posicion_id: `${POSICION_ID_BASE}-${value || "01"}`,
        }));
    };

    const onPeriodoChange = (value) => {
        const base = getQuestionsFor(value);
        const items = base.reduce(
            (acc, q) => ({ ...acc, [q.key]: { respuesta: "" } }),
            {}
        );
        setForm((p) => ({ ...p, periodicidad: value, items }));
    };

    const onYesNoChange = (key, value) =>
        setForm((p) => ({
            ...p,
            items: { ...p.items, [key]: { respuesta: value } },
        }));

    const validate = () => {
        const errs = [];
        if (!form.periodicidad) errs.push("Seleccione la periodicidad.");
        if (!form.tecnico?.trim())
            errs.push("El campo Técnico es requerido.");
        if (!form.ejecutado)
            errs.push("Indique si se va a efectuar el mantenimiento.");
        if (form.ejecutado === "NO" && !form.observaciones.trim())
            errs.push("Explique por qué NO se efectuó (Observaciones).");
        if (form.ejecutado === "SI") {
            const list = getQuestionsFor(form.periodicidad);
            list.forEach((q) => {
                if (!form.items[q.key]?.respuesta)
                    errs.push(`Responda: ${q.label}`);
            });
        }
        if (!form.cantidad) errs.push("Seleccione la cantidad (01..06).");
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
            const baseDate = form.fecha_registro || toDateISO();
            const isEdit = !!editingId;

            const questions = getQuestionsFor(form.periodicidad);
            const allYes =
                form.ejecutado === "SI" &&
                questions.length > 0 &&
                questions.every(
                    (q) => form.items[q.key]?.respuesta === "SI"
                );

            // Lógica de completado igual que TamizMotor
            const completadoFlag = isEdit && allYes ? true : false;
            const pendienteNuevoFlag = isEdit && allYes ? true : false;

            // SEMANAL: siempre +7 días
            const proximo = addDays(baseDate, 7);

            const cantidadNum = form.cantidad
                ? Number(form.cantidad)
                : null;

            const posicionIdFinal = form.cantidad
                ? `${POSICION_ID_BASE}-${form.cantidad}`
                : `${POSICION_ID_BASE}-01`;

            const payload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                posicion_id: posicionIdFinal,
                equipo: EQUIPO,
                registro: REGISTRO,
                cantidad: cantidadNum,
                tecnico: form.tecnico,
                ejecutado: form.ejecutado,
                observaciones: form.observaciones || null,
                periodicidad: form.periodicidad,
                ...Object.fromEntries(
                    Array.from({ length: 14 }, (_, i) => [
                        `respuesta_q${i + 1}`,
                        form.ejecutado === "SI"
                            ? form.items[`q${i + 1}`]?.respuesta || null
                            : null,
                    ])
                ),
                ultimo_mantenimiento:
                    form.ejecutado === "SI" ? baseDate : null,
                proximo_mantenimiento: proximo,
                completado: completadoFlag,
                pendiente_nuevo: pendienteNuevoFlag,
            };

            let error;
            if (editingId) {
                ({ error } = await supabase
                    .from(TABLE)
                    .update(payload)
                    .eq("id", editingId));
            } else {
                ({ error } = await supabase.from(TABLE).insert([payload]));
            }

            if (error) throw error;

            showToast(
                "success",
                "Éxito",
                editingId ? "Registro actualizado" : "Registro guardado"
            );
            setDialogOpen(false);
            setEditingId(null);
            await fetchRows();
        } catch (e) {
            console.error(e);
            showToast("error", "Error", e.message || "No se pudo guardar");
        }
    };

    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
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
                            revisado_fecha: next
                                ? new Date().toISOString()
                                : null,
                        }
                        : r
                )
            );
            showToast(
                "success",
                "OK",
                next ? "Marcado revisado" : "Marcado no revisado"
            );
        };

        return (
            <div className="flex align-items-center justify-content-center gap-2">
                <Checkbox
                    checked={!!row.revisado}
                    onChange={(e) => onToggle(e.checked)}
                />
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
                    placeholder="Buscar (ej. COS-T-REM-01, técnico, notas)"
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
        Array.from({ length: 14 }, (_, i) => i + 1).reduce(
            (acc, i) =>
                acc + ((row[`respuesta_q${i}`] || "") === val ? 1 : 0),
            0
        );

    const exportXlsx = () => {
        if (!rows?.length) {
            showToast("warn", "Exportación", "No hay datos");
            return;
        }
        const out = rows.map((r) => ({
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
        XLSX.utils.book_append_sheet(wb, ws, "Tamiz_REM");
        XLSX.writeFile(
            wb,
            `Cosecha_Tamiz_RevEstructuraMalla_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );
    };

    const activeQuestions = getQuestionsFor(form.periodicidad);

    const accionesTemplate = (row) => (
        <div className="flex gap-2">
            <Button
                label="Ver"
                icon="pi pi-eye"
                text
                onClick={() => openView(row)}
            />
            <Button
                label="Editar"
                icon="pi pi-pencil"
                text
                onClick={() => openEdit(row)}
            />
        </div>
    );

    const viewQuestionsForRow = (row) =>
        getQuestionsFor(row.periodicidad || "");

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1 className="flex align-items-center gap-2">
                <img src={logo2} alt="mosca" className="logo2" />
                Registro — Tamiz (Revisión de Estructura y Malla)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición (ID base):</b> {POSICION_ID_BASE}&nbsp; | &nbsp;{" "}
                    <b>Equipo:</b> {EQUIPO} &nbsp; | &nbsp;
                    <b>Registro:</b> {REGISTRO}
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
                left={() => (
                    <Button
                        label="Nuevo"
                        icon="pi pi-plus"
                        severity="success"
                        onClick={openNew}
                    />
                )}
                right={() => (
                    <Button
                        label="Exportar a Excel"
                        icon="pi pi-upload"
                        className="p-button-help"
                        onClick={exportXlsx}
                    />
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
                <Column
                    header="Último Mantenimiento"
                    body={(r) => fmtDMY(r.ultimo_mantenimiento)}
                    sortable
                />
                <Column
                    header="Próximo Mantenimiento"
                    body={(r) => fmtDMY(r.proximo_mantenimiento)}
                    sortable
                />
                <Column field="tecnico" header="Técnico" sortable />
                <Column
                    header="Fecha de Registro"
                    body={(r) => fmtDMYHM(r.created_at)}
                    sortable
                />
                <Column
                    header="Revisado"
                    body={revisadoTemplate}
                    style={{ width: "10rem", textAlign: "center" }}
                />
                <Column
                    header="Acciones"
                    body={accionesTemplate}
                    exportable={false}
                    style={{ width: "14rem" }}
                />
            </DataTable>

            {/* Dialog NUEVO / EDITAR */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "72vw", maxWidth: 1100 }}
                header={
                    editingId
                        ? "Editar registro — Tamiz (Revisión de Estructura y Malla)"
                        : "Nuevo registro — Tamiz (Revisión de Estructura y Malla)"
                }
                modal
                onHide={hideDialog}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button
                            label="Cancelar"
                            icon="pi pi-times"
                            outlined
                            onClick={hideDialog}
                        />
                        <Button label="Guardar" icon="pi pi-check" onClick={save} />
                    </div>
                }
            >
                <div className="p-fluid grid">
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">
                            Periodicidad*{" "}
                            {submitted && !form.periodicidad && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <Dropdown
                            value={form.periodicidad}
                            options={PERIODOS}
                            onChange={(e) => onPeriodoChange(e.value)}
                            placeholder="Seleccione"
                        />
                        <small className="block mt-2">
                            <b>Semanal</b>: +7 días (se reprograma 7 días después
                            de la fecha de intervención).
                        </small>
                    </div>

                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Fecha intervención</label>
                        <InputText
                            type="date"
                            value={form.fecha_registro}
                            onChange={(e) => onChange("fecha_registro", e.target.value)}
                        />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora intervención</label>
                        <InputText
                            type="time"
                            value={form.hora_registro}
                            onChange={(e) => onChange("hora_registro", e.target.value)}
                        />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Posición (ID)</label>
                        <InputText
                            value={`${POSICION_ID_BASE}-${form.cantidad || "01"
                                }`}
                            disabled
                        />
                    </div>
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Equipo</label>
                        <InputText value={EQUIPO} disabled />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Técnico{" "}
                            {submitted && !form.tecnico && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <InputText
                            value={form.tecnico}
                            onChange={(e) => onChange("tecnico", e.target.value)}
                            placeholder="Nombre del técnico"
                        />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Cantidad{" "}
                            {submitted && !form.cantidad && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <Dropdown
                            value={form.cantidad}
                            options={CANTIDAD_OPTIONS}
                            onChange={(e) => onCantidadChange(e.value)}
                            placeholder="Seleccione"
                        />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            ¿Se va a efectuar el mantenimiento?{" "}
                            {submitted && !form.ejecutado && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <Dropdown
                            value={form.ejecutado}
                            options={YESNO}
                            onChange={(e) => onChange("ejecutado", e.value)}
                            placeholder="Seleccione"
                        />
                    </div>

                    {form.ejecutado === "NO" && (
                        <div className="field col-12">
                            <label className="font-bold">
                                Observaciones (obligatorio si NO){" "}
                                {submitted && !form.observaciones.trim() && (
                                    <small className="p-error"> Requerido</small>
                                )}
                            </label>
                            <InputText
                                value={form.observaciones}
                                onChange={(e) => onChange("observaciones", e.target.value)}
                                placeholder="Explique el motivo"
                            />
                            <small className="block mt-2">
                                Se reprogramará automáticamente para dentro de <b>7 días</b>.
                            </small>
                        </div>
                    )}

                    {form.ejecutado === "SI" && !!activeQuestions.length && (
                        <div className="field col-12">
                            <div
                                style={{
                                    border: "1px solid #d1d5db",
                                    borderRadius: 8,
                                    padding: 12,
                                }}
                            >
                                <div
                                    style={{ fontWeight: 700, marginBottom: 8 }}
                                >{`Checklist — SEMANAL`}</div>
                                <div className="grid">
                                    {activeQuestions.map((q) => {
                                        const val = form.items[q.key]?.respuesta || "";
                                        return (
                                            <div key={q.key} className="col-12 md:col-6">
                                                <label className="font-bold">
                                                    {q.label}*{" "}
                                                    {submitted && !val && (
                                                        <small className="p-error">
                                                            {" "}
                                                            Requerido
                                                        </small>
                                                    )}
                                                </label>
                                                <Dropdown
                                                    value={val}
                                                    options={YESNO}
                                                    onChange={(e) =>
                                                        onYesNoChange(q.key, e.value)
                                                    }
                                                    placeholder="Seleccione"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {form.ejecutado === "SI" && (
                        <div className="field col-12">
                            <label className="font-bold">
                                Observaciones (opcional)
                            </label>
                            <InputText
                                value={form.observaciones}
                                onChange={(e) => onChange("observaciones", e.target.value)}
                            />
                        </div>
                    )}

                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Fecha de Registro (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>

            {/* Dialog VER */}
            <Dialog
                visible={viewDialogOpen}
                onHide={() => setViewDialogOpen(false)}
                header="Detalle del registro"
                style={{ width: "60vw", maxWidth: 900 }}
                modal
            >
                {!viewRecord ? (
                    <p>No hay datos para mostrar.</p>
                ) : (
                    <>
                        <p>
                            <b>ID:</b> {viewRecord.posicion_id} &nbsp; | &nbsp;
                            <b>Equipo:</b> {viewRecord.equipo} &nbsp; | &nbsp;
                            <b>Registro:</b> {viewRecord.registro} &nbsp; | &nbsp;
                            <b>Periodicidad:</b> {viewRecord.periodicidad}
                        </p>
                        <p>
                            <b>Fecha intervención:</b>{" "}
                            {fmtDMY(viewRecord.fecha_registro)} &nbsp; | &nbsp;
                            <b>Hora:</b> {viewRecord.hora_registro || "—"}
                        </p>
                        <p>
                            <b>Técnico:</b> {viewRecord.tecnico || "—"}
                        </p>

                        <hr />

                        <div className="grid">
                            {viewQuestionsForRow(viewRecord).map((q, idx) => {
                                const col = `respuesta_q${idx + 1}`;
                                const val = viewRecord[col] || "—";
                                return (
                                    <div
                                        key={q.key}
                                        className="col-12 md:col-6"
                                        style={{ marginBottom: 8 }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "0.85rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {q.label}
                                        </div>
                                        <div
                                            style={{
                                                marginTop: 2,
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            Respuesta:{" "}
                                            <b>
                                                {val === "SI" || val === "NO" ? val : "—"}
                                            </b>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <hr />
                        <p>
                            <b>Observaciones:</b>{" "}
                            {viewRecord.observaciones || "—"}
                        </p>
                    </>
                )}
            </Dialog>
        </div>
    );
}
