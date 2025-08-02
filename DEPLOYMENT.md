# CloudBase部署指南

本指南将帮助您将智能语言学习助手部署到腾讯云CloudBase平台。

## 快速部署

### 1. 一键部署（推荐）

```bash
# 运行自动部署脚本
./scripts/deploy.sh
```

### 2. 手动部署步骤

#### 步骤1：安装依赖
```bash
npm run install:all
```

#### 步骤2：安装CloudBase CLI
```bash
npm run deploy:init
```

#### 步骤3：登录CloudBase
```bash
cloudbase login
```

#### 步骤4：配置环境变量

1. 修改 `cloudbaserc.json` 中的环境ID：
```json
{
  "envId": "your-actual-env-id"
}
```

2. 在CloudBase控制台配置以下环境变量：
```bash
NODE_ENV=production
DEEPSEEK_API_KEY=your-deepseek-api-key
STORAGE_TYPE=cloudbase
CLOUDBASE_ENV_ID=your-env-id
```

#### 步骤5：部署应用
```bash
npm run deploy:cloudbase
```

## 环境变量配置

### 必需的环境变量

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | `sk-xxx` |
| `CLOUDBASE_ENV_ID` | CloudBase环境ID | `your-env-id` |

### 可选的环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `STORAGE_TYPE` | 存储类型 | `local` |
| `PORT` | 服务端口 | `3001` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `CORS_ORIGINS` | 允许的跨域源 | 自动配置 |

## 部署后验证

### 1. 检查健康状态
```bash
curl https://your-env-id.ap-shanghai.tcb.qcloud.la/api/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "services": {
    "storage": "healthy",
    "ai": "configured"
  }
}
```

### 2. 测试API端点
```bash
curl https://your-env-id.ap-shanghai.tcb.qcloud.la/api/test-key
```

### 3. 访问前端
打开浏览器访问：`https://your-env-id.tcloudbaseapp.com`

## 故障排除

### 常见问题

1. **部署失败：环境ID错误**
   - 检查 `cloudbaserc.json` 中的环境ID是否正确
   - 确保在CloudBase控制台中已创建对应环境

2. **API调用失败**
   - 检查 `DEEPSEEK_API_KEY` 是否在控制台正确配置
   - 验证API密钥是否有效

3. **跨域问题**
   - 检查前端 `.env.production` 中的API地址
   - 确保CORS配置包含正确的域名

4. **文件上传失败**
   - 检查CloudBase存储服务是否已开通
   - 验证存储相关权限配置

### 日志查看

在CloudBase控制台中查看应用日志：
1. 登录CloudBase控制台
2. 进入对应环境
3. 查看"云托管" > "服务管理" > "日志"

## 更新部署

```bash
# 更新代码后重新部署
git pull
npm run deploy:cloudbase
```

## 回滚

如需回滚到之前版本：
1. 在CloudBase控制台选择对应版本
2. 点击"切换版本"

## 成本优化

1. **自动缩容**：配置最小实例数为0
2. **按量计费**：使用按请求计费模式
3. **CDN缓存**：启用静态资源CDN加速

## 安全建议

1. 定期更新依赖包
2. 使用HTTPS访问
3. 配置适当的CORS策略
4. 定期轮换API密钥
5. 监控异常访问日志

## 监控和告警

建议配置以下监控指标：
- API响应时间
- 错误率
- 请求量
- 存储使用量

## 支持

如遇到问题，请：
1. 查看CloudBase官方文档
2. 检查本项目的README文件
3. 提交GitHub Issue