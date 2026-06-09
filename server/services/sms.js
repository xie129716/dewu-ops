const POPClient = require('@alicloud/pop-core');
const { getSetting } = require('./storage');

// System-provided signature and template (免资质，赠送签名+模板)
const SIGN_NAME = process.env.SMS_SIGN_NAME || getSetting(0, 'sms_sign_name') || '速通互联验证码';
const TEMPLATE_CODE = process.env.SMS_TEMPLATE_CODE || getSetting(0, 'sms_template_code') || '100001';

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
async function sendSms(phone) {
  const client = createClient();

  const result = await client.request('SendSmsVerifyCode', {
    PhoneNumber: phone,
    SignName: SIGN_NAME,
    TemplateCode: TEMPLATE_CODE,
    // "##code##" tells PNV to auto-generate the verification code
    // "min" variable sets validity in minutes
    TemplateParam: JSON.stringify({ code: '##code##', min: '5' }),
    CodeLength: 6,
    ReturnVerifyCode: true,
  });

  if (result.Code !== 'OK') {
    throw new Error(`${result.Message}`);
  }

  return {
    verifyCode: result.Model?.VerifyCode || '',
    bizId: result.Model?.BizId || '',
  };
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
