import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Toolbar } from "primereact/toolbar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo2 from "../../../assets/mosca.png";
import "./ReporteInspeccion.css";

function ReporteInspeccionSemanal() {
  const emptyReport = {
    fecha_registro: "",
    hora_registro: "",
    unidad: "",
    modelo: "",
    serie: "",
    turno: "",
    horometro_inicio_semana: "",
    horometro_final_semana: "",
    limpiar_filtros_aire: "",
    nivel_aceite_hidraulico: "",
    nivel_aceite_transmision: "",
    fugas_aceite_mangueras: "",
    compartimiento_baterias_nivel_electrolito: "",
    observaciones: ""
  };

  const opcionesInspeccion = [
    { label: "Bien", value: "B" },
    { label: "Mal (Requiere reparación)", value: "M" }
  ];

  const opcionesTurno = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" }
  ];

  // Campos obligatorios actualizados
  const camposObligatorios = [
    "unidad",
    "modelo",
    "serie",
    "turno",
    "horometro_inicio_semana" // Nuevo campo obligatorio
  ];

  const camposInspeccion = [
    "limpiar_filtros_aire",
    "nivel_aceite_hidraulico",
    "nivel_aceite_transmision",
    "fugas_aceite_mangueras",
    "compartimiento_baterias_nivel_electrolito"
  ];

  const [reportes, setReportes] = useState([]);
  const [reporte, setReporte] = useState(emptyReport);
  const toast = useRef(null);
  const dt = useRef(null);
  const [selectedReportes, setSelectedReportes] = useState([]);
  const [globalFilter, setGlobalFilter] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [reporteDialog, setReporteDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReportes();
  }, []);

  const fetchReportes = async () => {
    try {
      const { data, error } = await supabase
        .from("Reporte_Inspeccion_Montacargas_Combustion_Interna(semanal)")
        .select()
        .order('fecha_registro', { ascending: false });
      
      if (data) setReportes(data);
      if (error) throw error;
    } catch (error) {
      showToast('error', 'Error', 'Error al cargar reportes');
    }
  };

  const showToast = (severity, summary, detail) => {
    toast.current.show({ severity, summary, detail, life: 3000 });
  };

  const saveReporte = async () => {
    setSubmitted(true);
    
    const camposFaltantes = camposObligatorios.filter(field => !reporte[field]);
    const inspeccionMal = camposInspeccion.some(field => reporte[field] === "M");
    
    if (camposFaltantes.length > 0) {
      showToast('error', 'Error', 'Complete todos los campos obligatorios');
      return;
    }

    if (inspeccionMal && !reporte.observaciones?.trim()) {
      showToast('error', 'Error', 'Debe agregar observaciones cuando hay elementos en Mal estado');
      return;
    }

    try {
      const now = new Date();
      const fechaActual = formatDateForStorage(now);
      const horaActual = formatTime(now);

      const { error } = await supabase
        .from("Reporte_Inspeccion_Montacargas_Combustion_Interna(semanal)")
        .insert([{
          ...reporte,
          fecha_registro: fechaActual,
          hora_registro: horaActual
        }]);

      if (error) throw error;

      showToast('success', 'Éxito', 'Reporte guardado correctamente');
      setReporte(emptyReport);
      setReporteDialog(false);
      await fetchReportes();
      setSubmitted(false);
    } catch (error) {
      console.error('Error al guardar:', error);
      showToast('error', 'Error', error.message || "Error al guardar el reporte");
    }
  };

  const formatDateForStorage = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatFecha = (fechaISO) => {
    if (!fechaISO) return '';
    const [year, month, day] = fechaISO.split('-');
    return `${day}/${month}/${year}`;
  };

  const onInputChange = (e, name) => {
    setReporte(prev => ({ ...prev, [name]: e.target.value }));
  };

  const exportPdf = () => {
    if (selectedReportes.length === 0) {
      showToast('error', 'Error', 'Seleccione al menos un registro para exportar');
      return;
    }

    const doc = new jsPDF();
    doc.autoTable({
      head: [["Fecha", "Hora", "Unidad", "Modelo", "Horómetro Inicio", "Horómetro Final", "Observaciones"]],
      body: selectedReportes.map(reporte => [
        formatFecha(reporte.fecha_registro),
        reporte.hora_registro,
        reporte.unidad,
        reporte.modelo,
        reporte.horometro_inicio_semana,
        reporte.horometro_final_semana,
        reporte.observaciones
      ])
    });
    doc.save("reportes-inspeccion-semanal.pdf");
  };

  const exportXlsx = () => {
    if (selectedReportes.length === 0) {
      showToast('error', 'Error', 'Seleccione al menos un registro para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedReportes);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reportes");
    XLSX.writeFile(workbook, "reportes-inspeccion-semanal.xlsx");
  };

  const textEditor = (options) => (
    <InputText
      type="text"
      value={options.value}
      onChange={(e) => options.editorCallback(e.target.value)}
    />
  );

  const dropdownEditor = (options) => (
    <Dropdown
      value={options.value}
      options={opcionesInspeccion}
      onChange={(e) => options.editorCallback(e.value)}
      placeholder="Seleccione"
    />
  );

  const turnoEditor = (options) => (
    <Dropdown
      value={options.value}
      options={opcionesTurno}
      onChange={(e) => options.editorCallback(e.value)}
      placeholder="Seleccione"
    />
  );

  const onRowEditComplete = async (e) => {
    const _reportes = [...reportes];
    const { newData, index } = e;
    _reportes[index] = newData;

    try {
      const { error } = await supabase
        .from("Reporte_Inspeccion_Montacargas_Combustion_Interna(semanal)")
        .update(newData)
        .eq("id", newData.id);

      if (error) throw error;

      setReportes(_reportes);
      showToast('success', 'Actualizado', 'Reporte actualizado exitosamente');
    } catch (error) {
      showToast('error', 'Error', 'Error al actualizar reporte');
    }
  };

  const leftToolbarTemplate = () => (
    <div className="flex gap-2">
      <Button
        label="Nuevo"
        icon="pi pi-plus"
        severity="success"
        onClick={() => setReporteDialog(true)}
      />
    </div>
  );

  const rightToolbarTemplate = () => (
    <div className="exportar-container flex flex-wrap gap-2">
      <Button
        label="Exportar a Excel"
        icon="pi pi-upload"
        className="p-button-help"
        onClick={exportXlsx}
      />
      <Button
        label="Exportar a PDF"
        icon="pi pi-file-pdf"
        className="p-button-danger"
        onClick={exportPdf}
      />
    </div>
  );

  const dynamicColumns = [
    { field: "unidad", header: "Unidad", editor: textEditor, sortable: true },
    { field: "modelo", header: "Modelo", editor: textEditor, sortable: true },
    { field: "serie", header: "Serie", editor: textEditor, sortable: true },
    { 
      field: "turno", 
      header: "Turno", 
      editor: turnoEditor, 
      body: (rowData) => rowData.turno,
      sortable: true 
    },
    { field: "horometro_inicio_semana", header: "Horómetro Inicio", editor: textEditor, sortable: true },
    { field: "horometro_final_semana", header: "Horómetro Final", editor: textEditor, sortable: true },
    ...camposInspeccion.map((field) => ({
      field: field,
      header: field.replace(/_/g, " ").toUpperCase(),
      editor: dropdownEditor,
      body: (rowData) => (rowData[field] === "B" ? "Bien" : "Mal"),
      sortable: true
    })),
    { field: "observaciones", header: "Observaciones", editor: textEditor, sortable: true }
  ];

  return (
    <div className="controlrendcosechayfrass-container">
      <Toast ref={toast} />
      <h1>
        <img src={logo2} alt="mosca" className="logo2" />
        Reporte de Inspección Semanal de Montacargas
      </h1>
      
      <div className="welcome-message">
        <p>
          Bienvenido al sistema de Reporte de Inspección Semanal de Montacargas.
          Aquí puedes gestionar los reportes semanales de inspección.
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

      <div className="tabla-scroll">
        <Toolbar
          className="mb-4"
          left={leftToolbarTemplate}
          right={rightToolbarTemplate}
        />
        <DataTable
          ref={dt}
          value={reportes}
          editMode="row"
          dataKey="id"
          onRowEditComplete={onRowEditComplete}
          selection={selectedReportes}
          onSelectionChange={(e) => setSelectedReportes(e.value)}
          globalFilter={globalFilter}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Reportes"
        >
          <Column selectionMode="multiple" exportable={false} />
          <Column
            rowEditor
            headerStyle={{ width: "10%", minWidth: "8rem" }}
            bodyStyle={{ textAlign: "center" }}
          />
          <Column 
            field="fecha_registro" 
            header="Fecha" 
            sortable 
            body={(rowData) => formatFecha(rowData.fecha_registro)}
          />
          <Column field="hora_registro" header="Hora" sortable />
          {dynamicColumns.map((col) => (
            <Column
              key={col.field}
              field={col.field}
              header={col.header}
              editor={col.editor}
              body={col.body}
              sortable={col.sortable}
            />
          ))}
        </DataTable>
      </div>

      <Dialog
        visible={reporteDialog}
        style={{ width: "50vw" }}
        header="Nuevo Reporte Semanal"
        modal
        onHide={() => setReporteDialog(false)}
      >
        <div className="p-fluid grid">
          <div className="col-12 font-bold text-xl mb-3">Datos Previos</div>
          
          {["unidad", "modelo", "serie"].map((field) => (
            <div className="field col-6" key={field}>
              <label className="font-bold">
                {field.replace(/_/g, " ").toUpperCase()}*
                {submitted && !reporte[field] && (
                  <small className="p-error"> Requerido</small>
                )}
              </label>
              <InputText
                value={reporte[field]}
                onChange={(e) => onInputChange(e, field)}
              />
            </div>
          ))}

          <div className="field col-6">
            <label className="font-bold">
              TURNO*
              {submitted && !reporte.turno && <small className="p-error"> Requerido</small>}
            </label>
            <Dropdown
              value={reporte.turno}
              options={opcionesTurno}
              onChange={(e) => onInputChange(e, "turno")}
              placeholder="Seleccione"
            />
          </div>

          <div className="field col-6">
            <label className="font-bold">
              HORÓMETRO INICIO SEMANA*
              {submitted && !reporte.horometro_inicio_semana && (
                <small className="p-error"> Requerido</small>
              )}
            </label>
            <InputText
              value={reporte.horometro_inicio_semana}
              onChange={(e) => onInputChange(e, "horometro_inicio_semana")}
            />
          </div>

          <div className="field col-6">
            <label className="font-bold">HORÓMETRO FINAL SEMANA</label>
            <InputText
              value={reporte.horometro_final_semana}
              onChange={(e) => onInputChange(e, "horometro_final_semana")}
            />
          </div>

          <div className="col-12 font-bold text-xl mt-5 mb-3">Inspección Semanal</div>
          
          {camposInspeccion.map((field) => (
            <div className="field col-6" key={field}>
              <label className="font-bold">
                {field.replace(/_/g, " ").toUpperCase()}*
              </label>
              <Dropdown
                value={reporte[field]}
                options={opcionesInspeccion}
                onChange={(e) => onInputChange(e, field)}
                placeholder="Seleccione"
              />
            </div>
          ))}

          <div className="field col-12">
            <label className="font-bold">
              OBSERVACIONES
              {camposInspeccion.some(f => reporte[f] === "M") && " *"}
              {submitted && camposInspeccion.some(f => reporte[f] === "M") && !reporte.observaciones?.trim() && (
                <small className="p-error"> Campo requerido cuando existen elementos en Mal estado</small>
              )}
            </label>
            <InputText
              value={reporte.observaciones}
              onChange={(e) => onInputChange(e, "observaciones")}
            />
          </div>
        </div>

        <div className="flex justify-content-end gap-2 mt-3">
          <Button
            label="Cancelar"
            icon="pi pi-times"
            onClick={() => setReporteDialog(false)}
          />
          <Button label="Guardar" icon="pi pi-check" onClick={saveReporte} />
        </div>
      </Dialog>
    </div>
  );
}

export default ReporteInspeccionSemanal;