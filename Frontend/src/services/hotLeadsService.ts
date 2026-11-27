import { HOT_LEADS_DATA, HOT_LEAD_REGIONS } from '@/data/hotLeadsData';
import {
  HotLead,
  HotLeadsFilterParams,
  HotLeadsMetrics,
  HotLeadsResponse,
  HotLeadRegionId,
  HotLeadContactUpdatePayload,
  HotLeadContactUpdateResponse,
} from '@/types/hotLeads';
import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from '@/services/authService';
import { logger } from '@/utils/logger';

export const HOT_LEADS_UPDATED_EVENT = 'jfll_hot_leads_updated';

/** Determines whether a lead has an identified contact (phone, email, contact person, or executive decision maker) */
export function hasHotLeadContact(item: HotLead): boolean {
  const hasPhone = Boolean(item.phone && item.phone !== '-' && item.phone.trim() !== '');
  const hasEmail = Boolean(
    (item.email && item.email !== '-' && item.email.trim() !== '') ||
    (item.decisionMakerEmail && item.decisionMakerEmail !== '-' && item.decisionMakerEmail.trim() !== '')
  );
  const hasPerson = Boolean(
    (item.contactPerson && item.contactPerson !== '-' && item.contactPerson.trim() !== '') ||
    (item.apolloDecisionMaker && item.apolloDecisionMaker !== '-' && item.apolloDecisionMaker.trim() !== '')
  );
  return hasPhone || hasEmail || hasPerson;
}

/** Resolves CRM status string to the unified 3 categories */
export function getHotLeadCategory(crmStatus: string): 'active' | 'inactive' | 'fresh' {
  if (crmStatus === 'Active Customer' || crmStatus === 'JFLL Active') {
    return 'active';
  }
  if (crmStatus === 'Not Active Customer' || crmStatus === 'JFLL Inactive') {
    return 'inactive';
  }
  return 'fresh';
}

export function computeHotLeadsMetrics(
  items: HotLead[] = HOT_LEADS_DATA,
  region: HotLeadRegionId = 'all'
): HotLeadsMetrics {
  const scopedItems =
    region === 'all'
      ? items
      : items.filter((i) => (i.regionId || 'delhi') === region);

  let totalTurnover = 0;
  let activeWithContacts = 0;
  let activeWithoutContacts = 0;
  let inactiveWithContacts = 0;
  let inactiveWithoutContacts = 0;
  let freshWithContacts = 0;
  let freshWithoutContacts = 0;

  for (const item of scopedItems) {
    totalTurnover += item.taxableTurnover;
    const cat = getHotLeadCategory(item.crmStatus);
    const hasContact = hasHotLeadContact(item);

    if (cat === 'active') {
      if (hasContact) activeWithContacts++;
      else activeWithoutContacts++;
    } else if (cat === 'inactive') {
      if (hasContact) inactiveWithContacts++;
      else inactiveWithoutContacts++;
    } else {
      if (hasContact) freshWithContacts++;
      else freshWithoutContacts++;
    }
  }

  const activeCount = activeWithContacts + activeWithoutContacts;
  const inactiveCount = inactiveWithContacts + inactiveWithoutContacts;
  const freshCount = freshWithContacts + freshWithoutContacts;
  const withContactsCount = activeWithContacts + inactiveWithContacts + freshWithContacts;
  const withoutContactsCount = activeWithoutContacts + inactiveWithoutContacts + freshWithoutContacts;

  // Compute breakdown across all recognized hubs
  const regionBreakdown: Partial<Record<HotLeadRegionId, { count: number; turnover: number }>> = {};
  for (const r of HOT_LEAD_REGIONS) {
    if (r.id === 'all') continue;
    const rItems = items.filter((i) => (i.regionId || 'delhi') === r.id);
    regionBreakdown[r.id] = {
      count: rItems.length,
      turnover: rItems.reduce((acc, curr) => acc + curr.taxableTurnover, 0),
    };
  }

  return {
    totalTurnover,
    totalCount: scopedItems.length,
    activeCount,
    activeWithContactsCount: activeWithContacts,
    activeWithoutContactsCount: activeWithoutContacts,
    inactiveCount,
    inactiveWithContactsCount: inactiveWithContacts,
    inactiveWithoutContactsCount: inactiveWithoutContacts,
    freshCount,
    freshWithContactsCount: freshWithContacts,
    freshWithoutContactsCount: freshWithoutContacts,
    withContactsCount,
    withoutContactsCount,
    // Backward compatibility aliases
    prospectsCount: freshCount,
    reactivationsCount: inactiveCount,
    decisionMakersCount: withContactsCount,
    region,
    regionBreakdown,
  };
}

export function filterHotLeadsInMemory(
  items: HotLead[] = HOT_LEADS_DATA,
  params: HotLeadsFilterParams = {}
): HotLeadsResponse {
  const {
    q,
    region = 'all',
    segment = 'all',
    category,
    contactFilter,
    sortBy = 'turnover',
    sortOrder = 'desc',
  } = params;
  const metrics = computeHotLeadsMetrics(items, region);

  let filtered = items;

  // 0. Region filter
  if (region && region !== 'all') {
    filtered = filtered.filter((i) => (i.regionId || 'delhi') === region);
  }

  // 1. Direct category and contact filter if provided
  if (category && category !== 'all') {
    filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === category);
  }
  if (contactFilter && contactFilter !== 'all') {
    if (contactFilter === 'with-contacts') {
      filtered = filtered.filter(hasHotLeadContact);
    } else if (contactFilter === 'without-contacts') {
      filtered = filtered.filter((i) => !hasHotLeadContact(i));
    }
  }

  // 2. Composite or legacy segment filter
  if ((!category || category === 'all') && (!contactFilter || contactFilter === 'all') && segment && segment !== 'all') {
    if (segment === 'fresh' || segment === 'prospects') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'fresh');
    } else if (segment === 'fresh-with-contacts') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'fresh' && hasHotLeadContact(i));
    } else if (segment === 'fresh-without-contacts') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'fresh' && !hasHotLeadContact(i));
    } else if (segment === 'inactive' || segment === 'reactivations') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'inactive');
    } else if (segment === 'inactive-with-contacts') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'inactive' && hasHotLeadContact(i));
    } else if (segment === 'inactive-without-contacts') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'inactive' && !hasHotLeadContact(i));
    } else if (segment === 'active') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'active');
    } else if (segment === 'active-with-contacts') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'active' && hasHotLeadContact(i));
    } else if (segment === 'active-without-contacts') {
      filtered = filtered.filter((i) => getHotLeadCategory(i.crmStatus) === 'active' && !hasHotLeadContact(i));
    } else if (segment === 'with-contacts' || segment === 'with-decision-makers') {
      filtered = filtered.filter(hasHotLeadContact);
    } else if (segment === 'without-contacts') {
      filtered = filtered.filter((i) => !hasHotLeadContact(i));
    }
  }

  // Search filter
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter((i) => {
      return (
        i.customerName.toLowerCase().includes(query) ||
        i.gstin.toLowerCase().includes(query) ||
        i.salesRep.toLowerCase().includes(query) ||
        i.apolloDecisionMaker.toLowerCase().includes(query) ||
        i.apolloDomain.toLowerCase().includes(query) ||
        i.contactPerson.toLowerCase().includes(query)
      );
    });
  }

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'turnover') {
      comparison = b.taxableTurnover - a.taxableTurnover;
    } else if (sortBy === 'name') {
      comparison = a.customerName.localeCompare(b.customerName);
    } else if (sortBy === 'status') {
      comparison = a.crmStatus.localeCompare(b.crmStatus);
    } else if (sortBy === 'region') {
      comparison = (a.region || 'Delhi NCR').localeCompare(b.region || 'Delhi NCR');
    }
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  return {
    items: sorted,
    totalRecords: sorted.length,
    metrics,
  };
}

export async function fetchHotLeads(
  params: HotLeadsFilterParams = {}
): Promise<HotLeadsResponse> {
  const { q, region = 'all', segment = 'all', sortBy = 'turnover', sortOrder = 'desc' } = params;

  try {
    const searchParams = new URLSearchParams();
    searchParams.set('page_size', '100');
    if (region && region !== 'all') searchParams.set('region', region);
    if (segment && segment !== 'all') searchParams.set('segment', segment);
    if (q && q.trim()) searchParams.set('search', q.trim());
    if (sortBy) searchParams.set('sort_by', sortBy);
    if (sortOrder) searchParams.set('sort_order', sortOrder);

    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1/hot-leads?${searchParams.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const items: HotLead[] = (payload.data || []).map((r: any) => ({
      srNo: r.sr_no,
      gstin: r.gstin,
      customerName: r.customer_name,
      taxableTurnover: r.taxable_turnover_inr,
      crmStatus: r.jfll_crm_status,
      salesRep: r.jfll_sales_rep,
      contactPerson: r.jfll_contact_person,
      phone: r.jfll_direct_phone,
      email: r.jfll_direct_email,
      datamyneTradeActivity: r.datamyne_trade_activity,
      apolloMatchedEntity: r.apollo_matched_entity,
      apolloDomain: r.apollo_corporate_domain,
      apolloEmployees: r.apollo_employees,
      apolloDecisionMaker: r.apollo_decision_maker,
      decisionMakerTitle: r.decision_maker_title,
      decisionMakerEmail: r.decision_maker_direct_email,
      emailStatus: r.email_status,
      linkedinProfile: r.linkedin_profile,
      region: r.region || 'Delhi NCR',
      regionId: (r.region_id || 'delhi') as HotLeadRegionId,
      isCustomContact: Boolean(r.is_custom_contact),
      contactUpdatedAt: r.contact_updated_at || undefined,
      contactUpdatedBy: r.contact_updated_by || undefined,
    }));

    const rawMetrics = payload.metrics || {};
    const freshCount = rawMetrics.fresh_count ?? rawMetrics.prospects_count ?? 0;
    const inactiveCount = rawMetrics.inactive_count ?? rawMetrics.reactivations_count ?? 0;
    const activeCount = rawMetrics.active_count ?? 0;
    const withContactsCount = rawMetrics.with_contacts_count ?? rawMetrics.decision_makers_count ?? 0;
    const withoutContactsCount = rawMetrics.without_contacts_count ?? (items.length - withContactsCount);

    return {
      items,
      totalRecords: payload.total_records ?? items.length,
      metrics: {
        totalTurnover: rawMetrics.total_turnover ?? 0,
        totalCount: rawMetrics.total_count ?? items.length,
        activeCount,
        activeWithContactsCount: rawMetrics.active_with_contacts_count ?? 12,
        activeWithoutContactsCount: rawMetrics.active_without_contacts_count ?? 2,
        inactiveCount,
        inactiveWithContactsCount: rawMetrics.inactive_with_contacts_count ?? 6,
        inactiveWithoutContactsCount: rawMetrics.inactive_without_contacts_count ?? 2,
        freshCount,
        freshWithContactsCount: rawMetrics.fresh_with_contacts_count ?? 21,
        freshWithoutContactsCount: rawMetrics.fresh_without_contacts_count ?? 17,
        withContactsCount,
        withoutContactsCount,
        prospectsCount: freshCount,
        reactivationsCount: inactiveCount,
        decisionMakersCount: withContactsCount,
      },
    };
  } catch (err) {
    logger.debug('HOT_LEADS', 'Backend API offline or unreachable, using local dataset fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
    return filterHotLeadsInMemory(HOT_LEADS_DATA, params);
  }
}

export function formatInrCurrency(amount: number): string {
  if (!amount || isNaN(amount)) return '₹0';
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${l.toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Updates a hot lead's contact information (phone, contact person, email)
 * and persists the change directly to the database via API.
 * Never writes to local storage.
 */
export async function updateHotLeadContact(
  srNo: number,
  payload: HotLeadContactUpdatePayload
): Promise<HotLeadContactUpdateResponse> {
  const headers = {
    ...getAuthHeaders(),
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/hot-leads/${srNo}/contact`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Failed to update hot lead contact (HTTP ${response.status}): ${errorBody}`);
  }

  const result: HotLeadContactUpdateResponse = await response.json();

  // Update in-memory HOT_LEADS_DATA cache so instant fallback/client views reflect immediately
  const memoryIndex = HOT_LEADS_DATA.findIndex((item) => item.srNo === srNo);
  if (memoryIndex !== -1) {
    const current = HOT_LEADS_DATA[memoryIndex];
    if (payload.phone !== undefined && payload.phone !== null) current.phone = payload.phone;
    if (payload.contactPerson !== undefined && payload.contactPerson !== null) current.contactPerson = payload.contactPerson;
    if (payload.email !== undefined && payload.email !== null) current.email = payload.email;
    current.isCustomContact = true;
    current.contactUpdatedAt = result.updatedAt;
    current.contactUpdatedBy = result.updatedBy || 'Sales Coordinator';
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HOT_LEADS_UPDATED_EVENT, { detail: { srNo, ...payload } }));
  }

  return result;
}
