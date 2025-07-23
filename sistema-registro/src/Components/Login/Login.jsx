import { useState, useEffect } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/Pronuvo_logos_sin_fondo_6.png green.png';
import logo2 from '../../assets/mosca.png';
import supabase from '../../supabaseClient';
import { Password } from 'primereact/password';

function App() {
  const [usuarios, setUsuarios] = useState([]);

  const getUsuarios = async () => {
    const { data, error } = await supabase
    .from('Usuarios')
    .select()

    setUsuarios(data)

  }
    
  useEffect(() => {
    getUsuarios();
  }, []);

  // Estados para el formulario
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [mensaje, setMensaje] = useState('');

  const navigate = useNavigate();

  // Función de autenticación
  const autenticarUsuario = (e) => {
    e.preventDefault(); // Evitar que la página se recargue
    const usuarioValido = usuarios.find(
      (usuario) => usuario.username === username && usuario.password === password
    );

    if (usuarioValido) {
      setMensaje(`¡Bienvenido, ${username}!`);
      // Obtener el departamento del usuario autenticado
      const departamentoUsuario = usuarioValido.departamento;

      // Redirigir al menú principal y pasar el departamento
      navigate('/MenuPrincipal', { state: { departamento: departamentoUsuario } });

      // Limpiar los campos de usuario y contraseña
      setUsername('');
      setPassword('');

    } else {
      setMensaje('Usuario o contraseña incorrectos.');
      // Limpiar los campos de usuario y contraseña
      setUsername('');
      setPassword('');
    }
  };

  return (
    <div className='Login'>
      <div className="login-container">
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Acceso
        </h1>
        <form onSubmit={autenticarUsuario}>
          <div>
            <label htmlFor="username">Usuario:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su usuario"
              required
            />
          </div>
          <div>
            <label htmlFor="password">Contraseña:</label>
            <Password
              id='password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              feedback={false}
              toggleMask
              className="p-password" // Aplica la clase personalizada
              inputClassName="p-password-input" // Aplica la clase al input
            />
          </div>
          <button type="submit">Iniciar Sesión</button>
        </form>
        {mensaje && <p className="mensaje">{mensaje}</p>}
      </div>

      {/* Logo en la esquina inferior derecha */}
      <img src={logo} alt="Logo de mi aplicación" className="logo" />
    </div>
  );
}

export default App;