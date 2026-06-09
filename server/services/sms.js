const DypnsapiClient = require('@alicloud/dypnsapi20170525').default;
const { SendSmsVerifyCodeRequest } = require('@alicloud/dypnsapi20170525');
const { Config } = require('@alicloud/openapi-client');
const { RuntimeOptions } = require('@alicloud/tea-util');
const { getSetting } = require('./storage');

const SIGN_NAME = '云渚科技验证平台';
const TEMPLATE_CODE = '100001';

function createClient() {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID || getSetting(0, 'sms_access_key_id');
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET || getSetting(0, 'sms_access_key_secret');

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('短信服务未配置');
  }

  const config = new Config({
    accessKeyId,
    accessKeySecret,
  });
  config.endpoint = 'dypnsapi.aliyuncs.com';
  return new DypnsapiClient(config);
}

async function sendSms(phone, code) {
  const client = createClient();

  const req = new SendSmsVerifyCodeRequest({
    phoneNumber: phone,
    signName: SIGN_NAME,
    templateCode: TEMPLATE_CODE,
    templateParam: JSON.stringify({ code, min: '5' }),
  });

  const runtime = new RuntimeOptions({});
  const result = await client.sendSmsVerifyCodeWithOptions(req, runtime);

  if (result.body.code !== 'OK') {
    throw new Error(`${result.body.message}`);
  }

  return { bizId: result.body.model?.bizId || '' };
}

module.exports = { sendSms };
