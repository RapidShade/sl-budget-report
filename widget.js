console.log("[WIDGET] v0.8 Starting PDF widget (postMessage fallback)");

let selectedEvent = null;
let expenses = [];
let categories = {};
let docApi = null;

window.addEventListener("message", (event) => {
  if (event.data && event.data.gristDocAPI && !docApi) {
    console.log("[WIDGET] Injected docApi from Grist");
    docApi = event.data.gristDocAPI;
    docApi.subscribeRecords("Events", {}, onEventSelected);
  }
});

function onEventSelected(data) {
  if (!data || !data.length || !data[0].fields) {
    document.getElementById('status').textContent = "⚠️ No event selected.";
    selectedEvent = null;
    return;
  }
  selectedEvent = data[0];
  console.log("[WIDGET] Selected Event:", selectedEvent);
  document.getElementById('status').textContent = "✅ Selected Event: " + (selectedEvent.fields.Title || '[Untitled]');
  loadData();
}

async function loadData() {
  try {
    const [expensesTable, categoryTable] = await Promise.all([
      docApi.fetchTable('Expenses'),
      docApi.fetchTable('ExpenseCategories')
    ]);

    categories = {};
    for (const cat of categoryTable.records) {
      categories[cat.id] = cat.fields.Name;
    }

    expenses = expensesTable.records
      .filter(exp => exp.fields.Event === selectedEvent.id)
      .map(exp => ({
        title: exp.fields.Title || "",
        amount: exp.fields.Amount || 0,
        category: categories[exp.fields.ExpenseCategory] || "Χωρίς Κατηγορία"
      }));

    console.log("[WIDGET] Loaded expenses:", expenses.length);
  } catch (e) {
    console.error("[WIDGET] Failed to load data:", e);
    document.getElementById('status').textContent = "❌ Error loading tables.";
  }
}

function generatePDF() {
  if (!selectedEvent) {
    alert("Select an event first.");
    return;
  }

  console.log("[WIDGET] Generating PDF...");

  const grouped = {};
  for (const exp of expenses) {
    if (!grouped[exp.category]) grouped[exp.category] = [];
    grouped[exp.category].push(exp);
  }

  const content = [
    { text: 'Αναφορά Εκδήλωσης', style: 'header' },
    { text: selectedEvent.fields.Title || '', margin: [0, 0, 0, 10] }
  ];

  for (const [category, rows] of Object.entries(grouped)) {
    content.push({ text: category, style: 'subheader' });
    const tableBody = [['Περιγραφή', 'Ποσό (€)']];
    let subtotal = 0;
    for (const row of rows) {
      tableBody.push([row.title, row.amount.toFixed(2)]);
      subtotal += row.amount;
    }
    tableBody.push([{ text: 'Σύνολο', bold: true }, { text: subtotal.toFixed(2), bold: true }]);
    content.push({ table: { widths: ['*', 100], body: tableBody }, margin: [0, 0, 0, 10] });
  }

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  content.push({ text: 'Γενικό Σύνολο: ' + total.toFixed(2) + ' €', bold: true, fontSize: 14 });

  const docDefinition = {
    content,
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] }
    }
  };

  const filename = (selectedEvent.fields.Title || 'report') + '.pdf';
  pdfMake.createPdf(docDefinition).download(filename);
}