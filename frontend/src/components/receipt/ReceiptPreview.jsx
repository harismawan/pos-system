import React from "react";

/**
 * Receipt Preview Component
 * Displays a styled receipt for preview and browser printing
 */
function ReceiptPreview({ receiptData, style = {} }) {
  if (!receiptData) return null;

  const formatCurrency = (amount) =>
    `Rp ${Math.round(amount).toLocaleString("id-ID")}`;

  return (
    <div className="receipt-preview" style={style}>
      {/* Store Header */}
      <div className="receipt-header">
        <div className="receipt-store-name">{receiptData.storeHeader.name}</div>
        {receiptData.storeHeader.address && (
          <div className="receipt-store-address">
            {receiptData.storeHeader.address}
          </div>
        )}
        {receiptData.storeHeader.phone && (
          <div className="receipt-store-phone">
            Tel: {receiptData.storeHeader.phone}
          </div>
        )}
      </div>

      <div className="receipt-divider-thick" />

      {/* Order Info */}
      <div className="receipt-order-info">
        <div className="receipt-row">
          <span>Order #:</span>
          <span>{receiptData.orderNumber}</span>
        </div>
        <div className="receipt-row">
          <span>Date:</span>
          <span>{receiptData.dateTime}</span>
        </div>
        <div className="receipt-row">
          <span>Cashier:</span>
          <span>{receiptData.cashier}</span>
        </div>
        {receiptData.customer && (
          <div className="receipt-row">
            <span>Customer:</span>
            <span>{receiptData.customer}</span>
          </div>
        )}
      </div>

      <div className="receipt-divider" />

      {/* Items */}
      <div className="receipt-items">
        {receiptData.items.map((item, index) => (
          <div key={index} className="receipt-item">
            <div className="receipt-item-name">{item.name}</div>
            <div className="receipt-row">
              <span className="receipt-item-qty">
                {item.quantity}x @ {formatCurrency(item.unitPrice)}
              </span>
              <span>{formatCurrency(item.lineTotal)}</span>
            </div>
            {item.discountAmount > 0 && (
              <div className="receipt-row receipt-discount">
                <span>Discount</span>
                <span>-{formatCurrency(item.discountAmount)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="receipt-divider" />

      {/* Totals */}
      <div className="receipt-totals">
        <div className="receipt-row">
          <span>Subtotal</span>
          <span>{formatCurrency(receiptData.subtotal)}</span>
        </div>
        {receiptData.discount && (
          <div className="receipt-row receipt-discount">
            <span>Discount</span>
            <span>-{formatCurrency(receiptData.discount)}</span>
          </div>
        )}
        {receiptData.tax && (
          <div className="receipt-row">
            <span>Tax</span>
            <span>{formatCurrency(receiptData.tax)}</span>
          </div>
        )}
      </div>

      <div className="receipt-divider-thick" />

      {/* Grand Total */}
      <div className="receipt-row receipt-total">
        <span>TOTAL</span>
        <span>{formatCurrency(receiptData.total)}</span>
      </div>

      <div className="receipt-divider-thick" />

      {/* Payment */}
      <div className="receipt-payments">
        {receiptData.payments.map((payment, index) => (
          <div key={index} className="receipt-row">
            <span>{payment.method}</span>
            <span>{formatCurrency(payment.amount)}</span>
          </div>
        ))}
        {receiptData.change && (
          <div className="receipt-row receipt-change">
            <span>Change</span>
            <span>{formatCurrency(receiptData.change)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="receipt-footer">
        <p>Thank you for your purchase!</p>
        <p>Please come again</p>
      </div>
    </div>
  );
}

export default ReceiptPreview;
