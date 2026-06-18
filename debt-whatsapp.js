(function () {
  function pesos(valor) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }).format(Number(valor) || 0);
  }

  function parseDeuda(texto) {
    const partes = texto.split(":");
    const nombre = (partes[0] || "").trim();
    const montoTexto = (partes.slice(1).join(":") || "").replace(/[^0-9-]/g, "");
    return { nombre, deuda: Number(montoTexto) || 0 };
  }

  function mensaje(nombre, deuda) {
    return `Hola ${nombre}. Como estas?\nTe queria avisar que la cuenta hasta dia de hoy (${new Date().toLocaleDateString("es-AR")}) esta en ${pesos(deuda)}`;
  }

  function copiar(texto) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(() => alert("Mensaje copiado para WhatsApp."));
      return;
    }
    const area = document.createElement("textarea");
    area.value = texto;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    alert("Mensaje copiado para WhatsApp.");
  }

  function mejorarRanking() {
    document.querySelectorAll("#topDeudas li").forEach((li) => {
      if (li.querySelector("button")) return;
      const datos = parseDeuda(li.textContent);
      li.classList.add("deuda-whatsapp");
      li.innerHTML = `<span>${li.textContent}</span>`;
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = "Copiar WhatsApp";
      boton.addEventListener("click", () => copiar(mensaje(datos.nombre, datos.deuda)));
      li.appendChild(boton);
    });
  }

  const renderOriginal = window.renderRankings;
  if (typeof renderOriginal === "function") {
    window.renderRankings = function renderRankingsConWhatsapp() {
      renderOriginal.apply(this, arguments);
      mejorarRanking();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(mejorarRanking, 250));
  } else {
    setTimeout(mejorarRanking, 250);
  }
})();
