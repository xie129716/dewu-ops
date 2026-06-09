const DypnsapiClient = require('@alicloud/dypnsapi20170525').default;
const { SendSmsVerifyCodeRequest, CheckSmsVerifyCodeRequest } = require('@alicloud/dypnsapi20170525');
const { Config } = require('@alicloud/openapi-client');
const { getSetting } = require('./storage');

function createClient() {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID || getSetting(0, 'sms_access_key_id');
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET || getSetting(0, 'sms_access_key_secret');

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('短信服务未配置');
  }

  return new DypnsapiClient(new Config({
    accessKeyId,
    accessKeySecret,
    endpoint: 'dypnsapi.aliyuncs.com',
  }));
}

/**
 * Send SMS verification code via 号码认证 PNV.
 * PNV auto-generates the code and fills template variable.
 */
async function sendSms(phone) {
  const signName = process.env.SMS_SIGN_NAME || getSetting(0, 'sms_sign_name');
  const templateCode = process.env.SMS_TEMPLATE_CODE || getSetting(0, 'sms_template_code');
  const client = createClient();

  const reqParams = {
    phoneNumber: phone,
    signName: signName || undefined,
  };
  // Try with TemplateCode, let PNV auto-fill templateParam
  if (templateCode) {
    reqParams.templateCode = templateCode;
  }
  const req = new SendSmsVerifyCodeRequest(reqParams);

  const result = await client.sendSmsVerifyCode(req);

  if (result.body.code !== 'OK') {
    throw new Error(`${result.body.message}`);
  }

  return { bizToken: result.body.bizToken, requestId: result.body.requestId };
}

/**
 * Verify SMS code via PNV.
 */
async function checkSmsCode(phone, code, bizToken) {
  const client = createClient();

  const req = new CheckSmsVerifyCodeRequest({
    phoneNumber: phone,
    verifyCode: code,
    bizToken: bizToken,
  });

  const result = await client.checkSmsVerifyCode(req);

  if (result.body.code === 'OK') return true;
  if (result.body.code === 'INVALID_VERIFY_CODE') return false;
  throw new Error(`${result.body.message}`);
}

module.exports = { sendSms, checkSmsCode };
