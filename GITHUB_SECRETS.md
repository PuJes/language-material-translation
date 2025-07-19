# 🔐 GitHub Secrets 配置指南

## 📋 什么是GitHub Secrets？

GitHub Secrets是GitHub提供的安全环境变量存储功能，用于在GitHub Actions中安全地存储敏感信息，如API密钥、部署令牌等。

## 🚀 配置步骤

### 1. 访问Secrets设置
1. 打开您的GitHub仓库
2. 点击 "Settings" 标签
3. 在左侧菜单中找到 "Secrets and variables"
4. 点击 "Actions"

### 2. 添加必要的Secrets

#### 对于Vercel部署：
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

#### 对于Railway部署：
```
RAILWAY_TOKEN=your_railway_token
```

#### 对于Render部署：
```
RENDER_TOKEN=your_render_token
```

#### 通用环境变量：
```
DEEPSEEK_API_KEY=your_deepseek_api_key
NODE_ENV=production
```

## 🔧 获取各平台Token

### Vercel Token
1. 访问 https://vercel.com/account/tokens
2. 点击 "Create Token"
3. 选择 "Full Account" 权限
4. 复制生成的token

### Railway Token
1. 访问 https://railway.app/account/tokens
2. 点击 "Create Token"
3. 复制生成的token

### Render Token
1. 访问 https://render.com/docs/api
2. 在API文档中找到token生成方法
3. 复制生成的token

## 📝 配置示例

### 完整的Secrets列表：
```
# Vercel配置
VERCEL_TOKEN=vercel_xxxxxxxxxxxxxxxxxxxx
VERCEL_ORG_ID=team_xxxxxxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxx

# Railway配置
RAILWAY_TOKEN=railway_xxxxxxxxxxxxxxxxxxxx

# 环境变量
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NODE_ENV=production
```

## 🔍 验证配置

### 1. 检查Secrets是否正确设置
- 在GitHub仓库的Settings > Secrets and variables > Actions中
- 确认所有必要的secrets都已添加
- 注意：secrets值不会显示，只能看到名称

### 2. 测试Actions工作流
1. 推送代码到main分支
2. 查看Actions标签页
3. 检查工作流是否成功运行
4. 查看日志确认secrets是否正确使用

## 🛠️ 故障排除

### 常见问题：

#### 1. "Secret not found" 错误
- 检查secret名称是否正确
- 确认secret已添加到正确的仓库
- 检查工作流文件中的secret引用

#### 2. "Invalid token" 错误
- 重新生成平台token
- 更新GitHub secret
- 检查token权限是否足够

#### 3. 部署失败
- 检查所有必需的secrets是否都已设置
- 查看Actions日志获取详细错误信息
- 确认云平台配置正确

## 📞 获取帮助

如果遇到问题：
1. 查看GitHub Actions日志
2. 检查各平台的API文档
3. 确认token权限设置
4. 验证环境变量配置

## 🎯 下一步

配置完Secrets后：
1. 推送代码触发Actions
2. 监控部署状态
3. 测试部署结果
4. 配置自定义域名（可选）

**配置完成后，您的项目就可以实现自动化部署了！** 🚀 