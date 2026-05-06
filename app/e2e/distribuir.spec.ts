import { test, expect } from '@playwright/test';

test.describe('Fluxo de Distribuição de Peças', () => {
  test.beforeEach(async ({ page }) => {
    // Login como gestor
    await page.goto('/login');
    await page.fill('input[type="email"]', 'gestor@empresa.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // Esperar redirecionamento para o dashboard do gestor
    await expect(page).toHaveURL(/\/gestor/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('deve permitir selecionar técnico e peças e realizar a distribuição', async ({ page }) => {
    // Ir para a página de distribuição
    await page.goto('/gestor/distribuir');
    
    // Verificar se há peças disponíveis
    const pieces = page.locator('div.group.relative.flex.items-start');
    const count = await pieces.count();
    
    if (count === 0) {
      console.log('Nenhuma peça disponível para teste de distribuição.');
      return;
    }

    // Selecionar um técnico no combobox
    await page.click('button[role="combobox"]');
    
    // Esperar o popover/command list aparecer
    // O PopoverContent tem a classe 'w-[--radix-popover-trigger-width]'
    await page.waitForSelector('[role="listbox"], [role="group"]');
    
    // Selecionar o primeiro técnico da lista
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();

    // Selecionar a primeira peça da lista
    await pieces.first().click();

    // O dock flutuante de ação deve aparecer com o botão habilitado
    const distributeButton = page.locator('button:has-text("EXECUTAR_DISTRIBUIÇÃO")');
    await expect(distributeButton).toBeVisible();
    await expect(distributeButton).toBeEnabled();

    // Clicar em distribuir
    await distributeButton.click();

    // Verificar se o toast de sucesso aparece (usando a classe do sonner ou texto)
    // O texto costuma ser "Distribuídas X peças com sucesso!"
    await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 10000 });
    
    // Após sucesso, a seleção deve ser limpa e o dock deve desaparecer
    await expect(distributeButton).not.toBeVisible();
  });
});
