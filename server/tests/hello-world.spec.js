const { test, expect } = require('@playwright/test');


test('hello world test', async ({ page }) => {
    await page.goto('https://example.com');
    const content = await page.textContent('h1');
    expect(content).toBe('Example Domain');
});

// טסט שנכשל בכוונה כדי לבדוק את ה-CI/CD
test('this test should fail', async ({ page }) => {
    await page.goto('https://example.com');
    const content = await page.textContent('h1');
    expect(content).toBe('Not The Example Domain');
});