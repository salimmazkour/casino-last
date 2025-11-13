import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmployeeData {
  id?: string;
  login: string;
  password?: string;
  full_name: string;
  email: string;
  role_id: string;
  phone?: string;
  hourly_rate?: number;
  personal_offer_limit?: number;
  personal_offer_max_amount?: number;
  allowed_product_families?: string[];
  points_of_sale?: string[];
  is_active: boolean;
}

// Simple hash function using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data } = await req.json() as { action: 'create' | 'update', data: EmployeeData };

    if (action === 'create') {
      // Hash password for new employee
      if (!data.password) {
        throw new Error('Password is required for new employee');
      }
      const passwordHash = await hashPassword(data.password);
      
      const { error } = await supabase
        .from('employees')
        .insert([{
          login: data.login,
          password_hash: passwordHash,
          full_name: data.full_name,
          email: data.email,
          role_id: data.role_id,
          phone: data.phone,
          hourly_rate: data.hourly_rate,
          personal_offer_limit: data.personal_offer_limit || 0,
          personal_offer_max_amount: data.personal_offer_max_amount || 0,
          allowed_product_families: data.allowed_product_families || [],
          points_of_sale: data.points_of_sale || [],
          is_active: data.is_active
        }]);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Employee created successfully' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    } else if (action === 'update') {
      // Update employee
      if (!data.id) {
        throw new Error('Employee ID is required for update');
      }

      const updateData: any = {
        login: data.login,
        full_name: data.full_name,
        email: data.email,
        role_id: data.role_id,
        phone: data.phone,
        hourly_rate: data.hourly_rate,
        personal_offer_limit: data.personal_offer_limit || 0,
        personal_offer_max_amount: data.personal_offer_max_amount || 0,
        allowed_product_families: data.allowed_product_families || [],
        points_of_sale: data.points_of_sale || [],
        is_active: data.is_active
      };

      // Only update password if provided
      if (data.password) {
        updateData.password_hash = await hashPassword(data.password);
      }

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Employee updated successfully' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
