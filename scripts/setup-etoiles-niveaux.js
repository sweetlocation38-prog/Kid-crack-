const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

async function main() {
  const resultats = {};

  // Table des etoiles par jeu et par profil (1 etoile par niveau passe).
  const sqlTable = `
    create table if not exists etoiles_niveaux (
      id uuid primary key default gen_random_uuid(),
      profil_id uuid not null references profils_enfants(id) on delete cascade,
      mini_jeu_id uuid not null references mini_jeux(id) on delete cascade,
      etoiles integer not null default 0,
      updated_at timestamptz not null default now(),
      unique (profil_id, mini_jeu_id)
    );
  `;
  const { error: errTable } = await supabase.rpc('exec_sql', { sql: sqlTable });
  resultats.table = errTable ? errTable.message : 'OK';

  // Colonne sur profils_enfants pour signaler qu'une recompense parent
  // est disponible (moyenne d'etoiles atteinte).
  const sqlColonne = `
    alter table profils_enfants
    add column if not exists recompense_parent_disponible boolean not null default false;
  `;
  const { error: errColonne } = await supabase.rpc('exec_sql', { sql: sqlColonne });
  resultats.colonne = errColonne ? errColonne.message : 'OK';

  fs.writeFileSync('scripts/setup-etoiles-result.json', JSON.stringify(resultats, null, 2));
  console.log(JSON.stringify(resultats, null, 2));
}

main();
