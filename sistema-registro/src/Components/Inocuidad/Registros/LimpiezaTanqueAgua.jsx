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

/* ---------- catálogo preguntas ---------- */
const QUESTIONS = [
    { key: "q1", label: "¿El tanque se encontró vacío?" },
    { key: "q2", label: "¿Válvulas de entrada y salida cerradas?" },
    { key: "q3", label: "¿Verificó tuberías/válvulas/grietas/desgaste del tanque?" },
    { key: "q4", label: "¿Removió residuos sólidos del fondo del tanque?" },
    { key: "q5", label: "¿Enjuagó varias veces para eliminar residuos?" },
    { key: "q6", label: "¿Abrió válvulas de salida para evacuar sobrante?" },
    { key: "q7", label: "¿Preparó solución desinfectante (hipoclorito 3%)?" },
    { key: "q8", label: "¿Usó EPP para ingresar al tanque?" },
    { key: "q9", label: "¿Impregnó superficies con la solución (considerando EPP)?" },
    { key: "q10", label: "¿Dejó actuar desinfectante según el procedimiento?" },
    { key: "q11", label: "¿Abrió válvulas entrada/salida para remover desinfectante?" },
    { key: "q12", label: "¿Realizó varios lavados con agua potable (retiro de EPP)?" },
    { key: "q13", label: "¿Instaló tapa correctamente (evitar contaminantes)?" },
    { key: "q14", label: "¿Inyectó aire para respiración durante el trabajo (si aplica)?" },
    { key: "q15", label: "¿Tapa final quedó correctamente instalada?" },
];

const YESNO = [
    { label: "Sí", value: "SI" },
    { label: "No", value: "NO" },
];

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHM = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const emptyForm = () => ({
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    ubicacion_tanque: "",
    responsable_lavado: "",
    fecha_proximo_lavado: "",
    observaciones: "",
    fecha_correccion_preview: new Date().toLocaleString(), // visual; real la pone la DB
    items: QUESTIONS.reduce((acc, q) => { acc[q.key] = { respuesta: "" }; return acc; }, {}),
});

const packRow = (dbRow) => {
    const itemsMap = QUESTIONS.reduce((acc, q) => {
        const found = (dbRow.items || []).find(x => x.item_key === q.key);
        acc[q.key] = { respuesta: found?.respuesta || "" };
        return acc;
    }, {});
    return {
        id: dbRow.id,
        fecha_registro: dbRow.fecha_registro,
        hora_registro: dbRow.hora_registro,
        ubicacion_tanque: dbRow.ubicacion_tanque,
        responsable_lavado: dbRow.responsable_lavado,
        fecha_proximo_lavado: dbRow.fecha_proximo_lavado,
        fecha_correccion: dbRow.fecha_correccion,
        observaciones: dbRow.observaciones,
        items: itemsMap,
    };
};

export default function LimpiezaTanqueAgua() {
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

    const fetchRows = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("limpieza_tanque_agua")
                .select(`
          id, fecha_registro, hora_registro, ubicacion_tanque, responsable_lavado,
          fecha_proximo_lavado, fecha_correccion, observaciones,
          items:limpieza_tanque_agua_items!limpieza_tanque_agua_items_id_registro_fkey (
            item_key, respuesta
          )
        `)
                .order("fecha_registro", { ascending: false })
                .order("created_at", { ascending: false });
            if (error) throw error;
            setRows((data || []).map(packRow));
        } catch (e) {
            console.error(e);
            showToast("error", "Error", "No se pudieron cargar los registros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRows(); }, []);

    const openNew = () => { setForm(emptyForm()); setSubmitted(false); setDialogOpen(true); };
    const hideDialog = () => { setDialogOpen(false); setSubmitted(false); };

    const onHeaderChange = (e, field) => setForm(p => ({ ...p, [field]: e.target.value }));
    const onYesNoChange = (key, value) =>
        setForm(p => ({ ...p, items: { ...p.items, [key]: { respuesta: value } } }));

    const validate = () => {
        const errs = [];
        if (!form.ubicacion_tanque?.trim()) errs.push("La ubicación del tanque es requerida");
        if (!form.responsable_lavado?.trim()) errs.push("El responsable de lavado es requerido");
        QUESTIONS.forEach(q => {
            if (!form.items[q.key]?.respuesta) errs.push(`Responda: ${q.label}`);
        });
        return errs;
    };

    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) { showToast("warn", "Validación", errs[0]); return; }

        try {
            // 1) encabezado
            const { data: enc, error: errEnc } = await supabase
                .from("limpieza_tanque_agua")
                .insert([{
                    fecha_registro: form.fecha_registro,
                    hora_registro: form.hora_registro,
                    ubicacion_tanque: form.ubicacion_tanque,
                    responsable_lavado: form.responsable_lavado,
                    fecha_proximo_lavado: form.fecha_proximo_lavado || null,
                    observaciones: form.observaciones || null
                    // fecha_correccion -> la pone la DB (default now())
                }])
                .select("id")
                .single();
            if (errEnc) throw errEnc;

            // 2) detalle
            const detalle = QUESTIONS.map(q => ({
                id_registro: enc.id,
                item_key: q.key,
                respuesta: form.items[q.key]?.respuesta || "NO",
            }));
            const { error: errDet } = await supabase
                .from("limpieza_tanque_agua_items")
                .insert(detalle);
            if (errDet) throw errDet;

            showToast("success", "Éxito", "Registro guardado");
            setDialogOpen(false);
            setForm(emptyForm());
            setSubmitted(false);
            await fetchRows();
        } catch (e) {
            console.error(e);
            showToast("error", "Error", e.message || "No se pudo guardar");
        }
    };

    const countBy = (row, val) =>
        QUESTIONS.reduce((acc, q) => acc + (row.items?.[q.key]?.respuesta === val ? 1 : 0), 0);

    const dynamicColumns = QUESTIONS.map(q => ({
        header: q.label, body: (row) => row.items?.[q.key]?.respuesta || ""
    }));

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    type="search"
                    value={globalFilter}
                    onInput={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar por fecha o ubicación..."
                />
            </span>
        </div>
    );

    const exportXlsx = () => {
        if (!rows?.length) { showToast("warn", "Exportación", "No hay datos"); return; }
        const out = rows.map(r => {
            const base = {
                fecha_registro: r.fecha_registro,
                hora_registro: r.hora_registro,
                ubicacion_tanque: r.ubicacion_tanque,
                responsable_lavado: r.responsable_lavado,
                fecha_proximo_lavado: r.fecha_proximo_lavado || "",
                fecha_correccion: new Date(r.fecha_correccion).toLocaleString(),
                observaciones: r.observaciones || ""
            };
            QUESTIONS.forEach(q => base[q.label] = r.items?.[q.key]?.respuesta || "");
            return base;
        });
        const ws = XLSX.utils.json_to_sheet(out);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Limpieza Tanque Agua");
        XLSX.writeFile(wb, `Limpieza_Tanque_Agua_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Limpieza y Desinfección – Tanque de Agua Potable
            </h1>

            <div className="welcome-message">
                <p>
                    Complete las 15 preguntas (Sí/No). La <b>Fecha de corrección</b> se genera automáticamente al guardar.
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
                <Column field="ubicacion_tanque" header="Ubicación" sortable />
                <Column field="responsable_lavado" header="Responsable" sortable />
                <Column field="fecha_proximo_lavado" header="Próximo lavado" sortable />
                <Column header="#SI" body={(r) => countBy(r, "SI")} />
                <Column header="#NO" body={(r) => countBy(r, "NO")} />
                <Column
                    field="fecha_correccion"
                    header="Fecha de corrección"
                    body={(r) => new Date(r.fecha_correccion).toLocaleString()}
                    sortable
                />
                {dynamicColumns.map((c, i) => (
                    <Column key={i} header={c.header} body={c.body} />
                ))}
            </DataTable>

            <Dialog
                visible={dialogOpen}
                style={{ width: "70vw", maxWidth: 1100 }}
                header="Nuevo registro – Tanque de Agua Potable"
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
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">Fecha de lavado</label>
                        <InputText type="date" value={form.fecha_registro} onChange={(e) => onHeaderChange(e, "fecha_registro")} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">Hora</label>
                        <InputText type="time" value={form.hora_registro} onChange={(e) => onHeaderChange(e, "hora_registro")} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">Próximo lavado</label>
                        <InputText type="date" value={form.fecha_proximo_lavado} onChange={(e) => onHeaderChange(e, "fecha_proximo_lavado")} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">Fecha de corrección (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Ubicación del tanque* {submitted && !form.ubicacion_tanque && <small className="p-error"> Requerido</small>}
                        </label>
                        <InputText value={form.ubicacion_tanque} onChange={(e) => onHeaderChange(e, "ubicacion_tanque")} placeholder="Ej: Tanque principal nave A" />
                    </div>
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Responsable de lavado* {submitted && !form.responsable_lavado && <small className="p-error"> Requerido</small>}
                        </label>
                        <InputText value={form.responsable_lavado} onChange={(e) => onHeaderChange(e, "responsable_lavado")} placeholder="Nombre y/o firma" />
                    </div>

                    {/* 15 preguntas */}
                    {QUESTIONS.map((q) => {
                        const val = form.items[q.key]?.respuesta || "";
                        return (
                            <div key={q.key} className="field col-12 md:col-6">
                                <label className="font-bold">
                                    {q.label}* {submitted && !val && <small className="p-error"> Requerido</small>}
                                </label>
                                <Dropdown
                                    value={val}
                                    options={YESNO}
                                    onChange={(e) => onYesNoChange(q.key, e.value)}
                                    placeholder="Seleccione"
                                />
                            </div>
                        );
                    })}

                    <div className="field col-12">
                        <label className="font-bold">Observaciones</label>
                        <InputText value={form.observaciones} onChange={(e) => onHeaderChange(e, "observaciones")} />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
