/**
 * SRT文件智能分段和标题生成测试
 * 专门测试大文件的分段处理功能
 */

const aiService = require('./src/services/aiService');
const Logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');

// 读取SRT文件
function readSRTFile() {
  const srtPath = path.join(__dirname, '[English (auto-generated)] FIRST CLASS on a TRAIN in New Zealand [DownSub.com].srt');
  
  if (!fs.existsSync(srtPath)) {
    throw new Error(`SRT文件不存在: ${srtPath}`);
  }
  
  const content = fs.readFileSync(srtPath, 'utf-8');
  console.log(`📄 读取SRT文件成功:`);
  console.log(`   - 文件大小: ${(content.length / 1024).toFixed(2)}KB`);
  console.log(`   - 字符数: ${content.length}`);
  console.log(`   - 行数: ${content.split('\n').length}`);
  
  return content;
}

// 解析SRT文件，提取纯文本
function parseSRTContent(srtContent) {
  const lines = srtContent.split('\n');
  const textLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 跳过序号行和时间戳行
    if (line.match(/^\d+$/) || line.match(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/)) {
      continue;
    }
    
    // 跳过空行
    if (line.length === 0) {
      continue;
    }
    
    textLines.push(line);
  }
  
  const pureText = textLines.join(' ');
  console.log(`📝 SRT解析结果:`);
  console.log(`   - 提取文本行数: ${textLines.length}`);
  console.log(`   - 纯文本长度: ${pureText.length}字符`);
  console.log(`   - 前100字符: ${pureText.substring(0, 100)}...`);
  
  return pureText;
}

// 测试分句功能
async function testSentenceSplitting(text) {
  console.log('\n🔍 测试分句功能...');
  console.log('='.repeat(50));
  
  try {
    const startTime = Date.now();
    const sentences = await aiService.splitSentences(text, 'test-srt-client');
    const endTime = Date.now();
    
    console.log(`✅ 分句成功:`);
    console.log(`   - 处理时间: ${endTime - startTime}ms`);
    console.log(`   - 生成句子数: ${sentences.length}`);
    console.log(`   - 前3个句子:`);
    sentences.slice(0, 3).forEach((sentence, index) => {
      console.log(`     ${index + 1}. ${sentence.text.substring(0, 80)}...`);
    });
    
    return sentences;
  } catch (error) {
    console.log(`❌ 分句失败: ${error.message}`);
    console.log(`   错误类型: ${error.errorType || 'UNKNOWN'}`);
    if (error.details) {
      console.log(`   详细信息:`, JSON.stringify(error.details, null, 2));
    }
    throw error;
  }
}

// 测试段落生成功能
async function testParagraphGeneration(sentences) {
  console.log('\n📚 测试段落生成功能...');
  console.log('='.repeat(50));
  
  try {
    const startTime = Date.now();
    const paragraphs = await aiService.generateParagraphsWithTitles(sentences, 'CET-4', 'test-srt-client');
    const endTime = Date.now();
    
    console.log(`✅ 段落生成成功:`);
    console.log(`   - 处理时间: ${endTime - startTime}ms`);
    console.log(`   - 生成段落数: ${paragraphs.length}`);
    console.log(`   - 段落详情:`);
    
    paragraphs.forEach((paragraph, index) => {
      console.log(`\n   段落 ${index + 1}:`);
      console.log(`   - 标题: ${paragraph.title}`);
      console.log(`   - 学习目标: ${paragraph.learningObjective}`);
      console.log(`   - 重点: ${paragraph.focusArea}`);
      console.log(`   - 句子数: ${paragraph.sentences.length}`);
      console.log(`   - 前2句: ${paragraph.sentences.slice(0, 2).map(s => s.text.substring(0, 50)).join('... ')}...`);
    });
    
    return paragraphs;
  } catch (error) {
    console.log(`❌ 段落生成失败: ${error.message}`);
    console.log(`   错误类型: ${error.errorType || 'UNKNOWN'}`);
    if (error.details) {
      console.log(`   详细信息:`, JSON.stringify(error.details, null, 2));
    }
    throw error;
  }
}

// 测试句子解释功能
async function testSentenceExplanations(sentences) {
  console.log('\n📝 测试句子解释功能...');
  console.log('='.repeat(50));
  
  try {
    // 只测试前5句，避免处理时间过长
    const testSentences = sentences.slice(0, 5);
    console.log(`   测试句子数: ${testSentences.length}`);
    
    const startTime = Date.now();
    const explainedSentences = await aiService.generateSentenceExplanations(testSentences, 'CET-4', 'test-srt-client');
    const endTime = Date.now();
    
    console.log(`✅ 句子解释成功:`);
    console.log(`   - 处理时间: ${endTime - startTime}ms`);
    console.log(`   - 解释句子数: ${explainedSentences.length}`);
    console.log(`   - 前2句解释:`);
    
    explainedSentences.slice(0, 2).forEach((sentence, index) => {
      console.log(`\n   句子 ${index + 1}: ${sentence.text.substring(0, 60)}...`);
      console.log(`   解释: ${sentence.explanation.substring(0, 100)}...`);
    });
    
    return explainedSentences;
  } catch (error) {
    console.log(`❌ 句子解释失败: ${error.message}`);
    console.log(`   错误类型: ${error.errorType || 'UNKNOWN'}`);
    if (error.details) {
      console.log(`   详细信息:`, JSON.stringify(error.details, null, 2));
    }
    throw error;
  }
}

// 测试词汇分析功能
async function testVocabularyAnalysis(text) {
  console.log('\n📖 测试词汇分析功能...');
  console.log('='.repeat(50));
  
  try {
    const startTime = Date.now();
    const vocabulary = await aiService.generateVocabularyAnalysis(text, 'CET-4');
    const endTime = Date.now();
    
    console.log(`✅ 词汇分析成功:`);
    console.log(`   - 处理时间: ${endTime - startTime}ms`);
    console.log(`   - 词汇数量: ${vocabulary.length}`);
    console.log(`   - 词汇详情:`);
    
    vocabulary.forEach((vocab, index) => {
      console.log(`\n   词汇 ${index + 1}: ${vocab.term}`);
      console.log(`   - 解释: ${vocab.explanation}`);
      console.log(`   - 用法: ${vocab.usage}`);
      console.log(`   - 例句: ${vocab.examples[0]}`);
    });
    
    return vocabulary;
  } catch (error) {
    console.log(`❌ 词汇分析失败: ${error.message}`);
    console.log(`   错误类型: ${error.errorType || 'UNKNOWN'}`);
    if (error.details) {
      console.log(`   详细信息:`, JSON.stringify(error.details, null, 2));
    }
    throw error;
  }
}

// 测试API调用详情
async function testAPICallDetails() {
  console.log('\n🔧 测试API调用详情...');
  console.log('='.repeat(50));
  
  const testText = "This is a test sentence for API call testing. It contains various vocabulary words and grammatical structures.";
  
  try {
    console.log('   测试简单API调用...');
    const startTime = Date.now();
    const result = await aiService.callDeepSeekAPI(
      "You are a helpful assistant. Please respond with 'Hello World'.",
      testText
    );
    const endTime = Date.now();
    
    console.log(`✅ API调用成功:`);
    console.log(`   - 响应时间: ${endTime - startTime}ms`);
    console.log(`   - 响应内容: ${result.substring(0, 100)}...`);
    
  } catch (error) {
    console.log(`❌ API调用失败: ${error.message}`);
    console.log(`   错误类型: ${error.errorType || 'UNKNOWN'}`);
    if (error.details) {
      console.log(`   详细信息:`, JSON.stringify(error.details, null, 2));
    }
  }
}

// 主测试函数
async function runSRTTests() {
  console.log('🧪 SRT文件智能分段和标题生成测试');
  console.log('='.repeat(60));
  
  try {
    // 1. 读取SRT文件
    const srtContent = readSRTFile();
    
    // 2. 解析SRT内容
    const pureText = parseSRTContent(srtContent);
    
    // 3. 测试API调用详情
    await testAPICallDetails();
    
    // 4. 测试分句功能
    const sentences = await testSentenceSplitting(pureText);
    
    // 5. 测试段落生成功能
    const paragraphs = await testParagraphGeneration(sentences);
    
    // 6. 测试句子解释功能
    const explainedSentences = await testSentenceExplanations(sentences);
    
    // 7. 测试词汇分析功能
    const vocabulary = await testVocabularyAnalysis(pureText);
    
    console.log('\n🎉 所有测试完成！');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('\n❌ 测试过程中发生错误:');
    console.log(`   错误信息: ${error.message}`);
    console.log(`   错误类型: ${error.errorType || 'UNKNOWN'}`);
    if (error.details) {
      console.log(`   详细信息:`, JSON.stringify(error.details, null, 2));
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runSRTTests().catch(console.error);
}

module.exports = {
  runSRTTests,
  testSentenceSplitting,
  testParagraphGeneration,
  testSentenceExplanations,
  testVocabularyAnalysis
}; 