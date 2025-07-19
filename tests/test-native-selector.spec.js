import { test, expect } from '@playwright/test';

test.describe('原生HTML选择器测试', () => {
  test('测试原生HTML选择器功能', async ({ page }) => {
    console.log('🌐 测试简化版本的原生HTML选择器...');
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    console.log('✅ 页面加载成功');
    
    // 检查页面标题
    const title = await page.locator('h1').textContent();
    console.log('页面标题:', title);
    
    // 查找原生HTML选择器
    const nativeSelect = page.locator('select');
    const selectExists = await nativeSelect.count();
    console.log('原生选择器数量:', selectExists);
    
    if (selectExists > 0) {
      // 检查选择器状态
      const isVisible = await nativeSelect.isVisible();
      const isEnabled = await nativeSelect.isEnabled();
      console.log('选择器可见:', isVisible);
      console.log('选择器可用:', isEnabled);
      
      // 截图初始状态
      await page.screenshot({ 
        path: 'tests/screenshots/native-selector-initial.png', 
        fullPage: true 
      });
      console.log('📸 已截图初始状态');
      
      // 检查选项
      const options = await nativeSelect.locator('option').count();
      console.log('选项数量:', options);
      
      const optionTexts = await nativeSelect.locator('option').allTextContents();
      console.log('选项内容:', optionTexts);
      
      // 尝试选择第一个有效选项（跳过空选项）
      console.log('🎯 尝试选择 CET-4...');
      await nativeSelect.selectOption('CET-4');
      
      // 等待一下
      await page.waitForTimeout(1000);
      
      // 检查选择结果
      const selectedValue = await nativeSelect.inputValue();
      console.log('选择的值:', selectedValue);
      
      // 检查调试信息是否更新
      const debugText = await page.locator('text=当前选择').textContent();
      console.log('调试信息:', debugText);
      
      // 截图选择后状态
      await page.screenshot({ 
        path: 'tests/screenshots/native-selector-selected.png', 
        fullPage: true 
      });
      console.log('📸 已截图选择后状态');
      
      // 测试按钮状态
      const processButton = page.locator('button', { hasText: '开始智能分析' });
      const isButtonEnabled = await processButton.isEnabled();
      console.log('分析按钮是否可用:', isButtonEnabled);
      
      if (selectedValue === 'CET-4') {
        console.log('🎉 原生HTML选择器工作正常！');
      } else {
        console.log('❌ 选择器值不正确');
      }
      
    } else {
      console.log('❌ 未找到原生HTML选择器');
      
      // 查看页面内容
      const content = await page.content();
      console.log('页面HTML（查找select标签）:', content.includes('<select') ? '找到select标签' : '未找到select标签');
    }
    
    console.log('🏁 原生选择器测试完成');
  });
}); 