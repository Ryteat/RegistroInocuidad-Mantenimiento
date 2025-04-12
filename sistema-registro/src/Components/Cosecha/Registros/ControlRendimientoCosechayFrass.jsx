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
import "./ControlRendimientoCosechayFrass.css";

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

// Imports de exportar
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

function ControlRendimientoCosechayFrass() {
  let emptyRegister = {
    
    fec_cosecha: "",
    cant_cajas_cosechadas: "",
    cant_cajas_lote: 0,
    _originalCajas: 0, // Nuevo campo para almacenar el valor original
    kg_larva_fresca: "",
    cant_cajas_desechadas: "",
    kg_total_frass: "",
    kg_material_grueso: "",
    fec_registro: "",
    hor_registro: "",
    observaciones: "",
    
    tipo_produccion: "",
    tipo_control: "",
  };

  const [registros, setRegistros] = useState([]);
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
    cant_cajas_cosechadas: false,
    kg_larva_fresca: false,
    cant_cajas_desechadas: false, //Si es mayor a 0
    kg_total_frass: false,
    kg_material_grueso: false,
  });
  const [lotes, setLotes] = useState([]);

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

  const tiposControl = ["Prueba", "Control"];
  const tiposProduccion = ["Produccion", "Hatchery"];

  const fetchRegistros = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Control_Rendimiento_CosechayFrass")
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
            `numero_lote.ilike.%${lazyParams.globalFilter}%,fec_registro.ilike.%${lazyParams.globalFilter}%`
          );
        }

        const { data, error, count } = await query;

        if (error) throw error;
        setRegistros(data || []);
        setTotalRecords(count || 0);
      } catch (err) {
        console.error(
          "Error en la conexión a la base de datos Rendimiento Cosecha y Frass",
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
        .ilike("etapa_actual", "%Cosecha%"); // Busca "Cosecha" en cualquier posición del string

      if (error) throw error;
      setLotes(data || []);
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

    // Validar los campos con el nuevo rango dinámico
    const isCantCajasCosechadasInvalido =
      registro.cant_cajas_cosechadas < 0 ||
      registro.cant_cajas_cosechadas > registro.cant_cajas_lote;
    const isKgLarvaFrescaInvalido =
      registro.kg_larva_fresca < 0 || registro.kg_larva_fresca > 12000;
    const isCantCajasDesechadasInvalido = registro.cant_cajas_desechadas < 0; // Corregido: debe ser < 0
    const isKgTotalFrassInvalido =
      registro.kg_total_frass < 0 || registro.kg_total_frass > 6000;
    const isKgMaterialGruesoInvalido =
      registro.kg_material_grueso < 0 || registro.kg_material_grueso > 6000;

    // Actualizar el estado de errores
    const erroresValidacion = {
      cant_cajas_cosechadas: isCantCajasCosechadasInvalido,
      kg_larva_fresca: isKgLarvaFrescaInvalido,
      cant_cajas_desechadas: isCantCajasDesechadasInvalido,
      kg_total_frass: isKgTotalFrassInvalido,
      kg_material_grueso: isKgMaterialGruesoInvalido,
    };

    // Verificar si algún valor está fuera de rango
    const valoresFueraDeRango = Object.values(erroresValidacion).some(
      (error) => error
    );

    // Validación principal
    /*
    if (

      !registro.fec_cosecha ||
      !registro.cant_cajas_cosechadas ||
      !registro.kg_larva_fresca ||
      !registro.cant_cajas_desechadas ||
      !registro.kg_total_frass ||
      !registro.kg_material_grueso ||
      !registro.tipo_control ||
      !registro.tipo_produccion 
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Llena todos los campos obligatorios.",
        life: 3000,
      });
      return;
    }*/
    // Mostrar mensajes de error específicos para cada campo fuera de rango
    if (erroresValidacion.cant_cajas_cosechadas) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: `Cajas Cosechadas debe estar entre 0 y ${registro.cant_cajas_lote}`,
        life: 3000,
      });
      return; // Detener el proceso si hay un error
    }

    if (erroresValidacion.kg_larva_fresca) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Larva Fresca debe estar entre 0 y 12000 KG",
        life: 3000,
      });
      return; // Detener el proceso si hay un error
    }

    if (erroresValidacion.cant_cajas_desechadas) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Cajas Desechadas no puede ser menor que 0",
        life: 3000,
      });
      return; // Detener el proceso si hay un error
    }

    if (erroresValidacion.kg_total_frass) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Frass Fino Total debe estar entre 0 y 6000 KG",
        life: 3000,
      });
      return; // Detener el proceso si hay un error
    }

    if (erroresValidacion.kg_material_grueso) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Material Grueso debe estar entre 0 y 6000 KG",
        life: 3000,
      });
      return; // Detener el proceso si hay un error
    }

    // Si algún valor está fuera de rango y no hay observaciones, mostrar error
    if (valoresFueraDeRango && !registro.observaciones) {
      const camposInvalidos = Object.keys(erroresValidacion)
        .filter((key) => erroresValidacion[key])
        .map((key) => {
          switch (key) {
            case "cant_cajas_cosechadas":
              return `Cajas Cosechadas (0 - ${registro.cant_cajas_lote})`;
            case "kg_larva_fresca":
              return "Larva Fresca (0 - 12000 KG)";
            case "cant_cajas_desechadas":
              return "Cajas Desechadas (no puede ser menor que 0)";
            case "kg_total_frass":
              return "Frass Fino Total (0 - 6000 KG)";
            case "kg_material_grueso":
              return "Material Grueso (0 - 6000 KG)";
            default:
              return "";
          }
        })
        .join(", ");

      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: `Debe agregar observaciones. Campos inválidos: ${camposInvalidos}`,
        life: 3000,
      });
      return; // Detener el proceso si hay un error
    }

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");

      // Verificar si el lote seleccionado existe
      const { data: loteExistente, error: loteError } = await supabase
        .from("Lotes")
        .select("cant_cajas_cosecha")
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

      // Sumar cajas cosechadas y desechadas
      const totalCajasProcesadas =
        parseInt(registro.cant_cajas_cosechadas, 10) +
        parseInt(registro.cant_cajas_desechadas, 10);

      // Verificar si hay suficientes cajas para cosechar
      if (totalCajasProcesadas > loteExistente.cant_cajas_cosecha) {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: `No hay suficientes cajas para cosechar. Disponibles: ${loteExistente.cant_cajas_cosecha}`,
          life: 3000,
        });
        return;
      }

      // Actualizar Control_Rendimiento_CosechayFrass
      const { data, error } = await supabase
        .from("Control_Rendimiento_CosechayFrass")
        .insert([
          {
            base_numero_lote: registro.base_numero_lote,
            fec_cosecha: convertirFecha(registro.fec_cosecha),
            cant_cajas_cosechadas: registro.cant_cajas_cosechadas,
            kg_larva_fresca: registro.kg_larva_fresca,
            cant_cajas_desechadas: registro.cant_cajas_desechadas,
            kg_total_frass: registro.kg_total_frass,
            kg_material_grueso: registro.kg_material_grueso,
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,
            tipo_produccion: registro.tipo_produccion,
            tipo_control: registro.tipo_control,
          },
        ]);

      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(
          error.message || "Error desconocido al guardar en Supabase"
        );
      }

      // Actualizar Lotes
      const nuevasCajasCosecha =
        loteExistente.cant_cajas_cosecha - totalCajasProcesadas;

      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_cosecha: nuevasCajasCosecha,
          etapa_actual: "Cosecha",
          fecha_cosecha: currentDate,
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
        detail: "Registro guardado exitosamente",
        life: 3000,
      });

      // Limpia el estado
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
      // Calcular diferencia en cajas cosechadas y desechadas
      const diferenciaCosechadas =
        newData.cant_cajas_cosechadas - oldData.cant_cajas_cosechadas;
      const diferenciaDesechadas =
        newData.cant_cajas_desechadas - oldData.cant_cajas_desechadas;
      const diferenciaTotal = diferenciaCosechadas + diferenciaDesechadas;

      // Obtener cantidad actual del lote
      const { data: lote, error: loteError } = await supabase
        .from("Lotes")
        .select("cant_cajas_cosecha")
        .eq("base_numero_lote", oldData.base_numero_lote)
        .single();

      if (loteError) throw loteError;

      // Calcular nuevo valor
      const nuevasCajasCosecha = lote.cant_cajas_cosecha - diferenciaTotal;

      if (nuevasCajasCosecha < 0) {
        throw new Error("La cantidad de cajas no puede ser negativa");
      }

      // Verificar si hay suficientes cajas para cosechar
      if (diferenciaTotal > lote.cant_cajas_cosecha) {
        throw new Error(
          `No hay suficientes cajas para cosechar. Disponibles: ${lote.cant_cajas_cosecha}`
        );
      }

      // Actualizar Control_Rendimiento_CosechayFrass
      const { error: updateError } = await supabase
        .from("Control_Rendimiento_CosechayFrass")
        .update(newData)
        .eq("id", newData.id);

      if (updateError) throw updateError;

      // Actualizar Lotes
      const { error: loteUpdateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_cosecha: nuevasCajasCosecha,
          etapa_actual: "Cosecha",
        })
        .eq("base_numero_lote", oldData.base_numero_lote);

      if (loteUpdateError) throw loteUpdateError;

      // Actualizar estado local
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
    { field: "numero_lote", header: "Número Lote" },
    { field: "tipo_produccion", header: "Tipo Producción" },
    { field: "tipo_control", header: "Tipo Control" },
    { field: "fec_cosecha", header: "Fecha Cosecha" },
    { field: "cant_cajas_cosechadas", header: "Cajas Cosechadas" },
    { field: "kg_larva_fresca", header: "Larva Fresca (KG)" },
    { field: "cant_cajas_desechadas", header: "Cajas Desechadas" },
    { field: "kg_total_frass", header: "Total Frass (KG)" },
    { field: "kg_material_grueso", header: "Material Grueso (KG)" },
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
    doc.text("Registros de Control Rendimiento Cosecha y Frass", 14, 22);

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

    doc.save("Control Rendimiento Cosecha y Frass.pdf");
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
    XLSX.writeFile(wb, "Control Rendimiento Cosecha y Frass.xlsx");
  };

  return (
    <>
      <div className="controlrendcosechayfrass-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control de Rendimiento Cosecha y Frass
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control de Rendimiento Cosecha y Frass.
            Aquí puedes gestionar los registros de producción.
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
              field="fec_cosecha"
              header="Fecha Cosecha"
              editor={(options) => dateEditor(options)}
              sortable
            />
            <Column
              field="tipo_produccion"
              header="Tipo Producción"
              editor={(options) => textEditor(options)}
              sortable
            />
            <Column
              field="tipo_control"
              header="Tipo Control"
              editor={(options) => textEditor(options)}
              sortable
            />
            
            <Column
              field="cant_cajas_cosechadas"
              header="Cajas Cosechadas"
              sortable
              editor={(options) => numberEditor(options)}
            />
            <Column
              field="kg_larva_fresca"
              header="Larva Fresca (KG)"
              sortable
              editor={(options) => floatEditor(options)}
            />
            <Column
              field="cant_cajas_desechadas"
              header="Cajas Desechadas"
              sortable
              editor={(options) => numberEditor(options)}
            />
            <Column
              field="kg_total_frass"
              header="Total Frass (KG)"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="kg_material_grueso"
              header="Material Grueso (KG)"
              sortable
              editor={(options) => floatEditor(options)}
            />
            
            <Column
              field="observaciones"
              header="Observaciones"
              sortable
              editor={(options) => textEditor(options)}
            />
            <Column field="fec_registro" header="Fecha Registro" sortable />
            <Column field="hor_registro" header="Hora Registro" sortable />
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
            onChange={async (e) => {
              const loteSeleccionado = lotes.find(
                (l) => l.base_numero_lote === e.value
              );

              if (loteSeleccionado) {
                // Obtener datos actualizados del lote desde Supabase
                const { data: loteActual, error } = await supabase
                  .from("Lotes")
                  .select("cant_cajas_cosecha")
                  .eq("base_numero_lote", e.value)
                  .single();

                if (!error && loteActual) {
                  setRegistro({
                    ...registro,
                    base_numero_lote: e.value,
                    cant_cajas_lote: loteActual.cant_cajas_cosecha || 0,
                  });
                }
              }
            }}
            options={[...(lotes || [])]}
            optionLabel="base_numero_lote"
            optionValue="base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
            autoFocus
          />

          <br />
          <label htmlFor="fec_cosecha" className="font-bold">
            Fecha Cosecha{" "}
            {submitted && !registro.fec_cosecha && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fec_cosecha"
            value={registro.fec_cosecha}
            onChange={(e) => onInputChange(e, "fec_cosecha")}
            required
          />
          <br />
          <label htmlFor="cant_cajas_cosechadas" className="font-bold">
            Cajas Cosechadas (0 - {registro.cant_cajas_lote}){" "}
            
            {erroresValidacion.cant_cajas_cosechadas && (
              <small className="p-error">
                {`Cantidad Cajas Procesadas Fuera de rango 500 a ${registro.cant_cajas_lote}`}
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="cant_cajas_cosechadas"
            value={registro.cant_cajas_cosechadas}
            onChange={(e) => onInputChange(e, "cant_cajas_cosechadas")}
            required
          />
          <br />
          <label htmlFor="kg_larva_fresca" className="font-bold">
            Larva Fresca Estandar (KG) (0 - 12000){" "}
            
            {erroresValidacion.kg_larva_fresca && (
              <small className="p-error">
                Kg Larva Fresca fuera de rango 0 a 12000.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="kg_larva_fresca"
            value={registro.kg_larva_fresca}
            onChange={(e) => onInputChange(e, "kg_larva_fresca")}
            required
          />
          <br />
          <label htmlFor="cant_cajas_desechadas" className="font-bold">
            Cajas Desechadas (=0){" "}
            
            {erroresValidacion.cant_cajas_desechadas && (
              <small className="p-error">
                Kg Larva Fresca fuera de rango 0 a 12000.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="cant_cajas_desechadas"
            value={registro.cant_cajas_desechadas}
            onChange={(e) => onInputChange(e, "cant_cajas_desechadas")}
            required
          />
          <br />
          <label htmlFor="kg_total_frass" className="font-bold">
            Frass Fino Total (KG) (0 - 6000){" "}
            
            {erroresValidacion.kg_total_frass && (
              <small className="p-error">
                Kg Total Frass Fuera de rango 0 a 6000.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="kg_total_frass"
            value={registro.kg_total_frass}
            onChange={(e) => onInputChange(e, "kg_total_frass")}
            required
          />
          <br />
          <label htmlFor="kg_material_grueso" className="font-bold">
            Total Material Grueso (KG) (0 - 6000){" "}
            
            {erroresValidacion.kg_material_grueso && (
              <small className="p-error">
                Kg Material Grueso Fuera de rango 0 a 6000.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="kg_material_grueso"
            value={registro.kg_material_grueso}
            onChange={(e) => onInputChange(e, "kg_material_grueso")}
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
            options={tiposControl}
            onChange={(e) => onInputChange(e, "tipo_control")}
            placeholder="Selecciona un tipo"
            required
          />
          <br />

          <label htmlFor="tipo_produccion" className="font-bold">
            Tipo Producción{" "}
            {submitted && !registro.tipo_produccion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="tipo_produccion"
            value={registro.tipo_produccion}
            options={tiposProduccion}
            onChange={(e) => onInputChange(e, "tipo_produccion")}
            placeholder="Selecciona un tipo"
            required
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

export default ControlRendimientoCosechayFrass;
