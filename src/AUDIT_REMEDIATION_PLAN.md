# Worth Wearing App — Audit Remediation Plan

**Overall Health:** 7.5/10 → Target: 9/10 (Production Ready)
**Timeline:** 6 weeks | **Effort:** ~280 hours | **Risk Level:** Low-Medium

---

## PHASE BREAKDOWN

### 🔴 **PHASE 1: CRITICAL BLOCKERS (Week 1) — 40 hours**
*Do not deploy without these. Blocks user-facing issues.*

| ID | Issue | Severity | Effort | Files | Dependencies |
|----|-------|----------|--------|-------|--------------|
| **P1.1** | Error Boundaries | HIGH | 4h | Add ErrorBoundary.jsx | None |
| **P1.2** | Route Protection (/admin) | MEDIUM | 3h | App.jsx | P1.1 |
| **P1.3** | Search Loading State | HIGH | 6h | SearchPage.jsx, RecommendationResult.jsx | None |
| **P1.4** | Request Debouncing | MEDIUM | 4h | SearchPage.jsx | None |
| **P1.5** | Auth Race Condition | MEDIUM | 3h | AuthContext.jsx | None |
| **P1.6** | BottomNav Route Logic | CODE | 2h | BottomNav.jsx | None |
| **P1.7** | getTabIndex Clarification | CODE | 2h | App.jsx + unit test | None |

**Deliverables:**
- ✅ Error Boundary wrapper (all pages safe)
- ✅ /admin route returns error immediately if non-admin
- ✅ Search spinner + "Researching 8-10 brands... (Est. 15-40s)"
- ✅ 300ms debounce on search input
- ✅ Atomic state updates in auth flow
- ✅ BottomNav handles `/recommendation` correctly
- ✅ Unit tests: getTabIndex('/') → 0, getTabIndex('/discover') → 1, etc.

**Go/No-Go Checkpoint:** ✅ Error handling works, no white screens, admin protected

---

### 🟠 **PHASE 2: UX & CODE QUALITY (Week 2) — 45 hours**
*Improves usability and polish. No blockers, but essential for MVP.*

| ID | Issue | Effort | Files | Dependencies |
|----|-------|--------|-------|--------------|
| **P2.1** | Evidence Snippets Modal | 8h | Add EvidenceModal.jsx, update RecommendationBlock.jsx | None |
| **P2.2** | localStorage: Persist Filters | 5h | SearchPage.jsx, new hook: useSearchFilters.js | None |
| **P2.3** | Accessibility Fixes (BottomNav) | 4h | BottomNav.jsx | None |
| **P2.4** | Accessibility Fixes (RecommendationResult) | 6h | RecommendationResult.jsx | None |
| **P2.5** | Mobile Responsiveness: DetailedTable | 7h | Update DetailedTable.jsx (horizontal scroll) | None |
| **P2.6** | Mobile Responsiveness: Lifecycle Cards | 4h | Update LifecycleStages.jsx (2-col grid) | None |
| **P2.7** | Confidence Explanation Expansion | 4h | SummaryHeader.jsx | None |
| **P2.8** | Breadcrumbs Navigation | 6h | Add Breadcrumbs.jsx, update RecommendationResult.jsx | None |

**Deliverables:**
- ✅ Click evidence snippets → modal with full citation + source type
- ✅ Search filters (country, preference, budget) saved to localStorage
- ✅ BottomNav: aria-labels, sr-only text
- ✅ RecommendationResult: skip-to-content link
- ✅ DetailedTable: scrollable on mobile, pinned header
- ✅ LifecycleStages: 2-column grid on mobile, 5-column on desktop
- ✅ Confidence: "High (12 independent sources, Reddit verified, <18mo old)"
- ✅ Breadcrumbs: Home > Results > [Category] > [Brand Name]

**Go/No-Go Checkpoint:** ✅ WCAG 2.1 AA compliance, no truncated text, mobile layout fixed

---

### 🟡 **PHASE 3: GREENWASHING DETECTION (Week 3) — 50 hours**
*Closes sustainability gaps. High impact on research quality.*

| ID | Issue | Effort | Files | Dependencies |
|----|-------|--------|-------|--------------|
| **P3.1** | Seasonal Drops Scoring | 8h | Update analyzeConsumptionModel.js, prompt in getJacketRecommendation | None |
| **P3.2** | Luxury Sustainability Trap | 8h | New function: detectLuxuryGreenwash.js | P3.1 |
| **P3.3** | Cert Addiction Penalty | 6h | Update detectGreenwashing.js | None |
| **P3.4** | Factory Transparency Cross-Check | 10h | Update verifyWorkerWages.js (add Trustrace API call) | None |
| **P3.5** | Vague Cert Language Detection | 8h | Update detectGreenwashing.js (regex for "eco-friendly" without specifics) | None |
| **P3.6** | Bluesign/GOTS Without Factory Names | 4h | Update verifyWorkerWages.js | None |

**Deliverables:**
- ✅ Seasonal drops flag: 3+ new collections/year = red flag + consumption model penalty
- ✅ Luxury trap: price €500+ + durability <3yr = greenwashing_risk: high
- ✅ Cert addiction: >5 certs + 0 factory transparency = max 5/10 (was 7/10)
- ✅ Trustrace integration: verify supplier names against public registry
- ✅ Regex detects: "eco-friendly" + "sustainable" w/o wage data = red flag
- ✅ GOTS/Bluesign without factory disclosure = worker_score capped at 6/10

**Go/No-Go Checkpoint:** ✅ greenwashing_risk: "high" catches 90%+ of actual greenwashing

---

### 🟠 **PHASE 4: DATA INTEGRITY & SECURITY (Week 4) — 60 hours**
*Hardens database + backend. Enables audit trails.*

| ID | Issue | Effort | Files | Dependencies |
|----|-------|--------|-------|--------------|
| **P4.1** | Entity Schema: Audit Trails | 12h | Update 5 entity schemas (BrandCategoryReport, EvidenceSource, etc.) + migration guide | None |
| **P4.2** | saveBrandInsights Error Handling | 8h | Update getJacketRecommendation.js, add retry logic | None |
| **P4.3** | URL Validation in researchBrand | 6h | Update researchBrand.js, add URL whitelist | None |
| **P4.4** | EvidenceSource URL Validation | 8h | Add function: validateSourceURL.js, call in researchBrand | None |
| **P4.5** | DurabilityLog: verified_by + timestamp | 10h | Update entity schema + all callers | P4.1 |
| **P4.6** | GDPR: Email Hashing in ContentFlag | 8h | Update ContentFlag schema, add hash utility | None |
| **P4.7** | Admin Dashboard: Access Logging | 8h | Add logging to Admin.jsx, AdminReviewQueue.jsx | None |

**Deliverables:**
- ✅ BrandCategoryReport: admin_overrides now track [email, timestamp, reason]
- ✅ EvidenceSource: source_url validated on create, auto-flag if 404
- ✅ DurabilityLog: verified_by_email + verified_at required for admin verification
- ✅ RecommendationSet: reviewed_by_email + reviewed_at populated when status → "published"
- ✅ saveBrandInsights: retry 3x on failure, log to analytics
- ✅ researchBrand: URL whitelist (no localhost, validates domain), throws if malformed
- ✅ ContentFlag: stores SHA256(email) instead of plaintext
- ✅ Admin actions: log to Audit entity (who, when, what changed)

**Go/No-Go Checkpoint:** ✅ Audit trail complete, no data loss, GDPR compliant

---

### 💚 **PHASE 5: PERFORMANCE OPTIMIZATION (Week 5) — 45 hours**
*Reduces cold start latency. Improves render performance.*

| ID | Issue | Effort | Files | Dependencies |
|----|-------|--------|-------|--------------|
| **P5.1** | Lazy-Load Evidence Snippets | 8h | Update DetailedTable.jsx, EvidenceModal.jsx | P2.1 |
| **P5.2** | Virtual Scrolling (DetailedTable) | 12h | Update DetailedTable.jsx (use react-window) | None |
| **P5.3** | Admin Dashboard Optimization | 8h | Profile AdminDashboardAnalytics.jsx, add query limits | None |
| **P5.4** | DurabilityAggregate Query Cache | 6h | Add 1-hour cache to aggregateDurabilityData.js | None |
| **P5.5** | Lifecycle Stages: Lazy Images | 6h | Update LifecycleStages.jsx (defer images until visible) | None |
| **P5.6** | LLM Timeout + Fallback | 5h | Update getJacketRecommendation.js | None |

**Deliverables:**
- ✅ Evidence snippets render only when modal opened
- ✅ DetailedTable renders only 10 visible rows at a time (50+ brands = smooth scroll)
- ✅ Admin dashboard lazy-loads metrics (initial load <2s)
- ✅ DurabilityAggregate caches for 1 hour (repeated searches fast)
- ✅ LifecycleStages images loaded on scroll
- ✅ getJacketRecommendation aborts after 45s with cached fallback

**Go/No-Go Checkpoint:** ✅ Cold start <20s, detailed table smooth at 100+ brands

---

### 🎁 **PHASE 6: NICE-TO-HAVE FEATURES (Weeks 6+) — 80 hours**
*Future roadmap. Low priority but high user value.*

| ID | Feature | Effort | Impact | Files |
|----|---------|--------|--------|-------|
| **P6.1** | Offline Mode (last 10 searches) | 15h | User can browse cached results without network | useOfflineCache.js, SearchPage.jsx |
| **P6.2** | Watchlist (favorites) | 20h | Track favorite brands, get notifications on updates | Add Watchlist entity + pages/Watchlist.jsx |
| **P6.3** | Second-Hand Price Tracker | 25h | Compare new vs secondhand ROI | integrations w/ Vinted API |
| **P6.4** | Impact Calculator | 20h | "Buying [Brand] saves X kg CO2 vs [Brand]" | Add ImpactCalculator.jsx |
| **P6.5** | Email Alerts | 10h | Notify user when brand scores improve | New automation: email on BrandCategoryReport publish |
| **P6.6** | Dark Mode Toggle | 10h | User preference, not system-only | Update AuthContext.jsx |

**Deliverables:** (Decide which ones to include based on user feedback)

---

## IMPLEMENTATION ROADMAP

```
WEEK 1        WEEK 2        WEEK 3        WEEK 4        WEEK 5        WEEK 6+
|---P1---|    |---P2---|    |---P3---|    |---P4---|    |---P5---|    |---P6---|
 (Block)       (Polish)     (Research)     (Security)   (Speed)      (Features)
  
Deploy        Deploy        Deploy        Deploy        Deploy        Backlog
Checkpoint 1  Checkpoint 2  Checkpoint 3  Checkpoint 4  Checkpoint 5  / Voting

✅ Safe      ✅ Usable    ✅ Trusted    ✅ Hardened   ✅ Fast       🎁 Delight
```

---

## FILE CHANGES SUMMARY

### **Files to Create** (13 new)
```
components/ErrorBoundary.jsx              (Error handling wrapper)
components/EvidenceModal.jsx              (Full citation display)
components/Breadcrumbs.jsx                (Navigation)
hooks/useSearchFilters.js                 (localStorage persistence)
hooks/usePullToRefresh.js                 (already exists, enhance)
functions/detectLuxuryGreenwash.js        (Luxury trap detection)
functions/validateSourceURL.js            (URL validation)
functions/hashEmail.js                    (GDPR compliance)
components/ImpactCalculator.jsx           (Nice-to-have: P6.4)
pages/Watchlist.jsx                       (Nice-to-have: P6.2)
entities/Audit.json                       (Access logging)
lib/offlineCache.js                       (Nice-to-have: P6.1)
AUDIT_FIXES_TRACKER.md                    (Progress tracking)
```

### **Files to Modify** (20 existing)
```
App.jsx                                   (Add ErrorBoundary, route protection)
pages/SearchPage.jsx                      (Debounce, loading state, localStorage)
pages/RecommendationResult.jsx            (Loading state, breadcrumbs, a11y, secondary-hand sticky)
pages/Admin.jsx                           (Route protection, access logging)
components/BottomNav.jsx                  (Route detection fix, a11y labels)
components/recommendation/DetailedTable.jsx        (Horizontal scroll, virtual scroll, lazy snippets)
components/recommendation/LifecycleStages.jsx      (Mobile grid, lazy images)
components/recommendation/SummaryHeader.jsx        (Expanded confidence explanation)
components/recommendation/RecommendationBlock.jsx  (Link to evidence modal)
lib/AuthContext.jsx                       (Atomic state updates, race condition fix)
functions/getJacketRecommendation.js      (LLM timeout, saveBrandInsights error handling)
functions/analyzeConsumptionModel.js      (Seasonal drops scoring)
functions/detectGreenwashing.js           (Cert addiction, vague language)
functions/researchBrand.js                (URL validation, whitelist)
functions/verifyWorkerWages.js            (Factory transparency cross-check, GOTS penalty)
functions/researchBrand.js                (Trustrace API integration)
entities/BrandCategoryReport.json         (Audit trail schema)
entities/EvidenceSource.json              (URL validation, verified flag)
entities/DurabilityLog.json               (verified_by, verified_at)
entities/ContentFlag.json                 (Email hashing)
entities/RecommendationSet.json           (reviewed_by, reviewed_at)
```

---

## EFFORT BREAKDOWN

| Phase | Hours | Week | Team Size |
|-------|-------|------|-----------|
| P1 (Critical) | 40h | 1 | 1-2 devs |
| P2 (UX) | 45h | 1 | 1-2 devs |
| P3 (Research) | 50h | 1 | 1 sustainability expert + 1 backend dev |
| P4 (Data) | 60h | 1 | 1 senior backend dev |
| P5 (Perf) | 45h | 1 | 1 frontend dev |
| P6 (Nice) | 80h | TBD | 1-2 devs |
| **TOTAL** | **320h** | **~6 weeks** | **2-3 devs** |

**Cost Estimate (at $100/hr):** $32,000 for production-ready
**With P6 (nice-to-haves):** $40,000 for delightful product

---

## DEPLOYMENT STRATEGY

### **Safe Deployment Plan:**

```
PHASE 1 Checkpoint (End of Week 1)
├─ Deploy to staging
├─ Smoke test: error handling, route protection, loading states
├─ Load test: 1000 concurrent searches (verify debounce prevents spam)
└─ ✅ Promote to production (0% traffic, monitor errors)

PHASE 2 Checkpoint (End of Week 2)
├─ Deploy accessibility + UX improvements
├─ A/B test: breadcrumbs adoption, evidence modal CTR
└─ ✅ 100% traffic rollout

PHASE 3 Checkpoint (End of Week 3)
├─ Deploy greenwashing detection improvements
├─ Manual QA: verify seasonal drops, luxury trap, cert addiction detection
├─ Verify no regression in existing brands (before/after scores)
└─ ✅ 100% traffic rollout

PHASE 4 Checkpoint (End of Week 4)
├─ Deploy schema updates + audit logging (DB migration)
├─ Verify audit trail: create, update, delete captured
├─ GDPR audit: email hashing working
└─ ✅ Production rollout (blue-green deployment)

PHASE 5 Checkpoint (End of Week 5)
├─ Deploy performance optimizations
├─ Benchmark: cold start <20s, table render <1s
├─ Monitor: memory usage, CPU on admin dashboard
└─ ✅ 100% traffic rollout

PHASE 6 (Nice-to-have): Release when ready (no blocking issues)
```

---

## TESTING CHECKLIST

### **P1: Critical (Blocking)**
- [ ] Error Boundary catches React errors, displays UI
- [ ] Non-admin user accessing /admin → 403 immediately, no page load
- [ ] Search field shows spinner + ETA while LLM responds
- [ ] Rapid search clicks (5x in 100ms) → only 1 API call (debounce works)
- [ ] Auth state updates don't race (no "you're logged in/out" flicker)
- [ ] BottomNav: active state correct on /recommendation, /discover, /suggest
- [ ] getTabIndex unit tests pass (7 cases: /, /recommendation, /discover, /suggest, /admin, /recommend/x, /unknown)

### **P2: UX & Code Quality**
- [ ] Click evidence snippet → modal shows full text + source type + credibility score
- [ ] Reload SearchPage → filters (country, budget, preference) restored from localStorage
- [ ] BottomNav passes WCAG axe-core scan (aria-labels, sr-only text)
- [ ] RecommendationResult: press Tab → skip link navigates to #main
- [ ] DetailedTable on mobile: horizontal scroll smooth, no cut-off
- [ ] LifecycleStages on mobile: 2-column layout, on desktop: full 5-stage
- [ ] Hover confidence badge → tooltip shows "High: 12 independent sources, Reddit verified, <18mo old"
- [ ] Breadcrumbs: click any link → correct page loads

### **P3: Greenwashing**
- [ ] Brand with 3+ seasonal drops → greenwashing_risk: medium/high
- [ ] Brand €500+ with durability <3yr → "Luxury Sustainability Trap" flag
- [ ] Brand with 10 certs + 0 factory names → worker_score capped at 6/10 (not 8/10)
- [ ] Trustrace lookup: returns matched/unmatched status for factories
- [ ] "Sustainable" without wage data → red flag in prompt
- [ ] GOTS cert + no factory → worker_score ≤6/10

### **P4: Data Integrity**
- [ ] Admin edits worker_score: admin_overrides logs [email, timestamp, "user adjusted due to new wage data"]
- [ ] Add EvidenceSource with dead URL → auto-flags as "404" in UI
- [ ] Admin verifies DurabilityLog → verified_by_email + verified_at populated
- [ ] Publish BrandCategoryReport → reviewed_by_email + reviewed_at set
- [ ] ContentFlag entry: email hashed (SHA256), plaintext not stored
- [ ] Admin dashboard access logged to Audit entity

### **P5: Performance**
- [ ] Evidence snippets don't render until modal opens
- [ ] DetailedTable with 100 brands: smooth scroll, FPS >60
- [ ] Admin dashboard initial load <2s
- [ ] DurabilityAggregate query: 2nd request hits cache <50ms
- [ ] LLM timeout at 45s → returns "Searching... try again in 30s"

### **P6: Nice-to-Have (if included)**
- [ ] Offline mode: last 10 searches cached, accessible without network
- [ ] Watchlist: add/remove brand, shows notification on score update
- [ ] Price comparison: new €200 vs secondhand €80 → ROI display
- [ ] Impact calc: "Switching to [Brand] saves 50kg CO2 over 5 years"

---

## ROLLBACK PLAN

If critical issue discovered:

1. **DB Schema Issue (P4):** Rollback migration, keep old schema, disable new features
2. **Performance Regression (P5):** Disable virtual scrolling, lazy loading temporarily
3. **Greenwashing False Positive (P3):** Reduce sensitivity, revert scoring weights
4. **Route Protection Bug (P1):** Temporarily hide /admin from nav, add manual checks
5. **Error Boundary Issue (P1):** Disable error boundary, monitor errors in console

---

## SUCCESS METRICS

| Metric | Target | Current | Improvement |
|--------|--------|---------|-------------|
| App Crash Rate | <0.1% | ~2% | 20x |
| Route Protection | 100% non-admin blocked | 0% | ✅ |
| Search Latency (p95) | <20s | 40s | 2x |
| Core Web Vitals | A grade | B grade | ✅ |
| Accessibility Score | 95+ | 78 | +17 pts |
| Greenwashing Detection | 90%+ recall | ~70% | +20% |
| Data Integrity | 0 audit gaps | 5 gaps | ✅ |

---

## DECISION POINTS FOR USER

1. **Phasing:** Proceed with all 5 phases (Weeks 1-5) or prioritize P1-P3 first?
2. **P6 Scope:** Which nice-to-haves to include? (Watchlist? Offline? Price compare?)
3. **Trustrace Integration:** Include supplier verification API (P3.4) or defer?
4. **Team Size:** 2 devs (8 weeks) or 3 devs (6 weeks)?
5. **Timeline:** Deploy weekly (P1→P5) or batch (P1+P2 week 1, P3+P4 week 2)?

**Recommendation:** Do P1-P4 in parallel weeks (all critical), P5 independent, P6 vote later.