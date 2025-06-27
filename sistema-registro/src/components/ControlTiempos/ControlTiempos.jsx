import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControlTiempos.css";
import supabase from "../../supabaseClient";
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
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo2 from "../../assets/mosca.png";

function ControlTiempos() {
  let emptyRegister = {
    fecha_registro: "",
    hora_paro: "",
    hora_arranque: "",
    area_paro: "",
    clase_paro: "",
    detalle_paro: "",
    cant_horas_paro: "",
    hora_registro: "",
    observaciones: "",
    operario: ""
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
  
  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const areasParo = [
    "Horno Multilevel",
    "Horno Microondas",
    "Empaque",
    "Tamizador",
    "Dieta",
  ];

  const clasesParo = [
    "A: Mantenimiento: fallo mecánico.",
    "B: Mantenimiento: fallo electrico.",
    "C: Inocuidad: limpieza industrial.",
    "D: Producción: falta de materia prima o material.",
    "E: Recurso humano: falta de mano de obra. ",
    "F: Calidad: defecto o fallos de producto.",
    "G: Salud ocupacional: riesgos, evacuación, seguridad u accidentes.",
    "H: Arranque y calentamiento de linea.",
    "I: Producción: se termina de procesar materia prima.",
    "J: Equipo mal armado.",
    "K: Recurso humano: reunión con personal.",
    "L: Tiempo de alimentación.",
    "M: Se termina turno de trabajo.",
    "N: Acumulación de producto en proceso.",
    "Ñ: Falta de cajas vacías/Falta de tarimas.",
    "O: Falta de espacio por acumulación de cajas sembradas a piso.",
    "P: Falta de 5DOLS para siembra.",
    "Q: En espera de liberación de tanda.",
    "R: Por falta de dieta en tolva para dosificar cajas.",
  ];

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase.from("Control_de_tiempos").select();
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

  const calcularHorasParo = (horaParo, horaArranque) => {
    if (!horaParo || !horaArranque) return "";

    const [horaParoH, horaParoM] = horaParo.split(":").map(Number);
    const [horaArranqueH, horaArranqueM] = horaArranque.split(":").map(Number);

    const diferenciaMinutos = (horaArranqueH * 60 + horaArranqueM) - (horaParoH * 60 + horaParoM);
    const horas = Math.floor(diferenciaMinutos / 60);
    const minutos = diferenciaMinutos % 60;

    return `${horas} horas y ${minutos} minutos`;
  };

  const saveRegistro = async () => {
    setSubmitted(true);
    if (
      !registro.hora_paro ||
      !registro.hora_arranque ||
      !registro.area_paro ||
      !registro.clase_paro ||
      !registro.detalle_paro ||
      !registro.operario
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
        .from("Control_de_tiempos")
        .insert([{
          hora_paro: registro.hora_paro,
          hora_arranque: registro.hora_arranque,
          area_paro: registro.area_paro,
          clase_paro: registro.clase_paro,
          detalle_paro: registro.detalle_paro,
          observaciones: registro.observaciones,
          cant_horas_paro: calcularHorasParo(registro.hora_paro, registro.hora_arranque),
          hora_registro: currentTime,
          fecha_registro: currentDate,
          operario: registro.operario
        }]);
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

  const allowEdit = (rowData) => {
    return rowData.name !== "Blue Band";
  };

  const onRowEditComplete = async ({ newData }) => {
    const { id, ...updatedData } = newData;
    try {
      const { error } = await supabase
        .from("Control_de_tiempos")
        .update({
          ...updatedData,
          cant_horas_paro: calcularHorasParo(newData.hora_paro, newData.hora_arranque)
        })
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

    if (name === "hora_paro" || name === "hora_arranque") {
      _registro.cant_horas_paro = calcularHorasParo(_registro.hora_paro, _registro.hora_arranque);
    }

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
    {field: "hora_paro", header: "Hora Paro"},
    {field: "hora_arranque", header: "Hora Arranque"},
    {field: "cant_horas_paro", header: "Cantidad Horas Paro"},
    {field: "area_paro", header: "Área Paro"},
    {field: "clase_paro", header: "Clase Paro"},
    {field: "detalle_paro", header: "Detalle Paro"},
    {field: "operario", header: "Operario"},
    {field: "observaciones", header: "Otras observaciones"},
    {field: "registrado", header: "Registrado"}
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
    doc.text("Registros de Control Rendimiento Cosecha y Frass", 14, 22);

    const exportData = selectedRegistros.map(({ fecha_registro, hora_registro, ...row }) => ({
      ...row,
      registrado: `${fecha_registro || ""} ${hora_registro || ""}`,
    }));

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
        doc.rect(startX, currentY + (index * maxHeightPerColumn), 180, maxHeightPerColumn, 'F');
        doc.setTextColor(255);
        doc.text(title, startX + 2, currentY + (index * maxHeightPerColumn) + 7);
        doc.setTextColor(...textColor);
        doc.text(`${value}`, startX + 90, currentY + (index * maxHeightPerColumn) + 7);
      });

      currentY += rowHeight;
    }

    doc.save("Control de Tiempos.pdf");
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

    const headers = cols.map(col => col.header);
    const exportData = selectedRegistros.map(({ fecha_registro, hora_registro, ...registro }) => ({
      ...registro,
      registrado: `${fecha_registro || ""} ${hora_registro || ""}`,
    }));

    const rows = exportData.map(registro => cols.map(col => registro[col.field]));

    const dataToExport = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);

    ws["!cols"] = cols.map(col => ({ width: Math.max(col.header.length, 10) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, "Control de Tiempos.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control de Tiempos
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de control de tiempos. Aquí puedes gestionar los registros de paros y arranques.
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
            <Column field="fecha_registro" header="Fecha Registro" sortable />
            <Column field="hora_registro" header="Hora Registro" sortable />
            <Column field="hora_paro" header="Hora Paro" editor={(options) => timeEditor(options)} sortable />
            <Column field="hora_arranque" header="Hora Arranque" editor={(options) => timeEditor(options)} sortable />
            <Column field="cant_horas_paro" header="Cantidad Horas Paro" editor={(options) => textEditor(options)} sortable />
            <Column field="area_paro" header="Área Paro" editor={(options) => textEditor(options)} sortable />
            <Column field="clase_paro" header="Clase Paro" editor={(options) => textEditor(options)} sortable />
            <Column field="detalle_paro" header="Detalle Paro" editor={(options) => textEditor(options)} sortable />
            <Column field="observaciones" header="Otras observaciones" editor={(options) => textEditor(options)} sortable />
            <Column field="operario" header="Operario" editor={(options) => textEditor(options)} sortable />
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
        <div className="field">
          <label htmlFor="hora_paro" className="font-bold">
            Hora Paro{" "}
            {submitted && !registro.hora_paro && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hora_paro"
            value={registro.hora_paro}
            onChange={(e) => onInputChange(e, "hora_paro")}
            required
          />
          <br />
          <label htmlFor="hora_arranque" className="font-bold">
            Hora Arranque{" "}
            {submitted && !registro.hora_arranque && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hora_arranque"
            value={registro.hora_arranque}
            onChange={(e) => onInputChange(e, "hora_arranque")}
            required
          />
          <br />
          <label htmlFor="area_paro" className="font-bold">
            Área Paro{" "}
            {submitted && !registro.area_paro && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="area_paro"
            value={registro.area_paro}
            options={areasParo}
            onChange={(e) => onInputChange(e, "area_paro")}
            placeholder="Selecciona un área"
            required
          />
          <br />
          <label htmlFor="clase_paro" className="font-bold">
            Clase Paro{" "}
            {submitted && !registro.clase_paro && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="clase_paro"
            value={registro.clase_paro}
            options={clasesParo}
            onChange={(e) => onInputChange(e, "clase_paro")}
            placeholder="Selecciona una clase"
            required
          />
          <br />
          <label htmlFor="detalle_paro" className="font-bold">
            Detalle Paro{" "}
            {submitted && !registro.detalle_paro && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="detalle_paro"
            value={registro.detalle_paro}
            onChange={(e) => onInputChange(e, "detalle_paro")}
            required
          />
          <br />
          <label htmlFor="operario" className="font-bold">
            Operario{" "}
            {submitted && !registro.operario && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="operario"
            value={registro.operario}
            onChange={(e) => onInputChange(e, "operario")}
            required
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
}

export default ControlTiempos;