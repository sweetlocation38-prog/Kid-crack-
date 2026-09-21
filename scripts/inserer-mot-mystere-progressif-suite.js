// Complete l'insertion apres correction de la contrainte niveau
// (qui n'acceptait pas "6e") - insere uniquement le lot qui avait
// echoue (rows 300 a 359 du fichier genere), sans toucher au reste
// deja insere avec succes.
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'mot_mystere').maybeSingle();
  if (!jeu) {
    fs.writeFileSync(path.join(__dirname, 'inserer-mot-mystere-progressif-suite-result.json'), JSON.stringify({ error: 'jeu introuvable' }, null, 2));
    return;
  }

  const lignesBrutes = JSON.parse(fs.readFileSync(path.join(__dirname, 'mot-mystere-progressif.json'), 'utf8'));
  const lotManquant = lignesBrutes.slice(300, 360).map((l) => ({
    mini_jeu_id: jeu.id, niveau: l.niveau, palier: l.palier, donnees: l.donnees, actif: true,
  }));

  const { data, error } = await supabase.from('contenu_mini_jeu').insert(lotManquant).select('id');

  fs.writeFileSync(
    path.join(__dirname, 'inserer-mot-mystere-progressif-suite-result.json'),
    JSON.stringify({ total: lotManquant.length, succes: data?.length ?? 0, erreur: error?.message ?? null }, null, 2)
  );
  console.log(`${data?.length ?? 0}/${lotManquant.length} lignes inserees`);
}

main();
