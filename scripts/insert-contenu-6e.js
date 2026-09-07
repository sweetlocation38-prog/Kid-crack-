const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

const JEUX = [
  { code: 'indices_jardin', fichier: 'sixieme-indices-jardin.json' },
  { code: 'tri_village', fichier: 'sixieme-tri-village.json' },
  { code: 'frise_temps', fichier: 'sixieme-frise-temps.json' },
];
const PALIERS = [1, 2, 3];

async function main() {
  const resultatGlobal = {};

  for (const { code, fichier } of JEUX) {
    const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', code).maybeSingle();
    if (!jeu) {
      resultatGlobal[code] = { error: 'jeu introuvable' };
      continue;
    }

    const grilles = JSON.parse(fs.readFileSync(path.join(__dirname, fichier), 'utf8'));
    const lignes = [];
    for (const palier of PALIERS) {
      for (const donnees of grilles) {
        lignes.push({ mini_jeu_id: jeu.id, niveau: '6e', palier, donnees, actif: true });
      }
    }

    let succes = 0;
    const echecs = [];
    for (let i = 0; i < lignes.length; i += 100) {
      const lot = lignes.slice(i, i + 100);
      const { data, error } = await supabase.from('contenu_mini_jeu').insert(lot).select('id');
      if (error) echecs.push({ lot: i / 100, erreur: error.message });
      else succes += data.length;
    }
    resultatGlobal[code] = { total: lignes.length, succes, echecs };
  }

  fs.writeFileSync(path.join(__dirname, 'insert-6e-result.json'), JSON.stringify(resultatGlobal, null, 2));
  console.log(JSON.stringify(resultatGlobal, null, 2));
}

main();
