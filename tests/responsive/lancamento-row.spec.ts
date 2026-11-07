import { test, expect } from '@playwright/test';

// Auditoria dedicada ao LancamentoRow (painel "Lançamentos Recentes" em
// /lancamentos). Usa seletores semânticos/acessíveis — nenhum atributo de
// teste foi adicionado ao componente, pois os botões de ação já expõem
// aria-label e os textos (descrição, valor, data, status) são lidos pelo
// próprio texto visível.

const WIDTHS = [320, 375, 768];

test.describe('LancamentoRow — legibilidade e acessibilidade mobile', () => {
  for (const width of WIDTHS) {
    test(`linha de lançamento @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/lancamentos', { waitUntil: 'networkidle' });

      const card = page.getByText('Lançamentos Recentes', { exact: false });
      await expect(card).toBeVisible();

      // A primeira linha da lista: container que agrupa descrição, valor,
      // data, status e ações. Identificado pelo badge de status, que é
      // sempre renderizado por linha.
      const statusBadge = page
        .getByText(/^(Pago|Recebido|Pendente|Vencido|Cancelado)$/, { exact: true })
        .first();
      await expect(statusBadge).toBeVisible();

      const row = statusBadge.locator(
        'xpath=ancestor::div[.//button[@aria-label="Excluir"]][1]',
      );
      await expect(row).toBeVisible();

      // Descrição completa presente no DOM (mesmo truncada visualmente).
      const descricao = row.locator('p.truncate').first();
      const descricaoTexto = (await descricao.textContent())?.trim() ?? '';
      expect(descricaoTexto.length).toBeGreaterThan(0);

      // Valor financeiro no formato pt-BR.
      const valor = row.locator('p', { hasText: /R\$\s?[\d.,]+/ }).first();
      await expect(valor).toBeVisible();
      expect(await valor.textContent()).toMatch(/R\$\s?[\d.,]+/);

      // Data no formato dd/mm/aaaa.
      const data = row.locator('p', { hasText: /\d{2}\/\d{2}\/\d{4}/ }).first();
      await expect(data).toBeVisible();

      // Botões de ação acessíveis (exclusão sempre presente nesta lista;
      // editar/anexos/baixar dependem das props passadas pela página).
      const excluir = row.getByRole('button', { name: 'Excluir' });
      await expect(excluir).toBeVisible();

      const botoes = await row.getByRole('button').all();
      expect(botoes.length).toBeGreaterThan(0);

      // Alvo de toque mínimo de 44x44 (WCAG 2.5.5 / guia do projeto) e nome
      // acessível não vazio para cada botão de ação da linha.
      for (const botao of botoes) {
        await expect(botao).toHaveAccessibleName(/.+/);
        const box = await botao.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }

      // Sem sobreposição horizontal/vertical entre valor, data, status e ações.
      const boxes = await Promise.all(
        [valor, data, statusBadge, excluir].map((loc) => loc.boundingBox()),
      );
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          if (!a || !b) continue;
          const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
          const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
          expect(overlapX * overlapY).toBeLessThanOrEqual(0);
        }
      }

      // Nenhum overflow horizontal da página nesta largura.
      const { clientWidth, scrollWidth } = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});
