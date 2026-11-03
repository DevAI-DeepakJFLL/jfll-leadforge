import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ApolloSubTabSwitcher } from '@/components/apollo/ApolloSubTabSwitcher';

describe('ApolloSubTabSwitcher Component (Option A - Segmented Pill Control)', () => {
  it('renders Companies and People subtabs with their respective counts', () => {
    const html = renderToString(
      <ApolloSubTabSwitcher
        activeSubTab="companies"
        onSubTabChange={() => {}}
        companiesCount="686.7k"
        peopleCount="684.1k"
      />
    );

    expect(html).toContain('Companies');
    expect(html).toContain('686.7k');
    expect(html).toContain('People');
    expect(html).toContain('684.1k');
    expect(html).toContain('Apollo Global Database (15.5M Contacts • 686.7k Shippers)');
  });

  it('renders default fallback counts of 686.7k companies and 684.1k people when counts omitted', () => {
    const html = renderToString(
      <ApolloSubTabSwitcher
        activeSubTab="companies"
        onSubTabChange={() => {}}
      />
    );

    expect(html).toContain('686.7k');
    expect(html).toContain('684.1k');
    expect(html).toContain('Apollo Global Database (15.5M Contacts • 686.7k Shippers)');
  });

  it('marks Companies as active when activeSubTab is companies', () => {
    const html = renderToString(
      <ApolloSubTabSwitcher
        activeSubTab="companies"
        onSubTabChange={() => {}}
      />
    );

    // Companies button has aria-selected="true"
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Companies');
  });

  it('marks People as active when activeSubTab is people', () => {
    const html = renderToString(
      <ApolloSubTabSwitcher
        activeSubTab="people"
        onSubTabChange={() => {}}
      />
    );

    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('People');
  });
});
