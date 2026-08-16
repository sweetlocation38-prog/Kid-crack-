// Met a jour le champ "texte" des 65 manches de comprehension identifiees
// comme trop litterales (la reponse y etait ecrite quasiment mot pour
// mot) - remplace par une formulation qui necessite une vraie inference,
// sans jamais toucher a la question/aux options/a la bonne reponse (donc
// aucun risque de casser la logique du jeu).
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const reformulations = JSON.parse(fs.readFileSync(path.join(__dirname, 'reformulations.json'), 'utf8'));
  const ids = Object.keys(reformulations);
  const resultats = { succes: 0, echecs: [] };

  for (const id of ids) {
    const { data: row, error: errFetch } = await supabase
      .from('contenu_mini_jeu')
      .select('donnees')
      .eq('id', id)
      .maybeSingle();

    if (errFetch || !row) {
      resultats.echecs.push({ id, erreur: errFetch?.message ?? 'introuvable' });
      continue;
    }

    const nouvellesDonnees = { ...row.donnees, texte: reformulations[id] };
    const { error: errUpdate } = await supabase
      .from('contenu_mini_jeu')
      .update({ donnees: nouvellesDonnees })
      .eq('id', id);

    if (errUpdate) {
      resultats.echecs.push({ id, erreur: errUpdate.message });
    } else {
      resultats.succes += 1;
    }
  }

  fs.writeFileSync(path.join(__dirname, 'reformulation-result.json'), JSON.stringify(resultats, null, 2));
  console.log(`${resultats.succes}/${ids.length} manches reformulees avec succes.`);
  if (resultats.echecs.length > 0) console.log('Echecs:', JSON.stringify(resultats.echecs, null, 2));
}

main();
