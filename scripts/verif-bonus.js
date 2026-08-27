const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data, error } = await supabase.from('mini_jeux').select('code, nom, competence, est_bonus');
  if (error) {
    fs.writeFileSync('scripts/verif-bonus.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }
  const parCompetence = {};
  for (const row of data) {
    if (!parCompetence[row.competence]) parCompetence[row.competence] = { normaux: [], bonus: [] };
    (row.est_bonus ? parCompetence[row.competence].bonus : parCompetence[row.competence].normaux).push(row.code);
  }
  fs.writeFileSync('scripts/verif-bonus.json', JSON.stringify(parCompetence, null, 2));
  console.log(JSON.stringify(parCompetence, null, 2));
}

main();
