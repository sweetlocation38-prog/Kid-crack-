const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

const NIVEAUX_FAIBLES = {
  sons_magiques: ['ce1-3','ce2-3','cp-1','cp-2','gs-2','gs-3','ms-3'],
  tri_village: ['ce1-2','ce1-3','ce2-2','ce2-3','cp-3','gs-3','ms-3'],
  balance_prairie: ['cp-1','cp-3'],
  marche_village: ['ce1-3','ce2-3','cp-3','gs-2','gs-3','ms-3'],
  monde_capitales: ['ms-1','ms-2','ms-3'],
};

async function main() {
  const resultat = {};
  for (const code of Object.keys(NIVEAUX_FAIBLES)) {
    const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', code).maybeSingle();
    const { data, error } = await supabase
      .from('contenu_mini_jeu')
      .select('niveau, palier, donnees')
      .eq('mini_jeu_id', jeu.id)
      .eq('actif', true);
    if (error) { resultat[code] = { error: error.message }; continue; }

    const parNiveau = {};
    for (const row of data) {
      const cle = `${row.niveau}-${row.palier}`;
      if (!parNiveau[cle]) parNiveau[cle] = [];
      parNiveau[cle].push(row.donnees);
    }
    // Ne garder que les niveaux faibles, mais avec TOUT le contenu (anti-doublon)
    const filtre = {};
    for (const cle of NIVEAUX_FAIBLES[code]) {
      filtre[cle] = parNiveau[cle] ?? [];
    }
    resultat[code] = filtre;
  }
  fs.writeFileSync('scripts/remaining-games-full.json', JSON.stringify(resultat, null, 2));
  console.log('OK');
}

main();
