import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

// -----------------------------
// Utilidades
// -----------------------------
const ESTADOS = [
    { label: "C (Cumple)", value: "C" },
    { label: "NC (No cumple)", value: "NC" },
    { label: "NA (No aplica)", value: "NA" },
];

const ITEMS = [
    // Semestral
    { key: "pisos", label: "Pisos", frecuencia: "Semestral" },
    { key: "paredes", label: "Paredes", frecuencia: "Semestral" },
    // Diario
    { key: "cajas_colores", label: "Cajas de colores", frecuencia: "Diario" },
    { key: "cajas_plasticas", label: "Cajas plásticas", frecuencia: "Diario" },
    { key: "mesas_laboratorio", label: "Mesas de laboratorio", frecuencia: "Diario" },
    { key: "equipo_laboratorio", label: "Equipo de laboratorio", frecuencia: "Diario" },
    { key: "estante_neonatos", label: "Estante de neonatos", frecuencia: "Diario" },
    { key: "cuarto_oscuro", label: "Cuarto oscuro", frecuencia: "Diario" },
];

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHM = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const uid = () => {
    try {
        // algunos entornos no exponen crypto directamente
        const c = (typeof window !== "undefined" ? window.crypto : undefined) || crypto;
        if (c?.randomUUID) return c.randomUUID();
    } catch { }
    return `${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

const emptyRegistro = () => ({
    id: uid(),
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    responsable: "",
    firma_encargado: "",
    fecha_correccion: "",
    observaciones_generales: "",
    items: ITEMS.reduce((acc, it) => {
        acc[it.key] = { estado: "", comentario: "" };
        return acc;
    }, {}),
});

const flattenForExport = (row) => {
    const base = {
        fecha_registro: row.fecha_registro,
        hora_registro: row.hora_registro,
        responsable: row.responsable,
    };
    ITEMS.forEach((it) => {
        base[`${it.label}`] = row.items?.[it.key]?.estado || "";
        base[`${it.label} - comentario`] = row.items?.[it.key]?.comentario || "";
    });
    base["firma_encargado"] = row.firma_encargado || "";
    base["fecha_correccion"] = row.fecha_correccion || "";
    base["observaciones"] = row.observaciones_generales || "";
    return base;
};

const validateRegistro = (form) => {
    const errs = [];
    if (!form.responsable?.trim()) errs.push("Responsable es requerido.");
    ITEMS.forEach((it) => {
        const v = form.items?.[it.key]?.estado;
        if (!v) errs.push(`Seleccione estado para: ${it.label}`);
        if (v && v !== "C" && !form.items[it.key].comentario?.trim()) {
            errs.push(`Comentario requerido en ${it.label} (NC/NA).`);
        }
    });
    return errs;
};

// -----------------------------
// Componente
// -----------------------------
export default function LimpiezaAreaHatchery() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);          // local por ahora
    const [selected, setSelected] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(emptyRegistro());

    const grupos = {
        Semestral: ITEMS.filter((i) => i.frecuencia === "Semestral"),
        Diario: ITEMS.filter((i) => i.frecuencia === "Diario"),
    };

    useEffect(() => {
        console.log("[DEBUG] LimpiezaAreaHatchery montado");
        setRows([]); // cuando conectemos a Supabase, haremos el fetch aquí
    }, []);

    const openNew = () => {
        setForm(emptyRegistro());
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
            items: { ...p.items, [key]: { ...(p.items[key] || { estado: "", comentario: "" }), [field]: value } },
        }));

    const save = async () => {
        setSubmitted(true);
        const errs = validateRegistro(form);
        if (errs.length) {
            toast.current.show({ severity: "error", summary: "Validación", detail: errs[0], life: 3000 });
            return;
        }
        setRows((prev) => [form, ...prev]);
        toast.current.show({ severity: "success", summary: "Guardado", detail: "Registro creado (local)", life: 2000 });
        setDialogOpen(false);
    };

    const countBy = (row, val) => ITEMS.reduce((acc, it) => acc + (row.items?.[it.key]?.estado === val ? 1 : 0), 0);
    const dynamicColumns = ITEMS.map((it) => ({ header: it.label, body: (row) => row.items?.[it.key]?.estado || "" }));

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    type="search"
                    value={globalFilter}
                    onInput={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar por responsable o fecha..."
                />
            </span>
        </div>
    );

    // Import dinámico -> evita que un problema de librería tumbe la app
    const exportPdf = async () => {
        if (selected.length === 0) {
            toast.current.show({ severity: "warn", summary: "Advertencia", detail: "Seleccione registros", life: 2500 });
            return;
        }
        try {
            const { default: jsPDF } = await import("jspdf");
            await import("jspdf-autotable");
            const doc = new jsPDF({ orientation: "landscape" });
            doc.setFontSize(14);
            doc.text("Registro de Limpieza - Área de Hatchery", 14, 14);
            const body = selected.map((r) => Object.values(flattenForExport(r)));
            const head = Object.keys(flattenForExport(selected[0]));
            doc.autoTable({ head: [head], body, styles: { fontSize: 8 }, startY: 20 });
            doc.save(`Limpieza_Hatchery_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            console.error(err);
            toast.current.show({ severity: "error", summary: "Exportación", detail: "No se pudo exportar a PDF", life: 3000 });
        }
    };

    const exportXlsx = async () => {
        if (selected.length === 0) {
            toast.current.show({ severity: "warn", summary: "Advertencia", detail: "Seleccione registros", life: 2500 });
            return;
        }
        try {
            const XLSX = await import("xlsx");
            const rows = selected.map(flattenForExport);
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Limpieza Hatchery");
            XLSX.writeFile(wb, `Limpieza_Hatchery_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error(err);
            toast.current.show({ severity: "error", summary: "Exportación", detail: "No se pudo exportar a Excel", life: 3000 });
        }
    };

    const leftToolbarTemplate = () => (
        <div className="flex gap-2">
            <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={openNew} />
        </div>
    );
    const rightToolbarTemplate = () => (
        <div className="exportar-container flex flex-wrap gap-2">
            <Button label="Exportar a Excel" icon="pi pi-upload" className="p-button-help" onClick={exportXlsx} />
            <Button label="Exportar a PDF" icon="pi pi-file-pdf" className="p-button-danger" onClick={exportPdf} />
        </div>
    );

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Registro de Limpieza del Área de Hatchery
            </h1>

            <div className="welcome-message">
                <p>
                    Selecciona <b>C</b> (Cumple), <b>NC</b> (No cumple) o <b>NA</b> (No aplica). Para <b>NC/NA</b>, el comentario es
                    obligatorio. <i>Pisos</i> y <i>Paredes</i> son <b>Semestrales</b>.
                </p>
            </div>

            <div className="buttons-container">
                <button onClick={() => navigate(-1)} className="return-button">Volver</button>
                <button onClick={() => navigate(-2)} className="menu-button">Menú principal</button>
            </div>

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

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
                <Column field="responsable" header="Responsable" sortable />
                <Column header="#C" body={(r) => countBy(r, "C")} />
                <Column header="#NC" body={(r) => countBy(r, "NC")} />
                <Column header="#NA" body={(r) => countBy(r, "NA")} />
                {dynamicColumns.map((c, i) => (
                    <Column key={i} header={c.header} body={c.body} />
                ))}
            </DataTable>

            {/* Dialog Nuevo Registro */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "70vw", maxWidth: 1100 }}
                header="Nuevo registro de limpieza"
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
                        <InputText value={form.fecha_registro} onChange={(e) => onHeaderChange(e, "fecha_registro")} type="date" />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora</label>
                        <InputText value={form.hora_registro} onChange={(e) => onHeaderChange(e, "hora_registro")} type="time" />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">
                            Responsable*
                            {submitted && !form.responsable && <small className="p-error"> Requerido</small>}
                        </label>
                        <InputText value={form.responsable} onChange={(e) => onHeaderChange(e, "responsable")} />
                    </div>

                    {["Semestral", "Diario"].map((freq) => (
                        <div key={freq} className="col-12">
                            <div className="font-bold text-lg mb-2">{freq}</div>
                            <div className="grid">
                                {grupos[freq].map((it) => {
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
                        <label className="font-bold">Firma del encargado de la limpieza</label>
                        <InputText value={form.firma_encargado} onChange={(e) => onHeaderChange(e, "firma_encargado")} />
                    </div>
                    <div className="field col-12 md:col-6">
                        <label className="font-bold">Fecha de corrección</label>
                        <InputText type="date" value={form.fecha_correccion} onChange={(e) => onHeaderChange(e, "fecha_correccion")} />
                    </div>
                    <div className="field col-12">
                        <label className="font-bold">Observaciones</label>
                        <InputText
                            value={form.observaciones_generales}
                            onChange={(e) => onHeaderChange(e, "observaciones_generales")}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
