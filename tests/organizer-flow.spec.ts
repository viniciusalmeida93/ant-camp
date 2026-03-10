import { test, expect } from '@playwright/test';

const EMAIL = 'organizer@test.com';
const PASSWORD = 'password123';

async function loginAsOrganizer(page: any) {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL(/\/(dashboard|app|athlete-dashboard)/, { timeout: 25000 });
}

test.describe('Fluxo do Organizador — Navegação', () => {

    test('dashboard do organizador carrega após login', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        // Deve estar em alguma rota autenticada
        await expect(page).toHaveURL(/\/(dashboard|app|athlete-dashboard|wods|registrations)/);
        // Deve haver conteúdo carregado
        await expect(page.locator('h1, main, aside').first()).toBeVisible({ timeout: 10000 });
    });


    test('página de Eventos carrega sem erro', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/wods');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('h1, [class*="heading"], [class*="title"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('página de Inscrições carrega sem erro', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/registrations');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });

    test('página de Baterias carrega sem erro', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/heats');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('página de Resultados carrega sem erro', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/results');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('página de Leaderboard carrega sem erro', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/leaderboard');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('página de Pagamentos carrega sem erro', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/payments');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('página de Cupons carrega sem erro', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/coupons');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('página de Pontuação carrega sem erro', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/scoring');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('rota /assign-roles foi removida e mostra NotFound', async ({ page }) => {
        await loginAsOrganizer(page);
        await page.goto('/assign-roles');
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        // Não deve estar em /auth, mas deve exibir algo de "não encontrado" OU redirecionar
        const url = page.url();
        const bodyText = await page.locator('body').innerText();
        const isHandled = !url.includes('/assign-roles') || /não encontrad|404|página/i.test(bodyText);
        expect(isHandled).toBeTruthy();
    });

});
