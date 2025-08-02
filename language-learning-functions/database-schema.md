# 数据库设计文档

## 云数据库集合设计

### tasks 集合

用于存储任务处理状态和相关信息。

#### 字段定义

```javascript
{
  _id: String,              // 任务ID (主键)
  originalFileName: String, // 原始文件名
  fileSize: Number,         // 文件大小 (字节)
  englishLevel: String,     // 英语水平 (CET-4, CET-6, IELTS, TOEFL)
  status: String,           // 任务状态 (uploaded, processing, completed, failed)
  progress: Number,         // 处理进度 (0-100)
  message: String,          // 状态描述信息
  createdAt: Date,          // 创建时间
  startedAt: Date,          // 开始处理时间
  completedAt: Date,        // 完成时间
  updatedAt: Date,          // 最后更新时间
  fileId: String,           // 云存储文件ID (原始文件)
  cloudPath: String,        // 云存储路径 (原始文件)
  resultFileId: String,     // 结果文件ID
  resultPath: String,       // 结果文件路径
  errorMessage: String      // 错误信息 (失败时)
}
```

#### 索引设计

```javascript
// 主键索引
{ "_id": 1 }

// 状态查询索引
{ "status": 1, "createdAt": -1 }

// 时间范围查询索引
{ "createdAt": -1 }

// 复合索引 (状态 + 更新时间)
{ "status": 1, "updatedAt": -1 }
```

#### 数据示例

```javascript
{
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "originalFileName": "english-subtitles.srt",
  "fileSize": 2048576,
  "englishLevel": "CET-4",
  "status": "completed",
  "progress": 100,
  "message": "处理完成",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "startedAt": "2024-01-15T10:30:05.000Z",
  "completedAt": "2024-01-15T10:32:30.000Z",
  "updatedAt": "2024-01-15T10:32:30.000Z",
  "fileId": "cloud://env-id.636c-env-id-1234567890/uploads/550e8400-e29b-41d4-a716-446655440000/1705315800000_english-subtitles.srt",
  "cloudPath": "uploads/550e8400-e29b-41d4-a716-446655440000/1705315800000_english-subtitles.srt",
  "resultFileId": "cloud://env-id.636c-env-id-1234567890/results/550e8400-e29b-41d4-a716-446655440000/learning-material.html",
  "resultPath": "results/550e8400-e29b-41d4-a716-446655440000/learning-material.html"
}
```

## 云存储目录结构

### 文件存储规划

```
/uploads/                           # 用户上传文件目录
  /{taskId}/                       # 按任务ID分组
    /{timestamp}_{originalName}    # 原始文件

/results/                          # 处理结果目录
  /{taskId}/                      # 按任务ID分组
    /learning-material.html       # 生成的学习材料

/temp/                            # 临时文件目录 (可选)
  /{taskId}/                     # 临时处理文件
    /intermediate-data.json      # 中间处理数据
```

### 文件命名规范

- **上传文件**: `{timestamp}_{originalFileName}`
- **结果文件**: `learning-material.html`
- **任务ID**: 使用UUID v4格式
- **时间戳**: Unix时间戳 (毫秒)

### 存储权限配置

```javascript
// 云存储安全规则示例
{
  "read": true,    // 允许读取 (用于下载)
  "write": false   // 禁止直接写入 (只能通过云函数)
}
```

## 数据清理策略

### 自动清理规则

1. **完成任务**: 7天后清理原始文件和结果文件
2. **失败任务**: 24小时后清理相关文件
3. **长时间未完成**: 24小时后标记为失败并清理

### 清理实现

可以通过定时触发器实现自动清理：

```javascript
// 定时清理函数 (每天执行)
exports.cleanup = async (event, context) => {
  const db = tcb.init({ env: context.TCB_ENV }).database();
  const storage = tcb.init({ env: context.TCB_ENV }).storage();
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // 清理7天前完成的任务
  const completedTasks = await db.collection('tasks')
    .where({
      status: 'completed',
      completedAt: db.command.lt(sevenDaysAgo)
    })
    .get();
    
  // 清理1天前失败的任务
  const failedTasks = await db.collection('tasks')
    .where({
      status: 'failed',
      updatedAt: db.command.lt(oneDayAgo)
    })
    .get();
    
  // 执行文件删除和记录清理
  // ...
};
```

## 性能优化建议

### 数据库优化

1. **合理使用索引**: 为常用查询字段创建索引
2. **分页查询**: 避免一次性查询大量数据
3. **数据归档**: 定期归档历史数据
4. **连接池**: 复用数据库连接

### 存储优化

1. **文件压缩**: 对大文件进行压缩存储
2. **CDN加速**: 为静态资源配置CDN
3. **分片上传**: 大文件分片上传
4. **缓存策略**: 合理设置缓存时间

## 监控指标

### 关键指标

1. **任务成功率**: 完成任务数 / 总任务数
2. **平均处理时间**: 从上传到完成的平均时间
3. **存储使用量**: 文件存储空间使用情况
4. **数据库性能**: 查询响应时间和并发数

### 告警规则

1. **任务失败率 > 10%**: 发送告警
2. **平均处理时间 > 5分钟**: 发送告警
3. **存储使用率 > 80%**: 发送告警
4. **数据库连接数 > 80%**: 发送告警