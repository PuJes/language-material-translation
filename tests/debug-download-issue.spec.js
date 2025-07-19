const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('诊断下载按钮问题', async ({ page }) => {
  console.log('开始诊断下载按钮问题...');
  
  // 监听所有网络请求
  const requests = [];
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType()
    });
  });
  
  // 监听响应
  const responses = [];
  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText()
    });
  });
  
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
    console.log(`浏览器控制台 [${msg.type()}]: ${msg.text()}`);
  });
  
  // 监听页面错误
  page.on('pageerror', error => {
    console.log(`❌ 页面错误: ${error.message}`);
  });
  
  // 访问页面
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  console.log('1. 页面加载完成');
  
  // 检查下载按钮是否存在
  const downloadButton = page.locator('text=下载学习材料').first();
  const downloadButtonExists = await downloadButton.count() > 0;
  console.log(`2. 下载按钮存在: ${downloadButtonExists}`);
  
  if (!downloadButtonExists) {
    console.log('   需要先进行分析才能显示下载按钮');
    
    // 模拟完整流程
    console.log('3. 开始模拟完整分析流程...');
    
    // 准备测试文件
    const testContent = `Hello world. This is a test.
This is another sentence for testing the translation feature.
We want to test the download functionality.`;
    
    const testFilePath = path.join(__dirname, '..', 'test-download.txt');
    fs.writeFileSync(testFilePath, testContent, 'utf8');
    console.log('   测试文件已准备');
    
    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    console.log('   文件已上传');
    
    // 选择英语水平（使用原生选择器确保可靠性）
    const nativeSelector = page.locator('select').first();
    await nativeSelector.selectOption('CET-4');
    console.log('   英语水平已选择: CET-4');
    
    // 等待状态更新
    await page.waitForTimeout(1000);
    
    // 检查分析按钮状态
    const analyzeButton = page.locator('text=开始智能分析').first();
    const isEnabled = await analyzeButton.isEnabled();
    console.log(`   分析按钮可点击: ${isEnabled}`);
    
    if (isEnabled) {
      console.log('4. 点击分析按钮...');
      await analyzeButton.click();
      
      // 等待分析开始
      await page.waitForTimeout(2000);
      
      // 检查是否出现加载状态
      const loadingSpinner = page.locator('.ant-spin').first();
      const isLoading = await loadingSpinner.count() > 0;
      console.log(`   加载状态显示: ${isLoading}`);
      
      if (isLoading) {
        console.log('5. 等待分析完成...');
        
        // 等待分析完成（较长超时时间）
        try {
          await page.waitForSelector('text=下载学习材料', { timeout: 120000 });
          console.log('   ✅ 分析完成，下载按钮已出现');
        } catch (error) {
          console.log(`   ❌ 分析超时: ${error.message}`);
          
          // 检查后端服务状态
          const backendRequests = requests.filter(req => req.url.includes('localhost:3001'));
          console.log(`   后端请求数量: ${backendRequests.length}`);
          
          if (backendRequests.length === 0) {
            console.log('   ❌ 没有发送后端请求，可能前端逻辑有问题');
          } else {
            console.log('   后端请求列表:');
            backendRequests.forEach(req => {
              console.log(`     ${req.method} ${req.url}`);
            });
            
            const backendResponses = responses.filter(res => res.url.includes('localhost:3001'));
            console.log(`   后端响应数量: ${backendResponses.length}`);
            backendResponses.forEach(res => {
              console.log(`     ${res.status} ${res.statusText} - ${res.url}`);
            });
          }
          
          // 截图当前状态
          await page.screenshot({ 
            path: 'tests/screenshots/analysis-timeout.png', 
            fullPage: true 
          });
          
          // 清理并退出
          if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
          }
          return;
        }
      } else {
        console.log('   ❌ 没有显示加载状态，可能有问题');
      }
    } else {
      console.log('   ❌ 分析按钮不可点击，检查表单状态');
    }
    
    // 清理测试文件
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
  
  // 现在测试下载功能
  console.log('6. 测试下载功能...');
  
  const finalDownloadButton = page.locator('text=下载学习材料').first();
  const finalDownloadButtonExists = await finalDownloadButton.count() > 0;
  
  if (finalDownloadButtonExists) {
    console.log('   下载按钮已找到，尝试点击...');
    
    // 截图点击前状态
    await page.screenshot({ 
      path: 'tests/screenshots/before-download-click.png', 
      fullPage: true 
    });
    
    // 点击下载按钮
    await finalDownloadButton.click();
    console.log('   下载按钮已点击');
    
    // 等待下拉菜单出现
    await page.waitForTimeout(1000);
    
    // 截图点击后状态
    await page.screenshot({ 
      path: 'tests/screenshots/after-download-click.png', 
      fullPage: true 
    });
    
    // 查找下载选项
    const htmlOption = page.locator('text=下载HTML格式').first();
    const txtOption = page.locator('text=下载文本格式').first();
    
    const htmlOptionExists = await htmlOption.count() > 0;
    const txtOptionExists = await txtOption.count() > 0;
    
    console.log(`   HTML下载选项存在: ${htmlOptionExists}`);
    console.log(`   TXT下载选项存在: ${txtOptionExists}`);
    
    if (htmlOptionExists) {
      console.log('7. 点击HTML下载选项...');
      await htmlOption.click();
      
      // 等待下载开始
      await page.waitForTimeout(3000);
      
      if (downloads.length > 0) {
        console.log(`   ✅ 下载成功！文件数量: ${downloads.length}`);
        downloads.forEach((download, index) => {
          console.log(`     文件${index + 1}: ${download.filename}`);
        });
      } else {
        console.log('   ❌ 没有检测到下载文件');
        
        // 检查浏览器下载设置
        console.log('   可能的原因:');
        console.log('   1. 浏览器阻止了下载');
        console.log('   2. handleDownload函数有错误');
        console.log('   3. result数据为空');
        
        // 检查result状态
        const resultExists = await page.evaluate(() => {
          return window.result ? '有数据' : '无数据';
        });
        console.log(`   result状态: ${resultExists}`);
      }
    } else {
      console.log('   ❌ 没有找到HTML下载选项');
    }
  } else {
    console.log('   ❌ 下载按钮不存在，需要先完成分析');
  }
  
  // 最终截图
  await page.screenshot({ 
    path: 'tests/screenshots/download-test-final.png', 
    fullPage: true 
  });
  
  console.log('下载问题诊断完成');
}); 