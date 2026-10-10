import { http, HttpResponse, delay } from 'msw';
import {
  queryLeads,
  getLeadById,
  toggleLeadSaved,
  batchSaveLeads,
  getFilterOptions,
  generateExportCsv,
  getLeadsDatabase,
} from './leadsService';
import { LeadStatus, AudienceTab, ExportRequest } from '@/types/lead';

function parseArrayParam(url: URL, key: string): string[] {
  const values = url.searchParams.getAll(key);
  if (values.length > 1) {
    return values;
  }
  if (values.length === 1 && values[0].length > 0) {
    if (key === 'locations') {
      return [values[0].trim()];
    }
    return values[0].includes(',')
      ? values[0].split(',').map((s) => s.trim()).filter(Boolean)
      : [values[0]];
  }
  return [];
}

export const handlers = [
  // GET /api/leads - Paginated, filtered, sorted leads
  http.get('/api/leads', async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
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

    return HttpResponse.json(result);
  }),

  // GET /api/leads/:id - Single lead detail
  http.get('/api/leads/:id', async ({ params }) => {
    await delay(100);

    const id = params.id as string;
    const lead = getLeadById(id);

    if (!lead) {
      return HttpResponse.json(
        { message: `Lead with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    return HttpResponse.json(lead);
  }),

  // GET /api/filters/options - Dynamic facet options and counts
  http.get('/api/filters/options', async () => {
    await delay(100);

    const options = getFilterOptions();
    return HttpResponse.json(options);
  }),

  // POST /api/leads/export - CSV or JSON leads export
  http.post('/api/leads/export', async ({ request }) => {
    await delay(150);

    let body: ExportRequest = {};
    try {
      body = (await request.json()) as ExportRequest;
    } catch {
      // Body might be empty
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
      return HttpResponse.json({
        message: 'Export created successfully',
        count: leadsToExport.length,
        csv: csvContent,
      });
    }

    return new HttpResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="apollo_leads_export.csv"',
      },
    });
  }),

  // PATCH /api/leads/:id/save - Toggle lead saved state
  http.patch('/api/leads/:id/save', async ({ params }) => {
    const id = params.id as string;
    const updated = toggleLeadSaved(id);

    if (!updated) {
      return HttpResponse.json(
        { message: `Lead with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    return HttpResponse.json(updated);
  }),

  // POST /api/leads/save - Batch save / unsave leads
  http.post('/api/leads/save', async ({ request }) => {
    let body: { leadIds: string[]; saved: boolean } = { leadIds: [], saved: true };
    try {
      body = (await request.json()) as { leadIds: string[]; saved: boolean };
    } catch {
      // Body error handling
    }

    const updated = batchSaveLeads(body.leadIds || [], body.saved ?? true);
    return HttpResponse.json({ updatedCount: updated.length, items: updated });
  }),
];
