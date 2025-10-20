// Components/Inocuidad/Registros/LimpiezaHornoMultilevel.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient";
import logo2 from "../../../assets/mosca.png";

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
import "./LimpiezaHornoMultilevel.css";

// Permisos
import useCanReview from "./Hooks/useCanReview.js";

const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const TIPO_LIMPIEZA_OPTS = [
    { label: "Ligero", value: "Ligero" },
    { label: "Profundo", value: "Profundo" },
];

const ITEMS = [
    { key: "bandas_transportadoras", label: "Bandas transportadoras (Diario)" },
    { key: "dosificador_larva", label: "Dosificador de larva (Diario)" },
    { key: "banda_1", label: "Banda 1 (Diario)" },
    { key: "banda_2", label: "Banda 2 (Diario)" },
    { key: "banda_3", label: "Banda 3 (Diario)" },
    { key: "banda_4", label: "Banda 4 (Diario)" },
    { key: "banda_5", label: "Banda 5 (Diario)" },
    { key: "compuertas_limpieza", label: "Compuertas de limpieza (Diario)" },
    { key: "bandas_enfriamiento", label: "Bandas de enfriamiento (Diario)" },
    { key: "canguilones", label: "Canguilones (Diario)" },
    { key: "piso", label: "Piso (Diario)" },
];

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHM = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const emptyForm = () => ({
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    firma_encargado: "",
    verificacion_inocuidad: "",
    tipo_limpieza: "",                     // ← dropdown
    observaciones: "",                     // ← nuevo
    fecha_registro_preview: new Date().toLocaleString(), // solo vista
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "" };       // ← sin comentario
        return acc;
    }, {}),
});

// DB -> UI (solo estados)
const packRow = (dbRow) => {
    const itemsMap = {
        bandas_transportadoras: { estado: dbRow.estado_bandas_transportadoras || "" },
        dosificador_larva: { estado: dbRow.estado_dosificador_larva || "" },
        banda_1: { estado: dbRow.estado_banda_1 || "" },
        banda_2: { estado: dbRow.estado_banda_2 || "" },
        banda_3: { estado: dbRow.estado_banda_3 || "" },
        banda_4: { estado: dbRow.estado_banda_4 || "" },
        banda_5: { estado: dbRow.estado_banda_5 || "" },
        compuertas_limpieza: { estado: dbRow.estado_compuertas_limpieza || "" },
        bandas_enfriamiento: { estado: dbRow.estado_bandas_enfriamiento || "" },
        canguilones: { estado: dbRow.estado_canguilones || "" },
        piso: { estado: dbRow.estado_piso || "" },
    };

    return {
        id: dbRow.id,
        fecha_registro: dbRow.fecha_registro,
        hora_registro: dbRow.hora_registro,
        firma_encargado: dbRow.firma_encargado,
        verificacion_inocuidad: dbRow.verificacion_inocuidad,
        tipo_limpieza: dbRow.tipo_limpieza || "",
        fecha_registro_sistema: dbRow.created_at ?? dbRow.fecha_correccion ?? null, // preferimos created_at
        revisado: dbRow.revisado ?? false,
        revisado_por_username: dbRow.revisado_por_username ?? null,
        revisado_fecha: dbRow.revisado_fecha ?? null,
        observaciones: dbRow.observaciones || "",
        items: itemsMap,
    };
};

export default function LimpiezaHornoMultilevel() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [filtroRevisado, setFiltroRevisado] = useState("all");
    const { canReview, username } = useCanReview();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    const exportXlsx = () => {
        const rowsToExport = (Array.isArray(rows) ? rows : []).map((row) => {
            const base = {
                fecha_registro: row.fecha_registro,
                hora_registro: row.hora_registro,
                firma_encargado: row.firma_encargado,
                verificacion_inocuidad: row.verificacion_inocuidad,
                tipo_limpieza: row.tipo_limpieza || "",
                "fecha registro (sistema)": row.fecha_registro_sistema ? new Date(row.fecha_registro_sistema).toLocaleString() : "",
                revisado: row.revisado ? "Sí" : "No",
                observaciones: row.observaciones || "",
            };
            Object.keys(row.items || {}).forEach((k) => {
                base[`${k}_estado`] = row.items[k]?.estado || "";
            });
            return base;
        });
        const ws = XLSX.utils.json_to_sheet(rowsToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Limpieza Horno ML");
        XLSX.writeFile(wb, `Limpieza_Horno_Multilevel_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const fetchRegistros = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from("limpieza_horno_ml_1")
                .select(`
          id,
          fecha_registro,
          hora_registro,
          firma_encargado,
          verificacion_inocuidad,
          tipo_limpieza,
          created_at,
          fecha_correccion,
          revisado,
          revisado_por_username,
          revisado_fecha,
          observaciones,
          estado_bandas_transportadoras,
          estado_dosificador_larva,
          estado_banda_1,
          estado_banda_2,
          estado_banda_3,
          estado_banda_4,
          estado_banda_5,
          estado_compuertas_limpieza,
          estado_bandas_enfriamiento,
          estado_canguilones,
          estado_piso
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
        if (!form.tipo_limpieza) errs.push("Seleccione el Tipo de Limpieza (Ligero/Profundo).");
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
                firma_encargado: form.firma_encargado || "",
                verificacion_inocuidad: form.verificacion_inocuidad || null,
                tipo_limpieza: form.tipo_limpieza,
                observaciones: form.observaciones?.trim() ? form.observaciones : null,

                // solo estados
                estado_bandas_transportadoras: form.items.bandas_transportadoras?.estado,
                estado_dosificador_larva: form.items.dosificador_larva?.estado,
                estado_banda_1: form.items.banda_1?.estado,
                estado_banda_2: form.items.banda_2?.estado,
                estado_banda_3: form.items.banda_3?.estado,
                estado_banda_4: form.items.banda_4?.estado,
                estado_banda_5: form.items.banda_5?.estado,
                estado_compuertas_limpieza: form.items.compuertas_limpieza?.estado,
                estado_bandas_enfriamiento: form.items.bandas_enfriamiento?.estado,
                estado_canguilones: form.items.canguilones?.estado,
                estado_piso: form.items.piso?.estado,
            };

            const { data, error } = await supabase
                .from("limpieza_horno_ml_1")
                .insert([payload])
                .select("id, created_at")
                .single();

            if (error) throw error;

            showToast("success", "Éxito", `Registro guardado. Fecha de Registro (auto): ${new Date(data.created_at).toLocaleString()}`);
            await fetchRegistros();
            setDialogOpen(false);
            setForm(emptyForm());
            setSubmitted(false);
        } catch (error) {
            console.error(error);
            showToast("error", "Error", error.message || "No se pudo guardar el registro");
        }
    };

    const countBy = (row, val) =>
        ITEMS.reduce((acc, it) => acc + (row.items?.[it.key]?.estado === val ? 1 : 0), 0);

    const dynamicColumns = ITEMS.map((it) => ({
        header: it.label,
        body: (row) => row.items?.[it.key]?.estado || "",
    }));

    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            if (!username) {
                showToast("warn", "Sesión", "No se detectó el usuario actual.");
                return;
            }
            const { error } = await supabase
                .from("limpieza_horno_ml_1")
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
                <Checkbox inputId={`chk-rev-horno-${row.id}`} checked={!!row.revisado} onChange={(e) => onToggle(e.checked)} />
                <label htmlFor={`chk-rev-horno-${row.id}`} className="text-sm">
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
                        { label: "Sin Revisar", value: "unchecked" },
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
                Registro de Limpieza Horno Multilevel
            </h1>

            <div className="welcome-message">
                <p>
                    <span>
                        <b className="bold-space">Rúbrica:</b>
                        <b className="bold-space"> C</b> (Cumple),
                        <b className="bold-space"> NC</b> (No cumple),
                        <b className="bold-space"> NA</b> (No aplica).
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
                <Column field="tipo_limpieza" header="Tipo de Limpieza" />

                {/* Fecha de Registro (auto) real */}
                <Column
                    field="fecha_registro_sistema"
                    header="Fecha de Registro"
                    body={(r) => (r?.fecha_registro_sistema ? new Date(r.fecha_registro_sistema).toLocaleString() : "")}
                    sortable
                />

                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />

                {dynamicColumns.map((c, i) => (
                    <Column key={i} header={c.header} body={c.body} />
                ))}

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

                    {/* Tipo de Limpieza (Dropdown) */}
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Tipo de Limpieza*</label>
                        <Dropdown
                            value={form.tipo_limpieza}
                            options={TIPO_LIMPIEZA_OPTS}
                            onChange={(e) => setForm((p) => ({ ...p, tipo_limpieza: e.value }))}
                            placeholder="Seleccione"
                        />
                        {submitted && !form.tipo_limpieza && <small className="p-error"> Requerido</small>}
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
                        <label className="font-bold">Fecha de Registro (auto)</label>
                        <InputText value={form.fecha_registro_preview} disabled />
                        <small className="text-color-secondary">Se genera automáticamente al guardar.</small>
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
