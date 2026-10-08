import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
export async function exportPlanningPdf(report: HTMLDivElement, name: string) {
  await document.fonts.ready;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" }),
    pageW = doc.internal.pageSize.getWidth(),
    pageH = doc.internal.pageSize.getHeight();
  const sections = Array.from(
    report.querySelectorAll<HTMLElement>("[data-pdf-section]"),
  );
  const color = getComputedStyle(report)
    .getPropertyValue("--background")
    .trim();
  const rgb = (() => {
    const c = document.createElement("canvas").getContext("2d");
    if (!c) return [244, 244, 242];
    c.fillStyle = `hsl(${color})`;
    c.fillRect(0, 0, 1, 1);
    return Array.from(c.getImageData(0, 0, 1, 1).data).slice(0, 3);
  })();
  let y = 0;
  const fill = () => {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(0, 0, pageW, pageH, "F");
  };
  fill();
  for (let i = 0; i < sections.length; i++) {
    const canvas = await html2canvas(sections[i], {
      scale: 2,
      useCORS: true,
      backgroundColor: `hsl(${color})`,
      logging: false,
    });
    const margin = i === 0 ? 0 : 40,
      width = pageW - margin * 2,
      naturalH = (canvas.height * width) / canvas.width,
      maxH = pageH - 90;
    const factor = Math.min(1, maxH / naturalH),
      w = width * factor,
      h = naturalH * factor;
    if (i > 0 && (i === 1 || y + h > pageH - 55)) {
      doc.addPage();
      fill();
      y = 35;
    }
    doc.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      margin + (width - w) / 2,
      y,
      w,
      h,
    );
    y += h + 10;
  }
  const count = doc.getNumberOfPages();
  for (let n = 1; n <= count; n++) {
    doc.setPage(n);
    doc.setFontSize(8);
    doc.setTextColor(94, 102, 112);
    const label = `Gofferjé Investimentos · Planejamento Patrimonial · ${name || "Cliente"}`;
    doc.text(doc.splitTextToSize(label, pageW - 130)[0], 30, pageH - 22);
    doc.text(`${n} / ${count}`, pageW - 35, pageH - 22, { align: "right" });
  }
  const url = URL.createObjectURL(doc.output("blob")),
    a = document.createElement("a");
  a.href = url;
  a.download = `Planejamento Patrimonial - ${(name || "Cliente").replace(/[\\/:*?"<>|]/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
