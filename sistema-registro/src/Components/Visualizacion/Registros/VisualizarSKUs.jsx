import supabase from "../../../supabaseClient";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logo2 from "../../../assets/mosca.png";
import "./VisualizarSKUs.css";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";

function VisualizarSKUs() {
  const navigate = useNavigate();
  const [skus, setSKUs] = useState([]);
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [relatedData, setRelatedData] = useState(null);
  const [registroDialog, setRegistroDialog] = useState(false);
  const [loteSelectionDialog, setLoteSelectionDialog] = useState(false);
  const [availableLotes, setAvailableLotes] = useState([]);
  const [selectedLote, setSelectedLote] = useState(null);
  const toast = useRef(null);
  const [globalFilter, setGlobalFilter] = useState("");
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

  const fetchSKUs = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Control_Rendimiento_Producto_Terminado")
          .select("numero_sku, lote, fecha_produccion", { count: "exact" })
          .range(start, start + limit - 1);

        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

        if (lazyParams.globalFilter) {
          query = query.or(
            `numero_sku.ilike.%${lazyParams.globalFilter}%,lote.ilike.%${lazyParams.globalFilter}%`
          );
        }

        const { data, error, count } = await query;

        if (error) throw error;
        setSKUs(data || []);
        setTotalRecords(count || 0);
      } catch (err) {
        console.error(
          "Error en la conexión a la base de datos Visualizar Lotes:",
          err
        );
      } finally {
        setLoading(false);
      }
    },
    [lazyParams.sortField, lazyParams.sortOrder, lazyParams.globalFilter]
  );

  const fetchRelatedData = async (loteNumber) => {
    try {
      const [
        { data: neonatos },
        { data: despacho },
        { data: dietaSiembra },
        { data: despachoDieta },
        { data: ingresoSalidaRacks },
        { data: cosechaFrass },
        { data: microondas },
        { data: multilevel },
      ] = await Promise.all([
        supabase
          .from("Neonatos_Inoculados")
          .select("*")
          .eq("base_numero_lote", loteNumber),
        supabase
          .from("Control_Despacho_5dols_LabPro")
          .select("*")
          .eq("base_numero_lote", loteNumber),
        supabase
          .from("Control_Rendimiento_DietaySiembra")
          .select("*")
          .eq("base_numero_lote", loteNumber),
        supabase
          .from("Control_Movimiento_Cajas_Proceso")
          .select("*")
          .eq("base_numero_lote", loteNumber),
        supabase
          .from("Control_Ingreso_Salida_Racks")
          .select("*")
          .eq("base_numero_lote", loteNumber),
        supabase
          .from("Control_Rendimiento_CosechayFrass")
          .select("*")
          .eq("base_numero_lote", loteNumber),
        supabase
          .from("Control_Rendimiento_Secado_Horno_Microondas")
          .select("*")
          .eq("base_numero_lote", loteNumber),
        supabase
          .from("Control_Rendimiento_Secado_Horno_Multilevel")
          .select("*")
          .eq("base_numero_lote", loteNumber),
      ]);

      setRelatedData({
        Neonatos_Inoculados: neonatos,
        Control_Despacho_5dols_LabPro: despacho,
        Control_Rendimiento_DietaySiembra: dietaSiembra,
        Control_Rendimiento_CosechayFrass: cosechaFrass,
        Control_Rendimiento_Secado_Horno_Microondas: microondas,
        Control_Rendimiento_Secado_Horno_Multilevel: multilevel,
        Control_Movimiento_Cajas_Proceso: despachoDieta,
        Control_Ingreso_Salida_Racks: ingresoSalidaRacks,
      });
    } catch (err) {
      console.error("Error fetching related data:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Error al cargar datos relacionados",
        life: 3000,
      });
    }
  };

  useEffect(() => {
    fetchSKUs(lazyParams.first, lazyParams.rows);
  }, [
    fetchSKUs,
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

  const handleSKUSelection = (e) => {
    setSelectedSKU(e.value);
    if (e.value) {
      // Extraer los lotes (pueden estar separados por comas)
      const lotes = e.value.lote.split(',').map(lote => lote.trim());
      
      if (lotes.length > 1) {
        // Mostrar diálogo de selección de lote
        setAvailableLotes(lotes);
        setLoteSelectionDialog(true);
      } else {
        // Solo hay un lote, proceder directamente
        fetchRelatedData(lotes[0]);
        setRegistroDialog(true);
      }
    }
  };

  const handleLoteSelection = () => {
    if (selectedLote) {
      fetchRelatedData(selectedLote);
      setLoteSelectionDialog(false);
      setRegistroDialog(true);
    } else {
      toast.current.show({
        severity: 'warn',
        summary: 'Selección requerida',
        detail: 'Por favor seleccione un lote para continuar',
        life: 3000
      });
    }
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

  const renderRelatedTable = (tableName, data, columns) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="related-table-section">
        <Divider align="left">
          <span className="p-tag">{tableName}</span>
        </Divider>
        <DataTable value={data} size="small" className="p-datatable-sm">
          {columns.map((col) => (
            <Column
              key={col.field}
              field={col.field}
              header={col.header}
              body={col.body || null}
            />
          ))}
        </DataTable>
      </div>
    );
  };

  return (
    <div className="visualizar-skus-container">
      <Toast ref={toast} />
      
      <header className="header-section">
        <h1>Visualización de SKUs</h1>
      </header>

      <div className="controls-section">
        <button 
          className="p-button p-button-secondary"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>

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
        paginator
        rowsPerPageOptions={[5, 10, 25]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Registros"
        showGridlines
        header={header}
        value={skus}
        globalFilter={globalFilter}
        selectionMode="single"
        selection={selectedSKU}
        onSelectionChange={handleSKUSelection}
        dataKey="numero_sku"
        emptyMessage="No se encontraron SKUs"
      >
        <Column field="numero_sku" header="Código SKU Generado" sortable />
        <Column field="lote" header="Lote(s) Correspondientes" sortable />
        <Column field="fecha_produccion" header="Fecha Producción" />
      </DataTable>

      {/* Diálogo para seleccionar lote cuando hay múltiples */}
      <Dialog
        header={`Seleccionar Lote para SKU: ${selectedSKU?.numero_sku || ''}`}
        visible={loteSelectionDialog}
        style={{ width: '50vw' }}
        onHide={() => setLoteSelectionDialog(false)}
        footer={
          <div>
            <Button 
              label="Cancelar" 
              icon="pi pi-times" 
              onClick={() => setLoteSelectionDialog(false)} 
              className="p-button-text" 
            />
            <Button 
              label="Seleccionar" 
              icon="pi pi-check" 
              onClick={handleLoteSelection} 
              autoFocus 
            />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="loteSelect">Seleccione el lote a visualizar:</label>
            <DataTable
              value={availableLotes.map(lote => ({ lote }))}
              selectionMode="single"
              selection={selectedLote ? { lote: selectedLote } : null}
              onSelectionChange={(e) => setSelectedLote(e.value?.lote)}
              dataKey="lote"
            >
              <Column field="lote" header="Número de Lote" />
            </DataTable>
          </div>
        </div>
      </Dialog>

      {/* Diálogo principal de visualización de datos */}
      <Dialog
        header={`Detalles del Lote ${selectedLote || selectedSKU?.lote || ''} (SKU: ${selectedSKU?.numero_sku || ''})`}
        visible={registroDialog}
        style={{ width: '90vw' }}
        onHide={() => {
          setRegistroDialog(false);
          setRelatedData(null);
          setSelectedLote(null);
        }}
      >
        {relatedData ? (
          <div className="dialog-content">
            {/* Neonatos Inoculados */}
            {renderRelatedTable(
              "Neonatos Inoculados",
              relatedData.Neonatos_Inoculados,
              [
                { header: "Número Lote", field: "numero_lote" },
                { header: "Fecha Colecta", field: "fec_colecta" },
                { header: "Hora Colecta", field: "hor_colecta" },
                { header: "# Embudo", field: "embudo" },
                { header: "g Colectados", field: "gm_colectados" },
                { header: "Cajas Inoculadas", field: "cajas_inoculadas_destino" },
                { header: "g Neonato x Caja", field: "gm_neonato_caja" },
                { header: "Cantidad dieta x caja", field: "cantidad_dieta_caja" },
                { header: "Temperatura ambiental (°C)", field: "temp_ambiental" },
                { header: "Humedad ambiental (%)", field: "hum_ambiental" },
                { header: "Operario", field: "operario" },
                { header: "Observaciones", field: "observaciones" },
                { header: "Fecha Registro", field: "fec_registro" },
                { header: "Hora Registro", field: "hor_registro" },
              ]
            )}

            {/* Control Despacho 5dols LabPro */}
            {renderRelatedTable(
              "Control Despacho 5dols LabPro",
              relatedData.Control_Despacho_5dols_LabPro,
              [
                { field: "numero_lote", header: "Número Lote" },
                { field: "operario_hatchery", header: "Operario Hatchery" },
                { field: "fecha_despacho", header: "Fecha Despacho" },
                { field: "fecha_inoculacion", header: "Fecha Inoculación" },
                { field: "fecha_siembra_lote", header: "Fecha Siembra Lote" },
                { field: "num_viaje", header: "N° Viaje" },
                { field: "cant_cajas", header: "Cant. Cajas" },
                { field: "entregado_por", header: "Entregado por" },
                { field: "recibido_por", header: "Recibido por" },
                { field: "turno", header: "Turno" },
                { field: "destino", header: "Destino" },
                { field: "observaciones", header: "Observaciones" },
                { header: "Fecha Registro", field: "fecha_registro" },
                { header: "Hora Registro", field: "hora_registro" },
              ]
            )}

            {/* Control Rendimiento Dieta y Siembra */}
            {renderRelatedTable(
              "Control Rendimiento Dieta y Siembra",
              relatedData.Control_Rendimiento_DietaySiembra,
              [
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
                { field: "cajas_dieta_no_sembradas_rep", header: "Cajas Dieta No Sembradas Rep" },
                { field: "cajas_sembradas_pro", header: "Cajas Sembradas Pro" },
                { field: "cajas_dieta_no_sembradas_pro", header: "Cajas Dieta No Sembradas Pro" },
                { field: "tipo_control", header: "Tipo Control" },
                { field: "observaciones", header: "Observaciones" },
                { header: "Fecha Registro", field: "fec_registro" },
                { header: "Hora Registro", field: "hor_registro" },
              ]
            )}

            {/* Control Movimientos Cajas */}
            {renderRelatedTable(
              "Movimientos Cajas, Despacho Dieta",
              relatedData.Control_Movimiento_Cajas_Proceso,
              [
                { field: "base_numero_lote", header: "Número de Lote" },
                { field: "coordinador_planta", header: "Coordinador de Planta" },
                { field: "tipo_dieta", header: "Tipo de Dieta" },
                { field: "cantidad_tarimas", header: "Cantidad de Tarimas" },
                { field: "total_cajas", header: "Total de Cajas" },
                { field: "responsable", header: "Responsable" },
                { field: "observaciones", header: "Observaciones" },
                { field: "fecha_registro", header: "Fecha Registro" },
                { field: "hora_registro", header: "Hora Registro" },
              ]
            )}

            {/* Control Ingreso y Salida Racks */}
            {renderRelatedTable(
              "Control Ingreso y Salida Racks",
              relatedData.Control_Ingreso_Salida_Racks,
              [
                { field: "base_numero_lote", header: "Número de Lote" },
                { field: "ingresoysalida", header: "Ingreso/Salida" },
                { field: "destino", header: "Destino" },
                { field: "total_cajas", header: "Total de Cajas" },
                { field: "responsable", header: "Responsable" },
                { field: "observaciones", header: "Observaciones" },
                { field: "fec_registro", header: "Fecha Registro" },
                { field: "hor_registro", header: "Hora Registro" },
              ]
            )}

            {/* Control Rendimiento Cosecha y Frass */}
            {renderRelatedTable(
              "Control Rendimiento Cosecha y Frass",
              relatedData.Control_Rendimiento_CosechayFrass,
              [
                { field: "numero_lote", header: "Número Lote" },
                { field: "tipo_produccion", header: "Tipo Producción" },
                { field: "tipo_control", header: "Tipo Control" },
                { field: "fec_cosecha", header: "Fecha Cosecha" },
                { field: "cant_cajas_cosechadas", header: "Cajas Cosechadas" },
                { field: "kg_larva_fresca", header: "Larva Fresca (KG)" },
                { field: "cant_cajas_desechadas", header: "Cajas Desechadas" },
                { field: "kg_total_frass", header: "Total Frass (KG)" },
                { field: "kg_material_grueso", header: "Material Grueso (KG)" },
                { field: "observaciones", header: "Observaciones" },
                { header: "Fecha Registro", field: "fec_registro" },
                { header: "Hora Registro", field: "hor_registro" },
              ]
            )}

            {/* Horno Microondas */}
            {renderRelatedTable(
              "Secado Horno Microondas",
              relatedData.Control_Rendimiento_Secado_Horno_Microondas,
              [
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
                { header: "Fecha Registro", field: "fec_registro" },
                { header: "Hora Registro", field: "hor_registro" },
              ]
            )}

            {/* Horno Multilevel */}
            {renderRelatedTable(
              "Secado Horno Multilevel",
              relatedData.Control_Rendimiento_Secado_Horno_Multilevel,
              [
                { field: "numero_lote", header: "Número Lote" },
                { header: "Fecha Registro", field: "fecha_registro" },
                { header: "Hora Registro", field: "hora_registro" },
                { field: "tipo_control", header: "Tipo Control" },
                { field: "fecha_produccion", header: "Fecha Producción" },
                { field: "hora_proceso", header: "Hora Proceso" },
                { field: "larva_fresca_kg", header: "Larva Fresca (kg)" },
                { field: "desecho_kg", header: "Desecho (kg)" },
                { field: "observaciones", header: "Observaciones" },
              ]
            )}
          </div>
        ) : (
          <div className="loading-container">
            <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem" }}></i>
            <p>Cargando datos relacionados...</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export default VisualizarSKUs;