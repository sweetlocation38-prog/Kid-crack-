// Corrige les 17 frises ou deux evenements partageaient la meme annee
// (ordre ambigu : l'enfant pouvait taper dans le bon ordre chronologique
// reel et se voir compter faux). Ajoute une petite decimale a l'annee
// STOCKEE (jamais affichee a l'enfant, juste utilisee pour le tri) en
// respectant l'ordre chronologique reel exact (mois pres) entre les deux
// evenements concernes.
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

// id -> { nom_evenement: nouvelle_annee }
const CORRECTIONS = {
  'e5443586-d714-4a53-9145-1d577851166f': { "Déclaration des droits de l'homme": 1789.5 },
  '765f6a4c-4ca5-4eb5-a614-dca0c7f8694f': { 'Jeux Olympiques de Paris (2e fois)': 1924.5 },
  '51a05520-6d4a-42f6-be27-d42b3e9490a8': { 'Libération de Paris': 1944.5, 'Création de la Sécurité sociale': 1945.5 },
  '0095b01a-01f6-498e-9422-107b1f55d8e8': { "Indépendance de l'Inde": 1947.5 },
  '46784ddb-9ee2-4678-a085-3afdf18f41b4': { 'Nelson Mandela devient président': 1994.5 },
  '48991360-df8c-4638-a4d3-1bf8af703a26': { 'Prise de la Bastille': 1789.5 },
  '585257a3-c1e7-4286-8dfe-2d055f7417e1': { "Indépendance de l'Inde": 1947.5 },
  '75c870e8-8799-4346-93a9-2db01010ec8c': { 'Débarquement de Normandie': 1944.5, 'Création de la Sécurité sociale': 1945.5 },
  '0e7759bb-de20-4c40-8009-c46bcc26df77': { "Début de la guerre d'Algérie": 1954.5 },
  'da451da7-ee2c-428e-8d4b-a4979f991deb': { 'Hégire, départ de Mahomet vers Médine': 622.5 },
  'c2d916e0-c75e-4fc2-b072-7c5651047467': { 'Fin de la Guerre de Cent Ans': 1453.5 },
  'c963da3a-5249-409c-9d66-462d639dbee9': { "Déclaration des droits de l'homme": 1789.5 },
  'f6095213-f11c-44cb-80ea-7e2401be182d': { 'Napoléon sacré empereur': 1804.5 },
  'eb96e27c-2fde-46c9-be8a-1c7e3cd0f852': { 'Guerre de Sécession américaine': 1861.5 },
  'd32df84a-d809-4213-aee3-ea11aab0657c': { "Bombes atomiques d'Hiroshima et Nagasaki": 1945.33, 'Fondation de l\'ONU': 1945.66, "Indépendance de l'Inde": 1947.5 },
  '2bb5a6d6-0292-42cb-afed-9055d1487736': { 'Premier satellite Spoutnik': 1957.5 },
  '561a1464-72ad-47b1-b836-36e1333afd06': { 'Pandémie mondiale de Covid-19': 2020.5 },
};

async function main() {
  let succes = 0;
  const echecs = [];

  for (const id of Object.keys(CORRECTIONS)) {
    const { data: row, error: errFetch } = await supabase
      .from('contenu_mini_jeu').select('donnees').eq('id', id).maybeSingle();
    if (errFetch || !row) { echecs.push({ id, erreur: errFetch?.message ?? 'introuvable' }); continue; }

    const corrections = CORRECTIONS[id];
    const nouveauxEvenements = row.donnees.evenements.map((e) =>
      corrections[e.nom] != null ? { ...e, annee: corrections[e.nom] } : e
    );
    const { error } = await supabase
      .from('contenu_mini_jeu')
      .update({ donnees: { ...row.donnees, evenements: nouveauxEvenements } })
      .eq('id', id);
    if (error) echecs.push({ id, erreur: error.message });
    else succes += 1;
  }

  fs.writeFileSync(path.join(__dirname, 'fix-frise-doublons-result.json'), JSON.stringify({ succes, echecs }, null, 2));
  console.log(`${succes}/17 frises corrigees`);
}

main();
