// Corrige les 17 manches de Memoire des Etoiles ou deux mots differents
// partageaient le meme emoji au sein d'une meme grille - l'enfant pouvait
// faire une association visuellement plausible mais refusee par le jeu
// (le jeu associe par position/index, pas par contenu). Change uniquement
// l'emoji du mot en double vers un emoji distinct et coherent, jamais le
// mot lui-meme.
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

// id -> { mot: nouvel_emoji }
const CORRECTIONS = {
  '3a853c47-505e-41b0-8cbe-c25032e75198': { 'FARINE FINE': '🥣' },
  '90d9755a-6c9a-454c-8554-9c1c25288651': { 'LABYRINTHE': '🧭' },
  '0c2af018-f950-48ae-a4bc-bd2a898b3778': { 'BALANCOIRE': '⛓️' },
  '9eaeaa58-7ff2-4518-99ec-99d30e4d5095': { 'ANGLE': '🔻' },
  '3a577043-0d20-4d67-bc4b-7874f1e237b1': { 'FLECHE': '➡️' },
  '891f7508-a39f-4377-8d3e-57ff87c6acfc': { 'CHEVALET': '🪵' },
  'aef30d10-2bfc-4225-b627-715e365d8481': { 'CACAO': '🌰' },
  'c09be0c4-e597-44ed-a1ed-31b007f920c8': { 'ESSAIM': '🍯' },
  '876211fe-cfdf-4cc0-961a-20357b3bf045': { 'EPEE': '🗡️' },
  '796596e7-2ca7-4c30-8d13-e34115a325d8': { 'ARMURE': '🦺' },
  '7064aae2-0e67-4e4c-989e-5d23a7367f07': { 'MAGMA': '🟠' },
  'b88ed4cf-2811-4cee-a2dd-7e2f915a620f': { 'NEBULEUSE': '🎆' },
  'dd2056fe-8bef-4bc4-82c8-dc0e3c0848b7': { 'FARINE': '🥣' },
  'fdd9f964-7a02-4e52-ab7b-2421bf4645a1': { 'INONDATION': '🌧️' },
  '773a93f8-949b-4f85-a564-540be31eee4e': { 'GENE': '🔗', 'MUTATION': '⚡', 'CHROMOSOME': '➰' },
  '5782e09c-bcb2-443b-87ac-076bac4b5835': { 'SENAT': '🪑' },
  'cbbe3e53-81b5-45a1-95bf-99f23b7375e0': { 'ELECTRICITE': '🔌' },
};

async function main() {
  let succes = 0;
  const echecs = [];

  for (const id of Object.keys(CORRECTIONS)) {
    const { data: row, error: errFetch } = await supabase
      .from('contenu_mini_jeu').select('donnees').eq('id', id).maybeSingle();
    if (errFetch || !row) { echecs.push({ id, erreur: errFetch?.message ?? 'introuvable' }); continue; }

    const corrections = CORRECTIONS[id];
    const nouvellesPaires = row.donnees.paires.map((p) =>
      corrections[p.mot] != null ? { ...p, emoji: corrections[p.mot] } : p
    );
    const { error } = await supabase
      .from('contenu_mini_jeu')
      .update({ donnees: { ...row.donnees, paires: nouvellesPaires } })
      .eq('id', id);
    if (error) echecs.push({ id, erreur: error.message });
    else succes += 1;
  }

  fs.writeFileSync(path.join(__dirname, 'fix-memoire-doublons-result.json'), JSON.stringify({ succes, echecs }, null, 2));
  console.log(`${succes}/17 manches corrigees`);
}

main();
