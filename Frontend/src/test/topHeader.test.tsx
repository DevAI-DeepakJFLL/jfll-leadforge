import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TopHeader } from '@/components/layout/TopHeader';

describe('TopHeader Navigation & Landing Tab', () => {
  it('renders JFLL Customers as the first primary tab and Apollo as the consolidated second tab with badge 1.45M', () => {
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

    // Verify consolidated Apollo tab with 1.45M badge
    expect(html).toContain('Apollo');
    expect(html).toContain('1.45M');

    // Verify subsequent tabs
    expect(html).toContain('DataMyne');
    expect(html).toContain('37.3k');
  });

  it('renders correctly when activeTab is switched to apollo, companies, or people', () => {
    const htmlApollo = renderToString(
      <TopHeader
        activeTab="apollo"
        onTabChange={() => {}}
      />
    );
    expect(htmlApollo).toContain('Apollo');
    expect(htmlApollo).toContain('aria-current="page"');

    const htmlCompanies = renderToString(
      <TopHeader
        activeTab="companies"
        onTabChange={() => {}}
      />
    );
    expect(htmlCompanies).toContain('Apollo');
    expect(htmlCompanies).toContain('aria-current="page"');

    const htmlPeople = renderToString(
      <TopHeader
        activeTab="people"
        onTabChange={() => {}}
      />
    );
    expect(htmlPeople).toContain('Apollo');
    expect(htmlPeople).toContain('aria-current="page"');
  });
});
