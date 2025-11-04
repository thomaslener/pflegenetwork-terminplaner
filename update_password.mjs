import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mruzoqbsqtdwnkyiwwle.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ydXpvcWJzcXRkd25reWl3d2xlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTgxMDQ2NywiZXhwIjoyMDc3Mzg2NDY3fQ.kZNGLKXa6Nj4VcAcNnwn-tnj5KqqYVTJlmb67pxXANM';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updatePassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'c4925af4-cd46-4df1-b294-66d7bdc8f8fc',
    { password: 'pflegenetwork' }
  );
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  } else {
    console.log('Password updated successfully for admin@pflegenetzwerk.de');
  }
}

updatePassword();
