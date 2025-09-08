import { useState, useEffect } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/Pronuvo_logos_sin_fondo_6.png green.png";
import logo2 from "../../assets/mosca.png";
import supabase from "../../supabaseClient";
import { Password } from "primereact/password";

// ⬅️ GUARDA el username en storage para que useCanReview lo lea
import { setCurrentUsername } from "../Inocuidad/Registros/session/userSession.js";

function App() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Estados del formulario
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  // Carga usuarios desde Supabase
  const getUsuarios = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase.from("Usuarios").select("id, username, password, departamento");
      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error(err);
      setMensaje("No se pudo cargar usuarios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    getUsuarios();
  }, []);

  // Autenticación local contra la tabla Usuarios
  const autenticarUsuario = (e) => {
    e.preventDefault();

    const usuarioValido = usuarios.find(
      (u) => u?.username === username && u?.password === password
    );

    if (usuarioValido) {
      // ⬇️ Guarda el username para que el hook pueda habilitar el checkbox
      setCurrentUsername(usuarioValido.username);
      // (opcional) refuerzo adicional por si quieres sesión por pestaña:
      sessionStorage.setItem("username", usuarioValido.username);

      const departamentoUsuario = usuarioValido.departamento || ""; // CSV de departamentos

      setMensaje(`¡Bienvenido, ${usuarioValido.username}!`);
      // Redirige al menú principal con el/los departamentos
      navigate("/MenuPrincipal", { state: { departamento: departamentoUsuario } });

      // Limpia campos
      setUsername("");
      setPassword("");
    } else {
      setMensaje("Usuario o contraseña incorrectos.");
      setUsername("");
      setPassword("");
    }
  };

  return (
    <div className="Login">
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
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password">Contraseña:</label>
            <Password
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              feedback={false}
              toggleMask
              className="p-password"
              inputClassName="p-password-input"
              inputProps={{ autoComplete: "current-password" }}
            />
          </div>

          <button type="submit" disabled={cargando}>
            {cargando ? "Cargando..." : "Iniciar Sesión"}
          </button>
        </form>

        {mensaje && <p className="mensaje">{mensaje}</p>}
      </div>

      {/* Logo en la esquina inferior derecha */}
      <img src={logo} alt="Logo de mi aplicación" className="logo" />
    </div>
  );
}

export default App;
