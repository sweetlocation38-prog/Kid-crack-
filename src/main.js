import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Speech from 'expo-speech';
import * as LocalAuthentication from 'expo-local-authentication';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ============================================================
// Connexion Supabase
// ============================================================
const SUPABASE_URL = 'https://ljswlkrhsufxbmxwwsol.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IlVBCZOtS3Qa2wMVa6Eu7Q_lNBiE7ps';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================================
// Thème
// ============================================================
const colors = {
  cream: '#FFF8E7',
  mossDeep: '#2F4A2C',
  mossSoft: '#7FA36B',
  sand: '#FFE1A8',
  ink: '#3A3226',
  gold: '#F5A623',
  blue: '#1E96D6',
  success: '#3FAE6B',
  error: '#E85D5D',
};

// Petite variété de couleurs pour les pierres, pour que ce soit plus vivant
// qu'une seule teinte uniforme.
const STONE_COLORS = ['#FFE1A8', '#B8E0D2', '#FFD3D3', '#D4E4FF', '#FCE8B4'];

// Couleurs vives pour l'univers (bannières, bulles de dialogue)
const VIVID = {
  orange: '#FF8A3D',
  orangeDark: '#E8792B',
  sky: '#4FC3E8',
  yellow: '#FFC93D',
  pink: '#FF7EB3',
  cream: '#FFF6EA',
};

// ============================================================
// Personnages de La Forêt des Murmures — construits avec des formes
// (pas d'illustrations disponibles, donc du "flat design" en Views)
// ============================================================
function Critter({ size = 90, bodyColor, faceColor, earType = 'triangle', earColor, showBeak, beakColor }) {
  const s = size;
  const earPiece = (side) => {
    if (earType === 'round') {
      return (
        <View
          style={{
            position: 'absolute', top: -s * 0.06, [side]: s * 0.02,
            width: s * 0.26, height: s * 0.3, borderRadius: s * 0.15, backgroundColor: earColor,
          }}
        />
      );
    }
    if (earType === 'long') {
      return (
        <View
          style={{
            position: 'absolute', top: -s * 0.34, [side]: s * 0.14,
            width: s * 0.15, height: s * 0.42, borderRadius: s * 0.08, backgroundColor: earColor,
          }}
        />
      );
    }
    return (
      <View
        style={{
          position: 'absolute', top: -s * 0.02, [side]: s * 0.06, width: 0, height: 0,
          borderLeftWidth: s * 0.14, borderRightWidth: s * 0.14, borderBottomWidth: s * 0.24,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: earColor,
        }}
      />
    );
  };

  return (
    <View style={{ width: s, height: s * 1.15, alignItems: 'center' }}>
      <View style={{ width: s, height: s * 0.9, alignItems: 'center' }}>
        {earPiece('left')}
        {earPiece('right')}
        <View
          style={{
            width: s * 0.82, height: s * 0.74, borderRadius: s * 0.4,
            backgroundColor: bodyColor, marginTop: s * 0.16,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', gap: s * 0.14, marginBottom: s * 0.06 }}>
            <View style={{ width: s * 0.17, height: s * 0.17, borderRadius: s * 0.09, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: s * 0.07, height: s * 0.07, borderRadius: s * 0.04, backgroundColor: '#2F2A22' }} />
            </View>
            <View style={{ width: s * 0.17, height: s * 0.17, borderRadius: s * 0.09, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: s * 0.07, height: s * 0.07, borderRadius: s * 0.04, backgroundColor: '#2F2A22' }} />
            </View>
          </View>
          {showBeak ? (
            <View
              style={{
                width: 0, height: 0, borderLeftWidth: s * 0.05, borderRightWidth: s * 0.05, borderTopWidth: s * 0.07,
                borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: beakColor,
              }}
            />
          ) : (
            <View style={{ width: s * 0.34, height: s * 0.24, borderRadius: s * 0.14, backgroundColor: faceColor }} />
          )}
        </View>
      </View>
    </View>
  );
}

function Noisette({ size }) {
  return <Critter size={size} bodyColor={VIVID.orangeDark} faceColor={VIVID.cream} earType="triangle" earColor={VIVID.orangeDark} />;
}
function Maestro({ size }) {
  return <Critter size={size} bodyColor="#8B6F47" faceColor={VIVID.yellow} earType="round" earColor="#8B6F47" showBeak beakColor={VIVID.yellow} />;
}
function Luma({ size }) {
  return <Critter size={size} bodyColor="#F3E1C4" faceColor="#fff" earType="long" earColor="#F3E1C4" />;
}

function SpeechBubble({ text }) {
  return (
    <View style={styles.speechBubble}>
      <Text style={styles.speechBubbleText}>{text}</Text>
      <View style={styles.speechBubbleTail} />
    </View>
  );
}

function mapTipFor(profil) {
  const niveau = profil.niveau_global ?? 0;
  if (niveau === 0) return "Prêt pour ta première aventure ?";
  if (niveau < 10) return "Continue comme ça, tu progresses bien !";
  if (niveau < 50) return "Noisette est fier de toi !";
  if (niveau < 200) return "Quelle belle progression dans la forêt !";
  return "Tu es un vrai champion de la forêt !";
}


function CharacterRow({ Character, size, text, bounce }) {
  return (
    <View style={styles.characterRow}>
      {bounce ? (
        <View style={{ width: size, height: size * 1.15 }}>
          <BouncingWrap size={size}><Character size={size} /></BouncingWrap>
        </View>
      ) : (
        <Character size={size} />
      )}
      {text ? <SpeechBubble text={text} /> : null}
    </View>
  );
}


// ============================================================
// Chaine d'avatar de jeu (100 echelons, un tous les 10 niveaux)
// ============================================================
const AVATAR_CHAIN = [
  { code: 'fourmi', name: 'Fourmi', emoji: '🐜' },
  { code: 'coccinelle', name: 'Coccinelle', emoji: '🐞' },
  { code: 'papillon', name: 'Papillon', emoji: '🦋' },
  { code: 'abeille', name: 'Abeille', emoji: '🐝' },
  { code: 'escargot', name: 'Escargot', emoji: '🐌' },
  { code: 'ver_luisant', name: 'Ver luisant', emoji: '🐛' },
  { code: 'sauterelle', name: 'Sauterelle', emoji: '🦗' },
  { code: 'libellule', name: 'Libellule', emoji: '🪰' },
  { code: 'scarabee', name: 'Scarabee', emoji: '🪲' },
  { code: 'grillon', name: 'Grillon', emoji: '🦗' },
  { code: 'souris', name: 'Souris', emoji: '🐭' },
  { code: 'mulot', name: 'Mulot', emoji: '🐭' },
  { code: 'musaraigne', name: 'Musaraigne', emoji: '🐁' },
  { code: 'grenouille', name: 'Grenouille', emoji: '🐸' },
  { code: 'crapaud', name: 'Crapaud', emoji: '🐸' },
  { code: 'lezard', name: 'Lezard', emoji: '🦎' },
  { code: 'tetard', name: 'Tetard', emoji: '🐸' },
  { code: 'campagnol', name: 'Campagnol', emoji: '🐹' },
  { code: 'chenille', name: 'Chenille', emoji: '🐛' },
  { code: 'criquet', name: 'Criquet', emoji: '🦗' },
  { code: 'herisson', name: 'Herisson', emoji: '🦔' },
  { code: 'taupe', name: 'Taupe', emoji: '🐹' },
  { code: 'ecureuil', name: 'Ecureuil', emoji: '🐿️' },
  { code: 'tamia', name: 'Tamia', emoji: '🐿️' },
  { code: 'chauve_souris', name: 'Chauve-souris', emoji: '🦇' },
  { code: 'belette', name: 'Belette', emoji: '🦡' },
  { code: 'furet', name: 'Furet', emoji: '🦡' },
  { code: 'putois', name: 'Putois', emoji: '🦡' },
  { code: 'rat_des_champs', name: 'Rat des champs', emoji: '🐀' },
  { code: 'loir', name: 'Loir', emoji: '🐭' },
  { code: 'geai', name: 'Geai', emoji: '🐦' },
  { code: 'pie', name: 'Pie', emoji: '🐦\u200d⬛' },
  { code: 'corbeau', name: 'Corbeau', emoji: '🐦\u200d⬛' },
  { code: 'faucon_crecerelle', name: 'Faucon crecerelle', emoji: '🦅' },
  { code: 'chouette', name: 'Chouette', emoji: '🦉' },
  { code: 'heron', name: 'Heron', emoji: '🦩' },
  { code: 'cigogne', name: 'Cigogne', emoji: '🦢' },
  { code: 'pelican', name: 'Pelican', emoji: '🐦' },
  { code: 'perruche', name: 'Perruche', emoji: '🦜' },
  { code: 'toucan', name: 'Toucan', emoji: '🦜' },
  { code: 'martre', name: 'Martre', emoji: '🦡' },
  { code: 'fouine', name: 'Fouine', emoji: '🦡' },
  { code: 'mangouste', name: 'Mangouste', emoji: '🦡' },
  { code: 'suricate', name: 'Suricate', emoji: '🦫' },
  { code: 'blaireau', name: 'Blaireau', emoji: '🦡' },
  { code: 'genette', name: 'Genette', emoji: '🐆' },
  { code: 'chacal', name: 'Chacal', emoji: '🐺' },
  { code: 'ragondin', name: 'Ragondin', emoji: '🦫' },
  { code: 'loutre', name: 'Loutre', emoji: '🦦' },
  { code: 'ocelot', name: 'Ocelot', emoji: '🐆' },
  { code: 'gazelle', name: 'Gazelle', emoji: '🦌' },
  { code: 'impala', name: 'Impala', emoji: '🦌' },
  { code: 'antilope', name: 'Antilope', emoji: '🦌' },
  { code: 'springbok', name: 'Springbok', emoji: '🦌' },
  { code: 'zebre', name: 'Zebre', emoji: '🦓' },
  { code: 'gnou', name: 'Gnou', emoji: '🐃' },
  { code: 'autruche', name: 'Autruche', emoji: '🦩' },
  { code: 'phacochere', name: 'Phacochere', emoji: '🐗' },
  { code: 'sanglier', name: 'Sanglier', emoji: '🐗' },
  { code: 'chevre_de_montagne', name: 'Chevre de montagne', emoji: '🐐' },
  { code: 'lievre', name: 'Lievre', emoji: '🐇' },
  { code: 'renard_des_neiges', name: 'Renard des neiges', emoji: '🦊' },
  { code: 'coyote', name: 'Coyote', emoji: '🐺' },
  { code: 'lynx', name: 'Lynx', emoji: '🐈' },
  { code: 'caracal', name: 'Caracal', emoji: '🐈' },
  { code: 'chat_sauvage', name: 'Chat sauvage', emoji: '🐈\u200d⬛' },
  { code: 'guepard', name: 'Guepard', emoji: '🐆' },
  { code: 'loup', name: 'Loup', emoji: '🐺' },
  { code: 'puma', name: 'Puma', emoji: '🐆' },
  { code: 'panthere', name: 'Panthere', emoji: '🐆' },
  { code: 'cerf', name: 'Cerf', emoji: '🦌' },
  { code: 'elan', name: 'Elan', emoji: '🦌' },
  { code: 'wapiti', name: 'Wapiti', emoji: '🦌' },
  { code: 'bison', name: 'Bison', emoji: '🦬' },
  { code: 'buffle_d_afrique', name: 'Buffle d\'Afrique', emoji: '🐃' },
  { code: 'hippopotame', name: 'Hippopotame', emoji: '🦛' },
  { code: 'chameau', name: 'Chameau', emoji: '🐫' },
  { code: 'yack', name: 'Yack', emoji: '🐂' },
  { code: 'girafe', name: 'Girafe', emoji: '🦒' },
  { code: 'rhinoceros_noir', name: 'Rhinoceros noir', emoji: '🦏' },
  { code: 'ours_brun', name: 'Ours brun', emoji: '🐻' },
  { code: 'ours_noir', name: 'Ours noir', emoji: '🐻' },
  { code: 'gorille', name: 'Gorille', emoji: '🦍' },
  { code: 'chimpanze', name: 'Chimpanze', emoji: '🐒' },
  { code: 'jaguar', name: 'Jaguar', emoji: '🐆' },
  { code: 'leopard', name: 'Leopard', emoji: '🐆' },
  { code: 'tigre_du_bengale', name: 'Tigre du Bengale', emoji: '🐅' },
  { code: 'crocodile_du_nil', name: 'Crocodile du Nil', emoji: '🐊' },
  { code: 'python', name: 'Python', emoji: '🐍' },
  { code: 'aigle_royal', name: 'Aigle royal', emoji: '🦅' },
  { code: 'ours_polaire', name: 'Ours polaire', emoji: '🐻\u200d❄️' },
  { code: 'rhinoceros_blanc', name: 'Rhinoceros blanc', emoji: '🦏' },
  { code: 'gorille_des_montagnes', name: 'Gorille des montagnes', emoji: '🦍' },
  { code: 'elephant_de_foret', name: 'Elephant de foret', emoji: '🐘' },
  { code: 'elephant_de_savane', name: 'Elephant de savane', emoji: '🐘' },
  { code: 'panthere_des_neiges', name: 'Panthere des neiges', emoji: '🐆' },
  { code: 'tigre_de_siberie', name: 'Tigre de Siberie', emoji: '🐅' },
  { code: 'grizzly_geant', name: 'Grizzly geant', emoji: '🐻' },
  { code: 'lionne', name: 'Lionne', emoji: '🦁' },
  { code: 'lion', name: 'Lion', emoji: '🦁' },
];

function avatarRankFor(niveauGlobal) {
  return Math.min(100, Math.max(1, Math.floor((niveauGlobal ?? 0) / 10) + 1));
}

function avatarLabelFor(niveauGlobal) {
  const a = AVATAR_CHAIN[avatarRankFor(niveauGlobal) - 1];
  return a.emoji + ' ' + a.name;
}

// ============================================================
// Fin de session partagee entre tous les mini-jeux :
// enregistre la progression, avance le niveau global, verifie
// un changement d'echelon d'avatar et une recompense parentale.
// ============================================================
// ============================================================
// Controle parental : reglages et verification du temps de jeu
// ============================================================
async function getParametresParentaux(familleId) {
  const { data } = await supabase
    .from('parametres_parentaux')
    .select('*')
    .eq('famille_id', familleId)
    .maybeSingle();
  if (data) return data;

  const { data: created } = await supabase
    .from('parametres_parentaux')
    .insert({ famille_id: familleId })
    .select('*')
    .single();
  return created;
}

async function getTodayPlaySeconds(profilId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('sessions_jeu')
    .select('duree_secondes')
    .eq('profil_id', profilId)
    .gte('debut', startOfDay.toISOString());

  return (data ?? []).reduce((sum, row) => sum + (row.duree_secondes ?? 0), 0);
}

// Charge le budget de temps du jour pour un profil : temps deja joue + limite reglee.
function useTimeBudget(profil, reloadKey) {
  const [totalAllowed, setTotalAllowed] = useState(null);
  const [baseRemaining, setBaseRemaining] = useState(null);
  const [expectedPin, setExpectedPin] = useState(null);

  useEffect(() => {
    (async () => {
      const [parametres, seconds] = await Promise.all([
        getParametresParentaux(profil.famille_id),
        getTodayPlaySeconds(profil.id),
      ]);
      const total = (parametres?.minutes_max_jour ?? 30) * 60;
      setTotalAllowed(total);
      setBaseRemaining(Math.max(0, total - seconds));
      setExpectedPin(parametres?.code_validation ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.famille_id, profil.id, reloadKey]);

  return { totalAllowed, baseRemaining, expectedPin };
}

// Fait defiler un compte a rebours en direct, seconde par seconde, a partir d'une base.
function useLiveCountdown(baseSeconds) {
  const [seconds, setSeconds] = useState(baseSeconds ?? 0);

  useEffect(() => {
    setSeconds(baseSeconds ?? 0);
  }, [baseSeconds]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return seconds;
}

function formatMinutesSeconds(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds ?? 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Degrade continu vert -> orange -> rouge selon la proportion de temps restant.
function gaugeColorFor(ratio) {
  const green = [63, 174, 107]; // colors.success
  const yellow = [245, 166, 35]; // colors.gold
  const red = [232, 93, 93]; // colors.error

  let from = green;
  let to = yellow;
  let localRatio = 1;
  if (ratio <= 0.5) {
    from = yellow;
    to = red;
    localRatio = ratio / 0.5;
  } else {
    localRatio = (ratio - 0.5) / 0.5;
  }

  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const [r, g, b] = [
    mix(from[0], to[0], 1 - localRatio),
    mix(from[1], to[1], 1 - localRatio),
    mix(from[2], to[2], 1 - localRatio),
  ];
  return `rgb(${r}, ${g}, ${b})`;
}

function TimeGaugeBar({ remainingSeconds, totalSeconds }) {
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;
  return (
    <View style={styles.liveGaugeBox}>
      <View style={styles.gaugeTrack}>
        <View
          style={[
            styles.gaugeFill,
            { width: `${ratio * 100}%`, backgroundColor: gaugeColorFor(ratio) },
          ]}
        />
      </View>
      <Text style={styles.liveGaugeText}>⏳ {formatMinutesSeconds(remainingSeconds)}</Text>
    </View>
  );
}

async function computeNextRung({ profil, miniJeuId, currentRung, erreursTotal }) {
  const { data: existing } = await supabase
    .from('progression')
    .select('details')
    .eq('profil_id', profil.id)
    .eq('mini_jeu_id', miniJeuId)
    .maybeSingle();

  const oldStreak = existing?.details?.streak ?? 0;
  let newStreak = 0;
  let newRung = currentRung;

  if (erreursTotal === 0) {
    // Session parfaite : la remontee s'accelere a chaque reussite consecutive.
    newStreak = oldStreak + 1;
    const jump = Math.min(3, newStreak);
    newRung = Math.min(MAX_CONTENT_RUNG, currentRung + jump);
  } else if (erreursTotal >= 3) {
    // Vraie difficulte rencontree : on redescend et on remet le compteur a zero.
    newStreak = 0;
    newRung = Math.max(1, currentRung - 1);
  } else {
    // Quelques erreurs, sans plus : on reste sur place, sans casser un futur enchainement.
    newStreak = 0;
    newRung = currentRung;
  }

  const direction = newRung > currentRung ? 'up' : newRung < currentRung ? 'down' : 'same';
  return { newRung, newStreak, rungChanged: newRung !== currentRung, direction };
}

async function completeSession({ profil, miniJeuId, currentRung, erreursTotal, dureeSecondes, totalRounds, startedAt }) {
  const { newRung, newStreak, rungChanged } = await computeNextRung({
    profil, miniJeuId, currentRung, erreursTotal,
  });

  await supabase
    .from('progression')
    .upsert(
      { profil_id: profil.id, mini_jeu_id: miniJeuId, palier_actuel: newRung, details: { streak: newStreak } },
      { onConflict: 'profil_id,mini_jeu_id' }
    );

  await supabase.from('sessions_jeu').insert({
    profil_id: profil.id,
    mini_jeu_id: miniJeuId,
    debut: new Date(startedAt).toISOString(),
    duree_secondes: dureeSecondes,
    manches_jouees: totalRounds,
    erreurs_total: erreursTotal,
  });

  await supabase.from('jours_actifs').insert({
    profil_id: profil.id,
    date: new Date().toISOString().slice(0, 10),
  });

  const { data: profilRow } = await supabase
    .from('profils_enfants')
    .select('niveau_global')
    .eq('id', profil.id)
    .single();

  const previousNiveau = profilRow?.niveau_global ?? 0;
  const newNiveau = previousNiveau + 1;
  const previousRank = avatarRankFor(previousNiveau);
  const newRank = avatarRankFor(newNiveau);

  await supabase
    .from('profils_enfants')
    .update({ niveau_global: newNiveau })
    .eq('id', profil.id);

  let reward = null;
  const { data: rewardRow } = await supabase
    .from('recompenses_parentales')
    .select('*')
    .eq('profil_id', profil.id)
    .eq('niveau_declencheur', newNiveau)
    .eq('statut', 'a_faire')
    .maybeSingle();

  if (rewardRow) {
    reward = rewardRow;
    await supabase
      .from('recompenses_parentales')
      .update({ statut: 'fait' })
      .eq('id', rewardRow.id);
  }

  let ficheAnimal = null;
  const rankChanged = newRank !== previousRank;
  if (rankChanged) {
    const code = AVATAR_CHAIN[newRank - 1].code;
    const { data: fiche } = await supabase
      .from('fiches_animaux')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    ficheAnimal = fiche ?? null;
  }

  return {
    newNiveau,
    rankChanged,
    newRank,
    reward,
    ficheAnimal,
    newRung,
    rungChanged,
    direction,
  };
}

// ============================================================
// Echelle continue de difficulte : fusionne niveau scolaire + palier
// en une seule suite de "crans", pour pouvoir depasser librement le
// niveau scolaire assigne si l'enfant reussit tres bien.
// ============================================================
const GRADE_ORDER = ['ms', 'gs', 'cp', 'ce1', 'ce2', 'cm1', 'cm2', '6e'];

// A augmenter au fur et a mesure qu'on ajoute du contenu pour les niveaux
// superieurs. Pour l'instant, seul MS/GS/CP existe (3 niveaux x 3 paliers = 9).
const MAX_CONTENT_RUNG = 12;

function rungFromGradeAndPalier(niveau, palier) {
  const idx = Math.max(0, GRADE_ORDER.indexOf(niveau));
  return idx * 3 + palier;
}

function gradeAndPalierFromRung(rung) {
  const clamped = Math.max(1, Math.min(rung, MAX_CONTENT_RUNG));
  const idx = Math.floor((clamped - 1) / 3);
  const palier = ((clamped - 1) % 3) + 1;
  return { niveau: GRADE_ORDER[Math.min(idx, GRADE_ORDER.length - 1)], palier };
}

function rungLabel(rung) {
  const { niveau, palier } = gradeAndPalierFromRung(rung);
  const label = NIVEAU_LABELS[niveau] ?? niveau.toUpperCase();
  return `${label} · palier ${palier}`;
}

const NIVEAU_LABELS = {
  ms: 'Moyenne Section',
  gs: 'Grande Section',
  cp: 'CP',
  ce1: 'CE1',
  ce2: 'CE2',
  cm1: 'CM1',
  cm2: 'CM2',
  '6e': '6e',
};

const NIVEAU_CHOICES = [
  { value: 'ms', label: 'Moyenne Section' },
  { value: 'gs', label: 'Grande Section' },
  { value: 'cp', label: 'CP' },
];

const AVATAR_CHOICES = ['🦓', '🐼', '🦒', '🐨', '🐯', '🐘', '🦔', '🦋', '🦜', '🐻', '🦘', '🐢'];

// ============================================================
// Écran : Auth (parent)
// ============================================================
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Merci de remplir votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('familles').insert({ parent_user_id: data.user.id });
        }
      }
    } catch (e) {
      setError(e.message ?? "Une erreur est survenue, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.authContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.heroBanner}>
        <View style={styles.heroDuo}>
          <BouncingWrap><Noisette size={64} /></BouncingWrap>
          <BouncingWrap><Maestro size={58} /></BouncingWrap>
        </View>
        <Text style={styles.authTitle}>🌲 Kid Crack</Text>
        <SpeechBubble text="Bienvenue dans la Forêt des Murmures !" />
      </View>
      <Text style={styles.authSubtitle}>Espace parent</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === 'signin' ? 'Se connecter' : "Créer mon compte"}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text style={styles.switchMode}>
          {mode === 'signin'
            ? "Pas encore de compte ? Créez-en un"
            : 'Déjà un compte ? Connectez-vous'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// Écran : Sélection de profil ("Qui joue ?")
// ============================================================
function ProfileSelectScreen({ navigation }) {
  const [profils, setProfils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familleId, setFamilleId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadProfils = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }
    let { data: famille } = await supabase
      .from('familles')
      .select('id')
      .eq('parent_user_id', userData.user.id)
      .maybeSingle();

    if (!famille) {
      const { data: created } = await supabase
        .from('familles')
        .insert({ parent_user_id: userData.user.id })
        .select('id')
        .single();
      famille = created;
    }

    if (famille) {
      setFamilleId(famille.id);
      const { data: profilsData } = await supabase
        .from('profils_enfants')
        .select('*')
        .eq('famille_id', famille.id)
        .order('prenom');
      setProfils(profilsData ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProfils);
    return unsubscribe;
  }, [navigation, loadProfils]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHero}>
        <BouncingWrap><Noisette size={54} /></BouncingWrap>
        <Text style={styles.title}>Qui joue aujourd'hui ?</Text>
      </View>

      <FlatList
        data={profils}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('WorldMap', { profil: item })}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>{item.avatar_personnel ?? '🐾'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.prenom}</Text>
              <Text style={styles.cardSub}>
                {NIVEAU_CHOICES.find((n) => n.value === item.niveau_defaut)?.label ?? ''}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Aucun profil pour l'instant — ajoutez le premier enfant ci-dessous.
          </Text>
        }
      />

      <Pressable style={styles.addCard} onPress={() => setShowAddModal(true)}>
        <Text style={styles.addPlus}>＋</Text>
        <Text style={styles.addText}>Ajouter un profil</Text>
      </Pressable>

      {familleId && (
        <Pressable
          style={styles.settingsButton}
          onPress={() => navigation.navigate('ReglagesParentaux', { familleId })}
        >
          <Text style={styles.settingsButtonText}>👪 Réglages parentaux</Text>
        </Pressable>
      )}

      <AddProfileModal
        visible={showAddModal}
        familleId={familleId}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          setShowAddModal(false);
          loadProfils();
        }}
      />
    </View>
  );
}

function ParentGateModal({ visible, expectedPin, onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [checkingHardware, setCheckingHardware] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPin('');
      setError(null);
      setCheckingHardware(true);
      return;
    }
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
      } catch (e) {
        setBiometricAvailable(false);
      }
      setCheckingHardware(false);
    })();
  }, [visible]);

  async function handleBiometric() {
    setError(null);
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme que tu es un parent',
        cancelLabel: 'Annuler',
      });
      if (result.success) {
        onSuccess();
      } else {
        setError("Empreinte non reconnue ou annulée. Réessaie, ou utilise le code.");
      }
    } catch (e) {
      setError("L'empreinte n'a pas fonctionné. Utilise le code.");
    }
    setAuthenticating(false);
  }

  function checkPin() {
    if (!expectedPin) {
      setError("Aucun code parent n'est configuré. Réglez-le depuis les réglages parentaux.");
      return;
    }
    if (pin === expectedPin) {
      onSuccess();
    } else {
      setError('Code incorrect.');
      setPin('');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>👪 Validation parent</Text>

          {checkingHardware ? (
            <ActivityIndicator size="large" color={colors.mossDeep} style={{ marginVertical: 12 }} />
          ) : (
            <>
              {biometricAvailable && (
                <Pressable
                  style={[styles.button, { marginBottom: 14, opacity: authenticating ? 0.6 : 1 }]}
                  onPress={handleBiometric}
                  disabled={authenticating}
                >
                  <Text style={styles.buttonText}>
                    {authenticating ? 'Vérification…' : '👆 Valider avec empreinte / visage'}
                  </Text>
                </Pressable>
              )}

              <Text style={{ marginBottom: 8, color: colors.ink }}>
                {biometricAvailable ? 'Ou entre le code parent :' : 'Entre le code parent à 4 chiffres :'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="• • • •"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                value={pin}
                onChangeText={setPin}
              />
              {error && <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text>}
              <Pressable style={styles.button} onPress={checkPin}>
                <Text style={styles.buttonText}>Valider avec le code</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={onCancel}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AddProfileModal({ visible, familleId, onClose, onCreated }) {
  const [prenom, setPrenom] = useState('');
  const [niveau, setNiveau] = useState('gs');
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!familleId || !prenom.trim()) return;
    setSaving(true);
    await supabase.from('profils_enfants').insert({
      famille_id: familleId,
      prenom: prenom.trim(),
      niveau_defaut: niveau,
      avatar_personnel: avatar,
      niveau_global: 0,
    });
    setSaving(false);
    setPrenom('');
    onCreated();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Nouveau profil</Text>

          <TextInput
            style={styles.input}
            placeholder="Prénom"
            value={prenom}
            onChangeText={setPrenom}
          />

          <Text style={styles.label}>Niveau scolaire</Text>
          <View style={styles.row}>
            {NIVEAU_CHOICES.map((n) => (
              <Pressable
                key={n.value}
                style={[styles.chip, niveau === n.value && styles.chipSelected]}
                onPress={() => setNiveau(n.value)}
              >
                <Text style={[styles.chipText, niveau === n.value && styles.chipTextSelected]}>
                  {n.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_CHOICES.map((a) => (
              <Pressable
                key={a}
                style={[styles.avatarTile, avatar === a && styles.avatarTileSelected]}
                onPress={() => setAvatar(a)}
              >
                <Text style={{ fontSize: 22 }}>{a}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.button, { opacity: saving || !prenom.trim() ? 0.5 : 1 }]}
            onPress={handleCreate}
            disabled={saving || !prenom.trim()}
          >
            <Text style={styles.buttonText}>{saving ? 'Création…' : 'Créer le profil'}</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// Écran : Carte du monde (liste des mini-jeux)
// ============================================================
const GAME_ICONS = {
  pont_des_lettres: '🌉',
  sons_magiques: '🎵',
  pommes_de_luma: '🍎',
};
const GAME_SCREENS = {
  pont_des_lettres: 'PontDesLettres',
  sons_magiques: 'SonsMagiques',
  pommes_de_luma: 'PommesDeLuma',
};

function WorldMapScreen({ route, navigation }) {
  const [profil, setProfil] = useState(route.params.profil);
  const [miniJeux, setMiniJeux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlockedExtra, setUnlockedExtra] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { totalAllowed, baseRemaining, expectedPin } = useTimeBudget(profil, reloadKey);
  const remainingSeconds = useLiveCountdown(baseRemaining);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('mini_jeux').select('*').order('competence');
      setMiniJeux(data ?? []);
      setLoading(false);
    })();
  }, []);

  // Rafraîchit le niveau/avatar et le budget de temps à chaque retour sur cet écran.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const { data } = await supabase
        .from('profils_enfants')
        .select('*')
        .eq('id', route.params.profil.id)
        .maybeSingle();
      if (data) setProfil(data);
      setUnlockedExtra(false);
      setReloadKey((k) => k + 1);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const limitReached = baseRemaining != null && remainingSeconds <= 0 && !unlockedExtra;

  function handleGamePress(targetScreen) {
    if (!targetScreen) return;
    if (limitReached) {
      setShowGate(true);
      return;
    }
    navigation.navigate(targetScreen, { profil });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>‹ Changer de joueur</Text>
      </Pressable>

      <View style={styles.mapHeader}>
        <BouncingEmoji emoji={profil.avatar_personnel ?? '🐾'} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{profil.prenom}</Text>
          <Text style={styles.mapSubtitle}>
            Niveau {profil.niveau_global ?? 0} · {avatarLabelFor(profil.niveau_global ?? 0)}
          </Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Recompenses', { profil })}>
          <Text style={{ fontSize: 26 }}>🎁</Text>
        </Pressable>
      </View>

      <View style={styles.guideRow}>
        <Noisette size={44} />
        <SpeechBubble text={mapTipFor(profil)} />
      </View>

      {totalAllowed != null && (
        <TimeGaugeBar remainingSeconds={remainingSeconds} totalSeconds={totalAllowed} />
      )}

      {limitReached && (
        <View style={styles.blockedBanner}>
          <Noisette size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.blockedText}>
              Tu as bien joué aujourd'hui ! Reviens demain pour continuer l'aventure.
            </Text>
            <Pressable onPress={() => setShowGate(true)}>
              <Text style={styles.blockedLink}>Demander à un parent de débloquer</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={miniJeux}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const targetScreen = GAME_SCREENS[item.code];
          return (
            <Pressable
              style={[styles.gameCard, limitReached && targetScreen && styles.gameCardLocked]}
              disabled={!targetScreen}
              onPress={() => handleGamePress(targetScreen)}
            >
              <Text style={styles.gameIcon}>{GAME_ICONS[item.code] ?? '🎲'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gameName}>{item.nom}</Text>
                <Text style={styles.gameCompetence}>{item.competence}</Text>
              </View>
              {!targetScreen && <Text style={styles.soon}>bientôt</Text>}
              {limitReached && targetScreen && <Text style={{ fontSize: 18 }}>🔒</Text>}
            </Pressable>
          );
        }}
      />

      <ParentGateModal
        visible={showGate}
        expectedPin={expectedPin}
        onCancel={() => setShowGate(false)}
        onSuccess={() => {
          setShowGate(false);
          setUnlockedExtra(true);
        }}
      />
    </View>
  );
}

// ============================================================
// Écran : Le Pont des Lettres
// ============================================================
const TOTAL_ROUNDS = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function PontDesLettresScreen({ route, navigation }) {
  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [foundLetters, setFoundLetters] = useState([]);
  const [usedTokens, setUsedTokens] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);
  const errorsThisRound = useRef(0);
  const errorsTotal = useRef(0);
  const lastItemId = useRef(null);
  const startedAt = useRef(Date.now());

  const { totalAllowed, baseRemaining } = useTimeBudget(profil);
  const remainingSeconds = useLiveCountdown(baseRemaining);
  const timeUpRef = useRef(false);
  useEffect(() => {
    if (baseRemaining != null && remainingSeconds <= 0) timeUpRef.current = true;
  }, [remainingSeconds, baseRemaining]);

  // Lit automatiquement la consigne et le mot/son a voix haute a chaque
  // nouvelle manche, car les enfants ne savent pas tous lire encore.
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    const isModelMode = !!current.options;
    const instruction = isModelMode ? 'Trouve la lettre.' : 'Écoute et assemble le mot.';
    const parts = [instruction, current.sequence.join('')];
    (async () => {
      for (const part of parts) {
        if (cancelled) return;
        await new Promise((resolve) => {
          Speech.speak(part, {
            language: 'fr-FR',
            rate: 0.85,
            onDone: resolve,
            onStopped: resolve,
            onError: resolve,
          });
        });
      }
    })();
    return () => {
      cancelled = true;
      Speech.stop();
    };
  }, [current]);

  const loadRound = useCallback(async (jeuId, niveau, palierValue) => {
    setLoading(true);
    setFeedback(null);
    errorsThisRound.current = 0;
    setStepIndex(0);
    setFoundLetters([]);
    setUsedTokens([]);

    const { data } = await supabase
      .from('contenu_mini_jeu')
      .select('id, donnees')
      .eq('mini_jeu_id', jeuId)
      .eq('niveau', niveau)
      .eq('palier', palierValue)
      .eq('actif', true)
      .limit(30);

    const pool = (data ?? []).filter((r) => r.id !== lastItemId.current);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? data?.[0];
    if (!pick) {
      setLoading(false);
      return;
    }
    lastItemId.current = pick.id;
    const donnees = pick.donnees;
    setCurrent(donnees);

    const base = donnees.options ? donnees.options.slice() : donnees.sequence.slice();
    const withDistractors = donnees.distractors ? base.concat(donnees.distractors) : base;
    setTokens(shuffle(withDistractors));
    setLoading(false);
  }, []);

  // Recupere le jeu et le cran de difficulte sauvegarde, puis lance la
  // premiere manche avec ce cran precis (le cran reste fixe pendant toute
  // la session : seule la fin de session peut le faire evoluer).
  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase
        .from('mini_jeux')
        .select('id')
        .eq('code', 'pont_des_lettres')
        .single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);

      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();

      const startRung = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      setRung(startRung);
      const { niveau, palier: palierValue } = gradeAndPalierFromRung(startRung);
      loadRound(jeu.id, niveau, palierValue);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  function speak(text) {
    Speech.speak(text, { language: 'fr-FR', rate: 0.85 });
  }

  const [sessionSummary, setSessionSummary] = useState(null);

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: TOTAL_ROUNDS,
      startedAt: startedAt.current,
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function onTokenPress(token, index) {
    if (!current || !miniJeuId) return;
    const expected = current.sequence[stepIndex];

    if (token === expected) {
      setUsedTokens((u) => [...u, token + '#' + index]);
      setFoundLetters((f) => [...f, token]);
      const nextStep = stepIndex + 1;

      if (nextStep === current.sequence.length) {
        setFeedback('Bravo !');
        setTimeout(async () => {
          if (round >= TOTAL_ROUNDS || timeUpRef.current) {
            await finishSession();
          } else {
            setRound((r) => r + 1);
            const { niveau, palier } = gradeAndPalierFromRung(rung);
            loadRound(miniJeuId, niveau, palier);
          }
        }, 500);
      } else {
        setStepIndex(nextStep);
      }
    } else {
      errorsThisRound.current += 1;
      errorsTotal.current += 1;
      setFeedback('Essaie encore !');
      setTimeout(() => setFeedback(null), 500);
    }
  }

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} timeUp={timeUpRef.current} />;
  }

  if (loading || !current) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  const isModelMode = !!current.options;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>🌉 Le Pont des Lettres</Text>
        <Text style={styles.roundLabel}>{round}/{TOTAL_ROUNDS}</Text>
      </View>

      {totalAllowed != null && (
        <TimeGaugeBar remainingSeconds={remainingSeconds} totalSeconds={totalAllowed} />
      )}

      <View style={styles.gameCharacter}>
        <BouncingWrap><Maestro size={48} /></BouncingWrap>
      </View>

      <View style={styles.prompt}>
        {current.icon ? (
          <Pressable onPress={() => speak(current.sequence.join(''))}>
            <Text style={styles.icon}>{current.icon}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.listenButton} onPress={() => speak(current.sequence.join(''))}>
            <Text style={styles.listenText}>🔊 Écouter</Text>
          </Pressable>
        )}

        {isModelMode ? (
          current.showModel && (
            <View style={styles.modelBox}>
              <Text style={styles.modelText} numberOfLines={1} adjustsFontSizeToFit>
                {current.sequence[0]}
              </Text>
            </View>
          )
        ) : (
          <View style={styles.slots}>
            {current.sequence.map((_, i) => (
              <View key={i} style={styles.slot}>
                <Text style={styles.slotText} numberOfLines={1} adjustsFontSizeToFit>
                  {foundLetters[i] ?? ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {feedback && (
        <PopIn key={feedback + round}>
          <Text
            style={[
              styles.feedback,
              feedback === 'Bravo !' ? styles.feedbackSuccess : styles.feedbackError,
            ]}
          >
            {feedback}
          </Text>
        </PopIn>
      )}

      <View style={styles.stonesWrap}>
        {tokens.map((token, i) => {
          const used = usedTokens.includes(token + '#' + i);
          const bg = STONE_COLORS[i % STONE_COLORS.length];
          return (
            <Pressable
              key={i}
              disabled={used}
              onPress={() => onTokenPress(token, i)}
              style={[
                styles.stone,
                { backgroundColor: bg },
                used && styles.stoneUsed,
              ]}
            >
              <Text style={styles.stoneText} numberOfLines={1} adjustsFontSizeToFit>
                {token}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// Écran de fin de session partagé (résultat, montée d'avatar, récompense)
// ============================================================
function BouncingEmoji({ emoji, size }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -10, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  return (
    <Animated.Text style={{ fontSize: size ?? 56, transform: [{ translateY: bounce }] }}>
      {emoji}
    </Animated.Text>
  );
}

function BouncingWrap({ children, size }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  return (
    <Animated.View style={{ transform: [{ translateY: bounce }] }}>
      {children}
    </Animated.View>
  );
}

function PopIn({ children, delay, style }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay: delay ?? 0, friction: 6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, delay: delay ?? 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

function speak(text) {
  if (text) Speech.speak(String(text), { language: 'fr-FR', rate: 0.85 });
}

function SessionEndScreen({ profil, summary, navigation, timeUp }) {
  const fiche = summary?.ficheAnimal;

  return (
    <ScrollView contentContainerStyle={styles.endScroll}>
      <BouncingWrap><Noisette size={72} /></BouncingWrap>
      <Text style={{ fontSize: 32, marginBottom: 4 }}>🌟</Text>
      <Text style={styles.endTitle}>Bravo {profil.prenom} !</Text>
      {summary?.newRung != null && (
        <Text style={styles.endText}>
          Niveau atteint : {rungLabel(summary.newRung)}
          {summary.direction === 'up' ? ' 🎉' : ''}
        </Text>
      )}
      {timeUp && (
        <View style={styles.timeUpBox}>
          <Text style={styles.timeUpText}>
            ⏳ Le temps de jeu du jour est terminé. À demain pour une nouvelle aventure !
          </Text>
        </View>
      )}

      {summary?.rankChanged && (
        <PopIn delay={150} style={styles.rankUpBox}>
          <Text style={styles.rankUpTitle}>Nouvel avatar débloqué !</Text>
          <BouncingEmoji emoji={AVATAR_CHAIN[summary.newRank - 1].emoji} size={44} />
          <Text style={styles.rankUpAvatar}>{AVATAR_CHAIN[summary.newRank - 1].name}</Text>
        </PopIn>
      )}

      {fiche && (
        <PopIn delay={350} style={styles.ficheBox}>
          <Text style={styles.ficheTitle}>{fiche.nom_affiche}</Text>
          {fiche.epoque ? <Text style={styles.ficheLine}>🕰️ {fiche.epoque}</Text> : null}
          {fiche.habitat ? <Text style={styles.ficheLine}>🏡 {fiche.habitat}</Text> : null}
          {fiche.alimentation ? <Text style={styles.ficheLine}>🍽️ {fiche.alimentation}</Text> : null}
          {fiche.esperance_de_vie ? <Text style={styles.ficheLine}>⏳ {fiche.esperance_de_vie}</Text> : null}
          {fiche.fait_amusant ? <Text style={styles.ficheFait}>✨ {fiche.fait_amusant}</Text> : null}
          <Pressable
            style={styles.listenButton}
            onPress={() =>
              speak(
                [fiche.nom_affiche, fiche.habitat, fiche.alimentation, fiche.fait_amusant]
                  .filter(Boolean)
                  .join('. ')
              )
            }
          >
            <Text style={styles.listenText}>🔊 Écouter</Text>
          </Pressable>
        </PopIn>
      )}

      {summary?.reward && (
        <PopIn delay={500} style={styles.rewardBox}>
          <Text style={styles.rewardTitle}>🎁 Une récompense t'attend !</Text>
          {summary.reward.description ? (
            <Text style={styles.rewardText}>{summary.reward.description}</Text>
          ) : null}
        </PopIn>
      )}

      <Pressable style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Retour à la carte</Text>
      </Pressable>
    </ScrollView>
  );
}

// ============================================================
// Moteur générique : question à choix (Sons Magiques + Pommes de Luma)
// ============================================================
function ChoiceGameScreen({ route, navigation, jeuCode, jeuTitre, buildPrompt, Character }) {
  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [round, setRound] = useState(1);
  const [promptData, setPromptData] = useState(null);
  const [optionsOrder, setOptionsOrder] = useState([]);
  const [answered, setAnswered] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const errorsThisRound = useRef(0);
  const errorsTotal = useRef(0);
  const lastItemId = useRef(null);
  const startedAt = useRef(Date.now());

  const { totalAllowed, baseRemaining } = useTimeBudget(profil);
  const remainingSeconds = useLiveCountdown(baseRemaining);
  const timeUpRef = useRef(false);
  useEffect(() => {
    if (baseRemaining != null && remainingSeconds <= 0) timeUpRef.current = true;
  }, [remainingSeconds, baseRemaining]);

  // Lit automatiquement la consigne a voix haute a chaque nouvelle manche,
  // car les enfants ne savent pas tous lire encore. La cible (son/mot) suit
  // juste apres, une fois la consigne terminee.
  useEffect(() => {
    if (!promptData) return;
    let cancelled = false;
    const parts = [promptData.promptText, promptData.speak].filter(Boolean);
    (async () => {
      for (const part of parts) {
        if (cancelled) return;
        await new Promise((resolve) => {
          Speech.speak(String(part), {
            language: 'fr-FR',
            rate: 0.85,
            onDone: resolve,
            onStopped: resolve,
            onError: resolve,
          });
        });
      }
    })();
    return () => {
      cancelled = true;
      Speech.stop();
    };
  }, [promptData]);

  const loadRound = useCallback(async (jeuId, niveau, palierValue) => {
    setLoading(true);
    setFeedback(null);
    setAnswered(null);
    errorsThisRound.current = 0;

    const { data } = await supabase
      .from('contenu_mini_jeu')
      .select('id, donnees')
      .eq('mini_jeu_id', jeuId)
      .eq('niveau', niveau)
      .eq('palier', palierValue)
      .eq('actif', true)
      .limit(30);

    const pool = (data ?? []).filter((r) => r.id !== lastItemId.current);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? data?.[0];
    if (!pick) {
      setLoading(false);
      return;
    }
    lastItemId.current = pick.id;
    const prompt = buildPrompt(pick.donnees);
    setPromptData(prompt);
    setOptionsOrder(shuffle(prompt.options));
    setLoading(false);
  }, []);

  // Recupere le jeu et le cran de difficulte sauvegarde, puis lance la
  // premiere manche avec ce cran precis (fixe pour toute la session).
  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase
        .from('mini_jeux')
        .select('id')
        .eq('code', jeuCode)
        .single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);

      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();

      const startRung = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      setRung(startRung);
      const { niveau, palier: palierValue } = gradeAndPalierFromRung(startRung);
      loadRound(jeu.id, niveau, palierValue);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  function speak(text) {
    if (text) Speech.speak(String(text), { language: 'fr-FR', rate: 0.85 });
  }

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: TOTAL_ROUNDS,
      startedAt: startedAt.current,
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function onOptionPress(value) {
    if (!promptData || answered !== null) return;
    const isCorrect = String(value) === String(promptData.correct);
    setAnswered(value);

    if (isCorrect) {
      setFeedback('Bravo !');
      setTimeout(async () => {
        if (round >= TOTAL_ROUNDS || timeUpRef.current) {
          await finishSession();
        } else {
          setRound((r) => r + 1);
          const { niveau, palier } = gradeAndPalierFromRung(rung);
          loadRound(miniJeuId, niveau, palier);
        }
      }, 700);
    } else {
      errorsThisRound.current += 1;
      errorsTotal.current += 1;
      setFeedback('Essaie encore !');
      setTimeout(() => {
        setFeedback(null);
        setAnswered(null);
      }, 700);
    }
  }

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} timeUp={timeUpRef.current} />;
  }

  if (loading || !promptData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>{jeuTitre}</Text>
        <Text style={styles.roundLabel}>{round}/{TOTAL_ROUNDS}</Text>
      </View>

      {totalAllowed != null && (
        <TimeGaugeBar remainingSeconds={remainingSeconds} totalSeconds={totalAllowed} />
      )}

      {Character ? (
        <View style={styles.gameCharacter}>
          <BouncingWrap><Character size={48} /></BouncingWrap>
        </View>
      ) : null}

      <View style={styles.prompt}>
        {promptData.icon ? <Text style={styles.icon}>{promptData.icon}</Text> : null}
        {promptData.visual ? <Text style={styles.visualRow}>{promptData.visual}</Text> : null}
        {promptData.texteAffiche ? (
          <View style={styles.readingBox}>
            <Text style={styles.readingText}>{promptData.texteAffiche}</Text>
          </View>
        ) : null}
        <Text style={styles.promptText}>{promptData.promptText}</Text>
        {promptData.speak ? (
          <Pressable style={styles.listenButton} onPress={() => speak(promptData.speak)}>
            <Text style={styles.listenText}>🔊 Écouter</Text>
          </Pressable>
        ) : null}
      </View>

      {feedback && (
        <PopIn key={feedback + round}>
          <Text style={[styles.feedback, feedback === 'Bravo !' ? styles.feedbackSuccess : styles.feedbackError]}>
            {feedback}
          </Text>
        </PopIn>
      )}

      <View style={styles.stonesWrap}>
        {optionsOrder.map((option, i) => {
          const isAnswered = answered !== null;
          const isThisCorrect = String(option) === String(promptData.correct);
          const isThisAnswer = isAnswered && String(option) === String(answered);
          const bg = STONE_COLORS[i % STONE_COLORS.length];
          return (
            <Pressable
              key={i}
              disabled={isAnswered}
              onPress={() => onOptionPress(option)}
              style={[
                styles.optionButton,
                { backgroundColor: bg },
                isAnswered && isThisCorrect && styles.optionCorrect,
                isAnswered && isThisAnswer && !isThisCorrect && styles.optionWrong,
              ]}
            >
              <Text style={styles.optionText} numberOfLines={1} adjustsFontSizeToFit>
                {String(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// Les Sons Magiques
// ============================================================
function buildSonsPrompt(d) {
  switch (d.etape) {
    case 'segmenter':
      return {
        icon: d.icon,
        promptText: 'Combien de syllabes dans ce mot ?',
        speak: d.mot,
        options: d.options,
        correct: d.syllabes,
      };
    case 'rimer':
      return {
        icon: d.cible_icon,
        promptText: 'Quel mot rime avec celui-ci ?',
        speak: d.cible,
        options: d.options,
        correct: d.bonne_reponse,
      };
    case 'fusionner': {
      const correct = d.options.find((o) => o.toLowerCase() === String(d.son).toLowerCase()) ?? d.options[0];
      return {
        promptText: 'Quelle lettre fait ce son ?',
        speak: d.son,
        options: d.options,
        correct,
      };
    }
    case 'fusionner_syllabe':
      return {
        promptText: 'Quelle syllabe fait "' + d.son1 + '" + "' + d.son2 + '" ?',
        speak: d.son1 + d.son2,
        options: d.options,
        correct: d.resultat,
      };
    case 'manipuler': {
      const instruction = d.instruction === 'enlever'
        ? 'Dis "' + d.mot_depart + '" sans le son "' + d.son_cible + '"'
        : 'Dans "' + d.mot_depart + '", remplace "' + d.son_cible + '" par "' + d.son_ajoute + '"';
      return {
        promptText: instruction,
        speak: d.mot_depart,
        options: d.options,
        correct: d.resultat,
      };
    }
    case 'premiere_syllabe':
      return {
        icon: d.icon,
        promptText: 'Quelle est la première syllabe de ce mot ?',
        speak: d.mot,
        options: d.syllabes,
        correct: d.reponse,
      };
    case 'comprehension':
      return {
        texteAffiche: d.texte,
        promptText: d.question,
        speak: `${d.texte} ${d.question}`,
        options: d.options,
        correct: d.bonne_reponse,
      };
    default:
      return { promptText: '...', options: [], correct: null };
  }
}

function SonsMagiquesScreen({ route, navigation }) {
  return (
    <ChoiceGameScreen
      route={route}
      navigation={navigation}
      jeuCode="sons_magiques"
      Character={Maestro}
      jeuTitre="🎵 Les Sons Magiques"
      buildPrompt={buildSonsPrompt}
    />
  );
}

// ============================================================
// Les Pommes de Luma
// ============================================================
function buildLumaPrompt(d) {
  switch (d.etape) {
    case 'concret':
      return {
        visual: '🍎'.repeat(d.cible),
        promptText: 'Combien de pommes vois-tu ?',
        options: d.options,
        correct: d.cible,
      };
    case 'chiffre':
      return {
        visual: '🍎'.repeat(d.cible),
        promptText: 'Quel chiffre correspond à cette quantité ?',
        options: d.options,
        correct: d.cible,
      };
    case 'image': {
      const a = d.decomposition[0];
      const b = d.decomposition[1];
      return {
        visual: '🍎'.repeat(a) + '   ' + '🍏'.repeat(b),
        promptText: a + ' + ' + b + ' = ?',
        options: [d.cible, d.cible - 1, d.cible + 1],
        correct: d.cible,
      };
    }
    case 'abstrait': {
      const symboles = { addition: '+', soustraction: '−', multiplication: '×', division: '÷' };
      const symbole = symboles[d.operation] ?? '+';
      return {
        promptText: d.a + ' ' + symbole + ' ' + d.b + ' = ?',
        options: d.options,
        correct: d.resultat,
      };
    }
    case 'comparer':
      return {
        visual: '🍎'.repeat(d.gauche) + '    VS    ' + '🍎'.repeat(d.droite),
        promptText: 'Le groupe de gauche a-t-il plus, moins ou autant que celui de droite ?',
        options: ['plus', 'moins', 'autant'],
        correct: d.reponse,
      };
    default:
      return { promptText: '...', options: [], correct: null };
  }
}

function PommesDeLumaScreen({ route, navigation }) {
  return (
    <ChoiceGameScreen
      route={route}
      navigation={navigation}
      jeuCode="pommes_de_luma"
      Character={Luma}
      jeuTitre="🍎 Les Pommes de Luma"
      buildPrompt={buildLumaPrompt}
    />
  );
}

// ============================================================
// Écran parent : gestion des récompenses
// ============================================================
function RecompensesScreen({ route, navigation }) {
  const { profil } = route.params;
  const [recompenses, setRecompenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [niveauDeclencheur, setNiveauDeclencheur] = useState('');
  const [description, setDescription] = useState('');
  const [visibleAvant, setVisibleAvant] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('recompenses_parentales')
      .select('*')
      .eq('profil_id', profil.id)
      .order('niveau_declencheur');
    setRecompenses(data ?? []);
    setLoading(false);
  }, [profil.id]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    const niveau = parseInt(niveauDeclencheur, 10);
    if (!niveau || !description.trim()) return;
    setSaving(true);
    await supabase.from('recompenses_parentales').insert({
      profil_id: profil.id,
      famille_id: profil.famille_id,
      niveau_declencheur: niveau,
      description: description.trim(),
      visible_avant: visibleAvant,
      statut: 'a_faire',
    });
    setNiveauDeclencheur('');
    setDescription('');
    setSaving(false);
    load();
  }

  async function handleDelete(id) {
    await supabase.from('recompenses_parentales').delete().eq('id', id);
    load();
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>🎁 Récompenses pour {profil.prenom}</Text>

      <View style={styles.rewardForm}>
        <Text style={styles.label}>Niveau qui déclenche la récompense (1 à 1000)</Text>
        <TextInput
          style={styles.input}
          placeholder="ex. 10"
          keyboardType="number-pad"
          value={niveauDeclencheur}
          onChangeText={setNiveauDeclencheur}
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="ex. Sortie au parc, une glace..."
          value={description}
          onChangeText={setDescription}
        />
        <Pressable style={styles.row} onPress={() => setVisibleAvant(!visibleAvant)}>
          <View style={[styles.checkbox, visibleAvant && styles.checkboxChecked]}>
            {visibleAvant ? <Text style={{ color: '#fff' }}>✓</Text> : null}
          </View>
          <Text style={{ color: colors.ink }}>Annoncer à l'avance (cadenas visible)</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { opacity: saving ? 0.5 : 1 }]}
          onPress={handleAdd}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Ajout…' : 'Ajouter la récompense'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.mossDeep} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={recompenses}
          keyExtractor={(r) => r.id}
          style={{ marginTop: 16 }}
          renderItem={({ item }) => (
            <View style={styles.rewardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardRowTitle}>
                  Niveau {item.niveau_declencheur} — {item.description}
                </Text>
                <Text style={styles.rewardRowSub}>
                  {item.statut === 'fait' ? '✅ Débloquée' : item.visible_avant ? '🔒 Annoncée' : '🎁 Surprise'}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(item.id)}>
                <Text style={{ color: colors.error, fontWeight: '700' }}>Suppr.</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune récompense pour l'instant.</Text>}
        />
      )}
    </View>
  );
}

// ============================================================
// Écran parent : réglages (temps de jeu quotidien, code PIN)
// ============================================================
const MINUTES_STEP = 5;
const MINUTES_MIN = 5;
const MINUTES_MAX = 120;

function ReglagesParentauxScreen({ route, navigation }) {
  const { familleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [minutesMaxJour, setMinutesMaxJour] = useState(30);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [existingPin, setExistingPin] = useState(null);

  useEffect(() => {
    (async () => {
      const parametres = await getParametresParentaux(familleId);
      setMinutesMaxJour(parametres?.minutes_max_jour ?? 30);
      setPin(parametres?.code_validation ?? '');
      setExistingPin(parametres?.code_validation ?? null);
      setLoading(false);
      // Si un code parent existe deja, on protege l'acces. Sinon (tout premier
      // reglage), on laisse entrer directement pour permettre de le configurer.
      if (parametres?.code_validation) {
        setShowGate(true);
      } else {
        setUnlocked(true);
      }
    })();
  }, [familleId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await supabase
      .from('parametres_parentaux')
      .update({
        minutes_max_jour: minutesMaxJour,
        code_validation: pin.trim() || null,
      })
      .eq('famille_id', familleId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.center}>
        <Noisette size={64} />
        <Text style={{ marginTop: 12, color: colors.ink, fontWeight: '600' }}>
          Réglages protégés — validation parent requise.
        </Text>
        <ParentGateModal
          visible={showGate}
          expectedPin={existingPin}
          onCancel={() => navigation.goBack()}
          onSuccess={() => {
            setShowGate(false);
            setUnlocked(true);
          }}
        />
      </View>
    );
  }

  const fillRatio = Math.min(1, (minutesMaxJour - MINUTES_MIN) / (MINUTES_MAX - MINUTES_MIN));

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>👪 Réglages parentaux</Text>

      <View style={styles.rewardForm}>
        <Text style={styles.label}>Temps de jeu autorisé par jour</Text>
        <View style={styles.gaugeRow}>
          <Pressable
            style={styles.gaugeButton}
            onPress={() => setMinutesMaxJour((m) => Math.max(MINUTES_MIN, m - MINUTES_STEP))}
          >
            <Text style={styles.gaugeButtonText}>−</Text>
          </Pressable>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeFill, { width: `${fillRatio * 100}%` }]} />
          </View>
          <Pressable
            style={styles.gaugeButton}
            onPress={() => setMinutesMaxJour((m) => Math.min(MINUTES_MAX, m + MINUTES_STEP))}
          >
            <Text style={styles.gaugeButtonText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.gaugeValue}>{minutesMaxJour} minutes par jour</Text>

        <Text style={[styles.label, { marginTop: 20 }]}>Code parent (4 chiffres)</Text>
        <Text style={styles.helperText}>
          Sert à valider une session supplémentaire quand le temps est écoulé, si l'empreinte
          digitale n'est pas disponible sur ce téléphone.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="ex. 1234"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          value={pin}
          onChangeText={setPin}
        />

        <Pressable style={[styles.button, { opacity: saving ? 0.5 : 1 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ============================================================
// Navigation racine
// ============================================================
const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="ProfileSelect" component={ProfileSelectScreen} />
            <Stack.Screen name="WorldMap" component={WorldMapScreen} />
            <Stack.Screen name="PontDesLettres" component={PontDesLettresScreen} />
            <Stack.Screen name="SonsMagiques" component={SonsMagiquesScreen} />
            <Stack.Screen name="PommesDeLuma" component={PommesDeLumaScreen} />
            <Stack.Screen name="Recompenses" component={RecompensesScreen} />
            <Stack.Screen name="ReglagesParentaux" component={ReglagesParentauxScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: colors.cream, justifyContent: 'center', paddingHorizontal: 28 },
  authTitle: { fontSize: 28, fontWeight: '700', color: colors.mossDeep, textAlign: 'center', marginBottom: 4 },
  authSubtitle: { fontSize: 14, color: colors.ink, opacity: 0.6, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
  button: { backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { fontWeight: '700', fontSize: 16, color: colors.ink },
  switchMode: { textAlign: 'center', marginTop: 18, color: colors.mossDeep, fontWeight: '600' },
  error: { color: '#EE4C4C', textAlign: 'center', marginBottom: 8, fontWeight: '600' },

  container: { flex: 1, backgroundColor: colors.cream, padding: 18, paddingTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: colors.mossDeep },
  back: { color: colors.mossDeep, fontWeight: '600', marginBottom: 16, fontSize: 16 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 14, marginBottom: 12, gap: 14 },
  avatarCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 28 },
  cardName: { fontSize: 17, fontWeight: '700', color: colors.mossDeep },
  cardSub: { fontSize: 13, opacity: 0.6, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.blue, fontWeight: '700' },
  emptyText: { textAlign: 'center', opacity: 0.6, marginTop: 40, fontSize: 14 },
  addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C8BD9C', borderStyle: 'dashed', borderRadius: 22, padding: 14, gap: 8 },
  addPlus: { fontSize: 20, color: colors.mossDeep },
  addText: { fontWeight: '700', color: colors.mossDeep },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.mossDeep, marginBottom: 14 },
  label: { fontWeight: '700', color: colors.mossDeep, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fff' },
  chipSelected: { backgroundColor: colors.mossSoft },
  chipText: { fontWeight: '600', color: colors.ink },
  chipTextSelected: { color: '#fff' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  avatarTile: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarTileSelected: { borderColor: colors.gold, backgroundColor: colors.sand },
  cancelText: { textAlign: 'center', marginTop: 14, opacity: 0.6, fontWeight: '600' },

  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 26 },
  mapAvatar: { fontSize: 44 },
  mapSubtitle: { fontSize: 13, opacity: 0.6 },
  gameCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 16, gap: 14 },
  gameIcon: { fontSize: 32 },
  gameName: { fontSize: 16, fontWeight: '700', color: colors.mossDeep },
  gameCompetence: { fontSize: 12, opacity: 0.6, textTransform: 'capitalize' },
  soon: { fontSize: 11, opacity: 0.5, fontStyle: 'italic' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  gameTitle: { fontSize: 16, fontWeight: '700', color: colors.mossDeep },
  roundLabel: { fontSize: 13, opacity: 0.6, fontWeight: '600' },
  prompt: { alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 56, marginBottom: 8 },
  listenButton: { backgroundColor: '#fff', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, marginBottom: 10 },
  listenText: { fontWeight: '700', color: colors.mossDeep },
  modelBox: {
    minWidth: 64, height: 64, paddingHorizontal: 12, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.gold, flexShrink: 0,
  },
  modelText: { fontSize: 26, fontWeight: '800', color: colors.mossDeep },
  slots: { flexDirection: 'row', gap: 8, flexWrap: 'nowrap', justifyContent: 'center' },
  slot: {
    minWidth: 42, height: 48, borderBottomWidth: 4, borderBottomColor: colors.mossSoft,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, flexShrink: 0,
  },
  slotText: { fontSize: 20, fontWeight: '800', color: colors.mossDeep },
  feedback: { textAlign: 'center', fontWeight: '800', fontSize: 16, marginBottom: 12 },
  feedbackSuccess: { color: colors.success },
  feedbackError: { color: colors.error },
  stonesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  stone: {
    minWidth: 52, height: 52, paddingHorizontal: 14, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  stoneUsed: { backgroundColor: colors.mossSoft, opacity: 0.45, borderColor: 'transparent' },
  stoneText: { fontSize: 17, fontWeight: '800', color: colors.ink },
  endEmoji: { fontSize: 48, marginBottom: 12 },
  endTitle: { fontSize: 22, fontWeight: '700', color: colors.mossDeep, marginBottom: 8 },
  endText: { fontSize: 15, opacity: 0.7, marginBottom: 24, textAlign: 'center' },
  rankUpBox: { backgroundColor: colors.gold, borderRadius: 18, padding: 16, marginBottom: 16, alignItems: 'center' },
  rankUpTitle: { fontWeight: '800', color: colors.ink, marginBottom: 6 },
  rankUpAvatar: { fontSize: 22, fontWeight: '700', color: colors.ink },
  rewardBox: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 2, borderColor: colors.gold },
  rewardTitle: { fontWeight: '800', color: colors.mossDeep, marginBottom: 6 },
  rewardText: { color: colors.ink, textAlign: 'center' },
  visualRow: { fontSize: 26, marginBottom: 10, textAlign: 'center' },
  promptText: { fontSize: 17, fontWeight: '700', color: colors.mossDeep, textAlign: 'center', marginBottom: 10 },
  readingBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: colors.sand },
  readingText: { fontSize: 18, color: colors.ink, textAlign: 'center', lineHeight: 26 },
  optionButton: { minWidth: 70, height: 56, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)' },
  optionCorrect: { backgroundColor: colors.success, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.error, borderColor: colors.error },
  optionText: { fontSize: 17, fontWeight: '800', color: colors.ink },
  rewardForm: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 16 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8 },
  rewardRowTitle: { fontWeight: '700', color: colors.mossDeep },
  rewardRowSub: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.mossSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: colors.mossSoft },
  endScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: 24, paddingTop: 60 },
  ficheBox: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, alignItems: 'center', width: '100%', borderWidth: 2, borderColor: colors.mossSoft },
  ficheTitle: { fontSize: 18, fontWeight: '800', color: colors.mossDeep, marginBottom: 8 },
  ficheLine: { fontSize: 14, color: colors.ink, marginBottom: 4, textAlign: 'center' },
  ficheFait: { fontSize: 14, color: colors.mossDeep, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  heroBanner: {
    alignItems: 'center', backgroundColor: VIVID.sky, borderRadius: 28,
    paddingVertical: 20, paddingHorizontal: 16, marginBottom: 20,
  },
  heroDuo: { flexDirection: 'row', gap: 18, marginBottom: 10 },
  profileHero: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  gameCharacter: { alignItems: 'center', marginBottom: 4 },
  speechBubble: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    maxWidth: 220, borderWidth: 2, borderColor: VIVID.orangeDark,
  },
  speechBubbleText: { color: colors.ink, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  speechBubbleTail: {
    position: 'absolute', left: -8, top: '50%', marginTop: -6,
    width: 0, height: 0, borderTopWidth: 6, borderBottomWidth: 6, borderRightWidth: 8,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: VIVID.orangeDark,
  },
  characterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsButton: {
    backgroundColor: colors.mossDeep, borderRadius: 999, paddingVertical: 14,
    alignItems: 'center', marginTop: 18,
  },
  settingsButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  settingsLinkText: { color: colors.mossDeep, fontWeight: '700', opacity: 0.8 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  gaugeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  gaugeButtonText: { fontSize: 22, fontWeight: '800', color: colors.ink },
  gaugeTrack: { flex: 1, height: 16, borderRadius: 8, backgroundColor: '#EEE', overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: colors.mossSoft, borderRadius: 8 },
  gaugeValue: { textAlign: 'center', fontWeight: '700', color: colors.mossDeep, marginBottom: 8 },
  helperText: { fontSize: 12, opacity: 0.6, color: colors.ink, marginBottom: 10 },
  timeGaugeBox: { marginBottom: 14 },
  timeGaugeText: { fontSize: 12, fontWeight: '700', color: colors.mossDeep, marginBottom: 4 },
  blockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 2, borderColor: colors.error },
  blockedText: { color: colors.ink, fontWeight: '600', marginBottom: 6 },
  blockedLink: { color: colors.blue, fontWeight: '800' },
  gameCardLocked: { opacity: 0.5 },
  liveGaugeBox: { marginBottom: 14 },
  liveGaugeText: { fontSize: 13, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginTop: 4 },
  timeUpBox: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 2, borderColor: colors.error },
  timeUpText: { color: colors.ink, fontWeight: '700', textAlign: 'center' },
});
