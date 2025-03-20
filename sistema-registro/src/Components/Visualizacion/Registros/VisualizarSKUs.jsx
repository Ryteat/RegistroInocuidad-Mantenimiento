import supabase from "../../../supabaseClient";
import React, { useState, useEffect, useRef } from "react";
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

function VisualizarSKUs() {
  const navigate = useNavigate();
  const [skus, setSKUs] = useState([]);
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [relatedLotes, setRelatedLotes] = useState([]);
  const [registroDialog, setRegistroDialog] = useState(false);
  const toast = useRef(null);
  const [globalFilter, setGlobalFilter] = useState(null);

  // 1. Consulta principal de SKUs
  const fetchSKUs = async () => {
    try {
      const { data, error } = await supabase
        .from("SKU")
        .select("base_codigo_sku, fecha_registro, hora_registro");
      
      if (error) throw error;
      setSKUs(data || []);
    } catch (err) {
      console.error("Error fetching SKUs:", err);
    }
  };

  // 2. Consulta de lotes relacionados
  const fetchRelatedLotes = async (skuCode) => {
    try {
      // Primero obtenemos los IDs de lotes desde SKU_Lotes
      const { data: skuLotes, error: errorLotes } = await supabase
      .from("sku_lotes")  // Usar nombre en minúsculas
      .select("base_numero_lote")
      .eq("sku_base", skuCode);

      if (errorLotes) throw errorLotes;
      
      // Extraemos solo los números de lote
      const lotesIds = skuLotes.map(item => item.base_numero_lote);
      
      // Obtenemos los detalles completos de los lotes
      const { data: lotesData, error: errorDetalles } = await supabase
        .from("Lotes")
        .select("*")
        .in("base_numero_lote", lotesIds);

      if (errorDetalles) throw errorDetalles;
      
      setRelatedLotes(lotesData || []);
      
    } catch (err) {
      console.error("Error fetching related data:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Error al cargar lotes asociados",
        life: 3000,
      });
    }
  };

  useEffect(() => {
    fetchSKUs();
  }, []);

  const header = (
    <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
      <InputText
        type="search"
        onInput={(e) => setGlobalFilter(e.target.value)}
        placeholder="Buscar SKUs..."
      />
    </div>
  );

  const renderLotesDetails = () => {
    if (!relatedLotes || relatedLotes.length === 0) {
      return <p className="p-text-secondary">No hay lotes asociados a este SKU</p>;
    }

    return (
      <div className="lotes-container">
        <Divider align="left">
          <span className="p-tag">Lotes asociados</span>
        </Divider>
        
        <DataTable
          value={relatedLotes}
          className="p-datatable-sm"
          paginator
          rows={5}
          emptyMessage="No se encontraron lotes"
        >
          <Column field="base_numero_lote" header="Número de Lote" sortable />
          <Column field="fecha_registro" header="Fecha Registro" />
          <Column field="hora_registro" header="Hora Registro" />
          <Column field="etapa_actual" header="Etapa Actual" />
          <Column field="fecha_inoculacion" header="Fecha Inoculación" />
          <Column field="fecha_siembra" header="Fecha Siembra" />
          <Column field="fecha_engorde" header="Fecha Engorde" />
          <Column field="fecha_cosecha" header="Fecha Cosecha" />
          <Column field="fecha_horneado" header="Fecha Horneado" />
          <Column field="fecha_empaque" header="Fecha Empaque" />
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
        <button 
          className="p-button p-button-secondary"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
        <InputText
          placeholder="Buscar SKU..."
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="search-input"
        />
      </div>

      <DataTable
        value={skus}
        globalFilter={globalFilter}
        selectionMode="single"
        selection={selectedSKU}
        onSelectionChange={(e) => {
          setSelectedSKU(e.value);
          if (e.value) {
            fetchRelatedLotes(e.value.base_codigo_sku);
            setRegistroDialog(true);
          }
        }}
        dataKey="base_codigo_sku"
        emptyMessage="No se encontraron SKUs"
      >
        <Column field="base_codigo_sku" header="Código SKU" sortable />
        <Column field="fecha_registro" header="Fecha de Registro" />
        <Column field="hora_registro" header="Hora de Registro" />
      </DataTable>

      <Dialog
        header={`Detalles del SKU: ${selectedSKU?.base_codigo_sku || ''}`}
        visible={registroDialog}
        style={{ width: 'min(90vw, 1200px)' }}
        onHide={() => {
          setRegistroDialog(false);
          setRelatedLotes([]);
        }}
      >
        {renderLotesDetails()}
      </Dialog>
    </div>
  );
}

export default VisualizarSKUs;