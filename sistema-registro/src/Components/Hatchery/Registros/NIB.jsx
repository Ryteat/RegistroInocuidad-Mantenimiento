import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";

//Imports de estilos
import logo2 from "../../../assets/mosca.png";
import "./NIB.css";

//Imports de Supabase
import supabase from "../../../supabaseClient"; //Importa la variable supabase del archivo supabaseClient.js que sirve para conectarse con la base de datos y que funcione como API

//PRIME REACT
import "primereact/resources/themes/bootstrap4-light-blue/theme.css"; //theme
import "primeicons/primeicons.css"; //icons

//PRIME REACT COMPONENTS
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { Toolbar } from "primereact/toolbar";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

//Imports de exportar
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";

function NIB() {
  //Variable de registro vacio
  let emptyRegister = {
    base_numero_lote: "",
    numero_lote: "",
    embudo: "",
    gm_colectados: "",
    cajas_inoculadas_destino: "",
    gm_neonato_caja: "",
    cantidad_dieta_caja: "",
    temp_ambiental: "",
    hum_ambiental: "",
    operario: "",
    fec_colecta: "",
    hor_colecta: "",
    observaciones: "",
    fec_registro: "",
    hor_registro: "",
  };

  //Variables de los embudos actuales del 1 al 10
  const embudos = Array.from({ length: 10 }, (_, i) => ({
    name: `${i + 1}`,
    value: `${i + 1}`,
  }));

  //Columnas que va a tener la tabla y se utilza para imprimir el PDF y el Excel
  const cols = [
    { header: "Número Lote", field: "numero_lote" },
    { header: "Fecha y Hora Colecta", field: "registrado" },
    { header: "# Embudo", field: "embudo" },
    { header: "g Colectados", field: "gm_colectados" },
    { header: "Cajas Inoculadas / Destino", field: "cajas_inoculadas_destino" },
    { header: "g Neonato x Caja", field: "gm_neonato_caja" },
    { header: "Cantidad dieta x caja", field: "cantidad_dieta_caja" },
    { header: "Temperatura ambiental (°C)", field: "temp_ambiental" },
    { header: "Humedad ambiental (%)", field: "hum_ambiental" },
    { header: "Operario", field: "operario" },
    { header: "Observaciones", field: "observaciones" },
    { header: "Fecha Registro", field: "fec_registro" },
    { header: "Hora Registro", field: "hor_registro" },
  ];

  const toast = useRef(null);
  const dt = useRef(null);
  const navigate = useNavigate();

  const [registros, setRegistros] = useState([]);
  const [registro, setRegistro] = useState(emptyRegister);
  const [selectedRegistros, setSelectedRegistros] = useState([]);
  const [lotes, setLotes] = useState([]);

  const [globalFilter, setGlobalFilter] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [registroDialog, setRegistroDialog] = useState(false);

  const [observacionesObligatorio, setObservacionesObligatorio] =
    useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({
    embudo: false,
    gm_colectados: false,
    cajas_inoculadas_destino: false,
  });

  // Nuevos estados para lazy loading
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    page: 1,
    sortField: null,
    sortOrder: null,
    filters: {},
    globalFilter: null,
  });

  //Inicio de IMPRIMIR TICKET
  // Dentro de tu componente NIB
  const [impresionDialog, setImpresionDialog] = useState(false);
  const [selectedLote, setSelectedLote] = useState(""); // Nuevo estado solo para UI
  const [selectedDestino, setSelectedDestino] = useState(""); // Nuevo estado solo para UI
  const datosImpresionRef = useRef({
    fecha_colecta: "",
    lote: "",
    fecha_siembra: "",
    cajas: "",
    destino: "",
  });

  // Memoizar lotes
  const opcionesLotes = useMemo(
    () =>
      lotes.map((lote) => ({
        label: lote.base_numero_lote,
        value: lote.base_numero_lote,
      })),
    [lotes]
  );

  // Handler de cambios optimizado
  const handleChange = useCallback((field, value) => {
    datosImpresionRef.current[field] = value;
    if (field === "lote") {
      setSelectedLote(value); // Actualiza el estado UI cuando cambia el lote
    }else if (field === "destino") {
      setSelectedDestino(value); // Actualiza el estado UI cuando cambia el destino
    }
  }, []);

  // Resetear al cerrar
  const handleCloseDialog = useCallback(() => {
    setImpresionDialog(false);
    setSelectedLote(""); // Limpiar selección
    setSelectedDestino(""); // Limpiar selección
    // Opcional: Resetear otros campos
    datosImpresionRef.current = {
      fecha_colecta: "",
      lote: "",
      fecha_siembra: "",
      cajas: "",
      destino: "",
    };
  }, []);

  // Generar PDF
  const generarWord = useCallback(async () => {
    const datos = datosImpresionRef.current;

    if (
      !datos.lote ||
      !datos.fecha_colecta ||
      !datos.fecha_siembra ||
      !datos.cajas ||
      !datos.destino
    ) {
      toast.current.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "Debes de completar los campos para imprimir.",
        life: 3000,
      });
      return;
    }

    // Crear el documento Word
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "N.I.B",
                  bold: true,
                  size: 36, // Tamaño 24 para el título
                }),
              ],
              alignment: "center",
              spacing: { after: 200 }, // Mayor espacio después del título
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Fecha Colecta: ${
                    convertirFecha(datos.fecha_colecta) || "N/A"
                  }`,
                  size: 24, // Tamaño 12 para el contenido
                }),
              ],
              alignment: "center",
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Lote: ${datos.lote || "N/A"}`,
                  size: 24,
                }),
              ],
              alignment: "center",
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Fecha Siembra: ${
                    convertirFecha(datos.fecha_siembra) || "N/A"
                  }`,
                  size: 24,
                }),
              ],
              alignment: "center",
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Cajas: ${datos.cajas || "N/A"}`,
                  size: 24,
                }),
              ],
              alignment: "center",
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Destino: ${datos.destino || "N/A"}`,
                  size: 24,
                }),
              ],
              alignment: "center",
              spacing: { after: 100 },
            }),
          ],
        },
      ],
    });

    try {
      // Generar el blob y descargar
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `NIB_${datos.lote}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setImpresionDialog(false);
      handleCloseDialog(); // Limpiar selección
    } catch (error) {
      console.error("Error al generar Word:", error);
      alert("Ocurrió un error al generar el documento");
    }
  }, []);

  const DialogoImpresion = useMemo(
    () => (
      <Dialog
        visible={impresionDialog}
        style={{ width: "450px" }}
        header="Generar Reporte NIB"
        modal
        onHide={() => setImpresionDialog(false)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              outlined
              onClick={() => setImpresionDialog(false)}
            />
            <Button
              label="Imprimir"
              icon="pi pi-print"
              onClick={generarWord}
              severity="info"
            />
          </div>
        }
      >
        <div className="grid p-fluid">
          <div className="col-12 md:col-6">
            <div className="field">
              <label>Fecha Colecta</label>
              <InputText
                type="date"
                onChange={(e) => handleChange("fecha_colecta", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="col-12 md:col-6">
            <div className="field">
              <label>Lote</label>
              <Dropdown
                value={selectedLote}
                options={opcionesLotes}
                onChange={(e) => {
                  handleChange("lote", e.value);
                  setSelectedLote(e.value);
                }}
                filter
                virtualScrollerOptions={{ itemSize: 38 }}
                placeholder="Seleccione un lote"
                required
              />
            </div>
          </div>

          <div className="col-12 md:col-6">
            <div className="field">
              <label>Fecha Siembra</label>
              <InputText
                type="date"
                onChange={(e) => handleChange("fecha_siembra", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="col-12 md:col-6">
            <div className="field">
              <label>Cajas</label>
              <InputText
                type="number"
                onChange={(e) => handleChange("cajas", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="col-12 md:col-6">
            <div className="field">
              <label>Destino</label>
              <Dropdown
                value={selectedDestino}
                options={["Producción","Hatchery"]}
                onChange={(e) => {
                  handleChange("destino", e.value);
                  setSelectedDestino(e.value);
                }}
                placeholder="Seleccione un Destino"
                required
              />
            </div>
          </div>
        </div>
      </Dialog>
    ),
    [
      impresionDialog,
      opcionesLotes,
      generarWord,
      selectedLote,
      selectedDestino,
      handleCloseDialog,
    ]
  );
  //FIN de IMPRIMIR TICKET

  //Inicio de Sorting y Filtro global por lazy load
  // Manejar sorting
  const onSort = useCallback((event) => {
    setLazyParams((prev) => ({
      ...prev,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
    }));
  }, []);

  // Manejar filtro global
  const onFilter = useCallback((e) => {
    const value = e.target.value;
    setGlobalFilter(value);
    setLazyParams((prev) => ({
      ...prev,
      globalFilter: value,
      first: 0,
    }));
  }, []);
  //FIN de Sorting y Filtro global por lazy load

  //Inicio de FETCHs REGISTROS
  // Memoizar funciones de fetching
  const fetchNeonatos = useCallback(
    async (start = 0, limit = 10) => {
      setLoading(true);
      try {
        let query = supabase
          .from("Neonatos_Inoculados")
          .select("*", { count: "exact" })
          .range(start, start + limit - 1)
          // Ordenar por defecto por fecha descendente (más nuevos primero)
          // .order("fec_registro", { ascending: false });

        // Aplicar sorting
        if (lazyParams.sortField) {
          query = query.order(lazyParams.sortField, {
            ascending: lazyParams.sortOrder === 1,
          });
        }

        // Aplicar filtro global
        if (lazyParams.globalFilter) {
          query = query.or(
            `numero_lote.ilike.%${lazyParams.globalFilter}%,operario.ilike.%${lazyParams.globalFilter}%,fec_registro.ilike.%${lazyParams.globalFilter}%`
          );
        }

        const { data, error, count } = await query;

        if (error) throw error;
        setRegistros(data || []);
        setTotalRecords(count || 0);
      } catch (err) {
        console.error("Error en la conexión a la base de datos NIB", err);
      } finally {
        setLoading(false);
      }
    },
    [lazyParams.sortField, lazyParams.sortOrder, lazyParams.globalFilter]
  );

  const fetchLotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("Lotes")
        .select()
        .in("etapa_actual", ["Hatchery"])
        .order("fecha_registro", { ascending: false });
      if (error) throw error;
      setLotes(data || []);
    } catch (err) {
      console.error("Error en la conexión a la base de datos Lotes", err);
    }
  }, []);

  useEffect(() => {
    fetchNeonatos(lazyParams.first, lazyParams.rows);
    fetchLotes();
  }, [
    // fetchNeonatos,
    lazyParams.first,
    lazyParams.rows,
    lazyParams.sortField,
    lazyParams.sortOrder,
    lazyParams.globalFilter,
  ]);

  // Manejar cambio de página y lazy loading
  const onPage = useCallback(
    (event) => {
      setLazyParams({
        ...lazyParams,
        first: event.first,
        rows: event.rows,
        page: event.page + 1,
      });
    },
    [lazyParams]
  );
  //Fin de FETCH REGISTROS

  //Inicio de Formatear la FECHA DE REGISTRO de formato YYYY-MM-DD a DD/MM/YYYY
  const convertirFecha = (fecha) =>
    fecha ? fecha.split("-").reverse().join("/") : "";

  // Formatear la fecha y hora para obtener actual
  const formatDateTime = (date, format = "DD-MM-YYYY hh:mm A") => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .formatToParts(date)
      .reduce((acc, { type, value }) => ({ ...acc, [type]: value }), {});

    return format
      .replace("DD", fmt.day)
      .replace("MM", fmt.month)
      .replace("YYYY", fmt.year)
      .replace("hh", fmt.hour.padStart(2, "0"))
      .replace("mm", fmt.minute)
      .replace("A", fmt.dayPeriod || "AM");
  };
  //Fin de Formatear la FECHA DE REGISTRO de formato YYYY-MM-DD a DD/MM/YYYY

  //Inicio de Guardar el registro de Neonatos Inoculados
  const saveNeonatoInoculado = useCallback(async () => {
    setSubmitted(true);

    // Validar los campos
    const isEmbudoInvalido = registro.embudo < 1 || registro.embudo > 10;
    // const isGmColectadosInvalido = neonato.gm_colectados < 1 || neonato.gm_colectados > 100;
    const isCajasInoculadasDestinoInvalido =
      registro.cajas_inoculadas_destino < 100 ||
      registro.cajas_inoculadas_destino > 500;
    // POR SI LO PIDEN MAS ADELANTE const isGmNeonatoCajaInvalido = neonato.gm_neonato_caja < 1 || neonato.gm_neonato_caja > 100;

    // Actualizar el estado de errores
    setErroresValidacion({
      embudo: isEmbudoInvalido,
      // gm_colectados: false,
      cajas_inoculadas_destino: isCajasInoculadasDestinoInvalido,
    });
    const valoresFueraDeRango =
      isEmbudoInvalido ||
      // isGmColectadosInvalido ||
      isCajasInoculadasDestinoInvalido;

    // Validaciones previas...
    if (
      !registro.embudo ||
      !registro.gm_colectados ||
      !registro.cajas_inoculadas_destino ||
      !registro.gm_neonato_caja ||
      !registro.cantidad_dieta_caja ||
      !registro.temp_ambiental ||
      !registro.hum_ambiental ||
      !registro.operario
    ) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Llena todos los campos",
        life: 3000,
      });
      return;
    }

    // Validación principal
    if (valoresFueraDeRango && !registro.observaciones) {
      setObservacionesObligatorio(true);
      const currentErrores = {
        "Número de Embudo": isEmbudoInvalido,
        // gm_colectados: false,
        "Cajas Inoculadas": isCajasInoculadasDestinoInvalido,
      };

      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: `Debe agregar observaciones. Campos inválidos: ${Object.keys(
          currentErrores
        )
          .filter((k) => currentErrores[k])
          .join(", ")}`,
        life: 3000,
      });
      return;
    }

    setObservacionesObligatorio(false);
    setErroresValidacion({
      embudo: false,
      // gm_colectados: false,
      cajas_inoculadas_destino: false,
    });

    try {
      const currentDate = formatDateTime(new Date(), "DD/MM/YYYY");
      const posibleLote = formatDateTime(new Date(), "DDMMYYYY");
      const currentTime = formatDateTime(new Date(), "hh:mm A");
      let baseNumeroLoteToInsert = registro.base_numero_lote;
      console.log("Valor seleccionado en dropdown:", registro.base_numero_lote);
      console.log(
        "Valor a insertar en Neonatos_Inoculados:",
        baseNumeroLoteToInsert
      );
      // Si el valor es "nuevo", crear un lote
      if (registro.base_numero_lote === "Nuevo Lote") {
        // Verificar si el lote ya existe
        if (lotes.some((lote) => lote.base_numero_lote === posibleLote)) {
          toast.current.show({
            severity: "warn",
            detail: `El lote ${posibleLote} ya existe. Selecciónalo.`,
          });
          return;
        }

        // Crear nuevo lote
        const { data, error } = await supabase.rpc("crear_nuevo_lote", {
          p_fecha_registro: currentDate,
          p_hora_registro: currentTime,
          p_destino: "PR",
        });

        if (error) {
          toast.current.show({
            severity: "error",
            detail: "Error al crear lote.",
          });
          return;
        }

        // Actualizar el valor local y el estado
        baseNumeroLoteToInsert = data;
        setRegistro({ ...registro, base_numero_lote: data });
      } else {
        // Verificar si el lote existe
        const { data: loteExistente, error: loteError } = await supabase
          .from("Lotes")
          .select("base_numero_lote")
          .eq("base_numero_lote", registro.base_numero_lote)
          .single();

        if (loteError || !loteExistente) {
          toast.current.show({
            severity: "error",
            detail: `El lote ${registro.base_numero_lote} no existe.`,
          });
          return;
        }
      }

      // Insertar en Neonatos_Inoculados
      const { data: insertData, error: insertError } = await supabase
        .from("Neonatos_Inoculados")
        .insert([
          {
            base_numero_lote: baseNumeroLoteToInsert,
            numero_lote: registro.numero_lote,
            embudo: registro.embudo,
            gm_colectados: registro.gm_colectados,
            cajas_inoculadas_destino: registro.cajas_inoculadas_destino,
            gm_neonato_caja: registro.gm_neonato_caja,
            cantidad_dieta_caja: registro.cantidad_dieta_caja,
            temp_ambiental: registro.temp_ambiental,
            hum_ambiental: registro.hum_ambiental,
            operario: registro.operario,
            fec_colecta: convertirFecha(registro.fec_colecta),
            hor_colecta: registro.hor_colecta,
            fec_registro: currentDate,
            hor_registro: currentTime,
            observaciones: registro.observaciones,
          },
        ]);

      if (insertError) {
        console.error("Error al insertar en Neonatos_Inoculados:", insertError);
        throw new Error(
          insertError.message || "Error desconocido al guardar en Supabase"
        );
      }
      const { error: updateError } = await supabase
        .from("Lotes")
        .update({
          fecha_inoculacion: currentDate,
        })
        .eq("base_numero_lote", registro.base_numero_lote);

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Registro guardado exitosamente",
        life: 3000,
      });

      // Limpia el estado
      setRegistro(emptyRegister);
      setRegistroDialog(false);
      setSubmitted(false);
      fetchNeonatos();
      fetchLotes();
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.message || "Ocurrió un error al crear el usuario",
        life: 3000,
      });
    }
  }, [registro, lotes, convertirFecha]);
  //FIN de Guardar el registro de Neonatos Inoculados

  //Inicio de EDITAR TABLA
  const dateEditor = (options) => {
    const convertToInputFormat = (date) => {
      if (!date) return "";
      const [day, month, year] = date.split("/");
      return `${year}-${month}-${day}`;
    };
    const convertToDatabaseFormat = (date) => {
      if (!date) return "";
      const [year, month, day] = date.split("-");
      return `${day}/${month}/${year}`;
    };

    return (
      <InputText
        type="date"
        value={convertToInputFormat(options.value)}
        onChange={(e) => {
          const selectedDate = e.target.value;
          options.editorCallback(convertToDatabaseFormat(selectedDate));
        }}
      />
    );
  };

  const timeEditor = (options) => {
    return (
      <InputText
        type="time"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      />
    );
  };

  const textEditor = (options) => {
    return (
      <InputText
        type="text"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      />
    );
  };

  const numberEditor = (options) => {
    return (
      <InputText
        type="number"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      />
    );
  };

  const floatEditor = (options) => {
    return (
      <InputText
        type="float"
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      />
    );
  };

  const checkboxEditor = (options) => {
    return (
      <input
        type="checkbox"
        checked={options.value}
        onChange={(e) => options.editorCallback(e.target.checked)}
      />
    );
  };

  const dropdownEditor = (options) => {
    return (
      <select
        value={options.value}
        onChange={(e) => options.editorCallback(e.target.value)}
      >
        {options.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  };

  const allowEdit = (rowData) => {
    return rowData.name !== "Blue Band";
  };

  const onRowEditComplete = async ({ newData }) => {
    const { id, base_numero_lote, ...updatedData } = newData;
    
    try {
      // Verificar la etapa del lote
      const { data: lote, error: loteError } = await supabase
        .from('Lotes')
        .select('etapa_actual')
        .eq('base_numero_lote', base_numero_lote)
        .single();
  
      if (loteError || !lote) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se encontró el lote asociado',
          life: 3000
        });
        return;
      }
  
      if (lote.etapa_actual !== 'Hatchery') {
        toast.current.show({
          severity: 'error',
          summary: 'Edición bloqueada',
          detail: 'Solo se pueden editar registros de lotes en etapa Hatchery',
          life: 3000
        });
        return;
      }
  
      // Si pasa la validación, realizar la actualización
      const { error } = await supabase
        .from("Neonatos_Inoculados")
        .update(updatedData)
        .eq("id", id);
  
      if (error) {
        console.error("Error al actualizar:", error.message);
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Falló la actualización del registro',
          life: 3000
        });
        return;
      }
  
      setRegistros((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...newData } : n))
      );
  
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Registro actualizado correctamente',
        life: 3000
      });
  
    } catch (err) {
      console.error("Error inesperado:", err);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error inesperado',
        life: 3000
      });
    }
  };
  //FIN de EDITAR TABLA

  //Inicio de Validaciones de los campos
  const onInputChange = useCallback((e, name) => {
    setRegistro((prev) => ({ ...prev, [name]: e.target.value }));
  }, []);
  // const onInputChange = (e, name) => {
  //   let val = e.target.value;
  //   let _registro = { ...registro };
  //   _registro[name] = val;
  //   setRegistro(_registro);
  // };
  //FIN de Validaciones de los campos


  //Inicio de EXPORTAR TABLA
  const exportPdf = useCallback(() => {
    if (selectedRegistros.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay filas seleccionadas para exportar.",
        life: 3000,
      });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Registros de Neonatos Inoculados", 14, 22);

    const exportData = selectedRegistros.map(
      ({ fec_registro, hor_registro, ...row }) => ({
        ...row,
        registrado: `${fec_registro || ""} ${hor_registro || ""}`,
      })
    );

    const columnsPerPage = 5;
    const maxHeightPerColumn = 10;
    const rowHeight = exportColumns.length * maxHeightPerColumn + 10;
    let currentY = 30;

    const headerColor = [41, 128, 185];
    const textColor = [0, 0, 0];

    for (let i = 0; i < exportData.length; i++) {
      if (currentY + rowHeight > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 30;
      }

      const row = exportData[i];
      const startX = 14;

      exportColumns.forEach(({ title, dataKey }, index) => {
        const value = row[dataKey];
        doc.setFillColor(...headerColor);
        doc.rect(
          startX,
          currentY + index * maxHeightPerColumn,
          180,
          maxHeightPerColumn,
          "F"
        );
        doc.setTextColor(255);
        doc.text(title, startX + 2, currentY + index * maxHeightPerColumn + 7);
        doc.setTextColor(...textColor);
        doc.text(
          `${value}`,
          startX + 90,
          currentY + index * maxHeightPerColumn + 7
        );
      });

      currentY += rowHeight;
    }

    doc.save("Neonatos Inoculados.pdf");
  }, [selectedRegistros]); // Añadir selectedRegistros como dependencia

  const exportXlsx = useCallback(() => {
    if (selectedRegistros.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Advertencia",
        detail: "No hay filas seleccionadas para exportar.",
        life: 3000,
      });
      return;
    }

    const headers = cols.map((col) => col.header);
    const exportData = selectedRegistros.map(
      ({ fec_registro, hor_registro, ...registro }) => ({
        ...registro,
        registrado: `${fec_registro || ""} ${hor_registro || ""}`,
      })
    );

    const rows = exportData.map((registro) =>
      cols.map((col) => registro[col.field])
    );

    const dataToExport = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);

    ws["!cols"] = cols.map((col) => ({
      width: Math.max(col.header.length, 10),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, "Neonatos Inoculados.xlsx");
  }, [selectedRegistros]); // Añadir selectedRegistros como dependencia

  // Mapeo de columnas para jsPDF-Autotable
  const exportColumns = cols.map((col) => ({
    title: col.header, // Título del encabezado
    dataKey: col.field, // Llave de datos
  }));

  // Fin de EXPORTAR TABLA

  //Inicio de Botones de la tabla
  // Memoizar plantillas de toolbar
  const leftToolbarTemplate = useMemo(
    () => () =>
      (
        <div className="flex flex-wrap gap-2">
          <Button
            label="Nuevo"
            icon="pi pi-plus"
            severity="success"
            onClick={openNew}
          />
          <Button
            label="Imprimir NIB"
            icon="pi pi-print"
            severity="secondary"
            onClick={() => setImpresionDialog(true)}
          />
        </div>
      ),
    []
  );

  const rightToolbarTemplate = useMemo(
    () => () =>
      (
        <div className="exportar-container flex flex-wrap gap-2">
          <Button
            label="Exportar a Excel"
            icon="pi pi-upload"
            className="p-button-help"
            onClick={exportXlsx}
          />
          <Button
            label="Exportar a PDF"
            icon="pi pi-file-pdf"
            className="p-button-danger"
            onClick={exportPdf}
          />
        </div>
      ),
    [exportPdf, exportXlsx] // Añadir las funciones como dependencias
  );

  const header = (
    <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
      <InputText
        type="search"
        value={globalFilter}
        onInput={onFilter}
        placeholder="Buscar por Lote, Operario u Fecha de Registro"
      />
    </div>
  );

  const openNew = () => {
    setRegistro(emptyRegister);
    setSubmitted(false);
    setRegistroDialog(true);
  };

  const hideDialog = () => {
    setSubmitted(false);
    setRegistroDialog(false);
  };

  const registroDialogFooter = (
    <React.Fragment>
      <Button
        label="Cancelar"
        icon="pi pi-times"
        outlined
        onClick={hideDialog}
      />
      <Button
        label="Guardar"
        icon="pi pi-check"
        onClick={saveNeonatoInoculado}
      />
    </React.Fragment>
  );
  //FIN de Botones de la tabla

  // Memoizar columnas de la tabla
  const columns = useMemo(
    () => [
      <Column key="selection" selectionMode="multiple" exportable={false} />,
      ...cols.map((col) => (
        <Column
          key={col.field}
          field={col.field}
          header={col.header}
          sortable
          style={{ minWidth: col.minWidth || "10rem" }}
        />
      )),
      <Column
        key="tools"
        header="Herramientas"
        rowEditor={allowEdit}
        headerStyle={{ width: "10%", minWidth: "5rem" }}
        bodyStyle={{ textAlign: "center" }}
      />,
    ],
    []
  );
  //FIN de EXPORTAR TABLA

  return (
    <>
      <div className="tabla-container">
        <Toast ref={toast} />
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Neonatos Inoculados
        </h1>
        <div className="welcome-message">
          <p>
            Bienvenido al sistema de Neonatos Inoculados. Aquí puedes gestionar
            los registros de Neonatos Inoculados.
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
        <div className="tabla-scroll">
          <Toolbar
            className="mb-4"
            left={leftToolbarTemplate}
            right={rightToolbarTemplate}
          ></Toolbar>
          <DataTable
            selectionMode="multiple"
            onSort={onSort}
            sortField={lazyParams.sortField}
            sortOrder={lazyParams.sortOrder}
            lazy
            first={lazyParams.first}
            rows={lazyParams.rows}
            totalRecords={totalRecords}
            onPage={onPage}
            loading={loading}
            editMode="row"
            onRowEditComplete={onRowEditComplete}
            ref={dt}
            value={registros}
            selection={selectedRegistros}
            onSelectionChange={(e) => setSelectedRegistros(e.value)}
            onRowEditInit={(e) => setRegistro(e.data)}
            onRowEditCancel={(e) => console.log(e)}
            className="p-datatable-gridlines tabla"
            style={{ width: "100%" }}
            dataKey="id"
            paginator
            // rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} Usuarios"
            globalFilter={globalFilter}
            header={header}
          >
            <Column selectionMode="multiple" exportable={false}></Column>
            <Column
              field="numero_lote"
              header="Número Lote"
              // editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="fec_colecta"
              header="Fecha Colecta"
              editor={(options) => dateEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="hor_colecta"
              header="Hora Colecta"
              // editor={(options) => dateEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="embudo"
              header="# Embudo"
              editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "8rem" }}
            ></Column>
            <Column
              field="gm_colectados"
              header="g Colectados"
              editor={(options) => floatEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="cajas_inoculadas_destino"
              header="Cajas Inoculadas / Destino"
              editor={(options) => numberEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="gm_neonato_caja"
              header="g Neonato x Caja"
              editor={(options) => floatEditor(options)}
              sortable
              style={{ minWidth: "8rem" }}
            ></Column>
            <Column
              field="cantidad_dieta_caja"
              header="Cantidad dieta x caja"
              editor={(options) => floatEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="temp_ambiental"
              header="Temperatura ambiental (°C)"
              editor={(options) => floatEditor(options)}
              sortable
              style={{ minWidth: "10rem" }}
            ></Column>
            <Column
              field="hum_ambiental"
              header="Humedad ambiental (%)"
              editor={(options) => floatEditor(options)}
              sortable
              style={{ minWidth: "11rem" }}
            ></Column>
            <Column
              field="operario"
              header="Operario"
              // editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "14rem" }}
            ></Column>
            <Column
              field="observaciones"
              header="Observaciones"
              editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "8rem" }}
            ></Column>
            <Column
              field="fec_registro"
              header="Fecha Registro"
              // editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "14rem" }}
            ></Column>
            <Column
              field="hor_registro"
              header="Hora Registro"
              // editor={(options) => textEditor(options)}
              sortable
              style={{ minWidth: "14rem" }}
            ></Column>
            <Column
              header="Herramientas"
              rowEditor={allowEdit}
              headerStyle={{ width: "10%", minWidth: "5rem" }}
              bodyStyle={{ textAlign: "center" }}
            ></Column>
            {/* {columns} */}
          </DataTable>
        </div>
      </div>

      <Dialog
        visible={registroDialog}
        style={{ width: "32rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        header="Nuevo Registro"
        modal
        className="p-fluid"
        footer={registroDialogFooter}
        onHide={hideDialog}
      >
        <div className="field">
          <label htmlFor="base_numero_lote" className="font-bold">
            Número de lote{" "}
            {submitted && !registro.base_numero_lote && (
              <small className="p-error">Requerido.</small>
            )}
          </label>

          <Dropdown
            value={registro.base_numero_lote}
            onChange={(e) => {
              setRegistro({ ...registro, base_numero_lote: e.value });
            }}
            options={[
              // Opción "Nuevo Lote" con valor "nuevo"
              { base_numero_lote: "Nuevo Lote" },
              ...(lotes || []),
            ]}
            optionLabel="base_numero_lote" // Mostrar el campo "label" en el dropdown
            optionValue="base_numero_lote" // Guardar el valor de "base_numero_lote"
            placeholder="Selecciona un Número de lote"
            className="w-full md:w-14rem"
            autoFocus
          />
          <br />
          <label htmlFor="fec_colecta" className="font-bold">
            Fecha Colecta{" "}
            {submitted && !registro.fec_colecta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="date"
            id="fec_colecta"
            value={registro.fec_colecta}
            onChange={(e) => onInputChange(e, "fec_colecta")}
            required
          />
          <br />
          <label htmlFor="hor_colecta" className="font-bold">
            Fecha Colecta{" "}
            {submitted && !registro.hor_colecta && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="time"
            id="hor_colecta"
            value={registro.hor_colecta}
            onChange={(e) => onInputChange(e, "hor_colecta")}
            required
            
          />

          <br />
          <label htmlFor="embudo" className="font-bold">
            # de Embudo{" "}
            {submitted && !registro.embudo && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.embudo && (
              <small className="p-error">
                Número de Embudo debe de ser del 1 al 10.
              </small>
            )}
          </label>

          <Dropdown
            value={registro.embudo}
            onChange={(e) => setRegistro({ ...registro, embudo: e.value })}
            options={embudos}
            optionLabel="name"
            placeholder="Selecciona un # de Embudo"
            className="w-full md:w-14rem"
          />
          <br />

          <label htmlFor="gm_colectados" className="font-bold">
            g Colectados{" "}
            {submitted && !registro.gm_colectados && (
              <small className="p-error">Requerido.</small>
            )}
            {/* {erroresValidacion.gm_colectados && (
              <small className="p-error">
                Gramos Colectados depende de cada caja.
              </small>
            )} */}
          </label>
          <InputText
            type="float"
            id="gm_colectados"
            value={registro.gm_colectados}
            onChange={(e) => onInputChange(e, "gm_colectados")}
            required
            
          />

          <br />
          <label htmlFor="cajas_inoculadas_destino" className="font-bold">
            Cajas Inoculadas / Destino{" "}
            {submitted && !registro.cajas_inoculadas_destino && (
              <small className="p-error">Requerido.</small>
            )}
            {erroresValidacion.cajas_inoculadas_destino && (
              <small className="p-error">
                Cajas Inoculadas deben de estar entre 100 a 500.
              </small>
            )}
          </label>
          <InputText
            type="number"
            id="cajas_inoculadas_destino"
            value={registro.cajas_inoculadas_destino}
            onChange={(e) => onInputChange(e, "cajas_inoculadas_destino")}
            required
            
          />

          <br />
          <label htmlFor="gm_neonato_caja" className="font-bold">
            g neonato x caja{" "}
            {submitted && !registro.gm_neonato_caja && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="float"
            id="gm_neonato_caja"
            value={registro.gm_neonato_caja}
            onChange={(e) => onInputChange(e, "gm_neonato_caja")}
            required
            
          />

          <br />
          <label htmlFor="cantidad_dieta_caja" className="font-bold">
            Cantidad dieta x caja{" "}
            {submitted && !registro.cantidad_dieta_caja && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="float"
            id="cantidad_dieta_caja"
            value={registro.cantidad_dieta_caja}
            onChange={(e) => onInputChange(e, "cantidad_dieta_caja")}
            required
           
          />

          <br />
          <label htmlFor="temp_ambiental" className="font-bold">
            Temperatura Ambiental (°C){" "}
            {submitted && !registro.temp_ambiental && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="float"
            id="temp_ambiental"
            value={registro.temp_ambiental}
            onChange={(e) => onInputChange(e, "temp_ambiental")}
            required
           
          />

          <br />
          <label htmlFor="hum_ambiental" className="font-bold">
            Humedad Ambiental (%){" "}
            {submitted && !registro.hum_ambiental && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            type="float"
            id="hum_ambiental"
            value={registro.hum_ambiental}
            onChange={(e) => onInputChange(e, "hum_ambiental")}
            required
          
          />

          <br />
          <label htmlFor="operario" className="font-bold">
            Operario{" "}
            {submitted && !registro.operario && (
              <small className="p-error">Requerido.</small>
            )}
          </label>
          <InputText
            id="operario"
            value={registro.operario}
            onChange={(e) => onInputChange(e, "operario")}
            required
          
          />
          <label htmlFor="observaciones" className="font-bold">
            Observaciones{" "}
            {observacionesObligatorio && (
              <small className="p-error">Requerido por fuera de rango.</small>
            )}
          </label>
          <InputText
            id="observaciones"
            value={registro.observaciones}
            onChange={(e) => onInputChange(e, "observaciones")}
            required
            
          />
        </div>
      </Dialog>

      {DialogoImpresion}
    </>
  );
}
export default NIB;
