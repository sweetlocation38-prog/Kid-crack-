// Recupere toutes les manches de type "comprehension" du jeu Sons
// Magiques, pour que Claude puisse les lire et les reformuler (l'acces
// direct a Supabase n'est pas possible depuis l'environnement de
// developpement, uniquement depuis GitHub Actions).
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeu, error: errJeu } = await supabase
    .from('mini_jeux')
    .select('id')
    .eq('code', 'sons_magiques')
    .maybeSingle();

  if (errJeu || !jeu) {
    fs.writeFileSync('scripts/comprehension-content.json', JSON.stringify({ error: errJeu?.message ?? 'jeu introuvable' }, null, 2));
    return;
  }

  const { data, error } = await supabase
    .from('contenu_mini_jeu')
    .select('id, niveau, palier, donnees')
    .eq('mini_jeu_id', jeu.id)
    .eq('actif', true);

  if (error) {
    fs.writeFileSync('scripts/comprehension-content.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const comprehensionRows = (data ?? []).filter((row) => row.donnees?.etape === 'comprehension');
  fs.writeFileSync('scripts/comprehension-content.json', JSON.stringify(comprehensionRows, null, 2));
  console.log(`Trouve ${comprehensionRows.length} manches de comprehension sur ${data.length} manches totales.`);
}

main();
