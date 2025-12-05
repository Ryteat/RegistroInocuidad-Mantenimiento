// src/Components/MantenimientoAlertas/Horno/Registros/VibradorEnfriador.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../../supabaseClient";
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
import useCanReview from "../../../Inocuidad/Registros/Hooks/useCanReview";

// ===== Helpers de fecha “seguros” =====
const parseYMD = (isoDateStr) => {
    if (!isoDateStr) return null;
    const [y, m, d] = String(isoDateStr).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
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
    const base = parseYMD(ymd);
    base.setDate(base.getDate() + Number(days || 0));
    return toDateISO(base);
};
const addMonths = (ymd, months) => {
    const base = parseYMD(ymd);
    base.setMonth(base.getMonth() + Number(months || 0));
    return toDateISO(base);
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

// ===== Constantes del registro =====
const POSICION_ID_BASE = "H-ENF-V";
const EQUIPO = "ENFRIADOR DE LARVA";
const REGISTRO = "VIBRADOR";
const TABLE = "mto_horno_enfriador_vibrador";

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];
const PERIODOS = [{ label: "Mensual", value: "MENSUAL" }];

// Cantidad fija 1 → consecutivo 01
const CANTIDAD_OPTIONS = [{ label: "01", value: 1 }];

// Preguntas EXACTAS (foto “vibrador mensual”)
const Q_MENSUAL = [
    // Sistema eléctrico
    {
        key: "q1",
        label:
            "Revisar conexiones eléctricas, terminales, cables y tierra física.",
    },
    {
        key: "q2",
        label:
            "Verificar amperaje y voltaje del electroimán (comparar con especificación de placa).",
    },
    {
        key: "q3",
        label: "Comprobar la integridad del control electrónico (si aplica).",
    },
    // Electromimán y armadura
    {
        key: "q4",
        label:
            "Inspeccionar bobinas por calentamiento excesivo, desgaste o daño de aislamiento.",
    },
    {
        key: "q5",
        label:
            "Revisar que el armador móvil no presente suciedad, óxido o desgaste.",
    },
    {
        key: "q6",
        label:
            "Medir resistencia eléctrica de las bobinas (comparar con manual del fabricante).",
    },
    // Resortes / láminas
    {
        key: "q7",
        label: "Revisar desgaste, corrosión o pérdida de elasticidad.",
    },
    { key: "q8", label: "Cambiar si presentan fisuras o fatiga." },
    // Estructura y alineación
    { key: "q9", label: "Asegurar que la bandeja esté nivelada y centrada." },
    { key: "q10", label: "Verificar que la base no presente desajustes." },
];

const buildPosicionId = (consecutivo) =>
    `${POSICION_ID_BASE}-${String(consecutivo || 1)
        .toString()
        .padStart(2, "0")}`;

const emptyForm = () => ({
    fecha_registro: toDateISO(),
    hora_registro: toHM(),
    posicion_id: buildPosicionId(1), // H-ENF-V-01
    equipo: EQUIPO,
    registro: REGISTRO,
    cantidad: null, // el usuario debe escoger 01 en el dropdown
    tecnico: "",
    ejecutado: "",
    observaciones: "",
    periodicidad: "MENSUAL",
    items: Q_MENSUAL.reduce(
        (a, q) => ({ ...a, [q.key]: { respuesta: "" } }),
        {}
    ),
    fecha_correccion_preview: fmtDMYHM(new Date()),
});

const packRow = (r) => ({
    ...r,
    tecnico: r.tecnico ?? "",
    observaciones: r.observaciones ?? "",
});

export default function VibradorEnfriador() {
    const navigate = useNavigate();
    const toast = useRef(null);
    const { canReview, username } = useCanReview();

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

    const showToast = (sev, sum, det, life = 3000) =>
        toast.current?.show({ severity: sev, summary: sum, detail: det, life });

    // ---- carga ----
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
        setSubmitted(false);
        setEditingId(null);
        setDialogOpen(true);
    };
    const hideDialog = () => {
        setDialogOpen(false);
        setSubmitted(false);
        setEditingId(null);
    };
    const onChange = (field, value) =>
        setForm((p) => ({
            ...p,
            [field]: value,
        }));

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

    // ---- VER / EDITAR ----
    const openView = (row) => {
        setViewRow(row);
        setViewDialogOpen(true);
    };
    const hideViewDialog = () => {
        setViewDialogOpen(false);
        setViewRow(null);
    };

    const openEdit = (row) => {
        const items = {};
        Q_MENSUAL.forEach((q, idx) => {
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
            periodicidad: row.periodicidad || "MENSUAL",
            items,
            fecha_correccion_preview: fmtDMYHM(row.created_at),
        });

        setEditingId(row.id);
        setSubmitted(false);
        setDialogOpen(true);
    };

    // ---- validación ----
    const validate = () => {
        const errs = [];
        if (!form.cantidad) errs.push("Seleccione el consecutivo (01).");
        if (!form.tecnico?.trim())
            errs.push("El campo Técnico es requerido.");
        if (!form.ejecutado)
            errs.push("Indique si se va a efectuar el mantenimiento.");
        if (form.ejecutado === "NO" && !form.observaciones.trim())
            errs.push(
                "Explique por qué NO se efectuó (Observaciones)."
            );
        if (form.ejecutado === "SI") {
            Q_MENSUAL.forEach((q) => {
                if (!form.items[q.key]?.respuesta)
                    errs.push(`Responda: ${q.label}`);
            });
        }
        return errs;
    };

    // ---- guardado (nuevo / editar) ----
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

            const respuestasPayload = {
                respuesta_q1:
                    form.ejecutado === "SI"
                        ? form.items.q1?.respuesta || null
                        : null,
                respuesta_q2:
                    form.ejecutado === "SI"
                        ? form.items.q2?.respuesta || null
                        : null,
                respuesta_q3:
                    form.ejecutado === "SI"
                        ? form.items.q3?.respuesta || null
                        : null,
                respuesta_q4:
                    form.ejecutado === "SI"
                        ? form.items.q4?.respuesta || null
                        : null,
                respuesta_q5:
                    form.ejecutado === "SI"
                        ? form.items.q5?.respuesta || null
                        : null,
                respuesta_q6:
                    form.ejecutado === "SI"
                        ? form.items.q6?.respuesta || null
                        : null,
                respuesta_q7:
                    form.ejecutado === "SI"
                        ? form.items.q7?.respuesta || null
                        : null,
                respuesta_q8:
                    form.ejecutado === "SI"
                        ? form.items.q8?.respuesta || null
                        : null,
                respuesta_q9:
                    form.ejecutado === "SI"
                        ? form.items.q9?.respuesta || null
                        : null,
                respuesta_q10:
                    form.ejecutado === "SI"
                        ? form.items.q10?.respuesta || null
                        : null,
            };

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
                periodicidad: "MENSUAL",
                ...respuestasPayload,
            };

            const todasSi = Q_MENSUAL.every(
                (q) => form.items[q.key]?.respuesta === "SI"
            );

            let error;

            if (editingId) {
                // 🔵 EDICIÓN (desde la campanita normalmente)
                let updatePayload = { ...basePayload };

                if (form.ejecutado === "SI" && todasSi) {
                    // ✅ Todo SI → COMPLETADO (verde en campanita)
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: baseDate,
                        proximo_mantenimiento: null,
                        completado: true,
                        pendiente_nuevo: true,
                        fecha_completado: new Date().toISOString(),
                    };
                } else if (form.ejecutado === "NO") {
                    // ❌ NO ejecutado → +7 días, sigue vencido/PROX7
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: null,
                        proximo_mantenimiento: addDays(baseDate, 7),
                        completado: false,
                        pendiente_nuevo: false,
                        fecha_completado: null,
                    };
                } else {
                    // ejecutado = "SI" pero con alguna NO → sigue con próximo mto (no COMPLETADO)
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
                // 🟢 NUEVO REGISTRO (no marca completado, solo programa)
                let ultimo = null;
                let proximo = null;

                if (form.ejecutado === "NO") {
                    proximo = addDays(baseDate, 7);
                } else {
                    // Mensual
                    ultimo = baseDate;
                    proximo = addMonths(baseDate, 1);
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

    // ---- revisado ----
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
                            revisado_por_username: next
                                ? username
                                : null,
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

    // ---- acciones Ver / Editar ----
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
                    placeholder="Buscar (ej. H-ENF-V-01, técnico, notas)"
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
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce(
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
            consecutivo:
                r.cantidad != null
                    ? String(r.cantidad).padStart(2, "0")
                    : "",
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
        XLSX.utils.book_append_sheet(wb, ws, "Vibrador - Enfriador");
        XLSX.writeFile(
            wb,
            `Horno_Enfriador_Vibrador_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );
    };

    const viewQuestions = !viewRow ? [] : Q_MENSUAL;

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1 className="flex align-items-center gap-2">
                <img src={logo2} alt="mosca" className="logo2" />
                Registro — Vibrador (Enfriador de Larva)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición base (ID):</b> {POSICION_ID_BASE} &nbsp; | &nbsp;{" "}
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
                <Column
                    header="Cantidad"
                    body={(r) =>
                        r.cantidad != null
                            ? String(r.cantidad).padStart(2, "0")
                            : ""
                    }
                    sortable
                />
                <Column
                    field="periodicidad"
                    header="Periodicidad"
                    sortable
                />
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
                    body={actionsTemplate}
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
                        ? "Editar registro — Vibrador (Enfriador)"
                        : "Nuevo registro — Vibrador (Enfriador)"
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
                        <label className="font-bold">Periodicidad</label>
                        <Dropdown
                            value="MENSUAL"
                            options={PERIODOS}
                            disabled
                        />

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
                        <InputText value={POSICION_ID_BASE} disabled />
                    </div>


                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Técnico{" "}
                            {submitted && !form.tecnico && (
                                <small className="p-error">
                                    {" "}
                                    Requerido
                                </small>
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
                            Cantidad{" "}
                            {submitted && !form.cantidad && (
                                <small className="p-error">
                                    {" "}
                                    Requerido
                                </small>
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
                            ¿Se va a efectuar el mantenimiento?*{" "}
                            {submitted && !form.ejecutado && (
                                <small className="p-error">
                                    {" "}
                                    Requerido
                                </small>
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

                    {form.ejecutado === "SI" && (
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
                                    {Q_MENSUAL.map((q) => {
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

            {/* Dialog VER — mismo formato que Vibrador/BandaEntrada/BandaSalida */}
            <Dialog
                visible={viewDialogOpen}
                onHide={hideViewDialog}
                header="Detalle del registro"
                style={{ width: "60vw", maxWidth: 900 }}
                modal
            >
                {!viewRow ? (
                    <p>No hay datos para mostrar.</p>
                ) : (
                    <>
                        <p>
                            <b>ID:</b> {viewRow.posicion_id} &nbsp; | &nbsp;
                            <b>Equipo:</b> {viewRow.equipo} &nbsp; | &nbsp;
                            <b>Registro:</b> {viewRow.registro} &nbsp; | &nbsp;
                            <b>Periodicidad:</b> {viewRow.periodicidad}
                        </p>
                        <p>
                            <b>Consecutivo:</b>{" "}
                            {viewRow.cantidad !== null &&
                                viewRow.cantidad !== undefined
                                ? String(viewRow.cantidad).padStart(2, "0")
                                : "—"}
                        </p>
                        <p>
                            <b>Fecha intervención:</b>{" "}
                            {fmtDMY(viewRow.fecha_registro)} &nbsp; | &nbsp;
                            <b>Hora:</b> {viewRow.hora_registro || "—"}
                        </p>
                        <p>
                            <b>Técnico:</b> {viewRow.tecnico || "—"}
                        </p>

                        <hr />

                        <div className="grid">
                            {viewQuestions.map((q, idx) => {
                                const col = `respuesta_q${idx + 1}`;
                                const val = viewRow[col] || "—";
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
                            {viewRow.observaciones || "—"}
                        </p>
                    </>
                )}
            </Dialog>

        </div>
    );
}
