const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function inserer(code, fichier) {
  const { data: jeu, error: errJeu } = await supabase.from('mini_jeux').select('id').eq('code', code).maybeSingle();
  if (errJeu || !jeu) return { code, erreur: errJeu?.message ?? 'jeu introuvable' };

  const contenu = JSON.parse(fs.readFileSync(path.join(__dirname, fichier), 'utf8'));
  const lignes = [];
  for (const cle of Object.keys(contenu)) {
    const [niveau, palierStr] = cle.split('-');
    const palier = Number(palierStr);
    for (const donnees of contenu[cle]) {
      lignes.push({ mini_jeu_id: jeu.id, niveau, palier, donnees, actif: true });
    }
  }

  const { data, error } = await supabase.from('contenu_mini_jeu').insert(lignes).select('id');
  if (error) return { code, erreur: error.message, tentees: lignes.length };
  return { code, inserees: data.length };
}

async function main() {
  const jeux = [
    ['sons_magiques', 'sons-new.json'],
    ['tri_village', 'tri-new.json'],
    ['balance_prairie', 'balance-new.json'],
    ['marche_village', 'marche-new.json'],
    ['monde_capitales', 'monde-new.json'],
  ];
  const resultat = [];
  for (const [code, fichier] of jeux) {
    resultat.push(await inserer(code, fichier));
  }
  fs.writeFileSync(path.join(__dirname, 'insertion-result-2.json'), JSON.stringify(resultat, null, 2));
  console.log(JSON.stringify(resultat, null, 2));
}

main();
