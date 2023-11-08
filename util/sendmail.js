require("dotenv").config();
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports.buildMail = (to, from, subject, html) => {
  return (msg = {
    to: to,
    from: from,
    subject: subject,
    html: html,
  });
};

module.exports.sendMail = async (msg) => {
  const data = await sgMail.send(msg);
  console.log("Email sent");
  return data;
};
