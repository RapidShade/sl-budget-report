console.log("[WIDGET] v0.6 Starting PDF widget...");

let selectedEvent = null;
let expenses = [];
let categories = {};
let gristDoc = null;

window.grist.ready({ requiredAccess: "read table" }).then(api => {
  console.log("[WIDGET] Grist API ready");
  gristDoc = api;

  gristDoc.onRecord((record) => {
    if (!record) {
      console.warn("[WIDGET] No record selected");
      selectedEvent = null;
      document.getElementById('status').textContent = "⚠️ Select an event to generate report.";
      return;
    }

    selectedEvent = record;
    console.log("[WIDGET] Selected Event:", selectedEvent);
    document.getElementById('status').textContent = "✅ Selected Event: " + (record.Title || '[Untitled]');
    loadData();
  });
});

async function loadData() {
  try {
    const [expensesTable, categoryTable] = await Promise.all([
      gristDoc.docApi.fetchTable('Expenses'),
      gristDoc.docApi.fetchTable('ExpenseCategories')
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
    console.error("[WIDGET] Failed to load tables:", e);
    document.getElementById('status').textContent = "❌ Failed to load data.";
  }
}

function generatePDF() {
  if (!selectedEvent) {
    alert("Select an event first.");
    return;
  }

  console.log("[WIDGET] Generating PDF…");

  const grouped = {};
  for (const exp of expenses) {
    if (!grouped[exp.category]) grouped[exp.category] = [];
    grouped[exp.category].push(exp);
  }

  const content = [];
  content.push({ text: 'Αναφορά Εκδήλωσης', style: 'header' });
  content.push({ text: selectedEvent.Title || '', margin: [0, 0, 0, 10] });

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

  const filename = (selectedEvent.Title || 'report') + '.pdf';
  pdfMake.createPdf(docDefinition).download(filename);
}