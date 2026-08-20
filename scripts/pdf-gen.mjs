// Minimal dependency-free PDF generator producing valid single/multi-page PDFs
// with headings, wrapped paragraphs, bullet lists, and monospace code blocks.

class SimplePdf {
  constructor({ title = "Lecture Notes", pageWidth = 612, pageHeight = 792 } = {}) {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.margin = 54;
    this.title = title;
    this.fontSize = 11;
    this.lineHeight = 15;
    this.pages = [];
    this.page = null;
    this.newPage();
  }

  newPage() {
    if (this.page) this.pages.push(this.page);
    this.page = {
      y: this.margin,
      content: [],
      objects: 0,
    };
  }

  ensureSpace(needed) {
    if (this.page.y + needed > this.pageHeight - this.margin) {
      this.newPage();
    }
  }

  wrapText(text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (this.stringWidth(test) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  stringWidth(text) {
    // Approximate width: average char ~ 5.5pt at 11pt font
    return text.length * 5.2;
  }

  heading(text, size = 15) {
    this.ensureSpace(size + 10);
    this.page.content.push({
      type: "text",
      text,
      x: this.margin,
      y: this.page.y,
      size,
      bold: true,
      color: [0.1, 0.2, 0.45],
    });
    this.page.y += size + 9;
  }

  paragraph(text, size = 11, indent = 0) {
    const maxWidth = this.pageWidth - this.margin * 2 - indent;
    const lines = this.wrapText(text, maxWidth);
    for (const line of lines) {
      this.ensureSpace(this.lineHeight);
      this.page.content.push({
        type: "text",
        text: line,
        x: this.margin + indent,
        y: this.page.y,
        size,
        bold: false,
        color: [0.15, 0.15, 0.18],
      });
      this.page.y += this.lineHeight;
    }
  }

  bullet(text) {
    const indent = 14;
    this.ensureSpace(this.lineHeight);
    this.page.content.push({
      type: "text",
      text: "\u2022",
      x: this.margin,
      y: this.page.y,
      size: this.fontSize,
      bold: true,
      color: [0.2, 0.35, 0.6],
    });
    this.paragraph(text, this.fontSize, indent);
  }

  codeBlock(code) {
    const lines = code.split("\n");
    const blockHeight = lines.length * 12 + 18;
    this.ensureSpace(blockHeight);
    const boxY = this.page.y;
    this.page.content.push({
      type: "rect",
      x: this.margin,
      y: boxY,
      w: this.pageWidth - this.margin * 2,
      h: blockHeight,
      color: [0.93, 0.94, 0.97],
    });
    this.page.y = boxY + 9;
    for (const line of lines) {
      this.page.content.push({
        type: "text",
        text: line,
        x: this.margin + 10,
        y: this.page.y,
        size: 9.5,
        bold: false,
        mono: true,
        color: [0.1, 0.25, 0.45],
      });
      this.page.y += 12;
    }
    this.page.y += 12;
  }

  spacer(height = 8) {
    this.page.y += height;
  }

  build() {
    this.pages.push(this.page);
    const objects = [];
    objects.push({ data: "<< /Type /Catalog /Pages 2 0 R >>" });
    const kids = this.pages.map((_, i) => `${3 + i} 0 R`).join(" ");
    objects.push({
      data: `<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`,
    });

    const fontId = 3 + this.pages.length;
    const fontIdBold = fontId + 1;
    const fontIdMono = fontId + 2;
    objects.push({ data: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" });
    objects.push({ data: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>" });
    objects.push({ data: "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>" });

    let objNum = fontIdMono + 1;
    this.pages.forEach((page) => {
      // content stream
      let stream = "BT\n";
      for (const item of page.content) {
        if (item.type === "rect") {
          stream += `q\n${item.color.join(" ")} rg\n${item.x} ${page.pageHeight - item.y - item.h} ${item.w} ${item.h} re f\nQ\n`;
        } else {
          const font = item.mono
            ? `/F3`
            : item.bold
              ? `/F2`
              : `/F1`;
          const color = item.color.join(" ");
          stream += `${font} ${item.size} Tf\n${color} rg\n`;
          const escaped = String(item.text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
          stream += `1 0 0 1 ${item.x} ${page.pageHeight - item.y} Tm\n(${escaped}) Tj\n`;
        }
      }
      stream += "ET";

      objects.push({
        data: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontIdBold} 0 R /F3 ${fontIdMono} 0 R >> >> /Contents ${objNum + 1} 0 R >>`,
      });
      objects.push({
        data: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      });
      objNum += 2;
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj.data}\nendobj\n`;
    });
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    return Buffer.from(pdf, "latin1");
  }
}

export default SimplePdf;