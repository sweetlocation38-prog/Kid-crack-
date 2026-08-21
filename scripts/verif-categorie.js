const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'monde_capitales').maybeSingle();
  const { data, error } = await supabase
    .from('contenu_mini_jeu')
    .select('donnees')
    .eq('mini_jeu_id', jeu.id)
    .eq('actif', true);

  if (error) {
    fs.writeFileSync('scripts/verif-categorie.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const avecCategorie = data.filter((row) => row.donnees?.categorie != null);
  const parCategorie = {};
  for (const row of avecCategorie) {
    const cat = row.donnees.categorie;
    parCategorie[cat] = (parCategorie[cat] ?? 0) + 1;
  }
  const parEtape = {};
  for (const row of data) {
    const et = row.donnees?.etape ?? 'AUCUNE';
    parEtape[et] = (parEtape[et] ?? 0) + 1;
  }

  fs.writeFileSync('scripts/verif-categorie.json', JSON.stringify({
    totalLignes: data.length,
    lignesAvecCategorie: avecCategorie.length,
    parCategorie,
    parEtape,
  }, null, 2));
  console.log(`${avecCategorie.length}/${data.length} lignes ont un champ categorie`);
}

main();
