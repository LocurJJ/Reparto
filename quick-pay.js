(function () {
  let clientePagoActual = "";

  function numero(valor) {
    return Number(String(valor || "0").replace(",", ".")) || 0;
  }

  function idDesdeFila(fila) {
    const input = fila.querySelector("input[onchange*='cambiarReparto']");
    const codigo = input ? input.getAttribute("onchange") || "" : "";
    const match = codigo.match(/cambiarReparto\('([^']+)'/);
    return match ? match[1] : "";
  }

  function asegurarModal() {
    if (document.getElementById("modalPagoRapido")) return;

    const modal = document.createElement("div");
    modal.id = "modalPagoRapido";
    modal.className = "modal oculto";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="modal-contenido modal-pago">
        <h2>Cargar pago</h2>
        <p id="pagoRapidoCliente">Cliente</p>
        <input id="pagoRapidoInput" class="input-pago-rapido" type="number" inputmode="decimal" pattern="[0-9]*" min="0" step="1" placeholder="Monto">
        <div class="modal-total">
          <button type="button" id="cancelarPagoRapido">Cancelar</button>
          <button type="button" id="guardarPagoRapido">Guardar pago</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("cancelarPagoRapido").addEventListener("click", cerrarPagoRapido);
    document.getElementById("guardarPagoRapido").addEventListener("click", confirmarPagoRapido);
    document.getElementById("pagoRapidoInput").addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") confirmarPagoRapido();
      if (evento.key === "Escape") cerrarPagoRapido();
    });
  }

  function abrirPagoRapido(clienteId, nombre) {
    asegurarModal();
    clientePagoActual = clienteId;
    document.getElementById("pagoRapidoCliente").textContent = nombre;
    document.getElementById("pagoRapidoInput").value = "";
    document.getElementById("modalPagoRapido").classList.remove("oculto");
    setTimeout(() => {
      const input = document.getElementById("pagoRapidoInput");
      input.focus();
      input.select();
    }, 50);
  }

  function confirmarPagoRapido() {
    const pago = numero(document.getElementById("pagoRapidoInput").value);
    if (!Number.isFinite(pago) || pago < 0) {
      alert("Escribi un numero valido.");
      return;
    }

    window.cambiarReparto(clientePagoActual, "pago", pago);
    cerrarPagoRapido();
  }

  function cerrarPagoRapido() {
    const modal = document.getElementById("modalPagoRapido");
    if (modal) modal.classList.add("oculto");
    clientePagoActual = "";
  }

  function mejorarNombres() {
    asegurarModal();
    document.querySelectorAll(".tabla-reparto tbody tr").forEach((fila) => {
      const celda = fila.querySelector(".nombre-cliente");
      if (!celda || celda.querySelector("button")) return;

      const clienteId = idDesdeFila(fila);
      const nombre = celda.textContent.trim();
      if (!clienteId || !nombre) return;

      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton-cliente-pago";
      boton.textContent = nombre;
      boton.addEventListener("click", () => abrirPagoRapido(clienteId, nombre));

      celda.textContent = "";
      celda.appendChild(boton);
    });
  }

  const renderOriginal = window.renderReparto;
  if (typeof renderOriginal === "function") {
    window.renderReparto = function renderRepartoConPagoRapido() {
      renderOriginal.apply(this, arguments);
      mejorarNombres();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mejorarNombres);
  } else {
    mejorarNombres();
  }
})();
