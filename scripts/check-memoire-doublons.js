const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'memoire_etoiles').maybeSingle();
  const { data, error } = await supabase
    .from('contenu_mini_jeu')
    .select('id, niveau, palier, donnees')
    .eq('mini_jeu_id', jeu.id)
    .eq('actif', true);

  if (error) {
    fs.writeFileSync('scripts/memoire-doublons.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const problematiques = [];
  for (const row of data) {
    const mots = row.donnees.paires.map((p) => p.mot);
    const emojis = row.donnees.paires.map((p) => p.emoji);
    const motsUniques = new Set(mots);
    const emojisUniques = new Set(emojis);
    if (motsUniques.size !== mots.length || emojisUniques.size !== emojis.length) {
      problematiques.push({ id: row.id, niveau: row.niveau, palier: row.palier, paires: row.donnees.paires });
    }
  }

  fs.writeFileSync('scripts/memoire-doublons.json', JSON.stringify({
    totalLignes: data.length, problematiquesCount: problematiques.length, problematiques,
  }, null, 2));
  console.log(`${problematiques.length}/${data.length} manches avec des mots/emojis en double.`);
}

main();
