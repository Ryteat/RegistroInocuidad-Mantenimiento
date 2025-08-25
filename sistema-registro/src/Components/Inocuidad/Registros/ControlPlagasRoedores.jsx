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

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHM = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const opcionesUbicacion = [
    { label: "Interna", value: "Interna" },
    { label: "Externa", value: "Externa" },
];

const opcionesSiNo = [
    { label: "Sí", value: true },
    { label: "No", value: false },
];

const emptyForm = () => ({
    fecha_registro: todayISO(),
    hora_registro: nowHM(),
    ubicacion_estacion: "",
    evidencia_roedores: null,
    cambio_agente_control: null,
    tiene_observacion: false,          // controla la UI
    observaciones: "",
    fecha_correccion_preview: new Date().toLocaleString(), // sólo visual en el modal
});

export default function ControlPlagasRoedores() {
    const navigate = useNavigate();
    const toast = useRef(null);

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
                .from("control_plagas_roedores")
                .select("*")
                .order("fecha_registro", { ascending: false })
                .order("created_at", { ascending: false });
            if (error) throw error;
            setRows(data || []);
        } catch (e) {
            console.error(e);
            showToast("error", "Error", "No se pudieron cargar registros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
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

    const onChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

    const validate = () => {
        const errs = [];
        if (!form.ubicacion_estacion) errs.push("Seleccione la ubicación de la estación.");
        if (form.evidencia_roedores === null) errs.push("Indique si hay evidencia de roedores.");
        if (form.cambio_agente_control === null) errs.push("Indique si hubo cambio de agente de control.");
        if (form.tiene_observacion && !form.observaciones.trim()) {
            errs.push("Ingrese la observación/comentario.");
        }
        return errs;
    };

    const save = async () => {
        setSubmitted(true);
        const errs = validate();
        if (errs.length) {
            showToast("warn", "Validación", errs[0]);
            return;
        }
        try {
            const payload = {
                fecha_registro: form.fecha_registro,
                hora_registro: form.hora_registro,
                ubicacion_estacion: form.ubicacion_estacion,
                evidencia_roedores: !!form.evidencia_roedores,
                cambio_agente_control: !!form.cambio_agente_control,
                observaciones: form.tiene_observacion ? form.observaciones.trim() : null,
                // fecha_correccion: la pone la DB (default now())
            };

            const { error } = await supabase.from("control_plagas_roedores").insert([payload]);
            if (error) throw error;

            showToast("success", "Éxito", "Registro guardado");
            setDialogOpen(false);
            await fetchRows();
        } catch (e) {
            console.error(e);
            showToast("error", "Error", e.message || "No se pudo guardar");
        }
    };

    const exportXlsx = () => {
        if (selected.length === 0) {
            showToast("warn", "Advertencia", "Seleccione registros");
            return;
        }
        const toFlat = (r) => ({
            fecha: r.fecha_registro,
            hora: r.hora_registro,
            ubicacion_estacion: r.ubicacion_estacion,
            evidencia_roedores: r.evidencia_roedores ? "Sí" : "No",
            cambio_agente_control: r.cambio_agente_control ? "Sí" : "No",
            observaciones: r.observaciones || "",
            fecha_correccion: r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "",
        });
        const ws = XLSX.utils.json_to_sheet(selected.map(toFlat));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Control Plagas - Roedores");
        XLSX.writeFile(wb, `Control_Plagas_Roedores_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

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
                Registro de Control de Plagas – Hoja de Chequeo (Estación de Roedores)
            </h1>

            <div className="welcome-message">
                <p>
                    Complete la ubicación de la estación, si existe evidencia de roedores y si hubo cambio de agente de
                    control. Active “Agregar observación” para detallar daños, reemplazos o presencia de insectos. La{" "}
                    <b>fecha de corrección</b> se genera automáticamente al guardar.
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
                <Column field="ubicacion_estacion" header="Ubicación" sortable />
                <Column
                    header="Evidencia de roedores"
                    body={(r) => (r.evidencia_roedores ? "Sí" : "No")}
                    sortable
                />
                <Column
                    header="Cambio agente de control"
                    body={(r) => (r.cambio_agente_control ? "Sí" : "No")}
                    sortable
                />
                <Column
                    field="observaciones"
                    header="Observaciones"
                    body={(r) => r.observaciones || "—"}
                />
                <Column
                    field="fecha_correccion"
                    header="Fecha de corrección"
                    body={(r) => (r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "—")}
                    sortable
                />
            </DataTable>

            {/* Dialog */}
            <Dialog
                visible={dialogOpen}
                style={{ width: "55vw", maxWidth: 900 }}
                header="Nuevo registro de control de plagas"
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
                        <InputText type="date" value={form.fecha_registro} onChange={(e) => onChange("fecha_registro", e.target.value)} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">Hora</label>
                        <InputText type="time" value={form.hora_registro} onChange={(e) => onChange("hora_registro", e.target.value)} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="font-bold">
                            Ubicación de estación*
                            {submitted && !form.ubicacion_estacion && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.ubicacion_estacion}
                            options={opcionesUbicacion}
                            onChange={(e) => onChange("ubicacion_estacion", e.value)}
                            placeholder="Seleccione"
                        />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Evidencia de roedores*
                            {submitted && form.evidencia_roedores === null && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.evidencia_roedores}
                            options={opcionesSiNo}
                            onChange={(e) => onChange("evidencia_roedores", e.value)}
                            placeholder="Seleccione"
                        />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Cambio de agente de control*
                            {submitted && form.cambio_agente_control === null && <small className="p-error"> Requerido</small>}
                        </label>
                        <Dropdown
                            value={form.cambio_agente_control}
                            options={opcionesSiNo}
                            onChange={(e) => onChange("cambio_agente_control", e.value)}
                            placeholder="Seleccione"
                        />
                    </div>

                    <div className="field col-12">
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="chkObs"
                                checked={form.tiene_observacion}
                                onChange={(e) => onChange("tiene_observacion", e.checked)}
                            />
                            <label htmlFor="chkObs" className="font-bold" style={{ cursor: "pointer" }}>
                                Agregar observación (daños/reemplazo/ausencia/presencia de insectos)
                            </label>
                        </div>

                        {form.tiene_observacion && (
                            <>
                                <InputText
                                    className="mt-2"
                                    value={form.observaciones}
                                    onChange={(e) => onChange("observaciones", e.target.value)}
                                    placeholder="Detalle la observación"
                                />
                                {submitted && !form.observaciones.trim() && (
                                    <small className="p-error"> Campo requerido</small>
                                )}
                            </>
                        )}
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
