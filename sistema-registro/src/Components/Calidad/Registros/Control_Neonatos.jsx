import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Control_Neonatos.css"; // Importa el CSS
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

function Control_Neonatos() {
  let emptyRegister = {
    fecha_eclosion_huevos: "",
    fecha_despacho: "",
    temp_ambiental: "",
    hum_ambiental: "",
    temp_final_dieta: "",
    hum_final_dieta: "",
    peso_total_neonato: "",
    cantidad_neonatos: "",
    cantidad_neonatos_total: "",
    tamano_neonatos: "",
    cajas_sembradas: "",
    cumple_nocumple: "",
    tipo_control: "",
    inspector_calidad: "",
    encargado_inves_desa: "",
    fecha_registro: "",
    hora_registro: "",
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
  const tipoControl = ["Control", "Prueba"];

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase.from("Control_Neonatos").select();
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
      !registro.fecha_eclosion_huevos ||
      !registro.fecha_despacho ||
      !registro.temp_ambiental ||
      !registro.hum_ambiental ||
      !registro.temp_final_dieta ||
      !registro.hum_final_dieta ||
      !registro.peso_total_neonato ||
      !registro.cantidad_neonatos ||
      !registro.cantidad_neonatos_total ||
      !registro.tamano_neonatos ||
      !registro.cajas_sembradas ||
      !registro.cumple_nocumple ||
      !registro.tipo_control ||
      !registro.inspector_calidad ||
      !registro.encargado_inves_desa
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
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY"); // Fecha actual
      const currentTime = formatDateTime(new Date(), "hh:mm A"); // Hora actual

      const { data, error } = await supabase.from("Control_Neonatos").insert([
        {
          fecha_eclosion_huevos: convertirFecha(registro.fecha_eclosion_huevos),
          fecha_despacho: convertirFecha(registro.fecha_despacho),
          temp_ambiental: registro.temp_ambiental,
          hum_ambiental: registro.hum_ambiental,
          temp_final_dieta: registro.temp_final_dieta,
          hum_final_dieta: registro.hum_final_dieta,
          peso_total_neonato: registro.peso_total_neonato,
          cantidad_neonatos: registro.cantidad_neonatos,
          cantidad_neonatos_total: registro.cantidad_neonatos_total,
          tamano_neonatos: registro.tamano_neonatos,
          cajas_sembradas: registro.cajas_sembradas,
          cumple_nocumple: registro.cumple_nocumple,
          tipo_control: registro.tipo_control,
          inspector_calidad: registro.inspector_calidad,
          encargado_inves_desa: registro.encargado_inves_desa,
          fecha_registro: currentDate,
          hora_registro: currentTime,
          observaciones: registro.observaciones,
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
        .from("Control_Neonatos")
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
    { field: "tipo_control", header: "Tipo Control" },
    { field: "inspector_calidad", header: "Inspector Calidad" },
    { field: "fecha_eclosion_huevos", header: "Fecha Eclosión Huevos" },
    { field: "fecha_despacho", header: "Fecha Despacho" },
    { field: "temp_ambiental", header: "Temperatura Ambiental (°C)" },
    { field: "hum_ambiental", header: "Humedad Ambiental (%)" },
    { field: "temp_final_dieta", header: "Temperatura Final Dieta (°C)" },
    { field: "hum_final_dieta", header: "Humedad Final Dieta (%)" },
    { field: "peso_total_neonato", header: "Peso Total Neonato" },
    { field: "cantidad_neonatos", header: "Cantidad Neonatos" },
    { field: "cantidad_neonatos_total", header: "Cantidad Neonatos Total" },
    { field: "tamano_neonatos", header: "Tamaño Neonatos" },
    { field: "cajas_sembradas", header: "Cajas Sembradas" },
    { field: "cumple_nocumple", header: "Cumple/No Cumple" },
    {
      field: "encargado_inves_desa",
      header: "Encargado Inv y Des",
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
    doc.text("Registros de Control de Neonatos", 14, 22);

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

    doc.save("Control de Neonatos.pdf");
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
    XLSX.writeFile(wb, "Control de Neonatos.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>         
          <img src={logo2} alt="mosca" className="logo2" />
          Control Calidad Neonatos
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Calidad de Control de Neonatos. Aquí puedes
            gestionar los registros de Control de Neonatos.
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
              field="fecha_eclosion_huevos"
              header="Fecha Eclosión Huevos"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="fecha_despacho"
              header="Fecha Despacho"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="temp_ambiental"
              header="Temperatura Ambiental (°C)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="hum_ambiental"
              header="Humedad Ambiental (%)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="temp_final_dieta"
              header="Temperatura Final Dieta (°C)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="hum_final_dieta"
              header="Humedad Final Dieta (%)"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="peso_total_neonato"
              header="Peso Total Neonato"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="cantidad_neonatos"
              header="Cantidad Neonatos"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="cantidad_neonatos_total"
              header="Cantidad Neonatos Total"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="tamano_neonatos"
              header="Tamaño Neonatos"
              editor={(options) => floatEditor(options)}
            ></Column>
            <Column
              field="cajas_sembradas"
              header="Cajas Sembradas"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cumple_nocumple"
              header="Cumple/No Cumple"
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
              field="inspector_calidad"
              header="Inspector Calidad"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="encargado_inves_desa"
              header="Encargado Investigación y Desarrollo"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column field="fecha_registro" header="Fecha Registro"></Column>
                        <Column field="hora_registro" header="Hora Registro"></Column>
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
          <label htmlFor="inspector_calidad" className="font-bold">
            Inspector de Calidad{" "}
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

          <label htmlFor="encargado_inves_desa" className="font-bold">
            Encargado Investigación y Desarrollo{" "}
            {submitted && !registro.encargado_inves_desa && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="encargado_inves_desa"
            value={registro.encargado_inves_desa}
            onChange={(e) => onInputChange(e, "encargado_inves_desa")}
          />

          <br />

          <label htmlFor="fecha_eclosion_huevos" className="font-bold">
            Fecha Eclosion Huevos{" "}
            {submitted && !registro.fecha_eclosion_huevos && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_eclosion_huevos"
            value={registro.fecha_eclosion_huevos}
            onChange={(e) => onInputChange(e, "fecha_eclosion_huevos")}
          />

          <br />

          <label htmlFor="fecha_despacho" className="font-bold">
            Fecha Despacho{" "}
            {submitted && !registro.fecha_despacho && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_despacho"
            value={registro.fecha_despacho}
            onChange={(e) => onInputChange(e, "fecha_despacho")}
          />

          <br />

          <label htmlFor="temp_ambiental" className="font-bold">
            Temperatura Ambiental (°C){" "}
            {submitted && !registro.temp_ambiental && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="temp_ambiental"
            value={registro.temp_ambiental}
            onChange={(e) => onInputChange(e, "temp_ambiental")}
          />

          <br />

          <label htmlFor="hum_ambiental" className="font-bold">
            Humedad Ambiental (%){" "}
            {submitted && !registro.hum_ambiental && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="hum_ambiental"
            value={registro.hum_ambiental}
            onChange={(e) => onInputChange(e, "hum_ambiental")}
          />

          <br />

          <label htmlFor="temp_final_dieta" className="font-bold">
            Temperatura Final Dieta (°C){" "}
            {submitted && !registro.temp_final_dieta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="temp_final_dieta"
            value={registro.temp_final_dieta}
            onChange={(e) => onInputChange(e, "temp_final_dieta")}
          />

          <br />

          <label htmlFor="hum_final_dieta" className="font-bold">
            Humedad Final Dieta (%){" "}
            {submitted && !registro.hum_final_dieta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="hum_final_dieta"
            value={registro.hum_final_dieta}
            onChange={(e) => onInputChange(e, "hum_final_dieta")}
          />

          <br />

          <label htmlFor="peso_total_neonato" className="font-bold">
            Peso Total Neonato{" "}
            {submitted && !registro.peso_total_neonato && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="peso_total_neonato"
            value={registro.peso_total_neonato}
            onChange={(e) => onInputChange(e, "peso_total_neonato")}
          />

          <br />

          <label htmlFor="cantidad_neonatos" className="font-bold">
            Cantidad Neonatos / g{" "}
            {submitted && !registro.cantidad_neonatos && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cantidad_neonatos"
            value={registro.cantidad_neonatos}
            onChange={(e) => onInputChange(e, "cantidad_neonatos")}
          />

          <br />

          <label htmlFor="cantidad_neonatos_total" className="font-bold">
            Total Cantidad Neonatos{" "}
            {submitted && !registro.cantidad_neonatos_total && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cantidad_neonatos_total"
            value={registro.cantidad_neonatos_total}
            onChange={(e) => onInputChange(e, "cantidad_neonatos_total")}
          />

          <br />

          <label htmlFor="tamano_neonatos" className="font-bold">
            Tamaño Neonatos{" "}
            {submitted && !registro.tamano_neonatos && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="tamano_neonatos"
            value={registro.tamano_neonatos}
            onChange={(e) => onInputChange(e, "tamano_neonatos")}
          />

          <br />

          <label htmlFor="cajas_sembradas" className="font-bold">
            Cajas Sembradas{" "}
            {submitted && !registro.cajas_sembradas && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cajas_sembradas"
            value={registro.cajas_sembradas}
            onChange={(e) => onInputChange(e, "cajas_sembradas")}
          />

          <br />

          <label htmlFor="cumple_nocumple" className="font-bold">
            Cumple / No Cumple{" "}
            {submitted && !registro.cumple_nocumple && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="cumple_nocumple"
            value={registro.cumple_nocumple}
            options={requerimientos}
            onChange={(e) => onInputChange(e, "cumple_nocumple")}
            placeholder="Selecciona una opción"
            required
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
}
export default Control_Neonatos;
