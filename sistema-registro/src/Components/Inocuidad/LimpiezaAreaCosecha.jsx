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
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

/** Ítems + frecuencia (solo informativa para agrupar en el modal) */
const LIMPIEZA_ITEMS = [
  { key: "romanas", label: "Romanas", frecuencia: "Diario" },
  { key: "maquina_tamizadora", label: "Máquina Tamizadora", frecuencia: "Diario" },
  { key: "recipientes_plasticos", label: "Recipientes plásticos", frecuencia: "Diario" },
  { key: "pisos", label: "Pisos", frecuencia: "Diario" },
  { key: "zarandas", label: "Zarandas", frecuencia: "Semanal" },
  { key: "bines", label: "Bines", frecuencia: "Semanal" },
  { key: "cano", label: "Caño", frecuencia: "Semanal" },
  { key: "techos", label: "Techos", frecuencia: "Semestral" },
  { key: "paredes", label: "Paredes", frecuencia: "Semestral" },
];

const ESTADOS = [
  { label: "C - Cumple", value: "C" },
  { label: "NC - No cumple", value: "NC" },
  { label: "NA - No aplica", value: "NA" },
];

const groups = {
  Diario: LIMPIEZA_ITEMS.filter(i => i.frecuencia === "Diario"),
  Semanal: LIMPIEZA_ITEMS.filter(i => i.frecuencia === "Semanal"),
  Semestral: LIMPIEZA_ITEMS.filter(i => i.frecuencia === "Semestral"),
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHM = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const emptyForm = () => ({
  fecha_registro: todayISO(),
  hora_registro: nowHM(),
  responsable: "",
  verificador_inocuidad: "",
  firma_encargado: "",
  observaciones_generales: "",
  fecha_correccion_preview: new Date().toLocaleString(), // solo visual; DB pone fecha_correccion real
  items: LIMPIEZA_ITEMS.reduce((acc, it) => {
    acc[it.key] = { estado: "", comentario: "" };
    return acc;
  }, {}),
});

// Convierte el array de items (embed) a objeto por clave para la grilla
const packRow = (dbRow) => {
  const itemsMap = LIMPIEZA_ITEMS.reduce((acc, it) => {
    const found = (dbRow.items || []).find(x => x.item_key === it.key);
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
    fecha_correccion: dbRow.fecha_correccion,
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
      const { data, error } = await supabase
        .from("limpieza_cosecha")
        .select(`
          id,
          fecha_registro,
          hora_registro,
          responsable,
          verificador_inocuidad,
          firma_encargado,
          observaciones_generales,
          fecha_correccion,
          items:limpieza_cosecha_items!limpieza_cosecha_items_id_registro_fkey (
            item_key, estado, comentario
          )
        `)
        .order("fecha_registro", { ascending: false });

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
  }, []);

  const openNew = () => {
    setForm(emptyForm());
    setSubmitted(false);
    setDialogOpen(true);
  };

  const onHeaderChange = (e, field) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const onItemChange = (key, field, value) =>
    setForm(prev => ({
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
      // 1) Inserta encabezado
      const { data: enc, error: errEnc } = await supabase
        .from("limpieza_cosecha")
        .insert([{
          fecha_registro: form.fecha_registro,
          hora_registro: form.hora_registro,
          responsable: form.responsable,
          verificador_inocuidad: form.verificador_inocuidad || null,
          firma_encargado: form.firma_encargado || null,
          observaciones_generales: form.observaciones_generales || null,
          // fecha_correccion: la pone la DB (default now())
        }])
        .select("id")
        .single();

      if (errEnc) throw errEnc;
      const id_registro = enc.id;

      // 2) Inserta detalle
      const itemsInsert = LIMPIEZA_ITEMS.map((it) => ({
        id_registro,
        item_key: it.key,
        estado: form.items[it.key]?.estado || "",
        comentario: form.items[it.key]?.comentario || null,
      }));

      const { error: errDet } = await supabase
        .from("limpieza_cosecha_items")
        .insert(itemsInsert);

      if (errDet) throw errDet;

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
      "fecha corrección": r.fecha_correccion ? new Date(r.fecha_correccion).toLocaleString() : "",
      observaciones: r.observaciones_generales || "",
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
          Selecciona <b>C</b> (Cumple), <b>NC</b> (No cumple) o <b>NA</b> (No aplica) por ítem.
          Si es <b>NC</b> o <b>NA</b>, el comentario es obligatorio.
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
              Responsable* {submitted && !form.responsable && <small className="p-error"> Requerido</small>}
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

          <div className="field col-12 md:col-6">
            <label className="font-bold">Verificación (Inocuidad)</label>
            <InputText value={form.verificador_inocuidad} onChange={(e) => onHeaderChange(e, "verificador_inocuidad")} />
          </div>
          <div className="field col-12 md:col-6">
            <label className="font-bold">Firma del encargado</label>
            <InputText value={form.firma_encargado} onChange={(e) => onHeaderChange(e, "firma_encargado")} />
          </div>

          <div className="field col-12">
            <label className="font-bold">Fecha de corrección (auto)</label>
            <InputText value={form.fecha_correccion_preview} disabled />
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
