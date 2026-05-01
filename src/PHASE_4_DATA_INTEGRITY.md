# Phase 4: Data Integrity & Security — Implementation Tracker

**Status:** 🟡 In Progress  
**Timeline:** Week 4 (Target completion: May 24)  
**Effort:** 60 hours  
**Owner:** Senior backend dev + 1 full-stack dev

---

## Overview

This phase hardens database integrity and implements audit trails. Six interconnected deliverables:
- **Entity schema updates** (audit trails for BrandCategoryReport, EvidenceSource, DurabilityLog, RecommendationSet)
- **saveBrandInsights error handling** (retry logic + analytics logging)
- **URL validation** (whitelist + format checks for sources)
- **GDPR compliance** (email hashing in ContentFlag)
- **Admin access logging** (audit trail of who changed what when)

---

## Work Breakdown

### P4.1: Entity Schema — Audit Trails (12h)
**Status:** ⬜ Not Started  
**Files to Modify:** 5 entity schemas

#### BrandCategoryReport
Add `admin_overrides` field tracking:
```json
{
  "admin_overrides": {
    "type": "object",
    "description": "Track which scores were manually overridden by admin and why",
    "additionalProperties": {
      "type": "object",
      "properties": {
        "original_score": { "type": "number" },
        "override_score": { "type": "number" },
        "reason": { "type": "string" },
        "overridden_by_email": { "type": "string" },
        "overridden_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

Add `reviewed_by_email` + `reviewed_at`:
```json
{
  "reviewed_by_email": { "type": "string" },
  "reviewed_at": { "type": "string", "format": "date-time" }
}
```

#### EvidenceSource
Add verification fields:
```json
{
  "is_verified": {
    "type": "boolean",
    "default": false,
    "description": "Admin manually verified this source"
  },
  "verified_by_email": { "type": "string" },
  "verified_at": { "type": "string", "format": "date-time" },
  "verification_note": { "type": "string" }
}
```

#### DurabilityLog
Add admin verification:
```json
{
  "verified_by_email": { "type": "string" },
  "verified_at": { "type": "string", "format": "date-time" }
}
```

#### RecommendationSet
Add publication audit:
```json
{
  "reviewed_by_email": { "type": "string" },
  "reviewed_at": { "type": "string", "format": "date-time" },
  "published_by_email": { "type": "string" },
  "published_at": { "type": "string", "format": "date-time" }
}
```

#### Create: Audit Entity
```json
{
  "name": "Audit",
  "type": "object",
  "properties": {
    "action": { "type": "string", "enum": ["create", "update", "delete", "publish", "archive"] },
    "entity_type": { "type": "string" },
    "entity_id": { "type": "string" },
    "performed_by_email": { "type": "string" },
    "changes": {
      "type": "object",
      "description": "What changed (old → new)"
    },
    "reason": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["action", "entity_type", "performed_by_email", "timestamp"]
}
```

**Acceptance:** All schemas updated, no breaking changes to existing records

---

### P4.2: saveBrandInsights Error Handling (8h)
**Status:** ⬜ Not Started  
**File:** `functions/getJacketRecommendation.js`

Add retry logic + logging:
```javascript
async function saveBrandInsights(base44, categoryKey, aiResult) {
  const rows = aiResult.detailed_table || [];
  const now = new Date().toISOString();

  const saves = rows.map(async (row) => {
    if (!row.brand_name) return;
    
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        // attempt to save
        const existing = await base44.asServiceRole.entities.BrandCategoryInsight.filter(...);
        
        if (existing.length > 0) {
          await base44.asServiceRole.entities.BrandCategoryInsight.update(existing[0].id, payload);
        } else {
          await base44.asServiceRole.entities.BrandCategoryInsight.create(payload);
        }
        
        // success — log to analytics
        base44.analytics.track({
          eventName: "brand_insight_saved",
          properties: { brand_name: row.brand_name, category_key: categoryKey }
        });
        
        return;
      } catch (err) {
        retries++;
        if (retries >= maxRetries) {
          // log failure
          base44.analytics.track({
            eventName: "brand_insight_save_failed",
            properties: {
              brand_name: row.brand_name,
              error: err.message,
              retries_attempted: retries
            }
          });
        }
      }
    }
  });

  const results = await Promise.allSettled(saves);
  return results.map(r => r.status === 'fulfilled');
}
```

**Acceptance:** Failed saves logged; 3 retries attempted before giving up

---

### P4.3: URL Validation in researchBrand (6h)
**Status:** ⬜ Not Started  
**File:** `functions/researchBrand.js`

Add URL whitelist + validation:
```javascript
const URL_WHITELIST = [
  'https://',
  'http://', // for local dev only
];

const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'internal.',
];

function validateSourceURL(url) {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    
    // Check protocol
    if (!parsed.protocol.startsWith('http')) return false;
    
    // Check hostname
    const hostname = parsed.hostname;
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.includes(blocked)) return false;
    }
    
    return true;
  } catch (err) {
    return false;
  }
}
```

**Acceptance:** Only valid, public URLs accepted; localhost/internal domains rejected

---

### P4.4: EvidenceSource URL Validation (8h)
**Status:** ⬜ Not Started  
**File:** New `functions/validateSourceURL.js` + modify `functions/researchBrand.js`

Create validation function:
```javascript
// functions/validateSourceURL.js
async function validateSourceURL(base44, url) {
  if (!validateURLFormat(url)) {
    return { status: 'invalid_format', message: 'Malformed URL' };
  }

  try {
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    
    if (response.status === 404) {
      return { status: 'not_found', http_code: 404 };
    } else if (response.ok) {
      return { status: 'valid', http_code: response.status };
    } else {
      return { status: 'unreachable', http_code: response.status };
    }
  } catch (err) {
    return { status: 'unreachable', error: err.message };
  }
}
```

Auto-flag dead URLs in EvidenceSource creation:
```javascript
// When creating EvidenceSource
const validation = await validateSourceURL(base44, source.url);
if (validation.status === 'not_found') {
  source.manual_review_flag = true;
  source.manual_review_note = 'URL returned 404 — please verify';
}
```

**Acceptance:** Dead/unreachable URLs auto-flagged for manual review

---

### P4.5: DurabilityLog Verification (10h)
**Status:** ⬜ Not Started  
**Files:** Entity schema (done in P4.1) + update callers

When admin verifies durability claim:
```javascript
// In Admin component or backend function
await base44.asServiceRole.entities.DurabilityLog.update(logId, {
  verified_by_email: user.email,
  verified_at: new Date().toISOString()
});

// Also log to Audit trail
await base44.asServiceRole.entities.Audit.create({
  action: 'update',
  entity_type: 'DurabilityLog',
  entity_id: logId,
  performed_by_email: user.email,
  changes: { verified_by_email: user.email },
  reason: 'Admin verification of durability claim',
  timestamp: new Date().toISOString()
});
```

**Acceptance:** All durability log updates include admin verification timestamp

---

### P4.6: GDPR — Email Hashing (8h)
**Status:** ⬜ Not Started  
**Files:** Entity schema (P4.1) + new `functions/hashEmail.js`

Create email hashing utility:
```javascript
// functions/hashEmail.js
import crypto from 'crypto';

export function hashEmail(email) {
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase())
    .digest('hex');
}
```

Update ContentFlag to hash emails on creation:
```javascript
// When user submits content flag
const hashedEmail = hashEmail(user.email);
await base44.entities.ContentFlag.create({
  // ... other fields
  flagged_by_email: hashedEmail, // Store hash, not plaintext
});
```

**Acceptance:** No plaintext emails stored in ContentFlag; admin can still see flagged reports without exposing user identities

---

### P4.7: Admin Dashboard Access Logging (8h)
**Status:** ⬜ Not Started  
**Files:** `pages/Admin.jsx` + admin components

Add logging to every admin action:
```javascript
// Admin.jsx — on component mount
useEffect(() => {
  if (user?.role === 'admin') {
    base44.asServiceRole.entities.Audit.create({
      action: 'create', // or 'update', 'delete'
      entity_type: 'AdminAccess',
      entity_id: 'session-' + Date.now(),
      performed_by_email: user.email,
      reason: `Admin accessed dashboard at ${new Date().toISOString()}`,
      timestamp: new Date().toISOString()
    }).catch(() => {}); // fail silently
  }
}, [user]);

// AdminReviewQueue.jsx — when publishing report
const handlePublish = async (reportId) => {
  // ... publish logic
  await base44.asServiceRole.entities.Audit.create({
    action: 'publish',
    entity_type: 'BrandCategoryReport',
    entity_id: reportId,
    performed_by_email: user.email,
    reason: 'Published brand research report',
    timestamp: new Date().toISOString()
  });
};
```

**Acceptance:** Every admin action logged; audit trail shows who changed what when

---

## Implementation Order

```
1. P4.1 (schema updates) — foundation
2. P4.4 (URL validation) — prevents bad data
3. P4.6 (email hashing) — GDPR compliance
4. P4.2 (error handling) — data integrity
5. P4.5 (DurabilityLog verification) — audit trail for user data
6. P4.7 (admin logging) — admin accountability
```

---

## Testing Checklist

- [ ] P4.1: Create BrandCategoryReport → can add admin_overrides, reviewed_by_email set
- [ ] P4.1: Update BrandCategoryReport → admin_overrides tracked with timestamp
- [ ] P4.2: saveBrandInsights fails 2x → retries 3rd time, succeeds
- [ ] P4.2: Analytics events logged for success/failure
- [ ] P4.3: URL with localhost rejected; public URL accepted
- [ ] P4.4: Dead URL (404) → EvidenceSource auto-flagged for review
- [ ] P4.5: Admin verifies DurabilityLog → verified_by_email + timestamp set
- [ ] P4.6: ContentFlag stores hashed email (no plaintext in DB)
- [ ] P4.7: Admin publishes report → Audit entity created with action='publish'
- [ ] P4.7: Admin dashboard access → Audit entity created on session start

---

## Files to Create

| File | Purpose |
|------|---------|
| `functions/hashEmail.js` | GDPR email hashing utility |
| `functions/validateSourceURL.js` | URL validation for EvidenceSource |
| `entities/Audit.json` | Audit trail schema |

---

## Files to Modify

| File | Changes |
|------|---------|
| `entities/BrandCategoryReport.json` | Add admin_overrides, reviewed_by_email, reviewed_at |
| `entities/EvidenceSource.json` | Add is_verified, verified_by_email, verified_at |
| `entities/DurabilityLog.json` | Add verified_by_email, verified_at |
| `entities/RecommendationSet.json` | Add reviewed_by_email, reviewed_at, published_by_email, published_at |
| `functions/getJacketRecommendation.js` | Add saveBrandInsights retry logic + analytics |
| `functions/researchBrand.js` | Add URL validation + whitelist |
| `pages/Admin.jsx` | Add audit logging on access |
| `components/admin/*.jsx` | Add audit logging on publish/delete actions |

---

## Success Criteria

✅ **Go/No-Go Checkpoint:** Audit trail complete, no data loss, GDPR compliant

Metrics:
- Zero plaintext emails in ContentFlag table ✅
- 100% of admin actions logged ✅
- saveBrandInsights failures <1% (after 3 retries) ✅
- URL validation catches 95%+ of malicious/dead links ✅
- No breaking changes to existing data ✅