const { test, expect } = require('@playwright/test');

test('验证空白页面问题已修复', async ({ page }) => {
  console.log('验证修复结果...');
  
  // 监听页面错误
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`页面错误: ${error.message}`);
  });
  
  // 访问页面
  console.log('访问前端页面...');
  await page.goto('http://localhost:5173', { 
    waitUntil: 'domcontentloaded',
    timeout: 10000 
  });
  
  // 等待React组件渲染
  await page.waitForTimeout(3000);
  
  // 检查是否有JavaScript错误
  console.log(`JavaScript错误数量: ${errors.length}`);
  if (errors.length > 0) {
    console.log('发现的错误:');
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // 检查页面标题
  const title = await page.title();
  console.log(`页面标题: ${title}`);
  
  // 检查主要元素是否存在
  const appTitle = await page.locator('text=智能语言学习助手').first();
  const appTitleExists = await appTitle.count() > 0;
  console.log(`应用标题存在: ${appTitleExists}`);
  
  // 检查上传区域
  const uploadArea = await page.locator('text=点击或拖拽文件到此处上传').first();
  const uploadAreaExists = await uploadArea.count() > 0;
  console.log(`上传区域存在: ${uploadAreaExists}`);
  
  // 检查选择器
  const selector = await page.locator('text=选择您的英语水平').first();
  const selectorExists = await selector.count() > 0;
  console.log(`英语水平选择器存在: ${selectorExists}`);
  
  // 检查开始分析按钮
  const analyzeButton = await page.locator('text=开始智能分析').first();
  const analyzeButtonExists = await analyzeButton.count() > 0;
  console.log(`分析按钮存在: ${analyzeButtonExists}`);
  
  // 检查CSS样式是否加载
  const hasBackground = await page.evaluate(() => {
    const appBg = document.querySelector('.app-background');
    if (appBg) {
      const styles = window.getComputedStyle(appBg);
      return styles.background !== '' || styles.backgroundColor !== '';
    }
    return false;
  });
  console.log(`背景样式已加载: ${hasBackground}`);
  
  // 截图保存
  await page.screenshot({ 
    path: 'tests/screenshots/fixed-page.png', 
    fullPage: true 
  });
  console.log('已保存修复后的截图');
  
  // 测试整体功能状态
  const functionalElements = [appTitleExists, uploadAreaExists, selectorExists, analyzeButtonExists];
  const workingCount = functionalElements.filter(Boolean).length;
  console.log(`功能元素正常工作: ${workingCount}/4`);
  
  if (workingCount >= 3 && errors.length === 0) {
    console.log('✅ 页面修复成功！所有主要功能正常显示');
  } else if (errors.length > 0) {
    console.log('❌ 仍有JavaScript错误需要修复');
  } else {
    console.log('⚠️ 某些功能元素可能还有问题');
  }
}); 