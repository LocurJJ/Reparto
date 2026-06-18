(function () {
  function numero(valor) {
    return Number(String(valor || "0").replace(",", ".")) || 0;
  }

  function idDesdeFila(fila) {
    const input = fila.querySelector("input[onchange*='cambiarReparto']");
    const codigo = input ? input.getAttribute("onchange") || "" : "";
    const match = codigo.match(/cambiarReparto\('([^']+)'/);
    return match ? match[1] : "";
  }

  function mejorarNombres() {
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
      boton.addEventListener("click", () => {
        const valor = prompt(`Cuanto pago ${nombre}?`, "");
        if (valor === null) return;

        const pago = numero(valor);
        if (!Number.isFinite(pago) || pago < 0) {
          alert("Escribi un numero valido.");
          return;
        }

        window.cambiarReparto(clienteId, "pago", pago);
      });

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
