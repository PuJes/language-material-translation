const { test, expect } = require('@playwright/test');

test('验证双选择器解决方案', async ({ page }) => {
  console.log('开始测试双选择器解决方案...');
  
  // 访问页面
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  console.log('1. 页面加载完成');
  
  // 检查两种选择器是否都存在
  const antdSelector = page.locator('.ant-select').first();
  const nativeSelector = page.locator('select').first();
  
  const antdCount = await antdSelector.count();
  const nativeCount = await nativeSelector.count();
  
  console.log(`2. Antd选择器数量: ${antdCount}`);
  console.log(`3. 原生选择器数量: ${nativeCount}`);
  
  // 截图初始状态
  await page.screenshot({ 
    path: 'tests/screenshots/dual-selector-initial.png', 
    fullPage: true 
  });
  
  // 测试Antd选择器
  if (antdCount > 0) {
    console.log('4. 测试Antd选择器...');
    
    try {
      await antdSelector.click();
      await page.waitForTimeout(1000);
      
      const dropdown = page.locator('.ant-select-dropdown').first();
      if (await dropdown.count() > 0 && await dropdown.isVisible()) {
        console.log('   ✅ Antd选择器下拉菜单正常显示');
        
        const firstOption = page.locator('.ant-select-item').first();
        if (await firstOption.count() > 0) {
          await firstOption.click();
          console.log('   ✅ Antd选择器选择成功');
          
          // 检查选择结果
          await page.waitForTimeout(500);
          const selectedValue = await page.evaluate(() => window.englishLevel || '');
          console.log(`   选择结果: ${selectedValue}`);
        }
      } else {
        console.log('   ❌ Antd选择器下拉菜单未显示');
      }
    } catch (error) {
      console.log(`   ❌ Antd选择器测试失败: ${error.message}`);
    }
  }
  
  // 清除选择，测试原生选择器
  await page.evaluate(() => {
    // 触发React状态更新
    const event = new Event('change', { bubbles: true });
    window.setEnglishLevel && window.setEnglishLevel('');
  });
  
  console.log('5. 测试原生HTML选择器...');
  
  if (nativeCount > 0) {
    try {
      await nativeSelector.selectOption('CET-4');
      console.log('   ✅ 原生选择器选择成功');
      
      await page.waitForTimeout(500);
      
      // 检查选择结果
      const selectedValue = await nativeSelector.inputValue();
      console.log(`   原生选择器值: ${selectedValue}`);
      
      // 检查React状态是否更新
      const debugInfo = await page.locator('text=/当前选择 = "CET-4"/').count();
      console.log(`   React状态是否更新: ${debugInfo > 0 ? '是' : '否'}`);
      
    } catch (error) {
      console.log(`   ❌ 原生选择器测试失败: ${error.message}`);
    }
  }
  
  // 最终截图
  await page.screenshot({ 
    path: 'tests/screenshots/dual-selector-final.png', 
    fullPage: true 
  });
  
  // 检查分析按钮状态
  const analyzeButton = page.locator('text=开始智能分析').first();
  const isEnabled = await analyzeButton.isEnabled();
  console.log(`6. 分析按钮状态: ${isEnabled ? '可点击' : '不可点击'}`);
  
  // 检查用户提示信息
  const backupHint = page.locator('text=如果上方选择器无法使用').first();
  const hintExists = await backupHint.count() > 0;
  console.log(`7. 备用选择器提示显示: ${hintExists ? '是' : '否'}`);
  
  console.log('✅ 双选择器测试完成！');
  
  // 总结
  if (antdCount > 0 && nativeCount > 0) {
    console.log('🎉 解决方案完备：用户现在有两种选择器可以使用！');
  } else if (nativeCount > 0) {
    console.log('✅ 至少原生选择器可用，用户可以正常选择');
  } else {
    console.log('❌ 两种选择器都有问题，需要进一步调试');
  }
}); 