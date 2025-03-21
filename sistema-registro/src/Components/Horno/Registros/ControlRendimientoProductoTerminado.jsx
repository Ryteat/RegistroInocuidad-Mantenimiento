import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControlRendimientoProductoTerminado.css"; // Importa el CSS
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

    operario_empaque: "",
    encargado_bodega: "",
    encargado_planta: "",
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
  const [skus, setSKUs] = useState([]);
  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Rendimiento_Producto_Terminado")
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
        .select()
        .or(
          "etapa_actual.ilike.%Horno%,etapa_actual.ilike.%ProductoTerminado%"
        );

      if (error) throw error;
      setLotes(data || []); // Eliminar la 's' extraña aquí
    } catch (err) {
      console.log("Error en la conexión a la base de datos Lotes", err);
    }
  };
  const fetchSKU = async () => {
    try {
      const { data, error } = await supabase
        .from("SKU")
        .select("base_codigo_sku");

      if (error) throw error;
      setSKUs(data || []);
    } catch (err) {
      console.log("Error obteniendo SKUs", err);
    }
  };
  useEffect(() => {
    fetchRegistros();
    fetchLotes();
    fetchSKU();
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

  function generarFormatoJuliano(currentDate) {
    // Dividir la fecha en día, mes y año
    const [dia, mes, año] = currentDate.split("/").map(Number);

    // Crear fechas en UTC para evitar problemas con husos horarios
    const fecha = new Date(Date.UTC(año, mes - 1, dia));
    const inicioAño = new Date(Date.UTC(año, 0, 1)); // 1 de enero del mismo año

    // Calcular diferencia en milisegundos y convertir a días
    const diferencia = fecha - inicioAño;
    const diaJuliano = Math.floor(diferencia / (1000 * 60 * 60 * 24)) + 1; // +1 porque el año empieza en día 1

    // Formatear componentes
    const diaJulianoFormateado = diaJuliano.toString().padStart(3, "0"); // 3 dígitos con ceros a la izquierda
    const año2Digitos = año.toString().slice(-2); // Últimos 2 dígitos del año

    return `PR${diaJulianoFormateado}${año2Digitos}`;
  }
  const saveRegistro = async () => {
    setSubmitted(true);
    if (
      !registro.fecha_produccion ||
      !registro.hora ||
      !registro.lote ||
      !registro.cant_bolsas ||
      !registro.operario ||
      !registro.cons_cartonnormal ||
      !registro.dese_cartonnormal ||
      !registro.cons_cartonreforzado ||
      !registro.dese_cartonreforzado ||
      !registro.cons_bolsaempaque ||
      !registro.dese_bolsaempaque ||
      !registro.cons_cinta ||
      !registro.dese_cinta ||
      !registro.cons_tinta ||
      !registro.dese_tinta ||
      !registro.cons_diluyente ||
      !registro.dese_diluyente ||
      !registro.cons_jumbopeq ||
      !registro.dese_jumbopeq ||
      !registro.cons_jumbogrande ||
      !registro.dese_jumbogrande ||
      !registro.cons_bolsapeq ||
      !registro.dese_bolsapeq ||
      !registro.cons_bolsagrande ||
      !registro.dese_bolsagrande ||
      !registro.cons_gazaplastica ||
      !registro.dese_gazaplastica ||
      !registro.operario_empaque ||
      !registro.encargado_bodega ||
      !registro.encargado_planta
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
      const posibleSKU = generarFormatoJuliano(currentDate);
      const currentTime = formatDateTime(new Date(), "hh:mm A");
      let baseCodigoSKUToInsert = registro.base_codigo_sku;
      // Si el valor es "nuevo", crear un lote
      if (registro.base_codigo_sku === "Nuevo SKU") {
        // Verificar si el lote ya existe
        if (skus.some((sku) => sku.base_codigo_sku === posibleSKU)) {
          toast.current.show({
            severity: "warn",
            detail: `El lote ${posibleSKU} ya existe. Selecciónalo.`,
          });
          return;
        }

        // Crear nuevo lote
        const { data, error } = await supabase.rpc("generar_sku_base", {
          p_fecha_registro: currentDate,
          p_hora_registro: currentTime,
        });

        if (error) {
          toast.current.show({
            severity: "error",
            detail: "Error al crear lote.",
          });
          return;
        }

        // Actualizar el valor local y el estado
        baseCodigoSKUToInsert = data;
        setRegistro({ ...registro, base_codigo_sku: data });
      } else {
        // Verificar si el lote existe
        const { data: skuExistente, error: skuError } = await supabase
          .from("SKU")
          .select("base_codigo_sku")
          .eq("base_codigo_sku", registro.base_codigo_sku)
          .single();

        if (skuError || !skuExistente) {
          toast.current.show({
            severity: "error",
            detail: `El lote ${registro.base_codigo_sku} no existe.`,
          });
          return;
        }
      }

      // 2. Insertar relaciones en sku_lotes
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


      // 2. Convertir lotes a string
      const lotesString = registro.lote
        .map((l) => l.base_numero_lote)
        .join(", ");


        
      // 3. Insertar registro (sin incluir SKU)
      const { data, error } = await supabase
        .from("Control_Rendimiento_Producto_Terminado")
        .insert([
          {
            base_codigo_sku: baseCodigoSKUToInsert, // Solo enviamos la base
            numero_sku: registro.numero_sku,
            fecha_produccion: convertirFecha(registro.fecha_produccion),
            hora: registro.hora,
            lote: lotesString,
            cant_bolsas: registro.cant_bolsas,
            operario: registro.operario,
            fecha_registro: currentDate,
            hora_registro: currentTime,
            observaciones: registro.observaciones,
            cons_cartonnormal: registro.cons_cartonnormal,
            dese_cartonnormal: registro.dese_cartonnormal,
            cons_cartonreforzado: registro.cons_cartonreforzado,
            dese_cartonreforzado: registro.dese_cartonreforzado,
            cons_bolsaempaque: registro.cons_bolsaempaque,
            dese_bolsaempaque: registro.dese_bolsaempaque,
            cons_cinta: registro.cons_cinta,
            dese_cinta: registro.dese_cinta,
            cons_tinta: registro.cons_tinta,
            dese_tinta: registro.dese_tinta,
            cons_diluyente: registro.cons_diluyente,
            dese_diluyente: registro.dese_diluyente,
            cons_jumbopeq: registro.cons_jumbopeq,
            dese_jumbopeq: registro.dese_jumbopeq,
            cons_jumbogrande: registro.cons_jumbogrande,
            dese_jumbogrande: registro.dese_jumbogrande,
            cons_bolsapeq: registro.cons_bolsapeq,
            dese_bolsapeq: registro.dese_bolsapeq,
            cons_bolsagrande: registro.cons_bolsagrande,
            dese_bolsagrande: registro.dese_bolsagrande,
            cons_gazaplastica: registro.cons_gazaplastica,
            dese_gazaplastica: registro.dese_gazaplastica,
            operario_empaque: registro.operario_empaque,
            encargado_bodega: registro.encargado_bodega,
            encargado_planta: registro.encargado_planta,
          },
        ]);

      if (error) {
        throw new Error(
          "Error al guardar en Control Rendimiento: " + error.message
        );
      }
      // Actualizar estado de los lotes seleccionados
    const lotesIds = registro.lote.map((l) => l.base_numero_lote);
    const { error: updateError } = await supabase
      .from("Lotes")
      .update({ etapa_actual: "ProductoTerminado",
        fecha_empaque: currentDate }
)
      .in("base_numero_lote", lotesIds);

    if (updateError) {
      throw new Error("Error al actualizar estado de los lotes: " + updateError.message);
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

  const onRowEditComplete = async ({ newData }) => {
    const { id, ...updatedData } = newData;
    try {
      const { error } = await supabase
        .from("Control_Neonatos")
        .update(updatedData)
        .eq("id", id);

      if (error) return console.error("Error al actualizar:", error.message);

      setRegistros((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...newData } : n))
      );
    } catch (err) {
      console.error("Error inesperado:", err);
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
    { field: "base_codigo_sku", header: "Codigo SKU" },
    { field: "numero_sku", header: "SKU Generado" },
    { field: "lote", header: "Lotes" },
    { field: "fecha_produccion", header: "Fecha Producción" },
    { field: "hora", header: "Hora" },

    { field: "cant_bolsas", header: "Cantidad Bolsas" },
    { field: "SKU", header: "SKU" },
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
              field="operario_empaque"
              header="Operario Empaque"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="encargado_bodega"
              header="Encargado Bodega"
              editor={(options) => textEditor(options)}
            ></Column>
            <Column
              field="encargado_planta"
              header="Encargado Planta"
              editor={(options) => textEditor(options)}
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
              field="cant_bolsas"
              header="Cantidad Bolsas"
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="operario"
              header="Operario"
              editor={(options) => textEditor(options)}
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
            value={registro.base_codigo_sku}
            onChange={(e) => {
              setRegistro({ ...registro, base_codigo_sku: e.value });
            }}
            options={[
              // Opción "Nuevo Lote" con valor "nuevo"
              { base_codigo_sku: "Nuevo SKU" },
              ...(skus || []),
            ]}
            optionLabel="base_codigo_sku" // Mostrar el campo "label" en el dropdown
            optionValue="base_codigo_sku" // Guardar el valor de "base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
          />
          <br />
          <Divider />
          <h3>
            <strong>Encargados:</strong>
          </h3>
          <Divider />

          <label htmlFor="operario_empaque" className="font-bold">
            Operario Empaque{" "}
            {submitted && !registro.operario_empaque && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="operario_empaque"
            value={registro.operario_empaque}
            onChange={(e) => onInputChange(e, "operario_empaque")}
          />
          <br />
          <label htmlFor="encargado_bodega" className="font-bold">
            Encargado Bodega{" "}
            {submitted && !registro.encargado_bodega && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="encargado_bodega"
            value={registro.encargado_bodega}
            onChange={(e) => onInputChange(e, "encargado_bodega")}
          />
          <br />
          <label htmlFor="encargado_planta" className="font-bold">
            Encargado Planta{" "}
            {submitted && !registro.encargado_planta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="encargado_planta"
            value={registro.encargado_planta}
            onChange={(e) => onInputChange(e, "encargado_planta")}
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
            optionLabel="base_numero_lote" // Asegúrate que este campo existe en tus lotes
            placeholder="Seleccione Lotes"
            maxSelectedLabels={3}
            className="w-full"
          />

          <br />

          <label htmlFor="cant_bolsas" className="font-bold">
            Cantidad Bolsas{" "}
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

          {/* <br /> */}

          {/* <label htmlFor="SKU" className="font-bold">
            SKU{" "}
            {submitted && !registro.SKU && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="SKU"
            value={registro.SKU}
            onChange={(e) => onInputChange(e, "SKU")}
          /> */}

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
            Consumo Cartón Normal{" "}
            {submitted && !registro.cons_cartonnormal && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_cartonnormal"
            value={registro.cons_cartonnormal}
            onChange={(e) => onInputChange(e, "cons_cartonnormal")}
          />

          <br />

          <label htmlFor="dese_cartonnormal" className="font-bold">
            Desecho Cartón Normal{" "}
            {submitted && !registro.dese_cartonnormal && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_cartonnormal"
            value={registro.dese_cartonnormal}
            onChange={(e) => onInputChange(e, "dese_cartonnormal")}
          />

          <br />

          <label htmlFor="cons_cartonreforzado" className="font-bold">
            Consumo Cartón Reforzado{" "}
            {submitted && !registro.cons_cartonreforzado && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_cartonreforzado"
            value={registro.cons_cartonreforzado}
            onChange={(e) => onInputChange(e, "cons_cartonreforzado")}
          />

          <br />

          <label htmlFor="dese_cartonreforzado" className="font-bold">
            Desecho Cartón Reforzado{" "}
            {submitted && !registro.dese_cartonreforzado && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_cartonreforzado"
            value={registro.dese_cartonreforzado}
            onChange={(e) => onInputChange(e, "dese_cartonreforzado")}
          />

          <br />

          <label htmlFor="cons_bolsaempaque" className="font-bold">
            Consumo Bolsa Empaque{" "}
            {submitted && !registro.cons_bolsaempaque && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_bolsaempaque"
            value={registro.cons_bolsaempaque}
            onChange={(e) => onInputChange(e, "cons_bolsaempaque")}
          />

          <br />

          <label htmlFor="dese_bolsaempaque" className="font-bold">
            Desecho Bolsa Empaque{" "}
            {submitted && !registro.dese_bolsaempaque && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_bolsaempaque"
            value={registro.dese_bolsaempaque}
            onChange={(e) => onInputChange(e, "dese_bolsaempaque")}
          />

          <br />

          <label htmlFor="cons_cinta" className="font-bold">
            Consumo Cinta{" "}
            {submitted && !registro.cons_cinta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_cinta"
            value={registro.cons_cinta}
            onChange={(e) => onInputChange(e, "cons_cinta")}
          />

          <br />

          <label htmlFor="dese_cinta" className="font-bold">
            Desecho Cinta{" "}
            {submitted && !registro.dese_cinta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_cinta"
            value={registro.dese_cinta}
            onChange={(e) => onInputChange(e, "dese_cinta")}
          />

          <br />

          <label htmlFor="cons_tinta" className="font-bold">
            Consumo Tinta{" "}
            {submitted && !registro.cons_tinta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_tinta"
            value={registro.cons_tinta}
            onChange={(e) => onInputChange(e, "cons_tinta")}
          />

          <br />

          <label htmlFor="dese_tinta" className="font-bold">
            Desecho Tinta{" "}
            {submitted && !registro.dese_tinta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_tinta"
            value={registro.dese_tinta}
            onChange={(e) => onInputChange(e, "dese_tinta")}
          />

          <br />

          <label htmlFor="cons_diluyente" className="font-bold">
            Consumo Diluyente{" "}
            {submitted && !registro.cons_diluyente && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_diluyente"
            value={registro.cons_diluyente}
            onChange={(e) => onInputChange(e, "cons_diluyente")}
          />

          <br />

          <label htmlFor="dese_diluyente" className="font-bold">
            Desecho Diluyente{" "}
            {submitted && !registro.dese_diluyente && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_diluyente"
            value={registro.dese_diluyente}
            onChange={(e) => onInputChange(e, "dese_diluyente")}
          />

          <br />

          <label htmlFor="cons_jumbopeq" className="font-bold">
            Consumo Jumbo Pequeño{" "}
            {submitted && !registro.cons_jumbopeq && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_jumbopeq"
            value={registro.cons_jumbopeq}
            onChange={(e) => onInputChange(e, "cons_jumbopeq")}
          />

          <br />

          <label htmlFor="dese_jumbopeq" className="font-bold">
            Desecho Jumbo Pequeño{" "}
            {submitted && !registro.dese_jumbopeq && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_jumbopeq"
            value={registro.dese_jumbopeq}
            onChange={(e) => onInputChange(e, "dese_jumbopeq")}
          />

          <br />

          <label htmlFor="cons_jumbogrande" className="font-bold">
            Consumo Jumbo Grande{" "}
            {submitted && !registro.cons_jumbogrande && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_jumbogrande"
            value={registro.cons_jumbogrande}
            onChange={(e) => onInputChange(e, "cons_jumbogrande")}
          />

          <br />

          <label htmlFor="dese_jumbogrande" className="font-bold">
            Desecho Jumbo Grande{" "}
            {submitted && !registro.dese_jumbogrande && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_jumbogrande"
            value={registro.dese_jumbogrande}
            onChange={(e) => onInputChange(e, "dese_jumbogrande")}
          />

          <br />

          <label htmlFor="cons_bolsapeq" className="font-bold">
            Consumo Bolsa Pequeña{" "}
            {submitted && !registro.cons_bolsapeq && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_bolsapeq"
            value={registro.cons_bolsapeq}
            onChange={(e) => onInputChange(e, "cons_bolsapeq")}
          />

          <br />

          <label htmlFor="dese_bolsapeq" className="font-bold">
            Desecho Bolsa Pequeña{" "}
            {submitted && !registro.dese_bolsapeq && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_bolsapeq"
            value={registro.dese_bolsapeq}
            onChange={(e) => onInputChange(e, "dese_bolsapeq")}
          />

          <br />

          <label htmlFor="cons_bolsagrande" className="font-bold">
            Consumo Bolsa Grande{" "}
            {submitted && !registro.cons_bolsagrande && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_bolsagrande"
            value={registro.cons_bolsagrande}
            onChange={(e) => onInputChange(e, "cons_bolsagrande")}
          />

          <br />

          <label htmlFor="dese_bolsagrande" className="font-bold">
            Desecho Bolsa Grande{" "}
            {submitted && !registro.dese_bolsagrande && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_bolsagrande"
            value={registro.dese_bolsagrande}
            onChange={(e) => onInputChange(e, "dese_bolsagrande")}
          />

          <br />

          <label htmlFor="cons_gazaplastica" className="font-bold">
            Consumo Gasa Plástica{" "}
            {submitted && !registro.cons_gazaplastica && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="cons_gazaplastica"
            value={registro.cons_gazaplastica}
            onChange={(e) => onInputChange(e, "cons_gazaplastica")}
          />

          <br />

          <label htmlFor="dese_gazaplastica" className="font-bold">
            Desecho Gasa Plástica{" "}
            {submitted && !registro.dese_gazaplastica && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            id="dese_gazaplastica"
            value={registro.dese_gazaplastica}
            onChange={(e) => onInputChange(e, "dese_gazaplastica")}
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
};
export default ControlRendimientoProductoTerminado;
