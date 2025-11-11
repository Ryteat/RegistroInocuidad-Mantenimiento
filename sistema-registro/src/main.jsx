import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { PrimeReactProvider } from 'primereact/api';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

// imports de las paginas principales
import Login from './pages/Login/PagesLogin.jsx';
import MenuPrincipal from './pages/MenuPrincipal/PagesMenuPrincipal.jsx';

// imports paginas Hatchery
import Hatchery from './pages/Hatchery/PagesHatchery.jsx';
import ColectaInvernadero from './pages/Hatchery/Registros/PagesColectaInvernadero.jsx';
import IngresoPPInvernadero from './pages/Hatchery/Registros/PagesIngresoPPInvernadero.jsx';
import NIB from './pages/Hatchery/Registros/PagesNIB.jsx';
import ControlRendimientoCosechaReproduccion from './pages/Hatchery/Registros/PagesControlRendimientoCosechaReproduccion.jsx';
import ControlDespachoLabPro from './pages/Hatchery/Registros/PagesControlDespachoLabPro.jsx';

// imports paginas Dieta
import Dieta from './pages/Dieta/PagesDieta.jsx';
import ControlInventarioCascaraPila from './pages/Dieta/Registros/PagesControlInventarioCascaraPila.jsx';
import ControlRendimientoDietaySiembra from './pages/Dieta/Registros/PagesControlRendimientoDietaySiembra.jsx';
import ControlMovimientosCajasProceso from './pages/Dieta/Registros/PagesControlMovimientosCajasProceso.jsx';

// imports paginas Gerencia
import Gerencia from './pages/Gerencia/PagesGerencia.jsx';
import GestionUsuarios from './pages/Gerencia/Registros/PagesGestionUsuarios.jsx';

// import de Inocuidad
import PagesInocuidad from './pages/Inocuidad/PagesInocuidad.jsx';
import LimpiezaAreaHatchery from "./Components/Inocuidad/Registros/LimpiezaAreaHatchery.jsx";
import LimpiezaAreaCosecha from "./Components/Inocuidad/Registros/LimpiezaAreaCosecha.jsx";
import LimpiezaTarimasCajas from "./Components/Inocuidad/Registros/LimpiezaTarimasCajas.jsx";
import PagesLimpiezaDietaSiembra from './pages/Inocuidad/Registros/PagesLimpiezaDietaSiembra.jsx';
import PagesLimpiezaHornoMultilevel from './pages/Inocuidad/Registros/PagesLimpiezaHornoMultilevel.jsx';
import PagesLimpiezaBanosCasillerosPediluvios from './pages/Inocuidad/Registros/PagesLimpiezaBanosCasillerosPediluvios.jsx';
import PagesLimpiezaOficinaReunionesComedor from './pages/Inocuidad/Registros/PagesLimpiezaOficinaReunionesComedor.jsx';
import PagesControlPlagasRoedores from './pages/Inocuidad/Registros/PagesControlPlagasRoedores.jsx';
import PagesLimpiezaTanqueAgua from "./pages/Inocuidad/Registros/PagesLimpiezaTanqueAgua.jsx";

// --- Mantenimiento / Alertas ---
import PagesMantenimientoAlertas from './pages/MantenimientoAlertas/PagesMantenimientoAlertas.jsx';
import MantenimientoAlertas from './Components/MantenimientoAlertas/MantenimientoAlertas.jsx';
import InfraestructuraDePlanta from './Components/MantenimientoAlertas/InfraestructuraDePlanta/InfraestructuraDePlanta.jsx';
import PanelElectrico from './Components/MantenimientoAlertas/InfraestructuraDePlanta/Registros/PanelElectrico.jsx';
import Iluminacion from './Components/MantenimientoAlertas/InfraestructuraDePlanta/Registros/Iluminacion.jsx';
import CuartosElectricos from './Components/MantenimientoAlertas/InfraestructuraDePlanta/Registros/CuartosElectricos.jsx';
import ContenedorAlertas from './Components/MantenimientoAlertas/Alertas/ContenedorAlertas.jsx';
import MotorReductor from './Components/MantenimientoAlertas/Horno/Registros/MotorReductor.jsx';
import Vibrador from './Components/MantenimientoAlertas/Horno/Registros/Vibrador.jsx';
import MotorReductorEnfriador from './Components/MantenimientoAlertas/Horno/Registros/MotorReductorEnfriador.jsx';
import LubricacionBandasEnfriador from './Components/MantenimientoAlertas/Horno/Registros/LubricacionBandasEnfriador.jsx';
import VibradorEnfriador from './Components/MantenimientoAlertas/Horno/Registros/VibradorEnfriador.jsx';
import BandaSalidaGeneral from './Components/MantenimientoAlertas/Horno/Registros/BandaSalidaGeneral.jsx';
import BandaEntradaGeneral from './Components/MantenimientoAlertas/Horno/Registros/BandaEntradaGeneral.jsx';
import VibradorHornoMultilevel from './Components/MantenimientoAlertas/Horno/Registros/VibradorHornoMultilevel.jsx';
import LineaGasGLPHornoMultilevel from "./Components/MantenimientoAlertas/Horno/Registros/LineaGasGLPHornoMultilevel.jsx";
import TransmisionTurbinaHornoMultilevel from "./Components/MantenimientoAlertas/Horno/Registros/TransmisionTurbinaHornoMultilevel.jsx";
import LubricacionBandasHornoMultilevel from "./Components/MantenimientoAlertas/Horno/Registros/LubricacionBandasHornoMultilevel.jsx";
import SelladoraBandaContinuaGeneral from "./Components/MantenimientoAlertas/Horno/Registros/SelladoraBandaContinuaGeneral.jsx";


// ⬇️ Horno del módulo de Alertas (MENÚ)
import HornoMA from './Components/MantenimientoAlertas/Horno/HornoMA.jsx';

// Registro de Horno (Alertas)
import SistemaNeumatico from './Components/MantenimientoAlertas/Horno/Registros/SistemaNeumatico.jsx';
// control de tiempos imports
import ControlTiempos from './pages/ControlTiempos/PagesControlTiempos.jsx';

// imports de páginas de Horno
import Horno from './pages/Horno/PagesHorno.jsx';
import ControlRendimientoSecadoHornoMultilevel from './pages/Horno/Registros/PagesControlRendimientoSecadoHornoMultilevel.jsx';
import ControlRendimientoSecadoHornoMicroondas from './pages/Horno/Registros/PagesControlRendimientoSecadoHornoMicroondas.jsx';
import ControlOperativoHornoMultilevel from './pages/Horno/Registros/PagesControlOperativoHornoMultilevel.jsx';
import ControlRendimientoProductoTerminado from './pages/Horno/Registros/PagesControlRendimientoProductoTerminado.jsx';
import ControlReempaque from './pages/Horno/Registros/PagesControlReempaque.jsx';
import ControlLarvaMolida from './pages/Horno/Registros/PagesControlLarvaMolida.jsx';

// imports de páginas de Calidad
import Calidad from './pages/Calidad/PagesCalidad.jsx';
import ControlCalidadCosecha from './pages/Calidad/Registros/PagesControlCalidadCosecha.jsx';
import RecepcionMateriasPrimas from './pages/Calidad/Registros/PagesRecepcionMateriasPrimas.jsx';
import ControlNeonatos from './pages/Calidad/Registros/PagesControlNeonatos.jsx';
import ControlCalidadEngordeHatchery from './pages/Calidad/Registros/PagesControlCalidadEngordeHatchery.jsx';
import ControlCalidadHornoMicroondas from './pages/Calidad/Registros/PagesControlCalidadHornoMicroondas.jsx';
import ControlCalidadHornoMultilevel from './pages/Calidad/Registros/PagesControlCalidadHornoMultilevel.jsx';
import ControlCalidadDietaSiembra from './pages/Calidad/Registros/PagesControlCalidadDietaSiembra.jsx';

// imports de páginas de Mantenimiento
import Mantenimiento from './pages/Mantenimiento/PagesMantenimiento.jsx';
import LimpiezaDesinfeccionEquiposMaquinariaPesada from './pages/Mantenimiento/Registros/PagesLimpiezaDesinfeccionEquiposMaquinariaPesada.jsx';
import ReporteInspeccion from './pages/Mantenimiento/Registros/PagesReporteInspeccion.jsx'
import ReporteInspeccionSemanal from './pages/Mantenimiento/Registros/PagesReporteInspeccionSemanal.jsx'
import PreoperacionalTeletruk from './pages/Mantenimiento/Registros/PagesPreoperacionalTeletruk.jsx'

// imports de páginas de Cosecha
import Cosecha from './pages/Cosecha/PagesCosecha.jsx';
import ControlRendimientoCosechayFrass from './pages/Cosecha/Registros/PagesControlRendimientoCosechayFrass.jsx'
import ControlIngresoySalidaRacks from './pages/Cosecha/Registros/PagesControlIngresoySalidaRacks.jsx'

// imports de páginas Visualizar
import Visualizar from './pages/Visualizar/PagesVisualizar';
import VisualizarKPIs from './pages/Visualizar/Registros/PagesVisualizarKPIs';
import VisualizarLotes from './pages/Visualizar/Registros/PagesVisualizarLotes';
import VisualizarSKUs from './pages/Visualizar/Registros/PagesVisuazlizarSKUs';
import FlashReport from './pages/Visualizar/Registros/PagesFlashReport';
// 🔧 OJO: se eliminó import duplicado de PagesControlLarvaMolida

const Layout = () => (
  <div>
    <Outlet />
  </div>
);

const router = createBrowserRouter(
  [
    {
      path: `/`,
      element: <Layout />,
      children: [
        { path: `/`, element: <Login /> },
        { path: `/MenuPrincipal`, element: <MenuPrincipal /> },

        // Inocuidad
        {
          path: `/Inocuidad`,
          element: <PagesInocuidad />,
          children: [
            { path: 'RegistroLimpiezaHatchery', element: <LimpiezaAreaHatchery /> },
            { path: 'RegistroLimpiezaCosecha', element: <LimpiezaAreaCosecha /> },
            { path: 'LimpiezaTarimasCajas', element: <LimpiezaTarimasCajas /> },
            { path: `LimpiezaDietaSiembra`, element: <PagesLimpiezaDietaSiembra /> },
            { path: `LimpiezaHornoMultilevel`, element: <PagesLimpiezaHornoMultilevel /> },
            { path: `LimpiezaBanosCasillerosPediluvios`, element: <PagesLimpiezaBanosCasillerosPediluvios /> },
            { path: 'LimpiezaOficinaReunionesComedor', element: <PagesLimpiezaOficinaReunionesComedor /> },
            { path: `ControlPlagasRoedores`, element: <PagesControlPlagasRoedores /> },
            { path: `LimpiezaTanqueAgua`, element: <PagesLimpiezaTanqueAgua /> },
          ],
        },

        // Hatchery
        {
          path: `/Hatchery`,
          element: <Hatchery />,
          children: [
            { path: `IngresoPPInvernadero`, element: <IngresoPPInvernadero /> },
            { path: `ColectaInvernadero`, element: <ColectaInvernadero /> },
            { path: `NIB`, element: <NIB /> },
            { path: `ControlRendimientoCosechaReproduccion`, element: <ControlRendimientoCosechaReproduccion /> },
            { path: `ControlDespachoLabPro`, element: <ControlDespachoLabPro /> },
          ],
        },

        // Dieta
        {
          path: `/Dieta`,
          element: <Dieta />,
          children: [
            { path: `ControlInventarioCascaraPila`, element: <ControlInventarioCascaraPila /> },
            { path: `ControlRendimientoDietaySiembra`, element: <ControlRendimientoDietaySiembra /> },
            { path: `ControlMovimientosCajasProceso`, element: <ControlMovimientosCajasProceso /> },
          ],
        },

        // Gerencia
        {
          path: `/Gerencia`,
          element: <Gerencia />,
          children: [
            { path: `GestionUsuarios`, element: <GestionUsuarios /> },
          ],
        },

        // Visualizar
        {
          path: `/Visualizar`,
          element: <Visualizar />,
          children: [
            { path: `VisualizarKPIs`, element: <VisualizarKPIs /> },
            { path: `VisualizarLotes`, element: <VisualizarLotes /> },
            { path: `VisualizarSKUs`, element: <VisualizarSKUs /> },
            { path: `FlashReport`, element: <FlashReport /> },
          ],
        },

        // Control de Tiempos
        { path: `/ControlTiempos`, element: <ControlTiempos /> },

        // --- Mantenimiento / Alertas ---

        {
          path: `/MantenimientoAlertas`,
          element: <PagesMantenimientoAlertas />,
          children: [
            { index: true, element: <MantenimientoAlertas /> },

            { path: `Alertas`, element: <ContenedorAlertas /> },

            // Infraestructura
            { path: `Infraestructura`, element: <InfraestructuraDePlanta /> },
            { path: `PanelElectrico`, element: <PanelElectrico /> },
            { path: `Iluminacion`, element: <Iluminacion /> },
            { path: `CuartosElectricos`, element: <CuartosElectricos /> },

            // Horno (módulo de Alertas) — usa HornoMA
            { path: `Horno`, element: <HornoMA /> },
            { path: `Horno/SistemaNeumatico`, element: <SistemaNeumatico /> },
            { path: `Horno/MotorReductor`, element: <MotorReductor /> },
            { path: `Horno/Vibrador`, element: <Vibrador /> },
            { path: `Horno/MotorReductorEnfriador`, element: <MotorReductorEnfriador /> },
            { path: `Horno/LubricacionBandasEnfriador`, element: <LubricacionBandasEnfriador /> },
            { path: `Horno/VibradorEnfriador`, element: <VibradorEnfriador /> },
            { path: `Horno/BandaSalidaGeneral`, element: <BandaSalidaGeneral /> },
            { path: `Horno/BandaEntradaGeneral`, element: <BandaEntradaGeneral /> },
            { path: `Horno/VibradorHornoMultilevel`, element: <VibradorHornoMultilevel /> },
            { path: `Horno/LineaGasGLPHornoMultilevel`, element: <LineaGasGLPHornoMultilevel /> },
            { path: `Horno/TransmisionTurbina`, element: <TransmisionTurbinaHornoMultilevel /> },
            { path: `Horno/LubricacionBandasHornoMultilevel`, element: <LubricacionBandasHornoMultilevel /> },
            { path: `Horno/SelladoraBandaContinuaGeneral`, element: <SelladoraBandaContinuaGeneral /> },

          ],
        },


        // Horno
        {
          path: `/Horno`,
          element: <Horno />,
          children: [
            { path: `ControlRendimientoSecadoHornoMultilevel`, element: <ControlRendimientoSecadoHornoMultilevel /> },
            { path: `ControlRendimientoSecadoHornoMicroondas`, element: <ControlRendimientoSecadoHornoMicroondas /> },
            { path: `ControlOperativoHornoMultilevel`, element: <ControlOperativoHornoMultilevel /> },
            { path: `ControlRendimientoProductoTerminado`, element: <ControlRendimientoProductoTerminado /> },
            { path: `ControlReempaque`, element: <ControlReempaque /> },
            { path: `ControlLarvaMolida`, element: <ControlLarvaMolida /> },
          ],
        },

        // Calidad
        {
          path: `/Calidad`,
          element: <Calidad />,
          children: [
            { path: `ControlCalidadCosecha`, element: <ControlCalidadCosecha /> },
            { path: `RecepcionMateriasPrimas`, element: <RecepcionMateriasPrimas /> },
            { path: `ControlNeonatos`, element: <ControlNeonatos /> },
            { path: `ControlCalidadEngordeHatchery`, element: <ControlCalidadEngordeHatchery /> },
            { path: `ControlCalidadHornoMicroondas`, element: <ControlCalidadHornoMicroondas /> },
            { path: `ControlCalidadHornoMultilevel`, element: <ControlCalidadHornoMultilevel /> },
            { path: `ControlCalidadDietaSiembra`, element: <ControlCalidadDietaSiembra /> },
          ],
        },

        // Mantenimiento
        {
          path: `/Mantenimiento`,
          element: <Mantenimiento />,
          children: [
            { path: `LimpiezaDesinfeccionEquiposMaquinariaPesada`, element: <LimpiezaDesinfeccionEquiposMaquinariaPesada /> },
            { path: `ReporteInspeccion`, element: <ReporteInspeccion /> },
            { path: `ReporteInspeccionSemanal`, element: <ReporteInspeccionSemanal /> },
            { path: `PreoperacionalTeletruk`, element: <PreoperacionalTeletruk /> },
          ],
        },

        // Cosecha
        {
          path: `/Cosecha`,
          element: <Cosecha />,
          children: [
            { path: `ControlRendimientoCosechayFrass`, element: <ControlRendimientoCosechayFrass /> },
            { path: `ControlIngresoySalidaRacks`, element: <ControlIngresoySalidaRacks /> },
          ],
        },
      ],
    },
  ],
  { basename: "/ProNuvo" } // base de la app
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <PrimeReactProvider>
    <RouterProvider router={router} />
  </PrimeReactProvider>
);
