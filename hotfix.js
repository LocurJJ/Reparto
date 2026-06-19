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

  function productoClave(producto) {
    return [
      producto.nombre || "",
      numero(producto.cantidad),
      numero(producto.kgFinal),
      numero(producto.precio),
      numero(producto.precioKilo),
      producto.confirmadoHora || ""
    ].join("|");
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

  window.renderHistorialPedidosDia = function renderHistorialPedidosDiaCorregido() {
    const contenedor = document.getElementById("historialPedidosDia");
    if (!contenedor) return;
    const pedidosDia = pedidosConResultado().filter((pedido) => pedido.fecha === datos.fechaActual && pedido.estado !== "anulado");
    if (!pedidosDia.length) {
      contenedor.innerHTML = "";
      return;
    }

    contenedor.innerHTML = `<h3>Comprobantes del dia</h3>` + pedidosDia.map((pedido, indice) => {
      const cliente = datos.clientes.find((item) => item.id === pedido.clienteId);
      const grupo = {
        fecha: pedido.fecha,
        cliente: cliente ? cliente.nombre : "Cliente",
        productos: pedido.productos.filter((producto) => producto.estado === "confirmado" || producto.estado === "rechazado")
      };
      const texto = textoComprobanteResultado(grupo);
      return `<article class="comprobante-card"><div><strong>${esc(grupo.cliente)} - ${etiquetaFecha(grupo.fecha)}</strong><pre id="comprobanteDia${indice}">${esc(texto)}</pre></div><div class="botones comprobante-acciones"><button type="button" onclick="copiarTextoElemento('comprobanteDia${indice}')">Copiar</button><button type="button" class="no" onclick="borrarPedidoConfirmado('${pedido.id}')">X</button></div></article>`;
    }).join("");
  };

  window.borrarPedidoConfirmado = function borrarPedidoConfirmado(pedidoId) {
    const pedido = datos.pedidos.find((item) => item.id === pedidoId);
    if (!pedido) return;
    const cliente = datos.clientes.find((item) => item.id === pedido.clienteId);
    const nombreCliente = cliente ? cliente.nombre : "este cliente";
    if (!confirm(`Borrar este comprobante de ${nombreCliente} y sacarlo de la cuenta?`)) return;

    const fila = (datos.dias[pedido.fecha] || []).find((item) => item.clienteId === pedido.clienteId);
    const confirmados = pedido.productos.filter((producto) => producto.estado === "confirmado");
    if (fila) {
      const clavesABorrar = new Map();
      confirmados.forEach((producto) => {
        const clave = productoClave(producto);
        clavesABorrar.set(clave, (clavesABorrar.get(clave) || 0) + 1);
      });
      fila.otrosProductos = (fila.otrosProductos || []).filter((producto) => {
        const clave = productoClave(producto);
        const cantidad = clavesABorrar.get(clave) || 0;
        if (cantidad <= 0) return true;
        clavesABorrar.set(clave, cantidad - 1);
        return false;
      });
    }

    pedido.productos.forEach((producto) => {
      if (producto.estado === "confirmado") producto.estado = "anulado";
    });
    if (!pedido.productos.some((producto) => producto.estado === "confirmado" || producto.estado === "pendiente")) pedido.estado = "anulado";
    guardarDatos();
    if (typeof renderReparto === "function") renderReparto();
    else renderHistorialPedidosDia();
  };

  try {
    renderPedidosInicio();
    if (document.body.dataset.page === "reparto" && typeof renderReparto === "function") renderReparto();
  } catch (error) {
    console.warn("No se pudo aplicar hotfix de pedidos", error);
  }
})();
