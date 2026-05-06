import { test, expect } from '@playwright/test';

test('profile fields should be read-only', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'gestor@empresa.com');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');

  // 2. Verificar se redirecionou para o dashboard
  await expect(page).toHaveURL(/.*dashboard/);

  // 3. Abrir configurações de perfil (botão no header com ícone de usuários)
  await page.click('header button:has(svg.lucide-users)');

  // 4. Verificar se o modal abriu
  await expect(page.locator('text=Configurações do Perfil')).toBeVisible();

  // 5. Verificar se os inputs de nome e email são read-only
  const nomeInput = page.locator('input#nome');
  const emailInput = page.locator('input#email');
  
  await expect(nomeInput).toHaveAttribute('readonly', '');
  await expect(emailInput).toHaveAttribute('readonly', '');
});

test('inventory should show prefixes CÓD: and PCA:', async ({ page }) => {
  // Login as gestor
  await page.goto('/login');
  await page.fill('input[name="email"]', 'gestor@empresa.com');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');

  // Go to Peças
  await page.goto('/gestor/pecas');

  // Wait for items to load
  await page.waitForSelector('.lucide-package', { state: 'detached' }); // Wait for loader to hide

  // Check for prefixes (at least one instance)
  await expect(page.locator('text=CÓD:')).toBeVisible();
  await expect(page.locator('text=PCA:')).toBeVisible();
});
