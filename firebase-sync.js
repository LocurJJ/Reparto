const REPARTO_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCkoo3De98gC1LjdgaJbuGIdpWDsWP-bJo",
  authDomain: "reparto-fbaad.firebaseapp.com",
  databaseURL: "https://reparto-fbaad-default-rtdb.firebaseio.com",
  projectId: "reparto-fbaad",
  storageBucket: "reparto-fbaad.firebasestorage.app",
  messagingSenderId: "881592759373",
  appId: "1:881592759373:web:444f1ad1235bb04d4e5804",
  measurementId: "G-ETVYB93YFH"
};

(function sincronizarFirebase() {
  const clave = "reparto-panaderia-josue";
  if (!window.firebase) return;

  function idNuevo() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function hoy() {
    return new Date().toISOString().slice(0, 10);
  }

  function baseCompleta() {
    const clientes = [
      ["Adolfina", 2, 4400, 4400, 20000],
      ["Antonia", 4, 8600, 8500, 20000],
      ["Maria", 3, -200, 0, 15000],
      ["Serafin", 2, 8800, 4400, 25000],
      ["Clara", 0, 0, 0, 12000],
      ["Mercedes", 0, 84000, 0, 50000],
      ["Mirta picass", 0, 0, 0, 12000],
      ["Naty", 0, 0, 0, 12000],
      ["Romero", 8, 143000, 0, 60000]
    ].map((cliente, indice) => ({
      id: idNuevo(),
      nombre: cliente[0],
      direccion: "",
      horario: "",
      precioPan: "",
      precioFactura: "",
      limite: cliente[4],
      orden: indice + 1
    }));

    const fecha = hoy();
    return {
      usuarioActual: "",
      ingresos: [],
      precios: [
        { id: idNuevo(), producto: "Pan", precio: 2200, pesable: true },
        { id: idNuevo(), producto: "Factura", precio: 350, pesable: false },
        { id: idNuevo(), producto: "Prepizza", precio: 1000, pesable: false },
        { id: idNuevo(), producto: "Pan rallado", precio: 800, pesable: true }
      ],
      pedidos: [],
      panParaRallar: [],
      clientes,
      fechaActual: fecha,
      dias: {
        [fecha]: clientes.map((cliente, indice) => ({
          clienteId: cliente.id,
          kg: [2, 4, 3, 2, 0, 0, 0, 0, 8][indice] || 0,
          deudaAnterior: [4400, 8600, -200, 8800, 0, 84000, 0, 0, 143000][indice] || 0,
          pago: [4400, 8500, 0, 4400, 0, 0, 0, 0, 0][indice] || 0,
          mp: 0,
          otros: 0,
          factura: 0,
          prepizza: 0,
          rallado: indice === 0 ? 4 : 0,
          panParaRallarKg: 0,
          otrosProductos: [],
          observacion: "",
          horaPago: ""
        }))
      }
    };
  }

  function repararDatos(datos) {
    const base = baseCompleta();
    const limpio = datos && typeof datos === "object" ? datos : {};
    let reparado = false;

    if (!Array.isArray(limpio.precios) || limpio.precios.length === 0) {
      limpio.precios = base.precios;
      reparado = true;
    }
    if (!Array.isArray(limpio.clientes) || limpio.clientes.length === 0) {
      limpio.clientes = base.clientes;
      reparado = true;
    }
    if (!limpio.fechaActual) {
      limpio.fechaActual = hoy();
      reparado = true;
    }
    if (!limpio.dias || typeof limpio.dias !== "object") {
      limpio.dias = {};
      reparado = true;
    }
    if (!Array.isArray(limpio.dias[limpio.fechaActual])) {
      limpio.dias[limpio.fechaActual] = [];
      reparado = true;
    }

    limpio.clientes.forEach((cliente, indice) => {
      if (!cliente.orden) {
        cliente.orden = indice + 1;
        reparado = true;
      }
      if (!limpio.dias[limpio.fechaActual].some((fila) => fila.clienteId === cliente.id)) {
        limpio.dias[limpio.fechaActual].push({
          clienteId: cliente.id,
          kg: 0,
          deudaAnterior: 0,
          pago: 0,
          mp: 0,
          otros: 0,
          factura: 0,
          prepizza: 0,
          rallado: 0,
          panParaRallarKg: 0,
          otrosProductos: [],
          observacion: "",
          horaPago: ""
        });
        reparado = true;
      }
    });

    if (!Array.isArray(limpio.ingresos)) limpio.ingresos = [];
    if (!Array.isArray(limpio.pedidos)) limpio.pedidos = [];
    if (!Array.isArray(limpio.panParaRallar)) limpio.panParaRallar = [];
    if (typeof limpio.usuarioActual !== "string") limpio.usuarioActual = "";

    return { datos: limpio, reparado };
  }

  try {
    if (!window.firebase.apps.length) window.firebase.initializeApp(REPARTO_FIREBASE_CONFIG);
    const ref = window.firebase.database().ref("reparto/datos");
    const setItemOriginal = localStorage.setItem.bind(localStorage);
    let aplicandoRemoto = false;

    localStorage.setItem = function setItemConFirebase(key, value) {
      if (key !== clave) {
        setItemOriginal(key, value);
        return;
      }

      let texto = value;
      try {
        texto = JSON.stringify(repararDatos(JSON.parse(value)).datos);
      } catch (error) {
        texto = value;
      }

      setItemOriginal(key, texto);
      if (aplicandoRemoto) return;

      try {
        ref.set(JSON.parse(texto));
      } catch (error) {
        console.error("No se pudo guardar en Firebase", error);
      }
    };

    const localInicial = repararDatos(JSON.parse(localStorage.getItem(clave) || "{}"));
    if (localInicial.reparado) setItemOriginal(clave, JSON.stringify(localInicial.datos));

    ref.on("value", (snapshot) => {
      const remoto = repararDatos(snapshot.val());
      const textoRemoto = JSON.stringify(remoto.datos);
      const textoLocal = localStorage.getItem(clave);

      if (remoto.reparado || !snapshot.val()) ref.set(remoto.datos);
      if (textoLocal === textoRemoto) return;

      aplicandoRemoto = true;
      setItemOriginal(clave, textoRemoto);
      aplicandoRemoto = false;

      if (document.readyState !== "loading") window.location.reload();
    });
  } catch (error) {
    console.error("No se pudo iniciar Firebase", error);
  }
})();
