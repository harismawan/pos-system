/**
 * Email notification job handler
 */

import { sendEmail } from '../libs/email.js';
import logger from '../libs/logger.js';

// Simple template rendering (in production, use a proper template engine)
function renderTemplate(templateName, data) {
    if (templateName === 'order_receipt') {
        const { orderNumber, customerName, totalAmount, items } = data;

        const itemsList = items.map(item =>
            `<li>${item.product.name} x ${item.quantity} = ${item.lineTotal}</li>`
        ).join('');

        return {
            subject: `Receipt for Order ${orderNumber}`,
            html: `
        <h1>Order Receipt</h1>
        <p>Dear ${customerName},</p>
        <p>Thank you for your purchase!</p>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Total:</strong> ${totalAmount}</p>
        <h3>Items:</h3>
        <ul>${itemsList}</ul>
        <p>Thank you for shopping with us!</p>
      `,
            text: `Order ${orderNumber}\nTotal: ${totalAmount}\nThank you for your purchase!`,
        };
    }

    return {
        subject: 'Notification',
        html: '<p>This is a notification from POS System.</p>',
        text: 'This is a notification from POS System.',
    };
}

export async function handleEmailNotificationJob(payload) {
    const { toEmail, subject, templateName, templateData } = payload;

    try {
        let emailContent;

        if (templateName) {
            emailContent = renderTemplate(templateName, templateData);
        } else {
            emailContent = {
                subject,
                html: templateData?.html || '',
                text: templateData?.text || '',
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
