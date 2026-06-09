const DysmsapiClient = require('@alicloud/dysmsapi20170525').default;
const { SendSmsRequest } = require('@alicloud/dysmsapi20170525');
const { Config } = require('@alicloud/openapi-client');
const { getSetting } = require('./storage');

function createClient() {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID || getSetting(0, 'sms_access_key_id');
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET || getSetting(0, 'sms_access_key_secret');

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('短信服务未配置');
  }

  return new DysmsapiClient(new Config({
    accessKeyId,
    accessKeySecret,
    endpoint: 'dysmsapi.aliyuncs.com',
  }));
}

/**
 * Send SMS verification code via 短信服务 (Dysmsapi).
 * Returns the generated code for later verification.
 */
async function sendSms(phone, code) {
  const signName = process.env.SMS_SIGN_NAME || getSetting(0, 'sms_sign_name');
  const templateCode = process.env.SMS_TEMPLATE_CODE || getSetting(0, 'sms_template_code') || 'SMS_335015865';
  const client = createClient();

  const req = new SendSmsRequest({
    phoneNumbers: phone,
    signName: signName || undefined,
    templateCode: templateCode,
    templateParam: JSON.stringify({ code }),
  });

  const result = await client.sendSms(req);

  if (result.body.code !== 'OK') {
    throw new Error(`${result.body.message} (${result.body.code})`);
  }

  return { bizId: result.body.bizId };
}

module.exports = { sendSms };
