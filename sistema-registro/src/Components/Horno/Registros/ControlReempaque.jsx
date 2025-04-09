import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Imports de estilos
import logo2 from "../../../assets/mosca.png";

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

// Imports de exportar
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

function ControlReempaque() {
  let emptyRegister = {
    fecha_registro: "",
    hora_registro: "",
    fecha_reempaque: "",
    turno: "",
    presentacion: "",
    lote_pt: "",
    hora_reempaque: "",
    lote_reempaque_utilizado: "",
    operario: "",
    lote_unidad_consumida: "",
    kg_unidad: "",
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
  const navigate = useNavigate();

  // Opciones para los dropdowns
  const turnos = ["1", "2", "3"];

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const hideDialog = () => {
    setSubmitted(false);
    setRegistroDialog(false);
  };

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Reempaque_PT")
        .select()
        .order("fecha_reempaque", { ascending: false });

      if (data) {
        // Formatear fechas al cargar
        const formattedData = data.map(registro => ({
          ...registro,
          fecha_reempaque: convertirFecha(registro.fecha_reempaque)
        }));
        setRegistros(formattedData);
      }
      if (error) throw error;
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Error al cargar registros: " + error.message,
        life: 3000
      });
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

    // Campos obligatorios
    const camposRequeridos = [
      'fecha_reempaque',
      'turno',
      'presentacion',
      'lote_pt',
      'hora_reempaque',
      'lote_reempaque_utilizado',
      'operario',
      'lote_unidad_consumida',
      'kg_unidad'
    ];

    const faltanCampos = camposRequeridos.some(campo => !registro[campo]);

    if (faltanCampos) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Todos los campos marcados con * son obligatorios",
        life: 3000
      });
      return;
    }

    try {
      const { fecha, hora } = formatDateTime(new Date());

      const registroParaGuardar = {
        ...registro,
        fecha_reempaque: convertirFecha(registro.fecha_reempaque), // Convertir al guardar
        fecha_registro: fecha,
        hora_registro: hora
      };

      const { data, error } = await supabase
        .from("Control_Reempaque_PT")
        .insert([registroParaGuardar]);

      if (error) throw error;

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro de reempaque guardado",
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
        onClick={saveRegistro}
      />
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

  const onRowEditComplete = async ({ newData }) => {
    try {
      const { error } = await supabase
        .from("Control_Reempaque_PT")
        .update(newData)
        .eq("id", newData.id);

      if (error) throw error;

      setRegistros(registros.map(item => item.id === newData.id ? newData : item));

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro actualizado",
        life: 3000
      });
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
    doc.save("control-reempaque.pdf");
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registros Reempaque");
    XLSX.writeFile(workbook, "control-reempaque.xlsx");
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
    <div className="control-reempaque-container">
      <Toast ref={toast} />
      <h1>
        <img src={logo2} alt="mosca" className="logo2" />
        Control de Reempaque Producto Terminado
      </h1>
      <div className="welcome-message">
        <p>
          Bienvenido al sistema de Control de Reempaque de Producto Terminado.
          Aquí puedes gestionar los registros de reempaque, asegurando el seguimiento
          adecuado de los lotes y presentaciones.
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
        emptyMessage="No se encontraron registros"
      >
        <Column
          selectionMode="multiple"
          headerStyle={{ width: '3rem' }}
        ></Column>
        <Column
          field="fecha_reempaque"
          header="Fecha Reempaque"
          editor={dateEditor}
          sortable
          body={(rowData) => rowData.fecha_reempaque}
        />
        <Column field="turno" header="Turno" editor={(options) => (
          <InputText
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column field="presentacion" header="Presentación" editor={(options) => (
          <InputText
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column field="lote_pt" header="Lote de Producto Terminado" editor={(options) => (
          <InputText
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column field="hora_reempaque" header="Hora Reempaque" editor={(options) => (
          <InputText
            type="time"
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column field="lote_reempaque_utilizado" header="Lote de Reempaque Utilizado" editor={(options) => (
          <InputText
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column field="operario" header="Operario" editor={(options) => (
          <InputText
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column field="lote_unidad_consumida" header="Lote Unidad Consumida en Totalidad" editor={(options) => (
          <InputText
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column field="kg_unidad" header="Kg de Unidad" editor={(options) => (
          <InputText
            type="number"
            step="0.1"
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column field="observaciones" header="Observaciones" editor={(options) => (
          <InputText
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
          />
        )} sortable />
        <Column
          rowEditor
          headerStyle={{ width: '10%', minWidth: '8rem' }}
          bodyStyle={{ textAlign: 'center' }}
        />
      </DataTable>

      <Dialog
        visible={registroDialog}
        style={{ width: "32rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        header="Nuevo registro de reempaque"
        modal
        className="p-fluid"
        footer={registroDialogFooter}
        onHide={hideDialog}
      >
        <div className="field">
          <label htmlFor="fecha_reempaque">Fecha Reempaque *</label>
          <InputText
            type="date"
            value={registro.fecha_reempaque}
            onChange={(e) => setRegistro({ ...registro, fecha_reempaque: e.target.value })}
            required
          />

          <label htmlFor="turno">Turno *</label>
          <InputText
            value={registro.turno}
            onChange={(e) => setRegistro({ ...registro, turno: e.target.value })}
            required
          />

          <label htmlFor="presentacion">Presentación *</label>
          <InputText
            value={registro.presentacion}
            onChange={(e) => setRegistro({ ...registro, presentacion: e.target.value })}
            required
          />

          <label htmlFor="lote_pt">Lote de Producto Terminado </label>
          <InputText
            value={registro.lote_pt}
            onChange={(e) => setRegistro({ ...registro, lote_pt: e.target.value })}
            required
          />

          <label htmlFor="hora_reempaque">Hora Reempaque </label>
          <InputText
            type="time"
            value={registro.hora_reempaque}
            onChange={(e) => setRegistro({ ...registro, hora_reempaque: e.target.value })}
            required
          />

          <label htmlFor="lote_reempaque_utilizado">Lote de Reempaque Utilizado </label>
          <InputText
            value={registro.lote_reempaque_utilizado}
            onChange={(e) => setRegistro({ ...registro, lote_reempaque_utilizado: e.target.value })}
            required
          />



          <label htmlFor="lote_unidad_consumida">Lote Unidad Consumida en Totalidad</label>
          <InputText
            value={registro.lote_unidad_consumida}
            onChange={(e) => setRegistro({ ...registro, lote_unidad_consumida: e.target.value })}
            required
          />

          <label htmlFor="kg_unidad">Kg de Unidad </label>
          <InputText
            type="number"
            step="0.1"
            value={registro.kg_unidad}
            onChange={(e) => setRegistro({ ...registro, kg_unidad: e.target.value })}
            required
          />

          <label htmlFor="operario">Operario </label>
          <InputText
            value={registro.operario}
            onChange={(e) => setRegistro({ ...registro, operario: e.target.value })}
            required
          />

          <label htmlFor="observaciones">Observaciones</label>
          <InputText
            value={registro.observaciones}
            onChange={(e) => setRegistro({ ...registro, observaciones: e.target.value })}
          />
        </div>
      </Dialog>
    </div>
  );
}

export default ControlReempaque;