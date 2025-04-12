import supabase from "../../../supabaseClient";
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import logo2 from "../../../assets/mosca.png";
import "./VisualizarKPIs.css";

import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Title,
    TimeScale,
    CategoryScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Title,
    TimeScale,
    CategoryScale,
    ChartDataLabels
);

const VisualizarKPIs = () => {
    const [kpiData, setKpiData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedChart, setSelectedChart] = useState(null);
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [weekRange, setWeekRange] = useState({ start: null, end: null });
    const navigate = useNavigate();
    const chartRef = useRef();

    const formatDate = (dateInput) => {
        try {
            if (typeof dateInput === 'string' && dateInput.includes('/')) {
                const [day, month, year] = dateInput.split('/');
                return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
            }

            const date = new Date(dateInput);
            return date.toLocaleDateString('es-CR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'America/Costa_Rica'
            });
        } catch {
            return 'Fecha inválida';
        }
    };

    useEffect(() => {
        const calculateWeekRange = () => {
            const now = new Date();
            const tzOffset = -6 * 60 * 60 * 1000;

            const baseDate = new Date(now.getTime() + (currentWeekOffset * 7 * 24 * 60 * 60 * 1000));
            const costaRicaDate = new Date(baseDate.getTime() + tzOffset);

            const startOfWeek = new Date(costaRicaDate);
            startOfWeek.setDate(costaRicaDate.getDate() - ((costaRicaDate.getDay() + 7) % 7));
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            return {
                start: new Date(startOfWeek.setDate(costaRicaDate.getDate() - (costaRicaDate.getDay() || 7) + 1)),
                end: new Date(endOfWeek.getTime() - tzOffset)
            };
        };

        setWeekRange(calculateWeekRange());
    }, [currentWeekOffset]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Primero obtenemos solo el último registro para la fecha de actualización
                const { data: lastRecord, error: lastError } = await supabase
                    .from('visualizar_kpis')
                    .select('fecha')
                    .order('fecha', { ascending: false })
                    .limit(1);
    
                if (lastError) throw lastError;
    
                // Luego obtenemos todos los datos para el gráfico
                const { data: allData, error: allError } = await supabase
                    .from('visualizar_kpis')
                    .select('*')
                    .order('fecha', { ascending: true });
    
                if (allError) throw allError;
    
                const parsedData = allData.map(item => {
                    if (typeof item.fecha === 'string' && item.fecha.includes('/')) {
                        const [day, month, year] = item.fecha.split('/');
                        const dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00-06:00`;
                        return {
                            ...item,
                            fecha: new Date(dateString)
                        };
                    }
                    return {
                        ...item,
                        fecha: new Date(item.fecha)
                    };
                });
    
                setKpiData(parsedData);
                // Guardamos la fecha del último registro por separado
                setLastUpdated(lastRecord[0]?.fecha);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
    
        fetchData();
    }, []);

    const [lastUpdated, setLastUpdated] = useState(null);

    const kpiNames = {
        fecha: 'Fecha',
    total_kg_pp_modulo: 'Ingreso PP al módulo (kg)',
    total_cantidad_eggies: 'Cantidad de Eggies Recolectados',
    total_gm_eggies: 'Total de gramos',
    total_gm_colectados: 'Peso en gramos colectados',
    total_cajas_inoculadas_destino: 'Cantidad cajas Inoculadas Destino',
    total_cajas_procesadas_neonatos: 'Cajas Procesadas de Neonatos',
    total_cajas_sembradas_rep: 'Cajas Sembradas Reproducción',
    total_cajas_dieta_no_sembradas_rep: 'Cajas Dieta no Sembradas Reproducción',
    total_g_neonatos_sembrados_caja_rep: 'Gramos Neonatos Sembrados Caja Reproducción',
    total_cajas_sembradas_pro: 'Cajas Sembradas Producción',
    total_cajas_dieta_no_sembradas_pro: 'Cajas Dieta no Sembradas Producción',
    total_g_neonatos_sembrados_caja_pro: 'Gramos Neonatos Sembrados Caja Producción',
    total_kg_larva_fresca: 'Larva Fresca (kg)',
    total_cant_cajas_cosechadas: 'Cajas Cosechadas',
    total_cant_cajas_desechadas: 'Cajas Desechadas',
    total_larva_fresca_kg: 'Larva Fresca Total (kg)',
    total_cajas_totales: 'Total de Cajas',
    total_cant_bolsas: 'Cantidad de Bolsas'
    };

    const calcularVariacion = (current, previous) => {
        if (previous === 0 || !previous) return null;
        return ((current - previous) / previous) * 100;
    };

    const formatValue = (columnName, value) => {
        const floatColumns = [
            'kg_pp_modulo', 'total_gm', 'gm_colectados',
            'g_neonatos_sembrados_caja_rep', 'g_neonatos_sembrados_caja_pro',
            'kg_larva_fresca'
        ];

        const integerColumns = [
            'cantidad_eggies', 'cajas_inoculadas_destino',
            'cajas_procesadas_neonatos', 'cajas_sembradas_rep',
            'cajas_dieta_no_sembradas_rep', 'cajas_sembradas_pro',
            'cajas_dieta_no_sembradas_pro', 'cant_cajas_cosechadas',
            'cant_cajas_desechadas', 'larva_fresca_kg', 'cajas_totales',
            'cant_bolsas'
        ];

        if (floatColumns.includes(columnName)) {
            return parseFloat(value).toFixed(2) + ' kg';
        }
        if (integerColumns.includes(columnName)) {
            return parseInt(value).toLocaleString('es-CR');
        }
        return value;
    };

    const getLatestValues = () => {
        if (kpiData.length < 1) return {};

        const latest = kpiData[kpiData.length - 1];
        const previous = kpiData[kpiData.length - 2] || {};

        return Object.keys(latest).reduce((acc, key) => {
            if (key !== 'fecha') {
                acc[key] = {
                    current: latest[key],
                    previous: previous[key] || 0
                };
            }
            return acc;
        }, {});
    };

    const handleShowChart = (columnName) => {
        setSelectedChart(columnName);
    };

    const handleDownload = () => {
        const canvas = chartRef.current?.canvas;
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `kpi_${selectedChart}_${new Date().toISOString().split('T')[0]}.png`;
            a.click();
        }
    };

    const getChartData = () => {
        if (!selectedChart || !weekRange.start || !weekRange.end) return {};

        const chartData = kpiData
            .filter(entry => {
                const entryDate = entry.fecha.getTime();
                return entryDate >= weekRange.start.getTime() && entryDate <= weekRange.end.getTime();
            })
            .sort((a, b) => a.fecha - b.fecha)
            .map(entry => ({
                x: entry.fecha,
                y: entry[selectedChart]
            }));

        return {
            datasets: [{
                label: kpiNames[selectedChart],
                data: chartData,
                backgroundColor: '#6366f1',
                borderColor: '#4f46e5',
                pointRadius: 5,
                pointHoverRadius: 7,
                borderWidth: 2,
                tension: 0.4,
                fill: false,
            }]
        };
    };

    const formatWeekRange = (start, end) => {
        if (!start || !end) return '';
        return `Del lunes ${formatDate(start)} al domingo ${formatDate(end)}`;
    };

    const KpiCard = ({ columnName, values }) => {
        const variacion = calcularVariacion(values.current, values.previous);
        const formattedValue = formatValue(columnName, values.current);
        const displayName = kpiNames[columnName] || columnName;

        return (
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <h3 style={styles.title}>{displayName}</h3>
                    <button
                        onClick={() => handleShowChart(columnName)}
                        style={styles.chartButton}
                    >
                        Gráfico
                    </button>
                </div>

                <div style={styles.valueContainer}>
                    <span style={styles.value}>{formattedValue}</span>

                    {variacion !== null && (
                        <div style={styles.trendContainer}>
                            <span style={{
                                ...styles.trend,
                                color: variacion >= 0 ? '#10B981' : '#EF4444'
                            }}>
                                {variacion >= 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(1)}%
                            </span>
                            <span style={styles.subtext}>
                                Anterior: {formatValue(columnName, values.previous)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div style={styles.loading}>Cargando datos...</div>;
    if (error) return <div style={styles.error}>Error: {error}</div>;

    const kpiValues = getLatestValues();

    return (
        <div style={styles.container}>
            <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Visualización KPI's
            </h1>

            <div className="welcome-message">
                <p>
                    Bienvenido al panel de visualización de KPIs.
                    Aquí puedes monitorear los indicadores clave de rendimiento en tiempo real y tomar decisiones basadas en datos.
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

         
            <h2 style={styles.header}>
                Indicadores Clave - Actualizado al {lastUpdated ? formatDate(lastUpdated) : 'No hay datos'}
            </h2>
            

            {selectedChart && (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContent}>
                    <div style={styles.modalHeader}>
                        {/* Solo muestra el nombre del KPI y el rango */}
                        <h3>{kpiNames[selectedChart]} - {formatWeekRange(weekRange.start, weekRange.end)}</h3>
                            <div style={styles.modalControls}>
                                <button
                                    onClick={handleDownload}
                                    style={styles.downloadButton}
                                    title="Descargar gráfico como PNG"
                                >
                                    ⬇ Descargar
                                </button>
                                <div>
                                    <button
                                        onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                                        style={styles.navButton}
                                    >
                                        ← Anterior
                                    </button>
                                    <button
                                        onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                                        style={styles.navButton}
                                        disabled={currentWeekOffset >= 0}
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedChart(null);
                                    setCurrentWeekOffset(0);
                                }}
                                style={styles.closeButton}
                            >
                                ×
                            </button>
                        </div>
                        <div style={styles.chartContainer}>
                            <Line
                                ref={chartRef}
                                data={getChartData()}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        x: {
                                            type: 'time',
                                            time: {
                                                unit: 'day',
                                                tooltipFormat: 'dd/MM/yyyy',
                                                displayFormats: {
                                                    day: 'dd/MM'
                                                }
                                            },
                                            adapters: {
                                                date: {
                                                    zone: 'America/Costa_Rica'
                                                }
                                            },
                                            title: {
                                                display: true,
                                                text: 'Fecha'
                                            },
                                            min: weekRange.start,
                                            max: weekRange.end
                                        },
                                        y: {
                                            title: {
                                                display: true,
                                                text: 'Valor'
                                            },
                                            beginAtZero: true
                                        }
                                    },
                                    plugins: {
                                        datalabels: {
                                            anchor: 'end',
                                            align: 'top',
                                            formatter: (value, context) => {
                                                return formatValue(selectedChart, value.y);
                                            },
                                            font: {
                                                size: 10
                                            },
                                            color: '#333',
                                            textStrokeColor: '#fff',
                                            textStrokeWidth: 4,
                                        },
                                        tooltip: {
                                            callbacks: {
                                                title: (context) => formatDate(context[0].parsed.x),
                                                label: (context) =>
                                                `${context.dataset.label}: ${formatValue(selectedChart, context.parsed.y)}`
                                            }
                                        }
                                    }
                                }}
                                plugins={[ChartDataLabels]}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.gridContainer}>
                {Object.entries(kpiValues).map(([columnName, values]) => (
                    columnName !== 'fecha' && (
                        <KpiCard key={columnName} columnName={columnName} values={values} />
                    )
                ))}
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '2rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        maxWidth: '1400px',
        margin: '0 auto',
        backgroundColor: '#f8fafc',
        minHeight: '100vh'
    },
    header: {
        marginBottom: '2.5rem',
        textAlign: 'center',
        fontSize: '1.8rem',
        fontWeight: '600',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        borderRadius: '12px',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '2rem',
        padding: '1rem'
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        ':hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.12)'
        }
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
    },
    title: {
        fontSize: '1.1rem',
        color: '#374151',
        margin: '0 0 1.2rem 0',
        fontWeight: '600',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #e5e7eb'
    },
    valueContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.75rem'
    },
    value: {
        fontSize: '1.8rem',
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: '-0.5px',
        fontFeatureSettings: '"tnum"'
    },
    trendContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.3rem'
    },
    trend: {
        fontSize: '0.95rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem'
    },
    subtext: {
        fontSize: '0.8rem',
        color: '#6b7280',
        fontWeight: '500'
    },
    loading: {
        textAlign: 'center',
        padding: '3rem',
        fontSize: '1.3rem',
        color: '#3b82f6',
        fontWeight: '500'
    },
    error: {
        textAlign: 'center',
        padding: '2rem',
        color: '#dc2626',
        fontWeight: '600',
        backgroundColor: '#fef2f2',
        borderRadius: '10px',
        margin: '2rem',
        border: '1px solid #fecaca'
    },
    chartButton: {
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'background-color 0.3s ease'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: '8px',
        width: '80%',
        maxWidth: '1200px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
    },
    modalHeader: {
        background: '#3498db',
        color: '#fff',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalControls: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
    },
    downloadButton: {
        background: '#2ecc71',
        color: '#fff',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    navButton: {
        background: '#3498db',
        color: '#fff',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: '24px',
        cursor: 'pointer'
    },
    chartContainer: {
        padding: '20px',
        height: '500px',
        position: 'relative'
    }
};

export default VisualizarKPIs;