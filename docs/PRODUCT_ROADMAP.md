# NEST — Product Roadmap (derived from PRODUCT_RESEARCH.md)

**Prepared:** 2026-07-18 · **Basis:** competitive research of 2026-07-18 (see `docs/PRODUCT_RESEARCH.md`).
**Product today:** React SPA + Express API · profiles (interests, languages, university) · swipe discovery with compatibility % · matches + 1:1 chat · admin-curated events with RSVP · Madrid city guide · manual admin student verification · dormant Stripe Premium (€20/month) · no communities backend, no push, no reporting/blocking.

**North-star reframe from research:** success for NEST is not "more matches" — it is **"every active member has one real plan with another verified woman this week."** Every item below serves that.

**Approval-gated capabilities (project constraint — nothing below may ship these without explicit client approval):** communities backend · group chat · live location · public user-created events · push notifications · calendar sync · Spotify integration · contact access · payment changes · native app · AI-generated messaging · facial recognition. Items touching these are marked **⚠️ APPROVAL REQUIRED**.

---

## A — Immediate UX wins
*Existing architecture and data only. No new backend, no schema changes, low risk, mobile-first.*

**A1. Show "why you two" instead of a bare percentage**
Compatibility % is opaque; research shows interest-first framing (new Bumble BFF, Pie, Timeleft) beats photo-first judging. Render 2–3 chips under each discovery card and on the match screen from data we already have: shared interests, shared languages, "also new to Madrid" (from account recency). Photos stay, but reasons lead. *Effort: S.*

**A2. Tap-to-edit icebreakers from shared context**
Fizzling chats are the #1 category complaint. In empty chats, offer 3 suggested openers assembled from a static, admin-editable template bank filled with the pair's real shared data ("You both listed hiking — best escape from the city so far?"). The member always edits and sends herself. **Never auto-send, never impersonate; no AI generation (that would require approval).** *Effort: S.*

**A3. "Today's introductions" — a small batch with a warm stop**
Counter swipe fatigue: present a limited daily set of profiles, then end the deck deliberately ("That's everyone for today — see who's going to Thursday's picnic") linking to events. Client-side cap; no infinite queue, no scarcity countdown. *Effort: S.*

**A4. One-tap "suggest a spot" inside chat**
Move chats toward real plans. A button in chat opens the existing city guide as a picker; selecting a café/park inserts an editable message ("Want to check out [spot] this week?"). Uses guide data already in the app. *Effort: S–M.*

**A5. Shared-event context on matches**
If two members RSVP'd to the same event, say so in discovery and chat ("You're both going to Sunday's brunch"). Event pages show attendee count and a few verified-member avatars rather than a full public roster. Uses existing RSVP data, read client-side. *Effort: S.*

**A6. Post-event "say hi" moment**
After an event's end time, attendees see a gentle prompt: "Met someone at [event]? Send a hello while it's fresh," listing her matches who also RSVP'd. Keeps momentum without new data collection. *Effort: S.*

**A7. Quiet archive + revive for stale chats**
No shame mechanics, no timers. Chats silent for a while sink into an "Earlier" section; each offers one-tap "restart with a new question" (from the A2 bank). *Effort: S.*

**A8. Make verification and safety visible**
NEST's manual admin verification is stronger than most competitors' selfie checks — currently invisible. Add a "Verified member" badge with a plain-language explainer, a Community Guidelines page, and a short "before you meet up" tips sheet (meet in public, tell a friend, trust your instincts) surfaced before a first meetup. Static content. *Effort: S.*

**A9. Bio prompt starters**
In the profile editor, offer optional starter prompts ("My ideal Sunday in Madrid…", "Teach me a word in your language…") that insert structured text into the existing bio field — personality without a schema change. *Effort: S.*

**A10. De-dating copy pass**
Audit all UI text against the language rules (below): warm, short, human; no romance-inflected mechanics language, no urgency, no countdown framing. Rewrite empty states to point at events, not at more swiping. *Effort: S.*

---

## B — Near-term features
*Require backend, data model, moderation, or admin work. Described here — not to be built without a green light on scope.*

### B1. Report & Block, server-enforced — the non-negotiable
- **User problem:** No recourse if someone is unsafe, fake, or unpleasant; unacceptable for a women-only product and required for user-generated-content apps under app-store policies.
- **Proposed solution:** Report (with reason categories) and block on any profile, chat, and event attendee row. Block is enforced by the API: mutual invisibility in discovery, chat, and attendee views.
- **Primary flow:** Overflow menu → Report or Block → reason → confirmation → admin queue.
- **Mobile experience:** Reachable in two taps from any profile/chat; confirmation explains what happens next.
- **Required data:** `reports` (reporter, target, reason, context ref, status), `blocks` (pair, timestamp).
- **Safety/privacy/moderation:** Reports invisible to the reported member; no retaliation surface. Define SLA for review; escalation path to removal.
- **Admin needs:** Moderation queue in admin panel (review, dismiss, warn, suspend, remove), audit trail.
- **Dependencies:** None — precedes everything else in B/C.
- **Complexity:** M · **Impact:** High · **Recommendation: build now.**

### B2. Structured profile prompts (taste & identity)
- **User problem:** Bios are thin; women have little to start a conversation from (root cause of ghosting per research).
- **Proposed solution:** Up to 3 chosen prompts with short answers, from an admin-curated list (Madrid life, tastes, quirks — personality without turning into Instagram or a dating profile). No Spotify or social imports (approval-gated; unnecessary).
- **Primary flow:** Profile edit → pick prompt → answer (max ~120 chars) → shown as cards on profile; icebreakers (A2) can reference them.
- **Mobile experience:** Swipeable prompt cards on profiles; large touch targets in editor.
- **Required data:** `prompts` catalog + `profile_prompt_answers`.
- **Safety/privacy/moderation:** Free text = moderation surface; profanity filter + report path (B1); answers reviewed via existing admin profile-verification flow.
- **Admin needs:** Prompt catalog CRUD; flagged-answer review.
- **Dependencies:** B1 preferred first.
- **Complexity:** M · **Impact:** High · **Recommendation: build now.**

### B3. Friendship-intent tags
- **User problem:** "Friend" is vague; mismatched expectations (party buddy vs. study partner) cause dead matches.
- **Proposed solution:** Optional tags on profile and as discovery filters: study sessions, gym/pilates partner, exploring Madrid, café + deep talks, language exchange, going-out crew.
- **Primary flow:** Onboarding/profile → select up to 3 → shown as chips → filter in discovery → feeds A1/A2.
- **Mobile experience:** Chip picker; filters in a bottom sheet.
- **Required data:** Fixed enum `intent_tags` + join table.
- **Safety/privacy/moderation:** Low risk (closed vocabulary — no free text). Keep wording activity-based, never romance-adjacent.
- **Admin needs:** Manage tag list.
- **Dependencies:** None.
- **Complexity:** S · **Impact:** Med–High · **Recommendation: build now.**

### B4. Plans — small member intent posts ("coffee this afternoon") — ⚠️ APPROVAL REQUIRED (public user-created events)
- **User problem:** Admin events can't cover spontaneous, small-scale needs (study session at the library, walk in Retiro today).
- **Proposed solution:** Short-lived "plans": activity, time window, area (neighborhood only, never exact address publicly), capacity 2–5. Verified members request to join; poster accepts. Auto-expires.
- **Primary flow:** Create plan → visible to verified members in feed → join requests → acceptance opens the existing 1:1 chat (or the group thread if group chat is ever approved).
- **Mobile experience:** Compose in one screen; feed card shows activity + time + area + spots left.
- **Required data:** `plans` (creator, activity type, window, area, capacity, status), `plan_requests`.
- **Safety/privacy/moderation:** Highest-risk B item: real-world meetings created by users. Mitigations: verified-members-only visibility, coarse location until accepted, report/block integration, activity-type taxonomy, admin visibility of all plans, rate limits.
- **Admin needs:** Plans dashboard, takedown, keyword flags.
- **Dependencies:** B1 mandatory; A8 tips shown before first plan.
- **Complexity:** L · **Impact:** High · **Recommendation: prototype (behind approval + safety review).**

### B5. Availability rhythms (coarse, not calendars)
- **User problem:** Chats die trying to find a time; students' schedules cluster (mornings free, exams, etc.).
- **Proposed solution:** Optional "usually free" picker (weekday mornings / afternoons / evenings / weekends). Surface overlap ("You're both weekend explorers") in A1/A2 and event suggestions. **No calendar sync** (approval-gated; unnecessary at this fidelity).
- **Primary flow:** Profile → tap free slots → overlap shown on match screens.
- **Required data:** Small bitmask per profile.
- **Safety/privacy/moderation:** Coarse patterns only; never show "free right now" (real-time presence would be a stalking vector).
- **Admin needs:** None.
- **Dependencies:** A1.
- **Complexity:** M · **Impact:** Med · **Recommendation: prototype.**

### B6. Post-event connections (opt-in continuity)
- **User problem:** Events create warm contacts that evaporate — the research's clearest retention lever (Partiful's post-event loop; Pie's repeated-exposure principle).
- **Proposed solution:** During RSVP, opt in to "be findable by other attendees for 48h after." Afterwards, opted-in attendees appear in a "From [event]" row with one-tap connect; row expires.
- **Primary flow:** RSVP (opt-in default OFF) → attend → next morning: "From last night's picnic" list → connect → normal match + chat.
- **Mobile experience:** Single horizontal row on home; clearly temporary.
- **Required data:** RSVP opt-in flag, expiring visibility window, connection events.
- **Safety/privacy/moderation:** Attendance is sensitive (who was where, when): default off, expire fast, never expose to non-attendees, exclude blocked pairs, hide exact venue in retrospect views.
- **Admin needs:** Per-event toggle; visibility into connect abuse.
- **Dependencies:** B1; A6 is the no-backend precursor.
- **Complexity:** M · **Impact:** High · **Recommendation: build after B1.**

### B7. Campus circles (university-scoped discovery, university stays private)
- **User problem:** Students want people who share their campus reality — but university is identifying data for young women and must never be public.
- **Proposed solution:** Never display university on profiles. Instead: an opt-in "show me women from my university" discovery filter; mutual-campus fact revealed only when both opted in **and** matched ("You're at the same university").
- **Primary flow:** Settings → opt in → filter available → post-match reveal.
- **Mobile experience:** One toggle + one filter chip.
- **Required data:** Existing university field + opt-in flag; server-side matching only (client never receives another member's university unless both conditions met).
- **Safety/privacy/moderation:** Enforce server-side; audit API responses so university never leaks in payloads; small universities can make "same campus" self-identifying, so require a minimum opted-in pool before the filter activates.
- **Admin needs:** University normalization (dedupe names).
- **Dependencies:** Verification accuracy of university data.
- **Complexity:** M · **Impact:** Med · **Recommendation: prototype (privacy review first).**

### B8. Meet-up check-in (safety) — server-enforced, broad location only
- **User problem:** First meetings with someone from the internet are the scariest moment; competitors now ship date-sharing and check-ins (Bumble Share Date, Tinder Share My Date).
- **Proposed solution:** Optional "I have a plan" entry: who (first name), when, neighborhood (broad only — **no live location**, which is approval-gated and not proposed). At end time: "All good?" check-in; a missed check-in prompts escalation guidance (contact a friend, local emergency info). Sharing with a trusted contact uses the phone's native share sheet (her own SMS/WhatsApp) — **no contact access** requested.
- **Primary flow:** From chat → "meeting up?" → set time + area → share summary via share sheet → post-meet check-in.
- **Mobile experience:** Two-tap setup from chat; check-in is a single notification-style banner in-app (push would require approval).
- **Required data:** `meetups` (pair, window, area, check-in status). Retention: auto-delete after short period.
- **Safety/privacy/moderation:** Position honestly as a support tool, not a guarantee; store minimal data; broad location only; clear escalation copy written with care.
- **Admin needs:** Aggregate stats only; no admin access to individual meet-up details except via reports.
- **Dependencies:** B1; A8 content.
- **Complexity:** M · **Impact:** High (trust/brand) · **Recommendation: prototype.**

### B9. Event capacity, waitlist, and reminders
- **User problem:** Small curated events need caps; no-shows (Timeleft's chronic complaint) kill vibe; people forget events without reminders.
- **Proposed solution:** Per-event capacity + ordered waitlist with auto-promotion; in-app (and email, if available) reminders day-before and day-of; easy "can't make it" release that promotes the waitlist; gentle attendance history (repeat no-shows get a kind nudge, never a public mark). **Never paid queue-jumping** (Meetup's trust failure).
- **Primary flow:** RSVP → confirmed or waitlisted → reminder → attend or release spot.
- **Required data:** Capacity, waitlist order, RSVP states, attendance flags.
- **Safety/privacy/moderation:** Attendance data handled per B6 rules.
- **Admin needs:** Set capacity, view/manage waitlist, mark attendance.
- **Dependencies:** None; pairs with A5/A6.
- **Complexity:** M · **Impact:** Med–High · **Recommendation: build now.**

---

## C — Strategic concepts
*Need validation before commitment.*

### C1. NEST Tables — a weekly curated small-group ritual
- **User problem:** 1:1 first meetings are high-pressure; big events are intimidating alone. The category's proven answer (Timeleft, Pie, 222 — all verified alive) is a curated table of 4–6 at a fixed weekly time; Timeleft already runs women-only tables in Spain.
- **Proposed solution:** Admin composes tables of 4–6 members (interests, languages, arrival date) for a set weekly slot at a vetted café; venue revealed the morning of; printed/in-app conversation cards; same-table members can reconnect via B6 mechanics.
- **Primary flow:** Opt in for this week → Thursday reveal → attend → next-day reconnect prompts.
- **Mobile experience:** One card on home: "This week's table — you're in."
- **Required data:** Weekly opt-ins, table assignments; can pilot **today** with the existing events system + manual admin curation, capacity 6.
- **Safety/privacy/moderation:** Vetted venues; admin knows composition; no-show policy from day one; budget transparency (fix Timeleft's top complaint: state price range up front).
- **Admin needs:** Composition tooling (manual first), venue list, feedback capture.
- **Dependencies:** B9 (capacity), B6 (continuity); group chat per table would need **⚠️ APPROVAL (group chat)** — optional, not required for the pilot.
- **Complexity:** L (automated) / S (manual pilot) · **Impact:** High · **Recommendation: prototype now as a manually curated event series.**

### C2. Arrival cohorts ("September in Madrid") — ⚠️ APPROVAL REQUIRED (communities backend, group chat)
- **User problem:** Loneliness peaks in weeks 1–3 of each semester; ESN/Citylife capture this moment with welcome programming, NEST doesn't yet.
- **Proposed solution:** Semester-timed cohorts grouping newly verified members (arrival window + neighborhood zone + languages) into a temporary, admin-moderated space with a first-weeks checklist (city guide tie-in) and 2–3 dedicated events; dissolves after ~6 weeks into normal discovery.
- **Required data:** Arrival date, cohort membership; communities/group infrastructure.
- **Safety/privacy/moderation:** Moderated space with admin presence; time-boxing limits moderation load; cohort membership reveals arrival recency — keep visibility internal to the cohort.
- **Admin needs:** Cohort creation calendar, moderation, content templates.
- **Dependencies:** B1; approval for communities backend + group chat; calendar-sync not needed.
- **Complexity:** L · **Impact:** High (September window) · **Recommendation: research now, decide by early August 2026 to catch the September intake — pilot possible without chat using events + B6 only.**

### C3. Interest circles (small moderated groups) — ⚠️ APPROVAL REQUIRED (communities backend, group chat)
- **User problem:** Interests (hiking, K-dramas, pilates) need a persistent home; groups are the category's retention engine (Geneva → Bumble BFF Groups).
- **Proposed solution:** Admin-created circles capped at ~8–12 verified members with a lightweight thread and a recurring linked event; membership by request. Explicitly *not* open user-created communities.
- **Safety/privacy/moderation:** Group chat multiplies moderation surface (Geneva's operational lesson); requires reporting per-message (B1 extension), admin moderators, and conduct norms per circle.
- **Admin needs:** Circle CRUD, membership approval, moderation tooling — significant standing workload.
- **Dependencies:** B1, B2; approval; moderation capacity.
- **Complexity:** XL · **Impact:** Med–High · **Recommendation: research further — revisit after C1 proves group demand; do not build first.**

### C4. Neighborhood layer (Madrid-local relevance)
- **User problem:** Madrid is big; a friend across the city is a friend you never see. Students cluster (Moncloa, Malasaña, Argüelles, Ciudad Universitaria…).
- **Proposed solution:** Coarse barrio/zone tags (self-selected, never GPS) on profiles, guide spots, events, and plans; "near your area" as a soft discovery boost and guide filter. **No live location** (approval-gated; not proposed).
- **Required data:** Fixed zone taxonomy; zone field on profiles/guide/events.
- **Safety/privacy/moderation:** Zone granularity must stay broad (district-level) so it never approximates an address.
- **Admin needs:** Tag guide spots and events by zone.
- **Dependencies:** None hard; enriches A1, B4, C1.
- **Complexity:** M · **Impact:** Med · **Recommendation: prototype after A-track ships.**

### C5. Madrid ecosystem partnerships (ESN sections, Citylife, GGI, universities)
- **User problem:** Trust and distribution are expensive to build alone; the offline ecosystem already owns the arrival moment.
- **Proposed solution:** Explore: cross-promotion at welcome fairs; verification assists (university enrollment checks); a NEST women-only corner within larger partner events; guide content swaps. NEST's differentiation (women-only, verified, curated small formats) is complementary, not competitive.
- **Safety/privacy/moderation:** Never share member data with partners; partnership means promotion and programming, not data flows.
- **Admin needs:** Partnership ownership (client-side, non-engineering).
- **Complexity:** S (product) · **Impact:** Med–High (acquisition/trust) · **Recommendation: research further — client conversation, before September.**

### C6. Premium value redesign — ⚠️ APPROVAL REQUIRED (payment changes)
- **User problem:** €20/month is above typical student discretionary spend for a social app, and research shows members punish paywalled *belonging* (Meetup backlash); Timeleft succeeds charging for *logistics done for you*.
- **Proposed solution (research only):** Investigate anchoring Premium to concrete services (priority at capacity-limited tables/events — as extra capacity, never queue-jumping over free members; guide extras; multi-city later) and student-friendly price points/semester passes. No numbers proposed without validation; Stripe stays dormant meanwhile.
- **Safety/privacy/moderation:** Safety features must never be Premium-gated.
- **Dependencies:** C1 traction data; explicit client approval for any payment change.
- **Complexity:** M · **Impact:** Med · **Recommendation: research further (pricing interviews with target members).**

---

## Approval matrix (project constraints)

| Gated capability | Where it appears | Status |
|---|---|---|
| Communities backend | C2, C3 | Proposed — **pending explicit approval**; not before B1 |
| Group chat | C1 (optional), C2, C3 | Proposed — **pending explicit approval** |
| Live location | — | **Not proposed.** B8/C4 use static, broad areas only |
| Public user-created events | B4 (Plans) | Proposed — **pending explicit approval** + safety review |
| Push notifications | Reminders (B9), check-ins (B8) would benefit | **Not proposed yet**; in-app/email first; raise separately |
| Calendar sync | — | **Not proposed** (B5 coarse availability instead) |
| Spotify integration | — | **Not proposed** (B2 prompts cover taste) |
| Contact access | — | **Not proposed** (native share sheet instead, B8) |
| Payment changes | C6 | Research only — **pending explicit approval** |
| Native app | — | **Not proposed**; mobile-web first, revisit with push decision |
| AI-generated messaging | — | **Not proposed.** A2/B2 icebreakers are static templates the member edits and sends herself |
| Facial recognition | — | **Not proposed.** Verification remains manual admin review |

---

## Product language rules (applies to everything above)

Voice: clear, warm, confident, contemporary; short sentences; human, never gushing. No dating vocabulary or mechanics-flavored urgency. Banned outright: "soulmate", "perfect match", "your bestie is waiting", "guaranteed friends", "girls-only safe space".

| Avoid | Use instead |
|---|---|
| "It's a match! Don't miss your chance" | "You two connected. Say hi when you're ready." |
| "Find your perfect match" | "Meet women who get your Madrid." |
| "Don't keep her waiting!" | "Pick it back up whenever suits you." |
| "Girls-only safe space" | "A verified community of women, reviewed by a real person." |
| "Swipe to find your bestie" | "A few introductions each day — see who you'd grab a coffee with." |
| "Your dream friend is out there" | "Good friendships start with one small plan." |

---

## Suggested sequence (no dates promised)

1. **Now:** A1–A10 · B1 (report/block + moderation queue) · B3 (intent tags) · B9 (capacity/waitlist/reminders).
2. **Next:** B2 (prompts) · B6 (post-event connections) · B8 (check-in) · C1 pilot as a manually curated women-only table series · C5 partnership conversations (September intake deadline).
3. **Gated / validate first:** B4 (Plans), B7 (campus circles privacy review), B5 (availability), C4 (neighborhoods), C2 (arrival cohorts — decision needed by early August for September), C3 (circles), C6 (Premium research).

Rationale in one line: ship trust (B1, A8) and "reasons to talk" (A1–A4) immediately; make events compound (B9, B6, C1) next; gate anything that creates new real-world or community surfaces behind approval and moderation capacity.

---

## Research → roadmap traceability

| Research finding (PRODUCT_RESEARCH.md) | Roadmap response |
|---|---|
| Match → chat → fizzle is the category's #1 failure (§4.1, BFF complaints) | A2, A4, A7, B2, B4, C1 |
| Winning shape = curated small group + fixed time + real venue (Timeleft/Pie/222, §3.4–3.6) | C1 Tables, B9, C2 |
| Swipe fatigue is measured and mainstream (§4.3) | A1, A3, A10 |
| Safety is now a visible product surface (§4.8) | A8, B1, B8, approval matrix |
| Post-event continuity is the retention lever (Partiful/Pie, §4.5) | A5, A6, B6 |
| Newcomer demand peaks with the academic calendar (ESN/Citylife, §4.7) | C2, C5, guide content in A-track |
| Monetizing access inside community destroys trust (Meetup, §3.8) | B9 design rule, C6 guardrails |
| Women-only communities in Madrid exist but lack verification/curation (GGI, §3.10) | A8 badge, C5 partnerships, overall positioning |
| Attendance/location data is sensitive (§4.12) | B6/B8/C4 privacy rules, B7 server-side enforcement |

## Open questions for the client

1. Approve which gated features to scope next (recommended order: group-chat-free C1 pilot → B4 Plans → C2 cohorts)?
2. Moderation capacity: who staffs the B1 report queue day-to-day, and in which languages (EN/ES minimum)?
3. September intake: green-light the C1 manual pilot and C5 partnership outreach in August?
4. Premium: pause promotion until C6 research, or keep the current €20/month dormant as-is?
