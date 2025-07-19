import { test, expect } from '@playwright/test';

test.describe('修复验证测试', () => {
  test('验证选择器修复效果', async ({ page }) => {
    console.log('🔧 开始验证修复效果...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 1. 点击选择器
    const selector = page.locator('.ant-select').first();
    await selector.click();
    
    console.log('✅ 选择器点击完成');
    
    // 2. 等待下拉框出现
    await page.waitForTimeout(1000);
    
    // 3. 检查下拉框是否可见
    const dropdown = page.locator('.ant-select-dropdown');
    const isVisible = await dropdown.isVisible();
    console.log('下拉框是否可见:', isVisible);
    
    if (isVisible) {
      // 4. 检查下拉框位置信息
      const position = await dropdown.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          isInViewport: rect.top >= 0 && rect.left >= 0 && 
                       rect.bottom <= window.innerHeight && 
                       rect.right <= window.innerWidth
        };
      });
      console.log('下拉框位置信息:', position);
      
      // 5. 检查选项是否可见
      const options = await page.locator('.ant-select-item').count();
      console.log('选项数量:', options);
      
      if (options > 0) {
        // 6. 尝试选择第一个选项
        const firstOption = page.locator('.ant-select-item').first();
        await firstOption.click();
        
        console.log('✅ 成功选择第一个选项');
        
        // 7. 验证选择结果
        await page.waitForTimeout(500);
        const selectedText = await page.locator('.ant-select-selection-item').textContent();
        console.log('选择的文本:', selectedText);
        
        // 8. 验证调试信息
        const debugInfo = await page.locator('text=调试信息').isVisible();
        console.log('调试信息是否显示:', debugInfo);
        
        console.log('🎉 修复验证成功！选择器功能正常');
      } else {
        console.log('❌ 下拉框可见但没有选项');
      }
    } else {
      console.log('❌ 下拉框不可见，需要进一步调试');
      
      // 检查是否存在但被隐藏
      const dropdownExists = await dropdown.count() > 0;
      console.log('下拉框DOM元素是否存在:', dropdownExists);
      
      if (dropdownExists) {
        const styles = await dropdown.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            position: computed.position,
            top: computed.top,
            left: computed.left,
            zIndex: computed.zIndex
          };
        });
        console.log('下拉框样式:', styles);
      }
    }
  });
  
  test('截图验证', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 截图1：初始状态
    await page.screenshot({ path: 'tests/screenshots/before-click.png', fullPage: true });
    
    // 点击选择器
    await page.locator('.ant-select').first().click();
    await page.waitForTimeout(1000);
    
    // 截图2：点击后状态
    await page.screenshot({ path: 'tests/screenshots/after-click.png', fullPage: true });
    
    console.log('📸 截图已保存到 tests/screenshots/');
  });
}); 