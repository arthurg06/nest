// Message-ownership check for chat rendering. The server stores real user
// IDs on every message, so ownership must be derived from the authenticated
// user's ID — never from a placeholder value.
export function isOwnMessage(senderId: string, currentUserId: string): boolean {
  return Boolean(currentUserId) && senderId === currentUserId;
}
