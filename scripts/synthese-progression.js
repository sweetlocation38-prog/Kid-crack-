const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

function gradeAndPalierFromRung(rung) {
  const GRADE_ORDER = ['ms', 'gs', 'cp', 'ce1', 'ce2', 'cm1', 'cm2'];
  const clamped = Math.max(1, Math.min(rung, 21));
  const idx = Math.floor((clamped - 1) / 3);
  const palier = ((clamped - 1) % 3) + 1;
  return `${GRADE_ORDER[Math.min(idx, GRADE_ORDER.length - 1)]}-${palier}`;
}

async function main() {
  const { data: profils } = await supabase
    .from('profils_enfants')
    .select('id, prenom, created_at, niveau_defaut');

  const cibles = profils.filter((p) =>
    p.prenom?.toLowerCase().startsWith('jules') || p.prenom?.toLowerCase().startsWith('emma')
  );

  const { data: jeux } = await supabase.from('mini_jeux').select('id, code, nom, competence, est_bonus');
  const jeuxParId = Object.fromEntries(jeux.map((j) => [j.id, j]));

  const resultat = {};

  for (const profil of cibles) {
    const { data: progressions } = await supabase
      .from('progression')
      .select('mini_jeu_id, palier_actuel, details, updated_at')
      .eq('profil_id', profil.id);

    const joursDepuisCreation = Math.max(1, (Date.now() - new Date(profil.created_at).getTime()) / 86400000);

    const lignesJeux = (progressions ?? []).map((p) => {
      const jeu = jeuxParId[p.mini_jeu_id];
      const nbSessions = p.details?.nbSessionsHistorique ?? 0;
      const rung = p.palier_actuel ?? 1;
      // Vitesse = niveaux gagnes par session jouee (plus c'est haut, plus
      // l'enfant progresse vite dans ce jeu specifiquement) et niveaux
      // gagnes par semaine depuis la creation du profil (rythme reel dans
      // le temps, pas juste en nombre de parties).
      const vitesseParSession = nbSessions > 0 ? (rung / nbSessions) : null;
      const vitesseParSemaine = (rung / joursDepuisCreation) * 7;
      return {
        code: jeu?.code ?? p.mini_jeu_id,
        nom: jeu?.nom ?? '?',
        competence: jeu?.competence ?? '?',
        estBonus: jeu?.est_bonus ?? false,
        niveauAtteint: rung,
        niveauLabel: gradeAndPalierFromRung(rung),
        nbSessionsJouees: nbSessions,
        etoiles: p.details?.etoiles ?? 0,
        vitesseNiveauxParSession: vitesseParSession != null ? Number(vitesseParSession.toFixed(3)) : null,
        vitesseNiveauxParSemaine: Number(vitesseParSemaine.toFixed(2)),
        derniereMaj: p.updated_at,
      };
    });

    lignesJeux.sort((a, b) => b.nbSessionsJouees - a.nbSessionsJouees);

    resultat[profil.prenom] = {
      profilId: profil.id,
      niveauScolaireDefaut: profil.niveau_defaut,
      dateCreation: profil.created_at,
      joursDepuisCreation: Math.round(joursDepuisCreation),
      nbJeuxJoues: lignesJeux.length,
      nbJeuxTotal: jeux.length,
      jeux: lignesJeux,
    };
  }

  fs.writeFileSync('scripts/synthese-progression.json', JSON.stringify(resultat, null, 2));
  console.log('OK -', Object.keys(resultat).join(', '));
}

main();
