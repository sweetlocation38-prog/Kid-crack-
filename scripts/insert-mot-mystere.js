const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

const NIVEAUX_PETIT = ['ms', 'gs', 'cp'];
const NIVEAUX_MOYEN = ['ce1', 'ce2'];
const NIVEAUX_GRAND = ['cm1', 'cm2'];
const PALIERS = [1, 2, 3];

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'mot_mystere').maybeSingle();
  if (!jeu) {
    fs.writeFileSync(path.join(__dirname, 'insert-mot-mystere-result.json'), JSON.stringify({ error: 'jeu introuvable' }, null, 2));
    return;
  }

  const lotPetit = JSON.parse(fs.readFileSync(path.join(__dirname, 'mm-petit.json'), 'utf8'));
  const lotMoyen = JSON.parse(fs.readFileSync(path.join(__dirname, 'mm-moyen.json'), 'utf8'));
  const lotGrand = JSON.parse(fs.readFileSync(path.join(__dirname, 'mm-grand.json'), 'utf8'));

  const lignes = [];
  for (const niveau of NIVEAUX_PETIT) {
    for (const palier of PALIERS) {
      for (const g of lotPetit) lignes.push({ mini_jeu_id: jeu.id, niveau, palier, donnees: g, actif: true });
    }
  }
  for (const niveau of NIVEAUX_MOYEN) {
    for (const palier of PALIERS) {
      for (const g of lotMoyen) lignes.push({ mini_jeu_id: jeu.id, niveau, palier, donnees: g, actif: true });
    }
  }
  for (const niveau of NIVEAUX_GRAND) {
    for (const palier of PALIERS) {
      for (const g of lotGrand) lignes.push({ mini_jeu_id: jeu.id, niveau, palier, donnees: g, actif: true });
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

  fs.writeFileSync(path.join(__dirname, 'insert-mot-mystere-result.json'), JSON.stringify({ total: lignes.length, succes, echecs }, null, 2));
  console.log(`${succes}/${lignes.length} lignes inserees`);
}

main();
