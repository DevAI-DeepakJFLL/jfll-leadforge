import {
  queryLeads,
  getLeadById,
  toggleLeadSaved,
  getFilterOptions,
  generateExportCsv,
  getLeadsDatabase,
  batchSaveLeads,
} from './leadsService';
import { LeadStatus, AudienceTab, ExportRequest } from '@/types/lead';

let isFallbackInstalled = false;

function parseArrayParam(url: URL, key: string): string[] {
  const values = url.searchParams.getAll(key);
  if (values.length > 1) return values;
  if (values.length === 1 && values[0].length > 0) {
    return values[0].includes(',')
      ? values[0].split(',').map((s) => s.trim()).filter(Boolean)
      : [values[0]];
  }
  return [];
}

/**
 * Installs window.fetch interception fallback if MSW service worker is unavailable
 */
export function setupFetchFallback(): void {
  if (typeof window === 'undefined' || isFallbackInstalled) {
    return;
  }

  isFallbackInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Check if this is an /api/ request
    if (!rawUrl.includes('/api/')) {
      return originalFetch(input, init);
    }

    try {
      const url = new URL(rawUrl, window.location.origin);
      const method = (init?.method || 'GET').toUpperCase();

      // Simulated network latency
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 1. GET /api/leads
      if (url.pathname === '/api/leads' && method === 'GET') {
        const q = url.searchParams.get('q') || undefined;
        const jobTitles = parseArrayParam(url, 'jobTitles');
        const departments = parseArrayParam(url, 'departments');
        const locations = parseArrayParam(url, 'locations');
        const industries = parseArrayParam(url, 'industries');
        const rawStatus = parseArrayParam(url, 'status') as LeadStatus[];
        const companySize = parseArrayParam(url, 'companySize');

        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '25', 10);
        const sortBy = url.searchParams.get('sortBy') || undefined;
        const sortOrder = (url.searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
        const tab = (url.searchParams.get('tab') || 'all') as AudienceTab;

        const result = queryLeads({
          q,
          jobTitles: jobTitles.length > 0 ? jobTitles : undefined,
          departments: departments.length > 0 ? departments : undefined,
          locations: locations.length > 0 ? locations : undefined,
          industries: industries.length > 0 ? industries : undefined,
          status: rawStatus.length > 0 ? rawStatus : undefined,
          companySize: companySize.length > 0 ? companySize : undefined,
          page: isNaN(page) ? 1 : page,
          limit: isNaN(limit) ? 25 : limit,
          sortBy,
          sortOrder,
          tab,
        });

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 2. GET /api/filters/options
      if (url.pathname === '/api/filters/options' && method === 'GET') {
        const options = getFilterOptions();
        return new Response(JSON.stringify(options), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 3. POST /api/leads/export
      if (url.pathname === '/api/leads/export' && method === 'POST') {
        let body: ExportRequest = {};
        if (init?.body) {
          try {
            body = JSON.parse(init.body as string);
          } catch {
            // Ignore parse error
          }
        }

        const allLeads = getLeadsDatabase();
        let leadsToExport = allLeads;

        if (body.leadIds && body.leadIds.length > 0) {
          const idSet = new Set(body.leadIds);
          leadsToExport = allLeads.filter((l) => idSet.has(l.id));
        } else if (body.filters) {
          const filteredResult = queryLeads({ ...body.filters, limit: 10000 });
          leadsToExport = filteredResult.items;
        }

        const csvContent = generateExportCsv(leadsToExport);

        if (body.format === 'json') {
          return new Response(
            JSON.stringify({
              message: 'Export created successfully',
              count: leadsToExport.length,
              csv: csvContent,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="apollo_leads_export.csv"',
          },
        });
      }

      // 4. Single lead detail: GET /api/leads/:id
      const leadMatch = url.pathname.match(/^\/api\/leads\/([^/]+)$/);
      if (leadMatch) {
        const id = leadMatch[1];

        if (method === 'GET') {
          const lead = getLeadById(id);
          if (!lead) {
            return new Response(
              JSON.stringify({ message: `Lead with ID "${id}" was not found.` }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(JSON.stringify(lead), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (method === 'PATCH') {
          const updated = toggleLeadSaved(id);
          if (!updated) {
            return new Response(
              JSON.stringify({ message: `Lead with ID "${id}" was not found.` }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(JSON.stringify(updated), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // 5. POST /api/leads/save
      if (url.pathname === '/api/leads/save' && method === 'POST') {
        let body = { leadIds: [] as string[], saved: true };
        if (init?.body) {
          try {
            body = JSON.parse(init.body as string);
          } catch {
            // Ignore
          }
        }
        const updated = batchSaveLeads(body.leadIds || [], body.saved ?? true);
        return new Response(
          JSON.stringify({ updatedCount: updated.length, items: updated }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return originalFetch(input, init);
    } catch (err) {
      console.error('[FetchFallback] Error handling simulated request:', err);
      return originalFetch(input, init);
    }
  };
}
