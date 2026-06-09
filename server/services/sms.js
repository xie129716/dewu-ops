const DypnsapiClient = require('@alicloud/dypnsapi20170525').default;
const { SendSmsVerifyCodeRequest, CheckSmsVerifyCodeRequest } = require('@alicloud/dypnsapi20170525');
const { Config } = require('@alicloud/openapi-client');
const { getSetting } = require('./storage');

function createClient() {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID || getSetting(0, 'sms_access_key_id');
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET || getSetting(0, 'sms_access_key_secret');

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('短信服务未配置：请设置 ALIBABA_ACCESS_KEY_ID 和 ALIBABA_ACCESS_KEY_SECRET');
  }

  return new DypnsapiClient(new Config({
    accessKeyId,
    accessKeySecret,
    endpoint: 'dypnsapi.aliyuncs.com',
  }));
}

/**
 * Send SMS verification code via PNV.
 */
async function sendSmsCode(phone) {
  const signName = process.env.SMS_SIGN_NAME || getSetting(0, 'sms_sign_name');
  const templateCode = process.env.SMS_TEMPLATE_CODE || getSetting(0, 'sms_template_code');
  const client = createClient();

  const req = new SendSmsVerifyCodeRequest({
    phoneNumber: phone,
    signName: signName || undefined,
    templateCode: templateCode || undefined,
  });

  const result = await client.sendSmsVerifyCode(req);

  if (result.body.code !== 'OK') {
    throw new Error(`验证码发送失败: ${result.body.message} (${result.body.code})`);
  }

  return { bizToken: result.body.bizToken, message: '验证码已发送' };
}

/**
 * Check SMS verification code via PNV.
 */
async function checkSmsCode(phone, code, bizToken) {
  const client = createClient();

  const req = new CheckSmsVerifyCodeRequest({
    phoneNumber: phone,
    verifyCode: code,
    bizToken: bizToken,
  });

  const result = await client.checkSmsVerifyCode(req);

  if (result.body.code !== 'OK') {
    if (result.body.code === 'INVALID_VERIFY_CODE') {
      return false;
    }
    throw new Error(`验证码校验失败: ${result.body.message} (${result.body.code})`);
  }

  return true;
}

module.exports = { sendSmsCode, checkSmsCode };
