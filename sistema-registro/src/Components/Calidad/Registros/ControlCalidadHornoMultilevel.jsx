import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControlCalidadHornoMultilevel.css"; // Importa el CSS
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


function ControlCalidadHornoMultilevel() {
  let emptyRegister = {
    fec_registro: "",
    hor_registro: "",
    observaciones: "",

    inspector_calidad: "",
    encargado_investigacionydesarrollo: "",

    num_muestra_emp: "",
    temp_ambiental_emp: "",
    hum_ambiental_emp: "",
    temp_producto_emp: "",
    hum_producto_emp: "",
    densidad_emp: "",
    aprobacion_emp: "",
    material_empaque_emp: "",
    proveedor_emp: "",
    lote_emp: "",
    fec_vencimiento_emp: "",
    verif_peso_emp: "",
    estado_empaque_emp: "",
    unid_empacadas_emp: "",
    unid_retenidas_emp: "",
    unid_incompletas_emp: "",
    num_lote_emp: "",

    temp_real_horno_hor: "",
    temp_seteo_horno_hor: "",
    tiempo_residencia_hor: "",
    num_muestra_hor: "",
    temp_ambiental_hor: "",
    hum_ambiental_hor: "",
    velo_banda_hor: "",
    temp_producto_hor: "",
    hum_producto_hor: "",
    aprobacion_hor: "",
    num_lote_hor: "",
    nom_cliente_hor: "",
    producto_hor: "",
    presentacion_hor: "",
    hora_inicio_hor: "",
    hora_fin_hor: "",
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
  const aprobacion = ["Cumple", "No Cumple", "N/A"];
  //Errores de validación
  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    temp_real_horno_hor: false,
    temp_seteo_horno_hor: false,
    temp_producto_emp: false,
  });

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Calidad_HornoMultilevel")
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

    // Validar los campos
    const isTempRealHornoInvalido =
      registro.temp_real_horno_hor < 90 || registro.temp_real_horno_hor > 140;
    const isTempSeteoHornoInvalido =
      registro.temp_seteo_horno_hor < 90 || registro.temp_seteo_horno_hor > 140;
    const isTempProductoEmpInvalido = registro.temp_producto_emp > 35;
    // Actualizar el estado de errores
    setErroresValidacion({
      temp_real_horno_hor: isTempRealHornoInvalido,
      temp_seteo_horno_hor: isTempSeteoHornoInvalido,
      temp_producto_emp: isTempProductoEmpInvalido,
    });
    const valoresFueraDeRango = isTempRealHornoInvalido || isTempSeteoHornoInvalido || isTempProductoEmpInvalido;

    if (
      !registro.inspector_calidad ||
      !registro.encargado_investigacionydesarrollo ||
      !registro.num_muestra_emp ||
      !registro.temp_ambiental_emp ||
      !registro.hum_ambiental_emp ||
      !registro.temp_producto_emp ||
      !registro.hum_producto_emp ||
      !registro.densidad_emp ||
      !registro.aprobacion_emp ||
      !registro.material_empaque_emp ||
      !registro.proveedor_emp ||
      !registro.lote_emp ||
      !registro.fec_vencimiento_emp ||
      !registro.verif_peso_emp ||
      !registro.estado_empaque_emp ||
      !registro.unid_empacadas_emp ||
      !registro.unid_retenidas_emp ||
      !registro.unid_incompletas_emp ||
      !registro.num_lote_emp ||
      !registro.temp_real_horno_hor ||
      !registro.temp_seteo_horno_hor ||
      !registro.tiempo_residencia_hor ||
      !registro.num_muestra_hor ||
      !registro.temp_ambiental_hor ||
      !registro.hum_ambiental_hor ||
      !registro.velo_banda_hor ||
      !registro.temp_producto_hor ||
      !registro.hum_producto_hor ||
      !registro.aprobacion_hor ||
      !registro.num_lote_hor ||
      !registro.nom_cliente_hor ||
      !registro.producto_hor ||
      !registro.presentacion_hor ||
      !registro.hora_inicio_hor ||
      !registro.hora_fin_hor
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
        "Temp Real Horno": isTempRealHornoInvalido,
        "Temp Seteo Horno": isTempSeteoHornoInvalido,
        "Temp Producto Empaque": isTempProductoEmpInvalido,
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
      temp_real_horno_hor: false,
      temp_seteo_horno_hor: false,
        temp_producto_emp: false,
    });

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY"); // Fecha actual
      const currentTime = formatDateTime(new Date(), "hh:mm A"); // Hora actual

      const { data, error } = await supabase
        .from("Control_Calidad_HornoMultilevel")
        .insert([
          {
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,

            inspector_calidad: registro.inspector_calidad,
            encargado_investigacionydesarrollo:
              registro.encargado_investigacionydesarrollo,

            num_muestra_emp: registro.num_muestra_emp,
            temp_ambiental_emp: registro.temp_ambiental_emp,
            hum_ambiental_emp: registro.hum_ambiental_emp,
            temp_producto_emp: registro.temp_producto_emp,
            hum_producto_emp: registro.hum_producto_emp,
            densidad_emp: registro.densidad_emp,
            aprobacion_emp: registro.aprobacion_emp,
            material_empaque_emp: registro.material_empaque_emp,
            proveedor_emp: registro.proveedor_emp,
            lote_emp: registro.lote_emp,
            fec_vencimiento_emp: convertirFecha(registro.fec_vencimiento_emp),
            verif_peso_emp: registro.verif_peso_emp,
            estado_empaque_emp: registro.estado_empaque_emp,
            unid_empacadas_emp: registro.unid_empacadas_emp,
            unid_retenidas_emp: registro.unid_retenidas_emp,
            unid_incompletas_emp: registro.unid_incompletas_emp,
            num_lote_emp: registro.num_lote_emp,

            temp_real_horno_hor: registro.temp_real_horno_hor,
            temp_seteo_horno_hor: registro.temp_seteo_horno_hor,
            tiempo_residencia_hor: registro.tiempo_residencia_hor,
            num_muestra_hor: registro.num_muestra_hor,
            temp_ambiental_hor: registro.temp_ambiental_hor,
            hum_ambiental_hor: registro.hum_ambiental_hor,
            velo_banda_hor: registro.velo_banda_hor,
            temp_producto_hor: registro.temp_producto_hor,
            hum_producto_hor: registro.hum_producto_hor,
            aprobacion_hor: registro.aprobacion_hor,
            num_lote_hor: registro.num_lote_hor,
            nom_cliente_hor: registro.nom_cliente_hor,
            producto_hor: registro.producto_hor,
            presentacion_hor: registro.presentacion_hor,
            hora_inicio_hor: registro.hora_inicio_hor,
            hora_fin_hor: registro.hora_fin_hor,
          },
        ]); //Cambiar aqui este insert y poner cada columna ya que las fechas se tienen que formatear
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
        .from("Control_Calidad_HornoMultilevel")
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
    { field: "encargado_investigacionydesarrollo", header: "Encargado I+D" },
    { field: "temp_real_horno_hor", header: "Temperatura Real Horno" },
    { field: "temp_seteo_horno_hor", header: "Temperatura Seteo Horno" },
    { field: "tiempo_residencia_hor", header: "Tiempo Residencia Horno" },
    { field: "num_muestra_hor", header: "Número Muestra Horno" },
    { field: "temp_ambiental_hor", header: "Temperatura Ambiental Horno" },
    { field: "hum_ambiental_hor", header: "Humedad Ambiental Horno" },
    { field: "velo_banda_hor", header: "Velocidad Banda Horno" },
    { field: "temp_producto_hor", header: "Temperatura Producto Horno" },
    { field: "hum_producto_hor", header: "Humedad Producto Horno" },
    { field: "aprobacion_hor", header: "Aprobación Horno" },
    { field: "num_lote_hor", header: "Número Lote Horno" },
    { field: "nom_cliente_hor", header: "Nombre Cliente Horno" },
    { field: "producto_hor", header: "Producto Horno" },
    { field: "presentacion_hor", header: "Presentación Horno" },
    { field: "hora_inicio_hor", header: "Hora Inicio Horno" },
    { field: "hora_fin_hor", header: "Hora Fin Horno" },

    { field: "num_muestra_emp", header: "Número muestra epaque" },
    { field: "temp_ambiental_emp", header: "Temperatura Ambiental Empaque" },
    { field: "hum_ambiental_emp", header: "Humedad Ambiental Empaque" },
    { field: "temp_producto_emp", header: "Temperatura Producto Empaque" },
    { field: "hum_producto_emp", header: "Humedad Producto Empaque" },
    { field: "densidad_emp", header: "Densidad Empaque" },
    { field: "aprobacion_emp", header: "Aprobación Empaque" },
    { field: "material_empaque_emp", header: "Material Empaque" },
    { field: "proveedor_emp", header: "Proveedor Empaque" },
    { field: "lote_emp", header: "Lote Empaque" },
    { field: "fec_vencimiento_emp", header: "Fecha Vencimiento Empaque" },
    { field: "verif_peso_emp", header: "Verificación Peso Empaque" },
    { field: "estado_empaque_emp", header: "Estado Empaque" },
    { field: "unid_empacadas_emp", header: "Unidades Empacadas" },
    { field: "unid_retenidas_emp", header: "Unidades Retenidas" },
    { field: "unid_incompletas_emp", header: "Unidades Incompletas" },
    { field: "num_lote_emp", header: "SKU" },
    
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
    doc.text("Control_Calidad_HornoMultilevel", 14, 22);

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

    doc.save("Control_Calidad_HornoMultilevel.pdf");
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
    XLSX.writeFile(wb, "Control_Calidad_HornoMultilevel.xlsx");
  };


  const renderRegistro = (registro) => (
    <div className="p-4 border-round-lg shadow-lg bg-white">
        <h2 className="text-center text-primary">Sección de Horno</h2>
        {cols.filter(col => col.field.endsWith('_hor')).map(col => (
            <div key={col.field} className="p-mb-3">
                <label className="font-bold">{col.header}:</label>
                <p>{registro[col.field] || "N/A"}</p>
            </div>
        ))}
        <h2 className="text-center text-primary">Sección de Empaque</h2>
        {cols.filter(col => col.field.endsWith('_emp')).map(col => (
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
          Control Calidad Horno Multilevel
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control Calidad Horno Multilevel. Aquí
            puedes gestionar los registros de Control Calidad Horno Multilevel.
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
              field="num_muestra_hor"
              header="Número Muestra Horno"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="temp_ambiental_hor"
              header="Temperatura Ambiental Horno (°C)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="hum_ambiental_hor"
              header="Humedad Ambiental Horno (%)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="temp_real_horno_hor"
              header="Temperatura Real Horno (°C)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="temp_seteo_horno_hor"
              header="Temperatura Seteo Horno (°C)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="velo_banda_hor"
              header="Velocidad Banda Horno (Hrz)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="tiempo_residencia_hor"
              header="Tiempo Residencia Horno (min)"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="temp_producto_hor"
              header="Temperatura Producto Horno (°C)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="hum_producto_hor"
              header="Humedad Producto Horno (%)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="aprobacion_hor"
              header="Aprobación Horno"
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
              field="num_lote_hor"
              header="Número Lote Horno"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="nom_cliente_hor"
              header="Nombre Cliente Horno"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="producto_hor"
              header="Producto Horno"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="presentacion_hor"
              header="Presentación Horno"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="hora_inicio_hor"
              header="Hora Inicio Horno"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="hora_fin_hor"
              header="Hora Fin Horno"
              editor={(options) => timeEditor(options)}
            ></Column>

            <Divider />

            <Column
              field="num_muestra_emp"
              header="Número Muestra Empaque"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="temp_ambiental_emp"
              header="Temperatura Ambiental Empaque (°C)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="hum_ambiental_emp"
              header="Humedad Ambiental Empaque (%)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="temp_producto_emp"
              header="Temperatura Producto Empaque (Max 35°C)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="hum_producto_emp"
              header="Humedad Producto Empaque (%)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="densidad_emp"
              header="Densidad Empaque (Kg/m³)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="aprobacion_emp"
              header="Aprobación Empaque"
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
              field="material_empaque_emp"
              header="Material Empaque"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="proveedor_emp"
              header="Proveedor Empaque"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="lote_emp"
              header="Lote Empaque"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="fec_vencimiento_emp"
              header="Fecha Vencimiento Empaque"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="verif_peso_emp"
              header="Verificación Peso Empaque"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="estado_empaque_emp"
              header="Estado Empaque"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="unid_empacadas_emp"
              header="Unidades Empacadas"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="unid_retenidas_emp"
              header="Unidades Retenidas"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="unid_incompletas_emp"
              header="Unidades Incompletas"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="num_lote_emp"
              header="SKU"
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
            <strong>PARÁMETROS DE HORNO:</strong>
          </h3>
          <Divider />
          <label htmlFor="temp_real_horno_hor" className="font-bold">
            Temperatura Real Horno (°C){" "}
            {submitted && !registro.temp_real_horno_hor && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.temp_real_horno_hor && (
              <small className="p-error">
                Temperatura Fuera de Rango Min90°C - Max140°C.
              </small>
            )}
          </label>
          <InputText
            id="temp_real_horno_hor"
            value={registro.temp_real_horno_hor}
            onChange={(e) => onInputChange(e, "temp_real_horno_hor")}
          />
          <br />
          <label htmlFor="temp_seteo_horno_hor" className="font-bold">
            Temperatura Seteo Horno (°C){" "}
            {submitted && !registro.temp_seteo_horno_hor && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.temp_seteo_horno_hor && (
              <small className="p-error">
                Temperatura Fuera de Rango Min90°C - Max140°C.
              </small>
            )}
            
          </label>
          <InputText
            id="temp_seteo_horno_hor"
            value={registro.temp_seteo_horno_hor}
            onChange={(e) => onInputChange(e, "temp_seteo_horno_hor")}
          />
          <br />
          <label htmlFor="tiempo_residencia_hor" className="font-bold">
            Tiempo Residencia Horno (min){" "}
            {submitted && !registro.tiempo_residencia_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="tiempo_residencia_hor"
            value={registro.tiempo_residencia_hor}
            onChange={(e) => onInputChange(e, "tiempo_residencia_hor")}
          />
          <br />
          <label htmlFor="num_muestra_hor" className="font-bold">
            Número Muestra Horno{" "}
            {submitted && !registro.num_muestra_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="num_muestra_hor"
            value={registro.num_muestra_hor}
            onChange={(e) => onInputChange(e, "num_muestra_hor")}
          />
          <br />
          <label htmlFor="temp_ambiental_hor" className="font-bold">
            Temperatura Ambiental Horno (°C){" "}
            {submitted && !registro.temp_ambiental_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="temp_ambiental_hor"
            value={registro.temp_ambiental_hor}
            onChange={(e) => onInputChange(e, "temp_ambiental_hor")}
          />
          <br />
          <label htmlFor="hum_ambiental_hor" className="font-bold">
            Humedad Ambiental Horno (%){" "}
            {submitted && !registro.hum_ambiental_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hum_ambiental_hor"
            value={registro.hum_ambiental_hor}
            onChange={(e) => onInputChange(e, "hum_ambiental_hor")}
          />
          <br />
          <label htmlFor="velo_banda_hor" className="font-bold">
            Velocidad Banda Horno (Hrz){" "}
            {submitted && !registro.velo_banda_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="velo_banda_hor"
            value={registro.velo_banda_hor}
            onChange={(e) => onInputChange(e, "velo_banda_hor")}
          />
          <br />
          <label htmlFor="temp_producto_hor" className="font-bold">
            Temperatura Producto Horno (°C){" "}
            {submitted && !registro.temp_producto_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="temp_producto_hor"
            value={registro.temp_producto_hor}
            onChange={(e) => onInputChange(e, "temp_producto_hor")}
          />
          <br />
          <label htmlFor="hum_producto_hor" className="font-bold">
            Humedad Producto Horno (%){" "}
            {submitted && !registro.hum_producto_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hum_producto_hor"
            value={registro.hum_producto_hor}
            onChange={(e) => onInputChange(e, "hum_producto_hor")}
          />
          <br />
          <label htmlFor="aprobacion_hor" className="font-bold">
            Aprobación Horno{" "}
            {submitted && !registro.aprobacion_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="aprobacion_hor"
            value={registro.aprobacion_hor}
            options={aprobacion.map((req) => ({ label: req, value: req }))}
            onChange={(e) => onInputChange(e, "aprobacion_hor")}
          />
          <br />
          <label htmlFor="num_lote_hor" className="font-bold">
            Número Lote Horno{" "}
            {submitted && !registro.num_lote_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="num_lote_hor"
            value={registro.num_lote_hor}
            onChange={(e) => onInputChange(e, "num_lote_hor")}
          />
          <br />
          <label htmlFor="nom_cliente_hor" className="font-bold">
            Nombre Cliente Horno{" "}
            {submitted && !registro.nom_cliente_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="nom_cliente_hor"
            value={registro.nom_cliente_hor}
            onChange={(e) => onInputChange(e, "nom_cliente_hor")}
          />
          <br />
          <label htmlFor="producto_hor" className="font-bold">
            Producto Horno{" "}
            {submitted && !registro.producto_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="producto_hor"
            value={registro.producto_hor}
            onChange={(e) => onInputChange(e, "producto_hor")}
          />
          <br />
          <label htmlFor="presentacion_hor" className="font-bold">
            Presentación Horno (2.5lb - 5lb - JumboSaco - Otro){" "}
            {submitted && !registro.presentacion_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="presentacion_hor"
            value={registro.presentacion_hor}
            onChange={(e) => onInputChange(e, "presentacion_hor")}
          />
          <br />
          <label htmlFor="hora_inicio_hor" className="font-bold">
            Hora Inicio Horno{" "}
            {submitted && !registro.hora_inicio_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hora_inicio_hor"
            type="time"
            value={registro.hora_inicio_hor}
            onChange={(e) => onInputChange(e, "hora_inicio_hor")}
          />
          <br />
          <label htmlFor="hora_fin_hor" className="font-bold">
            Hora Fin Horno{" "}
            {submitted && !registro.hora_fin_hor && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hora_fin_hor"
            type="time"
            value={registro.hora_fin_hor}
            onChange={(e) => onInputChange(e, "hora_fin_hor")}
          />

          <h3>
            <strong>PARÁMETROS DE EMPAQUE:</strong>
          </h3>
          <Divider />

          <br />
          <label htmlFor="num_muestra_emp" className="font-bold">
            Número Muestra Empaque{" "}
            {submitted && !registro.num_muestra_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="num_muestra_emp"
            value={registro.num_muestra_emp}
            onChange={(e) => onInputChange(e, "num_muestra_emp")}
          />
          <br />
          <label htmlFor="temp_ambiental_emp" className="font-bold">
            Temperatura Ambiental Empaque (°C){" "}
            {submitted && !registro.temp_ambiental_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="temp_ambiental_emp"
            value={registro.temp_ambiental_emp}
            onChange={(e) => onInputChange(e, "temp_ambiental_emp")}
          />
          <br />
          <label htmlFor="hum_ambiental_emp" className="font-bold">
            Humedad Ambiental Empaque (%){" "}
            {submitted && !registro.hum_ambiental_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hum_ambiental_emp"
            value={registro.hum_ambiental_emp}
            onChange={(e) => onInputChange(e, "hum_ambiental_emp")}
          />
          <br />
          <label htmlFor="temp_producto_emp" className="font-bold">
            Temperatura Producto Empaque (°C){" "}
            {submitted && !registro.temp_producto_emp && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.temp_producto_emp && (
              <small className="p-error">
                Temperatura Fuera de Rango Max35°C.
              </small>
            )}
            
          </label>
          <InputText
            id="temp_producto_emp"
            value={registro.temp_producto_emp}
            onChange={(e) => onInputChange(e, "temp_producto_emp")}
          />
          <br />
          <label htmlFor="hum_producto_emp" className="font-bold">
            Humedad Producto Empaque{" "}
            {submitted && !registro.hum_producto_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="hum_producto_emp"
            value={registro.hum_producto_emp}
            onChange={(e) => onInputChange(e, "hum_producto_emp")}
          />
          <br />
          <label htmlFor="densidad_emp" className="font-bold">
            Densidad Empaque (Kg/m³){" "}
            {submitted && !registro.densidad_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="densidad_emp"
            value={registro.densidad_emp}
            onChange={(e) => onInputChange(e, "densidad_emp")}
          />
          <br />
          <label htmlFor="aprobacion_emp" className="font-bold">
            Aprobación Empaque{" "}
            {submitted && !registro.aprobacion_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="aprobacion_emp"
            value={registro.aprobacion_emp}
            options={aprobacion.map((req) => ({ label: req, value: req }))}
            onChange={(e) => onInputChange(e, "aprobacion_emp")}
          />
          <br />
          <label htmlFor="material_empaque_emp" className="font-bold">
            Material Empaque{" "}
            {submitted && !registro.material_empaque_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="material_empaque_emp"
            value={registro.material_empaque_emp}
            onChange={(e) => onInputChange(e, "material_empaque_emp")}
          />
          <br />
          <label htmlFor="proveedor_emp" className="font-bold">
            Proveedor Empaque{" "}
            {submitted && !registro.proveedor_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="proveedor_emp"
            value={registro.proveedor_emp}
            onChange={(e) => onInputChange(e, "proveedor_emp")}
          />
          <br />
          <label htmlFor="lote_emp" className="font-bold">
            Lote Empaque{" "}
            {submitted && !registro.lote_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="lote_emp"
            value={registro.lote_emp}
            onChange={(e) => onInputChange(e, "lote_emp")}
          />
          <br />
          <label htmlFor="fec_vencimiento_emp" className="font-bold">
            Fecha Vencimiento Empaque{" "}
            {submitted && !registro.fec_vencimiento_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="fec_vencimiento_emp"
            type="date"
            value={registro.fec_vencimiento_emp}
            onChange={(e) => onInputChange(e, "fec_vencimiento_emp")}
          />
          <br />
          <label htmlFor="verif_peso_emp" className="font-bold">
            Verificación Peso Empaque{" "}
            {submitted && !registro.verif_peso_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="verif_peso_emp"
            value={registro.verif_peso_emp}
            onChange={(e) => onInputChange(e, "verif_peso_emp")}
          />
          <br />
          <label htmlFor="estado_empaque_emp" className="font-bold">
            Estado Empaque{" "}
            {submitted && !registro.estado_empaque_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="estado_empaque_emp"
            value={registro.estado_empaque_emp}
            onChange={(e) => onInputChange(e, "estado_empaque_emp")}
          />
          <br />
          <label htmlFor="unid_empacadas_emp" className="font-bold">
            Unidades Empacadas{" "}
            {submitted && !registro.unid_empacadas_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="unid_empacadas_emp"
            value={registro.unid_empacadas_emp}
            onChange={(e) => onInputChange(e, "unid_empacadas_emp")}
          />
          <br />
          <label htmlFor="unid_retenidas_emp" className="font-bold">
            Unidades Retenidas{" "}
            {submitted && !registro.unid_retenidas_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="unid_retenidas_emp"
            value={registro.unid_retenidas_emp}
            onChange={(e) => onInputChange(e, "unid_retenidas_emp")}
          />
          <br />
          <label htmlFor="unid_incompletas_emp" className="font-bold">
            Unidades Incompletas{" "}
            {submitted && !registro.unid_incompletas_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="unid_incompletas_emp"
            value={registro.unid_incompletas_emp}
            onChange={(e) => onInputChange(e, "unid_incompletas_emp")}
          />
          <br />
          <label htmlFor="num_lote_emp" className="font-bold">
            SKU{" "}
            {submitted && !registro.num_lote_emp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="num_lote_emp"
            value={registro.num_lote_emp}
            onChange={(e) => onInputChange(e, "num_lote_emp")}
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
export default ControlCalidadHornoMultilevel;
