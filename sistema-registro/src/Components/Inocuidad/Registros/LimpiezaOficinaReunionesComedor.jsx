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
import * as XLSX from "xlsx";

const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    // Oficinas
    { key: "of_pisos", label: "Pisos", grupo: "Oficinas" },
    { key: "of_muebles", label: "Muebles", grupo: "Oficinas" },
    { key: "of_sillas_escritorios", label: "Sillas y escritorios", grupo: "Oficinas" },
    { key: "of_puerta", label: "Puerta", grupo: "Oficinas" },
    { key: "of_recoleccion_basura", label: "Recolección de basura", grupo: "Oficinas" },
    { key: "of_ventanas", label: "Ventanas", grupo: "Oficinas" },
    { key: "of_cielos_falsos", label: "Cielos falsos", grupo: "Oficinas" },

    // Sala de Reuniones
    { key: "sr_pisos", label: "Pisos", grupo: "Sala de Reuniones" },
    { key: "sr_muebles", label: "Muebles", grupo: "Sala de Reuniones" },
    { key: "sr_ventanas", label: "Ventanas", grupo: "Sala de Reuniones" },
    { key: "sr_cielos_falsos", label: "Cielos falsos", grupo: "Sala de Reuniones" },

    // Comedor
    { key: "com_sillas_mesas", label: "Sillas y mesas", grupo: "Comedor" },
    { key: "com_recoleccion_basura", label: "Recolección de basura", grupo: "Comedor" },
    { key: "com_dispensadores_agua", label: "Dispensadores de agua", grupo: "Comedor" },
    { key: "com_pisos", label: "Pisos", grupo: "Comedor" },
    { key: "com_puerta_entrada", label: "Puerta de entrada", grupo: "Comedor" },
    { key: "com_microondas", label: "Microondas", grupo: "Comedor" },
    { key: "com_filtros_aire", label: "Filtros de aire", grupo: "Comedor" },
    { key: "com_refrigeradoras", label: "Refrigeradoras", grupo: "Comedor" },
    { key: "com_techo", label: "Techo", grupo: "Comedor" },
    { key: "com_persianas", label: "Persianas", grupo: "Comedor" },
    { key: "com_paredes", label: "Paredes", grupo: "Comedor" },
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

const packRow = (dbRow) => {
    const map = ITEMS.reduce((acc, it) => {
        const f = (dbRow.items || []).find(x => x.item_key === it.key);
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
        items: map,
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

    const grupos = {
        Oficinas: ITEMS.filter(i => i.grupo === "Oficinas"),
        "Sala de Reuniones": ITEMS.filter(i => i.grupo === "Sala de Reuniones"),
        Comedor: ITEMS.filter(i => i.grupo === "Comedor"),
    };

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    const fetchRegistros = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("limpieza_oficina_reuniones_comedor")
                .select(`
          id,
          fecha_registro,
          hora_registro,
          firma_encargado,
          verificacion_inocuidad,
          fecha_correccion,
          items:limpieza_oficina_reuniones_comedor_items!limpieza_oficina_reuniones_comedor_items_id_registro_fkey (
            item_key, estado, comentario
          )
        `)
                .order("fecha_registro", { ascending: false });

            if (error) throw error;
            setRows((data || []).map(packRow));
        } catch (e) {
            console.error(e);
            showToast("error", "Error", "No se pudieron cargar los registros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRegistros(); }, []);

    const openNew = () => { setForm(emptyForm()); setSubmitted(false); setDialogOpen(true); };
    const hideDialog = () => { setDialogOpen(false); setSubmitted(false); };

    const onHeaderChange = (e, field) => setForm(p => ({ ...p, [field]: e.target.value }));
    const onItemChange = (key, field, value) =>
        setForm(p => ({ ...p, items: { ...p.items, [key]: { ...(p.items[key] || {}), [field]: value } } }));

    const validate = () => {
        const errors = [];
        ITEMS.forEach(it => {
            const v = form.items[it.key]?.estado;
            if (!v) errors.push(`Seleccione estado para: ${it.label}`);
            if (v && v !== "C" && !form.items[it.key]?.comentario?.trim())
                errors.push(`Comentario requerido en ${it.label} (NC/NA).`);
        });
        return errors;
    };

    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) { showToast("warn", "Validación", errs[0]); return; }

        try {
            // 1) Insert encabezado (fecha_correccion la pone la DB)
            const { data: enc, error: errEnc } = await supabase
                .from("limpieza_oficina_reuniones_comedor")
                .insert([{
                    fecha_registro: form.fecha_registro,
                    hora_registro: form.hora_registro,
                    firma_encargado: form.firma_encargado || null,
                    verificacion_inocuidad: form.verificacion_inocuidad || null,
                }])
                .select("id")
                .single();

            if (errEnc) throw errEnc;
            const idReg = enc.id;

            // 2) Insert detalle
            const detalle = ITEMS.map(it => ({
                id_registro: idReg,
                item_key: it.key,
                estado: form.items[it.key]?.estado || "",
                comentario: form.items[it.key]?.comentario || null,
            }));

            const { error: errDet } = await supabase
                .from("limpieza_oficina_reuniones_comedor_items")
                .insert(detalle);

            if (errDet) throw errDet;

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

    const dynamicColumns = ITEMS.map(it => ({
        header: `${it.grupo} - ${it.label}`,
        body: (row) => row.items?.[it.key]?.estado || "",
    }));

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    type="search"
                    value={globalFilter}
                    onInput={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar por fecha…"
                />
            </span>
        </div>
    );

    const exportXlsx = () => {
        const rowsToExport = (Array.isArray(rows) ? rows : []).map((r) => {
            const base = {
                fecha_registro: r.fecha_registro,
                hora_registro: r.hora_registro,
                firma_encargado: r.firma_encargado,
                verificacion_inocuidad: r.verificacion_inocuidad,
                fecha_correccion: new Date(r.fecha_correccion).toLocaleString(),
            };
            ITEMS.forEach(it => {
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

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Limpieza y Desinfección – Oficinas, Sala de Reuniones y Comedor
            </h1>

            <div className="welcome-message">
                <p>
                    Rúbrica: <b>C</b> (Cumple), <b>NC</b> (No cumple), <b>NA</b> (No aplica). Para <b>NC/NA</b> el comentario es obligatorio.
                    La “Fecha de corrección” se genera automáticamente al guardar.
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
                <Column field="firma_encargado" header="Firma encargado" />
                <Column field="verificacion_inocuidad" header="Verificación (I&D)" />
                <Column
                    field="fecha_correccion"
                    header="Fecha de corrección"
                    body={(r) => new Date(r.fecha_correccion).toLocaleString()}
                    sortable
                />
                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />
                {dynamicColumns.map((c, i) => (
                    <Column key={i} header={c.header} body={c.body} />
                ))}
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
                        <label className="font-bold">Firma del encargado</label>
                        <InputText value={form.firma_encargado} onChange={(e) => onHeaderChange(e, "firma_encargado")} />
                    </div>

                    {["Oficinas", "Sala de Reuniones", "Comedor"].map((g) => (
                        <div key={g} className="col-12">
                            <div className="font-bold text-lg mb-2">{g}</div>
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
                        <label className="font-bold">Verificación (I&D)</label>
                        <InputText value={form.verificacion_inocuidad} onChange={(e) => onHeaderChange(e, "verificacion_inocuidad")} />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Fecha de corrección (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
