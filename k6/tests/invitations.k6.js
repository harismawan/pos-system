// Invitations API Performance Tests
import http from "k6/http";
import { check, group } from "k6";
import config from "../config.js";
import { ensureAuthenticated, getAuthHeaders } from "../helpers/auth.js";
import { thinkTime, uniqueId } from "../helpers/http.js";

export function invitationsTests() {
  ensureAuthenticated();
  const headers = getAuthHeaders();
  let createdInvitationId = null;

  group("Invitations API", () => {
    // List invitations
    group("GET /invitations", () => {
      const res = http.get(`${config.baseUrl}/invitations`, { headers });
      check(res, {
        "list invitations status is 200": (r) => r.status === 200,
        "list invitations returns data": (r) => r.json().data !== undefined,
      });
      thinkTime();
    });

    // Create invitation (SKIPPED: sends email)
    /*
        group('POST /invitations', () => {
            const uniqueEmail = `k6-invite-${uniqueId()}@test.local`;
            const res = http.post(
                `${config.baseUrl}/invitations`,
                JSON.stringify({
                    email: uniqueEmail,
                    role: 'CASHIER',
                }),
                { headers }
            );
            check(res, {
                'create invitation responds': (r) => r.status === 200 || r.status === 201 || r.status === 400,
            });
            if (res.status === 200 || res.status === 201) {
                createdInvitationId = res.json().data?.id;
            }
            thinkTime();
        });
        */

    // Verify invitation (with a fake token - expected to fail)
    /*
        group('GET /invitations/verify/:token', () => {
            const res = http.get(`${config.baseUrl}/invitations/verify/fake-token-k6-test`, { headers });
            check(res, {
                'verify invitation responds': (r) => r.status === 200 || r.status === 400 || r.status === 404,
            });
            thinkTime();
        });
        */

    // Cancel invitation
    /*
        if (createdInvitationId) {
            group('DELETE /invitations/:id', () => {
                const res = http.del(`${config.baseUrl}/invitations/${createdInvitationId}`, null, { headers });
                check(res, {
                    'cancel invitation responds': (r) => r.status === 200 || r.status === 400 || r.status === 404,
                });
                thinkTime();
            });
        }
        */
  });
}

export default invitationsTests;
