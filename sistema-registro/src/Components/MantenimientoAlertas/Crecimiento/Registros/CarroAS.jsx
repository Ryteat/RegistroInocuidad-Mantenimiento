// src/Components/MantenimientoAlertas/Crecimiento/Registros/CarroAS.jsx
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

/* ===== Helpers de fecha (mismo patrón) ===== */
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

/* ===== Constantes de este registro (CRE-C-AS) ===== */
const POSICION_BASE = "CRE-C-AS";
const EQUIPO = "CARRO";
const REGISTRO = "AS";
const TABLE = "mto_crecimiento_carro_as";

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];

// Opciones O / I / RD / RP por pregunta
const ESTADOS_ACCION = [
    { label: "O - OK", value: "O" },
    { label: "I - Incompleto", value: "I" },
    { label: "RD - Reparado", value: "RD" },
    { label: "RP - Reemplazado", value: "RP" },
];

// Solo tiene periodicidad BISEMANAL
const PERIODOS = [{ label: "Bisemanal", value: "BISEMANAL" }];

/** Cantidades (4 carros): 01, 02, 03, 04 */
const CANTIDADES = [
    { label: "01", value: 1 },
    { label: "02", value: 2 },
    { label: "03", value: 3 },
    { label: "04", value: 4 },
];

const buildPosicionId = (cantidad) => {
    if (!cantidad) return POSICION_BASE;
    return `${POSICION_BASE}-${String(cantidad).padStart(2, "0")}`;
};

/* ===== Preguntas BISEMANAL (texto literal de la OM) ===== */
const Q_BISEMANAL = [
    { key: "q1", label: "Verificar desgaste patines" },
    { key: "q2", label: "Comprobar estado ruedas carro" },
    { key: "q3", label: "Comprobar holguras ejes de ruedas carro" },
    { key: "q4", label: "Engrasar rodamientos UCP207" },
    { key: "q5", label: "Verificar freno motor traslacion" },
    { key: "q6", label: "Comprobar estructura del carro" },
    {
        key: "q7",
        label: "Comprobar estado y desgaste escobillas alimentacion RS",
    },
    {
        key: "q8",
        label:
            "Limpieza y/o sustitución de filtros. Funcionamiento ventiladores",
    },
    {
        key: "q9",
        label: "Revisión limpieza y enfoque de escaner posicionamiento",
    },
    {
        key: "q10",
        label: "Verificar sistema carga de baterías / condensadores",
    },
    {
        key: "q11",
        label: "Comprobar conexiones y estado resistencias de frenado",
    },
    {
        key: "q12",
        label: "Aspirado de cuadros eléctricos. Limpieza si procede",
    },
    { key: "q13", label: "Reapriete de terminales" },
];

const emptyForm = () => ({
    fecha_registro: toDateISO(),
    hora_registro: toHM(),
    posicion_id: POSICION_BASE, // base, sin sufijo
    equipo: EQUIPO,
    registro: REGISTRO,
    cantidad: null, // 1..4
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

export default function CarroAS() {
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

    const [filtroRevisado, setFiltroRevisado] = useState("all");

    // Dialog de VER
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewRecord, setViewRecord] = useState(null);

    // Dialog de "Registro con puntos pendientes"
    const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
    const [pendingDialogRecordId, setPendingDialogRecordId] = useState("");

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

    const buildFormFromRow = (row) => {
        const items = {};
        Q_BISEMANAL.forEach((q, idx) => {
            const col = `respuesta_q${idx + 1}`;
            items[q.key] = { respuesta: row[col] || "" };
        });

        return {
            fecha_registro: row.fecha_registro || toDateISO(),
            hora_registro: row.hora_registro || toHM(),
            posicion_id: row.posicion_id || POSICION_BASE,
            equipo: row.equipo || EQUIPO,
            registro: row.registro || REGISTRO,
            cantidad: row.cantidad || null,
            tecnico: row.tecnico || "",
            ejecutado: row.ejecutado || "",
            observaciones: row.observaciones || "",
            periodicidad: row.periodicidad || "",
            items,
            fecha_correccion_preview: fmtDMYHM(row.created_at),
        };
    };

    const openEdit = (row) => {
        setForm(buildFormFromRow(row));
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
        const items = Q_BISEMANAL.reduce(
            (acc, q) => ({ ...acc, [q.key]: { respuesta: "" } }),
            {}
        );
        setForm((p) => ({ ...p, periodicidad: value, items }));
    };

    const onCantidadChange = (value) => {
        const cantidadNum = value ?? null;
        setForm((prev) => ({
            ...prev,
            cantidad: cantidadNum,
            posicion_id: buildPosicionId(cantidadNum),
        }));
    };

    const onEstadoAccionChange = (key, value) =>
        setForm((p) => ({
            ...p,
            items: { ...p.items, [key]: { respuesta: value } },
        }));

    const validate = () => {
        const errs = [];
        if (!form.periodicidad) errs.push("Seleccione la periodicidad.");
        if (!form.cantidad) errs.push("Seleccione la cantidad (Carro 01–04).");
        if (!form.tecnico?.trim())
            errs.push("El campo Técnico es requerido.");
        if (!form.ejecutado)
            errs.push("Indique si se va a efectuar el mantenimiento.");
        if (form.ejecutado === "NO" && !form.observaciones.trim())
            errs.push("Explique por qué NO se efectuó (Observaciones).");
        if (form.ejecutado === "SI") {
            Q_BISEMANAL.forEach((q) => {
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
            const cantidadNum = form.cantidad ? Number(form.cantidad) : null;
            const posicionConsecutiva = buildPosicionId(cantidadNum);

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
                posicion_id: posicionConsecutiva,
                equipo: EQUIPO,
                registro: REGISTRO,
                cantidad: cantidadNum,
                tecnico: form.tecnico,
                ejecutado: form.ejecutado,
                observaciones: form.observaciones || null,
                periodicidad: form.periodicidad,
                ...respuestasPayload,
            };

            let error;

            if (editingId) {
                // EDICIÓN: no tocamos completado/pendiente_nuevo aquí
                const updatePayload = {
                    ...basePayload,
                };

                ({ error } = await supabase
                    .from(TABLE)
                    .update(updatePayload)
                    .eq("id", editingId));
            } else {
                // NUEVO REGISTRO
                const proximo =
                    form.ejecutado === "NO"
                        ? addDays(baseDate, 7) // NO ejecutado → +7 días
                        : addDays(baseDate, 14); // BISEMANAL → +14 días

                const insertPayload = {
                    ...basePayload,
                    ultimo_mantenimiento:
                        form.ejecutado === "SI" ? baseDate : null,
                    proximo_mantenimiento: proximo,
                    completado: false,
                    pendiente_nuevo: false,
                    fecha_completado: null,
                };

                ({ error } = await supabase.from(TABLE).insert([insertPayload]));
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

    /* ===== Completar registro (desde este módulo) ===== */
    const handleCompletar = async (row) => {
        try {
            const { error } = await supabase
                .from(TABLE)
                .update({
                    completado: true,
                    pendiente_nuevo: true,
                    proximo_mantenimiento: null,
                    fecha_completado: new Date().toISOString(),
                })
                .eq("id", row.id);

            if (error) {
                // Si viene del trigger de "I - Incompleto"
                if (
                    error.message &&
                    error.message.includes("Incompleto")
                ) {
                    setPendingDialogRecordId(row.posicion_id || row.id);
                    setPendingDialogOpen(true);
                    return;
                }

                showToast(
                    "error",
                    "No se pudo completar",
                    error.message || "Error al completar el registro"
                );
                return;
            }

            showToast(
                "success",
                "Completado",
                "El registro fue marcado como Completado."
            );
            await fetchRows();
        } catch (e) {
            console.error(e);
            showToast(
                "error",
                "Error",
                e.message || "No se pudo completar el registro"
            );
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
                    placeholder="Buscar (ej. CRE-C-AS-01, técnico, notas)"
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

    const countEstado = (row, val) =>
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
            "#O": countEstado(r, "O"),
            "#I": countEstado(r, "I"),
            "#RD": countEstado(r, "RD"),
            "#RP": countEstado(r, "RP"),
            revisado: r.revisado ? "Sí" : "No",
            creado: fmtDMYHM(r.created_at),
        }));
        const ws = XLSX.utils.json_to_sheet(out);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Carro AS");
        XLSX.writeFile(
            wb,
            `Crecimiento_CarroAS_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );
    };

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

    const viewQuestionsForRow = () => Q_BISEMANAL; // solo BISEMANAL aquí

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1 className="flex align-items-center gap-2">
                <img src={logo2} alt="mosca" className="logo2" />
                Registro — Carro (AS)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición base:</b> {POSICION_BASE} &nbsp; | &nbsp;{" "}
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
                <Column field="cantidad" header="Cantidad" sortable />
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
                    style={{ width: "8rem", textAlign: "center" }}
                />
                <Column
                    header="Acciones"
                    body={accionesTemplate}
                    exportable={false}
                    style={{ width: "18rem" }}
                />
            </DataTable>

            {/* Dialog NUEVO / EDITAR */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "72vw", maxWidth: 1100 }}
                header={
                    editingId
                        ? "Editar registro — Carro (AS)"
                        : "Nuevo registro — Carro (AS)"
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
                            <b>Bisemanal</b>: +14 días (si NO ejecutado: +7
                            días).
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
                        <label className="font-bold">Posición ID</label>
                        <InputText value={POSICION_BASE} disabled />
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
                            onChange={(e) =>
                                onChange("tecnico", e.target.value)
                            }
                            placeholder="Nombre del técnico"
                        />
                    </div>

                    <div className="field col-6 md:col-3">
                        <label className="font-bold">
                            Cantidad*{" "}
                            {submitted && !form.cantidad && (
                                <small className="p-error"> Requerido</small>
                            )}
                        </label>
                        <Dropdown
                            value={form.cantidad}
                            options={CANTIDADES}
                            onChange={(e) => onCantidadChange(e.value)}
                            placeholder="Seleccione cantidad"
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
                                    Checklist — BISEMANAL
                                </div>
                                <div className="grid">
                                    {Q_BISEMANAL.map((q) => {
                                        const val =
                                            form.items[q.key]?.respuesta || "";
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
                                                    options={ESTADOS_ACCION}
                                                    onChange={(e) =>
                                                        onEstadoAccionChange(
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

            {/* Dialog VER (solo lectura) */}
            <Dialog
                visible={viewDialogOpen}
                onHide={() => setViewDialogOpen(false)}
                header="Detalle del registro — Carro (AS)"
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
                            <b>Registro:</b> {viewRecord.registro} &nbsp; |
                            &nbsp;
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

            {/* Dialog: Registro con puntos pendientes (I - Incompleto) */}
            <Dialog
                visible={pendingDialogOpen}
                onHide={() => setPendingDialogOpen(false)}
                header="Registro con puntos pendientes"
                style={{ width: "32rem", maxWidth: "90vw" }}
                modal
            >
                <p>
                    Este registro tiene respuestas en{" "}
                    <b>Incompleto (I)</b> o no ha sido ejecutado. Debe corregir
                    el registro antes de marcarlo como{" "}
                    <b>Completado</b>.
                </p>
                <p className="mt-3">
                    <b>ID:</b> {pendingDialogRecordId || "—"}
                </p>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button
                        label="Cerrar"
                        icon="pi pi-times"
                        outlined
                        onClick={() => setPendingDialogOpen(false)}
                    />
                    <Button
                        label="Ir al registro"
                        icon="pi pi-external-link"
                        onClick={() => {
                            setPendingDialogOpen(false);
                            const target = rows.find(
                                (r) => r.posicion_id === pendingDialogRecordId
                            );
                            if (target) {
                                openEdit(target);
                            }
                        }}
                    />
                </div>
            </Dialog>
        </div>
    );
}
