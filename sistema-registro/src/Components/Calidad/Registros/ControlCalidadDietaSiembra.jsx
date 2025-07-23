import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControlCalidadDietaSiembra.css"; // Importa el CSS
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
import { Paginator } from "primereact/paginator";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo2 from "../../../assets/mosca.png";

function ControlCalidadDietaSiembra() {
  let emptyRegister = {
    inspector_calidad: "",
    encargado_investigacionydesarrollo: "",

    num_tanda: "",
    tipo_dieta: "",
    mezcladora: "",
    prueba_control: "",
    hum_ambiental: "",
    temp_ambiental: "",
    temp_dieta: "",
    hum_dieta: "",
    brix_dieta: "",
    PH_dieta: "",
    medicion_cualitativa: "",
    aprobacion: "",
    num_individuos: "",
    fec_siembra: "",
    hor_inicio_ha: "",
    hor_inicio_ne: "",
    hor_inicio_pro: "",
    hor_fin: "",

    materia_prima: "",
    num_muestra: "",
    proveedor: "",
    temperatura: "",
    humedad: "",
    lote: "",
    nivel_inclusion_dieta: "",

    fec_registro: "",
    hor_registro: "",
    observaciones: "",
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
  // Opciones para el campo "linea_produc"
  const tipoDieta = ["Producción", "Hatchery", "Neonatos"];
  const aprobacion = ["Cumple", "No Cumple", "N/A"];
  //Errores de validación
  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    hum_dieta: false,
    temp_dieta: false,
    PH_dieta: false,
  });

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Calidad_Dieta-Siembra")
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

    let isTempDietaInvalido = false;
    let isHumDietaInvalido = false;
    let isPHDietaInvalido = false;

    if (registro.tipo_dieta && registro.tipo_dieta === "Producción") {
      isTempDietaInvalido =
        registro.temp_dieta < 26 || registro.temp_dieta > 32;
      isHumDietaInvalido = registro.hum_dieta < 65 || registro.hum_dieta > 70;
      isPHDietaInvalido = registro.PH_dieta < 4.5 || registro.PH_dieta > 9;
    } else if (registro.tipo_dieta && registro.tipo_dieta === "Hatchery") {
      isTempDietaInvalido =
        registro.temp_dieta < 26 || registro.temp_dieta > 32;
      isHumDietaInvalido = registro.hum_dieta < 70 || registro.hum_dieta > 75;
      isPHDietaInvalido = registro.PH_dieta < 4.5 || registro.PH_dieta > 9;
    } else if (registro.tipo_dieta && registro.tipo_dieta === "Neonatos") {
      isTempDietaInvalido =
        registro.temp_dieta < 26 || registro.temp_dieta > 32;
      isHumDietaInvalido = registro.hum_dieta < 55 || registro.hum_dieta > 65;
      isPHDietaInvalido = registro.PH_dieta < 4.5 || registro.PH_dieta > 9;
    } else {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail:
          "Seleccione un tipo de dieta para establecer los rangos de validación",
        life: 3000,
      });
    }

    // Actualizar el estado de errores
    setErroresValidacion({
      temp_dieta: isTempDietaInvalido,
      hum_dieta: isHumDietaInvalido,
      PH_dieta: isPHDietaInvalido,
    });
    const valoresFueraDeRango =
      isTempDietaInvalido || isHumDietaInvalido || isPHDietaInvalido;

    if (
      !registro.inspector_calidad ||
      !registro.encargado_investigacionydesarrollo ||
      !registro.num_tanda ||
      !registro.tipo_dieta ||
      !registro.mezcladora ||
      !registro.prueba_control ||
      !registro.hum_ambiental ||
      !registro.temp_ambiental ||
      !registro.temp_dieta ||
      !registro.hum_dieta ||
      !registro.brix_dieta ||
      !registro.PH_dieta ||
      !registro.medicion_cualitativa ||
      !registro.aprobacion ||
      !registro.num_individuos ||
      !registro.fec_siembra ||
      !registro.hor_inicio_ha ||
      !registro.hor_inicio_ne ||
      !registro.hor_inicio_pro ||
      !registro.hor_fin ||
      !registro.materia_prima ||
      !registro.num_muestra ||
      !registro.proveedor ||
      !registro.temperatura ||
      !registro.humedad ||
      !registro.lote ||
      !registro.nivel_inclusion_dieta
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Llena todos los campos",
        life: 3000,
      });
      return;
    }

    // Validación principal
    if (valoresFueraDeRango && !registro.observaciones) {
      setObservacionesObligatorio(true);
      const currentErrores = {
        "Temp Dieta": isTempDietaInvalido,
        "Hum Dieta": isHumDietaInvalido,
        "PH Dieta": isPHDietaInvalido,
      };

      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: `Debe agregar observaciones. Campos inválidos: ${Object.keys(
          currentErrores
        )
          .filter((k) => currentErrores[k])
          .join(", ")}`,
        life: 3000,
      });
      return;
    }

    setObservacionesObligatorio(false);
    setErroresValidacion({
      temp_dieta: false,
      hum_dieta: false,
      PH_dieta: false,
    });

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY"); // Fecha actual
      const currentTime = formatDateTime(new Date(), "hh:mm A"); // Hora actual

      const { data, error } = await supabase
        .from("Control_Calidad_Dieta-Siembra")
        .insert([
          {
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,

            inspector_calidad: registro.inspector_calidad,
            encargado_investigacionydesarrollo:
              registro.encargado_investigacionydesarrollo,
            num_tanda: registro.num_tanda,
            tipo_dieta: registro.tipo_dieta,
            mezcladora: registro.mezcladora,
            prueba_control: registro.prueba_control,
            hum_ambiental: registro.hum_ambiental,
            temp_ambiental: registro.temp_ambiental,
            temp_dieta: registro.temp_dieta,
            hum_dieta: registro.hum_dieta,
            brix_dieta: registro.brix_dieta,
            PH_dieta: registro.PH_dieta,
            medicion_cualitativa: registro.medicion_cualitativa,
            aprobacion: registro.aprobacion,
            num_individuos: registro.num_individuos,
            fec_siembra: convertirFecha(registro.fec_siembra),
            hor_inicio_ha: registro.hor_inicio_ha,
            hor_inicio_ne: registro.hor_inicio_ne,
            hor_inicio_pro: registro.hor_inicio_pro,
            hor_fin: registro.hor_fin,
            materia_prima: registro.materia_prima,
            num_muestra: registro.num_muestra,
            proveedor: registro.proveedor,
            temperatura: registro.temperatura,
            humedad: registro.humedad,
            lote: registro.lote,
            nivel_inclusion_dieta: registro.nivel_inclusion_dieta,
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
        .from("Control_Calidad_Dieta-Siembra")
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
    { field: "inspector_calidad", header: "Inspector Calidad" },
    {
      field: "encargado_investigacionydesarrollo",
      header: "Encargado Investigación y Desarrollo",
    },
    { field: "num_tanda", header: "Número de Tanda" },
    { field: "tipo_dieta", header: "Tipo de Dieta" },
    { field: "mezcladora", header: "Mezcladora" },
    { field: "prueba_control", header: "Prueba de Control" },
    { field: "hum_ambiental", header: "Humedad Ambiental" },
    { field: "temp_ambiental", header: "Temperatura Ambiental" },
    { field: "temp_dieta", header: "Temperatura de la Dieta" },
    { field: "hum_dieta", header: "Humedad de la Dieta" },
    { field: "brix_dieta", header: "Brix de la Dieta" },
    { field: "PH_dieta", header: "PH de la Dieta" },
    { field: "medicion_cualitativa", header: "Medición Cualitativa" },
    { field: "aprobacion", header: "Aprobación" },
    { field: "num_individuos", header: "Número de Individuos" },
    { field: "fec_siembra", header: "Fecha de Siembra" },
    { field: "hor_inicio_ha", header: "Hora de Inicio HA" },
    { field: "hor_inicio_ne", header: "Hora de Inicio NE" },
    { field: "hor_inicio_pro", header: "Hora de Inicio PRO" },
    { field: "hor_fin", header: "Hora de Fin" },
    { field: "materia_prima", header: "Materia Prima" },
    { field: "num_muestra", header: "Número de Muestra" },
    { field: "proveedor", header: "Proveedor" },
    { field: "temperatura", header: "Temperatura" },
    { field: "humedad", header: "Humedad" },
    { field: "lote", header: "Lote" },
    {
      field: "nivel_inclusion_dieta",
      header: "Nivel de Inclusión en la Dieta",
    },
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
    doc.text("Control_Calidad_Dieta-Siembra", 14, 22);

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

    doc.save("Control_Calidad_Dieta-Siembra.pdf");
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
    XLSX.writeFile(wb, "Control_Calidad_Dieta-Siembra.xlsx");
  };

  const renderRegistro = (registro) => (
    <div className="p-4 border-round-lg shadow-lg bg-white">
      <h2 className="text-center text-primary">Sección de Horno</h2>
      {cols
        .filter((col) => col.field.endsWith("_hor"))
        .map((col) => (
          <div key={col.field} className="p-mb-3">
            <label className="font-bold">{col.header}:</label>
            <p>{registro[col.field] || "N/A"}</p>
          </div>
        ))}
      <h2 className="text-center text-primary">Sección de Empaque</h2>
      {cols
        .filter((col) => col.field.endsWith("_emp"))
        .map((col) => (
          <div key={col.field} className="p-mb-3">
            <label className="font-bold">{col.header}:</label>
            <p>{registro[col.field] || "N/A"}</p>
          </div>
        ))}
    </div>
  );

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control Calidad Dieta - Siembra
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control Calidad Dieta - Siembra. Aquí
            puedes gestionar los registros de Control Calidad Dieta - Siembra.
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
              field="inspector_calidad"
              header="Inspector Calidad"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="encargado_investigacionydesarrollo"
              header="Encargado InvyDes"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="num_tanda"
              header="Número de Tanda"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="tipo_dieta"
              header="Tipo de Dieta"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: tipoDieta.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="mezcladora"
              header="Mezcladora"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="prueba_control"
              header="Prueba de Control"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="hum_ambiental"
              header="Humedad Ambiental"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="temp_ambiental"
              header="Temperatura Ambiental"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="temp_dieta"
              header="Temperatura de la Dieta"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="hum_dieta"
              header="Humedad de la Dieta"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="brix_dieta"
              header="Brix de la Dieta"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="PH_dieta"
              header="PH de la Dieta"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="medicion_cualitativa"
              header="Medición Cualitativa"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="aprobacion"
              header="Aprobación"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: aprobacion.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="num_individuos"
              header="Número de Individuos"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="fec_siembra"
              header="Fecha de Siembra"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="hor_inicio_ha"
              header="Hora de Inicio HA"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="hor_inicio_ne"
              header="Hora de Inicio NE"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="hor_inicio_pro"
              header="Hora de Inicio PRO"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="hor_fin"
              header="Hora de Fin"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="materia_prima"
              header="Materia Prima"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="num_muestra"
              header="Número de Muestra"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="proveedor"
              header="Proveedor"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="temperatura"
              header="Temperatura"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="humedad"
              header="Humedad"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="lote"
              header="Lote"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="nivel_inclusion_dieta"
              header="Nivel de Inclusión en la Dieta"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column field="fec_registro" header="Fecha Registro"></Column>
            <Column field="hor_registro" header="Hora Registro"></Column>
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
        <h3>
          <strong>INFORMACION INSPECTORES:</strong>
        </h3>
        <Divider />
        <div className="field">
          <label htmlFor="inspector_calidad" className="font-bold">
            Inspector Calidad{" "}
            {submitted && !registro.inspector_calidad && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="inspector_calidad"
            value={registro.inspector_calidad}
            onChange={(e) => onInputChange(e, "inspector_calidad")}
          />
          <br />
          <label
            htmlFor="encargado_investigacionydesarrollo"
            className="font-bold"
          >
            Encargado Investigación y Desarrollo{" "}
            {submitted && !registro.encargado_investigacionydesarrollo && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="encargado_investigacionydesarrollo"
            value={registro.encargado_investigacionydesarrollo}
            onChange={(e) =>
              onInputChange(e, "encargado_investigacionydesarrollo")
            }
          />

          <h3>
            <strong>PARÁMETROS DE DIETA:</strong>
          </h3>
          <Divider />
          <label htmlFor="tipo_dieta" className="font-bold">
            Tipo de Dieta{" "}
            {submitted && !registro.tipo_dieta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="tipo_dieta"
            value={registro.tipo_dieta}
            options={tipoDieta.map((req) => ({ label: req, value: req }))}
            onChange={(e) => onInputChange(e, "tipo_dieta")}
            placeholder="Selecciona tipo de dieta"
          />

          <br />

          <label htmlFor="num_tanda" className="font-bold">
            Número Tanda{" "}
            {submitted && !registro.num_tanda && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="num_tanda"
            value={registro.num_tanda}
            onChange={(e) => onInputChange(e, "num_tanda")}
          />
          <br />

          <label htmlFor="mezcladora" className="font-bold">
            Mezcladora (Línea 1/2){" "}
            {submitted && !registro.mezcladora && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="mezcladora"
            value={registro.mezcladora}
            onChange={(e) => onInputChange(e, "mezcladora")}
          />

          <br />

          <label htmlFor="prueba_control" className="font-bold">
            Prueba Control{" "}
            {submitted && !registro.prueba_control && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="prueba_control"
            value={registro.prueba_control}
            onChange={(e) => onInputChange(e, "prueba_control")}
          />

          <br />

          <label htmlFor="hum_ambiental" className="font-bold">
            Humedad Ambiental (%){" "}
            {submitted && !registro.hum_ambiental && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hum_ambiental"
            value={registro.hum_ambiental}
            onChange={(e) => onInputChange(e, "hum_ambiental")}
          />

          <br />

          <label htmlFor="temp_ambiental" className="font-bold">
            Temperatura Ambiental (℃){" "}
            {submitted && !registro.temp_ambiental && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="temp_ambiental"
            value={registro.temp_ambiental}
            onChange={(e) => onInputChange(e, "temp_ambiental")}
          />

          <label htmlFor="temp_dieta" className="font-bold">
            Temperatura de la Dieta (℃){" "}
            {submitted && !registro.temp_dieta && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.temp_dieta && (
              <small className="p-error">Temperatura Fuera de Rango.</small>
            )}
          </label>
          <InputText
            id="temp_dieta"
            value={registro.temp_dieta}
            onChange={(e) => onInputChange(e, "temp_dieta")}
          />
          <br />
          <label htmlFor="hum_dieta" className="font-bold">
            Humedad de la Dieta (%){" "}
            {submitted && !registro.hum_dieta && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.hum_dieta && (
              <small className="p-error">Humedad Fuera de Rango.</small>
            )}
          </label>
          <InputText
            id="hum_dieta"
            value={registro.hum_dieta}
            onChange={(e) => onInputChange(e, "hum_dieta")}
          />
          <br />

          <label htmlFor="brix_dieta" className="font-bold">
            Brix de la Dieta{" "}
            {submitted && !registro.brix_dieta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="brix_dieta"
            value={registro.brix_dieta}
            onChange={(e) => onInputChange(e, "brix_dieta")}
          />
          <br />
          <label htmlFor="PH_dieta" className="font-bold">
            PH de la Dieta{" "}
            {submitted && !registro.PH_dieta && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.PH_dieta && (
              <small className="p-error">PH Fuera de Rango.</small>
            )}
          </label>
          <InputText
            id="PH_dieta"
            value={registro.PH_dieta}
            onChange={(e) => onInputChange(e, "PH_dieta")}
          />

          <br />
          <label htmlFor="medicion_cualitativa" className="font-bold">
            Medición Cualitativa{" "}
            {submitted && !registro.medicion_cualitativa && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="medicion_cualitativa"
            value={registro.medicion_cualitativa}
            onChange={(e) => onInputChange(e, "medicion_cualitativa")}
          />
          <br />
          <label htmlFor="aprobacion" className="font-bold">
            Aprobación{" "}
            {submitted && !registro.aprobacion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="aprobacion"
            value={registro.aprobacion}
            options={aprobacion.map((req) => ({ label: req, value: req }))}
            onChange={(e) => onInputChange(e, "aprobacion")}
            placeholder="Selecciona Aprobación"
          />
          <br />
          <label htmlFor="num_individuos" className="font-bold">
            Número de Individuos{" "}
            {submitted && !registro.num_individuos && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="num_individuos"
            value={registro.num_individuos}
            onChange={(e) => onInputChange(e, "num_individuos")}
          />
          <br />
          <label htmlFor="fec_siembra" className="font-bold">
            Fecha de Siembra{" "}
            {submitted && !registro.fec_siembra && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="fec_siembra"
            type="date"
            value={registro.fec_siembra}
            onChange={(e) => onInputChange(e, "fec_siembra")}
          />
          <br />
          <label htmlFor="hor_inicio_ha" className="font-bold">
            Hora de Inicio Hatchery{" "}
            {submitted && !registro.hor_inicio_ha && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hor_inicio_ha"
            type="time"
            value={registro.hor_inicio_ha}
            onChange={(e) => onInputChange(e, "hor_inicio_ha")}
          />
          <br />
          <label htmlFor="hor_inicio_ne" className="font-bold">
            Hora de Inicio Neonatos{" "}
            {submitted && !registro.hor_inicio_ne && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hor_inicio_ne"
            type="time"
            value={registro.hor_inicio_ne}
            onChange={(e) => onInputChange(e, "hor_inicio_ne")}
          />
          <br />
          <label htmlFor="hor_inicio_pro" className="font-bold">
            Hora de Inicio Producción{" "}
            {submitted && !registro.hor_inicio_pro && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hor_inicio_pro"
            type="time"
            value={registro.hor_inicio_pro}
            onChange={(e) => onInputChange(e, "hor_inicio_pro")}
          />
          <br />
          <label htmlFor="hor_fin" className="font-bold">
            Hora de Fin{" "}
            {submitted && !registro.hor_fin && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hor_fin"
            type="time"
            value={registro.hor_fin}
            onChange={(e) => onInputChange(e, "hor_fin")}
          />

          <h3>
            <strong>PARÁMETROS CRITICOS DE MATERIAS PRIMAS:</strong>
          </h3>
          <Divider />

          <br />
          <label htmlFor="materia_prima" className="font-bold">
            Materia Prima{" "}
            {submitted && !registro.materia_prima && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="materia_prima"
            value={registro.materia_prima}
            onChange={(e) => onInputChange(e, "materia_prima")}
          />
          <br />
          <label htmlFor="num_muestra" className="font-bold">
            Número de Muestra{" "}
            {submitted && !registro.num_muestra && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="num_muestra"
            value={registro.num_muestra}
            onChange={(e) => onInputChange(e, "num_muestra")}
          />
          <br />
          <label htmlFor="proveedor" className="font-bold">
            Proveedor{" "}
            {submitted && !registro.proveedor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="proveedor"
            value={registro.proveedor}
            onChange={(e) => onInputChange(e, "proveedor")}
          />
          <br />
          <label htmlFor="temperatura" className="font-bold">
            Temperatura (℃){" "}
            {submitted && !registro.temperatura && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="temperatura"
            value={registro.temperatura}
            onChange={(e) => onInputChange(e, "temperatura")}
          />
          <br />
          <label htmlFor="humedad" className="font-bold">
            Humedad (%){" "}
            {submitted && !registro.humedad && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="humedad"
            value={registro.humedad}
            onChange={(e) => onInputChange(e, "humedad")}
          />
          <br />
          <label htmlFor="lote" className="font-bold">
            Lote{" "}
            {submitted && !registro.lote && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="lote"
            value={registro.lote}
            onChange={(e) => onInputChange(e, "lote")}
          />
          <br />
          <label htmlFor="nivel_inclusion_dieta" className="font-bold">
            Nivel de Inclusión en la Dieta{" "}
            {submitted && !registro.nivel_inclusion_dieta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="nivel_inclusion_dieta"
            value={registro.nivel_inclusion_dieta}
            onChange={(e) => onInputChange(e, "nivel_inclusion_dieta")}
          />
          <br />
          <label htmlFor="observaciones" className="font-bold">
            Observaciones{" "}
            {observacionesObligatorio && (
              <small className="p-error">Requerido por fuera de rango.</small>
            )}
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
}
export default ControlCalidadDietaSiembra; // Exporta la función
