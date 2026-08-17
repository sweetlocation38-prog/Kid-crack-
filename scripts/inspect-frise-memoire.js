const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const resultat = {};
  for (const code of ['frise_temps', 'memoire_etoiles']) {
    const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', code).maybeSingle();
    if (!jeu) { resultat[code] = { error: 'jeu introuvable' }; continue; }
    const { data, error } = await supabase
      .from('contenu_mini_jeu')
      .select('id, niveau, palier, donnees')
      .eq('mini_jeu_id', jeu.id)
      .eq('actif', true);
    if (error) { resultat[code] = { error: error.message }; continue; }

    // 3 exemples par niveau/palier le plus faible, + toutes les valeurs deja utilisees (anti-doublon)
    const parNiveau = {};
    for (const row of data) {
      const cle = `${row.niveau}-p${row.palier}`;
      if (!parNiveau[cle]) parNiveau[cle] = [];
      parNiveau[cle].push(row.donnees);
    }
    const exemples = {};
    for (const cle of Object.keys(parNiveau)) {
      exemples[cle] = { count: parNiveau[cle].length, echantillon: parNiveau[cle].slice(0, 3) };
    }
    resultat[code] = { total: data.length, exemples };
  }
  fs.writeFileSync('scripts/frise-memoire-examples.json', JSON.stringify(resultat, null, 2));
  console.log('OK');
}

main();
