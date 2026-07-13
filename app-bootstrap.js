(function () {
  const CLAVE = "reparto-panaderia-josue";
  const RUTA_FIREBASE = "reparto/datos";
  const firebaseConfig = {
    apiKey: "AIzaSyCkoo3De98gC1LjgdaJbuGIdpWDsWP-bJo",
    authDomain: "reparto-fbaad.firebaseapp.com",
    projectId: "reparto-fbaad",
    storageBucket: "reparto-fbaad.firebasestorage.app",
    messagingSenderId: "881592759373",
    appId: "1:881592759373:web:444f1ad1235bb04d4e5804"
  };

  const modulosPorPagina = {
    inicio: ["firebase-sync.js?v=8", "script.js?v=6", "product-confirm.js?v=6", "hotfix.js?v=5"],
    reparto: ["firebase-sync.js?v=8", "script.js?v=6", "quick-pay.js?v=5", "hotfix.js?v=5", "cierre-dia.js?v=2"],
    reportes: ["firebase-sync.js?v=8", "script.js?v=6", "debt-whatsapp.js?v=6", "hotfix.js?v=5"]
  };

  function cargarScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se pudo cargar " + src));
      document.body.appendChild(script);
    });
  }

  function mostrarEstado(texto) {
    let aviso = document.getElementById("estadoMemoria");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "estadoMemoria";
      aviso.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:10px 14px;border:1px solid #bcd0ee;background:#f8fbff;color:#172033;border-radius:8px;font:600 14px system-ui;box-shadow:0 8px 24px #0002";
      document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
  }

  function ocultarEstado() {
    const aviso = document.getElementById("estadoMemoria");
    if (aviso) aviso.remove();
  }

  async function traerDatosFirebase() {
    if (!window.firebase || !firebase.database) return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

    const snap = await firebase.database().ref(RUTA_FIREBASE).once("value");
    const remoto = snap.val();
    if (remoto && typeof remoto === "object") {
      localStorage.setItem(CLAVE, JSON.stringify(remoto));
    }
  }

  function dejarModoSimple() {
    try {
      if (typeof datos !== "undefined" && datos) datos.usuarioActual = "Josue";
      window.elegirUsuario = function () {
        if (typeof datos !== "undefined" && datos) datos.usuarioActual = "Josue";
        if (typeof actualizarUsuario === "function") actualizarUsuario();
      };
      const bloqueUsuarios = document.getElementById("usuarios");
      if (bloqueUsuarios) bloqueUsuarios.classList.add("oculto");
      document.querySelectorAll("button[onclick*=usuarios]").forEach((boton) => boton.classList.add("oculto"));
      if (typeof actualizarUsuario === "function") actualizarUsuario();
      if (document.body.dataset.page === "reportes" && typeof renderReportes === "function") renderReportes();
    } catch (error) {
      console.warn("No se pudo aplicar modo simple", error);
    }
  }

  async function iniciar() {
    const pagina = document.body.dataset.page || "inicio";
    const modulos = modulosPorPagina[pagina] || modulosPorPagina.inicio;

    mostrarEstado("Cargando datos guardados...");
    try {
      await traerDatosFirebase();
    } catch (error) {
      console.warn("Firebase no respondio, se usa la copia local", error);
      mostrarEstado("No se pudo leer Firebase. Uso la copia local de este dispositivo.");
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    for (const modulo of modulos) {
      await cargarScript(modulo);
    }

    dejarModoSimple();
    ocultarEstado();
  }

  iniciar().catch((error) => {
    console.error(error);
    mostrarEstado("Hubo un problema cargando el programa. Actualiza la pagina.");
  });
})();
