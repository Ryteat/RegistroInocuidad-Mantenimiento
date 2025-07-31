import React, { useEffect, useState, useRef, useCallback } from "react";
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
import { Divider } from "primereact/divider";
import { MultiSelect } from "primereact/multiselect";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo2 from "../../../assets/mosca.png";

const ControlReempaque = () => {
  let emptyRegister = {
    fecha_proceso: "",
    turno: "",
    tipo_proceso: "",
    motivo_proceso: "",
    hora_proceso: "",
    sku_utilizado: "",
    lotes_utilizados: [],
    kg_consumidos: "",
    presentacion_empaque: "",
    unidad_empaque: "",
    sku_generado: "",
    numero_sku: "",
    operario: "",
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
  const [skusUtilizados, setSkusUtilizados] = useState([]);
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

  // Opciones para dropdowns
  const turnos = ["1", "2", "3"];
  const tiposProceso = ["Reempaque (cambio de presentación)", "Reproceso (proceso de horneado)"];
  const motivosProceso = [
    "Mejorar la densidad",
    "Eliminar la humedad",
    "Eliminar mal olor",
    "Larva Suave",
    "Mejora de Calidad",
    "Otro (especificar en observaciones)"
  ];
  const unidadesEmpaque = ["KG", "Libras", "Unidades"];

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

  const fetchRegistros = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Control_Reempaque_PT")
          .select("*", { count: "exact" })
          .range(start, start + limit - 1);

        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

        if (lazyParams.globalFilter) {
          query = query.or(
            `sku_generado.ilike.%${lazyParams.globalFilter}%,numero_sku.ilike.%${lazyParams.globalFilter}%,fecha_proceso.ilike.%${lazyParams.globalFilter}%`
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
        .from("Neonatos_Inoculados")
        .select("base_numero_lote")
        .order("fec_registro", { ascending: false });

      if (error) throw error;
      
      // Filtramos valores nulos o vacíos y obtenemos valores únicos
      const lotesUnicos = [...new Set(data
        .map(item => item.base_numero_lote)
        .filter(lote => lote && lote.trim() !== "")
      )];

      setLotes([
        { base_numero_lote: "No aplica" }, // Opción "No aplica"
        ...lotesUnicos.map(lote => ({ base_numero_lote: lote }))
      ]);
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

  const fetchSkusUtilizados = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Rendimiento_Producto_Terminado")
        .select("numero_sku")
        .order("fecha_registro", { ascending: false });

      if (error) throw error;
      
      const uniqueSKUs = [...new Set(data.map(item => item.numero_sku))].map(sku => ({
        numero_sku: sku
      }));

      setSkusUtilizados([
        { numero_sku: "No aplica" },
        ...uniqueSKUs
      ]);
    } catch (err) {
      console.error("Error al obtener SKUs utilizados:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los SKUs utilizados",
        life: 3000,
      });
    }
  };

  useEffect(() => {
    fetchRegistros(lazyParams.first, lazyParams.rows);
    fetchLotes();
    fetchSkusUtilizados();
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

  function generarFormatoJuliano(fechaSKU) {
    if (!fechaSKU || typeof fechaSKU !== 'string') {
      throw new Error("Fecha SKU no válida o no proporcionada");
    }

    const partesFecha = fechaSKU.split("/");
    if (partesFecha.length !== 3) {
      throw new Error("Formato de fecha debe ser DD/MM/YYYY");
    }

    const [dia, mes, año] = partesFecha.map(part => {
      const num = parseInt(part, 10);
      if (isNaN(num)) {
        throw new Error("La fecha contiene valores no numéricos");
      }
      return num;
    });

    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || año < 1000) {
      throw new Error("Valores de fecha fuera de rango");
    }

    try {
      const fecha = new Date(Date.UTC(año, mes - 1, dia));
      const inicioAño = new Date(Date.UTC(año, 0, 1));
      
      if (isNaN(fecha.getTime()) || isNaN(inicioAño.getTime())) {
        throw new Error("Fecha inválida");
      }

      const diferencia = fecha - inicioAño;
      const diaJuliano = Math.floor(diferencia / (1000 * 60 * 60 * 24)) + 1;
      const diaJulianoFormateado = diaJuliano.toString().padStart(3, "0");
      const año2Digitos = año.toString().slice(-2);

      return `LS${diaJulianoFormateado}${año2Digitos}`;
    } catch (error) {
      console.error("Error al generar formato juliano:", error);
      throw new Error("Error al procesar la fecha");
    }
  }

  const saveRegistro = useCallback(async () => {

    // Agregar al inicio de saveRegistro
    if (!registro.fecha_proceso || !registro.turno || !registro.tipo_proceso || 
        !registro.motivo_proceso || !registro.hora_proceso || !registro.sku_utilizado || 
        !registro.presentacion_empaque || !registro.unidad_empaque || !registro.operario) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Todos los campos marcados como requeridos deben ser completados",
        life: 3000,
      });
      return;
    }

    setSubmitted(true);
    
    // Validación de campos obligatorios
    const camposRequeridos = [
      'fecha_proceso',
      'turno',
      'tipo_proceso',
      'motivo_proceso',
      'hora_proceso',
      'sku_utilizado',
      'presentacion_empaque',
      'unidad_empaque',
      'operario'
    ];

    const faltanCampos = camposRequeridos.some(campo => !registro[campo]);

    if (faltanCampos) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Debes completar todos los campos requeridos",
        life: 3000,
      });
      return;
    }

    try {
      const now = new Date();
      const currentDateISO = now.toISOString().slice(0, 10);
      const currentDateDisplay = convertirFecha(currentDateISO);
      const currentTime = now.toTimeString().slice(0, 5);
      let skuGenerado = registro.sku_generado;      

        if (skuGenerado === "Nuevo SKU") {
          if (!fechaSKU) {
            toast.current.show({
              severity: "error",
              summary: "Error",
              detail: "Debe seleccionar una fecha para generar el SKU",
              life: 3000,
            });
            return;
          }
          
          skuGenerado = generarFormatoJuliano(convertirFecha(fechaSKU)) + "-RE";
          
          // Verificar si ya existe
          const { data: existing } = await supabase
            .from("Control_Reempaque_PT")
            .select("id")
            .eq("sku_generado", skuGenerado)
            .limit(1);

          if (existing && existing.length > 0) {
            toast.current.show({
              severity: "warn",
              summary: "Advertencia",
              detail: `El SKU ${skuGenerado} ya existe. Por favor selecciónelo de la lista.`,
              life: 5000,
            });
            return;
          }
        }
      let motivosProcesados = '';
        if (Array.isArray(registro.motivo_proceso)) {
          motivosProcesados = registro.motivo_proceso.join(", ");
        } else if (typeof registro.motivo_proceso === 'string' && registro.motivo_proceso.startsWith('[')) {
          // Si viene como string JSON (["motivo1", "motivo2"])
          try {
            const motivosArray = JSON.parse(registro.motivo_proceso);
            motivosProcesados = Array.isArray(motivosArray) ? motivosArray.join(", ") : registro.motivo_proceso;
          } catch {
            motivosProcesados = registro.motivo_proceso;
          }
        } else {
          motivosProcesados = registro.motivo_proceso || '';
        }


      // Generar nuevo SKU si es necesario
      if (registro.sku_generado === "Nuevo SKU") {
        if (!fechaSKU) {
          throw new Error("Debes proporcionar una fecha para generar el SKU");
        }

        const fechaConvertida = convertirFecha(fechaSKU);
        const posibleSKU = generarFormatoJuliano(fechaConvertida) + "-RE";
        
        const { data: existingSKUs, error: skuError } = await supabase
          .from("Control_Reempaque_PT")
          .select("sku_generado")
          .eq("sku_generado", posibleSKU);

        if (skuError) throw skuError;
        
        if (existingSKUs && existingSKUs.length > 0) {
          toast.current.show({
            severity: "warn",
            detail: `El código SKU ${posibleSKU} ya existe. Selecciónalo.`,
          });
          setFechaSKU("");
          return;
        }

        skuGenerado = posibleSKU;
      }

      const registroParaGuardar = {
        ...registro,
        fecha_proceso: convertirFecha(registro.fecha_proceso),
        motivo_proceso: Array.isArray(registro.motivo_proceso) 
          ? registro.motivo_proceso.join(", ") 
          : registro.motivo_proceso,
        lotes_utilizados: registro.lotes_utilizados
          ?.map((l) => l.base_numero_lote)
          .filter(lote => lote && lote !== "No aplica")
          .join(", ") || "No aplica",
        kg_consumidos: registro.kg_consumidos || "0", // Nuevo campo
        fecha_registro: currentDateDisplay,
        hora_registro: currentTime
      };

      // Obtener consecutivo para el número de SKU
      const { count: consecutivo } = await supabase
        .from("Control_Reempaque_PT")
        .select("*", { count: "exact", head: true })
        .eq("sku_generado", skuGenerado);

      const numeroSKU = `${skuGenerado}-${(consecutivo + 1).toString().padStart(3, '0')}`;

      // Preparar lotes (filtrando "No aplica")
      const lotesIds = registro.lotes_utilizados
        ?.map((l) => l.base_numero_lote)
        .filter(lote => lote && lote !== "No aplica") || [];

      // Insertar el registro principal
      const { data: newRecord, error: insertError } = await supabase
        .from("Control_Reempaque_PT")
        .insert([{
          fecha_proceso: convertirFecha(registro.fecha_proceso),
          turno: registro.turno,
          tipo_proceso: registro.tipo_proceso,
          motivo_proceso: registro.motivo_proceso,
          hora_proceso: registro.hora_proceso,
          sku_utilizado: registro.sku_utilizado,
          lotes_utilizados: lotesIds.join(", ") || "No aplica",
          kg_consumidos: registro.kg_consumidos || "0",
          presentacion_empaque: registro.presentacion_empaque,
          unidad_empaque: registro.unidad_empaque,
          sku_generado: skuGenerado,
          numero_sku: numeroSKU,
          operario: registro.operario,
          observaciones: registro.observaciones,
          fecha_registro: currentDateDisplay,
          hora_registro: currentTime,
        }])
        .select();

      if (insertError) throw insertError;

      if (!newRecord || newRecord.length === 0) {
        throw new Error("No se pudo crear el registro principal");
      }

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro creado correctamente",
        life: 3000,
      });

      // Limpiar el formulario
      setRegistro(emptyRegister);
      setRegistroDialog(false);
      setSubmitted(false);
      setFechaSKU("");

      // Refrescar datos
      fetchRegistros();
      fetchLotes();
      fetchSkusUtilizados();

    } catch (error) {
      console.error("Error en saveRegistro:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.message || "Error al crear el registro",
        life: 3000,
      });
    }
  }, [registro, lotes, skusUtilizados, fechaSKU, fetchRegistros, fetchLotes, fetchSkusUtilizados]);

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
    return true;
  };

  const onRowEditComplete = async ({ newData }) => {
    const { id, ...updatedData } = newData;
    try {
      const { error } = await supabase
        .from("Control_Reempaque_PT")
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
        placeholder="Buscar por SKU o Fecha"
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
    { field: "numero_sku", header: "Número SKU" },
    { field: "fecha_proceso", header: "Fecha Proceso" },
    { field: "turno", header: "Turno" },
    { field: "tipo_proceso", header: "Tipo de Proceso" },
    { field: "motivo_proceso", header: "Motivo" },
    { field: "hora_proceso", header: "Hora Proceso" },
    { field: "sku_utilizado", header: "SKU Utilizado" },
    { field: "lotes_utilizados", header: "Lotes Utilizados" },
    { field: "kg_consumidos", header: "Kg Consumidos" },
    { field: "presentacion_empaque", header: "Presentación" },
    { field: "unidad_empaque", header: "Unidad" },
    { field: "sku_generado", header: "SKU Generado" },
    { field: "operario", header: "Operario" },
    { field: "observaciones", header: "Observaciones" },
    { field: "fecha_registro", header: "Fecha Registro" },
    { field: "hora_registro", header: "Hora Registro" },
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
    doc.text("Registros de Control de Reempaque", 14, 22);

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

    doc.save("Control Reempaque.pdf");
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
    XLSX.writeFile(wb, "Control Reempaque.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control de Reempaque Producto Terminado
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control de Reempaque de Producto Terminado.
            Aquí puedes gestionar los registros de reempaque y reproceso.
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
              header="Número SKU"
              sortable
              style={{ minWidth: "12rem" }}
            ></Column>
            <Column
              field="fecha_proceso"
              header="Fecha Proceso"
              sortable
              style={{ minWidth: "12rem" }}
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="turno"
              header="Turno"
              sortable
              style={{ minWidth: "8rem" }}
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: turnos.map((turno) => ({
                    label: turno,
                    value: turno,
                  })),
                })
              }
            ></Column>
            <Column
              field="tipo_proceso"
              header="Tipo Proceso"
              sortable
              style={{ minWidth: "15rem" }}
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: tiposProceso.map((tipo) => ({
                    label: tipo,
                    value: tipo,
                  })),
                })
              }
            ></Column>
            <Column
              field="motivo_proceso"
              header="Motivo"
              sortable
              style={{ minWidth: "15rem" }}
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: motivosProceso.map((motivo) => ({
                    label: motivo,
                    value: motivo,
                  })),
                })
              }
            ></Column>
            <Column
              field="hora_proceso"
              header="Hora Proceso"
              sortable
              style={{ minWidth: "10rem" }}
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="sku_utilizado"
              header="SKU Utilizado"
              sortable
              style={{ minWidth: "15rem" }}
            ></Column>
            <Column
              field="lotes_utilizados"
              header="Lotes Utilizados"
              sortable
              style={{ minWidth: "15rem" }}
            ></Column>
            <Column
              field="kg_consumidos"
              header="Kg Consumidos"
              sortable
              style={{ minWidth: "10rem" }}
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="presentacion_empaque"
              header="Presentación"
              sortable
              style={{ minWidth: "12rem" }}
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="unidad_empaque"
              header="Unidad"
              sortable
              style={{ minWidth: "10rem" }}
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: unidadesEmpaque.map((unidad) => ({
                    label: unidad,
                    value: unidad,
                  })),
                })
              }
            ></Column>
            <Column
              field="sku_generado"
              header="SKU Generado"
              sortable
              style={{ minWidth: "12rem" }}
            ></Column>
            <Column
              field="operario"
              header="Operario"
              sortable
              style={{ minWidth: "12rem" }}
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="observaciones"
              header="Observaciones"
              sortable
              style={{ minWidth: "15rem" }}
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="fecha_registro"
              header="Fecha Registro"
              sortable
              style={{ minWidth: "12rem" }}
            ></Column>
            <Column
              field="hora_registro"
              header="Hora Registro"
              sortable
              style={{ minWidth: "10rem" }}
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
        header="Nuevo registro de reempaque"
        modal
        className="p-fluid"
        footer={registroDialogFooter}
        onHide={hideDialog}
      >
        <div className="p-field">
          <label htmlFor="sku_generado" className="font-bold">
            Código SKU Generado{" "}
            {submitted && !registro.sku_generado && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            filter
            value={registro.sku_generado}
            onChange={(e) => {
              setRegistro({ ...registro, sku_generado: e.value });
            }}
            options={[
              { sku_generado: "Nuevo SKU" },
              ...(registros.map(r => ({ sku_generado: r.sku_generado })) || []),
            ]}
            optionLabel="sku_generado"
            optionValue="sku_generado"
            placeholder="Selecciona un Código SKU"
            className="w-full md:w-14rem"
          />
          {registro.sku_generado === "Nuevo SKU" && (
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
                required={registro.sku_generado === "Nuevo SKU"}
              />
            </>
          )}
          <br />
          
          <label htmlFor="tipo_proceso" className="font-bold">
            Tipo de Proceso{" "}
            {submitted && !registro.tipo_proceso && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="tipo_proceso"
            value={registro.tipo_proceso}
            options={tiposProceso}
            onChange={(e) => onInputChange(e, "tipo_proceso")}
            placeholder="Selecciona un Tipo de Proceso"
            required
          />
          <br />
          
          <label htmlFor="motivo_proceso" className="font-bold">
            Motivo del Proceso{" "}
            {submitted && (!registro.motivo_proceso || registro.motivo_proceso.length === 0) && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <MultiSelect
            id="motivo_proceso"
            value={registro.motivo_proceso || []}
            options={motivosProceso}
            onChange={(e) => setRegistro({...registro, motivo_proceso: e.value})}
            placeholder="Selecciona uno o más motivos"
            required
            display="chip" // Muestra los seleccionados como chips
            className="w-full"
          />
          <br />
          
          <Divider />
          <h3>
            <strong>Datos del Proceso:</strong>
          </h3>
          <Divider />
          
          <label htmlFor="fecha_proceso" className="font-bold">
            Fecha de Proceso{" "}
            {submitted && !registro.fecha_proceso && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_proceso"
            value={registro.fecha_proceso}
            onChange={(e) => onInputChange(e, "fecha_proceso")}
          />
          <br />
          
          <label htmlFor="turno" className="font-bold">
            Turno{" "}
            {submitted && !registro.turno && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="turno"
            value={registro.turno}
            options={turnos}
            onChange={(e) => onInputChange(e, "turno")}
            placeholder="Selecciona un Turno"
            required
          />
          <br />
          
          <label htmlFor="hora_proceso" className="font-bold">
            Hora de Proceso{" "}
            {submitted && !registro.hora_proceso && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hora_proceso"
            value={registro.hora_proceso}
            onChange={(e) => onInputChange(e, "hora_proceso")}
          />
          <br />
          
          <label htmlFor="sku_utilizado" className="font-bold">
            SKU Utilizado{" "}
            {submitted && !registro.sku_utilizado && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="sku_utilizado"
            value={registro.sku_utilizado}
            options={skusUtilizados}
            optionLabel="numero_sku"
            optionValue="numero_sku"
            onChange={(e) => onInputChange(e, "sku_utilizado")}
            placeholder="Selecciona un SKU utilizado"
            required
            filter // Esta propiedad habilita la búsqueda
            filterBy="numero_sku" // Esto asegura que filtre por el campo correcto
            showFilterClear // Opcional: muestra un botón para limpiar el filtro
          />
          <br />
          
          <label htmlFor="lotes_utilizados" className="font-bold">
            Lotes Utilizados
          </label>
          <MultiSelect
            value={registro.lotes_utilizados}
            options={lotes}
            optionLabel="base_numero_lote"
            onChange={(e) => {
              // Si selecciona "No aplica", limpiamos los demás lotes
              const tieneNoAplica = e.value.some(item => item.base_numero_lote === "No aplica");
              const nuevosLotes = tieneNoAplica 
                ? [{ base_numero_lote: "No aplica" }] 
                : e.value.filter(item => item.base_numero_lote !== "No aplica");
              
              setRegistro({ ...registro, lotes_utilizados: nuevosLotes });
            }}
            placeholder="Seleccione lotes utilizados"
            className="w-full"
            display="chip"
            filter
          />
          <br />
          <label htmlFor="kg_consumidos" className="font-bold">
            Kg Consumidos
          </label>
          <InputText
            id="kg_consumidos"
            type="number"
            value={registro.kg_consumidos}
            onChange={(e) => onInputChange(e, "kg_consumidos")}
          />
          <br />
          <label htmlFor="presentacion_empaque" className="font-bold">
            Presentación de Empaque{" "}
            {submitted && !registro.presentacion_empaque && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="presentacion_empaque"
            value={registro.presentacion_empaque}
            onChange={(e) => onInputChange(e, "presentacion_empaque")}
          />
          <br />
          
          <label htmlFor="unidad_empaque" className="font-bold">
            Unidad de Empaque{" "}
            {submitted && !registro.unidad_empaque && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="unidad_empaque"
            value={registro.unidad_empaque}
            options={unidadesEmpaque}
            onChange={(e) => onInputChange(e, "unidad_empaque")}
            placeholder="Selecciona una Unidad"
            required
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

export default ControlReempaque;