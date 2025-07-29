/**
 * 大文件处理优化测试
 * 用于验证新的动态超时、智能重试和大文件处理功能
 */

const aiService = require('./src/services/aiService');
const Logger = require('./src/utils/logger');

// 生成测试用的不同大小文本
function generateTestText(size) {
  const baseText = `This is a test sentence for language learning. It contains various vocabulary words and grammatical structures. The purpose is to simulate real-world language materials that students might encounter. Each sentence is designed to be educational and informative.`;
  
  const repetitions = Math.ceil(size / baseText.length);
  return baseText.repeat(repetitions).substring(0, size);
}

// 测试不同大小的文件
const testSizes = [
  5000,   // 5KB - 小文件
  15000,  // 15KB - 中等文件
  30000,  // 30KB - 大文件
  50000   // 50KB - 超大文件
];

async function testLargeFileProcessing() {
  console.log('🚀 开始大文件处理优化测试\n');
  
  for (const size of testSizes) {
    console.log(`📄 测试文件大小: ${size} 字符 (${(size/1024).toFixed(1)}KB)`);
    console.log('='.repeat(50));
    
    const testText = generateTestText(size);
    
    try {
      // 测试分句处理
      console.log('🔍 测试分句处理...');
      const startTime = Date.now();
      
      const sentences = await aiService.splitSentences(testText, 'test-client');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      console.log(`✅ 分句处理成功:`);
      console.log(`   - 处理时间: ${processingTime}ms (${(processingTime/1000).toFixed(1)}秒)`);
      console.log(`   - 生成句子数: ${sentences.length}`);
      console.log(`   - 平均每句长度: ${Math.round(testText.length / sentences.length)}字符`);
      
      // 测试句子解释（如果句子数量合理）
      if (sentences.length <= 20) {
        console.log('\n📝 测试句子解释...');
        const explainStartTime = Date.now();
        
        const explainedSentences = await aiService.generateSentenceExplanations(
          sentences.slice(0, 5), // 只测试前5句
          'CET-4',
          'test-client'
        );
        
        const explainEndTime = Date.now();
        const explainTime = explainEndTime - explainStartTime;
        
        console.log(`✅ 句子解释成功:`);
        console.log(`   - 处理时间: ${explainTime}ms (${(explainTime/1000).toFixed(1)}秒)`);
        console.log(`   - 解释句子数: ${explainedSentences.length}`);
      }
      
      // 测试词汇分析
      console.log('\n📚 测试词汇分析...');
      const vocabStartTime = Date.now();
      
      const vocabulary = await aiService.generateVocabularyAnalysis(testText, 'CET-4');
      
      const vocabEndTime = Date.now();
      const vocabTime = vocabEndTime - vocabStartTime;
      
      console.log(`✅ 词汇分析成功:`);
      console.log(`   - 处理时间: ${vocabTime}ms (${(vocabTime/1000).toFixed(1)}秒)`);
      console.log(`   - 词汇数量: ${vocabulary.length}`);
      
    } catch (error) {
      console.log(`❌ 处理失败: ${error.message}`);
      console.log(`   错误类型: ${error.errorType || 'UNKNOWN'}`);
      
      if (error.details) {
        console.log(`   详细信息:`, error.details);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 测试间隔
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🎉 大文件处理优化测试完成！');
}

// 测试动态超时计算
function testDynamicTimeout() {
  console.log('⏱️  测试动态超时计算\n');
  
  const testTexts = [
    { size: 1000, description: '小文本' },
    { size: 5000, description: '中等文本' },
    { size: 15000, description: '大文本' },
    { size: 30000, description: '超大文本' }
  ];
  
  testTexts.forEach(({ size, description }) => {
    const text = generateTestText(size);
    const timeout = aiService.calculateDynamicTimeout(text);
    
    console.log(`${description} (${size}字符):`);
    console.log(`  计算超时: ${timeout}ms (${(timeout/1000).toFixed(1)}秒)`);
    console.log(`  每字符超时: ${(timeout/size).toFixed(3)}ms/字符\n`);
  });
}

// 测试智能重试延迟
function testSmartRetry() {
  console.log('🔄 测试智能重试延迟\n');
  
  for (let attempt = 0; attempt < 5; attempt++) {
    const delay = aiService.calculateRetryDelay(attempt);
    console.log(`重试 ${attempt + 1}: ${delay}ms (${(delay/1000).toFixed(1)}秒)`);
  }
}

// 运行测试
async function runTests() {
  console.log('🧪 大文件处理优化测试套件');
  console.log('='.repeat(60));
  
  // 测试动态超时
  testDynamicTimeout();
  
  // 测试智能重试
  testSmartRetry();
  
  // 测试大文件处理
  await testLargeFileProcessing();
}

// 如果直接运行此文件
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testLargeFileProcessing,
  testDynamicTimeout,
  testSmartRetry
}; 