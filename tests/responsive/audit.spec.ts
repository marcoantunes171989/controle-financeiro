import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
  { name: '320x690', width: 320, height: 690 },
  { name: '360x740', width: 360, height: 740 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '393x852', width: 393, height: 852 },
  { name: '414x896', width: 414, height: 896 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
];

const ROUTES = [
  { path: '/login', name: 'login' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/analise', name: 'analise' },
  { path: '/lancamentos', name: 'lancamentos' },
  { path: '/pagar', name: 'pagar' },
  { path: '/receber', name: 'receber' },
  { path: '/agendamento', name: 'agendamento' },
  { path: '/empresas', name: 'empresas' },
  { path: '/categorias', name: 'categorias' },
  { path: '/relatorios', name: 'relatorios' },
];

const SCREENSHOT_DIR = path.join(__dirname, '__screenshots__');
const REPORT_PATH = path.join(__dirname, '__report__', 'findings.json');

type Finding = {
  route: string;
  viewport: string;
  type: string;
  detail: string;
};

const findings: Finding[] = [];

async function checkHorizontalOverflow(page: Page, route: string, viewport: string) {
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const offenders: string[] = [];
    if (scrollWidth > docWidth + 1) {
      document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > docWidth + 2 && r.width > 0) {
          const sel = `${el.tagName.toLowerCase()}.${Array.from(el.classList).slice(0, 2).join('.')}`;
          offenders.push(`${sel} right=${Math.round(r.right)} (viewport=${docWidth})`);
        }
      });
    }
    return { docWidth, scrollWidth, offenders: offenders.slice(0, 8) };
  });
  if (overflow.scrollWidth > overflow.docWidth + 1) {
    findings.push({
      route,
      viewport,
      type: 'horizontal-overflow',
      detail: `scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.docWidth}. Offenders: ${overflow.offenders.join(' | ')}`,
    });
  }
}

async function checkOverlap(page: Page, route: string, viewport: string) {
  const overlaps = await page.evaluate(() => {
    function rectsOverlap(a: DOMRect, b: DOMRect) {
      const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return ix * iy;
    }
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>('[data-audit-value], [data-audit-date], [data-audit-status], [data-audit-actions]'),
    );
    const problems: string[] = [];
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i];
        const b = candidates[j];
        if (a.closest('[data-audit-row]') !== b.closest('[data-audit-row]')) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        if (ra.width === 0 || rb.width === 0) continue;
        const area = rectsOverlap(ra, rb);
        if (area > 20) {
          problems.push(`${a.getAttribute('data-audit-value') || a.getAttribute('data-audit-date') || a.getAttribute('data-audit-status') || a.getAttribute('data-audit-actions')} overlaps ${b.tagName}`);
        }
      }
    }
    return problems;
  });
  if (overlaps.length > 0) {
    findings.push({ route, viewport, type: 'element-overlap', detail: overlaps.join(' | ') });
  }
}

async function checkTouchTargets(page: Page, route: string, viewport: string, width: number) {
  if (width >= 768) return;
  const small = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, a[href]'));
    const bad: string[] = [];
    for (const b of buttons) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(b);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (r.width < 24 || r.height < 24) {
        bad.push(`${b.tagName}[${b.getAttribute('title') || b.getAttribute('aria-label') || b.textContent?.slice(0, 15)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return bad.slice(0, 10);
  });
  if (small.length > 0) {
    findings.push({ route, viewport, type: 'touch-target-small', detail: small.join(' | ') });
  }
}

test.describe('Auditoria global de responsividade mobile', () => {
  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route.name} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.waitForTimeout(300);

        await checkHorizontalOverflow(page, route.name, vp.name);
        await checkOverlap(page, route.name, vp.name);
        await checkTouchTargets(page, route.name, vp.name, vp.width);

        const dir = path.join(SCREENSHOT_DIR, route.name);
        fs.mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: path.join(dir, `${vp.name}.png`), fullPage: true });
      });
    }
  }

  test.afterAll(async () => {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(findings, null, 2), 'utf-8');
  });
});
