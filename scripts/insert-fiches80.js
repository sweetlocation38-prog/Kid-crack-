const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const fiches = JSON.parse(fs.readFileSync(path.join(__dirname, 'fiches80.json'), 'utf8'));
  const { data, error } = await supabase.from('fiches_animaux').insert(fiches).select('code');

  const resultat = { total: fiches.length, succes: data?.length ?? 0, erreur: error?.message ?? null };
  fs.writeFileSync(path.join(__dirname, 'insert-fiches80-result.json'), JSON.stringify(resultat, null, 2));
  console.log(error ? error.message : `${data.length}/${fiches.length} fiches inserees`);
}

main();
