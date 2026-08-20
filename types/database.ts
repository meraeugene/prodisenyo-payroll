export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | "admin"
  | "ceo"
  | "payroll_manager"
  | "purchaser"
  | "engineer"
  | "employee";
export type PayrollRunStatus = "draft" | "submitted" | "approved" | "rejected";
export type AdjustmentStatus = "pending" | "approved" | "rejected";
export type AttendanceClassification =
  | "WORKED"
  | "NO_BIOMETRIC"
  | "ABSENT"
  | "REST_DAY"
  | "REGULAR_HOLIDAY"
  | "SPECIAL_NON_WORKING_HOLIDAY"
  | "PAID_LEAVE"
  | "UNPAID_LEAVE"
  | "OFFICIAL_BUSINESS"
  | "MANUAL_ATTENDANCE"
  | "FORGOT_TO_LOG"
  | "COMPANY_PAID_DAY";
export type EstimateStatus = "draft" | "submitted" | "approved" | "rejected";
export type AdjustmentType =
  | "overtime"
  | "paid_holiday"
  | "cash_advance"
  | "paid_leave";
export type BudgetProjectType =
  | "new_build"
  | "renovation"
  | "extension"
  | "other";
export type BudgetItemStatus = "upcoming" | "ongoing" | "completed";
export type BudgetItemCategory =
  | "materials"
  | "labor"
  | "equipment"
  | "permits"
  | "services"
  | "utilities"
  | "transportation"
  | "miscellaneous";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          full_name: string | null;
          avatar_path: string | null;
          role: AppRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          full_name?: string | null;
          avatar_path?: string | null;
          role?: AppRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          email?: string;
          full_name?: string | null;
          avatar_path?: string | null;
          role?: AppRole;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      sites: {
        Row: {
          id: string;
          code: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          employee_code: string | null;
          full_name: string;
          default_role_code: string | null;
          site_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_code?: string | null;
          full_name: string;
          default_role_code?: string | null;
          site_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          employee_code?: string | null;
          full_name?: string;
          default_role_code?: string | null;
          site_id?: string | null;
          updated_at?: string;
        };
      };
      attendance_imports: {
        Row: {
          id: string;
          original_filename: string;
          site_id: string | null;
          site_name: string;
          period_label: string;
          period_start: string | null;
          period_end: string | null;
          storage_path: string | null;
          uploaded_by: string;
          raw_rows: number;
          removed_entries: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          original_filename: string;
          site_id?: string | null;
          site_name: string;
          period_label: string;
          period_start?: string | null;
          period_end?: string | null;
          storage_path?: string | null;
          uploaded_by: string;
          raw_rows?: number;
          removed_entries?: number;
          created_at?: string;
        };
        Update: {
          site_id?: string | null;
          site_name?: string;
          period_label?: string;
          period_start?: string | null;
          period_end?: string | null;
          storage_path?: string | null;
          raw_rows?: number;
          removed_entries?: number;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          import_id: string;
          employee_id: string | null;
          employee_name: string;
          log_date: string;
          log_time: string;
          log_type: "IN" | "OUT";
          log_source: "Time1" | "Time2" | "OT";
          site_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          import_id: string;
          employee_id?: string | null;
          employee_name: string;
          log_date: string;
          log_time: string;
          log_type: "IN" | "OUT";
          log_source: "Time1" | "Time2" | "OT";
          site_name: string;
          created_at?: string;
        };
        Update: {
          employee_id?: string | null;
          employee_name?: string;
          log_date?: string;
          log_time?: string;
          log_type?: "IN" | "OUT";
          log_source?: "Time1" | "Time2" | "OT";
          site_name?: string;
        };
      };
      role_rates: {
        Row: {
          id: string;
          role_code: string;
          daily_rate: number;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          role_code: string;
          daily_rate: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role_code?: string;
          daily_rate?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      employee_branch_rates: {
        Row: {
          id: string;
          employee_name: string;
          employee_name_key: string;
          role_code: string;
          site_name: string;
          site_name_key: string;
          daily_rate: number;
          regular_paid_hours: number;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_name: string;
          employee_name_key: string;
          role_code: string;
          site_name: string;
          site_name_key: string;
          daily_rate: number;
          regular_paid_hours?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          employee_name?: string;
          employee_name_key?: string;
          role_code?: string;
          site_name?: string;
          site_name_key?: string;
          daily_rate?: number;
          regular_paid_hours?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      payroll_runs: {
        Row: {
          id: string;
          attendance_import_id: string | null;
          site_id: string | null;
          site_name: string;
          period_label: string;
          period_start: string | null;
          period_end: string | null;
          status: PayrollRunStatus;
          created_by: string;
          submitted_by: string | null;
          approved_by: string | null;
          submitted_at: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          locked_at: string | null;
          reopened_at: string | null;
          reopened_by: string | null;
          reopen_reason: string | null;
          gross_total: number;
          net_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          attendance_import_id?: string | null;
          site_id?: string | null;
          site_name: string;
          period_label: string;
          period_start?: string | null;
          period_end?: string | null;
          status?: PayrollRunStatus;
          created_by: string;
          submitted_by?: string | null;
          approved_by?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          locked_at?: string | null;
          reopened_at?: string | null;
          reopened_by?: string | null;
          reopen_reason?: string | null;
          gross_total?: number;
          net_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          attendance_import_id?: string | null;
          site_id?: string | null;
          site_name?: string;
          period_label?: string;
          period_start?: string | null;
          period_end?: string | null;
          status?: PayrollRunStatus;
          submitted_by?: string | null;
          approved_by?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          locked_at?: string | null;
          reopened_at?: string | null;
          reopened_by?: string | null;
          reopen_reason?: string | null;
          gross_total?: number;
          net_total?: number;
          updated_at?: string;
        };
      };
      payroll_run_items: {
        Row: {
          id: string;
          payroll_run_id: string;
          employee_id: string | null;
          employee_name: string;
          role_code: string;
          site_name: string;
          days_worked: number;
          hours_worked: number;
          overtime_hours: number;
          rate_per_day: number;
          regular_pay: number;
          overtime_pay: number;
          holiday_pay: number;
          deductions_total: number;
          total_pay: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          payroll_run_id: string;
          employee_id?: string | null;
          employee_name: string;
          role_code: string;
          site_name: string;
          days_worked?: number;
          hours_worked?: number;
          overtime_hours?: number;
          rate_per_day?: number;
          regular_pay?: number;
          overtime_pay?: number;
          holiday_pay?: number;
          deductions_total?: number;
          total_pay?: number;
          created_at?: string;
        };
        Update: {
          employee_id?: string | null;
          employee_name?: string;
          role_code?: string;
          site_name?: string;
          days_worked?: number;
          hours_worked?: number;
          overtime_hours?: number;
          rate_per_day?: number;
          regular_pay?: number;
          overtime_pay?: number;
          holiday_pay?: number;
          deductions_total?: number;
          total_pay?: number;
        };
      };
      payroll_run_daily_totals: {
        Row: {
          id: string;
          payroll_run_id: string;
          payroll_run_item_id: string | null;
          attendance_import_id: string | null;
          employee_name: string;
          role_code: string;
          site_name: string;
          payout_date: string;
          hours_worked: number;
          total_pay: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          payroll_run_id: string;
          payroll_run_item_id?: string | null;
          attendance_import_id?: string | null;
          employee_name: string;
          role_code: string;
          site_name: string;
          payout_date: string;
          hours_worked?: number;
          total_pay?: number;
          created_at?: string;
        };
        Update: {
          payroll_run_id?: string;
          payroll_run_item_id?: string | null;
          attendance_import_id?: string | null;
          employee_name?: string;
          role_code?: string;
          site_name?: string;
          payout_date?: string;
          hours_worked?: number;
          total_pay?: number;
        };
      };
      payroll_adjustments: {
        Row: {
          id: string;
          payroll_run_id: string | null;
          payroll_run_item_id: string | null;
          attendance_import_id: string | null;
          employee_name: string | null;
          employee_name_key: string | null;
          role_code: string | null;
          site_name: string | null;
          site_name_key: string | null;
          period_label: string | null;
          period_start: string | null;
          period_end: string | null;
          source_overtime_request_id: string | null;
          adjustment_type: AdjustmentType;
          status: AdjustmentStatus;
          requested_by: string;
          approved_by: string | null;
          effective_date: string | null;
          quantity: number;
          amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payroll_run_id?: string | null;
          payroll_run_item_id?: string | null;
          attendance_import_id?: string | null;
          employee_name?: string | null;
          employee_name_key?: string | null;
          role_code?: string | null;
          site_name?: string | null;
          site_name_key?: string | null;
          period_label?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          source_overtime_request_id?: string | null;
          adjustment_type: AdjustmentType;
          status?: AdjustmentStatus;
          requested_by: string;
          approved_by?: string | null;
          effective_date?: string | null;
          quantity?: number;
          amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          payroll_run_id?: string | null;
          payroll_run_item_id?: string | null;
          attendance_import_id?: string | null;
          employee_name?: string | null;
          employee_name_key?: string | null;
          role_code?: string | null;
          site_name?: string | null;
          site_name_key?: string | null;
          period_label?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          source_overtime_request_id?: string | null;
          adjustment_type?: AdjustmentType;
          status?: AdjustmentStatus;
          approved_by?: string | null;
          effective_date?: string | null;
          quantity?: number;
          amount?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      overtime_requests: {
        Row: {
          id: string;
          requester_role: AppRole;
          requested_by: string;
          approved_by: string | null;
          employee_name: string;
          site_name: string;
          period_label: string | null;
          request_date: string;
          overtime_hours: number;
          amount: number;
          reason: string | null;
          status: AdjustmentStatus;
          approved_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_role: AppRole;
          requested_by: string;
          approved_by?: string | null;
          employee_name: string;
          site_name: string;
          period_label?: string | null;
          request_date: string;
          overtime_hours?: number;
          amount?: number;
          reason?: string | null;
          status?: AdjustmentStatus;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          requester_role?: AppRole;
          requested_by?: string;
          approved_by?: string | null;
          employee_name?: string;
          site_name?: string;
          period_label?: string | null;
          request_date?: string;
          overtime_hours?: number;
          amount?: number;
          reason?: string | null;
          status?: AdjustmentStatus;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string; name: string; location: string; client_name: string | null;
          subject: string | null; lead: string | null; assigned_engineer_id: string | null;
          assigned_estimate_engineer_id: string | null;
          active_approved_estimate_id: string | null;
          status: "planning" | "active" | "on_hold" | "completed" | "archived";
          budget_ceiling: number; currency_code: string; start_date: string; end_date: string;
          description: string | null; image_url: string | null; created_by: string;
          updated_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; name: string; location: string; client_name?: string | null;
          subject?: string | null; lead?: string | null; assigned_engineer_id?: string | null;
          assigned_estimate_engineer_id?: string | null;
          active_approved_estimate_id?: string | null;
          status?: "planning" | "active" | "on_hold" | "completed" | "archived";
          budget_ceiling: number; currency_code?: string; start_date: string; end_date: string;
          description?: string | null; image_url?: string | null; created_by: string;
          updated_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      project_documents: {
        Row: {
          id: string;
          project_id: string;
          uploaded_by: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
          category: "plans" | "reports" | "permits" | "contracts" | "photos" | "forms" | "other";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          uploaded_by: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
          category?: "plans" | "reports" | "permits" | "contracts" | "photos" | "forms" | "other";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_documents"]["Insert"]>;
      };
      project_progress_updates: {
        Row: {
          id: string;
          project_id: string;
          submitted_by: string;
          overall_percent: number;
          completed_work_summary: string;
          remarks: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          submitted_by: string;
          overall_percent: number;
          completed_work_summary: string;
          remarks?: string | null;
          created_at?: string;
        };
        Update: {
          overall_percent?: number;
          completed_work_summary?: string;
          remarks?: string | null;
        };
      };
      project_progress_activities: {
        Row: {
          id: string; project_id: string; activity: string; weight_percent: number;
          progress_percent: number; sort_order: number; created_by: string;
          updated_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; project_id: string; activity: string; weight_percent: number;
          progress_percent?: number; sort_order?: number; created_by: string;
          updated_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_progress_activities"]["Insert"]>;
      };
      budget_projects: {
        Row: {
          id: string;
          project_id: string | null;
          name: string;
          project_type: BudgetProjectType | null;
          currency_code: string;
          starting_budget: number;
          is_archived: boolean;
          source_estimate_id: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          name: string;
          project_type?: BudgetProjectType | null;
          currency_code?: string;
          starting_budget?: number;
          is_archived?: boolean;
          source_estimate_id?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string | null;
          name?: string;
          project_type?: BudgetProjectType | null;
          currency_code?: string;
          starting_budget?: number;
          is_archived?: boolean;
          source_estimate_id?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      budget_items: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          status: BudgetItemStatus;
          category: BudgetItemCategory;
          estimated_cost: number;
          actual_spent: number;
          notes: string | null;
          sort_order: number;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          status?: BudgetItemStatus;
          category: BudgetItemCategory;
          estimated_cost?: number;
          actual_spent?: number;
          notes?: string | null;
          sort_order?: number;
          created_by: string;
          updated_by?: string | null;
          source_estimate_item_id?: string | null;
          source_material_request_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string;
          name?: string;
          status?: BudgetItemStatus;
          category?: BudgetItemCategory;
          estimated_cost?: number;
          actual_spent?: number;
          notes?: string | null;
          sort_order?: number;
          updated_by?: string | null;
          source_estimate_item_id?: string | null;
          source_material_request_id?: string | null;
          updated_at?: string;
        };
      };
      cost_catalog_items: {
        Row: {
          id: string;
          name: string;
          category: BudgetItemCategory;
          unit_label: string;
          unit_cost: number;
          notes: string | null;
          is_active: boolean;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: BudgetItemCategory;
          unit_label: string;
          unit_cost?: number;
          notes?: string | null;
          is_active?: boolean;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: BudgetItemCategory;
          unit_label?: string;
          unit_cost?: number;
          notes?: string | null;
          is_active?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      project_estimates: {
        Row: {
          id: string;
          project_id: string | null;
          project_name: string;
          project_type: BudgetProjectType | null;
          client_name: string | null;
          location: string | null;
          owner_name: string | null;
          notes: string | null;
          status: EstimateStatus;
          estimate_total: number;
          requested_by: string;
          submitted_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          budget_project_id: string | null;
          source_estimate_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          project_name: string;
          project_type?: BudgetProjectType | null;
          client_name?: string | null;
          location?: string | null;
          owner_name?: string | null;
          notes?: string | null;
          status?: EstimateStatus;
          estimate_total?: number;
          requested_by: string;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          budget_project_id?: string | null;
          source_estimate_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string | null;
          project_name?: string;
          project_type?: BudgetProjectType | null;
          client_name?: string | null;
          location?: string | null;
          owner_name?: string | null;
          notes?: string | null;
          status?: EstimateStatus;
          estimate_total?: number;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          budget_project_id?: string | null;
          source_estimate_id?: string | null;
          updated_at?: string;
        };
      };
      project_estimate_items: {
        Row: {
          id: string;
          estimate_id: string;
          catalog_item_id: string | null;
          boq_section: string;
          boq_item_number: string;
          item_name_snapshot: string;
          material_name_snapshot: string;
          category_snapshot: BudgetItemCategory;
          unit_label_snapshot: string;
          unit_cost_snapshot: number;
          quantity: number;
          line_total: number;
          notes: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          pricing_basis: "catalog" | "supplier_quote";
          reference_supplier: string | null;
          reference_quotation: string | null;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          catalog_item_id?: string | null;
          boq_section?: string;
          boq_item_number?: string;
          item_name_snapshot: string;
          material_name_snapshot: string;
          category_snapshot: BudgetItemCategory;
          unit_label_snapshot: string;
          unit_cost_snapshot?: number;
          quantity?: number;
          line_total?: number;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          pricing_basis?: "catalog" | "supplier_quote";
          reference_supplier?: string | null;
          reference_quotation?: string | null;
        };
        Update: {
          estimate_id?: string;
          catalog_item_id?: string | null;
          boq_section?: string;
          boq_item_number?: string;
          item_name_snapshot?: string;
          material_name_snapshot?: string;
          category_snapshot?: BudgetItemCategory;
          unit_label_snapshot?: string;
          unit_cost_snapshot?: number;
          quantity?: number;
          line_total?: number;
          notes?: string | null;
          sort_order?: number;
          updated_at?: string;
          pricing_basis?: "catalog" | "supplier_quote";
          reference_supplier?: string | null;
          reference_quotation?: string | null;
        };
      };
      employee_work_schedules: {
        Row: {
          id: string; employee_id: string | null; employee_name_key: string | null;
          site_id: string | null; day_of_week: number; is_workday: boolean;
          standard_seconds: number; break_seconds: number; effective_from: string | null;
          effective_to: string | null; created_by: string; updated_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; employee_id?: string | null; employee_name_key?: string | null;
          site_id?: string | null; day_of_week: number; is_workday?: boolean;
          standard_seconds?: number; break_seconds?: number; effective_from?: string | null;
          effective_to?: string | null; created_by: string; updated_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["employee_work_schedules"]["Insert"]>;
      };
      payroll_holidays: {
        Row: {
          id: string; holiday_date: string; name: string;
          holiday_type: "regular" | "special_non_working" | "local" | "company";
          site_id: string | null; payable_seconds: number; multiplier_basis_points: number;
          created_by: string; updated_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; holiday_date: string; name: string;
          holiday_type: "regular" | "special_non_working" | "local" | "company";
          site_id?: string | null; payable_seconds?: number; multiplier_basis_points?: number;
          created_by: string; updated_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payroll_holidays"]["Insert"]>;
      };
      employee_leave_records: {
        Row: {
          id: string; employee_id: string | null; employee_name_key: string | null;
          leave_date: string; leave_type: "paid" | "sick" | "unpaid";
          status: AdjustmentStatus; payable_seconds: number; reason: string | null;
          requested_by: string; approved_by: string | null; approved_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; employee_id?: string | null; employee_name_key?: string | null;
          leave_date: string; leave_type: "paid" | "sick" | "unpaid";
          status?: AdjustmentStatus; payable_seconds?: number; reason?: string | null;
          requested_by: string; approved_by?: string | null; approved_at?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["employee_leave_records"]["Insert"]>;
      };
      payroll_attendance_days: {
        Row: {
          id: string; payroll_run_id: string | null; payroll_run_item_id: string | null;
          attendance_import_id: string | null; employee_id: string | null;
          employee_name: string; employee_name_key: string; role_code: string; site_name: string;
          attendance_date: string; schedule_type: "workday" | "rest_day" | "missing";
          biometric_time_in: string | null; biometric_time_out: string | null;
          biometric_worked_seconds: number; break_seconds: number;
          calculated_regular_seconds: number; detected_overtime_seconds: number;
          classification: AttendanceClassification; approved_regular_seconds: number;
          approved_overtime_seconds: number; overtime_status: AdjustmentStatus;
          source: "biometric" | "schedule" | "holiday" | "leave" | "manual" | "system";
          is_manual_override: boolean; override_reason: string | null; notes: string | null;
          reviewed_by: string | null; reviewed_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; payroll_run_id?: string | null; payroll_run_item_id?: string | null;
          attendance_import_id?: string | null; employee_id?: string | null;
          employee_name: string; employee_name_key: string; role_code: string; site_name: string;
          attendance_date: string; schedule_type?: "workday" | "rest_day" | "missing";
          biometric_time_in?: string | null; biometric_time_out?: string | null;
          biometric_worked_seconds?: number; break_seconds?: number;
          calculated_regular_seconds?: number; detected_overtime_seconds?: number;
          classification: AttendanceClassification; approved_regular_seconds?: number;
          approved_overtime_seconds?: number; overtime_status?: AdjustmentStatus;
          source: "biometric" | "schedule" | "holiday" | "leave" | "manual" | "system";
          is_manual_override?: boolean; override_reason?: string | null; notes?: string | null;
          reviewed_by?: string | null; reviewed_at?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payroll_attendance_days"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          payload?: Json | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      payroll_run_status: PayrollRunStatus;
      adjustment_status: AdjustmentStatus;
      estimate_status: EstimateStatus;
      adjustment_type: AdjustmentType;
      budget_project_type: BudgetProjectType;
      budget_item_status: BudgetItemStatus;
      budget_item_category: BudgetItemCategory;
    };
  };
}
