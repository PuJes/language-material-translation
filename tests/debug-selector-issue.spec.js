const { test, expect } = require('@playwright/test');

test('诊断英语水平选择器显示问题', async ({ page }) => {
  console.log('开始诊断选择器问题...');
  
  // 访问页面
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  console.log('1. 页面已加载');
  
  // 截图初始状态
  await page.screenshot({ 
    path: 'tests/screenshots/selector-initial.png', 
    fullPage: true 
  });
  
  // 查找选择器相关元素
  console.log('2. 检查选择器元素...');
  
  const selectorElements = [
    { name: 'Select组件', selector: '.ant-select' },
    { name: 'Select选择器', selector: '.ant-select-selector' },
    { name: 'Select箭头', selector: '.ant-select-arrow' },
    { name: '选择器文本', selector: 'text=选择您的英语水平' },
    { name: '占位符文本', selector: 'text=请选择' }
  ];
  
  for (const element of selectorElements) {
    const count = await page.locator(element.selector).count();
    console.log(`   ${element.name}: ${count} 个`);
    
    if (count > 0) {
      const isVisible = await page.locator(element.selector).first().isVisible();
      console.log(`   ${element.name} 可见: ${isVisible}`);
    }
  }
  
  // 查找具体的选择器
  const selectElement = page.locator('.ant-select-selector').first();
  
  if (await selectElement.count() > 0) {
    console.log('3. 尝试点击选择器...');
    
    // 点击前的状态
    const beforeClick = await page.locator('.ant-select-dropdown').count();
    console.log(`   点击前下拉菜单数量: ${beforeClick}`);
    
    // 点击选择器
    await selectElement.click();
    console.log('   选择器已点击');
    
    // 等待下拉菜单出现
    await page.waitForTimeout(1000);
    
    // 点击后的状态
    const afterClick = await page.locator('.ant-select-dropdown').count();
    console.log(`   点击后下拉菜单数量: ${afterClick}`);
    
    // 截图点击后状态
    await page.screenshot({ 
      path: 'tests/screenshots/selector-clicked.png', 
      fullPage: true 
    });
    
    // 检查下拉菜单是否可见
    if (afterClick > 0) {
      const dropdown = page.locator('.ant-select-dropdown').first();
      const isVisible = await dropdown.isVisible();
      const boundingBox = await dropdown.boundingBox();
      
      console.log(`   下拉菜单可见: ${isVisible}`);
      if (boundingBox) {
        console.log(`   下拉菜单位置: x=${boundingBox.x}, y=${boundingBox.y}, width=${boundingBox.width}, height=${boundingBox.height}`);
      }
      
      // 检查选项
      const options = await page.locator('.ant-select-item').allTextContents();
      console.log(`   选项数量: ${options.length}`);
      options.forEach((option, index) => {
        console.log(`   选项${index + 1}: "${option}"`);
      });
      
      // 检查选项是否可见
      const firstOption = page.locator('.ant-select-item').first();
      if (await firstOption.count() > 0) {
        const optionVisible = await firstOption.isVisible();
        console.log(`   第一个选项可见: ${optionVisible}`);
        
        if (optionVisible) {
          console.log('4. 尝试点击第一个选项...');
          await firstOption.click();
          
          // 等待选择完成
          await page.waitForTimeout(1000);
          
          // 检查选择结果
          const selectedText = await selectElement.textContent();
          console.log(`   选择后的文本: "${selectedText}"`);
          
          // 最终截图
          await page.screenshot({ 
            path: 'tests/screenshots/selector-selected.png', 
            fullPage: true 
          });
        }
      }
    } else {
      console.log('   ❌ 下拉菜单没有出现');
    }
    
    // 检查CSS样式
    console.log('5. 检查CSS样式...');
    const selectStyles = await selectElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        zIndex: styles.zIndex,
        position: styles.position
      };
    });
    
    console.log('   选择器样式:', selectStyles);
    
    // 检查是否有样式冲突
    const hasAntdStyles = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      let antdFound = false;
      
      try {
        stylesheets.forEach(sheet => {
          try {
            if (sheet.href && sheet.href.includes('antd')) {
              antdFound = true;
            }
          } catch (e) {
            // 忽略跨域错误
          }
        });
      } catch (e) {
        console.log('检查样式表时出错:', e.message);
      }
      
      return antdFound;
    });
    
    console.log(`   发现Antd样式: ${hasAntdStyles}`);
    
  } else {
    console.log('3. ❌ 未找到选择器元素');
  }
  
  console.log('诊断完成');
}); 