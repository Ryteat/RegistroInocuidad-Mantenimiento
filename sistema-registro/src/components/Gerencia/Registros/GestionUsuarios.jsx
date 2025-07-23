import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./GestionUsuarios.css";
import supabase from "../../../supabaseClient";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Toolbar } from "primereact/toolbar";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { MultiSelect } from "primereact/multiselect";
import logo2 from "../../../assets/mosca.png";

function GestionUsuarios() {
  const emptyUser = {
    username: "",
    password: "",
    departamento: [],
  };

  const [usuarios, setUsuarios] = useState([]);
  const [usuario, setUsuario] = useState(emptyUser);
  const toast = useRef(null);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [globalFilter, setGlobalFilter] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [usuarioDialog, setUsuarioDialog] = useState(false);
  const [deleteUsuarioDialog, setDeleteUsuarioDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const departamentos = [
    "Dieta",
    "Hatchery",
    "Horno",
    "Cosecha",
    "Mantenimiento",
    "Calidad",
    "Visualizar",
    "Gerencia"
  ];

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase.from("Usuarios").select();
      if (error) throw error;

      const formattedData = data.map(user => ({
        ...user,
        departamento: user.departamento ? user.departamento.split(',') : []
      }));
      
      setUsuarios(formattedData);
    } catch (error) {
      console.error("Error al obtener usuarios:", error.message);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los usuarios",
        life: 3000,
      });
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const saveUsuario = async () => {
    setSubmitted(true);
    
    if (!usuario.username || !usuario.password || usuario.departamento.length === 0) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Todos los campos son obligatorios",
        life: 3000,
      });
      return;
    }

    try {
      const departamentoString = usuario.departamento.join(',');
      const userData = {
        username: usuario.username,
        password: usuario.password,
        departamento: departamentoString
      };

      if (usuario.id) {
        const { error } = await supabase
          .from("Usuarios")
          .update(userData)
          .eq("id", usuario.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("Usuarios")
          .insert([userData]);
        if (error) throw error;
      }

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: `Usuario ${usuario.id ? "actualizado" : "creado"} correctamente`,
        life: 3000,
      });

      setUsuarioDialog(false);
      setUsuario(emptyUser);
      fetchUsuarios();
    } catch (error) {
      console.error("Error al guardar usuario:", error.message);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Ocurrió un error al guardar el usuario",
        life: 3000,
      });
    }
  };

  const deleteUsuario = async () => {
    try {
      const { error } = await supabase
        .from("Usuarios")
        .delete()
        .eq("id", usuario.id);
      if (error) throw error;

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Usuario eliminado correctamente",
        life: 3000,
      });
      setDeleteUsuarioDialog(false);
      fetchUsuarios();
    } catch (error) {
      console.error("Error al eliminar usuario:", error.message);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Ocurrió un error al eliminar el usuario",
        life: 3000,
      });
    }
  };

  const confirmDeleteUsuario = (usuario) => {
    setUsuario(usuario);
    setDeleteUsuarioDialog(true);
  };

  const leftToolbarTemplate = () => {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          label="Nuevo"
          icon="pi pi-plus"
          severity="success"
          onClick={() => {
            setUsuario(emptyUser);
            setUsuarioDialog(true);
          }}
        />
        <Button
          label="Eliminar"
          icon="pi pi-trash"
          severity="danger"
          onClick={() => confirmDeleteUsuario(selectedUsuario)}
          disabled={!selectedUsuario}
        />
      </div>
    );
  };

  const usuarioDialogFooter = (
    <React.Fragment>
      <Button
        label="Cancelar"
        icon="pi pi-times"
        outlined
        onClick={() => setUsuarioDialog(false)}
      />
      <Button label="Guardar" icon="pi pi-check" onClick={saveUsuario} />
    </React.Fragment>
  );

  const deleteUsuarioDialogFooter = (
    <React.Fragment>
      <Button
        label="No"
        icon="pi pi-times"
        outlined
        onClick={() => setDeleteUsuarioDialog(false)}
      />
      <Button
        label="Sí"
        icon="pi pi-check"
        severity="danger"
        onClick={deleteUsuario}
      />
    </React.Fragment>
  );

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="gestion-usuarios-container">
      <Toast ref={toast} />
      <h1>
        <img src={logo2} alt="mosca" className="logo2" />
        Gestión de Usuarios
      </h1>
      <div className="welcome-message">
        <p>
          Bienvenido al sistema de Gestión de Usuarios el cual permite administrar 
          de manera eficiente los usuarios registrados en el sistema. Desde esta interfaz,
          puedes agregar nuevos usuarios, editar la información de usuarios existentes y 
          eliminar usuarios que ya no requieran acceso.
        </p>
      </div>
      <div className="buttons-container">
        <button onClick={() => navigate(-1)} className="return-button">
          Volver
        </button>
        <br />
        <br />
        <button onClick={() => navigate(-2)} className="menu-button">
          Menú principal
        </button>
      </div>
      <Toolbar className="mb-4" left={leftToolbarTemplate} />
      <DataTable
        value={usuarios}
        selection={selectedUsuario}
        onSelectionChange={(e) => setSelectedUsuario(e.value)}
        dataKey="id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} usuarios"
        globalFilter={globalFilter}
        header={
          <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                type="search"
                onInput={(e) => setGlobalFilter(e.target.value)}
                placeholder="Buscador Global..."
              />
            </span>
          </div>
        }
      >
        <Column selectionMode="single" exportable={false} />
        <Column field="username" header="Nombre de Usuario" sortable />
        <Column 
          field="departamento" 
          header="Departamentos" 
          body={(rowData) => rowData.departamento.join(', ')}
          sortable 
        />
        <Column
          body={(rowData) => (
            <div className="actions">
              <Button
                icon="pi pi-pencil"
                className="p-button-rounded p-button-success mr-2"
                onClick={() => {
                  setUsuario({ ...rowData });
                  setUsuarioDialog(true);
                }}
              />
            </div>
          )}
          header="Acciones"
          style={{ minWidth: "8rem" }}
        />
      </DataTable>

      <Dialog
        visible={usuarioDialog}
        style={{ width: "450px" }}
        header="Detalles del Usuario"
        modal
        className="p-fluid"
        footer={usuarioDialogFooter}
        onHide={() => {
          setUsuarioDialog(false);
          setShowPassword(false);
        }}
      >
        <div className="field">
          <label htmlFor="username">Nombre de Usuario</label>
          <InputText
            id="username"
            value={usuario.username}
            onChange={(e) => setUsuario({ ...usuario, username: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <div className="p-inputgroup">
            <InputText
              id="password"
              type={showPassword ? "text" : "password"}
              value={usuario.password}
              onChange={(e) => setUsuario({ ...usuario, password: e.target.value })}
              required
            />
            <Button
              icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"}
              className="p-button-text"
              onClick={togglePasswordVisibility}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="departamento">Departamentos</label>
          <MultiSelect
            value={usuario.departamento}
            options={departamentos}
            onChange={(e) => setUsuario({ ...usuario, departamento: e.value })}
            placeholder="Seleccione departamentos"
            display="chip"
          />
        </div>
      </Dialog>

      <Dialog
        visible={deleteUsuarioDialog}
        style={{ width: "450px" }}
        header="Confirmar"
        modal
        footer={deleteUsuarioDialogFooter}
        onHide={() => setDeleteUsuarioDialog(false)}
      >
        <div className="confirmation-content">
          <i className="pi pi-exclamation-triangle mr-3" style={{ fontSize: "2rem" }} />
          {usuario && (
            <span>
              ¿Estás seguro de que deseas eliminar al usuario{" "}
              <b>{usuario.username}</b>?
            </span>
          )}
        </div>
      </Dialog>
    </div>
  );
}

export default GestionUsuarios;