import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControlDespachoLabPro.css"; // Importa el CSS
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

const ControlDespachoLabPro = () => {
  let emptyRegister = {
    operario_hatchery: "",
    coordinador_hatchery: "",
    coordinador_produccion: "",
    fecha_despacho: "",
    fecha_inoculacion: "",
    fecha_siembra_lote: "",
    num_viaje: "",
    cant_cajas: "",
    entregado_por: "",
    recibido_por: "",
    turno: "",
    destino: "",
    fecha_registro: "",
    hora_registro: "",
    observaciones: "",
    cant_cajas_despachoLabPro: 0,
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

  //Errores de validación
  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    num_viaje: false,
    cant_cajas: false,
  });
  const destino = ["Producción", "Hatchery"];
  const [lotes, setLotes] = useState([]);

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Despacho_5dols_LabPro")
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
        .in("etapa_actual", ["Hatchery"]); // Filtra registros con etapa_actual igual a 'hatchery' o 'dieta'
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

    // Validar los campos
    const isNumViajeInvalido =
      registro.num_viaje < 0 || registro.num_viaje > 20;
    const isCantCajasInvalido =
      registro.cant_cajas < 900 || registro.cant_cajas > 2200;

    // Actualizar el estado de errores
    setErroresValidacion({
      num_viaje: isNumViajeInvalido,
      cant_cajas: isCantCajasInvalido,
    });
    const valoresFueraDeRango = isNumViajeInvalido || isCantCajasInvalido;

    if (
      !registro.operario_hatchery ||
      !registro.coordinador_hatchery ||
      !registro.coordinador_produccion ||
      !registro.fecha_despacho ||
      !registro.fecha_inoculacion ||
      !registro.fecha_siembra_lote ||
      !registro.num_viaje ||
      !registro.cant_cajas ||
      !registro.entregado_por ||
      !registro.recibido_por ||
      !registro.turno ||
      !registro.destino
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
        num_viaje: isNumViajeInvalido,
        cant_cajas: isCantCajasInvalido,
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
      num_viaje: false,
      cant_cajas: false,
    });

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
      const { data, error } = await supabase
        .from("Control_Despacho_5dols_LabPro")
        .insert([
          {
            base_numero_lote: registro.base_numero_lote, // Lote seleccionado
            operario_hatchery: registro.operario_hatchery,
            coordinador_hatchery: registro.coordinador_hatchery,
            coordinador_produccion: registro.coordinador_produccion,
            fecha_despacho: convertirFecha(registro.fecha_despacho),
            fecha_inoculacion: convertirFecha(registro.fecha_inoculacion),
            fecha_siembra_lote: convertirFecha(registro.fecha_siembra_lote),
            num_viaje: registro.num_viaje,
            cant_cajas: registro.cant_cajas,
            entregado_por: registro.entregado_por,
            recibido_por: registro.recibido_por,
            turno: registro.turno,
            destino: registro.destino,
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
      let cajasDe1X1 = registro.cant_cajas / 2;

      const totalCajas =
        registro.cant_cajas_despachoLabPro + cajasDe1X1;
      // Actualizar la tabla Lotes con la nueva etapa_actual
      
      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_despachoLabPro: totalCajas,
          cant_cajas_dieta: totalCajas,
          cant_cajas_despachodieta: totalCajas,
          etapa_actual: "DespachoHatchery",
        })
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
    const { id, ...updatedData } = newData;
    try {
      // 1. Obtener datos del lote
      const { data: lote, error: fetchError } = await supabase
        .from("Lotes")
        .select("etapa_actual")
        .eq("base_numero_lote", newData.base_numero_lote)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!lote) throw new Error("Lote no encontrado");

      // 2. Validar etapa
      if (lote.etapa_actual !== "DespachoHatchery") {
        throw new Error("Solo se puede editar en etapa 'DespachoHatchery'.");
      }

      // 3. Calcular NUEVAS CAJAS (¡ESTE ERA EL ERROR!)
      const nuevasCajas = newData.cant_cajas / 2; // Dividir directamente el nuevo valor
      
      if (nuevasCajas < 0) {
        throw new Error("La cantidad de cajas no puede ser negativa.");
      }

      // 4. Actualizar tablas
      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_despachoLabPro: nuevasCajas,
          cant_cajas_dieta: nuevasCajas,
          cant_cajas_despachodieta: nuevasCajas,
          cant_cajas_cosecha: nuevasCajas,
          cant_cajas_racks_salida: nuevasCajas,
        })
        .eq("base_numero_lote", newData.base_numero_lote);

      if (updateError) throw updateError;

      // 5. Actualizar tabla de control
      const { error: controlError } = await supabase
        .from("Control_Despacho_5dols_LabPro")
        .update(updatedData)
        .eq("id", id);

      if (controlError) throw controlError;

      // 6. Actualizar estado local
      setRegistros((prev) =>
        prev.map((n) => 
          n.id === id ? { ...n, ...newData, cant_cajas: newData.cant_cajas } : n
        )
      );

      toast.current.show({
        severity: "success",
        summary: "Actualizado",
        detail: "¡Cajas convertidas a 1x1 correctamente!",
        life: 3000,
      });

    } catch (err) {
      console.error("Error:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: err.message || "Error al procesar la solicitud",
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
    { field: "numero_lote", header: "Número Lote" },
    { field: "operario_hatchery", header: "Operario Hatchery" },
    { field: "coordinador_hatchery", header: "Coordinador Hatchery" },
    { field: "coordinador_produccion", header: "Coordinador Producción" },
    { field: "fecha_despacho", header: "Fecha Despacho" },
    { field: "fecha_inoculacion", header: "Fecha Inoculación" },
    { field: "fecha_siembra_lote", header: "Fecha Siembra Lote" },
    { field: "num_viaje", header: "N° Viaje" },
    { field: "cant_cajas", header: "Cant. Cajas" },
    { field: "entregado_por", header: "Entregado por" },
    { field: "recibido_por", header: "Recibido por" },
    { field: "turno", header: "Turno" },
    { field: "destino", header: "Destino" },
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
    doc.text("Registros de Control_Despacho_5dols_LabPro", 14, 22);

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

    doc.save("Control_Despacho_5dols_LabPro.pdf");
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
    XLSX.writeFile(wb, "Control_Despacho_5dols_LabPro.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control Despacho Laboratorio Producción
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control Despacho Laboratorio Producción.
            Aquí puedes gestionar los registros de Control Despacho Laboratorio
            Producción.
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
              field="numero_lote"
              header="Número Lote"
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="operario_hatchery"
              header="Operario Hatchery"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="coordinador_hatchery"
              header="Coordinador Hatchery"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="coordinador_produccion"
              header="Coordinador Producción"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="fecha_despacho"
              header="Fecha Despacho"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="fecha_inoculacion"
              header="Fecha Inoculación"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="fecha_siembra_lote"
              header="Fecha Siembra Lote"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="num_viaje"
              header="N° Viaje"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cant_cajas"
              header="Cant. Cajas"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="entregado_por"
              header="Entregado por"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="recibido_por"
              header="Recibido por"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="turno"
              header="Turno"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="destino"
              header="Destino"
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
        <h3>
          <strong>Control Despacho Lab - Producción</strong>
        </h3>
        <Divider />

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
                  .select("cant_cajas_despachoLabPro")
                  .eq("base_numero_lote", e.value)
                  .single();

                if (!error && loteActual) {
                  setRegistro({
                    ...registro,
                    base_numero_lote: e.value, // Usar e.value en lugar del objeto completo
                    cant_cajas_despachoLabPro:
                      loteActual.cant_cajas_despachoLabPro || 0,
                  });
                }
              }
            }}
            options={[...(lotes || [])]}
            optionLabel="base_numero_lote" // Mostrar el campo "label" en el dropdown
            optionValue="base_numero_lote" // Guardar el valor de "base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
          />
          <br />
          <label htmlFor="operario_hatchery" className="font-bold">
            Operario Hatchery{" "}
            {submitted && !registro.operario_hatchery && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="operario_hatchery"
            value={registro.operario_hatchery}
            onChange={(e) => onInputChange(e, "operario_hatchery")}
          />
        </div>
        <div className="field">
          <label htmlFor="coordinador_hatchery" className="font-bold">
            Coordinador Hatchery{" "}
            {submitted && !registro.coordinador_hatchery && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="coordinador_hatchery"
            value={registro.coordinador_hatchery}
            onChange={(e) => onInputChange(e, "coordinador_hatchery")}
          />
        </div>
        <div className="field">
          <label htmlFor="coordinador_produccion" className="font-bold">
            Coordinador Producción{" "}
            {submitted && !registro.coordinador_produccion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="coordinador_produccion"
            value={registro.coordinador_produccion}
            onChange={(e) => onInputChange(e, "coordinador_produccion")}
          />
        </div>
        <div className="field">
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
        </div>
        <div className="field">
          <label htmlFor="fecha_inoculacion" className="font-bold">
            Fecha Inoculación{" "}
            {submitted && !registro.fecha_inoculacion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_inoculacion"
            value={registro.fecha_inoculacion}
            onChange={(e) => onInputChange(e, "fecha_inoculacion")}
          />
        </div>
        <div className="field">
          <label htmlFor="fecha_siembra_lote" className="font-bold">
            Fecha Siembra Lote{" "}
            {submitted && !registro.fecha_siembra_lote && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_siembra_lote"
            value={registro.fecha_siembra_lote}
            onChange={(e) => onInputChange(e, "fecha_siembra_lote")}
          />
        </div>
        <div className="field">
          <label htmlFor="num_viaje" className="font-bold">
            N° Viaje{" "}
            {submitted && !registro.num_viaje && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.num_viaje && (
              <small className="p-error">Numero de Viaje fuera de rango.</small>
            )}
          </label>
          <InputText
            type="number"
            id="num_viaje"
            value={registro.num_viaje}
            onChange={(e) => onInputChange(e, "num_viaje")}
          />
        </div>
        <div className="field">
          <label htmlFor="cant_cajas" className="font-bold">
            Cant. Cajas{" "}
            {submitted && !registro.cant_cajas && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cant_cajas && (
              <small className="p-error">
                Cantidad de cajas fuera de rango.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="cant_cajas"
            value={registro.cant_cajas}
            onChange={(e) => onInputChange(e, "cant_cajas")}
          />
        </div>
        <div className="field">
          <label htmlFor="entregado_por" className="font-bold">
            Entregado por{" "}
            {submitted && !registro.entregado_por && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="entregado_por"
            value={registro.entregado_por}
            onChange={(e) => onInputChange(e, "entregado_por")}
          />
        </div>
        <div className="field">
          <label htmlFor="recibido_por" className="font-bold">
            Recibido por{" "}
            {submitted && !registro.recibido_por && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="recibido_por"
            value={registro.recibido_por}
            onChange={(e) => onInputChange(e, "recibido_por")}
          />
        </div>
        <div className="field">
          <label htmlFor="turno" className="font-bold">
            Turno{" "}
            {submitted && !registro.turno && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="turno"
            value={registro.turno}
            onChange={(e) => onInputChange(e, "turno")}
          />
        </div>
        <div className="field">
          <label htmlFor="destino" className="font-bold">
            Destino{" "}
            {submitted && !registro.destino && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="destino"
            value={registro.destino}
            options={destino}
            onChange={(e) => onInputChange(e, "destino")}
            placeholder="Selecciona un destino"
            required
          />
        </div>

        <div className="field">
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

export default ControlDespachoLabPro;
