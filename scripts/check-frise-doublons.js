const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'frise_temps').maybeSingle();
  const { data, error } = await supabase
    .from('contenu_mini_jeu')
    .select('id, niveau, palier, donnees')
    .eq('mini_jeu_id', jeu.id)
    .eq('actif', true);

  if (error) {
    fs.writeFileSync('scripts/frise-doublons-annee.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const problematiques = [];
  for (const row of data) {
    const annees = row.donnees.evenements.map((e) => e.annee);
    const uniques = new Set(annees);
    if (uniques.size !== annees.length) {
      problematiques.push({ id: row.id, niveau: row.niveau, palier: row.palier, evenements: row.donnees.evenements });
    }
  }

  fs.writeFileSync('scripts/frise-doublons-annee.json', JSON.stringify({
    totalLignes: data.length, problematiquesCount: problematiques.length, problematiques,
  }, null, 2));
  console.log(`${problematiques.length}/${data.length} frises avec des annees en double.`);
}

main();
