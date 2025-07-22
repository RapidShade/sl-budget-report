console.log("[WIDGET] v3.0 Starting...");

window.addEventListener("message", async (event) => {
  const grist = event.data.gristDocAPI;
  if (!grist || !grist.ready) return;

  console.log("[WIDGET] Grist context received.");

  await grist.ready();

  let current = null;
  const status = document.getElementById("status");
  const button = document.getElementById("btn");

  grist.onRecord((rec) => {
    current = rec;
    if (rec && rec.Name) {
      status.innerText = `Ready: ${rec.Name}`;
      button.disabled = false;
    } else {
      status.innerText = "Select an event";
      button.disabled = true;
    }
  });

  button.addEventListener("click", async () => {
    if (!current || !current.Name) {
      alert("No event selected.");
      return;
    }

    const { PDFDocument, StandardFonts } = window.pdfLib;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    const lines = [
      "Event Budget Report",
      "",
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

    let y = height - 50;
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 12, font });
      y -= 20;
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
});
