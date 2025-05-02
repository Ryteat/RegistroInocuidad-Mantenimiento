import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import "./ControLRendimientoDietaySiembra.css";
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

function ControLRendimientoDietaySiembra() {
  // Lista estática de operarios
  const operariosFijos = [
    { nombre: "Stiven" },
    { nombre: "Patrick" },
    { nombre: "Pablo" },
    { nombre: "Kendal" },
    { nombre: "José Luis" },
    { nombre: "Jose Geovani" },
  ];

  let emptyRegister = {
    cantidad_tandas: "",
    kg_dieta_caja: "",
    kg_residuo_organico: "",
    kg_puntilla_arroz: "",
    kg_destilado_maiz: "",
    kg_melaza: "",
    g_espesante: "",
    lts_agua: "",
    g_pure_banano: "",
    kg_otro: "",
    kg_harina_soya: "",
    dieta_hatchery: "",
    kg_total: "",
    tipo_dieta: "",
    cajas_procesadas_neonatos: "",
    cant_cajas_dieta: 0,
    _originalCajas: 0,
    cajas_sembradas_rep: "",
    cajas_dieta_no_sembradas_rep: "",
    cajas_sembradas_pro: "",
    cajas_dieta_no_sembradas_pro: "",
    tipo_control: "",
    operario: "",
    fec_registro: "",
    hor_registro: "",
    fecha_siembra: "",
    fecha_prod: "", // Nuevo campo añadido
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

  const tipoDieta = ["Producción", "Reproducción", "Neonatos"];
  const tipoControl = ["Control", "Prueba"];

  const [observacionesObligatorio, setObservacionesObligatorio] = useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    cajas_procesadas_neonatos: false,
    cajas_sembradas_rep: false,
    cajas_dieta_no_sembradas_rep: false,
    cajas_sembradas_pro: false,
    cajas_dieta_no_sembradas_pro: false,
  });

  const [lotes, setLotes] = useState([]);
  const [operarios, setOperarios] = useState(operariosFijos);
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

  // Función para calcular el total automáticamente
  const calcularTotal = useCallback(() => {
    const componentes = [
      'kg_residuo_organico',
      'kg_puntilla_arroz',
      'kg_destilado_maiz',
      'kg_melaza',
      'g_espesante',
      'lts_agua',
      'g_pure_banano',
      'kg_otro',
      'kg_harina_soya',
      'dieta_hatchery'
    ];

    let total = 0;
    componentes.forEach(comp => {
      const valor = parseFloat(registro[comp]) || 0;
      // Convertir gramos a kilogramos si es necesario
      if (comp.startsWith('g_')) {
        total += valor;
      } else if (comp === 'lts_agua') {
        // Asumimos que 1 litro de agua = 1 kg
        total += valor;
      } else {
        total += valor;
      }
    });

    return total.toFixed(2); // Redondear a 2 decimales
  }, [registro]);

  // Efecto para actualizar el total cuando cambian los componentes
  useEffect(() => {
    if (registroDialog) {
      const nuevoTotal = calcularTotal();
      setRegistro(prev => ({ ...prev, kg_total: nuevoTotal }));
    }
  }, [
    registro.kg_residuo_organico,
    registro.kg_puntilla_arroz,
    registro.kg_destilado_maiz,
    registro.kg_melaza,
    registro.g_espesante,
    registro.lts_agua,
    registro.g_pure_banano,
    registro.kg_otro,
    registro.kg_harina_soya,
    registro.dieta_hatchery,
    registroDialog,
    calcularTotal
  ]);

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const formatDate = (dateString) => {  //FORMATEA LA FECHA DE DD/MM/YYYY A DD-MM-YYYY 
    if (!dateString) return "";
    const [day, month, year] = dateString.split("/");
    return `${day}-${month}-${year}`;
  };

  const fetchRegistros = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Control_Rendimiento_DietaySiembra")
          .select("*", { count: "exact" })
          .range(start, start + limit - 1);

        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

        if (lazyParams.globalFilter) {
          query = query.or(
            `numero_lote.ilike.%${lazyParams.globalFilter}%,tipo_dieta.ilike.%${lazyParams.globalFilter}%,fec_registro.ilike.%${lazyParams.globalFilter}%`
          );
        }

        const { data, error, count } = await query;

        if (error) throw error;
        setRegistros(data || []);
        setTotalRecords(count || 0);
      } catch (err) {
        console.error("Error en la conexión a la base de datos Rendimiento Dieta Siembra", err);
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
        .in("etapa_actual", ["DespachoHatchery", "Dieta"])
        .order("fecha_registro", { ascending: false });
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

  const onSort = useCallback((event) => {
    setLazyParams((prev) => ({
      ...prev,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
    }));
  }, []);

  const onFilter = useCallback((e) => {
    const value = e.target.value;
    setGlobalFilter(value);
    setLazyParams((prev) => ({
      ...prev,
      globalFilter: value,
      first: 0,
    }));
  }, []);

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

  const formatDateTime = (date, format = "DD/MM/YYYY hh:mm A") => {
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

    const isCajasSembradasRepInvalido = isInvalid(
      registro.cajas_sembradas_rep,
      0,
      500
    );
    const isCajasDietaNoSembradasRepInvalido = isInvalid(
      registro.cajas_dieta_no_sembradas_rep,
      0,
      100
    );
    const isCajasSembradasProInvalido = isInvalid(
      registro.cajas_sembradas_pro,
      0,
      5000
    );
    const isCajasDietaNoSembradasProInvalido = isInvalid(
      registro.cajas_dieta_no_sembradas_pro,
      0,
      100
    );

    setErroresValidacion({
      cajas_sembradas_rep: isCajasSembradasRepInvalido,
      cajas_dieta_no_sembradas_rep: isCajasDietaNoSembradasRepInvalido,
      cajas_sembradas_pro: isCajasSembradasProInvalido,
      cajas_dieta_no_sembradas_pro: isCajasDietaNoSembradasProInvalido,
    });

    const valoresFueraDeRango =
      isCajasSembradasRepInvalido ||
      isCajasDietaNoSembradasRepInvalido ||
      isCajasSembradasProInvalido ||
      isCajasDietaNoSembradasProInvalido;

    const camposRequeridos = [
      "cantidad_tandas", "kg_dieta_caja", "kg_residuo_organico", 
      "kg_puntilla_arroz", "kg_destilado_maiz", "kg_melaza", 
      "g_espesante", "lts_agua", "g_pure_banano", "kg_otro", 
      "kg_harina_soya", "dieta_hatchery", "kg_total", "tipo_dieta",
      "cajas_procesadas_neonatos", "cajas_sembradas_rep", 
      "cajas_dieta_no_sembradas_rep", "cajas_sembradas_pro", 
      "cajas_dieta_no_sembradas_pro", "tipo_control", "operario"
    ];

    const camposFaltantes = camposRequeridos.filter(field => !registro[field]);

    if (camposFaltantes.length > 0) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Por favor complete todos los campos requeridos",
        life: 3000,
      });
      return;
    }

    if (valoresFueraDeRango && !registro.observaciones) {
      setObservacionesObligatorio(true);
      const currentErrores = {
        "Cajas Sembradas Reproduccion": isCajasSembradasRepInvalido,
        "Cajas no Sembradas Reproduccion": isCajasDietaNoSembradasRepInvalido,
        "Cajas Sembradas Produccion": isCajasSembradasProInvalido,
        "Cajas No Sembradas Produccion": isCajasDietaNoSembradasProInvalido,
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
      cajas_sembradas_rep: false,
      cajas_dieta_no_sembradas_rep: false,
      cajas_sembradas_pro: false,
      cajas_dieta_no_sembradas_pro: false,
    });

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");
      const fechaSiembra = formatDateTime(new Date(), "DD/MM/YYYY");

      if(registro.base_numero_lote === "Neonatos"){
        registro.base_numero_lote = null;
      }else{
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
        .from("Control_Rendimiento_DietaySiembra")
        .insert([
          {
            base_numero_lote: registro.base_numero_lote,
            cantidad_tandas: registro.cantidad_tandas,
            kg_dieta_caja: registro.kg_dieta_caja,
            kg_residuo_organico: registro.kg_residuo_organico,
            kg_puntilla_arroz: registro.kg_puntilla_arroz,
            kg_destilado_maiz: registro.kg_destilado_maiz,
            kg_melaza: registro.kg_melaza,
            g_espesante: registro.g_espesante,
            lts_agua: registro.lts_agua,
            g_pure_banano: registro.g_pure_banano,
            kg_otro: registro.kg_otro,
            kg_harina_soya: registro.kg_harina_soya,
            dieta_hatchery: registro.dieta_hatchery,
            kg_total: registro.kg_total,
            tipo_dieta: registro.tipo_dieta,
            cajas_procesadas_neonatos: registro.cajas_procesadas_neonatos,
            cajas_sembradas_rep: registro.cajas_sembradas_rep,
            cajas_dieta_no_sembradas_rep: registro.cajas_dieta_no_sembradas_rep,
            cajas_sembradas_pro: registro.cajas_sembradas_pro,
            cajas_dieta_no_sembradas_pro: registro.cajas_dieta_no_sembradas_pro,
            tipo_control: registro.tipo_control,
            operario: registro.operario,
            fec_registro: currentDate,
            hor_registro: currentTime,
            fecha_siembra: fechaSiembra,
            fecha_prod: convertirFecha(registro.fecha_prod),
            observaciones: registro.observaciones,
          },
        ]);

      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(
         "Error en Supabase: Mirar consola para ver error" || "Error desconocido al guardar en Supabase"
        );
      }
      
      const nuevasCajas = registro.cajas_sembradas_pro;

      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_dieta: nuevasCajas,
          etapa_actual: "Dieta",
          fecha_siembra: fechaSiembra,
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
  }, [registro, lotes, operarios]);

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
        type="number"
        onKeyDown={handleKeyPress}
        step="0.01"
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
      const diferencia =
        newData.cajas_sembradas_pro - oldData.cajas_sembradas_pro;

      const { data: lote, error: loteError } = await supabase
        .from("Lotes")
        .select("cant_cajas_dieta, etapa_actual")
        .eq("base_numero_lote", oldData.base_numero_lote)
        .single();

        if (loteError || !lote) {
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: 'No se encontró el lote asociado' + loteError.message,
            life: 3000
          });
          return;
        }
    
        if (lote.etapa_actual !== 'Dieta') {
          toast.current.show({
            severity: 'error',
            summary: 'Edición bloqueada',
            detail: 'Solo se pueden editar registros de lotes en etapa Dieta',
            life: 3000
          });
          return;
        }

      const nuevasCajas = lote.cant_cajas_dieta - diferencia;

      if (nuevasCajas < 0) {
        throw new Error("Cantidad de cajas no puede ser negativa");
      }

      const { error: updateError } = await supabase
        .from("Control_Rendimiento_DietaySiembra")
        .update({
          ...newData,
          fecha_prod: newData.fecha_prod // Incluir el nuevo campo
        })
        .eq("id", newData.id);

      if (updateError) throw updateError;

      const { error: loteUpdateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_dieta: nuevasCajas,
        })
        .eq("base_numero_lote", oldData.base_numero_lote);

      if (loteUpdateError) throw loteUpdateError;

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
        placeholder="Buscar por Lote, Tipo Dieta u Fecha de Registro"
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
    { field: "fecha_prod", header: "Fecha Producción" },
    { field: "cantidad_tandas", header: "Cantidad Tandas" },
    { field: "kg_dieta_caja", header: "Kg Dieta Caja" },
    { field: "kg_residuo_organico", header: "Kg Residuo Orgánico" },
    { field: "kg_puntilla_arroz", header: "Kg Puntilla Arroz" },
    { field: "kg_destilado_maiz", header: "Kg Destilado Maíz" },
    { field: "kg_melaza", header: "Kg Melaza" },
    { field: "g_espesante", header: "Kg Espesante" },
    { field: "lts_agua", header: "Lts Agua" },
    { field: "g_pure_banano", header: "Kg Puré Banano" },
    { field: "kg_otro", header: "Kg Otro" },
    { field: "kg_harina_soya", header: "Kg Soya" },
    { field: "dieta_hatchery", header: "Dieta Hatchery" },
    { field: "kg_total", header: "Kg Total" },
    { field: "tipo_dieta", header: "Tipo Dieta" },
    { field: "cajas_procesadas_neonatos", header: "Cajas Procesadas Neonatos" },
    { field: "cajas_sembradas_rep", header: "Cajas Sembradas Rep" },
    { field: "cajas_dieta_no_sembradas_rep", header: "Cajas Dieta No Sembradas Rep" },
    { field: "cajas_sembradas_pro", header: "Cajas Sembradas Pro" },
    { field: "cajas_dieta_no_sembradas_pro", header: "Cajas Dieta No Sembradas Pro" },
    { field: "tipo_control", header: "Tipo Control" },
    { field: "fecha_siembra", header: "Fecha Siembra" },
    { field: "operario", header: "Operario" },
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
    doc.text("Registros de Control Rendimiento Dieta y Siembra", 14, 22);

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

    doc.save("Control Rendimiento Dieta y Siembra.pdf");
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
        fecha_prod: row.fecha_prod // Nuevo campo añadido
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
    XLSX.writeFile(wb, "Control Rendimiento Dieta y Siembra.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control Rendimiento Dieta y Siembra
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control Rendimiento Dieta y Siembra. Aquí
            puedes gestionar los registros de Dieta y Siembra.
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
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="fecha_prod"
              header="Fecha Producción"
              sortable
              // body={(rowData) => formatDate(rowData.fecha_prod)}
            />
            <Column
              field="cantidad_tandas"
              header="Cantidad Tandas"
              editor={(options) => numberEditor(options)}
              sortable
            />
            <Column
              field="kg_dieta_caja"
              header="Kg Dieta Caja"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="kg_residuo_organico"
              header="Kg Residuo Orgánico"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="kg_puntilla_arroz"
              header="Kg Puntilla Arroz"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="kg_destilado_maiz"
              header="Kg Destilado Maíz"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="kg_melaza"
              header="Kg Melaza"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="g_espesante"
              header="Kg Espesante"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="lts_agua"
              header="Lts Agua"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="g_pure_banano"
              header="Kg Puré Banano"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="kg_otro"
              header="Kg Otro"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="kg_harina_soya"
              header="Kg Soya"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="dieta_hatchery"
              header="Dieta Hatchery"
              editor={(options) => textEditor(options)}
              sortable
            />
            <Column
              field="kg_total"
              header="Kg Total"
              sortable
              body={(rowData) => (
                <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                  {rowData.kg_total}
                </span>
              )}
            />
            <Column
              field="tipo_dieta"
              header="Tipo Dieta"
              editor={(options) => textEditor(options)}
              sortable
            />
            <Column
              field="cajas_procesadas_neonatos"
              header="Cajas Procesadas Neonatos"
              editor={(options) => numberEditor(options)}
              sortable
            />
            <Column
              field="cajas_sembradas_rep"
              header="Cajas Sembradas Rep"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="cajas_dieta_no_sembradas_rep"
              header="Cajas Dieta No Sembradas Rep"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="cajas_sembradas_pro"
              header="Cajas Sembradas Pro"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="cajas_dieta_no_sembradas_pro"
              header="Cajas Dieta No Sembradas Pro"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="tipo_control"
              header="Tipo Control"
              editor={(options) => textEditor(options)}
              sortable
            />
            <Column
              field="fecha_siembra"
              header="Fecha Siembra"
              sortable
              // body={(rowData) => formatDate(rowData.fecha_siembra)}
            />
            <Column
              field="operario"
              header="Operario"
              editor={(options) => textEditor(options)}
              sortable
            />
            <Column 
              field="fec_registro" 
              header="Fecha Registro" 
              sortable 
              // body={(rowData) => formatDate(rowData.fec_registro)} 
            />
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
              setRegistro({ ...registro, base_numero_lote: e.value });
              const loteSeleccionado = lotes.find(
                (l) => l.base_numero_lote === e.value
              );

              if (loteSeleccionado) {
                const { data: loteActual, error } = await supabase
                  .from("Lotes")
                  .select("cant_cajas_dieta")
                  .eq("base_numero_lote", e.value)
                  .single();

                if (!error && loteActual) {
                  setRegistro({
                    ...registro,
                    base_numero_lote: e.value,
                    cant_cajas_dieta: loteActual.cant_cajas_dieta || 0,
                  });
                }
              }
            }}
            options={[
              { base_numero_lote: "Neonatos" },
              ...(lotes || []),
            ]}
            optionLabel="base_numero_lote"
            optionValue="base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
          />
          <br />
          <label htmlFor="fecha_prod" className="font-bold">
            Fecha Producción{" "}
            {submitted && !registro.fecha_prod && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_prod"
            value={registro.fecha_prod ? 
              registro.fecha_prod.split('/').reverse().join('-') : 
              ''}
            onChange={(e) => {
              const selectedDate = e.target.value;
              if (selectedDate) {
                const [year, month, day] = selectedDate.split('-');
                const formattedDate = `${day}/${month}/${year}`;
                setRegistro({...registro, fecha_prod: formattedDate});
              } else {
                setRegistro({...registro, fecha_prod: ''});
              }
            }}
            required
          />
          <br />

          <label htmlFor="cantidad_tandas" className="font-bold">
            Cantidad Tandas{" "}
            {submitted && !registro.cantidad_tandas && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="cantidad_tandas"
            value={registro.cantidad_tandas}
            onChange={(e) => onInputChange(e, "cantidad_tandas")}
            required
            autoFocus
          />
          <br />

          <label htmlFor="kg_dieta_caja" className="font-bold">
            KG Dieta Caja{" "}
            {submitted && !registro.kg_dieta_caja && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            required
            id="kg_dieta_caja"
            value={registro.kg_dieta_caja}
            onChange={(e) => onInputChange(e, "kg_dieta_caja")}
          />
          <br />

          <label htmlFor="kg_residuo_organico" className="font-bold">
            KG Residuo Organico{" "}
            {submitted && !registro.kg_residuo_organico && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            required
            id="kg_residuo_organico"
            value={registro.kg_residuo_organico}
            onChange={(e) => onInputChange(e, "kg_residuo_organico")}
          />
          <br />

          <label htmlFor="kg_puntilla_arroz" className="font-bold">
            KG Puntilla Arroz{" "}
            {submitted && !registro.kg_puntilla_arroz && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="kg_puntilla_arroz"
            value={registro.kg_puntilla_arroz}
            onChange={(e) => onInputChange(e, "kg_puntilla_arroz")}
            required
          />
          <br />

          <label htmlFor="kg_destilado_maiz" className="font-bold">
            KG Destilado Maiz{" "}
            {submitted && !registro.kg_destilado_maiz && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="kg_destilado_maiz"
            value={registro.kg_destilado_maiz}
            onChange={(e) => onInputChange(e, "kg_destilado_maiz")}
            required
          />
          <br />

          <label htmlFor="kg_melaza" className="font-bold">
            KG Melaza{" "}
            {submitted && !registro.kg_melaza && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="kg_melaza"
            value={registro.kg_melaza}
            onChange={(e) => onInputChange(e, "kg_melaza")}
            required
          />
          <br />

          <label htmlFor="g_espesante" className="font-bold">
            Kg Espesante{" "}
            {submitted && !registro.g_espesante && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="g_espesante"
            value={registro.g_espesante}
            onChange={(e) => onInputChange(e, "g_espesante")}
            required
          />
          <br />

          <label htmlFor="lts_agua" className="font-bold">
            Litros Agua{" "}
            {submitted && !registro.lts_agua && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="lts_agua"
            value={registro.lts_agua}
            onChange={(e) => onInputChange(e, "lts_agua")}
            required
          />
          <br />

          <label htmlFor="g_pure_banano" className="font-bold">
            Kg Pure Banano{" "}
            {submitted && !registro.g_pure_banano && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="g_pure_banano"
            value={registro.g_pure_banano}
            onChange={(e) => onInputChange(e, "g_pure_banano")}
            required
          />
          <br />

          <label htmlFor="kg_otro" className="font-bold">
            KG Otro{" "}
            {submitted && !registro.kg_otro && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="kg_otro"
            value={registro.kg_otro}
            onChange={(e) => onInputChange(e, "kg_otro")}
            required
          />
          <br />

          <label htmlFor="kg_harina_soya" className="font-bold">
            KG Soya{" "}
            {submitted && !registro.kg_harina_soya && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="kg_harina_soya"
            value={registro.kg_harina_soya}
            onChange={(e) => onInputChange(e, "kg_harina_soya")}
            required
          />
          <br />

          <label htmlFor="dieta_hatchery" className="font-bold">
            Dieta Hatchery{" "}
            {submitted && !registro.dieta_hatchery && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="dieta_hatchery"
            value={registro.dieta_hatchery}
            onChange={(e) => onInputChange(e, "dieta_hatchery")}
            required
          />
          <br />

          <label htmlFor="kg_total" className="font-bold">
            KG Total{" "}
            {submitted && !registro.kg_total && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="kg_total"
            value={registro.kg_total}
            onChange={(e) => onInputChange(e, "kg_total")}
            required
            readOnly
            style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}
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
            placeholder="Selecciona un tipo de dieta"
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
          <label htmlFor="operario" className="font-bold">
            Operario{" "}
            {submitted && !registro.operario && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="operario"
            value={registro.operario}
            options={operarios || ["Prueba"]}
            optionLabel="nombre"
            optionValue="nombre"
            onChange={(e) => onInputChange(e, "operario")}
            placeholder="Seleccione un operario"
            required
          />
          <br />
          <Divider />
          <h3>
            <strong>Neonatos:</strong>
          </h3>
          <label htmlFor="cajas_procesadas_neonatos" className="font-bold">
            Cajas Procesadas Neonatos{" "}
            {submitted && !registro.cajas_procesadas_neonatos && (
              <small className="p-error">Requerido.</small>
            )}
           
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="cajas_procesadas_neonatos"
            value={registro.cajas_procesadas_neonatos}
            onChange={(e) => onInputChange(e, "cajas_procesadas_neonatos")}
            required
          />
          <br />
          <Divider />
          <h3>
            <strong>Reproducción:</strong>
          </h3>
          <label htmlFor="cajas_sembradas_rep" className="font-bold">
            Cajas Sembradas Reproduccion{" "}
            {submitted && !registro.cajas_sembradas_rep && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cajas_sembradas_rep && (
              <small className="p-error">
                Cajas Sembradas de Reproduccion debe de estar entre 0 a 500.
              </small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="cajas_sembradas_rep"
            value={registro.cajas_sembradas_rep}
            onChange={(e) => onInputChange(e, "cajas_sembradas_rep")}
            required
          />
          <br />

          <label htmlFor="cajas_dieta_no_sembradas_rep" className="font-bold">
            Cajas No Sembradas Reproduccion{" "}
            {submitted && !registro.cajas_dieta_no_sembradas_rep && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cajas_dieta_no_sembradas_rep && (
              <small className="p-error">
                Cajas Dieta No Sembradas de Reproduccion debe de estar entre 0 a
                100.
              </small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="cajas_dieta_no_sembradas_rep"
            value={registro.cajas_dieta_no_sembradas_rep}
            onChange={(e) => onInputChange(e, "cajas_dieta_no_sembradas_rep")}
            required
          />
          <br />
          <Divider />
          <h3>
            <strong>Producción:</strong>
          </h3>
          <label htmlFor="cajas_sembradas_pro" className="font-bold">
            Cajas Sembradas Produccion{" "}
            {submitted && !registro.cajas_sembradas_pro && (
              <small className="p-error">Requerido.</small>
            )}
             {erroresValidacion.cajas_sembradas_pro && (
              <small className="p-error">
                Cajas Procesadas Producción debe de estar entre 0 a{" "}
                {registro.cant_cajas_dieta}.
              </small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="cajas_sembradas_pro"
            value={registro.cajas_sembradas_pro}
            onChange={(e) => onInputChange(e, "cajas_sembradas_pro")}
            required
          />
          <br />

          <label htmlFor="cajas_dieta_no_sembradas_pro" className="font-bold">
            Cajas Dieta No Sembradas Produccion{" "}
            {submitted && !registro.cajas_dieta_no_sembradas_pro && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cajas_dieta_no_sembradas_pro && (
              <small className="p-error">
                Cajas Dieta No Sembradas de Produccion debe de estar entre 0 a
                100.
              </small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="cajas_dieta_no_sembradas_pro"
            value={registro.cajas_dieta_no_sembradas_pro}
            onChange={(e) => onInputChange(e, "cajas_dieta_no_sembradas_pro")}
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
        </div>
      </Dialog>
    </>
  );
}

export default ControLRendimientoDietaySiembra;