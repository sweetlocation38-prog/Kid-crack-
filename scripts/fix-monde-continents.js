// Corrige le bug : 751 lignes sur 905 du Monde en Capitales n'avaient
// aucun champ "continent" renseigne, ce qui vidait presque completement
// le mode "par continent" pour certains continents (retour de Thierry :
// "un seul choix qui se repete" sur Oceanie notamment, qui n'avait que 12
// lignes valides sur ~150).
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_TOKEN);

// Pays -> continent (noms tels qu'utilises dans le contenu existant).
const PAYS_CONTINENT = {
  'France':'Europe','Allemagne':'Europe','Italie':'Europe','Espagne':'Europe','Portugal':'Europe',
  'Royaume-Uni':'Europe','Irlande':'Europe','Belgique':'Europe','Pays-Bas':'Europe','Suisse':'Europe',
  'Autriche':'Europe','Grèce':'Europe','Pologne':'Europe','Hongrie':'Europe','République Tchèque':'Europe',
  'Tchéquie':'Europe','Slovaquie':'Europe','Roumanie':'Europe','Bulgarie':'Europe','Croatie':'Europe',
  'Slovénie':'Europe','Bosnie':'Europe','Bosnie-Herzégovine':'Europe','Serbie':'Europe',
  'Macédoine':'Europe','Macédoine du Nord':'Europe','Albanie':'Europe','Monténégro':'Europe','Kosovo':'Europe',
  'Danemark':'Europe','Suède':'Europe','Norvège':'Europe','Finlande':'Europe','Islande':'Europe',
  'Estonie':'Europe','Lettonie':'Europe','Lituanie':'Europe','Biélorussie':'Europe','Ukraine':'Europe',
  'Russie':'Europe','Moldavie':'Europe','Chypre':'Europe','Malte':'Europe','Luxembourg':'Europe',
  'Monaco':'Europe','Saint-Marin':'Europe','Liechtenstein':'Europe','Andorre':'Europe','Cité du Vatican':'Europe',
  'Arabie Saoudite':'Asie','Argentine':'Amerique','Australie':'Oceanie','Bahamas':'Amerique','Bahreïn':'Asie',
  'Bangladesh':'Asie','Barbade':'Amerique','Bhoutan':'Asie','Bolivie':'Amerique','Botswana':'Afrique',
  'Brésil':'Amerique','Cambodge':'Asie','Cameroun':'Afrique','Canada':'Amerique','Cap-Vert':'Afrique',
  'Chili':'Amerique','Chine':'Asie','Colombie':'Amerique','Comores':'Afrique','Corée du Sud':'Asie',
  'Corée du Nord':'Asie','Cuba':'Amerique',"Côte d'Ivoire":'Afrique','Djibouti':'Afrique','Egypte':'Afrique',
  'Égypte':'Afrique','Emirats Arabes Unis':'Asie','Émirats Arabes Unis':'Asie','Equateur':'Amerique','Équateur':'Amerique',
  'Erythrée':'Afrique','Eswatini':'Afrique','Etats-Unis':'Amerique','États-Unis':'Amerique','Ethiopie':'Afrique',
  'Éthiopie':'Afrique','Fidji':'Oceanie','Gabon':'Afrique','Gambie':'Afrique','Ghana':'Afrique',
  'Grenade':'Amerique','Guatemala':'Amerique','Guinée':'Afrique','Guinée-Bissau':'Afrique','Guinée équatoriale':'Afrique',
  'Guyana':'Amerique','Haïti':'Amerique','Honduras':'Amerique','Inde':'Asie','Indonésie':'Asie',
  'Irak':'Asie','Iran':'Asie','Israël':'Asie','Jamaïque':'Amerique','Japon':'Asie',
  'Jordanie':'Asie','Kazakhstan':'Asie','Kenya':'Afrique','Kirghizistan':'Asie','Kiribati':'Oceanie',
  'Koweït':'Asie','Laos':'Asie','Lesotho':'Afrique','Liban':'Asie','Liberia':'Afrique',
  'Libye':'Afrique','Madagascar':'Afrique','Malaisie':'Asie','Malawi':'Afrique','Maldives':'Asie',
  'Mali':'Afrique','Malte2':'Europe','Maroc':'Afrique','Maurice':'Afrique','Mauritanie':'Afrique',
  'Mexique':'Amerique','Micronésie':'Oceanie','Mongolie':'Asie','Mozambique':'Afrique','Myanmar':'Asie',
  'Namibie':'Afrique','Nauru':'Oceanie','Nicaragua':'Amerique','Niger':'Afrique','Nigeria':'Afrique',
  'Nouvelle-Zélande':'Oceanie','Népal':'Asie','Oman':'Asie','Ouganda':'Afrique','Ouzbékistan':'Asie',
  'Pakistan':'Asie','Palaos':'Oceanie','Panama':'Amerique','Papouasie-Nouvelle-Guinée':'Oceanie','Paraguay':'Amerique',
  'Pérou':'Amerique','Philippines':'Asie','Qatar':'Asie','République Dominicaine':'Amerique','Rwanda':'Afrique',
  'Salomon':'Oceanie','Îles Salomon':'Oceanie','Samoa':'Oceanie','Sénégal':'Afrique','Sierra Leone':'Afrique',
  'Singapour':'Asie','Somalie':'Afrique','Soudan':'Afrique','Sri Lanka':'Asie','Syrie':'Asie',
  'Tadjikistan':'Asie','Taïwan':'Asie','Tanzanie':'Afrique','Tchad':'Afrique','Thaïlande':'Asie',
  'Timor oriental':'Asie','Togo':'Afrique','Tonga':'Oceanie','Trinité-et-Tobago':'Amerique','Tunisie':'Afrique',
  'Turkménistan':'Asie','Turquie':'Asie','Tuvalu':'Oceanie','Uruguay':'Amerique','Vanuatu':'Oceanie',
  'Venezuela':'Amerique','Vietnam':'Asie','Yémen':'Asie','Zambie':'Afrique','Zimbabwe':'Afrique',
  'Afghanistan':'Asie','Afrique du Sud':'Afrique','Algérie':'Afrique','Angola':'Afrique','Antigua-et-Barbuda':'Amerique',
  'Arménie':'Asie','Azerbaïdjan':'Asie','Bénin':'Afrique','Burkina Faso':'Afrique','Burundi':'Afrique',
  'Centrafrique':'Afrique','Congo':'Afrique','RD Congo':'Afrique','République Démocratique du Congo':'Afrique',
  'Costa Rica':'Amerique','Dominique':'Amerique','Erevan':'Asie','Gambie2':'Afrique','Géorgie':'Asie',
  'Grenade2':'Amerique','Iles Marshall':'Oceanie','Îles Marshall':'Oceanie','Marshall':'Oceanie',
  'Namibie2':'Afrique','Nauru2':'Oceanie','Sainte-Lucie':'Amerique','Saint-Kitts-et-Nevis':'Amerique',
  'Saint-Vincent-et-les-Grenadines':'Amerique','Salvador':'Amerique','Seychelles':'Afrique','Suriname':'Amerique',
  'Belize':'Amerique','Bosnie2':'Europe','Brunei':'Asie',
};

// Capitale -> continent (pour les manches "drapeau_capitale", ou seule
// la capitale est connue directement, pas le nom du pays).
const CAPITALE_CONTINENT = {
  'Abou Dabi':'Asie','Abuja':'Afrique','Accra':'Afrique','Achgabat':'Asie','Addis-Abeba':'Afrique',
  'Alger':'Afrique','Amman':'Asie','Amsterdam':'Europe',"Andorre-la-Vieille":'Europe','Ankara':'Asie',
  'Antananarivo':'Afrique','Apia':'Oceanie','Asmara':'Afrique','Astana':'Asie','Asuncion':'Amerique',
  'Athènes':'Europe','Bagdad':'Asie','Bakou':'Asie','Bamako':'Afrique','Bandar Seri Begawan':'Asie',
  'Bangkok':'Asie','Bangui':'Afrique','Banjul':'Afrique','Basseterre':'Amerique','Belgrade':'Europe',
  'Belmopan':'Amerique','Berlin':'Europe','Berne':'Europe','Beyrouth':'Asie','Bichkek':'Asie',
  'Bissau':'Afrique','Bogota':'Amerique','Bratislava':'Europe','Brazzaville':'Afrique','Bridgetown':'Amerique',
  'Bruxelles':'Europe','Bucarest':'Europe','Budapest':'Europe','Buenos Aires':'Amerique','Bujumbura':'Afrique',
  'Canberra':'Oceanie','Caracas':'Amerique','Castries':'Amerique','Chisinau':'Europe','Colombo':'Asie',
  'Conakry':'Afrique','Copenhague':'Europe','Dacca':'Asie','Dakar':'Afrique','Damas':'Asie',
  'Dili':'Asie','Dodoma':'Afrique','Doha':'Asie','Douchanbé':'Asie','Dublin':'Europe',
  'Erevan':'Asie','Freetown':'Afrique','Funafuti':'Oceanie','Gaborone':'Afrique','Georgetown':'Amerique',
  'Hanoï':'Asie','Harare':'Afrique','Helsinki':'Europe','Honiara':'Oceanie','Islamabad':'Asie',
  'Jakarta':'Asie','Jérusalem':'Asie','Kaboul':'Asie','Kampala':'Afrique','Katmandou':'Asie',
  'Khartoum':'Afrique','Kiev':'Europe','Kigali':'Afrique','Kingston':'Amerique','Kingstown':'Amerique',
  'Kinshasa':'Afrique','Koweït City':'Asie','Kuala Lumpur':'Asie','La Havane':'Amerique','La Paz':'Amerique',
  'La Valette':'Europe','Le Caire':'Afrique','Libreville':'Afrique','Lilongwe':'Afrique','Lima':'Amerique',
  'Lisbonne':'Europe','Ljubljana':'Europe','Lomé':'Afrique','Londres':'Europe','Luanda':'Afrique',
  'Lusaka':'Afrique','Madrid':'Europe','Majuro':'Oceanie','Malabo':'Afrique','Malé':'Asie',
  'Managua':'Amerique','Manama':'Asie','Manille':'Asie','Maputo':'Afrique','Mascate':'Asie',
  'Maseru':'Afrique','Mbabane':'Afrique','Mexico':'Amerique','Minsk':'Europe','Mogadiscio':'Afrique',
  'Monrovia':'Afrique','Montevideo':'Amerique','Moroni':'Afrique','Moscou':'Europe',"N'Djamena":'Afrique',
  'Nairobi':'Afrique','Nassau':'Amerique','Naypyidaw':'Asie','New Delhi':'Asie','Ngerulmud':'Oceanie',
  'Niamey':'Afrique','Nicosie':'Europe','Nouakchott':'Afrique',"Nuku'alofa":'Oceanie','Oslo':'Europe',
  'Ottawa':'Amerique','Ouagadougou':'Afrique','Oulan-Bator':'Asie','Palikir':'Oceanie','Paris':'Europe',
  'Phnom Penh':'Asie','Port Moresby':'Oceanie','Port-Louis':'Afrique','Port-Vila':'Oceanie','Port-au-Prince':'Amerique',
  "Port-d'Espagne":'Amerique','Porto-Novo':'Afrique','Prague':'Europe','Praia':'Afrique','Pékin':'Asie',
  'Quito':'Amerique','Rabat':'Afrique','Reykjavik':'Europe','Riga':'Europe','Riyad':'Asie',
  'Rome':'Europe','Roseau':'Amerique',"Saint John's":'Amerique','Saint-Domingue':'Amerique','Saint-Georges':'Amerique',
  'San José':'Amerique','San Salvador':'Amerique','Sanaa':'Asie','Santiago':'Amerique','Sarajevo':'Europe',
  'Séoul':'Asie','Singapour':'Asie','Skopje':'Europe','Sofia':'Europe','Stockholm':'Europe',
  'Sucre':'Amerique','Suva':'Oceanie','Tachkent':'Asie','Taipei':'Asie','Tallinn':'Europe',
  'Tarawa':'Oceanie','Tbilissi':'Asie','Tegucigalpa':'Amerique','Thimphou':'Asie','Tirana':'Europe',
  'Tokyo':'Asie','Tripoli':'Afrique','Tunis':'Afrique','Téhéran':'Asie','Vaduz':'Europe',
  'Varsovie':'Europe','Victoria':'Afrique','Vienne':'Europe','Vientiane':'Asie','Vilnius':'Europe',
  'Washington':'Amerique','Wellington':'Oceanie','Windhoek':'Afrique','Yamoussoukro':'Afrique','Yaoundé':'Afrique',
  'Yaren':'Oceanie','Zagreb':'Europe',
};

function trouverContinent(donnees) {
  const { etape, pays, reponse, drapeau } = donnees;
  if (etape === 'pays_capitale' || etape === 'langue_pays') {
    return PAYS_CONTINENT[pays] ?? null;
  }
  if (etape === 'drapeau_capitale') {
    return CAPITALE_CONTINENT[reponse] ?? null;
  }
  // drapeau_pays, animal_pays, monument_pays : reponse = nom du pays
  return PAYS_CONTINENT[reponse] ?? null;
}

async function main() {
  const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'monde_capitales').maybeSingle();
  const { data, error } = await supabase
    .from('contenu_mini_jeu')
    .select('id, donnees')
    .eq('mini_jeu_id', jeu.id)
    .eq('actif', true);

  if (error) {
    fs.writeFileSync(path.join(__dirname, 'fix-continents-result.json'), JSON.stringify({ error: error.message }, null, 2));
    return;
  }

  const aCorrger = data.filter((row) => !row.donnees?.continent);
  let succes = 0;
  const echecs = [];

  for (const row of aCorrger) {
    const continent = trouverContinent(row.donnees);
    if (!continent) {
      echecs.push({ id: row.id, donnees: row.donnees });
      continue;
    }
    const { error: errUpdate } = await supabase
      .from('contenu_mini_jeu')
      .update({ donnees: { ...row.donnees, continent } })
      .eq('id', row.id);
    if (errUpdate) {
      echecs.push({ id: row.id, erreur: errUpdate.message });
    } else {
      succes += 1;
    }
  }

  fs.writeFileSync(path.join(__dirname, 'fix-continents-result.json'), JSON.stringify({
    total: aCorrger.length, succes, echecsCount: echecs.length, echecs: echecs.slice(0, 30),
  }, null, 2));
  console.log(`${succes}/${aCorrger.length} corrigees, ${echecs.length} echecs`);
}

main();
