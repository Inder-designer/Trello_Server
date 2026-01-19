import crypto from "crypto";

export function generateBoardInviteToken(boardId: string, inviteTokenRevokedAt: Date | null, boardName: string) {
  // Generate a short random string
  const shortToken = crypto.randomBytes(8).toString("base64url");
  // Slugify the board name (replace spaces and special chars)
  const slug = boardName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Format: <shortToken>-<slug>
  return `${shortToken}-${slug}`;
}

export function verifyBoardInviteToken(token: string): { boardId: string, inviteTokenRevokedAt?: string } | null {
  // This function will need to be updated in the controller to match the new format
  // For now, just return null (actual verification will be handled in the controller)
  return null;
}

export function generateWorkspaceInviteToken(workspaceId: string) {
  // Generate a short random string with combination of workspaceId
  const shortToken = crypto.randomBytes(8).toString("base64url");
  // Slugify the workspaceId (replace spaces and special chars)
  const slug = workspaceId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Format: <shortToken>-<slug>
  return `${shortToken}-${slug}`;
}
