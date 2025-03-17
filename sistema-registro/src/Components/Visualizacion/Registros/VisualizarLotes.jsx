import supabase from "../../../supabaseClient";
import React, { useState, useEffect, useRef } from "react";
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
  const [globalFilter, setGlobalFilter] = useState(null);

  const fetchLotes = async () => {
    try {
      const { data, error } = await supabase.from("Lotes").select("*");
      if (error) throw error;
      setLotes(data || []);
    } catch (err) {
      console.error("Error fetching lotes:", err);
    }
  };

  useEffect(() => {
    fetchLotes();
  }, []);

  const fetchRelatedData = async (loteNumber) => {
    try {
      const [
        { data: neonatos },
        { data: despacho },
        { data: dietaSiembra },
        { data: cosechaFrass },
        { data: microondas },
        { data: multilevel },
        { data: terminado },
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
        supabase
          .from("Control_Rendimiento_Producto_Terminado")
          .select("*")
          .eq("base_numero_lote", loteNumber),
      ]);

      // Logs para verificar datos
      console.log("Datos relacionados para lote", loteNumber, {
        Neonatos_Inoculados: neonatos,
        Control_Despacho_5dols_LabPro: despacho,
        Control_Rendimiento_DietaySiembra: dietaSiembra,
        Control_Rendimiento_CosechayFrass: cosechaFrass,
        Control_Rendimiento_Secado_Horno_Microondas: microondas,
        Control_Rendimiento_Secado_Horno_Multilevel: multilevel,
        Control_Rendimiento_Producto_Terminado: terminado,
      });

      setRelatedData({
        Neonatos_Inoculados: neonatos,
        Control_Despacho_5dols_LabPro: despacho,
        Control_Rendimiento_DietaySiembra: dietaSiembra,
        Control_Rendimiento_CosechayFrass: cosechaFrass,
        Control_Rendimiento_Secado_Horno_Microondas: microondas,
        Control_Rendimiento_Secado_Horno_Multilevel: multilevel,
        Control_Rendimiento_Producto_Terminado: terminado,
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
        onInput={(e) => setGlobalFilter(e.target.value)}
        placeholder="Buscador Global..."
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
        >
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
            {renderRelatedTable(
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
            )}
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
