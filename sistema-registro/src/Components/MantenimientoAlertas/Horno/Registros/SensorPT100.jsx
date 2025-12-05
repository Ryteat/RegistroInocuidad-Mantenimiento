// src/Components/MantenimientoAlertas/Horno/Registros/SensorPT100.jsx
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

/* ===== Helpers (idénticos a tus otros registros) ===== */
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
const addMonths = (ymd, m) => {
    const b = parseYMD(ymd);
    b.setMonth(b.getMonth() + Number(m || 0));
    return toDateISO(b);
};

/* ===== Constantes del registro ===== */
const POSICION_ID = "H-HM-SPT"; // base; se guardará como H-HM-SPT-01..08
const EQUIPO = "HORNO MULTILEVEL";
const REGISTRO = "SENSOR PT100";
const TABLE = "mto_horno_multilevel_sensor_pt100";

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];
const PERIODOS = [{ label: "Trimestral", value: "TRIMESTRAL" }];

// Cantidad fija 8 → consecutivo 01..08
const CANTIDAD_OPTIONS = Array.from({ length: 8 }, (_, i) => {
    const v = String(i + 1).padStart(2, "0");
    return { label: v, value: v };
});

const emptyForm = () => ({
    id: null,
    fecha_registro: toDateISO(),
    hora_registro: toHM(),
    posicion_id: POSICION_ID,
    equipo: EQUIPO,
    registro: REGISTRO,
    cantidad: "",
    tecnico: "",
    ejecutado: "",
    observaciones: "",
    periodicidad: "TRIMESTRAL",

    medir_rtd: false,
    medir_indicador: false,

    // RTD PT-100 (5 lecturas + patrón)
    rtd_pt100_1: "",
    patron_rtd_1: "",
    rtd_pt100_2: "",
    patron_rtd_2: "",
    rtd_pt100_3: "",
    patron_rtd_3: "",
    rtd_pt100_4: "",
    patron_rtd_4: "",
    rtd_pt100_5: "",
    patron_rtd_5: "",

    // Indicador digital (5 lecturas + patrón)
    ind_dig_1: "",
    patron_ind_1: "",
    ind_dig_2: "",
    patron_ind_2: "",
    ind_dig_3: "",
    patron_ind_3: "",
    ind_dig_4: "",
    patron_ind_4: "",
    ind_dig_5: "",
    patron_ind_5: "",

    fecha_correccion_preview: fmtDMYHM(new Date()),
});

const packRow = (r) => ({
    ...r,
    tecnico: r.tecnico ?? "",
    observaciones: r.observaciones ?? "",
});

// Convertir un row de BD al formato de formulario (para Editar)
const rowToForm = (r) => ({
    id: r.id,
    fecha_registro: r.fecha_registro || toDateISO(),
    hora_registro: r.hora_registro || toHM(),
    posicion_id: r.posicion_id || POSICION_ID,
    equipo: r.equipo || EQUIPO,
    registro: r.registro || REGISTRO,
    cantidad: r.cantidad ? String(r.cantidad).padStart(2, "0") : "",
    tecnico: r.tecnico ?? "",
    ejecutado: r.ejecutado ?? "",
    observaciones: r.observaciones ?? "",
    periodicidad: r.periodicidad || "TRIMESTRAL",

    medir_rtd: !!r.medir_rtd,
    medir_indicador: !!r.medir_indicador,

    rtd_pt100_1: r.rtd_pt100_1 ?? "",
    patron_rtd_1: r.patron_rtd_1 ?? "",
    rtd_pt100_2: r.rtd_pt100_2 ?? "",
    patron_rtd_2: r.patron_rtd_2 ?? "",
    rtd_pt100_3: r.rtd_pt100_3 ?? "",
    patron_rtd_3: r.patron_rtd_3 ?? "",
    rtd_pt100_4: r.rtd_pt100_4 ?? "",
    patron_rtd_4: r.patron_rtd_4 ?? "",
    rtd_pt100_5: r.rtd_pt100_5 ?? "",
    patron_rtd_5: r.patron_rtd_5 ?? "",

    ind_dig_1: r.ind_dig_1 ?? "",
    patron_ind_1: r.patron_ind_1 ?? "",
    ind_dig_2: r.ind_dig_2 ?? "",
    patron_ind_2: r.patron_ind_2 ?? "",
    ind_dig_3: r.ind_dig_3 ?? "",
    patron_ind_3: r.patron_ind_3 ?? "",
    ind_dig_4: r.ind_dig_4 ?? "",
    patron_ind_4: r.patron_ind_4 ?? "",
    ind_dig_5: r.ind_dig_5 ?? "",
    patron_ind_5: r.patron_ind_5 ?? "",

    fecha_correccion_preview: fmtDMYHM(r.created_at || new Date()),
});

export default function SensorPT100() {
    const navigate = useNavigate();
    const toast = useRef(null);

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState("new"); // 'new' | 'edit'
    const isViewMode = dialogMode === "view"; // nunca usamos 'view' ahora, se mantiene en false para no tocar lógica
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    const [filtroRevisado, setFiltroRevisado] = useState("all");
    const { canReview, username } = useCanReview();

    // 🔵 Dialogo exclusivo para VER (igual patrón TamizMotor / PanelControlGeneral)
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewRecord, setViewRecord] = useState(null);

    const showToast = (sev, sum, det, life = 3000) =>
        toast.current?.show({ severity: sev, summary: sum, detail: det, life });

    /* -------- cargar -------- */
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
        medir_rtd, medir_indicador,
        rtd_pt100_1, patron_rtd_1, rtd_pt100_2, patron_rtd_2, rtd_pt100_3, patron_rtd_3,
        rtd_pt100_4, patron_rtd_4, rtd_pt100_5, patron_rtd_5,
        ind_dig_1, patron_ind_1, ind_dig_2, patron_ind_2, ind_dig_3, patron_ind_3,
        ind_dig_4, patron_ind_4, ind_dig_5, patron_ind_5,
        ultimo_mantenimiento, proximo_mantenimiento,
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

    const openNew = () => {
        setForm(emptyForm());
        setSubmitted(false);
        setDialogMode("new");
        setDialogOpen(true);
    };

    // 🔵 Nuevo comportamiento de VER: abre diálogo aparte SOLO lectura
    const openView = (row) => {
        setViewRecord(row);
        setViewDialogOpen(true);
    };

    const openEdit = (row) => {
        setForm(rowToForm(row));
        setSubmitted(false);
        setDialogMode("edit");
        setDialogOpen(true);
    };

    const hideDialog = () => {
        setDialogOpen(false);
        setSubmitted(false);
    };

    const onChange = (f, v) =>
        setForm((p) => ({
            ...p,
            [f]: v,
        }));

    // Cantidad 01..08 → también arma el ID con consecutivo
    const onCantidadChange = (value) => {
        setForm((prev) => ({
            ...prev,
            cantidad: value,
            posicion_id: value ? `${POSICION_ID}-${value}` : POSICION_ID,
        }));
    };

    /* -------- validación -------- */
    const validate = () => {
        const errs = [];
        if (!form.tecnico?.trim())
            errs.push("El campo Técnico es requerido.");
        if (!form.cantidad)
            errs.push("Seleccione la Cantidad (consecutivo 01–08).");
        if (!form.ejecutado)
            errs.push("Indique si se va a efectuar el mantenimiento.");
        if (form.ejecutado === "NO" && !form.observaciones.trim())
            errs.push("Explique por qué NO se efectuó (Observaciones).");

        if (form.ejecutado === "SI") {
            if (!form.medir_rtd && !form.medir_indicador) {
                errs.push(
                    "Seleccione al menos una sección (Sensor PT100 o Indicador Digital)."
                );
            }
            const needPair = (a, b, label) => {
                if (!a?.trim() || !b?.trim())
                    errs.push(`Complete ${label}`);
            };
            if (form.medir_rtd) {
                [
                    [form.rtd_pt100_1, form.patron_rtd_1, "RTD/Patrón #1"],
                    [form.rtd_pt100_2, form.patron_rtd_2, "RTD/Patrón #2"],
                    [form.rtd_pt100_3, form.patron_rtd_3, "RTD/Patrón #3"],
                    [form.rtd_pt100_4, form.patron_rtd_4, "RTD/Patrón #4"],
                    [form.rtd_pt100_5, form.patron_rtd_5, "RTD/Patrón #5"],
                ].forEach(([a, b, l]) => needPair(a, b, l));
            }
            if (form.medir_indicador) {
                [
                    [form.ind_dig_1, form.patron_ind_1, "Indicador/Patrón #1"],
                    [form.ind_dig_2, form.patron_ind_2, "Indicador/Patrón #2"],
                    [form.ind_dig_3, form.patron_ind_3, "Indicador/Patrón #3"],
                    [form.ind_dig_4, form.patron_ind_4, "Indicador/Patrón #4"],
                    [form.ind_dig_5, form.patron_ind_5, "Indicador/Patrón #5"],
                ].forEach(([a, b, l]) => needPair(a, b, l));
            }
        }
        return errs;
    };

    /* -------- guardado (insert / update) -------- */
    const buildPayload = () => {
        const baseDate = form.fecha_registro || toDateISO();
        const proximo =
            form.ejecutado === "NO"
                ? addDays(baseDate, 7)
                : addMonths(baseDate, 3);

        const cantidadNum = form.cantidad
            ? Number(form.cantidad)
            : null;

        const posicionCompleta = form.cantidad
            ? `${POSICION_ID}-${form.cantidad}`
            : POSICION_ID;

        return {
            fecha_registro: form.fecha_registro,
            hora_registro: form.hora_registro,
            posicion_id: posicionCompleta,
            equipo: EQUIPO,
            registro: REGISTRO,
            cantidad: cantidadNum,
            tecnico: form.tecnico,
            ejecutado: form.ejecutado,
            observaciones: form.observaciones || null,
            periodicidad: "TRIMESTRAL",

            medir_rtd: !!form.medir_rtd,
            medir_indicador: !!form.medir_indicador,

            rtd_pt100_1: form.medir_rtd ? form.rtd_pt100_1 : null,
            patron_rtd_1: form.medir_rtd ? form.patron_rtd_1 : null,
            rtd_pt100_2: form.medir_rtd ? form.rtd_pt100_2 : null,
            patron_rtd_2: form.medir_rtd ? form.patron_rtd_2 : null,
            rtd_pt100_3: form.medir_rtd ? form.rtd_pt100_3 : null,
            patron_rtd_3: form.medir_rtd ? form.patron_rtd_3 : null,
            rtd_pt100_4: form.medir_rtd ? form.rtd_pt100_4 : null,
            patron_rtd_4: form.medir_rtd ? form.patron_rtd_4 : null,
            rtd_pt100_5: form.medir_rtd ? form.rtd_pt100_5 : null,
            patron_rtd_5: form.medir_rtd ? form.patron_rtd_5 : null,

            ind_dig_1: form.medir_indicador ? form.ind_dig_1 : null,
            patron_ind_1: form.medir_indicador ? form.patron_ind_1 : null,
            ind_dig_2: form.medir_indicador ? form.ind_dig_2 : null,
            patron_ind_2: form.medir_indicador ? form.patron_ind_2 : null,
            ind_dig_3: form.medir_indicador ? form.ind_dig_3 : null,
            patron_ind_3: form.medir_indicador ? form.patron_ind_3 : null,
            ind_dig_4: form.medir_indicador ? form.ind_dig_4 : null,
            patron_ind_4: form.medir_indicador ? form.patron_ind_4 : null,
            ind_dig_5: form.medir_indicador ? form.ind_dig_5 : null,
            patron_ind_5: form.medir_indicador ? form.patron_ind_5 : null,

            ultimo_mantenimiento:
                form.ejecutado === "SI" ? baseDate : null,
            proximo_mantenimiento: proximo,
        };
    };

    const save = async () => {
        // en este archivo ya no usamos modo "view" para guardar, solo new/edit
        setSubmitted(true);
        const errs = validate();
        if (errs.length) {
            showToast("warn", "Validación", errs[0]);
            return;
        }

        try {
            const payload = buildPayload();

            if (dialogMode === "edit" && form.id) {
                const { error } = await supabase
                    .from(TABLE)
                    .update(payload)
                    .eq("id", form.id);
                if (error) throw error;
                showToast("success", "Éxito", "Registro actualizado");
            } else {
                const { error } = await supabase
                    .from(TABLE)
                    .insert([payload]);
                if (error) throw error;
                showToast("success", "Éxito", "Registro guardado");
            }

            setDialogOpen(false);
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

    /* -------- revisado -------- */
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
                    placeholder="Buscar (H-HM-SPT, técnico, notas)"
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
            creado: fmtDMYHM(r.created_at),
            medir_rtd: r.medir_rtd ? "Sí" : "No",
            medir_indicador: r.medir_indicador ? "Sí" : "No",
        }));
        const ws = XLSX.utils.json_to_sheet(out);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sensor PT100");
        XLSX.writeFile(
            wb,
            `Horno_SensorPT100_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );
    };

    // 🔵 Columna Acciones → Ver / Editar (mismo estilo que TamizMotor)
    const actionTemplate = (row) => (
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

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1 className="flex align-items-center gap-2">
                <img src={logo2} alt="mosca" className="logo2" />
                Registro — Sensor PT100 (Trimestral)
            </h1>

            <div className="welcome-message">
                <p>
                    <b>Posición (ID):</b> {POSICION_ID} &nbsp; | &nbsp;{" "}
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
                <Column field="cantidad" header="Cantidad" />
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
                    body={actionTemplate}
                    exportable={false}
                    style={{ width: "14rem" }}
                />
            </DataTable>

            {/* Dialog NUEVO / EDITAR (lógica igual) */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "72vw", maxWidth: 1100 }}
                header={
                    dialogMode === "edit"
                        ? "Editar registro — Sensor PT100 (Trimestral)"
                        : "Nuevo registro — Sensor PT100 (Trimestral)"
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
                        <label className="font-bold">Periodicidad*</label>
                        <Dropdown
                            value={"TRIMESTRAL"}
                            options={PERIODOS}
                            disabled
                        />
                        <small className="block mt-2">
                            Próximo mantenimiento: +3 meses (o +7 días si NO).
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
                        <InputText value={form.equipo} disabled />
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
                            onChange={(e) =>
                                onChange("ejecutado", e.value)
                            }
                            placeholder="Seleccione"
                        />
                    </div>

                    {form.ejecutado === "SI" && (
                        <>
                            <div className="field col-12 md:col-6">
                                <div className="flex align-items-center gap-2">
                                    <Checkbox
                                        inputId="chk-rtd"
                                        checked={form.medir_rtd}
                                        onChange={(e) =>
                                            onChange(
                                                "medir_rtd",
                                                e.checked
                                            )
                                        }
                                    />
                                    <label
                                        htmlFor="chk-rtd"
                                        className="font-bold"
                                    >
                                        Sensor PT100 (RTD PT-100)
                                    </label>
                                </div>
                            </div>
                            <div className="field col-12 md:col-6">
                                <div className="flex align-items-center gap-2">
                                    <Checkbox
                                        inputId="chk-ind"
                                        checked={form.medir_indicador}
                                        onChange={(e) =>
                                            onChange(
                                                "medir_indicador",
                                                e.checked
                                            )
                                        }
                                    />
                                    <label
                                        htmlFor="chk-ind"
                                        className="font-bold"
                                    >
                                        Indicador Digital
                                    </label>
                                </div>
                            </div>

                            {form.medir_rtd && (
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
                                            RTD PT-100 — mediciones y patrón
                                        </div>
                                        <div className="grid">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <React.Fragment
                                                    key={`rtd-${i}`}
                                                >
                                                    <div className="col-12 md:col-3">
                                                        <label className="font-bold">
                                                            RTD PT-100 #{i}{" "}
                                                            {submitted &&
                                                                !form[
                                                                    `rtd_pt100_${i}`
                                                                ]?.trim() && (
                                                                    <small className="p-error">
                                                                        {" "}
                                                                        Requerido
                                                                    </small>
                                                                )}
                                                        </label>
                                                        <InputText
                                                            value={
                                                                form[
                                                                `rtd_pt100_${i}`
                                                                ]
                                                            }
                                                            onChange={(e) =>
                                                                onChange(
                                                                    `rtd_pt100_${i}`,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="°C"
                                                        />
                                                    </div>
                                                    <div className="col-12 md:col-3">
                                                        <label className="font-bold">
                                                            Patrón #{i}{" "}
                                                            {submitted &&
                                                                !form[
                                                                    `patron_rtd_${i}`
                                                                ]?.trim() && (
                                                                    <small className="p-error">
                                                                        {" "}
                                                                        Requerido
                                                                    </small>
                                                                )}
                                                        </label>
                                                        <InputText
                                                            value={
                                                                form[
                                                                `patron_rtd_${i}`
                                                                ]
                                                            }
                                                            onChange={(e) =>
                                                                onChange(
                                                                    `patron_rtd_${i}`,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="°C"
                                                        />
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {form.medir_indicador && (
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
                                            Indicador Digital — mediciones y
                                            patrón
                                        </div>
                                        <div className="grid">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <React.Fragment
                                                    key={`ind-${i}`}
                                                >
                                                    <div className="col-12 md:col-3">
                                                        <label className="font-bold">
                                                            Indicador #{i}{" "}
                                                            {submitted &&
                                                                !form[
                                                                    `ind_dig_${i}`
                                                                ]?.trim() && (
                                                                    <small className="p-error">
                                                                        {" "}
                                                                        Requerido
                                                                    </small>
                                                                )}
                                                        </label>
                                                        <InputText
                                                            value={
                                                                form[
                                                                `ind_dig_${i}`
                                                                ]
                                                            }
                                                            onChange={(e) =>
                                                                onChange(
                                                                    `ind_dig_${i}`,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="°C"
                                                        />
                                                    </div>
                                                    <div className="col-12 md:col-3">
                                                        <label className="font-bold">
                                                            Patrón #{i}{" "}
                                                            {submitted &&
                                                                !form[
                                                                    `patron_ind_${i}`
                                                                ]?.trim() && (
                                                                    <small className="p-error">
                                                                        {" "}
                                                                        Requerido
                                                                    </small>
                                                                )}
                                                        </label>
                                                        <InputText
                                                            value={
                                                                form[
                                                                `patron_ind_${i}`
                                                                ]
                                                            }
                                                            onChange={(e) =>
                                                                onChange(
                                                                    `patron_ind_${i}`,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="°C"
                                                        />
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

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

            {/* 🔵 Dialog VER (solo lectura, como PanelControlGeneral) */}
            <Dialog
                visible={viewDialogOpen}
                onHide={() => setViewDialogOpen(false)}
                header="Detalle del registro — Sensor PT100"
                style={{ width: "60vw", maxWidth: 900 }}
                modal
            >
                {!viewRecord ? (
                    <p>No hay datos para mostrar.</p>
                ) : (
                    <div className="p-fluid">
                        <p>
                            <b>Posición:</b> {viewRecord.posicion_id} <br />
                            <b>Equipo:</b> {viewRecord.equipo} <br />
                            <b>Registro:</b> {viewRecord.registro} <br />
                            <b>Técnico:</b> {viewRecord.tecnico || "—"} <br />
                            <b>Fecha intervención:</b>{" "}
                            {fmtDMY(viewRecord.fecha_registro)}{" "}
                            {viewRecord.hora_registro &&
                                ` ${viewRecord.hora_registro}`}{" "}
                            <br />
                            <b>Periodicidad:</b>{" "}
                            {viewRecord.periodicidad || "TRIMESTRAL"}
                        </p>

                        {viewRecord.medir_rtd && (
                            <>
                                <h3 className="mt-3 mb-2">
                                    RTD PT-100 — mediciones y patrón
                                </h3>
                                <div className="grid">
                                    {[1, 2, 3, 4, 5].map((i) => {
                                        const rtd =
                                            viewRecord[`rtd_pt100_${i}`] ??
                                            "—";
                                        const pat =
                                            viewRecord[`patron_rtd_${i}`] ??
                                            "—";
                                        return (
                                            <div
                                                key={`view-rtd-${i}`}
                                                className="col-12 md:col-6 mb-2"
                                            >
                                                <p className="m-0">
                                                    <b>
                                                        RTD PT-100 #{i} /
                                                        Patrón #{i}
                                                    </b>
                                                    <br />
                                                    RTD: {rtd} &nbsp; | &nbsp;
                                                    Patrón: {pat}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {viewRecord.medir_indicador && (
                            <>
                                <h3 className="mt-3 mb-2">
                                    Indicador Digital — mediciones y patrón
                                </h3>
                                <div className="grid">
                                    {[1, 2, 3, 4, 5].map((i) => {
                                        const ind =
                                            viewRecord[`ind_dig_${i}`] ??
                                            "—";
                                        const pat =
                                            viewRecord[`patron_ind_${i}`] ??
                                            "—";
                                        return (
                                            <div
                                                key={`view-ind-${i}`}
                                                className="col-12 md:col-6 mb-2"
                                            >
                                                <p className="m-0">
                                                    <b>
                                                        Indicador #{i} /
                                                        Patrón #{i}
                                                    </b>
                                                    <br />
                                                    Indicador: {ind} &nbsp; |{" "}
                                                    &nbsp; Patrón: {pat}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        <h3 className="mt-3 mb-2">Observaciones</h3>
                        <p>{viewRecord.observaciones || "Sin observaciones."}</p>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
