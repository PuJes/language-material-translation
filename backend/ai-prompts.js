/**
 * AI提示词配置文件
 * 集中管理所有DeepSeek API的提示词，便于维护和优化
 */

/**
 * 生成段落标题的提示词
 * @param {string} englishLevel - 英语水平 (CET-4, CET-6, IELTS, TOEFL)
 * @param {string} contentType - 内容类型
 * @param {Array} textsForTitles - 段落文本数组
 * @returns {string} 格式化的提示词
 */
function generateTitlePrompt(englishLevel, contentType, textsForTitles) {
  return `You are an expert English teacher. Create concise section titles based on content.

REQUIREMENTS:
- Each title must be 3-5 words in English
- Summarize the main topic of each section
- Use clear, descriptive words
- Avoid generic titles like "Section 1"
- Consider the content type: ${contentType}

CONTENT TO ANALYZE:
${textsForTitles.map((text, i) => 
  `${i+1}. "${text.substring(0, 150)}..."`
).join('\n')}

OUTPUT FORMAT (strict JSON array of strings):
["Title 1", "Title 2", "Title 3"]

IMPORTANT: 
- Return ONLY the JSON array, no additional text
- Make sure the array has exactly ${textsForTitles.length} elements
- Each title should be a simple string, not an object
- Use double quotes for strings`;
}

/**
 * 生成句子解释的提示词（简化版本，提高成功率）
 * @param {string} englishLevel - 英语水平
 * @param {Array} sentences - 句子数组
 * @returns {string} 格式化的提示词
 */
function generateExplanationPrompt(englishLevel, sentences) {
  return `You are an expert English teacher. Explain these ${sentences.length} English sentences for ${englishLevel} level learners.

SENTENCES TO ANALYZE:
${sentences.map((s, i) => `${i + 1}. "${s.text}"`).join('\n')}

REQUIREMENTS:
- Explain the meaning using very simple words
- Be detailed but use basic vocabulary
- Make explanations easy to understand
- Use language appropriate for ${englishLevel} level
- Keep explanations under 60 words each

OUTPUT FORMAT (JSON array only):
[
  {
    "meaning": "Detailed explanation using simple words"
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text.`;
}

/**
 * 生成词汇分析的提示词（优化版本）
 * @param {string} englishLevel - 英语水平
 * @param {string} text - 要分析的文本
 * @returns {string} 格式化的提示词
 */
function generateVocabularyPrompt(englishLevel, text) {
  return `You are an expert English language teacher. Analyze this English text and identify ALL important vocabulary words that ${englishLevel} level learners should learn.

LEARNING OBJECTIVES:
- Identify ALL vocabulary words that are important for ${englishLevel} level
- Focus on words that ${englishLevel} learners need to master
- Include words from basic to advanced level appropriate for ${englishLevel}
- No limit on number of words - identify as many as needed

TEXT TO ANALYZE:
"${text.substring(0, 1200)}..."

VOCABULARY SELECTION STRATEGY:
- For CET-4: Focus on basic to intermediate vocabulary, common expressions
- For CET-6: Include intermediate to advanced vocabulary, academic words
- For IELTS: Emphasize academic vocabulary, formal expressions, complex terms
- For TOEFL: Include advanced academic vocabulary, specialized terminology

OUTPUT FORMAT (strict JSON array):
[
  {
    "term": "vocabulary word",
    "explanation": "Simple, clear definition using basic words",
    "usage": "How to use this word correctly in context",
    "examples": ["Example sentence 1", "Example sentence 2"]
  }
]

IMPORTANT: 
- Return ONLY the JSON array, no additional text
- Include ALL important words for ${englishLevel} level
- No limit on array length - identify as many words as needed
- Use simple explanations that ${englishLevel} learners can understand`;
}

/**
 * 生成语义段落划分的提示词
 * @param {Array} sentences - 句子数组
 * @returns {string} 格式化的提示词
 */
function generateParagraphDivisionPrompt(sentences) {
  return `You are an expert English teacher. Analyze these sentences and divide them into logical paragraphs based on semantic coherence.

REQUIREMENTS:
- Group sentences that discuss the same topic or theme
- Each paragraph should have 4-8 sentences (larger paragraphs)
- Avoid paragraphs that are too short (less than 4 sentences) or too long (more than 10 sentences)
- If there are remaining sentences that would form a paragraph with less than 4 sentences, merge them with the previous paragraph
- Consider major topic transitions and natural breaks in conversation
- Maintain logical flow between paragraphs
- Prefer fewer, larger paragraphs over many small ones

SENTENCES TO ANALYZE:
${sentences.map((s, i) => `${i + 1}. "${s.text}"`).join('\n')}

OUTPUT FORMAT (strict JSON array of arrays, where each inner array contains sentence indices starting from 0):
[[0, 1, 2], [3, 4], [5, 6, 7, 8]]

IMPORTANT: Return ONLY the JSON array, no additional text or explanations. The array should contain sentence indices (0-based) grouped by semantic coherence.

Example: If sentences 0, 1, 2 form one paragraph, sentences 3, 4 form another, and sentences 5, 6, 7, 8 form a third paragraph.

Focus on semantic coherence and natural topic flow.`;
}

/**
 * 辅助函数：提取关键元素
 * @param {string} text - 文本内容
 * @returns {string} 关键元素
 */
function extractKeyElements(text) {
  const words = text.toLowerCase().split(/\s+/);
  const keyPatterns = [
    /\b(past|present|future|tense|verb|noun|adjective)\b/i,
    /\b(because|however|therefore|although|while)\b/i,
    /\b(important|necessary|possible|difficult|easy)\b/i,
    /\b(should|must|can|could|would|will)\b/i,
    /\b(people|person|thing|place|time|money)\b/i
  ];
  
  const foundElements = [];
  keyPatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) foundElements.push(match[0]);
  });
  
  return foundElements.slice(0, 3).join(', ') || 'key vocabulary';
}

module.exports = {
  generateTitlePrompt,
  generateExplanationPrompt,
  generateVocabularyPrompt,
  generateParagraphDivisionPrompt,
  extractKeyElements
}; 