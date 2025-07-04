export type UserRole = 
  | 'client'
  | 'sales'
  | 'account_manager'
  | 'career_associate'
  | 'ca_team_lead'
  | 'resume_team'
  | 'scraping_team'
  | 'credential_resolution'
  | 'cro'
  | 'cro_manager'
  | 'coo'
  | 'ceo'
  | 'system_admin';

export type TicketType = 
  | 'volume_shortfall'
  | 'high_rejections'
  | 'no_interviews'
  | 'profile_data_issue'
  | 'credential_issue'
  | 'bulk_complaints'
  | 'early_application_request'
  | 'resume_update'
  | 'job_feed_empty'
  | 'system_technical_failure'
  | 'am_not_responding';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed'| 'forwarded' | 'replied';

export type AssignedUser = {
  id: string;
  name: string;
  role: string;
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
}

export interface Client {
  id: string;
  full_name: string;
  personal_email: string;
  whatsapp_number: string;
  callable_phone: string;
  company_email: string;
  job_role_preferences: string[];
  salary_range: string;
  location_preferences: string[];
  work_auth_details: string;
  account_manager_id: string;
  onboarded_by: string;
  created_at: Date;
  careerassociatemanagerid: string;
  careerassociateid: string;
  scraperid : string;
}

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  short_code:string;
  description: string;
  clientId: string;
  createdby: string;
  assignedTo: string[];
  priority: TicketPriority;
  status: TicketStatus;
  slaHours: number;
  createdat: Date;
  updatedAt: Date; 
  dueDate: Date;
  escalationLevel: number;
  metadata: Record<string, any>;
  comments: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
}

export type SLAConfig = {
  [key in TicketType]: {
    priority: TicketPriority;
    hours: number;
  };
}

export interface RolePermissions {
  canCreateTickets: TicketType[];
  canViewTickets: boolean;
  canEditTickets: boolean;
  canResolveTickets: boolean;
  canEscalateTickets: boolean;
  canViewClients: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canOnboardClients: boolean;
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  escalatedTickets: number;
  slaBreaches: number;
  avgResolutionTime: number;
  criticalTickets: number;
}