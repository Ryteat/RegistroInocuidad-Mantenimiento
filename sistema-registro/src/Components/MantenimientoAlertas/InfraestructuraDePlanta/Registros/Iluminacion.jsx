// src/Components/MantenimientoAlertas/InfraestructuraDePlanta/Registros/Iluminacion.jsx
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

// Hook de permisos de revisión
import useCanReview from "../../../Inocuidad/Registros/Hooks/useCanReview.js";

/* ===================== Helpers de fecha (seguros) ===================== */
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

const fmtDMY = (iso) => {
    if (!iso) return "—";
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

const addDays = (iso, days) => {
    const d = parseYMD(iso) ?? new Date();
    d.setDate(d.getDate() + Number(days || 0));
    return toDateISO(d);
};

const addMonths = (iso, months) => {
    const d = parseYMD(iso) ?? new Date();
    const origDay = d.getDate();
    d.setMonth(d.getMonth() + Number(months || 0));
    while (d.getDate() < origDay) d.setDate(d.getDate() - 1);
    return toDateISO(d);
};

/* ===================== Constantes del registro ===================== */
const POSICION_ID_BASE = "IN-I-G"; // base → se forma IN-I-G-01..08
const EQUIPO = "Iluminación";
const REGISTRO = "GENERAL";
const PERIODICIDAD = "MENSUAL";
const TABLE = "mto_iluminacion";

// Consecutivos 01..08 (string, igual que PanelElectrico)
const CANTIDAD_OPCIONES = Array.from({ length: 8 }, (_, idx) => {
    const v = String(idx + 1).padStart(2, "0");
    return { label: v, value: v };
});

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];

const QUESTIONS = [
    {
        key: "q1",
        label:
            "Revisar funcionamiento de luminarias en el área; reparar si es necesario",
    },
    {
        key: "q2",
        label: "Desmontar difusores si aplica y limpiarlos",
    },
    {
        key: "q3",
        label:
            "Verificar funcionamiento de los interruptores; reparar si es necesario",
    },
];

/* ===================== Estado inicial ===================== */
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
    periodicidad: PERIODICIDAD,
    items: QUESTIONS.reduce(
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

/* ===================== Componente ===================== */
export default function Iluminacion() {
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

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    /* --------------------- Carga de registros --------------------- */
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
          ejecutado, observaciones,
          respuesta_q1, respuesta_q2, respuesta_q3,
          periodicidad, ultimo_mantenimiento, proximo_mantenimiento,
          semana_proximo, anio_proximo,
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

    /* --------------------- Helpers de formulario --------------------- */
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
        const consecutivo = value || "01";
        setForm((p) => ({
            ...p,
            cantidad: consecutivo,
            posicion_id: `${POSICION_ID_BASE}-${consecutivo}`,
        }));
    };

    /* --------------------- Ver / Editar --------------------- */
    const openView = (row) => {
        setViewRow(row);
        setViewDialogOpen(true);
    };

    const openEdit = (row) => {
        const items = QUESTIONS.reduce((acc, q, index) => {
            const idx = index + 1;
            return {
                ...acc,
                [q.key]: { respuesta: row[`respuesta_q${idx}`] || "" },
            };
        }, {});

        let cantidadStr = "01";
        if (row.cantidad != null) {
            cantidadStr = String(row.cantidad).padStart(2, "0");
        } else if (row.posicion_id) {
            const parts = row.posicion_id.split("-");
            const last = parts[parts.length - 1];
            if (/^\d+$/.test(last)) {
                cantidadStr = last.padStart(2, "0");
            }
        }

        const posicionFinal =
            row.posicion_id || `${POSICION_ID_BASE}-${cantidadStr}`;

        setForm({
            fecha_registro: row.fecha_registro || toDateISO(),
            hora_registro: row.hora_registro || toHM(),
            posicion_id: posicionFinal,
            equipo: row.equipo || EQUIPO,
            registro: row.registro || REGISTRO,
            cantidad: cantidadStr,
            tecnico: row.tecnico || "",
            ejecutado: row.ejecutado || "",
            observaciones: row.observaciones || "",
            periodicidad: row.periodicidad || PERIODICIDAD,
            items,
            fecha_correccion_preview: fmtDMYHM(
                row.created_at || new Date()
            ),
        });
        setSubmitted(false);
        setEditingId(row.id);
        setDialogOpen(true);
    };

    /* --------------------- Validación --------------------- */
    const validate = () => {
        const errs = [];
        if (!form.cantidad) errs.push("Debe seleccionar el consecutivo (01–08).");
        if (!form.tecnico?.trim())
            errs.push("El campo Técnico es requerido.");
        if (!form.ejecutado)
            errs.push("Indique si se va a efectuar el mantenimiento.");

        if (form.ejecutado === "NO" && !form.observaciones.trim()) {
            errs.push("Explique por qué NO se efectuó (Observaciones).");
        }

        if (form.ejecutado === "SI") {
            QUESTIONS.forEach((q) => {
                if (!form.items[q.key]?.respuesta) {
                    errs.push(`Responda: ${q.label}`);
                }
            });
        }

        return errs;
    };

    /* --------------------- Guardado (insert / update) --------------------- */
    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) {
            showToast("warn", "Validación", errs[0]);
            return;
        }

        try {
            const baseDate = form.fecha_registro || toDateISO();

            const respuestasPayload = Object.fromEntries(
                Array.from({ length: 3 }, (_, i) => {
                    const key = `q${i + 1}`;
                    return [
                        `respuesta_q${i + 1}`,
                        form.ejecutado === "SI"
                            ? form.items[key]?.respuesta || null
                            : null,
                    ];
                })
            );

            const cantidadNumero = form.cantidad
                ? parseInt(form.cantidad, 10)
                : null;

            const posicionFinal =
                form.posicion_id ||
                `${POSICION_ID_BASE}-${form.cantidad || "01"}`;

            const basePayload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                posicion_id: posicionFinal,
                equipo: form.equipo || EQUIPO,
                registro: form.registro || REGISTRO,
                cantidad: Number.isNaN(cantidadNumero)
                    ? null
                    : cantidadNumero,
                tecnico: form.tecnico,
                ejecutado: form.ejecutado,
                observaciones: form.observaciones || null,
                periodicidad: PERIODICIDAD,
                ...respuestasPayload,
            };

            const todasSi = QUESTIONS.every(
                (q) => form.items[q.key]?.respuesta === "SI"
            );

            let error;

            if (editingId) {
                // 🔵 EDICIÓN (p. ej. al corregir un registro VENCIDO desde la campanita)
                let updatePayload = { ...basePayload };

                if (form.ejecutado === "SI" && todasSi) {
                    // ✅ Todo SI → COMPLETADO (queda verde en campanita, pendiente_nuevo=true)
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: baseDate,
                        proximo_mantenimiento: null,
                        completado: true,
                        pendiente_nuevo: true,
                        fecha_completado: new Date().toISOString(),
                    };
                } else if (form.ejecutado === "NO") {
                    // ❌ NO ejecutado → se reprograma +7 días, no se completa
                    updatePayload = {
                        ...updatePayload,
                        ultimo_mantenimiento: null,
                        proximo_mantenimiento: addDays(baseDate, 7),
                        completado: false,
                        pendiente_nuevo: false,
                        fecha_completado: null,
                    };
                } else {
                    // ejecutado = "SI" pero con alguna respuesta "NO"
                    const proximo = addMonths(baseDate, 1);
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
                // 🟢 NUEVO REGISTRO (flujo normal desde el formulario)
                let ultimo = null;
                let proximo = null;

                if (form.ejecutado === "NO") {
                    proximo = addDays(baseDate, 7);
                } else {
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
            hideDialog();
            await fetchRows();
        } catch (e) {
            console.error(e);
            showToast(
                "error",
                "Error",
                e.message || "No se pudo guardar"
            );
        }
    };

    const countSiNo = (row, val) =>
        [1, 2, 3].reduce(
            (acc, i) =>
                acc +
                ((row[`respuesta_q${i}`] || "") === val ? 1 : 0),
            0
        );

    /* --------------------- Columna Revisado --------------------- */
    const revisadoTemplate = (row) => {
        if (!canReview)
            return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            const { error } = await supabase
                .from(TABLE)
                .update({
                    revisado: next,
                    revisado_por_username: next ? username : null,
                    revisado_fecha: next
                        ? new Date().toISOString()
                        : null,
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
                    inputId={`chk-rev-${row.id}`}
                    checked={!!row.revisado}
                    onChange={(e) => onToggle(e.checked)}
                />
                <label
                    htmlFor={`chk-rev-${row.id}`}
                    className="text-sm"
                >
                    Revisado
                </label>
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
                    onInput={(e) =>
                        setGlobalFilter(e.target.value)
                    }
                    placeholder="Buscar (ej. IN-I-G-01, técnico, notas)"
                />
            </span>
            <div className="flex align-items-center gap-2">
                <span className="text-sm font-medium">
                    Filtro:
                </span>
                <Dropdown
                    value={filtroRevisado}
                    onChange={(e) =>
                        setFiltroRevisado(e.value)
                    }
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
        r.proximo_mantenimiento
            ? `${r.semana_proximo} año ${r.anio_proximo}`
            : "—";

    const cantidadBody = (r) =>
        r.cantidad != null
            ? String(r.cantidad).padStart(2, "0")
            : "";

    const actionTemplate = (row) => (
        <div className="flex align-items-center justify-content-center gap-2">
            <Button
                label="Ver"
                icon="pi pi-eye"
                outlined
                size="small"
                onClick={() => openView(row)}
            />
            <Button
                label="Editar"
                icon="pi pi-pencil"
                size="small"
                onClick={() => openEdit(row)}
            />
        </div>
    );

    const preguntasView = (row) =>
        QUESTIONS.map((q, idx) => ({
            label: q.label,
            respuesta: row[`respuesta_q${idx + 1}`] || "",
        }));

    /* --------------------- Exportar Excel --------------------- */
    const exportXlsx = () => {
        if (!rows?.length) {
            showToast(
                "warn",
                "Exportación",
                "No hay datos"
            );
            return;
        }
        const out = rows.map((r) => ({
            posicion: r.posicion_id,
            equipo: r.equipo,
            registro: r.registro ?? "",
            cantidad: cantidadBody(r),
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
        XLSX.utils.book_append_sheet(wb, ws, "Iluminacion");
        XLSX.writeFile(
            wb,
            `Iluminacion_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );
    };

    /* --------------------- Render --------------------- */
    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />

            <h1 className="flex align-items-center gap-2">
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Mantenimiento – Iluminación (General)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición base (ID):</b> {POSICION_ID_BASE} &nbsp;
                    | &nbsp;
                    <b>Equipo:</b> {EQUIPO} &nbsp; | &nbsp;
                    <b>Registro:</b> {REGISTRO} &nbsp;


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
                    onClick={() =>
                        navigate("/MantenimientoAlertas")
                    }
                    className="menu-button"
                >
                    Menú Principal
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
                onSelectionChange={(e) =>
                    setSelected(e.value)
                }
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
                <Column
                    selectionMode="multiple"
                    exportable={false}
                />
                <Column
                    field="posicion_id"
                    header="Posición"
                    sortable
                />

                <Column
                    field="equipo"
                    header="Equipo"
                    sortable
                />
                <Column
                    field="registro"
                    header="Registro"
                />
                <Column
                    header="Cantidad"
                    body={cantidadBody}
                />
                <Column
                    field="periodicidad"
                    header="Periodicidad"
                />
                <Column
                    field="ultimo_mantenimiento"
                    header="Último Mantenimiento"
                    body={(r) => fmtDMY(r.ultimo_mantenimiento)}
                    sortable
                />
                <Column
                    field="proximo_mantenimiento"
                    header="Próximo Mantenimiento"
                    body={(r) => fmtDMY(r.proximo_mantenimiento)}
                    sortable
                />
                <Column
                    header="Semana"
                    body={semanaBody}
                />
                <Column
                    field="tecnico"
                    header="Técnico"
                    sortable
                />
                <Column
                    field="created_at"
                    header="Fecha de Registro"
                    body={(r) => fmtDMYHM(r.created_at)}
                    sortable
                />
                <Column
                    header="Revisado"
                    body={revisadoTemplate}
                    style={{
                        width: "10rem",
                        textAlign: "center",
                    }}
                />
                <Column
                    header="Acciones"
                    body={actionTemplate}
                    exportable={false}
                    style={{ width: "14rem", textAlign: "center" }}
                />
            </DataTable>

            {/* Diálogo de crear / editar */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "72vw", maxWidth: 1100 }}
                header={
                    editingId
                        ? "Editar registro – Iluminación"
                        : "Nuevo registro – Iluminación"
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
                {/* Periodicidad fija mensual (solo visual) */}
                <div className="field col-12 md:col-3">
                    <label className="font-bold">
                        Periodicidad
                    </label>
                    <InputText
                        value="Mensual"
                        disabled
                    />
                </div>
                <div className="p-fluid grid">
                    {/* Intervención */}
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">
                            Fecha intervención
                        </label>
                        <InputText
                            type="date"
                            value={form.fecha_registro}
                            onChange={(e) =>
                                onChange(
                                    "fecha_registro",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">
                            Hora intervención
                        </label>
                        <InputText
                            type="time"
                            value={form.hora_registro}
                            onChange={(e) =>
                                onChange(
                                    "hora_registro",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Posición(ID)
                        </label>
                        <InputText
                            value={form.posicion_id}
                            disabled
                        />
                    </div>
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Equipo
                        </label>
                        <InputText
                            value={form.equipo}
                            disabled
                        />
                    </div>

                    {/* Técnico */}
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Técnico{" "}
                            {submitted &&
                                !form.tecnico && (
                                    <small className="p-error">
                                        {" "}
                                        Requerido
                                    </small>
                                )}
                        </label>
                        <InputText
                            value={form.tecnico}
                            onChange={(e) =>
                                onChange(
                                    "tecnico",
                                    e.target.value
                                )
                            }
                            placeholder="Nombre del técnico"
                        />
                    </div>

                    {/* Consecutivo 01–08 */}
                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Cantidad{" "}
                            {submitted &&
                                !form.cantidad && (
                                    <small className="p-error">
                                        {" "}
                                        Requerido
                                    </small>
                                )}
                        </label>
                        <Dropdown
                            value={form.cantidad}
                            options={CANTIDAD_OPCIONES}
                            onChange={(e) =>
                                onCantidadChange(e.value)
                            }
                            placeholder="Seleccione"
                        />

                    </div>



                    {/* ¿Se ejecuta? */}
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            ¿Se va a efectuar el mantenimiento?*{" "}
                            {submitted &&
                                !form.ejecutado && (
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
                                onChange(
                                    "ejecutado",
                                    e.value
                                )
                            }
                            placeholder="Seleccione"
                        />
                    </div>

                    {form.ejecutado === "NO" && (
                        <div className="field col-12">
                            <label className="font-bold">
                                Observaciones (obligatorio si
                                NO){" "}
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
                                Se reprogramará automáticamente
                                para dentro de <b>7 días</b>.
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
                                    ILUMINACIÓN – Lista de
                                    verificación
                                </div>
                                <div className="grid">
                                    {QUESTIONS.map((q) => {
                                        const val =
                                            form.items[q.key]
                                                ?.respuesta || "";
                                        return (
                                            <div
                                                key={q.key}
                                                className="col-12 md:col-6"
                                            >
                                                <label className="font-bold">
                                                    {q.label}*{" "}
                                                    {submitted &&
                                                        !val && (
                                                            <small className="p-error">
                                                                {" "}
                                                                Requerido
                                                            </small>
                                                        )}
                                                </label>
                                                <Dropdown
                                                    value={val}
                                                    options={
                                                        YESNO
                                                    }
                                                    onChange={(
                                                        e
                                                    ) =>
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

            {/* Diálogo de VER (solo lectura) */}
            <Dialog
                visible={viewDialogOpen}
                style={{ width: "60vw", maxWidth: 900 }}
                header="Detalle del registro – Iluminación"
                modal
                onHide={() => setViewDialogOpen(false)}
            >
                {viewRow && (
                    <div className="p-fluid grid">
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">
                                Posición (ID)
                            </label>
                            <p>{viewRow.posicion_id}</p>
                        </div>
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">
                                Periodicidad
                            </label>
                            <p>{viewRow.periodicidad || "—"}</p>
                        </div>
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">
                                Técnico
                            </label>
                            <p>{viewRow.tecnico || "—"}</p>
                        </div>

                        <div className="field col-12 md:col-4">
                            <label className="font-bold">
                                Fecha intervención
                            </label>
                            <p>{fmtDMY(viewRow.fecha_registro)}</p>
                        </div>
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">
                                Hora intervención
                            </label>
                            <p>{viewRow.hora_registro || "—"}</p>
                        </div>
                        <div className="field col-12 md:col-4">
                            <label className="font-bold">
                                Ejecutado
                            </label>
                            <p>{viewRow.ejecutado || "—"}</p>
                        </div>

                        <div className="field col-12">
                            <label className="font-bold">
                                Observaciones
                            </label>
                            <p>{viewRow.observaciones || "—"}</p>
                        </div>

                        <div className="field col-12">
                            <label className="font-bold">
                                Checklist
                            </label>
                            <div
                                style={{
                                    border: "1px solid #d1d5db",
                                    borderRadius: 8,
                                    padding: 12,
                                }}
                            >
                                <div className="grid">
                                    {preguntasView(viewRow).map(
                                        (pq, idx) => (
                                            <div
                                                key={idx}
                                                className="col-12 md:col-6"
                                            >
                                                <p>
                                                    <b>{pq.label}</b>
                                                    <br />
                                                    Respuesta:{" "}
                                                    {pq.respuesta ||
                                                        "—"}
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
