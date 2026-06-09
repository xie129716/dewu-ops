const POPClient = require('@alicloud/pop-core');
const { getSetting } = require('./storage');

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

async function sendSms(phone, code) {
  const signName = process.env.SMS_SIGN_NAME || getSetting(0, 'sms_sign_name');
  const templateCode = process.env.SMS_TEMPLATE_CODE || getSetting(0, 'sms_template_code') || 'SMS_335015865';
  const client = createClient();

  const result = await client.request('SendSmsVerifyCode', {
    PhoneNumber: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
  });

  if (result.Code !== 'OK') {
    throw new Error(`${result.Message}`);
  }

  return { bizToken: result.BizToken };
}

module.exports = { sendSms };
