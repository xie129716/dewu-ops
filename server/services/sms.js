/**
 * Push.spug.cc SMS service
 * Simple HTTP API — no SDK needed
 */
const SMS_URL = process.env.SMS_API_URL || 'https://push.spug.cc/sms/6_AhOhxUT5-_is94VbLSUg';

async function sendSms(phone, code) {
  const body = {
    code: code,
    to: phone,
  };

  const res = await fetch(SMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.code !== 200) {
    throw new Error(data.msg || '短信发送失败');
  }

  console.log(`SMS sent to ${phone}, request_id: ${data.request_id}`);
  return { requestId: data.request_id };
}

module.exports = { sendSms };
