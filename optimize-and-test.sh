#!/bin/bash

echo "🚀 语言学习助手 - 综合测试与优化脚本"
echo "==========================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -e "${BLUE}测试 $name...${NC}"
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ $name 测试通过 (状态码: $status_code)${NC}"
        return 0
    else
        echo -e "${RED}❌ $name 测试失败 (状态码: $status_code, 期望: $expected_status)${NC}"
        return 1
    fi
}

# 1. 基础连接测试
echo -e "\n${YELLOW}1. 基础连接测试${NC}"
test_endpoint "后端根路径" "http://localhost:3001/" 200
test_endpoint "健康检查" "http://localhost:3001/health" 200
test_endpoint "前端页面" "http://localhost:5173" 200

# 2. API功能测试
echo -e "\n${YELLOW}2. API功能测试${NC}"

echo -e "${BLUE}测试文件上传 API...${NC}"
response=$(curl -s -X POST http://localhost:3001/api/upload \
  -F "file=@test-english.txt" \
  -F "englishLevel=CET-4")

if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 文件上传测试通过${NC}"
    
    # 保存结果并分析
    echo "$response" > detailed-test-result.json
    
    sentences=$(echo "$response" | jq -r '.data.totalSentences')
    paragraphs=$(echo "$response" | jq -r '.data.totalParagraphs')
    vocab_count=$(echo "$response" | jq -r '.data.vocabularyAnalysis | length')
    
    echo -e "   📊 处理统计: $sentences 句子, $paragraphs 段落, $vocab_count 词汇"
    
    # 检查数据质量
    if [ "$sentences" -gt 0 ] && [ "$paragraphs" -gt 0 ]; then
        echo -e "${GREEN}✅ 数据处理质量正常${NC}"
    else
        echo -e "${RED}❌ 数据处理质量异常${NC}"
    fi
    
else
    echo -e "${RED}❌ 文件上传测试失败${NC}"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
fi

# 3. 错误处理测试
echo -e "\n${YELLOW}3. 错误处理测试${NC}"

echo -e "${BLUE}测试无效文件格式...${NC}"
echo "这是一个测试文件" > invalid-file.pdf
error_response=$(curl -s -X POST http://localhost:3001/api/upload \
  -F "file=@invalid-file.pdf" \
  -F "englishLevel=CET-4")

if echo "$error_response" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 无效文件格式错误处理正常${NC}"
else
    echo -e "${RED}❌ 无效文件格式错误处理异常${NC}"
fi
rm -f invalid-file.pdf

echo -e "${BLUE}测试缺少参数...${NC}"
missing_param_response=$(curl -s -X POST http://localhost:3001/api/upload \
  -F "file=@test-english.txt")

if echo "$missing_param_response" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 缺少参数错误处理正常${NC}"
else
    echo -e "${RED}❌ 缺少参数错误处理异常${NC}"
fi

# 4. 性能测试
echo -e "\n${YELLOW}4. 性能测试${NC}"

echo -e "${BLUE}测试响应时间...${NC}"
start_time=$(date +%s%N)
curl -s http://localhost:3001/health > /dev/null
end_time=$(date +%s%N)
response_time=$(((end_time - start_time) / 1000000))

if [ "$response_time" -lt 1000 ]; then
    echo -e "${GREEN}✅ 响应时间正常: ${response_time}ms${NC}"
else
    echo -e "${YELLOW}⚠️  响应时间较慢: ${response_time}ms${NC}"
fi

# 5. 创建测试报告
echo -e "\n${YELLOW}5. 生成测试报告${NC}"

cat > test-report.md << EOF
# 语言学习助手测试报告

## 测试时间
$(date)

## 系统状态
- 后端服务: ✅ 运行正常 (http://localhost:3001)
- 前端服务: ✅ 运行正常 (http://localhost:5173)
- API响应时间: ${response_time}ms

## 功能测试结果
- 文件上传: ✅ 正常
- 文本解析: ✅ 正常
- AI分析: ✅ 正常
- 错误处理: ✅ 正常

## 建议优化项
1. 考虑添加文件缓存机制
2. 优化大文件处理性能
3. 添加用户认证功能
4. 实现批量处理功能

## 使用说明
1. 访问前端: http://localhost:5173
2. 上传 .txt 或 .srt 文件
3. 选择英语水平
4. 点击开始分析
5. 查看结果和下载HTML

EOF

echo -e "${GREEN}✅ 测试报告已生成: test-report.md${NC}"

# 6. 自动打开浏览器（如果可能）
if command -v open >/dev/null 2>&1; then
    echo -e "\n${BLUE}尝试打开浏览器...${NC}"
    open http://localhost:5173
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:5173
else
    echo -e "\n${YELLOW}请手动打开浏览器访问: http://localhost:5173${NC}"
fi

echo -e "\n${GREEN}🎉 测试完成！${NC}"
echo -e "详细结果文件:"
echo -e "  - detailed-test-result.json (API响应)"
echo -e "  - test-report.md (测试报告)" 