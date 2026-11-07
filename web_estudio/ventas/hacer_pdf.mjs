// PDF del plan comercial: node web_estudio/ventas/hacer_pdf.mjs → web_estudio/ventas/plan_comercial_kiria.pdf (A4, con números de página)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const b = await chromium.launch(); const pg = await b.newPage();
await pg.goto('file://' + path.join(dir, 'plan_comercial.html'), { waitUntil: 'load' });
await pg.evaluate(() => document.fonts.ready);
await pg.pdf({ path: path.join(dir, 'plan_comercial_kiria.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: '<div style="width:100%;font-size:7.5pt;color:#8a9099;padding:0 15mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>kiria.ai · Plan comercial · de la calle al cliente</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
await b.close(); console.log('ok');
