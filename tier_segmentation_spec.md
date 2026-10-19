# JFLL Lead Database: Tier A / Tier B Segmentation Guide

**Source:** JFLL Lead Generation & Prospecting SOP (Oct 9, 2026), Stage 2.

Each company in the lead database gets a score from 0 to 100 and one status: `Unscored`, `Excluded`, `Parked`, `Tier B` or `Tier A`. Store the score breakdown, so the team can see why a company got its tier.

Rules marked **[SOP]** come from the SOP. Rules marked **[ASSUMPTION]** fill a gap in the SOP. Keep assumptions as settings that can be changed, not fixed values in the code.

---

## 1. Statuses

| Status | Condition | What happens next |
| --- | --- | --- |
| `Unscored` | Required fields are missing | Shown in a data-quality list to fix |
| `Excluded` | Existing customer or competitor forwarder | Removed from prospecting |
| `Tier A` | Score 70 or above, or strategic override | Verification call, then client report if Hot or Warm |
| `Tier B` | Score 40 to 69 | Automated 4-email sequence |
| `Parked` | Score below 40 | No outreach |

Check required fields first, then exclusions, then calculate the score.

---

## 2. Data fields needed

Use the existing column names in the database. Map them in one settings file.

| Field | Used for |
| --- | --- |
| `company_name`, `website_or_domain`, `city`, `branch`, `data_source` | Required fields |
| `lane` | Lane score |
| `mode` (`air` or `ocean`) | Mode score |
| `commodity` and HS code | Commodity score |
| `shipments_12m` | Frequency score |
| `shipments_prior_6m`, `shipments_recent_6m` (or volumes) | Volume trend |
| `last_shipment_date` | Recency score |
| `incoterm_set` | Freight control score |
| `air_suitable` | Mode score for ocean shippers |
| `regulated_plant_status` (`us_fda`, `who_gmp`, `none`, `unknown`) | +5 bonus |
| `is_existing_customer` | Exclusion |
| `is_competitor_forwarder` | Exclusion |
| `is_strategic_account` | Strategic override |

If `incoterm_set`, `air_suitable`, `regulated_plant_status` or `is_strategic_account` do not exist yet, add them as empty columns. Do not guess their values.

---

## 3. Required fields check

**[SOP]** Before a company is tiered, it must have: company name, website or domain, city, branch, lane, mode, commodity, shipment count (12 months), last shipment date, existing-customer flag and data source.

- If a field is missing, set the status to `Unscored` and store the list of missing fields.
- Do not calculate a partial score.
- Add a filter for `Unscored` companies with the missing field names.
- A blank `is_existing_customer` counts as missing, not as `false`.

---

## 4. Exclusions

**[SOP]** Apply these before scoring.

1. Existing JFLL customer: status `Excluded`, reason `existing_customer`. Send to the account owner.
2. Competitor forwarder or NVOCC listed as the shipper: status `Excluded`, reason `competitor_forwarder`.

Excluded companies get no score. **[ASSUMPTION]** The SOP does not say where the competitor list comes from. Use a lookup table of competitor names or domains, plus a manual flag. Ask the process owner for the list.

Check the existing-customer flag again before any call or email.

---

## 5. Scoring

The seven criteria add up to a maximum of 100. Store each criterion score separately.

### 5.1 Shipment frequency (max 20)

| Shipments in last 12 months | Points |
| --- | --- |
| 24 or more | 20 |
| 12 to 23 | 12 |
| 4 to 11 | 6 |
| 0 to 3 | 0 |

### 5.2 Freight control, Incoterm (max 15)

| Condition | Points |
| --- | --- |
| Ships under CIF, CFR, CPT or CIP (exporter books freight) | 15 |
| Mixed or unknown | 8 |
| Ships only under FOB, FCA or EXW (overseas buyer usually picks the forwarder) | 0 |

**[ASSUMPTION]** "Mixed" means the company uses both exporter-controlled and buyer-controlled terms. No Incoterm data scores 8.

### 5.3 Lane fit (max 15)

| Lane | Points |
| --- | --- |
| India to US, India to UAE | 15 |
| India to Latin America | 9 |
| Other lanes JFLL can serve | 4 |
| Lanes JFLL does not serve | 0 |

Keep a settings table for lane points and a list of lanes JFLL serves. **[ASSUMPTION]** If a company has several lanes, use the highest score.

### 5.4 Commodity fit (max 15)

| Commodity | Points |
| --- | --- |
| Pharma, perishables or temperature-controlled | 15 |
| High-value general cargo | 8 |
| Bulk or low-value | 0 |

Keep an editable mapping from HS codes and keywords to these three groups. Commodities that match no rule go to a review list. **[ASSUMPTION]** Until reviewed, score them 8 if marked high-value, otherwise 0.

### 5.5 Mode (max 15)

| Condition | Points |
| --- | --- |
| Already ships by air | 15 |
| Ships ocean, goods are air-suitable | 8 |
| Bulk ocean only | 0 |

A company that ships by both air and ocean counts as air.

### 5.6 Volume trend (max 10)

Compare the last 6 months with the 6 months before.

| Trend | Points |
| --- | --- |
| Up | 10 |
| Flat | 5 |
| Falling | 0 |

**[ASSUMPTION]** "Flat" means a change within plus or minus 10 percent. Make this a setting. With no earlier data to compare, score 5.

### 5.7 Recency (max 10)

| Days since last shipment | Points |
| --- | --- |
| 60 or fewer | 10 |
| 61 to 180 | 5 |
| More than 180 | 0 |

Calculate from today's date each time scoring runs.

### 5.8 Bonuses

**[SOP]** Add these after the seven criteria.

- **+5 regulated pharma plant.** For pharma companies with `us_fda` or `who_gmp` status, taken from the company website.
- **+5 branch-cluster match.** For companies in a cluster a JFLL branch serves well. For pharma: Hyderabad, Ahmedabad and Vadodara, Mumbai and Pune, Baddi, Goa. Keep this as an editable table.

### 5.9 Total

```
total = min(100, base score + bonuses)
```

**[SOP]** The total is capped at 100. Store the base score, the bonuses and the total separately.

### 5.10 Perishables and export season

**[SOP]** Off-season recency understates perishables exporters. Keep a table of export seasons per commodity. Before a season starts, re-score these companies and flag them for review. **[ASSUMPTION]** The SOP gives no formula for the adjustment, so the team decides how to adjust.

---

## 6. Tier mapping

| Total score | Status |
| --- | --- |
| 70 to 100 | Tier A |
| 40 to 69 | Tier B |
| Below 40 | Parked |

Keep `tier_a_min = 70` and `tier_b_min = 40` as settings.

### 6.1 Strategic-account override

**[SOP]** If the score is 60 to 69 and management has named the company a strategic account, set it to Tier A. Store `tier_reason = strategic_override`.

- Only management can set `is_strategic_account`. Log who set it and when.
- A strategic account scoring below 60 keeps its normal tier. **[ASSUMPTION]** Show management a notice in that case.

### 6.2 Capacity check

**[SOP]** If Tier A is larger than Inside Sales and the report team can handle in a month, raise the Tier A cut-off. As a rule of thumb, Tier A is roughly the top 10 to 20 percent of the list.

- After each scoring run, show Tier A count, Tier A share and the monthly capacity setting.
- If Tier A is above 20 percent of scored companies, or above capacity, show a warning with a suggested new cut-off.
- A person with the right role confirms any cut-off change. Do not change it automatically.

---

## 7. Data to store

| Column | Meaning |
| --- | --- |
| `segment_status` | `Unscored`, `Excluded`, `Tier A`, `Tier B`, `Parked` |
| `tier_reason` | `score`, `strategic_override`, `existing_customer`, `competitor_forwarder`, `manual` |
| `total_score`, `base_score`, `bonus_points` | Numbers |
| `score_breakdown` | Points for each criterion and bonus |
| `missing_fields` | For `Unscored` companies |
| `scored_at` | Date of last scoring |
| `rules_version` | Version of the settings used |
| `manual_override_by`, `manual_override_reason`, `manual_override_at` | Record of manual changes |

Keep a history table: company, old status, new status, score, reason, date, rules version, user or job.

---

## 8. When to re-run scoring

- After every data refresh. **[SOP]** The proposed refresh is every Monday from 9 November.
- After any change to a rule, weight, threshold or mapping table. Update `rules_version` each time. The SOP says to tune weights after the first two review cycles.
- Before perishables export seasons.
- When `is_existing_customer`, `is_competitor_forwarder` or `is_strategic_account` changes.

**[ASSUMPTION]** If a company already has a call, email engagement or sales status, a re-score should not move its tier silently. Save the new result as `suggested_segment_status` and show it for review. New exclusions (existing customer, competitor, Disqualified, opt-out) always apply immediately.

---

## 9. Status changes after tiering

These come from other SOP stages. Make sure the fields exist and can be filtered.

| Event | Result |
| --- | --- |
| Tier A, no answer after 3 attempts on different days | Moves to the Tier B email sequence |
| Tier B reply, meeting request or repeated clicks | Status `Engaged`. Inside Sales calls within 1 working day. If Hot or Warm, follows the Tier A report process |
| Tier B reply "not interested" | Closed and suppressed |
| Call outcome `Disqualified` | Closed. Never contacted again. Reason recorded |
| Email opt-out | Permanently suppressed |
| Company becomes an existing customer | `Excluded`. Sent to account owner |

---

## 10. App requirements

1. **Filters.** Existing filters (branch, lane, mode, commodity, tier, status) work with `segment_status`. Add filters for `tier_reason`, score range and `Unscored`.
2. **Score view.** Opening a company shows each criterion, each bonus, whether the cap applied, and the rules version.
3. **Settings screen.** Role-restricted. Covers tier thresholds, lane points, served lanes, commodity mapping, branch clusters, export seasons, flat band and Tier A capacity. Each save updates `rules_version`.
4. **Dashboard.** Counts by status, Tier A share against the 10 to 20 percent guide, `Unscored` list, capacity warning and score distribution.
5. **Manual override.** Authorised roles only, with a reason. It stays in place after re-scoring, unless an exclusion applies.
6. **Weekly check.** **[SOP]** The Research Analyst checks 20 random records a week. Provide a "random 20" view with the breakdown and a way to flag a rule that misfired.

---

## 11. Test cases

Use 19 October 2026 as today's date.

| # | Case | Expected result |
| --- | --- | --- |
| 1 | 30 shipments, CIF and CFR, IN-US, pharma, air, volume up, last shipment 20 days ago, US FDA plant, Hyderabad cluster | Base 100, bonus 10, total capped at 100. Tier A |
| 2 | 14 shipments, FOB only, IN-UAE, high-value general, ocean but air-suitable, flat, last shipment 90 days ago | 12 + 0 + 15 + 8 + 8 + 5 + 5 = 53. Tier B |
| 3 | Score 65, strategic account | Tier A, `strategic_override` |
| 4 | Score 55, strategic account | Tier B. Notice to management |
| 5 | Existing customer | Excluded, no score |
| 6 | Competitor forwarder | Excluded, no score |
| 7 | `last_shipment_date` is empty | Unscored, `missing_fields = ["last_shipment_date"]` |
| 8 | 2 shipments, EXW, lane not served, bulk, bulk ocean, falling, last shipment 200 days ago | Score 0. Parked |
| 9 | Scores 69, 70, 40, 39 | Tier B, Tier A, Tier B, Parked |
| 10 | Shipments 3, 4, 11, 12, 23, 24 | 0, 6, 6, 12, 12, 20 points |
| 11 | Days since last shipment 60, 61, 180, 181 | 10, 5, 5, 0 points |
| 12 | Base 95 with both bonuses | Total 100, not 105 |
| 13 | Tier A above 20 percent of scored companies | Warning shown. Cut-off not changed automatically |

---

## 12. Open questions for the process owner

Use the defaults above until these are answered.

1. Which lanes does JFLL serve?
2. Which companies are competitor forwarders or NVOCCs?
3. How are HS codes and keywords mapped to pharma, perishables, high-value and bulk?
4. How is "flat" volume defined? (Default: plus or minus 10 percent.)
5. What is the monthly Tier A capacity for Inside Sales and the report team?
6. How should the score be adjusted for perishables export seasons?
7. What should happen to a lead already in progress when a re-score changes its tier? (Default in section 8.)
8. Who can mark strategic accounts and change scoring weights?
9. What are the branch clusters for commodities other than pharma?
