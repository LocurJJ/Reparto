(function () {
  let actual = null;
  const productos = new Map();

  function numero(valor) {
    return Number(String(valor || "0").replace(",", ".")) || 0;
  }

  function pesos(valor) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }).format(numero(valor));
  }

  function totalProducto(producto) {
    if (producto.pesable) {
      if (numero(producto.totalFinal) > 0) return numero(producto.totalFinal);
      return Math.floor((numero(producto.kgFinal || producto.cantidad) * numero(producto.precioKilo || producto.precio)) / 50) * 50;
    }
    return numero(producto.precio) * numero(producto.cantidad);
  }

  function clave(pedidoId, indice) {
    return `${pedidoId}:${indice}`;
  }

  function asegurarModal() {
    if (document.getElementById("modalConfirmacionProducto")) return;
    const modal = document.createElement("div");
    modal.id = "modalConfirmacionProducto";
    modal.className = "modal oculto";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="modal-contenido modal-pago">
        <h2>Confirmar producto</h2>
        <p id="confirmacionProductoNombre">Producto</p>
        <label id="confirmacionProductoCantidadLabel" for="confirmacionProductoCantidad">Cantidad a confirmar</label>
        <input id="confirmacionProductoCantidad" class="input-pago-rapido" type="number" inputmode="decimal" min="0" step="1" placeholder="Cantidad">
        <label id="confirmacionProductoPrecioGrupo" for="confirmacionProductoPrecio">
          Precio por kg
          <input id="confirmacionProductoPrecio" class="input-pago-rapido" type="number" inputmode="decimal" min="0" step="1" placeholder="Precio por kg">
        </label>
        <div class="modal-total">
          <button type="button" id="cancelarConfirmacionProducto">Cancelar</button>
          <button type="button" id="guardarConfirmacionProducto">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("cancelarConfirmacionProducto").addEventListener("click", cerrar);
    document.getElementById("guardarConfirmacionProducto").addEventListener("click", confirmar);
    ["confirmacionProductoCantidad", "confirmacionProductoPrecio"].forEach((id) => {
      document.getElementById(id).addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") confirmar();
        if (evento.key === "Escape") cerrar();
      });
    });
  }

  window.abrirConfirmacionProducto = function abrirConfirmacionProducto(pedidoId, indice) {
    asegurarModal();
    actual = { pedidoId, indice };
    const producto = productos.get(clave(pedidoId, indice));
    if (!producto) return;
    document.getElementById("confirmacionProductoNombre").textContent = producto.nombre;
    document.getElementById("confirmacionProductoCantidadLabel").textContent = producto.pesable ? "Kilos a confirmar" : "Cantidad a confirmar";
    document.getElementById("confirmacionProductoCantidad").value = producto.pesable ? (producto.kgFinal || producto.cantidad || "") : (producto.cantidad || "");
    document.getElementById("confirmacionProductoCantidad").step = producto.pesable ? "0.001" : "1";
    document.getElementById("confirmacionProductoPrecioGrupo").classList.toggle("oculto", !producto.pesable);
    document.getElementById("confirmacionProductoPrecio").value = producto.precioKilo || producto.precio || "";
    document.getElementById("modalConfirmacionProducto").classList.remove("oculto");
    setTimeout(() => {
      const input = document.getElementById("confirmacionProductoCantidad");
      input.focus();
      input.select();
    }, 50);
  };

  function cerrar() {
    const modal = document.getElementById("modalConfirmacionProducto");
    if (modal) modal.classList.add("oculto");
    actual = null;
  }

  function confirmar() {
    if (!actual) return;
    const producto = productos.get(clave(actual.pedidoId, actual.indice));
    if (!producto) return;
    const cantidad = numero(document.getElementById("confirmacionProductoCantidad").value);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      alert("Escribi una cantidad valida.");
      return;
    }

    if (producto.pesable) {
      const precioKilo = numero(document.getElementById("confirmacionProductoPrecio").value);
      if (!Number.isFinite(precioKilo) || precioKilo <= 0) {
        alert("Escribi un precio por kg valido.");
        return;
      }
      window.cambiarDatoProductoPedido(actual.pedidoId, actual.indice, "kgFinal", cantidad);
      window.cambiarDatoProductoPedido(actual.pedidoId, actual.indice, "precioKilo", precioKilo);
    } else {
      window.cambiarDatoProductoPedido(actual.pedidoId, actual.indice, "cantidad", cantidad);
    }

    const pedidoId = actual.pedidoId;
    const indice = actual.indice;
    cerrar();
    window.confirmarProductoPedido(pedidoId, indice);
  }

  window.renderProductoPendiente = function renderProductoPendiente(pedidoId, producto, indice) {
    productos.set(clave(pedidoId, indice), producto);
    const detalle = producto.pesable
      ? `${numero(producto.kgFinal || producto.cantidad).toLocaleString("es-AR")} kg x ${pesos(producto.precioKilo || producto.precio)}/kg`
      : `${numero(producto.cantidad).toLocaleString("es-AR")} un. x ${pesos(producto.precio)}`;
    return `
      <div class="producto-pendiente compacta">
        <button type="button" class="producto-confirmacion" onclick="abrirConfirmacionProducto('${pedidoId}', ${indice})">
          <strong>${producto.nombre}</strong>
          <span>${detalle}</span>
        </button>
        <span>${pesos(totalProducto(producto))}</span>
        <button type="button" class="ok" onclick="abrirConfirmacionProducto('${pedidoId}', ${indice})">OK</button>
        <button type="button" class="no" onclick="rechazarProductoPedido('${pedidoId}', ${indice})">X</button>
      </div>
    `;
  };
})();
