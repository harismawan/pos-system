/**
 * Invitations service - User invitation management
 * Handles creating, sending, and accepting user invitations
 */

import crypto from "crypto";
import prisma from "../../libs/prisma.js";
import bcrypt from "bcryptjs";
import {
  normalizePagination,
  buildPaginationMeta,
} from "../../libs/pagination.js";
import { enqueueEmailNotificationJob } from "../../libs/jobs.js";

const SALT_ROUNDS = 12;
const INVITATION_EXPIRY_HOURS = 72; // 3 days

/**
 * Generate a secure invitation token
 */
function generateInvitationToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create and send a user invitation
 */
export async function createInvitation({
  email,
  role,
  businessId,
  invitedBy,
  frontendUrl = "http://localhost:5173",
}) {
  // Check if business exists
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    const error = new Error("Business not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if email already has a user account
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    const error = new Error("User with this email already exists");
    error.statusCode = 400;
    throw error;
  }

  // Check for pending invitation to same email
  const existingInvitation = await prisma.userInvitation.findFirst({
    where: {
      email: email.toLowerCase(),
      businessId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    const error = new Error("Pending invitation already exists for this email");
    error.statusCode = 400;
    throw error;
  }

  // Generate token and expiry
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  // Create invitation
  const invitation = await prisma.userInvitation.create({
    data: {
      email: email.toLowerCase(),
      businessId,
      role,
      token,
      invitedBy,
      expiresAt,
    },
    include: {
      business: { select: { name: true } },
      inviter: { select: { name: true } },
    },
  });

  // Send invitation email
  const inviteLink = `${frontendUrl}/accept-invitation?token=${token}`;

  enqueueEmailNotificationJob({
    toEmail: email,
    templateName: "user_invitation",
    templateData: {
      businessName: business.name,
      inviterName: invitation.inviter.name,
      role: role,
      inviteLink: inviteLink,
      expiryHours: INVITATION_EXPIRY_HOURS,
    },
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    businessName: invitation.business.name,
  };
}

/**
 * Get pending invitations for a business
 */
export async function getInvitations({ page, limit, businessId }) {
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const {
    page: pageNum,
    limit: limitNum,
    skip,
  } = normalizePagination({ page, limit });

  const where = {
    businessId,
    acceptedAt: null,
  };

  const [invitations, total] = await Promise.all([
    prisma.userInvitation.findMany({
      where,
      include: {
        inviter: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.userInvitation.count({ where }),
  ]);

  // Add status to each invitation
  const invitationsWithStatus = invitations.map((inv) => ({
    ...inv,
    status: inv.expiresAt < new Date() ? "EXPIRED" : "PENDING",
  }));

  return {
    invitations: invitationsWithStatus,
    pagination: buildPaginationMeta(total, pageNum, limitNum),
  };
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(id, businessId) {
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { id },
  });

  if (!invitation || invitation.businessId !== businessId) {
    const error = new Error("Invitation not found");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.acceptedAt) {
    const error = new Error("Invitation has already been accepted");
    error.statusCode = 400;
    throw error;
  }

  await prisma.userInvitation.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * Verify invitation token (public endpoint)
 */
export async function verifyInvitationToken(token) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: {
      business: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    const error = new Error("Invalid invitation link");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.acceptedAt) {
    const error = new Error("Invitation has already been used");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.expiresAt < new Date()) {
    const error = new Error("Invitation has expired");
    error.statusCode = 400;
    throw error;
  }

  return {
    email: invitation.email,
    role: invitation.role,
    businessId: invitation.business.id,
    businessName: invitation.business.name,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Accept invitation and create user account (public endpoint)
 */
export async function acceptInvitation({
  token,
  name,
  username,
  password,
  phone,
}) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: {
      business: true,
    },
  });

  if (!invitation) {
    const error = new Error("Invalid invitation link");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.acceptedAt) {
    const error = new Error("Invitation has already been used");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.expiresAt < new Date()) {
    const error = new Error("Invitation has expired");
    error.statusCode = 400;
    throw error;
  }

  // Check username uniqueness
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) {
    const error = new Error("Username already exists");
    error.statusCode = 400;
    throw error;
  }

  // Check email uniqueness (should not happen but safety check)
  const existingEmail = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  if (existingEmail) {
    const error = new Error("Email already has an account");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user and mark invitation as accepted in a transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        businessId: invitation.businessId,
        name,
        username,
        email: invitation.email,
        phone: phone || null,
        passwordHash,
        role: invitation.role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        business: { select: { name: true } },
      },
    });

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return newUser;
  });

  return {
    user,
    businessName: user.business.name,
  };
}

/**
 * Resend invitation email
 */
export async function resendInvitation(
  id,
  businessId,
  frontendUrl = "http://localhost:5173",
) {
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { id },
    include: {
      business: { select: { name: true } },
      inviter: { select: { name: true } },
    },
  });

  if (!invitation || invitation.businessId !== businessId) {
    const error = new Error("Invitation not found");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.acceptedAt) {
    const error = new Error("Invitation has already been accepted");
    error.statusCode = 400;
    throw error;
  }

  // Extend expiry
  const newExpiresAt = new Date();
  newExpiresAt.setHours(newExpiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  await prisma.userInvitation.update({
    where: { id },
    data: { expiresAt: newExpiresAt },
  });

  // Send email
  const inviteLink = `${frontendUrl}/accept-invitation?token=${invitation.token}`;

  enqueueEmailNotificationJob({
    toEmail: invitation.email,
    templateName: "user_invitation",
    templateData: {
      businessName: invitation.business.name,
      inviterName: invitation.inviter.name,
      role: invitation.role,
      inviteLink: inviteLink,
      expiryHours: INVITATION_EXPIRY_HOURS,
    },
  });

  return { success: true, expiresAt: newExpiresAt };
}
