/**
 * Email notification job handler
 */

import { sendEmail } from '../libs/email.js';
import logger from '../libs/logger.js';
import { renderTemplate } from '../templates/emailTemplates.js';

export async function handleEmailNotificationJob(payload) {
    const { toEmail, subject, templateName, templateData } = payload;

    try {
        let emailContent;

        if (templateName) {
            // Use professional template
            emailContent = renderTemplate(templateName, templateData);
        } else {
            // Fallback to custom content
            emailContent = {
                subject: subject || 'Notification from POS System',
                html: templateData?.html || '<p>This is a notification from POS System.</p>',
                text: templateData?.text || 'This is a notification from POS System.',
            };
        }

        await sendEmail({
            to: toEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
        });

        logger.info({ toEmail, subject: emailContent.subject }, 'Email notification sent');
    } catch (err) {
        logger.error({ err, payload }, 'Failed to send email notification');
        throw err;
    }
}
