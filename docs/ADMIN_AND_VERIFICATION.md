# Admin & Verification

## Roles

- Accounts carry a persistent `role: "admin" | "member"` and
  `status: "active" | "suspended"`.
- `ADMIN_EMAILS` (comma-separated env var) is the **bootstrap only**: an
  account whose email is listed becomes `role: "admin"` at sign-up or next
  login. Authorization checks read the stored role, never the email list at
  request time, and never any client-supplied flag.
- Every admin endpoint is protected server-side (`authenticateAdmin`);
  hiding UI is not relied upon. Regular users receive `403`.
- Admin decisions are recorded in an append-only `adminAudit` trail
  (admin ID, action, target, detail, timestamp — never passwords, tokens,
  payment data, or document contents).

## Verification lifecycle

```
unsubmitted ──submit──▶ pending ──admin──▶ approved
                          ▲                  (discoverable, can match)
                          │
                        resubmit
                          │
                        rejected (member sees the reason)
```

- Members submit **university + university email (+ optional note)** from
  the profile page. Submitting never verifies — it only sets `pending`.
- Only administrators approve or reject (rejection requires a reason, which
  is shown to the member; `adminNote` and reviewer identity stay internal).
- Email domain is a supporting signal for the reviewing admin, never an
  automatic decision.
- Stored per profile: status, submission timestamp, review timestamp,
  reviewing admin ID, rejection reason, internal note.
- The member is notified in-app on both outcomes.

### What pending/rejected members can do (documented product decision)

They can sign in, edit their profile, browse events, and read the city
guide. They are **excluded from discovery**, cannot be swiped on, and cannot
initiate matching (enforced in `/api/profiles` and `/api/swipe`). Rejected
members may correct their details and resubmit.

### Suspension

Admins can suspend/restore accounts. Suspension revokes all sessions,
blocks authenticated API use, and removes the member from discovery.
Admin accounts cannot be suspended or deleted from the dashboard.

## Verification documents

Document upload is intentionally **not** implemented. The current local
`uploads/` directory serves files publicly, which is unacceptable for
identity documents. Before collecting any document: private object storage
(signed URLs), authenticated access, a retention/deletion policy, and data
minimisation review are required. The text-based flow (university email +
manual review) collects the minimum data needed today.

## Admin dashboard

`Admin` tab (admin accounts only): verification queue with approve/reject +
reason, member search and filters (verification status, suspended, premium,
admins), suspend/restore, permanent deletion with confirmation, premium
status (no payment details), account source, joined and last-active dates.
