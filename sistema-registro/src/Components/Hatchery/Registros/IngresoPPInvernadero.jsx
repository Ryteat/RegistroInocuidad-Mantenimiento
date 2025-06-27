import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./IngresoPPInvernadero.css";

import supabase from "../../../supabaseClient";

// PRIME REACT
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primeicons/primeicons.css";

// PRIME REACT COMPONENTS
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Toolbar } from "primereact/toolbar";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

import * as XLSX from "xlsx";
import logo2 from "../../../assets/mosca.png";
import jsPDF from "jspdf";
import "jspdf-autotable";

function IngresoPPInvernadero() {
  // Variable de registro vacio
  const emptyRegister = {
    fec_ingreso_pp: "",
    lote_cosecha_pp: "",
    nave: "",
    cantidad_ur: "",
    kg_pp_modulo: "",
    cantidad_pp_modulo: "",
    kg_pp_redsea: "",
    fec_cam_camas: "",
    observaciones: "",
  };

  const [IngresoPPs, setIngresoPPs] = useState([]);
  const [pupa, setPupa] = useState(emptyRegister);
  const toast = useRef(null);
  const dt = useRef(null);
  const [selectedIngresoPPs, setSelectedIngresoPPs] = useState([]);
  const [globalFilter, setGlobalFilter] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [pupaDialog, setPupaDialog] = useState(false);
  const [deletePPDialog, setDeletePPDialog] = useState(false);
  const [deleteIngresoPPsDialog, setDeleteIngresoPPsDialog] = useState(false);
  const navigate = useNavigate();
  const [observacionesObligatorio, setObservacionesObligatorio] = useState(false);
  const [fechaRegistro, setFechaRegistro] = useState("");

  // Estado para errores de validación
  const [erroresValidacion, setErroresValidacion] = useState({
    cantidad_ur: false,
    kg_pp_modulo: false,
    cantidad_pp_modulo: false,
    kg_pp_redsea: false,
  });

  const naves = [
    { name: "Nave 1", value: "Nave 1" },
    { name: "Nave 2", value: "Nave 2" },
    { name: "Nave 3", value: "Nave 3" },
    { name: "Nave 4", value: "Nave 4" },
    { name: "Red Sea", value: "Red Sea" },
    { name: "Perimetrales", value: "Perimetrales" },
  ];

  // FETCH REGISTROS
  const fetchIngresoPPInvernadero = async () => {
    try {
      const { data, error } = await supabase
        .from("Ingreso_PP_Invernadero")
        .select();

      if (error) throw error;

      setIngresoPPs(data || []);
    } catch (err) {
      console.error("Error en la conexión a la base de datos:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Error al cargar los datos",
        life: 3000,
      });
    }
  };

  useEffect(() => {
    fetchIngresoPPInvernadero();
  }, []);

  // Formatear fecha
  const formatDateTime = (date, format = "DD-MM-YYYY hh:mm A") => {
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(date);

    const dateMap = parts.reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

    return format
      .replace("DD", dateMap.day)
      .replace("MM", dateMap.month)
      .replace("YYYY", dateMap.year)
      .replace("hh", dateMap.hour.padStart(2, "0"))
      .replace("mm", dateMap.minute)
      .replace("A", dateMap.dayPeriod || "AM");
  };

  // Exportar PDF
  const exportPdf = () => {
    if (selectedIngresoPPs.length === 0) {
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
    doc.text("Registros de Ingreso PP Invernadero", 14, 22);

    const exportData = selectedIngresoPPs.map((row) => ({
      ...row,
      registrado: `${row.fec_registro || ""} ${row.hor_registro || ""}`,
    }));

    const cols = [
      { field: "fec_ingreso_pp", header: "Ingreso PP" },
      { field: "lote_cosecha_pp", header: "# Lote" },
      { field: "nave", header: "Nave" },
      { field: "cantidad_ur", header: "# UR's" },
      { field: "kg_pp_modulo", header: "KG PP/Modulo" },
      { field: "cantidad_pp_modulo", header: "# PP/Modulo" },
      { field: "kg_pp_redsea", header: "KG PP/RedSea" },
      { field: "fec_cam_camas", header: "Cambio Cama Pupado" },
      { field: "observaciones", header: "Observaciones" },
      { field: "registrado", header: "Registrado" },
    ];

    const body = exportData.map((row) =>
      cols.map((col) => row[col.field])
    );

    doc.autoTable({
      head: [cols.map((col) => col.header)],
      body: body,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    doc.save("Ingreso_PrePupas_Invernadero.pdf");
  };

  // Exportar Excel
  const exportXlsx = () => {
    if (selectedIngresoPPs.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay filas seleccionadas para exportar.",
        life: 3000,
      });
      return;
    }

    const cols = [
      { field: "fec_ingreso_pp", header: "Ingreso PP" },
      { field: "lote_cosecha_pp", header: "# Lote" },
      { field: "nave", header: "Nave" },
      { field: "cantidad_ur", header: "# UR's" },
      { field: "kg_pp_modulo", header: "KG PP/Modulo" },
      { field: "cantidad_pp_modulo", header: "# PP/Modulo" },
      { field: "kg_pp_redsea", header: "KG PP/RedSea" },
      { field: "fec_cam_camas", header: "Cambio Cama Pupado" },
      { field: "observaciones", header: "Observaciones" },
      { field: "registrado", header: "Registrado" },
    ];

    const headers = cols.map((col) => col.header);
    const exportData = selectedIngresoPPs.map((registro) => ({
      ...registro,
      registrado: `${registro.fec_registro || ""} ${registro.hor_registro || ""}`,
    }));

    const rows = exportData.map((registro) =>
      cols.map((col) => registro[col.field])
    );

    const dataToExport = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);
    const wscols = cols.map((col) => ({ width: Math.max(col.header.length, 10) }));
    ws["!cols"] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, "Ingreso_PP_Invernadero.xlsx");
  };

  // Editar fila
  const onRowEditComplete = async (e) => {
    const { newData } = e;
    const {
      id,
      fec_ingreso_pp,
      lote_cosecha_pp,
      nave,
      cantidad_ur,
      kg_pp_modulo,
      cantidad_pp_modulo,
      kg_pp_redsea,
      fec_cam_camas,
      observaciones,
    } = newData;

    // Validar rangos al editar
    const isCantidadURInvalida = cantidad_ur < 20 || cantidad_ur > 100;
    const isKgPPModuloInvalido = kg_pp_modulo < 10 || kg_pp_modulo > 25;
    const isCantidadPPModuloInvalido = cantidad_pp_modulo < 50 || cantidad_pp_modulo > 100;
    const isKgPPRedseaInvalido = kg_pp_redsea < 400 || kg_pp_redsea > 550;

    if ((isCantidadURInvalida || isKgPPModuloInvalido || isCantidadPPModuloInvalido || isKgPPRedseaInvalido) && !observaciones) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Debe agregar observaciones para valores fuera de rango",
        life: 3000,
      });
      return;
    }

    const formattedFecCamCamas = fec_cam_camas
      ? new Date(fec_cam_camas)
          .toISOString()
          .split("T")[0]
          .split("-")
          .reverse()
          .join("/")
      : null;

    try {
      const { error } = await supabase
        .from("Ingreso_PP_Invernadero")
        .update({
          nave,
          cantidad_ur,
          kg_pp_modulo,
          cantidad_pp_modulo,
          kg_pp_redsea,
          fec_cam_camas: formattedFecCamCamas,
          observaciones,
        })
        .eq("id", id);

      if (error) throw error;

      setIngresoPPs(
        IngresoPPs.map((ingresopp) =>
          ingresopp.id === id ? { ...newData, fec_cam_camas: formattedFecCamCamas } : ingresopp
        )
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

  // Editores para las celdas
  const dateEditor = (options) => (
    <InputText
      type="date"
      value={options.value}
      onChange={(e) => options.editorCallback(e.target.value)}
    />
  );

  const textEditor = (options) => (
    <InputText
      type="text"
      value={options.value}
      onChange={(e) => options.editorCallback(e.target.value)}
    />
  );

  const numberEditor = (options) => (
    <InputText
      type="number"
      value={options.value}
      onChange={(e) => options.editorCallback(parseInt(e.target.value) || 0)}
    />
  );

  const floatEditor = (options) => (
    <InputText
      type="number"
      step="0.01"
      value={options.value}
      onChange={(e) => options.editorCallback(parseFloat(e.target.value) || 0)}
    />
  );

  const allowEdit = (rowData) => true; // Permitir editar todas las filas

  // Guardar nuevo registro
  const saveIngresoPP = async () => {
    setSubmitted(true);

    // Validar los campos
    const isCantidadURInvalida = pupa.cantidad_ur < 20 || pupa.cantidad_ur > 100;
    const isKgPPModuloInvalido = pupa.kg_pp_modulo < 10 || pupa.kg_pp_modulo > 25;
    const isCantidadPPModuloInvalido = pupa.cantidad_pp_modulo < 50 || pupa.cantidad_pp_modulo > 100;
    const isKgPPRedseaInvalido = pupa.kg_pp_redsea < 400 || pupa.kg_pp_redsea > 550;

    // Actualizar el estado de errores
    setErroresValidacion({
      cantidad_ur: isCantidadURInvalida,
      kg_pp_modulo: isKgPPModuloInvalido,
      cantidad_pp_modulo: isCantidadPPModuloInvalido,
      kg_pp_redsea: isKgPPRedseaInvalido,
    });

    // Verificar si hay algún valor fuera de rango
    const valoresFueraDeRango = isCantidadURInvalida || 
                               isKgPPModuloInvalido || 
                               isCantidadPPModuloInvalido || 
                               isKgPPRedseaInvalido;

    // Validar campos obligatorios
    if (!pupa.fec_ingreso_pp || 
        !pupa.lote_cosecha_pp || 
        !pupa.nave || 
        !pupa.cantidad_ur || 
        !pupa.kg_pp_modulo || 
        !pupa.cantidad_pp_modulo || 
        !pupa.kg_pp_redsea || 
        !pupa.fec_cam_camas) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Debe completar todos los campos obligatorios",
        life: 3000,
      });
      return;
    }

    // Validación principal: si hay valores fuera de rango, observaciones es obligatorio
    if (valoresFueraDeRango && !pupa.observaciones) {
      setObservacionesObligatorio(true);
      
      // Crear mensaje con los campos que están fuera de rango
      const camposInvalidos = [];
      if (isCantidadURInvalida) camposInvalidos.push("Cantidad UR (20-100)");
      if (isKgPPModuloInvalido) camposInvalidos.push("Kg PP/Modulo (10-25)");
      if (isCantidadPPModuloInvalido) camposInvalidos.push("Cantidad PP/Modulo (50K-100K)");
      if (isKgPPRedseaInvalido) camposInvalidos.push("Kg PP/RedSea (400-550)");
      
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: `Valores fuera de rango (${camposInvalidos.join(", ")}). Debe agregar observaciones.`,
        life: 5000,
      });
      return;
    }

    // Si llegamos aquí, todos los requisitos se cumplen
    setObservacionesObligatorio(false);
    
    try {
      const formattedFecCamCamas = pupa.fec_cam_camas
        ? new Date(pupa.fec_cam_camas)
            .toISOString()
            .split("T")[0]
            .split("-")
            .reverse()
            .join("/")
        : null;

      const formattedFecIngresoPP = pupa.fec_ingreso_pp
        ? new Date(pupa.fec_ingreso_pp)
            .toISOString()
            .split("T")[0]
            .split("-")
            .reverse()
            .join("/")
        : null;

      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");

      const { data, error } = await supabase
        .from("Ingreso_PP_Invernadero")
        .insert([
          {
            fec_ingreso_pp: formattedFecIngresoPP,
            lote_cosecha_pp: pupa.lote_cosecha_pp,
            nave: pupa.nave,
            cantidad_ur: pupa.cantidad_ur,
            kg_pp_modulo: pupa.kg_pp_modulo,
            cantidad_pp_modulo: pupa.cantidad_pp_modulo,
            kg_pp_redsea: pupa.kg_pp_redsea,
            fec_cam_camas: formattedFecCamCamas,
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: pupa.observaciones,
          },
        ]);

      if (error) throw error;

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro guardado correctamente",
        life: 3000,
      });

      // Limpiar y cerrar
      setPupa(emptyRegister);
      setPupaDialog(false);
      setSubmitted(false);
      fetchIngresoPPInvernadero();
      
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Ocurrió un error al guardar el registro",
        life: 3000,
      });
    }
  };

  // Manejar cambios en los inputs
  const onInputChange = (e, name) => {
    const val = e.target.value;
    let _pupa = { ...pupa };

    if (e.target.type === "number") {
      _pupa[`${name}`] = val ? parseFloat(val) : "";
    } else {
      _pupa[`${name}`] = val;
    }

    setPupa(_pupa);
  };

  // Toolbars y diálogos
  const leftToolbarTemplate = () => (
    <div className="flex flex-wrap gap-2">
      <Button
        label="Nuevo"
        icon="pi pi-plus"
        severity="success"
        onClick={openNew}
      />
    </div>
  );

  const rightToolbarTemplate = () => (
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

  const header = (
    <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
      <IconField iconPosition="left">
        <InputText
          type="search"
          onInput={(e) => setGlobalFilter(e.target.value)}
          placeholder="Buscador Global..."
        />
      </IconField>
    </div>
  );

  const openNew = () => {
    setPupa(emptyRegister);
    setSubmitted(false);
    setPupaDialog(true);
    setObservacionesObligatorio(false);
    setErroresValidacion({
      cantidad_ur: false,
      kg_pp_modulo: false,
      cantidad_pp_modulo: false,
      kg_pp_redsea: false,
    });
  };

  const hideDialog = () => {
    setSubmitted(false);
    setPupaDialog(false);
  };

  const pupaDialogFooter = (
    <React.Fragment>
      <Button label="Cancelar" icon="pi pi-times" outlined onClick={hideDialog} />
      <Button label="Guardar" icon="pi pi-check" onClick={saveIngresoPP} />
    </React.Fragment>
  );

  return (
    <>
      <div className="tabla-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Ingreso PrePupas Invernadero
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Ingreso PrePupas Invernadero. Aquí puedes
            gestionar los registros ingreso de prepuas al invernadero.
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
            onRowEditComplete={onRowEditComplete}
            ref={dt}
            value={IngresoPPs}
            selection={selectedIngresoPPs}
            onSelectionChange={(e) => setSelectedIngresoPPs(e.value)}
            onRowEditInit={(e) => setPupa(e.data)}
            onRowEditCancel={(e) => console.log(e)}
            className="p-datatable-gridlines tabla"
            style={{ width: "100%" }}
            dataKey="id"
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"
            globalFilter={globalFilter}
            header={header}
          >
            <Column selectionMode="multiple" exportable={false}></Column>
            
            <Column
              field="fec_ingreso_pp"
              header="Fecha Ingreso PP"
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="lote_cosecha_pp"
              header="Número de Lote"
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="nave"
              header="Nave"
              editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "8rem" }}
            ></Column>
            <Column
              field="cantidad_ur"
              header="Cantidad UR's"
              editor={(options) => numberEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="kg_pp_modulo"
              header="KG PP / Modulo"
              editor={(options) => floatEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="cantidad_pp_modulo"
              header="Cantidad PP / Modulo"
              editor={(options) => numberEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="kg_pp_redsea"
              header="KG PP / Red Sea"
              editor={(options) => floatEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="fec_cam_camas"
              header="Cambio Cama Pupado"
              editor={(options) => dateEditor(options)}
              sortable
              style={{ minWidth: "11rem" }}
            ></Column>
            <Column
              field="fec_registro"
              header="Dia de Registro"
              sortable
              style={{ minWidth: "14rem" }}
            ></Column>
            <Column
              field="hor_registro"
              header="Hora de Registro"
              sortable
              style={{ minWidth: "14rem" }}
            ></Column>
            <Column
              field="observaciones"
              header="Observaciones"
              editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "8rem" }}
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
        visible={pupaDialog}
        style={{ width: "32rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        header="Nuevo Registro"
        modal
        className="p-fluid"
        footer={pupaDialogFooter}
        onHide={hideDialog}
      >
        <div className="field">
          <label htmlFor="fec_ingreso_pp" className="font-bold">
            Fecha Ingreso PrePupa{" "}
            {submitted && !pupa.fec_ingreso_pp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fec_ingreso_pp"
            value={pupa.fec_ingreso_pp}
            onChange={(e) => onInputChange(e, "fec_ingreso_pp")}
            required
            autoFocus
            className={submitted && !pupa.fec_ingreso_pp ? "p-invalid" : ""}
          />
          <br />

          <label htmlFor="lote_cosecha_pp" className="font-bold">
            Número de Lote{" "}
            {submitted && !pupa.lote_cosecha_pp && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="lote_cosecha_pp"
            value={pupa.lote_cosecha_pp}
            onChange={(e) => onInputChange(e, "lote_cosecha_pp")}
            required
            className={submitted && !pupa.lote_cosecha_pp ? "p-invalid" : ""}
          />

          <br />
          <label htmlFor="nave" className="font-bold">
            Nave{" "}
            {submitted && !pupa.nave && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <Dropdown
            value={pupa.nave}
            onChange={(e) => setPupa({ ...pupa, nave: e.value })}
            options={naves}
            optionLabel="name"
            placeholder="Selecciona una nave"
            className={`w-full md:w-14rem ${submitted && !pupa.nave ? "p-invalid" : ""}`}
          />

          <br />
          <label htmlFor="cantidad_ur" className="font-bold">
            Cantidad UR{" "}
            {submitted && !pupa.cantidad_ur && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cantidad_ur && (
              <small className="p-error">
                Debe estar entre 20 y 100.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="cantidad_ur"
            value={pupa.cantidad_ur}
            onChange={(e) => onInputChange(e, "cantidad_ur")}
            required
            className={
              submitted && (!pupa.cantidad_ur || erroresValidacion.cantidad_ur) 
                ? "p-invalid" 
                : ""
            }
          />
          
          <br />
          <label htmlFor="kg_pp_modulo" className="font-bold">
            KG PrePupa / Modulo{" "}
            {submitted && !pupa.kg_pp_modulo && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.kg_pp_modulo && (
              <small className="p-error">
                Debe estar entre 10 y 25 Kg por caja.
              </small>
            )}
          </label>
          <InputText
            type="number"
            step="0.01"
            id="kg_pp_modulo"
            value={pupa.kg_pp_modulo}
            onChange={(e) => onInputChange(e, "kg_pp_modulo")}
            required
            className={
              submitted && (!pupa.kg_pp_modulo || erroresValidacion.kg_pp_modulo) 
                ? "p-invalid" 
                : ""
            }
          />
          
          <br />
          <label htmlFor="cantidad_pp_modulo" className="font-bold">
            Cantidad PrePupa Modulo{" "}
            {submitted && !pupa.cantidad_pp_modulo && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cantidad_pp_modulo && (
              <small className="p-error">
                Debe estar entre 50K y 100K.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="cantidad_pp_modulo"
            value={pupa.cantidad_pp_modulo}
            onChange={(e) => onInputChange(e, "cantidad_pp_modulo")}
            required
            className={
              submitted && (!pupa.cantidad_pp_modulo || erroresValidacion.cantidad_pp_modulo) 
                ? "p-invalid" 
                : ""
            }
          />

          <br />
          <label htmlFor="kg_pp_redsea" className="font-bold">
            Kg PrePupa RedSea{" "}
            {submitted && !pupa.kg_pp_redsea && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.kg_pp_redsea && (
              <small className="p-error">
                Debe estar entre 400 y 550.
              </small>
            )}
          </label>
          <InputText
            type="number"
            step="0.01"
            id="kg_pp_redsea"
            value={pupa.kg_pp_redsea}
            onChange={(e) => onInputChange(e, "kg_pp_redsea")}
            required
            className={
              submitted && (!pupa.kg_pp_redsea || erroresValidacion.kg_pp_redsea) 
                ? "p-invalid" 
                : ""
            }
          />

          <br />
          <label htmlFor="fec_cam_camas" className="font-bold">
            Fecha Cambio Camas Pupado{" "}
            {submitted && !pupa.fec_cam_camas && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fec_cam_camas"
            value={pupa.fec_cam_camas}
            onChange={(e) => onInputChange(e, "fec_cam_camas")}
            required
            className={submitted && !pupa.fec_cam_camas ? "p-invalid" : ""}
          />

          <label htmlFor="observaciones" className="font-bold">
            Observaciones
            {observacionesObligatorio && (
              <small className="p-error"> (Requerido por valores fuera de rango)</small>
            )}
          </label>
          <InputText
            id="observaciones"
            value={pupa.observaciones}
            onChange={(e) => onInputChange(e, "observaciones")}
            required={observacionesObligatorio}
            className={observacionesObligatorio ? "p-invalid" : ""}
          />
        </div>
      </Dialog>
    </>
  );
}

export default IngresoPPInvernadero;