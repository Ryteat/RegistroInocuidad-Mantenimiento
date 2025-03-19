import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ControLRendimientoDietaySiembra.css"; // Importa el CSS
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
    kg_total: "",
    tipo_dieta: "",
    cajas_procesadas_neonatos: "",
    cant_cajas_dieta: 0,
    _originalCajas: 0, // Nuevo campo para almacenar el valor original
    cajas_sembradas_rep: "",
    cajas_dieta_no_sembradas_rep: "",
    g_neonatos_sembrados_caja_rep: "",
    cajas_sembradas_pro: "",
    cajas_dieta_no_sembradas_pro: "",
    g_neonatos_sembrados_caja_pro: "",
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
  const [globalFilter, setGlobalFilter] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [registroDialog, setRegistroDialog] = useState(false);
  const navigate = useNavigate();

  // Opciones para el campo "linea_produc"
  const tipoDieta = ["Producción", "Reproducción", "Neonatos"];
  const tipoControl = ["Control", "Prueba"];
  //Errores de validación
  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    cajas_procesadas_neonatos: false,

    cajas_sembradas_rep: false,
    cajas_dieta_no_sembradas_rep: false,
    g_neonatos_sembrados_caja_rep: false,

    cajas_sembradas_pro: false,
    cajas_dieta_no_sembradas_pro: false,
    g_neonatos_sembrados_caja_pro: false,
  });
  const [lotes, setLotes] = useState([]);

  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("Control_Rendimiento_DietaySiembra")
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
        .in("etapa_actual", ["Hatchery", "Dieta", "Cosecha"]); // Filtra registros con etapa_actual igual a 'hatchery' o 'dieta'
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
  
    const isCajasProcesadasNeonatosInvalido = isInvalid(
      registro.cajas_procesadas_neonatos,
      0,
      registro.cant_cajas_dieta
    );
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
    const isNeonatosSembradosCajaRepInvalido = isInvalid(
      registro.g_neonatos_sembrados_caja_rep,
      0,
      300
    );
    const isCajasSembradasProInvalido = isInvalid(
      registro.cajas_sembradas_pro,
      0,
      2000
    );
    const isCajasDietaNoSembradasProInvalido = isInvalid(
      registro.cajas_dieta_no_sembradas_pro,
      0,
      100
    );
    const isNeonatosSembradosCajaProInvalido = isInvalid(
      registro.g_neonatos_sembrados_caja_pro,
      0,
      300
    );
  
    // Actualizar el estado de errores
    setErroresValidacion({
      cajas_procesadas_neonatos: isCajasProcesadasNeonatosInvalido,
      cajas_sembradas_rep: isCajasSembradasRepInvalido,
      cajas_dieta_no_sembradas_rep: isCajasDietaNoSembradasRepInvalido,
      g_neonatos_sembrados_caja_rep: isNeonatosSembradosCajaRepInvalido,
      cajas_sembradas_pro: isCajasSembradasProInvalido,
      cajas_dieta_no_sembradas_pro: isCajasDietaNoSembradasProInvalido,
      g_neonatos_sembrados_caja_pro: isNeonatosSembradosCajaProInvalido,
    });
  
    const valoresFueraDeRango =
      isCajasProcesadasNeonatosInvalido ||
      isCajasSembradasRepInvalido ||
      isCajasDietaNoSembradasRepInvalido ||
      isNeonatosSembradosCajaRepInvalido ||
      isCajasSembradasProInvalido ||
      isCajasDietaNoSembradasProInvalido ||
      isNeonatosSembradosCajaProInvalido;
  
    if (
      !registro.cantidad_tandas ||
      !registro.kg_dieta_caja ||
      !registro.kg_residuo_organico ||
      !registro.kg_puntilla_arroz ||
      !registro.kg_destilado_maiz ||
      !registro.kg_melaza ||
      !registro.g_espesante ||
      !registro.lts_agua ||
      !registro.g_pure_banano ||
      !registro.kg_otro ||
      !registro.kg_total ||
      !registro.tipo_dieta ||
      !registro.cajas_procesadas_neonatos ||
      !registro.cajas_sembradas_rep ||
      !registro.cajas_dieta_no_sembradas_rep ||
      !registro.g_neonatos_sembrados_caja_rep ||
      !registro.cajas_sembradas_pro ||
      !registro.cajas_dieta_no_sembradas_pro ||
      !registro.g_neonatos_sembrados_caja_pro ||
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
  
    if (registro.cajas_procesadas_neonatos > registro.cant_cajas_dieta) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: `No puedes procesar más cajas (${registro.cajas_procesadas_neonatos}) de las disponibles en el lote (${registro.cant_cajas_dieta})`,
        life: 3000,
      });
      return;
    }
  
    // Validación principal
    if (valoresFueraDeRango && !registro.observaciones) {
      setObservacionesObligatorio(true);
      const currentErrores = {
        "Cajas Procesadas Neonatos": isCajasProcesadasNeonatosInvalido,
        "Cajas Sembradas Reproduccion": isCajasSembradasRepInvalido,
        "Cajas no Sembradas Reproduccion": isCajasDietaNoSembradasRepInvalido,
        "G Neonatos Sembrados Reproduccion": isNeonatosSembradosCajaRepInvalido,
        "Cajas Sembradas Produccion": isCajasSembradasProInvalido,
        "Cajas No Sembradas Produccion": isCajasDietaNoSembradasProInvalido,
        "G Neonatos Sembrados Produccion": isNeonatosSembradosCajaProInvalido,
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
      cajas_procesadas_neonatos: false,
      cajas_sembradas_rep: false,
      cajas_dieta_no_sembradas_rep: false,
      g_neonatos_sembrados_caja_rep: false,
      cajas_sembradas_pro: false,
      cajas_dieta_no_sembradas_pro: false,
      g_neonatos_sembrados_caja_pro: false,
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
            kg_total: registro.kg_total,
            tipo_dieta: registro.tipo_dieta,
            cajas_procesadas_neonatos: registro.cajas_procesadas_neonatos,
            cajas_sembradas_rep: registro.cajas_sembradas_rep,
            cajas_dieta_no_sembradas_rep: registro.cajas_dieta_no_sembradas_rep,
            g_neonatos_sembrados_caja_rep: registro.g_neonatos_sembrados_caja_rep,
            cajas_sembradas_pro: registro.cajas_sembradas_pro,
            cajas_dieta_no_sembradas_pro: registro.cajas_dieta_no_sembradas_pro,
            g_neonatos_sembrados_caja_pro: registro.g_neonatos_sembrados_caja_pro,
            tipo_control: registro.tipo_control,
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,
          },
        ]);
  
      if (error) {
        console.error("Error en Supabase:", error);
        throw new Error(error.message || "Error desconocido al guardar en Supabase");
      }
  
      // Actualizar la tabla Lotes con la nueva etapa_actual
      const nuevasCajas = registro.cant_cajas_dieta - registro.cajas_procesadas_neonatos;
  
      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          cant_cajas_dieta: nuevasCajas,
          etapa_actual: "Dieta",
          fecha_siembra: currentDate,
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
      const diferencia = newData.cajas_procesadas_neonatos - oldData.cajas_procesadas_neonatos;
      
      // 2. Obtener lote actual
      const { data: lote, error: loteError } = await supabase
        .from('Lotes')
        .select('cant_cajas_dieta')
        .eq('base_numero_lote', oldData.base_numero_lote)
        .single();
  
      if (loteError) throw loteError;
  
      // 3. Calcular nuevo valor
      const nuevasCajas = lote.cant_cajas_dieta - diferencia;
      
      if (nuevasCajas < 0) {
        throw new Error('Cantidad de cajas no puede ser negativa');
      }
  
      // 4. Actualizar Control_Rendimiento_DietaySiembra
      const { error: updateError } = await supabase
        .from('Control_Rendimiento_DietaySiembra')
        .update(newData)
        .eq('id', newData.id);
  
      if (updateError) throw updateError;
  
      // 5. Actualizar Lotes
      const { error: loteUpdateError } = await supabase
        .from('Lotes')
        .update({
          cant_cajas_dieta: nuevasCajas,
          etapa_actual: "Dieta"
        })
        .eq('base_numero_lote', oldData.base_numero_lote);
  
      if (loteUpdateError) throw loteUpdateError;
  
      // 6. Actualizar estado local
      setRegistros(prev => prev.map(item => 
        item.id === newData.id ? newData : item
      ));
  
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error en edición',
        detail: error.message || 'Error al actualizar el registro',
        life: 3000
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
    { field: "cantidad_tandas", header: "Cantidad Tandas" },
    { field: "kg_dieta_caja", header: "Kg Dieta Caja" },
    { field: "kg_residuo_organico", header: "Kg Residuo Orgánico" },
    { field: "kg_puntilla_arroz", header: "Kg Puntilla Arroz" },
    { field: "kg_destilado_maiz", header: "Kg Destilado Maíz" },
    { field: "kg_melaza", header: "Kg Melaza" },
    { field: "g_espesante", header: "G Espesante" },
    { field: "lts_agua", header: "Lts Agua" },
    { field: "g_pure_banano", header: "G Puré Banano" },
    { field: "kg_otro", header: "Kg Otro" },
    { field: "kg_total", header: "Kg Total" },
    { field: "tipo_dieta", header: "Tipo Dieta" },
    { field: "cajas_procesadas_neonatos", header: "Cajas Procesadas Neonatos" },
    { field: "cajas_sembradas_rep", header: "Cajas Sembradas Rep" },
    {
      field: "cajas_dieta_no_sembradas_rep",
      header: "Cajas Dieta No Sembradas Rep",
    },
    {
      field: "g_neonatos_sembrados_caja_rep",
      header: "G Neonatos Sembrados Caja Rep",
    },
    { field: "cajas_sembradas_pro", header: "Cajas Sembradas Pro" },
    {
      field: "cajas_dieta_no_sembradas_pro",
      header: "Cajas Dieta No Sembradas Pro",
    },
    {
      field: "g_neonatos_sembrados_caja_pro",
      header: "G Neonatos Sembrados Caja Pro",
    },
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
            editMode="row"
            // onRowEditInit={onRowEditInit} SE USA PARA ABRIR NUEVAMENTE EL DIALOGO PARA EDITARLO VALORARLO
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
              header="G Espesante"
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
              header="G Puré Banano"
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
              field="kg_total"
              header="Kg Total"
              editor={(options) => floatEditor(options)}
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
              header="G Cajas Sembradas Rep"
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
              field="g_neonatos_sembrados_caja_rep"
              header="G Neonatos Sembrados Caja Rep"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="cajas_sembradas_pro"
              header="G Cajas Sembradas Pro"
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
              field="g_neonatos_sembrados_caja_pro"
              header="G Neonatos Sembrados Caja Pro"
              editor={(options) => floatEditor(options)}
              sortable
            />
            <Column
              field="tipo_dieta"
              header="Tipo Dieta"
              editor={(options) => textEditor(options)}
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
            onChange={async (e) => {
              const loteSeleccionado = lotes.find(
                (l) => l.base_numero_lote === e.value
              );

              if (loteSeleccionado) {
                // Obtener los datos actualizados del lote desde Supabase
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
            options={[...(lotes || [])]}
            optionLabel="base_numero_lote" // Mostrar el campo "label" en el dropdown
            optionValue="base_numero_lote" // Guardar el valor de "base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
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
            id="kg_melaza"
            value={registro.kg_melaza}
            onChange={(e) => onInputChange(e, "kg_melaza")}
            required
          />
          <br />

          <label htmlFor="g_espesante" className="font-bold">
            G Espesante{" "}
            {submitted && !registro.g_espesante && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="numberr"
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
            type="numberr"
            id="lts_agua"
            value={registro.lts_agua}
            onChange={(e) => onInputChange(e, "lts_agua")}
            required
          />
          <br />

          <label htmlFor="g_pure_banano" className="font-bold">
            G Pure Banano{" "}
            {submitted && !registro.g_pure_banano && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
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
            id="kg_otro"
            value={registro.kg_otro}
            onChange={(e) => onInputChange(e, "kg_otro")}
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
            id="kg_total"
            value={registro.kg_total}
            onChange={(e) => onInputChange(e, "kg_total")}
            required
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
          <Divider />
          <h3>
            <strong>Neonatos:</strong>
          </h3>
          <label htmlFor="cajas_procesadas_neonatos" className="font-bold">
            Cajas Procesadas Neonatos{" "}
            {submitted && !registro.cajas_procesadas_neonatos && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cajas_procesadas_neonatos && (
              <small className="p-error">
                Cajas Procesadas Neonatos debe de estar entre 0 a{" "}
                {registro.cant_cajas_dieta}.
              </small>
            )}
          </label>
          <InputText
            type="number"
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
            id="cajas_dieta_no_sembradas_rep"
            value={registro.cajas_dieta_no_sembradas_rep}
            onChange={(e) => onInputChange(e, "cajas_dieta_no_sembradas_rep")}
            required
          />
          <br />

          <label htmlFor="g_neonatos_sembrados_caja_rep" className="font-bold">
            G Neonatos Sembrados Caja Reproduccion{" "}
            {submitted && !registro.g_neonatos_sembrados_caja_rep && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.g_neonatos_sembrados_caja_rep && (
              <small className="p-error">
                Cajas Sembradas de Reproduccion debe de estar entre 0 a 300.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="g_neonatos_sembrados_caja_rep"
            value={registro.g_neonatos_sembrados_caja_rep}
            onChange={(e) => onInputChange(e, "g_neonatos_sembrados_caja_rep")}
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
                Cajas Sembradas de Reproduccion debe de estar entre 0 a 2000.
              </small>
            )}
          </label>
          <InputText
            type="number"
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
            id="cajas_dieta_no_sembradas_pro"
            value={registro.cajas_dieta_no_sembradas_pro}
            onChange={(e) => onInputChange(e, "cajas_dieta_no_sembradas_pro")}
            required
          />
          <br />

          <label htmlFor="g_neonatos_sembrados_caja_pro" className="font-bold">
            G Neonatos Sembrados Caja Produccion{" "}
            {submitted && !registro.g_neonatos_sembrados_caja_pro && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.g_neonatos_sembrados_caja_pro && (
              <small className="p-error">
                Cajas Sembradas de Produccion debe de estar entre 0 a 300.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="g_neonatos_sembrados_caja_pro"
            value={registro.g_neonatos_sembrados_caja_pro}
            onChange={(e) => onInputChange(e, "g_neonatos_sembrados_caja_pro")}
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
