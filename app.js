const KEY = "aquarium_fish_data_v5";

/* =========================================================
   DATOS
   ========================================================= */

let db =
  JSON.parse(localStorage.getItem(KEY) || "null") ||
  JSON.parse(localStorage.getItem("aquarium_fish_data_v4") || "null") ||
  JSON.parse(localStorage.getItem("aquarium_fish_data_v3") || "null") ||
  JSON.parse(localStorage.getItem("aquarium_fish_data_v2") || "null") ||
  JSON.parse(localStorage.getItem("aquarium_fish_data_v1") || "null") ||
  {
    products: [],
    sales: [],
    moves: [],
    customers: [],
    orders: [],
    cash: []
  };

db.products =
  Array.isArray(db.products)
    ? db.products
    : [];

db.sales =
  Array.isArray(db.sales)
    ? db.sales
    : [];

db.moves =
  Array.isArray(db.moves)
    ? db.moves
    : [];

db.customers =
  Array.isArray(db.customers)
    ? db.customers
    : [];

db.orders =
  Array.isArray(db.orders)
    ? db.orders
    : [];

db.orders.forEach(order => {

  if(!order || typeof order !== "object"){
    return;
  }

  if(!order.status){
    order.status = "Pendiente";
  }

  if(order.qty == null){
    order.qty = 1;
  }

  if(order.price == null){
    order.price = 0;
  }

  if(order.note == null){
    order.note = "";
  }

});

db.cash =
  Array.isArray(db.cash)
    ? db.cash
    : [];

/* =========================================================
   CLIENTES - CUENTAS PENDIENTES
   ========================================================= */

db.customers.forEach(customer => {

  if(!Array.isArray(customer.payments)){
    customer.payments = [];
  }

});


/* =========================================================
   UTILIDADES
   ========================================================= */

const money = n =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);


const now = () =>
  new Date().toLocaleString("es-CO");


const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m])
  );


function parseLocalDate(value) {

  if (
    value instanceof Date
  ) {

    return isNaN(
      value.getTime()
    )
      ? null
      : value;

  }


  const text =
    String(value || "").trim();


  if(!text){
    return null;
  }


  /*
     Primero intentamos el formato que utiliza
     Aquarium Fish:

     d/m/yyyy, hh:mm:ss
  */

  const match =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );


  if(match){

    const day =
      Number(match[1]);

    const month =
      Number(match[2]);

    const year =
      Number(match[3]);

    const hour =
      Number(match[4] || 0);

    const minute =
      Number(match[5] || 0);

    const second =
      Number(match[6] || 0);


    const date =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      );


    if(
      !isNaN(
        date.getTime()
      )
    ){

      return date;

    }

  }


  const fallback =
    new Date(text);


  return isNaN(
    fallback.getTime()
  )
    ? null
    : fallback;

}


function startOfDay(date) {

  const d =
    new Date(date);

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;

}


function endOfDay(date) {

  const d =
    new Date(date);

  d.setHours(
    23,
    59,
    59,
    999
  );

  return d;

}


function sameDay(a,b){

  return (
    a.getFullYear() ===
      b.getFullYear() &&

    a.getMonth() ===
      b.getMonth() &&

    a.getDate() ===
      b.getDate()
  );

}


/* =========================================================
   GUARDAR
   ========================================================= */

function save() {

  localStorage.setItem(
    KEY,
    JSON.stringify(db)
  );

  renderAll();

}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function show(tab) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove(
        "active"
      );

    });


  const screen =
    document.getElementById(tab);


  if(screen){

    screen.classList.add(
      "active"
    );

  }


  document
    .querySelectorAll(
      "nav button[data-tab]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.tab === tab
      );

    });

}


function bindNavigation() {

  document
    .querySelectorAll(
      "nav button[data-tab]"
    )
    .forEach(button => {

      button.onclick =
        function(){

          show(
            this.dataset.tab
          );

        };

    });

}


/* =========================================================
   INVENTARIO
   ========================================================= */

let inventoryCategory =
  "Todas";

let inventorySort =
  "name-asc";


function inventoryCategories() {

  const base = [

    "Peces",
    "Acuarios",
    "Filtros",
    "Iluminación",
    "Sustratos",
    "Decoración",
    "Alimentos",
    "Accesorios",
    "Otros"

  ];


  const existing =
    db.products
      .map(
        p =>
          String(
            p.category || ""
          ).trim()
      )
      .filter(Boolean);


  return [
    ...new Set([
      ...base,
      ...existing
    ])
  ].sort(
    (a,b) =>
      a.localeCompare(
        b,
        "es",
        {
          sensitivity:
            "base"
        }
      )
  );

}


function setInventoryCategory(
  value
){

  inventoryCategory =
    value;

  renderInventory();

}


function setInventorySort(
  value
){

  inventorySort =
    value;

  renderInventory();

}




/* =========================================================
   REPORTES
   ========================================================= */

let reportPeriod = "today";

function reportRange(period = reportPeriod){
  const nowDate = new Date();
  let start = null;
  let end = new Date(nowDate);
  end.setHours(23,59,59,999);

  if(period === "today"){
    start = new Date(nowDate);
    start.setHours(0,0,0,0);
  }else if(period === "7days"){
    start = new Date(nowDate);
    start.setDate(start.getDate()-6);
    start.setHours(0,0,0,0);
  }else if(period === "month"){
    start = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    start.setHours(0,0,0,0);
  }else{
    start = null;
  }
  return {start,end};
}

function inReportRange(value, range){
  const d = parseLocalDate(value);
  if(!d) return false;
  if(range.start && d < range.start) return false;
  if(range.end && d > range.end) return false;
  return true;
}

function reportSales(){
  const range = reportRange();
  return db.sales.filter(s => reportPeriod === "all" ? !!parseLocalDate(s.date) : inReportRange(s.date, range));
}

function saleCost(sale){
  if(Array.isArray(sale.items)){
    return sale.items.reduce((sum,item)=>sum + ((+item.cost||0) * (+item.qty||0)),0);
  }
  return (+sale.cost||0) * (+sale.qty||0);
}

function reportExpenses(){
  const range = reportRange();
  return db.cash.filter(m => {
    if(String(m.type||"").toLowerCase() !== "gasto") return false;
    return reportPeriod === "all" ? !!parseLocalDate(m.date) : inReportRange(m.date, range);
  });
}

function reportPayments(){
  return reportSales().reduce((sum,sale)=>sum + salePaid(sale),0);
}

function reportRevenue(){
  return reportSales().reduce((sum,sale)=>sum + (+sale.total||0),0);
}

function reportPending(){
  return reportSales().reduce((sum,sale)=>sum + Math.max(0,(+sale.total||0)-salePaid(sale)),0);
}

function reportProfit(){
  return reportSales().reduce((sum,sale)=>sum + ((+sale.total||0)-saleCost(sale)),0);
}

function reportExpenseTotal(){
  return reportExpenses().reduce((sum,m)=>sum + (+m.amount||0),0);
}

function reportAverageTicket(){
  const sales = reportSales();
  return sales.length ? reportRevenue()/sales.length : 0;
}

function reportProductRanking(){
  const map = {};
  reportSales().forEach(sale => {
    if(Array.isArray(sale.items) && sale.items.length){
      sale.items.forEach(item => {
        const name = String(item.product||"Producto");
        map[name] = (map[name]||0) + (+item.qty||0);
      });
    }else if(sale.product){
      const name = String(sale.product);
      map[name] = (map[name]||0) + (+sale.qty||0);
    }
  });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);
}

function reportPaymentMethods(){
  const map = {};
  reportSales().forEach(sale => {
    const method = String(sale.pay || "Otro");
    map[method] = (map[method]||0) + salePaid(sale);
  });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}

function reportDaily(){
  const map = {};
  reportSales().forEach(sale => {
    const d = parseLocalDate(sale.date);
    if(!d) return;
    const key = d.toISOString().slice(0,10);
    if(!map[key]) map[key] = {date:d,total:0,count:0};
    map[key].total += (+sale.total||0);
    map[key].count += 1;
  });
  return Object.values(map).sort((a,b)=>b.date-a.date);
}

function setupReportsUI(){
  const main = document.querySelector("main");
  const nav = document.querySelector("nav");
  if(!main || !nav) return;

  let section = document.getElementById("reports");
  if(!section){
    section = document.createElement("section");
    section.id = "reports";
    section.className = "screen";
    main.appendChild(section);
  }

  let navButton = nav.querySelector('button[data-tab="reports"]');
  if(!navButton){
    navButton = document.createElement("button");
    navButton.type = "button";
    navButton.dataset.tab = "reports";
    navButton.innerHTML = `📊<span>Reportes</span>`;
    nav.appendChild(navButton);
  }

  renderReports();
}

function renderReports(){
  const section = document.getElementById("reports");
  if(!section) return;

  const sales = reportSales();
  const expenses = reportExpenseTotal();
  const revenue = reportRevenue();
  const payments = reportPayments();
  const pending = reportPending();
  const profit = reportProfit();
  const net = profit - expenses;
  const ticket = reportAverageTicket();
  const ranking = reportProductRanking();
  const methods = reportPaymentMethods();
  const daily = reportDaily();

  section.innerHTML = `
    <div class="section-head">
      <h1>📊 Reportes</h1>
    </div>

    <div class="panel">
      <h2>Periodo</h2>
      <select class="search" onchange="setReportPeriod(this.value)">
        <option value="today" ${reportPeriod==='today'?'selected':''}>📅 Hoy</option>
        <option value="7days" ${reportPeriod==='7days'?'selected':''}>📆 Últimos 7 días</option>
        <option value="month" ${reportPeriod==='month'?'selected':''}>🗓️ Este mes</option>
        <option value="all" ${reportPeriod==='all'?'selected':''}>📚 Todo</option>
      </select>
    </div>

    <div class="cards">
      <div class="card"><span>Ventas</span><b>${money(revenue)}</b><small>${sales.length} transacciones</small></div>
      <div class="card"><span>Pagado</span><b>${money(payments)}</b><small>recibido</small></div>
      <div class="card"><span>Pendiente</span><b>${money(pending)}</b><small>por cobrar</small></div>
      <div class="card"><span>Ganancia</span><b>${money(profit)}</b><small>antes de gastos</small></div>
      <div class="card"><span>Gastos</span><b>${money(expenses)}</b><small>registrados en caja</small></div>
      <div class="card"><span>Resultado</span><b>${money(net)}</b><small>ganancia − gastos</small></div>
      <div class="card"><span>Ticket promedio</span><b>${money(ticket)}</b><small>por venta</small></div>
    </div>

    <div class="panel">
      <h2>🏆 Productos más vendidos</h2>
      ${ranking.length ? ranking.map((r,i)=>`<div class="item"><div><b>${i+1}. ${esc(r[0])}</b></div><div class="right"><b>${r[1]}</b><small>unidades</small></div></div>`).join('') : '<div class="empty">No hay ventas en este periodo.</div>'}
    </div>

    <div class="panel">
      <h2>💳 Ventas por forma de pago</h2>
      ${methods.length ? methods.map(r=>`<div class="item"><div><b>${esc(r[0])}</b></div><div class="right"><b>${money(r[1])}</b></div></div>`).join('') : '<div class="empty">No hay pagos en este periodo.</div>'}
    </div>

    <div class="panel">
      <h2>📅 Ventas por día</h2>
      ${daily.length ? daily.map(r=>`<div class="item"><div><b>${esc(r.date.toLocaleDateString('es-CO',{weekday:'short',day:'numeric',month:'short'}))}</b><small>${r.count} venta${r.count===1?'':'s'}</small></div><div class="right"><b>${money(r.total)}</b></div></div>`).join('') : '<div class="empty">No hay ventas en este periodo.</div>'}
    </div>
  `;
}

function setReportPeriod(value){
  reportPeriod = ["today","7days","month","all"].includes(value) ? value : "today";
  renderReports();
}


/* =========================================================
   RENDER GENERAL
   ========================================================= */

function renderAll() {

  // La interfaz de reportes se prepara por separado para evitar detener el resto de la aplicación.
  setupReportsUI();
  renderHome();

  renderInventory();

  renderSales();

  renderCash();

  renderCustomers();

  renderMoves();

  renderOrders();

  renderInternal();

  if(document.getElementById("reports")) renderReports();

}


/* =========================================================
   INICIO
   ========================================================= */

function renderHome() {

  const total =
    db.sales.reduce(
      (sum,sale) =>
        sum +
        (+sale.total || 0),
      0
    );


  const salesTotal =
    document.getElementById(
      "salesTotal"
    );


  const salesCount =
    document.getElementById(
      "salesCount"
    );


  const productCount =
    document.getElementById(
      "productCount"
    );


  const customerCount =
    document.getElementById(
      "customerCount"
    );


  const lowStock =
    document.getElementById(
      "lowStock"
    );


  const cashBalance =
    document.getElementById(
      "cashBalance"
    );


  const recentSales =
    document.getElementById(
      "recentSales"
    );


  if(salesTotal){

    salesTotal.textContent =
      money(total);

  }


  if(salesCount){

    salesCount.textContent =
      `${db.sales.length} transacciones`;

  }


  if(productCount){

    productCount.textContent =
      db.products.length;

  }


  if(customerCount){

    customerCount.textContent =
      db.customers.length;

  }


  if(lowStock){

    lowStock.textContent =
      db.products.filter(
        p =>
          (+p.stock || 0) <=
          (+p.min || 0)
      ).length;

  }


  if(cashBalance){

    const totalCash =
      calculateCashTotals(
        "all"
      );


    cashBalance.textContent =
      money(
        totalCash.balance
      );

  }


  if(!recentSales){

    return;

  }


  recentSales.innerHTML =
    db.sales.length

      ? db.sales
          .slice(-6)
          .reverse()
          .map(
            sale => `

              <div class="item">

                <div>

                  <b>
                    ${esc(
                      saleLabel(sale)
                    )}
                  </b>

                  <div class="muted">

                    ${esc(
                      sale.client ||
                      "Sin cliente"
                    )}

                    ·

                    ${saleQty(sale)}
                    und.

                    ·

                    ${esc(
                      sale.pay || ""
                    )}

                  </div>

                </div>

                <div class="right">

                  <strong>
                    ${money(
                      sale.total
                    )}
                  </strong>

                  <small>

                    ${
                      sale.status ===
                      "Pendiente"

                        ? "Pendiente de pago"

                        : sale.status ===
                          "Abono"

                        ? "Abono: " +
                          money(
                            salePaid(
                              sale
                            )
                          )

                        : "Pagada"
                    }

                  </small>

                </div>

              </div>

            `
          )
          .join("")

      : `

        <div class="empty">
          Todavía no hay ventas.
        </div>

      `;

}


/* =========================================================
   INVENTARIO
   ========================================================= */


function inventoryStats() {

  const products = Array.isArray(db.products)
    ? db.products
    : [];

  const units = products.reduce(
    (sum, product) =>
      sum + Math.max(0, +product.stock || 0),
    0
  );

  const costValue = products.reduce(
    (sum, product) =>
      sum +
      Math.max(0, +product.stock || 0) *
      (+product.cost || 0),
    0
  );

  const saleValue = products.reduce(
    (sum, product) =>
      sum +
      Math.max(0, +product.stock || 0) *
      (+product.price || 0),
    0
  );

  const lowStock = products.filter(
    product =>
      Math.max(0, +product.stock || 0) <=
      Math.max(0, +product.min || 0)
  ).length;

  const zeroStock = products.filter(
    product =>
      Math.max(0, +product.stock || 0) <= 0
  ).length;

  return {
    units,
    costValue,
    saleValue,
    lowStock,
    zeroStock
  };

}


function renderInventorySmartPanel(controls) {

  if(!controls){
    return;
  }

  const stats = inventoryStats();

  const panel = document.createElement("div");

  panel.innerHTML = `
    <div class="item" style="margin-bottom:10px;">
      <div>
        <b>📦 Inventario inteligente</b>
        <div class="muted">Resumen del stock actual</div>
      </div>
    </div>

    <div style="
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
      margin-bottom:10px;
    ">
      <div class="item">
        <div>
          <b>${stats.units}</b>
          <div class="muted">Unidades</div>
        </div>
      </div>

      <div class="item">
        <div>
          <b>${money(stats.costValue)}</b>
          <div class="muted">Valor de compra</div>
        </div>
      </div>

      <div class="item">
        <div>
          <b>${money(stats.saleValue)}</b>
          <div class="muted">Valor de venta</div>
        </div>
      </div>

      <div class="item">
        <div>
          <b>${stats.lowStock}</b>
          <div class="muted">Stock bajo</div>
        </div>
      </div>
    </div>

    <div class="muted" style="margin:0 0 8px;">
      ${stats.zeroStock} producto(s) sin stock ·
      Valor de venta del stock: <b>${money(stats.saleValue)}</b>
    </div>

    <div style="
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:8px;
    ">
      <button
        type="button"
        class="primary"
        onclick="openMove('Entrada','Compra')"
      >
        ➕ Entrada
      </button>

      <button
        type="button"
        onclick="openMove('Salida','Mortalidad')"
      >
        ☠️ Mortalidad/Baja
      </button>

      <button
        type="button"
        onclick="openMove('Salida','Ajuste')"
      >
        ⚠️ Ajuste/Pérdida
      </button>
    </div>
  `;

  panel.style.margin = "10px 0 14px";
  controls.prepend(panel);

}


function renderInventory() {

  const search =
    document.getElementById(
      "search"
    );


  const list =
    document.getElementById(
      "inventoryList"
    );


  if(!search || !list){

    return;

  }


  const q =
    String(
      search.value || ""
    )
      .toLowerCase()
      .trim();


  let rows =
    db.products.filter(
      p =>
        `${p.name || ""} ${
          p.category || ""
        }`
          .toLowerCase()
          .includes(q)
    );


  if(
    inventoryCategory !==
    "Todas"
  ){

    rows =
      rows.filter(
        p =>
          String(
            p.category || ""
          )
            .trim()
            .toLowerCase() ===
          inventoryCategory
            .toLowerCase()
      );

  }


  if(
    inventorySort ===
    "name-asc"
  ){

    rows.sort(
      (a,b) =>
        String(
          a.name || ""
        ).localeCompare(
          String(
            b.name || ""
          ),
          "es"
        )
    );

  }


  if(
    inventorySort ===
    "name-desc"
  ){

    rows.sort(
      (a,b) =>
        String(
          b.name || ""
        ).localeCompare(
          String(
            a.name || ""
          ),
          "es"
        )
    );

  }


  if(
    inventorySort ===
    "stock-desc"
  ){

    rows.sort(
      (a,b) =>
        (+b.stock || 0) -
        (+a.stock || 0)
    );

  }


  if(
    inventorySort ===
    "stock-asc"
  ){

    rows.sort(
      (a,b) =>
        (+a.stock || 0) -
        (+b.stock || 0)
    );

  }


  let controls =
    document.getElementById(
      "inventoryControls"
    );


  if(!controls){

    controls =
      document.createElement(
        "div"
      );


    controls.id =
      "inventoryControls";


    search.insertAdjacentElement(
      "afterend",
      controls
    );

  }


  controls.innerHTML = `

    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin:10px 0;
    ">

      <select
        id="inventoryCategory"
        class="search"
      >

        <option value="Todas">
          📂 Todas las categorías
        </option>

        ${
          inventoryCategories()
            .map(
              category => `

                <option
                  value="${esc(
                    category
                  )}"
                  ${
                    category.toLowerCase() ===
                    inventoryCategory.toLowerCase()
                      ? "selected"
                      : ""
                  }
                >
                  ${esc(
                    category
                  )}
                </option>

              `
            )
            .join("")
        }

      </select>


      <select
        id="inventorySort"
        class="search"
      >

        <option
          value="name-asc"
          ${
            inventorySort ===
            "name-asc"
              ? "selected"
              : ""
          }
        >
          🔤 A-Z
        </option>

        <option
          value="name-desc"
          ${
            inventorySort ===
            "name-desc"
              ? "selected"
              : ""
          }
        >
          🔤 Z-A
        </option>

        <option
          value="stock-desc"
          ${
            inventorySort ===
            "stock-desc"
              ? "selected"
              : ""
          }
        >
          📈 Mayor stock
        </option>

        <option
          value="stock-asc"
          ${
            inventorySort ===
            "stock-asc"
              ? "selected"
              : ""
          }
        >
          📉 Menor stock
        </option>

      </select>

    </div>


    <div
      class="muted"
      style="margin:0 0 8px;"
    >
      Mostrando
      ${rows.length}
      de
      ${db.products.length}
      productos
    </div>

  `;


  renderInventorySmartPanel(controls);


  const categorySelect =
    document.getElementById(
      "inventoryCategory"
    );


  if(categorySelect){

    categorySelect.onchange =
      function(){

        setInventoryCategory(
          this.value
        );

      };

  }


  const sortSelect =
    document.getElementById(
      "inventorySort"
    );


  if(sortSelect){

    sortSelect.onchange =
      function(){

        setInventorySort(
          this.value
        );

      };

  }


  list.innerHTML =
    rows.length

      ? rows
          .map(
            product => `

              <div
                class="item clickable"
                onclick="editProduct(
                  ${db.products.indexOf(
                    product
                  )}
                )"
              >

                <div>

                  <b>
                    ${esc(
                      product.name
                    )}
                  </b>

                  <div class="muted">

                    ${esc(
                      product.category ||
                      "Sin categoría"
                    )}

                  </div>

                  <div class="muted">

                    Costo
                    ${money(
                      product.cost
                    )}

                    ·

                    Venta
                    ${money(
                      product.price
                    )}

                    ·

                    Ganancia/u
                    ${money(
                      (+product.price || 0) -
                      (+product.cost || 0)
                    )}

                  </div>

                </div>

                <span
                  class="badge ${
                    (+product.stock || 0) <=
                    (+product.min || 0)
                      ? "low"
                      : ""
                  }"
                >

                  Stock:
                  ${product.stock}

                </span>

              </div>

            `
          )
          .join("")

      : `

        <div class="empty">
          No hay productos
          con estos filtros.
        </div>

      `;

}


/* =========================================================
   VENTAS - AUXILIARES
   ========================================================= */

function saleLabel(sale) {

  return sale.items &&
    sale.items.length

    ? sale.items
        .map(
          item =>
            item.product
        )
        .join(", ")

    : sale.product ||
      "Venta";

}


function saleQty(sale) {

  return sale.items &&
    sale.items.length

    ? sale.items.reduce(
        (total,item) =>
          total +
          (+item.qty || 0),
        0
      )

    : (+sale.qty || 0);

}


function salePaid(sale) {

  if(
    sale.paid ===
    undefined
  ){

    return +sale.total || 0;

  }


  return Math.max(
    0,
    Math.min(
      +sale.paid || 0,
      +sale.total || 0
    )
  );

}


/* =========================================================
   VENTAS
   ========================================================= */

function dateKey(value) {

  const date =
    parseLocalDate(value);


  if(date){

    return date.toLocaleDateString(
      "es-CO"
    );

  }


  return "Sin fecha";

}


function dateLabel(key) {

  if(
    key ===
    "Sin fecha"
  ){

    return key;

  }


  const parts =
    key.split("/");


  if(
    parts.length === 3
  ){

    const day =
      +parts[0];

    const month =
      +parts[1];

    const year =
      +parts[2];


    return new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString(
      "es-CO",
      {
        weekday:
          "long",
        day:
          "numeric",
        month:
          "long",
        year:
          "numeric"
      }
    );

  }


  return key;

}


function renderSales() {

  const list =
    document.getElementById(
      "salesList"
    );


  if(!list){

    return;

  }


  if(!db.sales.length){

    list.innerHTML = `

      <div class="empty">
        No hay ventas registradas.
      </div>

    `;

    return;

  }


  const groups = {};


  db.sales.forEach(
    sale => {

      const key =
        dateKey(
          sale.date
        );


      if(!groups[key]){

        groups[key] = [];

      }


      groups[key].push(
        sale
      );

    }
  );


  const keys =
    Object.keys(groups)
      .sort(
        (a,b) =>
          b.localeCompare(a)
      );


  list.innerHTML =
    keys
      .map(
        (key,groupIndex) => {

          const sales =
            groups[key]
              .slice()
              .reverse();


          const total =
            sales.reduce(
              (sum,sale) =>
                sum +
                (+sale.total || 0),
              0
            );


          return `

            <div class="date-group">

              <button
                class="date-group-head"
                type="button"
                onclick="toggleDateGroup(this)"
              >

                <span>

                  <b>
                    ${esc(
                      dateLabel(key)
                    )}
                  </b>

                  <small>

                    ${sales.length}

                    ${
                      sales.length === 1
                        ? "venta"
                        : "ventas"
                    }

                    ·

                    ${money(total)}

                  </small>

                </span>


                <span
                  class="date-chevron"
                >

                  ${
                    groupIndex === 0
                      ? "▲"
                      : "▼"
                  }

                </span>

              </button>


              <div
                class="
                  date-group-body
                  ${
                    groupIndex === 0
                      ? "open"
                      : ""
                  }
                "
              >

                ${
                  sales
                    .map(
                      sale => `

                        <div class="item">

                          <div>

                            <b>
                              ${esc(
                                sale.client ||
                                "Sin cliente"
                              )}
                            </b>


                            <div class="muted">

                              ${
                                sale.items &&
                                sale.items.length

                                  ? sale.items
                                      .map(
                                        item =>
                                          `${esc(
                                            item.product
                                          )} × ${
                                            item.qty
                                          }`
                                      )
                                      .join(
                                        " · "
                                      )

                                  : `${esc(
                                      sale.product ||
                                      "Producto"
                                    )} × ${
                                      sale.qty || 0
                                    }`
                              }

                            </div>


                            <div class="muted">

                              ${esc(
                                sale.date ||
                                ""
                              )}

                              ·

                              ${esc(
                                sale.pay ||
                                ""
                              )}

                              ·

                              ${esc(
                                sale.status ||
                                "Pagada"
                              )}

                            </div>

                          </div>


                          <div class="right">

                            <b>
                              ${money(
                                sale.total
                              )}
                            </b>

                            <small>

                              ${
                                sale.status ===
                                "Pendiente"

                                  ? "Pendiente"

                                  : sale.status ===
                                    "Abono"

                                  ? "Abono " +
                                    money(
                                      salePaid(
                                        sale
                                      )
                                    )

                                  : "Pagada"
                              }

                            </small>

                            <button
                              type="button"
                              style="margin-top:6px;"
                              onclick="openReceipt(${db.sales.indexOf(sale)})"
                            >
                              🧾 Comprobante
                            </button>

                          </div>

                        </div>

                      `
                    )
                    .join("")
                }

              </div>

            </div>

          `;

        }
      )
      .join("");

}


function toggleDateGroup(button) {

  const body =
    button.nextElementSibling;


  if(!body){

    return;

  }


  const open =
    body.classList.toggle(
      "open"
    );


  const arrow =
    button.querySelector(
      ".date-chevron"
    );


  if(arrow){

    arrow.textContent =
      open
        ? "▲"
        : "▼";

  }

}


/* =========================================================
   COMPROBANTE DE VENTA
   ========================================================= */

function getSaleCustomer(sale) {

  if(!sale || !sale.client){
    return null;
  }

  const wanted =
    String(sale.client)
      .trim()
      .toLowerCase();

  return db.customers.find(
    customer =>
      String(customer?.name || "")
        .trim()
        .toLowerCase() === wanted
  ) || null;

}


function formatReceiptDate(value) {

  const parsed =
    parseLocalDate(value);

  if(!parsed){
    return String(value || "");
  }

  return parsed.toLocaleString(
    "es-CO",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  );

}


function receiptNumber(index) {

  return String(
    Math.max(0, Number(index) || 0) + 1
  ).padStart(5,"0");

}


function saleBalance(sale) {

  return Math.max(
    0,
    (+sale.total || 0) - salePaid(sale)
  );

}


function buildSaleReceiptText(sale,index) {

  if(!sale){
    return "";
  }

  const items =
    Array.isArray(sale.items) && sale.items.length
      ? sale.items
      : [{
          product: sale.product || "Producto",
          qty: sale.qty || 0,
          price: +sale.price || 0
        }];

  const customer =
    getSaleCustomer(sale);

  const lines = [
    "🐠 AQUARIUM FISH",
    "COMPROBANTE DE VENTA",
    "",
    `No.: ${receiptNumber(index)}`,
    `Fecha: ${formatReceiptDate(sale.date)}`,
    `Cliente: ${sale.client || "Venta mostrador"}`
  ];

  if(customer?.phone){
    lines.push(`Teléfono: ${customer.phone}`);
  }

  lines.push("", "DETALLE");

  items.forEach(item => {
    const qty = Math.max(0, +item.qty || 0);
    const total =
      (+item.price || 0) * qty;

    lines.push(
      `${qty} x ${item.product || "Producto"} — ${money(total)}`
    );
  });

  lines.push(
    "",
    `TOTAL: ${money(sale.total)}`,
    `Forma de pago: ${sale.pay || ""}`,
    `Estado: ${sale.status || "Pagada"}`,
    `Pagado: ${money(salePaid(sale))}`,
    `Saldo: ${money(saleBalance(sale))}`,
    "",
    "Gracias por elegir Aquarium Fish 🐠"
  );

  return lines.join("\n");

}


function receiptPhone(phone) {

  let digits =
    String(phone || "")
      .replace(/\D/g, "");

  if(digits.length === 10 && digits.startsWith("3")){
    digits = "57" + digits;
  }

  return digits;

}


function openReceipt(index) {

  const sale =
    db.sales[index];

  if(!sale){
    return;
  }

  const text =
    buildSaleReceiptText(
      sale,
      index
    );

  const customer =
    getSaleCustomer(sale);

  modal(

    `🧾 Comprobante #${receiptNumber(index)}`,

    `
      <div
        style="
          background:#f7f7f7;
          border-radius:12px;
          padding:14px;
          white-space:pre-wrap;
          line-height:1.5;
          max-height:55vh;
          overflow:auto;
        "
      >${esc(text)}</div>

      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
          flex-wrap:wrap;
        "
      >

        <button
          class="primary"
          type="button"
          onclick="copySaleReceipt(${index})"
        >
          📋 Copiar
        </button>

        <button
          type="button"
          onclick="shareSaleReceiptWhatsApp(${index})"
        >
          📲 WhatsApp
        </button>

        <button
          type="button"
          onclick="printSaleReceipt(${index})"
        >
          🖨️ Imprimir
        </button>

        <button
          type="button"
          onclick="closeModal()"
        >
          Cerrar
        </button>

      </div>

      <p class="muted" style="margin-top:10px;">
        ${
          customer?.phone
            ? `WhatsApp preparado para ${esc(customer.phone)}.`
            : "No hay teléfono guardado para este cliente; WhatsApp abrirá el mensaje para que elijas el contacto."
        }
      </p>
    `,

    null

  );

}


async function copySaleReceipt(index) {

  const sale =
    db.sales[index];

  if(!sale){
    return;
  }

  const text =
    buildSaleReceiptText(
      sale,
      index
    );

  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
    }else{
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    alert("Comprobante copiado.");
  }catch(error){
    console.error(error);
    alert("No se pudo copiar automáticamente. Puedes seleccionar y copiar el texto del comprobante.");
  }

}


function shareSaleReceiptWhatsApp(index) {

  const sale =
    db.sales[index];

  if(!sale){
    return;
  }

  const customer =
    getSaleCustomer(sale);

  const phone =
    receiptPhone(customer?.phone);

  const text =
    buildSaleReceiptText(
      sale,
      index
    );

  const url =
    phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


function printSaleReceipt(index) {

  const sale =
    db.sales[index];

  if(!sale){
    return;
  }

  const text =
    buildSaleReceiptText(
      sale,
      index
    );

  const printWindow =
    window.open(
      "",
      "_blank",
      "width=430,height=720"
    );

  if(!printWindow){
    alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para Aquarium Fish.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Comprobante #${receiptNumber(index)} - Aquarium Fish</title>
      <style>
        body{
          font-family:Arial,Helvetica,sans-serif;
          padding:24px;
          color:#111;
        }
        pre{
          white-space:pre-wrap;
          font:15px/1.5 Arial,Helvetica,sans-serif;
        }
      </style>
    </head>
    <body>
      <pre>${esc(text)}</pre>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();

}


/* =========================================================
   CLIENTES
   ========================================================= */

function customerPaymentTotal(customer) {

  if(!customer || !Array.isArray(customer.payments)){
    return 0;
  }


  return customer.payments.reduce(
    (sum,payment) =>
      sum +
      Math.max(
        0,
        +payment.amount || 0
      ),
    0
  );

}


function customerStats(name) {

  const customer =
    db.customers.find(
      item =>
        item.name ===
        name
    );


  const sales =
    db.sales.filter(
      sale =>
        sale.client ===
        name
    );


  const bought =
    sales.reduce(
      (sum,sale) =>
        sum +
        (+sale.total || 0),
      0
    );


  const salePaidAmount =
    sales.reduce(
      (sum,sale) =>
        sum +
        salePaid(sale),
      0
    );


  const extraPayments =
    customerPaymentTotal(
      customer
    );


  const paid =
    salePaidAmount +
    extraPayments;


  return {

    sales,

    bought,

    paid,

    salePaid:
      salePaidAmount,

    payments:
      extraPayments,

    balance:
      Math.max(
        0,
        bought - paid
      )

  };

}


function customerBalance(name){

  return customerStats(
    name
  ).balance;

}


function openCustomerAccount(index){

  const customer =
    db.customers[index];


  if(!customer){
    return;
  }


  const stats =
    customerStats(
      customer.name
    );


  const payments =
    Array.isArray(
      customer.payments
    )
      ? customer.payments
      : [];


  modal(
    `Cuenta de ${customer.name}`,
    `

      <div class="panel">

        <b>
          Resumen de cuenta
        </b>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
            gap:8px;
            margin-top:10px;
          "
        >

          <div class="card">
            <span>Comprado</span>
            <b>${money(stats.bought)}</b>
          </div>

          <div class="card">
            <span>Pagado</span>
            <b>${money(stats.paid)}</b>
          </div>

          <div class="card">
            <span>Saldo pendiente</span>
            <b>${money(stats.balance)}</b>
          </div>

        </div>

      </div>


      <h3 style="margin:16px 0 8px;">
        Ventas
      </h3>

      ${
        stats.sales.length
          ? `
            <div>
              ${
                stats.sales
                  .map(
                    sale => `
                      <div
                        class="item"
                        style="margin-bottom:8px;"
                      >

                        <div>
                          <b>
                            ${esc(
                              dateKey(
                                sale.date
                              )
                            )}
                          </b>

                          <div class="muted">
                            ${esc(
                              saleLabel(
                                sale
                              )
                            )}
                          </div>

                        </div>

                        <div class="right">

                          <b>
                            ${money(
                              sale.total
                            )}
                          </b>

                          <small>
                            Pagado:
                            ${money(
                              salePaid(
                                sale
                              )
                            )}
                          </small>

                        </div>

                      </div>
                    `
                  )
                  .join("")
              }
            </div>
          `
          : `
            <div class="empty">
              No hay ventas registradas.
            </div>
          `
      }


      <h3 style="margin:16px 0 8px;">
        Abonos registrados
      </h3>

      ${
        payments.length
          ? `
            <div>
              ${
                payments
                  .slice()
                  .reverse()
                  .map(
                    payment => `
                      <div
                        class="item"
                        style="margin-bottom:8px;"
                      >

                        <div>
                          <b>
                            ${money(
                              payment.amount
                            )}
                          </b>

                          <div class="muted">
                            ${esc(
                              payment.method ||
                              "Otro"
                            )}
                            ·
                            ${esc(
                              payment.date ||
                              ""
                            )}
                          </div>

                          ${
                            payment.note
                              ? `
                                <div class="muted">
                                  ${esc(
                                    payment.note
                                  )}
                                </div>
                              `
                              : ""
                          }

                        </div>

                        <span class="badge">
                          Abono
                        </span>

                      </div>
                    `
                  )
                  .join("")
              }
            </div>
          `
          : `
            <div class="empty">
              No hay abonos adicionales.
            </div>
          `
      }


      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:16px;
        "
      >

        ${
          stats.balance > 0
            ? `
              <button
                class="primary"
                type="button"
                onclick="openCustomerPayment(${index})"
              >
                💰 Registrar abono
              </button>
            `
            : `
              <button
                type="button"
                disabled
              >
                ✅ Cuenta al día
              </button>
            `
        }

        <button
          type="button"
          onclick="openCustomer(${index})"
        >
          ✏️ Editar cliente
        </button>

        <button
          type="button"
          onclick="closeModal()"
        >
          Cerrar
        </button>

      </div>

    `
  );

}


function openCustomerPayment(index){

  const customer =
    db.customers[index];


  if(!customer){
    return;
  }


  const stats =
    customerStats(
      customer.name
    );


  if(stats.balance <= 0){

    alert(
      "Este cliente no tiene saldo pendiente."
    );

    return;

  }


  modal(
    `Registrar abono - ${customer.name}`,
    `

      <div class="panel">

        <b>
          Saldo pendiente:
          ${money(stats.balance)}
        </b>

      </div>


      <label>

        Valor del abono

        <input
          name="amount"
          type="number"
          min="1"
          max="${stats.balance}"
          step="1"
          value="${stats.balance}"
          required
        >

      </label>


      <label>

        Forma de pago

        <select name="method">

          <option>Efectivo</option>
          <option>Transferencia</option>
          <option>Nequi</option>
          <option>Daviplata</option>
          <option>Tarjeta</option>
          <option>Otro</option>

        </select>

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
          placeholder="Ej.: Abono a cuenta"
        ></textarea>

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:14px;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar abono
        </button>

        <button
          type="button"
          onclick="openCustomerAccount(${index})"
        >
          Volver a cuenta
        </button>

      </div>

    `,
    event => {

      event.preventDefault();


      const form =
        event.target;


      const amount =
        +form.amount.value || 0;


      if(amount <= 0){

        alert(
          "Escribe un valor de abono."
        );

        return;

      }


      if(amount > stats.balance){

        alert(
          `El abono no puede superar el saldo pendiente de ${money(stats.balance)}.`
        );

        return;

      }


      if(!Array.isArray(customer.payments)){
        customer.payments = [];
      }


      customer.payments.push({

        date:
          now(),

        amount,

        method:
          form.method.value,

        note:
          form.note.value.trim(),

        source:
          "Abono cliente"

      });


      save();

      closeModal();


      setTimeout(
        () =>
          openCustomerAccount(index),
        0
      );

    }
  );

}


function renderCustomers() {

  const search =
    document.getElementById(
      "customerSearch"
    );


  const list =
    document.getElementById(
      "customersList"
    );


  if(
    !search ||
    !list
  ){

    return;

  }


  const q =
    String(
      search.value || ""
    )
      .toLowerCase()
      .trim();


  const rows =
    db.customers
      .filter(
        customer =>
          `${customer.name || ""} ${
            customer.phone || ""
          }`
            .toLowerCase()
            .includes(q)
      )
      .sort(
        (a,b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            ),
            "es"
          )
      );


  list.innerHTML =
    rows.length

      ? rows
          .map(
            customer => {

              const index =
                db.customers.indexOf(
                  customer
                );


              const stats =
                customerStats(
                  customer.name
                );


              return `

                <div
                  class="item clickable"
                  onclick="editCustomer(
                    ${index}
                  )"
                >

                  <div>

                    <b>
                      ${esc(
                        customer.name
                      )}
                    </b>

                    <div class="muted">

                      ${esc(
                        customer.phone ||
                        "Sin teléfono"
                      )}

                    </div>

                    <div class="muted">

                      Comprado
                      ${money(
                        stats.bought
                      )}

                      ·

                      Pagado
                      ${money(
                        stats.paid
                      )}

                      ·

                      Saldo
                      ${money(
                        stats.balance
                      )}

                    </div>

                    ${
                      customer.note
                        ? `

                          <div class="muted">

                            Nota:
                            ${esc(
                              customer.note
                            )}

                          </div>

                        `
                        : ""
                    }

                  </div>


                  <div
                    style="
                      display:flex;
                      flex-direction:column;
                      align-items:flex-end;
                      gap:6px;
                    "
                  >

                    <span
                      class="badge ${
                        stats.balance > 0
                          ? "low"
                          : ""
                      }"
                    >

                      ${
                        stats.sales.length
                      }

                      ${
                        stats.sales.length === 1
                          ? "venta"
                          : "ventas"
                      }

                    </span>

                    <button
                      type="button"
                      onclick="event.stopPropagation();openCustomerAccount(${index})"
                    >
                      💳 Ver cuenta
                    </button>

                    ${
                      stats.balance > 0
                        ? `
                          <button
                            type="button"
                            class="primary"
                            onclick="event.stopPropagation();openCustomerPayment(${index})"
                          >
                            💰 Abonar
                          </button>
                        `
                        : ""
                    }

                  </div>

                </div>

              `;

            }
          )
          .join("")

      : `

        <div class="empty">

          No hay clientes.
          Agrega el primero.

        </div>

      `;

}



/* =========================================================
   COTIZADOR
   ========================================================= */

let quoteItems = [];
let quoteCategory = "Todas";
let quoteSearch = "";
let quoteCustomer = "";
let quotePhone = "";
let quoteNote = "";

function setupCotizadorUI(){
  const main = document.querySelector("main");
  const nav = document.querySelector("nav");
  if(!main || !nav){
    return;
  }

  let section = document.getElementById("cotizador");
  if(!section){
    section = document.createElement("section");
    section.id = "cotizador";
    section.className = "screen";
    main.appendChild(section);
  }

  let navButton = nav.querySelector('button[data-tab="cotizador"]');
  if(!navButton){
    navButton = document.createElement("button");
    navButton.type = "button";
    navButton.dataset.tab = "cotizador";
    navButton.innerHTML = `🧾<span>Cotizador</span>`;
    nav.appendChild(navButton);
  }

  renderCotizador();
}

function quoteCategories(){
  return [
    "Todas",
    ...new Set(
      db.products
        .map(p => String(p.category || "").trim())
        .filter(Boolean)
    )
  ];
}

function quoteTotal(){
  return quoteItems.reduce(
    (sum,item) =>
      sum + ((+item.qty || 0) * (+item.unitPrice || 0)),
    0
  );
}

function quoteItemKey(index){
  return `${index}`;
}

function addQuoteItem(index){
  const product = db.products[index];
  if(!product){
    return;
  }

  const key = quoteItemKey(index);
  const existing = quoteItems.find(item => item.key === key);

  if(existing){
    existing.qty = Math.max(1, (+existing.qty || 0) + 1);
  }else{
    quoteItems.push({
      key,
      productIndex: index,
      name: String(product.name || "Producto"),
      qty: 1,
      unitPrice: Math.max(0, +product.price || 0)
    });
  }

  renderCotizador();
}

function updateQuoteItem(key, field, value){
  const item = quoteItems.find(i => i.key === String(key));
  if(!item){
    return;
  }

  if(field === "qty"){
    item.qty = Math.max(1, parseInt(value,10) || 1);
  }else if(field === "unitPrice"){
    item.unitPrice = Math.max(0, +value || 0);
  }

  renderCotizador();
}

function removeQuoteItem(key){
  quoteItems = quoteItems.filter(item => item.key !== String(key));
  renderCotizador();
}

function clearQuote(){
  if(!quoteItems.length && !quoteCustomer && !quotePhone && !quoteNote){
    return;
  }

  if(confirm("¿Limpiar la cotización actual?")){
    quoteItems = [];
    quoteCustomer = "";
    quotePhone = "";
    quoteNote = "";
    renderCotizador();
  }
}

function buildQuoteText(){
  const lines = [
    "🐠 AQUARIUM FISH",
    "COTIZACIÓN",
    ""
  ];

  if(quoteCustomer.trim()){
    lines.push(`Cliente: ${quoteCustomer.trim()}`);
  }

  if(quotePhone.trim()){
    lines.push(`Teléfono: ${quotePhone.trim()}`);
  }

  if(quoteCustomer.trim() || quotePhone.trim()){
    lines.push("");
  }

  quoteItems.forEach(item => {
    const subtotal = (+item.qty || 0) * (+item.unitPrice || 0);
    lines.push(
      `${item.qty} x ${item.name} — ${money(subtotal)}`
    );
  });

  lines.push("");
  lines.push(`TOTAL: ${money(quoteTotal())}`);

  if(quoteNote.trim()){
    lines.push("");
    lines.push(`Nota: ${quoteNote.trim()}`);
  }

  lines.push("");
  lines.push("Gracias por elegir Aquarium Fish 🐠");

  return lines.join("\n");
}

async function copyQuote(){
  if(!quoteItems.length){
    alert("Agrega al menos un producto a la cotización.");
    return;
  }

  const text = buildQuoteText();

  try{
    await navigator.clipboard.writeText(text);
    alert("Cotización copiada. Puedes pegarla donde quieras.");
  }catch(_){
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    try{
      document.execCommand("copy");
      alert("Cotización copiada.");
    }catch(__){
      alert("No se pudo copiar automáticamente. Puedes usar el botón de WhatsApp.");
    }
    area.remove();
  }
}

function shareQuoteWhatsApp(){
  if(!quoteItems.length){
    alert("Agrega al menos un producto a la cotización.");
    return;
  }

  const text = encodeURIComponent(buildQuoteText());
  let phone = quotePhone.replace(/\D/g, "");
  if(/^3\d{9}$/.test(phone)){
    phone = "57" + phone;
  }
  const url = phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`;

  window.open(url, "_blank", "noopener");
}

function renderCotizador(){
  const section = document.getElementById("cotizador");
  if(!section){
    return;
  }

  const categories = quoteCategories();
  const q = quoteSearch.trim().toLowerCase();

  const products = db.products
    .map((product,index) => ({product,index}))
    .filter(({product}) => {
      const category = String(product.category || "").trim();
      if(quoteCategory !== "Todas" && category !== quoteCategory){
        return false;
      }

      if(!q){
        return true;
      }

      return `${product.name || ""} ${category}`
        .toLowerCase()
        .includes(q);
    })
    .sort((a,b) =>
      String(a.product.name || "").localeCompare(
        String(b.product.name || ""),
        "es"
      )
    );

  section.innerHTML = `
    <div class="section-head">
      <h1>🧾 Cotizador</h1>
      <button type="button" onclick="clearQuote()">Limpiar</button>
    </div>

    <div class="panel">
      <h2>Cliente</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <input
          id="quoteCustomer"
          class="search"
          placeholder="Nombre del cliente"
          value="${esc(quoteCustomer)}"
        >
        <input
          id="quotePhone"
          class="search"
          type="tel"
          placeholder="WhatsApp / teléfono"
          value="${esc(quotePhone)}"
        >
      </div>
    </div>

    <div class="panel">
      <h2>Agregar productos</h2>
      <p class="muted">
        Selecciona varios productos. El cotizador usa el precio de venta del inventario y no modifica el stock.
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;">
        <input
          id="quoteSearch"
          class="search"
          placeholder="🔎 Buscar producto..."
          value="${esc(quoteSearch)}"
        >
        <select id="quoteCategory" class="search">
          ${categories.map(category => `
            <option value="${esc(category)}" ${category === quoteCategory ? "selected" : ""}>
              ${esc(category)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="list" style="max-height:360px;overflow:auto;">
        ${products.length ? products.map(({product,index}) => `
          <div class="item" style="align-items:center;gap:8px;">
            <div style="flex:1;min-width:0;">
              <b>${esc(product.name || "Producto")}</b>
              <div class="muted">
                ${esc(product.category || "Sin categoría")} · ${money(product.price)}
              </div>
            </div>
            <button type="button" class="primary" onclick="addQuoteItem(${index})">
              + Agregar
            </button>
          </div>
        `).join("") : `
          <div class="empty">No hay productos que coincidan.</div>
        `}
      </div>
    </div>

    <div class="panel">
      <h2>🛒 Cotización actual</h2>
      ${quoteItems.length ? quoteItems.map(item => {
        const subtotal = (+item.qty || 0) * (+item.unitPrice || 0);
        return `
          <div class="item" style="align-items:flex-start;gap:8px;">
            <div style="flex:1;min-width:0;">
              <b>${esc(item.name)}</b>
              <div style="display:grid;grid-template-columns:90px 1fr;gap:8px;margin-top:6px;">
                <input
                  class="search"
                  type="number"
                  min="1"
                  step="1"
                  value="${+item.qty || 1}"
                  aria-label="Cantidad"
                  onchange="updateQuoteItem('${esc(item.key)}','qty',this.value)"
                >
                <input
                  class="search"
                  type="number"
                  min="0"
                  step="1"
                  value="${+item.unitPrice || 0}"
                  aria-label="Precio unitario"
                  onchange="updateQuoteItem('${esc(item.key)}','unitPrice',this.value)"
                >
              </div>
              <div class="muted" style="margin-top:5px;">
                ${Number(item.qty) || 1} unidad(es) · Subtotal ${money(subtotal)}
              </div>
            </div>
            <button type="button" onclick="removeQuoteItem('${esc(item.key)}')">🗑️</button>
          </div>
        `;
      }).join("") : `
        <div class="empty">Agrega productos para comenzar.</div>
      `}

      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,.08);">
        <label>
          Nota para el cliente
          <textarea
            id="quoteNote"
            rows="3"
            placeholder="Ej. Instalación, domicilio, disponibilidad, etc."
          >${esc(quoteNote)}</textarea>
        </label>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;">
        <span><b>Total</b></span>
        <strong style="font-size:1.35rem;">${money(quoteTotal())}</strong>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
        <button type="button" class="primary" onclick="saveQuote()">💾 Guardar cotización</button>
        <button type="button" onclick="copyQuote()">📋 Copiar</button>
        <button type="button" class="primary" onclick="shareQuoteWhatsApp()">📲 WhatsApp</button>
      </div>

      <p class="muted" style="margin-top:10px;">
        El cotizador muestra precios de venta. La ganancia nunca se muestra al cliente.
      </p>
    </div>
  `;

  const customer = document.getElementById("quoteCustomer");
  if(customer){
    customer.oninput = function(){ quoteCustomer = this.value; };
  }

  const phone = document.getElementById("quotePhone");
  if(phone){
    phone.oninput = function(){ quotePhone = this.value; };
  }

  const note = document.getElementById("quoteNote");
  if(note){
    note.oninput = function(){ quoteNote = this.value; };
  }

  const search = document.getElementById("quoteSearch");
  if(search){
    search.oninput = function(){
      quoteSearch = this.value;
      const cursor = this.value.length;
      renderCotizador();
      const next = document.getElementById("quoteSearch");
      if(next){
        next.focus();
        try{ next.setSelectionRange(cursor,cursor); }catch(_){ }
      }
    };
  }

  const category = document.getElementById("quoteCategory");
  if(category){
    category.onchange = function(){
      quoteCategory = this.value;
      renderCotizador();
    };
  }
}

/* =========================================================
   MOVIMIENTOS
   ========================================================= */

function renderMoves() {

  const list =
    document.getElementById(
      "movesList"
    );


  if(!list){

    return;

  }


  list.innerHTML =
    db.moves.length

      ? db.moves
          .slice()
          .reverse()
          .map(
            move => `

              <div class="item">

                <div>

                  <b>
                    ${esc(
                      move.product
                    )}
                  </b>

                  <div class="muted">

                    ${
                      move.source === "Venta"
                        ? "Venta automática"
                        : esc(
                            move.reason ||
                            ""
                          )
                    }

                    ·

                    ${esc(
                      move.responsible ||
                      ""
                    )}

                    ·

                    ${esc(
                      move.date ||
                      ""
                    )}

                  </div>

                </div>

                <span class="badge">

                  ${esc(
                    move.type
                  )}

                  ${move.qty}

                </span>

              </div>

            `
          )
          .join("")

      : `

        <div class="empty">
          No hay movimientos.
        </div>

      `;

}


/* =========================================================
   ENCARGOS
   ========================================================= */

let orderFilter = "Todos";
let orderSearch = "";

function orderStatusClass(status){
  const value = String(status || "Pendiente");
  if(value === "Listo" || value === "Entregado"){
    return "done";
  }
  return "";
}

function renderOrders() {

  const list =
    document.getElementById(
      "ordersList"
    );

  if(!list){
    return;
  }

  let panel =
    document.getElementById(
      "ordersSmartPanel"
    );

  if(!panel){

    panel =
      document.createElement(
        "div"
      );

    panel.id =
      "ordersSmartPanel";

    list.insertAdjacentElement(
      "beforebegin",
      panel
    );

  }

  const pendingCount =
    db.orders.filter(
      order =>
        String(order.status || "Pendiente") !==
        "Entregado" &&
        String(order.status || "Pendiente") !==
        "Cancelado"
    ).length;

  const readyCount =
    db.orders.filter(
      order =>
        String(order.status || "") ===
        "Listo"
    ).length;

  const deliveredCount =
    db.orders.filter(
      order =>
        String(order.status || "") ===
        "Entregado"
    ).length;

  panel.innerHTML = `

    <div class="cards" style="margin:10px 0;">

      <div class="card">
        <b>📦 Activos</b>
        <strong>${pendingCount}</strong>
      </div>

      <div class="card">
        <b>✅ Listos</b>
        <strong>${readyCount}</strong>
      </div>

      <div class="card">
        <b>🤝 Entregados</b>
        <strong>${deliveredCount}</strong>
      </div>

    </div>

    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin:10px 0;
    ">

      <input
        id="orderSearch"
        class="search"
        placeholder="🔎 Buscar encargo o cliente"
        value="${esc(orderSearch)}"
      >

      <select
        id="orderFilter"
        class="search"
      >
        <option value="Todos" ${orderFilter === "Todos" ? "selected" : ""}>
          Todos
        </option>
        <option value="Pendiente" ${orderFilter === "Pendiente" ? "selected" : ""}>
          🕐 Pendientes
        </option>
        <option value="Conseguir" ${orderFilter === "Conseguir" ? "selected" : ""}>
          🔎 Por conseguir
        </option>
        <option value="Listo" ${orderFilter === "Listo" ? "selected" : ""}>
          ✅ Listos
        </option>
        <option value="Entregado" ${orderFilter === "Entregado" ? "selected" : ""}>
          🤝 Entregados
        </option>
        <option value="Cancelado" ${orderFilter === "Cancelado" ? "selected" : ""}>
          ❌ Cancelados
        </option>
      </select>

    </div>

    <button
      class="primary"
      type="button"
      onclick="openOrder()"
      style="margin-bottom:10px;"
    >
      ➕ Nuevo encargo
    </button>

  `;

  const searchInput =
    document.getElementById(
      "orderSearch"
    );

  if(searchInput){

    searchInput.oninput =
      function(){

        orderSearch =
          this.value;

        renderOrders();

        const input =
          document.getElementById(
            "orderSearch"
          );

        if(input){

          input.focus();

          try{
            input.setSelectionRange(
              input.value.length,
              input.value.length
            );
          }catch(_){}

        }

      };

  }

  const filterSelect =
    document.getElementById(
      "orderFilter"
    );

  if(filterSelect){

    filterSelect.onchange =
      function(){

        orderFilter =
          this.value;

        renderOrders();

      };

  }

  const searchText =
    orderSearch
      .trim()
      .toLowerCase();

  const rows =
    db.orders
      .map(
        (order,index) => ({
          order,
          index
        })
      )
      .filter(
        ({order}) => {

          const status =
            String(
              order.status ||
              "Pendiente"
            );

          if(
            orderFilter !==
            "Todos" &&
            status !==
            orderFilter
          ){
            return false;
          }

          if(!searchText){
            return true;
          }

          return (
            String(order.product || "")
              .toLowerCase()
              .includes(searchText) ||
            String(order.client || "")
              .toLowerCase()
              .includes(searchText) ||
            String(order.note || "")
              .toLowerCase()
              .includes(searchText)
          );

        }
      )
      .sort(
        (a,b) =>
          String(
            b.order.date ||
            ""
          ).localeCompare(
            String(
              a.order.date ||
              ""
            )
          )
      );

  list.innerHTML =
    rows.length

      ? rows.map(
          ({order,index}) => {

            const status =
              String(
                order.status ||
                "Pendiente"
              );

            const dueDate =
              String(
                order.dueDate ||
                ""
              );

            let dueText =
              "";

            if(dueDate){

              const parsed =
                parseLocalDate(
                  dueDate
                );

              if(parsed){

                const today =
                  startOfDay(
                    new Date()
                  );

                const due =
                  startOfDay(
                    parsed
                  );

                if(
                  due.getTime() ===
                  today.getTime()
                ){
                  dueText =
                    " · 📅 Para hoy";
                }else if(
                  due.getTime() <
                  today.getTime() &&
                  status !==
                  "Entregado" &&
                  status !==
                  "Cancelado"
                ){
                  dueText =
                    " · ⚠️ Vencido";
                }

              }

            }

            return `

              <div
                class="item"
                style="
                  align-items:flex-start;
                  gap:10px;
                "
              >

                <div
                  style="
                    flex:1;
                    min-width:0;
                  "
                >

                  <b>
                    ${esc(
                      order.product ||
                      "Encargo"
                    )}
                  </b>

                  <div class="muted">

                    👤 Cliente:
                    ${esc(
                      order.client ||
                      "Sin cliente"
                    )}

                    ·

                    📦 Cantidad:
                    ${esc(
                      order.qty ||
                      1
                    )}

                    ${dueText}

                  </div>

                  <div class="muted">

                    ${
                      order.dueDate
                        ? `📅 Fecha solicitada: ${esc(order.dueDate)} · `
                        : ""
                    }

                    ${esc(
                      order.note ||
                      "Sin nota"
                    )}

                  </div>

                  <div class="muted">
                    Registrado:
                    ${esc(
                      order.date ||
                      ""
                    )}
                  </div>

                  ${
                    (+order.price || 0) > 0
                      ? `
                        <div
                          style="
                            margin-top:4px;
                            font-weight:700;
                          "
                        >
                          Valor estimado:
                          ${money(order.price)}
                        </div>
                      `
                      : ""
                  }

                  <div
                    style="
                      display:flex;
                      gap:6px;
                      flex-wrap:wrap;
                      margin-top:8px;
                    "
                  >

                    <button
                      type="button"
                      onclick="editOrder(${index})"
                    >
                      ✏️ Editar
                    </button>

                    <button
                      type="button"
                      onclick="advanceOrderStatus(${index})"
                    >
                      🔄 Cambiar estado
                    </button>

                    <button
                      type="button"
                      onclick="deleteOrder(${index})"
                    >
                      🗑️
                    </button>

                  </div>

                </div>

                <button
                  type="button"
                  class="
                    badge
                    order-status
                    ${orderStatusClass(status)}
                  "
                  onclick="
                    advanceOrderStatus(
                      ${index}
                    )
                  "
                >
                  ${esc(status)}
                </button>

              </div>

            `;

          }
        ).join("")

      : `

        <div class="empty">
          ${
            db.orders.length
              ? "No hay encargos que coincidan con el filtro."
              : "No hay encargos registrados."
          }
        </div>

      `;

}


function advanceOrderStatus(index){

  if(!db.orders[index]){
    return;
  }

  const sequence = [
    "Pendiente",
    "Conseguir",
    "Listo",
    "Entregado"
  ];

  const current =
    String(
      db.orders[index].status ||
      "Pendiente"
    );

  let next;

  if(current === "Cancelado"){
    next = "Pendiente";
  }else{

    const position =
      sequence.indexOf(
        current
      );

    next =
      sequence[
        position < 0
          ? 0
          : (position + 1) % sequence.length
      ];

  }

  db.orders[index].status =
    next;

  db.orders[index].updated =
    now();

  save();

}


function toggleOrder(index) {

  advanceOrderStatus(index);

}


/* =========================================================
   MODAL
   ========================================================= */

function getModal() {

  return document.getElementById(
    "modal"
  );

}


function modal(
  title,
  html,
  submitHandler
) {

  const modalElement =
    getModal();


  const titleElement =
    document.getElementById(
      "modalTitle"
    );


  const formElement =
    document.getElementById(
      "form"
    );


  if(
    !modalElement ||
    !titleElement ||
    !formElement
  ){

    console.error(
      "No se encontró el modal."
    );

    return;

  }


  titleElement.textContent =
    title;


  formElement.innerHTML =
    html;


  modalElement.classList.remove(
    "hidden"
  );


  formElement.onsubmit =
    typeof submitHandler ===
    "function"

      ? submitHandler

      : null;

}


function closeModal() {

  const modalElement =
    getModal();


  if(modalElement){

    modalElement.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   PRODUCTOS
   ========================================================= */

function openProduct(
  index = null
) {

  const product =
    index === null

      ? {

          name: "",

          category:
            "Peces",

          cost: 0,

          price: 0,

          stock: 0,

          min: 1

        }

      : db.products[index];


  if(!product){

    return;

  }


  modal(

    index === null
      ? "Nuevo producto"
      : "Editar producto",


    `

      <label>

        Producto

        <input
          name="name"
          required
          value="${esc(
            product.name
          )}"
          placeholder="Ej. Guppy"
        >

      </label>


      <label>

        Categoría

        <select name="category">

          ${
            inventoryCategories()
              .map(
                category => `

                  <option
                    value="${esc(
                      category
                    )}"
                    ${
                      String(
                        product.category ||
                        ""
                      ) === category
                        ? "selected"
                        : ""
                    }
                  >

                    ${esc(
                      category
                    )}

                  </option>

                `
              )
              .join("")
          }

        </select>

      </label>


      <label>

        Costo

        <input
          name="cost"
          type="number"
          min="0"
          step="1"
          value="${
            +product.cost || 0
          }"
        >

      </label>


      <label>

        Precio de venta

        <input
          name="price"
          type="number"
          min="0"
          step="1"
          value="${
            +product.price || 0
          }"
        >

      </label>


      <label>

        Stock

        <input
          name="stock"
          type="number"
          min="0"
          step="1"
          value="${
            +product.stock || 0
          }"
        >

      </label>


      <label>

        Stock mínimo

        <input
          name="min"
          type="number"
          min="0"
          step="1"
          value="${
            +product.min || 0
          }"
        >

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
          flex-wrap:wrap;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar
        </button>


        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>


        ${
          index !== null

            ? `

              <button
                type="button"
                onclick="deleteProduct(
                  ${index}
                )"
              >
                🗑️ Eliminar
              </button>

            `

            : ""
        }

      </div>

    `,


    event => {

      event.preventDefault();


      const form =
        event.target;


      const item = {

        name:
          form.name.value.trim(),

        category:
          form.category.value,

        cost:
          +form.cost.value || 0,

        price:
          +form.price.value || 0,

        stock:
          Math.max(
            0,
            +form.stock.value || 0
          ),

        min:
          Math.max(
            0,
            +form.min.value || 0
          )

      };


      if(!item.name){

        alert(
          "Escribe el nombre del producto."
        );

        return;

      }


      if(index === null){

        db.products.push(
          item
        );

      }else{

        db.products[index] =
          item;

      }


      save();

      closeModal();

    }

  );

}


function editProduct(index) {

  openProduct(index);

}


function deleteProduct(index) {

  if(!db.products[index]){

    return;

  }


  if(
    !confirm(
      `¿Eliminar "${db.products[index].name}"?`
    )
  ){

    return;

  }


  db.products.splice(
    index,
    1
  );


  save();

  closeModal();

}


/* =========================================================
   VENTAS
   ========================================================= */

function addSaleRow() {

  const container =
    document.getElementById(
      "saleRows"
    );


  if(!container){

    return;

  }


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "sale-row";


  row.style.cssText =
    `
      display:grid;
      grid-template-columns:1fr 80px 45px;
      gap:6px;
      margin-bottom:8px;
    `;


  row.innerHTML = `

    <select
      class="sale-product"
    >

      <option value="">
        Producto
      </option>

      ${
        db.products
          .map(
            (
              product,
              index
            ) => `

              <option
                value="${index}"
              >

                ${esc(
                  product.name
                )}

                —

                stock
                ${product.stock}

              </option>

            `
          )
          .join("")
      }

    </select>


    <input
      class="sale-qty"
      type="number"
      min="1"
      value="1"
    >


    <button
      type="button"
    >
      ✕
    </button>

  `;


  container.appendChild(
    row
  );


  row.querySelector(
    ".sale-product"
  ).onchange =
    updateSalePreview;


  row.querySelector(
    ".sale-qty"
  ).oninput =
    updateSalePreview;


  row.querySelector(
    "button"
  ).onclick =
    function(){

      row.remove();

      updateSalePreview();

    };


  updateSalePreview();

}


function updateSalePreview() {

  const rows =
    [
      ...document.querySelectorAll(
        ".sale-row"
      )
    ];


  let total = 0;

  let profit = 0;


  rows.forEach(
    row => {

      const productIndex =
        row.querySelector(
          ".sale-product"
        )?.value;


      const quantity =
        +(
          row.querySelector(
            ".sale-qty"
          )?.value || 0
        );


      const product =
        productIndex !== ""
          ? db.products[
              +productIndex
            ]
          : null;


      if(
        product &&
        quantity > 0
      ){

        total +=
          (+product.price || 0) *
          quantity;


        profit +=
          (
            (+product.price || 0) -
            (+product.cost || 0)
          ) *
          quantity;

      }

    }
  );


  const totalElement =
    document.getElementById(
      "saleTotalPreview"
    );


  const profitElement =
    document.getElementById(
      "saleProfitPreview"
    );


  if(totalElement){

    totalElement.textContent =
      money(total);

  }


  if(profitElement){

    profitElement.textContent =
      money(profit);

  }


  return {

    total,

    profit

  };

}


function openSale() {

  modal(

    "Nueva venta",


    `

      <label>

        Cliente

        <select name="client">

          <option value="">
            Sin cliente
          </option>

          ${
            db.customers
              .map(
                customer => `

                  <option
                    value="${esc(
                      customer.name
                    )}"
                  >

                    ${esc(
                      customer.name
                    )}

                  </option>

                `
              )
              .join("")
          }

        </select>

      </label>


      <div id="saleRows"></div>


      <button
        type="button"
        onclick="addSaleRow()"
      >
        ➕ Agregar producto
      </button>


      <div
        class="panel"
        style="margin-top:12px;"
      >

        <b>

          Total:

          <span
            id="saleTotalPreview"
          >
            ${money(0)}
          </span>

        </b>


        <div>

          Ganancia estimada:

          <span
            id="saleProfitPreview"
          >
            ${money(0)}
          </span>

        </div>

      </div>


      <label>

        Forma de pago

        <select name="pay">

          <option>
            Efectivo
          </option>

          <option>
            Transferencia
          </option>

          <option>
            Nequi
          </option>

          <option>
            Daviplata
          </option>

          <option>
            Tarjeta
          </option>

          <option>
            Otro
          </option>

        </select>

      </label>


      <label>

        Estado

        <select name="status">

          <option>
            Pagada
          </option>

          <option>
            Abono
          </option>

          <option>
            Pendiente
          </option>

        </select>

      </label>


      <label>

        Abono recibido

        <input
          name="paid"
          type="number"
          min="0"
          step="1"
          value="0"
        >

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar venta
        </button>


        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>

      </div>

    `,


    event => {

      event.preventDefault();


      const form =
        event.target;


      const items = [];


      for(
        const row of
        form.querySelectorAll(
          ".sale-row"
        )
      ){

        const productIndex =
          row.querySelector(
            ".sale-product"
          )?.value;


        const quantity =
          +(
            row.querySelector(
              ".sale-qty"
            )?.value || 0
          );


        if(
          productIndex === "" ||
          quantity <= 0
        ){

          continue;

        }


        const product =
          db.products[
            +productIndex
          ];


        if(!product){

          continue;

        }


        if(
          (+product.stock || 0) <
          quantity
        ){

          alert(
            `No hay suficiente stock de "${product.name}".`
          );

          return;

        }


        items.push({

          product:
            product.name,

          productIndex:
            +productIndex,

          qty:
            quantity,

          price:
            +product.price || 0,

          cost:
            +product.cost || 0

        });

      }


      if(!items.length){

        alert(
          "Agrega al menos un producto."
        );

        return;

      }


      const total =
        items.reduce(
          (sum,item) =>
            sum +
            item.price *
            item.qty,
          0
        );


      let paid =
        +form.paid.value || 0;


      const status =
        form.status.value;


      if(
        (
          status === "Abono" ||
          status === "Pendiente"
        ) &&
        !String(
          form.client.value || ""
        ).trim()
      ){

        alert(
          "Para una venta con abono o pendiente debes seleccionar un cliente."
        );

        return;

      }


      if(
        status ===
        "Pagada"
      ){

        paid =
          total;

      }


      if(
        status ===
        "Pendiente"
      ){

        paid =
          0;

      }


      paid =
        Math.max(
          0,
          Math.min(
            paid,
            total
          )
        );


      items.forEach(
        item => {

          const product =
            db.products[
              item.productIndex
            ];


          product.stock =
            Math.max(
              0,
              (+product.stock || 0) -
              item.qty
            );

        }
      );


      db.sales.push({

        date:
          now(),

        client:
          form.client.value,

        items,

        total,

        paid,

        pay:
          form.pay.value,

        status,

        profit:
          items.reduce(
            (sum,item) =>
              sum +
              (
                item.price -
                item.cost
              ) *
              item.qty,
            0
          )

      });


      items.forEach(
        item => {
          const product = db.products[item.productIndex];

          if(!product){
            return;
          }

          db.moves.push({
            date: now(),
            product: product.name,
            type: "Salida",
            qty: item.qty,
            reason: "Venta",
            responsible: "Sistema",
            source: "Venta"
          });
        }
      );

      save();

      closeModal();

    }

  );


  addSaleRow();

}


/* =========================================================
   CLIENTES
   ========================================================= */

function openCustomer(
  index = null
) {

  const customer =
    index === null

      ? {

          name: "",

          phone: "",

          note: ""

        }

      : db.customers[index];


  if(!customer){

    return;

  }


  modal(

    index === null
      ? "Nuevo cliente"
      : "Editar cliente",


    `

      <label>

        Nombre

        <input
          name="name"
          required
          value="${esc(
            customer.name
          )}"
        >

      </label>


      <label>

        Teléfono

        <input
          name="phone"
          value="${esc(
            customer.phone
          )}"
        >

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
        >${esc(
          customer.note
        )}</textarea>

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
          flex-wrap:wrap;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar
        </button>


        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>


        ${
          index !== null

            ? `

              <button
                type="button"
                onclick="deleteCustomer(
                  ${index}
                )"
              >
                🗑️ Eliminar
              </button>

            `

            : ""
        }

      </div>

    `,


    event => {

      event.preventDefault();


      const form =
        event.target;


      const item = {

        name:
          form.name.value.trim(),

        phone:
          form.phone.value.trim(),

        note:
          form.note.value.trim()

      };


      if(!item.name){

        alert(
          "Escribe el nombre del cliente."
        );

        return;

      }


      if(index === null){

        db.customers.push(
          item
        );

      }else{

        db.customers[index] =
          item;

      }


      save();

      closeModal();

    }

  );

}


function editCustomer(index){

  openCustomer(index);

}


function deleteCustomer(index){

  if(!db.customers[index]){

    return;

  }


  if(
    !confirm(
      `¿Eliminar al cliente "${db.customers[index].name}"?`
    )
  ){

    return;

  }


  db.customers.splice(
    index,
    1
  );


  save();

  closeModal();

}


/* =========================================================
   ENCARGOS
   ========================================================= */

function openOrder(
  index = null
) {

  const order =
    index === null

      ? {
          product: "",
          client: "",
          customerIndex: "",
          qty: 1,
          price: 0,
          dueDate: "",
          note: "",
          status: "Pendiente"
        }

      : {
          ...db.orders[index]
        };

  if(!order){
    return;
  }

  const customerOptions =
    db.customers
      .map(
        (customer,customerIndex) => `
          <option
            value="${customerIndex}"
            ${
              String(
                order.customerIndex
              ) ===
              String(customerIndex)
                ? "selected"
                : ""
            }
          >
            ${esc(
              customer.name
            )}
            ${
              customer.phone
                ? ` · ${esc(customer.phone)}`
                : ""
            }
          </option>
        `
      )
      .join("");

  modal(

    index === null
      ? "Nuevo encargo"
      : "Editar encargo",

    `

      <label>

        Producto / encargo

        <input
          name="product"
          required
          value="${esc(
            order.product || ""
          )}"
          placeholder="Ej. Oscar 10 cm"
        >

      </label>


      <label>

        Cliente registrado

        <select
          name="customerIndex"
        >

          <option value="">
            — Sin cliente registrado —
          </option>

          ${customerOptions}

        </select>

      </label>


      <label>

        Cliente

        <input
          name="client"
          value="${esc(
            order.client || ""
          )}"
          placeholder="Nombre del cliente"
        >

      </label>


      <label>

        Cantidad

        <input
          name="qty"
          type="number"
          min="1"
          step="1"
          value="${
            +order.qty || 1
          }"
        >

      </label>


      <label>

        Valor estimado

        <input
          name="price"
          type="number"
          min="0"
          step="1"
          value="${
            +order.price || 0
          }"
          placeholder="Opcional"
        >

      </label>


      <label>

        Fecha solicitada

        <input
          name="dueDate"
          type="date"
          value="${esc(
            order.dueDate || ""
          )}"
        >

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
          placeholder="Color, tamaño, especie, proveedor, etc."
        >${esc(
          order.note || ""
        )}</textarea>

      </label>


      <label>

        Estado

        <select name="status">

          <option
            value="Pendiente"
            ${
              order.status ===
              "Pendiente"
                ? "selected"
                : ""
            }
          >
            🕐 Pendiente
          </option>

          <option
            value="Conseguir"
            ${
              order.status ===
              "Conseguir"
                ? "selected"
                : ""
            }
          >
            🔎 Por conseguir
          </option>

          <option
            value="Listo"
            ${
              order.status ===
              "Listo"
                ? "selected"
                : ""
            }
          >
            ✅ Listo
          </option>

          <option
            value="Entregado"
            ${
              order.status ===
              "Entregado"
                ? "selected"
                : ""
            }
          >
            🤝 Entregado
          </option>

          <option
            value="Cancelado"
            ${
              order.status ===
              "Cancelado"
                ? "selected"
                : ""
            }
          >
            ❌ Cancelado
          </option>

        </select>

      </label>


      ${
        order.date
          ? `
            <div
              class="muted"
              style="margin-top:6px;"
            >
              Registrado: ${esc(order.date)}
            </div>
          `
          : ""
      }


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
          flex-wrap:wrap;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar encargo
        </button>

        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>

        ${
          index !== null
            ? `
              <button
                type="button"
                onclick="deleteOrder(${index})"
              >
                🗑️ Eliminar
              </button>
            `
            : ""
        }

      </div>

    `,

    event => {

      event.preventDefault();

      const form =
        event.target;

      const selectedCustomerIndex =
        form.customerIndex.value;

      const selectedCustomer =
        selectedCustomerIndex !== ""
          ? db.customers[
              +selectedCustomerIndex
            ]
          : null;

      const clientText =
        String(
          selectedCustomer
            ? selectedCustomer.name
            : form.client.value
        ).trim();

      const item = {

        product:
          form.product.value.trim(),

        client:
          clientText,

        customerIndex:
          selectedCustomer
            ? +selectedCustomerIndex
            : "",

        qty:
          Math.max(
            1,
            +form.qty.value || 1
          ),

        price:
          Math.max(
            0,
            +form.price.value || 0
          ),

        dueDate:
          form.dueDate.value || "",

        note:
          form.note.value.trim(),

        status:
          form.status.value,

        date:
          index === null
            ? now()
            : (
                db.orders[index].date ||
                now()
              ),

        updated:
          now()

      };

      if(!item.product){

        alert(
          "Escribe el producto o encargo."
        );

        return;

      }

      if(index === null){

        db.orders.push(
          item
        );

      }else{

        db.orders[index] =
          {
            ...db.orders[index],
            ...item
          };

      }

      save();

      closeModal();

    }

  );

}


function editOrder(index){

  openOrder(index);

}


function deleteOrder(index){

  if(!db.orders[index]){

    return;

  }


  if(
    !confirm(
      "¿Eliminar este encargo?"
    )
  ){

    return;

  }


  db.orders.splice(
    index,
    1
  );


  save();

  closeModal();

}


/* =========================================================
   MOVIMIENTOS
   ========================================================= */

function openMove(defaultType = "Entrada", defaultReason = "Compra") {

  modal(

    "Nuevo movimiento",


    `

      <label>

        Producto

        <select name="product">

          <option value="">
            Selecciona un producto
          </option>

          ${
            db.products
              .map(
                (
                  product,
                  index
                ) => `

                  <option
                    value="${index}"
                  >

                    ${esc(
                      product.name
                    )}

                    —

                    stock
                    ${product.stock}

                  </option>

                `
              )
              .join("")
          }

        </select>

      </label>


      <label>

        Tipo

        <select name="type">

          <option ${defaultType === "Entrada" ? "selected" : ""}>
            Entrada
          </option>

          <option ${defaultType === "Salida" ? "selected" : ""}>
            Salida
          </option>

        </select>

      </label>


      <label>

        Cantidad

        <input
          name="qty"
          type="number"
          min="1"
          value="1"
        >

      </label>


      <label>

        Motivo

        <select name="reason">
          <option ${defaultReason === "Compra" ? "selected" : ""}>
            Compra
          </option>
          <option ${defaultReason === "Mortalidad" ? "selected" : ""}>
            Mortalidad
          </option>
          <option ${defaultReason === "Pérdida / Daño" ? "selected" : ""}>
            Pérdida / Daño
          </option>
          <option ${defaultReason === "Ajuste" ? "selected" : ""}>
            Ajuste
          </option>
          <option ${defaultReason === "Regalo" ? "selected" : ""}>
            Regalo
          </option>
          <option ${defaultReason === "Otro" ? "selected" : ""}>
            Otro
          </option>
        </select>

      </label>


      <label>

        Responsable

        <input
          name="responsible"
          placeholder="Nombre"
        >

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar
        </button>


        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>

      </div>

    `,


    event => {

      event.preventDefault();


      const form =
        event.target;


      const productIndex =
        form.product.value;


      const quantity =
        Math.max(
          1,
          +form.qty.value || 1
        );


      if(
        productIndex === ""
      ){

        alert(
          "Selecciona un producto."
        );

        return;

      }


      const product =
        db.products[
          +productIndex
        ];


      if(!product){

        return;

      }


      if(
        form.type.value ===
        "Entrada"
      ){

        product.stock =
          (+product.stock || 0) +
          quantity;


      }else{

        if(
          (+product.stock || 0) <
          quantity
        ){

          alert(
            `No hay suficiente stock de "${product.name}".`
          );

          return;

        }


        product.stock =
          (+product.stock || 0) -
          quantity;

      }


      db.moves.push({

        date:
          now(),

        product:
          product.name,

        type:
          form.type.value,

        qty:
          quantity,

        reason:
          form.reason.value.trim(),

        responsible:
          form.responsible.value.trim()

      });


      save();

      closeModal();

    }

  );

}


/* =========================================================
   CAJA
   ========================================================= */


/*
   Periodo seleccionado.
*/

let cashPeriod =
  "today";


/*
   Normaliza el método de pago.
*/

function normalizePaymentMethod(
  method
){

  const value =
    String(
      method || ""
    )
      .trim()
      .toLowerCase();


  if(
    value ===
    "efectivo"
  ){

    return "Efectivo";

  }


  if(
    value ===
    "nequi"
  ){

    return "Nequi";

  }


  if(
    value ===
    "transferencia" ||
    value ===
    "transferencias"
  ){

    return "Transferencia";

  }


  if(
    value ===
    "daviplata"
  ){

    return "Daviplata";

  }


  if(
    value ===
    "tarjeta"
  ){

    return "Tarjeta";

  }


  return "Otro";

}


/*
   Convierte las ventas en movimientos virtuales
   de caja.

   NO se guardan nuevamente en db.cash.
   Esto evita duplicar el dinero.
*/

function getSaleCashEntries(){

  return db.sales
    .map(
      (
        sale,
        index
      ) => {

        const amount =
          salePaid(sale);


        if(amount <= 0){

          return null;

        }


        return {

          id:
            `sale-${index}`,

          date:
            sale.date,

          type:
            "Entrada",

          amount,

          method:
            normalizePaymentMethod(
              sale.pay
            ),

          concept:
            `Venta: ${saleLabel(
              sale
            )}`,

          source:
            "Venta",

          saleIndex:
            index

        };

      }
    )
    .filter(Boolean);

}


/*
   Movimientos manuales de caja.
*/

function getCustomerPaymentCashEntries(){

  const entries = [];


  db.customers.forEach(
    (customer,customerIndex) => {

      const payments =
        Array.isArray(
          customer.payments
        )
          ? customer.payments
          : [];


      payments.forEach(
        (payment,paymentIndex) => {

          const amount =
            Math.abs(
              +payment.amount || 0
            );


          if(amount <= 0){
            return;
          }


          entries.push({

            id:
              `customer-payment-${customerIndex}-${paymentIndex}`,

            date:
              payment.date,

            type:
              "Entrada",

            amount,

            method:
              normalizePaymentMethod(
                payment.method
              ),

            concept:
              `Abono cliente: ${customer.name}`,

            source:
              "Abono cliente",

            customerIndex,

            paymentIndex

          });

        }
      );

    }
  );


  return entries;

}


function getManualCashEntries(){

  return db.cash.map(
    (
      entry,
      index
    ) => ({

      ...entry,

      index,

      amount:
        Math.abs(
          +entry.amount || 0
        ),

      method:
        normalizePaymentMethod(
          entry.method
        ),

      source:
        "Manual"

    })
  );

}


/*
   Todos los movimientos.
*/

function getAllCashEntries(){

  return [

    ...getSaleCashEntries(),

    ...getCustomerPaymentCashEntries(),

    ...getManualCashEntries()

  ];

}


/*
   Rango de fechas.
*/

function getCashRange(
  period
){

  const nowDate =
    new Date();


  if(
    period ===
    "today"
  ){

    return {

      start:
        startOfDay(
          nowDate
        ),

      end:
        endOfDay(
          nowDate
        )

    };

  }


  if(
    period ===
    "7days"
  ){

    const start =
      startOfDay(
        nowDate
      );


    start.setDate(
      start.getDate() - 6
    );


    return {

      start,

      end:
        endOfDay(
          nowDate
        )

    };

  }


  if(
    period ===
    "month"
  ){

    const start =
      new Date(
        nowDate.getFullYear(),
        nowDate.getMonth(),
        1
      );


    return {

      start:
        startOfDay(start),

      end:
        endOfDay(
          nowDate
        )

    };

  }


  return {

    start: null,

    end: null

  };

}


/*
   Filtra movimientos por periodo.
*/

function getCashEntries(
  period =
    cashPeriod
){

  const range =
    getCashRange(
      period
    );


  return getAllCashEntries()
    .filter(
      entry => {

        const date =
          parseLocalDate(
            entry.date
          );


        if(!date){

          return period ===
            "all";

        }


        if(
          range.start &&
          date < range.start
        ){

          return false;

        }


        if(
          range.end &&
          date > range.end
        ){

          return false;

        }


        return true;

      }
    )
    .sort(
      (a,b) => {

        const dateA =
          parseLocalDate(
            a.date
          );


        const dateB =
          parseLocalDate(
            b.date
          );


        return (
          (dateB?.getTime() || 0) -
          (dateA?.getTime() || 0)
        );

      }
    );

}


/*
   Calcula totales de caja.
*/

function calculateCashTotals(
  period =
    cashPeriod
){

  const entries =
    getCashEntries(
      period
    );


  let received = 0;

  let expenses = 0;


  const methods = {

    Efectivo: 0,

    Nequi: 0,

    Transferencia: 0,

    Daviplata: 0,

    Tarjeta: 0,

    Otro: 0

  };


  entries.forEach(
    entry => {

      const amount =
        Math.abs(
          +entry.amount || 0
        );


      const method =
        normalizePaymentMethod(
          entry.method
        );


      if(
        entry.type ===
        "Gasto"
      ){

        expenses +=
          amount;

        methods[method] =
          (methods[method] || 0) -
          amount;


      }else{

        received +=
          amount;

        methods[method] =
          (methods[method] || 0) +
          amount;

      }

    }
  );


  return {

    entries,

    received,

    expenses,

    balance:
      received -
      expenses,

    methods

  };

}


/*
   Por cobrar.

   Se calcula con todas las ventas,
   independientemente del filtro de caja.
*/

function calculateReceivable(){

  let total = 0;


  const customerNames =
    new Set(
      db.customers
        .map(
          customer =>
            customer.name
        )
        .filter(Boolean)
    );


  customerNames.forEach(
    name => {

      total +=
        customerBalance(
          name
        );

    }
  );


  total +=
    db.sales
      .filter(
        sale =>
          !String(
            sale.client || ""
          ).trim() ||
          !customerNames.has(
            sale.client
          )
      )
      .reduce(
        (sum,sale) =>
          sum +
          Math.max(
            0,
            (+sale.total || 0) -
            salePaid(sale)
          ),
        0
      );


  return total;

}


/*
   Cambiar periodo.
*/

function setCashPeriod(
  value
){

  cashPeriod =
    value ||
    "today";


  renderCash();

}


/*
   Renderizar Caja.
*/

function renderCash(){

  const summary =
    document.getElementById(
      "cashSummary"
    );


  const list =
    document.getElementById(
      "cashList"
    );


  const periodSelect =
    document.getElementById(
      "cashPeriod"
    );


  if(
    periodSelect
  ){

    periodSelect.value =
      cashPeriod;


    periodSelect.onchange =
      function(){

        setCashPeriod(
          this.value
        );

      };

  }


  if(
    !summary ||
    !list
  ){

    return;

  }


  const totals =
    calculateCashTotals(
      cashPeriod
    );


  const receivable =
    calculateReceivable();


  summary.innerHTML = `

    <div class="card">

      <span>
        Recibido
      </span>

      <b>
        ${money(
          totals.received
        )}
      </b>

      <small>
        ventas + ingresos
      </small>

    </div>


    <div class="card">

      <span>
        Efectivo
      </span>

      <b>
        ${money(
          totals.methods.Efectivo
        )}
      </b>

      <small>
        dinero físico
      </small>

    </div>


    <div class="card">

      <span>
        Nequi
      </span>

      <b>
        ${money(
          totals.methods.Nequi
        )}
      </b>

      <small>
        saldo registrado
      </small>

    </div>


    <div class="card">

      <span>
        Transferencias
      </span>

      <b>
        ${money(
          totals.methods.Transferencia
        )}
      </b>

      <small>
        bancos
      </small>

    </div>


    <div class="card">

      <span>
        Tarjeta
      </span>

      <b>
        ${money(
          totals.methods.Tarjeta
        )}
      </b>

      <small>
        pagos
      </small>

    </div>


    <div class="card">

      <span>
        Gastos
      </span>

      <b>
        ${money(
          totals.expenses
        )}
      </b>

      <small>
        periodo
      </small>

    </div>


    <div class="card">

      <span>
        Saldo
      </span>

      <b>
        ${money(
          totals.balance
        )}
      </b>

      <small>
        disponible registrado
      </small>

    </div>


    <div class="card">

      <span>
        Por cobrar
      </span>

      <b>
        ${money(
          receivable
        )}
      </b>

      <small>
        cuentas pendientes
      </small>

    </div>

  `;


  if(!totals.entries.length){

    list.innerHTML = `

      <div class="empty">

        No hay movimientos
        de caja en este periodo.

      </div>

    `;

    return;

  }


  list.innerHTML =
    totals.entries
      .map(
        entry => {

          const isExpense =
            entry.type ===
            "Gasto";


          const amount =
            Math.abs(
              +entry.amount || 0
            );


          const index =
            entry.index;


          const clickable =
            entry.source ===
            "Manual";


          return `

            <div
              class="item ${
                clickable
                  ? "clickable"
                  : ""
              }"
              ${
                clickable
                  ? `onclick="editCashMovement(
                      ${index}
                    )"`
                  : ""
              }
            >

              <div>

                <b>

                  ${
                    entry.source ===
                    "Venta"

                      ? "🧾 "

                      : isExpense
                        ? "💸 "
                        : "💰 "
                  }

                  ${esc(
                    entry.concept ||
                    "Movimiento"
                  )}

                </b>


                <div class="muted">

                  ${esc(
                    entry.date ||
                    ""
                  )}

                  ·

                  ${esc(
                    entry.method ||
                    "Otro"
                  )}

                  ·

                  ${
                    entry.source ===
                    "Venta"

                      ? "Venta"

                      : "Manual"
                  }

                </div>


                ${
                  entry.note

                    ? `

                      <div class="muted">

                        ${esc(
                          entry.note
                        )}

                      </div>

                    `

                    : ""
                }

              </div>


              <div class="right">

                <b>

                  ${
                    isExpense
                      ? "-"
                      : "+"
                  }

                  ${money(
                    amount
                  )}

                </b>


                <small>

                  ${
                    isExpense
                      ? "Gasto"
                      : "Entrada"
                  }

                </small>

              </div>

            </div>

          `;

        }
      )
      .join("");

}


/* =========================================================
   NUEVO MOVIMIENTO DE CAJA
========================================================= */

function openCashMovement(
  index = null
){

  const editing =
    index !== null;


  const existing =
    editing
      ? db.cash[index]
      : {

          type:
            "Gasto",

          amount:
            0,

          method:
            "Efectivo",

          concept:
            "",

          note:
            ""

        };


  if(
    editing &&
    !existing
  ){

    return;

  }


  modal(

    editing
      ? "Editar movimiento"
      : "Nuevo movimiento de caja",


    `

      <label>

        Tipo

        <select name="type">

          <option
            ${
              existing.type ===
              "Ingreso"
                ? "selected"
                : ""
            }
          >
            Ingreso
          </option>

          <option
            ${
              existing.type ===
              "Gasto"
                ? "selected"
                : ""
            }
          >
            Gasto
          </option>

        </select>

      </label>


      <label>

        Forma

        <select name="method">

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Efectivo"
                ? "selected"
                : ""
            }
          >
            Efectivo
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Nequi"
                ? "selected"
                : ""
            }
          >
            Nequi
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Transferencia"
                ? "selected"
                : ""
            }
          >
            Transferencia
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Daviplata"
                ? "selected"
                : ""
            }
          >
            Daviplata
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Tarjeta"
                ? "selected"
                : ""
            }
          >
            Tarjeta
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Otro"
                ? "selected"
                : ""
            }
          >
            Otro
          </option>

        </select>

      </label>


      <label>

        Valor

        <input
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          value="${
            +existing.amount || 0
          }"
        >

      </label>


      <label>

        Concepto

        <input
          name="concept"
          required
          value="${esc(
            existing.concept
          )}"
          placeholder="Ej. Compra de alimento"
        >

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
          placeholder="Observación opcional"
        >${esc(
          existing.note
        )}</textarea>

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
          flex-wrap:wrap;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar
        </button>


        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>


        ${
          editing

            ? `

              <button
                type="button"
                onclick="deleteCashMovement(
                  ${index}
                )"
              >
                🗑️ Eliminar
              </button>

            `

            : ""
        }

      </div>

    `,


    event => {

      event.preventDefault();


      const form =
        event.target;


      const amount =
        Math.max(
          0,
          +form.amount.value || 0
        );


      if(amount <= 0){

        alert(
          "Escribe un valor mayor que cero."
        );

        return;

      }


      const concept =
        form.concept.value.trim();


      if(!concept){

        alert(
          "Escribe el concepto del movimiento."
        );

        return;

      }


      const item = {

        id:
          editing &&
          existing.id

            ? existing.id

            : (
                Date.now() +
                "-" +
                Math.random()
                  .toString(36)
                  .slice(2)
              ),

        date:
          editing &&
          existing.date

            ? existing.date

            : now(),

        type:
          form.type.value,

        amount,

        method:
          normalizePaymentMethod(
            form.method.value
          ),

        concept,

        note:
          form.note.value.trim(),

        source:
          "Manual"

      };


      if(editing){

        db.cash[index] =
          {
            ...db.cash[index],
            ...item
          };

      }else{

        db.cash.push(
          item
        );

      }


      save();

      closeModal();

    }

  );

}


function editCashMovement(
  index
){

  openCashMovement(
    index
  );

}


function deleteCashMovement(
  index
){

  if(!db.cash[index]){

    return;

  }


  if(
    !confirm(
      "¿Eliminar este movimiento de caja?"
    )
  ){

    return;

  }


  db.cash.splice(
    index,
    1
  );


  save();

  closeModal();

}


/* =========================================================
   RESUMEN INTERNO
   ========================================================= */

function renderInternal() {

  const element =
    document.getElementById(
      "internalStats"
    );


  if(!element){

    return;

  }


  const sales =
    db.sales.reduce(
      (sum,sale) =>
        sum +
        (+sale.total || 0),
      0
    );


  const profit =
    db.sales.reduce(
      (sum,sale) =>
        sum +
        (+sale.profit || 0),
      0
    );


  const pending =
    db.sales.reduce(
      (sum,sale) =>
        sum +
        Math.max(
          0,
          (+sale.total || 0) -
          salePaid(sale)
        ),
      0
    );


  const cashTotals =
    calculateCashTotals(
      "all"
    );


  element.innerHTML = `

    <div class="cards">

      <div class="card">

        <b>
          Ventas
        </b>

        <strong>
          ${money(sales)}
        </strong>

      </div>


      <div class="card">

        <b>
          Ganancia
        </b>

        <strong>
          ${money(profit)}
        </strong>

      </div>


      <div class="card">

        <b>
          Pendiente
        </b>

        <strong>
          ${money(pending)}
        </strong>

      </div>


      <div class="card">

        <b>
          Caja
        </b>

        <strong>
          ${money(
            cashTotals.balance
          )}
        </strong>

      </div>


      <div class="card">

        <b>
          Productos
        </b>

        <strong>
          ${db.products.length}
        </strong>

      </div>

    </div>

  `;

}


function openInternal() {

  const modalElement =
    document.getElementById(
      "internalModal"
    );


  if(modalElement){

    renderInternal();


    modalElement.classList.remove(
      "hidden"
    );

  }

}


function closeInternal() {

  const modalElement =
    document.getElementById(
      "internalModal"
    );


  if(modalElement){

    modalElement.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   RESPALDO
   ========================================================= */

function exportData() {

  const blob =
    new Blob(
      [
        JSON.stringify(
          db,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    "aquarium-fish-respaldo.json";


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  URL.revokeObjectURL(
    url
  );

}


function importData(input) {

  const file =
    input?.files?.[0];


  if(!file){

    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function(){

      try{

        const imported =
          JSON.parse(
            reader.result
          );


        if(
          !imported ||
          typeof imported !==
          "object"
        ){

          throw new Error(
            "Formato inválido"
          );

        }


        db = {

          products:
            Array.isArray(
              imported.products
            )
              ? imported.products
              : [],

          sales:
            Array.isArray(
              imported.sales
            )
              ? imported.sales
              : [],

          moves:
            Array.isArray(
              imported.moves
            )
              ? imported.moves
              : [],

          customers:
            Array.isArray(
              imported.customers
            )
              ? imported.customers
              : [],

          orders:
            Array.isArray(
              imported.orders
            )
              ? imported.orders
              : [],

          cash:
            Array.isArray(
              imported.cash
            )
              ? imported.cash
              : []

        };


        save();


        alert(
          "Respaldo restaurado correctamente."
        );


      }catch(error){

        console.error(
          error
        );


        alert(
          "No se pudo restaurar el respaldo."
        );

      }

    };


  reader.readAsText(
    file
  );

}


/* =========================================================
   BÚSQUEDAS
   ========================================================= */

function bindSearches() {

  const search =
    document.getElementById(
      "search"
    );


  if(search){

    search.oninput =
      function(){

        renderInventory();

      };

  }


  const customerSearch =
    document.getElementById(
      "customerSearch"
    );


  if(customerSearch){

    customerSearch.oninput =
      function(){

        renderCustomers();

      };

  }

}


/* =========================================================
   HACER FUNCIONES GLOBALES
   IMPORTANTE PARA LOS onclick DEL HTML
   ========================================================= */

function exposeFunctions() {

  window.show =
    show;


  window.openProduct =
    openProduct;


  window.editProduct =
    editProduct;


  window.deleteProduct =
    deleteProduct;


  window.openSale =
    openSale;


  window.addSaleRow =
    addSaleRow;


  window.updateSalePreview =
    updateSalePreview;


  window.openCustomer =
    openCustomer;


  window.editCustomer =
    editCustomer;


  window.deleteCustomer =
    deleteCustomer;


  window.openOrder =
    openOrder;


  window.editOrder =
    editOrder;


  window.deleteOrder =
    deleteOrder;


  window.toggleOrder =
    toggleOrder;


  window.advanceOrderStatus =
    advanceOrderStatus;


  window.openMove =
    openMove;


  window.toggleDateGroup =
    toggleDateGroup;


  window.closeModal =
    closeModal;


  window.openInternal =
    openInternal;


  window.closeInternal =
    closeInternal;


  window.exportData =
    exportData;


  window.importData =
    importData;


  window.setInventoryCategory =
    setInventoryCategory;


  window.setInventorySort =
    setInventorySort;


  /* =====================================================
     FUNCIONES DE CAJA
  ===================================================== */

  window.openCashMovement =
    openCashMovement;


  window.editCashMovement =
    editCashMovement;


  window.deleteCashMovement =
    deleteCashMovement;


  window.setCashPeriod =
    setCashPeriod;


  window.addQuoteItem =
    addQuoteItem;


  window.updateQuoteItem =
    updateQuoteItem;


  window.removeQuoteItem =
    removeQuoteItem;


  window.clearQuote =
    clearQuote;


  window.copyQuote =
    copyQuote;


  window.shareQuoteWhatsApp =
    shareQuoteWhatsApp;

  window.openReceipt =
    openReceipt;

  window.copySaleReceipt =
    copySaleReceipt;

  window.shareSaleReceiptWhatsApp =
    shareSaleReceiptWhatsApp;

  window.setReportPeriod =
    setReportPeriod;


  window.printSaleReceipt =
    printSaleReceipt;

}


/* =========================================================
   AJUSTE RESPONSIVO PARA CELULAR
   ========================================================= */

function applyMobileLayout(){

  if(document.getElementById("aquariumMobileLayout")){
    return;
  }

  const style = document.createElement("style");
  style.id = "aquariumMobileLayout";
  style.textContent = `
    @media (max-width: 700px){
      html, body{
        width:100%;
        max-width:100%;
        overflow-x:hidden;
      }

      main{
        width:100%;
        max-width:100%;
        box-sizing:border-box;
      }

      .screen, .panel, .item, .cards{
        max-width:100%;
        box-sizing:border-box;
      }

      .section-head{
        flex-wrap:wrap;
      }

      .cards{
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }

      [style*="grid-template-columns"]{
        grid-template-columns:1fr !important;
      }

      input, select, textarea, button{
        max-width:100%;
        box-sizing:border-box;
      }

      .list{
        max-width:100%;
        overflow-x:hidden;
      }

      .item{
        min-width:0;
        flex-wrap:wrap;
      }

      nav{
        width:100%;
        max-width:100%;
        overflow-x:auto;
        box-sizing:border-box;
      }
    }
  `;

  document.head.appendChild(style);

}


/* =========================================================
   INICIAR APLICACIÓN
   ========================================================= */

function iniciarApp() {

  applyMobileLayout();

  exposeFunctions();

  setupCotizadorUI();

  bindNavigation();

  bindSearches();

  renderAll();

  show("home");

}


if(
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    iniciarApp
  );

}else{

  iniciarApp();

}
