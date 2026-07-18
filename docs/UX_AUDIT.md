# NEST — Mobile-First UX Audit

**Date:** 2026-07-18 · **Method:** live audit of the running app in a desktop browser with device emulation (320×568, 375×812 primary; spot checks at wider sizes), programmatic measurement (tap-target sizes, scroll overflow, focus-ring clipping geometry, WCAG contrast of the token pairs), and full keyboard navigation of onboarding. Screens audited: welcome/onboarding (all 3 steps + login), discovery, matches list, chat, events, city guide, profile editor (including verification and account sections), admin dashboard, communities placeholder.

**Tags:** `FIXED-NOW` (fixed this session) · `POLISH-NOW` (safe, fixed this session) · `NEXT` (recommend next session) · `STRATEGIC` (needs product validation — see PRODUCT_ROADMAP.md).

| # | Problem | Evidence | Severity | Mobile impact | Solution | Effort | Risk | Status |
|---|---------|----------|----------|---------------|----------|--------|------|--------|
| 1 | Focus rings/borders clipped on the left of onboarding fields | Measured: scrollport `overflow-x` computed to `auto` with 0 left padding; ring room = 0px | High | Keyboard/switch users lose focus visibility; borders look broken | Widen scrollports with matched negative margin + padding (root cause), applied to all 5 affected scrollers | S | Low | `FIXED-NOW` |
| 2 | 70px horizontal page scroll on onboarding at 375px | Measured `scrollWidth − clientWidth = 70` | High | Page wobbles sideways while typing | Contain decorative blur circles in a clipped layer | S | Low | `FIXED-NOW` |
| 3 | Country dropdown opens below the fold inside the step scroller | Panel bottom exceeded scrollport by ~160px | Med | Looks like the button did nothing | Scroll trigger to top on open (`scrollIntoView`) | S | Low | `FIXED-NOW` |
| 4 | iOS auto-zoom on focus (inputs are 12px) | All inputs `text-xs` < 16px | Med | Viewport jumps on every field | `maximum-scale=1` viewport cap (iOS still allows pinch); long-term: raise base input size | S | Low | `FIXED-NOW` (mitigation) |
| 5 | Chip-remove targets 8×15px (nationalities/languages) | Measured on profile editor + onboarding | High | Nearly impossible to tap; deletes neighbor chips | Invisible hit-area extension (`p-2 -m-1.5`) + `aria-label="Remove"` | S | Low | `FIXED-NOW` |
| 6 | Header "Sign out" 66×29px; filter chips 29–30px tall (admin, city); photo/language action buttons 27–28px | Programmatic sweep across all 6 tabs | Med | Frequent mis-taps on dense controls | Padding bumps + invisible hit-area extensions; nav bar already ≥44px | S | Low | `FIXED-NOW` |
| 7 | Unlabeled icon-only close buttons (events form/modal) | 29×29px `<X>` buttons with no `aria-label`, dead `hover:` state | Med | Screen readers announce nothing | `aria-label="Close"`, working hover, larger padding | S | Low | `FIXED-NOW` |
| 8 | Dark theme existed only as tokens; static plum text would be illegible on dark | `text-slate-900` = #570e3a on #1a0922 | High | Night reading impossible | Full semantic-token migration + theme control (see commit) | L | Med | `FIXED-NOW` |
| 9 | Dark destructive button text below AA | Measured 3.43:1 (white on #ff2876) | Med | Delete/reject labels hard to read at night | Dark berry foreground, 5.3:1, mirrors primary pairing | S | Low | `FIXED-NOW` |
| 10 | Random avatar background can collide with header (light-on-light "V" chip) | Seen with a synthetic account; `avatarColor` is random hex at signup | Low | Avatar initial occasionally invisible | Derive avatar color from a curated brand palette instead of random hex | S | Low | `NEXT` |
| 11 | Admin tables rely on horizontal scroll at 320px | Members table needs side-scroll on phones | Med | Approve/reject workable (cards) but member management is cramped | Card-based row alternative under `md:`; keep table on desktop | M | Low | `NEXT` |
| 12 | 12px base type is dense for sunlight readability | Design-wide `text-xs` body copy | Med | Squinting outdoors; accessibility | Gradual type-scale lift (13–14px body) as a deliberate design pass, not a mechanical sweep | M | Med | `NEXT` |
| 13 | Compatibility % is opaque; no "why her" | Discovery card shows bare number | Med | Weak decision support where it matters most | "Why you two" chips from shared interests/languages | S–M | Low | `NEXT` (roadmap A1) |
| 14 | Empty chats have no conversation support | Blank thread after match | Med | The category's #1 fizzle point | Tap-to-edit icebreakers from shared context (never auto-sent) | S–M | Low | `NEXT` (roadmap A2) |
| 15 | No report/block anywhere | — | High (product) | Trust gap for a women-only app; app-store requirement | Server-enforced report/block + admin queue | M | Med | `STRATEGIC` (roadmap B1 — build first) |
| 16 | Deck can exhaust with a hard stop and no bridge | Empty discovery state | Low | Dead end | Warm end-of-deck state pointing at events | S | Low | `NEXT` (roadmap A3) |
| 17 | Events lack capacity/waitlist/reminder mechanics | Only max-participants hard stop exists | Med | No-shows and forgetting | Roadmap B9 | M | Med | `STRATEGIC` |
| 18 | Safe-area handling present but untested on real notched hardware | `viewport-fit=cover` + env() paddings in place | Low | Possible inset quirks on real devices | Real-device pass (iPhone SE/15, Android gesture nav) before nestspain.com launch | S | Low | `NEXT` |

## Round 2 — defects reported from real production use (2026-07-19)

Reported by the client after the first members joined; all five fixed and verified in the browser.

| # | Problem | Root cause | Fix | Status |
|---|---------|-----------|-----|--------|
| 19 | "Dismiss" never removed the match notification | The banner rendered from the full notification history; marking all read refetched the same rows, so `length > 0` stayed true | Client keeps unread notifications only, cleared optimistically | `FIXED` |
| 20 | Bottom navigation cut through the middle of the chat/outing view | Shell was `min-h-screen` with a `sticky bottom-0` nav: any view taller than the viewport scrolled *under* the bar | Shell is one viewport tall (`100dvh`), the tab panel is the only scrolling region, the planner is an overlay inside the chat card. Page scroll measured at 0px | `FIXED` |
| 21 | Outing planner "did nothing" and was too complex | It was never wired: `onSuggestPlan={() => {}}`, `plans={[]}`. The UI was a decorative map with fictional coordinates | Real plans API (propose / accept / decline, persisted, authorized, notified) plus a three-step flow: what → where → when, with a free-text place fallback | `FIXED` |
| 22 | Verification appeared to do nothing | "Start verification" only switched tabs; the form sat far below the fold on a long profile page | Informative banner (no longer a wall) that scrolls the verification card into view and highlights it | `FIXED` |
| 23 | Discovery felt empty | Only admin-approved members were discoverable | Every active member is discoverable and matchable; the badge remains the trust signal, suspended accounts stay out (see trade-off below) | `FIXED` |

**Trade-off recorded:** discovery no longer requires approval, so an unverified member can be seen and matched. Verification still gates the Verified Student badge and admins still review everyone; suspended accounts are excluded everywhere. Reverting is a one-line filter change in `/api/profiles` plus the matching guard. Report/block (roadmap B1) becomes more important with this rule in place.

**Location handling in the planner:** places are ranked by the members' university area first; the optional "Near me" button reads the device position through the browser, uses it only to order public neighbourhoods, and never stores or transmits it. No member's position is ever shared with another member.

**Verified clean this session:** no horizontal overflow on any tab at 320/375px (measured after fixes); keyboard focus fully visible through onboarding; light/dark contrast of all core token pairs ≥ 4.5:1 for text (primary-on-background 4.1:1 is reserved for large text/controls); bottom navigation ≥ 44px targets; reduced-motion respected globally.

**Testing gap to close before public launch:** this audit ran in emulation. A physical-device pass (iOS Safari + Android Chrome, portrait/landscape, slow 4G) is the remaining step the brief's device matrix expects; nothing found here suggests structural surprises.
