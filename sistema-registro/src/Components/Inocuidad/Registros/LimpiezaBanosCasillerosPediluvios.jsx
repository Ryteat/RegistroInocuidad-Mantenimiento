// Components/Inocuidad/Registros/LimpiezaBanosCasillerosPediluvios.jsx
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


// 👇 importa tu CSS común de Inocuidad
import "../Inocuidad.css";

// Permisos (Mantenimiento01 / Produccion01)
import useCanReview from "./Hooks/useCanReview.js";

const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    // Baños
    { key: "banos_sanitarios", label: "Sanitarios (Diario)", grupo: "Banos" },
    { key: "banos_pisos", label: "Pisos (Diario)", grupo: "Banos" },
    { key: "banos_lavamanos", label: "Lavamanos (Diario)", grupo: "Banos" },
    { key: "banos_orinales", label: "Orinales (Diario)", grupo: "Banos" },
    { key: "banos_recoleccion_basura", label: "Recolección de basura (Diario)", grupo: "Banos" },
    { key: "banos_paredes", label: "Paredes (Quincenal)", grupo: "Banos" },
    { key: "banos_techos", label: "Techos (Semestral)", grupo: "Banos" }, // nuevo

    // Camerinos
    { key: "camerinos_pisos", label: "Pisos (Diario)", grupo: "Camerinos" },
    { key: "camerinos_lavamanos", label: "Lavamanos (Diario)", grupo: "Camerinos" },
    { key: "camerinos_paredes", label: "Paredes (Quincenal)", grupo: "Camerinos" },
    { key: "camerinos_casilleros_exterior", label: "Limpieza de casilleros por fuera (Mensual)", grupo: "Camerinos" },

    // Cuarto de crecimiento
    { key: "crecimiento_piso", label: "Piso (Semanal)", grupo: "Crecimiento" },
    { key: "crecimiento_muebles", label: "Muebles (Semanal)", grupo: "Crecimiento" },
    { key: "crecimiento_paredes", label: "Paredes (Mensual)", grupo: "Crecimiento" },
    { key: "crecimiento_techo", label: "Techo (Mensual)", grupo: "Crecimiento" },

    // Pediluvios
    { key: "pediluvios_area_externa", label: "Área externa (Diario)", grupo: "Pediluvios" },
    { key: "pediluvios_area_interna", label: "Área interna (Diario)", grupo: "Pediluvios" },
    { key: "pediluvios_solucion", label: "Solución (Diario)", grupo: "Pediluvios" },
    { key: "pediluvios_techo", label: "Techo (Semanal)", grupo: "Pediluvios" },
];

const GROUP_LABEL = {
    Banos: "Baños",
    Camerinos: "Camerinos",
    Crecimiento: "Cuarto de crecimiento",
    Pediluvios: "Pediluvios",
};

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHM = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const emptyForm = () => ({
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    firma_encargado: "",
    verificacion_investigacion_desarrollo: "",
    fecha_correccion_preview: new Date().toLocaleString(), // visual
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "", comentario: "" };
        return acc;
    }, {}),
});

const packRow = (dbRow) => {
    const fromWide =
        dbRow.estado_banos_sanitarios !== undefined ||
        dbRow.estado_camerinos_pisos !== undefined ||
        dbRow.estado_crecimiento_piso !== undefined ||
        dbRow.estado_pediluvios_area_externa !== undefined;

    const itemsMap = fromWide
        ? {
            // Baños
            banos_sanitarios: { estado: dbRow.estado_banos_sanitarios || "", comentario: dbRow.comentario_banos_sanitarios || "" },
            banos_pisos: { estado: dbRow.estado_banos_pisos || "", comentario: dbRow.comentario_banos_pisos || "" },
            banos_lavamanos: { estado: dbRow.estado_banos_lavamanos || "", comentario: dbRow.comentario_banos_lavamanos || "" },
            banos_orinales: { estado: dbRow.estado_banos_orinales || "", comentario: dbRow.comentario_banos_orinales || "" },
            banos_recoleccion_basura: { estado: dbRow.estado_banos_recoleccion_basura || "", comentario: dbRow.comentario_banos_recoleccion_basura || "" },
            banos_paredes: { estado: dbRow.estado_banos_paredes || "", comentario: dbRow.comentario_banos_paredes || "" },
            banos_techos: { estado: dbRow.estado_banos_techos || "", comentario: dbRow.comentario_banos_techos || "" },
            // Camerinos
            camerinos_pisos: { estado: dbRow.estado_camerinos_pisos || "", comentario: dbRow.comentario_camerinos_pisos || "" },
            camerinos_lavamanos: { estado: dbRow.estado_camerinos_lavamanos || "", comentario: dbRow.comentario_camerinos_lavamanos || "" },
            camerinos_paredes: { estado: dbRow.estado_camerinos_paredes || "", comentario: dbRow.comentario_camerinos_paredes || "" },
            camerinos_casilleros_exterior: { estado: dbRow.estado_camerinos_casilleros_exterior || "", comentario: dbRow.comentario_camerinos_casilleros_exterior || "" },
            // Crecimiento
            crecimiento_piso: { estado: dbRow.estado_crecimiento_piso || "", comentario: dbRow.comentario_crecimiento_piso || "" },
            crecimiento_muebles: { estado: dbRow.estado_crecimiento_muebles || "", comentario: dbRow.comentario_crecimiento_muebles || "" },
            crecimiento_paredes: { estado: dbRow.estado_crecimiento_paredes || "", comentario: dbRow.comentario_crecimiento_paredes || "" },
            crecimiento_techo: { estado: dbRow.estado_crecimiento_techo || "", comentario: dbRow.comentario_crecimiento_techo || "" },
            // Pediluvios
            pediluvios_area_externa: { estado: dbRow.estado_pediluvios_area_externa || "", comentario: dbRow.comentario_pediluvios_area_externa || "" },
            pediluvios_area_interna: { estado: dbRow.estado_pediluvios_area_interna || "", comentario: dbRow.comentario_pediluvios_area_interna || "" },
            pediluvios_solucion: { estado: dbRow.estado_pediluvios_solucion || "", comentario: dbRow.comentario_pediluvios_solucion || "" },
            pediluvios_techo: { estado: dbRow.estado_pediluvios_techo || "", comentario: dbRow.comentario_pediluvios_techo || "" },
        }
        : ITEMS.reduce((acc, it) => {
            const found = (dbRow.items || []).find((x) => x.item_key === it.key);
            acc[it.key] = { estado: found?.estado || "", comentario: found?.comentario || "" };
            return acc;
        }, {});

    return {
        id: dbRow.id,
        fecha_registro: dbRow.fecha_registro,
        hora_registro: dbRow.hora_registro,
        firma_encargado: dbRow.firma_encargado,
        verificacion_investigacion_desarrollo: dbRow.verificacion_investigacion_desarrollo,
        fecha_correccion: dbRow.fecha_correccion,
        revisado: dbRow.revisado ?? false,
        revisado_por_username: dbRow.revisado_por_username ?? null,
        revisado_fecha: dbRow.revisado_fecha ?? null,
        items: itemsMap,
    };
};


export default function LimpiezaBanosCasillerosPediluvios() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    // Filtro + permisos
    const [filtroRevisado, setFiltroRevisado] = useState("all");
    const { canReview, username } = useCanReview();

    const grupos = {
        Banos: ITEMS.filter((i) => i.grupo === "Banos"),
        Camerinos: ITEMS.filter((i) => i.grupo === "Camerinos"),
        Crecimiento: ITEMS.filter((i) => i.grupo === "Crecimiento"),
        Pediluvios: ITEMS.filter((i) => i.grupo === "Pediluvios"),
    };

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    const exportXlsx = async () => {
        const data = selected.length > 0 ? selected : rows;
        if (!data || data.length === 0) {
            showToast("warn", "Exportación", "No hay registros para exportar.");
            return;
        }

        try {
            // import dinámico (más compatible con Vite)
            const XLSX = await import("xlsx");

            // aplanar fila para Excel
            const toFlat = (row) => {
                const base = {
                    fecha_registro: row.fecha_registro,
                    hora_registro: row.hora_registro,
                    firma_encargado: row.firma_encargado || "",
                    verificacion_investigacion_desarrollo: row.verificacion_investigacion_desarrollo || "",
                    fecha_registro_sistema: row.fecha_correccion ? new Date(row.fecha_correccion).toLocaleString() : "",
                    revisado: row.revisado ? "Sí" : "No",
                };
                // columnas por ítem (mismo criterio que usamos en otros módulos)
                ITEMS.forEach((it) => {
                    const v = row.items?.[it.key] || {};
                    base[`${it.label}`] = v.estado || "";
                    base[`${it.label} - comentario`] = v.comentario || "";
                });
                return base;
            };

            const rowsToExport = data.map(toFlat);
            const ws = XLSX.utils.json_to_sheet(rowsToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Banos_Casilleros_Pediluvios");
            XLSX.writeFile(wb, `Limpieza_Banos_Casilleros_Pediluvios_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error(err);
            showToast("error", "Exportación", "No se pudo exportar a Excel");
        }
    };

    const fetchRows = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from("limpieza_banos_casilleros_pediluvios_1")
                .select(`
        id,
        fecha_registro,
        hora_registro,
        firma_encargado,
        verificacion_investigacion_desarrollo,
        fecha_correccion,
        revisado, revisado_por_username, revisado_fecha,

        estado_banos_sanitarios, comentario_banos_sanitarios,
        estado_banos_pisos, comentario_banos_pisos,
        estado_banos_lavamanos, comentario_banos_lavamanos,
        estado_banos_orinales, comentario_banos_orinales,
        estado_banos_recoleccion_basura, comentario_banos_recoleccion_basura,
        estado_banos_paredes, comentario_banos_paredes,
        estado_banos_techos, comentario_banos_techos,

        estado_camerinos_pisos, comentario_camerinos_pisos,
        estado_camerinos_lavamanos, comentario_camerinos_lavamanos,
        estado_camerinos_paredes, comentario_camerinos_paredes,
        estado_camerinos_casilleros_exterior, comentario_camerinos_casilleros_exterior,

        estado_crecimiento_piso, comentario_crecimiento_piso,
        estado_crecimiento_muebles, comentario_crecimiento_muebles,
        estado_crecimiento_paredes, comentario_crecimiento_paredes,
        estado_crecimiento_techo, comentario_crecimiento_techo,

        estado_pediluvios_area_externa, comentario_pediluvios_area_externa,
        estado_pediluvios_area_interna, comentario_pediluvios_area_interna,
        estado_pediluvios_solucion, comentario_pediluvios_solucion,
        estado_pediluvios_techo, comentario_pediluvios_techo
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


    useEffect(() => { fetchRows(); }, [filtroRevisado]);

    const openNew = () => { setForm(emptyForm()); setSubmitted(false); setDialogOpen(true); };
    const hideDialog = () => { setDialogOpen(false); setSubmitted(false); };

    const onHeaderChange = (e, field) => setForm((p) => ({ ...p, [field]: e.target.value }));
    const onItemChange = (key, field, value) =>
        setForm((p) => ({ ...p, items: { ...p.items, [key]: { ...(p.items[key] || {}), [field]: value } } }));

    const validate = () => {
        const errs = [];
        ITEMS.forEach((it) => {
            const v = form.items[it.key]?.estado;
            if (!v) errs.push(`Seleccione estado para: ${it.label}`);
            if (v && v !== "C" && !form.items[it.key]?.comentario?.trim()) {
                errs.push(`Comentario requerido en ${it.label} (NC/NA).`);
            }
        });
        return errs;
    };

    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) { showToast("error", "Validación", errs[0]); return; }

        try {
            const p = (k) => ({
                estado: form.items[k]?.estado || null,
                comentario: form.items[k]?.comentario || null,
            });

            const payload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                firma_encargado: form.firma_encargado || "",
                verificacion_investigacion_desarrollo: form.verificacion_investigacion_desarrollo || null,

                // Baños
                estado_banos_sanitarios: p("banos_sanitarios").estado, comentario_banos_sanitarios: p("banos_sanitarios").comentario,
                estado_banos_pisos: p("banos_pisos").estado, comentario_banos_pisos: p("banos_pisos").comentario,
                estado_banos_lavamanos: p("banos_lavamanos").estado, comentario_banos_lavamanos: p("banos_lavamanos").comentario,
                estado_banos_orinales: p("banos_orinales").estado, comentario_banos_orinales: p("banos_orinales").comentario,
                estado_banos_recoleccion_basura: p("banos_recoleccion_basura").estado, comentario_banos_recoleccion_basura: p("banos_recoleccion_basura").comentario,
                estado_banos_paredes: p("banos_paredes").estado, comentario_banos_paredes: p("banos_paredes").comentario,
                estado_banos_techos: p("banos_techos").estado, comentario_banos_techos: p("banos_techos").comentario,

                // Camerinos
                estado_camerinos_pisos: p("camerinos_pisos").estado, comentario_camerinos_pisos: p("camerinos_pisos").comentario,
                estado_camerinos_lavamanos: p("camerinos_lavamanos").estado, comentario_camerinos_lavamanos: p("camerinos_lavamanos").comentario,
                estado_camerinos_paredes: p("camerinos_paredes").estado, comentario_camerinos_paredes: p("camerinos_paredes").comentario,
                estado_camerinos_casilleros_exterior: p("camerinos_casilleros_exterior").estado, comentario_camerinos_casilleros_exterior: p("camerinos_casilleros_exterior").comentario,

                // Crecimiento
                estado_crecimiento_piso: p("crecimiento_piso").estado, comentario_crecimiento_piso: p("crecimiento_piso").comentario,
                estado_crecimiento_muebles: p("crecimiento_muebles").estado, comentario_crecimiento_muebles: p("crecimiento_muebles").comentario,
                estado_crecimiento_paredes: p("crecimiento_paredes").estado, comentario_crecimiento_paredes: p("crecimiento_paredes").comentario,
                estado_crecimiento_techo: p("crecimiento_techo").estado, comentario_crecimiento_techo: p("crecimiento_techo").comentario,

                // Pediluvios
                estado_pediluvios_area_externa: p("pediluvios_area_externa").estado, comentario_pediluvios_area_externa: p("pediluvios_area_externa").comentario,
                estado_pediluvios_area_interna: p("pediluvios_area_interna").estado, comentario_pediluvios_area_interna: p("pediluvios_area_interna").comentario,
                estado_pediluvios_solucion: p("pediluvios_solucion").estado, comentario_pediluvios_solucion: p("pediluvios_solucion").comentario,
                estado_pediluvios_techo: p("pediluvios_techo").estado, comentario_pediluvios_techo: p("pediluvios_techo").comentario,
            };

            const { error } = await supabase
                .from("limpieza_banos_casilleros_pediluvios_1")
                .insert([payload])
                .select("id")
                .single();

            if (error) throw error;

            showToast("success", "Éxito", "Registro guardado correctamente");
            await fetchRows();
            setDialogOpen(false);
            setForm(emptyForm());
            setSubmitted(false);
        } catch (error) {
            console.error(error);
            showToast("error", "Error", error.message || "No se pudo guardar el registro");
        }
    };


    const countBy = (row, val) => ITEMS.reduce((acc, it) => acc + (row.items?.[it.key]?.estado === val ? 1 : 0), 0);

    const dynamicColumns = ITEMS.map((it) => ({
        header: it.label,
        body: (row) => row.items?.[it.key]?.estado || "",
    }));

    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            if (!username) { showToast("warn", "Sesión", "No se detectó el usuario actual."); return; }
            const { error } = await supabase
                .from("limpieza_banos_casilleros_pediluvios_1")
                .update({
                    revisado: next,
                    revisado_por_username: next ? username : null,
                    revisado_fecha: next ? new Date().toISOString() : null,
                })
                .eq("id", row.id);


            if (error) { showToast("error", "No se guardó", error.message); return; }

            setRows((prev) => prev.map((r) =>
                r.id === row.id
                    ? { ...r, revisado: next, revisado_por_username: next ? username : null, revisado_fecha: next ? new Date().toISOString() : null }
                    : r
            ));
            showToast("success", "OK", next ? "Marcado revisado" : "Marcado no revisado");
        };

        return (
            <div className="flex align-items-center justify-content-center gap-2">
                <Checkbox inputId={`chk-rev-bcp-${row.id}`} checked={!!row.revisado} onChange={(e) => onToggle(e.checked)} />
                <label htmlFor={`chk-rev-bcp-${row.id}`} className="text-sm">Revisado</label>
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
                Limpieza y Desinfección de Baños, Casilleros y Pediluvios
            </h1>

            <div className="welcome-message">
                <p style={{ textAlign: "center" }}>
                    <span>
                        <b className="bold-space">Rúbrica:</b>
                        <b className="bold-space">C</b> (Cumple),
                        <b className="bold-space">NC</b> (No cumple),
                        <b className="bold-space">NA</b> (No aplica).
                    </span>
                    <br />
                    <span>
                        Para <b className="bold-space">NC/NA</b> el comentario es obligatorio.
                    </span>
                    <br />

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
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Registros"
                dataKey="id"
                showGridlines
            >
                <Column selectionMode="multiple" exportable={false} />
                <Column field="fecha_registro" header="Fecha" sortable />
                <Column field="hora_registro" header="Hora" />
                <Column field="firma_encargado" header="Operario" />

                <Column
                    field="fecha_correccion"
                    header="Fecha de Registro"
                    body={(r) => (r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "")}
                    sortable
                />
                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />
                {dynamicColumns.map((c, i) => (
                    <Column key={i} header={c.header} body={c.body} />
                ))}
                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
            </DataTable>

            <Dialog
                visible={dialogOpen}
                style={{ width: "70vw", maxWidth: 1100 }}
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

                    {["Banos", "Camerinos", "Crecimiento", "Pediluvios"].map((grp) => (
                        <div key={grp} className="col-12">
                            {/* 👇 MISMO formato que el registro de Oficinas/Sala/Comedor */}
                            <div className="subarea-title">{GROUP_LABEL[grp]}</div>
                            <div className="grid">
                                {grupos[grp].map((it) => {
                                    const val = form.items[it.key] || { estado: "", comentario: "" };
                                    const necesitaComentario = val.estado && val.estado !== "C";
                                    return (
                                        <div className="field col-12 md:col-6" key={it.key}>
                                            <label className="font-bold">
                                                {it.label}* {submitted && !val.estado && <small className="p-error"> Requerido</small>}
                                            </label>
                                            <Dropdown
                                                value={val.estado}
                                                options={ESTADOS}
                                                onChange={(e) => onItemChange(it.key, "estado", e.value)}
                                                placeholder="Seleccione"
                                                className="mb-2"
                                            />
                                            {necesitaComentario && (
                                                <>
                                                    <small className="campo-note">Comentario obligatorio para NC o NA</small>
                                                    <InputText
                                                        value={val.comentario}
                                                        onChange={(e) => onItemChange(it.key, "comentario", e.target.value)}
                                                        placeholder="Explique la causa/acción correctiva"
                                                    />
                                                    {submitted && !val.comentario?.trim() && <small className="p-error"> Requerido</small>}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Fecha de Registro (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
