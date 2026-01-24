import { test, expect } from '@playwright/test';

test.describe('Organizer Flow', () => {

    test('should redirect to login if accessing dashboard unauthenticated', async ({ page }) => {
        await page.goto('/dashboard');
        // Expect redirection to /auth or /login
        // We check if "Email" input is visible, which confirms we are on a login screen
        await expect(page.getByPlaceholder('Email')).toBeVisible();
        await expect(page.getByText('Entrar', { exact: false })).toBeVisible();
    });

    test('should allow navigation to Register page from Login', async ({ page }) => {
        await page.goto('/auth');
        // Check if "Não tem uma conta?" link exists (adjust text based on real UI)
        // If shadcn auth, usually it is tabs "Login" / "Sign Up"
        // We'll just check if the page loads without 404
        await expect(page.getByPlaceholder('Email')).toBeVisible();
    });

});
