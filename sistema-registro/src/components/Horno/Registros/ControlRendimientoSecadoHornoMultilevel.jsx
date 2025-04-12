import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
    
    fecha_produccion: "",
    hora_proceso: "",
    larva_fresca_kg: "",
    cajas_totales: "",
    cant_cajas_horno: 0,
    _originalCajas: 0, // Nuevo campo para almacenar el valor original
    desecho_kg: "",
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
  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    cajas_totales: false,
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

  // Opciones para el campo "tipo_control"
  const tiposControl = ["Prueba", "Control"];

  const fetchRegistros = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Control_Rendimiento_Secado_Horno_Multilevel")
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
            `numero_lote.ilike.%${lazyParams.globalFilter}%,fecha_registro.ilike.%${lazyParams.globalFilter}%`
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
        .or("etapa_actual.ilike.%Horno%,etapa_actual.ilike.%ProductoTerminado%")
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
  // Función para formatear la fecha en formato día/mes/año
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

    function isInvalid(value, min, max) {
      return value < min || value > max;
    }

    const isCajasTotalesInvalido = isInvalid(
      registro.cajas_totales,
      0,
      registro.cant_cajas_horno
    );
    setErroresValidacion({
      total_cajas: isCajasTotalesInvalido,
    });
    const valoresFueraDeRango = isCajasTotalesInvalido;
    if (
      !registro.tipo_control ||
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
    if (registro.cajas_totales > registro.cant_cajas_horno && registro.base_numero_lote != "Sin Lote Asignado") {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: `No puedes procesar más cajas (${registro.cajas_totales}) de las disponibles en el lote (${registro.cant_cajas_horno})`,
        life: 3000,
      });
      return;
    }
    // Validación principal
    if (valoresFueraDeRango && !registro.observaciones) {
      setObservacionesObligatorio(true);
      const currentErrores = {
        "Cajas Totales": isCajasTotalesInvalido,
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
      cajas_totales: false,
    });

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
        .from("Control_Rendimiento_Secado_Horno_Multilevel")
        .insert([
          {
            fecha_registro: currentDate,
            hora_registro: currentTime,
            tipo_control: registro.tipo_control,
            fecha_produccion: convertirFecha(registro.fecha_produccion),
            hora_proceso: registro.hora_proceso,
            larva_fresca_kg: registro.larva_fresca_kg,
            cajas_totales: registro.cajas_totales,
            desecho_kg: registro.desecho_kg,
            observaciones: registro.observaciones,
            base_numero_lote: registro.base_numero_lote,
          },
        ]);
      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(
          error.message || "Error desconocido al guardar en Supabase"
        );
      }

      // Actualizar la tabla Lotes con la nueva etapa_actual
      const nuevasCajas = registro.cant_cajas_horno - registro.cajas_totales;

      // Convertir el valor de la base de datos (texto con etapas) a un array.
      // Se asume que 'registro.etapa_actual' es la columna que contiene la cadena separada por comas.
      let etapas = [];
      if (
        registro.etapa_actual &&
        typeof registro.etapa_actual === "string" &&
        registro.etapa_actual.trim() !== ""
      ) {
        etapas = registro.etapa_actual.split(",").map((e) => e.trim());
      }

      if (!etapas.includes("ProductoTerminado")) {
        etapas.push("Horno", "Cosecha", "ProductoTerminado");
      }
      // Convertir el array de nuevo a una cadena separada por comas
      const nuevaEtapaTexto = etapas.join(", ");

      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_horno: nuevasCajas,
          etapa_actual: nuevaEtapaTexto,
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

  // const onRowEditInit = (event) => {  EXPLICACION EN TABLA
  //   setRegistro({
  //     ...event.data,
  //     _originalCajas: event.data.cajas_procesadas_neonatos
  //   });
  //   setRegistroDialog(true);
  // };
  const onRowEditComplete = async ({ newData, data: oldData }) => {
    try {
      // 1. Calcular diferencia de cajas
      const diferencia = newData.cajas_totales - oldData.cajas_totales;

      // 2. Obtener lote actual
      const { data: lote, error: loteError } = await supabase
        .from("Lotes")
        .select("cant_cajas_horno")
        .eq("base_numero_lote", oldData.base_numero_lote)
        .single();

      if (loteError) throw loteError;

      // 3. Calcular nuevo valor
      const nuevasCajas = lote.cant_cajas_horno - diferencia;

      if (nuevasCajas < 0) {
        throw new Error("Cantidad de cajas no puede ser negativa");
      }

      // 4. Actualizar Control_Rendimiento_DietaySiembra
      const { error: updateError } = await supabase
        .from("Control_Rendimiento_Secado_Horno_Multilevel")
        .update(newData)
        .eq("id", newData.id);

      if (updateError) throw updateError;

      // 5. Actualizar Lotes
      const { error: loteUpdateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_horno: nuevasCajas,
          etapa_actual: "HornoMul",
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
    { field: "tipo_control", header: "Tipo Control" },
    { field: "fecha_produccion", header: "Fecha Producción" },
    { field: "hora_proceso", header: "Hora Proceso" },
    { field: "larva_fresca_kg", header: "Larva Fresca (kg)" },
    { field: "cajas_totales", header: "Cajas Totales" },
    { field: "desecho_kg", header: "Desecho (kg)" },
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
      "Registros de Control Rendimiento Secado Horno Multilevel",
      14,
      22
    );

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

    doc.save("Control Rendimiento Secado Horno Multilevel.pdf");
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
    XLSX.writeFile(wb, "Control Rendimiento Secado Horno Multilevel.xlsx");
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
            <Column field="tipo_control" header="Tipo Control" sortable />
            
            <Column field="cajas_totales" header="Cajas Totales" sortable />
            <Column field="desecho_kg" header="Desecho (kg)" sortable />
            <Column field="fecha_registro" header="Fecha Registro" sortable />
            <Column field="hora_registro" header="Hora Registro" sortable />
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
            filter
            onChange={async (e) => {
              setRegistro({
                ...registro,
                base_numero_lote: e.value,
              });
              const loteSeleccionado = lotes.find(
                (l) => l.base_numero_lote === e.value
              );

              if (loteSeleccionado) {
                // Obtener los datos actualizados del lote desde Supabase
                const { data: loteActual, error } = await supabase
                  .from("Lotes")
                  .select("cant_cajas_horno")
                  .eq("base_numero_lote", e.value)
                  .single();

                if (!error && loteActual) {
                  setRegistro({
                    ...registro,
                    base_numero_lote: e.value,
                    cant_cajas_horno: loteActual.cant_cajas_horno || 0,
                  });
                }
              }
            }}
            options={[
              // Opción "Nuevo Lote" con valor "nuevo"
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
            Cajas Totales (0 - {registro.cant_cajas_horno}){" "}
            {submitted && !registro.cajas_totales && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cajas_totales && (
              <small className="p-error">
                {`Cantidad Total Cajas debe de ser entre 0 y ${registro.cant_cajas_horno}`}
              </small>
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

export default ControlRendimientoSecadoHornoMultilevel;
