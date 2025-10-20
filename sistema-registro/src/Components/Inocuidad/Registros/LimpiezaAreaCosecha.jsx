// Components/Inocuidad/LimpiezaAreaCosecha.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient.js";
import logo2 from "../../../assets/mosca.png";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import "../Inocuidad.css";
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
import jsPDF from "jspdf";
import "jspdf-autotable";

import useCanReview from "./Hooks/useCanReview.js";

/** Ítems + frecuencia (solo informativa para agrupar en el modal) */
const LIMPIEZA_ITEMS = [
  { key: "romanas", label: "Romanas (Diario)", frecuencia: "Diario" },
  { key: "maquina_tamizadora", label: "Máquina Tamizadora (Diario)", frecuencia: "Diario" },
  { key: "recipientes_plasticos", label: "Recipientes plásticos (Diario)", frecuencia: "Diario" },
  { key: "pisos", label: "Pisos (Diario)", frecuencia: "Diario" },
  { key: "zarandas", label: "Zarandas (Semanal)", frecuencia: "Semanal" },
  { key: "bines", label: "Bines (Semanal)", frecuencia: "Semanal" },
  { key: "cano", label: "Caño (Semanal)", frecuencia: "Semanal" },
  { key: "techos", label: "Techos (Semestral)", frecuencia: "Semestral" },
  { key: "paredes", label: "Paredes (Semestral)", frecuencia: "Semestral" },
];

const ESTADOS = [
  { label: "C - Cumple", value: "C" },
  { label: "NC - No cumple", value: "NC" },
  { label: "NA - No aplica", value: "NA" },
];

const groups = {
  Diario: LIMPIEZA_ITEMS.filter((i) => i.frecuencia === "Diario"),
  Semanal: LIMPIEZA_ITEMS.filter((i) => i.frecuencia === "Semanal"),
  Semestral: LIMPIEZA_ITEMS.filter((i) => i.frecuencia === "Semestral"),
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHM = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const emptyForm = () => ({
  fecha_registro: todayISO(),
  hora_registro: nowHM(),
  responsable: "",
  verificador_inocuidad: "",
  firma_encargado: "",
  observaciones_generales: "",
  items: LIMPIEZA_ITEMS.reduce((acc, it) => {
    acc[it.key] = { estado: "" }; // ← solo estado (sin comentario)
    return acc;
  }, {}),
});

// Convierte DB row -> modelo de la grilla (sin comentarios)
const packRow = (dbRow) => {
  const itemsMap = {
    romanas: { estado: dbRow.estado_romanas || "" },
    maquina_tamizadora: { estado: dbRow.estado_maquina_tamizadora || "" },
    recipientes_plasticos: { estado: dbRow.estado_recipientes_plasticos || "" },
    pisos: { estado: dbRow.estado_pisos || "" },
    zarandas: { estado: dbRow.estado_zarandas || "" },
    bines: { estado: dbRow.estado_bines || "" },
    cano: { estado: dbRow.estado_cano || "" },
    techos: { estado: dbRow.estado_techos || "" },
    paredes: { estado: dbRow.estado_paredes || "" },
  };

  return {
    id: dbRow.id,
    fecha_registro: dbRow.fecha_registro,
    hora_registro: dbRow.hora_registro,
    responsable: dbRow.responsable,
    verificador_inocuidad: dbRow.verificador_inocuidad,
    firma_encargado: dbRow.firma_encargado,
    observaciones_generales: dbRow.observaciones_generales || "",
    // Mostramos la fecha REAL del sistema (created_at). Si no existe, cae a fecha_correccion (legacy)
    fecha_registro_sistema: dbRow.created_at ?? dbRow.fecha_correccion ?? null,

    revisado: dbRow.revisado ?? false,
    revisado_por_username: dbRow.revisado_por_username ?? null,
    revisado_fecha: dbRow.revisado_fecha ?? null,
    items: itemsMap,
  };
};

function LimpiezaAreaCosecha() {
  const navigate = useNavigate();
  const toast = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const [filtroRevisado, setFiltroRevisado] = useState("all"); // 'all' | 'checked' | 'unchecked'
  const { canReview, username } = useCanReview();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const dynamicColumns = LIMPIEZA_ITEMS.map((it) => ({
    header: it.label,
    body: (row) => row.items?.[it.key]?.estado || "",
  }));

  const showToast = (severity, summary, detail, life = 3000) =>
    toast.current?.show({ severity, summary, detail, life });

  const fetchRows = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("limpieza_cosecha_1")
        .select(`
          id,
          fecha_registro,
          hora_registro,
          responsable,
          verificador_inocuidad,
          firma_encargado,
          observaciones_generales,
          created_at,
          fecha_correccion,
          revisado,
          revisado_por_username,
          revisado_fecha,
          estado_romanas,
          estado_maquina_tamizadora,
          estado_recipientes_plasticos,
          estado_pisos,
          estado_zarandas,
          estado_bines,
          estado_cano,
          estado_techos,
          estado_paredes
        `)
        .order("fecha_registro", { ascending: false });

      if (filtroRevisado === "checked") query = query.eq("revisado", true);
      if (filtroRevisado === "unchecked") query = query.eq("revisado", false);

      const { data, error } = await query;
      if (error) throw error;
      setRows((data || []).map(packRow));
    } catch (e) {
      console.error(e);
      showToast("error", "Error", "Error al cargar registros");
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

  const onHeaderChange = (e, field) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const onItemChange = (key, value) =>
    setForm((prev) => ({
      ...prev,
      items: { ...prev.items, [key]: { estado: value } },
    }));

  const validate = () => {
    const errs = [];
    if (!form.responsable?.trim()) errs.push("Responsable es requerido");
    LIMPIEZA_ITEMS.forEach((it) => {
      const v = form.items[it.key];
      if (!v?.estado) errs.push(`Selecciona estado en "${it.label}"`);
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
        responsable: form.responsable,
        verificador_inocuidad: form.verificador_inocuidad || null,
        firma_encargado: form.firma_encargado || null,
        observaciones_generales: form.observaciones_generales || null,

        estado_romanas: form.items.romanas?.estado,
        estado_maquina_tamizadora: form.items.maquina_tamizadora?.estado,
        estado_recipientes_plasticos: form.items.recipientes_plasticos?.estado,
        estado_pisos: form.items.pisos?.estado,
        estado_zarandas: form.items.zarandas?.estado,
        estado_bines: form.items.bines?.estado,
        estado_cano: form.items.cano?.estado,
        estado_techos: form.items.techos?.estado,
        estado_paredes: form.items.paredes?.estado,
      };

      const { data, error } = await supabase
        .from("limpieza_cosecha_1")
        .insert([payload])
        .select("id, created_at")
        .single();

      if (error) throw error;

      showToast(
        "success",
        "Guardado",
        `Registro creado. Fecha de Registro (auto): ${new Date(data.created_at).toLocaleString()}`
      );
      setDialogOpen(false);
      setForm(emptyForm());
      setSubmitted(false);
      await fetchRows();
    } catch (e) {
      console.error(e);
      showToast("error", "Error", e.message || "No se pudo guardar");
    }
  };

  const flattenForExport = (r) => {
    const flat = {
      fecha: r.fecha_registro,
      hora: r.hora_registro,
      responsable: r.responsable,
      "verificación inocuidad": r.verificador_inocuidad || "",
      "firma encargado": r.firma_encargado || "",
      "fecha registro (sistema)": r.fecha_registro_sistema ? new Date(r.fecha_registro_sistema).toLocaleString() : "",
      observaciones: r.observaciones_generales || "",
      revisado: r.revisado ? "Sí" : "No",
    };
    LIMPIEZA_ITEMS.forEach((it) => {
      const v = r.items?.[it.key] || {};
      flat[it.label] = v.estado || "";
    });
    return flat;
  };

  const exportPdf = () => {
    if (selected.length === 0) {
      showToast("warn", "Advertencia", "Seleccione registros");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Registro de Limpieza - Área de Cosecha", 14, 14);
    const head = Object.keys(flattenForExport(selected[0]));
    const body = selected.map((r) => Object.values(flattenForExport(r)));
    doc.autoTable({ head: [head], body, styles: { fontSize: 8 }, startY: 20 });
    doc.save(`Limpieza_Cosecha_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportXlsx = () => {
    if (selected.length === 0) {
      showToast("warn", "Advertencia", "Seleccione registros");
      return;
    }
    const rowsFlat = selected.map(flattenForExport);
    const ws = XLSX.utils.json_to_sheet(rowsFlat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Limpieza Cosecha");
    XLSX.writeFile(wb, `Limpieza_Cosecha_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const countBy = (row, val) =>
    LIMPIEZA_ITEMS.reduce((acc, it) => acc + (row.items?.[it.key]?.estado === val ? 1 : 0), 0);

  const revisadoTemplate = (row) => {
    if (!canReview) return <span>{row.revisado ? "Sí" : "No"}</span>;

    const onToggle = async (next) => {
      if (!username) {
        showToast("warn", "Sesión", "No se detectó el usuario actual.");
        return;
      }
      const { error } = await supabase
        .from("limpieza_cosecha_1")
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
        <Checkbox inputId={`chk-rev-${row.id}`} checked={!!row.revisado} onChange={(e) => onToggle(e.checked)} />
        <label htmlFor={`chk-rev-${row.id}`} className="text-sm">
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

  return (
    <div className="controlrendcosechayfrass-container">
      <Toast ref={toast} />
      <h1>
        <img src={logo2} alt="mosca" className="logo2" />
        Registro de Limpieza del Área de Cosecha
      </h1>

      <div className="welcome-message">
        <p>
          Selecciona <b className="bold-space">C</b> (Cumple),
          <b className="bold-space">NC</b> (No cumple),
          <b className="bold-space">NA</b> (No aplica).
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
          <div className="exportar-container flex flex-wrap gap-2">
            <Button label="Exportar a Excel" icon="pi pi-upload" className="p-button-help" onClick={exportXlsx} />
            <Button label="Exportar a PDF" icon="pi pi-file-pdf" className="p-button-danger" onClick={exportPdf} />
          </div>
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
        <Column field="responsable" header="Operario" sortable />

        {/* 👇 Fecha de Registro (auto) real de la BD */}
        <Column
          field="fecha_registro_sistema"
          header="Fecha de Registro (auto)"
          body={(r) => (r.fecha_registro_sistema ? new Date(r.fecha_registro_sistema).toLocaleString() : "")}
          sortable
        />

        <Column header="#C" body={(r) => countBy(r, "C")} />
        <Column header="#NC" body={(r) => countBy(r, "NC")} />
        <Column header="#NA" body={(r) => countBy(r, "NA")} />

        {dynamicColumns.map((c, i) => (
          <Column key={i} header={c.header} body={c.body} />
        ))}

        {/* Observaciones visibles en la grilla */}
        <Column field="observaciones_generales" header="Observaciones" body={(r) => r.observaciones_generales || "—"} />

        {/* Última columna: checkbox revisado */}
        <Column header="Revisado" body={revisadoTemplate} style={{ width: "10rem", textAlign: "center" }} />
      </DataTable>

      {/* Dialog Nuevo Registro */}
      <Dialog
        visible={dialogOpen}
        style={{ width: "70vw", maxWidth: 1100 }}
        header="Nuevo registro de limpieza"
        modal
        onHide={() => setDialogOpen(false)}
        footer={
          <div className="flex gap-2 justify-content-end">
            <Button label="Cancelar" icon="pi pi-times" outlined onClick={() => setDialogOpen(false)} />
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
            <label className="font-bold">
              Operario* {submitted && !form.responsable && <small className="p-error"> Requerido</small>}
            </label>
            <InputText value={form.responsable} onChange={(e) => onHeaderChange(e, "responsable")} />
          </div>

          {/* Secciones por frecuencia (solo presentación) */}
          {["Diario", "Semanal", "Semestral"].map((freq) => (
            <div key={freq} className="col-12">
              <div className="font-bold text-lg mb-2">{freq}</div>
              <div className="grid">
                {groups[freq].map((it) => {
                  const val = form.items[it.key] || { estado: "" };
                  return (
                    <div className="field col-12 md:col-6" key={it.key}>
                      <label className="font-bold">
                        {it.label}* {submitted && !val.estado && <small className="p-error"> Requerido</small>}
                      </label>
                      <Dropdown
                        value={val.estado}
                        options={ESTADOS}
                        onChange={(e) => onItemChange(it.key, e.value)}
                        placeholder="Seleccione"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="field col-12">
            <label className="font-bold">Observaciones</label>
            <InputText
              value={form.observaciones_generales}
              onChange={(e) => onHeaderChange(e, "observaciones_generales")}
              placeholder="Comentarios adicionales (opcional)"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default LimpiezaAreaCosecha;
