import { test, expect } from '@playwright/test';

test.describe('Fluxo de Laboratório / RMA', () => {
  test.beforeEach(async ({ page }) => {
    // Login as gestor
    await page.goto('/login');
    await page.fill('input[name="email"]', 'gestor@empresa.com');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await expect(page).toHaveURL(/\/gestor/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('deve carregar a página de laboratório e validar interface', async ({ page }) => {
    await page.goto('/gestor/laboratorio');
    // Wait for the container to be present
    await page.waitForSelector('h2:has-text("Peças DOA e RMA")', { timeout: 15000 });

    // Verificar abas
    const receberTab = page.locator('button[role="tab"]:has-text("Receber / DOA")');
    const enviarTab = page.locator('button[role="tab"]:has-text("Enviar p/ Lab")');

    await expect(receberTab).toBeVisible();
    await expect(enviarTab).toBeVisible();

    // Tentar encontrar prefixos ou mensagem de vazio
    const hasPrefix = await page.getByText(/CÓD:/i).first().isVisible();
    const hasEmptyMsg = await page.getByText(/Nenhuma peça pendente/i).first().isVisible();

    // Pelo menos um dos dois deve ser verdade após carregar
    expect(hasPrefix || hasEmptyMsg).toBeTruthy();

    // Alternar para Enviar p/ Lab
    await enviarTab.click();
    await expect(page.locator('h3:has-text("Aguardando Envio")')).toBeVisible();
  });
});
