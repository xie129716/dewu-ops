/**
 * Push.spug.cc SMS service
 * Uses URL query parameters for sending
 */
const SMS_URL = process.env.SMS_API_URL || 'https://push.spug.cc/sms/6_AhOhxUT5-_is94VbLSUg';

async function sendSms(phone, code) {
  const url = `${SMS_URL}?to=${encodeURIComponent(phone)}&code=${encodeURIComponent(code)}`;

  const res = await fetch(url, { method: 'POST' });

  const data = await res.json();

  if (data.code !== 200) {
    throw new Error(data.msg || '短信发送失败');
  }

  console.log(`SMS sent to ${phone}, request_id: ${data.request_id}`);
  return { requestId: data.request_id };
}

module.exports = { sendSms };
