const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data, error } = await supabase.from('fiches_animaux').select('code');
  if (error) {
    fs.writeFileSync('scripts/codes-fiches-existantes.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }
  fs.writeFileSync('scripts/codes-fiches-existantes.json', JSON.stringify(data.map((d) => d.code), null, 2));
  console.log(data.length, 'codes existants');
}

main();
