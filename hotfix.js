(function () {
  function numero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (typeof valor === "string") {
      let limpio = valor.trim().replace(/\$/g, "").replace(/\s/g, "");
      if (limpio.includes(",")) {
        limpio = limpio.replace(/\./g, "").replace(",", ".");
      } else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpio)) {
        limpio = limpio.replace(/\./g, "");
      }
      return Number(limpio || 0) || 0;
    }
    return Number(valor || 0) || 0;
  }

  function redondear50Abajo(valor) {
    return Math.floor(numero(valor) / 50) * 50;
  }

  window.totalProductoOtro = function totalProductoOtroCorregido(producto) {
    if (producto.pesable) {
      const kg = numero(producto.kgFinal || producto.cantidad);
      const precioKilo = numero(producto.precioKilo || producto.precio);
      if (kg > 0 && precioKilo > 0) return redondear50Abajo(kg * precioKilo);
      return numero(producto.totalFinal);
    }
    return numero(producto.precio) * numero(producto.cantidad);
  };

  window.cambiarDatoProductoPedido = function cambiarDatoProductoPedidoCorregido(pedidoId, indice, campo, valor) {
    const pedido = datos.pedidos.find((item) => item.id === pedidoId);
    if (!pedido || !pedido.productos[indice]) return;
    const producto = pedido.productos[indice];
    producto[campo] = numero(valor);
    if (producto.pesable) producto.totalFinal = window.totalProductoOtro(producto);
    guardarDatos();
    renderPedidosInicio();
  };

  window.renderPedidosInicio = function renderPedidosInicioCorregido() {
    const bloque = document.getElementById("pedidosInicio");
    const lista = document.getElementById("listaPedidos");
    if (!bloque || !lista) return;

    const pendientes = pedidosPendientes();
    bloque.classList.toggle("oculto", pendientes.length === 0);
    lista.innerHTML = pendientes.map((pedido) => {
      const cliente = datos.clientes.find((item) => item.id === pedido.clienteId);
      const items = pedido.productos
        .map((producto, indice) => ({ producto, indice }))
        .filter((item) => !item.producto.estado || item.producto.estado === "pendiente");
      if (!items.length) return "";
      return `<article class="pedido-card"><div><strong>${cliente ? esc(cliente.nombre) : "Cliente"}</strong><span>${etiquetaFecha(pedido.fecha)} - ${pedido.creadoHora || ""}</span></div><div class="pedido-productos">${items.map((item) => renderProductoPendiente(pedido.id, item.producto, item.indice)).join("")}</div></article>`;
    }).join("");
  };

  try {
    renderPedidosInicio();
    if (document.body.dataset.page === "reparto" && typeof renderReparto === "function") renderReparto();
  } catch (error) {
    console.warn("No se pudo aplicar hotfix de pedidos", error);
  }
})();
