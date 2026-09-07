const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

const SEMAINES_OBJECTIF = 8.6; // ~2 mois

async function main() {
  const { data: profils } = await supabase
    .from('profils_enfants')
    .select('id, prenom, created_at');

  const cibles = profils.filter((p) =>
    p.prenom?.toLowerCase().startsWith('jules') || p.prenom?.toLowerCase().startsWith('emma')
  );

  const resultat = {};

  for (const profil of cibles) {
    const { data: progressions } = await supabase
      .from('progression')
      .select('mini_jeu_id, palier_actuel')
      .eq('profil_id', profil.id);

    const joursDepuisCreation = Math.max(1, (Date.now() - new Date(profil.created_at).getTime()) / 86400000);
    const semainesDepuisCreation = joursDepuisCreation / 7;

    // Rythme calendaire REEL et valide : total des niveaux gagnes (somme
    // sur tous les jeux, niveau actuel - 1 puisqu'on part de 1) divise par
    // les semaines ecoulees depuis la creation du profil - une mesure
    // fiable, pas sujette a une confusion d'unite comme la tentative
    // precedente (secondes/manche pris a tort pour des minutes).
    let totalNiveauxGagnes = 0;
    for (const p of progressions ?? []) {
      totalNiveauxGagnes += Math.max(0, (p.palier_actuel ?? 1) - 1);
    }
    const nbJeuxJoues = (progressions ?? []).filter((p) => (p.palier_actuel ?? 1) > 1).length || 1;

    const rythmeNiveauxParSemaineTousJeux = totalNiveauxGagnes / semainesDepuisCreation;
    const moyenneEtoilesActuelle = totalNiveauxGagnes / nbJeuxJoues;
    // Rythme "moyenne d'etoiles par semaine" = rythme total / nb de jeux
    // actuellement actifs (approxime le rythme de LA MOYENNE, la mesure
    // utilisee pour le seuil de recompense).
    const rythmeMoyenneParSemaine = rythmeNiveauxParSemaineTousJeux / nbJeuxJoues;
    const objectifPersonnalise = moyenneEtoilesActuelle + rythmeMoyenneParSemaine * SEMAINES_OBJECTIF;

    resultat[profil.prenom] = {
      profilId: profil.id,
      semainesDepuisCreation: Number(semainesDepuisCreation.toFixed(1)),
      nbJeuxAvecProgres: nbJeuxJoues,
      totalNiveauxGagnesActuellement: totalNiveauxGagnes,
      moyenneEtoilesActuelle: Number(moyenneEtoilesActuelle.toFixed(2)),
      rythmeMoyenneParSemaine: Number(rythmeMoyenneParSemaine.toFixed(3)),
      objectifEtoilesMoyennePersonnalise: Math.max(3, Math.round(objectifPersonnalise)),
    };
  }

  fs.writeFileSync('scripts/objectifs-etoiles-v2.json', JSON.stringify(resultat, null, 2));
  console.log(JSON.stringify(resultat, null, 2));
}

main();
