const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'monde_capitales').maybeSingle();
  const { data, error } = await supabase
    .from('contenu_mini_jeu')
    .select('id, donnees')
    .eq('mini_jeu_id', jeu.id)
    .eq('actif', true);

  if (error) {
    fs.writeFileSync('scripts/monde-sans-continent.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const sansContinent = data.filter((row) => !row.donnees?.continent);
  // Regrouper par pays/reponse pour voir la liste DISTINCTE (probablement
  // beaucoup moins que 751 lignes - le meme pays revient a plusieurs
  // niveaux/paliers).
  const parPays = {};
  for (const row of sansContinent) {
    const pays = row.donnees?.reponse ?? row.donnees?.pays ?? JSON.stringify(row.donnees).slice(0, 80);
    if (!parPays[pays]) parPays[pays] = { count: 0, exempleDonnees: row.donnees };
    parPays[pays].count += 1;
  }

  fs.writeFileSync('scripts/monde-sans-continent.json', JSON.stringify({
    totalLignesSansContinent: sansContinent.length,
    paysDistincts: Object.keys(parPays).length,
    detail: parPays,
  }, null, 2));
  console.log('OK -', Object.keys(parPays).length, 'pays distincts sans continent sur', sansContinent.length, 'lignes');
}

main();
