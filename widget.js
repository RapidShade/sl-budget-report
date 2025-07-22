console.log("[WIDGET] v2.3 Starting...");

grist.ready();

let current = null;
let gristAPI = null;

grist.onRecord((rec, meta, api) => {
  gristAPI = api;
  current = rec;
  const status = document.getElementById("status");
  const button = document.getElementById("btn");
  if (rec && rec.Name) {
    status.innerText = `Ready: ${rec.Name}`;
    button.disabled = false;
  } else {
    status.innerText = "Select an event";
    button.disabled = true;
  }
});

document.getElementById("btn").addEventListener("click", async () => {
  if (!current || !gristAPI) {
    alert("No event selected.");
    return;
  }

  const eventId = current.id;
  const expensesTable = await gristAPI.fetchTable("Expenses");
  const categoriesTable = await gristAPI.fetchTable("ExpenseCategories");

  const relatedExpenses = expensesTable.records.filter(e => e.fields.Event === eventId);
  const categoryMap = new Map();
  for (const cat of categoriesTable.records) {
    const f = cat.fields;
    categoryMap.set(cat.id, {
      name: f.Name || '',
      group: f.Group || '',
      order: f.DisplayOrder ?? 999
    });
  }

  const grouped = {};
  for (const exp of relatedExpenses) {
    const cat = categoryMap.get(exp.fields.ExpenseCategory);
    const group = cat?.group || "Other";
    const amount = exp.fields.Amount || 0;
    if (!grouped[group]) grouped[group] = { total: 0, items: [] };
    grouped[group].total += amount;
    grouped[group].items.push({ ...exp.fields, category: cat?.name || '' });
  }

  const { PDFDocument, StandardFonts } = window.pdfLib;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  let y = height - 40;
  const write = (text, size = 12) => {
    page.drawText(text, { x: 50, y, size, font });
    y -= size + 4;
  };

  write("Event Budget Report", 16);
  y -= 10;
  const fields = [
    `Event Code: ${current.EventCode || ''}`,
    `Name: ${current.Name || ''}`,
    `Sport: ${current.Sport || ''}`,
    `Discipline: ${current.Discipline || ''}`,
    `Start Date: ${current.DateStart || ''}`,
    `End Date: ${current.DateEnd || ''}`,
    `City: ${current.CITY || ''}`,
    `Venue: ${current.VENUE || ''}`,
    `Level: ${current.LEVEL || ''}`,
    `Pool Size: ${current.POOL_SIZE || ''}`,
    `Organiser: ${current.Organiser || ''}`
  ];
  fields.forEach(write);
  y -= 10;

  write("Grouped Expenses:", 14);

  for (const groupName of Object.keys(grouped).sort()) {
    const grp = grouped[groupName];
    write(`  ${groupName}: ${grp.total.toFixed(2)} EUR`);
    for (const item of grp.items) {
      const desc = item.Description || '';
      const amt = item.Amount?.toFixed(2) || '0.00';
      write(`    - ${desc} (${item.category}): ${amt} EUR`, 10);
    }
    y -= 6;
    if (y < 100) {
      page = pdfDoc.addPage();
      y = height - 40;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BudgetReport_${current.EventCode || "event"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
});