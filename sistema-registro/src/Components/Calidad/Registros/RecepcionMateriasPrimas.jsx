import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./RecepcionMateriasPrimas.css"; // Importa el CSS
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

function RecepcionMateriasPrimas() {
  let emptyRegister = {
    producto: "",
    fec_vencimiento: "",
    cantidad_unidades: "",
    nom_encargado_transporte: "",
    identificacion: "",
    placa_vehiculo: "",
    trans_limpioyordenado: "",
    trans_sin_materiales_quimicos: "",
    trans_libre_plagas: "",
    mat_prima_limpiayordenada: "",
    producto_sellado: "",
    mat_prima_etiqueta: "",
    mat_prima_sin_perforaciones: "",
    caracteristica: "",
    mat_prima_peso_etiqueta: "",
    peso_unidad: "",
    humedad: "",
    temp: "",
    brix: "",
    ph: "",
    muestra: "",
    replica: "",
    unid_conforme: "",
    unid_disconforme: "",
    resultado: "",
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
  const requerimientos = ["Cumple", "No Cumple", "N/A"];
  //Errores de validación
  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    muestra: false,
    humedad: false,
  });

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Recepcion_Materia_Prima")
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
    const isMuestraInvalido = registro.muestra < 5;
    const isHumedadInvalido = registro.humedad > 13;

    // Actualizar el estado de errores
    setErroresValidacion({
      muestra: isMuestraInvalido,
      humedad: isHumedadInvalido,
    });
    const valoresFueraDeRango = isMuestraInvalido || isHumedadInvalido;

    if (
      !registro.producto ||
      !registro.fec_vencimiento ||
      !registro.cantidad_unidades ||
      !registro.nom_encargado_transporte ||
      !registro.identificacion ||
      !registro.placa_vehiculo ||
      !registro.trans_limpioyordenado ||
      !registro.trans_sin_materiales_quimicos ||
      !registro.trans_libre_plagas ||
      !registro.mat_prima_limpiayordenada ||
      !registro.producto_sellado ||
      !registro.mat_prima_etiqueta ||
      !registro.mat_prima_sin_perforaciones ||
      !registro.caracteristica ||
      !registro.mat_prima_peso_etiqueta ||
      !registro.peso_unidad ||
      !registro.humedad ||
      !registro.temp ||
      !registro.brix ||
      !registro.ph ||
      !registro.muestra ||
      !registro.replica ||
      !registro.unid_conforme ||
      !registro.unid_disconforme ||
      !registro.resultado
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
        Muestra: isMuestraInvalido,
        Humedad: isHumedadInvalido,
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
      muestra: false,
      humedad: false,
    });

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY"); // Fecha actual
      const currentTime = formatDateTime(new Date(), "hh:mm A"); // Hora actual

      const { data, error } = await supabase
        .from("Recepcion_Materia_Prima")
        .insert([
          {
            producto: registro.producto,
            fec_vencimiento: convertirFecha(registro.fec_vencimiento),
            cantidad_unidades: registro.cantidad_unidades,
            nom_encargado_transporte: registro.nom_encargado_transporte,
            identificacion: registro.identificacion,
            placa_vehiculo: registro.placa_vehiculo,
            trans_limpioyordenado: registro.trans_limpioyordenado,
            trans_sin_materiales_quimicos:
              registro.trans_sin_materiales_quimicos,
            trans_libre_plagas: registro.trans_libre_plagas,
            mat_prima_limpiayordenada: registro.mat_prima_limpiayordenada,
            producto_sellado: registro.producto_sellado,
            mat_prima_etiqueta: registro.mat_prima_etiqueta,
            mat_prima_sin_perforaciones: registro.mat_prima_sin_perforaciones,
            caracteristica: registro.caracteristica,
            mat_prima_peso_etiqueta: registro.mat_prima_peso_etiqueta,
            peso_unidad: registro.peso_unidad,
            humedad: registro.humedad,
            temp: registro.temp,
            brix: registro.brix,
            ph: registro.ph,
            muestra: registro.muestra,
            replica: registro.replica,
            unid_conforme: registro.unid_conforme,
            unid_disconforme: registro.unid_disconforme,
            resultado: registro.resultado,
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,
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
        .from("Recepcion_Materia_Prima")
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
    { field: "producto", header: "Producto" },
    { field: "fec_vencimiento", header: "Fecha Vencimiento" },
    { field: "cantidad_unidades", header: "Cantidad Unidades" },
    {
      field: "nom_encargado_transporte",
      header: "Nom Encargado Transporte",
    },
    { field: "identificacion", header: "Identificación" },
    { field: "placa_vehiculo", header: "Placa Vehículo" },
    { field: "trans_limpioyordenado", header: "Trans Limpio y Ordenado" },
    {
      field: "trans_sin_materiales_quimicos",
      header: "Transporte sin Mat Químicos",
    },
    { field: "trans_libre_plagas", header: "Transporte Libre de Plagas" },
    {
      field: "mat_prima_limpiayordenada",
      header: "Mat Prima Limpia y Ordenada",
    },
    { field: "producto_sellado", header: "Producto Sellado" },
    { field: "mat_prima_etiqueta", header: "Materia Prima con Etiqueta" },
    {
      field: "mat_prima_sin_perforaciones",
      header: "Mata Prima sin Perforaciones",
    },
    { field: "caracteristica", header: "Característica" },
    { field: "mat_prima_peso_etiqueta", header: "Peso Etiqueta Materia Prima" },
    { field: "peso_unidad", header: "Peso Unidad" },
    { field: "humedad", header: "Humedad (%)" },
    { field: "temp", header: "Temperatura (°C)" },
    { field: "brix", header: "Brix" },
    { field: "ph", header: "pH" },
    { field: "muestra", header: "Muestra" },
    { field: "replica", header: "Réplica" },
    { field: "unid_conforme", header: "Unidades Conformes" },
    { field: "unid_disconforme", header: "Unidades Disconformes" },
    { field: "resultado", header: "Resultado" },
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
    doc.text("Registros de Recepcion Materias Primas", 14, 22);

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

    doc.save("Recepcion Materias Primas.pdf");
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
    XLSX.writeFile(wb, "Recepcion Materias Primas.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Recepción de Materias Primas
        
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Calidad de Recepcion Materias Primas. Aquí
            puedes gestionar los registros de calidad de Recepcion Materias
            Primas.
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
              field="producto"
              header="Producto"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="fec_vencimiento"
              header="Fecha Vencimiento"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="cantidad_unidades"
              header="Cantidad Unidades"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="nom_encargado_transporte"
              header="Nombre Encargado Transporte"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="identificacion"
              header="Identificación"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="placa_vehiculo"
              header="Placa Vehículo"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="trans_limpioyordenado"
              header="Transporte Limpio y Ordenado"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="trans_sin_materiales_quimicos"
              header="Transporte sin Materiales Químicos"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="trans_libre_plagas"
              header="Transporte Libre de Plagas"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="mat_prima_limpiayordenada"
              header="Materia Prima Limpia y Ordenada"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="producto_sellado"
              header="Producto Sellado"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="mat_prima_etiqueta"
              header="Materia Prima con Etiqueta"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="mat_prima_sin_perforaciones"
              header="Materia Prima sin Perforaciones"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="caracteristica"
              header="Característica"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="mat_prima_peso_etiqueta"
              header="Peso Etiqueta Materia Prima"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: requerimientos.map((req) => ({
                    label: req,
                    value: req,
                  })),
                })
              }
            ></Column>
            <Column
              field="peso_unidad"
              header="Peso Unidad"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="humedad"
              header="Humedad (%)"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="temp"
              header="Temperatura (°C)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="brix"
              header="Brix"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="ph"
              header="pH"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="muestra"
              header="Muestra"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="replica"
              header="Réplica"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="unid_conforme"
              header="Unidades Conformes"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="unid_disconforme"
              header="Unidades Disconformes"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="resultado"
              header="Resultado"
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
          <strong>INFORMACION PRODUCTO:</strong>
        </h3>
        <Divider />
        <div className="field">
          <label htmlFor="producto" className="font-bold">
            Producto{" "}
            {submitted && !registro.producto && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="producto"
            value={registro.producto}
            onChange={(e) => onInputChange(e, "producto")}
            required
            autoFocus
          />
          <br />
          <label htmlFor="fec_vencimiento" className="font-bold">
            Fecha Vencimiento{" "}
            {submitted && !registro.fec_vencimiento && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fec_vencimiento"
            value={registro.fec_vencimiento}
            onChange={(e) => onInputChange(e, "fec_vencimiento")}
            required
          />
          <br />
          <label htmlFor="cantidad_unidades" className="font-bold">
            Cantidad Unidades{" "}
            {submitted && !registro.cantidad_unidades && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cantidad_unidades"
            value={registro.cantidad_unidades}
            onChange={(e) => onInputChange(e, "cantidad_unidades")}
            required
          />
          <Divider />
          <h3>
            <strong>ENCARGADO DEL TRANSPORTE:</strong>
          </h3>
          <Divider />
          <br />
          <label htmlFor="nom_encargado_transporte" className="font-bold">
            Nombre Completo{" "}
            {submitted && !registro.nom_encargado_transporte && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="nom_encargado_transporte"
            value={registro.nom_encargado_transporte}
            onChange={(e) => onInputChange(e, "nom_encargado_transporte")}
            required
          />
          <br />
          <label htmlFor="identificacion" className="font-bold">
            Identificacion{" "}
            {submitted && !registro.identificacion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="identificacion"
            value={registro.identificacion}
            onChange={(e) => onInputChange(e, "identificacion")}
            required
          />
          <br />
          <label htmlFor="placa_vehiculo" className="font-bold">
            Placa Vehiculo{" "}
            {submitted && !registro.placa_vehiculo && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="placa_vehiculo"
            value={registro.placa_vehiculo}
            onChange={(e) => onInputChange(e, "placa_vehiculo")}
            required
          />
          <br />
          <Divider />
          <h3>
            <strong>REQUERIMIENTOS:</strong>
          </h3>
          <Divider />
          <h4>
            <strong>CONDICIONES DEL TRANSPORTE:</strong>
          </h4>
          <Divider />
          <label htmlFor="trans_limpioyordenado" className="font-bold">
            Transporte Limpio y Ordenado{" "}
            {submitted && !registro.trans_limpioyordenado && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="trans_limpioyordenado"
            value={registro.trans_limpioyordenado}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "trans_limpioyordenado")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <label htmlFor="trans_sin_materiales_quimicos" className="font-bold">
            Tamaño{" "}
            {submitted && !registro.trans_sin_materiales_quimicos && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="trans_sin_materiales_quimicos"
            value={registro.trans_sin_materiales_quimicos}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "trans_sin_materiales_quimicos")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <label htmlFor="trans_libre_plagas" className="font-bold">
            Transporte Libre de Plagas{" "}
            {submitted && !registro.trans_libre_plagas && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="trans_libre_plagas"
            value={registro.trans_libre_plagas}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "trans_libre_plagas")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <Divider />
          <h4>
            <strong>CONDICIONES DE LAS MATERIAS PRIMAS:</strong>
          </h4>
          <Divider />
          <label htmlFor="mat_prima_limpiayordenada" className="font-bold">
            Materia Prima Limpia y Ordenada{" "}
            {submitted && !registro.mat_prima_limpiayordenada && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="mat_prima_limpiayordenada"
            value={registro.mat_prima_limpiayordenada}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "mat_prima_limpiayordenada")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <label htmlFor="producto_sellado" className="font-bold">
            Producto Sellado{" "}
            {submitted && !registro.producto_sellado && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="producto_sellado"
            value={registro.producto_sellado}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "producto_sellado")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <label htmlFor="mat_prima_etiqueta" className="font-bold">
            Materia Prima con su Respectiva Etiqueta{" "}
            {submitted && !registro.mat_prima_etiqueta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="mat_prima_etiqueta"
            value={registro.mat_prima_etiqueta}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "mat_prima_etiqueta")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <label htmlFor="mat_prima_sin_perforaciones" className="font-bold">
            Materia Prima sin Presencia de Perforaciones{" "}
            {submitted && !registro.mat_prima_sin_perforaciones && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="mat_prima_sin_perforaciones"
            value={registro.mat_prima_sin_perforaciones}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "mat_prima_sin_perforaciones")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <label htmlFor="caracteristica" className="font-bold">
            Caracteristica (Olor, Color, Textura){" "}
            {submitted && !registro.caracteristica && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="caracteristica"
            value={registro.caracteristica}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "caracteristica")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <label htmlFor="mat_prima_peso_etiqueta" className="font-bold">
            Materia Prima con el Peso Establecido en la Etiqueta{" "}
            {submitted && !registro.mat_prima_peso_etiqueta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="mat_prima_peso_etiqueta"
            value={registro.mat_prima_peso_etiqueta}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "mat_prima_peso_etiqueta")}
            placeholder="Selecciona una opción"
            required
          />
          <br />
          <Divider />
          <h3>
            <strong>PARAMETROS DEL PRODUCTO:</strong>
          </h3>
          <Divider />
          <label htmlFor="peso_unidad" className="font-bold">
            Peso por Unidad{" "}
            {submitted && !registro.peso_unidad && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="peso_unidad"
            value={registro.peso_unidad}
            onChange={(e) => onInputChange(e, "peso_unidad")}
          />
          <br />
          <label htmlFor="humedad" className="font-bold">
            Humedad (%){" "}
            {submitted && !registro.humedad && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.humedad && (
              <small className="p-error">
                Humedad Fuera de Rango (Por debajo de 13%).
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="humedad"
            value={registro.humedad}
            onChange={(e) => onInputChange(e, "humedad")}
          />
          <br />
          <label htmlFor="temp" className="font-bold">
            Temperatura (°C){" "}
            {submitted && !registro.temp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="temp"
            value={registro.temp}
            onChange={(e) => onInputChange(e, "temp")}
          />
          <br />
          <label htmlFor="brix" className="font-bold">
            Brix{" "}
            {submitted && !registro.brix && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="brix"
            value={registro.brix}
            onChange={(e) => onInputChange(e, "brix")}
          />
          <br />
          <label htmlFor="ph" className="font-bold">
            Ph{" "}
            {submitted && !registro.ph && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="ph"
            value={registro.ph}
            onChange={(e) => onInputChange(e, "ph")}
          />
          <br />
          <label htmlFor="muestra" className="font-bold">
            Muestra{" "}
            {submitted && !registro.muestra && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.muestra && (
              <small className="p-error">
                Muestra Fuera de Rango (5 en adelante).
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="muestra"
            value={registro.muestra}
            onChange={(e) => onInputChange(e, "muestra")}
          />
          <br />
          <label htmlFor="replica" className="font-bold">
            Replica{" "}
            {submitted && !registro.replica && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="replica"
            value={registro.replica}
            onChange={(e) => onInputChange(e, "replica")}
          />
          <br />
          <label htmlFor="unid_conforme" className="font-bold">
            Unidades Conformes{" "}
            {submitted && !registro.unid_conforme && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="unid_conforme"
            value={registro.unid_conforme}
            onChange={(e) => onInputChange(e, "unid_conforme")}
          />
          <br />
          <label htmlFor="unid_disconforme" className="font-bold">
            Unidades Disconformes{" "}
            {submitted && !registro.unid_disconforme && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="unid_disconforme"
            value={registro.unid_disconforme}
            onChange={(e) => onInputChange(e, "unid_disconforme")}
          />
          <br />
          <label htmlFor="resultado" className="font-bold">
            Resultado{" "}
            {submitted && !registro.resultado && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="resultado"
            value={registro.resultado}
            onChange={(e) => onInputChange(e, "resultado")}
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

export default RecepcionMateriasPrimas;
