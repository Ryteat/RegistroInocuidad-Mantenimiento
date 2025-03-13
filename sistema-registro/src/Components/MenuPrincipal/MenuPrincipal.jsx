import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './MenuPrincipal.css';
import logo from '../../assets/Pronuvo_logos_sin_fondo_6.png green.png';
import logo2 from '../../assets/mosca.png';

function MenuPrincipal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { departamento } = location.state || {};

  // Depuración: Mostrar en consola el valor recibido
  console.log('Departamentos recibidos:', departamento);

  // Función mejorada para verificar departamentos
  const hasDepartment = (requiredDepartments) => {
    try {
      if (!departamento) return false;
      
      // Asegurar que sea array (convertir si es string)
      const userDepartments = Array.isArray(departamento) 
        ? departamento 
        : typeof departamento === 'string'
          ? departamento.split(',')
          : [];

      // Normalizar nombres (trim + minúsculas)
      const normalizedUserDepartments = userDepartments.map(d => d.trim().toLowerCase());
      
      return requiredDepartments.some(rd => 
        normalizedUserDepartments.includes(rd.trim().toLowerCase())
      );
    } catch (error) {
      console.error('Error verificando departamentos:', error);
      return false;
    }
  };

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="menu-principal">
      <h1>
        <img src={logo2} alt="mosca" className="logo2" /> Menú Principal
      </h1>

      <div className="botones">
        {hasDepartment(['Hatchery']) && (
          <button onClick={() => navigate('/Hatchery')}>Registros Hatchery</button>
        )}

        {hasDepartment(['Dieta']) && (
          <button onClick={() => navigate('/Dieta')}>Registros Dieta</button>
        )}

        {hasDepartment(['Horno']) && (
          <button onClick={() => navigate('/Horno')}>Registros Horno</button>
        )}

        {hasDepartment(['Calidad']) && (
          <button onClick={() => navigate('/Calidad')}>Registros Calidad</button>
        )}

        {hasDepartment(['Cosecha']) && (
          <button onClick={() => navigate('/Cosecha')}>Registros Cosecha</button>
        )}

        {hasDepartment(['Mantenimiento']) && (
          <button onClick={() => navigate('/Mantenimiento')}>Registros Mantenimiento</button>
        )}

        {hasDepartment(['Gerencia']) && (
          <button onClick={() => navigate('/Gerencia')}>Información Gerencia</button>
        )}

        {hasDepartment(['Visualizar']) && (
          <button onClick={() => navigate('/Visualizar')}>Visualizar información</button>
        )}

        <button onClick={handleLogout} className="logout-button">
          Cerrar Sesión
        </button>
      </div>

      <img src={logo} alt="Logo" className="logo" />
    </div>
  );
}

export default MenuPrincipal;