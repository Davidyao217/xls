import { test, expect } from '@playwright/test';

test.describe('Spreadsheet E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow basic data entry and calculation', async ({ page }) => {
    const cellA1 = page.locator('#xA1');
    await cellA1.click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');

    const cellA2 = page.locator('#xA2');
    await cellA2.click();
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    const cellA3 = page.locator('#xA3');
    await cellA3.click();
    await page.keyboard.type('=A1+A2');
    await page.keyboard.press('Enter');

    await expect(cellA3).toHaveText('30');
  });

  test('should synchronize formula bar', async ({ page }) => {
    const cellB1 = page.locator('#xB1');
    const formulaBar = page.locator('#fb');

    await cellB1.click();
    await page.keyboard.type('=SUM(1, 2, 3)');
    await page.keyboard.press('Enter');

    await cellB1.click();
    await expect(formulaBar).toHaveValue('=SUM(1, 2, 3)');
    await expect(cellB1).toHaveText('6');
  });

  test('should support keyboard navigation', async ({ page }) => {
    const cellA1 = page.locator('#xA1');
    await cellA1.click();
    
    // Move to B1
    await page.keyboard.press('ArrowRight');
    // Move to B2
    await page.keyboard.press('ArrowDown');
    
    const activeCellIndicator = page.locator('#aci');
    await expect(activeCellIndicator).toHaveText('B2');
    
    // Type in B2
    await page.keyboard.type('42');
    await page.keyboard.press('Enter');
    
    const cellB2 = page.locator('#xB2');
    await expect(cellB2).toHaveText('42');
  });

  test('should allow clearing a cell with Delete/Backspace', async ({ page }) => {
    const cellC1 = page.locator('#xC1');
    await cellC1.click();
    await page.keyboard.type('hello');
    await page.keyboard.press('Enter');
    await expect(cellC1).toHaveText('hello');

    await cellC1.click();
    await page.keyboard.press('Backspace');
    await expect(cellC1).toHaveText('');
    
    // formula bar should also be empty
    const formulaBar = page.locator('#fb');
    await expect(formulaBar).toHaveValue('');
  });

  test('should show error state correctly', async ({ page }) => {
    const cellA1 = page.locator('#xA1');
    await cellA1.click();
    await page.keyboard.type('=B1');
    await page.keyboard.press('Enter');

    const cellB1 = page.locator('#xB1');
    await cellB1.click();
    await page.keyboard.type('=A1');
    await page.keyboard.press('Enter');

    await expect(cellA1).toHaveText('#CIRC!');
    await expect(cellB1).toHaveText('#CIRC!');
    
    // Should have "err" class
    await expect(cellA1).toHaveClass(/err/);
  });

  test('should support formula range selection via mouse', async ({ page }) => {
    // Type some values
    await page.locator('#xA1').click();
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    await page.locator('#xA2').click();
    await page.keyboard.type('2');
    await page.keyboard.press('Enter');
    await page.locator('#xA3').click();
    await page.keyboard.type('3');
    await page.keyboard.press('Enter');

    // Start formula in B1
    const cellB1 = page.locator('#xB1');
    await cellB1.click();
    await page.keyboard.type('=SUM(');

    // Mouse drag from A1 to A3
    const cellA1 = page.locator('#xA1');
    const cellA3 = page.locator('#xA3');
    
    await cellA1.hover();
    await page.mouse.down();
    await cellA3.hover();
    await page.mouse.up();

    // Verify formula bar updated
    const formulaBar = page.locator('#fb');
    // Note: the editor might also be open here, but formulaBar is synchronized
    // We type ')' to close the formula
    await page.keyboard.type(')');
    await page.keyboard.press('Enter');

    await expect(cellB1).toHaveText('6');
  });
});
