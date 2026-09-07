const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: prog } = await supabase.from('progression').select('*').limit(1);
  const { data: profils } = await supabase.from('profils_enfants').select('*').limit(1);
  fs.writeFileSync('scripts/inspect-schema.json', JSON.stringify({
    progressionExemple: prog?.[0] ?? null,
    profilExemple: profils?.[0] ?? null,
  }, null, 2));
  console.log('OK');
}

main();
