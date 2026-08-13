// Script ponctuel : verifie que le mini-jeu "boule_qui_roule" existe dans
// la table Supabase mini_jeux, et l'insere sinon. Utilise la cle
// service_role (fournie via variable d'environnement, jamais en dur dans
// le code) pour contourner les policies RLS qui bloquent la cle publique
// normalement utilisee par l'app.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY manquante dans l\'environnement.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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
