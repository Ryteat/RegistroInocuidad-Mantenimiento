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

function ReporteInspeccion() {
  const emptyReport = {
    fecha_registro: "",
    hora_registro: "",
    nombre_operador: "",
    unidad: "",
    modelo: "",
    serie: "",
    turno: "",
    horometro: "",
    aditamientos_especiales: "",
    aceite_motor: "",
    sistema_combustible: "",
    radiador: "",
    llantas: "",
    mastil_carro_horquillas_aditamiento: "",
    agua_aceite: "",
    danos_montacargas: "",
    compartimiento_operador: "",
    luz_aviso_presion_aceite: "",
    combustible: "",
    luz_aviso_carga_alternador: "",
    equipo_seguridad: "",
    eje_direccion: "",
    frenos: "",
    operacion_montacargas: "",
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

  const camposObligatorios = [
    "nombre_operador",
    "unidad",
    "modelo",
    "serie",
    "turno",
    "horometro"
  ];

  const labelsPersonalizados = {
    nombre_operador: "Nombre del Operador",
    unidad: "Número de Unidad",
    modelo: "Modelo del Montacargas",
    serie: "Número de Serie",
    turno: "Turno de Trabajo",
    horometro: "Horómetro",
    aceite_motor: "Nivel de Aceite del Motor",
    sistema_combustible: "Sistema de Combustible",
    radiador: "Radiador",
    llantas: "Llantas",
    mastil_carro_horquillas_aditamiento: "Mástil, Carro, Horquillas y Aditamiento",
    agua_aceite: "Agua y Aceite",
    danos_montacargas: "Daños al Montacargas",
    compartimiento_operador: "Compartimiento del Operador",
    luz_aviso_presion_aceite: "Luz de Advertencia Presión de Aceite",
    combustible: "Nivel de Combustible",
    luz_aviso_carga_alternador: "Luz aviso de Carga del Alternador",
    equipo_seguridad: "Equipo de Seguridad (alarma, torreta, etc.)",
    eje_direccion: "Eje de Dirección",
    frenos: "Sistema de Frenos",
    operacion_montacargas: "Operación General del Montacargas",
    observaciones: "Observaciones y Notas"
  };

  const notasCampos = {
    nombre_operador: "Ingrese nombre completo del operador responsable",
    unidad: "Número de identificación de la unidad (ej: MT-001)",
    modelo: "Modelo específico del montacargas (ej: FG-25)",
    serie: "Número de serie del fabricante",
    turno: "",
    horometro: "Ingrese el valor actual del horómetro",
    aceite_motor: "Verificar nivel entre marcas mínimo/máximo",
    sistema_combustible: "Revisar fugas (repórtelas inmediatamente)",
    radiador: "Chequear nivel de refrigerante con motor frío",
    llantas: "Inspeccionar desgaste, objetos cortantes incrustados, cortes y presión",
    mastil_carro_horquillas_aditamiento: "Verifique tornillos flojos, dañados o caídos, cadenas flojas, ajuste y operación",
    agua_aceite: "Verifique fugas",
    danos_montacargas: "Registrar abolladuras, grietas o corrosión en observaciones al final",
    compartimiento_operador: "Inspeccione que esté limpio",
    luz_aviso_presion_aceite: "Reporte cualquier falla",
    combustible: "Verifique el nivel",
    luz_aviso_carga_alternador: "Reporte cualquier falla",
    equipo_seguridad: "Verifique que funcionen",
    eje_direccion: "Verifique su respuesta",
    frenos: "Probar freno de mano y de servicio",
    operacion_montacargas: "Reporte cualquier operación o ruido anormal",
    observaciones: "Detallar acciones correctivas necesarias (cuando corresponda)"
  };

  const camposInspeccion = [
    "aceite_motor",
    "sistema_combustible",
    "radiador",
    "llantas",
    "mastil_carro_horquillas_aditamiento",
    "agua_aceite",
    "danos_montacargas",
    "compartimiento_operador",
    "luz_aviso_presion_aceite",
    "combustible",
    "luz_aviso_carga_alternador",
    "equipo_seguridad",
    "eje_direccion",
    "frenos",
    "operacion_montacargas"
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
        .from("Reporte_Inspeccion_Montacargas_Combustion_Interna(diario)")
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
        .from("Reporte_Inspeccion_Montacargas_Combustion_Interna(diario)")
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
      head: [["Fecha", "Hora", "Operador", "Unidad", "Modelo", "Horómetro", "Observaciones"]],
      body: selectedReportes.map(reporte => [
        formatFecha(reporte.fecha_registro),
        reporte.hora_registro,
        reporte.nombre_operador,
        reporte.unidad,
        reporte.modelo,
        reporte.horometro,
        reporte.observaciones
      ])
    });
    doc.save("reportes-inspeccion.pdf");
  };

  const exportXlsx = () => {
    if (selectedReportes.length === 0) {
      showToast('error', 'Error', 'Seleccione al menos un registro para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedReportes);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reportes");
    XLSX.writeFile(workbook, "reportes-inspeccion.xlsx");
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
        .from("Reporte_Inspeccion_Montacargas_Combustion_Interna(diario)")
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
    { field: "nombre_operador", header: "Operador", editor: textEditor, sortable: true },
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
    { 
      field: "horometro", 
      header: "Horómetro", 
      editor: textEditor, 
      sortable: true 
    },
    ...camposInspeccion.map((field) => ({
      field: field,
      header: labelsPersonalizados[field] || field.replace(/_/g, " "),
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
        Reporte de Inspección Diario de Montacargas
      </h1>
      
      <div className="welcome-message">
        <p>
          Bienvenido al sistema de Reporte de Inspección de Montacargas.
          Aquí puedes gestionar los reportes diarios de inspección.
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
        header="Nuevo Reporte"
        modal
        onHide={() => setReporteDialog(false)}
      >
        <div className="p-fluid grid">
          <div className="col-12 font-bold text-xl mb-3">Datos Previos</div>
          
          {["nombre_operador", "unidad", "modelo", "serie"].map((field) => (
            <div className="field col-6" key={field}>
              <label className="font-bold">
                {labelsPersonalizados[field]}*
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
              {labelsPersonalizados.turno}*
              {submitted && !reporte.turno && <small className="p-error"> Requerido</small>}
            </label>
            <Dropdown
              value={reporte.turno}
              options={opcionesTurno}
              onChange={(e) => onInputChange(e, "turno")}
              placeholder="Seleccione"
            />
          </div>

          

          <div className="col-12 font-bold text-xl mt-5 mb-3">Inspección Diaria</div>

          <div className="field col-6">
            <label className="font-bold">
              {labelsPersonalizados.horometro}*
              {submitted && !reporte.horometro && <small className="p-error"> Requerido</small>}
            </label>
            <InputText
              value={reporte.horometro}
              onChange={(e) => onInputChange(e, "horometro")}
            />
          </div>
          
          {camposInspeccion.map((field) => (
            <div className="field col-6" key={field}>
              <label className="font-bold">
                {labelsPersonalizados[field]}*
              </label>

              <small className="campo-note">
                {notasCampos[field] || "Complete según documentación oficial"}
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
              {labelsPersonalizados.observaciones}
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

export default ReporteInspeccion;


