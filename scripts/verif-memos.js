const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data, error } = await supabase
    .from('memos_vocaux')
    .select('famille_id, categorie, audio_url, created_at');

  if (error) {
    fs.writeFileSync('scripts/verif-memos.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const parCategorie = {};
  for (const row of data) {
    parCategorie[row.categorie] = (parCategorie[row.categorie] ?? 0) + 1;
  }

  fs.writeFileSync('scripts/verif-memos.json', JSON.stringify({ total: data.length, parCategorie, rows: data }, null, 2));
  console.log(JSON.stringify(parCategorie, null, 2));
}

main();
