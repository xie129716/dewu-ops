const POPClient = require('@alicloud/pop-core');
const { getSetting } = require('./storage');

// 阿里云号码认证 — 系统赠送签名和模板（免资质，必须配套使用）
const SIGN_NAME = '云渚科技验证平台';
const TEMPLATE_CODE = '100001';

function createClient() {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID || getSetting(0, 'sms_access_key_id');
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET || getSetting(0, 'sms_access_key_secret');

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('短信服务未配置');
  }

  return new POPClient({
    accessKeyId,
    accessKeySecret,
    endpoint: 'https://dypnsapi.aliyuncs.com',
    apiVersion: '2017-05-25',
  });
}

/**
 * Send SMS verification code via PNV.
 * Uses ##code## placeholder — PNV auto-generates the code.
 * Returns the generated code for dev mode fallback.
 */
async function sendSms(phone, code) {
  const client = createClient();

  const result = await client.request('SendSmsVerifyCode', {
    PhoneNumber: phone,
    SignName: SIGN_NAME,
    TemplateCode: TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code, min: '5' }),
  });

  if (result.Code !== 'OK') {
    throw new Error(`${result.Message}`);
  }

  return { bizId: result.Model?.BizId || '' };
}

/**
 * Verify SMS code via PNV.
 */
async function checkSmsCode(phone, code) {
  const client = createClient();

  const result = await client.request('CheckSmsVerifyCode', {
    PhoneNumber: phone,
    VerifyCode: code,
  });

  // API success does NOT mean verification success
  if (result.Code !== 'OK') {
    throw new Error(`${result.Message}`);
  }

  return result.Model?.VerifyResult === 'PASS';
}

module.exports = { sendSms, checkSmsCode };
