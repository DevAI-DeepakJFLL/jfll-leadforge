import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { isValidEmailAddress, isValidPhoneNumber } from '@/utils/apolloUtils';
import { EmailRevealDialog } from '@/components/leads/EmailRevealDialog';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { Lead } from '@/types/lead';

describe('People Contact Information Validation & UI Resilience', () => {
  describe('isValidEmailAddress', () => {
    it('accepts legitimate corporate and personal email addresses', () => {
      expect(isValidEmailAddress('adonai.leiva@walmart.com')).toBe(true);
      expect(isValidEmailAddress('john.doe@logistics.co.in')).toBe(true);
      expect(isValidEmailAddress('cargo.lead+ops@freight-hub.org')).toBe(true);
    });

    it('rejects fake mock and placeholder strings', () => {
      expect(isValidEmailAddress('Email Protected (Click Reveal)')).toBe(false);
      expect(isValidEmailAddress('No contact information available')).toBe(false);
      expect(isValidEmailAddress('Unavailable')).toBe(false);
      expect(isValidEmailAddress(null)).toBe(false);
      expect(isValidEmailAddress(undefined)).toBe(false);
      expect(isValidEmailAddress('')).toBe(false);
      expect(isValidEmailAddress('   ')).toBe(false);
      expect(isValidEmailAddress('notanemail')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('accepts legitimate phone numbers with standard digits', () => {
      expect(isValidPhoneNumber('+1 (408) 555-0199')).toBe(true);
      expect(isValidPhoneNumber('+91 22 2830 1234')).toBe(true);
      expect(isValidPhoneNumber('+44 20 7946 0991')).toBe(true);
    });

    it('rejects switchboard and placeholder phone strings', () => {
      expect(isValidPhoneNumber('+1 (555) Switchboard')).toBe(false);
      expect(isValidPhoneNumber('Switchboard')).toBe(false);
      expect(isValidPhoneNumber('No contact information available')).toBe(false);
      expect(isValidPhoneNumber('Unavailable')).toBe(false);
      expect(isValidPhoneNumber('—')).toBe(false);
      expect(isValidPhoneNumber('-')).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
      expect(isValidPhoneNumber(undefined)).toBe(false);
      expect(isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('EmailRevealDialog Component', () => {
    const leadWithoutContact: Lead = {
      id: 'lead-no-contact-1',
      name: 'Priya Sharma',
      title: 'Head of Global Supply Chain',
      company: 'Tata Steel',
      companyLogo: '',
      industry: 'Manufacturing / Freight',
      department: 'Supply Chain & Logistics',
      status: 'NET NEW',
      decisionMaker: true,
      location: 'Mumbai, Maharashtra, India',
      email: 'No contact information available',
      phone: 'No contact information available',
      linkedin: 'https://www.linkedin.com/in/priya-sharma',
      employees: '10,000+ Enterprise',
      revenue: '$1B+ Enterprise',
      funding: 'Commercial Freight Shipper',
      saved: false,
    };

    const leadWithVerifiedContact: Lead = {
      id: 'lead-verified-1',
      name: 'Carlos Mendes',
      title: 'VP Operations & Logistics',
      company: 'Embraer',
      companyLogo: '',
      industry: 'Aviation & Freight',
      department: 'Operations',
      status: 'NET NEW',
      decisionMaker: true,
      location: 'São Paulo, Brazil',
      email: 'carlos.mendes@embraer.com.br',
      phone: '+55 11 3840-0000',
      workPhone: '+55 11 3840-1111',
      linkedin: 'https://www.linkedin.com/in/carlosmendes',
      employees: '5,000+ Enterprise',
      revenue: '$500M+ Enterprise',
      funding: 'Commercial Freight Shipper',
      saved: false,
    };

    it('displays "No contact information available" cleanly when email and phone are unavailable', () => {
      const html = renderToString(
        <EmailRevealDialog
          isOpen={true}
          lead={leadWithoutContact}
          onClose={vi.fn()}
        />
      );

      // Verify that fake SaaS badges do NOT appear
      expect(html).not.toContain('Verified 100% Deliverable');
      expect(html).not.toContain('SMTP Validated');
      expect(html).not.toContain('Zero Bounce Guarantee');
      expect(html).not.toContain('Email Protected');
      expect(html).not.toContain('Switchboard');

      // Verify that clean "Not On File" badge and "No contact information available" appear
      expect(html).toContain('Not On File');
      expect(html).toContain('No contact information available');

      // Verify LinkedIn fallback CTA appears instead of Compose Email
      expect(html).toContain('Connect on LinkedIn');
    });

    it('displays verified badges, copy button, and Compose Email when valid email is available', () => {
      const html = renderToString(
        <EmailRevealDialog
          isOpen={true}
          lead={leadWithVerifiedContact}
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Verified 100% Deliverable');
      expect(html).toContain('SMTP Validated');
      expect(html).toContain('carlos.mendes@embraer.com.br');
      expect(html).toContain('+55 11 3840-0000');
      expect(html).toContain('Compose Email');
    });
  });

  describe('LeadsTable Component', () => {
    const leads: Lead[] = [
      {
        id: 'row-1',
        name: 'Adonai Leiva',
        title: 'Director of Sourcing and Supply Chain',
        company: 'Walmart',
        companyLogo: '',
        industry: 'Retail / Freight',
        status: 'NET NEW',
        location: 'Bentonville, Arkansas, United States',
        email: 'adonai.leiva@walmart.com',
        phone: 'No contact information available',
        employees: '10,000+ Enterprise',
        revenue: '$1B+ Enterprise',
        funding: 'Commercial Freight Shipper',
        saved: false,
      },
      {
        id: 'row-2',
        name: 'John Unknown',
        title: 'Logistics Coordinator',
        company: 'Local Shippers LLC',
        companyLogo: '',
        industry: 'Freight',
        status: 'COLD',
        location: 'Chicago, Illinois, United States',
        email: 'No contact information available',
        phone: 'No contact information available',
        employees: '500+ Enterprise',
        revenue: '$10M+ Enterprise',
        funding: 'Commercial Freight Shipper',
        saved: false,
      },
    ];

    it('renders "View Email" button for leads with email and "No Contact Info" for leads without email', () => {
      const html = renderToString(
        <LeadsTable
          leads={leads}
          currentPage={1}
          totalPages={1}
          totalItems={2}
          rowSelection={{}}
          onRowSelectionChange={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      // Row 1 has email -> "View Email"
      expect(html).toContain('View Email');

      // Row 2 has no email -> "No Contact Info"
      expect(html).toContain('No Contact Info');
    });
  });
});
