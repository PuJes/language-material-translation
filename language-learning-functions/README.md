# 智能语言学习助手 - CloudBase纯云函数版本

基于CloudBase云函数的智能语言学习助手，支持上传英语字幕文件并生成个性化学习材料。

## 项目结构

```
language-learning-functions/
├── frontend/                 # 前端应用
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── functions/               # 云函数
│   ├── upload/             # 文件上传函数
│   ├── process/            # AI处理函数
│   ├── status/             # 状态查询函数
│   └── download/           # 结果下载函数
├── cloudbaserc.json        # CloudBase配置
├── package.json            # 项目配置
└── README.md              # 项目说明
```

## 功能特性

- 🎯 **文件上传**: 支持TXT/SRT格式，最大5MB
- 🤖 **AI处理**: 集成DeepSeek API，智能生成学习材料
- 📊 **状态查询**: 实时查询处理进度
- 📥 **结果下载**: 下载HTML格式的学习材料
- 💰 **成本优化**: 按需计费，预估月成本¥49

## 部署步骤

1. 安装CloudBase CLI
```bash
npm install -g @cloudbase/cli
```

2. 登录CloudBase
```bash
tcb login
```

3. 部署项目
```bash
npm run deploy
```

## 环境变量

需要在CloudBase控制台配置以下环境变量：

- `DEEPSEEK_API_KEY`: DeepSeek API密钥

## 技术栈

- **前端**: React + Vite + Ant Design
- **云函数**: Node.js + CloudBase SDK
- **存储**: CloudBase云存储 + 云数据库
- **AI服务**: DeepSeek API