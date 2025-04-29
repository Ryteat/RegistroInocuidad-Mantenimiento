import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import "./ControlRendimientoSecadoHornoMicroondas.css"; // Importa el CSS
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
    kg_minuto: "",
    velocidad_banda: "",
    temp_coccion: "",
    temp_agua: "",
    velocidad_turbina: "",
    fec_siembra: "",
    fec_produccion: "",
    hor_proceso: "",
    kg_larva_fresca: "",
    kg_desecho: "",
    hor_inicio: "",
    hor_fin: "",
    tipo_control: "",
    fec_registro: "",
    hor_registro: "",
    observaciones: "",
  };

  const [registros, setRegistros] = useState([]);
  const [registro, setRegistro] = useState(emptyRegister);
  const toast = useRef(null);
  const dt = useRef(null);
  const [selectedRegistros, setSelectedRegistros] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [registroDialog, setRegistroDialog] = useState(false);
  const navigate = useNavigate();
  const [lotes, setLotes] = useState([]);
  // Opciones para el campo "linea_produc"
  const lineasProduccion = ["Producción", "Reproducción"];
  const tipoControl = ["Control", "Prueba"];
  //Errores de validación
  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    //no tiene rangos
  });

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
          .from("Control_Rendimiento_Secado_Horno_Microondas")
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
          "Error en la conexión a la base de datos Secado Horno Multilevel",
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
        .ilike("etapa_actual", "%Horno%", "%ProductoTerminado%")
        .order("fecha_registro", { ascending: false }); // Busca "Horno" en cualquier posición del string

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
    if (
      !registro.kg_minuto ||
      !registro.velocidad_banda ||
      !registro.temp_coccion ||
      !registro.temp_agua ||
      !registro.velocidad_turbina ||
      !registro.fec_siembra ||
      !registro.fec_produccion ||
      !registro.hor_proceso ||
      !registro.kg_larva_fresca ||
      !registro.kg_desecho ||
      !registro.hor_inicio ||
      !registro.hor_fin ||
      !registro.tipo_control
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
      if(registro.base_numero_lote === "Sin Lote Asignado"){
        registro.base_numero_lote = null;
      }else{
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
    }
      const { data, error } = await supabase
        .from("Control_Rendimiento_Secado_Horno_Microondas")
        .insert([
          {
            base_numero_lote: registro.base_numero_lote, // Lote seleccionado
            kg_minuto: registro.kg_minuto,
            velocidad_banda: registro.velocidad_banda,
            temp_coccion: registro.temp_coccion,
            temp_agua: registro.temp_agua,
            velocidad_turbina: registro.velocidad_turbina,
            fec_siembra: convertirFecha(registro.fec_siembra),
            fec_produccion: convertirFecha(registro.fec_produccion),
            hor_proceso: registro.hor_proceso,
            kg_larva_fresca: registro.kg_larva_fresca,
            cajas_totales: registro.cajas_totales,
            kg_desecho: registro.kg_desecho,
            hor_inicio: registro.hor_inicio,
            hor_fin: registro.hor_fin,
            tipo_control: registro.tipo_control,
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,
          },
        ]); //Cambiar aqui este insert y poner cada columna ya que las fechas se tienen que formatear
      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(
          "Error en Supabase: Mirar consola para ver error" || "Error desconocido al guardar en Supabase"
        );
      }

      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          fecha_horneado: currentDate,
        })
        .eq("base_numero_lote", registro.base_numero_lote);

      if (updateError) {
        console.error("Error actualizando lote:", updateError);
        throw new Error("Error al actualizar información del lote");
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
onKeyDown={handleKeyPress}
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

  const handleKeyPress = (e) => {
    const invalidChars = ['e', 'E', '+', '-'];
    if (invalidChars.includes(e.key)) {
      e.preventDefault();
    }
    
    // Si es un campo decimal, permite un solo punto
    if (e.key === '.' && e.target.value.includes('.')) {
      e.preventDefault();
    }
  };

  const allowEdit = (rowData) => {
    return rowData.name !== "Blue Band";
  };

  const onRowEditComplete = async ({ newData, data: oldData }) => {
    try {
      // 1. Calcular diferencia de cajas
      const diferencia = newData.cajas_totales - oldData.cajas_totales;

      // 2. Actualizar Control_Rendimiento_DietaySiembra
      const { error: updateError } = await supabase
        .from("Control_Rendimiento_Secado_Horno_Multilevel")
        .update(newData)
        .eq("id", newData.id);

      if (updateError) throw updateError;

      // 3. Actualizar Lotes
      const { error: loteUpdateError } = await supabase
        .from("Lotes")
        .update({
          etapa_actual: "HornoMic",
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
    { field: "kg_minuto", header: "Kg Minuto" },
    { field: "velocidad_banda", header: "Velocidad Banda" },
    { field: "temp_coccion", header: "Temp Cocción" },
    { field: "temp_agua", header: "Temp Agua" },
    { field: "velocidad_turbina", header: "Velocidad Turbina" },
    { field: "fec_siembra", header: "Fecha Siembra" },
    { field: "fec_produccion", header: "Fecha Producción" },
    { field: "hor_proceso", header: "Hora Proceso" },
    { field: "kg_larva_fresca", header: "Kg Larva Fresca" },
    { field: "kg_desecho", header: "Kg Desecho" },
    { field: "hor_inicio", header: "Hora Inicio" },
    { field: "hor_fin", header: "Hora Fin" },
    { field: "tipo_control", header: "Tipo Control" },
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
    doc.text(
      "Registros de Control Rendimiento Secado Horno Microondas",
      14,
      22
    );

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

    doc.save("Control Rendimiento Secado Horno Microondas.pdf");
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
    XLSX.writeFile(wb, "Control Rendimiento Secado Horno Microondas.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control Rendimiento Secado Horno Microondas
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control Rendimiento Secado Horno
            Microondas. Aquí puedes gestionar los registros de Microondas.
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
              field="kg_minuto"
              header="Kg Minuto"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="velocidad_banda"
              header="Velocidad Banda"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="temp_coccion"
              header="Temp Cocción"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="temp_agua"
              header="Temp Agua"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="velocidad_turbina"
              header="Velocidad Turbina"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="fec_siembra"
              header="Fecha Siembra"
              editor={(options) => dateEditor(options)}
              sortable
            />
            <Column
              field="fec_produccion"
              header="Fecha Producción"
              editor={(options) => dateEditor(options)}
              sortable
            />
            <Column
              field="hor_proceso"
              header="Hora Proceso"
              editor={(options) => timeEditor(options)}
              sortable
            />
            <Column
              field="kg_larva_fresca"
              header="Kg Larva Fresca"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="kg_desecho"
              header="Kg Desecho"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="hor_inicio"
              header="Hora Inicio"
              editor={(options) => timeEditor(options)}
              sortable
            />
            <Column
              field="hor_fin"
              header="Hora Fin"
              editor={(options) => timeEditor(options)}
              sortable
            />
            <Column
              field="tipo_control"
              header="Tipo Control"
              editor={(options) => textEditor(options)}
              sortable
            />
            <Column field="fec_registro" header="Fecha Registro" sortable />
            <Column field="hor_registro" header="Hora Registro" sortable />
            <Column
              field="observaciones"
              header="Observaciones"
              editor={(options) => textEditor(options)}
              sortable
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
                      onChange={async (e) => {
                        setRegistro({
                          ...registro,
                          base_numero_lote: e.value,
                        });
                      }}
                      options={[
                        {
                          base_numero_lote: "Sin Lote Asignado"
                        },
                        ...(lotes || []),
                      ]}
                      optionLabel="base_numero_lote" // Mostrar el campo "label" en el dropdown
                      optionValue="base_numero_lote" // Guardar el valor de "base_numero_lote"
                      placeholder="Selecciona un Número de lote"
                      className="w-full md:w-14rem"
                    />
          <br />
          <label htmlFor="kg_minuto" className="font-bold">
            Kg Minuto{" "}
            {submitted && !registro.kg_minuto && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
onKeyDown={handleKeyPress}
            id="kg_minuto"
            value={registro.kg_minuto}
            onChange={(e) => onInputChange(e, "kg_minuto")}
            required
            autoFocus
          />
          <br />
          <label htmlFor="velocidad_banda" className="font-bold">
            Velocidad Banda{" "}
            {submitted && !registro.velocidad_banda && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
onKeyDown={handleKeyPress}
            id="velocidad_banda"
            value={registro.velocidad_banda}
            onChange={(e) => onInputChange(e, "velocidad_banda")}
            required
          />
          <br />
          <label htmlFor="temp_coccion" className="font-bold">
            Temp Coccion{" "}
            {submitted && !registro.temp_coccion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
onKeyDown={handleKeyPress}
            id="temp_coccion"
            value={registro.temp_coccion}
            onChange={(e) => onInputChange(e, "temp_coccion")}
            required
          />
          <br />
          <label htmlFor="temp_agua" className="font-bold">
            Temp Agua{" "}
            {submitted && !registro.temp_agua && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
onKeyDown={handleKeyPress}
            id="temp_agua"
            value={registro.temp_agua}
            onChange={(e) => onInputChange(e, "temp_agua")}
            required
          />
          <br />
          <label htmlFor="velocidad_turbina" className="font-bold">
            Velocidad Turbina{" "}
            {submitted && !registro.velocidad_turbina && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
onKeyDown={handleKeyPress}
            id="velocidad_turbina"
            value={registro.velocidad_turbina}
            onChange={(e) => onInputChange(e, "velocidad_turbina")}
            required
          />
          <br />
          <label htmlFor="fec_siembra" className="font-bold">
            Fecha Siembra{" "}
            {submitted && !registro.fec_siembra && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fec_siembra"
            value={registro.fec_siembra}
            onChange={(e) => onInputChange(e, "fec_siembra")}
            required
          />
          <br />
          <label htmlFor="fec_produccion" className="font-bold">
            Fecha Produccion{" "}
            {submitted && !registro.fec_produccion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fec_produccion"
            value={registro.fec_produccion}
            onChange={(e) => onInputChange(e, "fec_produccion")}
            required
          />
          <br />
          <label htmlFor="hor_proceso" className="font-bold">
            Hora Proceso{" "}
            {submitted && !registro.hor_proceso && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hor_proceso"
            value={registro.hor_proceso}
            onChange={(e) => onInputChange(e, "hor_proceso")}
            required
          />
          <br />
          <label htmlFor="kg_larva_fresca" className="font-bold">
            Kg Larva Fresca{" "}
            {submitted && !registro.kg_larva_fresca && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
onKeyDown={handleKeyPress}
            id="kg_larva_fresca"
            value={registro.kg_larva_fresca}
            onChange={(e) => onInputChange(e, "kg_larva_fresca")}
            required
          />
          <br />
          <label htmlFor="kg_desecho" className="font-bold">
            Kg Desecho{" "}
            {submitted && !registro.kg_desecho && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
onKeyDown={handleKeyPress}
            id="kg_desecho"
            value={registro.kg_desecho}
            onChange={(e) => onInputChange(e, "kg_desecho")}
            required
          />
          <br />
          <label htmlFor="hor_inicio" className="font-bold">
            Hora Inicio{" "}
            {submitted && !registro.hor_inicio && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hor_inicio"
            value={registro.hor_inicio}
            onChange={(e) => onInputChange(e, "hor_inicio")}
            required
          />
          <br />
          <label htmlFor="hor_fin" className="font-bold">
            Hora Fin{" "}
            {submitted && !registro.hor_fin && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hor_fin"
            value={registro.hor_fin}
            onChange={(e) => onInputChange(e, "hor_fin")}
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
            placeholder="Selecciona un tipo de Control"
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
