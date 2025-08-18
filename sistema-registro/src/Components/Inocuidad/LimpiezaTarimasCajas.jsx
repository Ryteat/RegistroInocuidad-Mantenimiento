import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../supabaseClient";
import logo2 from "../../assets/mosca.png";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import { Toast } from "primereact/toast";
import { Toolbar } from "primereact/toolbar";
// Exportación a Excel
import * as XLSX from "xlsx";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    { key: "lavado_cajas_1x1", label: "Lavado de cajas de 1×1" },
    { key: "lavado_tarimas", label: "Lavado de tarimas" },
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
    cant_tarimas_limpias: 0,
    cant_cajas_colores_limpias: 0,
    firma_encargado: "",
    // solo visual en el modal; la columna real se llena en DB (default now())
    fecha_correccion_preview: new Date().toLocaleString(),
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "", comentario: "" };
        return acc;
    }, {}),
});

// Mapea array de items -> objeto por clave para la tabla
const packRow = (dbRow) => {
    const itemsMap = ITEMS.reduce((acc, it) => {
        const found = (dbRow.items || []).find((x) => x.item_key === it.key);
        acc[it.key] = { estado: found?.estado || "", comentario: found?.comentario || "" };
        return acc;
    }, {});
    return {
        id: dbRow.id,
        fecha_registro: dbRow.fecha_registro,
        hora_registro: dbRow.hora_registro,
        cant_tarimas_limpias: dbRow.cant_tarimas_limpias,
        cant_cajas_colores_limpias: dbRow.cant_cajas_colores_limpias,
        firma_encargado: dbRow.firma_encargado,
        fecha_correccion: dbRow.fecha_correccion, // lo muestra la grilla
        items: itemsMap,
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

    // Exportar a Excel (igual que LimpiezaAreaHatchery)
    const exportXlsx = () => {
        const rowsToExport = (Array.isArray(rows) ? rows : []).map((row) => {
            const base = {
                fecha_registro: row.fecha_registro,
                hora_registro: row.hora_registro,
                cant_tarimas_limpias: row.cant_tarimas_limpias,
                cant_cajas_colores_limpias: row.cant_cajas_colores_limpias,
                firma_encargado: row.firma_encargado,
                fecha_correccion: row.fecha_correccion,
            };
            Object.keys(row.items).forEach((key) => {
                base[`${key}_estado`] = row.items[key]?.estado || "";
                base[`${key}_comentario`] = row.items[key]?.comentario || "";
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
            const { data, error } = await supabase
                .from("limpieza_tarimas_cajas")
                .select(`
          id,
          fecha_registro,
          hora_registro,
          cant_tarimas_limpias,
          cant_cajas_colores_limpias,
          firma_encargado,
          fecha_correccion,
          items:limpieza_tarimas_cajas_items!limpieza_tarimas_cajas_items_id_registro_fkey (
            item_key, estado, comentario
          )
        `)
                .order("fecha_registro", { ascending: false });

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
    }, []);

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

        const n1 = Number(form.cant_tarimas_limpias);
        const n2 = Number(form.cant_cajas_colores_limpias);
        if (!Number.isInteger(n1) || n1 < 0) errs.push("Cantidad de tarimas limpias debe ser un entero ≥ 0.");
        if (!Number.isInteger(n2) || n2 < 0) errs.push("Cantidad de cajas de colores limpias debe ser un entero ≥ 0.");

        return errs;
        // firma_encargado opcional; agrega como requerido si lo necesitas
    };

    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) {
            showToast("error", "Validación", errs[0]);
            return;
        }
        try {
            // 1) Encabezado
            const { data: enc, error: errEnc } = await supabase
                .from("limpieza_tarimas_cajas")
                .insert([
                    {
                        fecha_registro: form.fecha_registro,
                        hora_registro: form.hora_registro,
                        cant_tarimas_limpias: Number(form.cant_tarimas_limpias) || 0,
                        cant_cajas_colores_limpias: Number(form.cant_cajas_colores_limpias) || 0,
                        firma_encargado: form.firma_encargado || null,
                        // fecha_correccion la pone la DB: default now()
                    },
                ])
                .select("id")
                .single();

            if (errEnc) throw errEnc;
            const newId = enc.id;

            // 2) Detalle
            const itemsInsert = ITEMS.map((it) => ({
                id_registro: newId,
                item_key: it.key,
                estado: form.items[it.key]?.estado || "",
                comentario: form.items[it.key]?.comentario || null,
            }));

            const { error: errDet } = await supabase
                .from("limpieza_tarimas_cajas_items")
                .insert(itemsInsert);

            if (errDet) throw errDet;

            showToast("success", "Éxito", "Registro guardado correctamente");
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

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    type="search"
                    value={globalFilter}
                    onInput={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar por fecha..."
                />
            </span>
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
                    Rúbrica: <b>C</b> (Cumple), <b>NC</b> (No cumple), <b>NA</b> (No aplica).
                    Para <b>NC/NA</b> el comentario es obligatorio. La “Fecha de corrección” se genera
                    automáticamente al guardar (momento exacto del registro).
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
                <Column field="cant_tarimas_limpias" header="Tarimas limpias" sortable />
                <Column field="cant_cajas_colores_limpias" header="Cajas colores limpias" sortable />
                <Column field="firma_encargado" header="Firma encargado" />
                <Column field="fecha_correccion" header="Fecha de corrección"
                    body={(r) => new Date(r.fecha_correccion).toLocaleString()} sortable />
                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />
                {dynamicColumns.map((c, i) => (
                    <Column key={i} header={c.header} body={c.body} />
                ))}
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
                        <InputText type="date" value={form.fecha_registro}
                            onChange={(e) => onHeaderChange(e, "fecha_registro")} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora</label>
                        <InputText type="time" value={form.hora_registro}
                            onChange={(e) => onHeaderChange(e, "hora_registro")} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Firma del encargado</label>
                        <InputText value={form.firma_encargado}
                            onChange={(e) => onHeaderChange(e, "firma_encargado")} />
                    </div>

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

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Cantidad de tarimas limpias*</label>
                        <InputText
                            type="number"
                            value={form.cant_tarimas_limpias}
                            onChange={(e) => onHeaderChange(e, "cant_tarimas_limpias")}
                        />
                        {submitted && (!Number.isInteger(Number(form.cant_tarimas_limpias)) || Number(form.cant_tarimas_limpias) < 0) &&
                            <small className="p-error"> Debe ser entero ≥ 0</small>}
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Cantidad de cajas de colores limpias*</label>
                        <InputText
                            type="number"
                            value={form.cant_cajas_colores_limpias}
                            onChange={(e) => onHeaderChange(e, "cant_cajas_colores_limpias")}
                        />
                        {submitted && (!Number.isInteger(Number(form.cant_cajas_colores_limpias)) || Number(form.cant_cajas_colores_limpias) < 0) &&
                            <small className="p-error"> Debe ser entero ≥ 0</small>}
                    </div>

                    <div className="field col-12">
                        <label className="font-bold">Fecha de corrección (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
