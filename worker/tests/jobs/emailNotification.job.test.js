import { resolve } from "path";
import "../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createEmailMock } from "../mocks/email.js";
import { loggerMock } from "../mocks/logger.js";

const emailMock = createEmailMock();

mock.module(
  resolve(import.meta.dir, "../../src/libs/email.js"),
  () => emailMock,
);
mock.module(resolve(import.meta.dir, "../../src/libs/logger.js"), () => ({
  default: loggerMock,
}));

// Mock email templates
mock.module(
  resolve(import.meta.dir, "../../src/templates/emailTemplates.js"),
  () => ({
    renderTemplate: (templateName, data) => ({
      subject: `Test Subject for ${templateName}`,
      html: `<p>Test HTML for ${templateName}</p>`,
      text: `Test text for ${templateName}`,
    }),
  }),
);

const { handleEmailNotificationJob } =
  await import("../../src/jobs/emailNotification.job.js?real");

describe("jobs/emailNotification", () => {
  beforeEach(() => {
    emailMock.sendEmail.mockReset?.();
    loggerMock.info.mockReset?.();
    loggerMock.error.mockReset?.();
  });

  it("sends email with template successfully", async () => {
    const payload = {
      toEmail: "test@example.com",
      templateName: "order_receipt",
      templateData: { orderNumber: "ORD-001" },
    };

    await handleEmailNotificationJob(payload);

    expect(emailMock.sendEmail.calls.length).toBe(1);
    expect(emailMock.sendEmail.calls[0][0].to).toBe("test@example.com");
    expect(emailMock.sendEmail.calls[0][0].subject).toBe(
      "Test Subject for order_receipt",
    );
    expect(loggerMock.info.calls.length).toBeGreaterThan(0);
  });

  it("sends email with custom content when no template", async () => {
    const payload = {
      toEmail: "test@example.com",
      subject: "Custom Subject",
      templateData: {
        html: "<p>Custom HTML</p>",
        text: "Custom text",
      },
    };

    await handleEmailNotificationJob(payload);

    expect(emailMock.sendEmail.calls.length).toBe(1);
    expect(emailMock.sendEmail.calls[0][0].subject).toBe("Custom Subject");
    expect(emailMock.sendEmail.calls[0][0].html).toBe("<p>Custom HTML</p>");
  });

  it("uses default content when no template or custom content", async () => {
    const payload = {
      toEmail: "test@example.com",
    };

    await handleEmailNotificationJob(payload);

    expect(emailMock.sendEmail.calls.length).toBe(1);
    expect(emailMock.sendEmail.calls[0][0].subject).toBe(
      "Notification from POS System",
    );
  });

  it("throws and logs error when email fails", async () => {
    const error = new Error("SMTP error");
    emailMock.sendEmail.mockRejectedValue(error);

    const payload = {
      toEmail: "test@example.com",
      templateName: "welcome",
      templateData: { name: "Test User" },
    };

    await expect(handleEmailNotificationJob(payload)).rejects.toThrow(
      "SMTP error",
    );
    expect(loggerMock.error.calls.length).toBeGreaterThan(0);
  });
});
