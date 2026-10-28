import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ApolloSubTabSwitcher } from '@/components/apollo/ApolloSubTabSwitcher';

describe('ApolloSubTabSwitcher Component (Option A - Segmented Pill Control)', () => {
  it('renders Companies and People subtabs with their respective counts', () => {
    const html = renderToString(
      <ApolloSubTabSwitcher
        activeSubTab="companies"
        onSubTabChange={() => {}}
        companiesCount="690k"
        peopleCount="766k"
      />
    );

    expect(html).toContain('Companies');
    expect(html).toContain('690k');
    expect(html).toContain('People');
    expect(html).toContain('766k');
    expect(html).toContain('Apollo Global Freight Data (1.45M)');
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
