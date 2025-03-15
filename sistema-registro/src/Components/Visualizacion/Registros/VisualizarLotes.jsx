import supabase from "../../../supabaseClient";
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo2 from "../../../assets/mosca.png";
import "./VisualizarLotes.css";

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
import { Divider } from 'primereact/divider';

function VisualizarLotes() {
  const navigate = useNavigate();
  const [lotes, setLotes] = useState([]);
  const [selectedLote, setSelectedLote] = useState(null);
  const [relatedData, setRelatedData] = useState(null);
  const [registroDialog, setRegistroDialog] = useState(false);
  const toast = useRef(null);

  const fetchLotes = async () => {
    try {
      const { data, error } = await supabase
        .from("Lotes")
        .select("*");
      if (error) throw error;
      setLotes(data || []);
    } catch (err) {
      console.error("Error fetching lotes:", err);
    }
  };

  useEffect(() => {
    fetchLotes();
  }, []);

  useEffect(() => {
    const fetchRelatedData = async () => {
      if (selectedLote) {
        try {
          const { data, error } = await supabase
            .from('Lotes')
            .select(`*`)
            .eq('id', selectedLote.id)
            .single();

          if (error) throw error;
          setRelatedData(data);
        } catch (err) {
          console.error('Error fetching related data:', err);
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar datos relacionados',
            life: 3000
          });
        }
      }
    };
    
    if (selectedLote) fetchRelatedData();
  }, [selectedLote]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  const renderRelatedTable = (data, title, fields) => {
    if (!data || data.length === 0) return null;
    
    return (
      <div className="related-table-section">
        <Divider align="left">
          <span className="p-tag">{title}</span>
        </Divider>
        <DataTable value={data} size="small" className="p-datatable-sm">
          {fields.map((field) => (
            <Column 
              key={field.key}
              field={field.key} 
              header={field.header} 
              body={field.body || null}
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
          Bienvenido al panel de visualización de Lotes.  
          Aquí puedes monitorear los Lotes y observar sus registros asociados en cada una de las areas Productivas.
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
        value={lotes}
        selectionMode="single"
        selection={selectedLote}
        onSelectionChange={(e) => {
          setSelectedLote(e.value);
          setRegistroDialog(!!e.value);
        }}
        dataKey="id"
        metaKeySelection={false}
        tableStyle={{ minWidth: '50rem' }}
      >
        <Column field="base_numero_lote" header="Número de Lote" />
        <Column field="fecha_registro" header="Fecha Registro" />
        <Column field="hora_registro" header="Hora Registro" />
        <Column field="etapa_actual" header="Etapa Actual" />
      </DataTable>

      <Dialog
        header={`Detalles del Lote ${selectedLote?.base_numero_lote || ''}`}
        visible={registroDialog}
        style={{ width: '80vw' }}
        onHide={() => {
          setRegistroDialog(false);
          setSelectedLote(null);
          setRelatedData(null);
        }}
      >
        {relatedData ? (
          <div className="dialog-content">
            <div className="main-info">
              <h4>Información Básica</h4>
              <p><strong>Número de Lote:</strong> {relatedData.base_numero_lote}</p>
              <p><strong>Fecha Registro:</strong> {relatedData.fecha_registro}</p>
              <p><strong>Hora Registro:</strong> {relatedData.hora_registro}</p>
              <p><strong>Etapa Actual:</strong> {relatedData.etapa_actual}</p>
            </div>

            {renderRelatedTable(relatedData.Produccion, 'Producción', [
              { key: 'fecha_inicio', header: 'Fecha Inicio' },
              { key: 'cantidad', header: 'Cantidad' },
              { key: 'observaciones', header: 'Observaciones' }
            ])}

            {renderRelatedTable(relatedData.Alimentacion, 'Alimentación', [
              { key: 'tipo_alimento', header: 'Tipo de Alimento' },
              { key: 'fecha_alimentacion', header: 'Fecha' },
              { key: 'cantidad_kg', header: 'Cantidad (kg)' }
            ])}

            {renderRelatedTable(relatedData.Sacrificio, 'Sacrificio', [
              { key: 'fecha_sacrificio', header: 'Fecha' },
              { key: 'peso_promedio', header: 'Peso Promedio' },
              { key: 'numero_animales', header: 'N° Animales' }
            ])}

            {renderRelatedTable(relatedData.Empacado, 'Empacado', [
              { key: 'fecha_empacado', header: 'Fecha' },
              { key: 'lote_empacado', header: 'Lote' },
              { key: 'peso_total', header: 'Peso Total' }
            ])}
          </div>
        ) : (
          <div className="loading-container">
            <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
            <p>Cargando datos relacionados...</p>
          </div>
        )}
      </Dialog>
    </>
  );
}

export default VisualizarLotes;