const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const codes = ['indices_jardin', 'tri_village', 'frise_temps'];
  const resultat = {};

  for (const code of codes) {
    const { data: jeu, error: errJeu } = await supabase.from('mini_jeux').select('id').eq('code', code).maybeSingle();
    if (!jeu) {
      resultat[code] = { erreur: errJeu?.message ?? 'jeu introuvable' };
      continue;
    }
    const { data, error } = await supabase
      .from('contenu_mini_jeu')
      .select('niveau, palier, donnees')
      .eq('mini_jeu_id', jeu.id)
      .eq('actif', true);

    if (error) {
      resultat[code] = { erreur: error.message };
      continue;
    }

    const parNiveau = {};
    for (const row of data) {
      const cle = `${row.niveau}-p${row.palier}`;
      parNiveau[cle] = (parNiveau[cle] ?? 0) + 1;
    }
    resultat[code] = {
      total: data.length,
      parNiveau,
      exempleDonnees: data[0]?.donnees ?? null,
    };
  }

  fs.writeFileSync('scripts/verif-3-jeux.json', JSON.stringify(resultat, null, 2));
  console.log(JSON.stringify(resultat, null, 2));
}

main();
