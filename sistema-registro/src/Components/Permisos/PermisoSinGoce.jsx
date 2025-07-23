import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from "../../../supabaseClient";

const PermisoSinGoce = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subordinados, setSubordinados] = useState([]);
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    fecha_permiso: '',
    departamento: '',
    cargo: '',
    motivo: '',
    tiempo_permiso: '',
    hora_salida: '',
    hora_regreso: '',
    observaciones: '',
    jefe_inmediato: '',
    jefe_superior: '',
    recibido_rrhh: 'pendiente',
    fecha_solicitud: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Obtener información adicional del usuario
        const { data: userData, error } = await supabase
          .from('Usuarios')
          .select('*')
          .eq('email', user.email)
          .single();
          
        if (userData) {
          // Si el usuario es jefe, obtener sus subordinados
          if (userData.rol === 'jefe') {
            const { data: subordinadosData } = await supabase
              .from('Usuarios')
              .select('*')
              .eq('jefe_inmediato', userData.id);
              
            setSubordinados(subordinadosData || []);
            
            // Auto-completar jefe_inmediato
            setFormData(prev => ({
              ...prev,
              jefe_inmediato: `${userData.nombre} ${userData.apellido}`
            }));
          }
        }
      }
      setIsLoading(false);
    };
    
    fetchUser();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('Permiso_sin_goce')
        .insert([formData]);
        
      if (error) {
        throw error;
      }
      
      alert('Solicitud de permiso enviada correctamente');
      navigate('/');
    } catch (error) {
      console.error('Error al enviar la solicitud:', error.message);
      alert('Error al enviar la solicitud');
    }
  };

  const handleAprobar = async (campo) => {
    if (!user) return;
    
    // Verificar permisos según el campo
    const { data: userData } = await supabase
      .from('Usuarios')
      .select('*')
      .eq('email', user.email)
      .single();
      
    if (campo === 'jefe_superior' && !['Hugo Leiva', 'Evelyn'].includes(userData.nombre)) {
      alert('No tienes permisos para aprobar como jefe superior');
      return;
    }
    
    if (campo === 'recibido_rrhh' && userData.departamento !== 'Recursos Humanos') {
      alert('Solo personal de RRHH puede marcar como recibido');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [campo]: 'aprobado'
    }));
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Solicitud de Permiso Sin Goce Salarial</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo para seleccionar subordinado (solo para jefes) */}
        {user && subordinados.length > 0 && (
          <div className="form-group">
            <label className="block mb-2">Nombre del empleado:</label>
            <select
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Seleccione un empleado</option>
              {subordinados.map(sub => (
                <option key={sub.id} value={`${sub.nombre} ${sub.apellido}`}>
                  {sub.nombre} {sub.apellido}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Campo para nombre (si no es jefe) */}
        {user && subordinados.length === 0 && (
          <div className="form-group">
            <label className="block mb-2">Nombre completo:</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}
        
        <div className="form-group">
          <label className="block mb-2">Fecha del permiso:</label>
          <input
            type="date"
            name="fecha_permiso"
            value={formData.fecha_permiso}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block mb-2">Departamento:</label>
          <input
            type="text"
            name="departamento"
            value={formData.departamento}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block mb-2">Cargo:</label>
          <input
            type="text"
            name="cargo"
            value={formData.cargo}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block mb-2">Motivo del permiso:</label>
          <textarea
            name="motivo"
            value={formData.motivo}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows="3"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block mb-2">Tiempo de permiso (horas):</label>
          <input
            type="text"
            name="tiempo_permiso"
            value={formData.tiempo_permiso}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block mb-2">Hora de salida:</label>
          <input
            type="time"
            name="hora_salida"
            value={formData.hora_salida}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block mb-2">Hora de regreso:</label>
          <input
            type="time"
            name="hora_regreso"
            value={formData.hora_regreso}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block mb-2">Observaciones:</label>
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label className="block mb-2">Jefe inmediato:</label>
          <input
            type="text"
            name="jefe_inmediato"
            value={formData.jefe_inmediato}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            readOnly
          />
        </div>
        
        {/* Sección de aprobaciones */}
        <div className="border-t pt-4 mt-4">
          <h2 className="text-xl font-semibold mb-4">Aprobaciones</h2>
          
          <div className="form-group">
            <label className="block mb-2">Jefe superior:</label>
            <div className="flex items-center">
              <input
                type="text"
                value={formData.jefe_superior || 'pendiente'}
                readOnly
                className="w-full p-2 border rounded mr-2"
              />
              <button
                type="button"
                onClick={() => handleAprobar('jefe_superior')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Aprobar
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label className="block mb-2">Recibido RRHH:</label>
            <div className="flex items-center">
              <input
                type="text"
                value={formData.recibido_rrhh}
                readOnly
                className="w-full p-2 border rounded mr-2"
              />
              <button
                type="button"
                onClick={() => handleAprobar('recibido_rrhh')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Recibido
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Enviar Solicitud
          </button>
        </div>
      </form>
    </div>
  );
};

export default PermisoSinGoce;