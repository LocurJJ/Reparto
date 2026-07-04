(function () {
  function numero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (typeof valor === "string") {
      let limpio = valor.trim().replace(/\$/g, "").replace(/\s/g, "");
      if (limpio.includes(",")) limpio = limpio.replace(/\./g, "").replace(",", ".");
      else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpio)) limpio = limpio.replace(/\./g, "");
      return Number(limpio || 0) || 0;
    }
    return Number(valor || 0) || 0;
  }

  function idNuevo() {
    return crypto && crypto.randomUUID ? crypto.randomUUID() : "gasto-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function dinero(valor) {
    if (typeof pesos === "function") return pesos(valor);
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(numero(valor));
  }

  function escapeHtml(texto) {
    return String(texto || "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function cierreActual() {
    datos.cierres = datos.cierres || {};
    const fecha = datos.fechaActual;
    if (!datos.cierres[fecha]) datos.cierres[fecha] = { gastos: [], efectivoReal: "" };
    if (!Array.isArray(datos.cierres[fecha].gastos)) datos.cierres[fecha].gastos = [];
    if (datos.cierres[fecha].efectivoReal === undefined) datos.cierres[fecha].efectivoReal = "";
    return datos.cierres[fecha];
  }

  function efectivoSistema() {
    return filasDelDia().reduce((total, fila) => total + numero(fila.pago), 0);
  }

  function totalGastos(cierre) {
    return (cierre.gastos || []).reduce((total, gasto) => total + numero(gasto.monto), 0);
  }

  function renderGastosCierre() {
    if (!document.body || document.body.dataset.page !== "reparto") return;
    const resumen = document.querySelector(".resumen");
    if (!resumen) return;
    let panel = document.getElementById("panelCierreDia");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "panelCierreDia";
      panel.className = "historial-dia aviso-rallar";
      resumen.insertAdjacentElement("afterend", panel);
    }

    const cierre = cierreActual();
    const gastos = totalGastos(cierre);
    const efectivo = efectivoSistema();
    const esperado = efectivo - gastos;
    const real = cierre.efectivoReal === "" ? "" : numero(cierre.efectivoReal);
    const diferencia = real === "" ? "" : real - esperado;

    panel.innerHTML = `
      <div class="encabezado-seccion">
        <div>
          <h3>Gastos y cierre en efectivo</h3>
          <p>Efectivo sistema: <strong>${dinero(efectivo)}</strong> - Gastos: <strong>${dinero(gastos)}</strong> - Esperado: <strong>${dinero(esperado)}</strong></p>
        </div>
      </div>
      <div class="dos-columnas">
        <div class="formulario">
          <label>Detalle del gasto
            <input id="gastoDetalle" type="text" placeholder="Ej: combustible, bolsas, vuelto">
          </label>
          <label>Monto
            <input id="gastoMonto" type="text" inputmode="decimal" pattern="[0-9.,]*" placeholder="0">
          </label>
          <button type="button" onclick="agregarGastoDia()">Añadir gasto</button>
        </div>
        <div class="formulario">
          <label>Cierre en efectivo
            <input id="cierreEfectivoReal" type="text" inputmode="decimal" pattern="[0-9.,]*" value="${escapeHtml(cierre.efectivoReal)}" onchange="cambiarCierreEfectivo(this.value)" placeholder="Cuanto conto al cerrar">
          </label>
          <div class="resumen">
            <div><span>Diferencia</span><strong class="${numero(diferencia) < 0 ? "deuda" : "pagado"}">${diferencia === "" ? "-" : dinero(diferencia)}</strong></div>
          </div>
        </div>
      </div>
      <div class="tabla-scroll">
        <table>
          <thead><tr><th>Gasto</th><th>Monto</th><th>Accion</th></tr></thead>
          <tbody>
            ${(cierre.gastos || []).map(gasto => `<tr><td>${escapeHtml(gasto.detalle)}</td><td>${dinero(gasto.monto)}</td><td><button type="button" class="no" onclick="borrarGastoDia('${gasto.id}')">X</button></td></tr>`).join("") || `<tr><td colspan="3">Todavia no cargaste gastos.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  window.agregarGastoDia = function agregarGastoDia() {
    const detalle = document.getElementById("gastoDetalle").value.trim();
    const monto = numero(document.getElementById("gastoMonto").value);
    if (!detalle) {
      alert("Escribi el detalle del gasto.");
      return;
    }
    if (monto <= 0) {
      alert("Escribi un monto valido.");
      return;
    }
    cierreActual().gastos.push({ id: idNuevo(), detalle, monto, hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) });
    guardarDatos();
    renderGastosCierre();
  };

  window.borrarGastoDia = function borrarGastoDia(id) {
    if (!confirm("Borrar este gasto?")) return;
    const cierre = cierreActual();
    cierre.gastos = cierre.gastos.filter(gasto => gasto.id !== id);
    guardarDatos();
    renderGastosCierre();
  };

  window.cambiarCierreEfectivo = function cambiarCierreEfectivo(valor) {
    cierreActual().efectivoReal = valor;
    guardarDatos();
    renderGastosCierre();
  };

  const renderRepartoOriginal = window.renderReparto;
  if (typeof renderRepartoOriginal === "function") {
    window.renderReparto = function renderRepartoConCierre() {
      renderRepartoOriginal();
      renderGastosCierre();
    };
  }

  try { renderGastosCierre(); } catch (error) { console.warn("No se pudo cargar cierre del dia", error); }
})();
