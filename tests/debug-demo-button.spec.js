const { test, expect } = require('@playwright/test');

test('查找演示下载按钮', async ({ page }) => {
  console.log('开始查找演示下载按钮...');
  
  // 访问页面
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  console.log('1. 页面加载完成');
  
  // 截图
  await page.screenshot({ 
    path: 'tests/screenshots/search-demo-button.png', 
    fullPage: true 
  });
  
  // 尝试不同的搜索策略
  const searchStrategies = [
    'text=下载演示版学习材料',
    'text=演示下载功能', 
    'text=立即体验下载功能',
    'text*=演示',
    'text*=下载',
    '[type="primary"]',
    '.ant-btn-primary'
  ];
  
  for (const strategy of searchStrategies) {
    const element = page.locator(strategy);
    const count = await element.count();
    console.log(`2. 策略 "${strategy}": ${count} 个元素`);
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await element.nth(i).textContent();
        const isVisible = await element.nth(i).isVisible();
        console.log(`   元素${i + 1}: "${text}", 可见: ${isVisible}`);
      }
    }
  }
  
  // 查看所有按钮
  const allButtons = page.locator('button');
  const buttonCount = await allButtons.count();
  console.log(`3. 页面总按钮数量: ${buttonCount}`);
  
  for (let i = 0; i < Math.min(buttonCount, 10); i++) {
    const text = await allButtons.nth(i).textContent();
    const isVisible = await allButtons.nth(i).isVisible();
    console.log(`   按钮${i + 1}: "${text}", 可见: ${isVisible}`);
  }
  
  // 查看页面文本内容
  const bodyText = await page.textContent('body');
  const hasDemo = bodyText.includes('演示');
  const hasDownload = bodyText.includes('下载');
  console.log(`4. 页面包含"演示": ${hasDemo}`);
  console.log(`5. 页面包含"下载": ${hasDownload}`);
  
  if (hasDemo) {
    console.log('   页面中"演示"相关文本片段:');
    const lines = bodyText.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('演示')) {
        console.log(`     行${index}: ${line.trim()}`);
      }
    });
  }
  
  console.log('查找完成');
}); 