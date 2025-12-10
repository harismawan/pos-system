/**
 * Printer Service
 * Handles WebUSB/WebSerial communication with thermal printers
 * and provides browser print fallback
 */

import { buildReceiptCommands } from "./escposCommands.js";
import { formatReceiptText } from "./receiptBuilder.js";

// Connection types
export const ConnectionType = {
  USB: "usb",
  SERIAL: "serial",
  NONE: "none",
};

/**
 * Printer Service class for managing printer connections
 */
class PrinterService {
  constructor() {
    this.device = null;
    this.port = null;
    this.connectionType = ConnectionType.NONE;
    this.writable = null;
  }

  /**
   * Check if WebUSB is supported
   */
  isWebUSBSupported() {
    return "usb" in navigator;
  }

  /**
   * Check if WebSerial is supported
   */
  isWebSerialSupported() {
    return "serial" in navigator;
  }

  /**
   * Check if any direct print method is supported
   */
  isDirectPrintSupported() {
    return this.isWebUSBSupported() || this.isWebSerialSupported();
  }

  /**
   * Check if printer is connected
   */
  isConnected() {
    return this.connectionType !== ConnectionType.NONE;
  }

  /**
   * Connect to a USB thermal printer
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async connectUSB() {
    if (!this.isWebUSBSupported()) {
      return { success: false, error: "WebUSB not supported in this browser" };
    }

    try {
      // Request device - user will see a picker dialog
      const device = await navigator.usb.requestDevice({
        filters: [
          // Common thermal printer vendor IDs
          { vendorId: 0x0416 }, // Winbond (common thermal printer)
          { vendorId: 0x0456 }, // Analog Devices
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x0dd4 }, // Custom
          { vendorId: 0x154f }, // SNBC
          { vendorId: 0x1504 }, // POS-X
          { vendorId: 0x0483 }, // STMicroelectronics (many Chinese printers)
          { vendorId: 0x1a86 }, // QinHeng Electronics (CH340 based printers)
        ],
      });

      await device.open();

      // Select configuration (usually first one)
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Find the interface for data transfer
      const interfaceNumber = this.findPrinterInterface(device);
      if (interfaceNumber === null) {
        throw new Error("Could not find printer interface");
      }

      await device.claimInterface(interfaceNumber);

      this.device = device;
      this.connectionType = ConnectionType.USB;

      return { success: true };
    } catch (error) {
      // User cancelled or error occurred
      if (error.name === "NotFoundError") {
        return { success: false, error: "No printer selected" };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect to a serial thermal printer
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async connectSerial() {
    if (!this.isWebSerialSupported()) {
      return {
        success: false,
        error: "WebSerial not supported in this browser",
      };
    }

    try {
      // Request port - user will see a picker dialog
      const port = await navigator.serial.requestPort();

      // Open with common thermal printer settings
      await port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
      });

      this.port = port;
      this.writable = port.writable;
      this.connectionType = ConnectionType.SERIAL;

      return { success: true };
    } catch (error) {
      if (error.name === "NotFoundError") {
        return { success: false, error: "No printer selected" };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Find the printer interface on a USB device
   * @param {USBDevice} device
   * @returns {number|null}
   */
  findPrinterInterface(device) {
    for (const config of device.configurations) {
      for (const iface of config.interfaces) {
        for (const alt of iface.alternates) {
          // Look for bulk out endpoint (for sending data)
          if (
            alt.endpoints.some(
              (ep) => ep.direction === "out" && ep.type === "bulk",
            )
          ) {
            return iface.interfaceNumber;
          }
        }
      }
    }
    return null;
  }

  /**
   * Find the bulk out endpoint on a USB device
   * @param {USBDevice} device
   * @returns {number|null}
   */
  findBulkOutEndpoint(device) {
    for (const config of device.configurations) {
      for (const iface of config.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === "out" && ep.type === "bulk") {
              return ep.endpointNumber;
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Disconnect from the printer
   */
  async disconnect() {
    try {
      if (this.connectionType === ConnectionType.USB && this.device) {
        await this.device.close();
        this.device = null;
      } else if (this.connectionType === ConnectionType.SERIAL && this.port) {
        if (this.writable) {
          await this.writable.close();
          this.writable = null;
        }
        await this.port.close();
        this.port = null;
      }
      this.connectionType = ConnectionType.NONE;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send data to connected printer
   * @param {Uint8Array} data - ESC/POS commands
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendData(data) {
    if (!this.isConnected()) {
      return { success: false, error: "No printer connected" };
    }

    try {
      if (this.connectionType === ConnectionType.USB) {
        const endpointNumber = this.findBulkOutEndpoint(this.device);
        if (endpointNumber === null) {
          throw new Error("Could not find bulk out endpoint");
        }
        await this.device.transferOut(endpointNumber, data);
      } else if (this.connectionType === ConnectionType.SERIAL) {
        const writer = this.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Print receipt using connected thermal printer
   * @param {Object} receiptData - Receipt data from buildReceiptData
   * @param {Object} options - Print options
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async printReceipt(receiptData, options = {}) {
    if (!this.isConnected()) {
      return { success: false, error: "No printer connected" };
    }

    const commands = buildReceiptCommands(receiptData, options);
    return this.sendData(commands);
  }

  /**
   * Print test page
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async printTestPage() {
    if (!this.isConnected()) {
      return { success: false, error: "No printer connected" };
    }

    const testData = {
      storeHeader: {
        name: "Test Print",
        address: "Printer Connection Test",
        phone: null,
      },
      orderNumber: "TEST-001",
      dateTime: new Date().toLocaleString("id-ID"),
      cashier: "System",
      customer: null,
      items: [
        {
          name: "Test Item 1",
          quantity: 1,
          unitPrice: 10000,
          discountAmount: 0,
          lineTotal: 10000,
        },
        {
          name: "Test Item 2",
          quantity: 2,
          unitPrice: 5000,
          discountAmount: 0,
          lineTotal: 10000,
        },
      ],
      subtotal: 20000,
      discount: null,
      tax: null,
      total: 20000,
      payments: [{ method: "Cash", amount: 20000 }],
      totalPaid: 20000,
      change: null,
    };

    return this.printReceipt(testData, { cutPaper: true });
  }

  /**
   * Get connection status info
   * @returns {Object}
   */
  getStatus() {
    return {
      connected: this.isConnected(),
      connectionType: this.connectionType,
      deviceName:
        this.device?.productName ||
        this.port?.getInfo?.()?.usbProductId ||
        null,
    };
  }
}

// Export singleton instance
export const printerService = new PrinterService();

/**
 * Print receipt using browser's native print dialog
 * Creates an iframe with styled receipt and triggers print
 * @param {Object} receiptData - Receipt data from buildReceiptData
 * @param {Object} options - Print options including paperWidth
 */
export function printReceiptBrowser(receiptData, options = {}) {
  const { paperWidth = 48 } = options;

  // Create receipt HTML
  const receiptHtml = generateReceiptHtml(receiptData, paperWidth);

  // Create a hidden iframe for printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "100%";
  iframe.style.bottom = "100%";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  // Write content to iframe
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(receiptHtml);
  doc.close();

  // Wait for content to load, then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      // Remove iframe after printing (with delay for print dialog)
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 100);
  };
}

/**
 * Generate HTML for browser printing
 * @param {Object} receiptData
 * @param {number} paperWidth - Paper width in characters (48 for 80mm, 32 for 58mm)
 * @returns {string}
 */
function generateReceiptHtml(receiptData, paperWidth = 48) {
  const formatCurrency = (amount) =>
    `Rp ${Math.round(amount).toLocaleString("id-ID")}`;

  // Determine paper size based on width setting
  const paperMm = paperWidth === 32 ? "58mm" : "80mm";
  const fontSize = paperWidth === 32 ? "10px" : "12px";
  const storeNameSize = paperWidth === 32 ? "14px" : "16px";

  const itemsHtml = receiptData.items
    .map(
      (item) => `
        <tr>
          <td colspan="3" style="padding-top: 8px; font-weight: 500;">${item.name}</td>
        </tr>
        <tr>
          <td style="padding-left: 12px; color: #666;">${item.quantity}x @ ${formatCurrency(item.unitPrice)}</td>
          <td></td>
          <td style="text-align: right;">${formatCurrency(item.lineTotal)}</td>
        </tr>
        ${
          item.discountAmount > 0
            ? `
        <tr>
          <td style="padding-left: 12px; color: #666;">Discount</td>
          <td></td>
          <td style="text-align: right; color: #dc2626;">-${formatCurrency(item.discountAmount)}</td>
        </tr>
        `
            : ""
        }
      `,
    )
    .join("");

  const paymentsHtml = receiptData.payments
    .map(
      (payment) => `
        <tr>
          <td>${payment.method}</td>
          <td></td>
          <td style="text-align: right;">${formatCurrency(payment.amount)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${receiptData.orderNumber}</title>
      <style>
        @page {
          size: ${paperMm} auto;
          margin: 0;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: ${fontSize};
          line-height: 1.4;
          margin: 0;
          padding: 10px;
          width: ${paperMm};
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .store-name {
          font-size: ${storeNameSize};
          font-weight: bold;
          text-transform: uppercase;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .divider-thick {
          border-top: 2px solid #000;
          margin: 8px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td {
          padding: 2px 0;
          vertical-align: top;
        }
        .total-row td {
          font-weight: bold;
          font-size: 14px;
          padding-top: 5px;
        }
        .footer {
          text-align: center;
          margin-top: 15px;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">${receiptData.storeHeader.name}</div>
        ${receiptData.storeHeader.address ? `<div>${receiptData.storeHeader.address}</div>` : ""}
        ${receiptData.storeHeader.phone ? `<div>Tel: ${receiptData.storeHeader.phone}</div>` : ""}
      </div>

      <div class="divider-thick"></div>

      <table>
        <tr><td>Order #:</td><td></td><td style="text-align: right;">${receiptData.orderNumber}</td></tr>
        <tr><td>Date:</td><td></td><td style="text-align: right;">${receiptData.dateTime}</td></tr>
        <tr><td>Cashier:</td><td></td><td style="text-align: right;">${receiptData.cashier}</td></tr>
        ${receiptData.customer ? `<tr><td>Customer:</td><td></td><td style="text-align: right;">${receiptData.customer}</td></tr>` : ""}
      </table>

      <div class="divider"></div>

      <table>
        ${itemsHtml}
      </table>

      <div class="divider"></div>

      <table>
        <tr>
          <td>Subtotal</td>
          <td></td>
          <td style="text-align: right;">${formatCurrency(receiptData.subtotal)}</td>
        </tr>
        ${receiptData.discount ? `<tr><td>Discount</td><td></td><td style="text-align: right; color: #dc2626;">-${formatCurrency(receiptData.discount)}</td></tr>` : ""}
        ${receiptData.tax ? `<tr><td>Tax</td><td></td><td style="text-align: right;">${formatCurrency(receiptData.tax)}</td></tr>` : ""}
      </table>

      <div class="divider-thick"></div>

      <table>
        <tr class="total-row">
          <td>TOTAL</td>
          <td></td>
          <td style="text-align: right;">${formatCurrency(receiptData.total)}</td>
        </tr>
      </table>

      <div class="divider-thick"></div>

      <table>
        ${paymentsHtml}
        ${receiptData.change ? `<tr><td style="font-weight: bold;">Change</td><td></td><td style="text-align: right; font-weight: bold;">${formatCurrency(receiptData.change)}</td></tr>` : ""}
      </table>

      <div class="footer">
        <p>Thank you for your purchase!</p>
        <p>Please come again</p>
      </div>
    </body>
    </html>
  `;
}

export default printerService;
