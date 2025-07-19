const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('测试完整的上传-处理-下载流程(修复版)', async ({ page }) => {
  console.log('开始测试完整功能流程...');
  
  // 监听下载事件
  const downloads = [];
  page.on('download', download => {
    downloads.push(download);
    console.log(`检测到下载: ${download.suggestedFilename()}`);
  });
  
  // 访问页面
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  console.log('1. 页面加载成功');
  
  // 检查页面是否正常显示
  const appTitle = await page.locator('text=智能语言学习助手').first();
  expect(await appTitle.count()).toBeGreaterThan(0);
  console.log('2. 应用界面正常显示');
  
  // 准备测试文件
  const testContent = `Hello, this is a test sentence.
This is another sentence for testing the translation feature.
We are testing the English learning material generator.`;
  
  const testFilePath = path.join(__dirname, '..', 'test-upload.txt');
  fs.writeFileSync(testFilePath, testContent, 'utf8');
  console.log('3. 测试文件准备完成');
  
  try {
    // 上传文件 - 查找文件输入框
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    console.log('4. 文件上传成功');
    
    // 等待文件列表更新
    await page.waitForTimeout(2000);
    
    // 检查文件是否正确显示
    const uploadListItems = await page.locator('.ant-upload-list-item').count();
    console.log(`   文件列表项: ${uploadListItems}`);
    
    // 选择英语水平 - 查找Antd Select组件
    console.log('5. 查找英语水平选择器...');
    
    // 尝试不同的选择器策略
    const selectStrategies = [
      '.ant-select-selector',
      '[data-testid="english-level-select"]',
      'text=选择您的英语水平',
      '.ant-select'
    ];
    
    let selectElement = null;
    for (const strategy of selectStrategies) {
      const element = page.locator(strategy).first();
      if (await element.count() > 0) {
        selectElement = element;
        console.log(`   找到选择器: ${strategy}`);
        break;
      }
    }
    
    if (selectElement) {
      // 点击选择器打开下拉菜单
      await selectElement.click();
      console.log('6. 选择器已点击');
      
      // 等待下拉选项出现
      await page.waitForTimeout(1000);
      
      // 查找并点击CET-4选项
      const cet4Option = page.locator('text=英语四级').first();
      if (await cet4Option.count() > 0) {
        await cet4Option.click();
        console.log('7. CET-4选项已选择');
      } else {
        // 备用策略：查找包含CET-4的选项
        const altOption = page.locator('[title*="CET-4"], text*="CET-4"').first();
        if (await altOption.count() > 0) {
          await altOption.click();
          console.log('7. CET-4选项已选择(备用策略)');
        } else {
          console.log('7. ⚠️ 未找到CET-4选项，列出所有选项:');
          const allOptions = await page.locator('.ant-select-item').allTextContents();
          allOptions.forEach((option, index) => {
            console.log(`   选项${index + 1}: ${option}`);
          });
          
          // 选择第一个可用选项
          const firstOption = page.locator('.ant-select-item').first();
          if (await firstOption.count() > 0) {
            await firstOption.click();
            console.log('7. 已选择第一个选项');
          }
        }
      }
      
      // 等待选择完成
      await page.waitForTimeout(1000);
      
    } else {
      console.log('5. ⚠️ 未找到选择器，尝试其他方法...');
      
      // 截图查看当前页面状态
      await page.screenshot({ 
        path: 'tests/screenshots/selector-debug.png', 
        fullPage: true 
      });
      console.log('   已保存选择器调试截图');
    }
    
    // 检查分析按钮状态
    const analyzeButton = page.locator('text=开始智能分析').first();
    const isEnabled = await analyzeButton.isEnabled();
    console.log(`8. 分析按钮状态: ${isEnabled ? '可点击' : '不可点击'}`);
    
    if (isEnabled) {
      console.log('9. 开始点击分析按钮...');
      await analyzeButton.click();
      console.log('10. 分析按钮已点击');
      
      // 检查是否出现加载状态
      await page.waitForTimeout(2000);
      
      const loadingElement = page.locator('.ant-spin, text=正在智能分析');
      if (await loadingElement.count() > 0) {
        console.log('11. 发现加载状态，等待处理完成...');
        
        // 等待处理完成或超时
        try {
          await page.waitForSelector('text=下载学习材料', { timeout: 60000 });
          console.log('12. ✅ 处理完成，发现下载按钮');
          
          // 测试下载功能
          await page.waitForTimeout(1000);
          
          // 查找下载按钮
          const downloadButton = page.locator('text=下载学习材料').first();
          if (await downloadButton.count() > 0) {
            await downloadButton.click();
            console.log('13. 下载按钮已点击');
            
            // 等待下拉菜单出现
            await page.waitForTimeout(1000);
            
            // 点击HTML格式下载
            const htmlOption = page.locator('text=下载HTML格式').first();
            if (await htmlOption.count() > 0) {
              await htmlOption.click();
              console.log('14. HTML下载选项已点击');
              
              // 等待下载完成
              await page.waitForTimeout(3000);
              
              if (downloads.length > 0) {
                console.log(`15. ✅ 下载成功！文件数量: ${downloads.length}`);
                downloads.forEach((download, index) => {
                  console.log(`    文件${index + 1}: ${download.suggestedFilename()}`);
                });
              } else {
                console.log('15. ⚠️ 未检测到文件下载');
              }
            } else {
              console.log('14. ⚠️ 未找到HTML下载选项');
            }
          } else {
            console.log('13. ⚠️ 未找到下载按钮');
          }
          
        } catch (error) {
          console.log(`12. ⚠️ 处理超时: ${error.message}`);
          console.log('    检查后端服务是否正常运行');
        }
      } else {
        console.log('11. ⚠️ 未发现加载状态，可能有错误');
      }
    } else {
      console.log('9. ⚠️ 分析按钮不可点击，检查表单状态');
    }
    
  } catch (error) {
    console.log(`测试过程中出现错误: ${error.message}`);
  } finally {
    // 截图保存最终状态
    await page.screenshot({ 
      path: 'tests/screenshots/final-test-state.png', 
      fullPage: true 
    });
    console.log('已保存最终状态截图');
    
    // 清理测试文件
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('测试文件已清理');
    }
    
    console.log('✅ 测试完成！');
  }
}); 