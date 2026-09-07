const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

const SEMAINES_OBJECTIF = 8.6;
const NIVEAU_MAX = 21;

async function main() {
  const { data: profils } = await supabase
    .from('profils_enfants')
    .select('id, prenom, created_at');
  const { data: jeux } = await supabase.from('mini_jeux').select('id, code, est_bonus');

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

    let totalNiveauxGagnes = 0;
    let totalNiveauxRestants = 0;
    const progParId = Object.fromEntries((progressions ?? []).map((p) => [p.mini_jeu_id, p.palier_actuel ?? 1]));

    for (const jeu of jeux) {
      if (jeu.est_bonus) continue;
      const niveau = progParId[jeu.id] ?? 1;
      totalNiveauxGagnes += Math.max(0, niveau - 1);
      totalNiveauxRestants += Math.max(0, NIVEAU_MAX - niveau);
    }

    const rythmeNiveauxParSemaineTousJeux = totalNiveauxGagnes / semainesDepuisCreation;
    const semainesPourToutCompleter = rythmeNiveauxParSemaineTousJeux > 0
      ? totalNiveauxRestants / rythmeNiveauxParSemaineTousJeux
      : null;
    const moisPourToutCompleter = semainesPourToutCompleter != null ? semainesPourToutCompleter / 4.33 : null;

    const niveauxGagnesSur2Mois = rythmeNiveauxParSemaineTousJeux * SEMAINES_OBJECTIF;
    const nbJeuxAvecProgres = Object.values(progParId).filter((n) => n > 1).length || 1;
    const moyenneEtoilesActuelle = totalNiveauxGagnes / nbJeuxAvecProgres;
    const objectifPersonnalise = moyenneEtoilesActuelle + (niveauxGagnesSur2Mois / nbJeuxAvecProgres);

    resultat[profil.prenom] = {
      totalNiveauxGagnesActuellement: totalNiveauxGagnes,
      totalNiveauxRestantsPourTout: totalNiveauxRestants,
      rythmeNiveauxParSemaineTousJeux: Number(rythmeNiveauxParSemaineTousJeux.toFixed(2)),
      semainesPourToutCompleter: semainesPourToutCompleter != null ? Math.round(semainesPourToutCompleter) : null,
      moisPourToutCompleter: moisPourToutCompleter != null ? Number(moisPourToutCompleter.toFixed(1)) : null,
      anneesPourToutCompleter: moisPourToutCompleter != null ? Number((moisPourToutCompleter / 12).toFixed(1)) : null,
      fractionDuCheminSur2Mois: semainesPourToutCompleter != null ? Number((SEMAINES_OBJECTIF / semainesPourToutCompleter * 100).toFixed(1)) : null,
      moyenneEtoilesActuelle: Number(moyenneEtoilesActuelle.toFixed(2)),
      objectifEtoilesMoyennePersonnalise: Math.max(3, Math.round(objectifPersonnalise)),
    };
  }

  fs.writeFileSync('scripts/objectifs-etoiles-v3.json', JSON.stringify(resultat, null, 2));
  console.log(JSON.stringify(resultat, null, 2));
}

main();
