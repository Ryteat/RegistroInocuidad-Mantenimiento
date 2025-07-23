import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo2 from "../../../assets/mosca.png";

function LimpiezaDesinfeccionEquiposMaquinariaPesada() {
  let emptyRegister = {
    fecha_registro: "",
    hora_registro: "",
    equipo: "",
    responsable: "",
    supervisor: "",
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

  const equipos = [
    { label: "Teletruk", value: "Teletruk" },
    { label: "Montacargas", value: "Montacargas" },
    { label: "Otro", value: "Otro" }
  ];
  
  const supervisores = [
    { label: "Fabián Jimenez Barboza", value: "Fabián Jimenez Barboza" },
    { label: "Hugo Leiva Araya", value: "Hugo Leiva Araya" },
    { label: "Otro", value: "Otro" }
  ];

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase.from("Limpieza_Desinfeccion_Equipos_Maquinaria_Pesada").select();
      if (data) {
        const registrosFormateados = data.map((registro) => ({
          ...registro,
          fecha_registro: formatearFecha(registro.fecha_registro),
        }));
        setRegistros(registrosFormateados);
      }
    } catch {
      console.log("Error en la conexión a la base de datos");
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
  };

  const convertirFechaISO = (fecha) => {
    if (!fecha) return "";
    const [dia, mes, año] = fecha.split("/");
    return `${año}-${mes}-${dia}`;
  };

  const obtenerHoraActual = () => {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
  };

  const saveRegistro = async () => {
    setSubmitted(true);

    if (!registro.equipo || !registro.responsable || !registro.supervisor) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Por favor, completa todos los campos obligatorios.",
        life: 3000,
      });
      return;
    }

    const fechaISO = new Date().toISOString().split('T')[0];
    const horaActual = obtenerHoraActual();

    const registroConFechaHora = {
      ...registro,
      fecha_registro: fechaISO,
      hora_registro: horaActual,
    };

    try {
      const { id, ...registroSinId } = registroConFechaHora;
      const { data, error } = await supabase
        .from("Limpieza_Desinfeccion_Equipos_Maquinaria_Pesada")
        .insert([registroSinId]);
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
      <div className="flex flex-wrap gap-2">
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

  const isFormValid = () => {
    return registro.equipo && registro.responsable && registro.supervisor;
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
        disabled={!isFormValid()}
      />
    </React.Fragment>
  );

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
    doc.text("Registros de Limpieza y Desinfección de Equipos y Maquinaria Pesada", 14, 22);

    doc.autoTable({
      head: [["Fecha Registro", "Hora Registro", "Equipo", "Responsable", "Supervisor", "Observaciones"]],
      body: selectedRegistros.map((registro) => [
        registro.fecha_registro,
        registro.hora_registro,
        registro.equipo,
        registro.responsable,
        registro.supervisor,
        registro.observaciones,
      ]),
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    doc.save("Limpieza_Desinfeccion_Equipos_Maquinaria_Pesada.pdf");
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

    const headers = ["Fecha Registro", "Hora Registro", "Equipo", "Responsable", "Supervisor", "Observaciones"];
    const rows = selectedRegistros.map((registro) => [
      registro.fecha_registro,
      registro.hora_registro,
      registro.equipo,
      registro.responsable,
      registro.supervisor,
      registro.observaciones,
    ]);

    const dataToExport = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, "Limpieza_Desinfeccion_Equipos_Maquinaria_Pesada.xlsx");
  };

  // Funciones de edición
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
        type="number"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      />
    );
  };

  const allowEdit = (rowData) => {
    return true; // Permitir edición en todas las filas
  };

  const onRowEditComplete = async ({ newData }) => {
    const { id, ...updatedData } = newData;
    try {
      const { error } = await supabase
        .from("Limpieza_Desinfeccion_Equipos_Maquinaria_Pesada")
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

  return (
    <>
      <div className="limpieza-desinfeccion-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Limpieza y Desinfección de Equipos y Maquinaria Pesada
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de limpieza y desinfección de equipos y maquinaria pesada. Aquí puedes gestionar los registros de limpieza y desinfección.
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
            <Column field="fecha_registro" header="Fecha Registro" sortable editor={(options) => dateEditor(options)} />
            <Column field="hora_registro" header="Hora Registro" sortable editor={(options) => timeEditor(options)} />
            <Column field="equipo" header="Equipo" sortable editor={(options) => textEditor(options)} />
            <Column field="responsable" header="Responsable" sortable editor={(options) => textEditor(options)} />
            <Column field="supervisor" header="Supervisor" sortable editor={(options) => textEditor(options)} />
            <Column field="observaciones" header="Observaciones" sortable editor={(options) => textEditor(options)} />
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
          <label htmlFor="equipo" className="font-bold">
            Equipo
          </label>
          <Dropdown
            id="equipo"
            value={registro.equipo}
            options={equipos}
            onChange={(e) => onInputChange(e, "equipo")}
            placeholder="Seleccione un equipo"
          />
          <br />

          <label htmlFor="responsable" className="font-bold">
            Responsable
          </label>
          <InputText
            id="responsable"
            value={registro.responsable}
            onChange={(e) => onInputChange(e, "responsable")}
          />
          <br />

          <label htmlFor="supervisor" className="font-bold">
            Supervisor
          </label>
          <Dropdown
            id="supervisor"
            value={registro.supervisor}
            options={supervisores}
            onChange={(e) => onInputChange(e, "supervisor")}
            placeholder="Seleccione un supervisor"
          />
          <br />

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

export default LimpiezaDesinfeccionEquiposMaquinariaPesada;