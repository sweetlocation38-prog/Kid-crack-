const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: profils, error: errProfils } = await supabase
    .from('profils_enfants')
    .select('id, prenom');

  if (errProfils) {
    fs.writeFileSync('scripts/debloquer-valerie-result.json', JSON.stringify({ error: errProfils.message }, null, 2));
    return;
  }

  const valerie = profils.find((p) => p.prenom?.toLowerCase().startsWith('valérie') || p.prenom?.toLowerCase().startsWith('valerie'));
  if (!valerie) {
    fs.writeFileSync('scripts/debloquer-valerie-result.json', JSON.stringify({ error: 'Profil Valérie introuvable', profilsDisponibles: profils }, null, 2));
    return;
  }

  const { error } = await supabase
    .from('bonus_debloques')
    .upsert(
      { profil_id: valerie.id, zone_competence: 'lecture' },
      { onConflict: 'profil_id,zone_competence' }
    );

  fs.writeFileSync('scripts/debloquer-valerie-result.json', JSON.stringify({
    profilId: valerie.id, erreur: error?.message ?? null, succes: !error,
  }, null, 2));
  console.log(error ? error.message : `Débloqué pour Valérie (${valerie.id})`);
}

main();
