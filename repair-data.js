(function repararDatosReparto() {
  const CLAVE = "reparto-panaderia-josue";

  function idNuevo() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function hoy() {
    return new Date().toISOString().slice(0, 10);
  }

  function clientesBase() {
    return [
      ["Adolfina", 20000],
      ["Antonia", 20000],
      ["Maria", 15000],
      ["Serafin", 25000],
      ["Clara", 12000],
      ["Mercedes", 50000],
      ["Mirta picass", 12000],
      ["Naty", 12000],
      ["Romero", 60000]
    ].map((cliente, indice) => ({
      id: idNuevo(),
      nombre: cliente[0],
      direccion: "",
      horario: "",
      precioPan: "",
      precioFactura: "",
      limite: cliente[1],
      orden: indice + 1
    }));
  }

  function preciosBase() {
    return [
      { id: idNuevo(), producto: "Pan", precio: 2200, pesable: true },
      { id: idNuevo(), producto: "Factura", precio: 350, pesable: false },
      { id: idNuevo(), producto: "Prepizza", precio: 1000, pesable: false },
      { id: idNuevo(), producto: "Pan rallado", precio: 800, pesable: true }
    ];
  }

  function filaVacia(clienteId) {
    return {
      clienteId,
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
    };
  }

  let datos;
  try {
    datos = JSON.parse(localStorage.getItem(CLAVE) || "{}");
  } catch (error) {
    datos = {};
  }

  let cambio = false;
  if (!Array.isArray(datos.precios) || datos.precios.length === 0) {
    datos.precios = preciosBase();
    cambio = true;
  }

  if (!Array.isArray(datos.clientes) || datos.clientes.length === 0) {
    datos.clientes = clientesBase();
    cambio = true;
  }

  if (!datos.fechaActual) {
    datos.fechaActual = hoy();
    cambio = true;
  }

  if (!datos.dias || typeof datos.dias !== "object") {
    datos.dias = {};
    cambio = true;
  }

  if (!Array.isArray(datos.dias[datos.fechaActual])) {
    datos.dias[datos.fechaActual] = [];
    cambio = true;
  }

  datos.clientes.forEach((cliente, indice) => {
    if (!cliente.orden) {
      cliente.orden = indice + 1;
      cambio = true;
    }
    if (!datos.dias[datos.fechaActual].some((fila) => fila.clienteId === cliente.id)) {
      datos.dias[datos.fechaActual].push(filaVacia(cliente.id));
      cambio = true;
    }
  });

  if (!Array.isArray(datos.ingresos)) datos.ingresos = [];
  if (!Array.isArray(datos.pedidos)) datos.pedidos = [];
  if (!Array.isArray(datos.panParaRallar)) datos.panParaRallar = [];
  if (!datos.usuarioActual) datos.usuarioActual = "";

  if (cambio) {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  }
})();
