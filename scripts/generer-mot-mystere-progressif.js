// Genere des grilles de Mot Mystere VARIEES pour chaque (niveau, palier)
// des 24 crans de progression, avec une taille de grille qui augmente
// progressivement tous les 2 crans (au lieu des 3 tailles fixes
// actuelles, recyclees a l'identique sur toute une tranche d'age).
// Remplace aussi le trou total sur "6e" (aucun contenu existant).
const fs = require('fs');
const path = require('path');

const GRADE_ORDER = ['ms', 'gs', 'cp', 'ce1', 'ce2', 'cm1', 'cm2', '6e'];

function gradeAndPalierFromRung(rung) {
  const idx = Math.floor((rung - 1) / 3);
  const palier = ((rung - 1) % 3) + 1;
  return { niveau: GRADE_ORDER[Math.min(idx, GRADE_ORDER.length - 1)], palier };
}

// Taille de grille : +1 tous les 2 crans, plafonnee a 16 (rung 17 a 24).
function tailleForRung(rung) {
  return Math.min(16, 8 + Math.floor((rung - 1) / 2));
}

const BANQUE = [
  // theme, [mots...]
  ['corps', ['OEIL', 'NEZ', 'BRAS', 'MAIN', 'PIED', 'DOS', 'BOUCHE', 'VENTRE', 'GENOU', 'COUDE', 'EPAULE', 'VISAGE', 'CHEVEUX', 'SOURCIL', 'POIGNET', 'MENTON', 'NUQUE', 'MOLLET', 'ORTEIL', 'PAUPIERE']],
  ['animaux', ['CHAT', 'CHIEN', 'LAPIN', 'OURS', 'LOUP', 'RENARD', 'CANARD', 'MOUTON', 'CHEVAL', 'COCHON', 'SOURIS', 'TIGRE', 'LION', 'SINGE', 'ZEBRE', 'GIRAFE', 'ELEPHANT', 'DAUPHIN', 'BALEINE', 'PANTHERE', 'CROCODILE', 'KANGOUROU', 'HIPPOPOTAME', 'ECUREUIL', 'HERISSON']],
  ['maison', ['LAMPE', 'PORTE', 'TOIT', 'MUR', 'LIT', 'TABLE', 'CHAISE', 'FENETRE', 'CUISINE', 'JARDIN', 'ESCALIER', 'GRENIER', 'BALCON', 'PLAFOND', 'TAPIS', 'RIDEAU', 'ARMOIRE', 'CANAPE', 'COULOIR', 'CHEMINEE']],
  ['vehicules', ['BUS', 'VELO', 'MOTO', 'CAMION', 'BATEAU', 'AVION', 'TRAIN', 'METRO', 'VOITURE', 'FUSEE', 'TRACTEUR', 'HELICOPTERE', 'CARAVANE', 'REMORQUE', 'BROUETTE']],
  ['couleurs', ['GRIS', 'ROSE', 'BLEU', 'VERT', 'NOIR', 'BLANC', 'ROUGE', 'JAUNE', 'VIOLET', 'ORANGE', 'MARRON', 'TURQUOISE', 'INDIGO', 'BEIGE', 'MAUVE']],
  ['nature', ['LAC', 'MER', 'BOIS', 'FORET', 'RIVIERE', 'MONTAGNE', 'VOLCAN', 'GLACIER', 'FALAISE', 'PRAIRIE', 'DESERT', 'CASCADE', 'VALLEE', 'COLLINE', 'MARAIS', 'DUNE', 'GROTTE', 'ROCHER', 'SOURCE', 'TORRENT']],
  ['sport', ['JUDO', 'VELO', 'TENNIS', 'BASKET', 'RUGBY', 'NATATION', 'ESCALADE', 'CYCLISME', 'FOOTBALL', 'ATHLETISME', 'GYMNASTIQUE', 'EQUITATION', 'PETANQUE', 'AVIRON', 'BOXE']],
  ['espace', ['LUNE', 'ETOILE', 'FUSEE', 'COMETE', 'GALAXIE', 'PLANETE', 'UNIVERS', 'SATELLITE', 'ASTRONAUTE', 'METEORITE', 'TELESCOPE', 'NEBULEUSE', 'CONSTELLATION']],
  ['ecole', ['LIVRE', 'STYLO', 'REGLE', 'GOMME', 'CAHIER', 'CRAYON', 'TABLEAU', 'CARTABLE', 'TROUSSE', 'CANTINE', 'RECREATION', 'BIBLIOTHEQUE', 'MAITRESSE', 'DIRECTEUR']],
  ['nourriture', ['PAIN', 'LAIT', 'OEUF', 'POMME', 'PIZZA', 'FROMAGE', 'GATEAU', 'YAOURT', 'LEGUME', 'POISSON', 'SANDWICH', 'CHOCOLAT', 'BANANE', 'ORANGE', 'CAROTTE', 'TOMATE', 'CERISE']],
  ['metiers', ['CHEF', 'ACTEUR', 'FACTEUR', 'POMPIER', 'DENTISTE', 'BOULANGER', 'INFIRMIER', 'VETERINAIRE', 'AGRICULTEUR', 'MENUISIER', 'PLOMBIER', 'ELECTRICIEN']],
  ['musique', ['FLUTE', 'PIANO', 'VIOLON', 'GUITARE', 'TROMPETTE', 'BATTERIE', 'CLARINETTE', 'SAXOPHONE', 'ACCORDEON']],
  ['meteo', ['PLUIE', 'VENT', 'NEIGE', 'SOLEIL', 'NUAGE', 'ORAGE', 'BROUILLARD', 'TEMPETE', 'GRELE', 'ECLAIR']],
];

const TOUS_LES_MOTS = BANQUE.flatMap(([theme, mots]) => mots.map((mot) => ({ mot, theme })));

const DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1],
];

function randInt(n) { return Math.floor(Math.random() * n); }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// Essaie de placer un mot dans la grille (null si aucune position libre
// trouvee apres plusieurs essais).
function placerMot(grille, taille, mot) {
  const tentatives = 60;
  for (let t = 0; t < tentatives; t++) {
    const [dr, dc] = DIRECTIONS[randInt(DIRECTIONS.length)];
    const longueur = mot.length;
    const rMin = dr < 0 ? longueur - 1 : 0;
    const rMax = dr > 0 ? taille - longueur : taille - 1;
    const cMin = dc < 0 ? longueur - 1 : 0;
    const cMax = dc > 0 ? taille - longueur : taille - 1;
    if (rMin > rMax || cMin > cMax) continue;
    const r0 = rMin + randInt(rMax - rMin + 1);
    const c0 = cMin + randInt(cMax - cMin + 1);
    const positions = [];
    let ok = true;
    for (let i = 0; i < longueur; i++) {
      const r = r0 + dr * i;
      const c = c0 + dc * i;
      const existant = grille[r][c];
      if (existant !== null && existant !== mot[i]) { ok = false; break; }
      positions.push([r, c]);
    }
    if (!ok) continue;
    positions.forEach(([r, c], i) => { grille[r][c] = mot[i]; });
    return positions;
  }
  return null;
}

// Reserve une colonne pour le mot bonus (vertical, avec 1 case de marge
// en haut et en bas), meme convention que le contenu existant.
function placerBonus(grille, taille, mot) {
  const longueur = mot.length;
  if (longueur > taille - 2) return null;
  const colonnes = shuffle(Array.from({ length: taille }, (_, i) => i));
  for (const c of colonnes) {
    const rStart = 1 + randInt(taille - longueur - 1);
    let ok = true;
    for (let i = 0; i < longueur; i++) {
      if (grille[rStart + i][c] !== null) { ok = false; break; }
    }
    if (!ok) continue;
    const positions = [];
    for (let i = 0; i < longueur; i++) {
      grille[rStart + i][c] = mot[i];
      positions.push([rStart + i, c]);
    }
    return positions;
  }
  return null;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function genererGrille(taille, minLongueur, maxLongueur, nbMots) {
  for (let essaiGlobal = 0; essaiGlobal < 15; essaiGlobal++) {
    const grille = Array.from({ length: taille }, () => Array(taille).fill(null));
    const themeChoisi = BANQUE[randInt(BANQUE.length)][0];
    const poolTheme = TOUS_LES_MOTS.filter((m) => m.theme === themeChoisi && m.mot.length >= minLongueur && m.mot.length <= maxLongueur);
    const poolGeneral = TOUS_LES_MOTS.filter((m) => m.mot.length >= minLongueur && m.mot.length <= maxLongueur);
    const pool = poolTheme.length >= nbMots + 1 ? poolTheme : poolGeneral;
    const motsDisponibles = shuffle(pool);
    if (motsDisponibles.length < nbMots + 1) continue;

    const motBonusCandidat = motsDisponibles.find((m) => m.mot.length <= taille - 2) ?? motsDisponibles[0];
    const cellulesBonus = placerBonus(grille, taille, motBonusCandidat.mot);
    if (!cellulesBonus) continue;

    const motsPlaces = [];
    for (const candidat of motsDisponibles) {
      if (motsPlaces.length >= nbMots) break;
      if (candidat.mot === motBonusCandidat.mot) continue;
      const positions = placerMot(grille, taille, candidat.mot);
      if (positions) motsPlaces.push({ mot: candidat.mot, positions });
    }
    if (motsPlaces.length < Math.max(3, nbMots - 1)) continue;

    for (let r = 0; r < taille; r++) {
      for (let c = 0; c < taille; c++) {
        if (grille[r][c] === null) grille[r][c] = ALPHABET[randInt(ALPHABET.length)];
      }
    }

    return {
      grille: grille.map((row) => row.join('')),
      mots: motsPlaces,
      motBonus: motBonusCandidat.mot,
      cellulesBonus,
      theme: themeChoisi,
    };
  }
  return null;
}

function main() {
  const lignes = [];
  const GRILLES_PAR_NIVEAU = 15;

  for (let rung = 1; rung <= 24; rung++) {
    const { niveau, palier } = gradeAndPalierFromRung(rung);
    const taille = tailleForRung(rung);
    // La difficulte du vocabulaire suit aussi le rung, pas seulement la
    // taille : mots plus longs/complexes en avancant.
    const minLongueur = 3;
    const maxLongueur = Math.min(taille - 2, 4 + Math.floor((rung - 1) * 0.55));
    const nbMots = taille <= 9 ? 4 : taille <= 13 ? 5 : 6;

    let genere = 0;
    let essais = 0;
    while (genere < GRILLES_PAR_NIVEAU && essais < GRILLES_PAR_NIVEAU * 4) {
      essais += 1;
      const g = genererGrille(taille, minLongueur, maxLongueur, nbMots);
      if (g) {
        lignes.push({ niveau, palier, donnees: g, actif: true });
        genere += 1;
      }
    }
    console.log(`rung ${rung} (${niveau} palier ${palier}, taille ${taille}) : ${genere}/${GRILLES_PAR_NIVEAU} grilles`);
  }

  fs.writeFileSync(path.join(__dirname, 'mot-mystere-progressif.json'), JSON.stringify(lignes));
  console.log(`Total : ${lignes.length} grilles generees`);
}

main();
