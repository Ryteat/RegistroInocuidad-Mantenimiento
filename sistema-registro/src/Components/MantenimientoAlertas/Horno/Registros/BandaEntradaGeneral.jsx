// src/Components/MantenimientoAlertas/Horno/Registros/BandaEntradaGeneral.jsx
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

/* ===== Helpers de fecha (seguros) ===== */
const parseYMD = (iso) => {
    if (!iso) return null;
    const [y, m, d] = String(iso).split("-").map(Number);
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

const addMonths = (ymd, months) => {
    const b = parseYMD(ymd);
    b.setMonth(b.getMonth() + Number(months || 0));
    return toDateISO(b);
};

/* ===== Constantes de este registro ===== */
const BASE_POSICION_ID = "H-BE-G";
const EQUIPO = "BANDA DE ENTRADA";
const REGISTRO = "GENERAL";
const TABLE = "mto_horno_banda_entrada_general";

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];

const PERIODOS = [
    { label: "Semanal", value: "SEMANAL" },
    { label: "Trimestral", value: "TRIMESTRAL" },
    { label: "Anual", value: "ANUAL" },
];

// este registro solo tiene 1 → 01
const CANTIDAD_OPCIONES = [{ label: "01", value: 1 }];

/* === Preguntas (idénticas a Banda de Salida — General) === */
// Semanal
const Q_SEMANAL = [
    { key: "q1", label: "Revisar y lubricar todas las muñoneras" },
    { key: "q2", label: "Revisar y verificar el estado, daños o reventaduras" },
    { key: "q3", label: "Verificar que todas las muñoneras tengan alemite" },
    { key: "q4", label: "Limpiar los excesos de lubricación" },
    { key: "q5", label: "Revisar estado y nivel del aceite del reductor" },
    { key: "q6", label: "Verificar que no existan fugas" },
    {
        key: "q7",
        label:
            "Revisar estado de la estructura, presencia de reventaduras y sus anclajes",
    },
    {
        key: "q8",
        label:
            "Verificar el estado de la banda y sus componentes, pegas o uniones",
    },
    { key: "q9", label: "Revisar alineado de la banda" },
];
// Trimestral
const Q_TRIMESTRAL = [
    { key: "q1", label: "Revisar y verificar estado general del motor, limpieza" },
    { key: "q2", label: "Revisar y verificar estado general del motor, pintura" },
    {
        key: "q3",
        label: "Revisar estado del cable de alimentación, conector o manguito",
    },
    {
        key: "q4",
        label:
            "Abrir caja de conexiones y verificar estado y apriete de los bornes de conexión",
    },
    {
        key: "q5",
        label:
            "Verificar presencia de agua en la caja de conexión, si lo hay utilice desplazador de humedad",
    },
    { key: "q6", label: "Realizar medición de aislamiento al bobinado, Reporte" },
    {
        key: "q7",
        label:
            "Tomar lecturas de amperaje y comparar con los datos de placa, Reporte",
    },
    { key: "q8", label: "Revisar temperatura del motor, Reporte" },
    {
        key: "q9",
        label: "Revisar que no haya presencia de vibraciones o ruidos extraños",
    },
    {
        key: "q10",
        label:
            "Verificar que el cobertor del motor y abandono se encuentre en su lugar, Reporte",
    },
    { key: "q11", label: "Reducir fugas" },
    { key: "q12", label: "Revisar estado y nivel del aceite" },
    { key: "q13", label: "Lubricar" },
];
// Anual
const Q_ANUAL = [
    { key: "q1", label: "Desarme el motor, no dañe el bobinado" },
    { key: "q2", label: "Lavar, secar y barnizar el bobinado" },
    { key: "q3", label: "Cambiar los rodamientos del motor" },
    { key: "q4", label: "Realizar medición de aislamiento al bobinado" },
    { key: "q5", label: "Cambie los retenedores" },
    { key: "q6", label: "Cambie el oring" },
    { key: "q7", label: "Armar el motor" },
    { key: "q8", label: "Pinte si se requiere" },
    { key: "q9", label: "Desarme el reductor y realice lavado" },
    { key: "q10", label: "Cambie todos los rodamientos" },
    { key: "q11", label: "Cambie los retenedores" },
    {
        key: "q12",
        label:
            "Armar el equipo con cuidado de no dañar los retenedores y los roles",
    },
    { key: "q13", label: "Pinte si es necesario" },
    { key: "q14", label: "Rellene con aceite nuevo" },
];

const getQuestionsFor = (periodicidad) => {
    if (periodicidad === "SEMANAL") return Q_SEMANAL;
    if (periodicidad === "TRIMESTRAL") return Q_TRIMESTRAL;
    if (periodicidad === "ANUAL") return Q_ANUAL;
    return [];
};

const buildPosicionId = (consecutivo) =>
    `${BASE_POSICION_ID}-${String(consecutivo || 1)
        .toString()
        .padStart(2, "0")}`;

const emptyForm = () => ({
    fecha_registro: toDateISO(),
    hora_registro: toHM(),
    posicion_id: buildPosicionId(1),
    equipo: EQUIPO,
    registro: REGISTRO,
    cantidad: 1,
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
});

export default function BandaEntradaGeneral() {
    const navigate = useNavigate();
    const toast = useRef(null);

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [editingId, setEditingId] = useState(null);

    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewRow, setViewRow] = useState(null);

    const [filtroRevisado, setFiltroRevisado] = useState("all");
    const { canReview, username } = useCanReview();

    const showToast = (sev, sum, det, life = 3000) =>
        toast.current?.show({ severity: sev, summary: sum, detail: det, life });

    /* ----------- carga ----------- */
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
                respuesta_q1, respuesta_q2, respuesta_q3, respuesta_q4, respuesta_q5,
                respuesta_q6, respuesta_q7, respuesta_q8, respuesta_q9, respuesta_q10,
                respuesta_q11, respuesta_q12, respuesta_q13, respuesta_q14,
                ultimo_mantenimiento, proximo_mantenimiento,
                revisado, revisado_por_username, revisado_fecha,
                completado, pendiente_nuevo, fecha_completado
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

    const onChange = (field, value) =>
        setForm((p) => ({
            ...p,
            [field]: value,
        }));

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

    const onCantidadChange = (value) => {
        const consecutivo = Number(value) || 1;
        setForm((p) => ({
            ...p,
            cantidad: consecutivo,
            posicion_id: buildPosicionId(consecutivo),
        }));
    };

    /* ----------- diálogos ----------- */
    const openNew = () => {
        setForm(emptyForm());
        setSubmitted(false);
        setEditingId(null);
        setDialogOpen(true);
    };

    const hideDialog = () => {
        setDialogOpen(false);
        setSubmitted(false);
        setEditingId(null);
    };

    const openView = (row) => {
        setViewRow(row);
        setViewDialogOpen(true);
    };

    const hideViewDialog = () => {
        setViewDialogOpen(false);
        setViewRow(null);
    };

    const openEdit = (row) => {
        const periodo = row.periodicidad || "";
        const baseQuestions = getQuestionsFor(periodo);

        const items = {};
        baseQuestions.forEach((q, idx) => {
            const col = `respuesta_q${idx + 1}`;
            items[q.key] = { respuesta: row[col] || "" };
        });

        const consecutivo = row.cantidad ? Number(row.cantidad) : 1;

        setForm({
            fecha_registro: row.fecha_registro || toDateISO(),
            hora_registro: row.hora_registro || toHM(),
            posicion_id: row.posicion_id || buildPosicionId(consecutivo),
            equipo: row.equipo || EQUIPO,
            registro: row.registro || REGISTRO,
            cantidad: consecutivo,
            tecnico: row.tecnico || "",
            ejecutado: row.ejecutado || "",
            observaciones: row.observaciones || "",
            periodicidad: periodo,
            items,
            fecha_correccion_preview: fmtDMYHM(row.created_at),
        });
        setSubmitted(false);
        setEditingId(row.id);
        setDialogOpen(true);
    };

    /* ----------- validación ----------- */
    const validate = () => {
        const errs = [];
        if (!form.periodicidad) errs.push("Seleccione la periodicidad.");
        if (!form.tecnico?.trim()) errs.push("El campo Técnico es requerido.");
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
        return errs;
    };

    /* ----------- guardado (insert / update) ----------- */
    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) {
            showToast("warn", "Validación", errs[0]);
            return;
        }

        try {
            const baseDate = form.fecha_registro || toDateISO();
            const cantidadNum = Number(form.cantidad) || 1;
            const posicionCompleta = buildPosicionId(cantidadNum);

            // payload de respuestas (hasta 14 preguntas)
            const respuestasPayload = Object.fromEntries(
                Array.from({ length: 14 }, (_, i) => [
                    `respuesta_q${i + 1}`,
                    form.ejecutado === "SI"
                        ? form.items[`q${i + 1}`]?.respuesta || null
                        : null,
                ])
            );

            const basePayload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                posicion_id: posicionCompleta,
                equipo: EQUIPO,
                registro: REGISTRO,
                cantidad: cantidadNum,
                tecnico: form.tecnico,
                ejecutado: form.ejecutado,
                observaciones: form.observaciones || null,
                periodicidad: form.periodicidad,
                ...respuestasPayload,
            };

            const preguntas = getQuestionsFor(form.periodicidad);
            const todasSi =
                preguntas.length > 0
                    ? preguntas.every(
                        (q) => form.items[q.key]?.respuesta === "SI"
                    )
                    : false;

            let error;

            if (editingId) {
                // 🔵 EDICIÓN
                let updatePayload = { ...basePayload };

                if (form.ejecutado === "SI" && todasSi) {
                    // ✅ Todas en "SI" → COMPLETADO (verde en campanita)
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: baseDate,
                        proximo_mantenimiento: null,
                        completado: true,
                        pendiente_nuevo: true,
                        fecha_completado: new Date().toISOString(),
                    };
                } else if (form.ejecutado === "NO") {
                    // ❌ NO ejecutado → +7 días
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: null,
                        proximo_mantenimiento: addDays(baseDate, 7),
                        completado: false,
                        pendiente_nuevo: false,
                        fecha_completado: null,
                    };
                } else {
                    // ejecutado = "SI" pero con alguna "NO"
                    let proximo = addDays(baseDate, 7);
                    if (form.periodicidad === "TRIMESTRAL") {
                        proximo = addMonths(baseDate, 3);
                    } else if (form.periodicidad === "ANUAL") {
                        proximo = addMonths(baseDate, 12);
                    }

                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: baseDate,
                        proximo_mantenimiento: proximo,
                        completado: false,
                        pendiente_nuevo: false,
                        fecha_completado: null,
                    };
                }

                ({ error } = await supabase
                    .from(TABLE)
                    .update(updatePayload)
                    .eq("id", editingId));
            } else {
                // 🟢 NUEVO REGISTRO
                let ultimo = null;
                let proximo = null;

                if (form.ejecutado === "NO") {
                    proximo = addDays(baseDate, 7);
                } else if (form.periodicidad === "SEMANAL") {
                    ultimo = baseDate;
                    proximo = addDays(baseDate, 7);
                } else if (form.periodicidad === "TRIMESTRAL") {
                    ultimo = baseDate;
                    proximo = addMonths(baseDate, 3);
                } else if (form.periodicidad === "ANUAL") {
                    ultimo = baseDate;
                    proximo = addMonths(baseDate, 12);
                } else {
                    ultimo = baseDate;
                    proximo = addDays(baseDate, 7);
                }

                const insertPayload = {
                    ...basePayload,
                    ultimo_mantenimiento: ultimo,
                    proximo_mantenimiento: proximo,
                    completado: false,
                    pendiente_nuevo: false,
                    fecha_completado: null,
                };

                ({ error } = await supabase
                    .from(TABLE)
                    .insert([insertPayload]));
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

    /* ----------- revisado ----------- */
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
                console.error(error);
                showToast(
                    "error",
                    "Error",
                    "No se pudo actualizar 'revisado'"
                );
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

    /* ----------- acciones (Ver / Editar) ----------- */
    const actionsTemplate = (row) => (
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

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    type="search"
                    value={globalFilter}
                    onInput={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar (H-BE-G-01, técnico, notas)"
                />
            </span>
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
        XLSX.utils.book_append_sheet(wb, ws, "BandaEntrada");
        XLSX.writeFile(
            wb,
            `Horno_BandaEntradaGeneral_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );
    };

    const activeQuestions = getQuestionsFor(form.periodicidad);

    const viewQuestions = !viewRow
        ? []
        : getQuestionsFor(viewRow.periodicidad || "");

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1 className="flex align-items-center gap-2">
                <img src={logo2} alt="mosca" className="logo2" />
                Registro — Banda de Entrada (General)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición base:</b> {BASE_POSICION_ID} &nbsp; | &nbsp;
                    <b>Equipo:</b> {EQUIPO} &nbsp; | &nbsp;
                    <b>Registro:</b> {REGISTRO}
                </p>
            </div>

            <div className="buttons-container">
                <button
                    onClick={() => navigate(-1)}
                    className="return-button"
                >
                    Volver
                </button>
                <button
                    onClick={() => navigate(-2)}
                    className="menu-button"
                >
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
                    header="Último Mto."
                    body={(r) => fmtDMY(r.ultimo_mantenimiento)}
                    sortable
                />
                <Column
                    header="Próximo Mto."
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
                    body={actionsTemplate}
                    exportable={false}
                    style={{ minWidth: "10rem", textAlign: "center" }}
                />
            </DataTable>

            {/* Dialog Nuevo / Editar */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "72vw", maxWidth: 1100 }}
                header={
                    editingId
                        ? "Editar registro — Banda de Entrada (General)"
                        : "Nuevo registro — Banda de Entrada (General)"
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
                        <Button
                            label="Guardar"
                            icon="pi pi-check"
                            onClick={save}
                        />
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
                            Semanal: +7d &nbsp;•&nbsp; Trimestral: +3m
                            &nbsp;•&nbsp; Anual: +12m
                        </small>
                    </div>

                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Fecha intervención</label>
                        <InputText
                            type="date"
                            value={form.fecha_registro}
                            onChange={(e) =>
                                onChange("fecha_registro", e.target.value)
                            }
                        />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora intervención</label>
                        <InputText
                            type="time"
                            value={form.hora_registro}
                            onChange={(e) =>
                                onChange("hora_registro", e.target.value)
                            }
                        />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Posición (ID)</label>
                        <InputText value={form.posicion_id} disabled />
                    </div>
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">Equipo</label>
                        <InputText value={EQUIPO} disabled />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Técnico*{" "}
                            {submitted && !form.tecnico && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <InputText
                            value={form.tecnico}
                            onChange={(e) =>
                                onChange("tecnico", e.target.value)
                            }
                            placeholder="Nombre del técnico"
                        />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Cantidad / consecutivo
                        </label>
                        <Dropdown
                            value={form.cantidad}
                            options={CANTIDAD_OPCIONES}
                            onChange={(e) => onCantidadChange(e.value)}
                            placeholder="01"
                        />
                        <small className="block mt-1">
                            Se usará para generar la posición: {BASE_POSICION_ID}
                            -01
                        </small>
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            ¿Se va a efectuar el mantenimiento?*{" "}
                            {submitted && !form.ejecutado && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <Dropdown
                            value={form.ejecutado}
                            options={YESNO}
                            onChange={(e) =>
                                onChange("ejecutado", e.value)
                            }
                            placeholder="Seleccione"
                        />
                    </div>

                    {form.ejecutado === "NO" && (
                        <div className="field col-12">
                            <label className="font-bold">
                                Observaciones (obligatorio si NO){" "}
                                {submitted &&
                                    !form.observaciones.trim() && (
                                        <small className="p-error">
                                            {" "}
                                            Requerido
                                        </small>
                                    )}
                            </label>
                            <InputText
                                value={form.observaciones}
                                onChange={(e) =>
                                    onChange(
                                        "observaciones",
                                        e.target.value
                                    )
                                }
                                placeholder="Explique el motivo"
                            />
                            <small className="block mt-2">
                                Se reprogramará automáticamente para dentro de{" "}
                                <b>7 días</b>.
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
                                    style={{
                                        fontWeight: 700,
                                        marginBottom: 8,
                                    }}
                                >
                                    {form.periodicidad === "SEMANAL"
                                        ? "Checklist — SEMANAL"
                                        : form.periodicidad === "TRIMESTRAL"
                                            ? "Checklist — TRIMESTRAL"
                                            : "Checklist — ANUAL"}
                                </div>
                                <div className="grid">
                                    {activeQuestions.map((q) => {
                                        const val =
                                            form.items[q.key]?.respuesta ||
                                            "";
                                        return (
                                            <div
                                                key={q.key}
                                                className="col-12 md:col-6"
                                            >
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
                                                        onYesNoChange(
                                                            q.key,
                                                            e.value
                                                        )
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
                                onChange={(e) =>
                                    onChange(
                                        "observaciones",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    )}

                    <div className="field col-12 md:col-4">
                        <label className="font-bold">
                            Fecha de Registro (auto)
                        </label>
                        <InputText
                            value={form.fecha_correccion_preview}
                            disabled
                        />
                    </div>
                </div>
            </Dialog>

            {/* Dialog VER */}
            <Dialog
                visible={viewDialogOpen}
                style={{ width: "70vw", maxWidth: 1000 }}
                header="Detalle — Banda de Entrada (General)"
                modal
                onHide={hideViewDialog}
            >
                {viewRow && (
                    <div className="p-fluid grid">
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">Posición (ID)</label>
                            <InputText value={viewRow.posicion_id} disabled />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">Equipo</label>
                            <InputText value={viewRow.equipo} disabled />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">Registro</label>
                            <InputText value={viewRow.registro} disabled />
                        </div>

                        <div className="field col-12 md:col-4">
                            <label className="font-bold">Periodicidad</label>
                            <InputText
                                value={viewRow.periodicidad}
                                disabled
                            />
                        </div>
                        <div className="field col-6 md:col-4">
                            <label className="font-bold">
                                Fecha intervención
                            </label>
                            <InputText
                                value={fmtDMY(viewRow.fecha_registro)}
                                disabled
                            />
                        </div>
                        <div className="field col-6 md:col-4">
                            <label className="font-bold">
                                Hora intervención
                            </label>
                            <InputText
                                value={viewRow.hora_registro || ""}
                                disabled
                            />
                        </div>

                        <div className="field col-6 md:col-4">
                            <label className="font-bold">Técnico</label>
                            <InputText
                                value={viewRow.tecnico || ""}
                                disabled
                            />
                        </div>
                        <div className="field col-6 md:col-4">
                            <label className="font-bold">Ejecutado</label>
                            <InputText
                                value={viewRow.ejecutado || ""}
                                disabled
                            />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">
                                Fecha de Registro
                            </label>
                            <InputText
                                value={fmtDMYHM(viewRow.created_at)}
                                disabled
                            />
                        </div>

                        <div className="field col-12">
                            <label className="font-bold">Observaciones</label>
                            <InputText
                                value={viewRow.observaciones || ""}
                                disabled
                            />
                        </div>

                        {!!viewQuestions.length && (
                            <div className="field col-12">
                                <div
                                    style={{
                                        border: "1px solid #d1d5db",
                                        borderRadius: 8,
                                        padding: 12,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            marginBottom: 8,
                                        }}
                                    >
                                        Checklist — {viewRow.periodicidad}
                                    </div>
                                    <div className="grid">
                                        {viewQuestions.map((q, idx) => (
                                            <div
                                                key={q.key}
                                                className="col-12 md:col-6"
                                            >
                                                <label className="font-bold">
                                                    {q.label}
                                                </label>
                                                <InputText
                                                    value={
                                                        viewRow[
                                                        `respuesta_q${idx + 1
                                                        }`
                                                        ] || ""
                                                    }
                                                    disabled
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>
        </div>
    );
}
