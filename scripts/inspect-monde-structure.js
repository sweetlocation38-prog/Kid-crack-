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
    fs.writeFileSync('scripts/monde-structure.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const sansContinent = data.filter((row) => !row.donnees?.continent);
  // Un exemplaire de chaque "etape" different, pour voir la structure exacte
  const parEtape = {};
  for (const row of sansContinent) {
    const etape = row.donnees?.etape ?? row.donnees?.categorie ?? 'INCONNU';
    if (!parEtape[etape]) parEtape[etape] = { count: 0, exemple: row.donnees };
    parEtape[etape].count += 1;
  }
  // Idem pour les lignes AVEC continent (pour comparer la structure)
  const avecContinent = data.filter((row) => row.donnees?.continent);
  const parEtapeAvecContinent = {};
  for (const row of avecContinent) {
    const etape = row.donnees?.etape ?? row.donnees?.categorie ?? 'INCONNU';
    if (!parEtapeAvecContinent[etape]) parEtapeAvecContinent[etape] = { count: 0, exemple: row.donnees };
    parEtapeAvecContinent[etape].count += 1;
  }

  fs.writeFileSync('scripts/monde-structure.json', JSON.stringify({ sansContinent: parEtape, avecContinent: parEtapeAvecContinent }, null, 2));
  console.log('OK');
}

main();
