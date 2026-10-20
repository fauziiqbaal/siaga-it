# Authentication & Email Deliverability Guide: Preventing OTP Spam

This guide outlines the exact technical standards required to ensure transactional emails (OTP, password resets, verification codes) achieve **99%+ inbox placement** and never land in the recipient's SPAM/Junk folder.

---

## 1. The Core Culprits Behind OTP Emails Landing in SPAM

Since early 2024, Google (Gmail) and Yahoo enforced strict deliverability requirements for all incoming mail. If any of the following 4 conditions occur, your email will almost certainly be routed to Spam or rejected outright:
1. **Missing or Misconfigured DNS Records** (No SPF, missing DKIM cryptographic signature, or no DMARC policy).
2. **Poor IP / Domain Reputation** (Sending via generic shared hosting cPanel SMTP or standard free Gmail SMTP).
3. **High Bounce / Spam Complaint Rate** caused by lack of rate-limiting (bots abusing the forgot password form).
4. **Spam-triggering Email Templates** (Raw 6-digit text without proper HTML/text multipart, spam words, missing business identity footer).

---

## 2. Mandatory DNS Configuration (The Holy Trinity)

To send emails that Gmail and Microsoft 365 trust 100%, you must configure these 3 DNS records on your domain (e.g. `yourhotel.com`):

### A. SPF (Sender Policy Framework) - TXT Record
Declares which mail servers are authorized to send emails on behalf of your domain.
- **Name**: `@` (or root domain)
- **Type**: `TXT`
- **Value** (example for Resend): `v=spf1 include:amazonses.com ~all`

### B. DKIM (DomainKeys Identified Mail) - CNAME / TXT Record
Cryptographically signs every email header so the recipient's mail provider knows the email was not tampered with in transit.
- Generated automatically by your email service provider (Resend, Postmark, SendGrid).
- **Name**: `resend._domainkey` (example)
- **Type**: `CNAME` or `TXT`

### C. DMARC (Domain-based Message Authentication) - TXT Record
Tells receiving mail servers what to do if SPF or DKIM fails, and provides reporting. **Google now mandates DMARC for inbox placement.**
- **Name**: `_dmarc.yourhotel.com`
- **Type**: `TXT`
- **Value**:
  ```text
  v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@yourhotel.com; aspf=r; adkim=r;
  ```
  *(For initial rollout, `p=none` can be used to observe reports before moving to `p=quarantine` or `p=reject`).*

---

## 3. Recommended Email Service Providers (ESPs)

| Provider | Suitability | Why it avoids spam |
| :--- | :--- | :--- |
| **Resend** (Recommended) | React/Next.js/Vite ecosystem | Native support for React Email, exceptional reputation on transactional IP pools, clean developer API. |
| **Postmark** | Dedicated transactional mail | Strict separation between marketing mail and transactional mail; fastest inbox delivery speed in the industry. |
| **Amazon SES** | High volume enterprise | Cost-effective, requires dedicated IP setup and warm-up for maximum score. |
| ❌ *Never Use* | cPanel Webmail / Shared Host SMTP | IPs are frequently blacklisted because other shared users send spam. |

---

## 4. Anti-Abuse & Rate-Limiting Strategy

If an attacker floods your forgot-password endpoint, Gmail's AI will detect a sudden surge of identical emails from your domain and categorize your domain as a spam source.

### Prevention Measures:
1. **Frontend Cooldown Timer**: 
   - Disable "Resend Code" button for 60 seconds after sending.
2. **Backend Rate-Limiting**:
   - Limit to maximum 3 OTP requests per 15 minutes per IP and per target email.
3. **Invisible Bot Defense**:
   - Integrate **Cloudflare Turnstile** (free, privacy-preserving, zero annoying CAPTCHA puzzles for users).
4. **OTP Expiry**:
   - OTP codes must expire within 5–10 minutes.

---

## 5. Email Template & Content Guidelines

### Subject Line Best Practices
- ✅ `[The Grand Hotel QC] Your 6-digit verification code`
- ✅ `Security code to reset your The Grand Hotel password: 849201`
- ❌ `URGENT: RESET PASSWORD NOW!!!` (ALL CAPS and exclamation marks trigger heuristic spam filters)

### Body Layout Standards
- Use **React Email** or clean inline-CSS HTML.
- Always include:
  1. Plain-text version fallback (multipart/alternative).
  2. Brand logo and official hotel property name.
  3. Clear statement: *"If you did not request this code, you can safely ignore this email."*
  4. Physical company address in the footer (CAN-SPAM compliance).
  5. The OTP code displayed in large, monospace, clean tracking (e.g. `letter-spacing: 6px`).

---

## 6. Field QC & Pre-Opening Login Alternatives

For field inspectors (who may be working in hotel basements or concrete wings with patchy internet):
- **4-Digit Quick PIN**: For rapid re-entry without having to wait for email OTP.
- **Role-based Impersonation / Demo Mode**: During pre-opening testing phases to allow GMs, Taskforce, and Inspectors to test seamlessly without email friction.
