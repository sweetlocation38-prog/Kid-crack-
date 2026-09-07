const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

const MINUTES_PAR_SEMAINE_HYPOTHESE = 80;
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
      .select('mini_jeu_id, palier_actuel, details')
      .eq('profil_id', profil.id);

    let totalNiveauxGagnes = 0;
    let totalMinutesJouees = 0;

    for (const p of progressions ?? []) {
      const niveau = p.palier_actuel ?? 1;
      const nbSessions = p.details?.nbSessionsHistorique ?? 0;
      const dureeMoyenne = p.details?.tempsMoyenHistorique ?? 0;
      totalNiveauxGagnes += Math.max(0, niveau - 1);
      totalMinutesJouees += nbSessions * dureeMoyenne;
    }

    const efficacite = totalMinutesJouees > 0 ? totalNiveauxGagnes / totalMinutesJouees : null;
    const minutesSurObjectif = MINUTES_PAR_SEMAINE_HYPOTHESE * SEMAINES_OBJECTIF;
    const niveauxProjetes = efficacite != null ? efficacite * minutesSurObjectif : null;

    resultat[profil.prenom] = {
      profilId: profil.id,
      totalNiveauxGagnesActuellement: totalNiveauxGagnes,
      totalMinutesJoueesEstimees: Math.round(totalMinutesJouees),
      efficaciteNiveauxParMinute: efficacite != null ? Number(efficacite.toFixed(4)) : null,
      minutesSurObjectif: Math.round(minutesSurObjectif),
      niveauxProjetesSur2Mois: niveauxProjetes != null ? Number(niveauxProjetes.toFixed(1)) : null,
      objectifEtoilesMoyennePersonnalise: niveauxProjetes != null ? Math.max(3, Math.round(niveauxProjetes)) : 10,
    };
  }

  fs.writeFileSync('scripts/objectifs-etoiles.json', JSON.stringify(resultat, null, 2));
  console.log(JSON.stringify(resultat, null, 2));
}

main();
