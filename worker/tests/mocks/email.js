import { createMockFn } from "./mockFn.js";

export function createEmailMock() {
  return {
    sendEmail: createMockFn(async () => ({ messageId: "mock-message-id" })),
  };
}
