import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient"; // igual que tu Tarimas/Cajas
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
import "./LimpiezaHornoMultilevel.css";

const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    { key: "bandas_transportadoras", label: "Bandas transportadoras" },
    { key: "dosificador_larva", label: "Dosificador de larva" },
    { key: "banda_1", label: "Banda 1" },
    { key: "banda_2", label: "Banda 2" },
    { key: "banda_3", label: "Banda 3" },
    { key: "banda_4", label: "Banda 4" },
    { key: "banda_5", label: "Banda 5" },
    { key: "compuertas_limpieza", label: "Compuertas de limpieza" },
    { key: "bandas_enfriamiento", label: "Bandas de enfriamiento" },
    { key: "canguilones", label: "Canguilones" },
    { key: "piso", label: "Piso" },
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
    // solo visual; la columna real se completa en DB (default now())
    fecha_correccion_preview: new Date().toLocaleString(),
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "", comentario: "" };
        return acc;
    }, {}),
});

// Mapea array de items -> objeto por clave (para DataTable)
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
        firma_encargado: dbRow.firma_encargado,
        verificacion_inocuidad: dbRow.verificacion_inocuidad,
        fecha_correccion: dbRow.fecha_correccion,
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
                fecha_correccion: new Date(row.fecha_correccion).toLocaleString(),
            };
            Object.keys(row.items || {}).forEach((k) => {
                base[`${k}_estado`] = row.items[k]?.estado || "";
                base[`${k}_comentario`] = row.items[k]?.comentario || "";
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
            const { data, error } = await supabase
                .from("limpieza_horno_ml")
                .select(`
          id,
          fecha_registro,
          hora_registro,
          firma_encargado,
          verificacion_inocuidad,
          fecha_correccion,
          items:limpieza_horno_ml_items!limpieza_horno_ml_items_id_registro_fkey (
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
            // 1) Encabezado
            const { data: enc, error: errEnc } = await supabase
                .from("limpieza_horno_ml")
                .insert([
                    {
                        fecha_registro: form.fecha_registro,
                        hora_registro: form.hora_registro,
                        firma_encargado: form.firma_encargado || null,
                        verificacion_inocuidad: form.verificacion_inocuidad || null,
                        // fecha_correccion la pone la DB (default now())
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
                .from("limpieza_horno_ml_items")
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
                Registro de Limpieza Horno Multilevel
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
                <Column field="firma_encargado" header="Firma encargado" />
                <Column field="verificacion_inocuidad" header="Verificación Inocuidad" />
                <Column
                    field="fecha_correccion"
                    header="Fecha de corrección"
                    body={(r) => (r?.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "-")}
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

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Verificación (Coordinación de Inocuidad)</label>
                        <InputText value={form.verificacion_inocuidad}
                            onChange={(e) => onHeaderChange(e, "verificacion_inocuidad")} />
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

                    <div className="field col-12">
                        <label className="font-bold">Fecha de corrección (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
