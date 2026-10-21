import { describe, it, expect } from 'vitest';
import { queryDatamyneLeads, exportDatamyneLeadsCsv } from '@/services/datamyneService';
import { DatamyneLeadSchema } from '@/types/datamyneLead';

describe('DataMyne Brazil Dataset Integration', () => {
  it('filters leads by country Brazil', () => {
    const res = queryDatamyneLeads({ countries: ['Brazil'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((d) => d.country === 'Brazil')).toBe(true);
  });

  it('filters leads by country India', () => {
    const res = queryDatamyneLeads({ countries: ['India'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((d) => (d.country || 'India') === 'India')).toBe(true);
  });

  it('filters leads by Brazilian cities with accent', () => {
    const res = queryDatamyneLeads({ cities: ['SÃO PAULO'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((d) => d.city.toUpperCase().includes('SÃO PAULO'))).toBe(true);
  });

  it('filters leads by Brazilian cities without accent', () => {
    const res = queryDatamyneLeads({ cities: ['SAO PAULO'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((d) => d.city.toUpperCase().includes('SÃO PAULO'))).toBe(true);
  });

  it('does not falsely match leads with empty or whitespace city', () => {
    const res = queryDatamyneLeads({ cities: ['SÃO PAULO'] });
    expect(res.items.every((d) => d.city && d.city.trim().length > 0)).toBe(true);
  });

  it('filters leads by Brazil trade lanes', () => {
    const res = queryDatamyneLeads({ tradeLanes: ['India-Brazil/Air'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.some((d) => d.trade_lanes.includes('India-Brazil/Air'))).toBe(true);
  });

  it('filters leads by search query matching country', () => {
    const res = queryDatamyneLeads({ q: 'Brazil' });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.some((d) => d.country === 'Brazil')).toBe(true);
  });

  it('validates lead with DatamyneLeadSchema with and without explicit country', () => {
    const brazilLead = DatamyneLeadSchema.parse({
      id: 'dm-bra-00046',
      company_name: 'EUROFARMA LABORATORIOS',
      country: 'Brazil',
      role: 'Both',
      transport_mode: 'Air',
      category: 'Chemicals & Materials',
      subcategory: 'Organic Chemicals & APIs',
      contact_type: 'Both Phone & Email',
    });
    expect(brazilLead.country).toBe('Brazil');

    const defaultLead = DatamyneLeadSchema.parse({
      id: 'dm-val-99999',
      company_name: 'DEFAULT CO',
      role: 'Exporter',
      category: 'General Cargo',
      subcategory: 'General',
      contact_type: 'Email Only',
    });
    expect(defaultLead.country).toBe('India');
  });

  it('exports CSV with Country column and country values', async () => {
    const res = queryDatamyneLeads({ countries: ['Brazil'] });
    const blob = exportDatamyneLeadsCsv(res.items.slice(0, 2));
    const text = await blob.text();
    expect(text).toContain('Country');
    expect(text).toContain('Brazil');
  });
});
