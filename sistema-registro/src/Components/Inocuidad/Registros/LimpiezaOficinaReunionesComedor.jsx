import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient";
import logo2 from "../../../assets/mosca.png";
import "./LimpiezaOficinaReunionesComedor.css";


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

// Hook de permisos (ajusta la ruta si tu árbol difiere)
import useCanReview from "../Registros/Hooks/useCanReview.js";

const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    // Oficinas
    { key: "of_pisos", label: "Pisos (Diario)", grupo: "Oficinas" },
    { key: "of_muebles", label: "Muebles (Diario)", grupo: "Oficinas" },
    { key: "of_sillas_escritorios", label: "Sillas y escritorios (Diario)", grupo: "Oficinas" },
    { key: "of_puerta", label: "Puerta (Diario)", grupo: "Oficinas" },
    { key: "of_recoleccion_basura", label: "Recolección de basura (Diario)", grupo: "Oficinas" },
    { key: "of_ventanas", label: "Ventanas (Diario)", grupo: "Oficinas" },
    { key: "of_cielos_falsos", label: "Cielos falsos (Mensual)", grupo: "Oficinas" },

    // Sala de Reuniones
    { key: "sr_pisos", label: "Pisos (Diario)", grupo: "Sala de Reuniones" },
    { key: "sr_muebles", label: "Muebles (Diario)", grupo: "Sala de Reuniones" },
    { key: "sr_ventanas", label: "Ventanas (Diario)", grupo: "Sala de Reuniones" },
    { key: "sr_cielos_falsos", label: "Cielos falsos (Mensual)", grupo: "Sala de Reuniones" },

    // Comedor
    { key: "com_sillas_mesas", label: "Sillas y mesas (Diario)", grupo: "Comedor" },
    { key: "com_recoleccion_basura", label: "Recolección de basura (Diario)", grupo: "Comedor" },
    { key: "com_dispensadores_agua", label: "Dispensadores de agua (Diario)", grupo: "Comedor" },
    { key: "com_pisos", label: "Pisos (Diario)", grupo: "Comedor" },
    { key: "com_puerta_entrada", label: "Puerta de entrada (Diario)", grupo: "Comedor" },
    { key: "com_microondas", label: "Microondas (Diario)", grupo: "Comedor" },
    { key: "com_refrigeradoras", label: "Refrigeradoras (Mensual)", grupo: "Comedor" },
    { key: "com_techo", label: "Techo (Mensual)", grupo: "Comedor" },
    { key: "com_persianas", label: "Persianas (Mensual)", grupo: "Comedor" },
    { key: "com_paredes", label: "Paredes (Mensual)", grupo: "Comedor" },
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
    fecha_correccion_preview: new Date().toLocaleString(), // solo visual
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "", comentario: "" };
        return acc;
    }, {}),
});

// DB -> UI
// Reemplaza tu packRow por este:
const packRow = (dbRow) => {
    const isWide =
        dbRow.estado_of_pisos !== undefined ||
        dbRow.estado_sr_pisos !== undefined ||
        dbRow.estado_com_pisos !== undefined;

    const items = isWide
        ? {
            // Oficinas
            of_pisos: { estado: dbRow.estado_of_pisos || "", comentario: dbRow.comentario_of_pisos || "" },
            of_muebles: { estado: dbRow.estado_of_muebles || "", comentario: dbRow.comentario_of_muebles || "" },
            of_sillas_escritorios: { estado: dbRow.estado_of_sillas_escritorios || "", comentario: dbRow.comentario_of_sillas_escritorios || "" },
            of_puerta: { estado: dbRow.estado_of_puerta || "", comentario: dbRow.comentario_of_puerta || "" },
            of_recoleccion_basura: { estado: dbRow.estado_of_recoleccion_basura || "", comentario: dbRow.comentario_of_recoleccion_basura || "" },
            of_ventanas: { estado: dbRow.estado_of_ventanas || "", comentario: dbRow.comentario_of_ventanas || "" },
            of_cielos_falsos: { estado: dbRow.estado_of_cielos_falsos || "", comentario: dbRow.comentario_of_cielos_falsos || "" },

            // Sala de Reuniones
            sr_pisos: { estado: dbRow.estado_sr_pisos || "", comentario: dbRow.comentario_sr_pisos || "" },
            sr_muebles: { estado: dbRow.estado_sr_muebles || "", comentario: dbRow.comentario_sr_muebles || "" },
            sr_ventanas: { estado: dbRow.estado_sr_ventanas || "", comentario: dbRow.comentario_sr_ventanas || "" },
            sr_cielos_falsos: { estado: dbRow.estado_sr_cielos_falsos || "", comentario: dbRow.comentario_sr_cielos_falsos || "" },

            // Comedor
            com_sillas_mesas: { estado: dbRow.estado_com_sillas_mesas || "", comentario: dbRow.comentario_com_sillas_mesas || "" },
            com_recoleccion_basura: { estado: dbRow.estado_com_recoleccion_basura || "", comentario: dbRow.comentario_com_recoleccion_basura || "" },
            com_dispensadores_agua: { estado: dbRow.estado_com_dispensadores_agua || "", comentario: dbRow.comentario_com_dispensadores_agua || "" },
            com_pisos: { estado: dbRow.estado_com_pisos || "", comentario: dbRow.comentario_com_pisos || "" },
            com_puerta_entrada: { estado: dbRow.estado_com_puerta_entrada || "", comentario: dbRow.comentario_com_puerta_entrada || "" },
            com_microondas: { estado: dbRow.estado_com_microondas || "", comentario: dbRow.comentario_com_microondas || "" },
            com_refrigeradoras: { estado: dbRow.estado_com_refrigeradoras || "", comentario: dbRow.comentario_com_refrigeradoras || "" },
            com_techo: { estado: dbRow.estado_com_techo || "", comentario: dbRow.comentario_com_techo || "" },
            com_persianas: { estado: dbRow.estado_com_persianas || "", comentario: dbRow.comentario_com_persianas || "" },
            com_paredes: { estado: dbRow.estado_com_paredes || "", comentario: dbRow.comentario_com_paredes || "" },
        }
        : ITEMS.reduce((acc, it) => {
            const f = (dbRow.items || []).find((x) => x.item_key === it.key);
            acc[it.key] = { estado: f?.estado || "", comentario: f?.comentario || "" };
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
        items,
    };
};


export default function LimpiezaOficinaReunionesComedor() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyForm());

    // filtro revisado
    const [filtroRevisado, setFiltroRevisado] = useState("all"); // 'all' | 'checked' | 'unchecked'
    // permisos
    const { canReview, username } = useCanReview();

    const grupos = {
        Oficinas: ITEMS.filter((i) => i.grupo === "Oficinas"),
        "Sala de Reuniones": ITEMS.filter((i) => i.grupo === "Sala de Reuniones"),
        Comedor: ITEMS.filter((i) => i.grupo === "Comedor"),
    };

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    // Reemplaza tu fetchRegistros por este:
    const fetchRegistros = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from("limpieza_oficina_reuniones_comedor_1")
                .select(`
        id, fecha_registro, hora_registro, firma_encargado, verificacion_inocuidad,
        fecha_correccion, revisado, revisado_por_username, revisado_fecha,

        estado_of_pisos, comentario_of_pisos,
        estado_of_muebles, comentario_of_muebles,
        estado_of_sillas_escritorios, comentario_of_sillas_escritorios,
        estado_of_puerta, comentario_of_puerta,
        estado_of_recoleccion_basura, comentario_of_recoleccion_basura,
        estado_of_ventanas, comentario_of_ventanas,
        estado_of_cielos_falsos, comentario_of_cielos_falsos,

        estado_sr_pisos, comentario_sr_pisos,
        estado_sr_muebles, comentario_sr_muebles,
        estado_sr_ventanas, comentario_sr_ventanas,
        estado_sr_cielos_falsos, comentario_sr_cielos_falsos,

        estado_com_sillas_mesas, comentario_com_sillas_mesas,
        estado_com_recoleccion_basura, comentario_com_recoleccion_basura,
        estado_com_dispensadores_agua, comentario_com_dispensadores_agua,
        estado_com_pisos, comentario_com_pisos,
        estado_com_puerta_entrada, comentario_com_puerta_entrada,
        estado_com_microondas, comentario_com_microondas,
        estado_com_refrigeradoras, comentario_com_refrigeradoras,
        estado_com_techo, comentario_com_techo,
        estado_com_persianas, comentario_com_persianas,
        estado_com_paredes, comentario_com_paredes
      `)
                .order("fecha_registro", { ascending: false });

            if (filtroRevisado === "checked") query = query.eq("revisado", true);
            if (filtroRevisado === "unchecked") query = query.eq("revisado", false);

            const { data, error } = await query;
            if (error) throw error;
            setRows((data || []).map(packRow));
        } catch (e) {
            console.error(e);
            showToast("error", "Error", "No se pudieron cargar los registros");
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
        setForm((p) => ({ ...p, items: { ...p.items, [key]: { ...(p.items[key] || {}), [field]: value } } }));

    const validate = () => {
        const errors = [];
        ITEMS.forEach((it) => {
            const v = form.items[it.key]?.estado;
            if (!v) errors.push(`Seleccione estado para: ${it.label}`);
            if (v && v !== "C" && !form.items[it.key]?.comentario?.trim())
                errors.push(`Comentario requerido en ${it.label} (NC/NA).`);
        });
        return errors;
    };

    // Reemplaza tu save por este:
    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) { showToast("warn", "Validación", errs[0]); return; }

        try {
            const p = (k) => ({
                estado: form.items[k]?.estado || null,
                comentario: form.items[k]?.comentario || null,
            });

            const payload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                firma_encargado: form.firma_encargado || "",
                verificacion_inocuidad: form.verificacion_inocuidad || null,

                // Oficinas
                estado_of_pisos: p("of_pisos").estado, comentario_of_pisos: p("of_pisos").comentario,
                estado_of_muebles: p("of_muebles").estado, comentario_of_muebles: p("of_muebles").comentario,
                estado_of_sillas_escritorios: p("of_sillas_escritorios").estado, comentario_of_sillas_escritorios: p("of_sillas_escritorios").comentario,
                estado_of_puerta: p("of_puerta").estado, comentario_of_puerta: p("of_puerta").comentario,
                estado_of_recoleccion_basura: p("of_recoleccion_basura").estado, comentario_of_recoleccion_basura: p("of_recoleccion_basura").comentario,
                estado_of_ventanas: p("of_ventanas").estado, comentario_of_ventanas: p("of_ventanas").comentario,
                estado_of_cielos_falsos: p("of_cielos_falsos").estado, comentario_of_cielos_falsos: p("of_cielos_falsos").comentario,


                estado_sr_pisos: p("sr_pisos").estado, comentario_sr_pisos: p("sr_pisos").comentario,
                estado_sr_muebles: p("sr_muebles").estado, comentario_sr_muebles: p("sr_muebles").comentario,
                estado_sr_ventanas: p("sr_ventanas").estado, comentario_sr_ventanas: p("sr_ventanas").comentario,
                estado_sr_cielos_falsos: p("sr_cielos_falsos").estado, comentario_sr_cielos_falsos: p("sr_cielos_falsos").comentario,

                // Comedor
                estado_com_sillas_mesas: p("com_sillas_mesas").estado, comentario_com_sillas_mesas: p("com_sillas_mesas").comentario,
                estado_com_recoleccion_basura: p("com_recoleccion_basura").estado, comentario_com_recoleccion_basura: p("com_recoleccion_basura").comentario,
                estado_com_dispensadores_agua: p("com_dispensadores_agua").estado, comentario_com_dispensadores_agua: p("com_dispensadores_agua").comentario,
                estado_com_pisos: p("com_pisos").estado, comentario_com_pisos: p("com_pisos").comentario,
                estado_com_puerta_entrada: p("com_puerta_entrada").estado, comentario_com_puerta_entrada: p("com_puerta_entrada").comentario,
                estado_com_microondas: p("com_microondas").estado, comentario_com_microondas: p("com_microondas").comentario,
                estado_com_refrigeradoras: p("com_refrigeradoras").estado, comentario_com_refrigeradoras: p("com_refrigeradoras").comentario,
                estado_com_techo: p("com_techo").estado, comentario_com_techo: p("com_techo").comentario,
                estado_com_persianas: p("com_persianas").estado, comentario_com_persianas: p("com_persianas").comentario,
                estado_com_paredes: p("com_paredes").estado, comentario_com_paredes: p("com_paredes").comentario,
            };

            const { error } = await supabase
                .from("limpieza_oficina_reuniones_comedor_1")
                .insert([payload])
                .select("id")
                .single();

            if (error) throw error;

            showToast("success", "Éxito", "Registro guardado correctamente");
            setDialogOpen(false);
            setForm(emptyForm());
            setSubmitted(false);
            await fetchRegistros();
        } catch (e) {
            console.error(e);
            showToast("error", "Error", e.message || "No se pudo guardar");
        }
    };


    const countBy = (row, val) => ITEMS.reduce((acc, it) => acc + (row.items?.[it.key]?.estado === val ? 1 : 0), 0);

    // plantilla de checkbox revisado
    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            if (!username) {
                showToast("warn", "Sesión", "No se detectó el usuario actual.");
                return;
            }
            const { error } = await supabase
                .from("limpieza_oficina_reuniones_comedor_1")
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
                    inputId={`chk-rev-ofi-${row.id}`}
                    checked={!!row.revisado}
                    onChange={(e) => onToggle(e.checked)}
                />
                <label htmlFor={`chk-rev-ofi-${row.id}`} className="text-sm">
                    Revisado
                </label>
            </div>
        );
    };

    const exportXlsx = () => {
        const rowsToExport = (Array.isArray(rows) ? rows : []).map((r) => {
            const base = {
                fecha_registro: r.fecha_registro,
                hora_registro: r.hora_registro,
                firma_encargado: r.firma_encargado,
                verificacion_inocuidad: r.verificacion_inocuidad,
                fecha_correccion: r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "",
                revisado: r.revisado ? "Sí" : "No",
            };
            ITEMS.forEach((it) => {
                base[`${it.grupo} - ${it.label}`] = r.items?.[it.key]?.estado || "";
                base[`${it.grupo} - ${it.label} (comentario)`] = r.items?.[it.key]?.comentario || "";
            });
            return base;
        });
        const ws = XLSX.utils.json_to_sheet(rowsToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Limpieza Oficina");
        XLSX.writeFile(wb, `Limpieza_Oficina_Reuniones_Comedor_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
                Registro de Limpieza y Desinfección – Oficinas, Sala de Reuniones y Comedor
            </h1>

            <div className="welcome-message">
                <p>
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

                <Column
                    field="fecha_correccion"
                    header="Fecha de Registro"
                    body={(r) => (r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "")}
                    sortable
                />
                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />
                {ITEMS.map((it) => (
                    <Column key={it.key} header={`${it.grupo} - ${it.label}`} body={(row) => row.items?.[it.key]?.estado || ""} />
                ))}
                {/* última columna: checkbox revisado */}
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

                    {/* Títulos MÁS GRANDES para diferenciar secciones en el modal */}
                    {["Oficinas", "Sala de Reuniones", "Comedor"].map((g) => (
                        <div key={g} className="col-12">
                            <div
                                className="mb-3"
                                style={{
                                    fontSize: "1.6rem",
                                    fontWeight: 800,
                                    padding: "6px 0",
                                    borderBottom: "2px solid #e9ecef",
                                }}
                            >
                                {g}
                            </div>
                            <div className="grid">
                                {grupos[g].map((it) => {
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
