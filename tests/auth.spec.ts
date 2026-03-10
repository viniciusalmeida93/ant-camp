import { test, expect } from '@playwright/test';

const ORGANIZER_EMAIL = 'organizer@test.com';
const ORGANIZER_PASSWORD = 'password123';

// Helper reutilizável de login
async function doLogin(page: any) {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });
    await page.locator('input[type="email"]').fill(ORGANIZER_EMAIL);
    await page.locator('input[type="password"]').fill(ORGANIZER_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL(/\/(dashboard|app|athlete-dashboard)/, { timeout: 20000 });
}

test.describe('Autenticação e Proteção de Rotas', () => {

    test('página de login carrega corretamente', async ({ page }) => {
        await page.goto('/auth');
        await page.waitForSelector('input[type="email"]', { timeout: 15000 });
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Criar Conta' })).toBeVisible();
    });

    test('rota /dashboard redireciona para /auth se não autenticado', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/auth/);
        await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
    });

    test('rota /wods redireciona para /auth se não autenticado', async ({ page }) => {
        await page.goto('/wods');
        await expect(page).toHaveURL(/\/auth/);
    });

    test('rota /registrations redireciona para /auth se não autenticado', async ({ page }) => {
        await page.goto('/registrations');
        await expect(page).toHaveURL(/\/auth/);
    });

    test('login com credenciais corretas redireciona para dashboard', async ({ page }) => {
        await doLogin(page);
        await expect(page).toHaveURL(/\/(dashboard|app|athlete-dashboard)/);
    });

    test('login com senha errada exibe erro', async ({ page }) => {
        await page.goto('/auth');
        await page.waitForSelector('input[type="email"]', { timeout: 15000 });
        await page.locator('input[type="email"]').fill(ORGANIZER_EMAIL);
        await page.locator('input[type="password"]').fill('senha_errada_xyz');
        await page.getByRole('button', { name: 'Entrar' }).click();

        // Deve manter na página de login ou exibir toast de erro
        await page.waitForTimeout(5000);
        const stillOnAuth = page.url().includes('/auth');
        expect(stillOnAuth).toBeTruthy();
    });

    test('aba Criar Conta exibe campos de cadastro', async ({ page }) => {
        await page.goto('/auth');
        await page.waitForSelector('input[type="email"]', { timeout: 15000 });
        await page.getByRole('tab', { name: 'Criar Conta' }).click();
        await expect(page.locator('input[type="email"]').first()).toBeVisible();
        await expect(page.getByRole('button', { name: /criar conta/i })).toBeVisible();
    });

});
