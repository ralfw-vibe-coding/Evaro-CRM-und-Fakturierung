import type { AppSettings, Invoice } from "@/domain/model";
import type { Column, Content, TDocumentDefinitions } from "pdfmake/interfaces";
import {
  formatDate,
  formatMoney,
  formatNumber,
  invoicePdfFilename,
  invoicePrintLabels,
  invoiceTitle,
  invoiceTotal,
  lineTotal,
  paymentTermsText,
  splitLines,
  type InvoicePrintLanguage,
} from "./invoice-print-format";

/**
 * Real PDF generation for invoices — replaces "render HTML, ask the browser
 * to print it" with an actual PDF built by pdfmake. The point of doing this
 * (rather than reusing the print HTML) is pdfmake's native repeating
 * header/footer: the footer (registration/bank/contact) repeats in full on
 * every page, the header is abbreviated from page 2 on — neither is reliably
 * possible with browser print CSS.
 */

const MM_TO_PT = 2.8346456693;
const mm = (value: number) => value * MM_TO_PT;

const COLOR = {
  black: "#000000",
  heading: "#18181b",
  label: "#71717a",
  body: "#3f3f46",
  muted: "#52525b",
  faint: "#a1a1aa",
  rule: "#d4d4d8",
};

/** pdfmake's Margins type is a fixed-length [left, top, right, bottom] tuple,
 * which a plain `[a, b, c, d]` array literal doesn't satisfy on its own —
 * this pins the tuple shape once instead of casting at every call site. */
const m4 = (left: number, top: number, right: number, bottom: number): [number, number, number, number] => [
  left,
  top,
  right,
  bottom,
];

type PdfMakeApi = typeof import("pdfmake");

let fontsReady: Promise<PdfMakeApi> | null = null;

/** Load pdfmake and register its default font lazily — keeps it out of the
 * main bundle until someone actually generates a PDF.
 *
 * pdfmake ships as a CJS/UMD bundle; Vite's esbuild pre-bundling wraps it as
 * `{ default: <actual module.exports> }` at runtime (verified live — none of
 * the named exports its own .d.ts declares exist on the dynamic-import
 * namespace object itself, only on `.default`). The cast below reflects that
 * actual shape; without it, `pdfMake.addVirtualFileSystem` etc. are
 * `undefined` even though they type-check as present. */
async function getPdfMake(): Promise<PdfMakeApi> {
  if (!fontsReady) {
    fontsReady = (async () => {
      const [pdfMakeModule, vfsModule] = await Promise.all([
        import("pdfmake"),
        import("pdfmake/build/vfs_fonts"),
      ]);
      const pdfMake = (pdfMakeModule as unknown as { default: PdfMakeApi }).default;
      pdfMake.addVirtualFileSystem(vfsModule.default);
      pdfMake.addFonts({
        Roboto: {
          normal: "Roboto-Regular.ttf",
          bold: "Roboto-Medium.ttf",
          italics: "Roboto-Italic.ttf",
          bolditalics: "Roboto-MediumItalic.ttf",
        },
      });
      return pdfMake;
    })();
  }
  return fontsReady;
}

function ruleLine(width: number): Content {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: width, y2: 0, lineWidth: 1, lineColor: COLOR.rule }],
  };
}

function labeledBlock(label: string, lines: string[], opts?: { boldFirst?: boolean }): Content {
  const [first, ...rest] = lines;
  return {
    stack: [
      { text: label, bold: true, fontSize: 8, color: COLOR.heading, margin: m4(0, 0, 0, 3) },
      ...(first !== undefined
        ? [
            {
              text: first,
              fontSize: 8,
              color: opts?.boldFirst ? COLOR.black : COLOR.muted,
              bold: opts?.boldFirst,
            },
          ]
        : []),
      ...(rest.length > 0 ? [{ text: rest.join("\n"), fontSize: 8, color: COLOR.muted }] : []),
    ],
  };
}

export function buildInvoiceDocDefinition(invoice: Invoice, settings: AppSettings): TDocumentDefinitions {
  const totals = invoiceTotal(invoice);
  const seller = settings.invoicing;
  const sellerName = seller.company_name?.trim() || "Evaro";
  const sellerAddressLines = splitLines(seller.sender_address);
  const bankLines = splitLines(seller.bank_details);
  const registrationLines = splitLines(seller.company_registration);
  const address = invoice.gp_snapshot.address;
  const buyerLines = [
    invoice.gp_snapshot.name,
    address?.street,
    [address?.zip, address?.city].filter(Boolean).join(" "),
    address?.country,
  ].filter((line): line is string => Boolean(line));
  const invoiceNumber = invoice.invoice_number ?? "0000000000";
  const invoiceDate = invoice.invoice_date ? formatDate(invoice.invoice_date) : "DD.MM.YYYY";
  const reverseCharge = invoice.data.reverse_charge === true;
  const language: InvoicePrintLanguage = invoice.gp_snapshot.invoice_language ?? "de";
  const labels = invoicePrintLabels[language];
  const paymentTerms = paymentTermsText(invoice.data, invoice.invoice_date, language);
  const title = invoiceTitle(language, invoiceNumber);

  const marginLeft = mm(18);
  const marginRight = mm(18);
  const marginTop = mm(16);
  const marginBottom = mm(38);
  const contentWidth = 595.28 - marginLeft - marginRight; // A4 width in pt minus margins

  // The seller block and the invoice title share these widths so the title's
  // left edge lines up vertically with the "Rechnungssteller" column below it.
  const columnGap = 24;
  const rightColumnWidth = 250;
  const leftColumnWidth = contentWidth - columnGap - rightColumnWidth;

  // One size for every line-item cell and every summary figure — the amount
  // column and the totals must read as one continuous right-aligned column.
  const BODY_SIZE = 9;
  const lastColumn = 5;

  const itemRows = invoice.data.lines.map((line) => [
    { text: line.service_date ? formatDate(line.service_date) : "", fontSize: BODY_SIZE, color: COLOR.body },
    {
      stack: [
        ...(line.product_form || line.product_topic
          ? [
              {
                text: [line.product_form, line.product_topic].filter(Boolean).join("   "),
                fontSize: BODY_SIZE,
                bold: true,
                color: COLOR.heading,
              },
            ]
          : []),
        ...(line.text ? [{ text: line.text, fontSize: BODY_SIZE, color: COLOR.muted }] : []),
      ],
    },
    { text: formatNumber(line.quantity), fontSize: BODY_SIZE, color: COLOR.body, alignment: "right" as const },
    { text: line.unit ?? "", fontSize: BODY_SIZE, color: COLOR.body },
    { text: formatMoney(line.unit_price), fontSize: BODY_SIZE, color: COLOR.body, alignment: "right" as const },
    {
      text: formatMoney(lineTotal(line)),
      fontSize: BODY_SIZE,
      bold: true,
      color: COLOR.heading,
      alignment: "right" as const,
    },
  ]);

  const headerRow = [
    { text: labels.serviceDate, fontSize: 7, bold: true, color: COLOR.label },
    { text: labels.description, fontSize: 7, bold: true, color: COLOR.label },
    { text: labels.qty, fontSize: 7, bold: true, color: COLOR.label, alignment: "right" as const },
    { text: labels.unit, fontSize: 7, bold: true, color: COLOR.label },
    { text: labels.unitPrice, fontSize: 7, bold: true, color: COLOR.label, alignment: "right" as const },
    { text: labels.total, fontSize: 7, bold: true, color: COLOR.label, alignment: "right" as const },
  ];

  const footerColumns: Column[] = [
    labeledBlock(labels.registration, registrationLines.length > 0 ? registrationLines : [sellerName]),
    labeledBlock(labels.bank, bankLines),
    labeledBlock(labels.contact, [seller.contact_person, seller.email, seller.phone, seller.website].filter(
      (v): v is string => Boolean(v),
    )),
  ];

  return {
    pageSize: "A4",
    pageMargins: [marginLeft, marginTop, marginRight, marginBottom],
    defaultStyle: { font: "Roboto", fontSize: 9, color: COLOR.body },
    header: (currentPage) => {
      // Page 1 carries the full header inside the content flow below;
      // page 2+ gets a slim repeating one instead of repeating the whole block.
      if (currentPage === 1) return undefined;
      return {
        margin: m4(marginLeft, 16, marginRight, 0),
        columns: [
          { text: sellerName, fontSize: 8, color: COLOR.faint },
          { text: title, fontSize: 8, color: COLOR.faint, alignment: "right" },
        ],
      };
    },
    footer: (currentPage, pageCount) => ({
      margin: m4(marginLeft, 14, marginRight, 0),
      stack: [
        ruleLine(contentWidth),
        {
          columns: footerColumns,
          columnGap: 20,
          margin: m4(0, 10, 0, 0),
        },
        {
          text: `${labels.page} ${currentPage} / ${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: COLOR.faint,
          margin: m4(0, 8, 0, 0),
        },
      ],
    }),
    content: [
      // Full header — page 1 only, part of the normal content flow.
      {
        columns: [
          { width: leftColumnWidth, text: sellerName, fontSize: 18, bold: true, color: COLOR.heading },
          {
            // "auto" shrinks this column to the title's own text width, so the
            // date right-aligns on the invoice number rather than overshooting
            // to the page edge. The left edge still sits on rightColumnWidth's
            // start, keeping the title flush with "Rechnungssteller" below.
            width: "auto",
            stack: [
              { text: title, fontSize: 18, bold: true, color: COLOR.heading },
              { text: invoiceDate, fontSize: 9, color: COLOR.muted, alignment: "right", margin: m4(0, 2, 0, 0) },
            ],
          },
        ],
        columnGap,
        margin: m4(0, 0, 0, 8),
      },
      ruleLine(contentWidth),

      {
        columns: [
          {
            width: leftColumnWidth,
            stack: [
              { text: labels.billTo, bold: true, fontSize: 8, color: COLOR.label, margin: m4(0, 0, 0, 6) },
              { text: buyerLines.join("\n"), fontSize: 9, color: COLOR.body, lineHeight: 1.3 },
              ...(invoice.gp_snapshot.vat_id
                ? [{ text: `${labels.buyerVatId}: ${invoice.gp_snapshot.vat_id}`, fontSize: 9, color: COLOR.muted, margin: m4(0, 6, 0, 0) }]
                : []),
              ...(invoice.data.reference
                ? [{ text: `${labels.customerRef}: ${invoice.data.reference}`, fontSize: 9, color: COLOR.muted, margin: m4(0, 2, 0, 0) }]
                : []),
            ],
          },
          {
            width: rightColumnWidth,
            stack: [
              { text: labels.seller, bold: true, fontSize: 8, color: COLOR.label, margin: m4(0, 0, 0, 6) },
              { text: sellerName, fontSize: 9, bold: true, color: COLOR.heading },
              ...(sellerAddressLines.length > 0
                ? [{ text: sellerAddressLines.join("\n"), fontSize: 9, color: COLOR.muted, lineHeight: 1.3, margin: m4(0, 2, 0, 0) }]
                : []),
              ...(seller.vat_number
                ? [{ text: `${labels.sellerVatNo}: ${seller.vat_number}`, fontSize: 9, color: COLOR.muted, margin: m4(0, 2, 0, 0) }]
                : []),
            ],
          },
        ],
        columnGap,
        margin: m4(0, 24, 0, 0),
      },

      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto", "auto", "auto"],
          body: [headerRow, ...itemRows],
        },
        layout: {
          hLineWidth: (i: number, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
          hLineColor: () => COLOR.rule,
          vLineWidth: () => 0,
          paddingLeft: (i: number) => (i === 0 ? 0 : 8),
          // No padding on the amount column so its figures end exactly on the
          // content edge — the same line the totals below right-align to.
          paddingRight: (i: number) => (i === lastColumn ? 0 : 8),
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: m4(0, 24, 0, 0),
      },

      {
        columns: [
          {
            width: "*",
            stack: [
              ...(invoice.data.comment
                ? [
                    {
                      text: labels.comment,
                      bold: true,
                      fontSize: 8,
                      color: COLOR.label,
                      margin: m4(0, 0, 0, 4),
                    },
                    { text: invoice.data.comment, fontSize: 9, color: COLOR.body, lineHeight: 1.3 },
                  ]
                : []),
              ...(paymentTerms
                ? [
                    {
                      text: labels.paymentTerms,
                      bold: true,
                      fontSize: 8,
                      color: COLOR.label,
                      margin: m4(0, invoice.data.comment ? 12 : 0, 0, 4),
                    },
                    { text: paymentTerms, fontSize: 9, color: COLOR.body, lineHeight: 1.3 },
                  ]
                : []),
            ],
          },
          {
            width: 180,
            stack: [
              ruleLine(180),
              {
                columns: [
                  { text: labels.net, fontSize: BODY_SIZE, color: COLOR.body },
                  { text: formatMoney(totals.net), fontSize: BODY_SIZE, color: COLOR.body, alignment: "right" },
                ],
                margin: m4(0, 8, 0, 0),
              },
              {
                columns: [
                  { text: `${labels.vat} (${formatNumber(invoice.vat_rate)}%)`, fontSize: BODY_SIZE, color: COLOR.body },
                  { text: formatMoney(totals.vat), fontSize: BODY_SIZE, color: COLOR.body, alignment: "right" },
                ],
                margin: m4(0, 4, 0, 0),
              },
              ruleLine(180),
              {
                columns: [
                  { text: labels.amountDue, fontSize: BODY_SIZE, bold: true, color: COLOR.heading },
                  {
                    text: formatMoney(totals.gross),
                    fontSize: BODY_SIZE,
                    bold: true,
                    color: COLOR.heading,
                    alignment: "right",
                  },
                ],
                margin: m4(0, 8, 0, 0),
              },
            ],
          },
        ],
        columnGap,
        margin: m4(0, 20, 0, 0),
      },

      ...(reverseCharge
        ? [
            ruleLine(contentWidth),
            { text: labels.reverseCharge, fontSize: 8, color: COLOR.muted, margin: m4(0, 10, 0, 0) },
          ]
        : []),
    ],
  };
}

export function invoiceFilenameFor(invoice: Invoice): string {
  return invoicePdfFilename(invoice.invoice_number ?? "0000000000", invoice.gp_snapshot.name);
}

export async function createInvoicePdfBlob(invoice: Invoice, settings: AppSettings): Promise<Blob> {
  const pdfMake = await getPdfMake();
  const doc = buildInvoiceDocDefinition(invoice, settings);
  return pdfMake.createPdf(doc).getBlob();
}
