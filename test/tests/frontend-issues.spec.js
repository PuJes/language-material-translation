const { test, expect } = require('@playwright/test');

test.describe('前端功能和显示问题测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('文件上传组件交互测试', async ({ page }) => {
    // 测试文件上传区域可见性和交互
    const uploadZone = await page.locator('.ant-upload-drag');
    await expect(uploadZone).toBeVisible();
    
    // 测试文件类型提示
    const fileTypeHint = await page.locator('text=支持 .txt 和 .srt 格式');
    await expect(fileTypeHint).toBeVisible();
    
    // 测试拖拽提示
    await uploadZone.hover();
    const dragHint = await page.locator('text=点击或拖拽文件到此处');
    await expect(dragHint).toBeVisible();
  });

  test('英语水平选择组件测试', async ({ page }) => {
    // 测试选择框可见性
    const levelSelect = await page.locator('.ant-select');
    await expect(levelSelect).toBeVisible();
    
    // 测试选项列表
    await levelSelect.click();
    const options = await page.locator('.ant-select-item-option');
    await expect(options).toHaveCount(4); // CET-4, CET-6, IELTS, TOEFL
    
    // 测试选择交互
    await page.locator('text=CET-4').click();
    await expect(levelSelect).toContainText('CET-4');
  });

  test('处理进度显示测试', async ({ page }) => {
    // 上传示例文件
    await page.setInputFiles('input[type="file"]', 'test-files/sample-language-material.txt');
    
    // 选择英语水平
    await page.locator('.ant-select').click();
    await page.locator('text=CET-4').click();
    
    // 点击处理按钮
    await page.locator('button:has-text("开始智能分析")').click();
    
    // 测试进度条显示
    const progressBar = await page.locator('.ant-progress');
    await expect(progressBar).toBeVisible();
    
    // 测试进度文本更新
    const progressText = await page.locator('.processing-stage');
    await expect(progressText).toBeVisible();
    
    // 等待处理完成
    await expect(async () => {
      const progress = await page.locator('.ant-progress-text');
      expect(await progress.textContent()).toBe('100%');
    }).toPass({ timeout: 30000 });
  });

  test('结果显示测试', async ({ page }) => {
    // 上传并处理文件
    await page.setInputFiles('input[type="file"]', 'test-files/sample-language-material.txt');
    await page.locator('.ant-select').click();
    await page.locator('text=CET-4').click();
    await page.locator('button:has-text("开始智能分析")').click();
    
    // 等待结果显示
    await page.waitForSelector('.result-container', { state: 'visible', timeout: 30000 });
    
    // 测试段落显示
    const paragraphs = await page.locator('.paragraph-section');
    await expect(paragraphs).toBeVisible();
    
    // 测试句子交互
    const firstSentence = await paragraphs.first().locator('.sentence');
    await firstSentence.click();
    const explanation = await page.locator('.sentence-explanation');
    await expect(explanation).toBeVisible();
    
    // 测试词汇列表
    const vocabularyList = await page.locator('.vocabulary-list');
    await expect(vocabularyList).toBeVisible();
    
    // 测试词汇交互
    const firstWord = await vocabularyList.locator('.vocabulary-item').first();
    await firstWord.click();
    const wordDetails = await page.locator('.word-details');
    await expect(wordDetails).toBeVisible();
  });

  test('响应式布局测试', async ({ page }) => {
    // 测试不同屏幕尺寸
    const sizes = [
      { width: 1920, height: 1080 }, // 桌面
      { width: 1024, height: 768 },  // 平板
      { width: 375, height: 812 }    // 手机
    ];
    
    for (const size of sizes) {
      await page.setViewportSize(size);
      
      // 测试主要组件的可见性和布局
      const uploadZone = await page.locator('.ant-upload-drag');
      await expect(uploadZone).toBeVisible();
      
      const levelSelect = await page.locator('.ant-select');
      await expect(levelSelect).toBeVisible();
      
      // 检查布局适应性
      if (size.width <= 768) {
        // 检查移动端特定布局
        const mobileMenu = await page.locator('.mobile-menu');
        await expect(mobileMenu).toBeVisible();
      } else {
        // 检查桌面端布局
        const desktopNav = await page.locator('.desktop-nav');
        await expect(desktopNav).toBeVisible();
      }
    }
  });

  test('错误处理和提示测试', async ({ page }) => {
    // 测试无文件提交
    await page.locator('button:has-text("开始智能分析")').click();
    const errorMsg1 = await page.locator('.ant-message-error');
    await expect(errorMsg1).toContainText('请先上传文件');
    
    // 测试无英语水平选择
    await page.setInputFiles('input[type="file"]', 'test-files/sample-language-material.txt');
    await page.locator('button:has-text("开始智能分析")').click();
    const errorMsg2 = await page.locator('.ant-message-error');
    await expect(errorMsg2).toContainText('请选择英语水平');
    
    // 测试错误文件类型
    const wrongFile = await page.setInputFiles('input[type="file"]', 'test-files/wrong-type.pdf');
    const errorMsg3 = await page.locator('.ant-message-error');
    await expect(errorMsg3).toContainText('只支持 .txt 和 .srt 格式的文件');
  });

  test('WebSocket连接状态测试', async ({ page }) => {
    // 测试WebSocket连接状态显示
    const connectionStatus = await page.locator('.connection-status');
    await expect(connectionStatus).toHaveClass(/connected/);
    
    // 模拟连接断开
    await page.evaluate(() => {
      window.ws.close();
    });
    
    // 测试重连提示
    const reconnectMsg = await page.locator('.ant-message-warning');
    await expect(reconnectMsg).toContainText('正在尝试重新连接');
    
    // 等待自动重连
    await expect(async () => {
      const status = await connectionStatus.getAttribute('class');
      expect(status).toContain('connected');
    }).toPass({ timeout: 10000 });
  });

  test('长文本处理性能测试', async ({ page }) => {
    // 上传大文件
    await page.setInputFiles('input[type="file"]', 'test-files/large-text.txt');
    await page.locator('.ant-select').click();
    await page.locator('text=CET-4').click();
    
    // 开始处理前记录时间
    const startTime = Date.now();
    
    await page.locator('button:has-text("开始智能分析")').click();
    
    // 等待处理完成
    await page.waitForSelector('.result-container', { state: 'visible', timeout: 60000 });
    
    // 计算处理时间
    const processingTime = Date.now() - startTime;
    console.log(`大文件处理时间: ${processingTime}ms`);
    
    // 测试UI响应性
    const scrollContainer = await page.locator('.result-container');
    await scrollContainer.evaluate(element => {
      element.scrollTop = element.scrollHeight;
    });
    
    // 测试滚动性能
    const scrollStartTime = Date.now();
    await scrollContainer.evaluate(element => {
      element.scrollTop = 0;
    });
    const scrollTime = Date.now() - scrollStartTime;
    console.log(`滚动性能: ${scrollTime}ms`);
  });
}); 