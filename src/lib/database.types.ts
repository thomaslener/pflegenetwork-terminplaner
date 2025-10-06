export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'employee'
          region_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'employee'
          region_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'employee'
          region_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      regions: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          employee_id: string
          shift_date: string
          time_from: string
          time_to: string
          client_name: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          shift_date: string
          time_from: string
          time_to: string
          client_name: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          shift_date?: string
          time_from?: string
          time_to?: string
          client_name?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      weekly_templates: {
        Row: {
          id: string
          employee_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      template_shifts: {
        Row: {
          id: string
          template_id: string
          day_of_week: number
          time_from: string
          time_to: string
          client_name: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          day_of_week: number
          time_from: string
          time_to: string
          client_name: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          day_of_week?: number
          time_from?: string
          time_to?: string
          client_name?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
