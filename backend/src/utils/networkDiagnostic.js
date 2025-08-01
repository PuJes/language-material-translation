const ping = require('ping');

/**
 * 网络诊断工具
 * @param {string} host - 要测试的主机地址
 * @returns {Promise<Object>} 网络诊断结果
 */
const checkNetwork = async (host = '8.8.8.8') => {
  try {
    const res = await ping.promise.probe(host);
    return {
      status: res.alive ? 'success' : 'failed',
      host: res.host,
      latency: res.time
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};

/**
 * 记录错误诊断信息
 * @param {Object} diagnosis - 诊断信息
 */
const logErrorDiagnosis = (diagnosis) => {
  console.log('网络诊断:', diagnosis);
};

module.exports = { checkNetwork, logErrorDiagnosis };