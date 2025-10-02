// Components/Inocuidad/LimpiezaAreaCosecha.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../supabaseClient";
import logo2 from "../../assets/mosca.png";

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
import jsPDF from "jspdf";
import "jspdf-autotable";

// ✅ Hook de permisos
import useCanReview from "./Registros/Hooks/useCanReview.js";

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
  // 🔸Texto informativo mientras se crea (la BD pondrá el definitivo al guardar)
  fecha_registro_preview: new Date().toLocaleString(),
  items: LIMPIEZA_ITEMS.reduce((acc, it) => {
    acc[it.key] = { estado: "", comentario: "" };
    return acc;
  }, {}),
});

// Convierte DB row -> modelo de la grilla (soporta esquema viejo y el nuevo "ancho")
const packRow = (dbRow) => {
  const fromWide =
    dbRow.estado_romanas !== undefined ||
    dbRow.estado_maquina_tamizadora !== undefined;

  const itemsMap = fromWide
    ? {
      romanas: { estado: dbRow.estado_romanas || "", comentario: dbRow.comentario_romanas || "" },
      maquina_tamizadora: { estado: dbRow.estado_maquina_tamizadora || "", comentario: dbRow.comentario_maquina_tamizadora || "" },
      recipientes_plasticos: { estado: dbRow.estado_recipientes_plasticos || "", comentario: dbRow.comentario_recipientes_plasticos || "" },
      pisos: { estado: dbRow.estado_pisos || "", comentario: dbRow.comentario_pisos || "" },
      zarandas: { estado: dbRow.estado_zarandas || "", comentario: dbRow.comentario_zarandas || "" },
      bines: { estado: dbRow.estado_bines || "", comentario: dbRow.comentario_bines || "" },
      cano: { estado: dbRow.estado_cano || "", comentario: dbRow.comentario_cano || "" },
      techos: { estado: dbRow.estado_techos || "", comentario: dbRow.comentario_techos || "" },
      paredes: { estado: dbRow.estado_paredes || "", comentario: dbRow.comentario_paredes || "" },
    }
    : LIMPIEZA_ITEMS.reduce((acc, it) => {
      const found = (dbRow.items || []).find((x) => x.item_key === it.key);
      acc[it.key] = { estado: found?.estado || "", comentario: found?.comentario || "" };
      return acc;
    }, {});

  return {
    id: dbRow.id,
    fecha_registro: dbRow.fecha_registro,
    hora_registro: dbRow.hora_registro,
    responsable: dbRow.responsable,
    verificador_inocuidad: dbRow.verificador_inocuidad,
    firma_encargado: dbRow.firma_encargado,
    observaciones_generales: dbRow.observaciones_generales,
    // la BD lo guarda como fecha_correccion (auto now())
    fecha_registro_sistema: dbRow.fecha_correccion,
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

  // Filtro por revisado
  const [filtroRevisado, setFiltroRevisado] = useState("all"); // 'all' | 'checked' | 'unchecked'

  // Permisos (solo Mantenimiento01 / Produccion01 pueden ver/marcar)
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
        fecha_correccion,
        revisado,
        revisado_por_username,
        revisado_fecha,
        estado_romanas, comentario_romanas,
        estado_maquina_tamizadora, comentario_maquina_tamizadora,
        estado_recipientes_plasticos, comentario_recipientes_plasticos,
        estado_pisos, comentario_pisos,
        estado_zarandas, comentario_zarandas,
        estado_bines, comentario_bines,
        estado_cano, comentario_cano,
        estado_techos, comentario_techos,
        estado_paredes, comentario_paredes
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
  const onItemChange = (key, field, value) =>
    setForm((prev) => ({
      ...prev,
      items: { ...prev.items, [key]: { ...(prev.items[key] || { estado: "", comentario: "" }), [field]: value } },
    }));

  const validate = () => {
    const errs = [];
    if (!form.responsable?.trim()) errs.push("Responsable es requerido");

    LIMPIEZA_ITEMS.forEach((it) => {
      const v = form.items[it.key];
      if (!v?.estado) errs.push(`Selecciona estado en "${it.label}"`);
      if (v?.estado && v.estado !== "C" && !v?.comentario?.trim()) {
        errs.push(`Comentario requerido en "${it.label}" cuando es NC/NA`);
      }
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
        comentario_romanas: form.items.romanas?.comentario || null,

        estado_maquina_tamizadora: form.items.maquina_tamizadora?.estado,
        comentario_maquina_tamizadora: form.items.maquina_tamizadora?.comentario || null,

        estado_recipientes_plasticos: form.items.recipientes_plasticos?.estado,
        comentario_recipientes_plasticos: form.items.recipientes_plasticos?.comentario || null,

        estado_pisos: form.items.pisos?.estado,
        comentario_pisos: form.items.pisos?.comentario || null,

        estado_zarandas: form.items.zarandas?.estado,
        comentario_zarandas: form.items.zarandas?.comentario || null,

        estado_bines: form.items.bines?.estado,
        comentario_bines: form.items.bines?.comentario || null,

        estado_cano: form.items.cano?.estado,
        comentario_cano: form.items.cano?.comentario || null,

        estado_techos: form.items.techos?.estado,
        comentario_techos: form.items.techos?.comentario || null,

        estado_paredes: form.items.paredes?.estado,
        comentario_paredes: form.items.paredes?.comentario || null,
      };

      const { error } = await supabase
        .from("limpieza_cosecha_1")
        .insert([payload])
        .select("id, fecha_correccion")
        .single();

      if (error) throw error;

      showToast("success", "Guardado", "Registro creado");
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
      flat[`${it.label} - comentario`] = v.comentario || "";
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

  // Columna final: checkbox de Revisado (solo si canReview)
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

  // Header con búsqueda + filtro de revisado
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
        Registro de Limpieza del Área de Cosecha
      </h1>

      <div className="welcome-message">
        <p>
          <span>
            Selecciona <b className="bold-space">C</b> (Cumple),
            <b className="bold-space">NC</b> (No cumple),
            <b className="bold-space">NA</b> (No aplica).
          </span>
          <br />
          <span>
            Si es <b className="bold-space">NC</b> o <b className="bold-space">NA</b>, el comentario es obligatorio.
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

      <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

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

        {/* ⬇️ NUEVA COLUMNA visible en pantalla */}
        <Column
          field="fecha_registro_sistema"
          header="Fecha de Registro"
          body={(r) => (r.fecha_registro_sistema ? new Date(r.fecha_registro_sistema).toLocaleString() : "")}
          sortable
        />

        <Column header="#C" body={(r) => countBy(r, "C")} />
        <Column header="#NC" body={(r) => countBy(r, "NC")} />
        <Column header="#NA" body={(r) => countBy(r, "NA")} />
        {dynamicColumns.map((c, i) => (
          <Column key={i} header={c.header} body={c.body} />
        ))}
        {/* Última columna: checkbox de revisado */}
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
                            placeholder="Describa causa/acción"
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

          {/* <div className="field col-12 md:col-6">
            <label className="font-bold">Verificación (Inocuidad)</label>
            <InputText
              value={form.verificador_inocuidad}
              onChange={(e) => onHeaderChange(e, "verificador_inocuidad")}
            />
          </div> 
          </div>
          <div className="field col-12 md:col-6">
            <label className="font-bold">Firma del encargado</label>
            <InputText value={form.firma_encargado} onChange={(e) => onHeaderChange(e, "firma_encargado")} />
          </div>*/}

          {/* Solo lectura; se genera al guardar */}
          <div className="field col-12">
            <label className="font-bold">Fecha de Registro (auto)</label>
            <InputText value={form.fecha_registro_preview} disabled />
            <small className="text-color-secondary">
              Se genera automáticamente al guardar (en la tabla verás el valor real del sistema).
            </small>
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

export default LimpiezaAreaCosecha;
