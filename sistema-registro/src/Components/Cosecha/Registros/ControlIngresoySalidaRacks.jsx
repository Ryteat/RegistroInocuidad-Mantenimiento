import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";

// Imports de estilos
import logo2 from "../../../assets/mosca.png";
import "./ControlIngresoySalidaRacks.css";

// Imports de Supabase
import supabase from "../../../supabaseClient";

// PRIME REACT
import "primereact/resources/themes/bootstrap4-light-blue/theme.css"; //theme
import "primeicons/primeicons.css"; //icons

// PRIME REACT COMPONENTS
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Toolbar } from "primereact/toolbar";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";

// Imports de exportar
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

function ControlIngresoySalidaRacks() {
  let emptyRegister = {
    numero_lote: "",
    ingresoysalida: "",
    base_numero_lote: "",
    destino: "",
    total_cajas: "",
    responsable: "",
    fec_registro: "",
    hor_registro: "",
    observaciones: "",
    etapas_actualizar: [],
    cant_cajas_lote: "",
    _originalCajas: "", // Nuevo campo para almacenar el valor original
  };

  const [registros, setRegistros] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [registro, setRegistro] = useState(emptyRegister);
  const toast = useRef(null);
  const dt = useRef(null);
  const [selectedRegistros, setSelectedRegistros] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [registroDialog, setRegistroDialog] = useState(false);
  const [outOfRange, setOutOfRange] = useState(false); // Estado para controlar si algún valor está fuera de rango
  const navigate = useNavigate();

  //Errores de validación
  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    total_cajas: false,
  });

  const IngresoySalida = ["Ingreso", "Salida"];
  const destino = ["Producción", "Hatchery", "Frass", "Vacías", "Pruebas", "Otros (especifique en las observacines)"];
  const responsable = ["Cristian", "Carlos", "Arlyn"];

  // Nuevos estados para lazy loading
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    page: 1,
    sortField: null,
    sortOrder: null,
    filters: {},
    globalFilter: null,
  });

  //Inicio de Sorting y Filtro global por lazy load
  // Manejar sorting
  const onSort = useCallback((event) => {
    setLazyParams((prev) => ({
      ...prev,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
    }));
  }, []);

  // Manejar filtro global
  const onFilter = useCallback((e) => {
    const value = e.target.value;
    setGlobalFilter(value);
    setLazyParams((prev) => ({
      ...prev,
      globalFilter: value,
      first: 0,
    }));
  }, []);
  //FIN de Sorting y Filtro global por lazy load

  const fetchRegistros = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Control_Ingreso_Salida_Racks")
          .select("*", { count: "exact" })
          .range(start, start + limit - 1);
        // Ordenar por defecto por fecha descendente (más nuevos primero)
        // .order("fec_registro", { ascending: false });

        // Aplicar sorting
        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

        // Aplicar filtro global
        if (lazyParams.globalFilter) {
          query = query.or(
            `base_numero_lote.ilike.%${lazyParams.globalFilter}%,fec_registro.ilike.%${lazyParams.globalFilter}%`
          );
        }

        const { data, error, count } = await query;

        if (error) throw error;
        setRegistros(data || []);
        setTotalRecords(count || 0);
      } catch (err) {
        console.error(
          "Error en la conexión a la base de datos Ingreso Salida Racks",
          err
        );
      } finally {
        setLoading(false);
      }
    },
    [lazyParams.sortField, lazyParams.sortOrder, lazyParams.globalFilter]
  );
  const fetchLotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("Lotes")
        .select()
        .or(
          "etapa_actual.ilike.%DespachoDieta%," +
          "etapa_actual.ilike.%Engorde%," +
          "etapa_actual.ilike.%Cosecha%," +
          "etapa_actual.ilike.%Horno%"
        )
        .not("etapa_actual", "ilike", "%ProductoTerminado%")
        .order("fecha_registro", { ascending: false });
      if (error) throw error;
      setLotes(data || []); // Actualiza el estado con los datos obtenidos
    } catch (err) {
      console.log("Error en la conexión a la base de datos Lotes", err);
    }
  }, []);

  useEffect(() => {
    fetchRegistros(lazyParams.first, lazyParams.rows);
    fetchLotes();
  }, [
    fetchRegistros,
    lazyParams.first,
    lazyParams.rows,
    lazyParams.sortField,
    lazyParams.sortOrder,
    lazyParams.globalFilter,
  ]);

  // Manejar cambio de página y lazy loading
  const onPage = useCallback(
    (event) => {
      setLazyParams({
        ...lazyParams,
        first: event.first,
        rows: event.rows,
        page: event.page + 1,
      });
    },
    [lazyParams]
  );
  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";
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

  const saveRegistro = useCallback(async () => {
    setSubmitted(true);

    // Función auxiliar para validar rangos
    function isInvalid(value, min, max) {
      return value < min || value > max;
    }

    // Validación del total de cajas según el tipo de operación
    const isTotalCajasInvalido =
      registro.ingresoysalida === "Salida"
        ? isInvalid(registro.total_cajas, 0, registro.cant_cajas_lote)
        : registro.total_cajas <= 0; // Para Ingreso se debe ser mayor a 0

    setErroresValidacion({
      total_cajas: isTotalCajasInvalido,
    });

    // Validación de campos obligatorios
    if (
      !registro.base_numero_lote ||
      !registro.ingresoysalida ||
      !registro.destino ||
      !registro.total_cajas ||
      !registro.responsable
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Llena todos los campos obligatorios.",
        life: 3000,
      });
      return;
    }

    // Validación específica para salidas
    if (
      registro.ingresoysalida === "Salida" &&
      registro.etapas_actualizar.length === 0
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Debe seleccionar al menos una etapa para salidas",
        life: 3000,
      });
      return;
    }

    const totalCajasNum = registro.total_cajas;

    // Validación de valores negativos
    if (totalCajasNum < 0) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "El total de cajas no puede ser negativo",
        life: 3000,
      });
      return;
    }

    try {
      // Obtener fecha y hora actuales en el formato deseado
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");

      // Insertar el registro en Control_Ingreso_Salida_Racks
      const { data, error } = await supabase
        .from("Control_Ingreso_Salida_Racks")
        .insert([
          {
            ingresoysalida: registro.ingresoysalida,
            base_numero_lote: registro.base_numero_lote,
            destino: registro.destino,
            total_cajas: registro.total_cajas,
            responsable: registro.responsable,
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,
          },
        ]);

      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(
          error.message || "Error desconocido al guardar en Supabase"
        );
      }

      // Buscar el lote en el estado local para evitar una consulta extra
      const loteExistente = lotes.find(
        (l) => l.base_numero_lote === registro.base_numero_lote
      );

      if (!loteExistente) {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: `El lote ${registro.base_numero_lote} no existe.`,
          life: 3000,
        });
        return;
      }

      // Validación y actualización según el tipo de operación
      // Lógica para Ingresos (Entrada a racks)
      if (registro.ingresoysalida === "Ingreso") {
        // Validar cantidad positiva
        if (totalCajasNum <= 0) {
          mostrarError("La cantidad para ingreso debe ser mayor a 0");
          return;
        }

        // Validar que hay suficientes cajas disponibles en ingreso
        if ((loteExistente.cant_cajas_racks_ingreso ?? 0) < totalCajasNum) {
          mostrarError(
            `Cajas disponibles para ingreso: ${
              loteExistente.cant_cajas_racks_ingreso ?? 0
            }`
          );
          return;
        }
        // Actualización CORRECTA para ingresos
        const { error } = await supabase
          .from("Lotes")
          .update({
            cant_cajas_racks_ingreso:
              (loteExistente.cant_cajas_racks_ingreso ?? 0) - totalCajasNum, // Restar de ingreso
            cant_cajas_racks_salida:
              (loteExistente.cant_cajas_racks_salida ?? 0) + totalCajasNum, // Sumar a salida
            fecha_engorde: new Date().toISOString(),
            etapa_actual: "Engorde",
          })
          .eq("base_numero_lote", registro.base_numero_lote);

        if (error) throw error;
        // 🔽🔽🔽 NUEVO: Actualizar estado local 🔽🔽🔽
        setLotes((prevLotes) =>
          prevLotes.map((lote) =>
            lote.base_numero_lote === registro.base_numero_lote
              ? {
                  ...lote,
                  cant_cajas_racks_ingreso:
                    (lote.cant_cajas_racks_ingreso ?? 0) - totalCajasNum,
                  cant_cajas_racks_salida:
                    (lote.cant_cajas_racks_salida ?? 0) + totalCajasNum,
                }
              : lote
          )
        );
      }

      // Lógica para Salidas
      else if (registro.ingresoysalida === "Salida") {
        // Validar cantidad positiva
        if (totalCajasNum <= 0) {
          mostrarError("La cantidad para salida debe ser mayor a 0");
          return;
        }

        // Validar stock disponible en salida
        if ((loteExistente.cant_cajas_racks_salida ?? 0) < totalCajasNum) {
          mostrarError(
            `Cajas disponibles para salida: ${
              loteExistente.cant_cajas_racks_salida ?? 0
            }`
          );
          return;
        }

        // Salida a Producción
        if (registro.destino === "Producción") {
          const { error } = await supabase
            .from("Lotes")
            .update({
              cant_cajas_racks_salida:
                (loteExistente.cant_cajas_racks_salida ?? 0) - totalCajasNum,
              cant_cajas_horno:
                (loteExistente.cant_cajas_horno ?? 0) + totalCajasNum,
              cant_cajas_cosecha:
                (loteExistente.cant_cajas_cosecha ?? 0) + totalCajasNum,
              etapa_actual:
                registro.etapas_actualizar?.join(", ") ||
                loteExistente.etapa_actual,
            })
            .eq("base_numero_lote", registro.base_numero_lote);

          if (error) throw error;
          // 🔽🔽🔽 NUEVO: Actualizar estado local (producción) 🔽🔽🔽
          setLotes((prevLotes) =>
            prevLotes.map((lote) =>
              lote.base_numero_lote === registro.base_numero_lote
                ? {
                    ...lote,
                    cant_cajas_racks_salida:
                      (lote.cant_cajas_racks_salida ?? 0) - totalCajasNum,
                    cant_cajas_horno:
                      (lote.cant_cajas_horno ?? 0) + totalCajasNum,
                    cant_cajas_cosecha:
                      (lote.cant_cajas_cosecha ?? 0) + totalCajasNum,
                  }
                : lote
            )
          );
        }
        // Otras Salidas
        else {
          const { error } = await supabase
            .from("Lotes")
            .update({
              cant_cajas_racks_salida:
                (loteExistente.cant_cajas_racks_salida ?? 0) - totalCajasNum,
                etapa_actual:
                registro.etapas_actualizar?.join(", ") ||
                loteExistente.etapa_actual,
            })
            .eq("base_numero_lote", registro.base_numero_lote);

          if (error) throw error;
          // 🔽🔽🔽 NUEVO: Actualizar estado local (otras salidas) 🔽🔽🔽
          setLotes((prevLotes) =>
            prevLotes.map((lote) =>
              lote.base_numero_lote === registro.base_numero_lote
                ? {
                    ...lote,
                    cant_cajas_racks_salida:
                      (lote.cant_cajas_racks_salida ?? 0) - totalCajasNum,
                  }
                : lote
            )
          );
        }
      }

      toast.current.show({
        severity: "success",
        summary: "Exitoso",
        detail: "Registro guardado exitosamente",
        life: 3000,
      });

      // Limpiar el estado y actualizar registros
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
  }, [registro, lotes, convertirFecha]);

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

  const onRowEditComplete = async ({ newData, data: oldData }) => {
    try {
      // Calcular la diferencia en cajas (puede ser positiva o negativa)
      const diferenciaTotal = newData.total_cajas - oldData.total_cajas;

      // Obtener la cantidad actual de cajas en racks para salida del lote
      const { data: lote, error: loteError } = await supabase
        .from("Lotes")
        .select("cant_cajas_racks_salida")
        .eq("base_numero_lote", oldData.base_numero_lote)
        .single();

      if (loteError) throw loteError;

      // Si se aumentan cajas, verificar que haya suficientes cajas para cosechar
      if (
        diferenciaTotal > 0 &&
        diferenciaTotal > lote.cant_cajas_racks_salida
      ) {
        throw new Error(
          `No hay suficientes cajas para cosechar. Disponibles: ${lote.cant_cajas_racks_salida}`
        );
      }

      // Calcular el nuevo valor para las cajas en racks: si diferenciaTotal es negativa, se suman cajas
      const nuevasCajasRacks = lote.cant_cajas_racks_salida - diferenciaTotal;

      if (nuevasCajasRacks < 0) {
        throw new Error("La cantidad de cajas no puede ser negativa");
      }

      // Actualizar la tabla de Control_Ingreso_Salida_Racks con los nuevos datos
      const { error: updateError } = await supabase
        .from("Control_Ingreso_Salida_Racks")
        .update(newData)
        .eq("id", newData.id);

      if (updateError) throw updateError;

      // Actualizar el lote: actualizar la cantidad de cajas en racks y cambiar la etapa a "Cosecha"
      const { error: loteUpdateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_racks_salida: nuevasCajasRacks,
          etapa_actual: "Cosecha",
        })
        .eq("base_numero_lote", oldData.base_numero_lote);

      if (loteUpdateError) throw loteUpdateError;

      // Actualizar el estado local con los nuevos datos
      setRegistros((prev) =>
        prev.map((item) => (item.id === newData.id ? newData : item))
      );

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro actualizado correctamente",
        life: 3000,
      });
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
        value={globalFilter}
        onInput={onFilter}
        placeholder="Buscar por Lote u Fecha de Registro"
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
    { field: "base_numero_lote", header: "Base Número Lote" },
    { field: "numero_lote", header: "Número Lote" },
    { field: "ingresoysalida", header: "Ingreso/Salida" },
    { field: "base_numero_lote", header: "Número de Lote" },
    { field: "detalle", header: "Detalle" },
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
    doc.text("Registros de ControlIngresoySalidaRacks", 14, 22);

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

    doc.save("ControlIngresoySalidaRacks.pdf");
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
    XLSX.writeFile(wb, "ControlIngresoySalidaRacks.xlsx");
  };

  return (
    <>
      <div className="controlrendcosechayfrass-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control de Ingreso y Salida de Racks
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control de Ingreso y Salida de Racks. Aquí
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
            onSort={onSort}
            sortField={lazyParams.sortField}
            sortOrder={lazyParams.sortOrder}
            lazy
            first={lazyParams.first}
            rows={lazyParams.rows}
            totalRecords={totalRecords}
            onPage={onPage}
            loading={loading}
            editMode="row"
            onRowEditComplete={onRowEditComplete}
            ref={dt}
            value={registros}
            selection={selectedRegistros}
            onSelectionChange={(e) => setSelectedRegistros(e.value)}
            globalFilter={globalFilter}
            header={header}
            paginator
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
            <Column
              field="base_numero_lote"
              header="Base Número Lote"
              // editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>

            <Column
              field="destino"
              header="Detalle"
              editor={(options) => textEditor(options)}
              sortable
            />
            <Column field="ingresoysalida" header="Ingresp/Salida" sortable />
            <Column field="total_cajas" header="Total Cajas" sortable />
            <Column
              field="responsable"
              header="Responsable"
              sortable
              editor={(options) => textEditor(options)}
            />
            <Column
              field="observaciones"
              header="Observaciones"
              sortable
              editor={(options) => textEditor(options)}
            />
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
            filter
            onChange={(e) => {
              setRegistro((prev) => ({
                ...prev,
                base_numero_lote: e.value,
              }));
            }}
            options={[...(lotes || [])]}
            optionLabel="base_numero_lote" // Mantenemos esto como valor base
            optionValue="base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
            autoFocus
            itemTemplate={(option) => (
              <div className="flex justify-between">
                <span>{option.base_numero_lote}</span>
                <span className="text-gray-500 ml-2">
                  ({option.etapa_actual})
                </span>
              </div>
            )}
            valueTemplate={(option) =>
              option
                ? `${option.base_numero_lote} (${option.etapa_actual})`
                : "Selecciona un lote"
            }
          />
          <br />
          <label htmlFor="ingresoysalida" className="font-bold">
            Registro de Ingreso o Salida{" "}
            {submitted && !registro.ingresoysalida && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          {/* Dropdown de Ingreso/Salida - Modificar el onChange */}
          <Dropdown
            id="ingresoSalida"
            value={registro.ingresoysalida}
            options={IngresoySalida}
            placeholder="Selecciona si es ingreso o salida"
            required
            onChange={async (e) => {
              if (!registro.base_numero_lote) {
                console.error("Número de lote no está seleccionado.");
                return;
              }

              try {
                const seleccion = e.value;
                // Definir nuevas etapas y campo a consultar según la selección
                const nuevasEtapas = seleccion === "Ingreso" ? ["Engorde"] : [];
                const campo =
                  seleccion === "Ingreso"
                    ? "cant_cajas_racks_ingreso"
                    : "cant_cajas_racks_salida";
                // Consulta a Supabase para obtener la cantidad de cajas del lote
                const { data: loteActual, error } = await supabase
                  .from("Lotes")
                  .select(campo)
                  .eq("base_numero_lote", registro.base_numero_lote)
                  .single();

                if (error) {
                  console.error("Error al obtener el lote:", error);
                  return;
                }

                const cant_cajas = loteActual?.[campo] || 0;
                // Actualización del estado con los nuevos valores
                setRegistro((prev) => ({
                  ...prev,
                  ingresoysalida: seleccion,
                  etapas_actualizar: nuevasEtapas,
                  cant_cajas_lote: cant_cajas,
                }));
              } catch (error) {
                console.error("Error en onChange del Dropdown:", error);
              }
            }}
          />

          <br />
          <label htmlFor="destino" className="font-bold">
            Detalle{" "}
            {submitted && !registro.destino && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="destino"
            value={registro.destino}
            options={destino}
            onChange={(e) => onInputChange(e, "destino")}
            placeholder="Selecciona el detalle correspondiente"
            required
          />
          <br />
          <label htmlFor="total_cajas" className="font-bold">
            {registro.ingresoysalida === "Salida"
              ? `Total cajas (0 - ${registro.cant_cajas_lote})`
              : "Total cajas"}
            {submitted && !registro.total_cajas && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.total_cajas &&
              registro.ingresoysalida ===
                "Salida"(
                  <small className="p-error">
                    {`Cantidad debe ser entre 0 y ${registro.cant_cajas_lote}`}
                  </small>
                )}
          </label>
          <InputText
            type="number"
            id="total_cajas"
            value={registro.total_cajas}
            onChange={(e) => {
              const value = Math.max(0, e.target.value); // Forzar número positivo
              onInputChange({ target: { value } }, "total_cajas");
            }}
            required
            min={registro.ingresoysalida === "Salida" ? 0 : 1}
            max={
              registro.ingresoysalida === "Salida"
                ? registro.cant_cajas_lote
                : undefined
            }
          />
          {registro.total_cajas > registro.cant_cajas_lote && (
            <small className="p-error">
              Excede las {registro.cant_cajas_lote} cajas disponibles
            </small>
          )}

          {/* Sección de Etapas - Modificado */}
          {registro.ingresoysalida === "Salida" && (
            <>
              <label htmlFor="etapas_actualizar" className="font-bold">
                Etapas a actualizar{" "}
                {submitted && registro.etapas_actualizar.length === 0 && (
                  <small className="p-error">Requerido.</small>
                )}
              </label>
              <MultiSelect
                value={registro.etapas_actualizar}
                options={["Cosecha", "Horno"]}
                onChange={(e) =>
                  setRegistro({ ...registro, etapas_actualizar: e.value })
                }
                placeholder="Seleccione las etapas"
                className="w-full"
              />
            </>
          )}

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
            required
          />
          <br />
          <label htmlFor="observaciones" className="font-bold">
            Observaciones{" "}
            {observacionesObligatorio && (
              <small className="p-error">Requerido</small>
            )}
          </label>
          <InputText
            id="observaciones"
            value={registro.observaciones}
            onChange={(e) => onInputChange(e, "observaciones")}
            className={observacionesObligatorio ? "p-invalid" : ""}
          />
          <br />
        </div>
      </Dialog>
    </>
  );
}
export default ControlIngresoySalidaRacks;
