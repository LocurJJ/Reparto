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

(function () {
  const CLAVE = "reparto-panaderia-josue";
  let remotoReferencia = null;

  function numero(valor) { return Number(valor || 0); }
  function idNuevo() { return crypto && crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2); }
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function clonar(valor) { return JSON.parse(JSON.stringify(valor || {})); }

  function baseMinima() {
    const clientes = [["Adolfina",20000],["Antonia",20000],["Maria",15000],["Serafin",25000],["Clara",12000],["Mercedes",50000],["Mirta picass",12000],["Naty",12000],["Romero",60000]].map((c,i)=>({id:idNuevo(),nombre:c[0],direccion:"",horario:"",precioPan:"",precioFactura:"",limite:c[1],orden:i+1}));
    const fecha = hoy();
    return {usuarioActual:"",ingresos:[],precios:[{id:idNuevo(),producto:"Pan",precio:2200,pesable:true},{id:idNuevo(),producto:"Factura",precio:350,pesable:false},{id:idNuevo(),producto:"Prepizza",precio:1000,pesable:false},{id:idNuevo(),producto:"Pan rallado",precio:800,pesable:true}],pedidos:[],panParaRallar:[],cierres:{},clientes,fechaActual:fecha,actualizado:Date.now(),dias:{[fecha]:clientes.map(c=>({clienteId:c.id,kg:0,deudaAnterior:0,pago:0,mp:0,otros:0,factura:0,prepizza:0,rallado:0,panParaRallarKg:0,otrosProductos:[],observacion:"",horaPago:""}))}};
  }

  function reparar(datos) {
    const base = baseMinima();
    const d = datos && typeof datos === "object" ? datos : {};
    if (!Array.isArray(d.clientes) || d.clientes.length === 0) d.clientes = base.clientes;
    if (!Array.isArray(d.precios) || d.precios.length === 0) d.precios = base.precios;
    if (!Array.isArray(d.ingresos)) d.ingresos = [];
    if (!Array.isArray(d.pedidos)) d.pedidos = [];
    if (!Array.isArray(d.panParaRallar)) d.panParaRallar = [];
    if (!d.cierres || typeof d.cierres !== "object") d.cierres = {};
    Object.keys(d.cierres).forEach(fecha => {
      const cierre = d.cierres[fecha] || {};
      if (!Array.isArray(cierre.gastos)) cierre.gastos = [];
      if (cierre.efectivoReal === undefined) cierre.efectivoReal = "";
      d.cierres[fecha] = cierre;
    });
    if (typeof d.usuarioActual !== "string") d.usuarioActual = "";
    if (!d.fechaActual) d.fechaActual = hoy();
    if (d.actualizado === undefined || d.actualizado === null) d.actualizado = 0;
    if (!d.dias || typeof d.dias !== "object") d.dias = {};
    if (!Array.isArray(d.dias[d.fechaActual])) d.dias[d.fechaActual] = [];
    d.clientes.forEach((cliente, i) => {
      if (!cliente.orden) cliente.orden = i + 1;
      if (!d.dias[d.fechaActual].some(f => f.clienteId === cliente.id)) d.dias[d.fechaActual].push({clienteId:cliente.id,kg:0,deudaAnterior:0,pago:0,mp:0,otros:0,factura:0,prepizza:0,rallado:0,panParaRallarKg:0,otrosProductos:[],observacion:"",horaPago:""});
    });
    Object.values(d.dias || {}).forEach(filas => {
      if (!Array.isArray(filas)) return;
      filas.forEach(fila => {
        if (!Array.isArray(fila.otrosProductos)) fila.otrosProductos = [];
        if (fila.panParaRallarKg === undefined) fila.panParaRallarKg = 0;
        if (typeof fila.observacion !== "string") fila.observacion = "";
      });
    });
    return d;
  }

  function puntaje(datos) {
    if (!datos || typeof datos !== "object") return 0;
    let p = 0;
    p += Array.isArray(datos.clientes) ? datos.clientes.length * 10 : 0;
    p += Array.isArray(datos.precios) ? datos.precios.length * 5 : 0;
    p += Array.isArray(datos.pedidos) ? datos.pedidos.length * 3 : 0;
    p += Array.isArray(datos.panParaRallar) ? datos.panParaRallar.length * 3 : 0;
    p += datos.cierres && typeof datos.cierres === "object" ? Object.keys(datos.cierres).length * 2 : 0;
    p += Array.isArray(datos.ingresos) ? Math.min(datos.ingresos.length, 20) : 0;
    Object.values(datos.dias || {}).forEach(filas => {
      if (!Array.isArray(filas)) return;
      p += 3;
      filas.forEach(fila => {
        ["kg","deudaAnterior","pago","mp","otros","factura","prepizza","rallado","panParaRallarKg"].forEach(c => { if (numero(fila[c]) !== 0) p += 1; });
        if (fila.observacion) p += 1;
        if (Array.isArray(fila.otrosProductos)) p += fila.otrosProductos.length * 2;
      });
    });
    return p;
  }

  function leerLocal() {
    try { return reparar(JSON.parse(localStorage.getItem(CLAVE) || "{}")); }
    catch { return reparar({}); }
  }

  function soloCambioUsuario(antes, despues) {
    const a = {...antes};
    const b = {...despues};
    delete a.usuarioActual; delete a.ingresos; delete a.actualizado;
    delete b.usuarioActual; delete b.ingresos; delete b.actualizado;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function claveItem(item) {
    if (!item || typeof item !== "object") return "";
    return item.id || item.clienteId || item.productoId || "";
  }

  function fusionarArreglo(remoto, antes, despues) {
    if (!Array.isArray(despues)) return despues;
    if (!Array.isArray(remoto) || !Array.isArray(antes)) return clonar(despues);
    const usaClave = despues.some(item => claveItem(item)) || remoto.some(item => claveItem(item));
    if (!usaClave) return JSON.stringify(antes) === JSON.stringify(despues) ? remoto : clonar(despues);

    const resultado = remoto.map(item => clonar(item));
    const indiceRemoto = new Map(resultado.map((item, indice) => [claveItem(item), indice]).filter(([clave]) => clave));
    const indiceAntes = new Map(antes.map((item, indice) => [claveItem(item), indice]).filter(([clave]) => clave));

    despues.forEach((item, indice) => {
      const clave = claveItem(item);
      const anterior = clave ? antes[indiceAntes.get(clave)] : antes[indice];
      const cambio = JSON.stringify(anterior) !== JSON.stringify(item);
      if (!cambio) return;
      if (clave && indiceRemoto.has(clave)) {
        const i = indiceRemoto.get(clave);
        resultado[i] = aplicarCambios(resultado[i], anterior, item);
      } else {
        resultado.push(clonar(item));
      }
    });

    return resultado;
  }

  function aplicarCambios(remoto, antes, despues) {
    if (JSON.stringify(antes) === JSON.stringify(despues)) return remoto;
    if (Array.isArray(despues)) return fusionarArreglo(remoto, antes, despues);
    if (!despues || typeof despues !== "object") return despues;
    if (!remoto || typeof remoto !== "object" || Array.isArray(remoto)) remoto = {};
    if (!antes || typeof antes !== "object" || Array.isArray(antes)) antes = {};
    const salida = {...remoto};
    Object.keys(despues).forEach(clave => {
      if (clave === "actualizado") return;
      salida[clave] = aplicarCambios(remoto[clave], antes[clave], despues[clave]);
    });
    return salida;
  }

  if (!window.firebase) return;
  if (!firebase.apps.length) firebase.initializeApp(REPARTO_FIREBASE_CONFIG);
  const ref = firebase.database().ref("reparto/datos");
  const setOriginal = localStorage.setItem.bind(localStorage);

  localStorage.setItem = function (key, value) {
    if (key !== CLAVE) return setOriginal(key, value);
    const anterior = leerLocal();
    let nuevo;
    try { nuevo = reparar(JSON.parse(value)); }
    catch { nuevo = anterior; }
    nuevo.actualizado = Date.now();
    const texto = JSON.stringify(nuevo);
    setOriginal(key, texto);

    if (soloCambioUsuario(anterior, nuevo)) {
      const parcial = {usuarioActual: nuevo.usuarioActual, ingresos: nuevo.ingresos, actualizado: nuevo.actualizado};
      if (remotoReferencia) Object.assign(remotoReferencia, parcial);
      ref.update(parcial).catch(error => console.error("No se pudo guardar usuario en Firebase", error));
      return;
    }

    ref.transaction(remotoActual => {
      const remoto = reparar(remotoActual);
      if (!remotoActual) return nuevo;
      if (puntaje(nuevo) + 20 < puntaje(remoto)) {
        console.warn("No se subio una copia local incompleta a Firebase.");
        return;
      }
      if (numero(remoto.actualizado) > numero(anterior.actualizado)) {
        const fusion = aplicarCambios(remoto, anterior, nuevo);
        fusion.actualizado = nuevo.actualizado;
        return fusion;
      }
      return nuevo;
    }, (error, confirmado, snapshot) => {
      if (error) console.error("No se pudo guardar en Firebase", error);
      if (confirmado && snapshot && snapshot.val()) remotoReferencia = reparar(snapshot.val());
    });
  };

  ref.once("value").then(snapshot => {
    const remoto = reparar(snapshot.val());
    const local = leerLocal();
    remotoReferencia = remoto;
    if (!snapshot.val()) { ref.set({...local, actualizado: Date.now()}); return; }
    if (puntaje(local) > puntaje(remoto) + 20 && numero(local.actualizado) >= numero(remoto.actualizado)) { ref.set({...local, actualizado: Date.now()}); remotoReferencia = local; return; }
    if (puntaje(local) + 20 < puntaje(remoto) || numero(remoto.actualizado) > numero(local.actualizado)) {
      setOriginal(CLAVE, JSON.stringify(remoto));
      if (document.readyState !== "loading") location.reload();
      return;
    }
  }).catch(error => console.error("No se pudo leer Firebase", error));
})();
