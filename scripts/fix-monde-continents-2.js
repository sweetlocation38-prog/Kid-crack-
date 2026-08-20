const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

const CORRECTIONS = {
  '2b70fbcf-b539-4176-b8bb-ff9dbc2dcd95': 'Asie',   // Emirats arabes unis
  '3fc1c21d-d7f3-4a9b-a8da-a4398067a6c3': 'Asie',   // Arabie saoudite
  'd304e2b3-6438-43e2-93ef-10e7e86b4364': 'Amerique', // Republique dominicaine
  '68dda72e-c590-471a-94a3-48f2e9fc8ac9': 'Asie',
  '507c389b-abaf-4ddd-a136-953c14b70647': 'Asie',
  '589fcf84-a26d-4ced-bf6a-374f5c89cb57': 'Amerique',
  'b8e82449-ebdd-449c-8699-00be25df5704': 'Asie',
  '57ba33a3-6f9a-4ed8-89d1-fac3537b4581': 'Asie',
  '8b816d30-25df-4573-8113-e9a156d0e2a5': 'Amerique',
  'f8477ed3-80a8-4372-9cf8-cc4a94e3ad69': 'Europe',  // Vatican
  '6188a3a9-30dc-4007-bf97-7a467352cce0': 'Europe',
  'ea1319ec-91c7-4704-9f21-69034bb246c9': 'Europe',
  'c2a3bf42-ff13-4c64-99e4-a8e207fc489d': 'Afrique', // Erythree
  '5829f7ae-7a60-4ca6-a1dc-c23d3e8d97d1': 'Europe',  // Ecosse
  'fea97e0c-6bd9-4192-a604-b3424081752e': 'Europe',
  '1761b775-245f-4286-a20b-ca6eb64e26ec': 'Amerique', // Porto Rico
};

async function main() {
  let succes = 0;
  const echecs = [];
  for (const id of Object.keys(CORRECTIONS)) {
    const { data: row, error: errFetch } = await supabase
      .from('contenu_mini_jeu').select('donnees').eq('id', id).maybeSingle();
    if (errFetch || !row) { echecs.push({ id, erreur: errFetch?.message ?? 'introuvable' }); continue; }
    const { error } = await supabase
      .from('contenu_mini_jeu')
      .update({ donnees: { ...row.donnees, continent: CORRECTIONS[id] } })
      .eq('id', id);
    if (error) echecs.push({ id, erreur: error.message });
    else succes += 1;
  }
  fs.writeFileSync(path.join(__dirname, 'fix-continents-result-2.json'), JSON.stringify({ succes, echecs }, null, 2));
  console.log(`${succes}/16 corrigees`);
}

main();
