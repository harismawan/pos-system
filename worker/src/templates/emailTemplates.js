/**
 * Email templates with professional HTML layouts
 */

/**
 * Base email template with consistent styling
 */
function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POS System</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 20px;
            text-align: center;
            color: #ffffff;
        }
        .email-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .email-body {
            padding: 40px 30px;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .table th {
            background-color: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
        }
        .table td {
            padding: 12px;
            border-bottom: 1px solid #e9ecef;
        }
        .total-row {
            font-weight: 600;
            font-size: 18px;
            background-color: #f8f9fa;
        }
        .text-muted {
            color: #6c757d;
        }
        .text-center {
            text-align: center;
        }
        .mt-20 {
            margin-top: 20px;
        }
        .alert {
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 6px;
        }
        .alert-warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            color: #856404;
        }
        .alert-info {
            background-color: #d1ecf1;
            border-left: 4px solid #0dcaf0;
            color: #055160;
        }
    </style>
</head>
<body>
    <div class="email-container">
        ${content}
        <div class="email-footer">
            <p><strong>POS System</strong></p>
            <p class="text-muted">This is an automated message, please do not reply to this email.</p>
            <p class="text-muted">&copy; ${new Date().getFullYear()} POS System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Order receipt template
 */
export function orderReceiptTemplate(data) {
  const {
    orderNumber,
    customerName,
    totalAmount,
    items,
    orderDate,
    paymentMethod,
  } = data;

  const itemsHtml = items
    .map(
      (item) => `
        <tr>
            <td>${item.product.name}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-center">$${parseFloat(item.unitPrice).toFixed(2)}</td>
            <td class="text-center">$${parseFloat(item.lineTotal).toFixed(2)}</td>
        </tr>
    `,
    )
    .join("");

  const content = `
        <div class="email-header">
            <h1>📧 Order Receipt</h1>
        </div>
        <div class="email-body">
            <p>Dear ${customerName},</p>
            <p>Thank you for your purchase! Here's a summary of your order:</p>
            
            <div class="info-box">
                <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${orderDate || new Date().toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethod || "Cash"}</p>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="text-center">Qty</th>
                        <th class="text-center">Price</th>
                        <th class="text-center">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                    <tr class="total-row">
                        <td colspan="3" class="text-center">Grand Total</td>
                        <td class="text-center">$${parseFloat(totalAmount).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <p class="mt-20">We appreciate your business and look forward to serving you again!</p>
        </div>
    `;

  return {
    subject: `Receipt for Order #${orderNumber}`,
    html: baseTemplate(content),
    text: `Order Receipt\nOrder Number: ${orderNumber}\nTotal: $${totalAmount}\nThank you for your purchase!`,
  };
}

/**
 * Welcome email template
 */
export function welcomeTemplate(data) {
  const { name, username } = data;

  const content = `
        <div class="email-header">
            <h1>👋 Welcome to POS System!</h1>
        </div>
        <div class="email-body">
            <p>Hi ${name},</p>
            <p>Welcome to our POS System! We're excited to have you on board.</p>

            <div class="info-box">
                <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
            </div>

            <p>Here are some things you can do to get started:</p>
            <ul>
                <li>Set up your profile and preferences</li>
                <li>Explore the dashboard</li>
                <li>Contact support if you need any help</li>
            </ul>

            <div class="text-center">
                <a href="#" class="button">Get Started</a>
            </div>
        </div>
    `;

  return {
    subject: "Welcome to POS System!",
    html: baseTemplate(content),
    text: `Welcome to POS System!\n\nHi ${name}, we're excited to have you on board. Your username is: ${username}`,
  };
}

/**
 * Password reset template
 */
export function passwordResetTemplate(data) {
  const { name, resetLink, expiryMinutes = 30 } = data;

  const content = `
        <div class="email-header">
            <h1>🔐 Reset Your Password</h1>
        </div>
        <div class="email-body">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>

            <div class="text-center">
                <a href="${resetLink}" class="button">Reset Password</a>
            </div>

            <div class="alert alert-warning">
                <strong>⚠️ Important:</strong> This link will expire in ${expiryMinutes} minutes and can only be used once.
            </div>

            <p class="text-muted">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
    `;

  return {
    subject: "Reset Your Password - POS System",
    html: baseTemplate(content),
    text: `Reset Your Password\n\nHi ${name}, click this link to reset your password: ${resetLink}\nThis link expires in ${expiryMinutes} minutes.`,
  };
}

/**
 * Low stock alert template
 */
export function lowStockAlertTemplate(data) {
  const { products } = data;

  const productsHtml = products
    .map(
      (product) => `
        <tr>
            <td>${product.name}</td>
            <td class="text-center">${product.sku}</td>
            <td class="text-center">${product.currentStock}</td>
            <td class="text-center">${product.minimumStock}</td>
        </tr>
    `,
    )
    .join("");

  const content = `
        <div class="email-header">
            <h1>⚠️ Low Stock Alert</h1>
        </div>
        <div class="email-body">
            <p>The following products are running low on stock and need to be restocked:</p>

            <table class="table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th class="text-center">SKU</th>
                        <th class="text-center">Current Stock</th>
                        <th class="text-center">Minimum Stock</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsHtml}
                </tbody>
            </table>

            <div class="alert alert-info">
                <strong>💡 Action Required:</strong> Please review these products and create purchase orders as needed.
            </div>
        </div>
    `;

  return {
    subject: "⚠️ Low Stock Alert - Action Required",
    html: baseTemplate(content),
    text: `Low Stock Alert\n\n${products.map((p) => `${p.name} (${p.sku}): ${p.currentStock} units (min: ${p.minimumStock})`).join("\n")}`,
  };
}

/**
 * General notification template
 */
export function generalNotificationTemplate(data) {
  const { title, message, actionUrl, actionText } = data;

  const content = `
        <div class="email-header">
            <h1>${title}</h1>
        </div>
        <div class="email-body">
            <p>${message}</p>
            
            ${
              actionUrl
                ? `
                <div class="text-center">
                    <a href="${actionUrl}" class="button">${actionText || "View Details"}</a>
                </div>
            `
                : ""
            }
        </div>
    `;

  return {
    subject: title,
    html: baseTemplate(content),
    text: `${title}\n\n${message}${actionUrl ? `\n\nView details: ${actionUrl}` : ""}`,
  };
}

/**
 * User invitation template
 */
export function userInvitationTemplate(data) {
  const {
    businessName,
    inviterName,
    role,
    inviteLink,
    expiryHours = 72,
  } = data;

  const roleDisplayName = {
    OWNER: "Owner",
    ADMIN: "Administrator",
    MANAGER: "Manager",
    CASHIER: "Cashier",
    WAREHOUSE_STAFF: "Warehouse Staff",
  };

  const content = `
        <div class="email-header">
            <h1>✉️ You're Invited!</h1>
        </div>
        <div class="email-body">
            <p>You've been invited to join <strong>${businessName}</strong> on POS System!</p>
            
            <div class="info-box">
                <p style="margin: 5px 0;"><strong>Invited by:</strong> ${inviterName}</p>
                <p style="margin: 5px 0;"><strong>Role:</strong> ${roleDisplayName[role] || role}</p>
            </div>

            <p>Click the button below to accept this invitation and create your account:</p>

            <div class="text-center">
                <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>

            <div class="alert alert-warning">
                <strong>⚠️ Important:</strong> This invitation link will expire in ${expiryHours} hours.
            </div>

            <p class="text-muted">If you weren't expecting this invitation or don't recognize the business, you can safely ignore this email.</p>
        </div>
    `;

  return {
    subject: `You're invited to join ${businessName}!`,
    html: baseTemplate(content),
    text: `You're Invited!\n\nYou've been invited to join ${businessName} as a ${roleDisplayName[role] || role}.\n\nInvited by: ${inviterName}\n\nClick this link to accept: ${inviteLink}\n\nThis link expires in ${expiryHours} hours.`,
  };
}

/**
 * Render email template by name
 */
export function renderTemplate(templateName, data) {
  const templates = {
    order_receipt: orderReceiptTemplate,
    welcome: welcomeTemplate,
    password_reset: passwordResetTemplate,
    low_stock_alert: lowStockAlertTemplate,
    general_notification: generalNotificationTemplate,
    user_invitation: userInvitationTemplate,
  };

  const templateFn = templates[templateName];

  if (!templateFn) {
    return generalNotificationTemplate({
      title: "Notification",
      message: "This is a notification from POS System.",
    });
  }

  return templateFn(data);
}
