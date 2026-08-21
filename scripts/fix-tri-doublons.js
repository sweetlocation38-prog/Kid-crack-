const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const id = '81159c00-d17c-42e9-a217-74b05a8a8f13';
  const { data: row, error: errFetch } = await supabase
    .from('contenu_mini_jeu').select('donnees').eq('id', id).maybeSingle();
  if (errFetch || !row) {
    fs.writeFileSync(path.join(__dirname, 'fix-tri-result.json'), JSON.stringify({ erreur: errFetch?.message ?? 'introuvable' }, null, 2));
    return;
  }

  // Le lezard (reptile) etait aussi classe a tort comme "Amphibien" - une
  // vraie erreur de biologie, pas juste une ambiguite. Remplace ce second
  // exemplaire "Amphibien" par une grenouille (deja utilisee pour
  // l'autre exemplaire "Amphibien", mais c'est un vrai amphibien - aucun
  // autre emoji d'amphibien distinct n'existe dans le jeu de caracteres
  // standard).
  let corrige = false;
  const nouveauxItems = row.donnees.items.map((it) => {
    if (it.cat === 'Amphibien' && it.val === '🦎' && !corrige) {
      corrige = true;
      return { ...it, val: '🐸' };
    }
    return it;
  });

  const { error } = await supabase
    .from('contenu_mini_jeu')
    .update({ donnees: { ...row.donnees, items: nouveauxItems } })
    .eq('id', id);

  fs.writeFileSync(path.join(__dirname, 'fix-tri-result.json'), JSON.stringify({ corrige, error: error?.message ?? null }, null, 2));
  console.log(error ? `Erreur: ${error.message}` : 'Corrige avec succes');
}

main();
