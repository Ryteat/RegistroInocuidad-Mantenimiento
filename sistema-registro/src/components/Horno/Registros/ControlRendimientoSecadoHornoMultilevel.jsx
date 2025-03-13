import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControlRendimientoSecadoHornoMultilevel.css"; // Importa el CSS
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

function ControlRendimientoSecadoHornoMultilevel() {
  let emptyRegister = {
    fecha_registro: "",
    hora_registro: "",
    tipo_control: "",
    fecha_siembra: "",
    fecha_produccion: "",
    hora_proceso: "",
    larva_fresca_kg: "",
    cajas_totales: "",
    desecho_kg: "",
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
  const [lotes, setLotes] = useState([]);

  // Función para formatear la fecha en formato día/mes/año
  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0"); // Los meses comienzan en 0
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
  };

  // Función para convertir la fecha de día/mes/año a formato ISO (año-mes-día)
  const convertirFechaISO = (fecha) => {
    if (!fecha) return "";
    const [dia, mes, año] = fecha.split("/");
    return `${año}-${mes}-${dia}`;
  };

  // Opciones para el campo "tipo_control"
  const tiposControl = ["Prueba", "Control"];

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Rendimiento_Secado_Horno_Multilevel")
        .select();
      if (data) {
        // Formatear las fechas al formato día/mes/año
        const registrosFormateados = data.map((registro) => ({
          ...registro,
          fecha_registro: formatearFecha(registro.fecha_registro),
          fecha_siembra: formatearFecha(registro.fecha_siembra),
          fecha_produccion: formatearFecha(registro.fecha_produccion),
        }));
        setRegistros(registrosFormateados);
      }
    } catch {
      console.log("Error en la conexión a la base de datos");
    }
  };
  const fetchLotes = async () => {
    try {
      const { data, error } = await supabase
        .from("Lotes")
        .select() // Si solo necesitas el campo base_numero_lote, podrías especificarlo: .select("base_numero_lote")
        .in("etapa_actual", [
          "Cosecha",
          "HornoMul",
          "HornoMic",
          "ProductoTerminado",
        ]); // Filtra registros con etapa_actual igual a 'hatchery' o 'dieta'
      if (error) throw error;
      setLotes(data || []); // Actualiza el estado con los datos obtenidos
    } catch (err) {
      console.log("Error en la conexión a la base de datos Lotes", err);
    }
  };

  useEffect(() => {
    fetchRegistros();
    fetchLotes();
  }, []);

  const obtenerHoraActual = () => {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
  };

  const saveRegistro = async () => {
    setSubmitted(true);
    if (
      !registro.fecha_registro ||
      !registro.tipo_control ||
      !registro.fecha_siembra ||
      !registro.fecha_produccion ||
      !registro.hora_proceso ||
      !registro.larva_fresca_kg ||
      !registro.cajas_totales ||
      !registro.desecho_kg
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Llena todos los campos",
        life: 3000,
      });
      return;
    }

    const horaActual = obtenerHoraActual();
    const registroConHora = {
      ...registro,
      fecha_registro: convertirFechaISO(registro.fecha_registro),
      fecha_siembra: convertirFechaISO(registro.fecha_siembra),
      fecha_produccion: convertirFechaISO(registro.fecha_produccion),
      hora_registro: horaActual,
    };

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");

      // Verificar si el lote seleccionado existe
      const { data: loteExistente, error: loteError } = await supabase
        .from("Lotes")
        .select("base_numero_lote")
        .eq("base_numero_lote", registro.base_numero_lote)
        .single();

      if (loteError || !loteExistente) {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: `El lote ${registro.base_numero_lote} no existe.`,
          life: 3000,
        });
        return;
      }
      const { id, ...registroSinId } = registroConHora;
      const { data, error } = await supabase
        .from("Control_Rendimiento_Secado_Horno_Multilevel")
        .insert([registroSinId]);
      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(
          error.message || "Error desconocido al guardar en Supabase"
        );
      }
      // Actualizar la tabla Lotes con la nueva etapa_actual
      const { error: updateError } = await supabase
        .from("Lotes")
        .update({ etapa_actual: "HornoMul" }) // Cambia "Control de Rendimiento" por la etapa que corresponda
        .eq("base_numero_lote", registro.base_numero_lote);

      if (updateError) {
        console.error("Error al actualizar Lotes:", updateError);
        throw new Error(
          updateError.message || "Error desconocido al actualizar Lotes"
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
    doc.text("Registros de Control de Rendimiento y Secado", 14, 22);

    doc.autoTable({
      head: [
        [
          "Fecha Registro",
          "Hora Registro",
          "Tipo Control",
          "Fecha Siembra",
          "Fecha Producción",
          "Hora Proceso",
          "Larva Fresca (kg)",
          "Cajas Totales",
          "Desecho (kg)",
          "Observaciones",
        ],
      ],
      body: selectedRegistros.map((registro) => [
        formatearFecha(registro.fecha_registro),
        registro.hora_registro,
        registro.tipo_control,
        formatearFecha(registro.fecha_siembra),
        formatearFecha(registro.fecha_produccion),
        registro.hora_proceso,
        registro.larva_fresca_kg,
        registro.cajas_totales,
        registro.desecho_kg,
        registro.observaciones,
      ]),
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    doc.save("Control_Rendimiento_Secado_Horno_Multilevel.pdf");
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

    const headers = [
      "Fecha Registro",
      "Hora Registro",
      "Tipo Control",
      "Fecha Siembra",
      "Fecha Producción",
      "Hora Proceso",
      "Larva Fresca (kg)",
      "Cajas Totales",
      "Desecho (kg)",
      "Observaciones",
    ];
    const rows = selectedRegistros.map((registro) => [
      formatearFecha(registro.fecha_registro),
      registro.hora_registro,
      registro.tipo_control,
      formatearFecha(registro.fecha_siembra),
      formatearFecha(registro.fecha_produccion),
      registro.hora_proceso,
      registro.larva_fresca_kg,
      registro.cajas_totales,
      registro.desecho_kg,
      registro.observaciones,
    ]);

    const dataToExport = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, "Control_Rendimiento_Secado_Horno_Multilevel.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control de Rendimiento y Secado Horno Multilevel
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de control de rendimiento y secado. Aquí
            puedes gestionar los registros de producción.
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
              field="numero_lote"
              header="Número Lote"
              // editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column field="fecha_registro" header="Fecha Registro" sortable />
            <Column field="hora_registro" header="Hora Registro" sortable />
            <Column field="tipo_control" header="Tipo Control" sortable />
            <Column field="fecha_siembra" header="Fecha Siembra" sortable />
            <Column
              field="fecha_produccion"
              header="Fecha Producción"
              sortable
            />
            <Column field="hora_proceso" header="Hora Proceso" sortable />
            <Column
              field="larva_fresca_kg"
              header="Larva Fresca (kg)"
              sortable
            />
            <Column field="cajas_totales" header="Cajas Totales" sortable />
            <Column field="desecho_kg" header="Desecho (kg)" sortable />
            <Column field="observaciones" header="Observaciones" sortable />
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
          <label htmlFor="base_numero_lote" className="font-bold">
            Número de lote{" "}
            {submitted && !registro.base_numero_lote && (
              <small className="p-error">Requerido.</small>
            )}
          </label>

          <Dropdown
            value={registro.base_numero_lote}
            onChange={(e) => {
              setRegistro({ ...registro, base_numero_lote: e.value });
            }}
            options={[...(lotes || [])]}
            optionLabel="base_numero_lote" // Mostrar el campo "label" en el dropdown
            optionValue="base_numero_lote" // Guardar el valor de "base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
          />
          <br />
          <label htmlFor="fecha_registro" className="font-bold">
            Fecha Registro{" "}
            {submitted && !registro.fecha_registro && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_registro"
            value={registro.fecha_registro}
            onChange={(e) => onInputChange(e, "fecha_registro")}
            required
            autoFocus
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
            options={tiposControl}
            onChange={(e) => onInputChange(e, "tipo_control")}
            placeholder="Selecciona un tipo"
            required
          />
          <br />
          <label htmlFor="fecha_siembra" className="font-bold">
            Fecha Siembra{" "}
            {submitted && !registro.fecha_siembra && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_siembra"
            value={registro.fecha_siembra}
            onChange={(e) => onInputChange(e, "fecha_siembra")}
            required
          />
          <br />
          <label htmlFor="fecha_produccion" className="font-bold">
            Fecha Producción{" "}
            {submitted && !registro.fecha_produccion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_produccion"
            value={registro.fecha_produccion}
            onChange={(e) => onInputChange(e, "fecha_produccion")}
            required
          />
          <br />
          <label htmlFor="hora_proceso" className="font-bold">
            Hora Proceso{" "}
            {submitted && !registro.hora_proceso && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hora_proceso"
            value={registro.hora_proceso}
            onChange={(e) => onInputChange(e, "hora_proceso")}
            required
          />
          <br />
          <label htmlFor="larva_fresca_kg" className="font-bold">
            Larva Fresca (kg){" "}
            {submitted && !registro.larva_fresca_kg && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="larva_fresca_kg"
            value={registro.larva_fresca_kg}
            onChange={(e) => onInputChange(e, "larva_fresca_kg")}
            required
          />
          <br />
          <label htmlFor="cajas_totales" className="font-bold">
            Cajas Totales{" "}
            {submitted && !registro.cajas_totales && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cajas_totales"
            value={registro.cajas_totales}
            onChange={(e) => onInputChange(e, "cajas_totales")}
            required
          />
          <br />
          <label htmlFor="desecho_kg" className="font-bold">
            Desecho (kg){" "}
            {submitted && !registro.desecho_kg && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="desecho_kg"
            value={registro.desecho_kg}
            onChange={(e) => onInputChange(e, "desecho_kg")}
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

export default ControlRendimientoSecadoHornoMultilevel;
