import { test, expect } from '@playwright/test';

test.describe('详细选择器诊断', () => {
  test.beforeEach(async ({ page }) => {
    // 捕获控制台日志
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('深度诊断选择器问题', async ({ page }) => {
    console.log('=== 开始详细诊断 ===');
    
    // 1. 检查页面基本状态
    const title = await page.locator('h1').textContent();
    console.log('页面标题:', title);
    
    // 2. 查找选择器元素
    const selector = page.locator('.ant-select').first();
    const isVisible = await selector.isVisible();
    console.log('选择器是否可见:', isVisible);
    
    // 3. 检查选择器的详细属性
    const selectorInfo = await selector.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        pointerEvents: styles.pointerEvents,
        zIndex: styles.zIndex,
        position: styles.position,
        className: el.className,
        innerHTML: el.innerHTML
      };
    });
    console.log('选择器详细信息:', JSON.stringify(selectorInfo, null, 2));
    
    // 4. 检查是否能够点击
    try {
      await selector.click({ timeout: 5000 });
      console.log('✅ 选择器点击成功');
    } catch (error) {
      console.log('❌ 选择器点击失败:', error.message);
    }
    
    // 5. 等待并检查下拉框
    await page.waitForTimeout(2000);
    
    const dropdown = page.locator('.ant-select-dropdown');
    const dropdownExists = await dropdown.count() > 0;
    console.log('下拉框是否存在:', dropdownExists);
    
    if (dropdownExists) {
      const dropdownVisible = await dropdown.isVisible();
      console.log('下拉框是否可见:', dropdownVisible);
      
      const dropdownInfo = await dropdown.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          position: styles.position,
          top: styles.top,
          left: styles.left,
          width: styles.width,
          height: styles.height
        };
      });
      console.log('下拉框详细信息:', JSON.stringify(dropdownInfo, null, 2));
      
      // 检查选项
      const options = await page.locator('.ant-select-item').count();
      console.log('下拉框选项数量:', options);
      
      if (options > 0) {
        const optionTexts = await page.locator('.ant-select-item').allTextContents();
        console.log('选项内容:', optionTexts);
      }
    }
    
    // 6. 检查是否有其他元素遮挡
    const overlappingElements = await page.evaluate(() => {
      const selector = document.querySelector('.ant-select');
      if (!selector) return [];
      
      const rect = selector.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const elementsAtPoint = document.elementsFromPoint(centerX, centerY);
      return elementsAtPoint.map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id
      }));
    });
    console.log('选择器位置的元素层级:', overlappingElements);
    
    // 7. 尝试手动触发事件
    try {
      await page.evaluate(() => {
        const selector = document.querySelector('.ant-select-selector');
        if (selector) {
          const event = new MouseEvent('click', { bubbles: true });
          selector.dispatchEvent(event);
          console.log('手动触发点击事件');
        }
      });
      
      await page.waitForTimeout(1000);
      
      const dropdownAfterManual = page.locator('.ant-select-dropdown');
      const visibleAfterManual = await dropdownAfterManual.isVisible();
      console.log('手动触发后下拉框是否可见:', visibleAfterManual);
      
    } catch (error) {
      console.log('手动触发事件失败:', error.message);
    }
    
    console.log('=== 诊断完成 ===');
  });

  test('尝试修复选择器', async ({ page }) => {
    console.log('=== 开始修复尝试 ===');
    
    // 注入修复CSS
    await page.addStyleTag({
      content: `
        .ant-select-dropdown {
          z-index: 999999 !important;
          position: fixed !important;
          visibility: visible !important;
          display: block !important;
          opacity: 1 !important;
        }
        
        .ant-select-selector {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        
        .ant-select {
          pointer-events: auto !important;
        }
      `
    });
    
    console.log('✅ 修复CSS已注入');
    
    // 重新测试选择器
    const selector = page.locator('.ant-select').first();
    await selector.click();
    
    await page.waitForTimeout(1000);
    
    const dropdown = page.locator('.ant-select-dropdown');
    const isVisible = await dropdown.isVisible();
    console.log('修复后下拉框是否可见:', isVisible);
    
    if (isVisible) {
      console.log('🎉 修复成功！尝试选择一个选项...');
      
      const firstOption = page.locator('.ant-select-item').first();
      await firstOption.click();
      
      const selectedValue = await page.locator('.ant-select-selection-item').getAttribute('title');
      console.log('选择的值:', selectedValue);
    } else {
      console.log('❌ 修复失败，需要进一步诊断');
    }
    
    console.log('=== 修复尝试完成 ===');
  });
}); 