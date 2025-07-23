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

function ReportePreoperacionalTeletruk() {
  const emptyReport = {
    fecha_registro: "",
    hora_registro: "",
    semana: "",
    operario: "",
    horometro: "",
    limpieza_general: "",
    estado_general: "",
    estructura_proteccion: "",
    asiento_cinturon: "",
    aceite_fugas: "",
    aceite_nivel: "",
    entrada_aire: "",
    nivel_combustible: "",
    LGP_conector: "",
    refrigerante_fugas: "",
    refrigerante_nivel: "",
    conjunto_refrigeracion: "",
    seguridad_tuercas_ruedas: "",
    presion_neumaticos: "",
    latiguillo_tuberias: "",
    aceite_hidraulico_nivel: "",
    liquido_limpiaparabrisas: "",
    sistema_control_movimientos: "",
    observaciones: ""
  };

  const opcionesInspeccion = [
    { label: "Bien", value: "B" },
    { label: "Mal (Requiere reparación)", value: "M" }
  ];

  const objetoLabels = {
    limpieza_general: "LIMPIEZA GENERAL (carrocería)",
    estado_general: "ESTADO GENERAL (carrocería)",
    estructura_proteccion: "ESTRUCTURA DE PROTECCIÓN DEL OPERADOR (carrocería)",
    asiento_cinturon: "ASIENTO Y CINTURÓN DE SEGURIDAD (carrocería)",
    aceite_fugas: "FUGAS DE ACEITE (motor)",
    aceite_nivel: "NIVEL DE ACEITE (motor)",
    entrada_aire: "ENTRADA DE AIRE/ELEMENTOS DEL LIMPIADOR DE AIRE (motor)",
    nivel_combustible: "NIVEL DE COMBUSTIBLE (motor)",
    LGP_conector: "CONECTOR LGP (motor)",
    refrigerante_fugas: "FUGAS DE REFRIGERANTE (sistema de refrigeración)",
    refrigerante_nivel: "NIVEL DE REFRIGERANTE (sistema de refrigeración)",
    conjunto_refrigeracion: "CONJUNTO REFRIGERACIÓN (sistema de refrigeración)",
    seguridad_tuercas_ruedas: "SEGURIDAD EN LAS TUERCAS DE LAS RUEDAS (ruedas y neumáticos)",
    presion_neumaticos: "PRESIÓN NEUMÁTICOS (ruedas y neumáticos)",
    latiguillo_tuberias: "LATIGUILLOS Y TUBERÍAS (sistema hidráulico)",
    aceite_hidraulico_nivel: "NIVEL ACEITE HIDRÁULICO (sistema hidráulico)",
    liquido_limpiaparabrisas: "NIVEL DEL LÍQUIDO DEL LIMPIAPARABRISAS (sistema eléctrico)",
    sistema_control_movimientos: "SISTEMA DE CONTROL DEL MOVIMIENTO DE CARGA LONGITUDINAL (sistema eléctrico)"
  };

  const notasCampos = {
    limpieza_general: "Limpiar",
    estado_general: "Comprobar estado",
    estructura_proteccion: "Comprobar estado",
    asiento_cinturon: "Comprobar estado",
    aceite_fugas: "Comprobar fugas",
    aceite_nivel: "Comprobar nivel",
    entrada_aire: "Comprobar estado",
    nivel_combustible: "Comprobar",
    LGP_conector: "Comprobar estado",
    refrigerante_fugas: "Comprobar fugas",
    refrigerante_nivel: "Comprobar nivel",
    conjunto_refrigeracion: "Limpiar",
    seguridad_tuercas_ruedas: "Comprobar estado",
    presion_neumaticos: "Comprobar estado",
    latiguillo_tuberias: "Comprobar fugas",
    aceite_hidraulico_nivel: "Comprobar nivel",
    liquido_limpiaparabrisas: "Comprobar nivel",
    sistema_control_movimientos: "Comprobar funcionamiento"
  };

  const camposInspeccion = [
    'limpieza_general',
    'estado_general',
    'estructura_proteccion',
    'asiento_cinturon',
    'aceite_fugas',
    'aceite_nivel',
    'entrada_aire',
    'nivel_combustible',
    'LGP_conector',
    'refrigerante_fugas',
    'refrigerante_nivel',
    'conjunto_refrigeracion',
    'seguridad_tuercas_ruedas',
    'presion_neumaticos',
    'latiguillo_tuberias',
    'aceite_hidraulico_nivel',
    'liquido_limpiaparabrisas',
    'sistema_control_movimientos'
  ];

  const camposObligatorios = ['operario', 'horometro', ...camposInspeccion];

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

  const getCurrentWeek = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diff = now - startOfYear;
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)).toString();
  };

  const fetchReportes = async () => {
    try {
      const { data, error } = await supabase
        .from("Preoperacional_Teletruk")
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
      const semanaActual = getCurrentWeek();

      const { error } = await supabase
        .from("Preoperacional_Teletruk")
        .insert([{
          ...reporte,
          fecha_registro: fechaActual,
          hora_registro: horaActual,
          semana: semanaActual
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
      head: [["Fecha", "Hora", "Semana", "Operario", "Horómetro", "Observaciones"]],
      body: selectedReportes.map(reporte => [
        formatFecha(reporte.fecha_registro),
        reporte.hora_registro,
        reporte.semana,
        reporte.operario,
        reporte.horometro,
        reporte.observaciones
      ])
    });
    doc.save("reportes-preoperacional-teletruk.pdf");
  };

  const exportXlsx = () => {
    if (selectedReportes.length === 0) {
      showToast('error', 'Error', 'Seleccione al menos un registro para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedReportes);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reportes");
    XLSX.writeFile(workbook, "reportes-preoperacional-teletruk.xlsx");
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

  const onRowEditComplete = async (e) => {
    const _reportes = [...reportes];
    const { newData, index } = e;
    _reportes[index] = newData;

    try {
      const { error } = await supabase
        .from("Preoperacional_Teletruk")
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
    { field: "operario", header: "Operario", editor: textEditor, sortable: true },
    { field: "horometro", header: "Horómetro", editor: textEditor, sortable: true },
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
        Reporte Preoperacional Teletruk
      </h1>
      
      <div className="welcome-message">
        <p>
          Bienvenido al sistema de Reporte Preoperacional para Teletruk.
          Aquí puedes gestionar los reportes de inspección preoperacional.
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
          <Column field="semana" header="Semana" sortable />
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
        header="Nuevo Reporte Preoperacional"
        modal
        onHide={() => setReporteDialog(false)}
      >
        <div className="p-fluid grid">
          <div className="col-12 font-bold text-xl mb-3">Datos Previos</div>
          
          <div className="field col-6">
            <label className="font-bold">
              OPERARIO*
              {submitted && !reporte.operario && <small className="p-error"> Requerido</small>}
            </label>
            <InputText
              value={reporte.operario}
              onChange={(e) => onInputChange(e, "operario")}
            />
          </div>

          <div className="field col-6">
            <label className="font-bold">
              HORÓMETRO*
              {submitted && !reporte.horometro && <small className="p-error"> Requerido</small>}
            </label>
            <InputText
              value={reporte.horometro}
              onChange={(e) => onInputChange(e, "horometro")}
            />
          </div>

          <div className="col-12 font-bold text-xl mt-5 mb-3">Inspección Preoperacional</div>
          
          {camposInspeccion.map((field) => (
            <div className="field col-6" key={field}>
              <label className="font-bold">
                {objetoLabels[field]}*
                {submitted && !reporte[field] && (
                    <small className="p-error"> Requerido</small>
                )}
                </label>

              <small className="campo-note">
                {notasCampos[field] || "Verificar estado del componente"}
                </small>

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

export default ReportePreoperacionalTeletruk;