const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'mot_mystere').maybeSingle();
  if (!jeu) {
    fs.writeFileSync(path.join(__dirname, 'inserer-mot-mystere-progressif-result.json'), JSON.stringify({ error: 'jeu introuvable' }, null, 2));
    return;
  }

  // Desactive (sans supprimer) l'ancien contenu, tres repetitif (les
  // memes 20 grilles recyclees sur toute une tranche d'age) - remplace
  // par des grilles variees dont la taille suit les 24 crans.
  const { error: erreurDesactivation, count } = await supabase
    .from('contenu_mini_jeu')
    .update({ actif: false })
    .eq('mini_jeu_id', jeu.id)
    .eq('actif', true)
    .select('id', { count: 'exact' });

  const lignesBrutes = JSON.parse(fs.readFileSync(path.join(__dirname, 'mot-mystere-progressif.json'), 'utf8'));
  const lignes = lignesBrutes.map((l) => ({ mini_jeu_id: jeu.id, niveau: l.niveau, palier: l.palier, donnees: l.donnees, actif: true }));

  let succes = 0;
  const echecs = [];
  for (let i = 0; i < lignes.length; i += 100) {
    const lot = lignes.slice(i, i + 100);
    const { data, error } = await supabase.from('contenu_mini_jeu').insert(lot).select('id');
    if (error) echecs.push({ lot: i / 100, erreur: error.message });
    else succes += data.length;
  }

  fs.writeFileSync(
    path.join(__dirname, 'inserer-mot-mystere-progressif-result.json'),
    JSON.stringify({ anciennesLignesDesactivees: count ?? null, erreurDesactivation: erreurDesactivation?.message ?? null, total: lignes.length, succes, echecs }, null, 2)
  );
  console.log(`${succes}/${lignes.length} lignes inserees, ${count ?? '?'} anciennes lignes desactivees`);
}

main();
