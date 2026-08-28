const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const { data, error } = await supabase
    .from('fiches_animaux')
    .select('code, nom_affiche, habitat, alimentation, fait_amusant');

  if (error) {
    fs.writeFileSync('scripts/verif-fiches-animaux.json', JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const total = data.length;
  const completes = data.filter((f) => f.habitat && f.alimentation && f.fait_amusant).length;
  const vides = data.filter((f) => !f.habitat && !f.alimentation && !f.fait_amusant);
  const partielles = data.filter((f) => (f.habitat || f.alimentation || f.fait_amusant) && !(f.habitat && f.alimentation && f.fait_amusant));

  fs.writeFileSync('scripts/verif-fiches-animaux.json', JSON.stringify({
    total,
    completes,
    videsCount: vides.length,
    videsExemples: vides.slice(0, 10).map((f) => f.code),
    partiellesCount: partielles.length,
    partiellesExemples: partielles.slice(0, 5),
  }, null, 2));
  console.log(`${completes}/${total} fiches completes, ${vides.length} entierement vides, ${partielles.length} partielles`);
}

main();
