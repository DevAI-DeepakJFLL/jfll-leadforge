import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TopHeader } from '@/components/layout/TopHeader';
import { AppDock } from '@/components/layout/AppDock';
import { DatamyneDetailDrawer } from '@/components/datamyne/DatamyneDetailDrawer';
import { ApolloDetailDrawer } from '@/components/apollo/ApolloDetailDrawer';
import { ToastProvider } from '@/components/ui/Toast';
import { UserSession, canAccessLeadTracker } from '@/types/auth';
import { DatamyneLead } from '@/types/datamyneLead';
import { ApolloLead } from '@/types/apolloLead';

describe('Lead Tracker Navigation & Cross-Drawer Integration Suite (Task 5)', () => {
  // Test user sessions
  const deepakSession: UserSession = {
    email: 'deepak@jfll.com',
    name: 'Deepak Naidu',
    role: 'Tech Lead',
    token: 'jwt-deepak-test',
  };

  const tyraSession: UserSession = {
    email: 'tyra.theknath@jfll.com',
    name: 'Tyra Theknath',
    role: 'Leadership',
    token: 'jwt-tyra-test',
  };

  const tyraAltSession: UserSession = {
    email: 'tyra@jfll.com',
    name: 'Tyra Theknath',
    role: 'Leadership',
    token: 'jwt-tyra-alt-test',
  };

  const adminSession: UserSession = {
    email: 'admin.support@jfll.com',
    name: 'Admin User',
    role: 'Admin',
    token: 'jwt-admin-test',
  };

  const akashSession: UserSession = {
    email: 'akash.dhara@jfll.com',
    name: 'Akash Dhara',
    role: 'Operations',
    token: 'jwt-akash-test',
  };

  const snehalSession: UserSession = {
    email: 'snehal.birje@jfll.com',
    name: 'Snehal Birje',
    role: 'Commercial',
    token: 'jwt-snehal-test',
  };

  const coordinatorSession: UserSession = {
    email: 'edward@jfll.com',
    name: 'Edward Sales',
    role: 'Sales Coordinator',
    token: 'jwt-edward-test',
  };

  // Mock test leads
  const mockDatamyneLead: DatamyneLead = {
    id: 'dm-nav-test-1',
    company_name: 'ROYAL ARC ELECTRODES LTD',
    role: 'Exporter',
    category: 'Pharma',
    subcategory: 'Formulations',
    contact_type: 'Both Phone & Email',
    phone: '+91 9820011223',
    email: 'export@royalarc.com',
    tax_id: '0388123456',
    city: 'Mumbai',
    address: 'Plot 45, Andheri East',
    pin_code: '400069',
    directors: 'Edward Director; Jane Partner',
    total_shipments: 85,
    total_value_usd: 1250000,
    latest_activity_date: '2026-02-15',
    dataset_type: 'valid',
    transport_mode: 'Air',
    trade_lanes: 'USA/Air',
    top_hs_codes: '30049099',
  };

  const mockApolloLead: ApolloLead = {
    organization_id: 'apo-nav-test-1',
    organization_name: 'CLEARSYNTH LABS LIMITED',
    domain: 'clearsynth.com',
    website_url: 'https://www.clearsynth.com',
    phone: '+91 22 6745 0000',
    employee_count: 350,
    revenue_usd: 45000000,
    founded_year: 2010,
    industry: 'Pharmaceuticals & Life Sciences',
    hq_city: 'Mumbai',
    hq_state: 'Maharashtra',
    hq_country: 'India',
  };

  describe('RBAC Evaluation Helper (canAccessLeadTracker)', () => {
    it('authorizes Deepak by primary executive email', () => {
      expect(canAccessLeadTracker(deepakSession)).toBe(true);
      expect(canAccessLeadTracker({ email: 'DEEPAK@JFLL.COM', role: 'Any' })).toBe(true);
    });

    it('authorizes Tyra by full corporate and shortened emails', () => {
      expect(canAccessLeadTracker(tyraSession)).toBe(true);
      expect(canAccessLeadTracker(tyraAltSession)).toBe(true);
      expect(canAccessLeadTracker({ email: 'Tyra.Theknath@jfll.com', role: 'Staff' })).toBe(true);
    });

    it('authorizes Leadership, Tech Lead, and Admin roles regardless of email', () => {
      expect(canAccessLeadTracker(adminSession)).toBe(true);
      expect(canAccessLeadTracker({ email: 'leader@jfll.com', role: 'Leadership' })).toBe(true);
      expect(canAccessLeadTracker({ email: 'lead@jfll.com', role: 'Tech Lead' })).toBe(true);
      expect(canAccessLeadTracker({ email: 'admin@jfll.com', role: 'Admin' })).toBe(true);
    });

    it('denies non-admin roles: Akash (Operations), Snehal (Commercial), and general coordinators', () => {
      expect(canAccessLeadTracker(akashSession)).toBe(false);
      expect(canAccessLeadTracker(snehalSession)).toBe(false);
      expect(canAccessLeadTracker(coordinatorSession)).toBe(false);
      expect(canAccessLeadTracker(null)).toBe(false);
      expect(canAccessLeadTracker(undefined)).toBe(false);
    });
  });

  describe('TopHeader Lead Tracker Navigation Tab', () => {
    it('renders Lead Tracker tab with "Active" badge for Deepak', () => {
      const html = renderToString(
        <TopHeader
          activeTab="jfll-customers"
          currentUser={deepakSession}
          onTabChange={() => {}}
        />
      );

      expect(html).toContain('Lead Tracker');
      expect(html).toContain('Active');
      // Positioned after DataMyne
      const datamyneIdx = html.indexOf('DataMyne');
      const trackerIdx = html.indexOf('Lead Tracker');
      expect(datamyneIdx).toBeGreaterThan(-1);
      expect(trackerIdx).toBeGreaterThan(datamyneIdx);
    });

    it('renders Lead Tracker tab with "Active" badge for Tyra', () => {
      const html = renderToString(
        <TopHeader
          activeTab="jfll-customers"
          currentUser={tyraSession}
          onTabChange={() => {}}
        />
      );

      expect(html).toContain('Lead Tracker');
      expect(html).toContain('Active');
    });

    it('marks Lead Tracker tab as active with aria-current="page" when activeTab is tracker', () => {
      const html = renderToString(
        <TopHeader
          activeTab="tracker"
          currentUser={deepakSession}
          onTabChange={() => {}}
        />
      );

      expect(html).toContain('Lead Tracker');
      expect(html).toContain('aria-current="page"');
    });

    it('strictly hides Lead Tracker tab for non-admin users (Akash & Snehal)', () => {
      const htmlAkash = renderToString(
        <TopHeader
          activeTab="jfll-customers"
          currentUser={akashSession}
          onTabChange={() => {}}
        />
      );
      expect(htmlAkash).not.toContain('Lead Tracker');

      const htmlSnehal = renderToString(
        <TopHeader
          activeTab="jfll-customers"
          currentUser={snehalSession}
          onTabChange={() => {}}
        />
      );
      expect(htmlSnehal).not.toContain('Lead Tracker');
    });

    it('hides Lead Tracker tab when currentUser is null or anonymous', () => {
      const htmlAnonymous = renderToString(
        <TopHeader
          activeTab="jfll-customers"
          currentUser={null}
          onTabChange={() => {}}
        />
      );
      expect(htmlAnonymous).not.toContain('Lead Tracker');
    });
  });

  describe('AppDock Navigation Item', () => {
    it('renders Lead Tracker navigation dock button for Deepak', () => {
      const html = renderToString(
        <AppDock
          activeNav="search"
          currentUser={deepakSession}
          onNavChange={() => {}}
        />
      );

      expect(html).toContain('Lead Tracker');
      expect(html).toContain('Tracker');
    });

    it('renders Lead Tracker navigation dock button for Tyra', () => {
      const html = renderToString(
        <AppDock
          activeNav="tracker"
          currentUser={tyraSession}
          onNavChange={() => {}}
        />
      );

      expect(html).toContain('Lead Tracker');
      expect(html).toContain('Tracker');
    });

    it('strictly hides Lead Tracker dock item for Akash and unauthenticated users', () => {
      const htmlAkash = renderToString(
        <AppDock
          activeNav="search"
          currentUser={akashSession}
          onNavChange={() => {}}
        />
      );
      expect(htmlAkash).not.toContain('Lead Tracker');

      const htmlAnonymous = renderToString(
        <AppDock
          activeNav="search"
          currentUser={null}
          onNavChange={() => {}}
        />
      );
      expect(htmlAnonymous).not.toContain('Lead Tracker');
    });
  });

  describe('Cross-Drawer "Assign & Track" CTAs', () => {
    it('omits "Assign & Track" button in DatamyneDetailDrawer since activity logging is handled in timeline', () => {
      const html = renderToString(
        <ToastProvider>
          <DatamyneDetailDrawer
            isOpen={true}
            lead={mockDatamyneLead}
            onClose={() => {}}
          />
        </ToastProvider>
      );

      expect(html).not.toContain('Assign &amp; Track');
      expect(html).toContain('ROYAL ARC ELECTRODES LTD');
    });

    it('renders "Assign & Track" button in ApolloDetailDrawer when onAssignToTracker is provided', () => {
      const onAssignSpy = vi.fn();
      const html = renderToString(
        <ApolloDetailDrawer
          isOpen={true}
          lead={mockApolloLead}
          onClose={() => {}}
          onAssignToTracker={onAssignSpy}
        />
      );

      expect(html).toContain('Assign &amp; Track');
      expect(html).toContain('Assign CLEARSYNTH LABS LIMITED to freight sales coordinator');
      expect(html).toContain('CLEARSYNTH LABS LIMITED');
    });

    it('omits "Assign & Track" button in ApolloDetailDrawer when handler is not provided', () => {
      const html = renderToString(
        <ApolloDetailDrawer
          isOpen={true}
          lead={mockApolloLead}
          onClose={() => {}}
        />
      );

      expect(html).not.toContain('Assign &amp; Track');
    });
  });
});
