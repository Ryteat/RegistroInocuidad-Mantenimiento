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

  const formatDate = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString();
  };

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
        // Consulta para Producto Terminado
        let queryProductoTerminado = supabase
          .from("Control_Rendimiento_Producto_Terminado")
          .select("numero_sku, lote, fecha_produccion", { count: "exact" })
          .range(start, start + limit - 1);
        
        // Consulta para Larva Molida - ajustada a la estructura real
        let queryLarvaMolida = supabase
          .from("Control_Larva_Molida")
          .select("numero_sku, lotes, fecha_prod", { count: "exact" })
          .range(start, start + limit - 1);

        // Aplicar ordenamiento
        if (lazyParams.sortField) {
          const orderOptions = {
            ascending: lazyParams.sortOrder === 1,
          };
          
          queryProductoTerminado = queryProductoTerminado.order(lazyParams.sortField, orderOptions);
          
          // Mapear campos para Larva Molida
          const sortFieldLarva = lazyParams.sortField === 'lote' ? 'lotes' : 
                              lazyParams.sortField === 'fecha_produccion' ? 'fecha_prod' : 
                              lazyParams.sortField;
          queryLarvaMolida = queryLarvaMolida.order(sortFieldLarva, orderOptions);
        }

        // Aplicar filtro global
        if (lazyParams.globalFilter) {
          const filter = lazyParams.globalFilter;
          queryProductoTerminado = queryProductoTerminado.or(
            `numero_sku.ilike.%${filter}%,lote.ilike.%${filter}%`
          );
          queryLarvaMolida = queryLarvaMolida.or(
            `numero_sku.ilike.%${filter}%,lotes.ilike.%${filter}%`
          );
        }

        // Ejecutar consultas
        const [
          { data: dataProductoTerminado, count: countProductoTerminado },
          { data: dataLarvaMolida, count: countLarvaMolida }
        ] = await Promise.all([
          queryProductoTerminado,
          queryLarvaMolida
        ]);

        // Mapear datos de Larva Molida para unificar estructura
        const larvaMolidaMapped = (dataLarvaMolida || []).map(item => ({
          numero_sku: item.numero_sku,
          lote: item.lotes,
          fecha_produccion: item.fecha_prod
        }));

        const combinedData = [
          ...(dataProductoTerminado || []),
          ...larvaMolidaMapped
        ];

        setSKUs(combinedData);
        setTotalRecords((countProductoTerminado || 0) + (countLarvaMolida || 0));
      } catch (err) {
        console.error("Error fetching SKUs:", err);
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los SKUs',
          life: 3000
        });
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
        { data: larvaMolida }
      ] = await Promise.all([
        supabase.from("Neonatos_Inoculados").select("*").eq("base_numero_lote", loteNumber),
        supabase.from("Control_Despacho_5dols_LabPro").select("*").eq("base_numero_lote", loteNumber),
        supabase.from("Control_Rendimiento_DietaySiembra").select("*").eq("base_numero_lote", loteNumber),
        supabase.from("Control_Movimiento_Cajas_Proceso").select("*").eq("base_numero_lote", loteNumber),
        supabase.from("Control_Ingreso_Salida_Racks").select("*").eq("base_numero_lote", loteNumber),
        supabase.from("Control_Rendimiento_CosechayFrass").select("*").eq("base_numero_lote", loteNumber),
        supabase.from("Control_Rendimiento_Secado_Horno_Microondas").select("*").eq("base_numero_lote", loteNumber),
        supabase.from("Control_Rendimiento_Secado_Horno_Multilevel").select("*").eq("base_numero_lote", loteNumber),
        supabase.from("Control_Larva_Molida").select("*").eq("lotes", loteNumber)
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
        Control_Larva_Molida: larvaMolida
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
      const lotes = e.value.lote.split(',').map(lote => lote.trim());
      
      if (lotes.length > 1) {
        setAvailableLotes(lotes);
        setLoteSelectionDialog(true);
      } else {
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
        placeholder="Buscar por SKU o Lote"
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
        <DataTable 
          value={data} 
          size="small" 
          className="p-datatable-sm"
          scrollable
          scrollHeight="400px"
        >
          {columns.map((col) => (
            <Column
              key={col.field}
              field={col.field}
              header={col.header}
              body={col.body || null}
              style={{ minWidth: col.minWidth || '120px' }}
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
        <img src={logo2} alt="Logo" className="logo" />
        <h1>Visualización de SKUs</h1>
      </header>

      <div className="controls-section">
        <Button 
          label="Volver" 
          icon="pi pi-arrow-left" 
          className="p-button-secondary"
          onClick={() => navigate(-1)}
        />
      </div>

      <DataTable
        value={skus}
        lazy
        dataKey="numero_sku"
        paginator
        first={lazyParams.first}
        rows={lazyParams.rows}
        totalRecords={totalRecords}
        onPage={onPage}
        onSort={onSort}
        sortField={lazyParams.sortField}
        sortOrder={lazyParams.sortOrder}
        loading={loading}
        rowsPerPageOptions={[5, 10, 25]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"
        globalFilter={globalFilter}
        header={header}
        selectionMode="single"
        selection={selectedSKU}
        onSelectionChange={handleSKUSelection}
        emptyMessage="No se encontraron SKUs"
        showGridlines
        className="p-datatable-striped"
      >
        <Column field="numero_sku" header="SKU" sortable filter filterPlaceholder="Buscar SKU" />
        <Column field="lote" header="Lote(s)" sortable filter filterPlaceholder="Buscar lote" />
        <Column 
          field="fecha_produccion" 
          header="Fecha Producción" 
          sortable 
          body={(rowData) => formatDate(rowData.fecha_produccion)}
        />
      </DataTable>

      {/* Diálogo para selección de lote */}
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
      </Dialog>

      {/* Diálogo principal de visualización */}
      <Dialog
        header={`Detalles del Lote ${selectedLote || selectedSKU?.lote || ''} (SKU: ${selectedSKU?.numero_sku || ''})`}
        visible={registroDialog}
        style={{ width: '95vw', maxWidth: '1200px' }}
        onHide={() => {
          setRegistroDialog(false);
          setRelatedData(null);
          setSelectedLote(null);
        }}
        maximizable
        modal
      >
        {relatedData ? (
          <div className="dialog-content">
            {/* Neonatos Inoculados */}
            {renderRelatedTable(
              "Neonatos Inoculados",
              relatedData.Neonatos_Inoculados,
              [
                { field: "numero_lote", header: "Lote", minWidth: '100px' },
                { field: "fec_colecta", header: "Fecha Colecta", body: (rowData) => formatDate(rowData.fec_colecta) },
                { field: "gm_colectados", header: "Gramos Colectados" },
                { field: "operario", header: "Operario" }
              ]
            )}

            {/* Control Larva Molida - Ahora con todos los campos correctos */}
            {renderRelatedTable(
              "Control Larva Molida",
              relatedData.Control_Larva_Molida,
              [
                { field: "numero_sku", header: "SKU", minWidth: '100px' },
                { field: "lotes", header: "Lote" },
                { field: "fecha_prod", header: "Fecha Producción", body: (rowData) => formatDate(rowData.fecha_prod) },
                { field: "hora_inicio", header: "Hora Inicio" },
                { field: "hora_fin", header: "Hora Fin" },
                { field: "larva_entera_seca", header: "Larva Entera Seca (kg)" },
                { field: "larva_molida", header: "Larva Molida (kg)" },
                { field: "merma", header: "Merma" },
                { field: "operario", header: "Operario" },
                { field: "observaciones", header: "Observaciones" }
              ]
            )}

            {/* Resto de las tablas... */}
            {renderRelatedTable(
              "Control Despacho 5dols LabPro",
              relatedData.Control_Despacho_5dols_LabPro,
              [
                { field: "numero_lote", header: "Lote" },
                { field: "fecha_despacho", header: "Fecha Despacho" },
                { field: "cant_cajas", header: "Cant. Cajas" }
              ]
            )}

            {renderRelatedTable(
              "Control Rendimiento Dieta y Siembra",
              relatedData.Control_Rendimiento_DietaySiembra,
              [
                { field: "tipo_dieta", header: "Tipo Dieta" },
                { field: "kg_total", header: "Kg Total" }
              ]
            )}

            {/* Agrega más tablas según sea necesario */}
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