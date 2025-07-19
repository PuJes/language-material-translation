const { test, expect } = require('@playwright/test');

test('测试演示下载功能', async ({ page }) => {
  console.log('开始测试演示下载功能...');
  
  // 监听下载事件
  const downloads = [];
  page.on('download', download => {
    downloads.push({
      filename: download.suggestedFilename(),
      url: download.url()
    });
    console.log(`📥 检测到下载: ${download.suggestedFilename()}`);
  });
  
  // 监听控制台消息
  page.on('console', msg => {
    if (msg.text().includes('演示下载')) {
      console.log(`浏览器控制台: ${msg.text()}`);
    }
  });
  
  // 访问页面
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  console.log('1. 页面加载完成');
  
  // 查找演示下载按钮
  const demoButton = page.locator('text=下载演示版学习材料').last(); // 使用last()获取按钮而不是文字
  const demoButtonExists = await demoButton.count() > 0;
  console.log(`2. 演示下载按钮存在: ${demoButtonExists}`);
  
  if (demoButtonExists) {
    // 截图点击前状态
    await page.screenshot({ 
      path: 'tests/screenshots/before-demo-download.png', 
      fullPage: true 
    });
    
    console.log('3. 点击演示下载按钮...');
    await demoButton.click();
    
    // 等待下载完成
    await page.waitForTimeout(3000);
    
    // 截图点击后状态
    await page.screenshot({ 
      path: 'tests/screenshots/after-demo-download.png', 
      fullPage: true 
    });
    
    // 检查下载结果
    if (downloads.length > 0) {
      console.log(`4. ✅ 演示下载成功！文件数量: ${downloads.length}`);
      downloads.forEach((download, index) => {
        console.log(`   文件${index + 1}: ${download.filename}`);
        
        // 检查文件名格式
        if (download.filename.includes('英语学习材料-演示版')) {
          console.log(`   ✅ 文件名格式正确`);
        }
        
        if (download.filename.endsWith('.html')) {
          console.log(`   ✅ 文件格式为HTML`);
        }
      });
      
      // 检查成功消息
      const successMessage = page.locator('text*=演示版HTML学习材料下载成功').first();
      const messageExists = await successMessage.count() > 0;
      console.log(`5. 成功消息显示: ${messageExists}`);
      
    } else {
      console.log('4. ❌ 没有检测到下载文件');
      
      // 检查可能的错误消息
      const errorMessage = page.locator('.ant-message-error').first();
      const hasError = await errorMessage.count() > 0;
      console.log(`   错误消息存在: ${hasError}`);
      
      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.log(`   错误内容: ${errorText}`);
      }
    }
  } else {
    console.log('2. ❌ 演示下载按钮不存在');
    
    // 检查页面是否有其他问题
    const pageTitle = await page.title();
    console.log(`   页面标题: ${pageTitle}`);
    
    const hasContent = await page.locator('text=智能语言学习助手').count() > 0;
    console.log(`   主要内容存在: ${hasContent}`);
  }
  
  console.log('演示下载测试完成');
}); 