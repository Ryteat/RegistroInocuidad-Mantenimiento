import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControlOperativoHornoMultilevel.css";
import supabase from "../../../supabaseClient";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Toolbar } from "primereact/toolbar";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import { Divider } from "primereact/divider";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo2 from "../../../assets/mosca.png";

const ControlOperativoHornoMultilevel = () => {
  let emptyRegister = {
    operario_horno: "",
    d_voltaje: "",
    fecha: "",
    d_amperaje: "",
    temp_seteada: "",
    temp_real: "",
    salida1: "",
    salida2: "",
    entrada1: "",
    entrada2: "",
    entrada3: "",
    entrada4: "",
    entrada5: "",
    entrada6: "",
    kpa_manometro1: "",
    kpa_manometro2: "",
    kpa_manometro3: "",
    kpa_manometro4: "",
    banda_alimentacion: "",
    banda_alimentacion1: "",
    banda_alimentacion2: "",
    banda_alimentacion3: "",
    banda_alimentacion4: "",
    banda_alimentacion5: "",
    psi_tanque1: "",
    psi_tanque2: "",
    psi_tanque3: "",
    psi_tanque4: "",
    fec_registro: "",
    hor_registro: "",
    observaciones: "",
    hor_inicio: "",
    hor_fin: "",
    hora_toma_dato: "",
    tipo_control: "",
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

  const tipoControl = ["Control", "Prueba"];

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Operativo_Horno_Multilevel")
        .select();
      if (data) {
        setRegistros(data);
      }
    } catch {
      console.log("Error en la conexión a la base de datos");
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const formatDateTime = (date, format = "DD-MM-YYYY hh:mm A") => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .formatToParts(date)
      .reduce((acc, { type, value }) => ({ ...acc, [type]: value }), {});

    return format
      .replace("DD", fmt.day)
      .replace("MM", fmt.month)
      .replace("YYYY", fmt.year)
      .replace("hh", fmt.hour.padStart(2, "0"))
      .replace("mm", fmt.minute)
      .replace("A", fmt.dayPeriod || "AM");
  };

  const saveRegistro = async () => {
    setSubmitted(true);
    if (
      !registro.operario_horno ||
      !registro.d_voltaje ||
      !registro.d_amperaje ||
      !registro.temp_seteada ||
      !registro.temp_real ||
      !registro.salida1 ||
      !registro.salida2 ||
      !registro.entrada1 ||
      !registro.entrada2 ||
      !registro.entrada3 ||
      !registro.entrada4 ||
      !registro.entrada5 ||
      !registro.entrada6 ||
      !registro.kpa_manometro1 ||
      !registro.kpa_manometro2 ||
      !registro.kpa_manometro3 ||
      !registro.kpa_manometro4 ||
      !registro.banda_alimentacion ||
      !registro.banda_alimentacion1 ||
      !registro.banda_alimentacion2 ||
      !registro.banda_alimentacion3 ||
      !registro.banda_alimentacion4 ||
      !registro.banda_alimentacion5 ||
      !registro.psi_tanque1 ||
      !registro.psi_tanque2 ||
      !registro.psi_tanque3 ||
      !registro.psi_tanque4 ||
      !registro.hor_inicio ||
      !registro.hor_fin ||
      !registro.hora_toma_dato ||
      !registro.tipo_control ||
      !registro.fecha
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Llena todos los campos",
        life: 3000,
      });
      return;
    }

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");

      const { data, error } = await supabase
        .from("Control_Operativo_Horno_Multilevel")
        .insert([
          {
            operario_horno: registro.operario_horno,
            d_voltaje: registro.d_voltaje,
            fecha: registro.fecha,
            d_amperaje: registro.d_amperaje,
            temp_seteada: registro.temp_seteada,
            temp_real: registro.temp_real,
            salida1: registro.salida1,
            salida2: registro.salida2,
            entrada1: registro.entrada1,
            entrada2: registro.entrada2,
            entrada3: registro.entrada3,
            entrada4: registro.entrada4,
            entrada5: registro.entrada5,
            entrada6: registro.entrada6,
            kpa_manometro1: registro.kpa_manometro1,
            kpa_manometro2: registro.kpa_manometro2,
            kpa_manometro3: registro.kpa_manometro3,
            kpa_manometro4: registro.kpa_manometro4,
            banda_alimentacion: registro.banda_alimentacion,
            banda_alimentacion1: registro.banda_alimentacion1,
            banda_alimentacion2: registro.banda_alimentacion2,
            banda_alimentacion3: registro.banda_alimentacion3,
            banda_alimentacion4: registro.banda_alimentacion4,
            banda_alimentacion5: registro.banda_alimentacion5,
            psi_tanque1: registro.psi_tanque1,
            psi_tanque2: registro.psi_tanque2,
            psi_tanque3: registro.psi_tanque3,
            psi_tanque4: registro.psi_tanque4,
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,
            hor_inicio: registro.hor_inicio,
            hor_fin: registro.hor_fin,
            hora_toma_dato: registro.hora_toma_dato,
            tipo_control: registro.tipo_control,
          },
        ]);
      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(
          error.message || "Error desconocido al guardar en Supabase"
        );
      }
      toast.current.show({
        severity: "success",
        summary: "Exitoso",
        detail: "Registro creado correctamente",
        life: 3000,
      });
      setRegistro(emptyRegister);
      setRegistroDialog(false);
      setSubmitted(false);
      fetchRegistros();
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.message || "Ocurrió un error al crear el registro",
        life: 3000,
      });
    }
  };

  const dateEditor = (options) => {
    const convertToInputFormat = (date) => {
      if (!date) return "";
      const [day, month, year] = date.split("/");
      return `${year}-${month}-${day}`;
    };
    const convertToDatabaseFormat = (date) => {
      if (!date) return "";
      const [year, month, day] = date.split("-");
      return `${day}/${month}/${year}`;
    };

    return (
      <InputText
        type="date"
        value={convertToInputFormat(options.value)}
        onChange={(e) => {
          const selectedDate = e.target.value;
          options.editorCallback(convertToDatabaseFormat(selectedDate));
        }}
      />
    );
  };

  const timeEditor = (options) => {
    return (
      <InputText
        type="time"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      />
    );
  };

  const textEditor = (options) => {
    return (
      <InputText
        type="text"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
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

  const floatEditor = (options) => {
    return (
      <InputText
        type="float"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      />
    );
  };

  const checkboxEditor = (options) => {
    return (
      <input
        type="checkbox"
        checked={options.value}
        onChange={(e) => options.editorCallback(e.target.checked)}
      />
    );
  };

  const dropdownEditor = (options) => {
    return (
      <select
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      >
        {options.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  };

  const allowEdit = (rowData) => {
    return rowData.name !== "Blue Band";
  };

  const onRowEditComplete = async ({ newData }) => {
    const { id, ...updatedData } = newData;
    try {
      const { error } = await supabase
        .from("Control_Operativo_Horno_Multilevel")
        .update(updatedData)
        .eq("id", id);

      if (error) return console.error("Error al actualizar:", error.message);

      setRegistros((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...newData } : n))
      );
    } catch (err) {
      console.error("Error inesperado:", err);
    }
  };

  const onInputChange = (e, name) => {
    let val = e.target.value;
    let _registro = { ...registro };
    _registro[name] = val;
    setRegistro(_registro);
  };

  const leftToolbarTemplate = () => {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          label="Nuevo"
          icon="pi pi-plus"
          severity="success"
          onClick={openNew}
        />
      </div>
    );
  };

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
      <InputText
        type="search"
        onInput={(e) => setGlobalFilter(e.target.value)}
        placeholder="Buscador Global..."
      />
    </div>
  );

  const openNew = () => {
    setRegistro(emptyRegister);
    setSubmitted(false);
    setRegistroDialog(true);
  };

  const hideDialog = () => {
    setSubmitted(false);
    setRegistroDialog(false);
  };

  const registroDialogFooter = (
    <React.Fragment>
      <Button
        label="Cancelar"
        icon="pi pi-times"
        outlined
        onClick={hideDialog}
      />
      <Button label="Guardar" icon="pi pi-check" onClick={saveRegistro} />
    </React.Fragment>
  );

  const cols = [
    { field: "fecha", header: "Fecha Control" },
    { field: "hor_inicio", header: "Hora de Inicio" },
    { field: "hor_fin", header: "Hora de Fin" },
    { field: "hora_toma_dato", header: "Hora de toma de dato" },
    { field: "tipo_control", header: "Tipo de Control" },
    { field: "d_voltaje", header: "D. Voltaje" },
    { field: "d_amperaje", header: "D. Amperaje" },
    { field: "temp_seteada", header: "Temp. Seteada" },
    { field: "temp_real", header: "Temp. Real" },
    { field: "salida1", header: "Salida 1" },
    { field: "salida2", header: "Salida 2" },
    { field: "entrada1", header: "Entrada 1" },
    { field: "entrada2", header: "Entrada 2" },
    { field: "entrada3", header: "Entrada 3" },
    { field: "entrada4", header: "Entrada 4" },
    { field: "entrada5", header: "Entrada 5" },
    { field: "entrada6", header: "Entrada 6" },
    { field: "kpa_manometro1", header: "Kpa Manometro 1" },
    { field: "kpa_manometro2", header: "Kpa Manometro 2" },
    { field: "kpa_manometro3", header: "Kpa Manometro 3" },
    { field: "kpa_manometro4", header: "Kpa Manometro 4" },
    { field: "banda_alimentacion", header: "Banda Alimentacion" },
    { field: "banda_alimentacion1", header: "Banda Alimentacion 1" },
    { field: "banda_alimentacion2", header: "Banda Alimentacion 2" },
    { field: "banda_alimentacion3", header: "Banda Alimentacion 3" },
    { field: "banda_alimentacion4", header: "Banda Alimentacion 4" },
    { field: "banda_alimentacion5", header: "Banda Alimentacion 5" },
    { field: "psi_tanque1", header: "Psi Tanque 1" },
    { field: "psi_tanque2", header: "Psi Tanque 2" },
    { field: "psi_tanque3", header: "Psi Tanque 3" },
    { field: "psi_tanque4", header: "Psi Tanque 4" },
    { field: "operario_horno", header: "Operario Horno" },
    { field: "observaciones", header: "Observaciones" },
    { field: "registrado", header: "Registrado" },
  ];

  const exportColumns = cols.map((col) => ({
    title: col.header,
    dataKey: col.field,
  }));

  const exportPdf = () => {
    if (selectedRegistros.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay filas seleccionadas para exportar.",
        life: 3000,
      });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Control_Operativo_Horno_Multilevel", 14, 22);

    const exportData = selectedRegistros.map(
      ({ fec_registro, hor_registro, ...row }) => ({
        ...row,
        registrado: `${fec_registro || ""} ${hor_registro || ""}`,
      })
    );

    const columnsPerPage = 5;
    const maxHeightPerColumn = 10;
    const rowHeight = exportColumns.length * maxHeightPerColumn + 10;
    let currentY = 30;

    const headerColor = [41, 128, 185];
    const textColor = [0, 0, 0];

    for (let i = 0; i < exportData.length; i++) {
      if (currentY + rowHeight > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 30;
      }

      const row = exportData[i];
      const startX = 14;

      exportColumns.forEach(({ title, dataKey }, index) => {
        const value = row[dataKey];
        doc.setFillColor(...headerColor);
        doc.rect(
          startX,
          currentY + index * maxHeightPerColumn,
          180,
          maxHeightPerColumn,
          "F"
        );
        doc.setTextColor(255);
        doc.text(title, startX + 2, currentY + index * maxHeightPerColumn + 7);
        doc.setTextColor(...textColor);
        doc.text(
          `${value}`,
          startX + 90,
          currentY + index * maxHeightPerColumn + 7
        );
      });

      currentY += rowHeight;
    }

    doc.save("Control_Operativo_Horno_Multilevel.pdf");
  };

  const exportXlsx = () => {
    if (selectedRegistros.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay filas seleccionadas para exportar.",
        life: 3000,
      });
      return;
    }

    const headers = cols.map((col) => col.header);
    const exportData = selectedRegistros.map(
      ({ fec_registro, hor_registro, ...registro }) => ({
        ...registro,
        registrado: `${fec_registro || ""} ${hor_registro || ""}`,
      })
    );

    const rows = exportData.map((registro) =>
      cols.map((col) => registro[col.field])
    );

    const dataToExport = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);

    ws["!cols"] = cols.map((col) => ({
      width: Math.max(col.header.length, 10),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, "Control_Operativo_Horno_Multilevel.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control Operativo Horno Multilevel
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control Operativo Horno Multilevel. Aquí
            puedes gestionar los registros de Control Operativo Horno
            Multilevel.
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

        <div className="tabla-scroll">
          <Toolbar
            className="mb-4"
            left={leftToolbarTemplate}
            right={rightToolbarTemplate}
          ></Toolbar>
          <DataTable
            editMode="row"
            onRowEditComplete={onRowEditComplete}
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
            currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Registros"
          >
            <Column selectionMode="multiple" exportable={false}></Column>
            <Column
              field="fecha"
              header="Fecha Control"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="hor_inicio"
              header="Hora de Inicio"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="hor_fin"
              header="Hora de Fin"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="hora_toma_dato"
              header="Hora Toma Datos"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="tipo_control"
              header="Tipo Control"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: tipoControl.map((tc) => ({ label: tc, value: tc })),
                })
              }
            ></Column>

            <Column
              field="d_voltaje"
              header="D. Voltaje"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="d_amperaje"
              header="D. Amperaje"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="temp_seteada"
              header="Temp. Seteada"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="temp_real"
              header="Temp. Real"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="salida1"
              header="Salida 1"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="salida2"
              header="Salida 2"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="entrada1"
              header="Entrada 1"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="entrada2"
              header="Entrada 2"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="entrada3"
              header="Entrada 3"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="entrada4"
              header="Entrada 4"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="entrada5"
              header="Entrada 5"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="entrada6"
              header="Entrada 6"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="kpa_manometro1"
              header="Kpa Manometro 1"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="kpa_manometro2"
              header="Kpa Manometro 2"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="kpa_manometro3"
              header="Kpa Manometro 3"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="kpa_manometro4"
              header="Kpa Manometro 4"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="banda_alimentacion"
              header="Banda Alimentación (Hertz)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="banda_alimentacion1"
              header="Banda Alimentación 1 (Hertz)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="banda_alimentacion2"
              header="Banda Alimentación 2 (Hertz)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="banda_alimentacion3"
              header="Banda Alimentación 3 (Hertz)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="banda_alimentacion4"
              header="Banda Alimentación 4 (Hertz)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="banda_alimentacion5"
              header="Banda Alimentación 5 (Hertz)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="psi_tanque1"
              header="Psi Tanque 1"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="psi_tanque2"
              header="Psi Tanque 2"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="psi_tanque3"
              header="Psi Tanque 3"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="psi_tanque4"
              header="Psi Tanque 4"
              editor={(options) => textEditor(options)}
            ></Column>
            
            <Column field="fec_registro" header="Fecha Registro"></Column>
            <Column field="hor_registro" header="Hora Registro"></Column>
            <Column
              field="operario_horno"
              header="Operario Horno"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="observaciones"
              header="Observaciones"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              header="Herramientas"
              rowEditor={allowEdit}
              headerStyle={{ width: "10%", minWidth: "5rem" }}
              bodyStyle={{ textAlign: "center" }}
            ></Column>
          </DataTable>
        </div>
      </div>
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
        <div className="p-field">
          <Divider />
          <h3>Rango de Temperatura de operación:</h3>
          <h3>90°C a 140°C</h3>
          <Divider />

          <br />
          <label htmlFor="fecha" className="font-bold">
            Fecha Control{" "}
    
          </label>
          <InputText
            type="date"
            id="fecha"
            value={registro.fecha}
            onChange={(e) => onInputChange(e, "fecha")}
            required
          />
          <br />
          <label htmlFor="hor_inicio" className="font-bold">
            Hora Inicio{" "}
          </label>
          <InputText
            type="time"
            id="hor_inicio"
            value={registro.hor_inicio}
            onChange={(e) => onInputChange(e, "hor_inicio")}
          />
          <br />
          <label htmlFor="hor_fin" className="font-bold">
            Hora Fin{" "}
          </label>
          <InputText
            type="time"
            id="hor_fin"
            value={registro.hor_fin}
            onChange={(e) => onInputChange(e, "hor_fin")}
          />

          <br />
          <label htmlFor="hora_toma_dato" className="font-bold">
            Hora de Toma de Datos{" "}
            {submitted && !registro.hora_toma_dato && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hora_toma_dato"
            value={registro.hora_toma_dato}
            onChange={(e) => onInputChange(e, "hora_toma_dato")}
          />

          <br />

          <label htmlFor="tipo_control" className="font-bold">
            Tipo Control{" "}
            {submitted && !registro.tipo_control && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="tipo_control"
            value={registro.tipo_control}
            options={tipoControl}
            onChange={(e) => onInputChange(e, "tipo_control")}
            placeholder="Selecciona una opción"
            required
          />

          <Divider />
          <h3>Datos Panel de Control del Equipo</h3>
          <Divider />

          <label htmlFor="d_voltaje" className="font-bold">
            Display Voltaje (V){" "}
            {submitted && !registro.d_voltaje && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="d_voltaje"
            value={registro.d_voltaje}
            onChange={(e) => onInputChange(e, "d_voltaje")}
          />

          <br />

          <label htmlFor="d_amperaje" className="font-bold">
            Display Amperaje (A){" "}
            {submitted && !registro.d_amperaje && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="d_amperaje"
            value={registro.d_amperaje}
            onChange={(e) => onInputChange(e, "d_amperaje")}
          />

          <br />

          <label htmlFor="temp_seteada" className="font-bold">
            Temperatura Seteada (°C){" "}
            {submitted && !registro.temp_seteada && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="temp_seteada"
            value={registro.temp_seteada}
            onChange={(e) => onInputChange(e, "temp_seteada")}
          />

          <br />

          <label htmlFor="temp_real" className="font-bold">
            Temperatura Real (°C){" "}
            {submitted && !registro.temp_real && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="temp_real"
            value={registro.temp_real}
            onChange={(e) => onInputChange(e, "temp_real")}
          />

          <br />

          <label htmlFor="salida1" className="font-bold">
            Salida #1 (°C){" "}
            {submitted && !registro.salida1 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="salida1"
            value={registro.salida1}
            onChange={(e) => onInputChange(e, "salida1")}
          />

          <br />

          <label htmlFor="salida2" className="font-bold">
            Salida #2 (°C){" "}
            {submitted && !registro.salida2 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="salida2"
            value={registro.salida2}
            onChange={(e) => onInputChange(e, "salida2")}
          />

          <br />

          <label htmlFor="entrada1" className="font-bold">
            Entrada #1 (°C){" "}
            {submitted && !registro.entrada1 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="entrada1"
            value={registro.entrada1}
            onChange={(e) => onInputChange(e, "entrada1")}
          />

          <br />

          <label htmlFor="entrada2" className="font-bold">
            Entrada #2 (°C){" "}
            {submitted && !registro.entrada2 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="entrada2"
            value={registro.entrada2}
            onChange={(e) => onInputChange(e, "entrada2")}
          />

          <br />

          <label htmlFor="entrada3" className="font-bold">
            Entrada #3 (°C){" "}
            {submitted && !registro.entrada3 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="entrada3"
            value={registro.entrada3}
            onChange={(e) => onInputChange(e, "entrada3")}
          />

          <br />

          <label htmlFor="entrada4" className="font-bold">
            Entrada #4 (°C){" "}
            {submitted && !registro.entrada4 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="entrada4"
            value={registro.entrada4}
            onChange={(e) => onInputChange(e, "entrada4")}
          />

          <br />

          <label htmlFor="entrada5" className="font-bold">
            Entrada #5 (°C){" "}
            {submitted && !registro.entrada5 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="entrada5"
            value={registro.entrada5}
            onChange={(e) => onInputChange(e, "entrada5")}
          />

          <br />

          <label htmlFor="entrada6" className="font-bold">
            Entrada #6 (°C){" "}
            {submitted && !registro.entrada6 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="entrada6"
            value={registro.entrada6}
            onChange={(e) => onInputChange(e, "entrada6")}
          />

          <br />

          <Divider />
          <h3>Presión Manómetros del equipo</h3>
          <Divider />

          <label htmlFor="kpa_manometro1" className="font-bold">
            Manómetro #1 (kPa){" "}
            {submitted && !registro.kpa_manometro1 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="kpa_manometro1"
            value={registro.kpa_manometro1}
            onChange={(e) => onInputChange(e, "kpa_manometro1")}
          />

          <br />

          <label htmlFor="kpa_manometro2" className="font-bold">
            Manómetro #2 (kPa){" "}
            {submitted && !registro.kpa_manometro2 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="kpa_manometro2"
            value={registro.kpa_manometro2}
            onChange={(e) => onInputChange(e, "kpa_manometro2")}
          />

          <br />

          <label htmlFor="kpa_manometro3" className="font-bold">
            Manómetro #3 (kPa){" "}
            {submitted && !registro.kpa_manometro3 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="kpa_manometro3"
            value={registro.kpa_manometro3}
            onChange={(e) => onInputChange(e, "kpa_manometro3")}
          />

          <br />

          <label htmlFor="kpa_manometro4" className="font-bold">
            Manómetro #4 (kPa){" "}
            {submitted && !registro.kpa_manometro4 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="kpa_manometro4"
            value={registro.kpa_manometro4}
            onChange={(e) => onInputChange(e, "kpa_manometro4")}
          />

          <br />

          <Divider />
          <h3>Velocidad de Bandas Transportadoras</h3>
          <Divider />

          <label htmlFor="banda_alimentacion" className="font-bold">
            Banda de Alimentación (Hertz){" "}
            {submitted && !registro.banda_alimentacion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="banda_alimentacion"
            value={registro.banda_alimentacion}
            onChange={(e) => onInputChange(e, "banda_alimentacion")}
          />

          <br />

          <label htmlFor="banda_alimentacion1" className="font-bold">
            Banda de Alimentación #1(Hertz){" "}
            {submitted && !registro.banda_alimentacion1 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="banda_alimentacion1"
            value={registro.banda_alimentacion1}
            onChange={(e) => onInputChange(e, "banda_alimentacion1")}
          />

          <br />

          <label htmlFor="banda_alimentacion2" className="font-bold">
            Banda de Alimentación #2(Hertz){" "}
            {submitted && !registro.banda_alimentacion2 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="banda_alimentacion2"
            value={registro.banda_alimentacion2}
            onChange={(e) => onInputChange(e, "banda_alimentacion2")}
          />

          <br />

          <label htmlFor="banda_alimentacion3" className="font-bold">
            Banda de Alimentación #3(Hertz){" "}
            {submitted && !registro.banda_alimentacion3 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="banda_alimentacion3"
            value={registro.banda_alimentacion3}
            onChange={(e) => onInputChange(e, "banda_alimentacion3")}
          />

          <br />

          <label htmlFor="banda_alimentacion4" className="font-bold">
            Banda de Alimentación #4(Hertz){" "}
            {submitted && !registro.banda_alimentacion4 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="banda_alimentacion4"
            value={registro.banda_alimentacion4}
            onChange={(e) => onInputChange(e, "banda_alimentacion4")}
          />

          <br />

          <label htmlFor="banda_alimentacion5" className="font-bold">
            Banda de Alimentación #5(Hertz){" "}
            {submitted && !registro.banda_alimentacion5 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="banda_alimentacion5"
            value={registro.banda_alimentacion5}
            onChange={(e) => onInputChange(e, "banda_alimentacion5")}
          />

          <br />

          <Divider />
          <h3>Presión Tanques de Gas</h3>
          <Divider />

          <label htmlFor="psi_tanque1" className="font-bold">
            Tanque #1 (psi){" "}
            {submitted && !registro.psi_tanque1 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="psi_tanque1"
            value={registro.psi_tanque1}
            onChange={(e) => onInputChange(e, "psi_tanque1")}
          />

          <br />

          <label htmlFor="psi_tanque2" className="font-bold">
            Tanque #2 (psi){" "}
            {submitted && !registro.psi_tanque2 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="psi_tanque2"
            value={registro.psi_tanque2}
            onChange={(e) => onInputChange(e, "psi_tanque2")}
          />

          <br />

          <label htmlFor="psi_tanque3" className="font-bold">
            Tanque #3 (psi){" "}
            {submitted && !registro.psi_tanque3 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="psi_tanque3"
            value={registro.psi_tanque3}
            onChange={(e) => onInputChange(e, "psi_tanque3")}
          />

          <br />
          <label htmlFor="psi_tanque4" className="font-bold">
            Tanque #4 (psi){" "}
            {submitted && !registro.psi_tanque4 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="psi_tanque4"
            value={registro.psi_tanque4}
            onChange={(e) => onInputChange(e, "psi_tanque4")}
          />

          <br />

          <Divider />
          <h3>Control</h3>
          <Divider />

          <label htmlFor="operario_horno" className="font-bold">
            Operario Horno{" "}
            {submitted && !registro.operario_horno && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="operario_horno"
            value={registro.operario_horno}
            onChange={(e) => onInputChange(e, "operario_horno")}
          />

          

          <br />

          <label htmlFor="observaciones" className="font-bold">
            Observaciones{" "}
          </label>
          <InputText
            id="observaciones"
            value={registro.observaciones}
            onChange={(e) => onInputChange(e, "observaciones")}
          />

          <br />
        </div>
      </Dialog>
    </>
  );
};
export default ControlOperativoHornoMultilevel;
