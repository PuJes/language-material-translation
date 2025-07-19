import { test, expect } from '@playwright/test';

test.describe('英语水平选择器测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('/');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
  });

  test('检查页面基本元素是否存在', async ({ page }) => {
    // 检查标题
    await expect(page.locator('h1')).toContainText('智能语言学习助手');
    
    // 检查上传区域
    await expect(page.locator('.ant-upload-drag')).toBeVisible();
    
    // 检查选择器区域
    await expect(page.locator('text=选择您的英语水平')).toBeVisible();
  });

  test('检查英语水平选择器的可见性和交互', async ({ page }) => {
    // 查找选择器
    const selector = page.locator('.ant-select').first();
    await expect(selector).toBeVisible();
    
    // 点击选择器
    await selector.click();
    
    // 等待下拉框出现
    await page.waitForTimeout(1000);
    
    // 检查下拉选项是否出现
    const dropdown = page.locator('.ant-select-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    
    // 检查具体选项
    await expect(page.locator('text=英语四级 (CET-4)')).toBeVisible();
    await expect(page.locator('text=英语六级 (CET-6)')).toBeVisible(); 
    await expect(page.locator('text=雅思 (IELTS)')).toBeVisible();
    await expect(page.locator('text=托福 (TOEFL)')).toBeVisible();
  });

  test('测试选择器的选择功能', async ({ page }) => {
    // 点击选择器
    const selector = page.locator('.ant-select').first();
    await selector.click();
    
    // 等待下拉框出现
    await page.waitForTimeout(1000);
    
    // 选择CET-4选项
    await page.locator('text=英语四级 (CET-4)').click();
    
    // 验证选择结果
    await expect(selector).toContainText('英语四级 (CET-4)');
  });

  test('检查CSS样式是否影响下拉框显示', async ({ page }) => {
    // 检查选择器的CSS属性
    const selector = page.locator('.ant-select').first();
    
    // 检查z-index
    const zIndex = await selector.evaluate((el) => 
      window.getComputedStyle(el).zIndex
    );
    console.log('Selector z-index:', zIndex);
    
    // 点击选择器
    await selector.click();
    
    // 检查下拉框的CSS属性
    await page.waitForTimeout(1000);
    const dropdown = page.locator('.ant-select-dropdown');
    
    if (await dropdown.isVisible()) {
      const dropdownZIndex = await dropdown.evaluate((el) => 
        window.getComputedStyle(el).zIndex
      );
      console.log('Dropdown z-index:', dropdownZIndex);
      
      const visibility = await dropdown.evaluate((el) => 
        window.getComputedStyle(el).visibility
      );
      console.log('Dropdown visibility:', visibility);
      
      const display = await dropdown.evaluate((el) => 
        window.getComputedStyle(el).display
      );
      console.log('Dropdown display:', display);
    } else {
      console.log('下拉框未显示');
      
      // 检查是否有任何错误
      const errors = await page.evaluate(() => {
        return window.console.errors || [];
      });
      console.log('页面错误:', errors);
    }
  });

  test('测试完整的上传流程', async ({ page }) => {
    // 选择英语水平
    const selector = page.locator('.ant-select').first();
    await selector.click();
    await page.waitForTimeout(1000);
    await page.locator('text=英语四级 (CET-4)').click();
    
    // 检查是否可以上传文件
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    
    // 检查开始分析按钮状态（应该是禁用的，因为没有文件）
    const analyzeButton = page.locator('button', { hasText: '开始智能分析' });
    await expect(analyzeButton).toBeVisible();
  });

  test('检查控制台错误', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // 执行基本交互
    const selector = page.locator('.ant-select').first();
    await selector.click();
    await page.waitForTimeout(2000);
    
    // 报告任何控制台错误
    if (errors.length > 0) {
      console.log('控制台错误:', errors);
    }
    
    // 验证没有严重错误
    const seriousErrors = errors.filter(error => 
      error.includes('React') || 
      error.includes('antd') || 
      error.includes('Uncaught')
    );
    
    expect(seriousErrors).toHaveLength(0);
  });
}); 