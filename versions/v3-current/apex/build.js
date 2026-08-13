const path = require("path");
const fs = require("fs");
const {
  createPresentation, INSIGHT, FRAME, CONTENT_AREA,
  splitRows, splitCols, fillCards,
  drawCard, drawCardSubtle, drawPanelWithHeader, drawSectionBand,
  drawBrandedTable, makeShadow, iconToBase64Png,
  tintHex,
} = require(path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".claude/skills/branded-pptx-slide/slide-lib"
));

const C = INSIGHT;

async function main() {
  const { pres } = createPresentation();
  const slide = pres.addSlide({ masterName: "INSIGHT_CONTENT" });

  // ── Title: conclusion-led ──
  slide.addText("Discount Leakage Erodes Margin Across the Customer Portfolio", {
    x: FRAME.title.x, y: FRAME.title.y, w: FRAME.title.w, h: FRAME.title.h,
    fontSize: 26, bold: true, color: C.primary, fontFace: C.font,
  });

  slide.addText("Apex Components — Customer Discount & Margin Analysis", {
    x: FRAME.subtitle.x, y: FRAME.subtitle.y, w: FRAME.subtitle.w, h: FRAME.subtitle.h,
    fontSize: 14, color: C.textMid, fontFace: C.font,
  });

  // ── Layout: main content + insight callout at bottom ──
  const [mainZone, calloutZone] = splitRows(CONTENT_AREA, [5, 1]);
  const [leftZone, rightZone] = splitCols(mainZone, [2, 3]);

  // ── Left: Key Findings (interview quotes) ──
  const { FaQuoteLeft } = require("react-icons/fa");
  const quoteIcon = await iconToBase64Png(FaQuoteLeft, "#" + C.primary, 256);

  drawPanelWithHeader(slide, pres, leftZone, "KEY FINDINGS", quoteIcon, C.primary);

  const quotes = [
    { text: "“Sales reps often discount to close deals quickly, even when customers have limited alternatives.”", source: "Sales Manager" },
    { text: "“Approval thresholds exist, but exceptions are common and not always documented.”", source: "Finance Director" },
    { text: "“Some smaller customers are paying closer to list price than larger customers, but we’re not sure if that reflects value or inconsistent negotiation.”", source: "VP Sales" },
  ];

  const quoteStartY = leftZone.y + 0.55;
  const quoteH = (leftZone.h - 0.65) / quotes.length;
  const qPad = 0.18;

  quotes.forEach((q, i) => {
    const qY = quoteStartY + i * quoteH;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: leftZone.x + 0.15,
      y: qY,
      w: leftZone.w - 0.3,
      h: quoteH - 0.1,
      fill: { color: tintHex(C.primary, 0.92) },
      rectRadius: 0.06,
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: leftZone.x + 0.15,
      y: qY,
      w: 0.05,
      h: quoteH - 0.1,
      fill: { color: C.primary },
    });
    slide.addText(q.text, {
      x: leftZone.x + 0.35,
      y: qY + 0.08,
      w: leftZone.w - 0.65,
      h: quoteH - 0.38,
      fontSize: 11,
      color: C.textDark,
      fontFace: C.font,
      italic: true,
      lineSpacingMultiple: 1.25,
    });
    slide.addText("— " + q.source, {
      x: leftZone.x + 0.35,
      y: qY + quoteH - 0.38,
      w: leftZone.w - 0.65,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: C.textMid,
      fontFace: C.font,
    });
  });

  // ── Right: Customer Comparison Table ──
  const tableHeaderY = rightZone.y;
  slide.addText("CUSTOMER DISCOUNT & MARGIN COMPARISON", {
    x: rightZone.x,
    y: tableHeaderY,
    w: rightZone.w,
    h: 0.32,
    fontSize: 11,
    bold: true,
    color: C.accent,
    fontFace: C.font,
    charSpacing: 3,
  });

  const tableZone = {
    x: rightZone.x,
    y: tableHeaderY + 0.35,
    w: rightZone.w,
    h: rightZone.h - 0.35,
  };

  drawBrandedTable(slide, pres, [
    ["Customer", "Revenue", "List Price", "Realized Price", "Discount", "Gross Margin"],
    ["Northstar Mfg Group", "$10M", "$100", "$82", "18%", "41%"],
    ["Oak Street Industrial", "$8M", "$100", "$76", "24%", "34%"],
    ["Pioneer Process Sol.", "$1M", "$100", "$88", "12%", "46%"],
  ], {
    zone: tableZone,
    colW: [3, 1.2, 1.2, 1.4, 1.2, 1.4],
    palette: C,
    fontSize: 12,
  });

  // ── Insight callout at bottom ──
  const { FaExclamationTriangle } = require("react-icons/fa");
  const warnIcon = await iconToBase64Png(FaExclamationTriangle, "#" + C.accent, 256);

  drawCardSubtle(slide, pres, calloutZone, C, {
    style: "leftBar",
    accentColor: C.accent,
  });

  slide.addImage({
    data: warnIcon,
    x: calloutZone.x + 0.2,
    y: calloutZone.y + (calloutZone.h - 0.3) / 2,
    w: 0.3,
    h: 0.3,
  });

  slide.addText("Volume is growing but revenue is flat — discount exceptions are granted without visibility or controls. Smaller customers sometimes receive better pricing than strategic accounts.", {
    x: calloutZone.x + 0.65,
    y: calloutZone.y + 0.08,
    w: calloutZone.w - 0.85,
    h: calloutZone.h - 0.16,
    fontSize: 12,
    color: C.textDark,
    fontFace: C.font,
    lineSpacingMultiple: 1.3,
  });

  const outDir = path.dirname(__filename || __dirname);
  await pres.writeFile({ fileName: path.join(outDir, "apex_discount_leakage.pptx") });
  console.log("Done: apex_discount_leakage.pptx");
}

main().catch(console.error);
