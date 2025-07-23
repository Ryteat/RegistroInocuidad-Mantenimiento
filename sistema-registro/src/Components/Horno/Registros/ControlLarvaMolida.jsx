import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
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

const ControlLarvaMolida = () => {
  let emptyRegister = {
    fecha_prod: "",
    hora_inicio: "",
    hora_fin: "",
    tipo_control: "",
    sku: "",
    numero_sku: "",
    lotes: [],
    larva_entera_seca: 0,
    larva_molida: 0,
    merma: 0,
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

  const tiposControl = ["Control", "Prueba"];

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
          .from("Control_Larva_Molida")
          .select("*", { count: "exact" })
          .range(start, start + limit - 1);

        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

        if (lazyParams.globalFilter) {
          query = query.or(
            `sku.ilike.%${lazyParams.globalFilter}%,numero_sku.ilike.%${lazyParams.globalFilter}%,fecha_prod.ilike.%${lazyParams.globalFilter}%`
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

      return `LM${diaJulianoFormateado}${año2Digitos}`;
    } catch (error) {
      console.error("Error al generar formato juliano:", error);
      throw new Error("Error al procesar la fecha");
    }
  }

  const calcularMerma = useCallback(() => {
    const larvaEnteraSeca = parseFloat(registro.larva_entera_seca) || 0;
    const larvaMolida = parseFloat(registro.larva_molida) || 0;
    const merma = larvaEnteraSeca - larvaMolida;
    setRegistro(prev => ({
      ...prev,
      merma: merma.toFixed(2)
    }));
  }, [registro.larva_entera_seca, registro.larva_molida]);

  useEffect(() => {
    calcularMerma();
  }, [registro.larva_entera_seca, registro.larva_molida, calcularMerma]);

  const saveRegistro = useCallback(async () => {
    setSubmitted(true);
    
    if (
      !registro.fecha_prod ||
      !registro.hora_inicio ||
      !registro.hora_fin ||
      !registro.tipo_control ||
      !registro.sku ||
      registro.lotes.length === 0 ||
      registro.larva_entera_seca === null ||
      registro.larva_molida === null ||
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
      const now = new Date();
      const currentDateISO = now.toISOString().slice(0, 10);
      const currentDateDisplay = convertirFecha(currentDateISO);
      const currentTime = now.toTimeString().slice(0, 5);
      let skuToInsert = registro.sku;

      if (registro.sku === "Nuevo SKU") {
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
          p_fecha_registro: currentDateDisplay,
          p_hora_registro: currentTime,
          p_tipo_sku: "LM",
        });

        if (error) throw error;
        
        skuToInsert = data;
        setRegistro({ ...registro, sku: data });
      }

      // Obtener el consecutivo para el SKU
      const { count: consecutivo } = await supabase
        .from("Control_Larva_Molida")
        .select("*", { count: "exact", head: true })
        .eq("sku", skuToInsert);

      const numeroSKU = `${skuToInsert}-${(consecutivo + 1).toString().padStart(3, '0')}`;

      const lotesIds = registro.lotes.map((l) => l.base_numero_lote);
      const relacionesInsert = lotesIds.map((loteId) => ({
        sku_base: skuToInsert,
        base_numero_lote: loteId,
      }));

      const { error: relacionesError } = await supabase
        .from("sku_lotes")
        .insert(relacionesInsert);

      if (relacionesError) throw relacionesError;

      const lotesString = registro.lotes.map((l) => l.base_numero_lote).join(", ");

      const { data, error } = await supabase
        .from("Control_Larva_Molida")
        .insert([{
          fecha_prod: convertirFecha(registro.fecha_prod),
          hora_inicio: registro.hora_inicio,
          hora_fin: registro.hora_fin,
          tipo_control: registro.tipo_control,
          sku: skuToInsert,
          numero_sku: numeroSKU,
          lotes: lotesString,
          larva_entera_seca: parseFloat(registro.larva_entera_seca) || 0,
          larva_molida: parseFloat(registro.larva_molida) || 0,
          merma: parseFloat(registro.merma) || 0,
          operario: registro.operario,
          observaciones: registro.observaciones,
          fecha_registro: currentDateDisplay,
          hora_registro: currentTime,
        }]);

      if (error) throw error;

      const { error: updateError } = await supabase
        .from("Lotes")
        .update({ fecha_empaque: currentDateDisplay })
        .in("base_numero_lote", lotesIds);

      if (updateError) throw updateError;

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro creado correctamente",
        life: 3000,
      });

      setRegistro(emptyRegister);
      setRegistroDialog(false);
      setSubmitted(false);
      setFechaSKU("");

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
  }, [registro, lotes, skus, fechaSKU, fetchRegistros, fetchLotes, fetchSKU]);

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
        step="0.01"
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
        .from("Control_Larva_Molida")
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

  const onNumberInputChange = (e, name) => {
    let val = parseFloat(e.target.value) || 0;
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
    { field: "fecha_prod", header: "Fecha Producción" },
    { field: "hora_inicio", header: "Hora Inicio" },
    { field: "hora_fin", header: "Hora Fin" },
    { field: "tipo_control", header: "Tipo de Control" },
    { field: "sku", header: "SKU Base" },
    { field: "lotes", header: "Lotes" },
    { field: "larva_entera_seca", header: "Larva Entera Seca (kg)" },
    { field: "larva_molida", header: "Larva Molida (kg)" },
    { field: "merma", header: "Merma (kg)" },
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
    doc.text("Registros de Control Larva Molida", 14, 22);

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

    doc.save("Control Larva Molida.pdf");
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
    XLSX.writeFile(wb, "Control Larva Molida.xlsx");
  };

  return (
    <>
      <div className="controltiempos-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Control de Larva Molida
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Control de Larva Molida.
            Aquí puedes gestionar los registros de larva molida.
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
              field="fecha_prod"
              header="Fecha Producción"
              sortable
              style={{ minWidth: "12rem" }}
              editor={(options) => dateEditor(options)}
            ></Column>
            <Column
              field="hora_inicio"
              header="Hora Inicio"
              sortable
              style={{ minWidth: "10rem" }}
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="hora_fin"
              header="Hora Fin"
              sortable
              style={{ minWidth: "10rem" }}
              editor={(options) => timeEditor(options)}
            ></Column>
            <Column
              field="tipo_control"
              header="Tipo Control"
              editor={(options) =>
                dropdownEditor({
                  ...options,
                  options: tiposControl.map((tipo) => ({
                    label: tipo,
                    value: tipo,
                  })),
                })
              }
            ></Column>
            <Column
              field="sku"
              header="SKU Base"
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="lotes"
              header="Lotes"
              sortable
              style={{ minWidth: "15rem" }}
            ></Column>
            <Column
              field="larva_entera_seca"
              header="Larva Entera Seca (kg)"
              sortable
              style={{ minWidth: "10rem" }}
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="larva_molida"
              header="Larva Molida (kg)"
              sortable
              style={{ minWidth: "10rem" }}
              editor={(options) => numberEditor(options)}
            ></Column>
            <Column
              field="merma"
              header="Merma (kg)"
              sortable
              style={{ minWidth: "10rem" }}
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
          <label htmlFor="sku" className="font-bold">
            Código SKU{" "}
            {submitted && !registro.sku && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            filter
            value={registro.sku}
            onChange={(e) => {
              setRegistro({ ...registro, sku: e.value });
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
          {registro.sku === "Nuevo SKU" && (
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
                required={registro.sku === "Nuevo SKU"}
              />
            </>
          )}
          <br />
          <label htmlFor="tipo_control" className="font-bold">
            Tipo de Control{" "}
            {submitted && !registro.tipo_control && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            id="tipo_control"
            value={registro.tipo_control}
            options={tiposControl}
            onChange={(e) => onInputChange(e, "tipo_control")}
            placeholder="Selecciona un Tipo de Control"
            required
          />
          <br />
          <Divider />
          <h3>
            <strong>Datos Producción:</strong>
          </h3>
          <Divider />
          <label htmlFor="fecha_prod" className="font-bold">
            Fecha de Producción{" "}
            {submitted && !registro.fecha_prod && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fecha_prod"
            value={registro.fecha_prod}
            onChange={(e) => onInputChange(e, "fecha_prod")}
          />
          <br />
          <label htmlFor="hora_inicio" className="font-bold">
            Hora Inicio{" "}
            {submitted && !registro.hora_inicio && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hora_inicio"
            value={registro.hora_inicio}
            onChange={(e) => onInputChange(e, "hora_inicio")}
          />
          <br />
          <label htmlFor="hora_fin" className="font-bold">
            Hora Fin{" "}
            {submitted && !registro.hora_fin && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hora_fin"
            value={registro.hora_fin}
            onChange={(e) => onInputChange(e, "hora_fin")}
          />
          <br />
          <label htmlFor="lotes" className="font-bold">
            Lotes{" "}
            {submitted && registro.lotes.length === 0 && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <MultiSelect
            value={registro.lotes}
            onChange={(e) =>
              onInputChange({ target: { value: e.value } }, "lotes")
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
          <Divider />
          <h3>
            <strong>Datos de Larva:</strong>
          </h3>
          <Divider />
          <label htmlFor="larva_entera_seca" className="font-bold">
            Larva Entera Seca (kg){" "}
            {submitted && registro.larva_entera_seca === null && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            step="0.01"
            id="larva_entera_seca"
            value={registro.larva_entera_seca}
            onChange={(e) => onNumberInputChange(e, "larva_entera_seca")}
          />
          <br />
          <label htmlFor="larva_molida" className="font-bold">
            Larva Molida (kg){" "}
            {submitted && registro.larva_molida === null && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            step="0.01"
            id="larva_molida"
            value={registro.larva_molida}
            onChange={(e) => onNumberInputChange(e, "larva_molida")}
          />
          <br />
          <label htmlFor="merma" className="font-bold">
            Merma (kg)
          </label>
          <InputText
            type="number"
            step="0.01"
            id="merma"
            value={registro.merma}
            readOnly
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

export default ControlLarvaMolida;