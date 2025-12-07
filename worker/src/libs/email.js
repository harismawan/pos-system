/**
 * Email helper using nodemailer
 */

import nodemailer from "nodemailer";
import config from "../config/index.js";
import logger from "./logger.js";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth:
    config.email.user && config.email.password
      ? {
          user: config.email.user,
          pass: config.email.password,
        }
      : undefined,
});

/**
 * Send email
 * @param {Object} options - Email options
 */
export async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });

    logger.info({ messageId: info.messageId, to, subject }, "Email sent");
    return info;
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
    throw err;
  }
}

export default { sendEmail };
