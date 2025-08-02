import tcb from '@cloudbase/js-sdk';

// CloudBase配置
const app = tcb.init({
  env: __CLOUDBASE_ENV_ID__ || 'your-env-id'
});

/**
 * CloudBase服务类
 * 封装云函数调用
 */
class CloudBaseService {
  constructor() {
    this.app = app;
  }

  /**
   * 上传文件
   */
  async uploadFile(file, englishLevel) {
    try {
      console.log('开始上传文件:', file.name);
      
      // 将文件转换为base64
      const fileBase64 = await this.fileToBase64(file);
      
      const result = await this.app.callFunction({
        name: 'upload',
        data: {
          file: fileBase64,
          filename: file.name,
          englishLevel: englishLevel
        }
      });

      if (result.result.success) {
        console.log('文件上传成功:', result.result.taskId);
        return result.result;
      } else {
        throw new Error(result.result.message || '上传失败');
      }
    } catch (error) {
      console.error('上传文件失败:', error);
      throw error;
    }
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId) {
    try {
      const result = await this.app.callFunction({
        name: 'status',
        data: { taskId }
      });

      if (result.result.success) {
        return result.result;
      } else {
        throw new Error(result.result.message || '查询状态失败');
      }
    } catch (error) {
      console.error('查询状态失败:', error);
      throw error;
    }
  }

  /**
   * 下载结果
   */
  async downloadResult(taskId) {
    try {
      const result = await this.app.callFunction({
        name: 'download',
        data: { taskId }
      });

      if (result.result.success) {
        return result.result;
      } else {
        throw new Error(result.result.message || '下载失败');
      }
    } catch (error) {
      console.error('下载结果失败:', error);
      throw error;
    }
  }

  /**
   * 文件转base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // 移除data:xxx;base64,前缀
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * 轮询任务状态
   */
  async pollTaskStatus(taskId, onProgress, maxAttempts = 60) {
    let attempts = 0;
    
    const poll = async () => {
      try {
        attempts++;
        const status = await this.getTaskStatus(taskId);
        
        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'completed') {
          return status;
        } else if (status.status === 'failed') {
          throw new Error(status.errorMessage || '处理失败');
        } else if (attempts >= maxAttempts) {
          throw new Error('处理超时，请稍后重试');
        } else {
          // 继续轮询
          await new Promise(resolve => setTimeout(resolve, 2000));
          return poll();
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          throw error;
        }
        // 重试
        await new Promise(resolve => setTimeout(resolve, 2000));
        return poll();
      }
    };

    return poll();
  }
}

export default new CloudBaseService();