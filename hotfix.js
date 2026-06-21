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

  function htmlSeguro(texto) {
    return String(texto || "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function numeroPlanilla(valor) {
    return numero(valor).toLocaleString("es-AR", { maximumFractionDigits: 3 });
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

  window.exportarPdfReparto = function exportarPdfReparto() {
    const fecha = datos.fechaActual;
    const filas = clientesOrdenados().map((cliente) => {
      const fila = filaPorCliente(fecha, cliente.id) || {};
      return { cliente, fila };
    });
    const fechaTexto = etiquetaFecha(fecha);
    const generado = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
    const filasHtml = filas.map(({ cliente, fila }) => {
      const debe = debeFila(fila, cliente);
      const cuenta = cuentaFila(fila, cliente);
      return `<tr>
        <td>${htmlSeguro(cliente.nombre)}</td>
        <td class="num kg">${numeroPlanilla(fila.kg)}</td>
        <td class="num">${numeroPlanilla(fila.factura)}</td>
        <td class="num">${numeroPlanilla(fila.prepizza)}</td>
        <td class="num">${numeroPlanilla(fila.rallado)}</td>
        <td class="num">${numeroPlanilla(fila.panParaRallarKg)}</td>
        <td>${htmlSeguro(fila.observacion)}</td>
        <td class="num chica">${pesos(debe)}</td>
        <td class="num chica">${pesos(cuenta)}</td>
      </tr>`;
    }).join("");

    const ventana = window.open("", "_blank");
    if (!ventana) {
      alert("El navegador bloqueo la ventana del PDF. Permiti ventanas emergentes para esta pagina.");
      return;
    }
    ventana.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reparto ${fechaTexto}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .meta { color: #4b5563; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #2f67b1; color: white; text-align: left; }
  th, td { border: 1px solid #9db5d4; padding: 6px 7px; vertical-align: top; }
  tbody tr:nth-child(odd) { background: #dbe8fb; }
  .num { text-align: right; white-space: nowrap; }
  .kg { font-weight: 700; font-size: 14px; }
  .chica { font-size: 11px; }
  .acciones { margin: 0 0 12px; }
  button { padding: 8px 12px; font-weight: 700; }
  @media print { .acciones { display: none; } }
</style>
</head>
<body>
  <div class="acciones"><button onclick="window.print()">Guardar / imprimir PDF</button></div>
  <h1>Reparto ${fechaTexto}</h1>
  <div class="meta">Panaderia Josue - generado ${generado}</div>
  <table>
    <thead>
      <tr>
        <th>Cliente</th>
        <th>Kg pan</th>
        <th>Fact.</th>
        <th>Prepizza</th>
        <th>Pan rallado</th>
        <th>Pan para rallar</th>
        <th>Observaciones</th>
        <th>Debe</th>
        <th>Cuenta</th>
      </tr>
    </thead>
    <tbody>${filasHtml}</tbody>
  </table>
  <script>setTimeout(() => window.print(), 300);<\/script>
</body>
</html>`);
    ventana.document.close();
  };

  try {
    renderPedidosInicio();
    if (document.body.dataset.page === "reparto" && typeof renderReparto === "function") renderReparto();
  } catch (error) {
    console.warn("No se pudo aplicar hotfix de pedidos", error);
  }
})();
