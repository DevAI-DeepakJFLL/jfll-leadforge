/**
 * TypeScript types for Client Report / Prospect Brief Generator.
 * Matches Backend Pydantic schema in Backend/src/api/report_models.py.
 */

export interface ReportHeader {
  title: string;
  company_name: string;
  subtitle: string;
  prepared_for: string;
  prepared_by: string;
  date: string;
  web_grounded?: boolean;
}

export interface CompanyBackground {
  what_they_do: string;
  hq_facilities: string;
  export_markets: string;
  scale_credibility: string;
}

export interface TradeLaneCommodity {
  origin_destination: string;
  commodity: string;
  primary_mode: string;
  special_handling: string;
  total_shipments: number;
  total_value_usd: number;
  lading_port: string;
}

export interface JfllFit {
  cargo_strength: string;
  pitch_angle: string;
}

export interface ContactItem {
  name: string;
  designation: string;
  contact_info: string;
  notes: string;
}

export interface SalesFeedback {
  meeting_takeaways: string;
  preferred_carriers: string;
  target_pricing: string;
  next_action_followup: string;
}

export interface ClientReportData {
  lead_id?: string | null;
  header: ReportHeader;
  section_1_background: CompanyBackground;
  section_2_trade_lane: TradeLaneCommodity;
  section_3_jfll_fit: JfllFit;
  section_4_contacts: ContactItem[];
  section_5_feedback: SalesFeedback;
}

export interface ReportCompanySuggestion {
  id: string;
  company_name: string;
  city?: string | null;
  country?: string | null;
  total_shipments: number;
  total_value_usd: number;
  category?: string | null;
}

export interface GenerateReportRequest {
  company_name_or_id: string;
  prepared_for?: string;
  prepared_by?: string;
}
