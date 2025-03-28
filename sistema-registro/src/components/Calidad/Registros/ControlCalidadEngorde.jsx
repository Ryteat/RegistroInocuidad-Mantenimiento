import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Imports de estilos
import logo2 from "../../../assets/mosca.png";
//import "./ControlCalidadEngorde.css";

// Imports de Supabase
import supabase from "../../../supabaseClient";

// PRIME REACT
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primeicons/primeicons.css";

// PRIME REACT COMPONENTS
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Toolbar } from "primereact/toolbar";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

// Imports de exportar
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

function ControlCalidadEngorde() {
  let emptyRegister = {
    fecha_siembra: "",
    tipo_dieta: "",
    codigo: "",
    tipo_control: "",
    fecha_revision: "",
    dia_control: "",
    humedad_ambiental: "",
    temperatura_ambiental: "",
    humedad_dieta: "",
    humedad_cualitativa: "",
    temperatura_dieta: "",
    peso: "",
    tamanio: "",
    color: "",
    brix: "",
    pH: "",
    observaciones: ""
  };

  const [registros, setRegistros] = useState([]);
  const [registro, setRegistro] = useState(emptyRegister);
  const toast = useRef(null);
  const dt = useRef(null);
  const [selectedRegistros, setSelectedRegistros] = useState([]);
  const [globalFilter, setGlobalFilter] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [registroDialog, setRegistroDialog] = useState(false);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const navigate = useNavigate();


  const tiposDieta = ["Producción", "Reproducción"];
  const tiposControl = ["Prueba", "Control"];
  const colores = ["1", "2", "3", "4", "5", "5", "6", "7", "8"];
  const diasControl = Array.from({length: 8}, (_, i) => (i + 3).toString()); // 3-10

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  

  const hideDialog = () => {
    setSubmitted(false);
    setRegistroDialog(false);
  };

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Calidad_Engorde")
        .select();
      if (data) {
        // Formatear fechas al cargar
        const formattedData = data.map(registro => ({
          ...registro,
          fecha_siembra: convertirFecha(registro.fecha_siembra),
          fecha_revision: convertirFecha(registro.fecha_revision)
        }));
        setRegistros(formattedData);
      }
    } catch (error) {
      console.log("Error en la conexión a la base de datos:", error);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const formatDateTime = (date) => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).formatToParts(date).reduce((acc, { type, value }) => ({ ...acc, [type]: value }), {});

    return {
      fecha: `${fmt.day}/${fmt.month}/${fmt.year}`,
      hora: `${fmt.hour}:${fmt.minute} ${fmt.dayPeriod}`
    };
  };

  const saveRegistro = async () => {
    setSubmitted(true);
    const camposRequeridos = [
      'fecha_siembra',
      'tipo_dieta',
      'codigo',
      'tipo_control',
      'fecha_revision',
      'dia_control',
      'humedad_ambiental',
      'temperatura_ambiental',
      'humedad_dieta',
      'humedad_cualitativa',
      'temperatura_dieta',
      'peso',
      'tamanio',
      'color',
      'brix',
      'pH'
    ];

    const faltanCampos = camposRequeridos.some(campo => !registro[campo]);
    
    if (faltanCampos) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Todos los campos son obligatorios",
        life: 3000
      });
      return;
    }

    try {
      const { fecha, hora } = formatDateTime(new Date());

      const registroParaGuardar = {
        ...registro,
        fecha_siembra: convertirFecha(registro.fecha_siembra), // Convertir al guardar
        fecha_revision: convertirFecha(registro.fecha_revision), // Convertir al guardar
        fecha_registro: fecha,
        hora_registro: hora
      };
      
      const { data, error } = await supabase
        .from("Control_Calidad_Engorde_Hatchery")
        .insert([{
          ...registro,
          fecha_registro: fecha,
          hora_registro: hora
        }]);

      if (error) throw error;

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro guardado",
        life: 3000
      });

      setRegistro(emptyRegister);
      setRegistroDialog(false);
      fetchRegistros();
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.message,
        life: 3000
      });
    }
  };

  const registroDialogFooter = (
    <React.Fragment>
      <Button
        label="Cancelar"
        icon="pi pi-times"
        outlined
        onClick={hideDialog}
      />
      <Button 
      label="Guardar" 
      icon="pi pi-check" 
      onClick={saveRegistro} />
    </React.Fragment>
  );

  const dateEditor = (options) => {
    const convertToInputFormat = (date) => date ? date.split("/").reverse().join("-") : "";
    return (
      <InputText
        type="date"
        value={convertToInputFormat(options.value)}
        onChange={(e) => options.editorCallback(e.target.value.split("-").reverse().join("/"))}
      />
    );
  };

  const numberEditor = (options) => {
    return (
      <InputText
        type="number"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      />
    );
  };

  const onRowEditComplete = async ({ newData }) => {
    try {
      const { error } = await supabase
        .from("Control_Calidad_Engorde_Hatchery")
        .update(newData)
        .eq("id", newData.id);

      if (error) throw error;

      setRegistros(registros.map(item => item.id === newData.id ? newData : item));
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.message,
        life: 3000
      });
    }
  };

  const exportPdf = () => {
    if (selectedRegistros.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay filas seleccionadas para exportar.",
        life: 3000
      });
      return;
    }

    const doc = new jsPDF();
    doc.autoTable({
      head: [Object.keys(emptyRegister).map(key => key.toUpperCase())],
      body: selectedRegistros.map(reg => Object.values(reg))
    });
    doc.save("control-calidad-engorde.pdf");
  };

  const exportXlsx = () => {
    if (selectedRegistros.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay filas seleccionadas para exportar.",
        life: 3000
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedRegistros);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registros");
    XLSX.writeFile(workbook, "control-calidad-engorde.xlsx");
  };

  const leftToolbarTemplate = () => (
    <div className="flex flex-wrap gap-2">
      <Button
        label="Nuevo"
        icon="pi pi-plus"
        severity="success"
        onClick={() => setRegistroDialog(true)}
      />
    </div>
  );

  const rightToolbarTemplate = () => {
      return (
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
    };

  const header = (
    <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
      <span className="p-input-icon-left">
        <i className="pi pi-search" />
        <InputText
          type="search"
          placeholder="Buscar..."
          onInput={(e) => setGlobalFilter(e.target.value)}
        />
      </span>
    </div>
  );

  return (
    <div className="control-calidad-container">
      <Toast ref={toast} />
      <h1>
        <img src={logo2} alt="mosca" className="logo2" />
        Control de Calidad Engorde 
      </h1>
      <div className="welcome-message">
          <p>
             Bienvenido al sistema de Control de Calidad Engorde Hatchery.
            Aquí puedes gestionar los registros de calidad del engorde en 
            hatchery, asegurando el cumplimiento de los estándares establecidos.
          </p>
        </div>
      <div className="buttons-container">
        <button onClick={() => navigate(-1)} className="return-button">
          Volver
        </button>
        <br />
        <br />
        <button onClick={() => navigate(-2)} className="menu-button">
          Menú principal
        </button>
      </div>

      <Toolbar
        className="mb-4"
        left={leftToolbarTemplate}
        right={rightToolbarTemplate}
      />

      <DataTable
        ref={dt}
        value={registros}
        editMode="row"
        onRowEditComplete={onRowEditComplete}
        selection={selectedRegistros}
        onSelectionChange={(e) => setSelectedRegistros(e.value)}
        globalFilter={globalFilter}
        header={header}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} registros"
      >
        <Column 
            selectionMode="multiple" 
            headerStyle={{ width: '3rem' }}
        ></Column>
        <Column 
          field="fecha_siembra" 
          header="Fecha Siembra" 
          editor={dateEditor} 
          sortable 
          body={(rowData) => rowData.fecha_siembra} // Mostrar directamente el valor formateado
        />
        <Column 
          field="fecha_revision" 
          header="Fecha Revisión" 
          editor={dateEditor} 
          sortable 
          body={(rowData) => rowData.fecha_revision} // Mostrar directamente el valor formateado
        />
        <Column field="hora_registro" header="Hora Registro" sortable />
        <Column field="fecha_siembra" header="Fecha Siembra" editor={dateEditor} sortable />
        <Column field="tipo_dieta" header="Tipo Dieta" editor={(options) => (
          <Dropdown
            value={options.value}
            options={tiposDieta}
            onChange={(e) => options.editorCallback(e.value)}
          />
        )} sortable />
        <Column field="codigo" header="Código" editor={(options) => (
          <InputText value={options.value} onChange={(e) => options.editorCallback(e.target.value)} />
        )} sortable />
        <Column field="tipo_control" header="Tipo Control" editor={(options) => (
          <Dropdown
            value={options.value}
            options={tiposControl}
            onChange={(e) => options.editorCallback(e.value)}
          />
        )} sortable />
        <Column field="fecha_revision" header="Fecha Revisión" editor={dateEditor} sortable />
        <Column field="dia_control" header="Día Control" editor={(options) => (
          <Dropdown
            value={options.value}
            options={diasControl}
            onChange={(e) => options.editorCallback(e.value)}
          />
        )} sortable />
        <Column field="humedad_ambiental" header="Humedad Ambiental (%)" editor={numberEditor} sortable />
        <Column field="temperatura_ambiental" header="Temp. Ambiental (°C)" editor={numberEditor} sortable />
        <Column field="humedad_dieta" header="Humedad Dieta (%)" editor={numberEditor} sortable />
        <Column field="humedad_cualitativa" header="Humedad Cualitativa (%)" editor={numberEditor} sortable />
        <Column field="temperatura_dieta" header="Temp. Dieta (°C)" editor={numberEditor} sortable />
        <Column field="peso" header="Peso (miligramos)" editor={numberEditor} sortable />
        <Column field="tamanio" header="Tamaño (mm)" editor={numberEditor} sortable />
       <Column field="color" header="Color" editor={(options) => (
          <Dropdown
            value={options.value}
            options={colores}
            onChange={(e) => options.editorCallback(e.value)}
          />
        )} sortable />
        <Column field="brix" header="Brix (%)" editor={numberEditor} sortable />
        <Column field="pH" header="pH" editor={numberEditor} sortable />
        <Column field="observaciones" header="Observaciones" editor={(options) => (
          <InputText value={options.value} onChange={(e) => options.editorCallback(e.target.value)} />
        )} sortable />
        <Column rowEditor headerStyle={{ width: '10%', minWidth: '8rem' }} bodyStyle={{ textAlign: 'center' }} />
      </DataTable>

      <Dialog
        visible={registroDialog}
        style={{ width: "32rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        header="Nuevo registro"
        modal
        className="p-fluid"
        footer={registroDialogFooter}
        onHide={hideDialog}
      >
        <div className="field">
          <label htmlFor="fecha_siembra">Fecha Siembra *</label>
          <InputText
            type="date"
            value={registro.fecha_siembra}
            onChange={(e) => setRegistro({...registro, fecha_siembra: e.target.value})}
          />
          
          <label>Tipo Dieta *</label>
          <Dropdown
            options={tiposDieta}
            value={registro.tipo_dieta}
            onChange={(e) => setRegistro({...registro, tipo_dieta: e.value})}
          />

          <label>Código *</label>
          <InputText
            value={registro.codigo}
            onChange={(e) => setRegistro({...registro, codigo: e.target.value})}
          />

          <label>Tipo Control *</label>
          <Dropdown
            options={tiposControl}
            value={registro.tipo_control}
            onChange={(e) => setRegistro({...registro, tipo_control: e.value})}
          />

          <label>Fecha Revisión *</label>
          <InputText
            type="date"
            value={registro.fecha_revision}
            onChange={(e) => setRegistro({...registro, fecha_revision: e.target.value})}
          />

          <label>Día Control *</label>
          <Dropdown
            options={diasControl.map(dia => ({ label: dia, value: dia }))}
            value={registro.dia_control}
            onChange={(e) => setRegistro({...registro, dia_control: e.value})}
            placeholder="Seleccione día"
          />

          <label>Humedad Ambiental (%) *</label>
          <InputText
            type="number"
            value={registro.humedad_ambiental}
            onChange={(e) => setRegistro({...registro, humedad_ambiental: e.target.value})}
          />

          <label>Temperatura Ambiental (°C) *</label>
          <InputText
            type="number"
            value={registro.temperatura_ambiental}
            onChange={(e) => setRegistro({...registro, temperatura_ambiental: e.target.value})}
          />

          <label>Humedad Dieta (%) *</label>
          <InputText
            type="number"
            value={registro.humedad_dieta}
            onChange={(e) => setRegistro({...registro, humedad_dieta: e.target.value})}
          />

          <label>Humedad Cualitativa (%) *</label>
          <InputText
            type="number"
            value={registro.humedad_cualitativa}
            onChange={(e) => setRegistro({...registro, humedad_cualitativa: e.target.value})}
          />

          <label>Temperatura Dieta (°C) *</label>
          <InputText
            type="number"
            value={registro.temperatura_dieta}
            onChange={(e) => setRegistro({...registro, temperatura_dieta: e.target.value})}
          />

          <label>Peso (miligramos) *</label>
          <InputText
            type="number"
            value={registro.peso}
            onChange={(e) => setRegistro({...registro, peso: e.target.value})}
          />
          <label>Tamaño (mm) *</label>
          <InputText
            type="number"
            value={registro.tamanio}
            onChange={(e) => setRegistro({...registro, tamanio: e.target.value})}
          />

          <label>Color *</label>
          <Dropdown
            options={colores}
            value={registro.color}
            onChange={(e) => setRegistro({...registro, color: e.value})}
          />

          <label>Brix (%) *</label>
          <InputText
            type="number"
            value={registro.brix}
            onChange={(e) => setRegistro({...registro, brix: e.target.value})}
          />

          <label>pH *</label>
          <InputText
            type="number"
            step="0.1"
            value={registro.pH}
            onChange={(e) => setRegistro({...registro, pH: e.target.value})}
          />

          <label>Observaciones</label>
          <InputText
            value={registro.observaciones}
            onChange={(e) => setRegistro({...registro, observaciones: e.target.value})}
          />
        </div>

        
      </Dialog>
    </div>
  );
}

export default ControlCalidadEngorde;