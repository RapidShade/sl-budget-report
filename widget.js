let gristDoc = null;
let selectedEvent = null;
let expenses = [];
let categories = {};

console.log("[WIDGET] v0.1 Starting PDF widget…");

window.grist.ready({ requiredAccess: 'read table' }).then(api => {
  console.log("[WIDGET] Grist API ready");
  gristDoc = api;

  if (!gristDoc || !gristDoc.docApi) {
    console.error("[WIDGET] No docApi — check permissions or access level.");
    document.getElementById('status').textContent = "❌ Widget failed to initialize. No access.";
    return;
  }

  gristDoc.onRecord((record) => {
    if (!record) {
      console.warn("[WIDGET] No record selected.");
      return;
    }

    selectedEvent = record;
    console.log("[WIDGET] Selected event:", selectedEvent);
    document.getElementById('status').textContent = 'Selected Event: ' + (record.Title || '[Untitled]');
    loadData();
  });
});

async function loadData() {
  const expensesTable = await gristDoc.docApi.fetchTable('Expenses');
  const categoryTable = await gristDoc.docApi.fetchTable('ExpenseCategories');
  categories = {};
  categoryTable.records.forEach(cat => {
    categories[cat.id] = cat.fields.Name;
  });

  expenses = expensesTable.records.filter(exp => {
    return exp.fields.Event === selectedEvent.id;
  }).map(exp => ({
    title: exp.fields.Title,
    amount: exp.fields.Amount,
    category: categories[exp.fields.ExpenseCategory] || 'Χωρίς Κατηγορία'
  }));
}

function generatePDF() {
  if (!selectedEvent) return;

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
      subtotal += row.amount || 0;
    }
    tableBody.push([{ text: 'Σύνολο', bold: true }, { text: subtotal.toFixed(2), bold: true }]);
    content.push({ table: { widths: ['*', 100], body: tableBody }, margin: [0, 0, 0, 10] });
  }

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  content.push({ text: 'Γενικό Σύνολο: ' + total.toFixed(2) + ' €', bold: true, fontSize: 14 });

  const docDefinition = {
    content: content,
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] }
    }
  };
  pdfMake.createPdf(docDefinition).download((selectedEvent.Title || 'report') + '.pdf');
}
