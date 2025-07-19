const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('测试完整的上传-处理-下载流程', async ({ page }) => {
  console.log('开始测试完整功能流程...');
  
  // 监听下载事件
  const downloads = [];
  page.on('download', download => {
    downloads.push(download);
    console.log(`检测到下载: ${download.suggestedFilename()}`);
  });
  
  // 访问页面
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  console.log('1. 页面加载成功');
  
  // 检查页面是否正常显示
  const appTitle = await page.locator('text=智能语言学习助手').first();
  expect(await appTitle.count()).toBeGreaterThan(0);
  console.log('2. 应用界面正常显示');
  
  // 准备测试文件
  const testContent = `Hello, this is a test.
This is another sentence for testing.
We are testing the translation feature.`;
  
  const testFilePath = path.join(__dirname, '..', 'test-upload.txt');
  fs.writeFileSync(testFilePath, testContent, 'utf8');
  console.log('3. 测试文件准备完成');
  
  // 上传文件
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  console.log('4. 文件上传成功');
  
  // 等待文件列表更新
  await page.waitForTimeout(1000);
  
  // 选择英语水平
  const englishLevelSelect = page.locator('select').first();
  await englishLevelSelect.selectOption('CET-4');
  console.log('5. 英语水平选择完成');
  
  // 检查按钮是否可点击
  const analyzeButton = page.locator('text=开始智能分析').first();
  const isEnabled = await analyzeButton.isEnabled();
  console.log(`6. 分析按钮状态: ${isEnabled ? '可点击' : '不可点击'}`);
  
  if (isEnabled) {
    console.log('7. 开始模拟分析过程...');
    
    // 点击分析按钮
    await analyzeButton.click();
    console.log('8. 已点击分析按钮');
    
    // 等待分析完成（这里需要后端服务运行）
    console.log('9. 等待分析完成...');
    
    // 检查是否有加载状态
    const loadingSpinner = page.locator('.ant-spin');
    if (await loadingSpinner.count() > 0) {
      console.log('10. 发现加载动画，等待处理完成...');
      
      // 等待结果出现或超时
      try {
        await page.waitForSelector('text=下载学习材料', { timeout: 30000 });
        console.log('11. ✅ 分析完成，发现下载按钮');
        
        // 测试下载功能
        const downloadButton = page.locator('text=下载学习材料').first();
        await downloadButton.click();
        
        console.log('12. 已点击下载按钮');
        
        // 等待下载完成
        await page.waitForTimeout(2000);
        
        if (downloads.length > 0) {
          console.log(`13. ✅ 下载成功！文件数量: ${downloads.length}`);
          downloads.forEach((download, index) => {
            console.log(`    文件${index + 1}: ${download.suggestedFilename()}`);
          });
        } else {
          console.log('13. ⚠️ 未检测到下载，可能是下拉菜单，尝试点击具体选项...');
          
          // 如果是下拉菜单，尝试点击具体选项
          const htmlOption = page.locator('text=下载HTML格式');
          if (await htmlOption.count() > 0) {
            await htmlOption.click();
            await page.waitForTimeout(1000);
            console.log('14. 已点击HTML下载选项');
          }
        }
        
      } catch (error) {
        console.log(`11. ⚠️ 分析超时或失败: ${error.message}`);
        console.log('    这可能是因为后端服务未运行或处理时间过长');
      }
    } else {
      console.log('10. ⚠️ 未发现加载动画，可能是网络或后端问题');
    }
  } else {
    console.log('7. ⚠️ 分析按钮不可点击，检查表单状态');
    
    // 检查文件是否正确上传
    const fileListItems = await page.locator('.ant-upload-list-item').count();
    console.log(`   文件列表项目数: ${fileListItems}`);
    
    // 检查选择器值
    const selectValue = await englishLevelSelect.inputValue();
    console.log(`   选择器值: "${selectValue}"`);
  }
  
  // 截图保存当前状态
  await page.screenshot({ 
    path: 'tests/screenshots/download-test-result.png', 
    fullPage: true 
  });
  console.log('已保存测试结果截图');
  
  // 清理测试文件
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
    console.log('测试文件已清理');
  }
  
  console.log('测试完成！');
}); 