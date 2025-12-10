/**
 * Receipt Builder Utility
 * Builds structured receipt data from order data
 */

import { formatDateTime } from "./dateUtils.js";

/**
 * Build receipt data from order and outlet information
 * @param {Object} order - The completed POS order
 * @param {Object} outlet - The outlet information
 * @param {Object} options - Additional options
 * @returns {Object} Structured receipt data
 */
export function buildReceiptData(order, outlet, options = {}) {
  const { cashReceived = null, showTaxBreakdown = true } = options;

  // Build store header
  const storeHeader = {
    name: outlet.name || "Store",
    address: formatAddress(outlet),
    phone: outlet.phone || null,
  };

  // Build order items
  const items = (order.items || []).map((item) => ({
    name: item.product?.name || "Unknown Product",
    quantity: parseFloat(item.quantity),
    unitPrice: parseFloat(item.unitPrice),
    discountAmount: parseFloat(item.discountAmount || 0),
    lineTotal: parseFloat(item.lineTotal),
  }));

  // Calculate totals
  const subtotal = parseFloat(order.subtotalAmount || 0);
  const discount = parseFloat(order.totalDiscountAmount || 0);
  const tax = parseFloat(order.totalTaxAmount || 0);
  const total = parseFloat(order.totalAmount || 0);

  // Payment information
  const payments = (order.payments || []).map((p) => ({
    method: formatPaymentMethod(p.method),
    amount: parseFloat(p.amount),
  }));

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const change = cashReceived ? cashReceived - total : totalPaid - total;

  return {
    storeHeader,
    orderNumber: order.orderNumber,
    dateTime: formatDateTime(order.createdAt || new Date()),
    cashier: order.cashier?.name || "Cashier",
    customer: order.customer?.name || null,
    items,
    subtotal,
    discount: discount > 0 ? discount : null,
    tax: showTaxBreakdown && tax > 0 ? tax : null,
    total,
    payments,
    totalPaid,
    change: change > 0 ? change : null,
  };
}

/**
 * Format address from outlet data
 */
function formatAddress(outlet) {
  const parts = [];
  if (outlet.addressLine1) parts.push(outlet.addressLine1);
  if (outlet.addressLine2) parts.push(outlet.addressLine2);
  if (outlet.city) {
    let cityLine = outlet.city;
    if (outlet.postalCode) cityLine += ` ${outlet.postalCode}`;
    parts.push(cityLine);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method) {
  const methods = {
    CASH: "Cash",
    CARD: "Card",
    E_WALLET: "E-Wallet",
    BANK_TRANSFER: "Bank Transfer",
  };
  return methods[method] || method;
}

/**
 * Format receipt as plain text (for thermal printers)
 * @param {Object} receiptData - Receipt data from buildReceiptData
 * @param {Object} options - Formatting options
 * @returns {string} Formatted receipt text
 */
export function formatReceiptText(receiptData, options = {}) {
  const { paperWidth = 48 } = options; // Characters per line (48 for 80mm, 32 for 58mm)
  const lines = [];

  const hr = "=".repeat(paperWidth);
  const thinHr = "-".repeat(paperWidth);

  // Store header (centered)
  lines.push(
    centerText(receiptData.storeHeader.name.toUpperCase(), paperWidth),
  );
  if (receiptData.storeHeader.address) {
    lines.push(centerText(receiptData.storeHeader.address, paperWidth));
  }
  if (receiptData.storeHeader.phone) {
    lines.push(centerText(`Tel: ${receiptData.storeHeader.phone}`, paperWidth));
  }
  lines.push(hr);

  // Order info
  lines.push(`Order #: ${receiptData.orderNumber}`);
  lines.push(`Date: ${receiptData.dateTime}`);
  lines.push(`Cashier: ${receiptData.cashier}`);
  if (receiptData.customer) {
    lines.push(`Customer: ${receiptData.customer}`);
  }
  lines.push(thinHr);

  // Items
  for (const item of receiptData.items) {
    const itemName = truncateText(item.name, paperWidth - 15);
    const qty = `${item.quantity}x`;
    const price = formatCurrency(item.lineTotal);

    // Item name line
    lines.push(itemName);
    // Quantity and price line
    lines.push(
      alignLeftRight(
        `  ${qty} @ ${formatCurrency(item.unitPrice)}`,
        price,
        paperWidth,
      ),
    );

    // Show discount if any
    if (item.discountAmount > 0) {
      lines.push(
        alignLeftRight(
          "  Discount",
          `-${formatCurrency(item.discountAmount)}`,
          paperWidth,
        ),
      );
    }
  }
  lines.push(thinHr);

  // Totals
  lines.push(
    alignLeftRight(
      "Subtotal",
      formatCurrency(receiptData.subtotal),
      paperWidth,
    ),
  );
  if (receiptData.discount) {
    lines.push(
      alignLeftRight(
        "Discount",
        `-${formatCurrency(receiptData.discount)}`,
        paperWidth,
      ),
    );
  }
  if (receiptData.tax) {
    lines.push(
      alignLeftRight("Tax", formatCurrency(receiptData.tax), paperWidth),
    );
  }
  lines.push(hr);
  lines.push(
    alignLeftRight("TOTAL", formatCurrency(receiptData.total), paperWidth),
  );
  lines.push(hr);

  // Payment info
  for (const payment of receiptData.payments) {
    lines.push(
      alignLeftRight(
        payment.method,
        formatCurrency(payment.amount),
        paperWidth,
      ),
    );
  }
  if (receiptData.change) {
    lines.push(
      alignLeftRight("Change", formatCurrency(receiptData.change), paperWidth),
    );
  }

  // Footer
  lines.push("");
  lines.push(centerText("Thank you for your purchase!", paperWidth));
  lines.push(centerText("Please come again", paperWidth));
  lines.push("");

  return lines.join("\n");
}

// Helper functions
function centerText(text, width) {
  if (text.length >= width) return text.substring(0, width);
  const padding = Math.floor((width - text.length) / 2);
  return " ".repeat(padding) + text;
}

function alignLeftRight(left, right, width) {
  const availableSpace = width - right.length;
  if (left.length >= availableSpace) {
    return left.substring(0, availableSpace - 1) + " " + right;
  }
  return left + " ".repeat(availableSpace - left.length) + right;
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function formatCurrency(amount) {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}
