import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo2 from "../../../assets/mosca.png";
import supabase from "../../../supabaseClient";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Toolbar } from "primereact/toolbar";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

function ControlCalidadHornoMicroondas() {
  let emptyRegister = {
    fecha_procesamiento: "",
    numero_lote: "",
    nombre_cliente: "",
    producto: "",
    presentacion: "",
    hora_inicio: "",
    hora_fin: "",
    num_muestra_horneado: "",
    temperatura_ambiental_horneado: "",
    humedad_ambiental_horneado: "",
    temperatura_horno: "",
    velocidad_banda: "",
    tiempo_residencia: "",
    temperatura_producto_horneado: "",
    humedad_producto_horneado: "",
    aprobacion_horneado: "",
    num_muestra_empaque: "",
    temperatura_ambiental_empaque: "",
    humedad_ambiental_empaque: "",
    temperatura_producto_empaque: "",
    humedad_producto_empaque: "",
    densidad: "",
    aprobacion_empaque: "",
    material_empaque: "",
    proveedor: "",
    lote: "",
    hora_codificacion: "",
    codigo_juliano: "",
    fecha_vencimiento: "",
    verificacion_peso: "",
    estado_empaque: "",
    unidades_empacadas: "",
    unidades_retenidas: "",
    unidades_incompletas: "",
    observaciones: ""
  };

  const [registros, setRegistros] = useState([]);
  const [registro, setRegistro] = useState(emptyRegister);
  const [showPresentacionOtro, setShowPresentacionOtro] = useState(false);
  const toast = useRef(null);
  const dt = useRef(null);
  const [selectedRegistros, setSelectedRegistros] = useState([]);
  const [globalFilter, setGlobalFilter] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [registroDialog, setRegistroDialog] = useState(false);
  const navigate = useNavigate();
  

  const presentaciones = ["2,5lb", "5lb", "Jumbo saco", "Otro"];
  const numerosMuestra = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
  const opcionesAprobacion = ["Cumple", "No Cumple"];
  const estadosEmpaque = ["Bueno", "Regular", "Malo"];

  const convertirFecha = (fecha) => (fecha ? fecha.split("-").reverse().join("/") : "");

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      const { data, error, status } = await supabase
        .from("Control_Calidad_Horno_Microondas")
        .select()
  
      if (error && status !== 406) {
        throw error
      }
  
      if (data) {
        const formattedData = data.map((item) => ({
          ...item,
          fecha_procesamiento: convertirFecha(item.fecha_procesamiento),
          fecha_vencimiento: convertirFecha(item.fecha_vencimiento)
        }))
        setRegistros(formattedData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.current.show({
        severity: "error",
        summary: "Error de conexión",
        detail: error.message,
        life: 5000
      })
    }
  }

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

  const validateFields = () => {
    const requiredFields = Object.keys(emptyRegister).filter(field => field !== "observaciones");
    const missingFields = requiredFields.filter(field => !registro[field]);
    
    if (registro.temperatura_producto_empaque > 35 && !registro.observaciones) {
      return { valid: false, message: "Debe agregar observaciones cuando la temperatura supera 35°C" };
    }
    
    if (missingFields.length > 0) {
      return { 
        valid: false, 
        message: `Campos obligatorios faltantes: ${missingFields.join(", ")}`
      };
    }
    
    return { valid: true };
  };

  const saveRegistro = async () => {
    setSubmitted(true);
    const validation = validateFields();
    
    if (!validation.valid) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: validation.message,
        life: 3000
      });
      return;
    }

    try {
      const { fecha, hora } = formatDateTime(new Date());
      
      const registroData = {
        ...registro,
        fecha_registro: fecha,
        hora_registro: hora,
        fecha_procesamiento: convertirFecha(registro.fecha_procesamiento),
        fecha_vencimiento: convertirFecha(registro.fecha_vencimiento)
      };

      const { error } = await supabase
        .from("Control_Calidad_Horno_Microondas")
        .insert([registroData]);

      if (error) throw error;

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro guardado",
        life: 3000
      });

      setRegistro(emptyRegister);
      setRegistroDialog(false);
      setShowPresentacionOtro(false);
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
    doc.save("control-horno-microondas.pdf");
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
    XLSX.writeFile(workbook, "control-horno-microondas.xlsx");
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

  const rightToolbarTemplate = () => (
    <div className="flex flex-wrap gap-2">
      <Button
        label="Exportar Excel"
        icon="pi pi-upload"
        className="p-button-help"
        onClick={exportXlsx}
      />
      <Button
        label="Exportar PDF"
        icon="pi pi-file-pdf"
        className="p-button-danger"
        onClick={exportPdf}
      />
    </div>
  );

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

  const registroDialogFooter = (
    <React.Fragment>
      <Button label="Cancelar" icon="pi pi-times" outlined onClick={() => setRegistroDialog(false)} />
      <Button label="Guardar" icon="pi pi-check" onClick={saveRegistro} />
    </React.Fragment>
  );

  const numberEditor = (options) => (
    <InputText
      type="number"
      value={options.value}
      onChange={(e) => options.editorCallback(e.target.value)}
    />
  );
  
  const dateEditor = (options) => {
    const convertToInputFormat = (date) => 
      date ? date.split("/").reverse().join("-") : "";
    
    return (
      <InputText
        type="date"
        value={convertToInputFormat(options.value)}
        onChange={(e) => {
          const newDate = e.target.value.split("-").reverse().join("/");
          options.editorCallback(newDate);
        }}
      />
    );
  };

  const onRowEditComplete = async (e) => {
    const { newData } = e;
  
    try {
      // Convertir fechas al formato de base de datos antes de actualizar
      const formattedData = {
        ...newData,
        fecha_procesamiento: newData.fecha_procesamiento.split("/").reverse().join("-"),
        fecha_vencimiento: newData.fecha_vencimiento.split("/").reverse().join("-")
      };
  
      const { error } = await supabase
        .from("Control_Calidad_Horno_Microondas")
        .update(formattedData)
        .eq("id", newData.id);
  
      if (error) throw error;
  
      setRegistros(registros.map(item => 
        item.id === newData.id ? newData : item
      ));
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error al actualizar",
        detail: error.message,
        life: 3000
      });
    }
  };

  return (
    <div className="control-calidad-container">
      <Toast ref={toast} />
      <h1>
        <img src={logo2} alt="mosca" className="logo2" />
        Control de Calidad Horno Microondas
      </h1>
      
      <div className="welcome-message">
        <p>
          Bienvenido al sistema de Control de Calidad de Horno Microondas.
          Aquí puedes gestionar los registros de calidad del proceso de horneado y empaque.
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
        left={leftToolbarTemplate}
        right={rightToolbarTemplate}
      />

      <DataTable
        ref={dt}
        value={registros}
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
        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
        <Column field="fecha_registro" header="Fecha Registro" sortable />
        <Column field="hora_registro" header="Hora Registro" sortable />
        <Column field="fecha_procesamiento" header="Fecha Procesamiento" sortable />
        <Column field="numero_lote" header="Número Lote" sortable />
        <Column field="nombre_cliente" header="Cliente" sortable />
        <Column field="producto" header="Producto" sortable />
        <Column field="presentacion" header="Presentación" sortable />
        <Column field="hora_inicio" header="Hora Inicio" sortable />
        <Column field="hora_fin" header="Hora Fin" sortable />
        <Column field="num_muestra_horneado" header="Muestra Horneado" sortable />
        <Column field="temperatura_ambiental_horneado" header="Temp Ambiente Horneado (°C)" sortable />
        <Column field="humedad_ambiental_horneado" header="Humedad Ambiente Horneado (%)" sortable />
        <Column field="temperatura_horno" header="Temperatura Horno (°C)" sortable />
        <Column field="velocidad_banda" header="Velocidad Banda (m/min)" sortable />
        <Column field="tiempo_residencia" header="Tiempo Residencia (min)" sortable />
        <Column field="temperatura_producto_horneado" header="Temp Producto Horneado (°C)" sortable />
        <Column field="humedad_producto_horneado" header="Humedad Producto Horneado (%)" sortable />
        <Column field="aprobacion_horneado" header="Aprobación Horneado" sortable />
        <Column field="num_muestra_empaque" header="Muestra Empaque" sortable />
        <Column field="temperatura_ambiental_empaque" header="Temp Ambiente Empaque (°C)" sortable />
        <Column field="humedad_ambiental_empaque" header="Humedad Ambiente Empaque (%)" sortable />
        <Column field="temperatura_producto_empaque" header="Temp Producto Empaque (°C)" sortable />
        <Column field="humedad_producto_empaque" header="Humedad Producto Empaque (%)" sortable />
        <Column field="densidad" header="Densidad (kg/m³)" sortable />
        <Column field="aprobacion_empaque" header="Aprobación Empaque" sortable />
        <Column field="material_empaque" header="Material Empaque" sortable />
        <Column field="proveedor" header="Proveedor" sortable />
        <Column field="lote" header="Lote" sortable />
        <Column field="hora_codificacion" header="Hora Codificación" sortable />
        <Column field="codigo_juliano" header="Código Juliano" sortable />
        <Column field="fecha_vencimiento" header="Fecha Vencimiento" sortable />
        <Column field="verificacion_peso" header="Verificación Peso" sortable />
        <Column field="estado_empaque" header="Estado Empaque" sortable />
        <Column field="unidades_empacadas" header="Unidades Empacadas" sortable />
        <Column field="unidades_retenidas" header="Unidades Retenidas" sortable />
        <Column field="unidades_incompletas" header="Unidades Incompletas" sortable />
        <Column field="observaciones" header="Observaciones" sortable />
    
      </DataTable>

      <Dialog
        visible={registroDialog}
        style={{ width: "50rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        header="Nuevo Registro"
        modal
        className="p-fluid"
        footer={registroDialogFooter}
        onHide={() => setRegistroDialog(false)}
      >
        <div className="field-grid">
          <div className="form-section">
            <h3>Datos Generales</h3>
            <div className="field">
              <label>Fecha Procesamiento *</label>
              <InputText
                type="date"
                value={registro.fecha_procesamiento}
                onChange={(e) => setRegistro({ ...registro, fecha_procesamiento: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Presentación *</label>
              <Dropdown
                value={registro.presentacion}
                options={presentaciones}
                onChange={(e) => {
                  setRegistro({ ...registro, presentacion: e.value });
                  setShowPresentacionOtro(e.value === "Otro");
                }}
                placeholder="Seleccione presentación"
              />
            </div>

            {showPresentacionOtro && (
              <div className="field">
                <label>Especificar Presentación *</label>
                <InputText
                  value={registro.presentacion}
                  onChange={(e) => setRegistro({ ...registro, presentacion: e.target.value })}
                />
              </div>
            )}

            <div className="field">
              <label>Número de Lote *</label>
              <InputText
                value={registro.numero_lote}
                onChange={(e) => setRegistro({ ...registro, numero_lote: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Nombre del Cliente *</label>
              <InputText
                value={registro.nombre_cliente}
                onChange={(e) => setRegistro({ ...registro, nombre_cliente: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Producto *</label>
              <InputText
                value={registro.producto}
                onChange={(e) => setRegistro({ ...registro, producto: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Hora Inicio *</label>
              <InputText
                type="time"
                value={registro.hora_inicio}
                onChange={(e) => setRegistro({ ...registro, hora_inicio: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Hora Fin *</label>
              <InputText
                type="time"
                value={registro.hora_fin}
                onChange={(e) => setRegistro({ ...registro, hora_fin: e.target.value })}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Parámetros de Horneado</h3>
            <div className="field">
              <label>Número de Muestra *</label>
              <Dropdown
                options={numerosMuestra}
                value={registro.num_muestra_horneado}
                onChange={(e) => setRegistro({ ...registro, num_muestra_horneado: e.value })}
                placeholder="Seleccione muestra"
              />
            </div>

            <div className="field">
              <label>Temperatura Ambiental (°C) *</label>
              <InputText
                type="number"
                value={registro.temperatura_ambiental_horneado}
                onChange={(e) => setRegistro({ ...registro, temperatura_ambiental_horneado: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Humedad Ambiental (%) *</label>
              <InputText
                type="number"
                value={registro.humedad_ambiental_horneado}
                onChange={(e) => setRegistro({ ...registro, humedad_ambiental_horneado: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Temperatura Horno (°C) *</label>
              <InputText
                type="number"
                value={registro.temperatura_horno}
                onChange={(e) => setRegistro({ ...registro, temperatura_horno: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Velocidad Banda (m/min) *</label>
              <InputText
                type="number"
                value={registro.velocidad_banda}
                onChange={(e) => setRegistro({ ...registro, velocidad_banda: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Tiempo Residencia (min) *</label>
              <InputText
                type="number"
                value={registro.tiempo_residencia}
                onChange={(e) => setRegistro({ ...registro, tiempo_residencia: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Temperatura Producto (°C) *</label>
              <InputText
                type="number"
                value={registro.temperatura_producto_horneado}
                onChange={(e) => setRegistro({ ...registro, temperatura_producto_horneado: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Humedad Producto (%) *</label>
              <InputText
                type="number"
                value={registro.humedad_producto_horneado}
                onChange={(e) => setRegistro({ ...registro, humedad_producto_horneado: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Aprobación Horneado *</label>
              <Dropdown
                options={opcionesAprobacion}
                value={registro.aprobacion_horneado}
                onChange={(e) => setRegistro({ ...registro, aprobacion_horneado: e.value })}
                placeholder="Seleccione estado"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Parámetros de Empaque</h3>
            <div className="field">
              <label>Número de Muestra *</label>
              <Dropdown
                options={numerosMuestra}
                value={registro.num_muestra_empaque}
                onChange={(e) => setRegistro({ ...registro, num_muestra_empaque: e.value })}
                placeholder="Seleccione muestra"
              />
            </div>

            <div className="field">
              <label>Temperatura Ambiental (°C) *</label>
              <InputText
                type="number"
                value={registro.temperatura_ambiental_empaque}
                onChange={(e) => setRegistro({ ...registro, temperatura_ambiental_empaque: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Humedad Ambiental (%) *</label>
              <InputText
                type="number"
                value={registro.humedad_ambiental_empaque}
                onChange={(e) => setRegistro({ ...registro, humedad_ambiental_empaque: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Temperatura Producto (°C) *</label>
              <InputText
                type="number"
                value={registro.temperatura_producto_empaque}
                onChange={(e) => setRegistro({ ...registro, temperatura_producto_empaque: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Humedad Producto (%) *</label>
              <InputText
                type="number"
                value={registro.humedad_producto_empaque}
                onChange={(e) => setRegistro({ ...registro, humedad_producto_empaque: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Densidad (kg/m³) *</label>
              <InputText
                type="number"
                value={registro.densidad}
                onChange={(e) => setRegistro({ ...registro, densidad: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Aprobación Empaque *</label>
              <Dropdown
                options={opcionesAprobacion}
                value={registro.aprobacion_empaque}
                onChange={(e) => setRegistro({ ...registro, aprobacion_empaque: e.value })}
                placeholder="Seleccione estado"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Datos Adicionales</h3>
            <div className="field">
              <label>Material de Empaque *</label>
              <InputText
                value={registro.material_empaque}
                onChange={(e) => setRegistro({ ...registro, material_empaque: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Proveedor *</label>
              <InputText
                value={registro.proveedor}
                onChange={(e) => setRegistro({ ...registro, proveedor: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Lote *</label>
              <InputText
                value={registro.lote}
                onChange={(e) => setRegistro({ ...registro, lote: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Hora Codificación *</label>
              <InputText
                type="time"
                value={registro.hora_codificacion}
                onChange={(e) => setRegistro({ ...registro, hora_codificacion: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Código Juliano *</label>
              <InputText
                value={registro.codigo_juliano}
                onChange={(e) => setRegistro({ ...registro, codigo_juliano: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Fecha Vencimiento *</label>
              <InputText
                type="date"
                value={registro.fecha_vencimiento}
                onChange={(e) => setRegistro({ ...registro, fecha_vencimiento: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Verificación Peso *</label>
              <InputText
                type="number"
                value={registro.verificacion_peso}
                onChange={(e) => setRegistro({ ...registro, verificacion_peso: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Estado Empaque *</label>
              <Dropdown
                options={estadosEmpaque}
                value={registro.estado_empaque}
                onChange={(e) => setRegistro({ ...registro, estado_empaque: e.value })}
                placeholder="Seleccione estado"
              />
            </div>

            <div className="field">
              <label>Unidades Empacadas *</label>
              <InputText
                type="number"
                value={registro.unidades_empacadas}
                onChange={(e) => setRegistro({ ...registro, unidades_empacadas: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Unidades Retenidas</label>
              <InputText
                type="number"
                value={registro.unidades_retenidas}
                onChange={(e) => setRegistro({ ...registro, unidades_retenidas: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Unidades Incompletas</label>
              <InputText
                type="number"
                value={registro.unidades_incompletas}
                onChange={(e) => setRegistro({ ...registro, unidades_incompletas: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Observaciones</label>
              <InputText
                value={registro.observaciones}
                onChange={(e) => setRegistro({ ...registro, observaciones: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ControlCalidadHornoMicroondas;