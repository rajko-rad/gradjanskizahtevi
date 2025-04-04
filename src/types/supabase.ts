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
      categories: {
        Row: {
          id: string
          title: string
          short_title: string
          description: string | null
          slug: string
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          title: string
          short_title: string
          description?: string | null
          slug: string
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          short_title?: string
          description?: string | null
          slug?: string
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          category_id: string
          title: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          title: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          title?: string
          url?: string
          created_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          category_id: string
          title: string
          description: string | null
          slug: string
          type: 'yesno' | 'multiple' | 'range'
          status: 'active' | 'closed' | 'pending'
          min: number | null
          max: number | null
          has_comments: boolean
          deadline: string | null
          progress: number
          vote_count: number
          comment_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          category_id: string
          title: string
          description?: string | null
          slug: string
          type: 'yesno' | 'multiple' | 'range'
          status?: 'active' | 'closed' | 'pending'
          min?: number | null
          max?: number | null
          has_comments?: boolean
          deadline?: string | null
          progress?: number
          vote_count?: number
          comment_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          title?: string
          description?: string | null
          slug?: string
          type?: 'yesno' | 'multiple' | 'range'
          status?: 'active' | 'closed' | 'pending'
          min?: number | null
          max?: number | null
          has_comments?: boolean
          deadline?: string | null
          progress?: number
          vote_count?: number
          comment_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      options: {
        Row: {
          id: string
          request_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          text?: string
          created_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          user_id: string
          request_id: string
          option_id: string | null
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          request_id: string
          option_id?: string | null
          value: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          request_id?: string
          option_id?: string | null
          value?: string
          created_at?: string
          updated_at?: string
        }
      }
      suggested_requests: {
        Row: {
          id: string
          category_id: string
          user_id: string
          title: string
          description: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          user_id: string
          title: string
          description: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          user_id?: string
          title?: string
          description?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      suggested_request_votes: {
        Row: {
          id: string
          user_id: string
          suggested_request_id: string
          value: -1 | 1
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          suggested_request_id: string
          value: -1 | 1
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          suggested_request_id?: string
          value?: -1 | 1
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          request_id: string
          parent_id: string | null
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          request_id: string
          parent_id?: string | null
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          request_id?: string
          parent_id?: string | null
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      comment_votes: {
        Row: {
          id: string
          user_id: string
          comment_id: string
          value: -1 | 1
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comment_id: string
          value: -1 | 1
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comment_id?: string
          value?: -1 | 1
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      timeline_events: {
        Row: {
          id: string
          request_id: string | null
          date: string
          title: string
          description: string
          source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id?: string | null
          date: string
          title: string
          description: string
          source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string | null
          date?: string
          title?: string
          description?: string
          source?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 