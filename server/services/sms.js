const DypnsapiClient = require('@alicloud/dypnsapi20170525');
const { getSetting } = require('./storage');

/**
 * Create Alibaba Cloud PNV (号码认证) client.
 * Credentials from env vars or settings table.
 */
function createClient() {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID || getSetting(0, 'sms_access_key_id');
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET || getSetting(0, 'sms_access_key_secret');

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('短信服务未配置：请设置 ALIBABA_ACCESS_KEY_ID 和 ALIBABA_ACCESS_KEY_SECRET');
  }

  return new DypnsapiClient({
    accessKeyId,
    accessKeySecret,
    endpoint: 'dypnsapi.aliyuncs.com',
  });
}

/**
 * Send SMS verification code via PNV service.
 * Alibaba Cloud handles code generation + SMS sending.
 * @param {string} phone - Phone number (e.g. 13800138000)
 * @returns {{ bizToken: string, message: string }}
 */
async function sendSmsCode(phone) {
  const signName = process.env.SMS_SIGN_NAME || getSetting(0, 'sms_sign_name');
  const client = createClient();

  const result = await client.sendSmsVerifyCode({
    phoneNumber: phone,
    signName: signName || undefined,
    // PNV uses built-in SMS templates — no template code needed
  });

  if (result.body.code !== 'OK') {
    throw new Error(`验证码发送失败: ${result.body.message} (${result.body.code})`);
  }

  return { bizToken: result.body.bizToken, message: '验证码已发送' };
}

/**
 * Check SMS verification code via PNV service.
 * @param {string} phone - Phone number
 * @param {string} code - User-entered 6-digit code
 * @param {string} bizToken - Token from sendSmsCode response
 * @returns {boolean} - true if valid
 */
async function checkSmsCode(phone, code, bizToken) {
  const client = createClient();

  const result = await client.checkSmsVerifyCode({
    phoneNumber: phone,
    verifyCode: code,
    bizToken: bizToken,
  });

  if (result.body.code !== 'OK') {
    if (result.body.code === 'INVALID_VERIFY_CODE') {
      return false;
    }
    throw new Error(`验证码校验失败: ${result.body.message} (${result.body.code})`);
  }

  return true;
}

module.exports = { sendSmsCode, checkSmsCode };
