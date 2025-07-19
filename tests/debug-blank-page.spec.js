const { test, expect } = require('@playwright/test');

test('调试前端空白页面问题', async ({ page }) => {
  console.log('开始测试前端页面...');
  
  // 监听页面控制台输出
  page.on('console', msg => {
    console.log(`浏览器控制台 [${msg.type()}]: ${msg.text()}`);
  });
  
  // 监听页面错误
  page.on('pageerror', error => {
    console.log(`页面错误: ${error.message}`);
  });
  
  // 监听网络请求失败
  page.on('requestfailed', request => {
    console.log(`请求失败: ${request.url()} - ${request.failure().errorText}`);
  });
  
  try {
    // 尝试访问前端页面（多个可能的端口）
    const ports = [5173, 5174, 5175];
    let success = false;
    let finalUrl = '';
    
    for (const port of ports) {
      const url = `http://localhost:${port}`;
      console.log(`尝试访问: ${url}`);
      
      try {
        const response = await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        if (response && response.status() === 200) {
          console.log(`成功访问端口 ${port}`);
          finalUrl = url;
          success = true;
          break;
        }
      } catch (error) {
        console.log(`端口 ${port} 访问失败: ${error.message}`);
      }
    }
    
    if (!success) {
      console.log('所有端口都无法访问，前端服务可能未启动');
      return;
    }
    
    console.log(`当前页面URL: ${finalUrl}`);
    
    // 等待页面加载
    await page.waitForTimeout(3000);
    
    // 检查页面基本信息
    const title = await page.title();
    console.log(`页面标题: ${title}`);
    
    // 检查页面内容
    const bodyText = await page.textContent('body');
    console.log(`页面文本内容长度: ${bodyText ? bodyText.length : 0}`);
    
    if (bodyText && bodyText.length > 0) {
      console.log(`页面文本前100字符: ${bodyText.substring(0, 100)}`);
    }
    
    // 检查根元素
    const rootElement = await page.locator('#root');
    const rootExists = await rootElement.count();
    console.log(`#root 元素存在: ${rootExists > 0}`);
    
    if (rootExists > 0) {
      const rootContent = await rootElement.textContent();
      console.log(`#root 内容长度: ${rootContent ? rootContent.length : 0}`);
      
      if (rootContent && rootContent.length > 0) {
        console.log(`#root 内容前100字符: ${rootContent.substring(0, 100)}`);
      }
    }
    
    // 检查是否有React组件
    const reactElements = await page.locator('[data-reactroot], .app-background, .main-container').count();
    console.log(`React组件元素数量: ${reactElements}`);
    
    // 检查是否有CSS加载
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    console.log(`CSS样式表数量: ${stylesheets}`);
    
    // 检查是否有JavaScript错误
    const scripts = await page.locator('script').count();
    console.log(`JavaScript脚本数量: ${scripts}`);
    
    // 截图保存
    await page.screenshot({ 
      path: 'tests/screenshots/debug-blank-page.png', 
      fullPage: true 
    });
    console.log('已保存截图到 tests/screenshots/debug-blank-page.png');
    
    // 检查网络请求
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    // 刷新页面检查网络请求
    await page.reload({ waitUntil: 'networkidle' });
    
    console.log('网络请求列表:');
    networkRequests.forEach(req => {
      console.log(`  ${req.method} ${req.resourceType}: ${req.url}`);
    });
    
    // 检查具体的Antd组件
    const antdElements = await page.locator('.ant-layout, .ant-card, .ant-button').count();
    console.log(`Antd组件数量: ${antdElements}`);
    
    // 检查是否有错误信息
    const errorMessages = await page.locator('text=/error|Error|错误|失败/i').count();
    console.log(`页面错误信息数量: ${errorMessages}`);
    
  } catch (error) {
    console.log(`测试过程中出现错误: ${error.message}`);
    console.log(`错误堆栈: ${error.stack}`);
  }
}); 