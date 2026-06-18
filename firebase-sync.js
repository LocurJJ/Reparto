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

(function sincronizarFirebase() {
  const clave = "reparto-panaderia-josue";
  if (!window.firebase) return;

  try {
    if (!window.firebase.apps.length) window.firebase.initializeApp(REPARTO_FIREBASE_CONFIG);
    const ref = window.firebase.database().ref("reparto/datos");
    const setItemOriginal = localStorage.setItem.bind(localStorage);
    let aplicandoRemoto = false;

    localStorage.setItem = function setItemConFirebase(key, value) {
      setItemOriginal(key, value);
      if (key !== clave || aplicandoRemoto) return;
      try {
        ref.set(JSON.parse(value));
      } catch (error) {
        console.error("No se pudo guardar en Firebase", error);
      }
    };

    ref.on("value", (snapshot) => {
      const datosRemotos = snapshot.val();
      if (!datosRemotos) {
        const datosLocales = localStorage.getItem(clave);
        if (datosLocales) ref.set(JSON.parse(datosLocales));
        return;
      }

      const textoRemoto = JSON.stringify(datosRemotos);
      if (localStorage.getItem(clave) === textoRemoto) return;
      aplicandoRemoto = true;
      setItemOriginal(clave, textoRemoto);
      aplicandoRemoto = false;
      if (document.readyState !== "loading") window.location.reload();
    });
  } catch (error) {
    console.error("No se pudo iniciar Firebase", error);
  }
})();
