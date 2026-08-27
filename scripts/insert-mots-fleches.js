const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

const NIVEAUX_4_MOTS = ['ms', 'gs', 'cp'];
const NIVEAUX_6_MOTS = ['ce1', 'ce2', 'cm1', 'cm2'];
const PALIERS = [1, 2, 3];

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'mots_fleches').maybeSingle();
  if (!jeu) {
    fs.writeFileSync(path.join(__dirname, 'insert-mots-fleches-result.json'), JSON.stringify({ error: 'jeu introuvable, lancer register-mots-fleches.js d\'abord' }, null, 2));
    return;
  }

  const grilles4 = JSON.parse(fs.readFileSync(path.join(__dirname, 'mf-ms.json'), 'utf8'));
  const grilles6 = JSON.parse(fs.readFileSync(path.join(__dirname, 'mf-ce1plus.json'), 'utf8'));

  const lignes = [];
  for (const niveau of NIVEAUX_4_MOTS) {
    for (const palier of PALIERS) {
      for (const grille of grilles4) {
        lignes.push({ mini_jeu_id: jeu.id, niveau, palier, donnees: grille, actif: true });
      }
    }
  }
  for (const niveau of NIVEAUX_6_MOTS) {
    for (const palier of PALIERS) {
      for (const grille of grilles6) {
        lignes.push({ mini_jeu_id: jeu.id, niveau, palier, donnees: grille, actif: true });
      }
    }
  }

  // Insertion par lots de 100 pour eviter les timeouts.
  let succes = 0;
  const echecs = [];
  for (let i = 0; i < lignes.length; i += 100) {
    const lot = lignes.slice(i, i + 100);
    const { data, error } = await supabase.from('contenu_mini_jeu').insert(lot).select('id');
    if (error) echecs.push({ lot: i / 100, erreur: error.message });
    else succes += data.length;
  }

  fs.writeFileSync(path.join(__dirname, 'insert-mots-fleches-result.json'), JSON.stringify({
    total: lignes.length, succes, echecs,
  }, null, 2));
  console.log(`${succes}/${lignes.length} lignes inserees`);
}

main();
