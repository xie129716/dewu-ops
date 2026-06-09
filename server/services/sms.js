const DysmsapiClient = require('@alicloud/dysmsapi20170525');
const { getSetting } = require('./storage');

/**
 * Create Alibaba Cloud SMS client.
 * Credentials loaded from env vars or settings table.
 */
function createClient() {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID || getSetting(0, 'sms_access_key_id');
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET || getSetting(0, 'sms_access_key_secret');

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('短信服务未配置：请设置 ALIBABA_ACCESS_KEY_ID 和 ALIBABA_ACCESS_KEY_SECRET');
  }

  return new DysmsapiClient({
    accessKeyId,
    accessKeySecret,
    endpoint: 'dysmsapi.aliyuncs.com',
  });
}

/**
 * Send SMS verification code
 * @param {string} phone - Phone number (e.g. 13800138000)
 * @param {string} code - 6-digit verification code
 * @param {string} signName - SMS signature name (must be approved in Alibaba Cloud)
 * @param {string} templateCode - SMS template code (must be approved)
 */
async function sendSms(phone, code) {
  const signName = process.env.SMS_SIGN_NAME || getSetting(0, 'sms_sign_name') || '得物运营';
  const templateCode = process.env.SMS_TEMPLATE_CODE || getSetting(0, 'sms_template_code') || 'SMS_XXXXXXXXX';

  const client = createClient();

  const result = await client.sendSms({
    phoneNumbers: phone,
    signName,
    templateCode,
    templateParam: JSON.stringify({ code }),
  });

  if (result.body.code !== 'OK') {
    throw new Error(`短信发送失败: ${result.body.message} (${result.body.code})`);
  }

  return { success: true, bizId: result.body.bizId };
}

module.exports = { sendSms };
