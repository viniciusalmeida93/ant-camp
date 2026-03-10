import { test, expect } from '@playwright/test';

const VALID_SLUG = 'ant-games';

test.describe('Páginas Públicas', () => {

    test('landing page carrega com branding AntCamp', async ({ page }) => {
        await page.goto('/landing-page');
        await expect(page.getByText('AntCamp').first()).toBeVisible();
        // Deve ter pelo menos um link para /auth
        await expect(page.locator('a[href="/auth"]').first()).toBeVisible();
        await expect(page.locator('h1')).toBeVisible();
    });

    test('página de inscrição pública carrega para slug válido', async ({ page }) => {
        await page.goto(`/inscricao/${VALID_SLUG}`);
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        // Aguardando qualquer conteúdo significativo da página
        await page.waitForTimeout(3000);
        const bodyText = await page.locator('body').innerText();
        // A página deve ter algum conteúdo (não ser vazia)
        expect(bodyText.length).toBeGreaterThan(50);
    });

    test('slug inválido mostra página de não encontrado', async ({ page }) => {
        await page.goto('/inscricao/slug-que-nao-existe-xyz123abc');
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await page.waitForTimeout(3000);
        const bodyText = await page.locator('body').innerText();
        // Deve conter alguma mensagem de erro ou não encontrado
        const hasErrorContent = /não encontrado|nenhum|404|inválid|encerrad/i.test(bodyText);
        expect(hasErrorContent).toBeTruthy();
    });

    test('link page pública carrega para slug válido', async ({ page }) => {
        await page.goto(`/links/${VALID_SLUG}`);
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('leaderboard público carrega para slug válido', async ({ page }) => {
        await page.goto(`/${VALID_SLUG}/leaderboard`);
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('WODs públicos carregam para slug válido', async ({ page }) => {
        await page.goto(`/${VALID_SLUG}/wods`);
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('baterias públicas carregam para slug válido', async ({ page }) => {
        await page.goto(`/${VALID_SLUG}/heats`);
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await expect(page.locator('body')).not.toBeEmpty();
    });

});
