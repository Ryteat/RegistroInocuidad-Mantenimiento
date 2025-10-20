// Components/Inocuidad/LimpiezaTarimasCajas.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient.js";
import logo2 from "../../../assets/mosca.png";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import "../Inocuidad.css";
import { Toast } from "primereact/toast";
import { Toolbar } from "primereact/toolbar";
import * as XLSX from "xlsx";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";

import useCanReview from "./Hooks/useCanReview.js";

const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    { key: "lavado_cajas_1x1", label: "Lavado de cajas de 1×1 (Diario)" },
    { key: "lavado_tarimas", label: "Lavado de tarimas (Diario)" },
];

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHM = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const emptyForm = () => ({
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    cant_tarimas_limpias: 0,
    cant_cajas_colores_limpias: 0,
    firma_encargado: "",
    observaciones: "",
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "" }; // ← solo estado (sin comentario)
        return acc;
    }, {}),
});

// Row mapper (sin comentarios)
const packRow = (dbRow) => {
    const itemsMap = {
        lavado_cajas_1x1: { estado: dbRow.estado_lavado_cajas_1x1 || "" },
        lavado_tarimas: { estado: dbRow.estado_lavado_tarimas || "" },
    };

    return {
        id: dbRow.id,
        fecha_registro: dbRow.fecha_registro,
        hora_registro: dbRow.hora_registro,
        cant_tarimas_limpias: dbRow.cant_tarimas_limpias,
        cant_cajas_colores_limpias: dbRow.cant_cajas_colores_limpias,
        firma_encargado: dbRow.firma_encargado,
        fecha_registro_sistema: dbRow.created_at ?? dbRow.fecha_correccion ?? null,
        revisado: dbRow.revisado ?? false,
        revisado_por_username: dbRow.revisado_por_username ?? null,
        revisado_fecha: dbRow.revisado_fecha ?? null,
        items: itemsMap,
        observaciones: dbRow.observaciones || "",
    };
};

export default function LimpiezaTarimasCajas() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    const [filtroRevisado, setFiltroRevisado] = useState("all");
    const { canReview, username } = useCanReview();

    // Exportar a Excel (sin comentarios)
    const exportXlsx = () => {
        const rowsToExport = (Array.isArray(rows) ? rows : []).map((row) => {
            const base = {
                fecha_registro: row.fecha_registro,
                hora_registro: row.hora_registro,
                cant_tarimas_limpias: row.cant_tarimas_limpias,
                cant_cajas_colores_limpias: row.cant_cajas_colores_limpias,
                firma_encargado: row.firma_encargado,
                "fecha registro (sistema)": row.fecha_registro_sistema ? new Date(row.fecha_registro_sistema).toLocaleString() : "",
                revisado: row.revisado ? "Sí" : "No",
                observaciones: row.observaciones || "",
            };
            Object.keys(row.items).forEach((key) => {
                base[`${key}_estado`] = row.items[key]?.estado || "";
            });
            return base;
        });
        const ws = XLSX.utils.json_to_sheet(rowsToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Limpieza Tarimas Cajas");
        XLSX.writeFile(wb, `Limpieza_Tarimas_Cajas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    const fetchRegistros = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from("limpieza_tarimas_cajas_1")
                .select(`
          id,
          fecha_registro,
          hora_registro,
          cant_tarimas_limpias,
          cant_cajas_colores_limpias,
          firma_encargado,
          created_at,
          fecha_correccion,
          revisado,
          revisado_por_username,
          revisado_fecha,
          observaciones,
          estado_lavado_cajas_1x1,
          estado_lavado_tarimas
        `)
                .order("fecha_registro", { ascending: false });

            if (filtroRevisado === "checked") query = query.eq("revisado", true);
            if (filtroRevisado === "unchecked") query = query.eq("revisado", false);

            const { data, error } = await query;
            if (error) throw error;
            setRows((data || []).map(packRow));
        } catch (err) {
            console.error(err);
            showToast("error", "Error", "Error al cargar registros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistros();
    }, [filtroRevisado]);

    const openNew = () => {
        setForm(emptyForm());
        setSubmitted(false);
        setDialogOpen(true);
    };
    const hideDialog = () => {
        setDialogOpen(false);
        setSubmitted(false);
    };

    const onHeaderChange = (e, field) => setForm((p) => ({ ...p, [field]: e.target.value }));
    const onItemChange = (key, value) =>
        setForm((p) => ({
            ...p,
            items: { ...p.items, [key]: { estado: value } },
        }));

    const validate = () => {
        const errs = [];
        ITEMS.forEach((it) => {
            const v = form.items[it.key]?.estado;
            if (!v) errs.push(`Seleccione estado para: ${it.label}`);
        });

        const n1 = Number(form.cant_tarimas_limpias);
        const n2 = Number(form.cant_cajas_colores_limpias);
        if (!Number.isInteger(n1) || n1 < 0) errs.push("Cantidad de tarimas limpias debe ser un entero ≥ 0.");
        if (!Number.isInteger(n2) || n2 < 0) errs.push("Cantidad de cajas de colores limpias debe ser un entero ≥ 0.");

        return errs;
    };

    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) {
            showToast("error", "Validación", errs[0]);
            return;
        }
        try {
            const payload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                cant_tarimas_limpias: Number(form.cant_tarimas_limpias) || 0,
                cant_cajas_colores_limpias: Number(form.cant_cajas_colores_limpias) || 0,
                firma_encargado: form.firma_encargado || "",
                estado_lavado_cajas_1x1: form.items.lavado_cajas_1x1?.estado,
                estado_lavado_tarimas: form.items.lavado_tarimas?.estado,
                observaciones: form.observaciones?.trim() ? form.observaciones : null,
            };

            const { data, error } = await supabase
                .from("limpieza_tarimas_cajas_1")
                .insert([payload])
                .select("id, created_at")
                .single();

            if (error) throw error;

            showToast(
                "success",
                "Éxito",
                `Registro guardado. Fecha de Registro (auto): ${new Date(data.created_at).toLocaleString()}`
            );
            await fetchRegistros();
            setDialogOpen(false);
            setForm(emptyForm());
            setSubmitted(false);
        } catch (error) {
            console.error(error);
            showToast("error", "Error", error.message || "No se pudo guardar el registro");
        }
    };

    const countBy = (row, val) => ITEMS.reduce((acc, it) => acc + (row.items?.[it.key]?.estado === val ? 1 : 0), 0);

    const dynamicCols = useMemo(
        () =>
            ITEMS.map((it) => (
                <Column key={it.key} header={it.label} body={(row) => row.items?.[it.key]?.estado || ""} />
            )),
        []
    );

    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            if (!username) {
                showToast("warn", "Sesión", "No se detectó el usuario actual.");
                return;
            }
            const { error } = await supabase
                .from("limpieza_tarimas_cajas_1")
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
                            revisado_fecha: next ? new Date().toISOString() : null,
                        }
                        : r
                )
            );
            showToast("success", "OK", next ? "Marcado revisado" : "Marcado no revisado");
        };

        return (
            <div className="flex align-items-center justify-content-center gap-2">
                <Checkbox inputId={`chk-rev-tc-${row.id}`} checked={!!row.revisado} onChange={(e) => onToggle(e.checked)} />
                <label htmlFor={`chk-rev-tc-${row.id}`} className="text-sm">
                    Revisado
                </label>
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
                    placeholder="Buscar Registros"
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

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Limpieza de Tarimas y Cajas de Colores
            </h1>

            <div className="welcome-message">
                <p>
                    <span>
                        <b className="bold-space">Selecciona:</b> <b className="bold-space">C</b> (Cumple),
                        <b className="bold-space">NC</b> (No cumple),
                        <b className="bold-space">NA</b> (No aplica).
                    </span>
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
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Registros"
                dataKey="id"
                showGridlines
            >
                <Column selectionMode="multiple" exportable={false} />
                <Column field="fecha_registro" header="Fecha" sortable />
                <Column field="hora_registro" header="Hora" />
                <Column field="firma_encargado" header="Operario" />
                <Column field="cant_tarimas_limpias" header="Tarimas limpias" sortable />
                <Column field="cant_cajas_colores_limpias" header="Cajas colores limpias" sortable />

                {/* Fecha de Registro (auto) real */}
                <Column
                    field="fecha_registro_sistema"
                    header="Fecha de Registro (auto)"
                    body={(r) => (r.fecha_registro_sistema ? new Date(r.fecha_registro_sistema).toLocaleString() : "")}
                    sortable
                />

                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />

                {dynamicCols}

                <Column field="observaciones" header="Observaciones" body={(r) => r.observaciones || "—"} />

                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
            </DataTable>

            <Dialog
                visible={dialogOpen}
                style={{ width: "60vw", maxWidth: 900 }}
                header="Nuevo registro"
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
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Fecha</label>
                        <InputText type="date" value={form.fecha_registro} onChange={(e) => onHeaderChange(e, "fecha_registro")} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora</label>
                        <InputText type="time" value={form.hora_registro} onChange={(e) => onHeaderChange(e, "hora_registro")} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Operario*</label>
                        <InputText value={form.firma_encargado} onChange={(e) => onHeaderChange(e, "firma_encargado")} />
                    </div>

                    {ITEMS.map((it) => {
                        const val = form.items[it.key] || { estado: "" };
                        return (
                            <div className="field col-12 md:col-6" key={it.key}>
                                <label className="font-bold">
                                    {it.label}* {submitted && !val.estado && <small className="p-error"> Requerido</small>}
                                </label>
                                <Dropdown
                                    value={val.estado}
                                    options={ESTADOS}
                                    onChange={(e) => onItemChange(it.key, e.value)}
                                    placeholder="Seleccione"
                                    className="mb-2"
                                />
                            </div>
                        );
                    })}

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Cantidad de tarimas limpias*</label>
                        <InputText
                            type="number"
                            value={form.cant_tarimas_limpias}
                            onChange={(e) => onHeaderChange(e, "cant_tarimas_limpias")}
                        />
                        {submitted && (!Number.isInteger(Number(form.cant_tarimas_limpias)) || Number(form.cant_tarimas_limpias) < 0) && (
                            <small className="p-error"> Debe ser entero ≥ 0</small>
                        )}
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Cantidad de cajas de colores limpias*</label>
                        <InputText
                            type="number"
                            value={form.cant_cajas_colores_limpias}
                            onChange={(e) => onHeaderChange(e, "cant_cajas_colores_limpias")}
                        />
                        {submitted &&
                            (!Number.isInteger(Number(form.cant_cajas_colores_limpias)) || Number(form.cant_cajas_colores_limpias) < 0) && (
                                <small className="p-error"> Debe ser entero ≥ 0</small>
                            )}
                    </div>

                    <div className="field col-12">
                        <label className="font-bold">Observaciones</label>
                        <InputText
                            value={form.observaciones}
                            onChange={(e) => onHeaderChange(e, "observaciones")}
                            placeholder="Comentarios adicionales (opcional)"
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
