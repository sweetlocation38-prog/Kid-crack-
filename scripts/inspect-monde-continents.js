const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'monde_capitales').maybeSingle();
  const { data, error } = await supabase
    .from('contenu_mini_jeu')
    .select('niveau, palier, donnees')
    .eq('mini_jeu_id', jeu.id)
    .eq('actif', true);

  if (error) {
    fs.writeFileSync('scripts/monde-continents-audit.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const parContinent = {};
  const sansContinent = [];
  for (const row of data) {
    const cont = row.donnees?.continent;
    if (!cont) {
      sansContinent.push(row.donnees);
      continue;
    }
    if (!parContinent[cont]) parContinent[cont] = [];
    parContinent[cont].push(row.donnees);
  }

  const resultat = { totalLignes: data.length, sansContinentCount: sansContinent.length, sansContinentExemples: sansContinent.slice(0, 3) };
  for (const cont of Object.keys(parContinent)) {
    resultat[cont] = { count: parContinent[cont].length, exemples: parContinent[cont].slice(0, 5) };
  }
  fs.writeFileSync('scripts/monde-continents-audit.json', JSON.stringify(resultat, null, 2));
  console.log('OK');
}

main();
