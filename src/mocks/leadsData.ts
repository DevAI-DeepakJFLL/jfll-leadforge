import { Lead } from '@/types/lead';

/**
 * Exact leads from reference image (Ref.jpg)
 */
export const referenceLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Roberto Orci',
    title: 'Executive Vice President, Strategic Growth',
    company: '896 Medi',
    companyLogo: '',
    logoBgColor: '#00C2CB', // Cyan circle matching Ref.jpg
    logoTextColor: '#FFFFFF',
    logoInitials: '896',
    industry: 'Marketing & Advertising',
    department: 'Executive',
    status: 'NET NEW',
    location: 'Los Angeles, California',
    city: 'Los Angeles',
    state: 'California',
    country: 'United States',
    email: 'roberto.orci@896medi.com',
    phone: '+1 (213) 555-0192',
    workPhone: '+1 (213) 555-0100',
    linkedin: 'https://linkedin.com/in/roberto-orci',
    employees: '51-200',
    revenue: '$10M - $50M',
    funding: 'Bootstrapped',
    technologies: ['Google Analytics', 'HubSpot', 'Slack', 'WordPress'],
    saved: true,
    jobChange: false,
    createdAt: '2026-03-12T08:30:00Z',
  },
  {
    id: 'lead-2',
    name: 'Gail Cerrone',
    title: 'President',
    company: 'SunMedia',
    companyLogo: '',
    logoBgColor: '#FF7A00', // Orange sun/star badge matching Ref.jpg
    logoTextColor: '#FFFFFF',
    logoInitials: 'SM',
    industry: 'Marketing & Advertising',
    department: 'Executive',
    status: 'COLD',
    location: 'Los Angeles, California',
    city: 'Los Angeles',
    state: 'California',
    country: 'United States',
    email: 'gail@sunmedia.io',
    phone: '+1 (310) 555-0144',
    workPhone: '+1 (310) 555-0110',
    linkedin: 'https://linkedin.com/in/gail-cerrone',
    employees: '201-500',
    revenue: '$50M - $100M',
    funding: 'Series B',
    technologies: ['Salesforce', 'Marketo', 'AWS', 'Looker'],
    saved: true,
    jobChange: false,
    createdAt: '2026-02-18T11:15:00Z',
  },
  {
    id: 'lead-3',
    name: 'Jeffrey Sheridan',
    title: 'Vice President',
    company: 'The Scratch Collective',
    companyLogo: '',
    logoBgColor: '#1D4ED8', // Blue circle matching Ref.jpg
    logoTextColor: '#FFFFFF',
    logoInitials: 'TSC',
    industry: 'Marketing & Advertising',
    department: 'Executive',
    status: 'NET NEW',
    location: 'Los Angeles, California',
    city: 'Los Angeles',
    state: 'California',
    country: 'United States',
    email: 'jeff@thescratchcollective.com',
    phone: '+1 (424) 555-0188',
    workPhone: '+1 (424) 555-0120',
    linkedin: 'https://linkedin.com/in/jeffrey-sheridan',
    employees: '11-50',
    revenue: '$1M - $10M',
    funding: 'Bootstrapped',
    technologies: ['HubSpot', 'Segment', 'Webflow', 'Notion'],
    saved: true,
    jobChange: false,
    createdAt: '2026-04-01T14:20:00Z',
  },
  {
    id: 'lead-4',
    name: 'Marie McCarthy',
    title: 'Vice President Risk Management',
    company: 'Mood Media',
    companyLogo: '',
    logoBgColor: '#18181B', // Black circle matching Ref.jpg
    logoTextColor: '#FFFFFF',
    logoInitials: 'MOOD',
    industry: 'Marketing & Advertising',
    department: 'Risk Management',
    status: 'COLD',
    location: 'Los Angeles, California',
    city: 'Los Angeles',
    state: 'California',
    country: 'United States',
    email: 'marie.m@moodmedia.com',
    phone: '+1 (818) 555-0163',
    workPhone: '+1 (818) 555-0130',
    linkedin: 'https://linkedin.com/in/marie-mccarthy',
    employees: '1000+',
    revenue: '$100M+',
    funding: 'Public',
    technologies: ['Workday', 'SAP', 'Microsoft 365', 'ServiceNow'],
    saved: true,
    jobChange: false,
    createdAt: '2026-01-25T09:45:00Z',
  },
  {
    id: 'lead-5',
    name: 'Roberto Orci',
    title: 'Executive Vice President, Strategic Growth',
    company: '896 Medi',
    companyLogo: '',
    logoBgColor: '#00C2CB',
    logoTextColor: '#FFFFFF',
    logoInitials: '896',
    industry: 'Marketing & Advertising',
    department: 'Executive',
    status: 'NET NEW',
    location: 'Los Angeles, California',
    city: 'Los Angeles',
    state: 'California',
    country: 'United States',
    email: 'roberto.orci@896medi.com',
    phone: '+1 (213) 555-0192',
    workPhone: '+1 (213) 555-0100',
    linkedin: 'https://linkedin.com/in/roberto-orci',
    employees: '51-200',
    revenue: '$10M - $50M',
    funding: 'Bootstrapped',
    technologies: ['Google Analytics', 'HubSpot', 'Slack'],
    saved: true,
    jobChange: false,
    createdAt: '2026-03-12T08:30:00Z',
  },
  {
    id: 'lead-6',
    name: 'Gail Cerrone',
    title: 'President',
    company: 'SunMedia',
    companyLogo: '',
    logoBgColor: '#FF7A00',
    logoTextColor: '#FFFFFF',
    logoInitials: 'SM',
    industry: 'Marketing & Advertising',
    department: 'Executive',
    status: 'NET NEW',
    location: 'Los Angeles, California',
    city: 'Los Angeles',
    state: 'California',
    country: 'United States',
    email: 'gail@sunmedia.io',
    phone: '+1 (310) 555-0144',
    workPhone: '+1 (310) 555-0110',
    linkedin: 'https://linkedin.com/in/gail-cerrone',
    employees: '201-500',
    revenue: '$50M - $100M',
    funding: 'Series B',
    technologies: ['Salesforce', 'Marketo', 'AWS'],
    saved: true,
    jobChange: true,
    createdAt: '2026-02-18T11:15:00Z',
  },
];

interface CompanyTemplate {
  company: string;
  industry: string;
  logoBgColor: string;
  logoTextColor: string;
  logoInitials: string;
  employees: string;
  revenue: string;
  funding: string;
  technologies: string[];
}

const companyTemplates: CompanyTemplate[] = [
  {
    company: '896 Medi',
    industry: 'Marketing & Advertising',
    logoBgColor: '#00C2CB',
    logoTextColor: '#FFFFFF',
    logoInitials: '896',
    employees: '51-200',
    revenue: '$10M - $50M',
    funding: 'Bootstrapped',
    technologies: ['Google Analytics', 'HubSpot', 'Slack'],
  },
  {
    company: 'SunMedia',
    industry: 'Marketing & Advertising',
    logoBgColor: '#FF7A00',
    logoTextColor: '#FFFFFF',
    logoInitials: 'SM',
    employees: '201-500',
    revenue: '$50M - $100M',
    funding: 'Series B',
    technologies: ['Salesforce', 'Marketo', 'AWS'],
  },
  {
    company: 'The Scratch Collective',
    industry: 'Marketing & Advertising',
    logoBgColor: '#1D4ED8',
    logoTextColor: '#FFFFFF',
    logoInitials: 'TSC',
    employees: '11-50',
    revenue: '$1M - $10M',
    funding: 'Bootstrapped',
    technologies: ['HubSpot', 'Segment', 'Webflow'],
  },
  {
    company: 'Mood Media',
    industry: 'Marketing & Advertising',
    logoBgColor: '#18181B',
    logoTextColor: '#FFFFFF',
    logoInitials: 'MOOD',
    employees: '1000+',
    revenue: '$100M+',
    funding: 'Public',
    technologies: ['Workday', 'SAP', 'Microsoft 365'],
  },
  {
    company: 'Apex Logistics Global',
    industry: 'Logistics & Supply Chain',
    logoBgColor: '#059669',
    logoTextColor: '#FFFFFF',
    logoInitials: 'ALG',
    employees: '501-1000',
    revenue: '$50M - $100M',
    funding: 'Growth Equity',
    technologies: ['Oracle TMS', 'Descartes', 'SAP'],
  },
  {
    company: 'CloudScale Systems',
    industry: 'Technology',
    logoBgColor: '#7C3AED',
    logoTextColor: '#FFFFFF',
    logoInitials: 'CSS',
    employees: '201-500',
    revenue: '$10M - $50M',
    funding: 'Series C',
    technologies: ['AWS', 'Kubernetes', 'Datadog', 'Snowflake'],
  },
  {
    company: 'Velocity Freight Solutions',
    industry: 'Logistics & Supply Chain',
    logoBgColor: '#D97706',
    logoTextColor: '#FFFFFF',
    logoInitials: 'VFS',
    employees: '51-200',
    revenue: '$10M - $50M',
    funding: 'Series A',
    technologies: ['Turvo', 'Project44', 'HubSpot'],
  },
  {
    company: 'Sentinel Cybersecurity',
    industry: 'Technology',
    logoBgColor: '#E11D48',
    logoTextColor: '#FFFFFF',
    logoInitials: 'SCS',
    employees: '1000+',
    revenue: '$100M+',
    funding: 'Public',
    technologies: ['CrowdStrike', 'Splunk', 'AWS', 'GCP'],
  },
  {
    company: 'NovaBio Therapeutics',
    industry: 'Healthcare & Biotech',
    logoBgColor: '#0D9488',
    logoTextColor: '#FFFFFF',
    logoInitials: 'NBT',
    employees: '51-200',
    revenue: '$10M - $50M',
    funding: 'Series B',
    technologies: ['Veeva', 'Salesforce Health Cloud', 'Box'],
  },
  {
    company: 'Horizon Financial Partners',
    industry: 'Financial Services',
    logoBgColor: '#4F46E5',
    logoTextColor: '#FFFFFF',
    logoInitials: 'HFP',
    employees: '501-1000',
    revenue: '$50M - $100M',
    funding: 'Private Equity',
    technologies: ['Bloomberg', 'Salesforce Financial Services', 'Azure'],
  },
  {
    company: 'FreightStream Global',
    industry: 'Logistics & Supply Chain',
    logoBgColor: '#0284C7',
    logoTextColor: '#FFFFFF',
    logoInitials: 'FSG',
    employees: '201-500',
    revenue: '$10M - $50M',
    funding: 'Series B',
    technologies: ['CargoWise', 'FourKites', 'Tableau'],
  },
  {
    company: 'Quantum AI Labs',
    industry: 'Technology',
    logoBgColor: '#C026D3',
    logoTextColor: '#FFFFFF',
    logoInitials: 'QAI',
    employees: '11-50',
    revenue: '$1M - $10M',
    funding: 'Seed',
    technologies: ['PyTorch', 'OpenAI', 'GCP', 'PostgreSQL'],
  },
  {
    company: 'Pulse Commerce',
    industry: 'E-Commerce & Retail',
    logoBgColor: '#EA580C',
    logoTextColor: '#FFFFFF',
    logoInitials: 'PC',
    employees: '51-200',
    revenue: '$10M - $50M',
    funding: 'Series A',
    technologies: ['Shopify Plus', 'Klaviyo', 'Gorgias', 'Stripe'],
  },
  {
    company: 'Beacon Media Interactive',
    industry: 'Marketing & Advertising',
    logoBgColor: '#9333EA',
    logoTextColor: '#FFFFFF',
    logoInitials: 'BMI',
    employees: '11-50',
    revenue: '$1M - $10M',
    funding: 'Bootstrapped',
    technologies: ['Meta Ads', 'TikTok Ads', 'Google Ads'],
  },
  {
    company: 'Atlas Supply Chain Solutions',
    industry: 'Logistics & Supply Chain',
    logoBgColor: '#475569',
    logoTextColor: '#FFFFFF',
    logoInitials: 'ASC',
    employees: '1000+',
    revenue: '$100M+',
    funding: 'Public',
    technologies: ['SAP S/4HANA', 'Manhattan Associates', 'Blue Yonder'],
  },
  {
    company: 'Vanguard Capital Management',
    industry: 'Financial Services',
    logoBgColor: '#1E40AF',
    logoTextColor: '#FFFFFF',
    logoInitials: 'VCM',
    employees: '1000+',
    revenue: '$100M+',
    funding: 'Public',
    technologies: ['FactSet', 'Morningstar', 'Microsoft 365'],
  },
  {
    company: 'Orbit Health Technologies',
    industry: 'Healthcare & Biotech',
    logoBgColor: '#DB2777',
    logoTextColor: '#FFFFFF',
    logoInitials: 'OHT',
    employees: '201-500',
    revenue: '$50M - $100M',
    funding: 'Series C',
    technologies: ['Epic Systems', 'Athenahealth', 'AWS'],
  },
  {
    company: 'Pacific Forwarding Group',
    industry: 'Logistics & Supply Chain',
    logoBgColor: '#0F766E',
    logoTextColor: '#FFFFFF',
    logoInitials: 'PFG',
    employees: '51-200',
    revenue: '$10M - $50M',
    funding: 'Bootstrapped',
    technologies: ['Magaya', 'Freightos', 'QuickBooks Enterprise'],
  },
  {
    company: 'Stratos Cloud Software',
    industry: 'Technology',
    logoBgColor: '#0369A1',
    logoTextColor: '#FFFFFF',
    logoInitials: 'SCS',
    employees: '501-1000',
    revenue: '$50M - $100M',
    funding: 'Series C',
    technologies: ['Google Cloud', 'Terraform', 'Datadog', 'Stripe'],
  },
  {
    company: 'Zenith Robotics',
    industry: 'Technology',
    logoBgColor: '#52525B',
    logoTextColor: '#FFFFFF',
    logoInitials: 'ZRB',
    employees: '51-200',
    revenue: '$10M - $50M',
    funding: 'Series B',
    technologies: ['ROS2', 'NVIDIA Isaac', 'AWS IoT', 'GitLab'],
  },
];

interface PersonName {
  first: string;
  last: string;
}

const personNames: PersonName[] = [
  { first: 'Sarah', last: 'Chen' },
  { first: 'David', last: 'Miller' },
  { first: 'Elena', last: 'Rostova' },
  { first: 'Marcus', last: 'Sterling' },
  { first: 'Priya', last: 'Patel' },
  { first: 'Michael', last: 'Thorne' },
  { first: 'Emily', last: 'Hayes' },
  { first: 'Daniel', last: 'Tanaka' },
  { first: 'Jessica', last: 'Gallagher' },
  { first: 'Carlos', last: 'Ross' },
  { first: 'Rachel', last: 'Kim' },
  { first: 'Brian', last: 'Goldberg' },
  { first: 'Olivia', last: 'Jensen' },
  { first: 'Alex', last: 'Sinclair' },
  { first: 'Chloe', last: 'Bennett' },
  { first: 'James', last: 'Kowalski' },
  { first: 'Natasha', last: 'Fischer' },
  { first: 'Thomas', last: 'Mercer' },
  { first: 'Sophia', last: 'Zhao' },
  { first: 'Kevin', last: 'O\'Connor' },
  { first: 'Amanda', last: 'Rivera' },
  { first: 'Ryan', last: 'Hughes' },
  { first: 'Samantha', last: 'Fontaine' },
  { first: 'Eric', last: 'Larson' },
  { first: 'Lauren', last: 'Vance' },
  { first: 'Christopher', last: 'Brooks' },
  { first: 'Natalie', last: 'Holloway' },
  { first: 'Andrew', last: 'Alvarez' },
  { first: 'Vanessa', last: 'Chambers' },
  { first: 'Joshua', last: 'Zhang' },
  { first: 'Hannah', last: 'Morrison' },
  { first: 'Matthew', last: 'Caldwell' },
  { first: 'Victoria', last: 'Dupont' },
  { first: 'Brandon', last: 'Becker' },
  { first: 'Stephanie', last: 'Morales' },
  { first: 'Tyler', last: 'Fletcher' },
  { first: 'Justin', last: 'Montgomery' },
  { first: 'Megan', last: 'Sullivan' },
  { first: 'Anthony', last: 'Lindqvist' },
  { first: 'Rebecca', last: 'Shah' },
  { first: 'Jonathan', last: 'Delgado' },
  { first: 'Melissa', last: 'Kramer' },
  { first: 'Benjamin', last: 'Walsh' },
  { first: 'Laura', last: 'Navarro' },
  { first: 'Samuel', last: 'Thornton' },
  { first: 'Angela', last: 'Reynolds' },
  { first: 'Nathan', last: 'Baxter' },
  { first: 'Kimberly', last: 'Novak' },
  { first: 'Adam', last: 'Wong' },
  { first: 'Michelle', last: 'Bishop' },
  { first: 'Jason', last: 'Hoffman' },
  { first: 'Nicole', last: 'Carlson' },
  { first: 'Austin', last: 'Petrov' },
  { first: 'Heather', last: 'Mendoza' },
  { first: 'Trevor', last: 'Larsen' },
  { first: 'Amber', last: 'Snyder' },
  { first: 'Derek', last: 'Vogel' },
  { first: 'Brooke', last: 'Schwartz' },
  { first: 'Craig', last: 'Hansen' },
  { first: 'Diana', last: 'Olsen' },
];

interface TitleDepartment {
  title: string;
  department: string;
}

const titlesByDepartment: TitleDepartment[] = [
  { title: 'Executive Vice President, Strategic Growth', department: 'Executive' },
  { title: 'President', department: 'Executive' },
  { title: 'Chief Executive Officer', department: 'Executive' },
  { title: 'Chief Operating Officer', department: 'Executive' },
  { title: 'Chief Commercial Officer', department: 'Executive' },
  { title: 'Vice President', department: 'Executive' },
  { title: 'Vice President Risk Management', department: 'Risk Management' },
  { title: 'VP of Global Logistics & Supply Chain', department: 'Operations' },
  { title: 'VP of Sales & Business Development', department: 'Sales' },
  { title: 'VP of Marketing & Brand Strategy', department: 'Marketing' },
  { title: 'VP of Engineering', department: 'Engineering' },
  { title: 'Director of Demand Generation', department: 'Marketing' },
  { title: 'Director of Freight Operations', department: 'Operations' },
  { title: 'Director of Business Development', department: 'Sales' },
  { title: 'Director of Product Management', department: 'Product' },
  { title: 'Director of Strategic Sourcing', department: 'Operations' },
  { title: 'Director of Enterprise Sales', department: 'Sales' },
  { title: 'Director of Finance & Risk', department: 'Finance' },
  { title: 'Head of Growth Marketing', department: 'Marketing' },
  { title: 'Head of Customer Acquisition', department: 'Marketing' },
  { title: 'Head of Supply Chain Solutions', department: 'Operations' },
  { title: 'Senior Account Executive', department: 'Sales' },
  { title: 'Senior Director, Carrier Relations', department: 'Operations' },
  { title: 'Global Freight Sourcing Manager', department: 'Operations' },
];

interface LocationInfo {
  location: string;
  city: string;
  state: string;
  country: string;
  phoneArea: string;
}

const locations: LocationInfo[] = [
  { location: 'Los Angeles, California', city: 'Los Angeles', state: 'California', country: 'United States', phoneArea: '213' },
  { location: 'Los Angeles, California', city: 'Los Angeles', state: 'California', country: 'United States', phoneArea: '310' },
  { location: 'San Francisco, California', city: 'San Francisco', state: 'California', country: 'United States', phoneArea: '415' },
  { location: 'New York, New York', city: 'New York', state: 'New York', country: 'United States', phoneArea: '212' },
  { location: 'Chicago, Illinois', city: 'Chicago', state: 'Illinois', country: 'United States', phoneArea: '312' },
  { location: 'Austin, Texas', city: 'Austin', state: 'Texas', country: 'United States', phoneArea: '512' },
  { location: 'Seattle, Washington', city: 'Seattle', state: 'Washington', country: 'United States', phoneArea: '206' },
  { location: 'Boston, Massachusetts', city: 'Boston', state: 'Massachusetts', country: 'United States', phoneArea: '617' },
  { location: 'Atlanta, Georgia', city: 'Atlanta', state: 'Georgia', country: 'United States', phoneArea: '404' },
  { location: 'Denver, Colorado', city: 'Denver', state: 'Colorado', country: 'United States', phoneArea: '303' },
  { location: 'London, United Kingdom', city: 'London', state: 'Greater London', country: 'United Kingdom', phoneArea: '44' },
  { location: 'Toronto, Canada', city: 'Toronto', state: 'Ontario', country: 'Canada', phoneArea: '416' },
];

/**
 * Deterministic pseudo-random number generator for reproducible synthetic data
 */
function createDeterministicRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Generates 350+ rich synthetic leads including the exact Ref.jpg leads
 */
export function generateSyntheticLeads(): Lead[] {
  const leads: Lead[] = [...referenceLeads];
  const rand = createDeterministicRandom(42);

  const totalToGenerate = 350;
  const statuses: ('NET NEW' | 'COLD' | 'IN SEQUENCE')[] = ['NET NEW', 'NET NEW', 'COLD', 'NET NEW', 'IN SEQUENCE'];

  for (let i = referenceLeads.length; i < totalToGenerate; i++) {
    const nameObj = personNames[i % personNames.length];
    // Slightly permute name after first cycle
    const cycle = Math.floor(i / personNames.length);
    const firstName = cycle > 0 ? `${nameObj.first}` : nameObj.first;
    const lastName = cycle > 0 ? `${nameObj.last} ${String.fromCharCode(65 + (cycle % 26))}.` : nameObj.last;
    const fullName = `${firstName} ${lastName}`;

    const companyTemplate = companyTemplates[Math.floor(rand() * companyTemplates.length)];
    const titleDept = titlesByDepartment[Math.floor(rand() * titlesByDepartment.length)];
    const loc = locations[Math.floor(rand() * locations.length)];
    const status = statuses[Math.floor(rand() * statuses.length)];

    const cleanDomain = companyTemplate.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    const emailUser = `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}`;
    const email = `${emailUser}@${cleanDomain}`;

    const num1 = Math.floor(100 + rand() * 899);
    const num2 = Math.floor(1000 + rand() * 8999);
    const phone = loc.country === 'United Kingdom'
      ? `+44 20 ${num1} ${num2}`
      : `+1 (${loc.phoneArea}) 555-${num2.toString().padStart(4, '0')}`;
    const workPhone = loc.country === 'United Kingdom'
      ? `+44 20 ${num1} 0100`
      : `+1 (${loc.phoneArea}) 555-${(num2 + 10).toString().padStart(4, '0')}`;

    const saved = rand() < 0.18; // ~18% saved
    const jobChange = rand() < 0.12; // ~12% recent job changes

    const daysAgo = Math.floor(rand() * 90);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

    leads.push({
      id: `lead-${i + 1}`,
      name: fullName,
      title: titleDept.title,
      company: companyTemplate.company,
      companyLogo: '',
      logoBgColor: companyTemplate.logoBgColor,
      logoTextColor: companyTemplate.logoTextColor,
      logoInitials: companyTemplate.logoInitials,
      industry: companyTemplate.industry,
      department: titleDept.department,
      status,
      location: loc.location,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      email,
      phone,
      workPhone,
      linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase().replace(/[^a-z]/g, '')}`,
      employees: companyTemplate.employees,
      revenue: companyTemplate.revenue,
      funding: companyTemplate.funding,
      technologies: companyTemplate.technologies,
      saved,
      jobChange,
      createdAt,
    });
  }

  return leads;
}

/**
 * Pre-generated in-memory singleton dataset of 350 realistic leads
 */
export const mockLeads: Lead[] = generateSyntheticLeads();
