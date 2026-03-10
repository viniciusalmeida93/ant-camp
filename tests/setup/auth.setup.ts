import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/organizer.json');

setup('autenticar como organizador', async ({ page }) => {
    await page.goto('/auth');
    await page.getByPlaceholder('seu@email.com').fill('organizer@test.com');
    await page.getByPlaceholder('Sua senha').fill('password123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Aguarda redirect para alguma rota autenticada
    await page.waitForURL(/\/(dashboard|app|athlete-dashboard)/, { timeout: 15000 });

    // Salva o estado de autenticação (cookies + localStorage)
    await page.context().storageState({ path: authFile });
});
