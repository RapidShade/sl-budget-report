console.log("[WIDGET] v2.0 Initialized via Grist API");

grist.ready();  // Tell Grist we're ready to receive data

let current = null;

grist.onRecord((rec) => {
  current = rec;
  const status = document.getElementById('status');
  const button = document.getElementById('btn');
  if (rec && rec.ΟΝΟΜΑΣΙΑ) {
    status.innerText = `Ready to download: ${rec.ΟΝΟΜΑΣΙΑ}`;
    button.disabled = false;
  } else {
    status.innerText = "Select an event.";
    button.disabled = true;
  }
});

document.getElementById('btn').addEventListener('click', () => {
  if (!current || !current.ΟΝΟΜΑΣΙΑ) {
    alert("No event selected.");
    return;
  }
  const data = `Event Report\n\nName: ${current.ΟΝΟΜΑΣΙΑ}`;
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${current.ΟΝΟΜΑΣΙΑ}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
});
