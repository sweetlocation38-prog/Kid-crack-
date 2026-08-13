// Script ponctuel : verifie que le mini-jeu "boule_qui_roule" existe dans
// la table Supabase mini_jeux, et l'insere sinon. A lancer via le workflow
// GitHub Actions "Enregistrer un mini-jeu" (pas d'acces reseau direct
// depuis l'environnement de developpement de Claude, GitHub Actions si).
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IlVBCZOtS3Qa2wMVa6Eu7Q_lNBiE7ps';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fs = require('fs');

function ecrireResultat(texte) {
  fs.writeFileSync('scripts/last-run-result.txt', `${new Date().toISOString()}\n${texte}\n`);
}

async function main() {
  const { data: existant, error: errLecture } = await supabase
    .from('mini_jeux')
    .select('id, code, nom, competence, est_bonus')
    .eq('code', 'boule_qui_roule')
    .maybeSingle();

  if (errLecture) {
    ecrireResultat(`ERREUR LECTURE: ${errLecture.message}\n${JSON.stringify(errLecture)}`);
    process.exit(0); // 0 volontairement : on veut que le commit du resultat se fasse quand meme
  }

  if (existant) {
    ecrireResultat(`DEJA PRESENT: ${JSON.stringify(existant)}`);
    return;
  }

  const { data: cree, error: errInsert } = await supabase
    .from('mini_jeux')
    .insert({ code: 'boule_qui_roule', nom: 'La Boule qui Roule', competence: 'lecture', est_bonus: false })
    .select('id, code, nom, competence, est_bonus')
    .maybeSingle();

  if (errInsert) {
    ecrireResultat(`ERREUR INSERTION: ${errInsert.message}\n${JSON.stringify(errInsert)}`);
    process.exit(0);
  }

  ecrireResultat(`CREE AVEC SUCCES: ${JSON.stringify(cree)}`);
}

main();
