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

import "./LimpiezaDietaSiembra.css";
// ⬅️ Hook de permisos (ajusta la ruta si tu árbol difiere)
import useCanReview from "./Hooks/useCanReview.js";

// ---------- Catálogos ----------
const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    { key: "pisos", label: "Pisos (Diario)" },
    { key: "maquina_mezcladora_1", label: "Máquina mezcladora 1 (Diario)" },
    { key: "maquina_mezcladora_2", label: "Máquina mezcladora 2 (Diario)" },
    { key: "pila", label: "Pila (Diario)" },
    { key: "herramientas_limpieza", label: "Herramientas de limpieza (Diario)" },
    { key: "mesanine", label: "Mesanine (Diario)" },
    { key: "romana", label: "Romana (Diario)" },
    { key: "baldes_melaza", label: "Baldes de melaza (Diario)" },
    { key: "recoleccion_basura", label: "Recolección de basura (Diario)" },
    { key: "carcamo_bombeo", label: "Cárcamo de bombeo (Diario)" },
    { key: "tornillo_sin_fin", label: "Tornillo sin fin (Diario)" },
    { key: "banda_plana", label: "Banda plana (Diario)" },
    { key: "banda_inclinada", label: "Banda inclinada (Diario)" },
    { key: "triturador", label: "Triturador (Diario)" },
    { key: "tolva_cascara_1", label: "Tolva de cáscara 1 (Diario)" },
    { key: "tolva_cascara_2", label: "Tolva de cáscara 2 (Diario)" },
    { key: "tolva_cascara_3", label: "Tolva de cáscara 3 (Diario)" },
    { key: "cano", label: "Caño (Diario)" },
    { key: "rampa_pila", label: "Rampa de la pila (Semanal)" },
    { key: "pila_cascara", label: "Pila de cáscara (Semanal)" },
];

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
};
const nowHM = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const emptyForm = () => ({
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    firma_encargado: "",
    verificacion_inocuidad: "",
    fecha_correccion_preview: new Date().toLocaleString(), // solo vista
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "", comentario: "" };
        return acc;
    }, {}),
});

// Convierte DB row -> modelo de la grilla (soporta esquema viejo y nuevo ancho)
const packRow = (dbRow) => {
    const fromWide =
        dbRow.estado_pisos !== undefined ||
        dbRow.estado_maquina_mezcladora_1 !== undefined;

    const itemsMap = fromWide
        ? {
            pisos: { estado: dbRow.estado_pisos || "", comentario: dbRow.comentario_pisos || "" },
            maquina_mezcladora_1: { estado: dbRow.estado_maquina_mezcladora_1 || "", comentario: dbRow.comentario_maquina_mezcladora_1 || "" },
            maquina_mezcladora_2: { estado: dbRow.estado_maquina_mezcladora_2 || "", comentario: dbRow.comentario_maquina_mezcladora_2 || "" },
            pila: { estado: dbRow.estado_pila || "", comentario: dbRow.comentario_pila || "" },
            herramientas_limpieza: { estado: dbRow.estado_herramientas_limpieza || "", comentario: dbRow.comentario_herramientas_limpieza || "" },
            mesanine: { estado: dbRow.estado_mesanine || "", comentario: dbRow.comentario_mesanine || "" },
            romana: { estado: dbRow.estado_romana || "", comentario: dbRow.comentario_romana || "" },
            baldes_melaza: { estado: dbRow.estado_baldes_melaza || "", comentario: dbRow.comentario_baldes_melaza || "" },
            recoleccion_basura: { estado: dbRow.estado_recoleccion_basura || "", comentario: dbRow.comentario_recoleccion_basura || "" },
            carcamo_bombeo: { estado: dbRow.estado_carcamo_bombeo || "", comentario: dbRow.comentario_carcamo_bombeo || "" },
            tornillo_sin_fin: { estado: dbRow.estado_tornillo_sin_fin || "", comentario: dbRow.comentario_tornillo_sin_fin || "" },
            banda_plana: { estado: dbRow.estado_banda_plana || "", comentario: dbRow.comentario_banda_plana || "" },
            banda_inclinada: { estado: dbRow.estado_banda_inclinada || "", comentario: dbRow.comentario_banda_inclinada || "" },
            triturador: { estado: dbRow.estado_triturador || "", comentario: dbRow.comentario_triturador || "" },
            tolva_cascara_1: { estado: dbRow.estado_tolva_cascara_1 || "", comentario: dbRow.comentario_tolva_cascara_1 || "" },
            tolva_cascara_2: { estado: dbRow.estado_tolva_cascara_2 || "", comentario: dbRow.comentario_tolva_cascara_2 || "" },
            tolva_cascara_3: { estado: dbRow.estado_tolva_cascara_3 || "", comentario: dbRow.comentario_tolva_cascara_3 || "" },
            cano: { estado: dbRow.estado_cano || "", comentario: dbRow.comentario_cano || "" },
            rampa_pila: { estado: dbRow.estado_rampa_pila || "", comentario: dbRow.comentario_rampa_pila || "" },
            pila_cascara: { estado: dbRow.estado_pila_cascara || "", comentario: dbRow.comentario_pila_cascara || "" },
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
        verificacion_inocuidad: dbRow.verificacion_inocuidad,
        fecha_correccion: dbRow.fecha_correccion,
        revisado: dbRow.revisado ?? false,
        revisado_por_username: dbRow.revisado_por_username ?? null,
        revisado_fecha: dbRow.revisado_fecha ?? null,
        items: itemsMap,
    };
};


export default function LimpiezaDietaSiembra() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    // filtro revisado
    const [filtroRevisado, setFiltroRevisado] = useState("all"); // 'all' | 'checked' | 'unchecked'
    // permisos
    const { canReview, username } = useCanReview();

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    const exportXlsx = () => {
        const rowsToExport = (Array.isArray(rows) ? rows : []).map((row) => {
            const base = {
                fecha_registro: row.fecha_registro,
                hora_registro: row.hora_registro,
                firma_encargado: row.firma_encargado,
                verificacion_inocuidad: row.verificacion_inocuidad,
                fecha_registro_sistema: row.fecha_correccion
                    ? new Date(row.fecha_correccion).toLocaleString()
                    : "",
                revisado: row.revisado ? "Sí" : "No",
            };
            Object.keys(row.items).forEach((key) => {
                base[`${key}_estado`] = row.items[key]?.estado || "";
                base[`${key}_comentario`] = row.items[key]?.comentario || "";
            });
            return base;
        });
        const ws = XLSX.utils.json_to_sheet(rowsToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Limpieza Dieta-Siembra");
        XLSX.writeFile(wb, `Limpieza_Dieta_Siembra_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const fetchRegistros = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from("limpieza_dieta_siembra_1")
                .select(`
        id,
        fecha_registro,
        hora_registro,
        firma_encargado,
        verificacion_inocuidad,
        fecha_correccion,
        revisado,
        revisado_por_username,
        revisado_fecha,
        estado_pisos, comentario_pisos,
        estado_maquina_mezcladora_1, comentario_maquina_mezcladora_1,
        estado_maquina_mezcladora_2, comentario_maquina_mezcladora_2,
        estado_pila, comentario_pila,
        estado_herramientas_limpieza, comentario_herramientas_limpieza,
        estado_mesanine, comentario_mesanine,
        estado_romana, comentario_romana,
        estado_baldes_melaza, comentario_baldes_melaza,
        estado_recoleccion_basura, comentario_recoleccion_basura,
        estado_carcamo_bombeo, comentario_carcamo_bombeo,
        estado_tornillo_sin_fin, comentario_tornillo_sin_fin,
        estado_banda_plana, comentario_banda_plana,
        estado_banda_inclinada, comentario_banda_inclinada,
        estado_triturador, comentario_triturador,
        estado_tolva_cascara_1, comentario_tolva_cascara_1,
        estado_tolva_cascara_2, comentario_tolva_cascara_2,
        estado_tolva_cascara_3, comentario_tolva_cascara_3,
        estado_cano, comentario_cano,
        estado_rampa_pila, comentario_rampa_pila,
        estado_pila_cascara, comentario_pila_cascara
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
    const onItemChange = (key, field, value) =>
        setForm((p) => ({
            ...p,
            items: { ...p.items, [key]: { ...(p.items[key] || {}), [field]: value } },
        }));

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
        if (errs.length) {
            showToast("error", "Validación", errs[0]);
            return;
        }
        try {
            setSaving(true);

            const p = (k) => ({
                estado: form.items[k]?.estado,
                comentario: form.items[k]?.comentario || null,
            });

            const payload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                firma_encargado: form.firma_encargado || "",
                verificacion_inocuidad: form.verificacion_inocuidad || null,

                estado_pisos: p("pisos").estado, comentario_pisos: p("pisos").comentario,
                estado_maquina_mezcladora_1: p("maquina_mezcladora_1").estado, comentario_maquina_mezcladora_1: p("maquina_mezcladora_1").comentario,
                estado_maquina_mezcladora_2: p("maquina_mezcladora_2").estado, comentario_maquina_mezcladora_2: p("maquina_mezcladora_2").comentario,
                estado_pila: p("pila").estado, comentario_pila: p("pila").comentario,
                estado_herramientas_limpieza: p("herramientas_limpieza").estado, comentario_herramientas_limpieza: p("herramientas_limpieza").comentario,
                estado_mesanine: p("mesanine").estado, comentario_mesanine: p("mesanine").comentario,
                estado_romana: p("romana").estado, comentario_romana: p("romana").comentario,
                estado_baldes_melaza: p("baldes_melaza").estado, comentario_baldes_melaza: p("baldes_melaza").comentario,
                estado_recoleccion_basura: p("recoleccion_basura").estado, comentario_recoleccion_basura: p("recoleccion_basura").comentario,
                estado_carcamo_bombeo: p("carcamo_bombeo").estado, comentario_carcamo_bombeo: p("carcamo_bombeo").comentario,
                estado_tornillo_sin_fin: p("tornillo_sin_fin").estado, comentario_tornillo_sin_fin: p("tornillo_sin_fin").comentario,
                estado_banda_plana: p("banda_plana").estado, comentario_banda_plana: p("banda_plana").comentario,
                estado_banda_inclinada: p("banda_inclinada").estado, comentario_banda_inclinada: p("banda_inclinada").comentario,
                estado_triturador: p("triturador").estado, comentario_triturador: p("triturador").comentario,
                estado_tolva_cascara_1: p("tolva_cascara_1").estado, comentario_tolva_cascara_1: p("tolva_cascara_1").comentario,
                estado_tolva_cascara_2: p("tolva_cascara_2").estado, comentario_tolva_cascara_2: p("tolva_cascara_2").comentario,
                estado_tolva_cascara_3: p("tolva_cascara_3").estado, comentario_tolva_cascara_3: p("tolva_cascara_3").comentario,
                estado_cano: p("cano").estado, comentario_cano: p("cano").comentario,
                estado_rampa_pila: p("rampa_pila").estado, comentario_rampa_pila: p("rampa_pila").comentario,
                estado_pila_cascara: p("pila_cascara").estado, comentario_pila_cascara: p("pila_cascara").comentario,
            };

            const { error } = await supabase
                .from("limpieza_dieta_siembra_1")
                .insert([payload])
                .select("id, fecha_correccion")
                .single();

            if (error) throw error;

            showToast("success", "Éxito", "Registro guardado correctamente");
            await fetchRegistros();
            setDialogOpen(false);
            setForm(emptyForm());
            setSubmitted(false);
        } catch (error) {
            console.error(error);
            showToast("error", "Error", error.message || "No se pudo guardar el registro");
        } finally {
            setSaving(false);
        }
    };


    const countBy = (row, val) =>
        ITEMS.reduce((acc, it) => acc + (row.items?.[it.key]?.estado === val ? 1 : 0), 0);

    const dynamicColumns = ITEMS.map((it) => ({
        header: it.label,
        body: (row) => row.items?.[it.key]?.estado || "",
    }));

    // plantilla de checkbox revisado
    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            if (!username) {
                showToast("warn", "Sesión", "No se detectó el usuario actual.");
                return;
            }
            const { error } = await supabase
                .from("limpieza_dieta_siembra_1")
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
                <Checkbox
                    inputId={`chk-rev-ds-${row.id}`}
                    checked={!!row.revisado}
                    onChange={(e) => onToggle(e.checked)}
                />
                <label htmlFor={`chk-rev-ds-${row.id}`} className="text-sm">
                    Revisado
                </label>
            </div>
        );
    };

    // header con búsqueda + filtro
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
                Registro de Limpieza del Área de Dieta y Siembra
            </h1>

            <div className="welcome-message">
                <div className="welcome-message">
                    <p>
                        <span>
                            <b className="bold-space">Selecciona:</b>
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
                    body={(r) => (r?.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "-")}
                    sortable
                />
                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />
                {dynamicColumns.map((c, i) => (
                    <Column key={i} header={c.header} body={c.body} />
                ))}
                {/* última columna: checkbox revisado */}
                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
            </DataTable>

            <Dialog
                visible={dialogOpen}
                style={{ width: "68vw", maxWidth: 1050 }}
                header="Nuevo registro"
                modal
                onHide={hideDialog}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancelar" icon="pi pi-times" outlined onClick={hideDialog} />
                        <Button
                            label="Guardar"
                            icon="pi pi-check"
                            onClick={save}
                            disabled={saving}
                            loading={saving}
                        />
                    </div>
                }
            >
                <div className="p-fluid grid">
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Fecha</label>
                        <InputText
                            type="date"
                            value={form.fecha_registro}
                            onChange={(e) => onHeaderChange(e, "fecha_registro")}
                        />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora</label>
                        <InputText
                            type="time"
                            value={form.hora_registro}
                            onChange={(e) => onHeaderChange(e, "hora_registro")}
                        />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Operario*</label>
                        <InputText
                            value={form.firma_encargado}
                            onChange={(e) => onHeaderChange(e, "firma_encargado")}
                        />
                    </div>

                    {/*<div className="field col-12 md:col-6">
                        <label className="font-bold">Verificación (Coordinación de Inocuidad)</label>
                        <InputText
                            value={form.verificacion_inocuidad}
                            onChange={(e) => onHeaderChange(e, "verificacion_inocuidad")}
                        />
                    </div>*/}

                    {/* Copiar en Supabase para ver los registros y poder exportarlos
                            SELECT
                             h.id,
                          h.fecha_registro,
                          h.hora_registro,
                        h.firma_encargado,
                        h.verificacion_inocuidad,
                      h.fecha_correccion,
                      i.item_key,
                      i.estado,
                      i.comentario
                    FROM public.limpieza_dieta_siembra AS h
                    JOIN public.limpieza_dieta_siembra_items AS i
                    ON i.id_registro = h.id
                    ORDER BY h.fecha_registro DESC, h.id, i.item_key;">*/}

                    {ITEMS.map((it) => {
                        const val = form.items[it.key] || { estado: "", comentario: "" };
                        const necesitaComentario = val.estado && val.estado !== "C";
                        return (
                            <div className="field col-12 md:col-6" key={it.key}>
                                <label className="font-bold">
                                    {it.label}*
                                    {submitted && !val.estado && <small className="p-error"> Requerido</small>}
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
                                        {submitted && !val.comentario?.trim() && (
                                            <small className="p-error"> Requerido</small>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}

                    <div className="field col-12">
                        <label className="font-bold">Fecha de Registro (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>
        </div>

    );
}
