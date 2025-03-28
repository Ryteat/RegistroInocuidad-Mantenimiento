import supabase from "../../../supabaseClient";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import logo2 from "../../../assets/mosca.png";
import "./VisualizarLotes.css";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";

function VisualizarLotes() {
  const navigate = useNavigate();
  const [lotes, setLotes] = useState([]);
  const [selectedLote, setSelectedLote] = useState(null);
  const [relatedData, setRelatedData] = useState(null);
  const [registroDialog, setRegistroDialog] = useState(false);
  const toast = useRef(null);
  const [globalFilter, setGlobalFilter] = useState("");

  // Nuevos estados para lazy loading
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

  //Inicio de Sorting y Filtro global por lazy load
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
  //FIN de Sorting y Filtro global por lazy load

  const fetchLotes = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Lotes")
          .select("*", { count: "exact" })
          .range(start, start + limit - 1);
        // Ordenar por defecto por fecha descendente (más nuevos primero)
        // .order("fec_registro", { ascending: false });

        // Aplicar sorting
        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

        // Aplicar filtro global
        if (lazyParams.globalFilter) {
          query = query.or(
            `base_numero_lote.ilike.%${lazyParams.globalFilter}%,fecha_registro.ilike.%${lazyParams.globalFilter}%`
          );
        }

        const { data, error, count } = await query;

        if (error) throw error;
        setLotes(data || []);
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

  useEffect(() => {
    fetchLotes(lazyParams.first, lazyParams.rows);
  }, [
    fetchLotes,
    lazyParams.first,
    lazyParams.rows,
    lazyParams.sortField,
    lazyParams.sortOrder,
    lazyParams.globalFilter,
  ]);
  // Manejar cambio de página y lazy loading
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

        // { data: terminado },
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
        // supabase
        //   .from("Control_Rendimiento_Producto_Terminado")
        //   .select("*")
        //   .eq("base_numero_lote", loteNumber),
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

        // Control_Rendimiento_Producto_Terminado: terminado,
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
  // const formatDate = (dateString) => {
  //   if (!dateString) return 'N/A';
  //   const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  //   return new Date(dateString).toLocaleDateString('es-ES', options);
  // };
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
    <>
      <Toast ref={toast} />
      <h1>
        <img src={logo2} alt="mosca" className="logo2" />
        Visualización de Lotes
      </h1>

      <div className="welcome-message">
        <p>
          Bienvenido al panel de visualización de Lotes. Aquí puedes monitorear
          los Lotes y observar sus registros asociados en cada una de las areas
          Productivas.
        </p>
      </div>

      <div className="buttons-container">
        <button onClick={() => navigate(-1)} className="return-button">
          Volver
        </button>
        <button onClick={() => navigate(-2)} className="menu-button">
          Menú principal
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
        globalFilter={globalFilter}
        value={lotes}
        selectionMode="single"
        selection={selectedLote}
        onSelectionChange={(e) => {
          const lote = e.value;
          setSelectedLote(lote);

          if (lote) {
            // Mostrar toast de selección
            toast.current.show({
              severity: "success",
              summary: "Lote seleccionado",
              detail: `Has seleccionado el lote ${lote.base_numero_lote}`,
              life: 3000,
            });

            fetchRelatedData(lote.base_numero_lote);
            setRegistroDialog(true);
          }
        }}
        dataKey="id"
        metaKeySelection={false}
        tableStyle={{ minWidth: "50rem" }}
      >
        <Column field="base_numero_lote" header="Número de Lote" />
        <Column field="fecha_registro" header="Fecha Registro" />
        <Column field="hora_registro" header="Hora Registro" />
        <Column field="etapa_actual" header="Etapa Actual" />
      </DataTable>

      <Dialog
        header={`Detalles del Lote ${selectedLote?.base_numero_lote || ""}`}
        visible={registroDialog}
        style={{ width: "90vw" }}
        onHide={() => {
          setRegistroDialog(false);
          setSelectedLote(null);
          setRelatedData(null);
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
                {
                  header: "Cajas Inoculadas",
                  field: "cajas_inoculadas_destino",
                },
                { header: "g Neonato x Caja", field: "gm_neonato_caja" },
                {
                  header: "Cantidad dieta x caja",
                  field: "cantidad_dieta_caja",
                },
                {
                  header: "Temperatura ambiental (°C)",
                  field: "temp_ambiental",
                },
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
                {
                  field: "cajas_procesadas_neonatos",
                  header: "Cajas Procesadas Neonatos",
                },
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
                {
                  field: "coordinador_planta",
                  header: "Coordinador de Planta",
                },
                { field: "tipo_dieta", header: "Tipo de Dieta" },
                { field: "cantidad_tarimas", header: "Cantidad de Tarimas" },
                { field: "total_cajas", header: "Total de Cajas" },
                { field: "responsable", header: "Responsable" },
                { field: "observaciones", header: "Observaciones" },
                { field: "registrado", header: "Registrado" },
              ]
            )}

            {/* Control Ingreso y Salida Racks */}
            {renderRelatedTable(
              "Control Ingreso y Salida Racks",
              relatedData.Control_Ingreso_Salida_Racks,
              [
                { field: "base_numero_lote", header: "Número de Lote" },
                { field: "ingresoysalida", header: "Ingreso/Salida" },
                { field: "tipo_registro", header: "Tipo de Registro" },
                { field: "total_cajas", header: "Total de Cajas" },
                { field: "responsable", header: "Responsable" },
                { field: "observaciones", header: "Observaciones" },
                { field: "fecha_registro", header: "Fecha Registro" },
                { field: "hora_registro", header: "Hora Registro" },
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
                { field: "fec_siembra", header: "Fecha Siembra" },
                { field: "fec_cosecha", header: "Fecha Cosecha" },
                { field: "cant_cajas_cosechadas", header: "Cajas Cosechadas" },
                { field: "kg_larva_fresca", header: "Larva Fresca (KG)" },
                { field: "cant_cajas_desechadas", header: "Cajas Desechadas" },
                { field: "kg_total_frass", header: "Total Frass (KG)" },
                { field: "kg_material_grueso", header: "Material Grueso (KG)" },
                { field: "cant_sacos", header: "Sacos" },
                {
                  field: "fec_almacenaje_frass",
                  header: "Fecha Almacenaje Frass",
                },
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
                { field: "cajas_totales", header: "Cajas Totales" },
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
              "Secado Horno Microondas",
              relatedData.Control_Rendimiento_Secado_Horno_Multilevel,
              [
                { field: "numero_lote", header: "Número Lote" },
                { header: "Fecha Registro", field: "fecha_registro" },
                { header: "Hora Registro", field: "hora_registro" },
                { field: "tipo_control", header: "Tipo Control" },
                { field: "fecha_siembra", header: "Fecha Siembra" },
                { field: "fecha_produccion", header: "Fecha Producción" },
                { field: "hora_proceso", header: "Hora Proceso" },
                { field: "larva_fresca_kg", header: "Larva Fresca (kg)" },
                { field: "cajas_totales", header: "Cajas Totales" },
                { field: "desecho_kg", header: "Desecho (kg)" },
                { field: "observaciones", header: "Observaciones" },
              ]
            )}

            {/* {renderRelatedTable(
              "Producto Terminado",
              relatedData.Control_Rendimiento_Producto_Terminado,
              [
                { field: "fecha_produccion", header: "Fecha Producción" },
                { field: "hora", header: "Hora" },
                { field: "lote", header: "Lote" },
                { field: "cant_bolsas", header: "Cantidad Bolsas" },
                { field: "SKU", header: "SKU" },
                { field: "operario", header: "Operario" },

                { field: "observaciones", header: "Observaciones" },
                { field: "fecha_registro", header: "Fecha Registro" },
                { field: "hora_registro", header: "Hora Registro" },

                { field: "cons_cartonnormal", header: "Consumo Cartón Normal" },
                { field: "dese_cartonnormal", header: "Desecho Cartón Normal" },
                {
                  field: "cons_cartonreforzado",
                  header: "Consumo Cartón Reforzado",
                },
                {
                  field: "dese_cartonreforzado",
                  header: "Desecho Cartón Reforzado",
                },
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
              ]
            )} */}
          </div>
        ) : (
          <div className="loading-container">
            <i
              className="pi pi-spin pi-spinner"
              style={{ fontSize: "2rem" }}
            ></i>
            <p>Cargando datos relacionados...</p>
          </div>
        )}
      </Dialog>
    </>
  );
}

export default VisualizarLotes;
