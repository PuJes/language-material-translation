import { test, expect } from '@playwright/test';

test.describe('实时网页测试', () => {
  test('打开真实网页进行调试', async ({ page }) => {
    console.log('🌐 正在打开 http://localhost:5173...');
    
    // 设置超时时间
    test.setTimeout(60000);
    
    try {
      // 1. 访问页面
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      console.log('✅ 页面加载成功');
      
      // 2. 截图页面初始状态
      await page.screenshot({ 
        path: 'tests/screenshots/current-page.png', 
        fullPage: true 
      });
      console.log('📸 已截图当前页面状态');
      
      // 3. 查找页面标题
      const title = await page.locator('h1').textContent();
      console.log('页面标题:', title);
      
      // 4. 等待页面完全加载
      await page.waitForTimeout(2000);
      
      // 5. 查找选择器
      const selectorExists = await page.locator('.ant-select').count();
      console.log('选择器数量:', selectorExists);
      
      if (selectorExists > 0) {
        // 6. 检查选择器状态
        const selector = page.locator('.ant-select').first();
        const isVisible = await selector.isVisible();
        const isEnabled = await selector.isEnabled();
        console.log('选择器可见:', isVisible);
        console.log('选择器可用:', isEnabled);
        
        // 7. 获取选择器HTML内容
        const selectorHTML = await selector.innerHTML();
        console.log('选择器HTML内容:', selectorHTML.substring(0, 200) + '...');
        
        // 8. 尝试点击选择器
        console.log('🖱️ 尝试点击选择器...');
        await selector.click();
        
        // 9. 等待下拉框
        await page.waitForTimeout(2000);
        
        // 10. 截图点击后状态
        await page.screenshot({ 
          path: 'tests/screenshots/after-click.png', 
          fullPage: true 
        });
        console.log('📸 已截图点击后状态');
        
        // 11. 检查下拉框
        const dropdown = page.locator('.ant-select-dropdown');
        const dropdownExists = await dropdown.count();
        const dropdownVisible = dropdownExists > 0 ? await dropdown.isVisible() : false;
        
        console.log('下拉框数量:', dropdownExists);
        console.log('下拉框可见:', dropdownVisible);
        
        if (dropdownExists > 0) {
          // 12. 检查下拉框位置
          const position = await dropdown.boundingBox();
          console.log('下拉框位置:', position);
          
          // 13. 检查选项
          const options = await page.locator('.ant-select-item').count();
          console.log('选项数量:', options);
          
          if (options > 0) {
            const optionTexts = await page.locator('.ant-select-item').allTextContents();
            console.log('选项内容:', optionTexts);
            
            // 14. 尝试选择第一个选项
            console.log('🎯 尝试选择第一个选项...');
            await page.locator('.ant-select-item').first().click();
            
            // 15. 检查选择结果
            await page.waitForTimeout(1000);
            const selectedValue = await page.locator('.ant-select-selection-item').getAttribute('title');
            console.log('选择的值:', selectedValue);
            
            // 16. 最终截图
            await page.screenshot({ 
              path: 'tests/screenshots/final-state.png', 
              fullPage: true 
            });
            console.log('📸 已截图最终状态');
            
          } else {
            console.log('❌ 下拉框存在但没有选项');
          }
        } else {
          console.log('❌ 下拉框不存在');
          
          // 检查控制台错误
          const errors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });
          console.log('控制台错误:', errors);
        }
        
      } else {
        console.log('❌ 未找到选择器元素');
        
        // 查看页面实际内容
        const bodyHTML = await page.locator('body').innerHTML();
        console.log('页面body内容（前500字符）:', bodyHTML.substring(0, 500));
      }
      
    } catch (error) {
      console.log('❌ 测试出错:', error.message);
      
      // 错误时也截图
      await page.screenshot({ 
        path: 'tests/screenshots/error-state.png', 
        fullPage: true 
      });
    }
    
    console.log('🏁 测试完成，请查看截图文件');
    
    // 暂停5秒让您观察
    await page.waitForTimeout(5000);
  });
}); 