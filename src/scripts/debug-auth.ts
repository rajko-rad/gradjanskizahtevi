import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Check if running in development mode
const isDev = process.env.NODE_ENV !== 'production';

console.log('=== Clerk-Supabase Auth Debugging Tool ===');
console.log('Running in', isDev ? 'DEVELOPMENT' : 'PRODUCTION', 'mode');
console.log('--------------------------------------------');

// 1. Check environment variables
console.log('\n1. Checking environment variables...');
const requiredVars = [
  'VITE_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.log('Please add these variables to your .env file.');
} else {
  console.log('✅ All required environment variables are present.');
}

// 2. Check Supabase connection
console.log('\n2. Testing Supabase connection...');
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabaseConnection() {
  try {
    const { data, error } = await anonClient.from('users').select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }
}

// 3. Verify JWT secret
console.log('\n3. Verifying JWT secret...');
const jwtSecret = process.env.SUPABASE_JWT_SECRET;

if (!jwtSecret) {
  console.error('❌ JWT secret is missing from environment variables.');
} else {
  console.log('✅ JWT secret is defined.');
  
  // Create a test token to verify the secret works
  try {
    const testToken = jwt.sign(
      { 
        sub: 'test_user_id',
        aud: 'authenticated',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 60
      },
      jwtSecret
    );
    
    // Verify the token
    const decoded = jwt.verify(testToken, jwtSecret);
    console.log('✅ JWT secret verification successful.');
    console.log('   Sample token payload:', decoded);
  } catch (error) {
    console.error('❌ JWT secret verification failed:', error);
  }
}

// 4. Check RLS policies
console.log('\n4. Checking RLS policies...');

async function checkRlsPolicies() {
  try {
    // Get list of tables
    const { data: tables, error: tablesError } = await serviceClient
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('❌ Failed to fetch tables:', tablesError.message);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.log('No tables found in the public schema.');
      return;
    }
    
    console.log(`Found ${tables.length} tables in the public schema.`);
    
    // Check each table for RLS
    for (const table of tables) {
      const { data: rls, error: rlsError } = await serviceClient
        .rpc('check_table_rls', { table_name: table.tablename });
      
      if (rlsError) {
        console.error(`❌ Failed to check RLS for table ${table.tablename}:`, rlsError.message);
        continue;
      }
      
      if (rls && rls.length > 0) {
        const rlsEnabled = rls[0].rls_enabled;
        const policiesCount = rls[0].policies_count || 0;
        
        if (rlsEnabled) {
          console.log(`✅ Table ${table.tablename}: RLS enabled with ${policiesCount} policies.`);
        } else {
          console.log(`⚠️ Table ${table.tablename}: RLS is NOT enabled.`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to check RLS policies:', error);
  }
}

// Execute the tests
async function runTests() {
  const supabaseConnected = await testSupabaseConnection();
  
  if (supabaseConnected) {
    await checkRlsPolicies();
  }
  
  console.log('\n==== Auth Debugging Summary ====');
  
  // Check for common issues
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables detected.');
  }
  
  if (!supabaseConnected) {
    console.log('❌ Could not connect to Supabase.');
  }
  
  if (!jwtSecret) {
    console.log('❌ JWT secret is missing.');
  }
  
  console.log('\nRecommendations:');
  console.log('1. Verify your Clerk JWT template has the correct settings:');
  console.log('   - Template name: "supabase"');
  console.log('   - Contains claims: { "role": "authenticated", "aud": "authenticated" }');
  console.log('   - Uses HS256 algorithm');
  console.log('   - Uses your Supabase JWT secret');
  console.log('2. Check that your Supabase JWT secret in Clerk matches the value in your environment');
  console.log('3. Ensure all tables have appropriate RLS policies');
  console.log('\nIf issues persist, try:');
  console.log('- Resetting both Clerk and Supabase');
  console.log('- Clearing browser cache and cookies');
  console.log('- Testing with a new user account');
}

runTests(); 