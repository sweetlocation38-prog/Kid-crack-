// Audit du contenu : compte le nombre de manches actives par mini-jeu et
// par niveau, pour reperer les jeux/niveaux trop pauvres en contenu
// (objectif Thierry : minimum 20 manches distinctes par niveau/palier).
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeux, error: errJeux } = await supabase
    .from('mini_jeux')
    .select('id, code');

  if (errJeux) {
    fs.writeFileSync('scripts/content-audit.json', JSON.stringify({ error: errJeux.message }, null, 2));
    return;
  }

  const resultat = {};
  for (const jeu of jeux) {
    const { data, error } = await supabase
      .from('contenu_mini_jeu')
      .select('niveau, palier')
      .eq('mini_jeu_id', jeu.id)
      .eq('actif', true);

    if (error) {
      resultat[jeu.code] = { erreur: error.message };
      continue;
    }

    const parNiveau = {};
    for (const row of data) {
      const cle = `${row.niveau ?? 'sans-niveau'}${row.palier != null ? '-p' + row.palier : ''}`;
      parNiveau[cle] = (parNiveau[cle] ?? 0) + 1;
    }
    resultat[jeu.code] = { total: data.length, parNiveau };
  }

  fs.writeFileSync('scripts/content-audit.json', JSON.stringify(resultat, null, 2));
  console.log('Audit termine.');
}

main();
