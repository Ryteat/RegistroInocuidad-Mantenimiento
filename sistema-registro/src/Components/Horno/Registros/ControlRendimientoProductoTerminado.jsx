import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import "./ControlRendimientoProductoTerminado.css";
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
import { MultiSelect } from "primereact/multiselect";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo2 from "../../../assets/mosca.png";

const ControlRendimientoProductoTerminado = () => {
  let emptyRegister = {
    base_codigo_sku: "",
    numero_sku: "",
    lote: [],
    fecha_produccion: "",
    hora: "",
    cant_bolsas: "",
    presentacion: "",
    operario: "",
    fecha_registro: "",
    hora_registro: "",
    observaciones: "",
    cons_cartonnormal: "",
    dese_cartonnormal: "",
    cons_cartonreforzado: "",
    dese_cartonreforzado: "",
    cons_bolsaempaque: "",
    dese_bolsaempaque: "",
    cons_cinta: "",
    dese_cinta: "",
    cons_tinta: "",
    dese_tinta: "",
    cons_diluyente: "",
    dese_diluyente: "",
    cons_jumbopeq: "",
    dese_jumbopeq: "",
    cons_jumbogrande: "",
    dese_jumbogrande: "",
    cons_bolsapeq: "",
    dese_bolsapeq: "",
    cons_bolsagrande: "",
    dese_bolsagrande: "",
    cons_gazaplastica: "",
    dese_gazaplastica: "",
    estado: "",
    unidad_empaque: ""
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
  const [skus, setSKUs] = useState([]);
  const [fechaSKU, setFechaSKU] = useState("");
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

  const estados = ["Producto Terminado", "En Espera", "Reempacado", "Reprocesado", "Salida"];
  const unidad_empaque = ["Kg", "Libras", "Unidades"];

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

  const fetchRegistros = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Control_Rendimiento_Producto_Terminado")
          .select("*", { count: "exact" })
          .range(start, start + limit - 1);

        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

        if (lazyParams.globalFilter) {
          query = query.or(
            `numero_sku.ilike.%${lazyParams.globalFilter}%,fecha_registro.ilike.%${lazyParams.globalFilter}%`
          );
        }

        const { data, error, count } = await query;

        if (error) throw error;
        setRegistros(data || []);
        setTotalRecords(count || 0);
      } catch (err) {
        console.error("Error al obtener registros:", err);
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: "No se pudieron cargar los registros",
          life: 3000,
        });
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
        .order("fecha_registro", { ascending: false });

      if (error) throw error;
      setLotes(data || []);
    } catch (err) {
      console.error("Error al obtener lotes:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los lotes",
        life: 3000,
      });
    }
  }, []);

  const fetchSKU = async () => {
    try {
      const { data, error } = await supabase
        .from("SKU")
        .select("base_codigo_sku")
        .order("fecha_registro", { ascending: false });

      if (error) throw error;
      setSKUs(data || []);
    } catch (err) {
      console.error("Error al obtener SKUs:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los SKUs",
        life: 3000,
      });
    }
  };

  useEffect(() => {
    fetchRegistros(lazyParams.first, lazyParams.rows);
    fetchLotes();
    fetchSKU();
  }, [
    fetchRegistros,
    lazyParams.first,
    lazyParams.rows,
    lazyParams.sortField,
    lazyParams.sortOrder,
    lazyParams.globalFilter,
  ]);

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

  const convertirFecha = (fecha) => {
    if (!fecha) return "";
    try {
      const [year, month, day] = fecha.split("-");
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error al convertir fecha:", error);
      return "";
    }
  };

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

  function generarFormatoJuliano(fechaSKU) {
    // Validación adicional para asegurar que fechaSKU existe y es string
    if (!fechaSKU || typeof fechaSKU !== 'string') {
      throw new Error("Fecha SKU no válida o no proporcionada");
    }

    // Dividir la fecha y validar que tenga 3 partes
    const partesFecha = fechaSKU.split("/");
    if (partesFecha.length !== 3) {
      throw new Error("Formato de fecha debe ser DD/MM/YYYY");
    }

    // Convertir a números y validar
    const [dia, mes, año] = partesFecha.map(part => {
      const num = parseInt(part, 10);
      if (isNaN(num)) {
        throw new Error("La fecha contiene valores no numéricos");
      }
      return num;
    });

    // Validar rangos de fecha
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || año < 1000) {
      throw new Error("Valores de fecha fuera de rango");
    }

    try {
      const fecha = new Date(Date.UTC(año, mes - 1, dia));
      const inicioAño = new Date(Date.UTC(año, 0, 1));
      
      // Validar que la fecha es válida
      if (isNaN(fecha.getTime()) || isNaN(inicioAño.getTime())) {
        throw new Error("Fecha inválida");
      }

      const diferencia = fecha - inicioAño;
      const diaJuliano = Math.floor(diferencia / (1000 * 60 * 60 * 24)) + 1;
      const diaJulianoFormateado = diaJuliano.toString().padStart(3, "0");
      const año2Digitos = año.toString().slice(-2);

      return `PR${diaJulianoFormateado}${año2Digitos}`;
    } catch (error) {
      console.error("Error al generar formato juliano:", error);
      throw new Error("Error al procesar la fecha");
    }
  }

  const saveRegistro = useCallback(async () => {
    setSubmitted(true);
    
    // Validación simplificada de campos requeridos
    if (
      !registro.fecha_produccion ||
      !registro.estado ||
      !registro.unidad_empaque ||
      !registro.hora ||
      registro.lote.length === 0 ||
      !registro.cant_bolsas ||
      !registro.presentacion ||
      !registro.operario
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Debes completar todos los campos requeridos",
        life: 3000,
      });
      return;
    }

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");
      let baseCodigoSKUToInsert = registro.base_codigo_sku;

      // Si el valor es "nuevo", crear un SKU
      if (registro.base_codigo_sku === "Nuevo SKU") {
        // Validar que fechaSKU existe
        if (!fechaSKU) {
          throw new Error("Debes proporcionar una fecha para generar el SKU");
        }

        const fechaConvertida = convertirFecha(fechaSKU);
        const posibleSKU = generarFormatoJuliano(fechaConvertida);
        
        if (skus.some((sku) => sku.base_codigo_sku === posibleSKU)) {
          toast.current.show({
            severity: "warn",
            detail: `El código SKU ${posibleSKU} ya existe. Selecciónalo.`,
          });
          setFechaSKU("");
          return;
        }

        const { data, error } = await supabase.rpc("generar_sku_base", {
          p_fecha_sku: fechaConvertida,
          p_fecha_registro: currentDate,
          p_hora_registro: currentTime,
        });

        if (error) {
          throw new Error("Error al crear SKU: " + error.message);
        }
        
        baseCodigoSKUToInsert = data;
        setRegistro({ ...registro, base_codigo_sku: data });
      } else {
        const { data: skuExistente, error: skuError } = await supabase
          .from("SKU")
          .select("base_codigo_sku")
          .eq("base_codigo_sku", registro.base_codigo_sku)
          .single();

        if (skuError || !skuExistente) {
          throw new Error(`El SKU ${registro.base_codigo_sku} no existe.`);
        }
      }

      // Insertar relaciones en sku_lotes
      const lotesIdssku_lotes = registro.lote.map((l) => l.base_numero_lote);
      const relacionesInsert = lotesIdssku_lotes.map((loteId) => ({
        sku_base: baseCodigoSKUToInsert,
        base_numero_lote: loteId,
      }));

      const { error: relacionesError } = await supabase
        .from("sku_lotes")
        .insert(relacionesInsert);

      if (relacionesError) {
        throw new Error("Error al guardar relaciones SKU-Lotes: " + relacionesError.message);
      }

      // Convertir lotes a string
      const lotesString = registro.lote
        .map((l) => l.base_numero_lote)
        .join(", ");

      // Insertar registro principal
      const { data, error } = await supabase
        .from("Control_Rendimiento_Producto_Terminado")
        .insert([
          {
            estado: registro.estado,
            unidad_empaque: registro.unidad_empaque,
            base_codigo_sku: baseCodigoSKUToInsert,
            fecha_produccion: convertirFecha(registro.fecha_produccion),
            hora: registro.hora,
            lote: lotesString,
            cant_bolsas: registro.cant_bolsas,
            presentacion: registro.presentacion,
            operario: registro.operario,
            fecha_registro: currentDate,
            hora_registro: currentTime,
            observaciones: registro.observaciones,
            cons_cartonnormal: registro.cons_cartonnormal || 0,
            dese_cartonnormal: registro.dese_cartonnormal || 0,
            cons_cartonreforzado: registro.cons_cartonreforzado || 0,
            dese_cartonreforzado: registro.dese_cartonreforzado || 0,
            cons_bolsaempaque: registro.cons_bolsaempaque || 0,
            dese_bolsaempaque: registro.dese_bolsaempaque || 0,
            cons_cinta: registro.cons_cinta || 0,
            dese_cinta: registro.dese_cinta || 0,
            cons_tinta: registro.cons_tinta || 0,
            dese_tinta: registro.dese_tinta || 0,
            cons_diluyente: registro.cons_diluyente || 0,
            dese_diluyente: registro.dese_diluyente || 0,
            cons_jumbopeq: registro.cons_jumbopeq || 0,
            dese_jumbopeq: registro.dese_jumbopeq || 0,
            cons_jumbogrande: registro.cons_jumbogrande || 0,
            dese_jumbogrande: registro.dese_jumbogrande || 0,
            cons_bolsapeq: registro.cons_bolsapeq || 0,
            dese_bolsapeq: registro.dese_bolsapeq || 0,
            cons_bolsagrande: registro.cons_bolsagrande || 0,
            dese_bolsagrande: registro.dese_bolsagrande || 0,
            cons_gazaplastica: registro.cons_gazaplastica || 0,
            dese_gazaplastica: registro.dese_gazaplastica || 0,
          },
        ]);

      if (error) {
        throw new Error("Error al guardar registro: " + error.message);
      }

      // Actualizar estado de los lotes seleccionados
      const lotesIds = registro.lote.map((l) => l.base_numero_lote);
      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          //etapa_actual: "ProductoTerminado",
          fecha_empaque: currentDate,
        })
        .in("base_numero_lote", lotesIds);

      if (updateError) {
        throw new Error("Error al actualizar lotes: " + updateError.message);
      }

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro creado correctamente",
        life: 3000,
      });

      // Resetear formulario
      setRegistro(emptyRegister);
      setRegistroDialog(false);
      setSubmitted(false);
      setFechaSKU("");

      // Actualizar datos
      fetchRegistros();
      fetchLotes();
      fetchSKU();
    } catch (error) {
      console.error("Error en saveRegistro:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.message || "Error al crear el registro",
        life: 3000,
      });
    }
  }, [registro, lotes, skus, fechaSKU]);

  // Resto de funciones auxiliares (dateEditor, timeEditor, etc.)
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
        step="0.01"
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
        .from("Control_Rendimiento_Producto_Terminado")
        .update(updatedData)
        .eq("id", id);

      if (error) throw error;

      setRegistros((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...newData } : n))
      );
      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro actualizado",
        life: 3000,
      });
    } catch (err) {
      console.error("Error al actualizar:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Error al actualizar el registro",
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
        placeholder="Buscar por SKU u Fecha de Registro"
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
    { field: "estado", header: "Estado" },
    { field: "unidad_empaque", header: "unidad_empaque" },
    { field: "base_codigo_sku", header: "Codigo SKU" },
    { field: "numero_sku", header: "SKU Generado" },
    { field: "lote", header: "Lotes" },
    { field: "fecha_produccion", header: "Fecha Producción" },
    { field: "hora", header: "Hora" },
    { field: "cant_bolsas", header: "Cantidad Bolsas/Unidad Empaque" },
    { field: "presentacion", header: "Presentación" },
    { field: "operario", header: "Operario" },
    { field: "observaciones", header: "Observaciones" },
    { field: "registrado", header: "Registrado" },
    { field: "cons_cartonnormal", header: "Consumo Cartón Normal" },
    { field: "dese_cartonnormal", header: "Desecho Cartón Normal" },
    { field: "cons_cartonreforzado", header: "Consumo Cartón Reforzado" },
    { field: "dese_cartonreforzado", header: "Desecho Cartón Reforzado" },
    { field: "cons_bolsaempaque", header: "Consumo Bolsa Empaque" },
    { field: "dese_bolsaempaque", header: "Desecho Bolsa Empaque" },
    { field: "cons_cinta", header: "Consumo Cinta" },
    { field: "dese_cinta", header: "Desecho Cinta" },
    { field: "cons_tinta", header: "Consumo Tinta" },
    { field: "dese_tinta", header: "Desecho Tinta" },
    { field: "cons_diluyente", header: "Consumo Diluyente" },
    { field: "dese_diluyente", header: "Desecho Diluyente" },
    { field: "cons_jumbopeq", header: "Consumo Jumbo Pequeño" },
    { field: "dese_jumbopeq", header: "Desecho Jumbo Pequeño" },
    { field: "cons_jumbogrande", header: "Consumo Jumbo Grande" },
    { field: "dese_jumbogrande", header: "Desecho Jumbo Grande" },
    { field: "cons_bolsapeq", header: "Consumo Bolsa Pequeña" },
    { field: "dese_bolsapeq", header: "Desecho Bolsa Pequeña" },
    { field: "cons_bolsagrande", header: "Consumo Bolsa Grande" },
    { field: "dese_bolsagrande", header: "Desecho Bolsa Grande" },
    { field: "cons_gazaplastica", header: "Consumo Gasa Plástica" },
    { field: "dese_gazaplastica", header: "Desecho Gasa Plástica" },
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
    doc.text("Registros de Control Rendimiento Producto Terminado", 14, 22);

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

    doc.save("Control Rendimiento Producto Terminado.pdf");
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
    XLSX.writeFile(wb, "Control Rendimiento Producto Terminado.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control de Rendimiento Producto Terminado
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Calidad Rendimiento Producto Terminado.
            Aquí puedes gestionar los registros de Producto Terminado.
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
            rowsPerPageOptions={[5, 10, 25]}
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Registros"
          >
            <Column selectionMode="multiple" exportable={false}></Column>
            <Column
              field="numero_sku"
              header="SKU Generado"
              sortable
              style={{ minWidth: "12rem" }}
            ></Column>
            <Column
              field="base_codigo_sku"
              header="Base SKU"
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="estado"
              header="Estado"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: estados.map((estado) => ({
                    label: estado,
                    value: estado,
                  })),
                })
              }
            ></Column>
            <Column
              field="fecha_produccion"
              header="Fecha Producción"
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="hora"
              header="Hora"
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="lote"
              header="Lote"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="presentacion"
              header="Presentación"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="unidad_empaque"
              header="Unidad Empaque"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: unidad_empaque.map((unidad_empaque) => ({
                    label: unidad_empaque,
                    value: unidad_empaque,
                  })),
                })
              }
            ></Column>
            <Column
              field="cant_bolsas"
              header="Cantidad Bolsas/Unidad Empaque"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_cartonnormal"
              header="Consumo Cartón Normal"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_cartonnormal"
              header="Desecho Cartón Normal"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_cartonreforzado"
              header="Consumo Cartón Reforzado"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_cartonreforzado"
              header="Desecho Cartón Reforzado"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_bolsaempaque"
              header="Consumo Bolsa Empaque"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_bolsaempaque"
              header="Desecho Bolsa Empaque"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_cinta"
              header="Consumo Cinta"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_cinta"
              header="Desecho Cinta"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_tinta"
              header="Consumo Tinta"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_tinta"
              header="Desecho Tinta"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_diluyente"
              header="Consumo Diluyente"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_diluyente"
              header="Desecho Diluyente"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_jumbopeq"
              header="Consumo Jumbo Pequeño"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_jumbopeq"
              header="Desecho Jumbo Pequeño"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_jumbogrande"
              header="Consumo Jumbo Grande"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_jumbogrande"
              header="Desecho Jumbo Grande"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_bolsapeq"
              header="Consumo Bolsa Pequeña"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_bolsapeq"
              header="Desecho Bolsa Pequeña"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_bolsagrande"
              header="Consumo Bolsa Grande"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_bolsagrande"
              header="Desecho Bolsa Grande"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="cons_gazaplastica"
              header="Consumo Gasa Plástica"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="dese_gazaplastica"
              header="Desecho Gasa Plástica"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="operario"
              header="Operario"
              editor={(options) => textEditor(options)}
            ></Column>
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
          <label htmlFor="base_codigo_sku" className="font-bold">
            Código SKU{" "}
            {submitted && !registro.base_codigo_sku && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            filter
            value={registro.base_codigo_sku}
            onChange={(e) => {
              setRegistro({ ...registro, base_codigo_sku: e.value });
            }}
            options={[
              { base_codigo_sku: "Nuevo SKU" },
              ...(skus || []),
            ]}
            optionLabel="base_codigo_sku"
            optionValue="base_codigo_sku"
            placeholder="Selecciona un Código SKU"
            className="w-full md:w-14rem"
          />
          {registro.base_codigo_sku === "Nuevo SKU" && (
            <>
              <label htmlFor="fechaSKU" className="font-bold">
                Fecha Código SKU Manual{" "}
                {submitted && !fechaSKU && (
                  <small className="p-error">Requerido.</small>
                )}
              </label>
              <InputText
                type="date"
                id="fechaSKU"
                value={fechaSKU}
                onChange={(e) => setFechaSKU(e.target.value)}
                required={registro.base_codigo_sku === "Nuevo SKU"}
              />
            </>
          )}
          <br />
          <label htmlFor="estado" className="font-bold">
            Estado{" "}
            {submitted && !registro.estado && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="estado"
            value={registro.estado}
            options={estados}
            onChange={(e) => onInputChange(e, "estado")}
            placeholder="Selecciona un Estado"
            required
          />
          <br />
          <Divider />
          <h3>
            <strong>Datos Producción:</strong>
          </h3>
          <Divider />
          <label htmlFor="fecha_produccion" className="font-bold">
            Fecha de Produccion{" "}
            {submitted && !registro.fecha_produccion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_produccion"
            value={registro.fecha_produccion}
            onChange={(e) => onInputChange(e, "fecha_produccion")}
          />
          <br />
          <label htmlFor="hora" className="font-bold">
            Hora{" "}
            {submitted && !registro.hora && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hora"
            value={registro.hora}
            onChange={(e) => onInputChange(e, "hora")}
          />
          <br />
          <label htmlFor="lote" className="font-bold">
            Lotes{" "}
            {submitted && registro.lote.length === 0 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <MultiSelect
            value={registro.lote}
            onChange={(e) =>
              onInputChange({ target: { value: e.value } }, "lote")
            }
            options={lotes}
            optionLabel="base_numero_lote"
            placeholder="Seleccione Lotes"
            maxSelectedLabels={3}
            className="w-full"
            filter
            filterBy="base_numero_lote"
            filterPlaceholder="Buscar lotes..."
            showFilterClear
          />
          <br />
          <label htmlFor="presentacion" className="font-bold">
            Presentación{" "}
            {submitted && !registro.presentacion && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="presentacion"
            value={registro.presentacion}
            onChange={(e) => onInputChange(e, "presentacion")}
          />
          <label htmlFor="unidad_empaque" className="font-bold">
            Unidad de Empaque{" "}
            {submitted && !registro.unidad_empaque && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="unidad_empaque"
            value={registro.unidad_empaque}
            options={unidad_empaque}
            onChange={(e) => onInputChange(e, "unidad_empaque")}
            placeholder="Selecciona la unidad de empaque"
            required
          />
          <br />
          <br />
          <label htmlFor="cant_bolsas" className="font-bold">
            Cantidad Bolsas/Unidad Empaque{" "}
            {submitted && !registro.cant_bolsas && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cant_bolsas"
            value={registro.cant_bolsas}
            onChange={(e) => onInputChange(e, "cant_bolsas")}
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
          />
          <br />
          <Divider />
          <h3>
            <strong>Materiales Consumo/Desecho:</strong>
          </h3>
          <Divider />
          <label htmlFor="cons_cartonnormal" className="font-bold">
            Consumo Cartón Normal
          </label>
          <InputText
            type="number"
            id="cons_cartonnormal"
            value={registro.cons_cartonnormal}
            onChange={(e) => onInputChange(e, "cons_cartonnormal")}
          />
          <br />
          <label htmlFor="dese_cartonnormal" className="font-bold">
            Desecho Cartón Normal
          </label>
          <InputText
            type="number"
            id="dese_cartonnormal"
            value={registro.dese_cartonnormal}
            onChange={(e) => onInputChange(e, "dese_cartonnormal")}
          />
          <br />
          <label htmlFor="cons_cartonreforzado" className="font-bold">
            Consumo Cartón Reforzado
          </label>
          <InputText
            type="number"
            id="cons_cartonreforzado"
            value={registro.cons_cartonreforzado}
            onChange={(e) => onInputChange(e, "cons_cartonreforzado")}
          />
          <br />
          <label htmlFor="dese_cartonreforzado" className="font-bold">
            Desecho Cartón Reforzado
          </label>
          <InputText
            type="number"
            id="dese_cartonreforzado"
            value={registro.dese_cartonreforzado}
            onChange={(e) => onInputChange(e, "dese_cartonreforzado")}
          />
          <br />
          <label htmlFor="cons_bolsaempaque" className="font-bold">
            Consumo Bolsa Empaque
          </label>
          <InputText
            type="number"
            id="cons_bolsaempaque"
            value={registro.cons_bolsaempaque}
            onChange={(e) => onInputChange(e, "cons_bolsaempaque")}
          />
          <br />
          <label htmlFor="dese_bolsaempaque" className="font-bold">
            Desecho Bolsa Empaque
          </label>
          <InputText
            type="number"
            id="dese_bolsaempaque"
            value={registro.dese_bolsaempaque}
            onChange={(e) => onInputChange(e, "dese_bolsaempaque")}
          />
          <br />
          <label htmlFor="cons_cinta" className="font-bold">
            Consumo Cinta
          </label>
          <InputText
            type="number"
            id="cons_cinta"
            value={registro.cons_cinta}
            onChange={(e) => onInputChange(e, "cons_cinta")}
          />
          <br />
          <label htmlFor="dese_cinta" className="font-bold">
            Desecho Cinta
          </label>
          <InputText
            type="number"
            id="dese_cinta"
            value={registro.dese_cinta}
            onChange={(e) => onInputChange(e, "dese_cinta")}
          />
          <br />
          <label htmlFor="cons_tinta" className="font-bold">
            Consumo Tinta
          </label>
          <InputText
            type="number"
            id="cons_tinta"
            value={registro.cons_tinta}
            onChange={(e) => onInputChange(e, "cons_tinta")}
          />
          <br />
          <label htmlFor="dese_tinta" className="font-bold">
            Desecho Tinta
          </label>
          <InputText
            type="number"
            id="dese_tinta"
            value={registro.dese_tinta}
            onChange={(e) => onInputChange(e, "dese_tinta")}
          />
          <br />
          <label htmlFor="cons_diluyente" className="font-bold">
            Consumo Diluyente
          </label>
          <InputText
            type="number"
            id="cons_diluyente"
            value={registro.cons_diluyente}
            onChange={(e) => onInputChange(e, "cons_diluyente")}
          />
          <br />
          <label htmlFor="dese_diluyente" className="font-bold">
            Desecho Diluyente
          </label>
          <InputText
            type="number"
            id="dese_diluyente"
            value={registro.dese_diluyente}
            onChange={(e) => onInputChange(e, "dese_diluyente")}
          />
          <br />
          <label htmlFor="cons_jumbopeq" className="font-bold">
            Consumo Jumbo Pequeño
          </label>
          <InputText
            type="number"
            id="cons_jumbopeq"
            value={registro.cons_jumbopeq}
            onChange={(e) => onInputChange(e, "cons_jumbopeq")}
          />
          <br />
          <label htmlFor="dese_jumbopeq" className="font-bold">
            Desecho Jumbo Pequeño
          </label>
          <InputText
            type="number"
            id="dese_jumbopeq"
            value={registro.dese_jumbopeq}
            onChange={(e) => onInputChange(e, "dese_jumbopeq")}
          />
          <br />
          <label htmlFor="cons_jumbogrande" className="font-bold">
            Consumo Jumbo Grande
          </label>
          <InputText
            type="number"
            id="cons_jumbogrande"
            value={registro.cons_jumbogrande}
            onChange={(e) => onInputChange(e, "cons_jumbogrande")}
          />
          <br />
          <label htmlFor="dese_jumbogrande" className="font-bold">
            Desecho Jumbo Grande
          </label>
          <InputText
            type="number"
            id="dese_jumbogrande"
            value={registro.dese_jumbogrande}
            onChange={(e) => onInputChange(e, "dese_jumbogrande")}
          />
          <br />
          <label htmlFor="cons_bolsapeq" className="font-bold">
            Consumo Bolsa Pequeña
          </label>
          <InputText
            type="number"
            id="cons_bolsapeq"
            value={registro.cons_bolsapeq}
            onChange={(e) => onInputChange(e, "cons_bolsapeq")}
          />
          <br />
          <label htmlFor="dese_bolsapeq" className="font-bold">
            Desecho Bolsa Pequeña
          </label>
          <InputText
            type="number"
            id="dese_bolsapeq"
            value={registro.dese_bolsapeq}
            onChange={(e) => onInputChange(e, "dese_bolsapeq")}
          />
          <br />
          <label htmlFor="cons_bolsagrande" className="font-bold">
            Consumo Bolsa Grande
          </label>
          <InputText
            type="number"
            id="cons_bolsagrande"
            value={registro.cons_bolsagrande}
            onChange={(e) => onInputChange(e, "cons_bolsagrande")}
          />
          <br />
          <label htmlFor="dese_bolsagrande" className="font-bold">
            Desecho Bolsa Grande
          </label>
          <InputText
            type="number"
            id="dese_bolsagrande"
            value={registro.dese_bolsagrande}
            onChange={(e) => onInputChange(e, "dese_bolsagrande")}
          />
          <br />
          <label htmlFor="cons_gazaplastica" className="font-bold">
            Consumo Gasa Plástica
          </label>
          <InputText
            type="number"
            id="cons_gazaplastica"
            value={registro.cons_gazaplastica}
            onChange={(e) => onInputChange(e, "cons_gazaplastica")}
          />
          <br />
          <label htmlFor="dese_gazaplastica" className="font-bold">
            Desecho Gasa Plástica
          </label>
          <InputText
            type="number"
            id="dese_gazaplastica"
            value={registro.dese_gazaplastica}
            onChange={(e) => onInputChange(e, "dese_gazaplastica")}
          />
          <br />
          <label htmlFor="observaciones" className="font-bold">
            Observaciones
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

export default ControlRendimientoProductoTerminado;