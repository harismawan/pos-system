import React, { useState } from "react";
import {
  printerService,
  printReceiptBrowser,
} from "../../utils/printerService.js";
import { usePrinterStore } from "../../store/printerStore.js";

/**
 * Printer Settings Modal
 * Configure thermal printer connection and settings
 */
function PrinterSettingsModal({ isOpen, onClose }) {
  const {
    autoPrint,
    paperWidth,
    openCashDrawer,
    cutPaper,
    isConnected,
    connectionType,
    deviceName,
    setAutoPrint,
    setPaperWidth,
    setOpenCashDrawer,
    setCutPaper,
    updateConnectionStatus,
    clearConnection,
  } = usePrinterStore();

  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleConnectUSB = async () => {
    setConnecting(true);
    setError(null);
    setSuccess(null);

    const result = await printerService.connectUSB();

    if (result.success) {
      updateConnectionStatus(printerService.getStatus());
      setSuccess("USB printer connected successfully!");
    } else {
      setError(result.error);
    }

    setConnecting(false);
  };

  const handleConnectSerial = async () => {
    setConnecting(true);
    setError(null);
    setSuccess(null);

    const result = await printerService.connectSerial();

    if (result.success) {
      updateConnectionStatus(printerService.getStatus());
      setSuccess("Serial printer connected successfully!");
    } else {
      setError(result.error);
    }

    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await printerService.disconnect();
    clearConnection();
    setSuccess("Printer disconnected");
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);

    const result = await printerService.printTestPage();

    if (result.success) {
      setSuccess("Test page printed successfully!");
    } else {
      setError(result.error);
    }

    setTesting(false);
  };

  if (!isOpen) return null;

  const webUSBSupported = printerService.isWebUSBSupported();
  const webSerialSupported = printerService.isWebSerialSupported();

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        style={{ maxWidth: "480px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">🖨️ Printer Settings</h2>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Connection Status */}
          <div
            style={{
              padding: "16px",
              background: isConnected ? "var(--success-50)" : "var(--gray-50)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "20px",
              border: `1px solid ${isConnected ? "var(--success-200)" : "var(--gray-200)"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: isConnected
                    ? "var(--success-500)"
                    : "var(--gray-400)",
                }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>
                  {isConnected ? "Printer Connected" : "No Printer Connected"}
                </div>
                {isConnected && (
                  <div style={{ fontSize: "13px", color: "var(--gray-600)" }}>
                    {connectionType.toUpperCase()}
                    {deviceName && ` - ${deviceName}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div
              style={{
                padding: "12px",
                background: "var(--error-50)",
                color: "var(--error-700)",
                borderRadius: "var(--radius-lg)",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              style={{
                padding: "12px",
                background: "var(--success-50)",
                color: "var(--success-700)",
                borderRadius: "var(--radius-lg)",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {success}
            </div>
          )}

          {/* Connection Buttons */}
          {!isConnected ? (
            <div style={{ marginBottom: "24px" }}>
              <label className="form-label">Connect Printer</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className="btn-primary"
                  onClick={handleConnectUSB}
                  disabled={connecting || !webUSBSupported}
                  style={{ flex: 1, minWidth: "120px" }}
                >
                  {connecting ? "Connecting..." : "🔌 USB Printer"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleConnectSerial}
                  disabled={connecting || !webSerialSupported}
                  style={{ flex: 1, minWidth: "120px" }}
                >
                  {connecting ? "Connecting..." : "📟 Serial Printer"}
                </button>
              </div>
              {!webUSBSupported && !webSerialSupported && (
                <p
                  className="form-helper"
                  style={{ color: "var(--warning-600)" }}
                >
                  Direct printer connection not supported in this browser. Use
                  Chrome or Edge for USB/Serial printer support.
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              <button
                className="btn-success"
                onClick={handleTestPrint}
                disabled={testing}
                style={{ flex: 1 }}
              >
                {testing ? "Printing..." : "🧪 Test Print"}
              </button>
              <button
                className="btn-error"
                onClick={handleDisconnect}
                style={{ flex: 1 }}
              >
                Disconnect
              </button>
            </div>
          )}

          {/* Settings */}
          <div
            style={{
              borderTop: "1px solid var(--gray-200)",
              paddingTop: "20px",
            }}
          >
            <label className="form-label" style={{ marginBottom: "16px" }}>
              Print Settings
            </label>

            {/* Paper Width */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 400 }}>
                Paper Width
              </label>
              <select
                value={paperWidth}
                onChange={(e) => setPaperWidth(parseInt(e.target.value))}
              >
                <option value={48}>80mm (48 characters)</option>
                <option value={32}>58mm (32 characters)</option>
              </select>
            </div>

            {/* Toggle Settings */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>Auto-print receipts</div>
                  <div style={{ fontSize: "12px", color: "var(--gray-500)" }}>
                    Automatically print after order completion
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={cutPaper}
                  onChange={(e) => setCutPaper(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>Cut paper after print</div>
                  <div style={{ fontSize: "12px", color: "var(--gray-500)" }}>
                    Trigger paper cutter after printing
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={openCashDrawer}
                  onChange={(e) => setOpenCashDrawer(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>Open cash drawer</div>
                  <div style={{ fontSize: "12px", color: "var(--gray-500)" }}>
                    Open drawer when printing (if connected)
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrinterSettingsModal;
