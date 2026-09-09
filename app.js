import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup,
  signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

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
getRedirectResult(auth).catch((err) => {
  if (err) {
    console.error("Resultado de redirección de Google:", err);
    const errorEl = $("loginError");
    if (errorEl) errorEl.textContent = firebaseAuthMessage(err);
  }
});

const pecesCol = collection(db, "peces");

// Autenticación: funciones globales para que los botones de ingreso
// sigan funcionando aunque el navegador tenga problemas con listeners dinámicos.
window.ingresarConCorreo = async function(){
  const email=$("loginEmail")?.value.trim() || "";
  const password=$("loginPassword")?.value || "";
  const errorBox=$("loginError");
  const btn=$("loginBtn");
  if(!email || !password){
    if(errorBox) errorBox.textContent="Escribe tu correo y contraseña.";
    return;
  }
  if(errorBox) errorBox.textContent="";
  if(btn){btn.disabled=true;btn.textContent="Ingresando…";}
  try{
    await signInWithEmailAndPassword(auth,email,password);
  }catch(err){
    console.error("LOGIN EMAIL",err);
    if(errorBox){
      const map={
        "auth/invalid-credential":"Correo o contraseña incorrectos.",
        "auth/invalid-email":"El correo no es válido.",
        "auth/user-not-found":"No existe una cuenta con ese correo.",
        "auth/wrong-password":"La contraseña no es correcta.",
        "auth/too-many-requests":"Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
        "auth/operation-not-allowed":"El acceso por correo y contraseña no está habilitado en Firebase."
      };
      errorBox.textContent=map[err.code] || `No se pudo ingresar (${err.code||"error"}).`;
    }
  }finally{
    if(btn){btn.disabled=false;btn.textContent="Ingresar";}
  }
};

window.ingresarConGoogle = async function(){
  const errorBox=$("loginError");
  const btn=$("googleLoginBtn");
  if(errorBox) errorBox.textContent="";
  if(btn){btn.disabled=true;btn.textContent="Conectando con Google…";}
  try{
    await signInWithPopup(auth,googleProvider);
  }catch(err){
    console.error("LOGIN GOOGLE",err);
    // Si el navegador bloquea la ventana emergente, usamos redirección.
    if(err?.code==="auth/popup-blocked" || err?.code==="auth/popup-cancelled-by-user"){
      try{
        const { signInWithRedirect } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");
        await signInWithRedirect(auth,googleProvider);
        return;
      }catch(redirectErr){
        console.error("LOGIN GOOGLE REDIRECT",redirectErr);
        err=redirectErr;
      }
    }
    if(errorBox){
      const map={
        "auth/unauthorized-domain":"Este dominio todavía no está autorizado en Firebase Authentication.",
        "auth/popup-closed-by-user":"La ventana de Google se cerró. Vuelve a intentarlo.",
        "auth/cancelled-popup-request":"La ventana de Google fue cancelada. Vuelve a intentarlo.",
        "auth/network-request-failed":"No hay conexión con Firebase. Revisa internet e inténtalo de nuevo."
      };
      errorBox.textContent=map[err.code] || `No se pudo iniciar con Google (${err.code||"error"}).`;
    }
  }finally{
    if(btn){btn.disabled=false;btn.textContent="Continuar con Google";}
  }
};

const ZONAS = {
  superficie: {label:"Superficie", color:"#C97B3D"},
  media: {label:"Media agua", color:"#4A90A4"},
  fondo: {label:"Fondo", color:"#2B4C5C"}
};
const TEMPERAMENTOS = {pacifico:"Pacífico","semi-agresivo":"Semi-agresivo",agresivo:"Agresivo"};
const CUIDADOS = {
  facil:{label:"Fácil",color:"#6B8E6B"},
  medio:{label:"Medio",color:"#C9A23D"},
  dificil:{label:"Difícil",color:"#B35B4A"}
};

const $ = id => document.getElementById(id);
const STORE_NAME_KEY = "catalogoPeces.storeName";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FIRESTORE_IMAGE_BYTES = 500 * 1024;

let catalogo=[], busqueda="", filtroZona=null, filtroCuidado=null;
let expandido=null, vistaInterna=true, editando=null, fotoTemp=null;
let guardando=false, usuarioActual=null, unsubscribeCatalogo=null;

function setStoreName(value){
  const name=String(value||"").trim().slice(0,40)||"Mi Acuario";
  localStorage.setItem(STORE_NAME_KEY,name);
  $("storeName").value=name;
}
setStoreName(localStorage.getItem(STORE_NAME_KEY)||"Mi Acuario");
$("storeName").addEventListener("change",e=>setStoreName(e.target.value));
$("storeName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.target.blur()}});

function banner(msg,type="info"){
  const box=$("statusBanner"); box.textContent="";
  if(!msg)return;
  const el=document.createElement("div"); el.className=`banner ${type}`; el.textContent=msg; box.appendChild(el);
}
function safeNumber(id){
  const raw=$(id).value.trim();
  if(raw==="") return null;
  const n=Number(raw);
  return Number.isFinite(n)?n:NaN;
}
function validarDatos(d){
  const e=[];
  if(!d.nombreComun)e.push("falta el nombre común");
  if(!d.nombreCientifico)e.push("falta el nombre científico");
  for(const [label,v] of [["Tamaño adulto",d.tamanoCm],["Longevidad",d.longevidadAnios],["Acuario mínimo",d.acuarioMinL],["Precio",d.precio],["Stock",d.stock]]){
    if(v!==null&&(!Number.isFinite(v)||v<0))e.push(`${label} inválido`);
  }
  if(d.cardumenMin!==null&&(!Number.isFinite(d.cardumenMin)||d.cardumenMin<1))e.push("el grupo mínimo debe ser al menos 1");
  if(d.phMin!==null&&(!Number.isFinite(d.phMin)||d.phMin<0||d.phMin>14))e.push("pH mínimo fuera de rango");
  if(d.phMax!==null&&(!Number.isFinite(d.phMax)||d.phMax<0||d.phMax>14))e.push("pH máximo fuera de rango");
  if(d.phMin!==null&&d.phMax!==null&&d.phMin>d.phMax)e.push("pH mínimo mayor que pH máximo");
  if(d.tempMinC!==null&&d.tempMaxC!==null&&d.tempMinC>d.tempMaxC)e.push("temperatura mínima mayor que temperatura máxima");
  return e.length?"Revisa: "+e.join(", ")+".":"";
}

onAuthStateChanged(auth,user=>{
  if(user){
    usuarioActual=user;
    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    if(!unsubscribeCatalogo) iniciarSuscripcion();
  }else{
    usuarioActual=null;
    $("loginScreen").classList.remove("hidden");
    $("app").classList.add("hidden");
    if(unsubscribeCatalogo){unsubscribeCatalogo();unsubscribeCatalogo=null}
    catalogo=[]; render();
  }
});

$("loginBtn").addEventListener("click",()=>window.ingresarConCorreo());
$("loginEmail").addEventListener("keydown",e=>{if(e.key==="Enter")window.ingresarConCorreo()});
$("loginPassword").addEventListener("keydown",e=>{if(e.key==="Enter")window.ingresarConCorreo()});
$("googleLoginBtn").addEventListener("click",()=>window.ingresarConGoogle());
$("logoutBtn").addEventListener("click",()=>signOut(auth));

function iniciarSuscripcion(){
  unsubscribeCatalogo=onSnapshot(
    query(pecesCol,where("ownerUid","==",auth.currentUser.uid)),
    snap=>{
      catalogo=snap.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>String(a.nombreComun||"").localeCompare(String(b.nombreComun||""),"es"));
      banner(""); render();
    },
    err=>{console.error(err);banner("No se pudo conectar con Firebase. Revisa las reglas de seguridad.","error")}
  );
}

function renderFiltros(){
  $("filterZona").innerHTML=Object.entries(ZONAS).map(([k,v])=>chipHtml(k,v.label,v.color,filtroZona===k,"zona")).join("");
  $("filterCuidado").innerHTML=Object.entries(CUIDADOS).map(([k,v])=>chipHtml(k,"Cuidado "+v.label.toLowerCase(),v.color,filtroCuidado===k,"cuidado")).join("");
}
function chipHtml(key,label,color,active,group){
  return `<button class="chip ${active?"active":""}" data-group="${group}" data-key="${key}" style="border-color:${color};background:${active?color:"transparent"};color:${active?"#fff":color}">${label}</button>`;
}
function filtradosActuales(){
  return catalogo.filter(p=>{
    const texto=`${p.nombreComun||""} ${p.nombreCientifico||""} ${p.familia||""}`.toLowerCase();
    if(busqueda&&!texto.includes(busqueda.toLowerCase()))return false;
    if(filtroZona&&p.zona!==filtroZona)return false;
    if(filtroCuidado&&p.cuidado!==filtroCuidado)return false;
    return true;
  });
}
function render(){
  const filtrados=filtradosActuales();
  $("countRow").textContent=`${filtrados.length} ${filtrados.length===1?"especie":"especies"} mostradas`;
  $("totalCount").textContent=catalogo.length;
  $("familyCount").textContent=new Set(catalogo.map(p=>String(p.familia||"").trim().toLowerCase()).filter(Boolean)).size;
  $("waterCount").textContent=new Set(catalogo.map(p=>p.zona).filter(Boolean)).size;
  $("stockCount").textContent=catalogo.reduce((sum,p)=>sum+(Number(p.stock)||0),0);
  $("clearSearch").classList.toggle("hidden",!busqueda);
  $("clearFilters").classList.toggle("hidden",!(busqueda||filtroZona||filtroCuidado));
  document.querySelectorAll(".internal-only").forEach(el=>el.classList.toggle("hidden",!vistaInterna));
  if(!filtrados.length){
    $("list").innerHTML=`<div class="empty">${catalogo.length?"No hay especies que coincidan con los filtros.":"Aún no tienes especies en el catálogo. Pulsa “＋ Agregar especie” para comenzar."}</div>`;
    return;
  }
  $("list").innerHTML=filtrados.map((p,i)=>entryHtml(p,i)).join("");
}
function entryHtml(p,i){
  const zona=ZONAS[p.zona]||ZONAS.media, cuidado=CUIDADOS[p.cuidado]||CUIDADOS.facil;
  const open=expandido===p.id;
  const stock=vistaInterna?`<span class="badge" style="color:${p.stock>0?"#4A7A5C":"#B35B4A"};border-color:${p.stock>0?"#4A7A5C":"#B35B4A"}">${p.stock??0} en stock</span>`:"";
  const price=vistaInterna?`<div class="price">$${Number(p.precio||0).toLocaleString("es-CO")}</div>`:"";
  return `<article class="entry" style="border-left-color:${zona.color}">
    <div class="entry-head" data-id="${p.id}">
      <div class="thumb">${p.foto?`<img src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.nombreComun)}" loading="lazy">`:"🐟"}</div>
      <div>
        <div class="entry-index">${String(i+1).padStart(2,"0")}</div>
        <div class="entry-name">${escapeHtml(p.nombreComun)}</div>
        <div class="entry-latin">${escapeHtml(p.nombreCientifico)}</div>
        <div class="badge-row">
          <span class="badge" style="color:${zona.color};border-color:${zona.color}">${zona.label}</span>
          <span class="badge" style="color:${cuidado.color};border-color:${cuidado.color}">${cuidado.label}</span>
          ${stock}
        </div>
      </div>
      <div class="entry-right">${price}<span class="chevron ${open?"open":""}">▾</span></div>
    </div>
    ${open?detailHtml(p):""}
  </article>`;
}
function detailHtml(p){
  const photo=p.foto?`<img src="${escapeHtml(p.foto)}" class="detail-photo" alt="${escapeHtml(p.nombreComun)}" loading="lazy">`:"";
  const actions=vistaInterna?`<div class="actions-row"><button class="edit-btn" data-edit="${p.id}">✎ Editar</button><button class="del-btn" data-del="${p.id}">🗑 Eliminar</button></div>`:"";
  return `<div class="detail">${photo}
    <div class="stat-grid">
      ${stat("Tamaño adulto",p.tamanoCm!=null?`${p.tamanoCm} cm`:"-")}
      ${stat("Temperatura",`${p.tempMinC??"-"}–${p.tempMaxC??"-"} °C`)}
      ${stat("pH",`${p.phMin??"-"}–${p.phMax??"-"}`)}
      ${stat("Acuario mínimo",p.acuarioMinL!=null?`${p.acuarioMinL} L`:"-")}
      ${stat("Grupo mínimo",p.cardumenMin===1?"Solitario":p.cardumenMin!=null?`${p.cardumenMin} ejemplares`:"-")}
      ${stat("Temperamento",TEMPERAMENTOS[p.temperamento]||"-")}
      ${stat("Reproducción",p.reproduccion==="oviparo"?"Ovíparo":p.reproduccion==="viviparo"?"Vivíparo":"-")}
      ${stat("Longevidad",p.longevidadAnios!=null?`${p.longevidadAnios} años`:"-")}
    </div>
    ${line("Alimentación",p.alimentacion)}${line("Compatibilidad",p.compatibilidad)}${line("Origen",p.origen)}${p.notas?line("Notas",p.notas):""}
    ${actions}
  </div>`;
}
function stat(label,value){return `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${escapeHtml(value)}</div></div>`}
function line(label,value){return `<div class="detail-line"><b>${label}:</b><span>${escapeHtml(value||"-")}</span></div>`}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}


function labelValor(value, fallback="—"){
  const v=String(value??"").trim();
  return escapeHtml(v||fallback);
}
function rangeValue(a,b,suffix=""){
  const av=a!==null&&a!==undefined&&a!==""?a:null;
  const bv=b!==null&&b!==undefined&&b!==""?b:null;
  if(av===null&&bv===null)return "—";
  if(av!==null&&bv!==null)return `${av}–${bv}${suffix}`;
  return `${av??bv}${suffix}`;
}
function availabilityHtml(p){
  const stock=Number(p.stock)||0;
  return `<span class="availability ${stock>0?"available":"soldout"}">${stock>0?"✓ Disponible":"Agotado"}</span>`;
}
function infoCard(icon,title,value,accent=""){
  return `<div class="info-card ${accent}"><div class="info-icon">${icon}</div><div><div class="info-title">${title}</div><div class="info-value">${value}</div></div></div>`;
}
function detailModalHtml(p){
  const zona=ZONAS[p.zona]||ZONAS.media;
  const cuidado=CUIDADOS[p.cuidado]||CUIDADOS.facil;
  const photo=p.foto?`<img class="detail-hero-photo" src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.nombreComun||"Pez")}">`:`<div class="detail-hero-placeholder">🐟</div>`;
  const thumbs=p.foto?`<div class="detail-thumb active">${photo.replace('class="detail-hero-photo"','class="detail-thumb-img"')}</div>`:"";
  const internal=vistaInterna;
  const price=internal&&p.precio!=null?`<div class="price-big">$${Number(p.precio||0).toLocaleString("es-CO")}</div>`:"";
  const stock=internal?availabilityHtml(p):"";
  const actions=internal?`<button class="detail-action edit" data-detail-edit="${p.id}">✎ Editar</button><button class="detail-action danger" data-detail-delete="${p.id}">🗑 Eliminar</button>`:"";
  const vars=String(p.variedades||"").split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
  return `<div class="detail-hero">
      <div class="detail-gallery"><div class="detail-main-photo">${photo}</div>${vars.length?`<div class="detail-variety-row">${vars.map(v=>`<span>${escapeHtml(v)}</span>`).join("")}</div>`:""}${thumbs?`<div class="detail-thumbs">${thumbs}</div>`:""}</div>
      <div class="detail-intro">
        <div class="detail-eyebrow">FICHA DE ESPECIE</div>
        <div class="detail-title-row"><div><h2 id="detailTitle">${escapeHtml(p.nombreComun||"Sin nombre")}</h2><div class="detail-scientific">${escapeHtml(p.nombreCientifico||"")}</div></div><span class="care-pill" style="border-color:${cuidado.color};color:${cuidado.color}">★ ${cuidado.label}</span></div>
        ${p.familia?`<div class="family-pill">♧ Familia: ${escapeHtml(p.familia)}</div>`:""}
        ${p.notas?`<p class="detail-description">${escapeHtml(p.notas)}</p>`:`<p class="detail-description">Ficha profesional de ${escapeHtml(p.nombreComun||"esta especie")}, con información de cuidado y manejo para consulta rápida.</p>`}
        <div class="core-grid">
          ${infoCard("💧","Zona de nado",`<span style="color:${zona.color}">${escapeHtml(zona.label)}</span>`) }
          ${infoCard("🌡️","Temperatura",rangeValue(p.tempMinC,p.tempMaxC," °C"),"warm")}
          ${infoCard("pH","pH",rangeValue(p.phMin,p.phMax),"ph")}
          ${infoCard("🐟","Tamaño adulto",p.tamanoCm!=null?`${escapeHtml(p.tamanoCm)} cm`:"—")}
          ${infoCard("▣","Acuario mínimo",p.acuarioMinL!=null?`${escapeHtml(p.acuarioMinL)} litros`:"—")}
          ${infoCard("◉","Grupo mínimo",p.cardumenMin===1?"Solitario":p.cardumenMin!=null?`${escapeHtml(p.cardumenMin)} ejemplares`:"—")}
        </div>
        ${internal?`<div class="detail-commercial"><div><div class="commercial-label">Precio</div>${price||"<div class=\"price-big\">Consultar</div>"}</div><div><div class="commercial-label">Disponibilidad</div>${stock}</div></div>`:""}
      </div>
    </div>
    <div class="detail-section-grid">
      ${infoCard("🍽️","Alimentación",labelValor(p.alimentacion),"wide")}
      ${infoCard("👥","Compatibilidad",labelValor(p.compatibilidad),"wide")}
      ${infoCard("🛡️","Temperamento",TEMPERAMENTOS[p.temperamento]||"—")}
      ${infoCard("🌎","Origen",labelValor(p.origen))}
      ${infoCard("♻️","Reproducción",p.reproduccion==="oviparo"?"Ovíparo":p.reproduccion==="viviparo"?"Vivíparo":"—")}
      ${infoCard("⏳","Longevidad",p.longevidadAnios!=null?`${escapeHtml(p.longevidadAnios)} años`:"—")}
    </div>
    <div class="detail-bottom">
      <div class="detail-note"><strong>Variedades comunes</strong><div>${vars.length?vars.map(v=>`<span>${escapeHtml(v)}</span>`).join(""):"No registradas"}</div></div>
      ${internal?`<div class="detail-note stock-note"><strong>Stock</strong><div class="stock-number">${Number(p.stock)||0}<small> ejemplares</small></div></div>`:""}
    </div>
    <div class="detail-actions-bar">
      <button class="detail-action print" data-detail-print="${p.id}">🖨 Imprimir ficha</button>
      <button class="detail-action share" data-detail-share="${p.id}">↗ Compartir</button>
      ${internal?`<div class="detail-spacer"></div>${actions}`:""}
    </div>`;
}
function openDetailModal(id){
  const p=catalogo.find(x=>x.id===id); if(!p)return;
  expandido=id;
  $("detailBody").innerHTML=detailModalHtml(p);
  $("detailOverlay").classList.remove("hidden");
  document.body.classList.add("modal-open");
}
function closeDetailModal(){
  $("detailOverlay").classList.add("hidden");
  document.body.classList.remove("modal-open");
}
function sharePez(p){
  const text=`${p.nombreComun||"Pez"} — ${p.nombreCientifico||""}${p.familia?`\nFamilia: ${p.familia}`:""}`;
  if(navigator.share){navigator.share({title:p.nombreComun||"Ficha de pez",text}).catch(()=>{});return;}
  navigator.clipboard?.writeText(text).then(()=>banner("Datos de la especie copiados para compartir.","success")).catch(()=>banner("No se pudo copiar la ficha.","error"));
}
function printPez(p){
  const w=window.open("","_blank","width=900,height=900");
  if(!w){banner("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes.","warning");return;}
  const img=p.foto?`<img src="${escapeHtml(p.foto)}" alt="">`:"";
  const rows=[
    ["Familia",p.familia],["Zona de nado",ZONAS[p.zona]?.label],["Nivel de cuidado",CUIDADOS[p.cuidado]?.label],
    ["Temperatura",rangeValue(p.tempMinC,p.tempMaxC," °C")],["pH",rangeValue(p.phMin,p.phMax)],
    ["Tamaño adulto",p.tamanoCm!=null?`${p.tamanoCm} cm`:"—"],["Acuario mínimo",p.acuarioMinL!=null?`${p.acuarioMinL} L`:"—"],
    ["Alimentación",p.alimentacion],["Compatibilidad",p.compatibilidad],["Temperamento",TEMPERAMENTOS[p.temperamento]],
    ["Origen",p.origen],["Reproducción",p.reproduccion==="oviparo"?"Ovíparo":p.reproduccion==="viviparo"?"Vivíparo":"—"],
    ["Longevidad",p.longevidadAnios!=null?`${p.longevidadAnios} años`:"—"]
  ];
  const title = escapeHtml(p.nombreComun || "Ficha");
  const scientific = escapeHtml(p.nombreCientifico || "");
  const familyTag = p.familia
    ? '<div class="tag">Familia: ' + escapeHtml(p.familia) + '</div>'
    : "";
  const priceBlock = (vistaInterna && p.precio != null)
    ? '<div class="price">$' + Number(p.precio || 0).toLocaleString("es-CO") + '</div>'
    : "";
  const imageBlock = img
    ? '<div>' + img + '</div>'
    : '<div style="font-size:90px">🐟</div>';

  const tableRows = rows.map(r =>
    '<tr><td>' + escapeHtml(r[0]) + '</td><td>' + escapeHtml(r[1] || "—") + '</td></tr>'
  ).join("");

  const varietiesBlock = p.variedades
    ? '<p><b>Variedades:</b> ' + escapeHtml(p.variedades) + '</p>'
    : "";
  const notesBlock = p.notas
    ? '<p><b>Notas:</b> ' + escapeHtml(p.notas) + '</p>'
    : "";

  const printHtml =
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<title>' + title + '</title>' +
    '<style>' +
    'body{font-family:Arial,sans-serif;color:#102d30;margin:35px}' +
    'h1{margin-bottom:3px}em{color:#58716e}' +
    '.hero{display:grid;grid-template-columns:320px 1fr;gap:28px;align-items:start}' +
    '.hero img{width:320px;height:260px;object-fit:cover;border-radius:16px}' +
    'table{width:100%;border-collapse:collapse;margin-top:22px}' +
    'td{padding:9px;border-bottom:1px solid #ddd}' +
    'td:first-child{font-weight:bold;width:35%}' +
    '.tag{display:inline-block;border:1px solid #2b7b78;border-radius:20px;padding:5px 10px;margin-top:10px}' +
    '.price{font-size:22px;font-weight:bold;margin-top:16px}' +
    '@media print{body{margin:18mm}}' +
    '</style></head><body>' +
    '<div class="hero">' + imageBlock +
    '<div><div style="letter-spacing:2px;font-size:11px;color:#c97b3d">FICHA DE ESPECIE</div>' +
    '<h1>' + (title || "Sin nombre") + '</h1>' +
    '<em>' + scientific + '</em>' +
    familyTag + priceBlock +
    '</div></div>' +
    '<table>' + tableRows + '</table>' +
    varietiesBlock + notesBlock +
    '</body></html>';

  w.document.write(printHtml);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),350);
}
$("detailCloseBtn").addEventListener("click",closeDetailModal);
$("detailBackBtn").addEventListener("click",closeDetailModal);
$("detailOverlay").addEventListener("click",e=>{if(e.target.id==="detailOverlay")closeDetailModal()});
$("detailShareBtn").addEventListener("click",()=>{const id=document.querySelector("[data-detail-share]")?.dataset.detailShare;const p=catalogo.find(x=>x.id===id);if(p)sharePez(p)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("detailOverlay").classList.contains("hidden"))closeDetailModal()});
document.body.addEventListener("click",e=>{
  const share=e.target.closest("[data-detail-share]"); if(share){const p=catalogo.find(x=>x.id===share.dataset.detailShare);if(p)sharePez(p);return;}
  const print=e.target.closest("[data-detail-print]"); if(print){const p=catalogo.find(x=>x.id===print.dataset.detailPrint);if(p)printPez(p);return;}
  const edit=e.target.closest("[data-detail-edit]"); if(edit){const p=catalogo.find(x=>x.id===edit.dataset.detailEdit);closeDetailModal();openModal(p);return;}
  const del=e.target.closest("[data-detail-delete]"); if(del){closeDetailModal();eliminarPez(del.dataset.detailDelete);return;}
});

$("searchInput").addEventListener("input",e=>{busqueda=e.target.value.trim();render()});
$("clearSearch").addEventListener("click",()=>{$("searchInput").value="";busqueda="";render()});
$("clearFilters").addEventListener("click",()=>{
  busqueda="";filtroZona=null;filtroCuidado=null;$("searchInput").value="";renderFiltros();render();
});
document.body.addEventListener("click",e=>{
  const chip=e.target.closest(".chip");
  if(chip){
    const {group,key}=chip.dataset;
    if(group==="zona")filtroZona=filtroZona===key?null:key;
    if(group==="cuidado")filtroCuidado=filtroCuidado===key?null:key;
    renderFiltros();render();return;
  }
  const editBtn=e.target.closest("[data-edit]");
  if(editBtn){e.stopPropagation();openModal(catalogo.find(p=>p.id===editBtn.dataset.edit));return}
  const delBtn=e.target.closest("[data-del]");
  if(delBtn){e.stopPropagation();eliminarPez(delBtn.dataset.del);return}
  const head=e.target.closest(".entry-head");
  if(head){openDetailModal(head.dataset.id);return}
  if(e.target.id==="removeFotoBtn"){
    fotoTemp=null;
    const box=$("photoUploadBox");
    box.innerHTML=`<div class="photo-placeholder">📷<br>Haz clic para seleccionar una foto</div><input type="file" accept="image/*" id="fotoInput" style="display:none">`;
    $("fotoInput").addEventListener("change",handleFotoChange);
    e.target.remove();
  }
});
$("toggleView").addEventListener("click",()=>{
  vistaInterna=!vistaInterna;
  $("toggleView").textContent=vistaInterna?"Vista interna":"Vista cliente";
  render();
});
$("fab").addEventListener("click",()=>openModal(null));
$("heroAddBtn").addEventListener("click",()=>openModal(null));

const CAMPOS_VACIOS={
  nombreComun:"",nombreCientifico:"",familia:"",zona:"media",temperamento:"pacifico",cuidado:"facil",
  tamanoCm:"",phMin:"",phMax:"",tempMinC:"",tempMaxC:"",acuarioMinL:"",cardumenMin:"",
  alimentacion:"",compatibilidad:"",reproduccion:"oviparo",longevidadAnios:"",origen:"",variedades:"",precio:"",stock:"",notas:"",foto:null
};
function openModal(pez){
  editando=pez||null;fotoTemp=pez?pez.foto||null:null;
  $("modalTitle").textContent=pez?"Editar especie":"Agregar especie";
  $("modalBody").innerHTML=formHtml(pez||CAMPOS_VACIOS);
  $("modalOverlay").classList.remove("hidden");
  $("fotoInput").addEventListener("change",handleFotoChange);
  $("nombreComun").addEventListener("input",validarForm);
  $("nombreCientifico").addEventListener("input",validarForm);
  validarForm();
}
function closeModal(){
  $("modalOverlay").classList.add("hidden");editando=null;fotoTemp=null;guardando=false;
}
$("closeModal").addEventListener("click",closeModal);
$("cancelBtn").addEventListener("click",closeModal);
$("modalOverlay").addEventListener("click",e=>{if(e.target.id==="modalOverlay")closeModal()});
function formHtml(f){
  const sel=(obj,val)=>Object.entries(obj).map(([k,v])=>`<option value="${k}" ${k===val?"selected":""}>${typeof v==="string"?v:v.label}</option>`).join("");
  return `<div class="field"><div class="field-label">Fotografía</div>
    <label class="photo-upload" id="photoUploadBox">
      ${f.foto?`<img src="${escapeHtml(f.foto)}" alt="Vista previa">`:`<div class="photo-placeholder">📷<br>Haz clic para seleccionar una foto<br><small>Se comprime automáticamente</small></div>`}
      <input type="file" accept="image/*" id="fotoInput" style="display:none">
    </label>
    ${f.foto?`<button type="button" class="remove-photo-btn" id="removeFotoBtn">Quitar foto</button>`:""}
  </div>
  <div class="field"><div class="field-label">Nombre común *</div><input id="nombreComun" value="${escapeHtml(f.nombreComun)}" placeholder="Ej. Pez ángel"></div>
  <div class="field"><div class="field-label">Nombre científico *</div><input id="nombreCientifico" value="${escapeHtml(f.nombreCientifico)}" placeholder="Ej. Pterophyllum scalare"></div>
  <div class="field"><div class="field-label">Familia</div><input id="familia" value="${escapeHtml(f.familia)}" placeholder="Ej. Cichlidae"></div>
  <div class="row-2"><div class="field"><div class="field-label">Zona de nado</div><select id="zona">${sel(ZONAS,f.zona)}</select></div>
  <div class="field"><div class="field-label">Temperamento</div><select id="temperamento">${sel(TEMPERAMENTOS,f.temperamento)}</select></div></div>
  <div class="row-2"><div class="field"><div class="field-label">Nivel de cuidado</div><select id="cuidado">${sel(CUIDADOS,f.cuidado)}</select></div>
  <div class="field"><div class="field-label">Reproducción</div><select id="reproduccion"><option value="oviparo" ${f.reproduccion==="oviparo"?"selected":""}>Ovíparo</option><option value="viviparo" ${f.reproduccion==="viviparo"?"selected":""}>Vivíparo</option></select></div></div>
  <div class="row-2"><div class="field"><div class="field-label">Tamaño adulto (cm)</div><input type="number" min="0" step="0.1" id="tamanoCm" value="${f.tamanoCm}"></div>
  <div class="field"><div class="field-label">Longevidad (años)</div><input type="number" min="0" step="0.1" id="longevidadAnios" value="${f.longevidadAnios}"></div></div>
  <div class="row-2"><div class="field"><div class="field-label">pH mínimo</div><input type="number" min="0" max="14" step="0.1" id="phMin" value="${f.phMin}"></div>
  <div class="field"><div class="field-label">pH máximo</div><input type="number" min="0" max="14" step="0.1" id="phMax" value="${f.phMax}"></div></div>
  <div class="row-2"><div class="field"><div class="field-label">Temp. mínima (°C)</div><input type="number" step="0.1" id="tempMinC" value="${f.tempMinC}"></div>
  <div class="field"><div class="field-label">Temp. máxima (°C)</div><input type="number" step="0.1" id="tempMaxC" value="${f.tempMaxC}"></div></div>
  <div class="row-2"><div class="field"><div class="field-label">Acuario mínimo (L)</div><input type="number" min="0" step="1" id="acuarioMinL" value="${f.acuarioMinL}"></div>
  <div class="field"><div class="field-label">Grupo mínimo</div><input type="number" min="1" step="1" id="cardumenMin" value="${f.cardumenMin}"></div></div>
  <div class="field"><div class="field-label">Alimentación</div><textarea id="alimentacion" rows="2">${escapeHtml(f.alimentacion)}</textarea></div>
  <div class="field"><div class="field-label">Compatibilidad</div><textarea id="compatibilidad" rows="2">${escapeHtml(f.compatibilidad)}</textarea></div>
  <div class="field"><div class="field-label">Origen</div><input id="origen" value="${escapeHtml(f.origen)}"></div>
  <div class="field"><div class="field-label">Variedades comunes</div><input id="variedades" value="${escapeHtml(f.variedades||"")}" placeholder="Ej. Media luna, Corona, Velo"></div>
  <div class="row-2"><div class="field"><div class="field-label">Precio ($)</div><input type="number" min="0" step="100" id="precio" value="${f.precio}"></div>
  <div class="field"><div class="field-label">Stock (unidades)</div><input type="number" min="0" step="1" id="stock" value="${f.stock}"></div></div>
  <div class="field"><div class="field-label">Notas internas</div><textarea id="notas" rows="2">${escapeHtml(f.notas)}</textarea></div>`;
}
function validarForm(){
  const ok=$("nombreComun").value.trim()&&$("nombreCientifico").value.trim();
  $("saveBtn").disabled=!ok||guardando;
}
function handleFotoChange(e){
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>MAX_IMAGE_BYTES){banner("La imagen es demasiado grande. Usa una de máximo 10 MB.","error");e.target.value="";return}
  resizeImage(file).then(dataUrl=>{
    fotoTemp=dataUrl;
    const box=$("photoUploadBox");
    box.innerHTML=`<img src="${escapeHtml(dataUrl)}" alt="Vista previa"><input type="file" accept="image/*" id="fotoInput" style="display:none">`;
    $("fotoInput").addEventListener("change",handleFotoChange);
    if(!$("removeFotoBtn")){
      const btn=document.createElement("button");btn.type="button";btn.className="remove-photo-btn";btn.id="removeFotoBtn";btn.textContent="Quitar foto";
      box.parentElement.appendChild(btn);
    }
  }).catch(err=>banner(err?.message==="imagen_grande"?"La foto sigue siendo demasiado grande. Elige otra imagen.":"No se pudo procesar la imagen.","error"));
}
function resizeImage(file,maxDim=560,quality=.68){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=()=>reject(new Error("lectura"));
    reader.onload=()=>{
      const img=new Image();img.onerror=()=>reject(new Error("imagen"));
      img.onload=()=>{
        let {width,height}=img, fit=Math.min(1,maxDim/Math.max(width,height));
        width=Math.max(1,Math.round(width*fit));height=Math.max(1,Math.round(height*fit));
        const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
        let ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,width,height);
        let dataUrl=canvas.toDataURL("image/jpeg",quality);
        while(dataUrl.length*.75>MAX_FIRESTORE_IMAGE_BYTES&&(width>320||quality>.45)){
          if(quality>.45)quality-=.05;
          else{width=Math.max(320,Math.round(width*.85));height=Math.max(320,Math.round(height*.85));canvas.width=width;canvas.height=height}
          ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,width,height);dataUrl=canvas.toDataURL("image/jpeg",quality);
        }
        if(dataUrl.length*.75>MAX_FIRESTORE_IMAGE_BYTES){reject(new Error("imagen_grande"));return}
        resolve(dataUrl);
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

$("saveBtn").addEventListener("click",async()=>{
  if(guardando)return;
  const num=safeNumber;
  const datos={
    ownerUid:usuarioActual?.uid||"",
    nombreComun:$("nombreComun").value.trim(),
    nombreCientifico:$("nombreCientifico").value.trim(),
    familia:$("familia").value.trim(),
    zona:$("zona").value,temperamento:$("temperamento").value,cuidado:$("cuidado").value,reproduccion:$("reproduccion").value,
    tamanoCm:num("tamanoCm"),longevidadAnios:num("longevidadAnios"),phMin:num("phMin"),phMax:num("phMax"),
    tempMinC:num("tempMinC"),tempMaxC:num("tempMaxC"),acuarioMinL:num("acuarioMinL"),cardumenMin:num("cardumenMin"),
    alimentacion:$("alimentacion").value.trim(),compatibilidad:$("compatibilidad").value.trim(),origen:$("origen").value.trim(),
    precio:num("precio"),stock:num("stock"),notas:$("notas").value.trim()
  };
  const error=validarDatos(datos);if(error){banner(error,"error");return}
  const eraEdicion=Boolean(editando);guardando=true;$("saveBtn").disabled=true;$("saveBtn").textContent=eraEdicion?"Actualizando…":"Guardando…";
  try{
    if(!usuarioActual)throw new Error("No hay usuario autenticado");
    if(!editando){
      await addDoc(pecesCol,{...datos,foto:fotoTemp||null});
    }else{
      await updateDoc(doc(db,"peces",editando.id),{...datos,foto:fotoTemp||null});
    }
    closeModal();
    banner(eraEdicion?"Especie actualizada correctamente.":"Especie guardada correctamente.","success");
  }catch(err){
    console.error(err);
    banner("No se pudo guardar. Revisa la conexión, las reglas de Firestore o el tamaño de la foto.","error");
  }finally{
    guardando=false;
    if($("saveBtn")){$("saveBtn").disabled=false;$("saveBtn").textContent="Guardar"}
  }
});
async function eliminarPez(id){
  const pez=catalogo.find(p=>p.id===id);if(!pez)return;
  if(!window.confirm(`¿Eliminar "${pez.nombreComun||"esta especie"}"?\n\nEsta acción no se puede deshacer.`))return;
  try{
    await deleteDoc(doc(db,"peces",id));
    if(expandido===id)expandido=null;
    banner("Especie eliminada correctamente.","success");
  }catch(err){console.error(err);banner("No se pudo eliminar.","error")}
}

renderFiltros();render();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(err=>console.warn("PWA:",err)));
