const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data: existant } = await supabase.from('mini_jeux').select('id').eq('code', 'mot_mystere').maybeSingle();
  if (existant) {
    fs.writeFileSync('scripts/register-mot-mystere-result.json', JSON.stringify({ deja: true, id: existant.id }, null, 2));
    console.log('Deja enregistre :', existant.id);
    return;
  }
  const { data, error } = await supabase
    .from('mini_jeux')
    .insert({ code: 'mot_mystere', nom: 'Le Mot Mystère de la Grotte', competence: 'logique', est_bonus: true })
    .select('id')
    .single();
  fs.writeFileSync('scripts/register-mot-mystere-result.json', JSON.stringify({ error: error?.message, id: data?.id }, null, 2));
  console.log(error ? error.message : `Enregistre : ${data.id}`);
}

main();
