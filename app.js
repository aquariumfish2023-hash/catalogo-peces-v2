import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Firebase del proyecto NUEVO: catalogo-peces-v2
const firebaseConfig = {
  apiKey: "AIzaSyC_JRvrypgjhvqvfrn9_ipgagw6fZ2jTWk",
  authDomain: "catalogo-peces-v2.firebaseapp.com",
  projectId: "catalogo-peces-v2",
  storageBucket: "catalogo-peces-v2.firebasestorage.app",
  messagingSenderId: "1031334048950",
  appId: "1:1031334048950:web:81ce0255022a721a052217"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const pecesCol = collection(db, "peces");

const ZONAS = {
  superficie: { label: "Superficie", color: "#C97B3D" },
  media: { label: "Media agua", color: "#4A90A4" },
  fondo: { label: "Fondo", color: "#2B4C5C" },
};
const TEMPERAMENTOS = {
  "pacifico": "Pacífico",
  "semi-agresivo": "Semi-agresivo",
  "agresivo": "Agresivo",
};
const CUIDADOS = {
  facil: { label: "Fácil", color: "#6B8E6B" },
  medio: { label: "Medio", color: "#C9A23D" },
  dificil: { label: "Difícil", color: "#B35B4A" },
};

let catalogo = [];
let busqueda = "";
let filtroZona = null;
let filtroCuidado = null;
let expandido = null;
let vistaInterna = true;
let editando = null;
let fotoTemp = null; // dataURL mientras se edita el formulario

const $ = (id) => document.getElementById(id);

const STORE_NAME_KEY = "catalogoPeces.storeName";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
let guardando = false;
let usuarioActual = null;
const MAX_FIRESTORE_IMAGE_BYTES = 500 * 1024; // margen seguro bajo el límite de 1 MiB por documento

function setStoreName(value) {
  const name = String(value || "").trim().slice(0, 40) || "Mi Acuario";
  localStorage.setItem(STORE_NAME_KEY, name);
  $("storeName").value = name;
}
setStoreName(localStorage.getItem(STORE_NAME_KEY) || "Mi Acuario");
$("storeName").addEventListener("change", () => setStoreName($("storeName").value));
$("storeName").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });

function safeNumber(id) {
  const raw = $(id).value.trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function validarDatos(datos) {
  const errores = [];
  if (!datos.nombreComun) errores.push("falta el nombre común");
  if (!datos.nombreCientifico) errores.push("falta el nombre científico");
  const noNegativos = [["Tamaño adulto", datos.tamanoCm],["Longevidad", datos.longevidadAnios],["Acuario mínimo", datos.acuarioMinL],["Precio", datos.precio],["Stock", datos.stock]];
  for (const [label, value] of noNegativos) if (value !== null && (!Number.isFinite(value) || value < 0)) errores.push(`${label} inválido`);
  if (datos.cardumenMin !== null && (!Number.isFinite(datos.cardumenMin) || datos.cardumenMin < 1)) errores.push("el grupo mínimo debe ser al menos 1");
  if (datos.phMin !== null && (!Number.isFinite(datos.phMin) || datos.phMin < 0 || datos.phMin > 14)) errores.push("pH mínimo fuera de rango");
  if (datos.phMax !== null && (!Number.isFinite(datos.phMax) || datos.phMax < 0 || datos.phMax > 14)) errores.push("pH máximo fuera de rango");
  if (datos.phMin !== null && datos.phMax !== null && datos.phMin > datos.phMax) errores.push("pH mínimo mayor que pH máximo");
  if (datos.tempMinC !== null && datos.tempMaxC !== null && datos.tempMinC > datos.tempMaxC) errores.push("temperatura mínima mayor que temperatura máxima");
  return errores.length ? "Revisa: " + errores.join(", ") + "." : "";
}


function banner(msg, type = "info") {
  const box = $("statusBanner");
  box.textContent = "";
  if (!msg) return;
  const el = document.createElement("div");
  el.className = `banner ${type}`;
  el.textContent = msg;
  box.appendChild(el);
}

// ---------- Autenticación ----------
let unsubscribeCatalogo = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActual = user;
    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    if (!unsubscribeCatalogo) iniciarSuscripcion();
  } else {
    usuarioActual = null;
    $("loginScreen").classList.remove("hidden");
    $("app").classList.add("hidden");
    if (unsubscribeCatalogo) { unsubscribeCatalogo(); unsubscribeCatalogo = null; }
    catalogo = [];
  }
});

$("loginBtn").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  $("loginError").textContent = "";
  $("loginBtn").disabled = true;
  $("loginBtn").textContent = "Ingresando…";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    $("loginError").textContent = "Correo o contraseña incorrectos.";
  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "Ingresar";
  }
});
$("loginEmail").addEventListener("keydown", (e) => { if (e.key === "Enter") $("loginBtn").click(); });
$("loginPassword").addEventListener("keydown", (e) => { if (e.key === "Enter") $("loginBtn").click(); });

const googleLoginBtn = $("googleLoginBtn");
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    $("loginError").textContent = "";
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = "Conectando…";
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      $("loginError").textContent = "No se pudo iniciar con Google. Intenta de nuevo.";
    } finally {
      googleLoginBtn.disabled = false;
      googleLoginBtn.textContent = "Continuar con Google";
    }
  });
}

$("logoutBtn").addEventListener("click", () => signOut(auth));

// ---------- Firestore realtime ----------
function iniciarSuscripcion() {
  unsubscribeCatalogo = onSnapshot(
    query(pecesCol, where("ownerUid", "==", auth.currentUser.uid)),
    (snap) => {
      catalogo = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(a.nombreComun || "").localeCompare(String(b.nombreComun || ""), "es"));
      banner("");
      render();
    },
    (err) => {
      console.error(err);
      banner("No se pudo conectar con Firebase. Revisa las reglas de seguridad.", "error");
    }
  );
}

// ---------- Render ----------
function renderFiltros() {
  $("filterZona").innerHTML = Object.entries(ZONAS)
    .map(([k, v]) => chipHtml(k, v.label, v.color, filtroZona === k, "zona"))
    .join("");
  $("filterCuidado").innerHTML = Object.entries(CUIDADOS)
    .map(([k, v]) => chipHtml(k, "Cuidado " + v.label.toLowerCase(), v.color, filtroCuidado === k, "cuidado"))
    .join("");
}
function chipHtml(key, label, color, active, group) {
  return `<button class="chip ${active ? "active" : ""}" data-group="${group}" data-key="${key}"
    style="border-color:${color}; background:${active ? color : "transparent"}; color:${active ? "#fff" : color}">
    ${label}</button>`;
}

function render() {
  const filtrados = catalogo.filter((p) => {
    const texto = `${p.nombreComun} ${p.nombreCientifico} ${p.familia}`.toLowerCase();
    if (busqueda && !texto.includes(busqueda.toLowerCase())) return false;
    if (filtroZona && p.zona !== filtroZona) return false;
    if (filtroCuidado && p.cuidado !== filtroCuidado) return false;
    return true;
  });

  $("countRow").textContent = `${filtrados.length} ${filtrados.length === 1 ? "especie" : "especies"}`;

  if (filtrados.length === 0) {
    $("list").innerHTML = `<div class="empty">No hay especies que coincidan con la búsqueda.</div>`;
    return;
  }

  $("list").innerHTML = filtrados.map((p, i) => entryHtml(p, i)).join("");
}

function entryHtml(p, i) {
  const zona = ZONAS[p.zona] || ZONAS.media;
  const cuidado = CUIDADOS[p.cuidado] || CUIDADOS.facil;
  const isOpen = expandido === p.id;

  const stockBadge = vistaInterna
    ? `<span class="badge" style="color:${p.stock > 0 ? "#4A7A5C" : "#B35B4A"}; border-color:${p.stock > 0 ? "#4A7A5C" : "#B35B4A"}">${p.stock ?? 0} en stock</span>`
    : "";
  const price = vistaInterna ? `<div class="price">$${p.precio ?? 0}</div>` : "";

  return `
  <div class="entry" style="border-left-color:${zona.color}">
    <div class="entry-head" data-id="${p.id}">
      <div class="thumb">${p.foto ? `<img src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.nombreComun)}" loading="lazy" />` : "🐟"}</div>
      <div style="flex:1">
        <div class="entry-index">${String(i + 1).padStart(2, "0")}</div>
        <div class="entry-name">${escapeHtml(p.nombreComun)}</div>
        <div class="entry-latin">${escapeHtml(p.nombreCientifico)}</div>
        <div class="badge-row">
          <span class="badge" style="color:${zona.color}; border-color:${zona.color}">${zona.label}</span>
          <span class="badge" style="color:${cuidado.color}; border-color:${cuidado.color}">${cuidado.label}</span>
          ${stockBadge}
        </div>
      </div>
      <div class="entry-right">
        ${price}
        <span class="chevron ${isOpen ? "open" : ""}">▾</span>
      </div>
    </div>
    ${isOpen ? detailHtml(p) : ""}
  </div>`;
}

function detailHtml(p) {
  const photo = p.foto ? `<img src="${escapeHtml(p.foto)}" class="detail-photo" alt="${escapeHtml(p.nombreComun)}" loading="lazy" />` : "";
  const actions = vistaInterna
    ? `<div class="actions-row">
        <button class="edit-btn" data-edit="${p.id}">✎ Editar</button>
        <button class="del-btn" data-del="${p.id}">🗑 Eliminar</button>
      </div>`
    : "";
  return `
  <div class="detail">
    ${photo}
    <div class="stat-grid">
      ${stat("Tamaño adulto", `${p.tamanoCm ?? "-"} cm`)}
      ${stat("Temperatura", `${p.tempMinC ?? "-"}–${p.tempMaxC ?? "-"} °C`)}
      ${stat("pH", `${p.phMin ?? "-"}–${p.phMax ?? "-"}`)}
      ${stat("Acuario mínimo", `${p.acuarioMinL ?? "-"} L`)}
      ${stat("Grupo mínimo", p.cardumenMin === 1 ? "Solitario" : `${p.cardumenMin ?? "-"} ejemplares`)}
      ${stat("Temperamento", TEMPERAMENTOS[p.temperamento] || "-")}
      ${stat("Reproducción", p.reproduccion === "oviparo" ? "Ovíparo" : "Vivíparo")}
      ${stat("Longevidad", `${p.longevidadAnios ?? "-"} años`)}
    </div>
    <div class="detail-line"><b>Alimentación:</b> <span>${escapeHtml(p.alimentacion || "-")}</span></div>
    <div class="detail-line"><b>Compatibilidad:</b> <span>${escapeHtml(p.compatibilidad || "-")}</span></div>
    <div class="detail-line"><b>Origen:</b> <span>${escapeHtml(p.origen || "-")}</span></div>
    ${p.notas ? `<div class="detail-line"><b>Notas:</b> <span>${escapeHtml(p.notas)}</span></div>` : ""}
    ${actions}
  </div>`;
}
function stat(label, value) {
  return `<div class="stat"><div><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div></div>`;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Eventos de lista y filtros ----------
$("searchInput").addEventListener("input", (e) => { busqueda = e.target.value; render(); });

document.body.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) {
    const { group, key } = chip.dataset;
    if (group === "zona") filtroZona = filtroZona === key ? null : key;
    if (group === "cuidado") filtroCuidado = filtroCuidado === key ? null : key;
    renderFiltros();
    render();
    return;
  }
  const head = e.target.closest(".entry-head");
  if (head) {
    const id = head.dataset.id;
    expandido = expandido === id ? null : id;
    render();
    return;
  }
  const editBtn = e.target.closest("[data-edit]");
  if (editBtn) { openModal(catalogo.find((p) => p.id === editBtn.dataset.edit)); return; }
  const delBtn = e.target.closest("[data-del]");
  if (delBtn) { eliminarPez(delBtn.dataset.del); return; }
});

$("toggleView").addEventListener("click", () => {
  vistaInterna = !vistaInterna;
  $("toggleView").textContent = vistaInterna ? "Vista interna" : "Vista cliente";
  render();
});

$("fab").addEventListener("click", () => openModal(null));

// ---------- Modal / formulario ----------
const CAMPOS_VACIOS = {
  nombreComun: "", nombreCientifico: "", familia: "",
  zona: "media", temperamento: "pacifico", cuidado: "facil",
  tamanoCm: "", phMin: "", phMax: "", tempMinC: "", tempMaxC: "",
  acuarioMinL: "", cardumenMin: "", alimentacion: "", compatibilidad: "",
  reproduccion: "oviparo", longevidadAnios: "", origen: "",
  precio: "", stock: "", notas: "", foto: null,
};

function openModal(pez) {
  editando = pez;
  fotoTemp = pez ? pez.foto || null : null;
  $("modalTitle").textContent = pez ? "Editar especie" : "Agregar especie";
  $("modalBody").innerHTML = formHtml(pez || CAMPOS_VACIOS);
  $("modalOverlay").classList.remove("hidden");
  $("fotoInput").addEventListener("change", handleFotoChange);
  $("nombreComun").addEventListener("input", validarForm);
  $("nombreCientifico").addEventListener("input", validarForm);
  validarForm();
}
function closeModal() {
  $("modalOverlay").classList.add("hidden");
  editando = null;
  fotoTemp = null;
}
$("closeModal").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
$("modalOverlay").addEventListener("click", (e) => { if (e.target.id === "modalOverlay") closeModal(); });

function formHtml(f) {
  const sel = (obj, val) => Object.entries(obj).map(([k, v]) =>
    `<option value="${k}" ${k === val ? "selected" : ""}>${typeof v === "string" ? v : v.label}</option>`).join("");
  return `
    <div class="field">
      <div class="field-label">Foto</div>
      <label class="photo-upload" id="photoUploadBox">
        ${f.foto ? `<img src="${f.foto}" alt="preview" />` : `<div class="photo-placeholder">📷<br/>Toca para subir una foto</div>`}
        <input type="file" accept="image/*" id="fotoInput" style="display:none" />
      </label>
      ${f.foto ? `<button type="button" class="remove-photo-btn" id="removeFotoBtn">Quitar foto</button>` : ""}
    </div>
    <div class="field"><div class="field-label">Nombre común</div><input id="nombreComun" value="${escapeHtml(f.nombreComun)}" /></div>
    <div class="field"><div class="field-label">Nombre científico</div><input id="nombreCientifico" value="${escapeHtml(f.nombreCientifico)}" /></div>
    <div class="field"><div class="field-label">Familia</div><input id="familia" value="${escapeHtml(f.familia)}" /></div>
    <div class="row-2">
      <div class="field"><div class="field-label">Zona de nado</div><select id="zona">${sel(ZONAS, f.zona)}</select></div>
      <div class="field"><div class="field-label">Temperamento</div><select id="temperamento">${sel(TEMPERAMENTOS, f.temperamento)}</select></div>
    </div>
    <div class="row-2">
      <div class="field"><div class="field-label">Nivel de cuidado</div><select id="cuidado">${sel(CUIDADOS, f.cuidado)}</select></div>
      <div class="field"><div class="field-label">Reproducción</div>
        <select id="reproduccion">
          <option value="oviparo" ${f.reproduccion === "oviparo" ? "selected" : ""}>Ovíparo</option>
          <option value="viviparo" ${f.reproduccion === "viviparo" ? "selected" : ""}>Vivíparo</option>
        </select>
      </div>
    </div>
    <div class="row-2">
      <div class="field"><div class="field-label">Tamaño adulto (cm)</div><input type="number" id="tamanoCm" value="${f.tamanoCm}" /></div>
      <div class="field"><div class="field-label">Longevidad (años)</div><input type="number" id="longevidadAnios" value="${f.longevidadAnios}" /></div>
    </div>
    <div class="row-2">
      <div class="field"><div class="field-label">pH mínimo</div><input type="number" step="0.1" id="phMin" value="${f.phMin}" /></div>
      <div class="field"><div class="field-label">pH máximo</div><input type="number" step="0.1" id="phMax" value="${f.phMax}" /></div>
    </div>
    <div class="row-2">
      <div class="field"><div class="field-label">Temp. mínima (°C)</div><input type="number" id="tempMinC" value="${f.tempMinC}" /></div>
      <div class="field"><div class="field-label">Temp. máxima (°C)</div><input type="number" id="tempMaxC" value="${f.tempMaxC}" /></div>
    </div>
    <div class="row-2">
      <div class="field"><div class="field-label">Acuario mínimo (L)</div><input type="number" id="acuarioMinL" value="${f.acuarioMinL}" /></div>
      <div class="field"><div class="field-label">Grupo mínimo</div><input type="number" id="cardumenMin" value="${f.cardumenMin}" /></div>
    </div>
    <div class="field"><div class="field-label">Alimentación</div><textarea id="alimentacion" rows="2">${escapeHtml(f.alimentacion)}</textarea></div>
    <div class="field"><div class="field-label">Compatibilidad</div><textarea id="compatibilidad" rows="2">${escapeHtml(f.compatibilidad)}</textarea></div>
    <div class="field"><div class="field-label">Origen</div><input id="origen" value="${escapeHtml(f.origen)}" /></div>
    <div class="row-2">
      <div class="field"><div class="field-label">Precio ($)</div><input type="number" id="precio" value="${f.precio}" /></div>
      <div class="field"><div class="field-label">Stock (unidades)</div><input type="number" id="stock" value="${f.stock}" /></div>
    </div>
    <div class="field"><div class="field-label">Notas internas</div><textarea id="notas" rows="2">${escapeHtml(f.notas)}</textarea></div>
  `;
}

function validarForm() {
  const ok = $("nombreComun").value.trim() && $("nombreCientifico").value.trim();
  $("saveBtn").disabled = !ok || guardando;
}

function handleFotoChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > MAX_IMAGE_BYTES) { banner("La imagen es demasiado grande. Usa una de máximo 10 MB.", "error"); e.target.value = ""; return; }
  resizeImage(file).then((dataUrl) => {
    fotoTemp = dataUrl;
    const box = $("photoUploadBox");
    box.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="preview" /><input type="file" accept="image/*" id="fotoInput" style="display:none" />`;
    $("fotoInput").addEventListener("change", handleFotoChange);
    if (!$("removeFotoBtn")) {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "remove-photo-btn"; btn.id = "removeFotoBtn"; btn.textContent = "Quitar foto";
      box.parentElement.appendChild(btn);
    }
  }).catch((err) => banner(err?.message === "imagen_grande" ? "La foto sigue siendo demasiado grande. Elige otra imagen." : "No se pudo procesar la imagen.", "error"));
}

function resizeImage(file, maxDim = 560, quality = 0.68) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("lectura"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("imagen"));
      img.onload = () => {
        let { width, height } = img;
        const fit = Math.min(1, maxDim / Math.max(width, height));
        width = Math.max(1, Math.round(width * fit));
        height = Math.max(1, Math.round(height * fit));
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        // Firestore tiene un límite de 1 MiB por documento; dejamos margen para los demás campos.
        while (dataUrl.length * 0.75 > MAX_FIRESTORE_IMAGE_BYTES && (width > 320 || quality > 0.45)) {
          if (quality > 0.45) quality -= 0.05;
          else { width = Math.max(320, Math.round(width * 0.85)); height = Math.max(320, Math.round(height * 0.85)); canvas.width = width; canvas.height = height; }
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        if (dataUrl.length * 0.75 > MAX_FIRESTORE_IMAGE_BYTES) {
          reject(new Error("imagen_grande"));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Guardar / eliminar en Firestore + Storage ----------
$("saveBtn").addEventListener("click", async () => {
  if (guardando) return;
  const num = safeNumber;
  const datos = {
    ownerUid: usuarioActual?.uid || "",
    nombreComun: $("nombreComun").value.trim(), nombreCientifico: $("nombreCientifico").value.trim(), familia: $("familia").value.trim(),
    zona: $("zona").value, temperamento: $("temperamento").value, cuidado: $("cuidado").value, reproduccion: $("reproduccion").value,
    tamanoCm: num("tamanoCm"), longevidadAnios: num("longevidadAnios"), phMin: num("phMin"), phMax: num("phMax"),
    tempMinC: num("tempMinC"), tempMaxC: num("tempMaxC"), acuarioMinL: num("acuarioMinL"), cardumenMin: num("cardumenMin"),
    alimentacion: $("alimentacion").value.trim(), compatibilidad: $("compatibilidad").value.trim(), origen: $("origen").value.trim(),
    precio: num("precio"), stock: num("stock"), notas: $("notas").value.trim()
  };
  const error = validarDatos(datos);
  if (error) { banner(error, "error"); return; }
  guardando = true; $("saveBtn").disabled = true; $("saveBtn").textContent = "Guardando…";
  let docId = editando ? editando.id : null;
  const fotoOriginal = editando ? editando.foto || null : null;
  try {
    if (!usuarioActual) throw new Error("No hay usuario autenticado");
    if (!docId) {
      const nuevoRef = await addDoc(pecesCol, { ...datos, foto: fotoTemp || null });
      docId = nuevoRef.id;
    } else {
      await updateDoc(doc(db, "peces", docId), { ...datos, foto: fotoTemp || null });
    }
    closeModal();
    banner(editando ? "Especie actualizada correctamente." : "Especie guardada correctamente.", "success");
  } catch (err) {
    console.error(err);
    banner("No se pudo guardar. Revisa la conexión, las reglas de Firestore o el tamaño de la foto.", "error");
  } finally {
    guardando = false; $("saveBtn").disabled = false; $("saveBtn").textContent = "Guardar"; validarForm();
  }
});

async function eliminarPez(id) {
  const pez = catalogo.find((p) => p.id === id);
  if (!pez) return;
  if (!window.confirm(`¿Eliminar "${pez.nombreComun || "esta especie"}"?\n\nEsta acción no se puede deshacer.`)) return;
  try {
    await deleteDoc(doc(db, "peces", id));
    if (expandido === id) expandido = null;
  } catch (err) {
    console.error(err);
    banner("No se pudo eliminar.", "error");
  }
}

// Delegación para el botón "quitar foto" dentro del modal (se re-crea con innerHTML)
document.body.addEventListener("click", (e) => {
  if (e.target.id === "removeFotoBtn") {
    fotoTemp = null;
    const box = $("photoUploadBox");
    box.innerHTML = `<div class="photo-placeholder">📷<br/>Toca para subir una foto</div><input type="file" accept="image/*" id="fotoInput" style="display:none" />`;
    $("fotoInput").addEventListener("change", handleFotoChange);
    e.target.remove();
  }
});

renderFiltros();
render();

if ("serviceWorker" in navigator) { window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("PWA:", err))); }
