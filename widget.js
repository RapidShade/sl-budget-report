console.log("[WIDGET] v1.2 Starting via postMessage…");

let api = null;
let selectedEvent = null;
let expenses = [];
let categories = {};

function logStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
}

window.addEventListener("message", async (event) => {
  if (!event.data?.gristDocAPI) return;
  api = event.data.gristDocAPI;
  logStatus("✅ Grist API ready.");

  api.onRecord(async (record) => {
    if (!record || !record.id) {
      selectedEvent = null;
      logStatus("⚠️ Select an event.");
      return;
    }

    selectedEvent = record;
    logStatus("✅ Selected: " + (record.Title || "Unnamed Event"));
    await loadData();
  });
});

async function loadData() {
  try {
    const expensesTable = await api.docApi.fetchTable("Expenses");
    const categoryTable = await api.docApi.fetchTable("ExpenseCategories");

    categories = {};
    for (const cat of categoryTable.records) {
      categories[cat.id] = cat.fields.Name;
    }

    expenses = expensesTable.records
      .filter(r => r.fields.Event === selectedEvent.id)
      .map(r => ({
        title: r.fields.Title || '',
        amount: r.fields.Amount || 0,
        category: categories[r.fields.ExpenseCategory] || 'Χωρίς Κατηγορία'
      }));

    console.log("[WIDGET] Loaded", expenses.length, "expenses.");
  } catch (e) {
    console.error("Error loading data:", e);
    logStatus("❌ Error loading data");
  }
}

function generatePDF() {
  if (!selectedEvent) {
    alert("Select an event first.");
    return;
  }

  const content = [
    { text: "ΑΝΑΦΟΡΑ ΕΚΔΗΛΩΣΗΣ", style: "header" },
    { text: selectedEvent.Title || "—", margin: [0, 0, 0, 10] },
    { text: `Τοποθεσία: ${selectedEvent.VENUE || "-"}, Πόλη: ${selectedEvent.CITY || "-"}, Περιφ.: ${selectedEvent.PERIF_CITY || "-"}`, margin: [0, 0, 0, 10] },
    { text: `POOL SIZE: ${selectedEvent.POOL_SIZE || "-"}m | LEVEL: ${selectedEvent.LEVEL || "-"}`, margin: [0, 0, 0, 20] }
  ];

  const grouped = {};
  for (const e of expenses) {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  }

  for (const [cat, items] of Object.entries(grouped)) {
    content.push({ text: cat, style: "subheader" });
    const rows = [["Περιγραφή", "Ποσό (€)"]];
    let subtotal = 0;
    for (const i of items) {
      rows.push([i.title, i.amount.toFixed(2)]);
      subtotal += i.amount;
    }
    rows.push([{ text: "Σύνολο", bold: true }, { text: subtotal.toFixed(2), bold: true }]);
    content.push({ table: { widths: ["*", 80], body: rows }, margin: [0, 0, 0, 15] });
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  content.push({ text: "ΓΕΝΙΚΟ ΣΥΝΟΛΟ: " + total.toFixed(2) + " €", style: "total" });

  pdfMake.createPdf({
    content,
    styles: {
      header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      total: { fontSize: 14, bold: true, alignment: 'right', margin: [0, 10, 0, 0] }
    }
  }).download((selectedEvent.Title || "event_report") + ".pdf");
}
