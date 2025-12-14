import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import {
  renderTemplate,
  orderReceiptTemplate,
  welcomeTemplate,
  passwordResetTemplate,
  lowStockAlertTemplate,
  generalNotificationTemplate,
} from "../../src/templates/emailTemplates.js";

describe("templates/emailTemplates", () => {
  describe("orderReceiptTemplate", () => {
    it("generates order receipt with items", () => {
      const data = {
        orderNumber: "ORD-001",
        customerName: "John Doe",
        totalAmount: 150.0,
        items: [
          {
            product: { name: "Product 1" },
            quantity: 2,
            unitPrice: 50,
            lineTotal: 100,
          },
          {
            product: { name: "Product 2" },
            quantity: 1,
            unitPrice: 50,
            lineTotal: 50,
          },
        ],
        orderDate: "2024-01-15",
        paymentMethod: "Cash",
      };

      const result = orderReceiptTemplate(data);

      expect(result.subject).toContain("ORD-001");
      expect(result.html).toContain("John Doe");
      expect(result.html).toContain("Product 1");
      expect(result.html).toContain("Product 2");
      expect(result.text).toContain("ORD-001");
    });
  });

  describe("welcomeTemplate", () => {
    it("generates welcome email", () => {
      const data = {
        name: "John Doe",
        username: "johndoe",
      };

      const result = welcomeTemplate(data);

      expect(result.subject).toBe("Welcome to POS System!");
      expect(result.html).toContain("John Doe");
      expect(result.html).toContain("johndoe");
      expect(result.text).toContain("johndoe");
    });
  });

  describe("passwordResetTemplate", () => {
    it("generates password reset email", () => {
      const data = {
        name: "John Doe",
        resetLink: "https://example.com/reset?token=abc123",
        expiryMinutes: 60,
      };

      const result = passwordResetTemplate(data);

      expect(result.subject).toContain("Reset");
      expect(result.html).toContain("https://example.com/reset?token=abc123");
      expect(result.html).toContain("60 minutes");
      expect(result.text).toContain("60 minutes");
    });

    it("uses default expiry when not provided", () => {
      const data = {
        name: "John Doe",
        resetLink: "https://example.com/reset",
      };

      const result = passwordResetTemplate(data);

      expect(result.html).toContain("30 minutes");
    });
  });

  describe("lowStockAlertTemplate", () => {
    it("generates low stock alert with products", () => {
      const data = {
        products: [
          {
            name: "Product 1",
            sku: "SKU-001",
            currentStock: 2,
            minimumStock: 5,
          },
          {
            name: "Product 2",
            sku: "SKU-002",
            currentStock: 1,
            minimumStock: 10,
          },
        ],
      };

      const result = lowStockAlertTemplate(data);

      expect(result.subject).toContain("Low Stock Alert");
      expect(result.html).toContain("Product 1");
      expect(result.html).toContain("SKU-001");
      expect(result.html).toContain("Product 2");
      expect(result.text).toContain("SKU-001");
    });
  });

  describe("generalNotificationTemplate", () => {
    it("generates general notification with action button", () => {
      const data = {
        title: "Test Notification",
        message: "This is a test message",
        actionUrl: "https://example.com/action",
        actionText: "View Now",
      };

      const result = generalNotificationTemplate(data);

      expect(result.subject).toBe("Test Notification");
      expect(result.html).toContain("This is a test message");
      expect(result.html).toContain("https://example.com/action");
      expect(result.html).toContain("View Now");
    });

    it("generates notification without action button", () => {
      const data = {
        title: "Simple Notification",
        message: "Just a message",
      };

      const result = generalNotificationTemplate(data);

      expect(result.subject).toBe("Simple Notification");
      expect(result.html).toContain("Just a message");
    });
  });

  describe("renderTemplate", () => {
    it("renders known template", () => {
      const result = renderTemplate("welcome", {
        name: "Test User",
        username: "testuser",
      });

      expect(result.subject).toBe("Welcome to POS System!");
    });

    it("falls back to general notification for unknown template", () => {
      const result = renderTemplate("unknown_template", {});

      expect(result.html).toContain("Notification");
      expect(result.html).toContain("This is a notification from POS System.");
    });

    it("renders user invitation template correctly", () => {
      const data = {
        businessName: "Test Busines",
        inviterName: "John Doe",
        role: "MANAGER",
        inviteLink: "https://pos.example.com/invite?token=123",
        expiryHours: 48,
      };

      const result = renderTemplate("user_invitation", data);

      expect(result.subject).toBe("You're invited to join Test Busines!");
      expect(result.html).toContain("You're Invited!");
      expect(result.html).toContain("Test Busines");
      expect(result.html).toContain("John Doe");
      expect(result.html).toContain("Manager");
      expect(result.html).toContain("https://pos.example.com/invite?token=123");
      expect(result.html).toContain("48 hours");
    });
  });
});
