/**
 * CloudBase云函数测试脚本
 * 用于测试各个云函数的功能
 */

const tcb = require('@cloudbase/node-sdk');
const fs = require('fs');
const path = require('path');

// 配置
const ENV_ID = process.env.CLOUDBASE_ENV_ID || 'your-env-id';
const TEST_FILE_PATH = './test-files/sample.txt';

// 初始化CloudBase
const app = tcb.init({
  env: ENV_ID
});

/**
 * 测试工具函数
 */
class TestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 运行测试: ${testName}`);
    const start = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - start;
      
      console.log(`✅ ${testName} - 通过 (${duration}ms)`);
      this.testResults.push({
        name: testName,
        status: 'PASS',
        duration,
        result
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      console.log(`❌ ${testName} - 失败 (${duration}ms)`);
      console.error(`   错误: ${error.message}`);
      
      this.testResults.push({
        name: testName,
        status: 'FAIL',
        duration,
        error: error.message
      });
      
      throw error;
    }
  }

  printSummary() {
    const totalTime = Date.now() - this.startTime;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(50));
    console.log(`总测试数: ${this.testResults.length}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`总耗时: ${totalTime}ms`);
    console.log('='.repeat(50));
    
    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }
  }
}

/**
 * 创建测试文件
 */
function createTestFile() {
  const testDir = './test-files';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  const testContent = `Hello, this is a test file for the language learning assistant.
This file contains some English sentences for testing purposes.
The AI will analyze these sentences and generate learning materials.
We hope this test will help verify the functionality of our cloud functions.`;

  fs.writeFileSync(TEST_FILE_PATH, testContent);
  console.log(`📝 测试文件已创建: ${TEST_FILE_PATH}`);
}

/**
 * 文件转base64
 */
function fileToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

/**
 * 测试文件上传函数
 */
async function testUploadFunction() {
  const fileBase64 = fileToBase64(TEST_FILE_PATH);
  
  const result = await app.callFunction({
    name: 'upload',
    data: {
      file: fileBase64,
      filename: 'test-sample.txt',
      englishLevel: 'CET-4'
    }
  });

  if (!result.result.success) {
    throw new Error(result.result.message || '上传失败');
  }

  return result.result;
}

/**
 * 测试状态查询函数
 */
async function testStatusFunction(taskId) {
  const result = await app.callFunction({
    name: 'status',
    data: { taskId }
  });

  if (!result.result.success) {
    throw new Error(result.result.message || '状态查询失败');
  }

  return result.result;
}

/**
 * 等待任务完成
 */
async function waitForCompletion(taskId, maxWaitTime = 300000) { // 5分钟
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await testStatusFunction(taskId);
    
    console.log(`   状态: ${status.status}, 进度: ${status.progress}%`);
    
    if (status.status === 'completed') {
      return status;
    }
    
    if (status.status === 'failed') {
      throw new Error(status.errorMessage || '任务处理失败');
    }
    
    // 等待2秒后再次检查
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('任务处理超时');
}

/**
 * 测试下载函数
 */
async function testDownloadFunction(taskId) {
  const result = await app.callFunction({
    name: 'download',
    data: { taskId }
  });

  if (!result.result.success) {
    throw new Error(result.result.message || '下载失败');
  }

  return result.result;
}

/**
 * 完整流程测试
 */
async function testCompleteWorkflow() {
  console.log('🔄 开始完整流程测试...');
  
  // 1. 上传文件
  console.log('1️⃣ 测试文件上传...');
  const uploadResult = await testUploadFunction();
  const taskId = uploadResult.taskId;
  console.log(`   任务ID: ${taskId}`);
  
  // 2. 等待处理完成
  console.log('2️⃣ 等待AI处理完成...');
  const completedStatus = await waitForCompletion(taskId);
  console.log(`   处理完成，耗时: ${completedStatus.data.processingTime || '未知'}`);
  
  // 3. 下载结果
  console.log('3️⃣ 测试结果下载...');
  const downloadResult = await testDownloadFunction(taskId);
  console.log(`   结果文件大小: ${downloadResult.size} 字符`);
  
  // 保存结果文件
  const resultPath = './test-result.html';
  fs.writeFileSync(resultPath, downloadResult.content);
  console.log(`   结果已保存到: ${resultPath}`);
  
  return {
    taskId,
    uploadResult,
    completedStatus,
    downloadResult
  };
}

/**
 * 错误处理测试
 */
async function testErrorHandling() {
  console.log('🚨 测试错误处理...');
  
  // 测试无效文件上传
  try {
    await app.callFunction({
      name: 'upload',
      data: {
        file: null,
        filename: 'test.txt',
        englishLevel: 'CET-4'
      }
    });
    throw new Error('应该抛出文件必需错误');
  } catch (error) {
    if (error.message.includes('应该抛出')) {
      throw error;
    }
    console.log('   ✅ 正确处理了无效文件错误');
  }
  
  // 测试无效任务ID查询
  try {
    await app.callFunction({
      name: 'status',
      data: { taskId: 'invalid-task-id' }
    });
    throw new Error('应该抛出任务不存在错误');
  } catch (error) {
    if (error.message.includes('应该抛出')) {
      throw error;
    }
    console.log('   ✅ 正确处理了无效任务ID错误');
  }
}

/**
 * 性能测试
 */
async function testPerformance() {
  console.log('⚡ 测试性能指标...');
  
  const metrics = {
    uploadTime: 0,
    statusQueryTime: 0,
    downloadTime: 0
  };
  
  // 测试上传性能
  const uploadStart = Date.now();
  const uploadResult = await testUploadFunction();
  metrics.uploadTime = Date.now() - uploadStart;
  
  // 测试状态查询性能
  const statusStart = Date.now();
  await testStatusFunction(uploadResult.taskId);
  metrics.statusQueryTime = Date.now() - statusStart;
  
  console.log(`   上传耗时: ${metrics.uploadTime}ms`);
  console.log(`   状态查询耗时: ${metrics.statusQueryTime}ms`);
  
  return metrics;
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('🚀 开始CloudBase云函数测试');
  console.log(`环境ID: ${ENV_ID}`);
  
  const runner = new TestRunner();
  
  try {
    // 创建测试文件
    createTestFile();
    
    // 运行各项测试
    await runner.runTest('错误处理测试', testErrorHandling);
    await runner.runTest('性能测试', testPerformance);
    await runner.runTest('完整流程测试', testCompleteWorkflow);
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  } finally {
    // 清理测试文件
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
    if (fs.existsSync('./test-files')) {
      fs.rmdirSync('./test-files');
    }
    
    runner.printSummary();
  }
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testUploadFunction,
  testStatusFunction,
  testDownloadFunction,
  testCompleteWorkflow
};