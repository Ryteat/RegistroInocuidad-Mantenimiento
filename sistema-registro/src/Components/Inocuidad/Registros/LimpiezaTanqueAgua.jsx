// Components/Inocuidad/Registros/LimpiezaTanqueAgua.jsx
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

import useCanReview from "./Hooks/useCanReview.js";

/* ---------- 4 preguntas requeridas (P1 con texto corregido) ---------- */
const QUESTIONS = [
    { key: "q3", label: "¿Verificó el estado de tuberías/válvulas/grietas/desgaste del tanque?" },
    { key: "q4", label: "¿Removió residuos sólidos del fondo del tanque?" },
    { key: "q13", label: "¿Se realizaron varios lavados con agua potable eliminando así los residuos de desinfectante?" },
    { key: "q12", label: "¿Se instaló correctamente la tapa para evitar el ingreso de contaminantes?" },
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
    responsable_lavado: "",
    fecha_proximo_lavado: "",
    observaciones: "",
    fecha_correccion_preview: new Date().toLocaleString(), // visual
    items: QUESTIONS.reduce((acc, q) => {
        acc[q.key] = { respuesta: "" };
        return acc;
    }, {}),
});

const packRow = (dbRow) => {
    const itemsMap = {
        q3: { respuesta: dbRow.respuesta_q3 || "" },
        q4: { respuesta: dbRow.respuesta_q4 || "" },
        q13: { respuesta: dbRow.respuesta_q13 || "" },
        q12: { respuesta: dbRow.respuesta_q12 || "" },
    };

    return {
        id: dbRow.id,
        fecha_registro: dbRow.fecha_registro,
        hora_registro: dbRow.hora_registro,
        responsable_lavado: dbRow.responsable_lavado,
        fecha_proximo_lavado: dbRow.fecha_proximo_lavado,
        fecha_correccion: dbRow.fecha_correccion,
        observaciones: dbRow.observaciones,
        revisado: dbRow.revisado ?? false,
        revisado_por_username: dbRow.revisado_por_username ?? null,
        revisado_fecha: dbRow.revisado_fecha ?? null,
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

    const [filtroRevisado, setFiltroRevisado] = useState("all");
    const { canReview, username } = useCanReview();

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    const fetchRows = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from("limpieza_tanque_agua_1")
                .select(`
          id, fecha_registro, hora_registro,
          responsable_lavado,
          fecha_proximo_lavado, fecha_correccion, observaciones,
          revisado, revisado_por_username, revisado_fecha,
          respuesta_q3, respuesta_q4, respuesta_q13, respuesta_q12
        `)
                .order("fecha_registro", { ascending: false })
                .order("created_at", { ascending: false });

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
        fetchRows();
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

    // ⬇️ Enforce future (>= hoy) for fecha_proximo_lavado
    const onHeaderChange = (e, field) => {
        const value = e.target.value;
        if (field === "fecha_proximo_lavado" && value) {
            const today = todayISO();
            if (value < today) {
                showToast("warn", "Fecha inválida", "La fecha del próximo lavado debe ser hoy o posterior.");
                return; // no actualizamos el estado si es pasada
            }
        }
        setForm((p) => ({ ...p, [field]: value }));
    };

    const onYesNoChange = (key, value) =>
        setForm((p) => ({ ...p, items: { ...p.items, [key]: { respuesta: value } } }));

    const validate = () => {
        const errs = [];
        if (!form.responsable_lavado?.trim()) errs.push("El responsable de lavado es requerido");

        // Validar fecha próxima (si fue seleccionada)
        if (form.fecha_proximo_lavado && form.fecha_proximo_lavado < todayISO()) {
            errs.push("La fecha del próximo lavado debe ser hoy o posterior.");
        }

        QUESTIONS.forEach((q) => {
            if (!form.items[q.key]?.respuesta) errs.push(`Responda: ${q.label}`);
        });
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
                responsable_lavado: form.responsable_lavado,
                fecha_proximo_lavado: form.fecha_proximo_lavado || null,
                observaciones: form.observaciones?.trim() ? form.observaciones.trim() : null,
                respuesta_q3: form.items.q3?.respuesta || null,
                respuesta_q4: form.items.q4?.respuesta || null,
                respuesta_q13: form.items.q13?.respuesta || null,
                respuesta_q12: form.items.q12?.respuesta || null,
            };

            const { error } = await supabase
                .from("limpieza_tanque_agua_1")
                .insert([payload])
                .select("id")
                .single();

            if (error) throw error;

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

    const dynamicColumns = QUESTIONS.map((q) => ({
        header: q.label,
        body: (row) => row.items?.[q.key]?.respuesta || "",
    }));

    const revisadoTemplate = (row) => {
        if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

        const onToggle = async (next) => {
            if (!username) {
                showToast("warn", "Sesión", "No se detectó el usuario actual.");
                return;
            }
            const { error } = await supabase
                .from("limpieza_tanque_agua_1")
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
                    inputId={`chk-rev-tanque-${row.id}`}
                    checked={!!row.revisado}
                    onChange={(e) => onToggle(e.checked)}
                />
                <label htmlFor={`chk-rev-tanque-${row.id}`} className="text-sm">
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
                        { label: "Sin revisar", value: "unchecked" },
                    ]}
                    style={{ minWidth: 160 }}
                />
            </div>
        </div>
    );

    const exportXlsx = () => {
        if (!rows?.length) {
            showToast("warn", "Exportación", "No hay datos");
            return;
        }
        const out = rows.map((r) => {
            const base = {
                fecha_registro: r.fecha_registro,
                hora_registro: r.hora_registro,
                responsable_lavado: r.responsable_lavado,
                fecha_proximo_lavado: r.fecha_proximo_lavado || "",
                fecha_registro_sistema: r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "",
                observaciones: r.observaciones || "",
                revisado: r.revisado ? "Sí" : "No",
            };
            QUESTIONS.forEach((q) => (base[q.label] = r.items?.[q.key]?.respuesta || ""));
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
                    <span>Responda las 4 preguntas (Sí/No).</span>
                    <br />
                    <br />
                    <span>
                        Además puede programar la <b className="bold-space">Fecha del Próximo Lavado</b>.
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
                right={() => (
                    <Button label="Exportar a Excel" icon="pi pi-upload" className="p-button-help" onClick={exportXlsx} />
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
                <Column field="responsable_lavado" header="Operario" sortable />
                <Column
                    field="fecha_proximo_lavado"
                    header="Próximo lavado"
                    body={(r) => (r?.fecha_proximo_lavado ? new Date(r.fecha_proximo_lavado).toLocaleDateString() : "")}
                    sortable
                />
                <Column field="observaciones" header="Observaciones" body={(r) => r.observaciones || "—"} />
                <Column header="#SI" body={(r) => countBy(r, "SI")} />
                <Column header="#NO" body={(r) => countBy(r, "NO")} />
                <Column
                    field="fecha_correccion"
                    header="Fecha de Registro"
                    body={(r) => new Date(r.fecha_correccion).toLocaleString()}
                    sortable
                />
                {dynamicColumns.map((c, i) => (
                    <Column key={i} header={c.header} body={c.body} />
                ))}
                <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
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
                        <InputText
                            type="date"
                            value={form.fecha_registro}
                            onChange={(e) => onHeaderChange(e, "fecha_registro")}
                        />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">Hora</label>
                        <InputText
                            type="time"
                            value={form.hora_registro}
                            onChange={(e) => onHeaderChange(e, "hora_registro")}
                        />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-bold">Selecciona la Fecha del Próximo lavado</label>
                        <InputText
                            type="date"
                            min={todayISO()}             // ⬅️ no permite fechas pasadas
                            value={form.fecha_proximo_lavado}
                            onChange={(e) => onHeaderChange(e, "fecha_proximo_lavado")}
                        />
                        {submitted && form.fecha_proximo_lavado && form.fecha_proximo_lavado < todayISO() && (
                            <small className="p-error">La fecha debe ser hoy o posterior.</small>
                        )}
                    </div>

                    <div className="field col-12 md:col-6">
                        <label className="font-bold">
                            Operario* {submitted && !form.responsable_lavado && <small className="p-error"> Requerido</small>}
                        </label>
                        <InputText
                            value={form.responsable_lavado}
                            onChange={(e) => onHeaderChange(e, "responsable_lavado")}
                            placeholder="Nombre del operario"
                        />
                    </div>

                    {/* 4 preguntas */}
                    {QUESTIONS.map((q) => {
                        const val = form.items[q.key]?.respuesta || "";
                        return (
                            <div key={q.key} className="field col-12 md:col-6">
                                <label className="font-bold">
                                    {q.label}* {submitted && !val && <small className="p-error"> Requerido</small>}
                                </label>
                                <Dropdown value={val} options={YESNO} onChange={(e) => onYesNoChange(q.key, e.value)} placeholder="Seleccione" />
                            </div>
                        );
                    })}

                    <div className="field col-12">
                        <label className="font-bold">Observaciones</label>
                        <InputText
                            value={form.observaciones}
                            onChange={(e) => onHeaderChange(e, "observaciones")}
                            placeholder="Comentarios adicionales (opcional)"
                        />
                    </div>

                    <div className="field col-12 md:col-3">
                        <label className="font-bold">Fecha de Registro (auto)</label>
                        <InputText value={form.fecha_correccion_preview} disabled />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
