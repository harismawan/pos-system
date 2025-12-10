/**
 * ESC/POS Command Generator
 * Generates ESC/POS commands for thermal printers
 */

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/**
 * ESC/POS command builder class
 */
export class EscPosBuilder {
  constructor() {
    this.buffer = [];
  }

  /**
   * Initialize printer
   */
  initialize() {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  /**
   * Add text with optional encoding
   * @param {string} text - Text to add
   */
  text(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    this.buffer.push(...bytes);
    return this;
  }

  /**
   * Add line feed
   * @param {number} count - Number of line feeds
   */
  lineFeed(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  /**
   * Set text alignment
   * @param {string} align - 'left', 'center', or 'right'
   */
  align(align) {
    const alignments = { left: 0, center: 1, right: 2 };
    this.buffer.push(ESC, 0x61, alignments[align] || 0); // ESC a n
    return this;
  }

  /**
   * Set bold mode
   * @param {boolean} enabled
   */
  bold(enabled) {
    this.buffer.push(ESC, 0x45, enabled ? 1 : 0); // ESC E n
    return this;
  }

  /**
   * Set underline mode
   * @param {number} mode - 0: off, 1: 1-dot, 2: 2-dot
   */
  underline(mode = 1) {
    this.buffer.push(ESC, 0x2d, mode); // ESC - n
    return this;
  }

  /**
   * Set double-height text
   * @param {boolean} enabled
   */
  doubleHeight(enabled) {
    if (enabled) {
      this.buffer.push(ESC, 0x21, 0x10); // ESC ! 0x10
    } else {
      this.buffer.push(ESC, 0x21, 0x00); // ESC ! 0x00
    }
    return this;
  }

  /**
   * Set double-width text
   * @param {boolean} enabled
   */
  doubleWidth(enabled) {
    if (enabled) {
      this.buffer.push(ESC, 0x21, 0x20); // ESC ! 0x20
    } else {
      this.buffer.push(ESC, 0x21, 0x00); // ESC ! 0x00
    }
    return this;
  }

  /**
   * Set font size (combining width and height)
   * @param {number} width - 1-8
   * @param {number} height - 1-8
   */
  fontSize(width = 1, height = 1) {
    const n = ((width - 1) << 4) | (height - 1);
    this.buffer.push(GS, 0x21, n); // GS ! n
    return this;
  }

  /**
   * Print horizontal line using characters
   * @param {number} width - Number of characters
   * @param {string} char - Character to use
   */
  horizontalLine(width = 48, char = "-") {
    this.text(char.repeat(width));
    this.lineFeed();
    return this;
  }

  /**
   * Cut paper (partial cut)
   */
  cut() {
    this.lineFeed(3);
    this.buffer.push(GS, 0x56, 0x01); // GS V 1 (partial cut)
    return this;
  }

  /**
   * Full cut paper
   */
  fullCut() {
    this.lineFeed(3);
    this.buffer.push(GS, 0x56, 0x00); // GS V 0 (full cut)
    return this;
  }

  /**
   * Open cash drawer
   * @param {number} pin - Drawer pin (2 or 5)
   */
  openCashDrawer(pin = 2) {
    const p = pin === 5 ? 1 : 0;
    this.buffer.push(ESC, 0x70, p, 0x19, 0x78); // ESC p m t1 t2
    return this;
  }

  /**
   * Add beep sound
   * @param {number} times - Number of beeps
   */
  beep(times = 1) {
    this.buffer.push(ESC, 0x42, times, 0x05); // ESC B n t
    return this;
  }

  /**
   * Get the buffer as Uint8Array
   * @returns {Uint8Array}
   */
  build() {
    return new Uint8Array(this.buffer);
  }

  /**
   * Clear the buffer
   */
  clear() {
    this.buffer = [];
    return this;
  }
}

/**
 * Build ESC/POS commands from receipt data
 * @param {Object} receiptData - Receipt data from receiptBuilder
 * @param {Object} options - Printer options
 * @returns {Uint8Array} ESC/POS command bytes
 */
export function buildReceiptCommands(receiptData, options = {}) {
  const { paperWidth = 48, cutPaper = true, openDrawer = false } = options;

  const builder = new EscPosBuilder();
  builder.initialize();

  // Store header (centered, bold)
  builder.align("center");
  builder.bold(true);
  builder.fontSize(2, 2);
  builder.text(receiptData.storeHeader.name.toUpperCase());
  builder.lineFeed();
  builder.fontSize(1, 1);
  builder.bold(false);

  if (receiptData.storeHeader.address) {
    builder.text(receiptData.storeHeader.address);
    builder.lineFeed();
  }
  if (receiptData.storeHeader.phone) {
    builder.text(`Tel: ${receiptData.storeHeader.phone}`);
    builder.lineFeed();
  }

  builder.lineFeed();
  builder.horizontalLine(paperWidth, "=");

  // Order info (left aligned)
  builder.align("left");
  builder.text(`Order #: ${receiptData.orderNumber}`);
  builder.lineFeed();
  builder.text(`Date: ${receiptData.dateTime}`);
  builder.lineFeed();
  builder.text(`Cashier: ${receiptData.cashier}`);
  builder.lineFeed();
  if (receiptData.customer) {
    builder.text(`Customer: ${receiptData.customer}`);
    builder.lineFeed();
  }
  builder.horizontalLine(paperWidth, "-");

  // Items
  for (const item of receiptData.items) {
    builder.bold(true);
    builder.text(truncate(item.name, paperWidth));
    builder.lineFeed();
    builder.bold(false);

    const qtyPrice = `  ${item.quantity}x @ Rp ${Math.round(item.unitPrice).toLocaleString("id-ID")}`;
    const lineTotal = `Rp ${Math.round(item.lineTotal).toLocaleString("id-ID")}`;
    builder.text(alignColumns(qtyPrice, lineTotal, paperWidth));
    builder.lineFeed();

    if (item.discountAmount > 0) {
      const discountText = `  Discount`;
      const discountAmount = `-Rp ${Math.round(item.discountAmount).toLocaleString("id-ID")}`;
      builder.text(alignColumns(discountText, discountAmount, paperWidth));
      builder.lineFeed();
    }
  }

  builder.horizontalLine(paperWidth, "-");

  // Totals
  builder.text(
    alignColumns(
      "Subtotal",
      `Rp ${Math.round(receiptData.subtotal).toLocaleString("id-ID")}`,
      paperWidth,
    ),
  );
  builder.lineFeed();

  if (receiptData.discount) {
    builder.text(
      alignColumns(
        "Discount",
        `-Rp ${Math.round(receiptData.discount).toLocaleString("id-ID")}`,
        paperWidth,
      ),
    );
    builder.lineFeed();
  }

  if (receiptData.tax) {
    builder.text(
      alignColumns(
        "Tax",
        `Rp ${Math.round(receiptData.tax).toLocaleString("id-ID")}`,
        paperWidth,
      ),
    );
    builder.lineFeed();
  }

  builder.horizontalLine(paperWidth, "=");

  // Grand total (bold, larger)
  builder.bold(true);
  builder.fontSize(1, 2);
  builder.text(
    alignColumns(
      "TOTAL",
      `Rp ${Math.round(receiptData.total).toLocaleString("id-ID")}`,
      paperWidth,
    ),
  );
  builder.lineFeed();
  builder.fontSize(1, 1);
  builder.bold(false);

  builder.horizontalLine(paperWidth, "=");

  // Payment info
  for (const payment of receiptData.payments) {
    builder.text(
      alignColumns(
        payment.method,
        `Rp ${Math.round(payment.amount).toLocaleString("id-ID")}`,
        paperWidth,
      ),
    );
    builder.lineFeed();
  }

  if (receiptData.change) {
    builder.bold(true);
    builder.text(
      alignColumns(
        "Change",
        `Rp ${Math.round(receiptData.change).toLocaleString("id-ID")}`,
        paperWidth,
      ),
    );
    builder.lineFeed();
    builder.bold(false);
  }

  // Footer
  builder.lineFeed();
  builder.align("center");
  builder.text("Thank you for your purchase!");
  builder.lineFeed();
  builder.text("Please come again");
  builder.lineFeed(2);

  // Cut paper if enabled
  if (cutPaper) {
    builder.cut();
  }

  // Open cash drawer if enabled
  if (openDrawer) {
    builder.openCashDrawer();
  }

  return builder.build();
}

// Helper functions
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function alignColumns(left, right, width) {
  const space = width - left.length - right.length;
  if (space <= 0)
    return left.substring(0, width - right.length - 1) + " " + right;
  return left + " ".repeat(space) + right;
}
