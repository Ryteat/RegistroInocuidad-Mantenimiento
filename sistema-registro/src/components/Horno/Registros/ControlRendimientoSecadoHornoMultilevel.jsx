import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import "./ControlRendimientoSecadoHornoMultilevel.css";
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
    larva_seca: "",
    desecho_kg: "",
    operario: "",
    observaciones: "",
    base_numero_lote: null,
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
  const [observacionesObligatorio, setObservacionesObligatorio] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estados para lazy loading
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

  // Funciones para manejo de fechas
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
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

  // Handlers para eventos
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

  const handleKeyPress = (e) => {
    const invalidChars = ['e', 'E', '+', '-'];
    if (invalidChars.includes(e.key)) {
      e.preventDefault();
    }
    
    if (e.key === '.' && e.target.value.includes('.')) {
      e.preventDefault();
    }
  };

  const handleNumericChange = (e, name) => {
    const value = e.target.value;
    if (value === "" || (!isNaN(value) && parseFloat(value) >= 0)) {
      setRegistro(prev => ({...prev, [name]: value}));
    }
  };

  // Función para manejar cambios en los inputs
  const onInputChange = (e, name) => {
    const val = (e.target && e.target.value) || '';
    setRegistro({ ...registro, [name]: val });
  };

  // Fetch data
  const fetchRegistros = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Control_Rendimiento_Secado_Horno_Multilevel")
          .select("*", { count: "exact" })
          .range(start, start + limit - 1);

        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

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
        console.error("Error fetching registros:", err);
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: "Error al cargar los registros",
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
      console.error("Error fetching lotes:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Error al cargar los lotes",
        life: 3000,
      });
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
    fetchLotes
  ]);

  // Editores para DataTable
  const dateEditor = (options) => {
    return (
      <InputText
        type="date"
        value={options.value ? formatDateForInput(options.value) : ""}
        onChange={(e) => {
          const selectedDate = e.target.value;
          options.editorCallback(formatDateForDisplay(selectedDate));
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

  const dropdownEditor = (options) => {
    const tiposControl = ["Prueba", "Control"];
    return (
      <Dropdown
        value={options.value}
        options={tiposControl}
        onChange={(e) => options.editorCallback(e.value)}
        placeholder="Selecciona tipo"
      />
    );
  };

  // Funciones para CRUD
  const openNew = () => {
    setRegistro(emptyRegister);
    setSubmitted(false);
    setIsEditing(false);
    setRegistroDialog(true);
  };

  const onRowEditInit = (event) => {
    const registroEditado = { ...event.data };
    
    // Convertir fechas al formato correcto para el input date
    if (registroEditado.fecha_produccion) {
      registroEditado.fecha_produccion = formatDateForInput(registroEditado.fecha_produccion);
    }
    
    setRegistro(registroEditado);
    setSubmitted(false);
    setIsEditing(true);
    setRegistroDialog(true);
  };

  const onRowEditComplete = async ({ newData, data: oldData }) => {
    try {
      const { error } = await supabase
        .from("Control_Rendimiento_Secado_Horno_Multilevel")
        .update(newData)
        .eq("id", newData.id);

      if (error) throw error;

      setRegistros(prev =>
        prev.map(item => (item.id === newData.id ? newData : item))
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
        summary: "Error",
        detail: error.message || "Error al actualizar el registro",
        life: 3000,
      });
    }
  };

  const hideDialog = () => {
    setSubmitted(false);
    setRegistroDialog(false);
    setIsEditing(false);
  };

  const saveRegistro = useCallback(async () => {
    setSubmitted(true);

    // Validaciones
    if (
      !registro.tipo_control ||
      !registro.fecha_produccion ||
      !registro.hora_proceso ||
      !registro.larva_fresca_kg ||
      !registro.larva_seca ||
      !registro.operario ||
      !registro.desecho_kg
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Por favor complete todos los campos requeridos",
        life: 3000,
      });
      return;
    }

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");

      if (isEditing) {
        // Lógica para edición
        const registroActualizado = {
          ...registro,
          fecha_produccion: formatDateForDisplay(registro.fecha_produccion)
        };

        const { error } = await supabase
          .from("Control_Rendimiento_Secado_Horno_Multilevel")
          .update(registroActualizado)
          .eq("id", registro.id);

        if (error) throw error;

        toast.current.show({
          severity: "success",
          summary: "Éxito",
          detail: "Registro actualizado correctamente",
          life: 3000,
        });
      } else {
        // Lógica para creación
        if (registro.base_numero_lote === "Sin Lote Asignado") {
          registro.base_numero_lote = null;
        } else if (registro.base_numero_lote) {
          const { data: loteExistente, error: loteError } = await supabase
            .from("Lotes")
            .select("base_numero_lote")
            .eq("base_numero_lote", registro.base_numero_lote)
            .single();
         
          if (loteError || !loteExistente) {
            throw new Error(`El lote ${registro.base_numero_lote} no existe.`);
          }
        }

        const { data, error } = await supabase
          .from("Control_Rendimiento_Secado_Horno_Multilevel")
          .insert([{
            ...registro,
            fecha_registro: currentDate,
            hora_registro: currentTime,
            fecha_produccion: formatDateForDisplay(registro.fecha_produccion),
          }])
          .select();

        if (error) throw error;

        // Actualizar lote si corresponde
        if (registro.base_numero_lote) {
          let etapas = [];
          if (registro.etapa_actual && typeof registro.etapa_actual === "string" && registro.etapa_actual.trim() !== "") {
            etapas = registro.etapa_actual.split(",").map(e => e.trim());
          }

          if (!etapas.includes("ProductoTerminado")) {
            etapas.push("Horno", "Cosecha", "ProductoTerminado");
          }

          const { error: updateError } = await supabase
            .from("Lotes")
            .update({
              etapa_actual: etapas.join(", "),
              fecha_horneado: currentDate,
            })
            .eq("base_numero_lote", registro.base_numero_lote);

          if (updateError) throw updateError;
        }

        toast.current.show({
          severity: "success",
          summary: "Éxito",
          detail: "Registro creado correctamente",
          life: 3000,
        });
      }

      setRegistro(emptyRegister);
      setRegistroDialog(false);
      setSubmitted(false);
      setIsEditing(false);
      fetchRegistros(lazyParams.first, lazyParams.rows);
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.message || "Ocurrió un error al guardar el registro",
        life: 3000,
      });
    }
  }, [registro, isEditing, fetchRegistros, lazyParams.first, lazyParams.rows]);

  // Templates para UI
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

  const registroDialogFooter = (
    <React.Fragment>
      <Button
        label="Cancelar"
        icon="pi pi-times"
        outlined
        onClick={hideDialog}
      />
      <Button 
        label={isEditing ? "Actualizar" : "Guardar"} 
        icon="pi pi-check" 
        onClick={saveRegistro} 
      />
    </React.Fragment>
  );

  // Funciones para exportar
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
    doc.text("Registros de Control Rendimiento Secado Horno Multilevel", 14, 22);

    const exportData = selectedRegistros.map(
      ({ fecha_registro, hora_registro, ...row }) => ({
        ...row,
        registrado: `${fecha_registro || ""} ${hora_registro || ""}`,
      })
    );

    doc.autoTable({
      head: [["Número Lote", "Fecha Producción", "Larva Fresca (kg)", "Larva Seca (kg)", "Desecho (kg)", "Observaciones"]],
      body: exportData.map(item => [
        item.numero_lote,
        item.fecha_produccion,
        item.larva_fresca_kg,
        item.larva_seca,
        item.desecho_kg,
        item.operario,
        item.observaciones
      ]),
      startY: 30,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      }
    });

    doc.save("Control_Rendimiento_Secado_Horno_Multilevel.pdf");
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

    const headers = [
      "Número Lote", 
      "Tipo Control", 
      "Fecha Producción", 
      "Hora Proceso",
      "Larva Fresca (kg)",
      "Larva Seca (kg)",
      "Desecho (kg)",
      "Opeario",
      "Observaciones",
      "Fecha Registro",
      "Hora Registro"
    ];

    const exportData = selectedRegistros.map(item => ({
      "Número Lote": item.numero_lote,
      "Tipo Control": item.tipo_control,
      "Fecha Producción": item.fecha_produccion,
      "Hora Proceso": item.hora_proceso,
      "Larva Fresca (kg)": item.larva_fresca_kg,
      "Larva Seca (kg)": item.larva_seca,
      "Desecho (kg)": item.desecho_kg,
      "Operario": item.operario,
      "Observaciones": item.observaciones,
      "Fecha Registro": item.fecha_registro,
      "Hora Registro": item.hora_registro
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registros");
    XLSX.writeFile(workbook, "Control_Rendimiento_Secado_Horno_Multilevel.xlsx");
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
            onRowEditInit={onRowEditInit}
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
            dataKey="id"
          >
            <Column selectionMode="multiple" exportable={false}></Column>
            <Column
              field="numero_lote"
              header="Número Lote"
              editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="fecha_produccion"
              header="Fecha Producción"
              editor={(options) => dateEditor(options)}
              sortable
            />
            <Column 
              field="hora_proceso" 
              header="Hora Proceso" 
              editor={(options) => timeEditor(options)}
              sortable 
            />
            <Column
              field="larva_fresca_kg"
              header="Larva Fresca (kg)"
              editor={(options) => numberEditor(options)}
              sortable
            />
            <Column
              field="larva_seca"
              header="Larva Seca (kg)"
              editor={(options) => numberEditor(options)}
              sortable
            />
            <Column 
              field="tipo_control" 
              header="Tipo Control" 
              editor={(options) => dropdownEditor(options)}
              sortable 
            />
            <Column 
              field="desecho_kg" 
              header="Desecho (kg)" 
              editor={(options) => numberEditor(options)}
              sortable 
            />
            <Column
              field="operario"
              header="Operario"   
              editor={(options) => textEditor(options)}
              sortable
            />  
            <Column field="fecha_registro" header="Fecha Registro" sortable />
            <Column field="hora_registro" header="Hora Registro" sortable />
            <Column 
              field="observaciones" 
              header="Observaciones" 
              editor={(options) => textEditor(options)}
              sortable 
            />
            <Column
              rowEditor
              headerStyle={{ width: '10%', minWidth: '8rem' }}
              bodyStyle={{ textAlign: 'center' }}
            ></Column>
          </DataTable>
        </div>
      </div>
      
      {/* Diálogo para agregar/editar registros */}
      <Dialog 
        visible={registroDialog} 
        style={{ width: '50vw' }} 
        breakpoints={{ '960px': '75vw', '641px': '90vw' }}
        header={isEditing ? "Editar Registro" : "Nuevo Registro"} 
        modal 
        className="p-fluid" 
        footer={registroDialogFooter} 
        onHide={hideDialog}
      >
        <div className="field">
          <label htmlFor="base_numero_lote" className="font-bold">
            Número de lote
          </label>
          <Dropdown
            value={registro.base_numero_lote}
            filter
            onChange={(e) => {
              setRegistro({
                ...registro,
                base_numero_lote: e.value,
              });
            }}
            options={[
              { base_numero_lote: "Sin Lote Asignado" },
              ...(lotes || []),
            ]}
            optionLabel="base_numero_lote"
            optionValue="base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
            disabled={isEditing}
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
            options={["Prueba", "Control"]}
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
            onKeyDown={handleKeyPress}
            id="larva_fresca_kg"
            value={registro.larva_fresca_kg}
            onChange={(e) => handleNumericChange(e, "larva_fresca_kg")}
            required
            min="0"
            step="0.01"
          />
          <br />
          <label htmlFor="larva_seca" className="font-bold">
            Larva Seca (kg){" "}
            {submitted && !registro.larva_seca && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="number"
            onKeyDown={handleKeyPress}
            id="larva_seca"
            value={registro.larva_seca}
            onChange={(e) => handleNumericChange(e, "larva_seca")}
            required
            min="0"
            step="0.01"
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
            onKeyDown={handleKeyPress}
            id="desecho_kg"
            value={registro.desecho_kg}
            onChange={(e) => handleNumericChange(e, "desecho_kg")}
            required
            min="0"
            step="0.01"
          />
          <br />
          <label htmlFor="Operario" className="font-bold">
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
          <label htmlFor="Observaciones" className="font-bold">
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