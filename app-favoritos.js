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


// ============================================================
// CATÁLOGO INTERNO AUTOMÁTICO — sin APIs externas y gratuito
// ============================================================
const FICHAS_BASE = [
  {nombreComun:"Betta splendens", nombreCientifico:"Betta splendens", familia:"Osphronemidae", zona:"superficie", temperamento:"semi-agresivo", cuidado:"facil", tamanoCm:7, phMin:6, phMax:8, tempMinC:24, tempMaxC:28, acuarioMinL:20, cardumenMin:1, alimentacion:"Alimento de buena calidad para bettas, pellets y ocasionalmente alimento vivo o congelado.", compatibilidad:"Preferiblemente solitario; los machos no deben mantenerse juntos.", origen:"Tailandia, Camboya, Laos y Vietnam", variedades:"Plakat, Halfmoon, Crowntail, Veiltail, Koi, Galaxy", reproduccion:"oviparo", longevidadAnios:3, notas:"Especie laberíntida que puede respirar aire atmosférico."},
  {nombreComun:"Guppy", nombreCientifico:"Poecilia reticulata", familia:"Poeciliidae", zona:"superficie", temperamento:"pacifico", cuidado:"facil", tamanoCm:5, phMin:6.8, phMax:8, tempMinC:22, tempMaxC:28, acuarioMinL:40, cardumenMin:6, alimentacion:"Escamas, microgránulos y alimento congelado o vivo variado.", compatibilidad:"Muy pacífico; ideal con otros peces comunitarios de tamaño similar.", origen:"Venezuela, Guyana, Trinidad y norte de Brasil", variedades:"Moscow, Cobra, Tuxedo, Dumbo, Endler", reproduccion:"viviparo", longevidadAnios:2, notas:"Reproductor muy prolífico; conviene mantener una proporción adecuada entre machos y hembras."},
  {nombreComun:"Platy", nombreCientifico:"Xiphophorus maculatus", familia:"Poeciliidae", zona:"media", temperamento:"pacifico", cuidado:"facil", tamanoCm:6, phMin:7, phMax:8.2, tempMinC:22, tempMaxC:28, acuarioMinL:60, cardumenMin:6, alimentacion:"Escamas y gránulos con aporte vegetal, complementados con alimento congelado.", compatibilidad:"Excelente para acuarios comunitarios tranquilos.", origen:"México y América Central", variedades:"Mickey Mouse, Red Wagtail, Sunset, Tuxedo", reproduccion:"viviparo", longevidadAnios:3, notas:"Activo y resistente, recomendado para principiantes."},
  {nombreComun:"Molly", nombreCientifico:"Poecilia sphenops", familia:"Poeciliidae", zona:"media", temperamento:"pacifico", cuidado:"facil", tamanoCm:10, phMin:7, phMax:8.5, tempMinC:24, tempMaxC:28, acuarioMinL:80, cardumenMin:4, alimentacion:"Escamas, gránulos y alimentos con contenido vegetal.", compatibilidad:"Pacífico con especies comunitarias de tamaño similar.", origen:"México, América Central y norte de Sudamérica", variedades:"Black, Dalmatian, Gold Dust, Lyretail, Balloon", reproduccion:"viviparo", longevidadAnios:4, notas:"Aprecia agua mineralizada y buena filtración."},
  {nombreComun:"Pez ángel", nombreCientifico:"Pterophyllum scalare", familia:"Cichlidae", zona:"media", temperamento:"pacifico", cuidado:"medio", tamanoCm:15, phMin:6, phMax:7.5, tempMinC:24, tempMaxC:30, acuarioMinL:150, cardumenMin:5, alimentacion:"Pellets para cíclidos, escamas de calidad y alimento congelado variado.", compatibilidad:"Comunitario cuando se mantiene con peces tranquilos y suficientemente grandes.", origen:"Cuenca del Amazonas y otros ríos de Sudamérica", variedades:"Koi, Gold, Marble, Black, Zebra", reproduccion:"oviparo", longevidadAnios:10, notas:"Necesita altura de acuario y espacio para formar territorios."},
  {nombreComun:"Pez disco", nombreCientifico:"Symphysodon spp.", familia:"Cichlidae", zona:"media", temperamento:"pacifico", cuidado:"dificil", tamanoCm:20, phMin:5.5, phMax:7, tempMinC:27, tempMaxC:30, acuarioMinL:250, cardumenMin:5, alimentacion:"Alimento especializado, gránulos y alimentos congelados de alta calidad.", compatibilidad:"Pacífico, pero sensible a compañeros competitivos y a cambios de agua.", origen:"Cuenca del Amazonas", variedades:"Turquoise, Blue Diamond, Pigeon Blood, Red Melon, Leopard", reproduccion:"oviparo", longevidadAnios:10, notas:"Requiere excelente calidad de agua, estabilidad y cambios frecuentes."},
  {nombreComun:"Corydora", nombreCientifico:"Corydoras spp.", familia:"Callichthyidae", zona:"fondo", temperamento:"pacifico", cuidado:"facil", tamanoCm:6, phMin:6, phMax:7.5, tempMinC:22, tempMaxC:27, acuarioMinL:60, cardumenMin:6, alimentacion:"Tabletas para peces de fondo, gránulos hundibles y alimentos congelados.", compatibilidad:"Muy pacífica y excelente para acuarios comunitarios.", origen:"Sudamérica", variedades:"Panda, Bronze, Sterbai, Julii, Albino", reproduccion:"oviparo", longevidadAnios:5, notas:"Debe mantenerse en grupo y sobre sustrato suave para proteger sus barbillas."},
  {nombreComun:"Ancistrus", nombreCientifico:"Ancistrus spp.", familia:"Loricariidae", zona:"fondo", temperamento:"pacifico", cuidado:"facil", tamanoCm:12, phMin:6, phMax:7.8, tempMinC:23, tempMaxC:28, acuarioMinL:80, cardumenMin:1, alimentacion:"Tabletas vegetales, verduras escaldadas y alimento para peces de fondo.", compatibilidad:"Pacífico; puede presentar territorialidad entre machos adultos.", origen:"Sudamérica", variedades:"Super Red, Albino, Longfin, Calico", reproduccion:"oviparo", longevidadAnios:8, notas:"Agradece troncos naturales para refugio y alimentación."},
  {nombreComun:"Tetra neón", nombreCientifico:"Paracheirodon innesi", familia:"Characidae", zona:"media", temperamento:"pacifico", cuidado:"facil", tamanoCm:4, phMin:5, phMax:7.5, tempMinC:20, tempMaxC:26, acuarioMinL:50, cardumenMin:8, alimentacion:"Microgránulos, escamas finas y pequeños alimentos congelados.", compatibilidad:"Muy pacífico; mantener en cardumen y con compañeros pequeños.", origen:"Cuenca amazónica", variedades:"Neón clásico", reproduccion:"oviparo", longevidadAnios:5, notas:"El cardumen luce mejor con iluminación moderada y vegetación."},
  {nombreComun:"Tetra cardenal", nombreCientifico:"Paracheirodon axelrodi", familia:"Characidae", zona:"media", temperamento:"pacifico", cuidado:"medio", tamanoCm:5, phMin:4.5, phMax:7, tempMinC:23, tempMaxC:28, acuarioMinL:60, cardumenMin:10, alimentacion:"Microgránulos, escamas finas y alimento congelado de pequeño tamaño.", compatibilidad:"Muy pacífico; excelente pez de cardumen.", origen:"Brasil, Colombia y Venezuela", variedades:"Cardenal clásico", reproduccion:"oviparo", longevidadAnios:5, notas:"Prefiere agua estable y ligeramente ácida."},
  {nombreComun:"Goldfish", nombreCientifico:"Carassius auratus", familia:"Cyprinidae", zona:"media", temperamento:"pacifico", cuidado:"medio", tamanoCm:25, phMin:6.5, phMax:8, tempMinC:18, tempMaxC:24, acuarioMinL:120, cardumenMin:2, alimentacion:"Pellets de calidad, vegetales y alimento congelado en cantidades controladas.", compatibilidad:"Pacífico, pero requiere compañeros compatibles con agua más fresca y buena filtración.", origen:"Asia oriental", variedades:"Oranda, Ranchu, Ryukin, Fantail, Telescopio", reproduccion:"oviparo", longevidadAnios:15, notas:"Produce bastante carga biológica; necesita gran volumen y filtración eficiente."},
  {nombreComun:"Koi", nombreCientifico:"Cyprinus carpio", familia:"Cyprinidae", zona:"media", temperamento:"pacifico", cuidado:"medio", tamanoCm:60, phMin:7, phMax:8.5, tempMinC:15, tempMaxC:25, acuarioMinL:1000, cardumenMin:3, alimentacion:"Alimento específico para koi, pellets flotantes y complementos vegetales.", compatibilidad:"Pacífico con otros koi y peces compatibles de estanque.", origen:"Asia oriental", variedades:"Kohaku, Sanke, Showa, Asagi, Shiro Utsuri", reproduccion:"oviparo", longevidadAnios:25, notas:"Idealmente debe mantenerse en estanque por su tamaño adulto."},
  {nombreComun:"Gourami enano", nombreCientifico:"Trichogaster lalius", familia:"Osphronemidae", zona:"superficie", temperamento:"pacifico", cuidado:"medio", tamanoCm:8, phMin:6, phMax:7.5, tempMinC:24, tempMaxC:28, acuarioMinL:60, cardumenMin:1, alimentacion:"Escamas, microgránulos y pequeños alimentos congelados.", compatibilidad:"Generalmente pacífico; evitar compañeros demasiado agresivos.", origen:"India, Pakistán y Bangladesh", variedades:"Blue, Neon Blue, Flame, Honey", reproduccion:"oviparo", longevidadAnios:4, notas:"Laberíntido que agradece vegetación y zonas tranquilas en superficie."},
  {nombreComun:"Ramirezi", nombreCientifico:"Mikrogeophagus ramirezi", familia:"Cichlidae", zona:"fondo", temperamento:"pacifico", cuidado:"dificil", tamanoCm:6, phMin:5, phMax:7, tempMinC:26, tempMaxC:30, acuarioMinL:60, cardumenMin:2, alimentacion:"Microgránulos y alimentos congelados o vivos de pequeño tamaño.", compatibilidad:"Pacífico, pero territorial durante la reproducción.", origen:"Venezuela y Colombia", variedades:"Electric Blue, Gold, Wild", reproduccion:"oviparo", longevidadAnios:3, notas:"Muy sensible a mala calidad de agua y cambios bruscos."},
  {nombreComun:"Escalar koi", nombreCientifico:"Pterophyllum scalare", familia:"Cichlidae", zona:"media", temperamento:"pacifico", cuidado:"medio", tamanoCm:15, phMin:6, phMax:7.5, tempMinC:24, tempMaxC:30, acuarioMinL:150, cardumenMin:5, alimentacion:"Pellets, escamas y alimentos congelados variados.", compatibilidad:"Comunitario con peces compatibles; puede depredar peces muy pequeños.", origen:"Cuenca del Amazonas", variedades:"Koi", reproduccion:"oviparo", longevidadAnios:10, notas:"Variedad de color del pez ángel; requiere un acuario alto."}
];

function buscarFichaBase(nombre){
  const n=normalizarTexto(nombre);
  if(!n)return null;
  return FICHAS_BASE.find(f=>normalizarTexto(f.nombreComun)===n) ||
         FICHAS_BASE.find(f=>normalizarTexto(f.nombreCientifico)===n) ||
         FICHAS_BASE.find(f=>normalizarTexto(f.nombreComun).includes(n) || n.includes(normalizarTexto(f.nombreComun))) || null;
}
function aplicarFichaBase(ficha){
  if(!ficha)return;
  const campos=["nombreComun","nombreCientifico","familia","zona","temperamento","cuidado","reproduccion","tamanoCm","longevidadAnios","phMin","phMax","tempMinC","tempMaxC","acuarioMinL","cardumenMin","alimentacion","compatibilidad","origen","variedades","notas"];
  campos.forEach(id=>{ if($(id) && ficha[id]!==undefined) $(id).value=ficha[id] ?? ""; });
  validarForm();
  const box=$("autoFillStatus");
  if(box){box.className="auto-fill-status success";box.innerHTML=`✓ Datos encontrados para <strong>${escapeHtml(ficha.nombreComun)}</strong>. Revisa la ficha y guarda cuando esté lista.`;}
}
function intentarCompletarFicha(){
  const nombre=$("nombreComun")?.value.trim()||"";
  const ficha=buscarFichaBase(nombre);
  if(!ficha){
    const box=$("autoFillStatus");
    if(box){box.className="auto-fill-status warning";box.textContent="No encontramos ese pez en el catálogo interno. Puedes completar la ficha manualmente y quedará guardada normalmente.";}
    return;
  }
  aplicarFichaBase(ficha);
}

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

let catalogo=[], busqueda="", filtroZona=null, filtroCuidado=null, soloFavoritos=false;
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
  for(const [label,v] of [["Tamaño adulto",d.tamanoCm],["Longevidad",d.longevidadAnios],["Acuario mínimo",d.acuarioMinL],["Precio",d.precio]]){
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
function normalizarTexto(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}
function textoBusquedaPez(p){
  return normalizarTexto([p.nombreComun,p.nombreCientifico,p.familia,p.variedades,p.origen,p.alimentacion,p.compatibilidad,p.notas].filter(Boolean).join(" "));
}
function tokensBusqueda(value){
  return normalizarTexto(value).split(/\s+/).filter(Boolean);
}
function coincideBusqueda(p, value){
  const q=normalizarTexto(value);
  if(!q)return true;
  const texto=textoBusquedaPez(p);
  return tokensBusqueda(q).every(token=>texto.includes(token));
}
function relevanciaBusqueda(p,value){
  const q=normalizarTexto(value);
  if(!q)return 0;
  const nombre=normalizarTexto(p.nombreComun);
  const cientifico=normalizarTexto(p.nombreCientifico);
  const familia=normalizarTexto(p.familia);
  let score=0;
  if(nombre===q)score+=100;
  else if(nombre.startsWith(q))score+=70;
  else if(nombre.includes(q))score+=45;
  if(cientifico===q)score+=65;
  else if(cientifico.includes(q))score+=35;
  if(familia.includes(q))score+=25;
  if(normalizarTexto(p.variedades).includes(q))score+=20;
  if(normalizarTexto(p.origen).includes(q))score+=10;
  return score;
}
function filtradosActuales(){
  return catalogo.filter(p=>{
    if(!coincideBusqueda(p,busqueda))return false;
    if(filtroZona&&p.zona!==filtroZona)return false;
    if(filtroCuidado&&p.cuidado!==filtroCuidado)return false;
    if(soloFavoritos&&!p.favorito)return false;
    return true;
  });
}
function escapeRegExp(s){return String(s||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function resaltar(texto,consulta){
  const safe=escapeHtml(texto||"");
  const tokens=[...new Set(tokensBusqueda(consulta).filter(t=>t.length>=2))];
  if(!tokens.length)return safe;
  const pattern=tokens.map(escapeRegExp).join("|");
  try{return safe.replace(new RegExp(`(${pattern})`,"gi"),"<mark>$1</mark>")}catch{return safe}
}
function renderSearchBadge(filtrados){
  const badge=$("searchResultBadge");
  if(!badge)return;
  if(!busqueda){badge.classList.add("hidden");badge.textContent="";return}
  badge.classList.remove("hidden");
  badge.textContent=`${filtrados.length} ${filtrados.length===1?"resultado":"resultados"}`;
}
function render(){
  const filtrados=filtradosActuales();
  $("countRow").textContent=`${filtrados.length} ${filtrados.length===1?"especie":"especies"} mostradas`;
  $("totalCount").textContent=catalogo.length;
  $("familyCount").textContent=new Set(catalogo.map(p=>String(p.familia||"").trim().toLowerCase()).filter(Boolean)).size;
  $("waterCount").textContent=new Set(catalogo.map(p=>p.zona).filter(Boolean)).size;
  $("clearSearch").classList.toggle("hidden",!busqueda);
  $("clearFilters").classList.toggle("hidden",!(busqueda||filtroZona||filtroCuidado||soloFavoritos));
  $("favoritesToggle")?.classList.toggle("active",soloFavoritos);
  if($("favoritesToggle")) $("favoritesToggle").textContent=soloFavoritos?"★ Ver todos":"☆ Favoritos";
  renderSearchBadge(filtrados);
  document.querySelectorAll(".internal-only").forEach(el=>el.classList.toggle("hidden",!vistaInterna));
  if(!filtrados.length){
    $("list").innerHTML=`<div class="empty">${catalogo.length?`No encontramos coincidencias para <strong>“${escapeHtml(busqueda)}”</strong>. Prueba con el nombre, una variedad o una familia.`:"Aún no tienes especies en el catálogo. Pulsa “＋ Agregar especie” para comenzar."}</div>`;
    renderSearchSuggestions();
    return;
  }
  $("list").innerHTML=filtrados.map((p,i)=>entryHtml(p,i)).join("");
  renderSearchSuggestions();
}
function entryHtml(p,i){
  const zona=ZONAS[p.zona]||ZONAS.media, cuidado=CUIDADOS[p.cuidado]||CUIDADOS.facil;
  const open=expandido===p.id;
  const price=`<div class="price">${p.precio!=null&&p.precio!==""?`$${Number(p.precio||0).toLocaleString("es-CO")}`:"Consultar"}</div>`;
  return `<article class="entry" style="border-left-color:${zona.color}">
    <div class="entry-head" data-id="${p.id}">
      <div class="thumb">${p.foto?`<img src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.nombreComun)}" loading="lazy">`:"🐟"}</div>
      <div>
        <div class="entry-index">${String(i+1).padStart(2,"0")}</div>
        <div class="entry-name">${resaltar(p.nombreComun,busqueda)}</div>
        <div class="entry-latin">${resaltar(p.nombreCientifico,busqueda)}</div>
        <div class="badge-row">
          <span class="badge" style="color:${zona.color};border-color:${zona.color}">${zona.label}</span>
          <span class="badge" style="color:${cuidado.color};border-color:${cuidado.color}">${cuidado.label}</span>
        </div>
      </div>
      <div class="entry-right"><button type="button" class="favorite-btn ${p.favorito?"active":""}" data-favorite="${p.id}" title="${p.favorito?"Quitar de favoritos":"Agregar a favoritos"}" aria-label="${p.favorito?"Quitar de favoritos":"Agregar a favoritos"}">${p.favorito?"★":"☆"}</button>${price}<span class="chevron ${open?"open":""}">▾</span></div>
    </div>
    ${open?detailHtml(p):""}
  </article>`;
}
function detailHtml(p){
  const photo=p.foto?`<img src="${escapeHtml(p.foto)}" class="detail-photo" alt="${escapeHtml(p.nombreComun)}" loading="lazy">`:"";
  const favoriteAction=`<button class="detail-action favorite-detail ${p.favorito?"active":""}" data-detail-favorite="${p.id}">${p.favorito?"★ Quitar de favoritos":"☆ Agregar a favoritos"}</button>`;
  const actions=vistaInterna?`<div class="actions-row"><button class="edit-btn" data-edit="${p.id}">✎ Editar</button><button class="del-btn" data-del="${p.id}">🗑 Eliminar</button></div>`:"";
  return `<div class="detail">${photo}
    <div class="detail-favorite-row">${favoriteAction}</div>
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
function infoCard(icon,title,value,accent=""){
  return `<div class="info-card ${accent}"><div class="info-icon">${icon}</div><div><div class="info-title">${title}</div><div class="info-value">${value}</div></div></div>`;
}
function detailModalHtml(p){
  const zona=ZONAS[p.zona]||ZONAS.media;
  const cuidado=CUIDADOS[p.cuidado]||CUIDADOS.facil;
  const photo=p.foto?`<img class="detail-hero-photo" src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.nombreComun||"Pez")}">`:`<div class="detail-hero-placeholder">🐟</div>`;
  const thumbs=p.foto?`<div class="detail-thumb active">${photo.replace('class="detail-hero-photo"','class="detail-thumb-img"')}</div>`:"";
  const internal=vistaInterna;
  const price=p.precio!=null&&p.precio!==""?`<div class="price-big">$${Number(p.precio||0).toLocaleString("es-CO")}</div>`:"<div class=\"price-big\">Consultar</div>";
  const favoriteAction=`<button class="detail-action favorite-detail ${p.favorito?"active":""}" data-detail-favorite="${p.id}">${p.favorito?"★ Quitar de favoritos":"☆ Agregar a favoritos"}</button>`;
  const actions=internal?`${favoriteAction}<button class="detail-action edit" data-detail-edit="${p.id}">✎ Editar</button><button class="detail-action danger" data-detail-delete="${p.id}">🗑 Eliminar</button>`:favoriteAction;
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
        ${`<div class="detail-commercial"><div><div class="commercial-label">Precio</div>${price}</div></div>`}
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
    </div>
    <div class="detail-actions-bar">
      <button class="detail-action print" data-detail-print="${p.id}">🖨 Imprimir ficha</button>
      <button class="detail-action share" data-detail-share="${p.id}">↗ Compartir</button><button class="detail-action whatsapp" data-whatsapp-share="${p.id}">💬 WhatsApp</button>
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
function textoCompartirPez(p){
  const tienda=($("storeName")?.value||"Mi Acuario").trim();
  const partes=[
    `🐟 ${p.nombreComun||"Pez"}`,
    p.nombreCientifico?`Nombre científico: ${p.nombreCientifico}`:"",
    p.familia?`Familia: ${p.familia}`:"",
    p.tamanoCm!=null?`Tamaño adulto: ${p.tamanoCm} cm`:"",
    p.tempMinC!=null||p.tempMaxC!=null?`Temperatura: ${p.tempMinC??"—"}–${p.tempMaxC??"—"} °C`:"",
    p.phMin!=null||p.phMax!=null?`pH: ${p.phMin??"—"}–${p.phMax??"—"}`:"",
    p.acuarioMinL!=null?`Acuario mínimo: ${p.acuarioMinL} L`:"",
    p.alimentacion?`Alimentación: ${p.alimentacion}`:"",
    p.compatibilidad?`Compatibilidad: ${p.compatibilidad}`:"",
    p.origen?`Origen: ${p.origen}`:"",
    p.precio!=null&&p.precio!==""?`💰 Precio: $${Number(p.precio||0).toLocaleString("es-CO")}`:"Precio: Consultar",
    `📖 Catálogo: ${tienda}`
  ].filter(Boolean);
  return partes.join("\\n");
}
function cargarImagenCanvas(src){
  return new Promise((resolve,reject)=>{
    if(!src){resolve(null);return;}
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error("imagen"));
    img.src=src;
  });
}
function textoCortoCompartir(p){
  return `🐟 ${p.nombreComun||"Pez"} — Ficha de especie de Catálogo Peces V2`;
}
function envolverTextoCanvas(ctx,text,maxWidth){
  const palabras=String(text||"").split(/\s+/).filter(Boolean), lineas=[]; let linea="";
  for(const palabra of palabras){
    const prueba=linea?`${linea} ${palabra}`:palabra;
    if(ctx.measureText(prueba).width<=maxWidth){linea=prueba;}
    else{if(linea)lineas.push(linea);linea=palabra;}
  }
  if(linea)lineas.push(linea);
  return lineas;
}
function redondearRect(ctx,x,y,w,h,r,fill){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  if(fill)ctx.fillStyle=fill,ctx.fill();
}
async function generarFichaImagen(p){
  const W=1080,H=1520,pad=54,inner=W-pad*2;
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#f7fcff");bg.addColorStop(1,"#e8f5fb");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const navy="#124b78",blue="#1f8fca",light="#e8f5fc",purple="#8b5aa9",green="#3f9b72",gold="#e1a21a",text="#173b59",muted="#56718a";
  redondearRect(ctx,pad,38,inner,190,28,navy);
  let img=null;try{img=await cargarImagenCanvas(p.foto)}catch{}
  if(img){const x=pad+24,y=62,w=250,h=142,scale=Math.max(w/img.width,h/img.height),sw=img.width*scale,sh=img.height*scale,ox=x+(w-sw)/2,oy=y+(h-sh)/2;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,ox,oy,sw,sh);ctx.restore();}
  else{ctx.font="76px Arial";ctx.fillStyle="#fff";ctx.fillText("🐟",pad+95,150)}
  ctx.fillStyle="#fff";ctx.font="bold 52px Arial";ctx.fillText(p.nombreComun||"Pez",pad+300,105);
  ctx.font="italic 25px Arial";ctx.fillStyle="#dceeff";ctx.fillText(p.nombreCientifico||"",pad+300,145);
  if(p.familia){ctx.font="bold 22px Arial";ctx.fillStyle="#fff";ctx.fillText(`Familia: ${p.familia}`,pad+300,185)}
  ctx.font="bold 19px Arial";ctx.fillStyle="#dceeff";ctx.fillText("FICHA DE ESPECIE",pad+300,62);

  let y=260;
  const addCard=(icon,title,value,color=blue,wide=false)=>{
    const x=pad,w=wide?inner:inner/2-12; const h=wide?122:104;
    redondearRect(ctx,x,y,w,h,22,"#ffffff");
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+42,y+42,25,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.textAlign="center";ctx.fillText(icon,x+42,y+50);ctx.textAlign="left";
    ctx.fillStyle=text;ctx.font="bold 20px Arial";ctx.fillText(title,x+82,y+35);
    ctx.fillStyle=muted;ctx.font="20px Arial";const lines=envolverTextoCanvas(ctx,value||"—",w-105);lines.slice(0,2).forEach((line,i)=>ctx.fillText(line,x+82,y+66+i*27));
    y+=h+14;return w;
  };
  const vals=[];
  if(p.tamanoCm!=null)vals.push(["🐟","Tamaño adulto",`${p.tamanoCm} cm`,blue]);
  if(p.tempMinC!=null||p.tempMaxC!=null)vals.push(["🌡","Temperatura",`${p.tempMinC??"—"} – ${p.tempMaxC??"—"} °C`,gold]);
  if(p.phMin!=null||p.phMax!=null)vals.push(["pH","pH",`${p.phMin??"—"} – ${p.phMax??"—"}`,purple]);
  if(p.acuarioMinL!=null)vals.push(["▣","Acuario mínimo",`${p.acuarioMinL} litros`,blue]);
  if(p.temperamento)vals.push(["★","Temperamento",TEMPERAMENTOS[p.temperamento]||p.temperamento,green]);
  if(p.origen)vals.push(["🌎","Origen",p.origen,blue]);
  for(let i=0;i<vals.length;i+=2){
    const pair=vals.slice(i,i+2); const rowY=y; const oldY=y;
    pair.forEach((v,j)=>{const x=pad+j*(inner/2+12),w=inner/2-6,h=104;redondearRect(ctx,x,rowY,w,h,22,"#ffffff");ctx.fillStyle=v[3];ctx.beginPath();ctx.arc(x+38,rowY+38,24,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 20px Arial";ctx.textAlign="center";ctx.fillText(v[0],x+38,rowY+45);ctx.textAlign="left";ctx.fillStyle=text;ctx.font="bold 18px Arial";ctx.fillText(v[1],x+72,rowY+32);ctx.fillStyle=muted;ctx.font="18px Arial";envolverTextoCanvas(ctx,v[2],w-90).slice(0,2).forEach((line,k)=>ctx.fillText(line,x+72,rowY+62+k*25));});
    y=oldY+118;
  }
  const section=(title,value,color)=>{
    if(!value)return;
    const lines=envolverTextoCanvas(ctx,value,inner-50);const h=72+Math.min(lines.length,4)*27;
    redondearRect(ctx,pad,y,inner,h,24,"#fff");ctx.fillStyle=color;ctx.font="bold 25px Arial";ctx.fillText(title,pad+25,y+39);ctx.fillStyle=muted;ctx.font="19px Arial";lines.slice(0,4).forEach((line,i)=>ctx.fillText(line,pad+25,y+70+i*27));y+=h+14;
  };
  section("🍽 Alimentación",p.alimentacion,green);
  section("👥 Compatibilidad",p.compatibilidad,purple);
  if(p.variedades)section("✦ Variedades",p.variedades,blue);
  ctx.fillStyle="#fff";ctx.fillRect(0,H-84,W,84);ctx.fillStyle=navy;ctx.fillRect(0,H-8,W,8);
  ctx.fillStyle=navy;ctx.font="bold 27px Arial";ctx.textAlign="center";ctx.fillText("🐟  Catálogo Peces V2",W/2,H-46);ctx.font="16px Arial";ctx.fillStyle=muted;ctx.fillText("Información para conocer y disfrutar cada especie",W/2,H-20);ctx.textAlign="left";
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("blob")),"image/jpeg",.9));
}
async function compartirFichaImagen(p,modo="compartir"){
  try{
    const blob=await generarFichaImagen(p);const nombre=`ficha-${normalizarTexto(p.nombreComun||"pez").replace(/\s+/g,"-")||"pez"}.jpg`;const file=new File([blob],nombre,{type:"image/jpeg"});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({title:p.nombreComun||"Ficha de pez",text:textoCortoCompartir(p),files:[file]});return;
    }
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=nombre;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    banner(modo==="whatsapp"?"La ficha se generó como imagen. Adjunta la imagen en WhatsApp.":"La ficha se generó como imagen y se descargó para compartir.","success");
  }catch(err){console.error(err);banner("No se pudo generar la ficha como imagen.","error");}
}
function sharePez(p){compartirFichaImagen(p,"compartir");}
function shareWhatsAppPez(p){compartirFichaImagen(p,"whatsapp");}
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
  const wa=e.target.closest("[data-whatsapp-share]"); if(wa){const p=catalogo.find(x=>x.id===wa.dataset.whatsappShare);if(p)shareWhatsAppPez(p);return;}
  const print=e.target.closest("[data-detail-print]"); if(print){const p=catalogo.find(x=>x.id===print.dataset.detailPrint);if(p)printPez(p);return;}
  const fav=e.target.closest("[data-detail-favorite]"); if(fav){toggleFavorito(fav.dataset.detailFavorite);return;}
  const edit=e.target.closest("[data-detail-edit]"); if(edit){const p=catalogo.find(x=>x.id===edit.dataset.detailEdit);closeDetailModal();openModal(p);return;}
  const del=e.target.closest("[data-detail-delete]"); if(del){closeDetailModal();eliminarPez(del.dataset.detailDelete);return;}
});

let suggestionIndex=-1;
function renderSearchSuggestions(){
  const box=$("searchSuggestions");
  if(!box)return;
  const q=normalizarTexto(busqueda);
  if(!q){box.classList.add("hidden");box.innerHTML="";suggestionIndex=-1;return}
  const candidatos=catalogo.filter(p=>coincideBusqueda(p,q))
    .sort((a,b)=>relevanciaBusqueda(b,q)-relevanciaBusqueda(a,q) || String(a.nombreComun||"").localeCompare(String(b.nombreComun||""),"es"))
    .slice(0,7);
  if(!candidatos.length){
    box.innerHTML='<div class="search-suggestion-empty">No hay coincidencias. Prueba con otra palabra.</div>';
    box.classList.remove("hidden"); suggestionIndex=-1; return;
  }
  box.innerHTML=candidatos.map((p,i)=>`<button type="button" class="suggestion ${i===suggestionIndex?"active":""}" role="option" aria-selected="${i===suggestionIndex}" data-suggestion-id="${p.id}">
    <span class="suggestion-icon">${p.foto?`<img src="${escapeHtml(p.foto)}" alt="" loading="lazy">`:"🐟"}</span>
    <span class="suggestion-main"><span class="suggestion-name">${resaltar(p.nombreComun,busqueda)}</span><span class="suggestion-latin">${resaltar(p.nombreCientifico,busqueda)}</span><span class="suggestion-meta">${resaltar(p.familia||"",busqueda)}${p.variedades?` · ${resaltar(String(p.variedades).split(/[,;\n]+/)[0],busqueda)}`:""}</span></span>
    <span class="suggestion-arrow">›</span>
  </button>`).join("");
  box.classList.remove("hidden");
}
function seleccionarSugerencia(id){
  const p=catalogo.find(x=>x.id===id);
  if(!p)return;
  busqueda=p.nombreComun||"";
  $("searchInput").value=busqueda;
  suggestionIndex=-1;
  render();
  $("searchSuggestions")?.classList.add("hidden");
  $("searchInput")?.focus();
}
$("searchInput").addEventListener("input",e=>{busqueda=e.target.value.trim();suggestionIndex=-1;render()});
$("searchInput").addEventListener("keydown",e=>{
  const box=$("searchSuggestions");
  const items=box?Array.from(box.querySelectorAll("[data-suggestion-id]")):[];
  if(e.key==="ArrowDown"&&items.length){e.preventDefault();suggestionIndex=(suggestionIndex+1)%items.length;renderSearchSuggestions();items[suggestionIndex]?.scrollIntoView({block:"nearest"});return}
  if(e.key==="ArrowUp"&&items.length){e.preventDefault();suggestionIndex=(suggestionIndex-1+items.length)%items.length;renderSearchSuggestions();items[suggestionIndex]?.scrollIntoView({block:"nearest"});return}
  if(e.key==="Enter"&&suggestionIndex>=0&&items[suggestionIndex]){e.preventDefault();seleccionarSugerencia(items[suggestionIndex].dataset.suggestionId);return}
  if(e.key==="Escape"){box?.classList.add("hidden");suggestionIndex=-1}
});
$("clearSearch").addEventListener("click",()=>{$("searchInput").value="";busqueda="";suggestionIndex=-1;render();$("searchInput").focus()});
async function toggleFavorito(id){
  const pez=catalogo.find(p=>p.id===id);
  if(!pez)return;
  try{
    await updateDoc(doc(db,"peces",id),{favorito:!Boolean(pez.favorito)});
    banner(pez.favorito?"Quitado de favoritos.":"Agregado a favoritos.","success");
  }catch(err){
    console.error(err);
    banner("No se pudo actualizar el favorito. Revisa la conexión.","error");
  }
}

$("favoritesToggle").addEventListener("click",()=>{soloFavoritos=!soloFavoritos;render()});
$("clearFilters").addEventListener("click",()=>{
  busqueda="";filtroZona=null;filtroCuidado=null;soloFavoritos=false;suggestionIndex=-1;$("searchInput").value="";renderFiltros();render();
});
$("searchSuggestions").addEventListener("click",e=>{
  const item=e.target.closest("[data-suggestion-id]");
  if(item)seleccionarSugerencia(item.dataset.suggestionId);
});
document.body.addEventListener("click",e=>{
  if(!e.target.closest(".search-wrap"))$("searchSuggestions")?.classList.add("hidden");
});
document.querySelectorAll(".quick-chip").forEach(btn=>btn.addEventListener("click",()=>{
  busqueda=btn.dataset.search||"";$("searchInput").value=busqueda;suggestionIndex=-1;render();$("searchInput").focus();
}));
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
  const favBtn=e.target.closest("[data-favorite]");
  if(favBtn){e.stopPropagation();toggleFavorito(favBtn.dataset.favorite);return}
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
  alimentacion:"",compatibilidad:"",reproduccion:"oviparo",longevidadAnios:"",origen:"",variedades:"",precio:"",notas:"",foto:null
};
function openModal(pez){
  editando=pez||null;fotoTemp=pez?pez.foto||null:null;
  $("modalTitle").textContent=pez?"Editar especie":"Agregar especie";
  $("modalBody").innerHTML=formHtml(pez||CAMPOS_VACIOS);
  $("modalOverlay").classList.remove("hidden");
  $("fotoInput").addEventListener("change",handleFotoChange);
  $("nombreComun").addEventListener("input",()=>{
    validarForm();
    const box=$("autoFillStatus");
    const ficha=buscarFichaBase($("nombreComun").value);
    if(box){
      if(ficha) { box.className="auto-fill-status hint"; box.innerHTML=`✓ Encontrado: <strong>${escapeHtml(ficha.nombreComun)}</strong>. Pulsa “Completar datos” para llenar la ficha.`; }
      else if($("nombreComun").value.trim()) { box.className="auto-fill-status"; box.textContent="Puedes buscar una especie del catálogo interno o escribir una nueva."; }
      else { box.className="auto-fill-status"; box.textContent=""; }
    }
  });
  $("nombreCientifico").addEventListener("input",validarForm);
  $("autoFillBtn").addEventListener("click",intentarCompletarFicha);
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
  <div class="field"><div class="field-label">Nombre común *</div>
    <input id="nombreComun" list="pecesSugeridos" value="${escapeHtml(f.nombreComun)}" placeholder="Ej. Betta, Guppy, Pez ángel" autocomplete="off">
    <datalist id="pecesSugeridos">${FICHAS_BASE.map(x=>`<option value="${escapeHtml(x.nombreComun)}">`).join("")}</datalist>
    <div class="auto-fill-tools"><button type="button" id="autoFillBtn" class="auto-fill-btn">✨ Completar datos</button><div id="autoFillStatus" class="auto-fill-status"></div></div>
  </div>
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
  <div class="field"><div class="field-label">Precio de venta ($)</div><input type="number" min="0" step="100" id="precio" value="${f.precio}" placeholder="Ej. 25000"></div>
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
    precio:num("precio"),notas:$("notas").value.trim()
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
