// src/Components/MantenimientoAlertas/Crecimiento/Registros/PanelesGeneral.jsx
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

/* ===== Helpers de fecha (mismo patrón que el resto) ===== */
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

const addMonths = (ymd, months) => {
    const b = parseYMD(ymd);
    b.setMonth(b.getMonth() + Number(months || 0));
    return toDateISO(b);
};

/* ===== Constantes de este registro (CRE-P-G) ===== */
const POSICION_ID_BASE = "CRE-P-G";
const EQUIPO = "PANELES";
const REGISTRO = "GENERAL";
const TABLE = "mto_crecimiento_paneles_general";

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];

// Solo tiene periodicidad MENSUAL
const PERIODOS = [{ label: "Mensual", value: "MENSUAL" }];

/* Este registro tiene 6 paneles (01..06) */
const CANTIDAD_OPTIONS = [
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
    { label: "4", value: 4 },
    { label: "5", value: 5 },
    { label: "6", value: 6 },
];

/* ===== Preguntas MENSUAL (texto literal de la OM) ===== */
const Q_MENSUAL = [
    { key: "q1", label: "Botoneras y selectores, Revisar el funcionamiento" },
    { key: "q2", label: "Luces, Revisar las luces indicadoras, cambie si es necesario" },
    { key: "q3", label: "Revisar el estado del cableado y realice su acomodo" },
    { key: "q4", label: "Puertas, Revise el funcionamiento de los llavines, repare si es necesario" },
    { key: "q5", label: "Panel interior y exterior, Limpie el polvo y la suciedad" },
    { key: "q6", label: "Resocar los tornillos de los bornes de contacto de los dispositivos eléctricos" },
    { key: "q7", label: "Bornes, Revise la fijacion de los cables, calentamiento de cables en la entrada y la salida" },
    { key: "q8", label: "Verificar con la cámara termográfica la temperatura interna del panel y sus componentes" },
];

const getQuestionsFor = (periodicidad) => {
    if (periodicidad === "MENSUAL") return Q_MENSUAL;
    return [];
};

const emptyForm = () => ({
    fecha_registro: toDateISO(),
    hora_registro: toHM(),
    posicion_id: POSICION_ID_BASE,
    equipo: EQUIPO,
    registro: REGISTRO,
    cantidad: null,
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

export default function PanelesGeneral() {
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

        setForm({
            fecha_registro: row.fecha_registro || toDateISO(),
            hora_registro: row.hora_registro || toHM(),
            posicion_id: row.posicion_id || POSICION_ID_BASE,
            equipo: row.equipo || EQUIPO,
            registro: row.registro || REGISTRO,
            cantidad: row.cantidad ? Number(row.cantidad) : null,
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
        if (!form.cantidad) errs.push("Seleccione la cantidad (Panel 1–6).");
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
            const cantidadNum = Number(form.cantidad);
            const sufijo = String(cantidadNum).padStart(2, "0");
            const posicionCompleta = `${POSICION_ID_BASE}-${sufijo}`;

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
                cantidad: Number.isNaN(cantidadNum) ? null : cantidadNum,
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
                    // ✅ Todas las respuestas en "SI" → COMPLETADO
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: baseDate,
                        proximo_mantenimiento: null,
                        completado: true,
                        pendiente_nuevo: true,
                        fecha_completado: new Date().toISOString(),
                    };
                } else if (form.ejecutado === "NO") {
                    // ❌ NO ejecutado → reprogramar a 7 días
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: null,
                        proximo_mantenimiento: addDays(baseDate, 7),
                        completado: false,
                        pendiente_nuevo: false,
                        fecha_completado: null,
                    };
                } else {
                    // ejecutado = "SI" pero con alguna "NO":
                    // se reprograma el ciclo normal (no pasa a COMPLETO)
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: baseDate,
                        proximo_mantenimiento: addMonths(baseDate, 1),
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
                } else if (form.periodicidad === "MENSUAL") {
                    ultimo = baseDate;
                    proximo = addMonths(baseDate, 1);
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
                    placeholder="Buscar (ej. CRE-P-G-01, técnico, notas)"
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
            cantidad: r.cantidad ?? "",
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
        XLSX.utils.book_append_sheet(wb, ws, "Paneles");
        XLSX.writeFile(
            wb,
            `Crecimiento_Paneles_${new Date().toISOString().slice(0, 10)}.xlsx`
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
                Registro — Paneles (General)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición base (ID):</b> {POSICION_ID_BASE} &nbsp; | &nbsp;{" "}
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
                <Column field="cantidad" header="Cant." sortable />
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
                        ? "Editar registro — Paneles (General)"
                        : "Nuevo registro — Paneles (General)"
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
                            <b>Mensual</b>: +1 mes (si NO ejecutado: +7 días).
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
                        <label className="font-bold">Posición base</label>
                        <InputText value={POSICION_ID_BASE} disabled />
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
                            Cantidad* (Panel 1–6){" "}
                            {submitted && !form.cantidad && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <Dropdown
                            value={form.cantidad}
                            options={CANTIDAD_OPTIONS}
                            onChange={(e) => onChange("cantidad", e.value)}
                            placeholder="Seleccione"
                        />
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
                            onChange={(e) => onChange("ejecutado", e.value)}
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
                                    onChange("observaciones", e.target.value)
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
                                    Checklist — MENSUAL
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
                                    onChange("observaciones", e.target.value)
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
                                            Respuesta: <b>{val}</b>
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
