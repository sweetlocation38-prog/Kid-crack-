/**
 * ============================================================================
 * CAHIER DES CHARGES — PRINCIPES DIRECTEURS DU PARENT (a relire regulierement)
 * ============================================================================
 * Ce memo resume les exigences donnees au fil du developpement. Toute
 * modification des jeux, du contenu ou du moteur d'adaptation doit rester
 * fidele a ces principes. A relire avant d'ajouter un jeu ou du contenu.
 *
 * 1) NIVEAU PEDAGOGIQUE — s'inspirer des 5 meilleurs systemes educatifs
 *    du monde (classements PIRLS / TIMSS) :
 *    - Maths : methode de Singapour (approche concret -> image -> abstrait,
 *      modele en barres, "faire 10", operations reciproques mult/div).
 *    - Lecture : science de la lecture / conscience phonologique
 *      (segmenter, fusionner, manipuler les sons), puis fluence et
 *      comprehension a partir du CE1.
 *    - Le contenu doit couvrir TOUTE la scolarite, sans s'arreter au
 *      niveau scolaire reel de l'enfant : MS, GS, CP, CE1, CE2, CM1, CM2,
 *      6e et au-dela si besoin. Un enfant qui reussit tres bien ne doit
 *      jamais etre plafonne artificiellement par son niveau de classe.
 *
 * 2) PROGRESSION / ADAPTATION — doit etre rapide, juste, et honnete :
 *    - Une seule echelle continue (niveau scolaire + palier fusionnes en
 *      "crans"), pour pouvoir depasser librement le niveau assigne.
 *    - La difficulte doit s'adapter TRES vite au niveau reel de l'enfant :
 *      une reussite parfaite fait monter de plus en plus de crans d'affilee
 *      (acceleration +1, +2, +3...), pour trouver le point de rupture en
 *      quelques sessions (pas des dizaines).
 *    - Le temps de reponse compte autant que la justesse : une bonne
 *      reponse mais tres lente ne doit PAS etre traitee comme une vraie
 *      maitrise (voir temps_reference_secondes dans la table progression).
 *    - Ne JAMAIS interrompre un enfant en plein milieu d'une manche ou
 *      d'une session, que ce soit pour la jauge de temps ou pour un
 *      changement de niveau. Toute limite (temps de jeu, etc.) ne
 *      s'applique qu'aux moments de transition (retour a la carte).
 *
 * 3) REPETITIVITE — a combattre en permanence :
 *    - Le contenu (mots, sons, animaux, objets, images) doit etre riche
 *      et varie : eviter de montrer toujours les memes elements. Grossir
 *      regulierement les pools de contenu, surtout les plus petits.
 *    - Dans une meme session, ne jamais repeter un element deja vu tant
 *      que le stock disponible n'est pas epuise.
 *    - Diversifier les MECANIQUES de jeu, pas seulement le contenu :
 *      "choisis la bonne reponse parmi 3" ne doit pas etre l'unique
 *      interaction de l'app. Chercher activement des mecaniques
 *      differentes (memory, sequences a repeter, tri, puzzle, frise
 *      chronologique, repares spatial, etc.) pour que jouer ne devienne
 *      jamais lassant ou "reducteur".
 *
 * 4) VOIX — a utiliser avec parcimonie :
 *    - Lecture automatique UNIQUEMENT quand c'est indispensable pour
 *      comprendre la consigne (aucune image disponible, texte a lire).
 *    - Partout ailleurs, la voix reste disponible sur simple demande
 *      (bouton micro), jamais imposee a chaque manche.
 * ============================================================================
 */

import 'react-native-url-polyfill/auto';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState, createContext } from 'react';
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
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Speech from 'expo-speech';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as DocumentPicker from 'expo-document-picker';

const CAMPAGNE_MAP_IMAGE = require('../assets/carte-campagne.jpg');
const CAMPAGNE_MAP_ASPECT = 760 / 1690;

// A mettre a jour a chaque envoi de code, pour verifier depuis l'app
// quelle version est vraiment installee sur le telephone.
const APP_BUILD_VERSION = '30/07/2026 - 14 correctifs : bouton P, ecran theme compact, surbrillance apres 3 erreurs, micro repositionne, anti-repetition renforce, texte adaptatif Monde Capitales, Memoire Etoiles sans erreurs, taille uniforme, Pommes de Luma gauche-droite, Cachettes de Luma 4 directions et avatars varies';
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
// ============================================================
// Icone moderne (pomme dessinee) pour remplacer l'emoji systeme,
// plus net et coherent que l'emoji classique.
// ============================================================
// ============================================================
// Photo de profil et memos vocaux — utilitaires partages
// (upload vers Supabase Storage, choix galerie/appareil photo,
// enregistrement audio).
// ============================================================
async function uploadFileToStorage(bucket, path, uri, contentType) {
  try {
    const response = await fetch(uri);
    // Sur Android, passer un Blob directement a Supabase est connu pour
    // echouer silencieusement ou produire un fichier vide (bug documente
    // d'Expo) - un ArrayBuffer est beaucoup plus fiable.
    const arraybuffer = await response.arrayBuffer();
    const { error } = await supabase.storage.from(bucket).upload(path, arraybuffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.warn('Erreur upload', error);
      return { url: null, error: error.message ?? String(error) };
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data?.publicUrl ?? null, error: null };
  } catch (e) {
    console.warn('Erreur upload', e);
    return { url: null, error: e?.message ?? String(e) };
  }
}

async function pickImageFromLibrary() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

async function pickImageFromCamera() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

// Ouvre le choix galerie / appareil photo, renvoie l'uri locale choisie (ou null).
// Renvoie soit une uri de photo locale, soit le mot-cle special
// '__AVATAR__' (l'appelant doit alors laisser choisir un avatar du jeu),
// soit null si annule.
function choosePhotoSource() {
  return new Promise((resolve) => {
    Alert.alert(
      'Photo de profil',
      'Choisir la photo',
      [
        { text: '🖼️ Galerie', onPress: async () => resolve(await pickImageFromLibrary()) },
        { text: '📷 Appareil photo', onPress: async () => resolve(await pickImageFromCamera()) },
        { text: '🎭 Avatar du jeu', onPress: () => resolve('__AVATAR__') },
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

// ============================================================
// Memos vocaux — enregistrement par le parent, lecture aleatoire
// pendant les jeux (jamais automatique a chaque manche).
// ============================================================
async function fetchMemosConfig(familleId) {
  if (!familleId) return { frequence: null, memos: {} };
  const [{ data: params }, { data: memosData }] = await Promise.all([
    supabase.from('parametres_parentaux').select('frequence_memos').eq('famille_id', familleId).maybeSingle(),
    supabase.from('memos_vocaux').select('categorie, audio_url').eq('famille_id', familleId),
  ]);
  const memos = { bonne_reponse: [], mauvaise_reponse: [], encouragement_fin: [] };
  (memosData ?? []).forEach((m) => {
    if (memos[m.categorie]) memos[m.categorie].push(m.audio_url);
  });
  return { frequence: params?.frequence_memos ?? null, memos };
}

// Joue un memo au hasard pour la categorie donnee, avec une probabilite de
// 1/frequence (donc en moyenne une fois toutes les "frequence" reponses,
// jamais systematiquement). Ne bloque jamais le jeu si ca echoue.
async function maybePlayMemo(memosConfig, categorie) {
  if (!memosConfig || !memosConfig.frequence) return;
  const pool = memosConfig.memos?.[categorie] ?? [];
  if (pool.length === 0) return;
  if (Math.random() >= 1 / memosConfig.frequence) return;
  try {
    const url = pool[Math.floor(Math.random() * pool.length)];
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch (e) {
    // Non bloquant : un memo qui ne joue pas ne doit jamais casser le jeu.
  }
}

// Laisse le parent choisir un fichier audio deja existant sur son telephone
// (enregistre avec n'importe quelle appli), l'upload et cree la ligne en base.
async function pickAndAddMemo(familleId, categorie) {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return false;
  const file = result.assets[0];
  const ext = (file.name?.split('.').pop() || 'm4a').toLowerCase();
  const path = `${familleId}/${categorie}/${Date.now()}.${ext}`;
  const { url } = await uploadFileToStorage('memos-vocaux', path, file.uri, file.mimeType || 'audio/mpeg');
  if (!url) return false;
  await supabase.from('memos_vocaux').insert({ famille_id: familleId, categorie, audio_url: url });
  return true;
}

async function playPreview(url) {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch (e) {
    // Non bloquant.
  }
}

function ModernApple({ size = 28, color = '#E5533D' }) {
  const s = size;
  return (
    <View style={{ width: s, height: s * 1.2 }}>
      <View
        style={{
          position: 'absolute', top: 0, left: s * 0.46, width: s * 0.09, height: s * 0.22,
          backgroundColor: '#7A5230', borderRadius: 2, transform: [{ rotate: '12deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute', top: s * 0.02, left: s * 0.52, width: s * 0.3, height: s * 0.18,
          backgroundColor: '#66BB6A', borderRadius: s * 0.14, transform: [{ rotate: '-20deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute', top: s * 0.2, width: s * 0.92, height: s * 0.85,
          borderRadius: s * 0.46, backgroundColor: color,
        }}
      >
        <View
          style={{
            position: 'absolute', top: s * 0.14, left: s * 0.16, width: s * 0.22, height: s * 0.3,
            borderRadius: s * 0.12, backgroundColor: 'rgba(255,255,255,0.35)',
          }}
        />
      </View>
    </View>
  );
}

function ModernAppleRow({ count, color, size = 26 }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 }}>
      {Array.from({ length: Math.max(0, count) }).map((_, i) => (
        <ModernApple key={i} size={size} color={color} />
      ))}
    </View>
  );
}

// Reserve d'objets a compter, variee (fruits, animaux, jouets, objets du
// quotidien) pour que ce ne soit pas toujours des pommes - tiree au hasard
// a chaque manche plutot que stockee en base, pour couvrir tout le contenu
// existant sans avoir a le retoucher.
const OBJETS_A_COMPTER = ['🍎', '🍓', '🍌', '🍇', '🍊', '⭐', '🎈', '🐝', '🐞', '🦋', '🐣', '🌸', '🍄', '🐚', '🎲', '🧩', '🚗', '🎁', '🦆', '🐟'];
function pickRandomObjet(seed) {
  // Un "seed" simple base sur les valeurs de la manche pour garder le meme
  // objet pendant toute la manche (pas de changement entre deux rendus).
  const idx = Math.abs(seed) % OBJETS_A_COMPTER.length;
  return OBJETS_A_COMPTER[idx];
}
function EmojiCountRow({ count, emoji, size = 30 }) {
  // Plus il y a d'objets a afficher, plus ils doivent etre petits pour ne
  // jamais deborder de l'ecran, meme dans un espace deja restreint (ex: les
  // deux groupes d'une comparaison cote a cote).
  const tailleAdaptee =
    count > 20 ? Math.min(size, 14) :
    count > 12 ? Math.min(size, 18) :
    count > 6 ? Math.min(size, 22) :
    size;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
      {Array.from({ length: Math.max(0, count) }).map((_, i) => (
        <Text key={i} style={{ fontSize: tailleAdaptee }}>{emoji}</Text>
      ))}
    </View>
  );
}

// Variante avec des objets-pieges melanges parmi ceux a compter (ex: des
// poires au milieu des pommes, qu'il ne faut PAS compter) - permet de
// varier une mecanique de comptage repetee sur plusieurs manches sans
// changer la question elle-meme. L'ordre est fige (useMemo) pour que les
// objets ne sautent pas de place a chaque re-rendu pendant que l'enfant
// compte.
function EmojiCountRowMixed({ count, emoji, distracteurCount, distracteurEmoji, size = 30 }) {
  const items = useMemo(() => {
    const arr = [
      ...Array.from({ length: Math.max(0, count) }, () => emoji),
      ...Array.from({ length: Math.max(0, distracteurCount ?? 0) }, () => distracteurEmoji),
    ];
    return shuffle(arr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, emoji, distracteurCount, distracteurEmoji]);
  const total = items.length;
  const tailleAdaptee =
    total > 20 ? Math.min(size, 14) :
    total > 12 ? Math.min(size, 18) :
    total > 6 ? Math.min(size, 22) :
    size;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
      {items.map((e, i) => (
        <Text key={i} style={{ fontSize: tailleAdaptee }}>{e}</Text>
      ))}
    </View>
  );
}

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

// Table de correspondance code -> photo reelle (assets locaux, requires
// statiques necessaires pour que Metro embarque bien chaque image).
const AVATAR_IMAGES = {
  fourmi: require('../assets/images/avatars/fourmi.webp'),
  coccinelle: require('../assets/images/avatars/coccinelle.webp'),
  papillon: require('../assets/images/avatars/papillon.webp'),
  abeille: require('../assets/images/avatars/abeille.webp'),
  escargot: require('../assets/images/avatars/escargot.webp'),
  ver_luisant: require('../assets/images/avatars/ver_luisant.webp'),
  sauterelle: require('../assets/images/avatars/sauterelle.webp'),
  libellule: require('../assets/images/avatars/libellule.webp'),
  scarabee: require('../assets/images/avatars/scarabee.webp'),
  grillon: require('../assets/images/avatars/grillon.webp'),
  souris: require('../assets/images/avatars/souris.webp'),
  mulot: require('../assets/images/avatars/mulot.webp'),
  musaraigne: require('../assets/images/avatars/musaraigne.webp'),
  grenouille: require('../assets/images/avatars/grenouille.webp'),
  crapaud: require('../assets/images/avatars/crapaud.webp'),
  lezard: require('../assets/images/avatars/lezard.webp'),
  tetard: require('../assets/images/avatars/tetard.webp'),
  campagnol: require('../assets/images/avatars/campagnol.webp'),
  chenille: require('../assets/images/avatars/chenille.webp'),
  criquet: require('../assets/images/avatars/criquet.webp'),
  herisson: require('../assets/images/avatars/herisson.webp'),
  taupe: require('../assets/images/avatars/taupe.webp'),
  ecureuil: require('../assets/images/avatars/ecureuil.webp'),
  tamia: require('../assets/images/avatars/tamia.webp'),
  chauve_souris: require('../assets/images/avatars/chauve_souris.webp'),
  belette: require('../assets/images/avatars/belette.webp'),
  furet: require('../assets/images/avatars/furet.webp'),
  putois: require('../assets/images/avatars/putois.webp'),
  rat_des_champs: require('../assets/images/avatars/rat_des_champs.webp'),
  loir: require('../assets/images/avatars/loir.webp'),
  geai: require('../assets/images/avatars/geai.webp'),
  pie: require('../assets/images/avatars/pie.webp'),
  corbeau: require('../assets/images/avatars/corbeau.webp'),
  faucon_crecerelle: require('../assets/images/avatars/faucon_crecerelle.webp'),
  chouette: require('../assets/images/avatars/chouette.webp'),
  heron: require('../assets/images/avatars/heron.webp'),
  cigogne: require('../assets/images/avatars/cigogne.webp'),
  pelican: require('../assets/images/avatars/pelican.webp'),
  perruche: require('../assets/images/avatars/perruche.webp'),
  toucan: require('../assets/images/avatars/toucan.webp'),
  martre: require('../assets/images/avatars/martre.webp'),
  fouine: require('../assets/images/avatars/fouine.webp'),
  mangouste: require('../assets/images/avatars/mangouste.webp'),
  suricate: require('../assets/images/avatars/suricate.webp'),
  blaireau: require('../assets/images/avatars/blaireau.webp'),
  genette: require('../assets/images/avatars/genette.webp'),
  chacal: require('../assets/images/avatars/chacal.webp'),
  ragondin: require('../assets/images/avatars/ragondin.webp'),
  loutre: require('../assets/images/avatars/loutre.webp'),
  ocelot: require('../assets/images/avatars/ocelot.webp'),
  gazelle: require('../assets/images/avatars/gazelle.webp'),
  impala: require('../assets/images/avatars/impala.webp'),
  antilope: require('../assets/images/avatars/antilope.webp'),
  springbok: require('../assets/images/avatars/springbok.webp'),
  zebre: require('../assets/images/avatars/zebre.webp'),
  gnou: require('../assets/images/avatars/gnou.webp'),
  autruche: require('../assets/images/avatars/autruche.webp'),
  phacochere: require('../assets/images/avatars/phacochere.webp'),
  sanglier: require('../assets/images/avatars/sanglier.webp'),
  chevre_de_montagne: require('../assets/images/avatars/chevre_de_montagne.webp'),
  lievre: require('../assets/images/avatars/lievre.webp'),
  renard_des_neiges: require('../assets/images/avatars/renard_des_neiges.webp'),
  coyote: require('../assets/images/avatars/coyote.webp'),
  lynx: require('../assets/images/avatars/lynx.webp'),
  caracal: require('../assets/images/avatars/caracal.webp'),
  chat_sauvage: require('../assets/images/avatars/chat_sauvage.webp'),
  guepard: require('../assets/images/avatars/guepard.webp'),
  loup: require('../assets/images/avatars/loup.webp'),
  puma: require('../assets/images/avatars/puma.webp'),
  panthere: require('../assets/images/avatars/panthere.webp'),
  cerf: require('../assets/images/avatars/cerf.webp'),
  elan: require('../assets/images/avatars/elan.webp'),
  wapiti: require('../assets/images/avatars/wapiti.webp'),
  bison: require('../assets/images/avatars/bison.webp'),
  buffle_d_afrique: require('../assets/images/avatars/buffle_d_afrique.webp'),
  hippopotame: require('../assets/images/avatars/hippopotame.webp'),
  chameau: require('../assets/images/avatars/chameau.webp'),
  yack: require('../assets/images/avatars/yack.webp'),
  girafe: require('../assets/images/avatars/girafe.webp'),
  rhinoceros_noir: require('../assets/images/avatars/rhinoceros_noir.webp'),
  ours_brun: require('../assets/images/avatars/ours_brun.webp'),
  ours_noir: require('../assets/images/avatars/ours_noir.webp'),
  gorille: require('../assets/images/avatars/gorille.webp'),
  chimpanze: require('../assets/images/avatars/chimpanze.webp'),
  jaguar: require('../assets/images/avatars/jaguar.webp'),
  leopard: require('../assets/images/avatars/leopard.webp'),
  tigre_du_bengale: require('../assets/images/avatars/tigre_du_bengale.webp'),
  crocodile_du_nil: require('../assets/images/avatars/crocodile_du_nil.webp'),
  python: require('../assets/images/avatars/python.webp'),
  aigle_royal: require('../assets/images/avatars/aigle_royal.webp'),
  ours_polaire: require('../assets/images/avatars/ours_polaire.webp'),
  rhinoceros_blanc: require('../assets/images/avatars/rhinoceros_blanc.webp'),
  gorille_des_montagnes: require('../assets/images/avatars/gorille_des_montagnes.webp'),
  elephant_de_foret: require('../assets/images/avatars/elephant_de_foret.webp'),
  elephant_de_savane: require('../assets/images/avatars/elephant_de_savane.webp'),
  panthere_des_neiges: require('../assets/images/avatars/panthere_des_neiges.webp'),
  tigre_de_siberie: require('../assets/images/avatars/tigre_de_siberie.webp'),
  grizzly_geant: require('../assets/images/avatars/grizzly_geant.webp'),
  lionne: require('../assets/images/avatars/lionne.webp'),
  lion: require('../assets/images/avatars/lion.webp'),
};

function avatarRankFor(niveauGlobal) {
  return Math.min(100, Math.max(1, Math.floor((niveauGlobal ?? 0) / 10) + 1));
}

function avatarLabelFor(niveauGlobal) {
  const a = AVATAR_CHAIN[avatarRankFor(niveauGlobal) - 1];
  return a.emoji + ' ' + a.name;
}

// Prefixe utilise pour reperer qu'un avatar_personnel n'est pas un simple
// emoji mais le code d'une photo-trophee deja gagnee (ex: 'trophee:renard').
const AVATAR_TROPHEE_PREFIX = 'trophee:';

// Affichage unifie de l'avatar d'un profil, quelle que soit sa nature :
// photo perso (photo_url), photo-trophee gagnee en jeu (avatar_personnel
// prefixe 'trophee:'), ou simple emoji (avatar_personnel classique).
// Centralise ici pour eviter de dupliquer cette logique a chaque endroit
// ou l'avatar d'un profil est affiche.
function ProfilAvatarDisplay({ profil, size = 48, style }) {
  if (profil?.photo_url) {
    return (
      <Image
        source={{ uri: profil.photo_url }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }
  const avatarPerso = profil?.avatar_personnel ?? '🐾';
  if (typeof avatarPerso === 'string' && avatarPerso.startsWith(AVATAR_TROPHEE_PREFIX)) {
    const code = avatarPerso.slice(AVATAR_TROPHEE_PREFIX.length);
    const source = AVATAR_IMAGES[code];
    if (source) {
      return (
        <Image
          source={source}
          style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        />
      );
    }
  }
  return <Text style={[{ fontSize: size * 0.7, textAlign: 'center' }, style]}>{avatarPerso}</Text>;
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
      // Le temps de jeu est propre a CHAQUE enfant (pas partage entre les
      // profils) : on relit toujours la valeur la plus fraiche du profil.
      const [parametres, profilFrais, seconds] = await Promise.all([
        getParametresParentaux(profil.famille_id),
        supabase.from('profils_enfants').select('minutes_max_jour').eq('id', profil.id).maybeSingle(),
        getTodayPlaySeconds(profil.id),
      ]);
      const minutes = profilFrais?.data?.minutes_max_jour ?? profil.minutes_max_jour ?? 30;
      const total = minutes * 60;
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

function TimeGaugeBar({ remainingSeconds, totalSeconds, compact }) {
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;
  if (compact) {
    return (
      <View style={styles.liveGaugeCompactRow}>
        <View style={styles.gaugeTrackCompact}>
          <View
            style={[
              styles.gaugeFill,
              { width: `${ratio * 100}%`, backgroundColor: gaugeColorFor(ratio) },
            ]}
          />
        </View>
        <Text style={styles.liveGaugeTextCompact}>⏳ {formatMinutesSeconds(remainingSeconds)}</Text>
      </View>
    );
  }
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

async function computeNextRung({ profil, miniJeuId, currentRung, erreursTotal, totalRounds, tempsMoyenParManche, maxRung }) {
  const effectiveMaxRung = maxRung ?? MAX_CONTENT_RUNG;
  const { data: existing } = await supabase
    .from('progression')
    .select('details, temps_reference_secondes, echecs_consecutifs')
    .eq('profil_id', profil.id)
    .eq('mini_jeu_id', miniJeuId)
    .maybeSingle();

  const oldStreak = existing?.details?.streak ?? 0;
  const reference = existing?.temps_reference_secondes ?? null;
  const oldEchecs = existing?.echecs_consecutifs ?? 0;
  const oldStreakRapideBon = existing?.details?.streakRapideBon ?? 0;
  const oldTempsMoyenHistorique = existing?.details?.tempsMoyenHistorique ?? null;
  const oldNbSessionsHistorique = existing?.details?.nbSessionsHistorique ?? 0;
  const oldDropStreak = existing?.details?.dropStreak ?? 0;
  let newStreak = 0;
  let newRung = currentRung;
  let newReference = reference;
  let newEchecs = 0;
  let newDropStreak = oldDropStreak;

  // Calibrage rapide : quand l'enfant enchaine les sessions parfaites (ex:
  // il a en realite 2 classes d'avance sur son niveau assigne), on saute de
  // plus en plus de crans d'un coup au lieu de toujours +1 - sinon il faut
  // des dizaines de manches triviales avant de trouver le vrai niveau ou
  // "ca coince", ce qui est decourageant pour rien. Meme logique inversee
  // quand l'enfant enchaine les vraies difficultes : on redescend de plus
  // en plus vite pour trouver le bon niveau au lieu de s'acharner cran par
  // cran. Des qu'une session casse la serie (ni parfaite, ni vraiment ratee),
  // on repart de zero des deux cotes : la "zone ou ca coince" est trouvee.
  const CALIBRAGE_JUMP_MAX = 6;
  function jumpFor(streakCount) {
    return Math.min(CALIBRAGE_JUMP_MAX, Math.pow(2, Math.max(0, streakCount - 1)));
  }

  // La vitesse n'est plus un critere qui bloque la montee de niveau : plus
  // le niveau grimpe, plus le contenu est difficile, donc plus il est normal
  // de repondre plus lentement meme en etant juste. Seul le zero faute compte.
  // Le temps de reference reste suivi (utile ailleurs), mais ne conditionne
  // plus jamais la progression.
  let raison;
  if (erreursTotal === 0) {
    // Session parfaite : la remontee s'accelere, quel que soit le temps mis.
    newStreak = oldStreak + 1;
    newDropStreak = 0; // une reussite claire = on n'est plus en train de chuter
    const jump = jumpFor(newStreak);
    newRung = Math.min(effectiveMaxRung, currentRung + jump);
    if (tempsMoyenParManche != null) {
      // Le temps de reference continue d'etre suivi a titre informatif.
      newReference = reference == null
        ? tempsMoyenParManche
        : Math.round((reference * 2 + tempsMoyenParManche) / 3);
    }
    raison = 'parfait_rapide';
  } else if (erreursTotal >= 3) {
    // Vraie difficulte rencontree : on laisse le temps de s'habituer au
    // niveau actuel plutot que de redescendre des le premier coup dur -
    // il faut 3 sessions en echec d'affilee avant de reculer d'un cran.
    newStreak = 0;
    const echecsCumules = oldEchecs + 1;
    if (echecsCumules >= 3) {
      newDropStreak = oldDropStreak + 1;
      const jump = jumpFor(newDropStreak);
      newRung = Math.max(1, currentRung - jump);
      newEchecs = 0;
      raison = 'erreurs_beaucoup';
    } else {
      newRung = currentRung;
      newEchecs = echecsCumules;
      raison = 'echec_protege';
    }
  } else {
    // Quelques erreurs, sans plus : on reste sur place, sans casser un futur enchainement.
    newStreak = 0;
    newDropStreak = 0; // zone stable trouvee, plus de calibrage accelere a partir d'ici
    newRung = currentRung;
    raison = 'erreurs_quelques';
  }

  // --- Detection "rapide + bon niveau" (precipitation par ennui) ---
  // Meme logique que pour computeStreakRung : on compare cette session a la
  // moyenne HISTORIQUE personnelle de l'enfant sur ce jeu, pas a un seuil
  // fixe. Ne s'applique que si la session n'etait pas deja parfaite (deja
  // gere ci-dessus) et n'a pas revele une vraie difficulte (erreursTotal
  // >= 3, deja gere ci-dessus non plus). Sert a distinguer un enfant qui va
  // vite par lassitude (peu d'erreurs, tres rapide par rapport a son
  // habitude) d'un enfant qui a besoin de ralentir.
  let newStreakRapideBon = oldStreakRapideBon;
  let newTempsMoyenHistorique = oldTempsMoyenHistorique;
  let newNbSessionsHistorique = oldNbSessionsHistorique;

  if (erreursTotal > 0 && erreursTotal < 3 && tempsMoyenParManche != null && totalRounds) {
    const tauxErreurs = erreursTotal / totalRounds;
    const assezRapide =
      oldTempsMoyenHistorique != null &&
      oldNbSessionsHistorique >= RAPIDE_ENNUI_MIN_SESSIONS_HISTORIQUE &&
      tempsMoyenParManche <= oldTempsMoyenHistorique * RAPIDE_ENNUI_SEUIL_VITESSE;
    if (assezRapide && tauxErreurs <= RAPIDE_ENNUI_RATIO_ERREURS_MAX) {
      newStreakRapideBon = oldStreakRapideBon + 1;
      if (newStreakRapideBon >= 2 && currentRung < effectiveMaxRung) {
        newRung = currentRung + 1;
        newStreakRapideBon = 0;
        raison = 'rapide_et_bon_deux_fois';
      } else {
        raison = 'rapide_et_bon_une_fois';
      }
    } else {
      newStreakRapideBon = 0;
    }
  } else if (erreursTotal === 0) {
    newStreakRapideBon = 0; // deja gere par le streak de reussites parfaites
  }

  if (tempsMoyenParManche != null) {
    if (newTempsMoyenHistorique == null) {
      newTempsMoyenHistorique = tempsMoyenParManche;
      newNbSessionsHistorique = 1;
    } else {
      const poids = Math.min(newNbSessionsHistorique, 20);
      newTempsMoyenHistorique = (newTempsMoyenHistorique * poids + tempsMoyenParManche) / (poids + 1);
      newNbSessionsHistorique = Math.min(newNbSessionsHistorique + 1, 20);
    }
  }

  const direction = newRung > currentRung ? 'up' : newRung < currentRung ? 'down' : 'same';
  return {
    newRung, newStreak, newReference, newEchecs, rungChanged: newRung !== currentRung, direction, raison,
    streakRapideBon: newStreakRapideBon,
    tempsMoyenHistorique: newTempsMoyenHistorique,
    nbSessionsHistorique: newNbSessionsHistorique,
    dropStreak: newDropStreak,
  };
}

// Verifie si TOUS les jeux "reels" (non-bonus) d'une zone ont atteint au
// moins 50% de leur plafond de niveau pour ce profil ; si oui et que ce
// n'est pas deja debloque, debloque definitivement le jeu bonus de cette
// zone. Appele apres chaque fin de session, quel que soit le jeu.
// Verifie l'avancement d'un profil sur tous les jeux "reels" (non-bonus)
// d'une zone, et debloque definitivement le jeu bonus quand le jeu le
// moins avance atteint 80% de son plafond. Retourne aussi le pourcentage
// (le plus bas parmi les jeux de la zone) pour piloter les seuils
// intermediaires : a 40%, on annonce qu'un jeu va bientot se debloquer ;
// a 60%, le jeu apparait deja verrouille sur la carte (voir SentierScreen,
// qui refait ce calcul cote affichage) ; a 80%, il se debloque pour de bon.
async function checkZoneBonusUnlock(profilId, miniJeuId, niveauDefaut) {
  try {
    const { data: jeu } = await supabase.from('mini_jeux').select('competence').eq('id', miniJeuId).maybeSingle();
    const competence = jeu?.competence;
    if (!competence) return { competence: null, percent: 0, unlocked: false, dejaDebloque: false };

    const { data: dejaDebloque } = await supabase
      .from('bonus_debloques')
      .select('zone_competence')
      .eq('profil_id', profilId)
      .eq('zone_competence', competence)
      .maybeSingle();

    const percent = await computeZoneProgressPercent(profilId, competence, niveauDefaut);
    if (dejaDebloque) return { competence, percent, unlocked: false, dejaDebloque: true };

    if (percent >= 0.8) {
      await supabase
        .from('bonus_debloques')
        .upsert({ profil_id: profilId, zone_competence: competence }, { onConflict: 'profil_id,zone_competence' });
      return { competence, percent, unlocked: true, dejaDebloque: false };
    }
    return { competence, percent, unlocked: false, dejaDebloque: false };
  } catch (e) {
    return { competence: null, percent: 0, unlocked: false, dejaDebloque: false };
  }
}

// Calcule le pourcentage d'avancement d'une zone pour un profil : le plus
// bas parmi tous les jeux "reels" (non-bonus) de la zone (celui qui traine
// determine quand la zone entiere est consideree comme prete).
//
// Le plafond utilise pour ce calcul n'est PAS le plafond absolu du jeu
// (qui peut aller jusqu'a fin CM2), mais la fin de l'annee scolaire EN
// COURS de l'enfant (niveau_defaut). Sans ca, un enfant de MS ou GS
// devrait quasiment finir tout le primaire avant de voir apparaitre un
// jeu bonus - ce qui prendrait des annees au lieu de quelques semaines ou
// mois, et perdrait tout effet motivant. Si l'enfant depasse ensuite son
// annee, il aura de toute facon deja debloque le jeu bien avant.
async function computeZoneProgressPercent(profilId, competence, niveauDefaut) {
  const { data: jeuxZone } = await supabase
    .from('mini_jeux')
    .select('id, code')
    .eq('competence', competence)
    .eq('est_bonus', false);
  if (!jeuxZone || jeuxZone.length === 0) return 0;

  const ids = jeuxZone.map((j) => j.id);
  const { data: progRows } = await supabase
    .from('progression')
    .select('mini_jeu_id, palier_actuel')
    .eq('profil_id', profilId)
    .in('mini_jeu_id', ids);
  const progByJeu = Object.fromEntries((progRows ?? []).map((r) => [r.mini_jeu_id, r.palier_actuel]));

  const plafondAnneeEnCours = rungFromGradeAndPalier(niveauDefaut ?? 'ms', 3);
  const pourcentages = jeuxZone.map((j) => {
    const palier = progByJeu[j.id] ?? 0;
    const maxJeu = ZONE_GAME_MAX_RUNG[j.code] ?? MAX_CONTENT_RUNG;
    const cible = Math.min(maxJeu, plafondAnneeEnCours);
    return Math.max(0, Math.min(1, palier / cible));
  });
  return Math.min(...pourcentages);
}

async function completeSession({ profil, miniJeuId, currentRung, erreursTotal, dureeSecondes, totalRounds, startedAt, tempsMoyenParManche, maxRung, precomputedRung }) {
  // Robustesse : quoi qu'il arrive (probleme reseau, ligne manquante...),
  // on ne laisse JAMAIS l'enfant bloque sur l'ecran de jeu. Chaque etape
  // est protegee individuellement pour que les suivantes puissent continuer.
  let newRung = currentRung;
  let newStreak = 0;
  let newReference = null;
  let newEchecs = 0;
  let rungChanged = false;
  let direction = 'same';
  let raison = 'erreurs_quelques';
  let newDetails = null;
  if (precomputedRung) {
    // Certains jeux (ex: Les Cachettes de Luma) ont leur propre regle de
    // progression et ont deja calcule le nouveau cran eux-memes : on saute
    // le calcul standard base sur computeNextRung.
    newRung = precomputedRung.newRung;
    rungChanged = newRung !== currentRung;
    direction = precomputedRung.direction ?? 'same';
    raison = precomputedRung.raison ?? 'erreurs_quelques';
    newDetails = precomputedRung.details ?? { streak: newStreak };
  } else {
    try {
      const result = await computeNextRung({
        profil, miniJeuId, currentRung, erreursTotal, totalRounds, tempsMoyenParManche, maxRung,
      });
      newRung = result.newRung;
      newStreak = result.newStreak;
      newReference = result.newReference;
      newEchecs = result.newEchecs;
      rungChanged = result.rungChanged;
      direction = result.direction;
      raison = result.raison;
      newDetails = {
        streak: newStreak,
        streakRapideBon: result.streakRapideBon,
        tempsMoyenHistorique: result.tempsMoyenHistorique,
        nbSessionsHistorique: result.nbSessionsHistorique,
        dropStreak: result.dropStreak,
      };
    } catch (e) {
      // On garde le cran actuel si le calcul echoue.
    }
  }

  try {
    await supabase
      .from('progression')
      .upsert(
        {
          profil_id: profil.id,
          mini_jeu_id: miniJeuId,
          palier_actuel: newRung,
          details: newDetails ?? { streak: newStreak },
          temps_reference_secondes: newReference,
          echecs_consecutifs: newEchecs,
        },
        { onConflict: 'profil_id,mini_jeu_id' }
      );
  } catch (e) {
    // Non bloquant : le cran ne sera pas sauvegarde cette fois, mais le jeu continue.
  }

  try {
    await supabase.from('sessions_jeu').insert({
      profil_id: profil.id,
      mini_jeu_id: miniJeuId,
      debut: new Date(startedAt).toISOString(),
      duree_secondes: dureeSecondes,
      manches_jouees: totalRounds,
      erreurs_total: erreursTotal,
    });
  } catch (e) {
    // Non bloquant : la session continue meme si l'historique n'est pas enregistre.
  }

  try {
    await supabase.from('jours_actifs').insert({
      profil_id: profil.id,
      date: new Date().toISOString().slice(0, 10),
    });
  } catch (e) {
    // Non bloquant.
  }

  let newNiveau = profil.niveau_global ?? 0;
  let previousRank = avatarRankFor(newNiveau);
  let newRank = previousRank;
  try {
    const { data: profilRow } = await supabase
      .from('profils_enfants')
      .select('niveau_global')
      .eq('id', profil.id)
      .maybeSingle();

    const previousNiveau = profilRow?.niveau_global ?? profil.niveau_global ?? 0;
    newNiveau = previousNiveau + 1;
    previousRank = avatarRankFor(previousNiveau);
    newRank = avatarRankFor(newNiveau);

    await supabase
      .from('profils_enfants')
      .update({ niveau_global: newNiveau })
      .eq('id', profil.id);
  } catch (e) {
    // Non bloquant : l'avatar/niveau global ne progresse pas cette fois, mais le jeu continue.
  }

  let reward = null;
  try {
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
  } catch (e) {
    // Non bloquant.
  }

  let ficheAnimal = null;
  const rankChanged = newRank !== previousRank;
  try {
    if (rankChanged) {
      const code = AVATAR_CHAIN[newRank - 1].code;
      const { data: fiche } = await supabase
        .from('fiches_animaux')
        .select('*')
        .eq('code', code)
        .maybeSingle();
      ficheAnimal = fiche ?? null;
    }
  } catch (e) {
    // Non bloquant.
  }

  let bonusZone = null;
  if (miniJeuId) {
    bonusZone = await checkZoneBonusUnlock(profil.id, miniJeuId, profil.niveau_defaut);
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
    raison,
    bonusZone,
  };
}

// Calcule la progression "2 reussites d'affilee" pour les jeux dont une
// session correspond a UNE activite complete plutot qu'a une serie de
// questions individuelles (Memory, Tri du Village, Puzzle du Moulin, la
// Frise du Temps, le Pont des Lettres) : une session terminee avec au
// plus 1 erreur compte comme une reussite ; 2 reussites d'affilee font
// monter d'un cran immediatement. Pas de mecanisme de descente ici (a la
// difference des Cachettes de Luma), pour rester simple et coherent avec
// le comportement deja existant du jeu Memory.
// PROTOTYPE (Pont des Lettres uniquement pour l'instant) : detection de la
// precipitation par ennui, distincte de l'incomprehension. On compare la
// duree moyenne de CETTE session a la moyenne HISTORIQUE personnelle de
// l'enfant sur ce jeu (pas un seuil fixe, pour s'adapter a chaque enfant et
// chaque jeu). Si la session est nettement plus rapide que son habitude ET
// que le nombre d'erreurs reste faible (sans etre "parfait"), on considere
// que l'enfant maitrise le contenu mais va vite par lassitude plutot que par
// difficulte. Deux sessions "rapide + bon niveau" d'affilee font monter le
// palier, exactement comme le streak de reussites parfaites existant - on
// evite de faire monter sur un seul coup de chance ou une session inhabituelle.
const RAPIDE_ENNUI_RATIO_ERREURS_MAX = 0.2; // jusqu'a 20% d'erreurs tolerees
const RAPIDE_ENNUI_SEUIL_VITESSE = 0.6; // session <= 60% du temps habituel
const RAPIDE_ENNUI_MIN_SESSIONS_HISTORIQUE = 3; // pas de comparaison fiable avant

async function computeStreakRung({
  profil, miniJeuId, currentRung, wasPerfect, maxRung,
  erreursTotal, totalRounds, dureeMoyenneManche,
}) {
  let prog = null;
  try {
    const { data } = await supabase
      .from('progression')
      .select('details')
      .eq('profil_id', profil.id)
      .eq('mini_jeu_id', miniJeuId)
      .maybeSingle();
    prog = data;
  } catch (e) {
    // Non bloquant : on part de zero si la lecture echoue.
  }
  const detailsPrec = prog?.details ?? {};

  let streakActuel = wasPerfect ? 1 : 0;
  if (wasPerfect) streakActuel = (detailsPrec.reussitesConsecutives ?? 0) + 1;

  // --- Detection "rapide + bon niveau" (precipitation par ennui) ---
  // Uniquement calculee si l'appelant fournit les infos de duree (pour
  // l'instant, seul Pont des Lettres le fait - les autres jeux continuent a
  // fonctionner exactement comme avant, sans regression).
  let streakRapideBonActuel = detailsPrec.streakRapideBon ?? 0;
  let tempsMoyenHistorique = detailsPrec.tempsMoyenHistorique ?? null;
  let nbSessionsHistorique = detailsPrec.nbSessionsHistorique ?? 0;
  let rapideBonCetteSession = false;

  if (!wasPerfect && dureeMoyenneManche != null && totalRounds) {
    const tauxErreurs = (erreursTotal ?? 0) / totalRounds;
    const assezRapide =
      tempsMoyenHistorique != null &&
      nbSessionsHistorique >= RAPIDE_ENNUI_MIN_SESSIONS_HISTORIQUE &&
      dureeMoyenneManche <= tempsMoyenHistorique * RAPIDE_ENNUI_SEUIL_VITESSE;
    if (assezRapide && tauxErreurs <= RAPIDE_ENNUI_RATIO_ERREURS_MAX) {
      rapideBonCetteSession = true;
      streakRapideBonActuel += 1;
    } else {
      streakRapideBonActuel = 0;
    }
  } else if (wasPerfect) {
    streakRapideBonActuel = 0; // deja gere par le streak de reussites parfaites
  }

  // Mise a jour de la moyenne historique (moyenne glissante, plafonnee a 20
  // sessions prises en compte pour rester adaptable si l'enfant progresse).
  if (dureeMoyenneManche != null) {
    if (tempsMoyenHistorique == null) {
      tempsMoyenHistorique = dureeMoyenneManche;
      nbSessionsHistorique = 1;
    } else {
      const poids = Math.min(nbSessionsHistorique, 20);
      tempsMoyenHistorique = (tempsMoyenHistorique * poids + dureeMoyenneManche) / (poids + 1);
      nbSessionsHistorique = Math.min(nbSessionsHistorique + 1, 20);
    }
  }

  let newRung = currentRung;
  let newStreak = streakActuel;
  let newStreakRapideBon = streakRapideBonActuel;
  let raison = 'encore_un_effort';

  // Meme calibrage rapide que pour les autres jeux (computeNextRung) : le
  // saut grandit avec les reussites parfaites enchainees (1, 2, 4, 6 max)
  // au lieu de toujours viser exactement 2 reussites pour +1 cran.
  const CALIBRAGE_JUMP_MAX = 6;
  function jumpFor(streakCount) {
    return Math.min(CALIBRAGE_JUMP_MAX, Math.pow(2, Math.max(0, streakCount - 1)));
  }

  if (streakActuel >= 1 && currentRung < maxRung) {
    const jump = jumpFor(streakActuel);
    newRung = Math.min(maxRung, currentRung + jump);
    raison = 'parfait_rapide';
    // newStreak n'est PAS remis a zero : tant que les reussites parfaites
    // s'enchainent, le prochain saut est plus grand.
  } else if (streakRapideBonActuel >= 2 && currentRung < maxRung) {
    newRung = currentRung + 1;
    newStreakRapideBon = 0;
    raison = 'rapide_et_bon_deux_fois';
  } else if (rapideBonCetteSession) {
    raison = 'rapide_et_bon_une_fois';
  }

  return {
    newRung,
    direction: newRung > currentRung ? 'up' : 'same',
    raison,
    details: {
      reussitesConsecutives: newStreak,
      streakRapideBon: newStreakRapideBon,
      tempsMoyenHistorique,
      nbSessionsHistorique,
    },
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
const MAX_CONTENT_RUNG = 21; // cm2, palier 3 (releve depuis 18/cm1 pour couvrir le contenu CM2)

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

// Plafonds de niveau par jeu, necessaires pour calculer le "50%" du
// systeme de deblocage des jeux bonus par zone - a completer au fur et a
// mesure qu'on ajoute des zones. Par defaut, on utilise MAX_CONTENT_RUNG
// pour les jeux non listes ici.
const ZONE_GAME_MAX_RUNG = {
  corps_humain: rungFromGradeAndPalier('ce2', 3),
};

// Lettre de niveau scolaire (A=MS, B=GS, C=CP, D=CE1, E=CE2, F=CM1, G=CM2)
// suivie du cran (1 a 3), pour un reperage visuel rapide sur la carte -
// ex: "A-2" = Moyenne Section, cran 2.
const NIVEAU_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
function letterCranFromRung(rung) {
  const { niveau, palier } = gradeAndPalierFromRung(rung);
  const idx = GRADE_ORDER.indexOf(niveau);
  const letter = NIVEAU_LETTERS[idx] ?? '?';
  return `${letter}-${palier}`;
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

// Pool des avatars de securite (distincts des animaux ci-dessus et de la
// chaine de progression AVATAR_CHAIN) : formes et objets colores simples,
// utilises uniquement pour la verification d'identite au lancement de
// l'app. 30 au total.
const SECURITY_AVATARS = [
  '⭐', '🌙', '☀️', '🌈', '☂️', '🎈', '🎁', '🎀', '🔑', '🎲',
  '🧩', '🎯', '🚀', '⚽', '🏀', '🎾', '🎨', '🎵', '🔔', '🧸',
  '🪁', '🍭', '🍬', '🍩', '🎪', '🎡', '🎠', '🧃', '🧊', '🚂',
];

// Petite fenetre pour choisir un avatar du jeu (utilisee a la creation
// et pour changer la photo d'un profil existant).
// Petite fenetre pour choisir un avatar du jeu (utilisee a la creation
// et pour changer la photo d'un profil existant). Si un profil est fourni,
// propose en plus les photos-trophees deja gagnees par l'enfant (chaine
// AVATAR_CHAIN jusqu'a son rang actuel), en plus des emojis generiques.
function AvatarPickerModal({ visible, onClose, onPick, profil }) {
  const [trophees, setTrophees] = useState([]);

  useEffect(() => {
    if (!visible || !profil) { setTrophees([]); return; }
    const rank = avatarRankFor(profil.niveau_global ?? 0);
    setTrophees(AVATAR_CHAIN.slice(0, rank).reverse()); // le plus recent en premier
  }, [visible, profil]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choisir un avatar</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {trophees.length > 0 && (
              <>
                <Text style={styles.avatarPickerSectionTitle}>🏆 Mes trophées gagnés</Text>
                <View style={styles.avatarGrid}>
                  {trophees.map((a) => (
                    <Pressable
                      key={a.code}
                      style={styles.avatarTile}
                      onPress={() => {
                        onPick(AVATAR_TROPHEE_PREFIX + a.code);
                        onClose();
                      }}
                    >
                      <Image source={AVATAR_IMAGES[a.code]} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.avatarPickerSectionTitle}>Avatars simples</Text>
              </>
            )}
            <View style={styles.avatarGrid}>
              {AVATAR_CHOICES.map((a) => (
                <Pressable
                  key={a}
                  style={styles.avatarTile}
                  onPress={() => {
                    onPick(a);
                    onClose();
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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
// ============================================================
// Ecran : verification de l'avatar de securite (juste apres avoir
// touche un profil, avant d'entrer dans la carte). Objectif : eviter
// qu'un enfant tombe par erreur sur le profil d'un frere/soeur, ou
// reprenne seul l'app pendant une pause imposee. Entierement vocal.
// ============================================================
function SecurityAvatarCheckScreen({ route, navigation }) {
  const { profil } = route.params;
  const [checking, setChecking] = useState(true);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [attempt, setAttempt] = useState(1); // essai en cours : 1, 2 ou 3
  const [choices, setChoices] = useState([]);
  const [showGate, setShowGate] = useState(false);
  const [expectedPin, setExpectedPin] = useState(null);
  const remainingLockSeconds = useLiveCountdown(
    lockedUntil ? Math.max(0, Math.round((new Date(lockedUntil) - Date.now()) / 1000)) : 0
  );

  function buildChoices() {
    const decoys = shuffle(SECURITY_AVATARS.filter((a) => a !== profil.avatar_securite)).slice(0, 9);
    return shuffle([profil.avatar_securite, ...decoys]);
  }

  useEffect(() => {
    (async () => {
      const { data: fresh } = await supabase
        .from('profils_enfants')
        .select('verif_locked_until')
        .eq('id', profil.id)
        .maybeSingle();
      const until = fresh?.verif_locked_until;
      if (until && new Date(until) > new Date()) {
        setLockedUntil(until);
      } else {
        setChoices(buildChoices());
        speakSmart(`${speechFriendlyName(profil.prenom)}, retrouve ton avatar secret !`);
      }
      setChecking(false);
      getParametresParentaux(profil.famille_id).then((p) => setExpectedPin(p?.code_validation ?? null));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lockProfile() {
    const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from('profils_enfants').update({ verif_locked_until: until }).eq('id', profil.id);
    setLockedUntil(until);
    speakSmart("C'est bloqué pour un petit moment. Va voir un adulte si tu as besoin d'aide.");
  }

  function onPick(emoji) {
    if (emoji === profil.avatar_securite) {
      speakSmart("Bravo, c'est bien toi !");
      navigation.replace('WorldMap', { profil });
      return;
    }
    if (attempt >= 3) {
      lockProfile();
      return;
    }
    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);
    setChoices(buildChoices());
    if (nextAttempt === 3) {
      speakSmart("Attention, c'est ta dernière chance !");
    } else {
      speakSmart("Ce n'est pas celui-là, essaie encore.");
    }
  }

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  if (lockedUntil) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', paddingHorizontal: 24 }}>
          Profil bloqué pour l'instant
        </Text>
        {remainingLockSeconds > 0 ? (
          <Text style={{ marginTop: 8, color: colors.ink, opacity: 0.7 }}>
            Réessaie dans {formatMinutesSeconds(remainingLockSeconds)}
          </Text>
        ) : (
          <Pressable
            style={[styles.button, { marginTop: 16 }]}
            onPress={async () => {
              setLockedUntil(null);
              setAttempt(1);
              setChoices(buildChoices());
            }}
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
        )}
        <Pressable style={{ marginTop: 20 }} onPress={() => setShowGate(true)}>
          <Text style={{ color: colors.ink, opacity: 0.6, fontWeight: '600' }}>👪 Je suis un parent</Text>
        </Pressable>
        <Pressable style={{ marginTop: 14 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.ink, opacity: 0.5 }}>‹ Retour aux profils</Text>
        </Pressable>

        <ParentGateModal
          visible={showGate}
          expectedPin={expectedPin}
          skipTimeStep
          onCancel={() => setShowGate(false)}
          onSuccess={async () => {
            await supabase.from('profils_enfants').update({ verif_locked_until: null }).eq('id', profil.id);
            setShowGate(false);
            setLockedUntil(null);
            setAttempt(1);
            setChoices(buildChoices());
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <BouncingWrap><Luma size={64} /></BouncingWrap>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 }}>
        Retrouve ton avatar secret !
      </Text>
      <Pressable
        style={[styles.listenButton, { marginTop: 10 }]}
        onPress={() => speakSmart(`${speechFriendlyName(profil.prenom)}, retrouve ton avatar secret !`)}
      >
        <Text style={styles.listenText}>🎤 Réécouter</Text>
      </Pressable>

      <View style={[styles.avatarGrid, { marginTop: 20, paddingHorizontal: 16 }]}>
        {choices.map((a, i) => (
          <Pressable key={i} style={styles.avatarTile} onPress={() => onPick(a)}>
            <Text style={{ fontSize: 26 }}>{a}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}


// ============================================================
// Ecran : configuration de l'avatar de securite pour un profil qui
// n'en a pas encore (cree avant l'ajout de cette fonctionnalite).
// Propose une seule fois, la premiere fois que ce profil est touche ;
// une fois choisi, on enchaine directement sur la carte (pas besoin de
// revalider tout de suite, l'enfant vient de le choisir lui-meme).
// ============================================================
function SecurityAvatarSetupScreen({ route, navigation }) {
  const { profil } = route.params;
  const [choices] = useState(() => shuffle(SECURITY_AVATARS).slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    speakSmart(`${speechFriendlyName(profil.prenom)}, choisis ton avatar secret ! Tu devras le retrouver à chaque fois que tu ouvres l'application.`);
  }, []);

  async function onPick(emoji) {
    if (saving) return;
    setSaving(true);
    await supabase.from('profils_enfants').update({ avatar_securite: emoji }).eq('id', profil.id);
    navigation.replace('WorldMap', { profil: { ...profil, avatar_securite: emoji } });
  }

  return (
    <View style={styles.center}>
      <BouncingWrap><Luma size={64} /></BouncingWrap>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 }}>
        Choisis ton avatar secret !
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink, opacity: 0.6, textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
        Tu devras le retrouver à chaque fois que tu ouvres l'application.
      </Text>
      <Pressable
        style={[styles.listenButton, { marginTop: 10 }]}
        onPress={() => speakSmart(`${speechFriendlyName(profil.prenom)}, choisis ton avatar secret !`)}
      >
        <Text style={styles.listenText}>🎤 Réécouter</Text>
      </Pressable>

      <View style={[styles.avatarGrid, { marginTop: 20, paddingHorizontal: 16, opacity: saving ? 0.5 : 1 }]}>
        {choices.map((a) => (
          <Pressable key={a} style={styles.avatarTile} onPress={() => onPick(a)} disabled={saving}>
            <Text style={{ fontSize: 26 }}>{a}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}


function ProfileSelectScreen({ navigation }) {
  const [profils, setProfils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familleId, setFamilleId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [avatarPickerFor, setAvatarPickerFor] = useState(null);
  const [expectedPin, setExpectedPin] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null); // { profilId, choix } en attente du code parent

  useEffect(() => {
    if (!familleId) return;
    (async () => {
      const parametres = await getParametresParentaux(familleId);
      setExpectedPin(parametres?.code_validation ?? null);
    })();
  }, [familleId]);

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

  async function handleEditPhoto(profilId) {
    const choix = await choosePhotoSource();
    if (!choix) return;
    if (choix === '__AVATAR__') {
      setAvatarPickerFor(profilId);
      return;
    }
    // Une photo du telephone (galerie ou appareil photo) passe toujours par
    // le code parent avant d'etre enregistree - jamais accessible librement
    // a l'enfant, contrairement aux avatars du jeu.
    setPendingPhoto({ profilId, choix });
  }

  async function uploadPendingPhoto() {
    if (!pendingPhoto) return;
    const { profilId, choix } = pendingPhoto;
    setPendingPhoto(null);
    // On ajoute un suffixe different a chaque fois (au lieu d'un nom de
    // fichier toujours identique) pour eviter tout souci de remplacement
    // silencieux d'une photo par une autre.
    const { url, error } = await uploadFileToStorage('profil-photos', `${profilId}-${Date.now()}.jpg`, choix, 'image/jpeg');
    if (url) {
      await supabase.from('profils_enfants').update({ photo_url: url }).eq('id', profilId);
      await loadProfils();
    } else {
      Alert.alert('Photo non enregistrée', `La photo n'a pas pu être envoyée.${error ? ` (${error})` : ''} Vérifiez la connexion internet et réessayez.`);
    }
  }

  async function handlePickAvatar(profilId, emoji) {
    await supabase
      .from('profils_enfants')
      .update({ avatar_personnel: emoji, photo_url: null })
      .eq('id', profilId);
    loadProfils();
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
            onPress={() => navigation.navigate(
              item.avatar_securite ? 'SecurityAvatarCheck' : 'SecurityAvatarSetup',
              { profil: item }
            )}
          >
            <Pressable
              style={styles.avatarCircle}
              onPress={() => handleEditPhoto(item.id)}
            >
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.avatarPhoto} />
              ) : (
                <ProfilAvatarDisplay profil={item} size={48} style={styles.avatarEmoji} />
              )}
              <View style={styles.avatarEditBadge}>
                <Text style={{ fontSize: 10 }}>📷</Text>
              </View>
            </Pressable>
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

      {familleId && (
        <Pressable
          style={styles.parentButtonInline}
          onPress={() => navigation.navigate('ReglagesParentaux', { familleId })}
        >
          <Text style={styles.parentButtonSmallText}>P</Text>
        </Pressable>
      )}

      <Pressable style={styles.addCard} onPress={() => setShowAddModal(true)}>
        <Text style={styles.addPlus}>＋</Text>
        <Text style={styles.addText}>Ajouter un profil</Text>
      </Pressable>

      <Text style={styles.versionTag}>v. {APP_BUILD_VERSION}</Text>

      <AddProfileModal
        visible={showAddModal}
        familleId={familleId}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          setShowAddModal(false);
          loadProfils();
        }}
      />

      <AvatarPickerModal
        visible={avatarPickerFor != null}
        onClose={() => setAvatarPickerFor(null)}
        onPick={(emoji) => handlePickAvatar(avatarPickerFor, emoji)}
        profil={profils.find((p) => p.id === avatarPickerFor)}
      />

      <ParentGateModal
        visible={pendingPhoto != null}
        expectedPin={expectedPin}
        skipTimeStep
        onCancel={() => setPendingPhoto(null)}
        onSuccess={uploadPendingPhoto}
      />
    </View>
  );
}

function ParentGateModal({ visible, expectedPin, onSuccess, onCancel, skipTimeStep }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [checkingHardware, setCheckingHardware] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [step, setStep] = useState('auth'); // 'auth' -> 'temps'
  const [extraMinutes, setExtraMinutes] = useState(15);

  useEffect(() => {
    if (!visible) {
      setPin('');
      setError(null);
      setCheckingHardware(true);
      setStep('auth');
      setExtraMinutes(15);
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
        disableDeviceFallback: true, // jamais le schema/code de deverrouillage du telephone
      });
      if (result.success) {
        if (skipTimeStep) onSuccess();
        else setStep('temps');
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
      if (skipTimeStep) onSuccess();
      else setStep('temps');
    } else {
      setError('Code incorrect.');
      setPin('');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {step === 'auth' && (
            <>
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
            </>
          )}

          {step === 'temps' && (
            <>
              <Text style={styles.modalTitle}>⏳ Combien de temps ?</Text>
              <Text style={{ marginBottom: 14, color: colors.ink, textAlign: 'center' }}>
                Ajoute du temps de jeu pour la suite de la journée.
              </Text>
              <View style={styles.gaugeRow}>
                <Pressable
                  style={styles.gaugeButton}
                  onPress={() => setExtraMinutes((m) => Math.max(5, m - 5))}
                >
                  <Text style={styles.gaugeButtonText}>−</Text>
                </Pressable>
                <View style={styles.gaugeTrack}>
                  <View
                    style={[
                      styles.gaugeFill,
                      { width: `${Math.min(100, (extraMinutes / 120) * 100)}%` },
                    ]}
                  />
                </View>
                <Pressable
                  style={styles.gaugeButton}
                  onPress={() => setExtraMinutes((m) => Math.min(120, m + 5))}
                >
                  <Text style={styles.gaugeButtonText}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.gaugeValue}>{extraMinutes} minutes de plus</Text>

              <Pressable style={styles.button} onPress={() => onSuccess(extraMinutes)}>
                <Text style={styles.buttonText}>Ajouter ce temps</Text>
              </Pressable>
              <Pressable onPress={onCancel}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function AddProfileModal({ visible, familleId, onClose, onCreated }) {
  const [prenom, setPrenom] = useState('');
  const [niveau, setNiveau] = useState('gs');
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);
  // 10 avatars de securite tires au hasard, proposes une seule fois a la
  // creation du profil - l'enfant choisit celui qu'il reconnaitra a chaque
  // lancement de l'app.
  const [securityChoices] = useState(() => shuffle(SECURITY_AVATARS).slice(0, 10));
  const [securityAvatar, setSecurityAvatar] = useState(null);

  async function handleChoosePhoto() {
    const choix = await choosePhotoSource();
    if (!choix) return;
    if (choix === '__AVATAR__') {
      setPhotoUri(null); // laisse la grille d'avatars juste en dessous decider
      return;
    }
    setPhotoUri(choix);
  }

  async function handleCreate() {
    if (!familleId || !prenom.trim() || !securityAvatar) return;
    setSaving(true);
    const { data: inserted } = await supabase
      .from('profils_enfants')
      .insert({
        famille_id: familleId,
        prenom: prenom.trim(),
        niveau_defaut: niveau,
        avatar_personnel: avatar,
        avatar_securite: securityAvatar,
        niveau_global: 0,
      })
      .select('id')
      .single();

    if (inserted && photoUri) {
      const { url, error } = await uploadFileToStorage(
        'profil-photos', `${inserted.id}-${Date.now()}.jpg`, photoUri, 'image/jpeg'
      );
      if (url) {
        await supabase.from('profils_enfants').update({ photo_url: url }).eq('id', inserted.id);
      } else {
        Alert.alert('Photo non enregistrée', `Le profil est bien créé, mais la photo n'a pas pu être envoyée.${error ? ` (${error})` : ''} Vous pourrez réessayer depuis l'écran des profils.`);
      }
    }

    setSaving(false);
    setPrenom('');
    setPhotoUri(null);
    setSecurityAvatar(null);
    onCreated();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Nouveau profil</Text>

          <Pressable style={styles.photoPickerCircle} onPress={handleChoosePhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPickerImage} />
            ) : (
              <Text style={{ fontSize: 28 }}>📷</Text>
            )}
          </Pressable>
          <Text style={styles.photoPickerHint}>
            {photoUri ? 'Toucher pour changer la photo' : 'Photo (facultatif)'}
          </Text>

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

          <Text style={styles.label}>Avatar secret (pour se reconnaître à chaque lancement)</Text>
          <Text style={{ fontSize: 12, color: colors.ink, opacity: 0.6, marginBottom: 8 }}>
            L'enfant devra le retrouver à chaque ouverture de l'app.
          </Text>
          <View style={styles.avatarGrid}>
            {securityChoices.map((a) => (
              <Pressable
                key={a}
                style={[styles.avatarTile, securityAvatar === a && styles.avatarTileSelected]}
                onPress={() => setSecurityAvatar(a)}
              >
                <Text style={{ fontSize: 22 }}>{a}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.button, { opacity: saving || !prenom.trim() || !securityAvatar ? 0.5 : 1 }]}
            onPress={handleCreate}
            disabled={saving || !prenom.trim() || !securityAvatar}
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
  memoire_etoiles: '⭐',
  coffre_souvenirs: '🧰',
  puzzle_moulin: '🧩',
  tri_village: '🗂️',
  empreintes_clairiere: '🐾',
  jeu_intrus: '🔍',
  cachettes_luma: '🗺️',
  balance_prairie: '⚖️',
  marche_village: '💰',
  monde_capitales: '🌍',
  frise_temps: '📜',
  corps_humain: '🫀',
  ronde_lucioles: '🎧',
  indices_jardin: '🕵️',
  labyrinthe_grotte: '🌀',
  chemin_dizaines: '🌾',
  barres_luma: '📏',
};
const GAME_SCREENS = {
  pont_des_lettres: 'PontDesLettres',
  sons_magiques: 'SonsMagiques',
  pommes_de_luma: 'PommesDeLuma',
  memoire_etoiles: 'MemoireEtoiles',
  coffre_souvenirs: 'CoffreSouvenirs',
  monde_capitales: 'MondeCapitales',
  jeu_intrus: 'JeuIntrus',
  empreintes_clairiere: 'EmpreintesClairiere',
  balance_prairie: 'BalancePrairie',
  marche_village: 'MarcheVillage',
  cachettes_luma: 'CachettesLuma',
  ronde_lucioles: 'RondeLucioles',
  tri_village: 'TriVillage',
  puzzle_moulin: 'PuzzleMoulin',
  frise_temps: 'FriseTemps',
  corps_humain: 'CorpsHumain',
  indices_jardin: 'IndicesJardin',
  labyrinthe_grotte: 'LabyrintheGrotte',
  chemin_dizaines: 'CheminDizaines',
  barres_luma: 'BarresLuma',
};

// Plafond de progression (en "crans") pour chaque jeu — sert a afficher une
// jauge de 0 a 10 fidele a l'avancement reel de l'enfant sur CE jeu precis.
// Palette de couleurs pastel et petites variations de forme pour que les
// cartes de jeu, sous l'illustration du theme, soient plus vivantes qu'un
// simple bloc blanc repete - toujours assez clair pour garder le texte
// bien lisible.
const CARD_COLORS = ['#FFE0B2', '#B3E5FC', '#C8E6C9', '#F8BBD0', '#D1C4E9', '#FFF9C4', '#B2DFDB', '#FFCCBC'];
const CARD_SHAPES = [
  { borderRadius: 16 },
  { borderRadius: 30 },
  { borderTopLeftRadius: 30, borderTopRightRadius: 10, borderBottomLeftRadius: 10, borderBottomRightRadius: 30 },
  { borderTopLeftRadius: 10, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 10 },
];
function cardStyleForIndex(index) {
  return {
    backgroundColor: CARD_COLORS[index % CARD_COLORS.length],
    ...CARD_SHAPES[index % CARD_SHAPES.length],
  };
}

const GAME_MAX_RUNG_15 = new Set([
  // Tous les jeux ont desormais leur contenu jusqu'au CM2.
]);
function maxRungForGame(code) {
  return GAME_MAX_RUNG_15.has(code) ? rungFromGradeAndPalier('ce2', 3) : MAX_CONTENT_RUNG;
}

// Jauge de progression affichee sur chaque carte de jeu, pour que l'enfant
// (et le parent) voie ou il en est avant meme de cliquer - calculee par
// rapport au MAXIMUM ABSOLU du jeu (pas l'annee en cours), pour rester
// juste meme quand un enfant depasse largement sa classe grace au
// calibrage rapide. De petits traits marquent les frontieres entre
// classes (fin MS, fin GS, fin CP...), pour se reperer d'un coup d'oeil
// sur le niveau scolaire atteint, pas seulement un pourcentage abstrait.
const GAUGE_LARGEUR = 82;
const GAUGE_HAUTEUR = 7;
function ProgressionGauge({ rung, code }) {
  const maxAbsolu = maxRungForGame(code);
  const fraction = Math.max(0, Math.min(1, rung / Math.max(1, maxAbsolu)));
  // Frontieres de classe (fin de chaque niveau scolaire) a l'interieur de
  // la plage du jeu - jamais la toute derniere (c'est la fin de la jauge
  // elle-meme, pas la peine d'un trait dessus).
  const frontieres = GRADE_ORDER
    .map((_, i) => (i + 1) * 3)
    .filter((f) => f < maxAbsolu);

  return (
    <View style={{ width: GAUGE_LARGEUR, height: GAUGE_HAUTEUR, borderRadius: GAUGE_HAUTEUR / 2, backgroundColor: 'rgba(0,0,0,0.12)', marginTop: 3, marginBottom: 3, overflow: 'hidden' }}>
      <View style={{ width: `${fraction * 100}%`, height: '100%', backgroundColor: colors.mossDeep, borderRadius: GAUGE_HAUTEUR / 2 }} />
      {frontieres.map((f) => (
        <View
          key={f}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: `${(f / maxAbsolu) * 100}%`,
            width: 1, backgroundColor: 'rgba(255,255,255,0.85)',
          }}
        />
      ))}
    </View>
  );
}

// ============================================================
// Les 7 continents — un univers thematique par competence, pour
// naviguer en 2 clics : continent, puis jeu (pays).
// ============================================================
const CONTINENTS = [
  {
    competence: 'lecture',
    zone: { left: 0.5, top: 0.6361, width: 0.5, height: 0.2136 },
    labelCourt: 'Lecture',
    paysSlotsFor: { 'pont_des_lettres': { top: '58%', left: '30%' }, 'sons_magiques': { top: '58%', left: '70%' } },
    paysVides: [{ top: '82%', left: '30%' }, { top: '82%', left: '70%' }],
    blobStyle: { borderTopLeftRadius: 120, borderTopRightRadius: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 140 }, rot: -3,
    nom: 'La Clairière des Histoires',
    emoji: '🏞️',
    bg: '#E4F3DA',
    bgVif: '#BFE3A8',
    decor: [
      { emoji: '🦋', top: 190, left: '15%', duration: 3600, vertical: true },
      { emoji: '🦋', top: 210, left: '65%', duration: 3200, delay: 400, vertical: true },
      { emoji: '🐝', top: 130, left: '25%', duration: 2600 },
      { emoji: '🌸', top: 150, left: '75%', duration: 5000, vertical: true },
      { emoji: '🍃', top: 170, left: '45%', duration: 5000 },
    ],
  },
  {
    competence: 'maths',
    zone: { left: 0.5, top: 0.3166, width: 0.5, height: 0.2136 },
    labelCourt: 'Maths',
    paysSlotsFor: { 'pommes_de_luma': { top: '45%', left: '17%' }, 'balance_prairie': { top: '45%', left: '83%' }, 'marche_village': { top: '75%', left: '17%' }, 'cachettes_luma': { top: '75%', left: '83%' }, 'barres_luma': { top: '90%', left: '50%' } },
    paysVides: [],
    blobStyle: { borderTopLeftRadius: 20, borderTopRightRadius: 110, borderBottomLeftRadius: 130, borderBottomRightRadius: 30 }, rot: 2,
    nom: 'Le Bois des Nombres',
    emoji: '🌲',
    bg: '#E8DCC8',
    bgVif: '#C9A876',
    decor: [
      { emoji: '🐿️', top: 140, left: '20%', duration: 3400 },
      { emoji: '🍂', top: 170, left: '65%', duration: 5200, vertical: true },
      { emoji: '🦔', top: 215, left: '45%', duration: 3800 },
      { emoji: '🌰', top: 155, left: '30%', duration: 4400, vertical: true },
    ],
  },
  {
    competence: 'logique',
    zone: { left: 0.0, top: 0.6361, width: 0.5, height: 0.2136 },
    labelCourt: 'Logique',
    paysSlotsFor: { 'jeu_intrus': { top: '52%', left: '17%' }, 'empreintes_clairiere': { top: '52%', left: '83%' }, 'puzzle_moulin': { top: '73%', left: '17%' }, 'tri_village': { top: '73%', left: '83%' }, 'labyrinthe_grotte': { top: '83%', left: '50%' } },
    paysVides: [],
    blobStyle: { borderTopLeftRadius: 90, borderTopRightRadius: 20, borderBottomLeftRadius: 100, borderBottomRightRadius: 90 }, rot: -5,
    nom: 'La Grotte des Énigmes',
    emoji: '🌲',
    bg: '#DCD3E8',
    bgVif: '#A896C4',
    decor: [
      { emoji: '💎', top: 140, left: '50%', duration: 4200, vertical: true },
      { emoji: '💎', top: 195, left: '20%', duration: 4600, vertical: true },
      { emoji: '🦇', top: 130, left: '70%', duration: 2600 },
      { emoji: '🕷️', top: 220, left: '40%', duration: 3600, vertical: true },
    ],
  },
  {
    competence: 'memoire',
    zone: { left: 0.5, top: 0.0503, width: 0.5, height: 0.2136 },
    labelCourt: 'Mémoire',
    paysSlotsFor: { 'memoire_etoiles': { top: '72%', left: '25%' }, 'coffre_souvenirs': { top: '72%', left: '75%' }, 'ronde_lucioles': { top: '83%', left: '50%' } },
    paysVides: [{ top: '18%', left: '80%' }],
    blobStyle: { borderTopLeftRadius: 100, borderTopRightRadius: 100, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }, rot: 4,
    nom: 'La Cabane aux Souvenirs',
    emoji: '🏡',
    bg: '#F5E1C8',
    bgVif: '#E0B888',
    decor: [
      { emoji: '🕯️', top: 130, left: '20%', duration: 2200, vertical: true },
      { emoji: '📖', top: 120, left: '60%', duration: 4600 },
      { emoji: '🧸', top: 215, left: '35%', duration: 3800 },
      { emoji: '🫙', top: 155, left: '80%', duration: 5200, vertical: true },
    ],
  },
  {
    competence: 'geographie',
    zone: { left: 0.0, top: 0.071, width: 0.5, height: 0.2136 },
    labelCourt: 'Géographie',
    paysSlotsFor: { 'monde_capitales': { top: '55%', left: '50%' } },
    paysVides: [{ top: '40%', left: '25%' }, { top: '78%', left: '65%' }, { top: '68%', left: '20%' }],
    blobStyle: { borderTopLeftRadius: 110, borderTopRightRadius: 130, borderBottomLeftRadius: 110, borderBottomRightRadius: 90 }, rot: -2,
    nom: 'La Rivière du Monde',
    emoji: '🌊',
    bg: '#DFF1FB',
    bgVif: '#A6D9F2',
    decor: [
      { emoji: '🐟', top: 145, left: '55%', duration: 3200 },
      { emoji: '🐸', top: 200, left: '20%', duration: 3400, vertical: true },
      { emoji: '🦆', top: 210, left: '70%', duration: 3800 },
      { emoji: '💧', top: 160, left: '15%', duration: 2400, vertical: true },
    ],
  },
  {
    competence: 'histoire',
    zone: { left: 0.12, top: 0.718, width: 0.66, height: 0.282 },
    labelCourt: 'Histoire',
    paysSlotsFor: { 'frise_temps': { top: '66%', left: '78%' } },
    paysVides: [],
    blobStyle: { borderTopLeftRadius: 40, borderTopRightRadius: 140, borderBottomLeftRadius: 120, borderBottomRightRadius: 30 }, rot: 3,
    nom: 'Le Vieux Chêne du Temps',
    emoji: '🌳',
    bg: '#F0DFC0',
    bgVif: '#D4A868',
    decor: [
      { emoji: '🍁', top: 65, left: '75%', duration: 5200, vertical: true },
      { emoji: '🐿️', top: 95, left: '25%', duration: 3600 },
      { emoji: '🍂', top: 100, left: '55%', duration: 4600, vertical: true },
      { emoji: '🪱', top: 85, left: '10%', duration: 3200 },
    ],
  },
  {
    competence: 'sciences',
    zone: { left: 0.0, top: 0.3521, width: 0.5, height: 0.2136 },
    labelCourt: 'Sciences',
    paysSlotsFor: { 'corps_humain': { top: '58%', left: '35%' } },
    paysVides: [{ top: '74%', left: '50%' }, { top: '25%', left: '22%' }, { top: '25%', left: '75%' }],
    blobStyle: { borderTopLeftRadius: 130, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 120 }, rot: -4,
    nom: 'Le Jardin Vivant',
    emoji: '🌿',
    bg: '#E6F3DE',
    bgVif: '#B4DE9B',
    decor: [
      { emoji: '🐞', top: 140, left: '70%', duration: 3400 },
      { emoji: '🦋', top: 220, left: '30%', duration: 3600, vertical: true },
      { emoji: '🌻', top: 205, left: '55%', duration: 4800, vertical: true },
      { emoji: '🐝', top: 160, left: '20%', duration: 2600 },
    ],
  },
];

function continentFor(competence) {
  return CONTINENTS.find((c) => c.competence === competence) ?? CONTINENTS[0];
}

// Retrouve la couleur de fond du sentier auquel appartient un jeu, pour
// que l'interieur du jeu garde la meme ambiance que la carte plutot qu'un
// fond neutre identique partout.
function themeBgForGame(jeuCode) {
  const continent = CONTINENTS.find((c) => Object.keys(c.paysSlotsFor).includes(jeuCode));
  return continent?.bg ?? colors.cream;
}

// Temps supplementaire accorde par un parent (via l'empreinte/le code) —
// partage entre la carte principale et l'interieur des continents, pour
// qu'un deblocage fait sur l'un ne soit jamais ignore par l'autre.
const ExtraTimeContext = createContext({ extraMinutesGranted: 0, grantExtraMinutes: () => {} });

function ExtraTimeProvider({ children }) {
  const [extraMinutesGranted, setExtraMinutesGranted] = useState(0);
  const grantExtraMinutes = useCallback((minutes) => {
    setExtraMinutesGranted((m) => m + minutes);
  }, []);
  return (
    <ExtraTimeContext.Provider value={{ extraMinutesGranted, grantExtraMinutes }}>
      {children}
    </ExtraTimeContext.Provider>
  );
}

// Signal ponctuel (pas un etat React) pour prevenir la carte qu'une belle
// performance vient d'avoir lieu, quel que soit le nombre d'ecrans traverses
// pour y revenir (jeu -> sentier -> carte).
let pendingCelebration = null;

// Fenetre compacte : identite du profil (nom, niveau), ouverte en touchant
// son avatar sur la carte.
function AvatarInfoModal({ visible, profil, onClose, onOpenRecompenses }) {
  if (!profil) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {profil.photo_url ? (
            <Image source={{ uri: profil.photo_url }} style={styles.avatarInfoPhoto} />
          ) : (
            <ProfilAvatarDisplay profil={profil} size={48} />
          )}
          <Text style={[styles.modalTitle, { textAlign: 'center', marginTop: 8 }]}>{profil.prenom}</Text>
          <Text style={{ textAlign: 'center', color: colors.ink, opacity: 0.7, marginBottom: 16 }}>
            Niveau {profil.niveau_global ?? 0} · {avatarLabelFor(profil.niveau_global ?? 0)}
          </Text>
          <Pressable style={[styles.button, { backgroundColor: colors.sand, marginBottom: 10 }]} onPress={onOpenRecompenses}>
            <Text style={[styles.buttonText, { color: colors.ink }]}>🎁 Voir mes récompenses</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Fenetre compacte : la galerie des badges deja gagnes (coccinelle, papillon...),
// chacun avec son petit fait amusant, reecoutable a la demande.
function RecompensesEarnedModal({ visible, profil, onClose }) {
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!visible) setSelected(null); // on repart de la liste a chaque nouvelle ouverture
  }, [visible]);

  useEffect(() => {
    if (!visible || !profil) return;
    (async () => {
      setLoading(true);
      const rank = avatarRankFor(profil.niveau_global ?? 0);
      const codes = AVATAR_CHAIN.slice(0, rank).map((a) => a.code);
      const { data } = await supabase.from('fiches_animaux').select('*').in('code', codes);
      const parFiche = Object.fromEntries((data ?? []).map((f) => [f.code, f]));
      const liste = AVATAR_CHAIN.slice(0, rank).map((a) => ({ ...a, fiche: parFiche[a.code] }));
      setFiches(liste.reverse()); // le plus recent en premier
      setLoading(false);
    })();
  }, [visible, profil]);

  if (selected) {
    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <Image source={AVATAR_IMAGES[selected.code]} style={styles.recompenseDetailPhoto} resizeMode="cover" />
            <Text style={[styles.modalTitle, { marginTop: 12 }]}>{selected.name}</Text>
            {selected.fiche?.fait_amusant ? (
              <Text style={{ color: colors.ink, textAlign: 'center', marginTop: 6, marginBottom: 14 }}>
                {selected.fiche.fait_amusant}
              </Text>
            ) : null}
            <Pressable
              style={styles.listenButton}
              onPress={() => speakSmart(
                selected.fiche?.fait_amusant ? `${selected.name}. ${selected.fiche.fait_amusant}` : selected.name
              )}
            >
              <Text style={styles.listenText}>🎤 Écouter</Text>
            </Pressable>
            <Pressable style={[styles.button, { marginTop: 14, alignSelf: 'stretch' }]} onPress={() => setSelected(null)}>
              <Text style={styles.buttonText}>‹ Retour à mes récompenses</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxHeight: '80%' }]}>
          <Text style={styles.modalTitle}>🎁 Tes récompenses</Text>
          {loading ? (
            <ActivityIndicator color={colors.mossDeep} />
          ) : fiches.length === 0 ? (
            <Text style={{ color: colors.ink, opacity: 0.6, marginBottom: 16 }}>
              Pas encore de récompense, continue à jouer !
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 380 }}>
              {fiches.map((a) => (
                <Pressable key={a.code} style={styles.recompenseRow} onPress={() => setSelected(a)}>
                  <Image source={AVATAR_IMAGES[a.code]} style={styles.recompensePhoto} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recompenseNom}>{a.name}</Text>
                    {a.fiche?.fait_amusant ? (
                      <Text style={styles.recompenseFait} numberOfLines={3}>{a.fiche.fait_amusant}</Text>
                    ) : null}
                  </View>
                  {a.fiche?.fait_amusant ? (
                    <Pressable onPress={() => speakSmart(a.fiche.fait_amusant)}>
                      <Text style={{ fontSize: 20 }}>🎤</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Pressable style={[styles.button, { marginTop: 12 }]} onPress={onClose}>
            <Text style={styles.buttonText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}



function WorldMapScreen({ route, navigation }) {
  const [profil, setProfil] = useState(route.params.profil);
  const [celebration, setCelebration] = useState(null);
  const [showAvatarInfo, setShowAvatarInfo] = useState(false);
  const [showRecompensesModal, setShowRecompensesModal] = useState(false);
  const [miniJeux, setMiniJeux] = useState([]);
  const [loading, setLoading] = useState(true);
  // Minutes offertes en plus par un parent : partagees via le contexte pour
  // rester valables sur tous les ecrans (carte comme continents).
  const { extraMinutesGranted, grantExtraMinutes } = useContext(ExtraTimeContext);
  const [showGate, setShowGate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { totalAllowed, baseRemaining, expectedPin } = useTimeBudget(profil, reloadKey);
  const remainingSeconds = useLiveCountdown(baseRemaining);
  const effectiveRemaining = baseRemaining != null ? remainingSeconds + extraMinutesGranted * 60 : null;
  const effectiveTotal = totalAllowed != null ? totalAllowed + extraMinutesGranted * 60 : null;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('mini_jeux').select('*').order('competence');
      setMiniJeux(data ?? []);
      setLoading(false);
    })();
  }, []);

  // Rafraîchit le niveau/avatar et le budget de temps a chaque retour sur cet ecran.
  // Le temps supplementaire accorde par un parent n'est PAS reinitialise ici :
  // il doit rester valable pour le reste de la journee.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      // Charge la musique choisie par le parent (ou celle par defaut).
      getParametresParentaux(route.params.profil.famille_id).then((p) => {
        startBgMusic(p?.musique_ambiance);
      });
      const { data } = await supabase
        .from('profils_enfants')
        .select('*')
        .eq('id', route.params.profil.id)
        .maybeSingle();
      if (data) setProfil(data);
      setReloadKey((k) => k + 1);

      // Noisette ne felicite l'enfant QUE s'il vient de bien reussir - jamais
      // affichee en permanence, et toujours avec l'audio (l'enfant ne lit pas).
      if (pendingCelebration) {
        const message = pendingCelebration;
        pendingCelebration = null;
        setCelebration(message);
        speakSmart(message);
        setTimeout(() => setCelebration(null), 5000);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const limitReached = effectiveRemaining != null && effectiveRemaining <= 0;

  function handleContinentPress(competence) {
    // Se promener sur la carte est toujours libre : seule l'entree dans un
    // jeu consomme du temps, et c'est verifie a l'interieur du continent.
    navigation.navigate('Continent', { profil, competence });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  const continentsAvecJeux = CONTINENTS.map((c) => ({
    ...c,
    jeux: miniJeux.filter((j) => j.competence === c.competence),
  })).filter((c) => c.jeux.length > 0);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.mapTopRow}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setShowAvatarInfo(true)}>
          {profil.photo_url ? (
            <Image source={{ uri: profil.photo_url }} style={styles.mapAvatarPhoto} />
          ) : (
            <ProfilAvatarDisplay profil={profil} size={34} />
          )}
        </Pressable>
        <Pressable onPress={() => setShowRecompensesModal(true)}>
          <Text style={{ fontSize: 30 }}>🎁</Text>
        </Pressable>
        {totalAllowed != null && (
          <TimeGaugeBar remainingSeconds={effectiveRemaining} totalSeconds={effectiveTotal} compact />
        )}
      </View>

      {celebration && (
        <PopIn style={styles.celebrationBanner}>
          <BouncingWrap><Noisette size={44} /></BouncingWrap>
          <Text style={styles.celebrationText}>{celebration}</Text>
        </PopIn>
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

      <View style={styles.campagneMapBleed}>
        <View style={styles.campagneMapBox}>
          <View style={styles.campagneMapInner}>
            <Image source={CAMPAGNE_MAP_IMAGE} style={styles.campagneMapImage} resizeMode="cover" />
            {continentsAvecJeux.map((item) => (
              <Pressable
                key={item.competence}
                style={{
                  position: 'absolute',
                  left: `${item.zone.left * 100}%`,
                  top: `${item.zone.top * 100}%`,
                  width: `${item.zone.width * 100}%`,
                  height: `${item.zone.height * 100}%`,
                }}
                onPress={() => handleContinentPress(item.competence)}
              />
            ))}
          </View>
        </View>
      </View>
      <Text style={styles.mapCredit}>Carte : créée pour Kid Crack</Text>

      <ParentGateModal
        visible={showGate}
        expectedPin={expectedPin}
        onCancel={() => setShowGate(false)}
        onSuccess={(extraMinutes) => {
          setShowGate(false);
          grantExtraMinutes(extraMinutes);
        }}
      />

      <AvatarInfoModal
        visible={showAvatarInfo}
        profil={profil}
        onOpenRecompenses={() => {
          setShowAvatarInfo(false);
          setShowRecompensesModal(true);
        }}
        onClose={() => setShowAvatarInfo(false)}
      />
      <RecompensesEarnedModal
        visible={showRecompensesModal}
        profil={profil}
        onClose={() => setShowRecompensesModal(false)}
      />
    </ScrollView>
  );
}

// ============================================================
// Écran : intérieur d'un sentier — univers thematique anime,
// avec les jeux de cette competence a explorer.
// ============================================================
// Calcule comment agrandir une zone precise de l'image de la carte pour
// donner l'impression de zoomer sur un sentier.
// Recadre toujours en format 9/16 (portrait, comme l'ecran du telephone),
// en gardant la hauteur de zone deja calee (sans risque de deborder sur le
// sentier voisin) et en centrant la largeur sur le centre de la zone.
// Recadre en 9/16 en gardant TOUTE la largeur de la zone (pour eviter un
// zoom trop serre et flou), et en etendant la hauteur autour du centre de
// la zone pour remplir le cadre - quitte a deborder un peu sur le sentier
// voisin, sans jamais sortir des bords de l'image elle-meme.
// Variante a hauteur FIXE (independante de zone.height) : l'illustration
// du theme occupe toujours la meme proportion d'ecran quel que soit le
// nombre de jeux de la zone (les jeux ne sont plus poses sur l'image).
// Le cadrage reste centre sur le meme point que la zone d'origine.
function computeZoomStyleFixed(zone, containerWidth, containerHeight) {
  const imageWidth = containerWidth / zone.width;
  const imageHeight = imageWidth / CAMPAGNE_MAP_ASPECT;
  const centerFraction = zone.top + zone.height / 2;
  const visibleFraction = containerHeight / imageHeight;
  const topFraction = centerFraction - visibleFraction / 2;
  const imageLeft = -zone.left * imageWidth;
  const imageTop = -topFraction * imageHeight;
  return { imageWidth, imageHeight, imageLeft, imageTop };
}

// Quelques formes differentes pour les jeux poses sur la carte, afin
// qu'ils ne soient jamais tous identiques - le fond reste toujours blanc
// pour rester facilement reconnaissable.
const MARKER_SHAPES = [
  { borderRadius: 14 }, // arrondi classique
  { borderRadius: 46 }, // tres arrondi, presque une bulle
  { borderTopLeftRadius: 32, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 32 },
  { borderTopLeftRadius: 8, borderTopRightRadius: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 8 },
  { borderRadius: 6 }, // presque carre
];

function SentierScreen({ route, navigation }) {
  const { profil, competence } = route.params;
  const continent = continentFor(competence);
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = screenWidth - 36;
  const imageContainerHeight = containerWidth * 0.95;
  const zoom = computeZoomStyleFixed(continent.zone, containerWidth, imageContainerHeight);
  const [miniJeux, setMiniJeux] = useState([]);
  const [niveauxParJeu, setNiveauxParJeu] = useState({}); // mini_jeu_id -> cran actuel
  const [bonusJeu, setBonusJeu] = useState(null);
  const [bonusDebloque, setBonusDebloque] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGate, setShowGate] = useState(false);
  const { extraMinutesGranted, grantExtraMinutes } = useContext(ExtraTimeContext);

  const { totalAllowed, baseRemaining, expectedPin } = useTimeBudget(profil);
  const remainingSeconds = useLiveCountdown(baseRemaining);
  const effectiveRemaining = baseRemaining != null ? remainingSeconds + extraMinutesGranted * 60 : null;
  const limitReached = effectiveRemaining != null && effectiveRemaining <= 0;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getParametresParentaux(profil.famille_id).then((p) => {
        startBgMusic(p?.musique_ambiance);
      });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('mini_jeux')
        .select('*')
        .eq('competence', competence)
        .eq('est_bonus', false)
        .order('nom');
      setMiniJeux(data ?? []);

      // Recupere le cran actuel de l'enfant sur chacun de ces jeux, pour
      // afficher une petite etiquette de niveau (ex: "A-2") sur la carte.
      const ids = (data ?? []).map((j) => j.id);
      if (ids.length > 0) {
        const { data: progRows } = await supabase
          .from('progression')
          .select('mini_jeu_id, palier_actuel')
          .eq('profil_id', profil.id)
          .in('mini_jeu_id', ids);
        const map = {};
        (progRows ?? []).forEach((r) => { map[r.mini_jeu_id] = r.palier_actuel; });
        setNiveauxParJeu(map);
      }

      // Jeu bonus de la zone (s'il en existe un) : visible (verrouille) a
      // partir de 60% de progression sur les jeux de la zone, debloque a 80%.
      const { data: bonus } = await supabase
        .from('mini_jeux')
        .select('*')
        .eq('competence', competence)
        .eq('est_bonus', true)
        .maybeSingle();
      if (bonus) {
        const { data: debloque } = await supabase
          .from('bonus_debloques')
          .select('zone_competence')
          .eq('profil_id', profil.id)
          .eq('zone_competence', competence)
          .maybeSingle();
        if (debloque) {
          setBonusJeu(bonus);
          setBonusDebloque(true);
        } else {
          const percent = await computeZoneProgressPercent(profil.id, competence, profil.niveau_defaut);
          if (percent >= 0.6) {
            setBonusJeu(bonus);
            setBonusDebloque(false);
          }
        }
      }

      setLoading(false);
    })();
  }, [competence]);

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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: continent.bg }]}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>‹</Text>
      </Pressable>

      <View style={styles.continentTitleRow}>
        <Text style={styles.continentPageTitle}>{continent.emoji} {continent.nom}</Text>
        <Pressable
          style={styles.continentTitleListenBtn}
          onPress={() => speakSmart(continent.nom)}
          hitSlop={8}
        >
          <Text style={{ fontSize: 11 }}>🎤</Text>
        </Pressable>
      </View>

      {/* Illustration du theme seule, sans jeux dessus - hauteur fixe,
          environ 38% de la largeur d'ecran pour rester dans l'esprit
          "un tiers a la moitie de l'ecran" quel que soit le nombre de jeux. */}
      <View style={[styles.continentBlob, { width: containerWidth, height: imageContainerHeight }]}>
        <Image
          source={CAMPAGNE_MAP_IMAGE}
          style={{
            position: 'absolute',
            width: zoom.imageWidth,
            height: zoom.imageHeight,
            left: zoom.imageLeft,
            top: zoom.imageTop,
          }}
        />
        {continent.decor.map((d, i) => (
          <DriftingDecor key={`decor-${i}`} {...d} size={(d.size ?? 22) + 6} />
        ))}
      </View>

      {/* Grille des jeux, en dessous de l'image - autant de cartes que
          necessaire, l'ecran defile normalement s'il y en a beaucoup. */}
      <View style={styles.gameGrid}>
        {miniJeux.map((item, index) => {
          const targetScreen = GAME_SCREENS[item.code];
          const locked = limitReached && !!targetScreen;
          return (
            <Pressable
              key={item.id}
              style={[styles.gridCard, cardStyleForIndex(index), locked && styles.paysMarkerLocked]}
              disabled={!targetScreen}
              onPress={() => handleGamePress(targetScreen)}
            >
              <View style={styles.paysMarkerTopRow}>
                <Text style={styles.paysMarkerIcon}>{GAME_ICONS[item.code] ?? '🎲'}</Text>
                {niveauxParJeu[item.id] != null && (
                  <View style={styles.paysMarkerNiveauBadge}>
                    <Text style={styles.paysMarkerNiveauText}>{letterCranFromRung(niveauxParJeu[item.id])}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.paysMarkerText} numberOfLines={3}>
                {item.nom}
              </Text>
              {niveauxParJeu[item.id] != null && (
                <ProgressionGauge rung={niveauxParJeu[item.id]} code={item.code} />
              )}
              <Pressable
                style={styles.paysMarkerListenBtn}
                onPress={() => speakSmart(item.nom)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 11 }}>🎤</Text>
              </Pressable>
              {(!targetScreen || locked) && <Text style={styles.paysMarkerLock}>🔒</Text>}
            </Pressable>
          );
        })}

        {bonusJeu && (() => {
          const targetScreen = GAME_SCREENS[bonusJeu.code];
          const locked = !bonusDebloque || (limitReached && bonusDebloque);
          const explicationVerrouille = "C'est un jeu secret ! Continue à bien jouer aux autres jeux de cette carte pour le débloquer bientôt.";
          function onPressCarte() {
            if (bonusDebloque) {
              handleGamePress(targetScreen);
            } else {
              speakSmart(explicationVerrouille);
            }
          }
          return (
            <Pressable
              style={[styles.gridCard, cardStyleForIndex(miniJeux.length), { borderColor: '#F5C542', borderWidth: bonusDebloque ? 2 : 1 }, locked && bonusDebloque && styles.paysMarkerLocked]}
              onPress={onPressCarte}
            >
              <View style={styles.paysMarkerTopRow}>
                <Text style={styles.paysMarkerIcon}>{bonusDebloque ? '🕵️' : '🔒'}</Text>
              </View>
              <Text style={styles.paysMarkerText} numberOfLines={3}>
                {bonusDebloque ? bonusJeu.nom : 'Jeu secret'}
              </Text>
              <Pressable
                style={styles.paysMarkerListenBtn}
                onPress={() => speakSmart(bonusDebloque ? bonusJeu.nom : explicationVerrouille)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 11 }}>🎤</Text>
              </Pressable>
              {locked && <Text style={styles.paysMarkerLock}>🔒</Text>}
            </Pressable>
          );
        })()}
      </View>

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

      <ParentGateModal
        visible={showGate}
        expectedPin={expectedPin}
        onCancel={() => setShowGate(false)}
        onSuccess={(extraMinutes) => {
          setShowGate(false);
          grantExtraMinutes(extraMinutes);
        }}
      />
    </ScrollView>
  );
}

// ============================================================
// Écran : Le Pont des Lettres
// ============================================================
const TOTAL_ROUNDS = 8;

// Legere variation de difficulte AU SEIN d'une meme session (8 manches) :
// un peu plus facile sur les 2 premieres manches, un peu plus dur sur les
// 2 dernieres, le reste au cran normal. But : casser la sensation de
// repetition d'une session ou toutes les manches sont rigoureusement au
// meme niveau, sans changer le calcul du cran a la fin de la session (qui
// continue de se baser sur le cran "normal", pas sur ces variations
// ponctuelles).
function difficultyOffsetForRound(roundNumber, totalRounds) {
  if (roundNumber <= 2) return -1;
  if (roundNumber >= totalRounds - 1) return 1;
  return 0;
}
function rungWithSessionRamp(baseRung, roundNumber, totalRounds, maxRungCap) {
  const cap = maxRungCap ?? MAX_CONTENT_RUNG;
  const offset = difficultyOffsetForRound(roundNumber, totalRounds);
  return Math.max(1, Math.min(cap, baseRung + offset));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pour la lecture a voix haute : les lettres/syllabes s'epellent sans espace
// (CHAT), mais des mots ou des phrases entieres doivent etre separes par un
// espace, sinon la lecture devient incomprehensible.
// Les synthese vocales generiques (Android/iOS) prononcent une lettre isolee
// par son NOM alphabetique ("b" -> "bé") et non son SON phonetique ("beu"),
// ce qui est trompeur pour l'apprentissage de la lecture. On remplace donc
// les consonnes isolees par une orthographe approximative qui force la
// bonne prononciation a l'oral, sans jamais toucher a ce qui est affiche.
const PHONEME_SPEECH_MAP = {
  b: 'beu', c: 'keu', d: 'deu', f: 'feu', g: 'gueu', j: 'jeu', k: 'keu',
  l: 'leu', m: 'meu', n: 'neu', p: 'peu', q: 'keu', r: 'reu', s: 'seu',
  t: 'teu', v: 'veu', w: 'oueu', x: 'kseu', z: 'zeu', y: 'i',
};

function speechFriendlyToken(token) {
  const lower = String(token).toLowerCase();
  return PHONEME_SPEECH_MAP[lower] ?? token;
}

function joinSequenceForSpeech(sequence, niveau) {
  const modeMots = ['ce1', 'ce2', 'cm1', 'cm2', '6e'].includes(niveau);
  if (modeMots) return sequence.join(' ');
  return sequence.map(speechFriendlyToken).join('');
}

function PontDesLettresScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

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
  const shownIds = useRef(new Set());
  const startedAt = useRef(Date.now());
  const memosConfig = useRef(null);
  // Garde-fou contre les reponses au hasard : detecte les erreurs donnees
  // trop vite pour avoir ete vraiment reflechies, plusieurs fois de suite.
  const [transitioning, setTransitioning] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const pendingNextRung = useRef(null);
  const { extraMinutesGranted } = useContext(ExtraTimeContext);
  const { baseRemaining } = useTimeBudget(profil);
  const liveRemaining = useLiveCountdown(baseRemaining);
  const effectiveRemainingIci = baseRemaining != null ? liveRemaining + extraMinutesGranted * 60 : null;
  const limiteAtteinteIci = effectiveRemainingIci != null && effectiveRemainingIci <= 0;

  // Calibrage adaptatif : chaque mot assemble sans aucune erreur compte
  // comme une "manche" reussie (un mot = une manche de calibrage, plutot
  // que la session complete de TOTAL_ROUNDS mots). Seules les erreurs
  // determinent la montee/descente, jamais le temps.
  const [calibPhase, setCalibPhase] = useState('checking');
  const [calibRoundIndex, setCalibRoundIndex] = useState(0);
  const calibCurrentRungRef = useRef(1);
  const calibStepPhaseRef = useRef('montee');
  const calibRoundsMonteeRef = useRef(0);
  const calibRoundsDescenteRef = useRef(0);
  const calibErrorsRef = useRef(0);
  const CALIB_SAUTS_MONTEE = [2, 4, 6, 6];

  useEffect(() => {
    fetchMemosConfig(profil.famille_id).then((cfg) => { memosConfig.current = cfg; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.famille_id]);

  // Ne lit automatiquement que lorsqu'il n'y a AUCUNE image pour deviner
  // le mot (sinon, la voix reste juste disponible en appuyant dessus).
  useEffect(() => {
    if (!current || current.icon) return;
    let cancelled = false;
    const isModelMode = !!current.options;
    const instruction = isModelMode ? 'Trouve la lettre.' : 'Écoute et assemble le mot.';
    const speechNiveau = gradeAndPalierFromRung(rung).niveau;
    const parts = [instruction, joinSequenceForSpeech(current.sequence, speechNiveau)];
    (async () => {
      for (const part of parts) {
        if (cancelled) return;
        await speakSmart(part);
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

    // Evite de repeter un element deja vu dans CETTE session ; si le stock
    // de contenu est epuise, on autorise de nouveau les repetitions.
    let pool = (data ?? []).filter((r) => !shownIds.current.has(r.id));
    if (pool.length === 0) {
      shownIds.current.clear();
      pool = data ?? [];
    }
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? data?.[0];
    if (!pick) {
      setLoading(false);
      return;
    }
    shownIds.current.add(pick.id);
    const donnees = pick.donnees;
    setCurrent(donnees);

    const base = donnees.options ? donnees.options.slice() : donnees.sequence.slice();
    const withDistractors = donnees.distractors ? base.concat(donnees.distractors) : base;
    setTokens(shuffle(withDistractors));
    setLoading(false);
  }, []);

  function terminerCalibrage(jeuId, finalRung) {
    (async () => {
      try {
        await supabase.from('progression').upsert(
          {
            profil_id: profil.id,
            mini_jeu_id: jeuId,
            palier_actuel: finalRung,
            details: { streak: 0 },
            temps_reference_secondes: null,
            echecs_consecutifs: 0,
          },
          { onConflict: 'profil_id,mini_jeu_id' }
        );
      } catch (e) {
        // Non bloquant.
      }
    })();
    setRung(finalRung);
    errorsTotal.current = 0;
    setRound(1);
    setCalibPhase('play');
    const { niveau, palier: palierValue } = gradeAndPalierFromRung(rungWithSessionRamp(finalRung, 1, TOTAL_ROUNDS, MAX_CONTENT_RUNG));
    loadRound(jeuId, niveau, palierValue);
  }

  function handleCalibrationResult(jeuId, isCorrect) {
    setCalibRoundIndex((i) => i + 1);
    calibErrorsRef.current = 0;
    if (calibStepPhaseRef.current === 'montee') {
      calibRoundsMonteeRef.current += 1;
      if (!isCorrect) {
        calibStepPhaseRef.current = 'descente';
        calibCurrentRungRef.current = Math.max(1, calibCurrentRungRef.current - 2);
        const { niveau, palier } = gradeAndPalierFromRung(calibCurrentRungRef.current);
        loadRound(jeuId, niveau, palier);
        return;
      }
      if (calibRoundsMonteeRef.current >= 4) {
        terminerCalibrage(jeuId, Math.min(MAX_CONTENT_RUNG, calibCurrentRungRef.current));
        return;
      }
      const saut = CALIB_SAUTS_MONTEE[calibRoundsMonteeRef.current] ?? 6;
      calibCurrentRungRef.current = Math.min(MAX_CONTENT_RUNG, calibCurrentRungRef.current + saut);
      const { niveau, palier } = gradeAndPalierFromRung(calibCurrentRungRef.current);
      loadRound(jeuId, niveau, palier);
      return;
    }

    calibRoundsDescenteRef.current += 1;
    if (isCorrect) {
      terminerCalibrage(jeuId, Math.min(MAX_CONTENT_RUNG, calibCurrentRungRef.current));
      return;
    }
    if (calibRoundsDescenteRef.current >= 3) {
      terminerCalibrage(jeuId, Math.min(MAX_CONTENT_RUNG, calibCurrentRungRef.current));
      return;
    }
    calibCurrentRungRef.current = Math.max(1, calibCurrentRungRef.current - 2);
    const { niveau, palier } = gradeAndPalierFromRung(calibCurrentRungRef.current);
    loadRound(jeuId, niveau, palier);
  }

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

      if (!prog) {
        const base = Math.min(MAX_CONTENT_RUNG, rungFromGradeAndPalier(profil.niveau_defaut, 1));
        calibCurrentRungRef.current = base;
        calibStepPhaseRef.current = 'montee';
        calibRoundsMonteeRef.current = 0;
        calibRoundsDescenteRef.current = 0;
        calibErrorsRef.current = 0;
        setCalibRoundIndex(0);
        setCalibPhase('calibrating');
        const { niveau, palier } = gradeAndPalierFromRung(base);
        loadRound(jeu.id, niveau, palier);
        return;
      }

      const startRung = prog.palier_actuel;
      setRung(startRung);
      setCalibPhase('play');
      const { niveau, palier: palierValue } = gradeAndPalierFromRung(rungWithSessionRamp(startRung, 1, TOTAL_ROUNDS, MAX_CONTENT_RUNG));
      loadRound(jeu.id, niveau, palierValue);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  function speak(text) {
    speakSmart(text);
  }

  const [sessionSummary, setSessionSummary] = useState(null);

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const tempsMoyenParManche = Math.round(durationSeconds / TOTAL_ROUNDS);
    const precomputedRung = await computeStreakRung({
      profil, miniJeuId, currentRung: rung, wasPerfect: errorsTotal.current <= 1, maxRung: MAX_CONTENT_RUNG,
      erreursTotal: errorsTotal.current, totalRounds: TOTAL_ROUNDS, dureeMoyenneManche: tempsMoyenParManche,
    });
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: TOTAL_ROUNDS,
      startedAt: startedAt.current,
      tempsMoyenParManche,
      precomputedRung,
    });

    // Reussite ET du temps de jeu restant : on propose de continuer sur le
    // niveau suivant sans repasser par la carte - mais c'est desormais
    // l'enfant qui choisit, via un bouton "Continuer", plutot qu'un
    // enchainement automatique impose.
    if (summary.direction === 'up' && !limiteAtteinteIci) {
      const messages = [
        `Bravo ${speechFriendlyName(profil.prenom)}, niveau suivant ! Touche le bouton pour continuer.`,
        `Excellent ${speechFriendlyName(profil.prenom)} ! Touche continuer si tu veux jouer encore.`,
        `Trop fort ${speechFriendlyName(profil.prenom)} ! Appuie sur continuer pour la suite.`,
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setTransitioning(msg);
      speakSmart(msg);
      pendingNextRung.current = summary.newRung;
      return;
    }

    // Meme sans montee de niveau (echec ou stagnation), on garde la
    // possibilite de reprendre directement au meme niveau sans repasser
    // par la carte, tant qu'il reste du temps de jeu.
    pendingNextRung.current = summary.newRung;
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextLevel() {
    const newRung = pendingNextRung.current;
    setTransitioning(null);
    setSessionDone(false); // sinon l'ecran de fin reste bloque a l'affichage pour toujours
    errorsTotal.current = 0;
    startedAt.current = Date.now();
    setRung(newRung);
    setRound(1);
    const { niveau, palier } = gradeAndPalierFromRung(rungWithSessionRamp(newRung, 1, TOTAL_ROUNDS, MAX_CONTENT_RUNG));
    loadRound(miniJeuId, niveau, palier);
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
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 800);

        if (calibPhase === 'calibrating') {
          const isCorrect = calibErrorsRef.current === 0;
          setTimeout(() => handleCalibrationResult(miniJeuId, isCorrect), 500);
          return;
        }

        maybeSpeakMidSessionEncouragement(round);
        setTimeout(async () => {
          if (round >= TOTAL_ROUNDS) {
            await finishSession();
          } else {
            setRound((r) => r + 1);
            const { niveau, palier } = gradeAndPalierFromRung(rungWithSessionRamp(rung, round + 1, TOTAL_ROUNDS, MAX_CONTENT_RUNG));
            loadRound(miniJeuId, niveau, palier);
          }
        }, 500);
      } else {
        setStepIndex(nextStep);
      }
    } else {
      if (calibPhase === 'calibrating') {
        calibErrorsRef.current += 1;
        setFeedback('Essaie encore !');
        setTimeout(() => setFeedback(null), 500);
        return;
      }
      errorsThisRound.current += 1;
      errorsTotal.current += 1;
      setFeedback('Essaie encore !');
      maybePlayMemo(memosConfig.current, 'mauvaise_reponse');
      setTimeout(() => setFeedback(null), 500);
    }
  }

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} onContinue={!limiteAtteinteIci ? proceedToNextLevel : undefined} />;
  }

  if (transitioning) {
    return (
      <View style={styles.center}>
        <BouncingWrap><Noisette size={80} /></BouncingWrap>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginTop: 16 }}>
          {transitioning}
        </Text>
        <Text style={{ fontSize: 30, marginTop: 8 }}>🎉</Text>
        <Pressable style={[styles.button, { marginTop: 24, paddingHorizontal: 32 }]} onPress={proceedToNextLevel}>
          <Text style={styles.buttonText}>▶️ Continuer</Text>
        </Pressable>
      </View>
    );
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
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame('pont_des_lettres') }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>
          {calibPhase === 'calibrating' ? '🔍 On découvre ton niveau !' : '🌉 Le Pont des Lettres'}
        </Text>
        {calibPhase === 'play' && (
          <Pressable
            onPress={() => {
              Alert.alert(
                'Refaire le calibrage ?',
                "On va reposer quelques questions pour retrouver le bon niveau. C'est rapide !",
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Oui, on y va !',
                    onPress: () => {
                      const base = Math.min(MAX_CONTENT_RUNG, rungFromGradeAndPalier(profil.niveau_defaut, 1));
                      calibCurrentRungRef.current = base;
                      calibStepPhaseRef.current = 'montee';
                      calibRoundsMonteeRef.current = 0;
                      calibRoundsDescenteRef.current = 0;
                      calibErrorsRef.current = 0;
                      setCalibRoundIndex(0);
                      setCalibPhase('calibrating');
                      const { niveau, palier } = gradeAndPalierFromRung(base);
                      loadRound(miniJeuId, niveau, palier);
                    },
                  },
                ]
              );
            }}
            hitSlop={10}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
          </Pressable>
        )}
        <Text style={styles.roundLabel}>
          {calibPhase === 'calibrating' ? `Manche ${calibRoundIndex + 1}` : `${round}/${TOTAL_ROUNDS}`}
        </Text>
      </View>

      <View style={styles.gameCharacter}>
        <BouncingWrap><Maestro size={48} /></BouncingWrap>
        <ConfettiBurst trigger={showConfetti} />
      </View>

      <View style={styles.promptZone}>
        {current.icon ? (
          <Pressable onPress={() => speak(joinSequenceForSpeech(current.sequence, gradeAndPalierFromRung(rung).niveau))}>
            <Text style={styles.icon}>{current.icon}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.listenButton} onPress={() => speak(joinSequenceForSpeech(current.sequence, gradeAndPalierFromRung(rung).niveau))}>
            <Text style={styles.listenText}>🎤 Écouter</Text>
          </Pressable>
        )}

        {isModelMode ? null : (
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

      <View style={styles.answerZone}>
        <Text style={styles.answerZoneLabel}>Assemble ici</Text>
        <View style={styles.stonesWrap}>
          {tokens.map((token, i) => {
            const used = usedTokens.includes(token + '#' + i);
            const bg = STONE_COLORS[i % STONE_COLORS.length];
            return (
              <Pressable
                key={i}
                disabled={used}
                onPress={() => onTokenPress(token, i)}
                hitSlop={6}
                style={[
                  styles.stone,
                  { backgroundColor: bg },
                  used && styles.stoneUsed,
                ]}
              >
                <Text style={styles.stoneText} numberOfLines={1} adjustsFontSizeToFit>
                  {token}
                </Text>
                {!used && (
                  <Pressable
                    style={styles.stoneListenBtn}
                    onPress={() => speakSmart(token.length <= 2 ? speechFriendlyToken(token) : token)}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 11 }}>🎤</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
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

// Fait deriver doucement un emoji d'un cote a l'autre (poisson qui nage,
// oiseau qui vole, nuage qui flotte, flocon...), pour donner vie au decor
// sans distraire de l'essentiel.
function DriftingDecor({ emoji, size = 22, top, left, duration = 6000, delay = 0, vertical = false }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration, delay]);

  const translate = anim.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });
  const transform = vertical ? [{ translateY: translate }] : [{ translateX: translate }];

  return (
    <Animated.Text
      style={{ position: 'absolute', top, left, fontSize: size, transform }}
    >
      {emoji}
    </Animated.Text>
  );
}

// Petite explosion de confettis/etincelles a chaque bonne reponse, pour un
// retour visuel plus marquant qu'un simple texte "Bravo !".
function ConfettiBurst({ trigger }) {
  const particles = useRef(
    Array.from({ length: 10 }).map(() => ({
      anim: new Animated.Value(0),
      emoji: ['✨', '🎉', '⭐', '🌟'][Math.floor(Math.random() * 4)],
      angle: Math.random() * Math.PI * 2,
      distance: 50 + Math.random() * 55,
    }))
  ).current;

  useEffect(() => {
    if (!trigger) return;
    particles.forEach((p) => {
      p.anim.setValue(0);
      Animated.timing(p.anim, { toValue: 1, duration: 750, useNativeDriver: true }).start();
    });
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {particles.map((p, i) => {
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        const scale = p.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1.4, 0.8] });
        return (
          <Animated.Text
            key={i}
            style={[styles.confettiParticle, { transform: [{ translateX }, { translateY }, { scale }], opacity }]}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}
    </View>
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

// Lit un texte a voix haute en le decoupant phrase par phrase (plus
// intelligible pour les textes longs) et en ralentissant le debit quand
// le texte est long. Renvoie une promesse resolue une fois la lecture finie,
// pour pouvoir enchainer plusieurs textes proprement.
// Encouragement discret, une seule fois par session (a la 5e des 8 manches,
// jamais a chaque bonne reponse), avec une formulation tiree au hasard pour
// ne jamais dire toujours la meme phrase.
const MIDSESSION_ENCOURAGEMENTS = [
  'Continue comme ça, tu es sur la bonne voie !',
  'Bravo, tu progresses bien !',
  "C'est du très bon travail, continue !",
  'Tu es en train de bien t\'en sortir !',
  'Belle énergie, garde ce rythme !',
  'Super, tu gères bien jusqu\'ici !',
];
function maybeSpeakMidSessionEncouragement(round) {
  if (round === 5) {
    const msg = MIDSESSION_ENCOURAGEMENTS[Math.floor(Math.random() * MIDSESSION_ENCOURAGEMENTS.length)];
    speakSmart(msg);
  }
}

// Retire les emojis et symboles du prenom avant de le donner a la voix :
// certains moteurs vocaux plantent ou bloquent en essayant de "prononcer"
// un emoji, alors que ca ne pose aucun probleme a l'affichage.
function speechFriendlyName(name) {
  const cleaned = String(name ?? '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]/gu, '')
    .trim();
  return cleaned || 'Champion';
}

// ============================================================
// Musique d'ambiance de fond : joue sur la carte et les sentiers, jamais
// pendant les jeux (pour laisser la concentration), et se coupe
// automatiquement des qu'une voix parle (micro ou consigne), pour reprendre
// juste apres.
// ============================================================
// Registre des musiques d'ambiance disponibles - pour en ajouter une nouvelle
// plus tard, il suffit d'ajouter le fichier dans assets/audio/ et une ligne ici.
const MUSIC_TRACKS = {
  gentle_joy: { label: 'Douce et joyeuse', file: require('../assets/audio/sonican-sweet-children-music-loop-gentle-joy-290945.mp3') },
  dreamy: { label: 'Magique et rêveuse', file: require('../assets/audio/sonican-magical-children-music-dreamy-loop-569776.mp3') },
  jazzy: { label: 'Jazz enjoué', file: require('../assets/audio/sonican-children-jazz-fantasy-loop-536641.mp3') },
};
const DEFAULT_MUSIC_KEY = 'gentle_joy';

let bgMusicSound = null;
let bgMusicLoadedKey = null; // quelle piste est actuellement chargee
let bgMusicShouldPlay = false; // etat voulu (carte/sentier=true, jeu=false)
let bgMusicDucked = false; // temporairement coupee pour laisser parler la voix

async function ensureBgMusicLoaded(musicKey) {
  const key = MUSIC_TRACKS[musicKey] ? musicKey : DEFAULT_MUSIC_KEY;
  if (bgMusicSound && bgMusicLoadedKey === key) return bgMusicSound;
  // Le parent a change de musique, ou c'est le premier chargement : on
  // decharge l'ancienne piste avant de charger la nouvelle.
  if (bgMusicSound) {
    try { await bgMusicSound.unloadAsync(); } catch (e) {}
    bgMusicSound = null;
  }
  try {
    // Indispensable sur certains telephones pour que l'audio joue de facon
    // fiable (notamment en mode silencieux/vibreur) - sans ca, la lecture
    // peut echouer silencieusement selon la configuration de l'appareil.
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const { sound } = await Audio.Sound.createAsync(MUSIC_TRACKS[key].file, { isLooping: true, volume: 0.35 });
    bgMusicSound = sound;
    bgMusicLoadedKey = key;
    return sound;
  } catch (e) {
    return null;
  }
}

async function startBgMusic(musicKey) {
  bgMusicShouldPlay = true;
  if (bgMusicDucked) return; // reprendra automatiquement a la fin de la voix en cours
  const sound = await ensureBgMusicLoaded(musicKey);
  if (sound) {
    try { await sound.playAsync(); } catch (e) {}
  }
}

async function stopBgMusic() {
  bgMusicShouldPlay = false;
  if (bgMusicSound) {
    try { await bgMusicSound.pauseAsync(); } catch (e) {}
  }
}

// Vrais bruits d'animaux enregistres (pas juste une devinette parlee) pour
// La Ronde des Lucioles - un enfant qui ne sait pas lire reconnait bien mieux
// un vrai son qu'une phrase decrivant ce son.
const LUCIOLES_SOUNDS = {
  '🦍': require('../assets/audio/animaux/gorille.mp3'),
  '🐤': require('../assets/audio/animaux/poussin.mp3'),
  '🐥': require('../assets/audio/animaux/poussin.mp3'),
  '🦜': require('../assets/audio/animaux/perroquet.mp3'),
  '🐒': require('../assets/audio/animaux/singe.mp3'),
  '🦆': require('../assets/audio/animaux/canard.mp3'),
  '🦉': require('../assets/audio/animaux/hibou.mp3'),
  '🐦': require('../assets/audio/animaux/oiseau.mp3'),
  '🐊': require('../assets/audio/animaux/crocodile.mp3'),
  '🐍': require('../assets/audio/animaux/serpent.mp3'),
  '🐘': require('../assets/audio/animaux/elephant.mp3'),
  '🦌': require('../assets/audio/animaux/cerf.mp3'),
  '🦊': require('../assets/audio/animaux/renard.mp3'),
  '🐆': require('../assets/audio/animaux/leopard.mp3'),
  '🐻': require('../assets/audio/animaux/ours.mp3'),
  '🦁': require('../assets/audio/animaux/lion.mp3'),
  '🐺': require('../assets/audio/animaux/loup.mp3'),
  '🦇': require('../assets/audio/animaux/chauve_souris.mp3'),
  '🐋': require('../assets/audio/animaux/baleine.mp3'),
  '🐃': require('../assets/audio/animaux/buffle.mp3'),
  '🐱': require('../assets/audio/animaux/chat.mp3'),
  '🐈‍⬛': require('../assets/audio/animaux/chat.mp3'),
  '🐴': require('../assets/audio/animaux/cheval.mp3'),
  '🐶': require('../assets/audio/animaux/chien.mp3'),
  '🐖': require('../assets/audio/animaux/cochon.mp3'),
  '🐷': require('../assets/audio/animaux/cochon.mp3'),
  '🐓': require('../assets/audio/animaux/coq.mp3'),
  '🦃': require('../assets/audio/animaux/dinde.mp3'),
  '🐰': require('../assets/audio/animaux/lapin.mp3'),
  '🐑': require('../assets/audio/animaux/mouton.mp3'),
  '🐔': require('../assets/audio/animaux/poule.mp3'),
  '🐯': require('../assets/audio/animaux/tigre.mp3'),
  '🐄': require('../assets/audio/animaux/vache.mp3'),
  '🐮': require('../assets/audio/animaux/vache.mp3'),
  '🐸': require('../assets/audio/animaux/grenouille.mp3'),
  '🐝': require('../assets/audio/animaux/abeille.mp3'),
  '🪰': require('../assets/audio/animaux/abeille.mp3'),
  '🦟': require('../assets/audio/animaux/moustique.mp3'),
  '🦗': require('../assets/audio/animaux/grillon.mp3'),
  // Vehicules, engins et phenomenes naturels
  '✈️': require('../assets/audio/divers/avion.mp3'),
  '🚗': require('../assets/audio/divers/voiture.mp3'),
  '🚂': require('../assets/audio/divers/train.mp3'),
  '🚄': require('../assets/audio/divers/train.mp3'),
  '🚆': require('../assets/audio/divers/train.mp3'),
  '🚊': require('../assets/audio/divers/train.mp3'),
  '🚁': require('../assets/audio/divers/helicoptere.mp3'),
  '🚀': require('../assets/audio/divers/fusee.mp3'),
  '🏍️': require('../assets/audio/divers/moto.mp3'),
  '🏎️': require('../assets/audio/divers/voiture_course.mp3'),
  '🚲': require('../assets/audio/divers/velo.mp3'),
  '⛵': require('../assets/audio/divers/bateau_voile.mp3'),
  '⛈️': require('../assets/audio/divers/orage.mp3'),
  '⚡': require('../assets/audio/divers/eclair.mp3'),
  '🌧️': require('../assets/audio/divers/pluie.mp3'),
  '🌪️': require('../assets/audio/divers/tornade.mp3'),
  '🌬️': require('../assets/audio/divers/vent.mp3'),
  '🌊': require('../assets/audio/divers/vague.mp3'),
  '🌋': require('../assets/audio/divers/volcan.mp3'),
  '❄️': require('../assets/audio/divers/glace.mp3'),
  '🍃': require('../assets/audio/divers/feuilles.mp3'),
  '⏰': require('../assets/audio/divers/reveil.mp3'),
  '🔥': require('../assets/audio/divers/feu.mp3'),
  '🎈': require('../assets/audio/divers/ballon.mp3'),
  '🧹': require('../assets/audio/divers/balai.mp3'),
  '🎸': require('../assets/audio/divers/guitare.mp3'),
  '🎐': require('../assets/audio/divers/carillon.mp3'),
  '🥁': require('../assets/audio/divers/tambour.mp3'),
  '🥤': require('../assets/audio/divers/boire_paille.mp3'),
  '☕': require('../assets/audio/divers/bouilloire.mp3'),
  '🍳': require('../assets/audio/divers/friture.mp3'),
  '⛏️': require('../assets/audio/divers/pioche.mp3'),
  '⛲': require('../assets/audio/divers/fontaine.mp3'),
  '🔨': require('../assets/audio/divers/marteau.mp3'),
  '🎺': require('../assets/audio/divers/trompette.mp3'),
  '🚪': require('../assets/audio/divers/porte.mp3'),
  '🔔': require('../assets/audio/divers/cloche.mp3'),
  '💧': require('../assets/audio/divers/eau_goutte.mp3'),
  '💦': require('../assets/audio/divers/eau_goutte.mp3'),
  '⛸️': require('../assets/audio/divers/patin_glace.mp3'),
  '🤫': require('../assets/audio/divers/chut.mp3'),
  '🤧': require('../assets/audio/divers/eternuement.mp3'),
};

// Lecture ponctuelle d'un effet sonore (pas en boucle, contrairement a la
// musique de fond) - se charge et se joue une seule fois.
async function playSoundEffect(source) {
  try {
    const { sound } = await Audio.Sound.createAsync(source, { volume: 1.0 });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch (e) {}
}

async function duckBgMusicForSpeech() {
  bgMusicDucked = true;
  if (bgMusicSound) {
    try { await bgMusicSound.pauseAsync(); } catch (e) {}
  }
}

async function unduckBgMusicAfterSpeech() {
  bgMusicDucked = false;
  if (bgMusicShouldPlay && bgMusicSound) {
    try { await bgMusicSound.playAsync(); } catch (e) {}
  }
}

// A utiliser pour tout bouton "couper le son" declenche par l'enfant en
// dehors du flux normal de speakSmart : sur certains telephones, le
// callback onStopped de la synthese vocale ne se declenche pas de facon
// fiable apres un Speech.stop() manuel, ce qui laissait la musique
// d'ambiance bloquee "en sourdine" pour le reste de la session. On force
// donc explicitement la reprise plutot que de compter sur ce callback.
function stopSpeechAndUnduck() {
  Speech.stop();
  unduckBgMusicAfterSpeech();
}

function speakSmart(text) {
  return new Promise((resolve) => {
    const raw = String(text ?? '').trim();
    if (!raw) {
      resolve();
      return;
    }
    // Arrete systematiquement toute lecture en cours avant d'en lancer une
    // nouvelle : deux appels vocaux qui se chevauchent peuvent bloquer le
    // moteur de synthese vocale sur certains telephones.
    Speech.stop();
    duckBgMusicForSpeech();
    const clauses = raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [raw];
    const rate = raw.length > 50 ? 0.72 : 0.85;
    let i = 0;
    function next() {
      if (i >= clauses.length) {
        unduckBgMusicAfterSpeech();
        resolve();
        return;
      }
      const clause = clauses[i].trim();
      i += 1;
      if (!clause) {
        next();
        return;
      }
      Speech.speak(clause, {
        language: 'fr-FR',
        rate,
        onDone: next,
        onStopped: next,
        onError: next,
      });
    }
    next();
  });
}

function speak(text) {
  if (text) speakSmart(text);
}

function SessionEndScreen({ profil, summary, navigation, timeUp, onContinue }) {
  const fiche = summary?.ficheAnimal;

  // Explication parlee de la raison de la montee (ou non), puisque l'enfant
  // ne sait pas lire - toujours un message adapte, jamais juste "Bravo".
  useEffect(() => {
    const messages = {
      parfait_rapide: `Bravo ${speechFriendlyName(profil.prenom)} ! Tu as tout bon et tu as été rapide, tu montes de niveau !`,
      parfait_lent: `Bravo ${speechFriendlyName(profil.prenom)}, tu as tout bon ! Essaie d'être un peu plus rapide la prochaine fois pour monter de niveau.`,
      erreurs_beaucoup: `Ce n'était pas facile cette fois, ${speechFriendlyName(profil.prenom)}. On redescend un peu pour s'entraîner, tu vas y arriver !`,
      erreurs_quelques: `Pas mal du tout ${speechFriendlyName(profil.prenom)} ! Encore un petit effort et tu vas monter de niveau.`,
      echec_protege: `Ce n'était pas facile cette fois, ${speechFriendlyName(profil.prenom)}, mais tu restes à ce niveau pour t'entraîner encore un peu. Tu vas y arriver !`,
      encore_un_effort: `Bravo ${speechFriendlyName(profil.prenom)}, tu as trouvé toutes les paires ! Encore une réussite comme ça et tu montes de niveau !`,
    };
    const message = summary?.raison ? messages[summary.raison] : null;

    // Enchaine : d'abord le message d'encouragement, puis, si un nouvel
    // avatar vient d'etre debloque, son nom et sa petite histoire en
    // autoplay complet (aucune action requise de l'enfant).
    (async () => {
      if (message) await speakSmart(message);
      if (summary?.rankChanged && fiche) {
        const displayName = fiche.nom_affiche || AVATAR_CHAIN[summary.newRank - 1].name;
        const histoire = [fiche.habitat, fiche.alimentation, fiche.fait_amusant]
          .filter(Boolean)
          .join('. ');
        await speakSmart(histoire ? `${displayName}. ${histoire}` : displayName);
      }
      // Jeu bonus de zone : annonce des 40% (et jusqu'a 79%), celebration
      // specifique au moment ou il vient tout juste de se debloquer (80%).
      const bz = summary?.bonusZone;
      if (bz?.competence) {
        if (bz.unlocked) {
          await speakSmart('Bravo ! Tu viens de débloquer un nouveau jeu bonus, va vite le découvrir sur la carte !');
        } else if (!bz.dejaDebloque && bz.percent >= 0.4) {
          await speakSmart('Continue comme ça, un nouveau jeu va bientôt se débloquer !');
        }
      }
    })();

    if (summary?.direction === 'up') {
      fetchMemosConfig(profil.famille_id).then((cfg) => {
        maybePlayMemo(cfg, 'encouragement_fin');
      });
      // Previent la carte qu'il faudra feter ca au retour, meme si on
      // traverse plusieurs ecrans avant d'y arriver.
      pendingCelebration = `Bravo ${speechFriendlyName(profil.prenom)} ! Tu progresses très bien !`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {summary?.raison && (
        <Pressable
          style={styles.listenButton}
          onPress={() => {
            const messages = {
              parfait_rapide: `Bravo ${speechFriendlyName(profil.prenom)} ! Tu as tout bon et tu as été rapide, tu montes de niveau !`,
              parfait_lent: `Bravo ${speechFriendlyName(profil.prenom)}, tu as tout bon ! Essaie d'être un peu plus rapide la prochaine fois pour monter de niveau.`,
              erreurs_beaucoup: `Ce n'était pas facile cette fois, ${speechFriendlyName(profil.prenom)}. On redescend un peu pour s'entraîner, tu vas y arriver !`,
              erreurs_quelques: `Pas mal du tout ${speechFriendlyName(profil.prenom)} ! Encore un petit effort et tu vas monter de niveau.`,
      echec_protege: `Ce n'était pas facile cette fois, ${speechFriendlyName(profil.prenom)}, mais tu restes à ce niveau pour t'entraîner encore un peu. Tu vas y arriver !`,
              encore_un_effort: `Bravo ${speechFriendlyName(profil.prenom)}, tu as trouvé toutes les paires ! Encore une réussite comme ça et tu montes de niveau !`,
            };
            speakSmart(messages[summary.raison]);
          }}
        >
          <Text style={styles.listenText}>🎤 Réécouter</Text>
        </Pressable>
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
          <Image
            source={AVATAR_IMAGES[AVATAR_CHAIN[summary.newRank - 1].code]}
            style={styles.rankUpPhoto}
            resizeMode="cover"
          />
          <Text style={styles.rankUpAvatar}>
            {fiche?.nom_affiche || AVATAR_CHAIN[summary.newRank - 1].name}
          </Text>
          <Pressable style={styles.listenButton} onPress={stopSpeechAndUnduck}>
            <Text style={styles.listenText}>🔇 Couper le son</Text>
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

      {onContinue ? (
        <Pressable style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>
            {summary.direction === 'up' ? '▶️ Continuer' : '🔄 Recommencer'}
          </Text>
        </Pressable>
      ) : (
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>
            Retour à la carte
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ============================================================
// Moteur générique : question à choix (Sons Magiques + Pommes de Luma)
// ============================================================
// Carte de l'Europe (source Wikipedia, licence libre) decoupee pour le
// defi "place le pays sur la carte" apres une bonne reponse sur un drapeau.
const CARTE_EUROPE = require('../assets/carte-europe.jpg');
const EUROPE_COUNTRY_COORDS = {
  "France": [0.40, 0.48], "Espagne": [0.32, 0.62], "Italie": [0.43, 0.58],
  "Allemagne": [0.45, 0.33], "Royaume-Uni": [0.36, 0.30], "Portugal": [0.29, 0.62],
  "Belgique": [0.41, 0.36], "Pays-Bas": [0.42, 0.31], "Suisse": [0.42, 0.45],
  "Autriche": [0.47, 0.42], "Pologne": [0.50, 0.29], "Suède": [0.49, 0.13],
  "Norvège": [0.45, 0.10], "Danemark": [0.45, 0.24], "Finlande": [0.56, 0.08],
  "Grèce": [0.51, 0.68], "Ukraine": [0.60, 0.36], "Roumanie": [0.55, 0.47],
  "Hongrie": [0.51, 0.42], "République Tchèque": [0.47, 0.35], "Irlande": [0.30, 0.31],
  // Ajoutes pour les zones regionales (Variante 2) - positions estimees,
  // A VALIDER visuellement sur la vraie carte avant mise en prod (meme
  // lecon que la premiere version de la carte Europe, retiree pour
  // imprecision).
  "Luxembourg": [0.42, 0.38], "Estonie": [0.57, 0.20], "Lettonie": [0.56, 0.23],
  "Lituanie": [0.54, 0.26], "Slovénie": [0.47, 0.48], "Croatie": [0.49, 0.52],
  "Bosnie-Herzégovine": [0.50, 0.55], "Serbie": [0.53, 0.53], "Monténégro": [0.51, 0.58],
  "Albanie": [0.51, 0.62], "Macédoine du Nord": [0.53, 0.63], "Bulgarie": [0.55, 0.60],
};

const EUROPE_FLAGS = {
  "France": "🇫🇷", "Espagne": "🇪🇸", "Italie": "🇮🇹", "Allemagne": "🇩🇪",
  "Royaume-Uni": "🇬🇧", "Portugal": "🇵🇹", "Belgique": "🇧🇪", "Pays-Bas": "🇳🇱",
  "Suisse": "🇨🇭", "Autriche": "🇦🇹", "Pologne": "🇵🇱", "Suède": "🇸🇪",
  "Norvège": "🇳🇴", "Danemark": "🇩🇰", "Finlande": "🇫🇮", "Grèce": "🇬🇷",
  "Ukraine": "🇺🇦", "Roumanie": "🇷🇴", "Hongrie": "🇭🇺", "République Tchèque": "🇨🇿",
  "Irlande": "🇮🇪", "Luxembourg": "🇱🇺", "Estonie": "🇪🇪", "Lettonie": "🇱🇻",
  "Lituanie": "🇱🇹", "Slovénie": "🇸🇮", "Croatie": "🇭🇷", "Bosnie-Herzégovine": "🇧🇦",
  "Serbie": "🇷🇸", "Monténégro": "🇲🇪", "Albanie": "🇦🇱", "Macédoine du Nord": "🇲🇰",
  "Bulgarie": "🇧🇬",
};

// Zones regionales validees pour la Variante 2 (tap approximatif sur la
// zone, puis zoom, puis pays presentes un par un avec collection de
// drapeaux). "Europe latine elargie" n'est pas incluse : ses pays sont
// trop eparpilles geographiquement pour qu'un seul tap de zone ait un
// sens (a repenser separement si besoin).
const EUROPE_ZONES = [
  { key: 'benelux', nom: 'le Benelux', nomSpeak: 'Retrouve les pays du Benelux !', centre: [0.415, 0.34], rayon: 0.09, pays: ['Belgique', 'Pays-Bas', 'Luxembourg'] },
  { key: 'scandinaves', nom: 'les pays scandinaves', nomSpeak: 'Retrouve les pays scandinaves !', centre: [0.49, 0.11], rayon: 0.13, pays: ['Suède', 'Norvège', 'Danemark', 'Finlande'] },
  { key: 'baltes', nom: 'les pays baltes', nomSpeak: 'Retrouve les pays baltes !', centre: [0.556, 0.23], rayon: 0.09, pays: ['Estonie', 'Lettonie', 'Lituanie'] },
  { key: 'iberique', nom: 'la péninsule ibérique', nomSpeak: 'Retrouve les pays de la péninsule ibérique !', centre: [0.305, 0.62], rayon: 0.10, pays: ['Espagne', 'Portugal'] },
  { key: 'iles_britanniques', nom: 'les îles britanniques', nomSpeak: 'Retrouve les îles britanniques !', centre: [0.33, 0.305], rayon: 0.09, pays: ['Royaume-Uni', 'Irlande'] },
  { key: 'balkans', nom: 'les Balkans', nomSpeak: 'Retrouve les pays des Balkans !', centre: [0.52, 0.57], rayon: 0.15, pays: ['Croatie', 'Bosnie-Herzégovine', 'Serbie', 'Monténégro', 'Albanie', 'Macédoine du Nord', 'Bulgarie'] },
];

// ============================================================
// Variante 2 : tap sur une zone regionale, zoom, puis chaque pays de la
// zone est presente un par un (touche-le sur la carte). Chaque pays
// trouve affiche son drapeau directement sur la carte -> collection
// visuelle qui se construit au fil du jeu.
// ============================================================
function EuropeZoneChallenge({ zone, onBack }) {
  const [phase, setPhase] = useState('zone'); // 'zone' -> 'pays'
  const [zoneTap, setZoneTap] = useState(null);
  const [found, setFound] = useState([]); // [{ pays, x, y }]
  const [tap, setTap] = useState(null);
  const [imgSize, setImgSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    speakSmart(zone.nomSpeak + ' Touche la zone sur la carte.');
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const remaining = zone.pays.filter((p) => !found.some((f) => f.pays === p));
  const currentPays = remaining[0];
  const done = phase === 'pays' && remaining.length === 0;

  useEffect(() => {
    if (phase === 'pays' && currentPays) {
      speakSmart(`Touche ${currentPays}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentPays]);

  useEffect(() => {
    if (done) {
      speakSmart(`Bravo ! Tu as trouvé tous les pays de ${zone.nom} !`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const hauteurDisponible = screenHeight - 120;
  const largeurMax = screenWidth - 16;
  const largeurSelonHauteur = hauteurDisponible * (540 / 300);
  const mapWidth = Math.max(200, Math.min(largeurMax, largeurSelonHauteur, 900));
  const mapHeight = mapWidth * (300 / 540);

  const zoomScale = 2.3;
  const innerWidth = mapWidth * zoomScale;
  const innerHeight = mapHeight * zoomScale;
  const offsetLeft = -zone.centre[0] * innerWidth + mapWidth / 2;
  const offsetTop = -zone.centre[1] * innerHeight + mapHeight / 2;

  function handleZoneTap(evt) {
    if (zoneTap) return;
    const { locationX, locationY } = evt.nativeEvent;
    const px = locationX / imgSize.width;
    const py = locationY / imgSize.height;
    const d = Math.hypot(px - zone.centre[0], py - zone.centre[1]);
    const ok = d <= zone.rayon;
    setZoneTap({ px, py, ok });
    if (ok) {
      speakSmart('Bravo ! On zoome...');
      setTimeout(() => setPhase('pays'), 1300);
    } else {
      speakSmart('Pas tout à fait, essaie encore.');
      setTimeout(() => setZoneTap(null), 900);
    }
  }

  function handleCountryTap(evt) {
    if (tap || !currentPays) return;
    const { locationX, locationY } = evt.nativeEvent;
    // Coordonnees relatives au contenu agrandi (innerWidth/innerHeight).
    const innerX = locationX - offsetLeft;
    const innerY = locationY - offsetTop;
    const px = innerX / innerWidth;
    const py = innerY / innerHeight;
    const cible = EUROPE_COUNTRY_COORDS[currentPays];
    const d = cible ? Math.hypot(px - cible[0], py - cible[1]) : Infinity;
    const ok = d <= 0.11;
    setTap({ px, py, ok });
    if (ok) {
      speakSmart(`Bravo, voici ${currentPays} !`);
      setTimeout(() => {
        setFound((f) => [...f, { pays: currentPays, x: cible[0], y: cible[1] }]);
        setTap(null);
      }, 1300);
    } else {
      speakSmart('Pas tout à fait, essaie encore.');
      setTimeout(() => setTap(null), 900);
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.mossDeep, textAlign: 'center' }}>
          Bravo ! Tu as trouvé tous les pays de {zone.nom} !
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 18, gap: 12 }}>
          {found.map((f) => (
            <Text key={f.pays} style={{ fontSize: 32 }}>{EUROPE_FLAGS[f.pays] ?? '🏳️'}</Text>
          ))}
        </View>
        <Pressable style={[styles.button, { marginTop: 24 }]} onPress={onBack}>
          <Text style={styles.buttonText}>‹ Retour aux zones</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginBottom: 6 }}>
        {phase === 'zone' ? `Touche la zone : ${zone.nom}` : `Touche : ${currentPays} ${EUROPE_FLAGS[currentPays] ?? ''}`}
      </Text>
      <Pressable
        style={[styles.listenButton, { marginBottom: 8 }]}
        onPress={() => speakSmart(phase === 'zone' ? zone.nomSpeak : `Touche ${currentPays}.`)}
      >
        <Text style={styles.listenText}>🎤 Écouter</Text>
      </Pressable>

      {phase === 'zone' ? (
        <Pressable
          onPress={handleZoneTap}
          onLayout={(e) => setImgSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          <Image source={CARTE_EUROPE} style={{ width: mapWidth, height: mapHeight, borderRadius: 12 }} resizeMode="contain" />
          {zoneTap && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', left: zoneTap.px * mapWidth - 18, top: zoneTap.py * mapHeight - 18,
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: zoneTap.ok ? 'rgba(76,175,80,0.75)' : 'rgba(229,83,61,0.75)',
                borderWidth: 2, borderColor: 'white',
              }}
            />
          )}
        </Pressable>
      ) : (
        <View style={{ width: mapWidth, height: mapHeight, overflow: 'hidden', borderRadius: 12 }}>
          <Pressable
            onPress={handleCountryTap}
            style={{ position: 'absolute', left: offsetLeft, top: offsetTop, width: innerWidth, height: innerHeight }}
          >
            <Image source={CARTE_EUROPE} style={{ width: innerWidth, height: innerHeight }} resizeMode="contain" />
            {found.map((f) => (
              <View
                key={f.pays}
                pointerEvents="none"
                style={{ position: 'absolute', left: f.x * innerWidth - 16, top: f.y * innerHeight - 16, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 26 }}>{EUROPE_FLAGS[f.pays] ?? '🏳️'}</Text>
              </View>
            ))}
            {tap && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute', left: tap.px * innerWidth - 14, top: tap.py * innerHeight - 14,
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: tap.ok ? 'rgba(76,175,80,0.75)' : 'rgba(229,83,61,0.75)',
                  borderWidth: 2, borderColor: 'white',
                }}
              />
            )}
          </Pressable>
        </View>
      )}

      {phase === 'pays' && (
        <Text style={{ marginTop: 8, color: colors.ink, opacity: 0.6 }}>
          {found.length}/{zone.pays.length} trouvés
        </Text>
      )}
      <Pressable style={{ marginTop: 10 }} onPress={onBack}>
        <Text style={{ color: colors.ink, opacity: 0.5 }}>‹ Abandonner et revenir aux zones</Text>
      </Pressable>
    </View>
  );
}


// Defi bonus : apres avoir trouve le bon pays via son drapeau, l'enfant doit
// le retrouver sur la carte. On cherche le pays le plus proche du point
// touche plutot que d'exiger un contour exact (bien plus tolerant pour un
// enfant qui vise a peu pres juste).
function EuropeMapChallenge({ pays, onResult }) {
  const [tap, setTap] = useState(null);
  const [imgSize, setImgSize] = useState({ width: 1, height: 1 });
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    speakSmart(`Bravo ! Maintenant, touche l'endroit où se trouve ${pays} sur la carte.`);
    // La carte est plus large que haute : passer temporairement en paysage
    // donne beaucoup plus de place pour toucher precisement les petits pays.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      .then(() => setIsLandscape(true))
      .catch(() => setIsLandscape(false));
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  function handlePress(evt) {
    if (tap) return; // une seule tentative
    const { locationX, locationY } = evt.nativeEvent;
    const px = locationX / imgSize.width;
    const py = locationY / imgSize.height;
    const cible = EUROPE_COUNTRY_COORDS[pays];
    // Tolerance generreuse autour du pays demande : on ne compare plus au
    // pays le plus proche parmi tous (trop severe quand des petits pays
    // sont serres les uns contre les autres), on verifie juste si le tap
    // tombe raisonnablement pres de LA bonne reponse.
    const distance = cible ? Math.hypot(px - cible[0], py - cible[1]) : Infinity;
    const TOLERANCE = 0.10;
    const correct = distance <= TOLERANCE;
    setTap({ px, py, correct });
    speakSmart(correct ? 'Bravo, bien joué !' : `Pas tout à fait, ${pays} était ici.`);
    setTimeout(() => onResult(correct), 1600);
  }

  // Carte agrandie au maximum de l'espace disponible (largeur ET hauteur,
  // car en paysage c'est la hauteur qui devient la contrainte principale).
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const hauteurDisponible = screenHeight - 130; // marge pour le titre et les bords
  const largeurMax = screenWidth - 16;
  const largeurSelonHauteur = hauteurDisponible * (540 / 300);
  const mapWidth = Math.max(200, Math.min(largeurMax, largeurSelonHauteur, 900));
  const mapHeight = mapWidth * (300 / 540);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginBottom: 10 }}>
        Touche {pays} sur la carte !
      </Text>
      <Pressable onPress={handlePress} onLayout={(e) => setImgSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        <Image source={CARTE_EUROPE} style={{ width: mapWidth, height: mapHeight, borderRadius: 12 }} resizeMode="contain" />
        {tap && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', left: tap.px * mapWidth - 12, top: tap.py * mapHeight - 12,
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: tap.correct ? 'rgba(76,175,80,0.85)' : 'rgba(229,83,61,0.85)',
              borderWidth: 2, borderColor: 'white',
            }}
          />
        )}
        {tap && !tap.correct && EUROPE_COUNTRY_COORDS[pays] && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: EUROPE_COUNTRY_COORDS[pays][0] * mapWidth - 14,
              top: EUROPE_COUNTRY_COORDS[pays][1] * mapHeight - 14,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: 'rgba(76,175,80,0.85)',
              borderWidth: 2, borderColor: 'white',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14 }}>✓</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function ChoiceGameScreen({ route, navigation, jeuCode, jeuTitre, buildPrompt, Character, maxRung, themeFilter, singleLineOptions, forcedStartRung, customVisual, onRequestRecalibrate }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [noContent, setNoContent] = useState(false);
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
  const shownIds = useRef(new Set());
  const shownAnswers = useRef(new Set());
  const startedAt = useRef(Date.now());
  const memosConfig = useRef(null);
  const roundStartedAt = useRef(Date.now());
  const recentRounds = useRef([]); // fenetre glissante des 4 dernieres manches
  const attentionChosenOnce = useRef(false);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [forcedPause, setForcedPause] = useState(false);
  // Petit repere visuel discret : nombre de bonnes reponses d'affilee sans
  // erreur dans la session en cours (remis a zero a la moindre erreur).
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mapChallenge, setMapChallenge] = useState(null); // pays a placer sur la carte, ou null
  const pendingNextRung = useRef(null);
  // Enchainement automatique au niveau suivant en cas de reussite, sans
  // repasser par la carte - mais on verifie quand meme le temps restant
  // avant chaque enchainement pour ne jamais le contourner completement.
  const [transitioning, setTransitioning] = useState(null); // message a afficher, ou null
  const { extraMinutesGranted } = useContext(ExtraTimeContext);
  const { baseRemaining } = useTimeBudget(profil);
  const liveRemaining = useLiveCountdown(baseRemaining);
  const effectiveRemainingIci = baseRemaining != null ? liveRemaining + extraMinutesGranted * 60 : null;
  const limiteAtteinteIci = effectiveRemainingIci != null && effectiveRemainingIci <= 0;

  useEffect(() => {
    fetchMemosConfig(profil.famille_id).then((cfg) => { memosConfig.current = cfg; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.famille_id]);

  // Ne lit a voix haute AUTOMATIQUEMENT que lorsque c'est indispensable
  // (aucune image ne permet de deviner la consigne autrement). Sinon,
  // la voix reste disponible a la demande via le bouton micro.
  useEffect(() => {
    if (!promptData || !promptData.mandatorySpeak) return;
    let cancelled = false;
    // Si un vrai bruit d'animal existe pour cette manche, on le joue a la
    // place de la devinette parlee - bien plus parlant pour un enfant qui
    // ne lit pas encore, et plus fidele que decrire le son avec des mots.
    if (promptData.soundEffect) {
      (async () => {
        if (cancelled) return;
        await speakSmart(promptData.promptText);
        if (cancelled) return;
        await playSoundEffect(promptData.soundEffect);
      })();
      return () => { cancelled = true; Speech.stop(); };
    }
    const parts = [promptData.promptText, promptData.speak].filter(Boolean);
    (async () => {
      for (const part of parts) {
        if (cancelled) return;
        await speakSmart(part);
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
    setNoContent(false);
    errorsThisRound.current = 0;

    async function fetchWithFilter(withPalier) {
      let query = supabase
        .from('contenu_mini_jeu')
        .select('id, donnees')
        .eq('mini_jeu_id', jeuId)
        .eq('niveau', niveau)
        .eq('actif', true);
      if (withPalier) query = query.eq('palier', palierValue);
      if (themeFilter) {
        query = query.eq(`donnees->>${themeFilter.field}`, themeFilter.value);
      }
      const { data } = await query.limit(60);
      return data ?? [];
    }

    // On cherche d'abord dans le palier exact ; si un theme choisi par
    // l'enfant (ex: animaux, monuments) n'a pas encore assez de contenu a
    // ce niveau precis, on elargit a tout le niveau plutot que de rester
    // bloque sur un ecran vide.
    let data = await fetchWithFilter(true);
    if (data.length === 0) {
      data = await fetchWithFilter(false);
    }

    // Evite de repeter un element deja vu dans CETTE session (par ligne de
    // contenu ET par reponse - deux lignes differentes en base peuvent
    // donner exactement la meme question, ex: meme pays via drapeau et via
    // capitale) ; si le stock est epuise, on autorise de nouveau les
    // repetitions plutot que de rester bloque.
    let pool = data
      .filter((r) => !shownIds.current.has(r.id))
      .filter((r) => {
        const rep = buildPrompt(r.donnees)?.correct;
        return rep === undefined || !shownAnswers.current.has(String(rep));
      });
    if (pool.length === 0) {
      pool = data.filter((r) => !shownIds.current.has(r.id));
    }
    if (pool.length === 0) {
      shownIds.current.clear();
      shownAnswers.current.clear();
      pool = data;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? data[0];
    if (!pick) {
      setLoading(false);
      setNoContent(true);
      return;
    }
    shownIds.current.add(pick.id);
    const prompt = buildPrompt(pick.donnees);
    if (prompt?.correct !== undefined) shownAnswers.current.add(String(prompt.correct));
    setPromptData(prompt);
    setOptionsOrder(shuffle(prompt.options));
    setLoading(false);
    roundStartedAt.current = Date.now();
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

      // Priorite : progression deja sauvegardee > resultat d'un calibrage
      // initial (si fourni par l'ecran appelant) > niveau scolaire par defaut.
      const rawStartRung = prog?.palier_actuel ?? forcedStartRung ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      const startRung = maxRung ? Math.min(rawStartRung, maxRung) : rawStartRung;
      setRung(startRung);
      const { niveau, palier: palierValue } = gradeAndPalierFromRung(rungWithSessionRamp(startRung, 1, TOTAL_ROUNDS, maxRung));
      loadRound(jeu.id, niveau, palierValue);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  function speak(text) {
    if (text) speakSmart(text);
  }

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung, maxRung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: TOTAL_ROUNDS,
      startedAt: startedAt.current,
      tempsMoyenParManche: Math.round(durationSeconds / TOTAL_ROUNDS),
    });

    // Reussite ET du temps de jeu restant : on propose de continuer sur le
    // niveau suivant sans repasser par la carte - mais c'est desormais
    // l'enfant qui choisit, via un bouton "Continuer", plutot qu'un
    // enchainement automatique impose.
    if (summary.direction === 'up' && !limiteAtteinteIci) {
      const messages = [
        `Bravo ${speechFriendlyName(profil.prenom)}, niveau suivant ! Touche le bouton pour continuer.`,
        `Excellent ${speechFriendlyName(profil.prenom)} ! Touche continuer si tu veux jouer encore.`,
        `Trop fort ${speechFriendlyName(profil.prenom)} ! Appuie sur continuer pour la suite.`,
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setTransitioning(msg);
      speakSmart(msg);
      pendingNextRung.current = summary.newRung;
      return;
    }

    // Meme sans montee de niveau (echec ou stagnation), on garde la
    // possibilite de reprendre directement au meme niveau sans repasser
    // par la carte, tant qu'il reste du temps de jeu.
    pendingNextRung.current = summary.newRung;
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextLevel() {
    const newRung = pendingNextRung.current;
    setTransitioning(null);
    setSessionDone(false); // sinon l'ecran de fin reste bloque a l'affichage pour toujours
    errorsTotal.current = 0;
    recentRounds.current = [];
    attentionChosenOnce.current = false;
    setPerfectStreak(0);
    startedAt.current = Date.now();
    setRung(newRung);
    setRound(1);
    const { niveau, palier } = gradeAndPalierFromRung(rungWithSessionRamp(newRung, 1, TOTAL_ROUNDS, maxRung));
    loadRound(miniJeuId, niveau, palier);
  }

  function onOptionPress(value) {
    if (!promptData || answered !== null || showSafetyCheck || forcedPause) return;
    const isCorrect = String(value) === String(promptData.correct);
    const secondesEcoulees = (Date.now() - roundStartedAt.current) / 1000;
    setAnswered(value);

    if (isCorrect) {
      recentRounds.current = [...recentRounds.current, { wrong: false, fast: false }].slice(-4);
      setPerfectStreak((s) => s + 1);
      setFeedback('Bravo !');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 800);
      maybeSpeakMidSessionEncouragement(round);

      setTimeout(async () => {
        if (round >= TOTAL_ROUNDS) {
          await finishSession();
        } else {
          setRound((r) => r + 1);
          const { niveau, palier } = gradeAndPalierFromRung(rungWithSessionRamp(rung, round + 1, TOTAL_ROUNDS, maxRung));
          loadRound(miniJeuId, niveau, palier);
        }
      }, 700);
    } else {
      errorsThisRound.current += 1;
      errorsTotal.current += 1;
      setFeedback('Essaie encore !');
      maybePlayMemo(memosConfig.current, 'mauvaise_reponse');

      // Fenetre glissante des 4 dernieres manches : on detecte le motif
      // "beaucoup de reponses fausses ET tres rapides" plutot qu'une simple
      // suite, pour tolerer une erreur isolee sans declencher a tort.
      const estRapide = secondesEcoulees < 1.7;
      recentRounds.current = [...recentRounds.current, { wrong: true, fast: estRapide }].slice(-4);
      const fenetre = recentRounds.current;
      const declenche = fenetre.length === 4 && fenetre.filter((r) => r.wrong && r.fast).length >= 3;

      if (declenche) {
        setTimeout(() => {
          setFeedback(null);
          setAnswered(null);
          setShowSafetyCheck(true);
          speakSmart('On dirait que tu réponds vite sans trop regarder. Est-ce que c\'est trop difficile ?');
        }, 700);
      } else if (errorsThisRound.current >= 3) {
        // La bonne reponse vient d'etre revelee en surbrillance : on laisse
        // un peu plus de temps pour que l'enfant la voie avant de continuer.
        setTimeout(() => {
          setFeedback(null);
          setAnswered(null);
        }, 2200);
      } else {
        setTimeout(() => {
          setFeedback(null);
          setAnswered(null);
        }, 700);
      }
    }
  }

  async function proceedAfterMapChallenge() {
    setMapChallenge(null);
    if (round >= TOTAL_ROUNDS) {
      await finishSession();
    } else {
      setRound((r) => r + 1);
      const { niveau, palier } = gradeAndPalierFromRung(rungWithSessionRamp(rung, round + 1, TOTAL_ROUNDS, maxRung));
      loadRound(miniJeuId, niveau, palier);
    }
  }

  async function handleSafetyResponse(tropDur) {
    setShowSafetyCheck(false);
    if (miniJeuId) {
      await supabase.from('signalements_difficulte').insert({
        profil_id: profil.id,
        mini_jeu_id: miniJeuId,
        trop_dur: tropDur,
      });
    }
    if (tropDur) {
      speakSmart("Pas de souci ! On va s'entraîner sur des choses un peu plus simples la prochaine fois.");
      setTimeout(() => finishSession(), 2600);
    } else {
      recentRounds.current = [];
      if (attentionChosenOnce.current) {
        // Deja arrive une fois dans cette session malgre la promesse de faire
        // attention : on force une petite pause avant de pouvoir retoucher.
        setForcedPause(true);
        setTimeout(() => setForcedPause(false), 4000);
      }
      attentionChosenOnce.current = true;
    }
  }

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} onContinue={!limiteAtteinteIci ? proceedToNextLevel : undefined} />;
  }

  if (transitioning) {
    return (
      <View style={styles.center}>
        <BouncingWrap><Noisette size={80} /></BouncingWrap>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginTop: 16 }}>
          {transitioning}
        </Text>
        <Text style={{ fontSize: 30, marginTop: 8 }}>🎉</Text>
        <Pressable style={[styles.button, { marginTop: 24, paddingHorizontal: 32 }]} onPress={proceedToNextLevel}>
          <Text style={styles.buttonText}>▶️ Continuer</Text>
        </Pressable>
      </View>
    );
  }

  if (noContent) {
    return (
      <View style={styles.center}>
        <BouncingWrap><Noisette size={72} /></BouncingWrap>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.mossDeep, textAlign: 'center', marginTop: 16, paddingHorizontal: 24 }}>
          Pas encore assez de questions pour ce thème à ce niveau !
        </Text>
        <Pressable style={[styles.button, { marginTop: 20 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>‹ Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (loading || !promptData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  if (showSafetyCheck) {
    return (
      <View style={styles.safetyCheckScreen}>
        <BouncingWrap><Noisette size={72} /></BouncingWrap>
        <Text style={styles.safetyCheckTitle}>On dirait que tu réponds vite…</Text>
        <Text style={styles.safetyCheckQuestion}>Est-ce que c'est trop difficile ?</Text>
        <Pressable
          style={styles.listenButton}
          onPress={() => speakSmart("Est-ce que c'est trop difficile ?")}
        >
          <Text style={styles.listenText}>🎤 Réécouter</Text>
        </Pressable>
        <View style={styles.safetyCheckButtons}>
          <Pressable style={styles.safetyCheckBtnHard} onPress={() => handleSafetyResponse(true)}>
            <Text style={styles.safetyCheckEmoji}>😖</Text>
            <Text style={styles.safetyCheckBtnText}>Oui, c'est trop dur</Text>
          </Pressable>
          <Pressable style={styles.safetyCheckBtnOk} onPress={() => handleSafetyResponse(false)}>
            <Text style={styles.safetyCheckEmoji}>😊</Text>
            <Text style={styles.safetyCheckBtnText}>Non, je vais faire attention</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Toutes les cases de reponse doivent avoir la meme taille de police par
  // defaut ; seule une reponse qui depasse nettement les autres (2 caracteres
  // ou plus de plus que la plus courte) est reduite, pour ne jamais avoir
  // une case avec un texte visiblement plus petit que ses voisines sans
  // raison.
  const longueursOptions = optionsOrder.map((o) => String(o).length);
  const longueurMin = longueursOptions.length ? Math.min(...longueursOptions) : 0;

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame(jeuCode) }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>{jeuTitre}</Text>
        {onRequestRecalibrate && (
          <Pressable onPress={onRequestRecalibrate} hitSlop={10} style={{ marginRight: 6 }}>
            <Text style={{ fontSize: 20 }}>🔄</Text>
          </Pressable>
        )}
        <Text style={styles.roundLabel}>{round}/{TOTAL_ROUNDS}</Text>
      </View>

      {perfectStreak > 0 && (
        <View style={styles.streakRow}>
          {Array.from({ length: Math.min(perfectStreak, 5) }).map((_, i) => (
            <Text key={i} style={styles.streakStar}>⭐</Text>
          ))}
        </View>
      )}

      {forcedPause && (
        <View style={styles.forcedPauseBanner}>
          <Text style={styles.forcedPauseText}>🌿 Prends un instant pour bien regarder…</Text>
        </View>
      )}

      {Character ? (
        <View style={styles.gameCharacter}>
          <BouncingWrap><Character size={48} /></BouncingWrap>
          <ConfettiBurst trigger={showConfetti} />
        </View>
      ) : null}

      <View style={styles.promptZone}>
        {promptData.icon ? <Text style={styles.icon}>{promptData.icon}</Text> : null}
        {promptData.visual && !customVisual ? <Text style={styles.visualRow}>{promptData.visual}</Text> : null}
        {promptData.emojiCount != null ? (
          <View style={{ marginBottom: 10 }}>
            {promptData.emojiDistracteurIcon ? (
              <EmojiCountRowMixed
                count={promptData.emojiCount}
                emoji={promptData.emojiIcon ?? '🍎'}
                distracteurCount={promptData.emojiDistracteurCount}
                distracteurEmoji={promptData.emojiDistracteurIcon}
                size={30}
              />
            ) : (
              <EmojiCountRow count={promptData.emojiCount} emoji={promptData.emojiIcon ?? '🍎'} size={30} />
            )}
          </View>
        ) : null}
        {promptData.emojiSplit ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'center', marginBottom: 10 }}>
            <View style={{ maxWidth: '42%' }}>
              <EmojiCountRow count={promptData.emojiSplit[0]} emoji={promptData.emojiIcon ?? '🍎'} size={26} />
            </View>
            <View style={{ maxWidth: '42%' }}>
              <EmojiCountRow count={promptData.emojiSplit[1]} emoji={promptData.emojiIcon ?? '🍎'} size={26} />
            </View>
          </View>
        ) : null}
        {promptData.emojiCompare ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ maxWidth: '40%' }}>
              <EmojiCountRow count={promptData.emojiCompare[0]} emoji={promptData.emojiIcon ?? '🍎'} size={22} />
            </View>
            <Text style={{ fontWeight: '800', color: colors.mossDeep }}>VS</Text>
            <View style={{ maxWidth: '40%' }}>
              <EmojiCountRow count={promptData.emojiCompare[1]} emoji={promptData.emojiIcon ?? '🍎'} size={22} />
            </View>
          </View>
        ) : null}
        {promptData.texteAffiche ? (
          <View style={styles.readingBox}>
            <Text style={styles.readingText}>{promptData.texteAffiche}</Text>
          </View>
        ) : null}
        <Text style={styles.promptText}>{promptData.promptText}</Text>
        {promptData.speak ? (
          <Pressable
            style={styles.listenButton}
            onPress={() => promptData.soundEffect ? playSoundEffect(promptData.soundEffect) : speak(promptData.speak)}
          >
            <Text style={styles.listenText}>🎤 Écouter</Text>
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

      {customVisual ? (
        (() => { const CustomVisual = customVisual; return <CustomVisual promptData={promptData} onOptionPress={onOptionPress} answered={answered} />; })()
      ) : (
      <View style={styles.answerZone}>
        <Text style={styles.answerZoneLabel}>Ta réponse</Text>
        <View style={styles.stonesWrap}>
          {optionsOrder.map((option, i) => {
            const isAnswered = answered !== null;
            const isThisCorrect = String(option) === String(promptData.correct);
            const isThisAnswer = isAnswered && String(option) === String(answered);
            // On ne revele la bonne reponse en surbrillance que si l'enfant
            // l'a trouvee, ou apres 3 erreurs sur CETTE question - jamais
            // immediatement a la premiere erreur, pour ne pas donner la
            // reponse en meme temps que l'echec.
            const revealCorrect = (isAnswered && isThisAnswer) || errorsThisRound.current >= 3;
            const bg = STONE_COLORS[i % STONE_COLORS.length];
            // Un emoji seul (comme ❤️ ou 🫁) doit etre affiche bien plus
            // grand qu'un mot ou une phrase, sinon il paraît minuscule dans
            // un aussi grand bouton.
            const estUnEmojiSeul = String(option).length <= 4;
            // Ne reduit CETTE case que si elle depasse nettement les autres
            // (2 caracteres ou plus) - sinon toutes les cases gardent la
            // meme taille de police par defaut, pour un rendu uniforme.
            const depasseLesAutres = String(option).length - longueurMin >= 2;
            return (
              <Pressable
                key={i}
                disabled={isAnswered}
                onPress={() => onOptionPress(option)}
                hitSlop={14}
                style={[
                  styles.optionButton,
                  { backgroundColor: bg },
                  isAnswered && isThisCorrect && revealCorrect && styles.optionCorrect,
                  isAnswered && isThisAnswer && !isThisCorrect && styles.optionWrong,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    estUnEmojiSeul && styles.optionTextIcon,
                    depasseLesAutres && { fontSize: 17 },
                  ]}
                  numberOfLines={singleLineOptions ? 1 : 2}
                  adjustsFontSizeToFit
                  minimumFontScale={singleLineOptions ? 0.5 : 0.7}
                >
                  {String(option)}
                </Text>
                <Pressable
                  style={[styles.optionListenBtn, estUnEmojiSeul && styles.optionListenBtnBas]}
                  onPress={() => speakSmart(String(option))}
                  hitSlop={10}
                >
                  <Text style={{ fontSize: 15 }}>🎤</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </View>
      )}
    </ScrollView>
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
        mandatorySpeak: false, // une image est deja visible
        options: d.options,
        correct: d.syllabes,
      };
    case 'rimer':
      return {
        icon: d.cible_icon,
        promptText: 'Quel mot rime avec celui-ci ?',
        speak: d.cible,
        mandatorySpeak: false, // une image est deja visible
        options: d.options,
        correct: d.bonne_reponse,
      };
    case 'fusionner': {
      const correct = d.options.find((o) => o.toLowerCase() === String(d.son).toLowerCase()) ?? d.options[0];
      return {
        promptText: 'Quelle lettre fait ce son ?',
        speak: speechFriendlyToken(d.son),
        mandatorySpeak: true, // aucune image : le son doit etre entendu
        options: d.options,
        correct,
      };
    }
    case 'fusionner_syllabe':
      return {
        promptText: 'Quelle syllabe fait "' + d.son1 + '" + "' + d.son2 + '" ?',
        speak: speechFriendlyToken(d.son1) + speechFriendlyToken(d.son2),
        mandatorySpeak: true, // aucune image : le son doit etre entendu
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
        mandatorySpeak: true, // aucune image : le mot doit etre entendu
        options: d.options,
        correct: d.resultat,
      };
    }
    case 'premiere_syllabe':
      return {
        icon: d.icon,
        promptText: 'Quelle est la première syllabe de ce mot ?',
        speak: d.mot,
        mandatorySpeak: false, // une image est deja visible
        options: d.syllabes,
        correct: d.reponse,
      };
    case 'comprehension':
      return {
        texteAffiche: d.texte,
        promptText: d.question,
        speak: `${d.texte} ${d.question}`,
        mandatorySpeak: true, // c'est un texte a lire/entendre, coeur de l'exercice
        options: d.options,
        correct: d.bonne_reponse,
      };
    default:
      return { promptText: '...', options: [], correct: null };
  }
}

function SonsMagiquesScreen({ route, navigation }) {
  return (
    <CalibratedChoiceGame
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
  // Un objet different tire au hasard a chaque manche (pas toujours des
  // pommes), pour varier ce qu'on demande de compter/comparer.
  const objet = pickRandomObjet((d.cible ?? 0) + (d.decomposition ? d.decomposition[0] * 7 : 0) + Date.now() % 97);
  const nomObjetPluriel = { '🍎': 'pommes', '🍓': 'fraises', '🍌': 'bananes', '🍇': 'grappes de raisin', '🍊': 'oranges', '⭐': 'étoiles', '🎈': 'ballons', '🐝': 'abeilles', '🐞': 'coccinelles', '🦋': 'papillons', '🐣': 'poussins', '🌸': 'fleurs', '🍄': 'champignons', '🐚': 'coquillages', '🎲': 'dés', '🧩': 'pièces de puzzle', '🚗': 'voitures', '🎁': 'cadeaux', '🦆': 'canards', '🐟': 'poissons' }[objet] ?? 'objets';
  switch (d.etape) {
    case 'concret': {
      // Objets-pieges optionnels (definis dans le contenu) : varie la
      // mecanique de comptage repetee sur plusieurs manches sans changer la
      // question - d'abord uniquement l'objet a compter, puis un objet
      // piege s'ajoute au milieu (a ne pas compter), puis leurs positions
      // sont simplement remelangees d'une manche a l'autre.
      let distracteurIcon = null;
      if (d.distracteur?.count > 0) {
        const pool = OBJETS_A_COMPTER.filter((o) => o !== objet);
        distracteurIcon = pool[Math.floor(Math.random() * pool.length)] ?? '🍐';
      }
      return {
        emojiCount: d.cible,
        emojiIcon: objet,
        emojiDistracteurCount: d.distracteur?.count ?? 0,
        emojiDistracteurIcon: distracteurIcon,
        promptText: `Combien de ${nomObjetPluriel} vois-tu ?`,
        speak: `Combien de ${nomObjetPluriel} vois-tu ?`,
        mandatorySpeak: false, // les objets sont visibles a l'ecran
        options: d.options,
        correct: d.cible,
      };
    }
    case 'chiffre':
      return {
        emojiCount: d.cible,
        emojiIcon: objet,
        promptText: 'Quel chiffre correspond à cette quantité ?',
        speak: 'Quel chiffre correspond à cette quantité ?',
        mandatorySpeak: false,
        options: d.options,
        correct: d.cible,
      };
    case 'image': {
      const a = d.decomposition[0];
      const b = d.decomposition[1];
      return {
        emojiSplit: [a, b],
        emojiIcon: objet,
        promptText: a + ' + ' + b + ' = ?',
        speak: `${a} plus ${b}, ça fait combien ?`,
        mandatorySpeak: false, // le calcul est deja affiche en chiffres
        options: [d.cible, d.cible - 1, d.cible + 1],
        correct: d.cible,
      };
    }
    case 'abstrait': {
      const symboles = { addition: '+', soustraction: '−', multiplication: '×', division: '÷' };
      const symbole = symboles[d.operation] ?? '+';
      return {
        promptText: d.a + ' ' + symbole + ' ' + d.b + ' = ?',
        speak: `${d.a} ${d.operation === 'addition' ? 'plus' : d.operation === 'soustraction' ? 'moins' : d.operation === 'multiplication' ? 'fois' : 'divisé par'} ${d.b}, ça fait combien ?`,
        mandatorySpeak: false, // le calcul est deja affiche en chiffres
        options: d.options,
        correct: d.resultat,
      };
    }
    case 'comparer': {
      // Varie aleatoirement le sens de la question (gauche vs droite, ou
      // droite vs gauche) plutot que de toujours demander la meme chose -
      // la reponse est recalculee selon le sens choisi.
      const demandeDepuisGauche = Math.random() < 0.5;
      const a = demandeDepuisGauche ? d.gauche : d.droite;
      const b = demandeDepuisGauche ? d.droite : d.gauche;
      const reponseCalculee = a > b ? 'plus' : a < b ? 'moins' : 'autant';
      const cote1 = demandeDepuisGauche ? 'gauche' : 'droite';
      const cote2 = demandeDepuisGauche ? 'droite' : 'gauche';
      const question = `Le groupe de ${cote1} a-t-il plus, moins ou autant que celui de ${cote2} ?`;
      return {
        emojiCompare: [d.gauche, d.droite],
        emojiIcon: objet,
        promptText: question,
        speak: question,
        mandatorySpeak: false, // les groupes sont visibles
        options: ['plus', 'moins', 'autant'],
        correct: reponseCalculee,
      };
    }
    default:
      return { promptText: '...', options: [], correct: null };
  }
}

// ============================================================
// Le Monde en Capitales — geographie (drapeaux, pays, capitales)
// ============================================================
// Utilise uniquement pour l'etape 'drapeau_capitale' : le contenu en base
// ne stocke que l'emoji du drapeau pour cette etape-la (pas le nom du
// pays), donc on le retrouve ici pour pouvoir le dire et l'ecrire a cote
// du drapeau - ca aide a associer le drapeau au pays, comme demande,
// plutot que de demander une capitale "de ce pays" sans jamais le nommer.
const DRAPEAU_VERS_PAYS = {
  '🇦🇴': 'l\'Angola', '🇦🇷': 'l\'Argentine', '🇦🇺': 'l\'Australie', '🇧🇩': 'le Bangladesh',
  '🇧🇪': 'la Belgique', '🇧🇬': 'la Bulgarie', '🇧🇮': 'le Burundi', '🇧🇴': 'la Bolivie',
  '🇧🇼': 'le Botswana', '🇨🇩': 'la République démocratique du Congo', '🇨🇬': 'le Congo',
  '🇨🇭': 'la Suisse', '🇨🇮': 'la Côte d\'Ivoire', '🇨🇱': 'le Chili', '🇨🇲': 'le Cameroun',
  '🇨🇴': 'la Colombie', '🇨🇺': 'Cuba', '🇨🇿': 'la République tchèque', '🇩🇿': 'l\'Algérie',
  '🇪🇨': 'l\'Équateur', '🇪🇪': 'l\'Estonie', '🇪🇹': 'l\'Éthiopie', '🇫🇮': 'la Finlande',
  '🇬🇦': 'le Gabon', '🇬🇳': 'la Guinée', '🇬🇷': 'la Grèce', '🇭🇷': 'la Croatie',
  '🇭🇺': 'la Hongrie', '🇮🇩': 'l\'Indonésie', '🇮🇱': 'Israël', '🇮🇳': 'l\'Inde',
  '🇮🇶': 'l\'Irak', '🇮🇷': 'l\'Iran', '🇮🇸': 'l\'Islande', '🇯🇲': 'la Jamaïque',
  '🇰🇪': 'le Kenya', '🇰🇷': 'la Corée du Sud', '🇱🇧': 'le Liban', '🇱🇰': 'le Sri Lanka',
  '🇱🇹': 'la Lituanie', '🇱🇻': 'la Lettonie', '🇲🇦': 'le Maroc', '🇲🇳': 'la Mongolie',
  '🇲🇼': 'le Malawi', '🇲🇾': 'la Malaisie', '🇲🇿': 'le Mozambique', '🇳🇦': 'la Namibie',
  '🇳🇬': 'le Nigeria', '🇳🇱': 'les Pays-Bas', '🇳🇴': 'la Norvège', '🇳🇵': 'le Népal',
  '🇳🇿': 'la Nouvelle-Zélande', '🇵🇪': 'le Pérou', '🇵🇰': 'le Pakistan', '🇵🇱': 'la Pologne',
  '🇵🇹': 'le Portugal', '🇵🇾': 'le Paraguay', '🇷🇴': 'la Roumanie', '🇷🇸': 'la Serbie',
  '🇷🇺': 'la Russie', '🇷🇼': 'le Rwanda', '🇸🇦': 'l\'Arabie saoudite', '🇸🇪': 'la Suède',
  '🇸🇬': 'Singapour', '🇸🇰': 'la Slovaquie', '🇸🇾': 'la Syrie', '🇹🇭': 'la Thaïlande',
  '🇹🇳': 'la Tunisie', '🇹🇷': 'la Turquie', '🇹🇼': 'Taïwan', '🇺🇦': 'l\'Ukraine',
  '🇺🇾': 'l\'Uruguay', '🇻🇪': 'le Venezuela', '🇻🇳': 'le Vietnam', '🇾🇪': 'le Yémen',
  '🇿🇲': 'la Zambie',
};

function buildGeoPrompt(d) {
  switch (d.etape) {
    case 'drapeau_pays':
      return {
        icon: d.drapeau,
        promptText: 'Quel est ce pays ?',
        speak: 'Quel est ce pays ?',
        mandatorySpeak: false,
        options: d.options,
        correct: d.reponse,
      };
    case 'pays_capitale':
      return {
        promptText: `Quelle est la capitale de ${d.pays} ?`,
        speak: `Quelle est la capitale de ${d.pays} ?`,
        mandatorySpeak: false, // le nom du pays est deja ecrit a l'ecran
        options: d.options,
        correct: d.reponse,
      };
    case 'drapeau_capitale': {
      const pays = DRAPEAU_VERS_PAYS[d.drapeau];
      const question = pays ? `Quelle est la capitale de ${pays} ?` : 'Quelle est la capitale de ce pays ?';
      return {
        icon: d.drapeau,
        promptText: question,
        speak: question,
        mandatorySpeak: false, // le pays est deja ecrit a l'ecran quand on le connait
        options: d.options,
        correct: d.reponse,
      };
    }
    case 'animal_pays':
      return {
        icon: d.animal,
        promptText: 'Quel pays a cet animal comme emblème ?',
        speak: 'Quel pays a cet animal comme emblème ?',
        mandatorySpeak: false,
        options: d.options,
        correct: d.reponse,
      };
    case 'langue_pays':
      return {
        promptText: `Quelle langue parle-t-on principalement en ${d.pays} ?`,
        speak: `Quelle langue parle-t-on principalement en ${d.pays} ?`,
        mandatorySpeak: false,
        options: d.options,
        correct: d.reponse,
      };
    case 'monument_pays':
      return {
        icon: d.monument,
        promptText: 'Dans quel pays se trouve ce monument ?',
        speak: 'Dans quel pays se trouve ce monument ?',
        mandatorySpeak: false,
        options: d.options,
        correct: d.reponse,
      };
    default:
      return { promptText: '...', options: [], correct: null };
  }
}

const MONDE_THEMES = [
  { key: 'alea', label: '🌍 Mélange de tout', labelSpeak: 'Mélange de tout', filter: null, titre: '🌍 Le Monde en Capitales' },
  { key: 'drapeau', label: '🏳️ Les drapeaux', labelSpeak: 'Les drapeaux', filter: { field: 'categorie', value: 'drapeau' }, titre: '🏳️ Les Drapeaux du Monde' },
  { key: 'capitale', label: '🏛️ Les capitales', labelSpeak: 'Les capitales', filter: { field: 'categorie', value: 'capitale' }, titre: '🏛️ Les Capitales' },
  { key: 'langue', label: '🗣️ Les langues', labelSpeak: 'Les langues', filter: { field: 'categorie', value: 'langue' }, titre: '🗣️ Les Langues du Monde' },
];
const MONDE_CONTINENTS = [
  { key: 'Europe', label: '🇪🇺 Europe', labelSpeak: 'Europe' },
  { key: 'Afrique', label: '🌍 Afrique', labelSpeak: 'Afrique' },
  { key: 'Asie', label: '🌏 Asie', labelSpeak: 'Asie' },
  { key: 'Amerique', label: '🌎 Amérique', labelSpeak: 'Amérique' },
  { key: 'Oceanie', label: '🏝️ Océanie', labelSpeak: 'Océanie' },
];

function MondeCapitalesScreen({ route, navigation }) {
  const [choix, setChoix] = useState(null); // theme choisi, ou null = ecran de choix
  const [showContinents, setShowContinents] = useState(false);

  if (choix) {
    return (
      <CalibratedChoiceGame
        route={route}
        navigation={navigation}
        jeuCode="monde_capitales"
        Character={Noisette}
        jeuTitre={choix.titre}
        buildPrompt={buildGeoPrompt}
        maxRung={MAX_CONTENT_RUNG}
        themeFilter={choix.filter}
        singleLineOptions
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: 24, paddingBottom: 24 }]}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>‹</Text>
      </Pressable>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginVertical: 10 }}>
        🌍 Choisis un thème !
      </Text>
      <Pressable
        style={styles.helperText}
        onPress={() => speakSmart('Choisis un thème pour jouer : mélange de tout, drapeaux, capitales, animaux, langues, monuments, îles, ou par continent.')}
      >
        <Text style={{ textAlign: 'center', fontSize: 12, color: colors.ink, opacity: 0.6, marginBottom: 4 }}>🎤 Touche pour entendre les choix</Text>
      </Pressable>
      {!showContinents ? (
        <>
          {MONDE_THEMES.map((t) => (
            <Pressable
              key={t.key}
              style={[styles.button, { marginTop: 8, paddingVertical: 10 }]}
              onPress={() => { speakSmart(t.labelSpeak); setChoix(t); }}
            >
              <Text style={[styles.buttonText, { fontSize: 15 }]}>{t.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.button, { marginTop: 8, paddingVertical: 10, backgroundColor: colors.sand }]}
            onPress={() => setShowContinents(true)}
          >
            <Text style={[styles.buttonText, { fontSize: 15, color: colors.ink }]}>🗺️ Par continent</Text>
          </Pressable>
        </>
      ) : (
        <>
          {MONDE_CONTINENTS.map((c) => (
            <Pressable
              key={c.key}
              style={[styles.button, { marginTop: 10 }]}
              onPress={() => {
                speakSmart(c.labelSpeak);
                setChoix({ filter: { field: 'continent', value: c.key }, titre: `${c.label} - Le Monde en Capitales` });
              }}
            >
              <Text style={styles.buttonText}>{c.label}</Text>
            </Pressable>
          ))}
          <Pressable style={{ marginTop: 14, alignItems: 'center' }} onPress={() => setShowContinents(false)}>
            <Text style={{ color: colors.ink, opacity: 0.6, fontWeight: '600' }}>‹ Retour aux thèmes</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

// ============================================================
// Le Jeu des Intrus — logique (reperer l'element qui ne va pas)
// ============================================================
function buildIntrusPrompt(d) {
  // Varie la formulation de la consigne d'une manche a l'autre (meme
  // question au fond : trouver l'intrus) pour eviter d'entendre
  // exactement la meme phrase a chaque fois.
  const formulations = [
    { promptText: "Trouve l'intrus !", speak: "Trouve l'intrus, celui qui ne va pas avec les autres." },
    { promptText: "Lequel ne va pas avec les autres ?", speak: "Lequel de ces mots ne va pas avec les autres ?" },
    { promptText: "Quel est l'intrus ?", speak: "Regarde bien : quel est l'intrus dans cette liste ?" },
    { promptText: "Trouve celui qui est différent !", speak: "Trouve celui qui est différent des trois autres." },
  ];
  const choix = formulations[Math.floor(Math.random() * formulations.length)];
  return {
    promptText: choix.promptText,
    speak: choix.speak,
    mandatorySpeak: false,
    options: d.items,
    correct: d.intrus,
  };
}

function JeuIntrusScreen({ route, navigation }) {
  return (
    <CalibratedChoiceGame
      route={route}
      navigation={navigation}
      jeuCode="jeu_intrus"
      Character={Noisette}
      jeuTitre="🔍 Le Jeu des Intrus"
      buildPrompt={buildIntrusPrompt}
      maxRung={MAX_CONTENT_RUNG}
    />
  );
}

// ============================================================
// Les Empreintes de la Clairière — logique (suites a completer)
// ============================================================
function buildSuitePrompt(d) {
  return {
    visual: d.sequence.join('   ') + '   ❓',
    promptText: 'Que vient ensuite ?',
    speak: 'Que vient ensuite dans cette suite ?',
    mandatorySpeak: false,
    options: d.options,
    correct: d.suivant,
  };
}

function EmpreintesClairiereScreen({ route, navigation }) {
  return (
    <CalibratedChoiceGame
      route={route}
      navigation={navigation}
      jeuCode="empreintes_clairiere"
      Character={Luma}
      jeuTitre="🐾 Les Empreintes de la Clairière"
      buildPrompt={buildSuitePrompt}
      maxRung={MAX_CONTENT_RUNG}
    />
  );
}

// ============================================================
// La Balance de la Prairie — maths (equilibrer une balance)
// Vraie balance visuelle a deux plateaux qui s'inclinent pour trouver
// l'equilibre (garde, c'est ce qui rend la balance parlante). Ce qui
// change : au lieu d'ajouter un seul type de poids en boucle (trop facile,
// il suffisait de regarder la barre redevenir horizontale sans vraiment
// calculer), l'enfant choisit desormais parmi une dizaine de poids de
// VALEURS DIFFERENTES (1 a 10) a combiner - il doit vraiment calculer
// quelle combinaison atteint le bon total, pas juste taper au hasard en
// regardant la balance.
// ============================================================
function buildEquilibrePrompt(d) {
  return {
    promptText: 'Choisis des poids pour équilibrer la balance !',
    speak: 'Choisis des poids pour équilibrer la balance !',
    mandatorySpeak: true,
    gauche: d.gauche,
    droitConnu: d.droit_connu,
    correct: d.manque,
    options: d.options, // non affiche (customVisual gere sa propre interface), garde pour ne pas casser le moteur partage qui melange "options" a chaque manche
  };
}

// Dix poids de valeurs differentes, avec une couleur propre a chacun pour
// bien les distinguer d'un coup d'oeil (pas seulement par le chiffre, utile
// pour un enfant qui debute en lecture des nombres).
const BALANCE_VALEURS_POIDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BALANCE_COULEURS_POIDS = ['#7BB6E8', '#F2A65A', '#8FD19E', '#E8899A', '#C9A6E8', '#F5C542', '#6FBF9E', '#E8896B', '#9AA6E8', '#D68FC9'];

function PoidsIcon({ valeur, taille = 40 }) {
  const couleur = BALANCE_COULEURS_POIDS[(valeur - 1) % BALANCE_COULEURS_POIDS.length];
  return (
    <View style={{
      width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleur,
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)',
    }}>
      <Text style={{ fontWeight: '800', color: '#fff', fontSize: taille * 0.42 }}>{valeur}</Text>
    </View>
  );
}

function BalanceVisual({ promptData, onOptionPress, answered }) {
  const [poses, setPoses] = useState([]); // liste des valeurs de poids poses sur le plateau droit

  // Remet a zero a chaque nouvelle manche (nouvelle question).
  useEffect(() => { setPoses([]); }, [promptData]);

  const totalAjoute = poses.reduce((s, v) => s + v, 0);
  const totalDroite = promptData.droitConnu + totalAjoute;

  // Aucun indice visuel tant que l'enfant n'a pas valide : les deux
  // assiettes restent immobiles, a niveau, quel que soit ce qui est pose
  // dedans. Ce n'est qu'au moment de valider que la vraie difference se
  // revele et que les assiettes montent ou descendent en consequence -
  // avant, la balance s'inclinait en temps reel, ce qui suffisait a
  // trouver la reponse sans jamais calculer.
  const difference = answered !== null ? totalDroite - promptData.gauche : 0;
  const decalage = Math.max(-22, Math.min(22, difference * 3.5));

  function ajouterPoids(valeur) {
    if (answered !== null) return;
    setPoses((p) => [...p, valeur]);
  }
  function retirerPoids(index) {
    if (answered !== null) return;
    setPoses((p) => p.filter((_, i) => i !== index));
  }

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
      {/* Barre horizontale fixe, comme le fleau d'une vraie balance. */}
      <View style={{ width: '80%', height: 5, backgroundColor: colors.mossDeep, borderRadius: 3, marginBottom: 2 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4, marginBottom: 10 }}>
        {/* Assiette gauche, suspendue par un fil - descend si elle est plus lourde. */}
        <View style={{ alignItems: 'center', transform: [{ translateY: -decalage }] }}>
          <View style={{ width: 2, height: 18, backgroundColor: colors.mossDeep }} />
          <View style={[styles.balanceAssiette, { borderColor: '#B8B0A6' }]}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#B8B0A6', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12 }}>⚖️</Text>
            </View>
            <Text style={styles.balancePlateauLabel}>{promptData.gauche}</Text>
          </View>
        </View>

        {/* Assiette droite, suspendue par un fil - monte si elle est plus legere. */}
        <View style={{ alignItems: 'center', transform: [{ translateY: decalage }] }}>
          <View style={{ width: 2, height: 18, backgroundColor: colors.mossDeep }} />
          <View style={[styles.balanceAssiette, { borderColor: BALANCE_COULEURS_POIDS[4] }]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxWidth: 110, justifyContent: 'center', gap: 3 }}>
              {poses.length === 0 && <Text style={{ fontSize: 12, color: colors.ink, opacity: 0.5 }}>vide</Text>}
              {poses.map((v, i) => (
                <Pressable key={i} disabled={answered !== null} onPress={() => retirerPoids(i)}>
                  <PoidsIcon valeur={v} taille={22} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: colors.ink, opacity: 0.7, marginBottom: 6 }}>Touche un poids posé pour le retirer</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 14, maxWidth: 300 }}>
        {BALANCE_VALEURS_POIDS.map((v) => (
          <Pressable key={v} disabled={answered !== null} onPress={() => ajouterPoids(v)}>
            <PoidsIcon valeur={v} taille={38} />
          </Pressable>
        ))}
      </View>

      <Pressable
        disabled={answered !== null}
        style={[styles.button, { minWidth: 180 }]}
        onPress={() => onOptionPress(totalAjoute)}
      >
        <Text style={styles.buttonText}>✅ C'est équilibré !</Text>
      </Pressable>
    </View>
  );
}

function BalancePrairieScreen({ route, navigation }) {
  return (
    <CalibratedChoiceGame
      route={route}
      navigation={navigation}
      jeuCode="balance_prairie"
      Character={Luma}
      jeuTitre="⚖️ La Balance de la Prairie"
      buildPrompt={buildEquilibrePrompt}
      maxRung={MAX_CONTENT_RUNG}
      customVisual={BalanceVisual}
    />
  );
}

// ============================================================
// Le Marché du Village — maths (rendre la monnaie)
// ============================================================
function buildMonnaiePrompt(d) {
  return {
    visual: `🛍️ Prix : ${d.prix}€     💶 Payé : ${d.paye}€`,
    promptText: 'Combien de monnaie faut-il rendre ?',
    speak: `Le prix est de ${d.prix} euros, on te donne ${d.paye} euros. Combien de monnaie faut-il rendre ?`,
    mandatorySpeak: false,
    options: d.options,
    correct: d.rendu,
  };
}

function MarcheVillageScreen({ route, navigation }) {
  return (
    <CalibratedChoiceGame
      route={route}
      navigation={navigation}
      jeuCode="marche_village"
      Character={Noisette}
      jeuTitre="💰 Le Marché du Village"
      buildPrompt={buildMonnaiePrompt}
      maxRung={MAX_CONTENT_RUNG}
    />
  );
}

// ============================================================
// Les Cachettes de Luma — maths (reperage sur une grille)
// Ecran autonome (pas le moteur ChoiceGameScreen partage) car la regle
// de progression est differente des autres jeux : ici, 2 reussites
// d'affilee font monter le cran IMMEDIATEMENT (pas besoin d'attendre
// la fin des 20 manches), pour une sensation tres reactive au niveau
// reel de l'enfant. 3 erreurs d'affilee font redescendre d'un cran.
// La grille grandit d'une case a chaque annee scolaire (etoile unique
// en MS/GS, etoiles colorees en CP/CE1, symboles varies en CE2).
// ============================================================
function buildCachettesQuestion(d) {
  if (d.etape === 'grille_couleur') {
    const labels = {
      ou_est_couleur_colonne: `À quelle colonne se trouve l'étoile ${d.cible} ?`,
      ou_est_couleur_ligne: `À quelle ligne se trouve l'étoile ${d.cible} ?`,
      couleur_en_colonne: `Quelle couleur est à la colonne ${d.cible} ?`,
      couleur_en_ligne: `Quelle couleur est à la ligne ${d.cible} ?`,
    };
    const txt = labels[d.question] ?? labels.ou_est_couleur_colonne;
    return { promptText: txt, speak: txt, options: d.options, correct: d.reponse };
  }
  if (d.etape === 'grille_symbole') {
    let txt;
    if (d.question === 'symbole_ligne_colonne') {
      txt = `Quel symbole est à la fois à la ligne ${d.cible.ligne} et à la colonne ${d.cible.colonne} ?`;
    } else {
      const sens = d.cible?.sens === 'haut' ? 'plus haut' : 'plus à gauche';
      txt = `Regarde bien : quel symbole est ${sens} que l'autre ?`;
    }
    return { promptText: txt, speak: txt, options: d.options, correct: d.reponse };
  }
  // Ancien format (MS/GS) : etoile unique, direction de comptage variee.
  const questions = {
    colonne: "À quelle colonne se trouve l'étoile (en partant de la gauche) ?",
    colonne_droite: "À quelle colonne se trouve l'étoile (en partant de la droite) ?",
    ligne: "À quelle ligne se trouve l'étoile (en partant du haut) ?",
    ligne_bas: "À quelle ligne se trouve l'étoile (en partant du bas) ?",
  };
  const txt = questions[d.question] ?? questions.colonne;
  return { promptText: txt, speak: txt, options: d.options, correct: d.reponse };
}

const CACHETTES_COULEURS_HEX = { rouge: '#E5533D', bleu: '#3D7FE5', vert: '#3DAE5C' };

function CachettesGridVisual({ d }) {
  const { width } = useWindowDimensions();
  if (d.etape === 'grille') {
    // Ancien format : grille texte (emoji ASCII) a parser.
    const lignes = d.grille.split('\n').map((l) => Array.from(l));
    const taille = lignes.length;
    const cell = Math.min(40, Math.floor((width - 64) / taille));
    return (
      <View style={{ alignSelf: 'center' }}>
        {lignes.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {row.map((ch, ci) => (
              <View key={ci} style={[styles.cachettesCell, { width: cell, height: cell }]}>
                {ch === '⭐' ? <Text style={{ fontSize: cell * 0.55 }}>⭐</Text> : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  const taille = d.taille ?? 5;
  const marqueurs = d.marqueurs ?? [];
  const cell = Math.min(48, Math.floor((width - 64) / taille));
  return (
    <View style={{ alignSelf: 'center' }}>
      {Array.from({ length: taille }).map((_, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {Array.from({ length: taille }).map((_, ci) => {
            const r = ri + 1, c = ci + 1;
            const m = marqueurs.find((mk) => mk.ligne === r && mk.colonne === c);
            const bg = m && d.etape === 'grille_couleur' ? CACHETTES_COULEURS_HEX[m.couleur] : null;
            return (
              <View key={ci} style={[styles.cachettesCell, { width: cell, height: cell }, bg ? { backgroundColor: bg } : null]}>
                {m && d.etape === 'grille_symbole' ? <Text style={{ fontSize: cell * 0.5 }}>{m.symbole}</Text> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CACHETTES_TOTAL_ROUNDS = 8;

function CachettesLumaScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const cachettesMaxRung = rungFromGradeAndPalier('cm2', 3);
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [round, setRound] = useState(1);
  const [promptData, setPromptData] = useState(null); // { d, ...question }
  const [optionsOrder, setOptionsOrder] = useState([]);
  const [answered, setAnswered] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const startRungRef = useRef(rung);
  const successStreak = useRef(0);
  const wrongStreak = useRef(0);
  const errorsTotal = useRef(0);
  const shownIds = useRef(new Set());
  const startedAt = useRef(Date.now());
  const roundStartedAt = useRef(Date.now());

  const loadRound = useCallback(async (jeuId, currentRung) => {
    setLoading(true);
    setAnswered(null);
    setFeedback(null);
    const { niveau, palier } = gradeAndPalierFromRung(currentRung);

    async function fetchFor(withPalier) {
      let query = supabase
        .from('contenu_mini_jeu')
        .select('id, donnees')
        .eq('mini_jeu_id', jeuId)
        .eq('niveau', niveau)
        .eq('actif', true);
      if (withPalier) query = query.eq('palier', palier);
      const { data } = await query.limit(60);
      return data ?? [];
    }
    let data = await fetchFor(true);
    if (data.length === 0) data = await fetchFor(false);

    let pool = data.filter((r) => !shownIds.current.has(r.id));
    if (pool.length === 0) {
      shownIds.current.clear();
      pool = data;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) {
      setLoading(false);
      setPromptData(null);
      return;
    }
    shownIds.current.add(pick.id);
    const q = buildCachettesQuestion(pick.donnees);
    setPromptData({ d: pick.donnees, ...q });
    setOptionsOrder(shuffle(q.options));
    setLoading(false);
    roundStartedAt.current = Date.now();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'cachettes_luma').single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);
      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();
      const startRung = Math.min(cachettesMaxRung, prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1));
      startRungRef.current = startRung;
      setRung(startRung);
      loadRound(jeu.id, startRung);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  useEffect(() => {
    if (!promptData?.speak) return;
    speakSmart(promptData.speak);
  }, [promptData]);

  async function finishSession(finalRung) {
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const direction = finalRung > startRungRef.current ? 'up' : finalRung < startRungRef.current ? 'down' : 'same';
    const raison = direction === 'up'
      ? (errorsTotal.current === 0 ? 'parfait_rapide' : 'parfait_lent')
      : direction === 'down'
        ? 'erreurs_beaucoup'
        : 'erreurs_quelques';

    const summary = await completeSession({
      profil, miniJeuId, currentRung: startRungRef.current, maxRung: cachettesMaxRung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: CACHETTES_TOTAL_ROUNDS,
      startedAt: startedAt.current,
      tempsMoyenParManche: Math.round(durationSeconds / CACHETTES_TOTAL_ROUNDS),
      precomputedRung: { newRung: finalRung, direction, raison },
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function onOptionPress(value) {
    if (!promptData || answered !== null) return;
    const isCorrect = String(value) === String(promptData.correct);
    setAnswered(value);

    let nextRung = rung;
    if (isCorrect) {
      setFeedback('Bravo !');
      wrongStreak.current = 0;
      successStreak.current += 1;
      if (successStreak.current >= 2) {
        nextRung = Math.min(cachettesMaxRung, rung + 1);
        successStreak.current = 0;
      }
    } else {
      setFeedback('On regarde bien...');
      errorsTotal.current += 1;
      successStreak.current = 0;
      wrongStreak.current += 1;
      if (wrongStreak.current >= 3) {
        nextRung = Math.max(1, rung - 1);
        wrongStreak.current = 0;
      }
    }

    setTimeout(async () => {
      setFeedback(null);
      if (nextRung !== rung) setRung(nextRung);
      if (round >= CACHETTES_TOTAL_ROUNDS) {
        await finishSession(nextRung);
      } else {
        setRound((r) => r + 1);
        loadRound(miniJeuId, nextRung);
      }
    }, 900);
  }

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        onContinue={() => {
          setSessionDone(false);
          errorsTotal.current = 0;
          startRungRef.current = rung;
          startedAt.current = Date.now();
          setRound(1);
          loadRound(miniJeuId, rung);
        }}
      />
    );
  }

  if (loading || !promptData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  const isColorAnswer = promptData.d.etape === 'grille_couleur' && CACHETTES_COULEURS_HEX[promptData.options[0]] != null;

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame('cachettes_luma') }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>🗺️ Les Cachettes de Luma</Text>
        <Text style={styles.roundLabel}>{round}/{CACHETTES_TOTAL_ROUNDS}</Text>
      </View>

      <View style={styles.gameCharacter}>
        <BouncingWrap><Luma size={48} /></BouncingWrap>
      </View>

      <CachettesGridVisual d={promptData.d} />

      <View style={styles.promptZone}>
        <Text style={styles.promptText}>{promptData.promptText}</Text>
        <Pressable style={styles.listenButton} onPress={() => speakSmart(promptData.speak)}>
          <Text style={styles.listenText}>🎤 Écouter</Text>
        </Pressable>
      </View>

      {feedback && (
        <PopIn key={feedback + round}>
          <Text style={[styles.feedback, feedback === 'Bravo !' ? styles.feedbackSuccess : styles.feedbackError]}>
            {feedback}
          </Text>
        </PopIn>
      )}

      <View style={styles.answerZone}>
        <Text style={styles.answerZoneLabel}>Ta réponse</Text>
        <View style={styles.stonesWrap}>
          {optionsOrder.map((option, i) => {
            const isAnswered = answered !== null;
            const isThisAnswer = isAnswered && String(option) === String(answered);
            const isThisCorrect = String(option) === String(promptData.correct);
            const bg = isColorAnswer ? CACHETTES_COULEURS_HEX[option] : STONE_COLORS[i % STONE_COLORS.length];
            return (
              <Pressable
                key={i}
                disabled={isAnswered}
                onPress={() => onOptionPress(option)}
                hitSlop={14}
                style={[
                  styles.optionButton,
                  { backgroundColor: bg },
                  isAnswered && isThisCorrect && styles.optionCorrect,
                  isAnswered && isThisAnswer && !isThisCorrect && styles.optionWrong,
                ]}
              >
                {!isColorAnswer && (
                  <Text style={[styles.optionText, String(option).length <= 4 && styles.optionTextIcon]}>
                    {String(option)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ============================================================
// Test de calibrage initial : au tout premier lancement d'un jeu
// (aucune progression sauvegardee pour ce profil sur ce jeu), propose
// 4 questions couvrant facile a tres difficile pour choisir un point
// de depart plus juste que le seul niveau scolaire par defaut. Ce
// n'est jamais note ni presente comme un echec possible - juste une
// petite decouverte avant de commencer a jouer pour de vrai.
// ============================================================
// Calibrage adaptatif : au lieu de 4 crans fixes espaces largement, on
// monte le niveau rapidement (jusqu'a 4 manches) en sautant de plus en
// plus de crans a chaque reussite facile, jusqu'a detecter soit une
// mauvaise reponse, soit une reponse correcte mais nettement plus lente
// que les precedentes (signe de reflexion) - garde en memoire a titre
// informatif seulement : cela n'a jamais d'impact sur la montee ou la
// descente elle-meme. Seules les ERREURS determinent le plafond puis la
// redescente : on ne veut surtout pas qu'un enfant se sente presse ou
// stresse par un chronometre, ce n'est pas ce qui compte pour situer son
// niveau. Une fois le plafond trouve, on redescend d'un cran ou deux
// (jusqu'a 3 manches de plus) pour confirmer le vrai point d'equilibre.
// Au total, jamais plus de 7 manches, au lieu de dizaines de sessions
// pour y arriver naturellement - trouve rapidement le niveau reel plutot
// que de faire s'ennuyer un enfant deja a l'aise.
const CALIBRAGE_SAUTS_MONTEE = [2, 4, 6, 6];

function CalibrationTest({ profil, jeuCode, jeuTitre, Character, buildPrompt, maxRung, onDone }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration
  const [promptData, setPromptData] = useState(null);
  const [optionsOrder, setOptionsOrder] = useState([]);
  const [answered, setAnswered] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roundIndex, setRoundIndex] = useState(0);
  const miniJeuIdRef = useRef(null);
  const currentRungRef = useRef(1);
  const phaseRef = useRef('montee'); // 'montee' | 'descente'
  const roundsMonteeRef = useRef(0);
  const roundsDescenteRef = useRef(0);
  const roundStartRef = useRef(Date.now());

  const loadRound = useCallback(async (jeuId, rung) => {
    setLoading(true);
    setAnswered(null);
    setFeedback(null);
    const { niveau, palier } = gradeAndPalierFromRung(rung);

    async function fetchFor(withPalier) {
      let query = supabase
        .from('contenu_mini_jeu')
        .select('id, donnees')
        .eq('mini_jeu_id', jeuId)
        .eq('niveau', niveau)
        .eq('actif', true);
      if (withPalier) query = query.eq('palier', palier);
      const { data } = await query.limit(30);
      return data ?? [];
    }
    let data = await fetchFor(true);
    if (data.length === 0) data = await fetchFor(false);

    if (data.length === 0) {
      // Pas de contenu a ce cran precis : on s'arrete la, c'est deja une
      // bonne estimation du niveau.
      onDone(Math.min(maxRung, Math.max(1, rung)));
      return;
    }
    const pick = data[Math.floor(Math.random() * data.length)];
    const prompt = buildPrompt(pick.donnees);
    setPromptData(prompt);
    setOptionsOrder(shuffle(prompt.options));
    roundStartRef.current = Date.now();
    setLoading(false);
  }, [buildPrompt, maxRung, onDone]);

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', jeuCode).single();
      if (!jeu) {
        onDone(rungFromGradeAndPalier(profil.niveau_defaut, 1));
        return;
      }
      miniJeuIdRef.current = jeu.id;
      const base = Math.min(maxRung, rungFromGradeAndPalier(profil.niveau_defaut, 1));
      currentRungRef.current = base;
      await loadRound(jeu.id, base);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!promptData) return;
    speakSmart(promptData.promptText);
  }, [promptData]);

  function onOptionPress(value) {
    if (!promptData || answered !== null) return;
    const isCorrect = String(value) === String(promptData.correct);
    setAnswered(value);
    if (isCorrect) setFeedback('Bravo !');
    // Pas de "Faux" affiche : c'est un test neutre pour trouver le bon
    // point de depart, jamais presente comme un echec a l'enfant.

    // Seule l'erreur determine le plafond - le temps de reponse n'a
    // aucune influence ici, pour ne jamais mettre l'enfant sous pression.
    const estDifficile = !isCorrect;

    setTimeout(() => {
      setRoundIndex((i) => i + 1);

      if (phaseRef.current === 'montee') {
        roundsMonteeRef.current += 1;
        if (estDifficile) {
          // Plafond trouve : on bascule en descente fine pour confirmer
          // le vrai point d'equilibre, 2 crans plus bas pour commencer.
          phaseRef.current = 'descente';
          currentRungRef.current = Math.max(1, currentRungRef.current - 2);
          loadRound(miniJeuIdRef.current, currentRungRef.current);
          return;
        }
        if (roundsMonteeRef.current >= 4) {
          // 4 manches faciles d'affilee sans jamais buter : l'enfant
          // maitrise deja tres bien, pas besoin d'aller plus loin.
          onDone(Math.min(maxRung, currentRungRef.current));
          return;
        }
        const saut = CALIBRAGE_SAUTS_MONTEE[roundsMonteeRef.current] ?? 6;
        currentRungRef.current = Math.min(maxRung, currentRungRef.current + saut);
        loadRound(miniJeuIdRef.current, currentRungRef.current);
        return;
      }

      // Phase de descente.
      roundsDescenteRef.current += 1;
      if (!estDifficile) {
        // Point d'equilibre trouve : l'enfant est a l'aise ici.
        onDone(Math.min(maxRung, currentRungRef.current));
        return;
      }
      if (roundsDescenteRef.current >= 3) {
        // 3 essais en descente : on s'arrete la, meme si encore difficile.
        onDone(Math.min(maxRung, currentRungRef.current));
        return;
      }
      currentRungRef.current = Math.max(1, currentRungRef.current - 2);
      loadRound(miniJeuIdRef.current, currentRungRef.current);
    }, 900);
  }

  if (loading || !promptData) {
    return (
      <View style={styles.center}>
        <BouncingWrap><Noisette size={72} /></BouncingWrap>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.mossDeep, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 }}>
          On découvre ensemble ton niveau…
        </Text>
        <ActivityIndicator color={colors.mossDeep} style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame(jeuCode) }]}>
      <View style={styles.topBar}>
        <Text style={styles.gameTitle}>🔍 On découvre ton niveau !</Text>
        <Text style={styles.roundLabel}>Manche {roundIndex + 1}</Text>
      </View>

      {Character ? (
        <View style={styles.gameCharacter}>
          <BouncingWrap><Character size={48} /></BouncingWrap>
        </View>
      ) : null}

      <View style={styles.promptZone}>
        <Text style={styles.promptText}>{promptData.promptText}</Text>
        <Pressable
          style={styles.listenButton}
          onPress={() => speakSmart(promptData.speak || promptData.promptText)}
        >
          <Text style={styles.listenText}>🎤 Écouter</Text>
        </Pressable>
      </View>

      {feedback && (
        <PopIn key={feedback + step}>
          <Text style={[styles.feedback, styles.feedbackSuccess]}>{feedback}</Text>
        </PopIn>
      )}

      <View style={styles.answerZone}>
        <Text style={styles.answerZoneLabel}>Ta réponse</Text>
        <View style={styles.stonesWrap}>
          {optionsOrder.map((option, i) => {
            const isAnswered = answered !== null;
            const isThisAnswer = isAnswered && String(option) === String(answered);
            const isThisCorrect = String(option) === String(promptData.correct);
            const bg = STONE_COLORS[i % STONE_COLORS.length];
            const estUnEmojiSeul = String(option).length <= 4;
            return (
              <Pressable
                key={i}
                disabled={isAnswered}
                onPress={() => onOptionPress(option)}
                hitSlop={14}
                style={[
                  styles.optionButton,
                  { backgroundColor: bg },
                  isAnswered && isThisAnswer && isThisCorrect && styles.optionCorrect,
                ]}
              >
                <Text
                  style={[styles.optionText, estUnEmojiSeul && styles.optionTextIcon]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {String(option)}
                </Text>
                <Pressable
                  style={[styles.optionListenBtn, estUnEmojiSeul && styles.optionListenBtnBas]}
                  onPress={() => speakSmart(String(option))}
                  hitSlop={10}
                >
                  <Text style={{ fontSize: 15 }}>🎤</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ============================================================
// ============================================================
// Enveloppe generique : ajoute le test de calibrage initial (voir
// CalibrationTest ci-dessus) autour de n'importe quel jeu base sur
// ChoiceGameScreen, sans dupliquer la logique de verification de
// progression dans chaque ecran de jeu. Le calibrage ne se declenche
// qu'une seule fois, au tout premier lancement (aucune ligne dans
// "progression" pour ce profil sur ce jeu) ; ensuite, comportement
// inchange.
// ============================================================
function CalibratedChoiceGame({ route, navigation, jeuCode, jeuTitre, buildPrompt, Character, maxRung, themeFilter, singleLineOptions, customVisual }) {
  const { profil } = route.params;
  const effectiveMaxRung = maxRung ?? MAX_CONTENT_RUNG;
  // 'checking' : on verifie s'il existe deja une progression pour ce
  // profil sur ce jeu ; 'calibration' : premiere fois, on propose le
  // test de niveau ; 'play' : le jeu demarre normalement.
  const [phase, setPhase] = useState('checking');
  const [forcedStartRung, setForcedStartRung] = useState(null);
  const miniJeuIdRef = useRef(null);

  useEffect(() => {
    setPhase('checking');
    setForcedStartRung(null);
    (async () => {
      const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', jeuCode).single();
      if (!jeu) { setPhase('play'); return; }
      miniJeuIdRef.current = jeu.id;
      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();
      setPhase(prog ? 'play' : 'calibration');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id, jeuCode]);

  if (phase === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  if (phase === 'calibration') {
    return (
      <CalibrationTest
        profil={profil}
        jeuCode={jeuCode}
        jeuTitre={jeuTitre}
        Character={Character}
        buildPrompt={buildPrompt}
        maxRung={effectiveMaxRung}
        onDone={async (startRung) => {
          // Sauvegarde immediate : si l'enfant quitte avant la fin de la
          // toute premiere session (les 20 manches), le calibrage ne doit
          // pas se redeclencher au prochain lancement.
          if (miniJeuIdRef.current) {
            try {
              await supabase.from('progression').upsert(
                {
                  profil_id: profil.id,
                  mini_jeu_id: miniJeuIdRef.current,
                  palier_actuel: startRung,
                  details: { streak: 0 },
                  temps_reference_secondes: null,
                  echecs_consecutifs: 0,
                },
                { onConflict: 'profil_id,mini_jeu_id' }
              );
            } catch (e) {
              // Non bloquant : le jeu demarre quand meme au bon niveau
              // pour cette session, meme si la sauvegarde a echoue.
            }
          }
          setForcedStartRung(startRung);
          setPhase('play');
        }}
      />
    );
  }

  return (
    <ChoiceGameScreen
      route={route}
      navigation={navigation}
      jeuCode={jeuCode}
      Character={Character}
      jeuTitre={jeuTitre}
      buildPrompt={buildPrompt}
      maxRung={maxRung}
      themeFilter={themeFilter}
      singleLineOptions={singleLineOptions}
      forcedStartRung={forcedStartRung}
      customVisual={customVisual}
      onRequestRecalibrate={() => {
        Alert.alert(
          'Refaire le calibrage ?',
          "On va reposer quelques questions pour retrouver le bon niveau. C'est rapide !",
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Oui, on y va !', onPress: () => setPhase('calibration') },
          ]
        );
      }}
    />
  );
}

// Le Corps Humain — sciences (questions sur le corps humain)
// ============================================================
function buildCorpsHumainPrompt(d) {
  return {
    promptText: d.question,
    speak: d.question,
    mandatorySpeak: false,
    options: d.options,
    correct: d.reponse,
  };
}

// ============================================================
// Jeu bonus de la zone "Jardin" (sciences), debloque quand tous les
// jeux de la zone atteignent 50% de leur niveau max (voir
// checkZoneBonusUnlock). Mecanique differente des autres jeux : des
// indices se revelent un par un sur un mystere (animal, plante...),
// l'enfant peut deviner des le premier indice (plus valorisant) ou en
// demander d'autres pour etre plus sur (plus facile).
// ============================================================
function IndicesJardinScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const gameMaxRung = rungFromGradeAndPalier('cm2', 3);
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [round, setRound] = useState(1);
  const [mystere, setMystere] = useState(null);
  const [revealedCount, setRevealedCount] = useState(1);
  const [optionsOrder, setOptionsOrder] = useState([]);
  const [answered, setAnswered] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const errorsTotal = useRef(0);
  const startedAt = useRef(Date.now());
  const shownIds = useRef(new Set());

  const loadRound = useCallback(async (jeuId, effectiveRung) => {
    setLoading(true);
    setAnswered(null);
    setFeedback(null);
    setRevealedCount(1);
    const { niveau, palier } = gradeAndPalierFromRung(effectiveRung);

    async function fetchFor(withPalier) {
      let query = supabase
        .from('contenu_mini_jeu')
        .select('id, donnees')
        .eq('mini_jeu_id', jeuId)
        .eq('niveau', niveau)
        .eq('actif', true);
      if (withPalier) query = query.eq('palier', palier);
      const { data } = await query.limit(60);
      return data ?? [];
    }
    let data = await fetchFor(true);
    if (data.length === 0) data = await fetchFor(false);

    let pool = data.filter((r) => !shownIds.current.has(r.id));
    if (pool.length === 0) {
      shownIds.current.clear();
      pool = data;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) {
      setLoading(false);
      setMystere(null);
      return;
    }
    shownIds.current.add(pick.id);
    setMystere(pick.donnees);
    setOptionsOrder(shuffle(pick.donnees.options));
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'indices_jardin').single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);
      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();
      const startRung = Math.min(gameMaxRung, prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1));
      setRung(startRung);
      loadRound(jeu.id, rungWithSessionRamp(startRung, 1, TOTAL_ROUNDS, gameMaxRung));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  useEffect(() => {
    if (!mystere) return;
    speakSmart(mystere.indices[0]);
  }, [mystere]);

  function revealNextClue() {
    if (!mystere || answered !== null || revealedCount >= mystere.indices.length) return;
    const next = revealedCount + 1;
    setRevealedCount(next);
    speakSmart(mystere.indices[next - 1]);
  }

  async function finishSession() {
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: TOTAL_ROUNDS,
      startedAt: startedAt.current,
      tempsMoyenParManche: Math.round(durationSeconds / TOTAL_ROUNDS),
      maxRung: gameMaxRung,
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function onOptionPress(value) {
    if (!mystere || answered !== null) return;
    const isCorrect = String(value) === String(mystere.cible);
    setAnswered(value);
    if (isCorrect) {
      setFeedback(revealedCount <= 2 ? 'Bravo, trouvé en un rien de temps !' : 'Bravo, tu as trouvé !');
    } else {
      errorsTotal.current += 1;
      setFeedback(`Ce n'était pas ça... c'était ${mystere.cible} !`);
    }
    setTimeout(async () => {
      if (round >= TOTAL_ROUNDS) {
        await finishSession();
      } else {
        const nextRound = round + 1;
        setRound(nextRound);
        loadRound(miniJeuId, rungWithSessionRamp(rung, nextRound, TOTAL_ROUNDS, gameMaxRung));
      }
    }, 1400);
  }

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        onContinue={() => {
          const newRung = sessionSummary?.newRung ?? rung;
          setSessionDone(false);
          errorsTotal.current = 0;
          startedAt.current = Date.now();
          setRound(1);
          setRung(newRung);
          loadRound(miniJeuId, rungWithSessionRamp(newRung, 1, TOTAL_ROUNDS, gameMaxRung));
        }}
      />
    );
  }

  if (loading || !mystere) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame('indices_jardin') }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>🕵️ Les Indices du Jardin</Text>
        <Text style={styles.roundLabel}>{round}/{TOTAL_ROUNDS}</Text>
      </View>

      <View style={styles.gameCharacter}>
        <BouncingWrap><Noisette size={48} /></BouncingWrap>
      </View>

      <View style={styles.promptZone}>
        {Array.from({ length: revealedCount }).map((_, i) => (
          <Text key={i} style={[styles.promptText, { marginBottom: 4 }]}>🔍 {mystere.indices[i]}</Text>
        ))}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Pressable style={styles.listenButton} onPress={() => speakSmart(mystere.indices[revealedCount - 1])}>
            <Text style={styles.listenText}>🎤 Réécouter</Text>
          </Pressable>
          {revealedCount < mystere.indices.length && answered === null && (
            <Pressable style={styles.listenButton} onPress={revealNextClue}>
              <Text style={styles.listenText}>➕ Encore un indice</Text>
            </Pressable>
          )}
        </View>
      </View>

      {feedback && (
        <PopIn key={feedback + round}>
          <Text style={[styles.feedback, String(answered) === String(mystere.cible) ? styles.feedbackSuccess : styles.feedbackError]}>
            {feedback}
          </Text>
        </PopIn>
      )}

      <View style={styles.answerZone}>
        <Text style={styles.answerZoneLabel}>Qui suis-je ?</Text>
        <View style={styles.stonesWrap}>
          {optionsOrder.map((option, i) => {
            const isAnswered = answered !== null;
            const isThisCorrect = String(option) === String(mystere.cible);
            return (
              <Pressable
                key={i}
                disabled={isAnswered}
                onPress={() => onOptionPress(option)}
                hitSlop={14}
                style={[
                  styles.optionButton,
                  { backgroundColor: STONE_COLORS[i % STONE_COLORS.length] },
                  isAnswered && isThisCorrect && styles.optionCorrect,
                  isAnswered && String(answered) === String(option) && !isThisCorrect && styles.optionWrong,
                ]}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}


function CorpsHumainScreen({ route, navigation }) {
  return (
    <CalibratedChoiceGame
      route={route}
      navigation={navigation}
      jeuCode="corps_humain"
      Character={Maestro}
      jeuTitre="🫀 Le Corps Humain"
      buildPrompt={buildCorpsHumainPrompt}
      maxRung={rungFromGradeAndPalier('cm2', 3)}
    />
  );
}

// ============================================================
// La Ronde des Lucioles — memoire/ecoute (associer un son a une image)
// ============================================================
function buildLuciolesPrompt(d) {
  return {
    promptText: 'Écoute bien et trouve la bonne image !',
    speak: d.son,
    mandatorySpeak: true, // aucune image ne represente le son avant de choisir
    options: d.options,
    correct: d.cible,
    // Vrai bruit d'animal enregistre, si disponible pour cette reponse -
    // remplace alors la devinette parlee par le son reel, bien plus parlant.
    soundEffect: LUCIOLES_SOUNDS[d.cible] ?? null,
  };
}

function RondeLuciolesScreen({ route, navigation }) {
  return (
    <CalibratedChoiceGame
      route={route}
      navigation={navigation}
      jeuCode="ronde_lucioles"
      Character={Maestro}
      jeuTitre="🎧 La Ronde des Lucioles"
      buildPrompt={buildLuciolesPrompt}
      maxRung={MAX_CONTENT_RUNG}
    />
  );
}

// ============================================================
// Le Tri du Village — logique : classer des objets dans la bonne
// categorie (toucher un objet, puis toucher sa case). Mecanique
// differente : deux etapes de toucher plutot qu'un seul choix.
// ============================================================
function TriVillageScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [categories, setCategories] = useState([]);
  const [pool, setPool] = useState([]);
  const [selected, setSelected] = useState(null);
  const [placedCount, setPlacedCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const errorsTotal = useRef(0);
  const startedAt = useRef(Date.now());
  const nextRungRef = useRef(null);
  const gameMaxRung = rungFromGradeAndPalier('cm2', 3);

  // Calibrage adaptatif : chaque exercice complet de tri (tous les objets
  // ranges sans aucune erreur) compte comme une "manche" reussie. Seules
  // les erreurs determinent la montee/descente, jamais le temps.
  const [calibPhase, setCalibPhase] = useState('checking');
  const [calibRoundIndex, setCalibRoundIndex] = useState(0);
  const calibCurrentRungRef = useRef(1);
  const calibStepPhaseRef = useRef('montee');
  const calibRoundsMonteeRef = useRef(0);
  const calibRoundsDescenteRef = useRef(0);
  const calibErrorsRef = useRef(0);
  const CALIB_SAUTS_MONTEE = [2, 4, 6, 6];

  const loadActivity = useCallback(async (jeuId, currentRung) => {
    setLoading(true);
    const { niveau, palier } = gradeAndPalierFromRung(currentRung);
    const { data } = await supabase
      .from('contenu_mini_jeu')
      .select('id, donnees')
      .eq('mini_jeu_id', jeuId)
      .eq('niveau', niveau)
      .eq('palier', palier)
      .eq('actif', true)
      .limit(10);

    const pick = (data ?? [])[Math.floor(Math.random() * (data?.length ?? 1))];
    if (pick) {
      setCategories(pick.donnees.categories);
      setPool(shuffle(pick.donnees.items.map((it, i) => ({ ...it, key: i }))));
      setTotalItems(pick.donnees.items.length);
      setPlacedCount(0);
      speakSmart('Range chaque objet dans la bonne case !');
    }
    setLoading(false);
  }, []);

  function terminerCalibrage(jeuId, finalRung) {
    (async () => {
      try {
        await supabase.from('progression').upsert(
          {
            profil_id: profil.id,
            mini_jeu_id: jeuId,
            palier_actuel: finalRung,
            details: { streak: 0 },
            temps_reference_secondes: null,
            echecs_consecutifs: 0,
          },
          { onConflict: 'profil_id,mini_jeu_id' }
        );
      } catch (e) {
        // Non bloquant.
      }
    })();
    setRung(finalRung);
    errorsTotal.current = 0;
    setCalibPhase('play');
    loadActivity(jeuId, finalRung);
  }

  function handleCalibrationResult(jeuId, isCorrect) {
    setCalibRoundIndex((i) => i + 1);
    calibErrorsRef.current = 0;
    if (calibStepPhaseRef.current === 'montee') {
      calibRoundsMonteeRef.current += 1;
      if (!isCorrect) {
        calibStepPhaseRef.current = 'descente';
        calibCurrentRungRef.current = Math.max(1, calibCurrentRungRef.current - 2);
        loadActivity(jeuId, calibCurrentRungRef.current);
        return;
      }
      if (calibRoundsMonteeRef.current >= 4) {
        terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
        return;
      }
      const saut = CALIB_SAUTS_MONTEE[calibRoundsMonteeRef.current] ?? 6;
      calibCurrentRungRef.current = Math.min(gameMaxRung, calibCurrentRungRef.current + saut);
      loadActivity(jeuId, calibCurrentRungRef.current);
      return;
    }

    calibRoundsDescenteRef.current += 1;
    if (isCorrect) {
      terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
      return;
    }
    if (calibRoundsDescenteRef.current >= 3) {
      terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
      return;
    }
    calibCurrentRungRef.current = Math.max(1, calibCurrentRungRef.current - 2);
    loadActivity(jeuId, calibCurrentRungRef.current);
  }

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase
        .from('mini_jeux')
        .select('id')
        .eq('code', 'tri_village')
        .single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);

      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();

      if (!prog) {
        const base = Math.min(gameMaxRung, rungFromGradeAndPalier(profil.niveau_defaut, 1));
        calibCurrentRungRef.current = base;
        calibStepPhaseRef.current = 'montee';
        calibRoundsMonteeRef.current = 0;
        calibRoundsDescenteRef.current = 0;
        calibErrorsRef.current = 0;
        setCalibRoundIndex(0);
        setCalibPhase('calibrating');
        loadActivity(jeu.id, base);
        return;
      }

      const startRung = Math.min(prog.palier_actuel, gameMaxRung);
      setRung(startRung);
      setCalibPhase('play');
      loadActivity(jeu.id, startRung);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const tempsMoyenParManche = Math.round(durationSeconds / totalItems);
    const precomputedRung = await computeStreakRung({
      profil, miniJeuId, currentRung: rung, wasPerfect: errorsTotal.current <= 1, maxRung: gameMaxRung,
      erreursTotal: errorsTotal.current, totalRounds: totalItems, dureeMoyenneManche: tempsMoyenParManche,
    });
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: totalItems,
      startedAt: startedAt.current,
      tempsMoyenParManche,
      maxRung: gameMaxRung,
      precomputedRung,
    });
    nextRungRef.current = precomputedRung.newRung;
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextActivity() {
    const newRung = nextRungRef.current ?? rung;
    setSessionDone(false);
    errorsTotal.current = 0;
    startedAt.current = Date.now();
    setRung(newRung);
    loadActivity(miniJeuId, newRung);
  }

  function onItemPress(index) {
    setSelected(index === selected ? null : index);
  }

  function onCategoryPress(cat) {
    if (selected === null) return;
    const item = pool[selected];
    if (item.cat === cat) {
      const nextPool = pool.filter((_, i) => i !== selected);
      setPool(nextPool);
      setPlacedCount((c) => c + 1);
      setSelected(null);
      if (nextPool.length === 0) {
        if (calibPhase === 'calibrating') {
          const isCorrect = calibErrorsRef.current === 0;
          speakSmart(isCorrect ? 'Bravo, tout est bien rangé !' : "Bien joué, on continue !");
          setTimeout(() => handleCalibrationResult(miniJeuId, isCorrect), 500);
        } else {
          setTimeout(finishSession, 400);
        }
      }
    } else if (calibPhase === 'calibrating') {
      calibErrorsRef.current += 1;
      setSelected(null);
    } else {
      errorsTotal.current += 1;
      setSelected(null);
    }
  }

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        onContinue={proceedToNextActivity}
      />
    );
  }

  if (loading || categories.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame('tri_village') }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>
          {calibPhase === 'calibrating' ? '🔍 On découvre ton niveau !' : '🗂️ Le Tri du Village'}
        </Text>
        {calibPhase === 'play' && (
          <Pressable
            onPress={() => {
              Alert.alert(
                'Refaire le calibrage ?',
                "On va reposer quelques questions pour retrouver le bon niveau. C'est rapide !",
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Oui, on y va !',
                    onPress: () => {
                      const base = Math.min(gameMaxRung, rungFromGradeAndPalier(profil.niveau_defaut, 1));
                      calibCurrentRungRef.current = base;
                      calibStepPhaseRef.current = 'montee';
                      calibRoundsMonteeRef.current = 0;
                      calibRoundsDescenteRef.current = 0;
                      calibErrorsRef.current = 0;
                      setCalibRoundIndex(0);
                      setCalibPhase('calibrating');
                      loadActivity(miniJeuId, base);
                    },
                  },
                ]
              );
            }}
            hitSlop={10}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
          </Pressable>
        )}
        <Text style={styles.roundLabel}>
          {calibPhase === 'calibrating' ? `Manche ${calibRoundIndex + 1}` : `${placedCount}/${totalItems}`}
        </Text>
      </View>

      <View style={styles.gameCharacter}>
        <BouncingWrap><Noisette size={44} /></BouncingWrap>
      </View>

      <View style={styles.promptZone}>
        <Text style={styles.promptText}>
          {selected === null ? 'Touche un objet, puis sa bonne case !' : 'Maintenant, touche la bonne case !'}
        </Text>
        <Pressable
          style={styles.listenButton}
          onPress={() => speakSmart(selected === null ? 'Touche un objet, puis sa bonne case !' : 'Maintenant, touche la bonne case !')}
        >
          <Text style={styles.listenText}>🎤 Écouter</Text>
        </Pressable>
      </View>

      <View style={styles.triPool}>
        {pool.map((item, i) => (
          <Pressable
            key={item.key}
            style={[styles.triItem, selected === i && styles.triItemSelected]}
            onPress={() => onItemPress(i)}
          >
            <Text style={styles.triItemText} numberOfLines={1} adjustsFontSizeToFit>
              {item.val}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.triCategories}>
        {categories.map((cat) => (
          <Pressable key={cat} style={styles.triCategoryBox} onPress={() => onCategoryPress(cat)}>
            <Text style={styles.triCategoryText}>{cat}</Text>
            <Pressable
              style={styles.triCategoryListenBtn}
              onPress={() => speakSmart(cat)}
              hitSlop={8}
            >
              <Text style={{ fontSize: 12 }}>🎤</Text>
            </Pressable>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

// ============================================================
// Le Puzzle du Moulin — logique : toucher les pieces numerotees
// dans l'ordre croissant pour reconstituer l'image. Mecanique
// differente : ordre a respecter sur une grille.
// ============================================================
function targetPiecesForPalier(palier) {
  if (palier === 1) return 6;
  if (palier === 2) return 9;
  return 12;
}

const PUZZLE_REWARDS = ['🦋', '🌈', '🎨', '🚀', '🏰', '🌻', '🦄', '🐉', '⛵', '🎪'];
// ============================================================
// Le Labyrinthe de la Grotte (zone "logique") - etape 2 : vrai labyrinthe
// avec embranchements et impasses (algorithme classique "recursive
// backtracker" - genere un labyrinthe parfait : toutes les cases sont
// reliees, un seul vrai chemin le plus court entre deux cases, mais de
// vraies impasses a explorer, comme un labyrinthe papier).
//
// Deplacement au doigt par glisser : l'enfant fait glisser son doigt de
// case en case, aucune ambiguite possible car le moteur regarde juste
// quelle case se trouve sous le doigt a chaque instant (comme un jeu de
// mots ou l'on relie des lettres adjacentes). Aucune penalite pour les
// impasses : exploration totalement libre, seul le fait d'atteindre le
// tresor compte.
//
// La grille est generique : elle remplit tout l'ecran disponible avec une
// taille de case fixe et fiable au toucher (memes dimensions pour tous
// les enfants). Ce qui varie avec le niveau, c'est la DISTANCE entre le
// depart et le tresor (donc la complexite du trajet a trouver), pas la
// taille de la grille.
// ============================================================
const MAZE_CELL_SIZE = 34; // taille fixe, fiable au doigt

function mazeGridDimensionsForScreen(screenWidth, screenHeight) {
  const usableWidth = screenWidth - 24;
  const usableHeight = screenHeight - 90; // petit titre compact + marges seulement (plus de mascotte)
  const cols = Math.max(5, Math.floor(usableWidth / (MAZE_CELL_SIZE + 2)));
  const rows = Math.max(6, Math.floor(usableHeight / (MAZE_CELL_SIZE + 2)));
  return { rows, cols };
}

// Genere un labyrinthe parfait par parcours en profondeur avec retour en
// arriere : chaque case commence entouree de 4 murs, on retire les murs au
// fur et a mesure qu'on visite des cases voisines non visitees.
function generateMazeWalls(rows, cols, rung = 1, maxRung = 21) {
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ top: true, right: true, bottom: true, left: true }))
  );
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  function neighborsOf(r, c) {
    const list = [];
    if (r > 0) list.push([r - 1, c, 'top', 'bottom']);
    if (r < rows - 1) list.push([r + 1, c, 'bottom', 'top']);
    if (c > 0) list.push([r, c - 1, 'left', 'right']);
    if (c < cols - 1) list.push([r, c + 1, 'right', 'left']);
    return list;
  }

  const startR = 0, startC = 0;
  visited[startR][startC] = true;

  // Algorithme de Prim aleatoire plutot qu'un simple parcours en profondeur
  // : produit naturellement beaucoup plus d'embranchements et d'impasses
  // courtes des le debut, au lieu de longs couloirs qui serpentent sans
  // jamais vraiment bifurquer.
  let frontier = neighborsOf(startR, startC).map(([nr, nc, wallHere, wallThere]) => [startR, startC, wallHere, wallThere, nr, nc]);

  while (frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const [r, c, wallHere, wallThere, nr, nc] = frontier[idx];
    frontier.splice(idx, 1);
    if (visited[nr][nc]) continue;
    cells[r][c][wallHere] = false;
    cells[nr][nc][wallThere] = false;
    visited[nr][nc] = true;
    for (const [nnr, nnc, wallHere2, wallThere2] of neighborsOf(nr, nc)) {
      if (!visited[nnr][nnc]) {
        frontier.push([nr, nc, wallHere2, wallThere2, nnr, nnc]);
      }
    }
  }

  // Tressage : on retire un peu plus de murs au hasard pour creer de
  // vraies boucles (plusieurs chemins possibles, des croisements) - mais
  // seulement pour les petits niveaux, ou un labyrinthe plus ouvert et
  // indulgent convient mieux. Plus le niveau grandit, plus le tressage
  // diminue, jusqu'a un labyrinthe completement ferme (aucun espace libre,
  // uniquement des couloirs muraille a muraille) au niveau maximum.
  const ratioNiveau = Math.max(0, Math.min(1, (rung - 1) / Math.max(1, maxRung - 1)));
  const tauxTressage = 0.22 * (1 - ratioNiveau); // 22% au debut -> 0% au maximum
  const murs = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < cols - 1 && cells[r][c].right) murs.push([r, c, 'right', r, c + 1, 'left']);
      if (r < rows - 1 && cells[r][c].bottom) murs.push([r, c, 'bottom', r + 1, c, 'top']);
    }
  }
  const muresATresser = shuffle(murs).slice(0, Math.round(murs.length * tauxTressage));
  for (const [r, c, wallHere, nr, nc, wallThere] of muresATresser) {
    cells[r][c][wallHere] = false;
    cells[nr][nc][wallThere] = false;
  }

  // S'assure que le depart a toujours au moins 2 directions ouvertes : un
  // vrai choix des la premiere case, jamais un simple couloir impose.
  const ouvertesDepart = ['top', 'right', 'bottom', 'left'].filter((k) => !cells[startR][startC][k]);
  if (ouvertesDepart.length < 2) {
    const candidats = neighborsOf(startR, startC).filter(([, , wallHere]) => cells[startR][startC][wallHere]);
    if (candidats.length > 0) {
      const [nr, nc, wallHere, wallThere] = candidats[Math.floor(Math.random() * candidats.length)];
      cells[startR][startC][wallHere] = false;
      cells[nr][nc][wallThere] = false;
    }
  }

  return cells;
}

// Distances depuis le depart vers toutes les cases (parcours en largeur),
// pour choisir un tresor a la bonne distance selon le niveau de l'enfant.
function bfsDistances(cells, rows, cols, startR, startC) {
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
  dist[startR][startC] = 0;
  const queue = [[startR, startC]];
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    const cell = cells[r][c];
    const moves = [];
    if (!cell.top) moves.push([r - 1, c]);
    if (!cell.bottom) moves.push([r + 1, c]);
    if (!cell.left) moves.push([r, c - 1]);
    if (!cell.right) moves.push([r, c + 1]);
    for (const [nr, nc] of moves) {
      if (dist[nr][nc] === -1) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }
  return dist;
}

function pickTreasureForRung(dist, rows, cols, rung, maxRung) {
  let maxDist = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (dist[r][c] > maxDist) maxDist = dist[r][c];
  const ratio = Math.max(0.2, Math.min(1, rung / Math.max(1, maxRung)));
  const target = Math.round(maxDist * ratio);
  let best = { r: 0, c: 0, diff: Infinity };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const diff = Math.abs(dist[r][c] - target);
      if (diff < best.diff) best = { r, c, diff };
    }
  }
  return { r: best.r, c: best.c, targetDist: target };
}

function canMove(cells, r, c, dr, dc) {
  const cell = cells[r]?.[c];
  if (!cell) return false;
  if (dr === -1 && cell.top) return false;
  if (dr === 1 && cell.bottom) return false;
  if (dc === -1 && cell.left) return false;
  if (dc === 1 && cell.right) return false;
  return true;
}

// Retrace le plus court chemin du depart au tresor (via le tableau des
// distances BFS deja calcule), pour savoir ou poser les pieges de facon a
// ce qu'ils soient forcement rencontres en suivant la route la plus directe.
function bfsPath(cells, dist, startR, startC, endR, endC) {
  const path = [{ r: endR, c: endC }];
  let r = endR, c = endC;
  while (r !== startR || c !== startC) {
    const cell = cells[r][c];
    const options = [];
    if (!cell.top && dist[r - 1]?.[c] === dist[r][c] - 1) options.push([r - 1, c]);
    if (!cell.bottom && dist[r + 1]?.[c] === dist[r][c] - 1) options.push([r + 1, c]);
    if (!cell.left && dist[r]?.[c - 1] === dist[r][c] - 1) options.push([r, c - 1]);
    if (!cell.right && dist[r]?.[c + 1] === dist[r][c] - 1) options.push([r, c + 1]);
    if (options.length === 0) break; // securite, ne devrait pas arriver
    [r, c] = options[0];
    path.push({ r, c });
  }
  return path.reverse();
}

// Choisit quelques cases-piege reparties le long du chemin le plus direct
// (jamais la toute premiere ni la toute derniere case), pour qu'un enfant
// qui suit la route la plus evidente les rencontre forcement. Le nombre de
// pieges augmente doucement avec le niveau.
function pickTrapCells(path, rung) {
  if (path.length <= 3) return [];
  const nbPieges = Math.min(4, Math.max(1, Math.floor(rung / 3) + 1));
  const interieur = path.slice(1, -1);
  if (interieur.length === 0) return [];
  const pas = interieur.length / (nbPieges + 1);
  const pieges = [];
  for (let i = 1; i <= nbPieges; i++) {
    const idx = Math.min(interieur.length - 1, Math.round(pas * i));
    pieges.push(interieur[idx]);
  }
  return pieges;
}

function MazeGridVisual({ cells, rows, cols, pos, start, treasure, visitedSet, trapCells, trapsResolus, onGridTouch, gridRef }) {
  const cellSize = MAZE_CELL_SIZE;
  const wallColor = '#3D2E4F';

  return (
    <View
      ref={gridRef}
      collapsable={false}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => onGridTouch(e.nativeEvent.pageX, e.nativeEvent.pageY)}
      onResponderMove={(e) => onGridTouch(e.nativeEvent.pageX, e.nativeEvent.pageY)}
      style={{ alignSelf: 'center', marginVertical: 12, backgroundColor: '#EDE7F6', borderRadius: 6 }}
    >
      {cells.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((cell, c) => {
            const isVisited = visitedSet.has(`${r},${c}`);
            const isPos = pos.r === r && pos.c === c;
            const isStart = start.r === r && start.c === c;
            const isTreasure = treasure.r === r && treasure.c === c;
            const isTrapResolu = trapsResolus?.has(`${r},${c}`);
            return (
              <View
                key={c}
                style={{
                  width: cellSize,
                  height: cellSize,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isVisited ? '#C9B8E8' : '#FBF8FF',
                  borderTopWidth: cell.top ? 2 : 0,
                  borderBottomWidth: cell.bottom ? 2 : 0,
                  borderLeftWidth: cell.left ? 2 : 0,
                  borderRightWidth: cell.right ? 2 : 0,
                  borderColor: wallColor,
                }}
              >
                {isPos && <Text style={{ fontSize: cellSize * 0.6 }}>🧑</Text>}
                {!isPos && isTreasure && <Text style={{ fontSize: cellSize * 0.6 }}>💎</Text>}
                {!isPos && !isTreasure && isTrapResolu && <Text style={{ fontSize: cellSize * 0.5 }}>⭐</Text>}
                {!isPos && !isTreasure && !isTrapResolu && isStart && isVisited && (
                  <View style={{ width: cellSize * 0.25, height: cellSize * 0.25, borderRadius: 99, backgroundColor: '#9B7FC4' }} />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Va chercher une question-piege adaptee au vrai niveau de l'enfant dans un
// AUTRE jeu (logique ou calcul) plutot que de creer du contenu specifique
// au labyrinthe - reutilise Le Jeu des Intrus (logique, correspond au theme
// de la zone) et La Balance de la Prairie (calcul), en alternance.
async function fetchTrapQuestion(profil) {
  const source = Math.random() < 0.6 ? 'jeu_intrus' : 'balance_prairie';
  try {
    const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', source).single();
    if (!jeu) return null;
    const { data: prog } = await supabase
      .from('progression')
      .select('palier_actuel')
      .eq('profil_id', profil.id)
      .eq('mini_jeu_id', jeu.id)
      .maybeSingle();
    const rung = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
    const { niveau, palier } = gradeAndPalierFromRung(rung);
    const { data: contenu } = await supabase
      .from('contenu_mini_jeu')
      .select('donnees')
      .eq('mini_jeu_id', jeu.id)
      .eq('niveau', niveau)
      .eq('palier', palier)
      .eq('actif', true);
    if (!contenu || contenu.length === 0) return null;
    const pick = contenu[Math.floor(Math.random() * contenu.length)].donnees;

    if (source === 'jeu_intrus' && pick.items && pick.intrus) {
      return {
        question: "Trouve l'intrus !",
        options: shuffle(pick.items),
        bonneReponse: pick.intrus,
      };
    }
    if (source === 'balance_prairie' && pick.options && pick.manque != null) {
      return {
        question: `La balance a ${pick.gauche} d'un côté. De l'autre, il y a déjà ${pick.droit_connu}. Combien manque-t-il ?`,
        options: shuffle(pick.options),
        bonneReponse: pick.manque,
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

function TrapQuestionModal({ visible, trapData, onAnswer }) {
  useEffect(() => {
    if (!visible || !trapData) return;
    let cancelled = false;
    (async () => {
      await speakSmart(trapData.question);
      for (const opt of trapData.options) {
        if (cancelled) return;
        await speakSmart(String(opt));
      }
    })();
    return () => { cancelled = true; Speech.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, trapData]);

  if (!trapData) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={styles.modalTitle}>🔒 Piège !</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, color: colors.ink }}>
              {trapData.question}
            </Text>
            <Pressable onPress={() => speakSmart(trapData.question)} hitSlop={8}>
              <Text style={{ fontSize: 18 }}>🎤</Text>
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {trapData.options.map((opt, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  style={[styles.button, { flex: 1, marginTop: 0 }]}
                  onPress={() => onAnswer(String(opt) === String(trapData.bonneReponse))}
                >
                  <Text style={styles.buttonText}>{String(opt)}</Text>
                </Pressable>
                <Pressable onPress={() => speakSmart(String(opt))} hitSlop={8}>
                  <Text style={{ fontSize: 16 }}>🎤</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LabyrintheGrotteScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const gameMaxRung = rungFromGradeAndPalier('cm2', 3);
  const { rows, cols } = useMemo(
    () => mazeGridDimensionsForScreen(screenWidth, screenHeight),
    [screenWidth, screenHeight]
  );
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [cells, setCells] = useState(null);
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [treasure, setTreasure] = useState({ r: 0, c: 0 });
  const [visitedSet, setVisitedSet] = useState(() => new Set());
  const [trapsResolus, setTrapsResolus] = useState(() => new Set());
  const [activeTrap, setActiveTrap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const startedAt = useRef(Date.now());
  const cellsRef = useRef(null);
  const posRef = useRef({ r: 0, c: 0 });
  const treasureRef = useRef({ r: 0, c: 0 });
  const finishedRef = useRef(false);
  const stepsCountRef = useRef(0);
  const targetDistRef = useRef(0);
  const gridOriginRef = useRef({ x: 0, y: 0 });
  const gridRef = useRef(null);
  const trapCellsRef = useRef([]);
  const trapsResolusRef = useRef(new Set());
  const trapActiveRef = useRef(false); // bloque les deplacements pendant qu'une question est affichee

  const loadMaze = useCallback((currentRung) => {
    setLoading(true);
    const generated = generateMazeWalls(rows, cols, currentRung, gameMaxRung);
    const dist = bfsDistances(generated, rows, cols, 0, 0);
    const t = pickTreasureForRung(dist, rows, cols, currentRung, gameMaxRung);
    const chemin = bfsPath(generated, dist, 0, 0, t.r, t.c);
    const pieges = pickTrapCells(chemin, currentRung);
    cellsRef.current = generated;
    posRef.current = { r: 0, c: 0 };
    treasureRef.current = { r: t.r, c: t.c };
    targetDistRef.current = t.targetDist;
    trapCellsRef.current = pieges;
    trapsResolusRef.current = new Set();
    finishedRef.current = false;
    stepsCountRef.current = 0;
    setCells(generated);
    setPos({ r: 0, c: 0 });
    setTreasure({ r: t.r, c: t.c });
    setVisitedSet(new Set(['0,0']));
    setTrapsResolus(new Set());
    setActiveTrap(null);
    trapActiveRef.current = false;
    speakSmart('Fais glisser ton doigt pour trouver le chemin jusqu\u2019au trésor ! Attention aux pièges.');
    setLoading(false);
  }, [rows, cols, gameMaxRung]);

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'labyrinthe_grotte').single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);

      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();

      const rawStart = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      const startRung = Math.min(rawStart, gameMaxRung);
      setRung(startRung);
      loadMaze(startRung);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id, rows, cols]);

  async function finishSession() {
    if (!miniJeuId || finishedRef.current) return;
    finishedRef.current = true;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    // Progression rapide et volontairement simple : chaque labyrinthe
    // resolu fait monter d'un cran (le vrai defi vient desormais de la
    // richesse du labyrinthe lui-meme - embranchements, boucles - pas
    // d'un systeme de "2 reussites d'affilee" comme les autres jeux.
    const newRung = Math.min(gameMaxRung, rung + 1);
    const precomputedRung = {
      newRung,
      direction: newRung > rung ? 'up' : 'same',
      raison: newRung > rung ? 'parfait_rapide' : 'encore_un_effort',
    };
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: 0,
      dureeSecondes: durationSeconds,
      totalRounds: Math.max(1, targetDistRef.current),
      startedAt: startedAt.current,
      maxRung: gameMaxRung,
      precomputedRung,
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextActivity() {
    const newRung = sessionSummary?.newRung ?? rung;
    setSessionDone(false);
    startedAt.current = Date.now();
    setRung(newRung);
    loadMaze(newRung);
  }

  function tryMoveTo(r, c) {
    if (finishedRef.current || !cellsRef.current || trapActiveRef.current) return;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const { r: pr, c: pc } = posRef.current;
    if (r === pr && c === pc) return; // deja ici
    const dr = r - pr, dc = c - pc;
    // Seuls les deplacements vers une case immediatement adjacente comptent.
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;
    if (!canMove(cellsRef.current, pr, pc, dr, dc)) return; // un mur bloque

    posRef.current = { r, c };
    stepsCountRef.current += 1;
    setPos({ r, c });
    setVisitedSet((prev) => {
      const next = new Set(prev);
      next.add(`${r},${c}`);
      return next;
    });

    if (r === treasureRef.current.r && c === treasureRef.current.c) {
      speakSmart('Bravo, tu as trouvé le trésor !');
      setTimeout(finishSession, 500);
      return;
    }

    // Case-piege non encore resolue : on bloque le deplacement et on pose
    // une question adaptee au vrai niveau de l'enfant dans un autre jeu.
    const surUnPiege = trapCellsRef.current.some((p) => p.r === r && p.c === c);
    const dejaResolu = trapsResolusRef.current.has(`${r},${c}`);
    if (surUnPiege && !dejaResolu) {
      trapActiveRef.current = true;
      (async () => {
        const question = await fetchTrapQuestion(profil);
        if (question) {
          setActiveTrap({ ...question, cellKey: `${r},${c}` });
        } else {
          trapActiveRef.current = false; // pas de contenu dispo, on ne bloque pas l'enfant pour rien
        }
      })();
    }
  }

  function handleTrapAnswer(correct) {
    if (!activeTrap) return;
    if (correct) {
      speakSmart('Bravo, bonne réponse !');
      trapsResolusRef.current.add(activeTrap.cellKey);
      setTrapsResolus(new Set(trapsResolusRef.current));
      setActiveTrap(null);
      trapActiveRef.current = false;
    } else {
      speakSmart('Ce n\u2019est pas ça, retour au départ !');
      posRef.current = { r: 0, c: 0 };
      setPos({ r: 0, c: 0 });
      setVisitedSet(new Set(['0,0']));
      setActiveTrap(null);
      trapActiveRef.current = false;
    }
  }

  function onGridTouch(pageX, pageY) {
    const { x, y } = gridOriginRef.current;
    const localX = pageX - x;
    const localY = pageY - y;
    const c = Math.floor(localX / (MAZE_CELL_SIZE + 0));
    const r = Math.floor(localY / (MAZE_CELL_SIZE + 0));
    tryMoveTo(r, c);
  }

  function onGridLayout() {
    if (!gridRef.current) return;
    gridRef.current.measure((fx, fy, w, h, pageX, pageY) => {
      gridOriginRef.current = { x: pageX, y: pageY };
    });
  }

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        onContinue={proceedToNextActivity}
      />
    );
  }

  if (loading || !cells) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: '#DCD3E8', paddingTop: 6, paddingBottom: 6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 4 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink, marginLeft: 6 }}>
          🌀 Le Labyrinthe de la Grotte
        </Text>
      </View>

      <View onLayout={onGridLayout}>
        <MazeGridVisual
          cells={cells}
          rows={rows}
          cols={cols}
          pos={pos}
          start={{ r: 0, c: 0 }}
          treasure={treasure}
          visitedSet={visitedSet}
          trapCells={trapCellsRef.current}
          trapsResolus={trapsResolus}
          onGridTouch={onGridTouch}
          gridRef={gridRef}
        />
      </View>

      <TrapQuestionModal
        visible={activeTrap != null}
        trapData={activeTrap}
        onAnswer={handleTrapAnswer}
      />
    </ScrollView>
  );
}

// ============================================================
// Le Chemin des Dizaines (jeu bonus cache de "Le Bois des Nombres",
// competence maths) - travaille la numeration en base 10
// (dizaines/unites), pilier CP-CE1 de la methode de Singapour, absent du
// reste de l'app jusqu'ici.
//
// Reutilise le moteur de deplacement sur grille du Labyrinthe de la Grotte
// (meme generation de labyrinthe, meme glisser-deposer) : la ou le
// labyrinthe pose des questions "a cote" du trajet, ici c'est le trajet
// lui-meme (ramasser des jetons, les regrouper en paquets de 10) qui porte
// la notion enseignee.
//
// But du jeu : atteindre exactement un nombre cible annonce au depart, en
// ramassant des jetons disperses dans le labyrinthe et en les regroupant
// soi-meme en dizaines. Aucune penalite de type "retour au depart" - on
// ajuste jusqu'a tomber juste, dans un esprit de manipulation libre.
// ============================================================

// Cible un nombre a deux chiffres, grandissant avec le niveau reel de
// l'enfant sur ce jeu (9 au tout debut, jusqu'a 99 au niveau maximum).
function targetForDizainesRung(rung, maxRung) {
  const ratio = Math.max(0, Math.min(1, (rung - 1) / Math.max(1, maxRung - 1)));
  return Math.max(6, Math.round(9 + ratio * 90));
}

// Disperse des petits tas de jetons (1 a 4) sur les cases du labyrinthe
// (jamais la case de depart), en s'assurant qu'il y en a assez au total
// pour depasser la cible visee. Se rarefie avec le niveau : moins de tas,
// marge de securite plus fine - il faut explorer davantage pour trouver
// son compte, plutot que tomber dessus sans effort.
function placeJetonsDansLabyrinthe(rows, cols, target, rung = 1, maxRung = 21) {
  const ratioNiveau = Math.max(0, Math.min(1, (rung - 1) / Math.max(1, maxRung - 1)));
  const tauxCases = 0.45 - ratioNiveau * 0.22; // 45% au debut -> 23% au maximum
  const margeSecurite = Math.round(12 - ratioNiveau * 7); // marge confortable -> plus fine

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue; // jamais sur le depart
      cells.push({ r, c });
    }
  }
  const melange = shuffle(cells);
  const nbTas = Math.max(5, Math.round(melange.length * tauxCases));
  const jetons = new Map();
  let total = 0;
  let i = 0;
  while ((total < target + margeSecurite || i < nbTas) && i < melange.length) {
    const { r, c } = melange[i];
    const taille = 1 + Math.floor(Math.random() * 4);
    jetons.set(`${r},${c}`, taille);
    total += taille;
    i++;
  }
  return { jetons, cellsRestantes: melange.slice(i) };
}

// Quelques pieges fixes et visibles (jamais caches en surprise) : y
// marcher dessus renvoie au depart, mais l'enfant garde tout ce qu'il a
// deja ramasse - juste le trajet a refaire, pas la collecte perdue. Leur
// nombre grandit doucement avec le niveau.
function placePiegesDansLabyrinthe(cellsDisponibles, rung) {
  const nbPieges = Math.min(5, 1 + Math.floor(rung / 5));
  const pieges = new Set();
  for (let i = 0; i < Math.min(nbPieges, cellsDisponibles.length); i++) {
    pieges.add(`${cellsDisponibles[i].r},${cellsDisponibles[i].c}`);
  }
  return pieges;
}

// Portes a calcul mental : bloquent le passage tant que l'enfant n'a pas
// resolu un petit calcul adapte a son niveau. Une fois resolue, la porte
// reste ouverte pour le reste de la partie. Contrairement aux pieges,
// jamais de retour en arriere en cas d'erreur - juste "essaie encore".
function placePortesDansLabyrinthe(cellsDisponibles, rung) {
  const nbPortes = Math.min(4, 1 + Math.floor(rung / 6));
  const portes = new Set();
  for (let i = 0; i < Math.min(nbPortes, cellsDisponibles.length); i++) {
    portes.add(`${cellsDisponibles[i].r},${cellsDisponibles[i].c}`);
  }
  return portes;
}

// Genere un petit calcul mental (addition ou soustraction simple) adapte
// au niveau de l'enfant, pour les portes du Chemin des Dizaines - pas
// besoin de contenu en base, genere a la volee comme le reste du jeu.
function genererCalculPourRung(rung, maxRung) {
  const ratio = Math.max(0, Math.min(1, (rung - 1) / Math.max(1, maxRung - 1)));
  const maxNombre = Math.max(5, Math.round(6 + ratio * 90)); // 6 au debut -> 96 au maximum
  const soustraction = Math.random() < 0.5;
  let a, b, resultat;
  if (soustraction) {
    a = 2 + Math.floor(Math.random() * maxNombre);
    b = 1 + Math.floor(Math.random() * a);
    resultat = a - b;
  } else {
    a = 1 + Math.floor(Math.random() * maxNombre);
    b = 1 + Math.floor(Math.random() * maxNombre);
    resultat = a + b;
  }
  const question = `${a} ${soustraction ? '-' : '+'} ${b} = ?`;
  const options = new Set([resultat]);
  while (options.size < 3) {
    const ecart = 1 + Math.floor(Math.random() * 5);
    const leurre = Math.random() < 0.5 ? resultat + ecart : Math.max(0, resultat - ecart);
    options.add(leurre);
  }
  return { question, reponse: resultat, options: shuffle([...options]) };
}

// Vitesse du voleur (l'ecureuil) : plus rapide a mesure que le niveau
// grandit, mais toujours largement plus lent que l'enfant pour ne jamais
// donner de sensation de course contre la montre.
function vitesseVoleurPourRung(rung, maxRung) {
  const ratio = Math.max(0, Math.min(1, (rung - 1) / Math.max(1, maxRung - 1)));
  return Math.round(1300 - ratio * 800); // 1300ms au debut -> 500ms au maximum (vitesse doublee)
}

function PorteCalculModal({ visible, calcul, onAnswer }) {
  if (!calcul) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={styles.modalTitle}>🚪 Une porte !</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.ink }}>
              {calcul.question}
            </Text>
            <Pressable onPress={() => speakSmart(calcul.question.replace('?', 'combien'))} hitSlop={8}>
              <Text style={{ fontSize: 18 }}>🎤</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            {calcul.options.map((opt, i) => (
              <Pressable
                key={i}
                style={styles.button}
                onPress={() => onAnswer(opt === calcul.reponse)}
              >
                <Text style={styles.buttonText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DizainesGridVisual({ cells, rows, cols, pos, visitedSet, jetons, pieges, portes, portesResolues, voleurPos, onTouchStart, onTouchMove, gridRef }) {
  const cellSize = MAZE_CELL_SIZE;
  const wallColor = '#3D2E4F';

  return (
    <View
      ref={gridRef}
      collapsable={false}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => onTouchStart(e.nativeEvent.pageX, e.nativeEvent.pageY)}
      onResponderMove={(e) => onTouchMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
      style={{ alignSelf: 'center', marginVertical: 8, backgroundColor: '#FFF3D6', borderRadius: 6 }}
    >
      {cells.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((cell, c) => {
            const isVisited = visitedSet.has(`${r},${c}`);
            const isPos = pos.r === r && pos.c === c;
            const isVoleur = voleurPos && voleurPos.r === r && voleurPos.c === c;
            const isPiege = pieges?.has(`${r},${c}`);
            const key = `${r},${c}`;
            const estPorteFermee = portes?.has(key) && !portesResolues?.has(key);
            const estPorteOuverte = portes?.has(key) && portesResolues?.has(key);
            const jetonCount = jetons.get(key);
            return (
              <View
                key={c}
                style={{
                  width: cellSize,
                  height: cellSize,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: estPorteFermee ? '#E6D2F5' : isVisited ? '#F5DFA0' : '#FFFCF2',
                  borderTopWidth: cell.top ? 2 : 0,
                  borderBottomWidth: cell.bottom ? 2 : 0,
                  borderLeftWidth: cell.left ? 2 : 0,
                  borderRightWidth: cell.right ? 2 : 0,
                  borderColor: wallColor,
                }}
              >
                {isPos && <Text style={{ fontSize: cellSize * 0.6 }}>🧑</Text>}
                {!isPos && isVoleur && <Text style={{ fontSize: cellSize * 0.6 }}>🐿️</Text>}
                {!isPos && !isVoleur && isPiege && <Text style={{ fontSize: cellSize * 0.5 }}>🕳️</Text>}
                {!isPos && !isVoleur && estPorteFermee && <Text style={{ fontSize: cellSize * 0.5 }}>🚪</Text>}
                {!isPos && !isVoleur && estPorteOuverte && <Text style={{ fontSize: cellSize * 0.4 }}>🔓</Text>}
                {!isPos && !isVoleur && !isPiege && !estPorteFermee && !estPorteOuverte && jetonCount > 0 && (
                  <Text style={{ fontSize: cellSize * 0.45 }}>🌾{jetonCount}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function CheminDizainesScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []);

  const { profil } = route.params;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const gameMaxRung = rungFromGradeAndPalier('cm2', 3);
  const { rows, cols } = useMemo(
    // Cet ecran a en plus des badges et des boutons sous la grille (contrairement
    // au labyrinthe simple) - on reserve donc davantage d'espace que la fonction
    // partagee ne le fait par defaut, pour que rien ne deborde et que l'ecran
    // n'ait jamais besoin de defiler pendant qu'on glisse le doigt sur la grille.
    () => mazeGridDimensionsForScreen(screenWidth, screenHeight - 150),
    [screenWidth, screenHeight]
  );
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [cells, setCells] = useState(null);
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [visitedSet, setVisitedSet] = useState(() => new Set());
  const [jetonsRestants, setJetonsRestants] = useState(() => new Map());
  const [pieges, setPieges] = useState(() => new Set());
  const [portes, setPortes] = useState(() => new Set());
  const [portesResolues, setPortesResolues] = useState(() => new Set());
  const [porteActive, setPorteActive] = useState(null);
  const [voleurPos, setVoleurPos] = useState(null);
  const [enVrac, setEnVrac] = useState(0);
  const [dizaines, setDizaines] = useState(0);
  const [target, setTarget] = useState(10);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const startedAt = useRef(Date.now());
  const cellsRef = useRef(null);
  const posRef = useRef({ r: 0, c: 0 });
  const finishedRef = useRef(false);
  const gridRef = useRef(null);
  const jetonsRestantsRef = useRef(new Map());
  const piegesRef = useRef(new Set());
  const portesRef = useRef(new Set());
  const portesResoluesRef = useRef(new Set());
  const porteActiveRef = useRef(false); // bloque le deplacement pendant qu'une porte est posee
  const voleurPosRef = useRef(null);
  const voleurTimerRef = useRef(null);

  const loadNiveau = useCallback((currentRung) => {
    setLoading(true);
    if (voleurTimerRef.current) clearInterval(voleurTimerRef.current);
    const generated = generateMazeWalls(rows, cols, currentRung, gameMaxRung);
    const cible = targetForDizainesRung(currentRung, gameMaxRung);
    const { jetons, cellsRestantes } = placeJetonsDansLabyrinthe(rows, cols, cible, currentRung, gameMaxRung);
    const cellsMelangees = shuffle(cellsRestantes);
    const piegesPlaces = placePiegesDansLabyrinthe(cellsMelangees, currentRung);
    const cellsPourPortes = cellsMelangees.filter((c) => !piegesPlaces.has(`${c.r},${c.c}`));
    const portesPlacees = placePortesDansLabyrinthe(cellsPourPortes, currentRung);
    // Le voleur demarre a un endroit aleatoire du labyrinthe (jamais sur
    // la case de depart de l'enfant), plutot que toujours au coin oppose.
    let voleurDepart = { r: rows - 1, c: cols - 1 };
    for (let tentative = 0; tentative < 20; tentative++) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (r !== 0 || c !== 0) {
        voleurDepart = { r, c };
        break;
      }
    }
    cellsRef.current = generated;
    posRef.current = { r: 0, c: 0 };
    finishedRef.current = false;
    jetonsRestantsRef.current = jetons;
    piegesRef.current = piegesPlaces;
    portesRef.current = portesPlacees;
    portesResoluesRef.current = new Set();
    porteActiveRef.current = false;
    voleurPosRef.current = voleurDepart;
    setCells(generated);
    setPos({ r: 0, c: 0 });
    setVisitedSet(new Set(['0,0']));
    setJetonsRestants(jetons);
    setPieges(piegesPlaces);
    setPortes(portesPlacees);
    setPortesResolues(new Set());
    setPorteActive(null);
    setVoleurPos(voleurDepart);
    setEnVrac(0);
    setDizaines(0);
    setTarget(cible);
    setFeedback(null);
    speakSmart(`Va chercher ${cible} jetons ! Marche sur les tas pour les ramasser.`);
    setLoading(false);
  }, [rows, cols, gameMaxRung]);

  // Deplacement automatique du voleur (l'ecureuil) : il cherche activement
  // le tas de jetons le plus proche et se dirige droit dessus (via un
  // parcours en largeur, comme pour le tresor du labyrinthe), plutot que
  // d'errer au hasard - retour utilisateur : il fallait qu'il "aille
  // chercher" quelque chose, pas se balader sans but. S'il n'y a plus
  // aucun jeton a recolter, il erre au hasard en dernier recours. Il
  // grignote les tas sur lesquels il passe, et vole la collecte de
  // l'enfant s'ils se retrouvent sur la meme case (sans jamais le
  // repositionner, juste sa collecte qui repart a zero - pas de retour au
  // depart pour ce cas-la, contrairement aux pieges fixes).
  useEffect(() => {
    if (!cells || finishedRef.current) return;
    const vitesse = vitesseVoleurPourRung(rung, gameMaxRung);
    const timer = setInterval(() => {
      if (finishedRef.current || !cellsRef.current || !voleurPosRef.current) return;
      const { r, c } = voleurPosRef.current;
      let nr = null, nc = null;

      if (jetonsRestantsRef.current.size > 0) {
        const dist = bfsDistances(cellsRef.current, rows, cols, r, c);
        let meilleure = null;
        let meilleureDist = Infinity;
        for (const key of jetonsRestantsRef.current.keys()) {
          const [tr, tc] = key.split(',').map(Number);
          const d = dist[tr]?.[tc];
          if (d != null && d > 0 && d < meilleureDist) {
            meilleureDist = d;
            meilleure = { r: tr, c: tc };
          }
        }
        if (meilleure) {
          const chemin = bfsPath(cellsRef.current, dist, r, c, meilleure.r, meilleure.c);
          if (chemin.length > 1) {
            nr = chemin[1].r;
            nc = chemin[1].c;
          }
        }
      }

      if (nr === null) {
        // Plus rien a recolter (ou chemin introuvable) : erre au hasard.
        const directions = shuffle([[-1, 0], [1, 0], [0, -1], [0, 1]]);
        for (const [dr, dc] of directions) {
          if (canMove(cellsRef.current, r, c, dr, dc)) {
            nr = r + dr;
            nc = c + dc;
            break;
          }
        }
      }

      if (nr === null) return; // completement bloque, ne devrait pas arriver

      voleurPosRef.current = { r: nr, c: nc };
      setVoleurPos({ r: nr, c: nc });
      const key = `${nr},${nc}`;
      if (jetonsRestantsRef.current.has(key)) {
        jetonsRestantsRef.current = new Map(jetonsRestantsRef.current);
        jetonsRestantsRef.current.delete(key);
        setJetonsRestants(jetonsRestantsRef.current);
      }
      if (posRef.current.r === nr && posRef.current.c === nc) {
        setEnVrac(0);
        setDizaines(0);
        setFeedback('Le voleur a filé avec tes jetons !');
        speakSmart("Attention, l'écureuil a volé ta récolte !");
      }
    }, vitesse);
    voleurTimerRef.current = timer;
    return () => clearInterval(timer);
  }, [cells, rung, gameMaxRung]);

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'chemin_dizaines').single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);

      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();

      const rawStart = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      const startRung = Math.min(rawStart, gameMaxRung);
      setRung(startRung);
      loadNiveau(startRung);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id, rows, cols]);

  async function finishSession() {
    if (!miniJeuId || finishedRef.current) return;
    finishedRef.current = true;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const newRung = Math.min(gameMaxRung, rung + 1);
    const precomputedRung = {
      newRung,
      direction: newRung > rung ? 'up' : 'same',
      raison: newRung > rung ? 'parfait_rapide' : 'encore_un_effort',
    };
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: 0,
      dureeSecondes: durationSeconds,
      totalRounds: Math.max(1, Math.round(target / 10)),
      startedAt: startedAt.current,
      maxRung: gameMaxRung,
      precomputedRung,
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextActivity() {
    const newRung = sessionSummary?.newRung ?? rung;
    setSessionDone(false);
    startedAt.current = Date.now();
    setRung(newRung);
    loadNiveau(newRung);
  }

  function tryMoveTo(r, c) {
    if (finishedRef.current || !cellsRef.current || porteActiveRef.current) return;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const { r: pr, c: pc } = posRef.current;
    if (r === pr && c === pc) return;
    const dr = r - pr, dc = c - pc;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;
    if (!canMove(cellsRef.current, pr, pc, dr, dc)) return;

    const key = `${r},${c}`;

    // Piege fixe et visible : renvoie au depart, mais l'enfant garde tout
    // ce qu'il a deja ramasse - seul le trajet est a refaire.
    if (piegesRef.current.has(key)) {
      posRef.current = { r: 0, c: 0 };
      setPos({ r: 0, c: 0 });
      setVisitedSet(new Set(['0,0']));
      setFeedback('Un piège ! Retour au départ (tu gardes ta récolte).');
      speakSmart('Oups, un piège ! Retour au départ, mais tu gardes ta récolte.');
      return;
    }

    // Porte a calcul mental : bloque le passage tant qu'elle n'est pas
    // resolue. Une fois franchie, elle reste ouverte pour la suite.
    if (portesRef.current.has(key) && !portesResoluesRef.current.has(key)) {
      porteActiveRef.current = true;
      const calcul = genererCalculPourRung(rung, gameMaxRung);
      setPorteActive({ ...calcul, cellKey: key, r, c });
      return;
    }

    posRef.current = { r, c };
    setPos({ r, c });
    setVisitedSet((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    // Ramassage automatique en marchant sur un tas de jetons, et
    // regroupement automatique en bottes de dix des que possible - plus
    // besoin de bouton "Faire un paquet", ca se fait tout seul.
    const qte = jetonsRestantsRef.current.get(key);
    if (qte) {
      jetonsRestantsRef.current = new Map(jetonsRestantsRef.current);
      jetonsRestantsRef.current.delete(key);
      setJetonsRestants(jetonsRestantsRef.current);
      speakSmart(`Plus ${qte} !`);
      setEnVrac((v) => {
        const total = v + qte;
        const nouvellesBottes = Math.floor(total / 10);
        if (nouvellesBottes > 0) {
          setDizaines((d) => d + nouvellesBottes);
          setTimeout(() => {
            speakSmart(nouvellesBottes > 1 ? `${nouvellesBottes} nouvelles bottes de dix !` : 'Une nouvelle botte de dix !');
          }, 600);
        }
        return total % 10;
      });
    }

    // Si l'enfant arrive sur la case du voleur, il se fait voler toute sa
    // recolte ET renvoyer au depart (plus severe qu'avant : avant, il ne
    // faisait que perdre la recolte sans se deplacer).
    if (voleurPosRef.current && voleurPosRef.current.r === r && voleurPosRef.current.c === c) {
      setEnVrac(0);
      setDizaines(0);
      posRef.current = { r: 0, c: 0 };
      setPos({ r: 0, c: 0 });
      setVisitedSet(new Set(['0,0']));
      setFeedback('Le voleur a filé avec tes bottes ! Retour au départ.');
      speakSmart("Attention, l'écureuil a volé tes bottes ! Retour au départ.");
    }
  }

  function handlePorteReponse(correct) {
    if (!porteActive) return;
    if (correct) {
      portesResoluesRef.current = new Set(portesResoluesRef.current);
      portesResoluesRef.current.add(porteActive.cellKey);
      setPortesResolues(new Set(portesResoluesRef.current));
      speakSmart('Bravo, la porte s\'ouvre !');
      const { r, c } = porteActive;
      setPorteActive(null);
      porteActiveRef.current = false;
      // On avance directement dans la case maintenant ouverte.
      tryMoveTo(r, c);
    } else {
      speakSmart('Essaie encore !');
      setPorteActive(null);
      porteActiveRef.current = false;
    }
  }

  // Glissement RELATIF plutot que position absolue : ou que le doigt se
  // pose sur la grille, glisser dans une direction fait avancer le
  // personnage pas a pas dans cette direction - le doigt n'a plus besoin
  // d'etre exactement sur le personnage, donc il ne cache plus la vue sur
  // le chemin (retour utilisateur).
  const touchAnchorRef = useRef(null);
  const PAS_GLISSEMENT = MAZE_CELL_SIZE * 0.7; // distance a glisser pour declencher un pas

  function onTouchStart(pageX, pageY) {
    touchAnchorRef.current = { x: pageX, y: pageY };
  }

  function onTouchMove(pageX, pageY) {
    if (!touchAnchorRef.current) {
      touchAnchorRef.current = { x: pageX, y: pageY };
      return;
    }
    const dx = pageX - touchAnchorRef.current.x;
    const dy = pageY - touchAnchorRef.current.y;
    if (Math.abs(dx) < PAS_GLISSEMENT && Math.abs(dy) < PAS_GLISSEMENT) return;

    const { r, c } = posRef.current;
    let nr = r, nc = c;
    if (Math.abs(dx) > Math.abs(dy)) {
      nc = c + (dx > 0 ? 1 : -1);
    } else {
      nr = r + (dy > 0 ? 1 : -1);
    }
    tryMoveTo(nr, nc);
    // On redemarre la mesure a partir d'ici, pour un glissement continu
    // qui fait avancer le personnage pas a pas tant que le doigt bouge.
    touchAnchorRef.current = { x: pageX, y: pageY };
  }

  function retirerUnEnVrac() {
    setEnVrac((v) => Math.max(0, v - 1));
  }

  // A partir du CE1, le compte des bottes et des jetons en vrac n'est plus
  // affiche en direct - l'enfant doit suivre son compte de tete, comme un
  // vrai calcul mental. Le Joker permet de "tricher" en revelant le
  // total exact, mais ca a un prix : entre 1 et 10 jetons sont perdus au
  // hasard a chaque utilisation, en contrepartie.
  function utiliserJoker() {
    const total = dizaines * 10 + enVrac;
    const perte = Math.min(total, 1 + Math.floor(Math.random() * 10));
    const nouveauTotal = total - perte;
    setDizaines(Math.floor(nouveauTotal / 10));
    setEnVrac(nouveauTotal % 10);
    const msg = `Tu avais ${total} ! Le joker t'en prend ${perte}, il t'en reste ${nouveauTotal}.`;
    setFeedback(msg);
    speakSmart(msg);
  }

  function verifier() {
    const total = dizaines * 10 + enVrac;
    if (total === target) {
      speakSmart('Bravo, le compte est bon !');
      setFeedback(null);
      setTimeout(finishSession, 400);
    } else if (total < target) {
      const manque = target - total;
      setFeedback(`Il en manque encore ${manque} !`);
      speakSmart(`Il en manque encore ${manque} !`);
    } else {
      const trop = total - target;
      setFeedback(`Il y en a ${trop} de trop !`);
      speakSmart(`Il y en a ${trop} de trop !`);
    }
  }

  // A partir du CE1, l'enfant compte de tete plutot que de voir le total
  // affiche en direct - le Joker (avec son cout) prend le relais du
  // comptage en direct des badges.
  const calculDeTeteActif = rung >= rungFromGradeAndPalier('ce1', 1);

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        onContinue={proceedToNextActivity}
      />
    );
  }

  if (loading || !cells) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <ScrollView
      scrollEnabled={false}
      contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: '#FFF3D6', paddingTop: 6, paddingBottom: 6 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 4 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink, marginLeft: 6, flex: 1 }}>
          🌾 Le Chemin des Dizaines
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <View style={styles.dizainesBadge}>
          <Text style={styles.dizainesBadgeText}>🎯 {target}</Text>
        </View>
        {calculDeTeteActif ? (
          <Pressable style={styles.dizainesBadge} onPress={utiliserJoker}>
            <Text style={styles.dizainesBadgeText}>🃏 Joker</Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.dizainesBadge}>
              <Text style={styles.dizainesBadgeText}>📦 {dizaines} dizaine{dizaines > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.dizainesBadge}>
              <Text style={styles.dizainesBadgeText}>🌾 {enVrac}</Text>
            </View>
          </>
        )}
      </View>

      {feedback && (
        <Text style={{ textAlign: 'center', color: colors.mossDeep, fontWeight: '700', marginBottom: 4 }}>
          {feedback}
        </Text>
      )}

      <DizainesGridVisual
        cells={cells}
        rows={rows}
        cols={cols}
        pos={pos}
        visitedSet={visitedSet}
        jetons={jetonsRestants}
        pieges={pieges}
        portes={portes}
        portesResolues={portesResolues}
        voleurPos={voleurPos}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        gridRef={gridRef}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {enVrac > 0 && (
          <Pressable style={[styles.button, { backgroundColor: '#E0C9A6' }]} onPress={retirerUnEnVrac}>
            <Text style={styles.buttonText}>↩️ Retirer un jeton</Text>
          </Pressable>
        )}
      </View>
      <Pressable style={[styles.button, { marginTop: 10, marginHorizontal: 40 }]} onPress={verifier}>
        <Text style={styles.buttonText}>✅ C'est bon !</Text>
      </Pressable>

      <PorteCalculModal
        visible={porteActive != null}
        calcul={porteActive}
        onAnswer={handlePorteReponse}
      />
    </ScrollView>
  );
}

// ============================================================
// Les Barres de Luma (jeu normal de "Le Bois des Nombres", competence
// maths) - modelisation en barres, le pilier le plus central de la
// methode de Singapour, absent du reste de l'app.
//
// Contrairement a la Balance (comparaison par equilibre), ici on
// compare/compose des quantites par LONGUEUR DE BARRES empilables - base
// des futurs problemes CE1-CE2 (complements a 10, additions imagees).
//
// Progression en 3 paliers, du plus simple au plus abstrait :
//  1) Comparaison (MS-GS) : deux barres deja construites, laquelle est la
//     plus longue/courte - juste taper la bonne barre.
//  2) Construction (CP-CE1) : un nombre cible est donne, l'enfant ajoute
//     des blocs un par un (au tap, pas de vrai glisser - plus fiable) pour
//     construire une barre de la bonne longueur.
//  3) Complement a dix (CE1-CE2) : une barre est deja partiellement
//     remplie, l'enfant ajoute les blocs manquants pour arriver a dix.
//
// Contenu genere proceduralement (comme le labyrinthe), pas besoin de
// contenu en base.
// ============================================================

const BARRE_BLOC_TAILLE = 34;
const BARRE_COULEURS = ['#7BB6E8', '#F2A65A', '#8FD19E', '#E8899A', '#C9A6E8'];

// 4 paliers, du plus concret au plus abstrait (esprit Singapour), qui
// montent vraiment jusqu'au niveau CE2 - avant, la difficulte plafonnait
// beaucoup trop bas (toujours des barres de 10 maximum, complement a 10
// systematique, jamais plus dur meme au cran le plus eleve).
function barresLumaModeForRung(rung) {
  if (rung <= 4) return 'comparaison';
  if (rung <= 9) return 'construction';
  if (rung <= 14) return 'complementRond';
  return 'toutEtPartie';
}

function rondCibleForRung(rung) {
  if (rung <= 11) return 10;
  if (rung <= 12) return 20;
  if (rung <= 13) return 30;
  return 50;
}

function genererMancheBarres(rung) {
  const mode = barresLumaModeForRung(rung);
  if (mode === 'comparaison') {
    const max = Math.min(9, 3 + Math.floor(rung / 2));
    let a = 1 + Math.floor(Math.random() * max);
    let b = 1 + Math.floor(Math.random() * max);
    while (b === a) b = 1 + Math.floor(Math.random() * max);
    const veutPlusLongue = Math.random() < 0.5;
    return {
      mode,
      barreA: a,
      barreB: b,
      consigne: veutPlusLongue ? 'Touche la barre la plus longue !' : 'Touche la barre la plus courte !',
      bonneReponse: veutPlusLongue ? (a > b ? 'A' : 'B') : (a < b ? 'A' : 'B'),
    };
  }
  if (mode === 'construction') {
    const max = 4 + Math.floor((rung - 5) * 2.2); // 4 a ~15
    const cible = 3 + Math.floor(Math.random() * (max - 2));
    return {
      mode,
      cible,
      consigne: `Construis une barre de ${cible} !`,
    };
  }
  if (mode === 'complementRond') {
    const cible = rondCibleForRung(rung);
    const deja = 1 + Math.floor(Math.random() * (cible - 1));
    return {
      mode,
      deja,
      cible,
      consigne: `Il y a déjà ${deja}. Complète jusqu'à ${cible} !`,
    };
  }
  // toutEtPartie : le tout et une partie sont donnes, il faut construire
  // l'autre partie (vraie soustraction posee via un modele en barres).
  const ratio = Math.max(0, Math.min(1, (rung - 15) / 6));
  const tout = Math.round(24 + ratio * 66); // 24 a 90
  const part1 = Math.max(4, Math.round(tout * (0.25 + Math.random() * 0.35)));
  const part2 = tout - part1;
  return {
    mode,
    tout,
    part1,
    cible: part2,
    consigne: `Le tout vaut ${tout}. Une partie vaut ${part1}. Construis l'autre partie !`,
  };
}

// Barre CONCRETE (cases unitaires comptables une par une) - utilisee pour
// la comparaison et la construction simple, quand les nombres restent
// petits. Jamais de case vide en pointilles : seuls les blocs deja poses
// sont affiches, sinon il suffit de remplir les trous visibles sans
// vraiment calculer (defaut releve par l'utilisateur).
function BarreConcrete({ blocs, couleur }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, maxWidth: 260 }}>
      {Array.from({ length: blocs }).map((_, i) => (
        <View
          key={i}
          style={{ width: BARRE_BLOC_TAILLE, height: BARRE_BLOC_TAILLE, borderRadius: 8, backgroundColor: couleur }}
        />
      ))}
    </View>
  );
}

// Barre ABSTRAITE (longueur proportionnelle, comme un vrai modele en
// barres) - utilisee pour les grands nombres (complement a un nombre rond,
// tout et une partie), pour rester lisible sans afficher des dizaines de
// petites cases. La largeur donne une idee de grandeur, le chiffre donne
// la valeur exacte.
function BarreAbstraite({ valeur, valeurMax, couleur, hauteur = 40 }) {
  const largeurMax = 260;
  const largeur = Math.max(24, Math.round((valeur / Math.max(1, valeurMax)) * largeurMax));
  return (
    <View style={{ width: largeur, height: hauteur, borderRadius: 8, backgroundColor: couleur, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontWeight: '800', color: '#fff', fontSize: 15 }}>{valeur}</Text>
    </View>
  );
}

function BarresLumaScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []);

  const { profil } = route.params;
  const gameMaxRung = rungFromGradeAndPalier('cm2', 3);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [manche, setManche] = useState(null);
  const [construitBlocs, setConstruitBlocs] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const startedAt = useRef(Date.now());
  const finishedRef = useRef(false);
  const erreursRef = useRef(0);

  // Calibrage adaptatif (identique en principe a celui des autres jeux) :
  // 'checking' -> verifie s'il existe deja une progression ; 'calibrating'
  // -> teste rapidement le niveau (montee jusqu'a 4 manches, puis descente
  // fine jusqu'a 3 manches de plus si une erreur a ete rencontree) ;
  // 'play' -> jeu normal. Seules les ERREURS determinent la montee/descente,
  // jamais le temps de reponse.
  const [calibPhase, setCalibPhase] = useState('checking');
  const [calibRoundIndex, setCalibRoundIndex] = useState(0);
  const calibCurrentRungRef = useRef(1);
  const calibStepPhaseRef = useRef('montee'); // 'montee' | 'descente'
  const calibRoundsMonteeRef = useRef(0);
  const calibRoundsDescenteRef = useRef(0);
  const CALIB_SAUTS_MONTEE = [2, 4, 6, 6];

  const nouvelleManche = useCallback((currentRung) => {
    const m = genererMancheBarres(currentRung);
    setManche(m);
    setConstruitBlocs(0);
    setFeedback(null);
    speakSmart(m.consigne);
    setLoading(false);
  }, []);

  function terminerCalibrage(jeuId, finalRung) {
    (async () => {
      try {
        await supabase.from('progression').upsert(
          {
            profil_id: profil.id,
            mini_jeu_id: jeuId,
            palier_actuel: finalRung,
            details: { streak: 0 },
            temps_reference_secondes: null,
            echecs_consecutifs: 0,
          },
          { onConflict: 'profil_id,mini_jeu_id' }
        );
      } catch (e) {
        // Non bloquant : le jeu demarre quand meme au bon niveau pour
        // cette session, meme si la sauvegarde a echoue.
      }
    })();
    setRung(finalRung);
    erreursRef.current = 0;
    setCalibPhase('play');
    nouvelleManche(finalRung);
  }

  function handleCalibrationResult(jeuId, isCorrect) {
    setTimeout(() => {
      setCalibRoundIndex((i) => i + 1);
      if (calibStepPhaseRef.current === 'montee') {
        calibRoundsMonteeRef.current += 1;
        if (!isCorrect) {
          calibStepPhaseRef.current = 'descente';
          calibCurrentRungRef.current = Math.max(1, calibCurrentRungRef.current - 2);
          setManche(null);
          setLoading(true);
          const m = genererMancheBarres(calibCurrentRungRef.current);
          setManche(m);
          setConstruitBlocs(0);
          setFeedback(null);
          speakSmart(m.consigne);
          setLoading(false);
          return;
        }
        if (calibRoundsMonteeRef.current >= 4) {
          terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
          return;
        }
        const saut = CALIB_SAUTS_MONTEE[calibRoundsMonteeRef.current] ?? 6;
        calibCurrentRungRef.current = Math.min(gameMaxRung, calibCurrentRungRef.current + saut);
        const m = genererMancheBarres(calibCurrentRungRef.current);
        setManche(m);
        setConstruitBlocs(0);
        setFeedback(null);
        speakSmart(m.consigne);
        return;
      }

      // Phase de descente.
      calibRoundsDescenteRef.current += 1;
      if (isCorrect) {
        terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
        return;
      }
      if (calibRoundsDescenteRef.current >= 3) {
        terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
        return;
      }
      calibCurrentRungRef.current = Math.max(1, calibCurrentRungRef.current - 2);
      const m = genererMancheBarres(calibCurrentRungRef.current);
      setManche(m);
      setConstruitBlocs(0);
      setFeedback(null);
      speakSmart(m.consigne);
    }, 900);
  }

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'barres_luma').single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);

      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();

      if (!prog) {
        // Premier lancement : on lance le calibrage adaptatif plutot que
        // de partir directement sur le niveau scolaire par defaut.
        const base = Math.min(gameMaxRung, rungFromGradeAndPalier(profil.niveau_defaut, 1));
        calibCurrentRungRef.current = base;
        calibStepPhaseRef.current = 'montee';
        calibRoundsMonteeRef.current = 0;
        calibRoundsDescenteRef.current = 0;
        setCalibRoundIndex(0);
        setCalibPhase('calibrating');
        const m = genererMancheBarres(base);
        setManche(m);
        setConstruitBlocs(0);
        setFeedback(null);
        speakSmart(m.consigne);
        setLoading(false);
        return;
      }

      const startRung = Math.min(prog.palier_actuel, gameMaxRung);
      setRung(startRung);
      erreursRef.current = 0;
      setCalibPhase('play');
      nouvelleManche(startRung);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  async function finishSession(wasEfficient) {
    if (!miniJeuId || finishedRef.current) return;
    finishedRef.current = true;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const precomputedRung = await computeStreakRung({
      profil, miniJeuId, currentRung: rung, wasPerfect: wasEfficient, maxRung: gameMaxRung,
    });
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: erreursRef.current,
      dureeSecondes: durationSeconds,
      totalRounds: 1,
      startedAt: startedAt.current,
      maxRung: gameMaxRung,
      precomputedRung,
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextActivity() {
    const newRung = sessionSummary?.newRung ?? rung;
    setSessionDone(false);
    finishedRef.current = false;
    erreursRef.current = 0;
    startedAt.current = Date.now();
    setRung(newRung);
    setLoading(true);
    nouvelleManche(newRung);
  }

  function handleComparaisonChoix(choix) {
    const isCorrect = choix === manche.bonneReponse;
    if (calibPhase === 'calibrating') {
      speakSmart(isCorrect ? 'Bravo !' : "Ce n'est pas celle-là.");
      handleCalibrationResult(miniJeuId, isCorrect);
      return;
    }
    if (isCorrect) {
      speakSmart('Bravo !');
      setTimeout(() => finishSession(erreursRef.current === 0), 400);
    } else {
      erreursRef.current += 1;
      setFeedback('Regarde bien laquelle est la plus longue...');
      speakSmart("Ce n'est pas celle-là, réessaie !");
    }
  }

  function ajouter(valeur) {
    setConstruitBlocs((b) => Math.max(0, b + valeur));
  }

  function cibleActuelle() {
    if (manche.mode === 'complementRond') return manche.cible - manche.deja;
    if (manche.mode === 'toutEtPartie') return manche.cible;
    return manche.cible;
  }

  function validerConstruction() {
    const attendu = cibleActuelle();
    const isCorrect = construitBlocs === attendu;
    if (calibPhase === 'calibrating') {
      speakSmart(isCorrect ? 'Bravo, le compte est bon !' : "Ce n'est pas tout à fait ça.");
      handleCalibrationResult(miniJeuId, isCorrect);
      return;
    }
    if (isCorrect) {
      speakSmart('Bravo, le compte est bon !');
      setTimeout(() => finishSession(erreursRef.current === 0), 400);
    } else {
      erreursRef.current += 1;
      const diff = attendu - construitBlocs;
      const msg = diff > 0 ? `Il en manque encore ${diff} !` : `Il y en a ${-diff} de trop !`;
      setFeedback(msg);
      speakSmart(msg);
    }
  }

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        onContinue={proceedToNextActivity}
      />
    );
  }

  if (loading || !manche) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  const grandNombre = manche.mode === 'complementRond' || manche.mode === 'toutEtPartie';

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: '#EAF4E8' }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>
          {calibPhase === 'calibrating' ? '🔍 On découvre ton niveau !' : '📏 Les Barres de Luma'}
        </Text>
        {calibPhase === 'play' && (
          <Pressable
            onPress={() => {
              Alert.alert(
                'Refaire le calibrage ?',
                "On va reposer quelques questions pour retrouver le bon niveau. C'est rapide !",
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Oui, on y va !',
                    onPress: () => {
                      const base = Math.min(gameMaxRung, rungFromGradeAndPalier(profil.niveau_defaut, 1));
                      calibCurrentRungRef.current = base;
                      calibStepPhaseRef.current = 'montee';
                      calibRoundsMonteeRef.current = 0;
                      calibRoundsDescenteRef.current = 0;
                      setCalibRoundIndex(0);
                      setCalibPhase('calibrating');
                      const m = genererMancheBarres(base);
                      setManche(m);
                      setConstruitBlocs(0);
                      setFeedback(null);
                      speakSmart(m.consigne);
                    },
                  },
                ]
              );
            }}
            hitSlop={10}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
          </Pressable>
        )}
      </View>

      {calibPhase === 'calibrating' && (
        <Text style={{ textAlign: 'center', color: colors.mossDeep, fontWeight: '700', marginBottom: 4 }}>
          Manche {calibRoundIndex + 1}
        </Text>
      )}

      <View style={styles.gameCharacter}>
        <BouncingWrap><Noisette size={48} /></BouncingWrap>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, paddingHorizontal: 16 }}>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.ink }}>
          {manche.consigne}
        </Text>
        <Pressable onPress={() => speakSmart(manche.consigne)} hitSlop={8}>
          <Text style={{ fontSize: 18 }}>🎤</Text>
        </Pressable>
      </View>

      {feedback && (
        <Text style={{ textAlign: 'center', color: colors.mossDeep, fontWeight: '700', marginBottom: 10 }}>
          {feedback}
        </Text>
      )}

      {manche.mode === 'comparaison' && (
        <View style={{ paddingHorizontal: 20, gap: 24 }}>
          <Pressable onPress={() => handleComparaisonChoix('A')} style={styles.barresLumaRow}>
            <Text style={styles.barresLumaLabel}>A</Text>
            <BarreConcrete blocs={manche.barreA} couleur={BARRE_COULEURS[0]} />
          </Pressable>
          <Pressable onPress={() => handleComparaisonChoix('B')} style={styles.barresLumaRow}>
            <Text style={styles.barresLumaLabel}>B</Text>
            <BarreConcrete blocs={manche.barreB} couleur={BARRE_COULEURS[1]} />
          </Pressable>
        </View>
      )}

      {manche.mode === 'construction' && (
        <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.mossDeep, marginBottom: 8 }}>{construitBlocs}</Text>
          <BarreConcrete blocs={construitBlocs} couleur={BARRE_COULEURS[2]} />
        </View>
      )}

      {manche.mode === 'complementRond' && (
        <View style={{ paddingHorizontal: 20, alignItems: 'center', gap: 6 }}>
          <BarreAbstraite valeur={manche.deja} valeurMax={manche.cible} couleur={BARRE_COULEURS[3]} />
          {construitBlocs > 0 && <BarreAbstraite valeur={construitBlocs} valeurMax={manche.cible} couleur={BARRE_COULEURS[4]} />}
        </View>
      )}

      {manche.mode === 'toutEtPartie' && (
        <View style={{ paddingHorizontal: 20, alignItems: 'center', gap: 6 }}>
          <BarreAbstraite valeur={manche.tout} valeurMax={manche.tout} couleur={'#B8B0A6'} hauteur={30} />
          <BarreAbstraite valeur={manche.part1} valeurMax={manche.tout} couleur={BARRE_COULEURS[0]} />
          {construitBlocs > 0 && <BarreAbstraite valeur={construitBlocs} valeurMax={manche.tout} couleur={BARRE_COULEURS[4]} />}
        </View>
      )}

      {manche.mode !== 'comparaison' && (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Pressable style={styles.button} onPress={() => ajouter(1)}>
              <Text style={styles.buttonText}>➕ 1</Text>
            </Pressable>
            <Pressable style={[styles.button, { backgroundColor: '#E0C9A6' }]} onPress={() => ajouter(-1)}>
              <Text style={styles.buttonText}>➖ 1</Text>
            </Pressable>
            {grandNombre && (
              <>
                <Pressable style={styles.button} onPress={() => ajouter(10)}>
                  <Text style={styles.buttonText}>➕ 10</Text>
                </Pressable>
                <Pressable style={[styles.button, { backgroundColor: '#E0C9A6' }]} onPress={() => ajouter(-10)}>
                  <Text style={styles.buttonText}>➖ 10</Text>
                </Pressable>
              </>
            )}
          </View>
          <Pressable style={[styles.button, { marginTop: 16, marginHorizontal: 60 }]} onPress={validerConstruction}>
            <Text style={styles.buttonText}>✅ C'est bon !</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function PuzzleMoulinScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [pieces, setPieces] = useState([]);
  const [nextExpected, setNextExpected] = useState(1);
  const [wrongFlash, setWrongFlash] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [reward] = useState(() => PUZZLE_REWARDS[Math.floor(Math.random() * PUZZLE_REWARDS.length)]);
  const errorsTotal = useRef(0);
  const totalPieces = useRef(6);
  const startedAt = useRef(Date.now());
  const nextRungRef = useRef(null);
  const gameMaxRung = rungFromGradeAndPalier('cm2', 3);

  const loadActivity = useCallback((currentRung) => {
    setLoading(true);
    const { palier } = gradeAndPalierFromRung(currentRung);
    const n = targetPiecesForPalier(palier);
    totalPieces.current = n;
    setPieces(shuffle(Array.from({ length: n }, (_, i) => i + 1)));
    setNextExpected(1);
    speakSmart("Touche les pièces dans l'ordre, du numéro 1 au dernier !");
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase
        .from('mini_jeux')
        .select('id')
        .eq('code', 'puzzle_moulin')
        .single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);

      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();

      const rawStart = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      const startRung = Math.min(rawStart, gameMaxRung);
      setRung(startRung);
      loadActivity(startRung);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const tempsMoyenParManche = Math.round(durationSeconds / totalPieces.current);
    const precomputedRung = await computeStreakRung({
      profil, miniJeuId, currentRung: rung, wasPerfect: errorsTotal.current <= 1, maxRung: gameMaxRung,
      erreursTotal: errorsTotal.current, totalRounds: totalPieces.current, dureeMoyenneManche: tempsMoyenParManche,
    });
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: totalPieces.current,
      startedAt: startedAt.current,
      tempsMoyenParManche,
      maxRung: gameMaxRung,
      precomputedRung,
    });
    nextRungRef.current = precomputedRung.newRung;
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextActivity() {
    const newRung = nextRungRef.current ?? rung;
    setSessionDone(false);
    errorsTotal.current = 0;
    startedAt.current = Date.now();
    setRung(newRung);
    loadActivity(newRung);
  }

  function onPiecePress(num) {
    if (num === nextExpected) {
      const isLast = num === totalPieces.current;
      setNextExpected(num + 1);
      if (isLast) {
        setTimeout(finishSession, 500);
      }
    } else {
      errorsTotal.current += 1;
      setWrongFlash(num);
      setTimeout(() => setWrongFlash(null), 400);
    }
  }

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        onContinue={proceedToNextActivity}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  const progress = Math.min(nextExpected - 1, totalPieces.current);

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame('puzzle_moulin') }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>🧩 Le Puzzle du Moulin</Text>
        <Text style={styles.roundLabel}>{progress}/{totalPieces.current}</Text>
      </View>

      <View style={styles.gameCharacter}>
        <BouncingWrap><Maestro size={44} /></BouncingWrap>
      </View>

      <View style={styles.promptZone}>
        <Text style={{ fontSize: 48, opacity: Math.max(0.15, progress / totalPieces.current) }}>{reward}</Text>
        <Text style={styles.promptText}>Touche les pièces dans l'ordre, du numéro 1 au dernier !</Text>
        <Pressable
          style={styles.listenButton}
          onPress={() => speakSmart("Touche les pièces dans l'ordre, du numéro 1 au dernier !")}
        >
          <Text style={styles.listenText}>🎤 Écouter</Text>
        </Pressable>
      </View>

      <View style={styles.puzzleGrid}>
        {pieces.map((num) => {
          const done = num < nextExpected;
          return (
            <Pressable
              key={num}
              style={[
                styles.puzzlePiece,
                done && styles.puzzlePieceDone,
                wrongFlash === num && styles.puzzlePieceWrong,
              ]}
              disabled={done}
              onPress={() => onPiecePress(num)}
            >
              <Text style={styles.puzzlePieceText}>{done ? '✓' : num}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ============================================================
// La Frise du Temps — histoire : toucher des evenements dans le
// bon ordre chronologique. Nouvelle mecanique (basee sur de vraies
// dates plutot que des numeros arbitraires).
// ============================================================
function FriseTempsScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [evenements, setEvenements] = useState([]);
  const [correctOrder, setCorrectOrder] = useState([]);
  const [nextExpectedIndex, setNextExpectedIndex] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const errorsTotal = useRef(0);
  const startedAt = useRef(Date.now());
  const nextRungRef = useRef(null);
  const gameMaxRung = rungFromGradeAndPalier('cm2', 3);

  // Calibrage adaptatif : chaque frise complete (tous les evenements
  // ordonnes sans aucune erreur) compte comme une "manche" reussie.
  // Seules les erreurs determinent la montee/descente, jamais le temps.
  const [calibPhase, setCalibPhase] = useState('checking');
  const [calibRoundIndex, setCalibRoundIndex] = useState(0);
  const calibCurrentRungRef = useRef(1);
  const calibStepPhaseRef = useRef('montee');
  const calibRoundsMonteeRef = useRef(0);
  const calibRoundsDescenteRef = useRef(0);
  const calibErrorsRef = useRef(0);
  const CALIB_SAUTS_MONTEE = [2, 4, 6, 6];

  const loadActivity = useCallback(async (jeuId, currentRung) => {
    setLoading(true);
    const { niveau, palier } = gradeAndPalierFromRung(currentRung);
    const { data: rows } = await supabase
      .from('contenu_mini_jeu')
      .select('donnees')
      .eq('mini_jeu_id', jeuId)
      .eq('niveau', niveau)
      .eq('palier', palier)
      .eq('actif', true);

    const pool = rows ?? [];
    const pick = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    const evts = pick?.donnees?.evenements ?? [];
    const sorted = [...evts].sort((a, b) => a.annee - b.annee).map((e) => e.nom);
    setCorrectOrder(sorted);
    setEvenements(shuffle(evts));
    setNextExpectedIndex(0);
    speakSmart("Touche les événements dans l'ordre, du plus ancien au plus récent !");
    setLoading(false);
  }, []);

  function terminerCalibrage(jeuId, finalRung) {
    (async () => {
      try {
        await supabase.from('progression').upsert(
          {
            profil_id: profil.id,
            mini_jeu_id: jeuId,
            palier_actuel: finalRung,
            details: { streak: 0 },
            temps_reference_secondes: null,
            echecs_consecutifs: 0,
          },
          { onConflict: 'profil_id,mini_jeu_id' }
        );
      } catch (e) {
        // Non bloquant.
      }
    })();
    setRung(finalRung);
    errorsTotal.current = 0;
    setCalibPhase('play');
    loadActivity(jeuId, finalRung);
  }

  function handleCalibrationResult(jeuId, isCorrect) {
    setCalibRoundIndex((i) => i + 1);
    calibErrorsRef.current = 0;
    if (calibStepPhaseRef.current === 'montee') {
      calibRoundsMonteeRef.current += 1;
      if (!isCorrect) {
        calibStepPhaseRef.current = 'descente';
        calibCurrentRungRef.current = Math.max(1, calibCurrentRungRef.current - 2);
        loadActivity(jeuId, calibCurrentRungRef.current);
        return;
      }
      if (calibRoundsMonteeRef.current >= 4) {
        terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
        return;
      }
      const saut = CALIB_SAUTS_MONTEE[calibRoundsMonteeRef.current] ?? 6;
      calibCurrentRungRef.current = Math.min(gameMaxRung, calibCurrentRungRef.current + saut);
      loadActivity(jeuId, calibCurrentRungRef.current);
      return;
    }

    calibRoundsDescenteRef.current += 1;
    if (isCorrect) {
      terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
      return;
    }
    if (calibRoundsDescenteRef.current >= 3) {
      terminerCalibrage(jeuId, Math.min(gameMaxRung, calibCurrentRungRef.current));
      return;
    }
    calibCurrentRungRef.current = Math.max(1, calibCurrentRungRef.current - 2);
    loadActivity(jeuId, calibCurrentRungRef.current);
  }

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase.from('mini_jeux').select('id').eq('code', 'frise_temps').single();
      if (!jeu) return;
      setMiniJeuId(jeu.id);

      const { data: prog } = await supabase
        .from('progression')
        .select('palier_actuel')
        .eq('profil_id', profil.id)
        .eq('mini_jeu_id', jeu.id)
        .maybeSingle();

      if (!prog) {
        const base = Math.min(gameMaxRung, rungFromGradeAndPalier(profil.niveau_defaut, 1));
        calibCurrentRungRef.current = base;
        calibStepPhaseRef.current = 'montee';
        calibRoundsMonteeRef.current = 0;
        calibRoundsDescenteRef.current = 0;
        calibErrorsRef.current = 0;
        setCalibRoundIndex(0);
        setCalibPhase('calibrating');
        loadActivity(jeu.id, base);
        return;
      }

      const startRung = Math.min(prog.palier_actuel, gameMaxRung);
      setRung(startRung);
      setCalibPhase('play');
      loadActivity(jeu.id, startRung);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const tempsMoyenParManche = Math.round(durationSeconds / evenements.length);
    const precomputedRung = await computeStreakRung({
      profil, miniJeuId, currentRung: rung, wasPerfect: errorsTotal.current <= 1, maxRung: gameMaxRung,
      erreursTotal: errorsTotal.current, totalRounds: evenements.length, dureeMoyenneManche: tempsMoyenParManche,
    });
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: evenements.length,
      startedAt: startedAt.current,
      tempsMoyenParManche,
      maxRung: gameMaxRung,
      precomputedRung,
    });
    nextRungRef.current = precomputedRung.newRung;
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextActivity() {
    const newRung = nextRungRef.current ?? rung;
    setSessionDone(false);
    errorsTotal.current = 0;
    startedAt.current = Date.now();
    setRung(newRung);
    loadActivity(miniJeuId, newRung);
  }

  function onEventPress(nom) {
    if (nom === correctOrder[nextExpectedIndex]) {
      const isLast = nextExpectedIndex === correctOrder.length - 1;
      setNextExpectedIndex((i) => i + 1);
      if (isLast) {
        if (calibPhase === 'calibrating') {
          const isCorrect = calibErrorsRef.current === 0;
          speakSmart(isCorrect ? 'Bravo, frise parfaite !' : 'Bien joué, on continue !');
          setTimeout(() => handleCalibrationResult(miniJeuId, isCorrect), 500);
        } else {
          setTimeout(finishSession, 500);
        }
      }
    } else if (calibPhase === 'calibrating') {
      calibErrorsRef.current += 1;
      setWrongFlash(nom);
      setTimeout(() => setWrongFlash(null), 400);
    } else {
      errorsTotal.current += 1;
      setWrongFlash(nom);
      setTimeout(() => setWrongFlash(null), 400);
    }
  }

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        onContinue={proceedToNextActivity}
      />
    );
  }

  if (loading || evenements.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  const progress = Math.min(nextExpectedIndex, correctOrder.length);

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame('frise_temps') }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>
          {calibPhase === 'calibrating' ? '🔍 On découvre ton niveau !' : '📜 La Frise du Temps'}
        </Text>
        {calibPhase === 'play' && (
          <Pressable
            onPress={() => {
              Alert.alert(
                'Refaire le calibrage ?',
                "On va reposer quelques questions pour retrouver le bon niveau. C'est rapide !",
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Oui, on y va !',
                    onPress: () => {
                      const base = Math.min(gameMaxRung, rungFromGradeAndPalier(profil.niveau_defaut, 1));
                      calibCurrentRungRef.current = base;
                      calibStepPhaseRef.current = 'montee';
                      calibRoundsMonteeRef.current = 0;
                      calibRoundsDescenteRef.current = 0;
                      calibErrorsRef.current = 0;
                      setCalibRoundIndex(0);
                      setCalibPhase('calibrating');
                      loadActivity(miniJeuId, base);
                    },
                  },
                ]
              );
            }}
            hitSlop={10}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
          </Pressable>
        )}
        <Text style={styles.roundLabel}>
          {calibPhase === 'calibrating' ? `Manche ${calibRoundIndex + 1}` : `${progress}/${correctOrder.length}`}
        </Text>
      </View>

      <View style={styles.gameCharacter}>
        <BouncingWrap><Noisette size={44} /></BouncingWrap>
      </View>

      <View style={styles.promptZone}>
        <Text style={styles.promptText}>Touche les événements du plus ancien au plus récent !</Text>
        <Pressable
          style={styles.listenButton}
          onPress={() => speakSmart("Touche les événements dans l'ordre, du plus ancien au plus récent !")}
        >
          <Text style={styles.listenText}>🎤 Écouter</Text>
        </Pressable>
      </View>

      <View style={styles.friseTrack}>
        {Array.from({ length: correctOrder.length }).map((_, i) => (
          <View key={i} style={[styles.friseDot, i < nextExpectedIndex && styles.friseDotDone]} />
        ))}
      </View>

      <View style={styles.friseGrid}>
        {evenements.map((evt) => {
          const doneIndex = correctOrder.indexOf(evt.nom);
          const done = doneIndex !== -1 && doneIndex < nextExpectedIndex;
          return (
            <Pressable
              key={evt.nom}
              style={[
                styles.friseEvent,
                done && styles.friseEventDone,
                wrongFlash === evt.nom && styles.friseEventWrong,
              ]}
              disabled={done}
              onPress={() => onEventPress(evt.nom)}
            >
              <Text style={styles.friseEventIcon}>{evt.icon}</Text>
              <Text style={styles.friseEventText} numberOfLines={2} adjustsFontSizeToFit>
                {evt.nom}
              </Text>
              <Pressable
                style={styles.friseEventListenBtn}
                onPress={() => speakSmart(evt.nom)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 11 }}>🎤</Text>
              </Pressable>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}


function PommesDeLumaScreen({ route, navigation }) {
  return (
    <CalibratedChoiceGame
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
// ============================================================
// Le Mémory des Étoiles — mécanique différente : retourner des
// cartes pour retrouver les paires emoji / mot.
// ============================================================
function shuffleCards(paires) {
  const cards = [];
  paires.forEach((p, i) => {
    cards.push({ key: `${i}-emoji`, pairId: i, type: 'emoji', value: p.emoji });
    cards.push({ key: `${i}-mot`, pairId: i, type: 'mot', value: p.mot });
  });
  return shuffle(cards);
}

function MemoryScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [busy, setBusy] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const errorsTotal = useRef(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase
        .from('mini_jeux')
        .select('id')
        .eq('code', 'memoire_etoiles')
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
      const { niveau, palier } = gradeAndPalierFromRung(startRung);

      const { data } = await supabase
        .from('contenu_mini_jeu')
        .select('id, donnees')
        .eq('mini_jeu_id', jeu.id)
        .eq('niveau', niveau)
        .eq('palier', palier)
        .eq('actif', true)
        .limit(10);

      const pick = (data ?? [])[Math.floor(Math.random() * (data?.length ?? 1))];
      if (pick) {
        setCards(shuffleCards(pick.donnees.paires));
        speakSmart('Trouve les paires !');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    // Mecanique dediee a ce jeu : on ne compte JAMAIS les erreurs (se tromper
    // en cherchant une paire fait partie du jeu). Seule la reussite complete
    // de la grille compte ; apres 2 reussites d'affilee, on monte de niveau.
    const precomputedRung = await computeStreakRung({
      profil, miniJeuId, currentRung: rung, wasPerfect: true, maxRung: MAX_CONTENT_RUNG,
    });
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: cards.length / 2,
      startedAt: startedAt.current,
      maxRung: MAX_CONTENT_RUNG,
      precomputedRung,
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function onCardPress(index) {
    if (busy) return;
    if (flipped.includes(index)) return;
    if (matched.includes(cards[index].pairId)) return;

    const card = cards[index];
    if (card.type === 'mot') {
      speakSmart(card.value);
    }

    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setBusy(true);
      const [i1, i2] = nextFlipped;
      const isMatch = cards[i1].pairId === cards[i2].pairId;

      setTimeout(async () => {
        if (isMatch) {
          const newMatched = [...matched, cards[i1].pairId];
          setMatched(newMatched);
          setFlipped([]);
          setBusy(false);
          if (newMatched.length === cards.length / 2) {
            await finishSession();
          }
        } else {
          errorsTotal.current += 1;
          setFlipped([]);
          setBusy(false);
        }
      }, 900);
    }
  }

  async function proceedToNextRound() {
    setSessionDone(false);
    setMatched([]);
    setFlipped([]);
    setLoading(true);
    const { niveau, palier } = gradeAndPalierFromRung(sessionSummary.newRung);
    setRung(sessionSummary.newRung);
    const { data } = await supabase
      .from('contenu_mini_jeu')
      .select('id, donnees')
      .eq('mini_jeu_id', miniJeuId)
      .eq('niveau', niveau)
      .eq('palier', palier)
      .eq('actif', true)
      .limit(10);
    const pick = (data ?? [])[Math.floor(Math.random() * (data?.length ?? 1))];
    if (pick) {
      setCards(shuffleCards(pick.donnees.paires));
      speakSmart('Trouve les paires !');
    }
    startedAt.current = Date.now();
    setLoading(false);
  }

  if (sessionDone) {
    return (
      <SessionEndScreen
        profil={profil}
        summary={sessionSummary}
        navigation={navigation}
        timeUp={false}
        onContinue={proceedToNextRound}
      />
    );
  }

  if (loading || cards.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame('memoire_etoiles') }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>⭐ Le Mémory des Étoiles</Text>
        <Text style={styles.roundLabel}>{matched.length}/{cards.length / 2}</Text>
      </View>

      <View style={styles.gameCharacter}>
        <BouncingWrap><Noisette size={44} /></BouncingWrap>
      </View>

      <View style={styles.memoryGrid}>
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index) || matched.includes(card.pairId);
          return (
            <Pressable
              key={card.key}
              style={[styles.memoryCard, isFlipped && styles.memoryCardFlipped]}
              onPress={() => onCardPress(index)}
              disabled={isFlipped}
            >
              <Text style={card.type === 'emoji' ? styles.memoryEmoji : styles.memoryWord}>
                {isFlipped ? card.value : '🌟'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ============================================================
// Le Coffre aux Souvenirs — mecanique differente : observer une
// sequence de couleurs qui s'allument, puis la reproduire de
// memoire. La sequence grandit a chaque reussite.
// ============================================================
const SIMON_COLORS = [
  { name: 'Rouge', color: '#E5533D' },
  { name: 'Bleu', color: '#4FA8DB' },
  { name: 'Vert', color: '#7CB342' },
  { name: 'Jaune', color: '#F5C518' },
];

function targetLengthForPalier(palier) {
  if (palier === 1) return 4;
  if (palier === 2) return 6;
  return 8;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function CoffreSouvenirsScreen({ route, navigation }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [rung, setRung] = useState(() => rungFromGradeAndPalier(profil.niveau_defaut, 1));
  const [sequence, setSequence] = useState([]);
  const [phase, setPhase] = useState('watching'); // 'watching' | 'repeating'
  const [activeIndex, setActiveIndex] = useState(null);
  const [userIndex, setUserIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const errorsTotal = useRef(0);
  const retries = useRef(0);
  const startedAt = useRef(Date.now());
  const targetLength = useRef(4);

  async function playSequence(seq) {
    setPhase('watching');
    await speakSmart(seq.length === 1 ? 'Regarde bien.' : 'Regarde encore.');
    await wait(300);
    for (let i = 0; i < seq.length; i += 1) {
      setActiveIndex(seq[i]);
      await wait(550);
      setActiveIndex(null);
      await wait(250);
    }
    setUserIndex(0);
    setPhase('repeating');
  }

  function startNewSequence(base) {
    const next = [...base, Math.floor(Math.random() * SIMON_COLORS.length)];
    setSequence(next);
    playSequence(next);
  }

  useEffect(() => {
    (async () => {
      const { data: jeu } = await supabase
        .from('mini_jeux')
        .select('id')
        .eq('code', 'coffre_souvenirs')
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
      const { palier } = gradeAndPalierFromRung(startRung);
      targetLength.current = targetLengthForPalier(palier);
      setLoading(false);
      startNewSequence([]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  async function finishSession() {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: targetLength.current,
      startedAt: startedAt.current,
      tempsMoyenParManche: Math.round(durationSeconds / targetLength.current),
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function onTilePress(colorIndex) {
    if (phase !== 'repeating') return;
    setActiveIndex(colorIndex);
    setTimeout(() => setActiveIndex(null), 250);

    if (colorIndex === sequence[userIndex]) {
      const nextUserIndex = userIndex + 1;
      if (nextUserIndex === sequence.length) {
        if (sequence.length >= targetLength.current) {
          setTimeout(finishSession, 500);
        } else {
          retries.current = 0;
          setTimeout(() => startNewSequence(sequence), 700);
        }
      } else {
        setUserIndex(nextUserIndex);
      }
    } else {
      errorsTotal.current += 1;
      retries.current += 1;
      if (retries.current >= 3) {
        setTimeout(finishSession, 500);
      } else {
        setTimeout(() => playSequence(sequence), 700);
      }
    }
  }

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} />;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.mossDeep} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame('coffre_souvenirs') }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>🧰 Le Coffre aux Souvenirs</Text>
        <Text style={styles.roundLabel}>{sequence.length}/{targetLength.current}</Text>
      </View>

      <View style={styles.gameCharacter}>
        <BouncingWrap><Noisette size={44} /></BouncingWrap>
      </View>

      <View style={styles.promptZone}>
        <Text style={styles.promptText}>
          {phase === 'watching' ? '👀 Regarde bien la séquence...' : '👆 À toi de la reproduire !'}
        </Text>
        <Pressable
          style={styles.listenButton}
          onPress={() => speakSmart('Regarde bien les couleurs qui s\'allument, puis touche-les dans le même ordre.')}
        >
          <Text style={styles.listenText}>🎤 Écouter</Text>
        </Pressable>
      </View>

      <View style={styles.simonGrid}>
        {SIMON_COLORS.map((c, i) => (
          <Pressable
            key={c.name}
            style={[
              styles.simonTile,
              { backgroundColor: c.color, opacity: activeIndex === i ? 1 : 0.55 },
              activeIndex === i && styles.simonTileActive,
            ]}
            disabled={phase !== 'repeating'}
            onPress={() => onTilePress(i)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

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
        <Text style={styles.backLabel}>‹ Retour</Text>
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

const MEMO_CATEGORIES = [
  { key: 'bonne_reponse', label: '✅ Bonne réponse' },
  { key: 'mauvaise_reponse', label: '❌ Mauvaise réponse' },
  { key: 'encouragement_fin', label: '🌟 Encouragement de fin de session réussie' },
];
const FREQUENCE_CHOICES = [
  { value: null, label: 'Désactivé' },
  { value: 5, label: 'Tous les 5' },
  { value: 10, label: 'Tous les 10' },
  { value: 20, label: 'Tous les 20' },
];

function ReglagesParentauxScreen({ route, navigation }) {
  const { familleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingMemos, setSavingMemos] = useState(false);
  const [savedMemos, setSavedMemos] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [existingPin, setExistingPin] = useState(null);
  const [frequenceMemos, setFrequenceMemos] = useState(null);
  const [musiqueAmbiance, setMusiqueAmbiance] = useState(DEFAULT_MUSIC_KEY);
  const [savingMusique, setSavingMusique] = useState(false);
  const [savedMusique, setSavedMusique] = useState(false);
  const [memos, setMemos] = useState({ bonne_reponse: [], mauvaise_reponse: [], encouragement_fin: [] });
  const [addingMemo, setAddingMemo] = useState(null);
  const [profils, setProfils] = useState([]);
  const [editingProfilId, setEditingProfilId] = useState(null);
  const [editPrenom, setEditPrenom] = useState('');
  const [editNiveau, setEditNiveau] = useState('gs');
  const [progressionOuverte, setProgressionOuverte] = useState(null);
  const [progressionParProfil, setProgressionParProfil] = useState({});
  const [securityEditFor, setSecurityEditFor] = useState(null);
  const [securityChoices, setSecurityChoices] = useState([]);

  function openSecurityAvatarEdit(p) {
    setSecurityEditFor(p.id);
    setSecurityChoices(shuffle(SECURITY_AVATARS).slice(0, 10));
  }

  async function saveSecurityAvatar(emoji) {
    // On leve aussi un eventuel verrouillage en cours : pas de raison de
    // garder l'enfant bloque apres que le parent vient de changer l'avatar.
    await supabase
      .from('profils_enfants')
      .update({ avatar_securite: emoji, verif_locked_until: null })
      .eq('id', securityEditFor);
    setSecurityEditFor(null);
    await loadProfils();
  }

  async function loadMemos() {
    const { data } = await supabase.from('memos_vocaux').select('*').eq('famille_id', familleId);
    const grouped = { bonne_reponse: [], mauvaise_reponse: [], encouragement_fin: [] };
    (data ?? []).forEach((m) => { if (grouped[m.categorie]) grouped[m.categorie].push(m); });
    setMemos(grouped);
  }

  async function loadProfils() {
    const { data } = await supabase
      .from('profils_enfants')
      .select('*')
      .eq('famille_id', familleId)
      .order('prenom');
    setProfils(data ?? []);
  }

  useEffect(() => {
    (async () => {
      const parametres = await getParametresParentaux(familleId);
      setPin(parametres?.code_validation ?? '');
      setExistingPin(parametres?.code_validation ?? null);
      setFrequenceMemos(parametres?.frequence_memos ?? null);
      setMusiqueAmbiance(parametres?.musique_ambiance ?? DEFAULT_MUSIC_KEY);
      await loadMemos();
      await loadProfils();
      setLoading(false);
      // Si un code parent existe deja, on protege l'acces. Sinon (tout premier
      // reglage), on laisse entrer directement pour permettre de le configurer.
      if (parametres?.code_validation) {
        setShowGate(true);
      } else {
        setUnlocked(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familleId]);

  function startEditProfil(p) {
    setEditingProfilId(p.id);
    setEditPrenom(p.prenom);
    setEditNiveau(p.niveau_defaut);
  }

  async function saveEditProfil() {
    if (!editPrenom.trim()) return;
    await supabase
      .from('profils_enfants')
      .update({ prenom: editPrenom.trim(), niveau_defaut: editNiveau })
      .eq('id', editingProfilId);
    setEditingProfilId(null);
    await loadProfils();
  }

  // Laisse choisir de combien avancer (1 a 3 crans), au lieu d'une valeur
  // fixe comme pour reculer.
  function avancerProgression(profilId) {
    Alert.alert(
      'Avancer la progression',
      'De combien de crans veux-tu faire avancer ce profil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: '+1', onPress: () => adjustNiveauGlobal(profilId, 1) },
        { text: '+2', onPress: () => adjustNiveauGlobal(profilId, 2) },
        { text: '+3', onPress: () => adjustNiveauGlobal(profilId, 3) },
      ]
    );
  }

  function adjustNiveauGlobal(profilId, delta) {
    Alert.alert(
      delta > 0 ? 'Avancer la progression' : 'Revenir en arrière',
      delta > 0
        ? `Faire avancer ce profil de ${delta} niveaux ?`
        : `Faire reculer ce profil de ${Math.abs(delta)} niveaux ? Utile si le niveau a monté trop vite.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const profil = profils.find((p) => p.id === profilId);
            const nouveauNiveau = Math.max(0, (profil?.niveau_global ?? 0) + delta);
            await supabase.from('profils_enfants').update({ niveau_global: nouveauNiveau }).eq('id', profilId);
            await loadProfils();
          },
        },
      ]
    );
  }

  function resetProgressionJeux(profilId) {
    Alert.alert(
      'Réinitialiser les jeux',
      "Tous les jeux de ce profil repartiront au niveau de départ (celui de sa classe). Le niveau global (avatar) n'est pas touché. Continuer ?",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('progression').delete().eq('profil_id', profilId);
            Alert.alert('Fait', 'La progression de tous les jeux a été réinitialisée.');
          },
        },
      ]
    );
  }

  async function toggleProgression(profilId) {
    if (progressionOuverte === profilId) {
      setProgressionOuverte(null);
      return;
    }
    setProgressionOuverte(profilId);
    if (!progressionParProfil[profilId]) {
      const [{ data: progRows }, { data: jeux }] = await Promise.all([
        supabase.from('progression').select('mini_jeu_id, palier_actuel').eq('profil_id', profilId),
        supabase.from('mini_jeux').select('id, code, nom').order('nom'),
      ]);
      const jeuxById = Object.fromEntries((jeux ?? []).map((j) => [j.id, j]));
      const lignes = (progRows ?? [])
        .map((r) => {
          const jeu = jeuxById[r.mini_jeu_id];
          if (!jeu) return null;
          const max = maxRungForGame(jeu.code);
          const note = Math.max(0, Math.min(10, Math.round((r.palier_actuel / max) * 10)));
          return {
            code: jeu.code, nom: jeu.nom, icon: GAME_ICONS[jeu.code] ?? '🎲', note,
            miniJeuId: r.mini_jeu_id, palier: r.palier_actuel, max,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.nom.localeCompare(b.nom));
      setProgressionParProfil((prev) => ({ ...prev, [profilId]: lignes }));
    }
  }

  async function adjustGamePalier(profilId, ligne, delta) {
    const nouveauPalier = Math.max(1, Math.min(ligne.max, ligne.palier + delta));
    if (nouveauPalier === ligne.palier) return;
    await supabase
      .from('progression')
      .update({ palier_actuel: nouveauPalier })
      .eq('profil_id', profilId)
      .eq('mini_jeu_id', ligne.miniJeuId);
    setProgressionParProfil((prev) => ({
      ...prev,
      [profilId]: prev[profilId].map((l) => (l.code === ligne.code
        ? { ...l, palier: nouveauPalier, note: Math.max(0, Math.min(10, Math.round((nouveauPalier / l.max) * 10))) }
        : l)),
    }));
  }

  function deleteProfil(profilId, prenom) {
    Alert.alert(
      `Supprimer ${prenom} ?`,
      'Toute sa progression, ses sessions et ses récompenses seront définitivement supprimées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('progression').delete().eq('profil_id', profilId);
            await supabase.from('sessions_jeu').delete().eq('profil_id', profilId);
            await supabase.from('jours_actifs').delete().eq('profil_id', profilId);
            await supabase.from('recompenses_parentales').delete().eq('profil_id', profilId);
            await supabase.from('profils_enfants').delete().eq('id', profilId);
            await loadProfils();
          },
        },
      ]
    );
  }

  // Sauvegarde du temps de jeu et du code parent : bouton juste en dessous,
  // pour ne jamais avoir a defiler jusqu'en bas de l'ecran pour l'enregistrer.
  async function handleSaveTemps() {
    setSaving(true);
    setSaved(false);
    await supabase
      .from('parametres_parentaux')
      .update({ code_validation: pin.trim() || null })
      .eq('famille_id', familleId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Change et sauvegarde immediatement le temps de jeu d'UN enfant precis
  // (pas de bouton a chercher : chaque appui sur +/- enregistre tout de suite).
  async function adjustProfilMinutes(profilId, delta) {
    const profil = profils.find((p) => p.id === profilId);
    const actuel = profil?.minutes_max_jour ?? 30;
    const nouveau = Math.max(MINUTES_MIN, Math.min(MINUTES_MAX, actuel + delta));
    setProfils((prev) => prev.map((p) => (p.id === profilId ? { ...p, minutes_max_jour: nouveau } : p)));
    await supabase.from('profils_enfants').update({ minutes_max_jour: nouveau }).eq('id', profilId);
  }

  // Sauvegarde separee pour la frequence des memos vocaux (section eloignee
  // du temps de jeu, autant lui laisser son propre bouton immediat).
  async function handleSaveMemosFrequence() {
    setSavingMemos(true);
    setSavedMemos(false);
    await supabase
      .from('parametres_parentaux')
      .update({ frequence_memos: frequenceMemos })
      .eq('famille_id', familleId);
    setSavingMemos(false);
    setSavedMemos(true);
    setTimeout(() => setSavedMemos(false), 2000);
  }

  // Change la musique tout de suite (pour un aperçu immediat) ET la
  // sauvegarde en base pour qu'elle soit utilisee sur la carte a l'avenir.
  async function handleChooseMusique(key) {
    setMusiqueAmbiance(key);
    setSavingMusique(true);
    setSavedMusique(false);
    await supabase
      .from('parametres_parentaux')
      .update({ musique_ambiance: key })
      .eq('famille_id', familleId);
    startBgMusic(key); // aperçu immediat si une musique est deja en cours
    setSavingMusique(false);
    setSavedMusique(true);
    setTimeout(() => setSavedMusique(false), 2000);
  }

  async function handleAddMemo(categorie) {
    setAddingMemo(categorie);
    await pickAndAddMemo(familleId, categorie);
    await loadMemos();
    setAddingMemo(null);
  }

  async function handleDeleteMemo(id) {
    await supabase.from('memos_vocaux').delete().eq('id', id);
    await loadMemos();
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
          skipTimeStep
          onCancel={() => navigation.goBack()}
          onSuccess={() => {
            setShowGate(false);
            setUnlocked(true);
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.backLabel}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>👪 Réglages parentaux</Text>

      <Text style={[styles.label, { marginTop: 4 }]}>👤 Gérer les profils</Text>
      {profils.map((p) => (
        <View key={p.id} style={styles.profilManageBox}>
          {editingProfilId === p.id ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Prénom"
                value={editPrenom}
                onChangeText={setEditPrenom}
              />
              <View style={styles.row}>
                {NIVEAU_CHOICES.map((n) => (
                  <Pressable
                    key={n.value}
                    style={[styles.chip, editNiveau === n.value && styles.chipSelected]}
                    onPress={() => setEditNiveau(n.value)}
                  >
                    <Text style={[styles.chipText, editNiveau === n.value && styles.chipTextSelected]}>
                      {n.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={[styles.button, { flex: 1 }]} onPress={saveEditProfil}>
                  <Text style={styles.buttonText}>Enregistrer</Text>
                </Pressable>
                <Pressable style={[styles.button, { flex: 1, backgroundColor: colors.sand }]} onPress={() => setEditingProfilId(null)}>
                  <Text style={[styles.buttonText, { color: colors.ink }]}>Annuler</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {p.photo_url ? (
                  <Image source={{ uri: p.photo_url }} style={styles.avatarPhoto} />
                ) : (
                  <ProfilAvatarDisplay profil={p} size={32} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.profilManageName}>{p.prenom}</Text>
                  <Text style={styles.memoEmptyText}>
                    Niveau {p.niveau_global ?? 0} · {NIVEAU_CHOICES.find((n) => n.value === p.niveau_defaut)?.label ?? ''}
                  </Text>
                </View>
              </View>

              <Text style={styles.memoEmptyText}>⏱️ Temps de jeu autorisé par jour</Text>
              <View style={[styles.gaugeRow, { marginBottom: 10 }]}>
                <Pressable
                  style={styles.gaugeButton}
                  onPress={() => adjustProfilMinutes(p.id, -MINUTES_STEP)}
                >
                  <Text style={styles.gaugeButtonText}>−</Text>
                </Pressable>
                <View style={styles.gaugeTrack}>
                  <View
                    style={[
                      styles.gaugeFill,
                      { width: `${Math.min(100, (((p.minutes_max_jour ?? 30) - MINUTES_MIN) / (MINUTES_MAX - MINUTES_MIN)) * 100)}%` },
                    ]}
                  />
                </View>
                <Pressable
                  style={styles.gaugeButton}
                  onPress={() => adjustProfilMinutes(p.id, MINUTES_STEP)}
                >
                  <Text style={styles.gaugeButtonText}>+</Text>
                </Pressable>
              </View>
              <Text style={[styles.gaugeValue, { marginBottom: 10 }]}>
                {p.minutes_max_jour ?? 30} minutes par jour
              </Text>

              <View style={styles.profilManageActions}>
                <Pressable style={styles.profilActionBtn} onPress={() => startEditProfil(p)}>
                  <Text style={styles.profilActionText}>✏️ Modifier</Text>
                </Pressable>
                <Pressable style={styles.profilActionBtn} onPress={() => avancerProgression(p.id)}>
                  <Text style={styles.profilActionText}>▶️ Avancer</Text>
                </Pressable>
                <Pressable style={styles.profilActionBtn} onPress={() => adjustNiveauGlobal(p.id, -5)}>
                  <Text style={styles.profilActionText}>⬅️ Reculer</Text>
                </Pressable>
                <Pressable style={styles.profilActionBtn} onPress={() => resetProgressionJeux(p.id)}>
                  <Text style={styles.profilActionText}>🔄 Réinit. jeux</Text>
                </Pressable>
                <Pressable style={styles.profilActionBtn} onPress={() => toggleProgression(p.id)}>
                  <Text style={styles.profilActionText}>
                    {progressionOuverte === p.id ? '📊 Masquer' : '📊 Progression'}
                  </Text>
                </Pressable>
                <Pressable style={styles.profilActionBtn} onPress={() => deleteProfil(p.id, p.prenom)}>
                  <Text style={[styles.profilActionText, { color: colors.error }]}>🗑️ Suppr.</Text>
                </Pressable>
              </View>

              <Pressable
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: colors.mossSoft, borderRadius: 12, paddingVertical: 12, marginTop: 10,
                }}
                onPress={() => openSecurityAvatarEdit(p)}
              >
                <Text style={{ fontSize: 18 }}>🔒</Text>
                <Text style={{ fontWeight: '800', color: colors.mossDeep }}>Changer l'avatar secret de {p.prenom}</Text>
              </Pressable>

              {securityEditFor === p.id && (
                <View style={[styles.progressionPanel, { alignItems: 'center' }]}>
                  <Text style={[styles.memoEmptyText, { marginBottom: 8 }]}>
                    Avatar secret actuel : {p.avatar_securite ?? '(aucun)'} — choisis-en un nouveau :
                  </Text>
                  <View style={styles.avatarGrid}>
                    {securityChoices.map((a) => (
                      <Pressable key={a} style={styles.avatarTile} onPress={() => saveSecurityAvatar(a)}>
                        <Text style={{ fontSize: 22 }}>{a}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable style={{ marginTop: 8 }} onPress={() => setSecurityEditFor(null)}>
                    <Text style={{ color: colors.ink, opacity: 0.6 }}>Annuler</Text>
                  </Pressable>
                </View>
              )}

              {progressionOuverte === p.id && (
                <View style={styles.progressionPanel}>
                  {!progressionParProfil[p.id] ? (
                    <ActivityIndicator color={colors.mossDeep} />
                  ) : progressionParProfil[p.id].length === 0 ? (
                    <Text style={styles.memoEmptyText}>Ce profil n'a encore joué à aucun jeu.</Text>
                  ) : (
                    progressionParProfil[p.id].map((ligne) => (
                      <View key={ligne.code} style={styles.progressionRow}>
                        <Text style={styles.progressionIcon}>{ligne.icon}</Text>
                        <Text style={styles.progressionNom} numberOfLines={1}>{ligne.nom}</Text>
                        <View style={styles.progressionGauge}>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.progressionSegment,
                                i < ligne.note && styles.progressionSegmentFull,
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={styles.progressionNote}>{ligne.note}/10</Text>
                        <Pressable
                          style={styles.progressionAdjustBtn}
                          onPress={() => adjustGamePalier(p.id, ligne, -1)}
                        >
                          <Text style={styles.progressionAdjustText}>−</Text>
                        </Pressable>
                        <Pressable
                          style={styles.progressionAdjustBtn}
                          onPress={() => adjustGamePalier(p.id, ligne, 1)}
                        >
                          <Text style={styles.progressionAdjustText}>+</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </View>
      ))}

      <View style={styles.rewardForm}>
        <Text style={styles.helperText}>
          Le temps de jeu se règle maintenant individuellement pour chaque enfant, juste au-dessus
          dans "Gérer les profils".
        </Text>

        <Text style={[styles.label, { marginTop: 8 }]}>Code parent (4 chiffres)</Text>
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

        <Pressable style={[styles.button, { opacity: saving ? 0.5 : 1, marginTop: 8 }]} onPress={handleSaveTemps} disabled={saving}>
          <Text style={styles.buttonText}>
            {saving ? 'Enregistrement…' : saved ? '✓ Code enregistré' : 'Enregistrer le code'}
          </Text>
        </Pressable>

        <Text style={[styles.label, { marginTop: 24 }]}>🎙️ Mémos vocaux</Text>
        <Text style={[styles.label, { marginTop: 4 }]}>🎵 Musique d'ambiance</Text>
        <Text style={styles.helperText}>
          Joue doucement sur la carte et dans les sentiers, jamais pendant les jeux
          (pour laisser l'enfant se concentrer).
        </Text>
        <View style={styles.row}>
          {Object.entries(MUSIC_TRACKS).map(([key, track]) => (
            <Pressable
              key={key}
              style={[styles.chip, musiqueAmbiance === key && styles.chipSelected]}
              onPress={() => handleChooseMusique(key)}
            >
              <Text style={[styles.chipText, musiqueAmbiance === key && styles.chipTextSelected]}>
                {track.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {savingMusique && <Text style={styles.helperText}>Enregistrement…</Text>}
        {savedMusique && <Text style={styles.helperText}>✓ Musique enregistrée</Text>}

        <Text style={styles.helperText}>
          Attachez des fichiers audio déjà enregistrés (avec le dictaphone du téléphone,
          par exemple) pour que la voix d'un proche encourage l'enfant pendant les jeux.
          Ils ne remplacent jamais systématiquement les messages habituels.
        </Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Fréquence de déclenchement</Text>
        <View style={styles.row}>
          {FREQUENCE_CHOICES.map((f) => (
            <Pressable
              key={String(f.value)}
              style={[styles.chip, frequenceMemos === f.value && styles.chipSelected]}
              onPress={() => setFrequenceMemos(f.value)}
            >
              <Text style={[styles.chipText, frequenceMemos === f.value && styles.chipTextSelected]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.button, { opacity: savingMemos ? 0.5 : 1, backgroundColor: colors.sand, marginBottom: 8 }]}
          onPress={handleSaveMemosFrequence}
          disabled={savingMemos}
        >
          <Text style={[styles.buttonText, { color: colors.ink }]}>
            {savingMemos ? 'Enregistrement…' : savedMemos ? '✓ Fréquence enregistrée' : 'Enregistrer la fréquence'}
          </Text>
        </Pressable>

        {MEMO_CATEGORIES.map((cat) => (
          <View key={cat.key} style={styles.memoCategoryBox}>
            <Text style={styles.memoCategoryTitle}>{cat.label}</Text>
            {memos[cat.key].length === 0 ? (
              <Text style={styles.memoEmptyText}>Aucun mémo pour l'instant.</Text>
            ) : (
              memos[cat.key].map((m) => (
                <View key={m.id} style={styles.memoRow}>
                  <Pressable style={styles.memoPlayButton} onPress={() => playPreview(m.audio_url)}>
                    <Text style={{ fontSize: 14 }}>▶️</Text>
                  </Pressable>
                  <Text style={styles.memoRowText} numberOfLines={1}>
                    Mémo du {new Date(m.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                  <Pressable onPress={() => handleDeleteMemo(m.id)}>
                    <Text style={{ color: colors.error, fontWeight: '700' }}>Suppr.</Text>
                  </Pressable>
                </View>
              ))
            )}
            <Pressable
              style={[styles.addMemoButton, { opacity: addingMemo === cat.key ? 0.6 : 1 }]}
              onPress={() => handleAddMemo(cat.key)}
              disabled={addingMemo === cat.key}
            >
              <Text style={styles.addMemoButtonText}>
                {addingMemo === cat.key ? 'Ajout…' : '＋ Ajouter un fichier audio'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
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
    // L'app reste en portrait partout par defaut ; seul l'ecran de la
    // carte interactive passe temporairement en paysage (voir plus bas).
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

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
    <ExtraTimeProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="ProfileSelect" component={ProfileSelectScreen} />
            <Stack.Screen name="SecurityAvatarCheck" component={SecurityAvatarCheckScreen} />
            <Stack.Screen name="SecurityAvatarSetup" component={SecurityAvatarSetupScreen} />
            <Stack.Screen name="WorldMap" component={WorldMapScreen} />
            <Stack.Screen name="Continent" component={SentierScreen} />
            <Stack.Screen name="PontDesLettres" component={PontDesLettresScreen} />
            <Stack.Screen name="SonsMagiques" component={SonsMagiquesScreen} />
            <Stack.Screen name="PommesDeLuma" component={PommesDeLumaScreen} />
            <Stack.Screen name="MemoireEtoiles" component={MemoryScreen} />
            <Stack.Screen name="CoffreSouvenirs" component={CoffreSouvenirsScreen} />
            <Stack.Screen name="MondeCapitales" component={MondeCapitalesScreen} />
            <Stack.Screen name="JeuIntrus" component={JeuIntrusScreen} />
            <Stack.Screen name="EmpreintesClairiere" component={EmpreintesClairiereScreen} />
            <Stack.Screen name="BalancePrairie" component={BalancePrairieScreen} />
            <Stack.Screen name="MarcheVillage" component={MarcheVillageScreen} />
            <Stack.Screen name="CachettesLuma" component={CachettesLumaScreen} />
            <Stack.Screen name="RondeLucioles" component={RondeLuciolesScreen} />
            <Stack.Screen name="TriVillage" component={TriVillageScreen} />
            <Stack.Screen name="PuzzleMoulin" component={PuzzleMoulinScreen} />
            <Stack.Screen name="FriseTemps" component={FriseTempsScreen} />
            <Stack.Screen name="CorpsHumain" component={CorpsHumainScreen} />
            <Stack.Screen name="IndicesJardin" component={IndicesJardinScreen} />
            <Stack.Screen name="LabyrintheGrotte" component={LabyrintheGrotteScreen} />
            <Stack.Screen name="CheminDizaines" component={CheminDizainesScreen} />
            <Stack.Screen name="BarresLuma" component={BarresLumaScreen} />
            <Stack.Screen name="Recompenses" component={RecompensesScreen} />
            <Stack.Screen name="ReglagesParentaux" component={ReglagesParentauxScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </ExtraTimeProvider>
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
  scrollContainer: { flexGrow: 1, backgroundColor: colors.cream, padding: 18, paddingTop: 48, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: 24 },
  safetyCheckScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: 28,
  },
  safetyCheckTitle: { fontSize: 16, color: colors.ink, opacity: 0.7, textAlign: 'center', marginTop: 14 },
  safetyCheckQuestion: {
    fontSize: 22, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginTop: 6, marginBottom: 14,
  },
  safetyCheckButtons: { width: '100%', gap: 14, marginTop: 24 },
  safetyCheckBtnHard: {
    backgroundColor: '#FBE6DC', borderRadius: 20, paddingVertical: 18, alignItems: 'center',
    borderWidth: 2, borderColor: '#F5B79A',
  },
  safetyCheckBtnOk: {
    backgroundColor: colors.sand, borderRadius: 20, paddingVertical: 18, alignItems: 'center',
    borderWidth: 2, borderColor: colors.mossSoft,
  },
  safetyCheckEmoji: { fontSize: 34, marginBottom: 6 },
  safetyCheckBtnText: { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  streakRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 6 },
  streakStar: { fontSize: 20 },
  forcedPauseBanner: {
    backgroundColor: colors.sand, borderRadius: 14, padding: 12, marginBottom: 12, alignItems: 'center',
  },
  forcedPauseText: { color: colors.mossDeep, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: colors.mossDeep },
  back: { color: colors.mossDeep, fontWeight: '800', marginBottom: 16, fontSize: 34, paddingVertical: 4, paddingRight: 12 },
  backLabel: { color: colors.mossDeep, fontWeight: '700', marginBottom: 16, fontSize: 17, paddingVertical: 10, paddingRight: 12 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 14, marginBottom: 12, gap: 14 },
  avatarCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 28 },
  avatarPhoto: { width: 58, height: 58, borderRadius: 29 },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  photoPickerCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: colors.sand,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 6,
    overflow: 'hidden', borderWidth: 2, borderColor: colors.mossSoft,
  },
  photoPickerImage: { width: 84, height: 84, borderRadius: 42 },
  photoPickerHint: { textAlign: 'center', color: colors.ink, opacity: 0.6, fontSize: 12, marginBottom: 14 },
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
  avatarPickerSectionTitle: { fontWeight: '700', color: colors.ink, marginBottom: 8, marginTop: 4 },
  avatarTile: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarTileSelected: { borderColor: colors.gold, backgroundColor: colors.sand },
  cancelText: { textAlign: 'center', marginTop: 14, opacity: 0.6, fontWeight: '600' },

  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 26 },
  mapTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  mapAvatarPhoto: { width: 40, height: 40, borderRadius: 20 },
  celebrationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF3D6',
    borderRadius: 16, padding: 10, marginBottom: 10, borderWidth: 2, borderColor: '#F5D889',
  },
  celebrationText: { flex: 1, fontWeight: '700', color: colors.mossDeep },
  avatarInfoPhoto: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center' },
  recompenseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  recompensePhoto: { width: 44, height: 44, borderRadius: 10 },
  recompenseDetailPhoto: { width: 200, height: 200, borderRadius: 20 },
  cachettesCell: {
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  recompenseNom: { fontWeight: '800', color: colors.ink },
  recompenseFait: { fontSize: 12, color: colors.ink, opacity: 0.7, marginTop: 2 },
  mapAvatar: { fontSize: 44 },
  mapSubtitle: { fontSize: 13, opacity: 0.6 },
  continentCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 18, gap: 14,
    overflow: 'hidden', height: 148, borderWidth: 2, borderColor: 'rgba(0,0,0,0.05)',
  },
  continentEmoji: { fontSize: 44 },
  continentName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  continentSub: { fontSize: 13, color: colors.ink, opacity: 0.6, marginTop: 2 },
  continentPageTitle: {
    fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center',
  },
  continentTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14,
  },
  continentTitleListenBtn: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  continentBlob: {
    alignSelf: 'center', marginBottom: 8, borderRadius: 24,
    overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  mapCredit: { fontSize: 10, color: colors.ink, opacity: 0.35, textAlign: 'center', marginBottom: 14 },
  // La nouvelle carte est deja tres verticale (plus haute que 9/16), donc
  // plus besoin de cadre artificiel : on l'affiche a sa taille naturelle,
  // juste un peu retrecie pour laisser respirer la barre du haut.
  campagneMapBleed: { marginHorizontal: -6, marginBottom: 6, alignItems: 'center' },
  campagneMapBox: { width: '92%', aspectRatio: CAMPAGNE_MAP_ASPECT, overflow: 'hidden' },
  campagneMapInner: { width: '100%', height: '100%' },
  campagneMapImage: { width: '100%', height: '100%' },
  campagnePin: {
    position: 'absolute', width: 60, height: 60, marginLeft: -30, marginTop: -30,
    alignItems: 'center', justifyContent: 'center', borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.001)',
  },
  campagnePinEmoji: { fontSize: 1, opacity: 0 },
  // Grille des jeux sous l'illustration du theme - flux normal (pas de
  // positionnement absolu), autant de cartes que necessaire, l'ecran
  // defile s'il y en a beaucoup. Remplace l'ancien systeme de poses en %
  // sur l'image, source de chevauchements et de cartes coupees.
  gameGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 10, paddingHorizontal: 8, marginTop: 4,
  },
  barresLumaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderRadius: 16, padding: 12, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  barresLumaLabel: { fontSize: 20, fontWeight: '800', color: colors.ink, width: 24, textAlign: 'center' },
  balancePlateau: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)', minWidth: 110, minHeight: 90, justifyContent: 'center', gap: 4,
  },
  balancePlateauLabel: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 2 },
  balanceAssiette: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 999,
    width: 110, height: 70, borderWidth: 3, gap: 2, paddingHorizontal: 8,
  },
  dizainesBadge: {
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)',
  },
  dizainesBadgeText: { fontWeight: '800', fontSize: 15, color: colors.ink },
  gridCard: {
    width: 104, alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 8, paddingHorizontal: 6,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)', marginBottom: 4,
  },
  paysMarker: {
    position: 'absolute', width: 102, alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 6, paddingHorizontal: 6,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)', marginLeft: -51, marginTop: -36,
  },
  paysMarkerLocked: { opacity: 0.6 },
  paysMarkerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  paysMarkerIcon: { fontSize: 18 },
  paysMarkerText: { fontSize: 11, fontWeight: '800', color: colors.ink, textAlign: 'center', lineHeight: 13, marginTop: 2 },
  paysMarkerLock: { position: 'absolute', top: -6, right: -6, fontSize: 11 },
  paysMarkerNiveauBadge: {
    backgroundColor: colors.mossDeep, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
    borderWidth: 1, borderColor: '#fff',
  },
  paysMarkerNiveauText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  paysMarkerListenBtn: {
    marginTop: 3, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  paysVide: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6, marginLeft: -6, marginTop: -6,
    backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
    borderStyle: 'dashed',
  },
  gameCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 16, gap: 14 },
  gameIcon: { fontSize: 32 },
  gameName: { fontSize: 16, fontWeight: '700', color: colors.mossDeep },
  gameCompetence: { fontSize: 12, opacity: 0.6, textTransform: 'capitalize' },
  soon: { fontSize: 11, opacity: 0.5, fontStyle: 'italic' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  gameTitle: { fontSize: 16, fontWeight: '700', color: colors.mossDeep },
  roundLabel: { fontSize: 13, opacity: 0.6, fontWeight: '600' },
  prompt: { alignItems: 'center', marginBottom: 24 },
  gameScreenScroll: { flexGrow: 1, backgroundColor: colors.cream, padding: 18, paddingTop: 28, paddingBottom: 30 },
  promptZone: { alignItems: 'center', marginBottom: 14 },
  answerZone: {
    backgroundColor: '#fff', borderRadius: 22, padding: 16, marginTop: 8,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.06)',
  },
  answerZoneLabel: {
    fontSize: 12, fontWeight: '800', color: colors.mossDeep, opacity: 0.6,
    textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  icon: { fontSize: 56, marginBottom: 8 },
  listenButton: { backgroundColor: '#fff', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, marginBottom: 10 },
  listenText: { fontWeight: '700', color: colors.mossDeep },
  modelBox: {
    minWidth: 64, height: 64, paddingHorizontal: 12, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.gold, flexShrink: 0,
  },
  modelText: { fontSize: 26, fontWeight: '800', color: colors.mossDeep },
  slots: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  slot: {
    minWidth: 42, height: 48, borderBottomWidth: 4, borderBottomColor: colors.mossSoft,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, flexShrink: 0,
  },
  slotText: { fontSize: 20, fontWeight: '800', color: colors.mossDeep },
  feedback: { textAlign: 'center', fontWeight: '800', fontSize: 16, marginBottom: 12 },
  feedbackSuccess: { color: colors.success },
  feedbackError: { color: colors.error },
  stonesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  stone: {
    minWidth: 64, height: 64, paddingHorizontal: 16, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  stoneUsed: { backgroundColor: colors.mossSoft, opacity: 0.45, borderColor: 'transparent' },
  stoneText: { fontSize: 18, fontWeight: '800', color: colors.ink },
  stoneListenBtn: {
    position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center',
  },
  endEmoji: { fontSize: 48, marginBottom: 12 },
  endTitle: { fontSize: 22, fontWeight: '700', color: colors.mossDeep, marginBottom: 8 },
  endText: { fontSize: 15, opacity: 0.7, marginBottom: 24, textAlign: 'center' },
  rankUpBox: { backgroundColor: colors.gold, borderRadius: 18, padding: 16, marginBottom: 16, alignItems: 'center' },
  rankUpTitle: { fontWeight: '800', color: colors.ink, marginBottom: 6 },
  rankUpPhoto: { width: 200, height: 200, borderRadius: 24, marginBottom: 10, borderWidth: 3, borderColor: '#fff' },
  rankUpAvatar: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  rewardBox: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 2, borderColor: colors.gold },
  rewardTitle: { fontWeight: '800', color: colors.mossDeep, marginBottom: 6 },
  rewardText: { color: colors.ink, textAlign: 'center' },
  visualRow: { fontSize: 24, marginBottom: 10, textAlign: 'center', lineHeight: 34, paddingHorizontal: 4 },
  promptText: { fontSize: 17, fontWeight: '700', color: colors.mossDeep, textAlign: 'center', marginBottom: 10 },
  readingBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: colors.sand },
  readingText: { fontSize: 18, color: colors.ink, textAlign: 'center', lineHeight: 26 },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  memoryCard: {
    width: 78, height: 78, borderRadius: 14, backgroundColor: colors.mossSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  memoryCardFlipped: { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.gold },
  memoryEmoji: { fontSize: 32 },
  memoryWord: { fontSize: 13, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', paddingHorizontal: 4 },
  simonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 10 },
  simonTile: { width: 120, height: 120, borderRadius: 24 },
  simonTileActive: { transform: [{ scale: 1.05 }], shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  triPool: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 },
  triItem: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  triItemSelected: { borderColor: colors.gold, borderWidth: 3, backgroundColor: colors.gold + '33' },
  triItemText: { fontSize: 22, fontWeight: '700', color: colors.ink, paddingHorizontal: 4 },
  triCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  triCategoryBox: {
    minWidth: 120, paddingVertical: 20, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: colors.mossSoft, alignItems: 'center', justifyContent: 'center',
  },
  triCategoryText: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center' },
  triCategoryListenBtn: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  puzzleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 10 },
  puzzlePiece: {
    width: 64, height: 64, borderRadius: 14, backgroundColor: colors.sand,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  puzzlePieceDone: { backgroundColor: colors.success, borderColor: colors.success },
  puzzlePieceWrong: { backgroundColor: colors.error, borderColor: colors.error },
  puzzlePieceText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  friseTrack: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginVertical: 8 },
  friseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sand },
  friseDotDone: { backgroundColor: colors.mossSoft },
  friseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 10 },
  friseEvent: {
    width: 96, minHeight: 88, borderRadius: 16, backgroundColor: colors.mossDeep,
    alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4,
    borderWidth: 3, borderColor: colors.mossDeep,
  },
  friseEventDone: { backgroundColor: colors.success, borderColor: colors.success },
  friseEventWrong: { backgroundColor: colors.error, borderColor: colors.error },
  friseEventIcon: { fontSize: 26 },
  friseEventText: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },
  friseEventListenBtn: {
    position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center',
  },
  optionButton: {
    width: '46%', minHeight: 96, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  optionListenBtn: {
    position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center',
  },
  // Pour les grands emoji seuls (qui remplissent tout le centre de la case),
  // le micro en haut a droite chevauche souvent le dessin - on le decale
  // en bas a droite, ou l'emoji laisse generalement plus de place.
  optionListenBtnBas: { top: undefined, bottom: 6 },
  optionCorrect: { backgroundColor: colors.success, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.error, borderColor: colors.error },
  optionText: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  optionTextIcon: { fontSize: 44 },
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
  confettiContainer: {
    position: 'absolute', top: '30%', left: '50%', width: 1, height: 1, zIndex: 50,
  },
  confettiParticle: { position: 'absolute', fontSize: 26, left: -13, top: -13 },
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
  parentButtonSmall: {
    position: 'absolute', top: 48, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mossDeep,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  parentButtonInline: {
    alignSelf: 'center', marginTop: 16,
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mossDeep,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  parentButtonSmallText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  versionTag: { textAlign: 'center', fontSize: 11, color: colors.ink, opacity: 0.35, marginTop: 16 },
  profilManageBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  profilManageName: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  profilManageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profilActionBtn: {
    backgroundColor: colors.cream, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
  },
  profilActionText: { fontSize: 12, fontWeight: '700', color: colors.mossDeep },
  progressionPanel: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  progressionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  progressionIcon: { fontSize: 16, width: 20 },
  progressionNom: { fontSize: 12, color: colors.ink, width: 88 },
  progressionGauge: { flexDirection: 'row', gap: 2, flex: 1 },
  progressionSegment: { flex: 1, height: 10, borderRadius: 3, backgroundColor: colors.sand },
  progressionSegmentFull: { backgroundColor: colors.mossSoft },
  progressionNote: { fontSize: 11, fontWeight: '800', color: colors.mossDeep, width: 30, textAlign: 'right' },
  progressionAdjustBtn: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.sand,
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  progressionAdjustText: { fontSize: 15, fontWeight: '800', color: colors.ink },
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
  memoCategoryBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  memoCategoryTitle: { fontWeight: '800', color: colors.mossDeep, marginBottom: 8 },
  memoEmptyText: { color: colors.ink, opacity: 0.5, fontSize: 13, marginBottom: 8 },
  memoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  memoPlayButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sand,
    alignItems: 'center', justifyContent: 'center',
  },
  memoRowText: { flex: 1, color: colors.ink, fontSize: 13 },
  addMemoButton: {
    borderWidth: 2, borderColor: colors.mossSoft, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  addMemoButtonText: { color: colors.mossDeep, fontWeight: '700' },
  helperText: { fontSize: 12, opacity: 0.6, color: colors.ink, marginBottom: 10 },
  timeGaugeBox: { marginBottom: 14 },
  timeGaugeText: { fontSize: 12, fontWeight: '700', color: colors.mossDeep, marginBottom: 4 },
  blockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 2, borderColor: colors.error },
  blockedText: { color: colors.ink, fontWeight: '600', marginBottom: 6 },
  blockedLink: { color: colors.blue, fontWeight: '800' },
  gameCardLocked: { opacity: 0.5 },
  liveGaugeBox: { marginBottom: 14 },
  liveGaugeCompactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  gaugeTrackCompact: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#EEE', overflow: 'hidden' },
  liveGaugeTextCompact: { fontSize: 11, fontWeight: '800', color: colors.mossDeep },
  liveGaugeText: { fontSize: 13, fontWeight: '800', color: colors.mossDeep, textAlign: 'center', marginTop: 4 },
  timeUpBox: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 2, borderColor: colors.error },
  timeUpText: { color: colors.ink, fontWeight: '700', textAlign: 'center' },
});
