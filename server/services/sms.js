const crypto = require('crypto');
const { getSetting } = require('./storage');

const ENDPOINT = 'https://dypnsapi.aliyuncs.com';

function getCredentials() {
  const accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID || getSetting(0, 'sms_access_key_id');
  const accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET || getSetting(0, 'sms_access_key_secret');
  if (!accessKeyId || !accessKeySecret) {
    throw new Error('短信服务未配置');
  }
  return { accessKeyId, accessKeySecret };
}

// Build Alibaba Cloud API signature (HMAC-SHA1)
function buildSignature(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const canonicalized = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const stringToSign = `POST&${encodeURIComponent('/')}&${encodeURIComponent(canonicalized)}`;
  return crypto.createHmac('sha1', `${secret}&`).update(stringToSign).digest('base64');
}

async function callApi(action, params) {
  const { accessKeyId, accessKeySecret } = getCredentials();

  const query = {
    AccessKeyId: accessKeyId,
    Action: action,
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: Date.now() + Math.random().toString(36),
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString(),
    Version: '2017-05-25',
    ...params,
  };

  query.Signature = buildSignature(query, accessKeySecret);

  const qs = Object.keys(query).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`).join('&');

  const resp = await fetch(`${ENDPOINT}/?${qs}`, { method: 'POST' });
  const text = await resp.text();

  // Parse JSON response
  const data = JSON.parse(text);
  return data;
}

async function sendSms(phone, code) {
  const signName = process.env.SMS_SIGN_NAME || getSetting(0, 'sms_sign_name');
  const templateCode = process.env.SMS_TEMPLATE_CODE || getSetting(0, 'sms_template_code') || 'SMS_335015865';

  const data = await callApi('SendSmsVerifyCode', {
    PhoneNumber: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
  });

  if (data.Code !== 'OK') {
    throw new Error(`${data.Message || data.Code}`);
  }

  return { bizToken: data.BizToken, requestId: data.RequestId };
}

async function checkSmsCode(phone, code, bizToken) {
  const data = await callApi('CheckSmsVerifyCode', {
    PhoneNumber: phone,
    VerifyCode: code,
    BizToken: bizToken,
  });

  if (data.Code === 'OK') return true;
  if (data.Code === 'INVALID_VERIFY_CODE') return false;
  throw new Error(`${data.Message || data.Code}`);
}

module.exports = { sendSms, checkSmsCode };
