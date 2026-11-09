import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { UnifiedSidebar, isUserAdmin, getInitials } from '@/components/layout/UnifiedSidebar';
import { UserSession } from '@/types/auth';

/**
 * Traverses a ReactElement tree to locate elements matching a predicate.
 */
function findElements(
  node: React.ReactNode,
  predicate: (el: React.ReactElement) => boolean,
  results: React.ReactElement[] = []
): React.ReactElement[] {
  if (!node) return results;
  if (React.isValidElement(node)) {
    if (predicate(node)) {
      results.push(node);
    }
    findElements(node.props.children, predicate, results);
  } else if (Array.isArray(node)) {
    for (const item of node) {
      findElements(item, predicate, results);
    }
  }
  return results;
}

function findElement(
  node: React.ReactNode,
  predicate: (el: React.ReactElement) => boolean
): React.ReactElement | null {
  const matches = findElements(node, predicate);
  return matches.length > 0 ? matches[0] : null;
}

describe('UnifiedSidebar Component Suite', () => {
  const mockLeadershipUser: UserSession = {
    name: 'Tyra Theknath',
    email: 'tyra.theknath@jfll.com',
    role: 'Leadership',
    token: 'mock-tyra-jwt',
  };

  const mockTechLeadUser: UserSession = {
    name: 'Deepak Naidu',
    email: 'deepak@jfll.com',
    role: 'Tech Lead',
    token: 'mock-deepak-jwt',
  };

  const mockOperationsUser: UserSession = {
    name: 'Akash Dhara',
    email: 'akash.dhara@jfll.com',
    role: 'Operations',
    token: 'mock-akash-jwt',
  };

  describe('1. Expanded vs Collapsed Rendering', () => {
    it('renders in expanded state with w-64, visible labels, badges, and collapse button', () => {
      const html = renderToString(
        <UnifiedSidebar
          isCollapsed={false}
          currentUser={mockLeadershipUser}
          activeTab="jfll-customers"
        />
      );

      // Width check
      expect(html).toContain('w-64');
      expect(html).not.toContain('w-16');

      // Sections
      expect(html).toContain('DATA POOLS');
      expect(html).toContain('OUTREACH &amp; VIEWS');

      // Nav item labels
      expect(html).toContain('JFLL Customers');
      expect(html).toContain('DataMyne Leads');
      expect(html).toContain('Apollo Leads');
      expect(html).toContain('Client Reports');
      expect(html).toContain('Saved Searches');
      expect(html).toContain('Saved Lists');

      // Static badges
      expect(html).toContain('2.7k');
      expect(html).toContain('37.3k');
      expect(html).toContain('1.45M');

      // Collapse button
      expect(html).toContain('aria-label="Collapse sidebar"');
      expect(html).toContain('title="Collapse sidebar"');
    });

    it('renders in collapsed state with w-16 and expand button', () => {
      const html = renderToString(
        <UnifiedSidebar
          isCollapsed={true}
          currentUser={mockLeadershipUser}
          activeTab="jfll-customers"
        />
      );

      // Width check
      expect(html).toContain('w-16');
      expect(html).not.toContain('w-64');

      // Expand button
      expect(html).toContain('aria-label="Expand sidebar"');
      expect(html).toContain('title="Expand sidebar"');

      // Screen reader section title preservation
      expect(html).toContain('sr-only');
    });
  });

  describe('2. Navigation Item Click Handlers', () => {
    it('triggers onTabChange with correct tabId when clicking each navigation item', () => {
      const onTabChange = vi.fn();
      const vdom = UnifiedSidebar({
        onTabChange,
        activeTab: 'jfll-customers',
        isCollapsed: false,
      });

      const navTabs = [
        { label: 'JFLL Customers', expectedId: 'jfll-customers' },
        { label: 'DataMyne Leads', expectedId: 'datamyne' },
        { label: 'Apollo Leads', expectedId: 'apollo' },
        { label: 'Client Reports', expectedId: 'report' },
        { label: 'Saved Searches', expectedId: 'saved-searches' },
        { label: 'Saved Lists', expectedId: 'saved-lists' },
      ];

      for (const tab of navTabs) {
        onTabChange.mockClear();
        const btn = findElement(vdom, (el) => el.props['aria-label'] === tab.label);
        expect(btn).toBeTruthy();
        btn!.props.onClick();
        expect(onTabChange).toHaveBeenCalledTimes(1);
        expect(onTabChange).toHaveBeenCalledWith(tab.expectedId);
      }
    });
  });

  describe('3. Collapse/Expand Toggle Button', () => {
    it('triggers onToggleCollapse when collapse button is clicked in expanded state', () => {
      const onToggleCollapse = vi.fn();
      const vdom = UnifiedSidebar({
        isCollapsed: false,
        onToggleCollapse,
      });

      const toggleBtn = findElement(
        vdom,
        (el) => el.props['aria-label'] === 'Collapse sidebar'
      );
      expect(toggleBtn).toBeTruthy();
      toggleBtn!.props.onClick();
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('triggers onToggleCollapse when expand button is clicked in collapsed state', () => {
      const onToggleCollapse = vi.fn();
      const vdom = UnifiedSidebar({
        isCollapsed: true,
        onToggleCollapse,
      });

      const toggleBtn = findElement(
        vdom,
        (el) => el.props['aria-label'] === 'Expand sidebar'
      );
      expect(toggleBtn).toBeTruthy();
      toggleBtn!.props.onClick();
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Active State Styling', () => {
    it('applies aria-current="page" and active styling for the selected tab', () => {
      const html = renderToString(
        <UnifiedSidebar
          activeTab="jfll-customers"
          currentUser={mockLeadershipUser}
        />
      );

      expect(html).toContain('aria-current="page"');
      expect(html).toContain('bg-apollo-50');
      expect(html).toContain('text-apollo font-semibold');
    });

    it('activates apollo tab when activeTab is apollo, companies, or people', () => {
      const vdomApollo = UnifiedSidebar({ activeTab: 'apollo' });
      const apolloBtn1 = findElement(vdomApollo, (el) => el.props['aria-label'] === 'Apollo Leads');
      expect(apolloBtn1?.props['aria-current']).toBe('page');

      const vdomCompanies = UnifiedSidebar({ activeTab: 'companies' });
      const apolloBtn2 = findElement(vdomCompanies, (el) => el.props['aria-label'] === 'Apollo Leads');
      expect(apolloBtn2?.props['aria-current']).toBe('page');

      const vdomPeople = UnifiedSidebar({ activeTab: 'people' });
      const apolloBtn3 = findElement(vdomPeople, (el) => el.props['aria-label'] === 'Apollo Leads');
      expect(apolloBtn3?.props['aria-current']).toBe('page');
    });

    it('does not set aria-current on unselected tabs', () => {
      const vdom = UnifiedSidebar({ activeTab: 'report' });
      const jfllBtn = findElement(vdom, (el) => el.props['aria-label'] === 'JFLL Customers');
      const datamyneBtn = findElement(vdom, (el) => el.props['aria-label'] === 'DataMyne Leads');
      const reportBtn = findElement(vdom, (el) => el.props['aria-label'] === 'Client Reports');

      expect(jfllBtn?.props['aria-current']).toBeUndefined();
      expect(datamyneBtn?.props['aria-current']).toBeUndefined();
      expect(reportBtn?.props['aria-current']).toBe('page');
    });
  });

  describe('5. User Profile Display', () => {
    it('displays initials avatar, full name, and role pill in expanded mode', () => {
      const html = renderToString(
        <UnifiedSidebar
          currentUser={mockLeadershipUser}
          isCollapsed={false}
        />
      );

      expect(html).toContain('TT');
      expect(html).toContain('Tyra Theknath');
      expect(html).toContain('Leadership');
    });

    it('displays initials avatar for Tech Lead user Deepak Naidu', () => {
      const html = renderToString(
        <UnifiedSidebar
          currentUser={mockTechLeadUser}
          isCollapsed={false}
        />
      );

      expect(html).toContain('DN');
      expect(html).toContain('Deepak Naidu');
      expect(html).toContain('Tech Lead');
    });

    it('renders avatar and accessible labels in collapsed mode', () => {
      const html = renderToString(
        <UnifiedSidebar
          currentUser={mockLeadershipUser}
          isCollapsed={true}
        />
      );

      expect(html).toContain('TT');
      expect(html).toContain('aria-label="Avatar for Tyra Theknath"');
      expect(html).toContain('Tyra Theknath (Leadership)');
    });
  });

  describe('6. Admin Portal Button Visibility and Interaction', () => {
    it('renders admin portal button when role is Leadership or Tech Lead', () => {
      const onOpenAdminPortal = vi.fn();
      const htmlLeadership = renderToString(
        <UnifiedSidebar
          currentUser={mockLeadershipUser}
          onOpenAdminPortal={onOpenAdminPortal}
          pendingRequestsCount={3}
        />
      );
      expect(htmlLeadership).toContain('aria-label="Admin Portal"');
      expect(htmlLeadership).toContain('3 pending requests');

      const htmlTechLead = renderToString(
        <UnifiedSidebar
          currentUser={mockTechLeadUser}
          onOpenAdminPortal={onOpenAdminPortal}
        />
      );
      expect(htmlTechLead).toContain('aria-label="Admin Portal"');
    });

    it('does NOT render admin portal button for non-admin users (Operations)', () => {
      const htmlOperations = renderToString(
        <UnifiedSidebar
          currentUser={mockOperationsUser}
        />
      );
      expect(htmlOperations).not.toContain('aria-label="Admin Portal"');
      expect(htmlOperations).not.toContain('title="Admin Portal"');
    });

    it('triggers onOpenAdminPortal when admin portal button is clicked', () => {
      const onOpenAdminPortal = vi.fn();
      const vdom = UnifiedSidebar({
        currentUser: mockLeadershipUser,
        onOpenAdminPortal,
      });

      const adminBtn = findElement(vdom, (el) => el.props['aria-label'] === 'Admin Portal');
      expect(adminBtn).toBeTruthy();
      adminBtn!.props.onClick();
      expect(onOpenAdminPortal).toHaveBeenCalledTimes(1);
    });
  });

  describe('7. Logout and Utility Buttons', () => {
    it('triggers onLogout when logout button is clicked', () => {
      const onLogout = vi.fn();
      const vdom = UnifiedSidebar({
        currentUser: mockLeadershipUser,
        onLogout,
      });

      const logoutBtn = findElement(vdom, (el) => el.props['aria-label'] === 'Logout');
      expect(logoutBtn).toBeTruthy();
      logoutBtn!.props.onClick();
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('triggers onOpenSettings when settings button is clicked', () => {
      const onOpenSettings = vi.fn();
      const vdom = UnifiedSidebar({
        currentUser: mockLeadershipUser,
        onOpenSettings,
      });

      const settingsBtn = findElement(vdom, (el) => el.props['aria-label'] === 'Settings');
      expect(settingsBtn).toBeTruthy();
      settingsBtn!.props.onClick();
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('renders dynamic badges for saved searches and saved lists when count > 0', () => {
      const html = renderToString(
        <UnifiedSidebar
          savedSearchesCount={5}
          savedListsCount={2}
          isCollapsed={false}
        />
      );

      expect(html).toContain('5');
      expect(html).toContain('2');
    });
  });

  describe('8. Helpers: isUserAdmin & getInitials', () => {
    it('correctly identifies admin users', () => {
      expect(isUserAdmin(mockLeadershipUser)).toBe(true);
      expect(isUserAdmin(mockTechLeadUser)).toBe(true);
      expect(isUserAdmin({ email: 'admin@jfll.com', name: 'Admin', role: 'Administrator', token: '' })).toBe(true);
      expect(isUserAdmin(mockOperationsUser)).toBe(false);
      expect(isUserAdmin(null)).toBe(false);
      expect(isUserAdmin(undefined)).toBe(false);
    });

    it('correctly formats initials', () => {
      expect(getInitials('Tyra Theknath')).toBe('TT');
      expect(getInitials('Deepak Naidu')).toBe('DN');
      expect(getInitials('Administrator')).toBe('AD');
      expect(getInitials('')).toBe('JF');
      expect(getInitials(undefined)).toBe('JF');
    });
  });
});
