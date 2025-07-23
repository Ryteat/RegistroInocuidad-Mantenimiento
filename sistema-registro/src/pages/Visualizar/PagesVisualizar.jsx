import React from 'react';
import Visualizar from '../../components/Visualizacion/Visualizar'; // Importa el componente padre

const PagesVisualizar = () => {
  return (
    <div>
      <Visualizar/> {/* Renderiza el layout padre con Outlet */}
    </div>
  );
}
export default PagesVisualizar