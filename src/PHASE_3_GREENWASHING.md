# Phase 3: Greenwashing Detection — Implementation Tracker

**Status:** 🟡 In Progress  
**Timeline:** Week 3 (Target completion: May 17)  
**Effort:** 50 hours  
**Owner:** Backend sustainability expert + 1 dev

---

## Overview

This phase closes critical sustainability gaps in research quality. Five interconnected scoring improvements flag:
- **Seasonal drops** (high turnover = consumption trap)
- **Luxury greenwashing** (expensive but fragile)
- **Certification addiction** (stacking without transparency)
- **Factory obfuscation** (certified but unnamed suppliers)
- **Vague marketing language** (generic "eco" claims)

---

## Work Breakdown

### P3.1: Seasonal Drops Scoring (8h)
**Status:** ⬜ Not Started  
**Files:** `functions/analyzeConsumptionModel.js`, `functions/getJacketRecommendation.js`

```javascript
// Seasonal drops detection:
// - 3+ new collections/year = medium risk
// - 5+ = high risk + consumption model penalty (-2 pts)
// - Evidence: new SKUs/season, marketing language ("limited edition", "seasonal")

Seasonal drops flag:
{
  detected: true,
  collections_per_year: 4,
  risk_level: "medium",
  penalty: -1.5,
  reasoning: "4 seasonal collections/year suggests planned obsolescence"
}
```

**Acceptance:** Brand with 4 seasonal drops flags as medium risk + consumption score capped at 5/10 (was 7/10)

---

### P3.2: Luxury Sustainability Trap (8h)
**Status:** ⬜ Not Started  
**Files:** New `functions/detectLuxuryGreenwash.js`

```javascript
// Luxury trap: €500+ price + <3yr durability = red flag
// - Targets brands with high margin + marketing spin
// - Example: designer brand claims "sustainable" but users report failure <2yr

Luxury trap detection:
{
  detected: true,
  price_eur: 650,
  estimated_durability_months: 24,
  greenwashing_risk: "high",
  explanation: "Premium price + below-average durability suggests marketing-driven positioning"
}
```

**Acceptance:** Brand €500+ with user reports of <3yr lifespan → greenwashing_risk: high

---

### P3.3: Cert Addiction Penalty (6h)
**Status:** ⬜ Not Started  
**Files:** `functions/detectGreenwashing.js`

```javascript
// Cert addiction rule:
// - 5+ certifications + 0 named factories = worker_score capped at 5/10
// - 5+ certs + vague factory info = capped at 6/10
// - Rewards specificity over cert count

Cert addiction penalty:
{
  total_certifications: 8,
  named_factories: 0,
  factory_transparency: 0,
  original_worker_score: 7.5,
  penalty_applied: -2.5,
  final_score: 5,
  reasoning: "Cert count does not compensate for factory anonymity"
}
```

**Acceptance:** 8-cert brand with 0 factory names scores ≤5/10 on worker ethics (not 7-8)

---

### P3.4: Factory Transparency Cross-Check (10h)
**Status:** ⬜ Not Started  
**Files:** `functions/verifyWorkerWages.js` (add Trustrace API call)

```javascript
// Integrate Trustrace API to verify supplier names against public registry
// - Example: Brand claims "Supplier XYZ in Vietnam" → check against Trustrace
// - If unmatched or unverifiable: flag as "supplier_verification_failed"

Trustrace verification:
{
  claimed_factory: "NamTex Inc., Hanoi Vietnam",
  trustrace_lookup: {
    status: "partially_matched",
    matches: [
      { name: "Nam Textile Ltd", location: "Hanoi, VN", confidence: 0.78 }
    ]
  },
  flag_if_failed: true,
  reasoning: "Supplier name could not be fully verified against public registry"
}
```

**Acceptance:** Unmatched factory → flag added, worker_score capped at 6/10 pending verification

---

### P3.5: Vague Cert Language Detection (8h)
**Status:** ⬜ Not Started  
**Files:** `functions/detectGreenwashing.js`

```javascript
// Regex patterns detect vague marketing without evidence:
// - "eco-friendly" + "sustainable" + NO wage data = red flag
// - "natural materials" + NO pesticide cert = vague
// - "responsible sourcing" + NO specifics = vague

Vague language detection:
{
  flagged_phrases: [
    { phrase: "sustainable sourcing", evidence_present: false, flag: true },
    { phrase: "eco-friendly dyes", evidence_present: false, flag: true }
  ],
  total_vague: 2,
  risk_adjustment: -1.0,
  reasoning: "Claims lack supporting evidence from independent sources"
}
```

**Acceptance:** Brand with 2+ vague claims without evidence → transparency_score penalty -1 to -2 pts

---

### P3.6: Bluesign/GOTS Without Factory Names (4h)
**Status:** ⬜ Not Started  
**Files:** `functions/verifyWorkerWages.js`

```javascript
// GOTS/Bluesign alone ≠ transparency
// - Cert present but factory unnamed = worker_score capped at 6/10
// - Cert + named factory = full credit (8-9/10)

GOTS without transparency:
{
  certification: "GOTS",
  factory_named: false,
  original_worker_score: 7,
  penalty: -1,
  final_score: 6,
  reasoning: "Certification does not substitute for factory transparency"
}
```

**Acceptance:** GOTS/Bluesign + 0 factory names → worker score ≤6/10

---

## Implementation Order

```
1. P3.1 (seasonal drops) → impacts consumption model
2. P3.5 (vague language) → improves detectGreenwashing accuracy
3. P3.3 (cert addiction) → refines worker ethics scoring
4. P3.6 (GOTS penalty) → integrates with worker ethics
5. P3.2 (luxury trap) → new independent function
6. P3.4 (Trustrace) → optional, high effort, integrate last
```

---

## Testing Checklist

- [ ] Seasonal drops: 4-collection brand flags medium risk + consumption <6/10
- [ ] Luxury trap: €600 jacket with <2yr durability → greenwashing_risk: high
- [ ] Cert addiction: 10 certs + 0 factories → worker_score = 5/10
- [ ] Vague language: "sustainable" + "eco" without wage data → 2+ flags
- [ ] GOTS/Bluesign: cert present but no factory → worker_score ≤6/10
- [ ] Trustrace: unmatched supplier → flag created, score adjusted

---

## Files to Modify

| File | Changes | Status |
|------|---------|--------|
| `functions/getJacketRecommendation.js` | Add seasonal drops logic to prompt | ⬜ |
| `functions/analyzeConsumptionModel.js` | Seasonal drops penalty calculation | ⬜ |
| `functions/detectGreenwashing.js` | Cert addiction + vague language detection | ⬜ |
| `functions/verifyWorkerWages.js` | GOTS/factory transparency + Trustrace | ⬜ |
| `functions/detectLuxuryGreenwash.js` | **NEW** — luxury trap detection | ⬜ |

---

## Success Criteria

✅ **Go/No-Go Checkpoint:** `greenwashing_risk: "high"` catches 90%+ of actual greenwashing (user-reported vs. AI assessment)

Metrics:
- False positives: <10% (don't over-flag honest small brands)
- False negatives: <10% (catch actual greenwashing 90%+ of the time)
- Regression: No existing high-confidence brands drop scores >1 point unfairly