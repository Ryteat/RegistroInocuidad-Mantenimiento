import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControlMovimientosCajasProceso.css"; // Importa el CSS
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

const RecepcionMateriasPrimas = () => {
  let emptyRegister = {
    coordinador_planta: "",
    tipo_dieta: "",
    cantidad_tarimas: "",
    total_cajas: "",
    responsable: "",
    fecha_registro: "",
    hora_registro: "",
    observaciones: "",
    cant_cajas_despachodieta: 0,
    _originalCajas: 0, // Nuevo campo para almacenar el valor original
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

  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    total_cajas: false,
  });

  const tipoDieta = ["Producción", "Reproducción"];

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Movimiento_Cajas_Proceso")
        .select();
      if (data) {
        setRegistros(data);
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
        .in("etapa_actual", ["Dieta"]); // Filtra registros con etapa_actual igual a 'hatchery' o 'dieta'
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
    function isInvalid(value, min, max) {
      return value < min || value > max;
    }

    const isTotalCajasInvalido = isInvalid(
      registro.total_cajas,
      0,
      registro.cant_cajas_despachodieta
    );

    setErroresValidacion({
      total_cajas: isTotalCajasInvalido,
    });

    const valoresFueraDeRango = isTotalCajasInvalido;
    if (
      !registro.coordinador_planta ||
      !registro.tipo_dieta ||
      !registro.cantidad_tarimas ||
      !registro.total_cajas ||
      !registro.responsable
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Llena todos los campos",
        life: 3000,
      });
      return;
    }
    if (
      registro.cajas_procesadas_neonatos > registro.cant_cajas_despachodieta
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: `No puedes procesar más cajas (${registro.cajas_procesadas_neonatos}) de las disponibles en el lote (${registro.cant_cajas_despachodieta})`,
        life: 3000,
      });
      return;
    }

    // Validación principal
    if (valoresFueraDeRango && !registro.observaciones) {
      setObservacionesObligatorio(true);
      const currentErrores = {
        "Total Cajas": isTotalCajasInvalido,
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
      total_cajas: false,
    });

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY"); // Fecha actual
      const currentTime = formatDateTime(new Date(), "hh:mm A"); // Hora actual

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
      const { data, error } = await supabase
        .from("Control_Movimiento_Cajas_Proceso")
        .insert([
          {
            base_numero_lote: registro.base_numero_lote,
            coordinador_planta: registro.coordinador_planta,
            tipo_dieta: registro.tipo_dieta,
            cantidad_tarimas: registro.cantidad_tarimas,
            total_cajas: registro.total_cajas,
            responsable: registro.responsable,
            fecha_registro: currentDate,
            hora_registro: currentTime,
            observaciones: registro.observaciones,
          },
        ]); //Cambiar aqui este insert y poner cada columna ya que las fechas se tienen que formatear
      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(
          error.message || "Error desconocido al guardar en Supabase"
        );
      }

      // Actualizar la tabla Lotes con la nueva etapa_actual
      const nuevasCajas =
        registro.cant_cajas_despachodieta - registro.total_cajas;

      // Actualizar la tabla Lotes con la nueva etapa_actual
      if (registro.tipo_dieta === "Producción") {
        const { error: updateError } = await supabase
          .from("Lotes")
          .update({
            cant_cajas_horno: registro.total_cajas,
            cant_cajas_despachodieta: nuevasCajas,
            etapa_actual: "DespachoDieta",
          })
          .eq("base_numero_lote", registro.base_numero_lote);
      
      if (updateError) {
        console.error("Error al actualizar Lotes:", updateError);
        throw new Error(
          updateError.message || "Error desconocido al actualizar Lotes"
        );
      }
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

  const onRowEditComplete = async ({ newData, data: oldData }) => {
    try {
      // 1. Calcular diferencia de cajas
      const diferencia =
        newData.cajas_procesadas_neonatos - oldData.cajas_procesadas_neonatos;

      // 2. Obtener lote actual
      const { data: lote, error: loteError } = await supabase
        .from("Lotes")
        .select("cant_cajas_despachodieta")
        .eq("base_numero_lote", oldData.base_numero_lote)
        .single();

      if (loteError) throw loteError;

      // 3. Calcular nuevo valor
      const nuevasCajas = lote.cant_cajas_despachodieta - diferencia;

      if (nuevasCajas < 0) {
        throw new Error("Cantidad de cajas no puede ser negativa");
      }

      // 4. Actualizar Control_Rendimiento_DietaySiembra
      const { error: updateError } = await supabase
        .from("Control_Movimiento_Cajas_Proceso")
        .update(newData)
        .eq("id", newData.id);

      if (updateError) throw updateError;

      // 5. Actualizar Lotes
      const { error: loteUpdateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_despachodieta: nuevasCajas,
        })
        .eq("base_numero_lote", oldData.base_numero_lote);

      if (loteUpdateError) throw loteUpdateError;

      // 6. Actualizar estado local
      setRegistros((prev) =>
        prev.map((item) => (item.id === newData.id ? newData : item))
      );
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error en edición",
        detail: error.message || "Error al actualizar el registro",
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
    { field: "base_numero_lote", header: "Número Lote" },
    { field: "coordinador_planta", header: "Coordinador de Planta" },
    { field: "tipo_dieta", header: "Tipo de Dieta" },
    { field: "cantidad_tarimas", header: "Cantidad de Tarimas" },
    { field: "total_cajas", header: "Total de Cajas" },
    { field: "responsable", header: "Responsable" },
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
    doc.text("Control_Movimiento_Cajas_Proceso", 14, 22);

    const exportData = selectedRegistros.map(
      ({ fecha_registro, hora_registro, ...row }) => ({
        ...row,
        registrado: `${fecha_registro || ""} ${hora_registro || ""}`,
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

    doc.save("Control_Movimiento_Cajas_Proceso.pdf");
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
      ({ fecha_registro, hora_registro, ...registro }) => ({
        ...registro,
        registrado: `${fecha_registro || ""} ${hora_registro || ""}`,
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
    XLSX.writeFile(wb, "Control_Movimiento_Cajas_Proceso.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control Movimientos Cajas en Proceso
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control Movimientos Cajas en Proceso. Aquí
            puedes gestionar los registros de Control Movimientos Cajas en
            Proceso.
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
            showGridlines
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
              field="numero_lote"
              header="Número Lote"
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="coordinador_planta"
              header="Coordinador de Planta"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="tipo_dieta"
              header="Tipo de Dieta"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: tipoDieta.map((dieta) => ({
                    label: dieta,
                    value: dieta,
                  })),
                })
              }
            ></Column>
            <Column
              field="cantidad_tarimas"
              header="Cantidad de Tarimas"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="total_cajas"
              header="Total de Cajas"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="responsable"
              header="Responsable"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column field="fecha_registro" header="Fecha de Registro"></Column>
            <Column field="hora_registro" header="Hora de Registro"></Column>
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
        <div className="field">
          <label htmlFor="base_numero_lote" className="font-bold">
            Número de lote{" "}
            {submitted && !registro.base_numero_lote && (
              <small className="p-error">Requerido.</small>
            )}
          </label>

          <Dropdown
            value={registro.base_numero_lote}
            onChange={async (e) => {
              const loteSeleccionado = lotes.find(
                (l) => l.base_numero_lote === e.value
              );

              if (loteSeleccionado) {
                const { data: loteActual, error } = await supabase
                  .from("Lotes")
                  .select("cant_cajas_despachodieta")
                  .eq("base_numero_lote", e.value)
                  .single();

                if (!error && loteActual) {
                  setRegistro({
                    ...registro,
                    base_numero_lote: e.value, // Usar e.value en lugar del objeto completo
                    cant_cajas_despachodieta:
                      loteActual.cant_cajas_despachodieta || 0,
                  });
                }
              }
            }}
            options={lotes.map((l) => l.base_numero_lote)} // Pasar solo los valores
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
          />
          <br />
          <label htmlFor="coordinador_planta" className="font-bold">
            Coordinador Planta{" "}
            {submitted && !registro.coordinador_planta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="coordinador_planta"
            value={registro.coordinador_planta}
            onChange={(e) => onInputChange(e, "coordinador_planta")}
          />

          <br />

          <label htmlFor="tipo_dieta" className="font-bold">
            Tipo Dieta{" "}
            {submitted && !registro.tipo_dieta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="tipo_dieta"
            value={registro.tipo_dieta}
            options={tipoDieta}
            onChange={(e) => onInputChange(e, "tipo_dieta")}
            placeholder="Selecciona una opción"
            required
          />

          <br />

          <label htmlFor="cantidad_tarimas" className="font-bold">
            Cantidad Tarimas{" "}
            {submitted && !registro.cantidad_tarimas && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="cantidad_tarimas"
            value={registro.cantidad_tarimas}
            onChange={(e) => onInputChange(e, "cantidad_tarimas")}
          />

          <br />

          <label htmlFor="total_cajas" className="font-bold">
            Cajas Totales (0 - {registro.cant_cajas_despachodieta}){" "}
            {submitted && !registro.total_cajas && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.total_cajas && (
              <small className="p-error">
                {`Cantidad Total Cajas debe de ser entre 0 y ${registro.cant_cajas_despachodieta}`}
              </small>
            )}
          </label>
          <InputText
            id="total_cajas"
            value={registro.total_cajas}
            onChange={(e) => onInputChange(e, "total_cajas")}
          />

          <br />

          <label htmlFor="responsable" className="font-bold">
            Responsable{" "}
            {submitted && !registro.responsable && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="responsable"
            value={registro.responsable}
            onChange={(e) => onInputChange(e, "responsable")}
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
};
export default RecepcionMateriasPrimas;
