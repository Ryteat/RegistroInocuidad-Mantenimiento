import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './MenuPrincipal.css';
import logo from '../../assets/Pronuvo_logos_sin_fondo_6.png green.png';
import logo2 from '../../assets/mosca.png';

function MenuPrincipal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { departamento } = location.state || {};

  // Verificación de departamentos (acepta string separado por comas o array)
  const hasDepartment = (requiredDepartments) => {
    try {
      if (!departamento) return false;

      const userDepartments = Array.isArray(departamento)
        ? departamento
        : typeof departamento === 'string'
          ? departamento.split(',')
          : [];

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

  // Matriz de botones con sus propiedades
  const botones = [
    {
      texto: 'Registros Hatchery',
      ruta: '/Hatchery',
      departamentos: ['Hatchery'],
      cols: 1
    },
    {
      texto: 'Registros Dieta',
      ruta: '/Dieta',
      departamentos: ['Dieta'],
      cols: 1
    },
    {
      texto: 'Registros Horno',
      ruta: '/Horno',
      departamentos: ['Horno'],
      cols: 1
    },
    {
      texto: 'Registros Calidad',
      ruta: '/Calidad',
      departamentos: ['Calidad'],
      cols: 1
    },
    {
      texto: 'Registros Cosecha',
      ruta: '/Cosecha',
      departamentos: ['Cosecha'],
      cols: 1
    },
    {
      texto: 'Registros Mantenimiento',
      ruta: '/Mantenimiento',
      departamentos: ['Mantenimiento'],
      cols: 1
    },
    {
      texto: 'Registros Inocuidad',
      ruta: '/Inocuidad',
      departamentos: ['Inocuidad'],
      cols: 1
    },
    {
      // ✅ Va directo al frame de alertas
      texto: 'Alertas de Mantenimiento',
      ruta: '/MantenimientoAlertas/Alertas',
      // ✅ Visible si el usuario tiene Mantenimiento o MantenimientoAlertas
      departamentos: ['Mantenimiento', 'MantenimientoAlertas'],
      cols: 1
    },
    {
      texto: 'Información Gerencia',
      ruta: '/Gerencia',
      departamentos: ['Gerencia'],
      cols: 2
    },
    {
      texto: 'Visualizar información',
      ruta: '/Visualizar',
      departamentos: ['Visualizar'],
      cols: 2
    },
  ];

  return (
    <div className="menu-principal">
      <h1>
        <img src={logo2} alt="mosca" className="logo2" /> Menú Principal
      </h1>

      <div className="grid-botones">
        {botones.map((boton, index) => (
          hasDepartment(boton.departamentos) && (
            <button
              key={index}
              className={`boton-grid cols-${boton.cols}`}
              onClick={() => navigate(boton.ruta)}
            >
              {boton.texto}
            </button>
          )
        ))}

        <button
          onClick={handleLogout}
          className="boton-grid logout-button cols-2"
        >
          Cerrar Sesión
        </button>
      </div>

      <img src={logo} alt="Logo" className="logo" />
    </div>
  );
}

export default MenuPrincipal;
