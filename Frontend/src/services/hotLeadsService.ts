import { HOT_LEADS_DATA } from '@/data/hotLeadsData';
import {
  HotLead,
  HotLeadsFilterParams,
  HotLeadsMetrics,
  HotLeadsResponse,
} from '@/types/hotLeads';
import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from '@/services/authService';
import { logger } from '@/utils/logger';

export function computeHotLeadsMetrics(items: HotLead[] = HOT_LEADS_DATA): HotLeadsMetrics {
  let totalTurnover = 0;
  let prospectsCount = 0;
  let reactivationsCount = 0;
  let activeCount = 0;
  let decisionMakersCount = 0;

  for (const item of items) {
    totalTurnover += item.taxableTurnover;
    if (item.crmStatus === 'Prospect (Not in JFLL)') {
      prospectsCount++;
    } else if (item.crmStatus === 'Not Active Customer') {
      reactivationsCount++;
    } else if (item.crmStatus === 'Active Customer') {
      activeCount++;
    }

    if (item.apolloDecisionMaker && item.apolloDecisionMaker !== '-' && item.apolloDecisionMaker !== '') {
      decisionMakersCount++;
    }
  }

  return {
    totalTurnover,
    totalCount: items.length,
    prospectsCount,
    reactivationsCount,
    activeCount,
    decisionMakersCount,
  };
}

export function filterHotLeadsInMemory(
  items: HotLead[] = HOT_LEADS_DATA,
  params: HotLeadsFilterParams = {}
): HotLeadsResponse {
  const { q, segment = 'all', sortBy = 'turnover', sortOrder = 'desc' } = params;
  const metrics = computeHotLeadsMetrics(items);

  let filtered = items;

  // Segment filter
  if (segment === 'prospects') {
    filtered = filtered.filter((i) => i.crmStatus === 'Prospect (Not in JFLL)');
  } else if (segment === 'reactivations') {
    filtered = filtered.filter((i) => i.crmStatus === 'Not Active Customer');
  } else if (segment === 'active') {
    filtered = filtered.filter((i) => i.crmStatus === 'Active Customer');
  } else if (segment === 'with-decision-makers') {
    filtered = filtered.filter(
      (i) => i.apolloDecisionMaker && i.apolloDecisionMaker !== '-' && i.apolloDecisionMaker !== ''
    );
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
  const { q, segment = 'all', sortBy = 'turnover', sortOrder = 'desc' } = params;

  try {
    const searchParams = new URLSearchParams();
    searchParams.set('page_size', '100');
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
    }));

    return {
      items,
      totalRecords: payload.total_records ?? items.length,
      metrics: {
        totalTurnover: payload.metrics?.total_turnover ?? 0,
        totalCount: payload.metrics?.total_count ?? items.length,
        prospectsCount: payload.metrics?.prospects_count ?? 0,
        reactivationsCount: payload.metrics?.reactivations_count ?? 0,
        activeCount: payload.metrics?.active_count ?? 0,
        decisionMakersCount: payload.metrics?.decision_makers_count ?? 0,
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
