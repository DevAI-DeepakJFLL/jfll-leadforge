import { describe, it, expect } from 'vitest';
import {
  MONTHLY_COMMODITY_RECORDS,
  COLD_CHAIN_SPECS,
  HUB_GATEWAYS,
  MONTH_INDEX,
  HUB_COLD_CHAIN_MAP,
  compileSearchHaystack,
  getBookingStatus,
  getMonthlyRecordsByMonth,
  filterCommodityRecords,
  getColdChainSpecsByHub,
} from '@/data/freightCommoditiesData';
import { GatewayHubId } from '@/types/freightCommodities';

describe('Freight Commodities Intelligence Data Suite', () => {
  it('contains exactly 96 monthly commodity records', () => {
    expect(MONTHLY_COMMODITY_RECORDS).toHaveLength(96);
  });

  it('contains exactly 8 gateway records for each of the 12 months', () => {
    for (let m = 1; m <= 12; m++) {
      const recordsForMonth = getMonthlyRecordsByMonth(m);
      expect(recordsForMonth).toHaveLength(8);

      const hubs = new Set(recordsForMonth.map(r => r.hubId));
      expect(hubs.size).toBe(8);
      expect(hubs.has('DEL')).toBe(true);
      expect(hubs.has('BOM')).toBe(true);
      expect(hubs.has('BLR')).toBe(true);
      expect(hubs.has('MAA')).toBe(true);
      expect(hubs.has('HYD')).toBe(true);
      expect(hubs.has('CCU')).toBe(true);
      expect(hubs.has('AMD')).toBe(true);
      expect(hubs.has('COK')).toBe(true);
    }
  });

  it('ensures each monthly record has complete and non-empty required fields', () => {
    MONTHLY_COMMODITY_RECORDS.forEach((rec, index) => {
      expect(rec.id, `id at ${index}`).toBeTruthy();
      expect(rec.month, `month at ${index}`).toBeGreaterThanOrEqual(1);
      expect(rec.month, `month at ${index}`).toBeLessThanOrEqual(12);
      expect(rec.monthName, `monthName at ${index}`).toBeTruthy();
      expect(rec.quarter, `quarter at ${index}`).toBeTruthy();
      expect(rec.hubId, `hubId at ${index}`).toBeTruthy();
      expect(rec.hubName, `hubName at ${index}`).toBeTruthy();
      expect(rec.season, `season at ${index}`).toBeTruthy();
      expect(['HIGH', 'MEDIUM']).toContain(rec.priority);
      expect(rec.airExport, `airExport at ${index}`).toBeTruthy();
      expect(rec.airImport, `airImport at ${index}`).toBeTruthy();
      expect(rec.seaExport, `seaExport at ${index}`).toBeTruthy();
      expect(rec.seaImport, `seaImport at ${index}`).toBeTruthy();
      expect(rec.equipment, `equipment at ${index}`).toBeTruthy();
      expect(rec.gateways, `gateways at ${index}`).toBeTruthy();
      expect(rec.clusters, `clusters at ${index}`).toBeTruthy();
      expect(rec.tradeLanes, `tradeLanes at ${index}`).toBeTruthy();
      expect(rec.referenceSource, `referenceSource at ${index}`).toBeTruthy();
      expect(rec.bookingWindow, `bookingWindow at ${index}`).toBeTruthy();
      expect(['active', 'upcoming', 'off-season']).toContain(rec.bookingStatus);
    });
  });

  it('contains exactly 14 perishables and cold-chain matrix specifications', () => {
    expect(COLD_CHAIN_SPECS).toHaveLength(14);
  });

  it('ensures each cold chain specification has complete handling regimes', () => {
    COLD_CHAIN_SPECS.forEach((spec, idx) => {
      expect(spec.id, `id at ${idx}`).toBeTruthy();
      expect(spec.commodity, `commodity at ${idx}`).toBeTruthy();
      expect(spec.hubs, `hubs at ${idx}`).toBeTruthy();
      expect(spec.peakWindow, `peakWindow at ${idx}`).toBeTruthy();
      expect(spec.leadWindow, `leadWindow at ${idx}`).toBeTruthy();
      expect(spec.tempAndHumidity, `tempAndHumidity at ${idx}`).toBeTruthy();
      expect(spec.compliance, `compliance at ${idx}`).toBeTruthy();
      expect(spec.airSolution, `airSolution at ${idx}`).toBeTruthy();
      expect(spec.oceanSolution, `oceanSolution at ${idx}`).toBeTruthy();
      expect(spec.roadSolution, `roadSolution at ${idx}`).toBeTruthy();
      expect(spec.buyers, `buyers at ${idx}`).toBeTruthy();
      expect(spec.referenceSource, `referenceSource at ${idx}`).toBeTruthy();
    });
  });

  it('defines metadata for all 8 Indian hubs plus national ALL aggregation', () => {
    const expectedHubs: GatewayHubId[] = ['ALL', 'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'AMD', 'COK'];
    expectedHubs.forEach(hub => {
      const info = HUB_GATEWAYS[hub];
      expect(info, `Hub info for ${hub}`).toBeDefined();
      expect(info.code).toBe(hub);
      expect(info.name).toBeTruthy();
      expect(info.airCargoVolume).toBeTruthy();
      expect(info.oceanCorridors).toBeTruthy();
      expect(info.keyFacilities).toBeTruthy();
    });
  });

  it('computes booking status deterministically', () => {
    expect(getBookingStatus(11, 11)).toBe('active');
    expect(getBookingStatus(12, 11)).toBe('upcoming');
    expect(getBookingStatus(1, 11)).toBe('off-season');
    expect(getBookingStatus(5, 11)).toBe('off-season');
  });

  it('filters commodity records accurately across hub, mode, and query', () => {
    // 1. By hub
    const delRecords = filterCommodityRecords(11, 'DEL');
    expect(delRecords).toHaveLength(1);
    expect(delRecords[0].hubId).toBe('DEL');
    expect(delRecords[0].hubName).toBe('Delhi NCR');

    // 2. All hubs for month 11
    const allNov = filterCommodityRecords(11, 'ALL');
    expect(allNov).toHaveLength(8);

    // 3. By search query
    const grapeRecords = filterCommodityRecords(1, 'ALL', undefined, 'Grapes');
    expect(grapeRecords.length).toBeGreaterThan(0);
    expect(grapeRecords.some(r => r.hubId === 'BOM')).toBe(true);

    // 4. By mode
    const seaExpRecords = filterCommodityRecords(11, 'ALL', 'Sea Export');
    expect(seaExpRecords).toHaveLength(8);
  });

  it('matches cold chain specs by hub accurately', () => {
    const bomSpecs = getColdChainSpecsByHub('BOM');
    expect(bomSpecs.length).toBeGreaterThan(0);
    const hasGrapes = bomSpecs.some(s => s.commodity.includes('Grapes'));
    expect(hasGrapes).toBe(true);

    const allSpecs = getColdChainSpecsByHub('ALL');
    expect(allSpecs).toHaveLength(14);
  });

  describe('Optimization Structures: MONTH_INDEX, HUB_COLD_CHAIN_MAP, searchHaystack', () => {
    it('verifies MONTH_INDEX contains pre-grouped records for all 12 months with O(1) access', () => {
      expect(MONTH_INDEX.size).toBe(12);

      let totalRecords = 0;
      for (let m = 1; m <= 12; m++) {
        const monthList = MONTH_INDEX.get(m);
        expect(monthList, `month ${m} list`).toBeDefined();
        expect(monthList).toHaveLength(8);
        totalRecords += monthList!.length;

        monthList!.forEach(rec => {
          expect(rec.month).toBe(m);
        });

        // Ensure getMonthlyRecordsByMonth returns identical array
        expect(getMonthlyRecordsByMonth(m)).toBe(monthList);
      }

      expect(totalRecords).toBe(96);
      expect(MONTH_INDEX.get(0)).toBeUndefined();
      expect(MONTH_INDEX.get(13)).toBeUndefined();
      expect(getMonthlyRecordsByMonth(0)).toEqual([]);
      expect(getMonthlyRecordsByMonth(13)).toEqual([]);
    });

    it('verifies HUB_COLD_CHAIN_MAP maps every hub to relevant specs with O(1) lookup', () => {
      const hubs: GatewayHubId[] = ['ALL', 'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'AMD', 'COK'];

      hubs.forEach(hub => {
        expect(HUB_COLD_CHAIN_MAP[hub], `spec array for hub ${hub}`).toBeDefined();
        expect(Array.isArray(HUB_COLD_CHAIN_MAP[hub])).toBe(true);
        expect(getColdChainSpecsByHub(hub)).toBe(HUB_COLD_CHAIN_MAP[hub]);
      });

      // 'ALL' must map to all 14 cold chain specs
      expect(HUB_COLD_CHAIN_MAP.ALL).toHaveLength(14);
      expect(getColdChainSpecsByHub('ALL')).toHaveLength(14);

      // Verify hub-specific domain specs
      const bomSpecs = HUB_COLD_CHAIN_MAP.BOM;
      expect(bomSpecs.some(s => s.commodity.includes('Grapes'))).toBe(true);

      const hydSpecs = HUB_COLD_CHAIN_MAP.HYD;
      expect(hydSpecs.some(s => s.commodity.includes('Vaccines'))).toBe(true);

      const cokSpecs = HUB_COLD_CHAIN_MAP.COK;
      expect(cokSpecs.some(s => s.commodity.includes('Bananas'))).toBe(true);

      // Invalid / unknown hub gracefully yields empty array
      expect(getColdChainSpecsByHub('UNKNOWN' as unknown as GatewayHubId)).toEqual([]);
    });

    it('verifies searchHaystack is pre-compiled on all 96 records and accelerates queries', () => {
      MONTHLY_COMMODITY_RECORDS.forEach((rec, idx) => {
        expect(rec.searchHaystack, `record at index ${idx}`).toBeDefined();
        expect(typeof rec.searchHaystack).toBe('string');
        expect(rec.searchHaystack!.length).toBeGreaterThan(0);

        // searchHaystack must be completely lowercase
        expect(rec.searchHaystack).toBe(rec.searchHaystack!.toLowerCase());

        // Must contain key field substrings in lowercase
        expect(rec.searchHaystack).toContain(rec.hubName.toLowerCase());
        expect(rec.searchHaystack).toContain(rec.hubId.toLowerCase());
        expect(rec.searchHaystack).toContain(rec.season.toLowerCase());

        // Must match compileSearchHaystack helper output
        expect(rec.searchHaystack).toBe(compileSearchHaystack(rec));
      });
    });

    it('filters accurately using single-pass composite filter with searchHaystack', () => {
      // Query by cluster keyword
      const nashikResults = filterCommodityRecords(1, 'ALL', undefined, 'Nashik');
      expect(nashikResults.length).toBeGreaterThan(0);
      expect(nashikResults.every(r => r.searchHaystack?.includes('nashik'))).toBe(true);

      // Query by equipment keyword
      const reeferResults = filterCommodityRecords(1, 'ALL', undefined, 'reefer');
      expect(reeferResults.length).toBeGreaterThan(0);
      expect(reeferResults.every(r => r.searchHaystack?.includes('reefer'))).toBe(true);

      // Combined month + hub + mode + query
      const specificFilter = filterCommodityRecords(1, 'BOM', 'Air Export', 'Grapes');
      expect(specificFilter).toHaveLength(1);
      expect(specificFilter[0].hubId).toBe('BOM');
      expect(specificFilter[0].month).toBe(1);
      expect(specificFilter[0].airExport).toContain('Grapes');

      // Empty/whitespace query returns all candidates for month/hub
      const emptyQueryResults = filterCommodityRecords(2, 'DEL', undefined, '   ');
      expect(emptyQueryResults).toHaveLength(1);
      expect(emptyQueryResults[0].hubId).toBe('DEL');

      // Month out of 1-12 range falls back to all records
      const allMonthsQuery = filterCommodityRecords(99, 'ALL', undefined, 'Basmati');
      expect(allMonthsQuery.length).toBeGreaterThan(0);
      expect(allMonthsQuery.some(r => r.hubId === 'DEL')).toBe(true);
    });
  });
});
