import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TopHeader } from '@/components/layout/TopHeader';

describe('TopHeader Navigation & Landing Tab', () => {
  it('renders JFLL Customers as the first primary tab with badge 2.7k', () => {
    const html = renderToString(
      <TopHeader
        activeTab="jfll-customers"
        onTabChange={() => {}}
      />
    );

    // Verify JFLL Customers tab is present and rendered first
    expect(html).toContain('JFLL Customers');
    expect(html).toContain('2.7k');
    expect(html).toContain('aria-current="page"');

    // Verify subsequent tabs
    expect(html).toContain('Companies');
    expect(html).toContain('690k');
    expect(html).toContain('People');
    expect(html).toContain('766k');
    expect(html).toContain('DataMyne');
    expect(html).toContain('37.3k');
  });

  it('renders correctly when activeTab is switched to companies or people', () => {
    const htmlCompanies = renderToString(
      <TopHeader
        activeTab="companies"
        onTabChange={() => {}}
      />
    );
    expect(htmlCompanies).toContain('Companies');

    const htmlPeople = renderToString(
      <TopHeader
        activeTab="people"
        onTabChange={() => {}}
      />
    );
    expect(htmlPeople).toContain('People');
  });
});
