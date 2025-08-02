# CloudBase纯云函数部署指南

## 项目概述

智能语言学习助手的CloudBase纯云函数版本，将后端服务完全重构为4个独立的云函数，实现按需计费和自动扩容。

## 功能特性

- 🎯 **文件上传**: 支持TXT/SRT格式，最大5MB
- 🤖 **AI处理**: 集成DeepSeek API，智能生成学习材料
- 📊 **状态查询**: 实时查询处理进度
- 📥 **结果下载**: 下载HTML格式的学习材料
- 💰 **成本优化**: 按需计费，预估月成本¥49

## 架构设计

```
前端 (静态网站托管)
    ↓
云函数层
├── upload    - 文件上传和验证
├── process   - AI处理和内容生成
├── status    - 状态查询
└── download  - 结果下载
    ↓
存储层
├── 云存储   - 文件存储
└── 云数据库 - 任务状态
```

## 部署前准备

### 1. 环境要求

- Node.js 18+
- npm 或 yarn
- CloudBase CLI

### 2. 安装CloudBase CLI

```bash
npm install -g @cloudbase/cli
```

### 3. 登录CloudBase

```bash
tcb login
```

### 4. 创建CloudBase环境

在[CloudBase控制台](https://console.cloud.tencent.com/tcb)创建新环境，记录环境ID。

## 快速部署

### 方法一：使用部署脚本（推荐）

```bash
# 克隆项目
git clone <your-repo-url>
cd language-learning-functions

# 运行部署脚本
./deploy.sh your-env-id
```

### 方法二：手动部署

```bash
# 1. 安装依赖
npm install
cd frontend && npm install && cd ..
cd functions/upload && npm install && cd ../..
cd functions/process && npm install && cd ../..
cd functions/status && npm install && cd ../..
cd functions/download && npm install && cd ../..

# 2. 更新配置文件中的环境ID
# 编辑 cloudbaserc.json 和 frontend/vite.config.js

# 3. 构建前端
cd frontend && npm run build && cd ..

# 4. 部署到CloudBase
tcb framework deploy
```

## 环境变量配置

部署完成后，需要在CloudBase控制台配置以下环境变量：

### 必需环境变量

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | `sk-xxx...` |

### 配置步骤

1. 登录[CloudBase控制台](https://console.cloud.tencent.com/tcb)
2. 选择对应环境
3. 进入「云函数」→「环境变量」
4. 添加上述环境变量

## 功能测试

### 自动化测试

```bash
# 设置环境ID
export CLOUDBASE_ENV_ID=your-env-id

# 运行测试
node test.js
```

### 手动测试

1. 访问前端地址：`https://your-env-id.tcloudbaseapp.com`
2. 上传测试文件（.txt或.srt格式）
3. 选择英语水平
4. 等待处理完成
5. 下载学习材料

## 监控和维护

### 查看日志

```bash
# 查看特定函数日志
tcb functions:log upload
tcb functions:log process
tcb functions:log status
tcb functions:log download

# 实时查看日志
tcb functions:log upload --tail
```

### 性能监控

在CloudBase控制台可以查看：
- 函数调用次数
- 平均执行时间
- 错误率统计
- 资源使用情况

### 成本监控

- 函数调用费用
- 存储使用费用
- 流量费用
- 数据库操作费用

## 故障排除

### 常见问题

#### 1. 部署失败

**问题**: `tcb framework deploy` 失败

**解决方案**:
- 检查网络连接
- 确认已登录CloudBase：`tcb login --check`
- 检查环境ID是否正确
- 查看详细错误信息：`tcb framework deploy --verbose`

#### 2. 函数调用失败

**问题**: 云函数返回错误

**解决方案**:
- 查看函数日志：`tcb functions:log <function-name>`
- 检查环境变量配置
- 确认依赖包已正确安装
- 检查函数代码语法错误

#### 3. AI处理失败

**问题**: DeepSeek API调用失败

**解决方案**:
- 检查API密钥是否正确配置
- 确认API密钥有足够余额
- 检查网络连接
- 查看process函数日志

#### 4. 文件上传失败

**问题**: 文件上传到云存储失败

**解决方案**:
- 检查文件大小（限制5MB）
- 确认文件格式（.txt或.srt）
- 检查云存储权限配置
- 查看upload函数日志

### 调试技巧

1. **启用详细日志**:
   ```javascript
   // 在函数中添加更多日志
   logger.debug('Debug info', { data });
   ```

2. **本地测试**:
   ```bash
   # 使用测试脚本
   node test.js
   ```

3. **分步调试**:
   - 单独测试每个函数
   - 检查数据库记录
   - 验证存储文件

## 性能优化

### 冷启动优化

1. **减少依赖包大小**
2. **使用全局变量缓存连接**
3. **预热函数**（定时调用）

### 成本优化

1. **合理设置函数内存**
2. **优化函数执行时间**
3. **定期清理过期文件**
4. **使用缓存减少重复计算**

## 扩展功能

### 添加新的云函数

1. 在`functions/`目录下创建新函数目录
2. 添加`index.js`和`package.json`
3. 在`cloudbaserc.json`中配置新函数
4. 重新部署

### 集成其他AI服务

1. 修改`process`函数中的AI调用逻辑
2. 添加新的环境变量
3. 更新错误处理逻辑

## 安全建议

1. **API密钥安全**:
   - 使用环境变量存储
   - 定期轮换密钥
   - 监控API使用情况

2. **访问控制**:
   - 配置CORS策略
   - 实施速率限制
   - 监控异常访问

3. **数据安全**:
   - 定期清理敏感数据
   - 加密存储重要信息
   - 备份关键数据

## 技术支持

如遇到问题，可以通过以下方式获取帮助：

1. 查看CloudBase官方文档
2. 检查项目GitHub Issues
3. 联系技术支持团队

## 更新日志

### v1.0.0 (2024-01-15)
- 初始版本发布
- 支持基本的文件上传和AI处理功能
- 实现4个核心云函数
- 完整的错误处理和日志系统