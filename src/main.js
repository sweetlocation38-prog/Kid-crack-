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
import React, { useCallback, useContext, useEffect, useRef, useState, createContext } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';

const CAMPAGNE_MAP_IMAGE = require('../assets/carte-campagne.jpg');
const CAMPAGNE_MAP_ASPECT = 760 / 1690;

// A mettre a jour a chaque envoi de code, pour verifier depuis l'app
// quelle version est vraiment installee sur le telephone.
const APP_BUILD_VERSION = '23/07/2026 - Bouton Continuer au lieu denchainement automatique, corrige lechec silencieux de mise a jour photo de profil';
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
    const blob = await response.blob();
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.warn('Erreur upload', error);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.warn('Erreur upload', e);
    return null;
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
  const url = await uploadFileToStorage('memos-vocaux', path, file.uri, file.mimeType || 'audio/mpeg');
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

async function computeNextRung({ profil, miniJeuId, currentRung, erreursTotal, tempsMoyenParManche, maxRung }) {
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
  let newStreak = 0;
  let newRung = currentRung;
  let newReference = reference;
  let newEchecs = 0;

  // La vitesse n'est plus un critere qui bloque la montee de niveau : plus
  // le niveau grimpe, plus le contenu est difficile, donc plus il est normal
  // de repondre plus lentement meme en etant juste. Seul le zero faute compte.
  // Le temps de reference reste suivi (utile ailleurs), mais ne conditionne
  // plus jamais la progression.
  let raison;
  if (erreursTotal === 0) {
    // Session parfaite : la remontee s'accelere, quel que soit le temps mis.
    newStreak = oldStreak + 1;
    const jump = Math.min(3, newStreak);
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
      newRung = Math.max(1, currentRung - 1);
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
    newRung = currentRung;
    raison = 'erreurs_quelques';
  }

  const direction = newRung > currentRung ? 'up' : newRung < currentRung ? 'down' : 'same';
  return { newRung, newStreak, newReference, newEchecs, rungChanged: newRung !== currentRung, direction, raison };
}

async function completeSession({ profil, miniJeuId, currentRung, erreursTotal, dureeSecondes, totalRounds, startedAt, tempsMoyenParManche, maxRung }) {
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
  try {
    const result = await computeNextRung({
      profil, miniJeuId, currentRung, erreursTotal, tempsMoyenParManche, maxRung,
    });
    newRung = result.newRung;
    newStreak = result.newStreak;
    newReference = result.newReference;
    newEchecs = result.newEchecs;
    rungChanged = result.rungChanged;
    direction = result.direction;
    raison = result.raison;
  } catch (e) {
    // On garde le cran actuel si le calcul echoue.
  }

  try {
    await supabase
      .from('progression')
      .upsert(
        {
          profil_id: profil.id,
          mini_jeu_id: miniJeuId,
          palier_actuel: newRung,
          details: { streak: newStreak },
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
const MAX_CONTENT_RUNG = 18;

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

// Petite fenetre pour choisir un avatar du jeu (utilisee a la creation
// et pour changer la photo d'un profil existant).
function AvatarPickerModal({ visible, onClose, onPick }) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choisir un avatar</Text>
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
function ProfileSelectScreen({ navigation }) {
  const [profils, setProfils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familleId, setFamilleId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [avatarPickerFor, setAvatarPickerFor] = useState(null);

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
    // On ajoute un suffixe different a chaque fois (au lieu d'un nom de
    // fichier toujours identique) pour eviter tout souci de remplacement
    // silencieux d'une photo par une autre.
    const url = await uploadFileToStorage('profil-photos', `${profilId}-${Date.now()}.jpg`, choix, 'image/jpeg');
    if (url) {
      await supabase.from('profils_enfants').update({ photo_url: url }).eq('id', profilId);
      await loadProfils();
    } else {
      Alert.alert('Photo non enregistrée', "La photo n'a pas pu être envoyée. Vérifiez la connexion internet et réessayez.");
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
      {familleId && (
        <Pressable
          style={styles.parentButtonSmall}
          onPress={() => navigation.navigate('ReglagesParentaux', { familleId })}
        >
          <Text style={styles.parentButtonSmallText}>P</Text>
        </Pressable>
      )}

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
            <Pressable
              style={styles.avatarCircle}
              onPress={() => handleEditPhoto(item.id)}
            >
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.avatarPhoto} />
              ) : (
                <Text style={styles.avatarEmoji}>{item.avatar_personnel ?? '🐾'}</Text>
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
    if (!familleId || !prenom.trim()) return;
    setSaving(true);
    const { data: inserted } = await supabase
      .from('profils_enfants')
      .insert({
        famille_id: familleId,
        prenom: prenom.trim(),
        niveau_defaut: niveau,
        avatar_personnel: avatar,
        niveau_global: 0,
      })
      .select('id')
      .single();

    if (inserted && photoUri) {
      const url = await uploadFileToStorage(
        'profil-photos', `${inserted.id}-${Date.now()}.jpg`, photoUri, 'image/jpeg'
      );
      if (url) {
        await supabase.from('profils_enfants').update({ photo_url: url }).eq('id', inserted.id);
      } else {
        Alert.alert('Photo non enregistrée', "Le profil est bien créé, mais la photo n'a pas pu être envoyée. Vous pourrez réessayer depuis l'écran des profils.");
      }
    }

    setSaving(false);
    setPrenom('');
    setPhotoUri(null);
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
};

// Plafond de progression (en "crans") pour chaque jeu — sert a afficher une
// jauge de 0 a 10 fidele a l'avancement reel de l'enfant sur CE jeu precis.
const GAME_MAX_RUNG_15 = new Set([
  'monde_capitales', 'jeu_intrus', 'empreintes_clairiere', 'balance_prairie',
  'marche_village', 'cachettes_luma', 'ronde_lucioles', 'tri_village', 'puzzle_moulin',
]);
function maxRungForGame(code) {
  return GAME_MAX_RUNG_15.has(code) ? rungFromGradeAndPalier('ce2', 3) : MAX_CONTENT_RUNG;
}

// ============================================================
// Les 7 continents — un univers thematique par competence, pour
// naviguer en 2 clics : continent, puis jeu (pays).
// ============================================================
const CONTINENTS = [
  {
    competence: 'lecture',
    zone: { left: 0.5, top: 0.60, width: 0.5, height: 0.25 },
    labelCourt: 'Lecture',
    paysSlotsFor: { 'pont_des_lettres': { top: '63%', left: '17%' }, 'sons_magiques': { top: '63%', left: '50%' } },
    paysVides: [{ top: '30%', left: '65%' }, { top: '60%', left: '20%' }],
    blobStyle: { borderTopLeftRadius: 120, borderTopRightRadius: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 140 }, rot: -3,
    nom: 'La Clairière des Histoires',
    emoji: '🏞️',
    bg: '#E4F3DA',
    bgVif: '#BFE3A8',
    decor: [
      { emoji: '🦋', top: 90, left: '15%', duration: 3600, vertical: true },
      { emoji: '🦋', top: 110, left: '65%', duration: 3200, delay: 400, vertical: true },
      { emoji: '🐝', top: 30, left: '25%', duration: 2600 },
      { emoji: '🌸', top: 50, left: '75%', duration: 5000, vertical: true },
      { emoji: '🍃', top: 70, left: '45%', duration: 5000 },
    ],
  },
  {
    competence: 'maths',
    zone: { left: 0.5, top: 0.30, width: 0.5, height: 0.30 },
    labelCourt: 'Maths',
    paysSlotsFor: { 'pommes_de_luma': { top: '38%', left: '17%' }, 'balance_prairie': { top: '38%', left: '83%' }, 'marche_village': { top: '63%', left: '17%' }, 'cachettes_luma': { top: '63%', left: '83%' } },
    paysVides: [],
    blobStyle: { borderTopLeftRadius: 20, borderTopRightRadius: 110, borderBottomLeftRadius: 130, borderBottomRightRadius: 30 }, rot: 2,
    nom: 'Le Bois des Nombres',
    emoji: '🌲',
    bg: '#E8DCC8',
    bgVif: '#C9A876',
    decor: [
      { emoji: '🐿️', top: 40, left: '20%', duration: 3400 },
      { emoji: '🍂', top: 70, left: '65%', duration: 5200, vertical: true },
      { emoji: '🦔', top: 115, left: '45%', duration: 3800 },
      { emoji: '🌰', top: 55, left: '30%', duration: 4400, vertical: true },
    ],
  },
  {
    competence: 'logique',
    zone: { left: 0.0, top: 0.60, width: 0.5, height: 0.25 },
    labelCourt: 'Logique',
    paysSlotsFor: { 'jeu_intrus': { top: '63%', left: '17%' }, 'empreintes_clairiere': { top: '63%', left: '83%' }, 'puzzle_moulin': { top: '88%', left: '17%' }, 'tri_village': { top: '88%', left: '50%' } },
    paysVides: [],
    blobStyle: { borderTopLeftRadius: 90, borderTopRightRadius: 20, borderBottomLeftRadius: 100, borderBottomRightRadius: 90 }, rot: -5,
    nom: 'La Grotte des Énigmes',
    emoji: '🌲',
    bg: '#DCD3E8',
    bgVif: '#A896C4',
    decor: [
      { emoji: '💎', top: 40, left: '50%', duration: 4200, vertical: true },
      { emoji: '💎', top: 95, left: '20%', duration: 4600, vertical: true },
      { emoji: '🦇', top: 30, left: '70%', duration: 2600 },
      { emoji: '🕷️', top: 120, left: '40%', duration: 3600, vertical: true },
    ],
  },
  {
    competence: 'memoire',
    zone: { left: 0.5, top: 0.0, width: 0.5, height: 0.30 },
    labelCourt: 'Mémoire',
    paysSlotsFor: { 'memoire_etoiles': { top: '63%', left: '17%' }, 'coffre_souvenirs': { top: '63%', left: '83%' }, 'ronde_lucioles': { top: '88%', left: '17%' } },
    paysVides: [{ top: '70%', left: '20%' }],
    blobStyle: { borderTopLeftRadius: 100, borderTopRightRadius: 100, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }, rot: 4,
    nom: 'La Cabane aux Souvenirs',
    emoji: '🏡',
    bg: '#F5E1C8',
    bgVif: '#E0B888',
    decor: [
      { emoji: '🕯️', top: 30, left: '20%', duration: 2200, vertical: true },
      { emoji: '📖', top: 20, left: '60%', duration: 4600 },
      { emoji: '🧸', top: 115, left: '35%', duration: 3800 },
      { emoji: '🫙', top: 55, left: '80%', duration: 5200, vertical: true },
    ],
  },
  {
    competence: 'geographie',
    zone: { left: 0.0, top: 0.0, width: 0.5, height: 0.335 },
    labelCourt: 'Géographie',
    paysSlotsFor: { 'monde_capitales': { top: '63%', left: '17%' } },
    paysVides: [{ top: '40%', left: '25%' }, { top: '55%', left: '65%' }, { top: '30%', left: '70%' }],
    blobStyle: { borderTopLeftRadius: 110, borderTopRightRadius: 130, borderBottomLeftRadius: 110, borderBottomRightRadius: 90 }, rot: -2,
    nom: 'La Rivière du Monde',
    emoji: '🌊',
    bg: '#DFF1FB',
    bgVif: '#A6D9F2',
    decor: [
      { emoji: '🐟', top: 45, left: '55%', duration: 3200 },
      { emoji: '🐸', top: 100, left: '20%', duration: 3400, vertical: true },
      { emoji: '🦆', top: 110, left: '70%', duration: 3800 },
      { emoji: '💧', top: 60, left: '15%', duration: 2400, vertical: true },
    ],
  },
  {
    competence: 'histoire',
    zone: { left: 0.12, top: 0.85, width: 0.66, height: 0.15 },
    labelCourt: 'Histoire',
    paysSlotsFor: { 'frise_temps': { top: '63%', left: '17%' } },
    paysVides: [],
    blobStyle: { borderTopLeftRadius: 40, borderTopRightRadius: 140, borderBottomLeftRadius: 120, borderBottomRightRadius: 30 }, rot: 3,
    nom: 'Le Vieux Chêne du Temps',
    emoji: '🌳',
    bg: '#F0DFC0',
    bgVif: '#D4A868',
    decor: [
      { emoji: '🍁', top: 25, left: '75%', duration: 5200, vertical: true },
      { emoji: '🐿️', top: 115, left: '25%', duration: 3600 },
      { emoji: '🍂', top: 120, left: '55%', duration: 4600, vertical: true },
      { emoji: '🪱', top: 100, left: '10%', duration: 3200 },
    ],
  },
  {
    competence: 'sciences',
    zone: { left: 0.0, top: 0.335, width: 0.5, height: 0.265 },
    labelCourt: 'Sciences',
    paysSlotsFor: { 'corps_humain': { top: '63%', left: '17%' } },
    paysVides: [{ top: '35%', left: '25%' }, { top: '75%', left: '70%' }, { top: '30%', left: '70%' }],
    blobStyle: { borderTopLeftRadius: 130, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 120 }, rot: -4,
    nom: 'Le Jardin Vivant',
    emoji: '🌿',
    bg: '#E6F3DE',
    bgVif: '#B4DE9B',
    decor: [
      { emoji: '🐞', top: 40, left: '70%', duration: 3400 },
      { emoji: '🦋', top: 120, left: '30%', duration: 3600, vertical: true },
      { emoji: '🌻', top: 105, left: '55%', duration: 4800, vertical: true },
      { emoji: '🐝', top: 60, left: '20%', duration: 2600 },
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
            <Text style={{ fontSize: 48, textAlign: 'center' }}>{profil.avatar_personnel ?? '🐾'}</Text>
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
                <View key={a.code} style={styles.recompenseRow}>
                  <Text style={{ fontSize: 30 }}>{a.emoji}</Text>
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
                </View>
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
            <Text style={{ fontSize: 34 }}>{profil.avatar_personnel ?? '🐾'}</Text>
          )}
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
function computeZoomStyle(zone, containerWidth) {
  const imageWidth = containerWidth / zone.width;
  const imageHeight = imageWidth / CAMPAGNE_MAP_ASPECT;
  const containerHeight = imageHeight * zone.height;
  const imageLeft = -zone.left * imageWidth;
  const imageTop = -zone.top * imageHeight;
  return { containerHeight, imageWidth, imageHeight, imageLeft, imageTop };
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
  const zoom = computeZoomStyle(continent.zone, containerWidth);
  const [miniJeux, setMiniJeux] = useState([]);
  const [niveauxParJeu, setNiveauxParJeu] = useState({}); // mini_jeu_id -> cran actuel
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

      <View style={[styles.continentBlob, { width: containerWidth, height: zoom.containerHeight }]}>
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
        {miniJeux.map((item, index) => {
          const slot = continent.paysSlotsFor[item.code];
          if (!slot) return null; // position pas encore definie pour ce jeu
          const targetScreen = GAME_SCREENS[item.code];
          const forme = MARKER_SHAPES[index % MARKER_SHAPES.length];
          return (
            <Pressable
              key={item.id}
              style={[
                styles.paysMarker,
                forme,
                { top: slot.top, left: slot.left },
                limitReached && targetScreen && styles.paysMarkerLocked,
              ]}
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
              <Pressable
                style={styles.paysMarkerListenBtn}
                onPress={() => speakSmart(item.nom)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 11 }}>🎤</Text>
              </Pressable>
              {!targetScreen && <Text style={styles.paysMarkerLock}>🔒</Text>}
              {limitReached && targetScreen && <Text style={styles.paysMarkerLock}>🔒</Text>}
            </Pressable>
          );
        })}
        {continent.paysVides.map((slot, i) => (
          <View key={`vide-${i}`} style={[styles.paysVide, { top: slot.top, left: slot.left, transform: [{ rotate: `${-continent.rot}deg` }] }]} />
        ))}
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
    speakSmart(text);
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

    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextLevel() {
    const newRung = pendingNextRung.current;
    setTransitioning(null);
    errorsTotal.current = 0;
    startedAt.current = Date.now();
    setRung(newRung);
    setRound(1);
    const { niveau, palier } = gradeAndPalierFromRung(newRung);
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
        maybeSpeakMidSessionEncouragement(round);
        setTimeout(async () => {
          if (round >= TOTAL_ROUNDS) {
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
      maybePlayMemo(memosConfig.current, 'mauvaise_reponse');
      setTimeout(() => setFeedback(null), 500);
    }
  }

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} />;
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
        <Pressable style={{ marginTop: 14 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.ink, opacity: 0.6, fontWeight: '600' }}>‹ Retour à la carte</Text>
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
        <Text style={styles.gameTitle}>🌉 Le Pont des Lettres</Text>
        <Text style={styles.roundLabel}>{round}/{TOTAL_ROUNDS}</Text>
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

function SessionEndScreen({ profil, summary, navigation, timeUp }) {
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
    };
    const message = summary?.raison ? messages[summary.raison] : null;
    if (message) speakSmart(message);

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
            <Text style={styles.listenText}>🎤 Écouter</Text>
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
function ChoiceGameScreen({ route, navigation, jeuCode, jeuTitre, buildPrompt, Character, maxRung }) {
  useEffect(() => { stopBgMusic(); }, []); // pas de musique pendant les jeux, pour la concentration

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
  const shownIds = useRef(new Set());
  const startedAt = useRef(Date.now());
  const memosConfig = useRef(null);
  // Garde-fou contre les reponses au hasard.
  const roundStartedAt = useRef(Date.now());
  const recentRounds = useRef([]); // fenetre glissante des 4 dernieres manches
  const attentionChosenOnce = useRef(false);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [forcedPause, setForcedPause] = useState(false);
  // Petit repere visuel discret : nombre de bonnes reponses d'affilee sans
  // erreur dans la session en cours (remis a zero a la moindre erreur).
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
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
    errorsThisRound.current = 0;

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
    const prompt = buildPrompt(pick.donnees);
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

      const rawStartRung = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      const startRung = maxRung ? Math.min(rawStartRung, maxRung) : rawStartRung;
      setRung(startRung);
      const { niveau, palier: palierValue } = gradeAndPalierFromRung(startRung);
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

    setSessionSummary(summary);
    setSessionDone(true);
  }

  function proceedToNextLevel() {
    const newRung = pendingNextRung.current;
    setTransitioning(null);
    errorsTotal.current = 0;
    recentRounds.current = [];
    attentionChosenOnce.current = false;
    setPerfectStreak(0);
    startedAt.current = Date.now();
    setRung(newRung);
    setRound(1);
    const { niveau, palier } = gradeAndPalierFromRung(newRung);
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
          const { niveau, palier } = gradeAndPalierFromRung(rung);
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
      } else {
        setTimeout(() => {
          setFeedback(null);
          setAnswered(null);
        }, 700);
      }
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
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} />;
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
        <Pressable style={{ marginTop: 14 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.ink, opacity: 0.6, fontWeight: '600' }}>‹ Retour à la carte</Text>
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

  return (
    <ScrollView contentContainerStyle={[styles.gameScreenScroll, { backgroundColor: themeBgForGame(jeuCode) }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.gameTitle}>{jeuTitre}</Text>
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
        {promptData.visual ? <Text style={styles.visualRow}>{promptData.visual}</Text> : null}
        {promptData.applesCount != null ? (
          <View style={{ marginBottom: 10 }}>
            <ModernAppleRow count={promptData.applesCount} color="#E5533D" size={30} />
          </View>
        ) : null}
        {promptData.applesSplit ? (
          <View style={{ flexDirection: 'row', gap: 18, justifyContent: 'center', marginBottom: 10 }}>
            <ModernAppleRow count={promptData.applesSplit[0]} color="#E5533D" size={28} />
            <ModernAppleRow count={promptData.applesSplit[1]} color="#7CB342" size={28} />
          </View>
        ) : null}
        {promptData.applesCompare ? (
          <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
            <ModernAppleRow count={promptData.applesCompare[0]} color="#E5533D" size={26} />
            <Text style={{ fontWeight: '800', color: colors.mossDeep }}>VS</Text>
            <ModernAppleRow count={promptData.applesCompare[1]} color="#4FA8DB" size={26} />
          </View>
        ) : null}
        {promptData.texteAffiche ? (
          <View style={styles.readingBox}>
            <Text style={styles.readingText}>{promptData.texteAffiche}</Text>
          </View>
        ) : null}
        <Text style={styles.promptText}>{promptData.promptText}</Text>
        {promptData.speak ? (
          <Pressable style={styles.listenButton} onPress={() => speak(promptData.speak)}>
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

      <View style={styles.answerZone}>
        <Text style={styles.answerZoneLabel}>Ta réponse</Text>
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
                hitSlop={14}
                style={[
                  styles.optionButton,
                  { backgroundColor: bg },
                  isAnswered && isThisCorrect && styles.optionCorrect,
                  isAnswered && isThisAnswer && !isThisCorrect && styles.optionWrong,
                ]}
              >
                <Text style={styles.optionText} numberOfLines={2} adjustsFontSizeToFit>
                  {String(option)}
                </Text>
                <Pressable
                  style={styles.optionListenBtn}
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
        applesCount: d.cible,
        promptText: 'Combien de pommes vois-tu ?',
        speak: 'Combien de pommes vois-tu ?',
        mandatorySpeak: false, // les pommes sont visibles a l'ecran
        options: d.options,
        correct: d.cible,
      };
    case 'chiffre':
      return {
        applesCount: d.cible,
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
        applesSplit: [a, b],
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
    case 'comparer':
      return {
        applesCompare: [d.gauche, d.droite],
        promptText: 'Le groupe de gauche a-t-il plus, moins ou autant que celui de droite ?',
        speak: 'Le groupe de gauche a-t-il plus, moins ou autant que celui de droite ?',
        mandatorySpeak: false, // les groupes de pommes sont visibles
        options: ['plus', 'moins', 'autant'],
        correct: d.reponse,
      };
    default:
      return { promptText: '...', options: [], correct: null };
  }
}

// ============================================================
// Le Monde en Capitales — geographie (drapeaux, pays, capitales)
// ============================================================
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
    case 'drapeau_capitale':
      return {
        icon: d.drapeau,
        promptText: 'Quelle est la capitale de ce pays ?',
        speak: 'Quelle est la capitale de ce pays ?',
        mandatorySpeak: false,
        options: d.options,
        correct: d.reponse,
      };
    default:
      return { promptText: '...', options: [], correct: null };
  }
}

function MondeCapitalesScreen({ route, navigation }) {
  return (
    <ChoiceGameScreen
      route={route}
      navigation={navigation}
      jeuCode="monde_capitales"
      Character={Noisette}
      jeuTitre="🌍 Le Monde en Capitales"
      buildPrompt={buildGeoPrompt}
      maxRung={MAX_CONTENT_RUNG}
    />
  );
}

// ============================================================
// Le Jeu des Intrus — logique (reperer l'element qui ne va pas)
// ============================================================
function buildIntrusPrompt(d) {
  return {
    promptText: "Trouve l'intrus !",
    speak: "Trouve l'intrus, celui qui ne va pas avec les autres.",
    mandatorySpeak: false,
    options: d.items,
    correct: d.intrus,
  };
}

function JeuIntrusScreen({ route, navigation }) {
  return (
    <ChoiceGameScreen
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
    <ChoiceGameScreen
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
// ============================================================
function buildEquilibrePrompt(d) {
  return {
    visual: `⚖️  ${d.gauche}   VS   ${d.droit_connu} + ?`,
    promptText: "Combien faut-il ajouter a droite pour equilibrer la balance ?",
    speak: `Combien faut-il ajouter pour équilibrer la balance ?`,
    mandatorySpeak: false,
    options: d.options,
    correct: d.manque,
  };
}

function BalancePrairieScreen({ route, navigation }) {
  return (
    <ChoiceGameScreen
      route={route}
      navigation={navigation}
      jeuCode="balance_prairie"
      Character={Luma}
      jeuTitre="⚖️ La Balance de la Prairie"
      buildPrompt={buildEquilibrePrompt}
      maxRung={MAX_CONTENT_RUNG}
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
    <ChoiceGameScreen
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
// ============================================================
function buildGrillePrompt(d) {
  const question = d.question === 'colonne'
    ? "À quelle colonne se trouve l'étoile (en partant de la gauche) ?"
    : "À quelle ligne se trouve l'étoile (en partant du haut) ?";
  return {
    texteAffiche: d.grille,
    promptText: question,
    speak: question,
    mandatorySpeak: false,
    options: d.options,
    correct: d.reponse,
  };
}

function CachettesLumaScreen({ route, navigation }) {
  return (
    <ChoiceGameScreen
      route={route}
      navigation={navigation}
      jeuCode="cachettes_luma"
      Character={Luma}
      jeuTitre="🗺️ Les Cachettes de Luma"
      buildPrompt={buildGrillePrompt}
      maxRung={MAX_CONTENT_RUNG}
    />
  );
}

// ============================================================
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

function CorpsHumainScreen({ route, navigation }) {
  return (
    <ChoiceGameScreen
      route={route}
      navigation={navigation}
      jeuCode="corps_humain"
      Character={Maestro}
      jeuTitre="🫀 Le Corps Humain"
      buildPrompt={buildCorpsHumainPrompt}
      maxRung={rungFromGradeAndPalier('ce2', 3)}
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
  };
}

function RondeLuciolesScreen({ route, navigation }) {
  return (
    <ChoiceGameScreen
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
  const gameMaxRung = rungFromGradeAndPalier('ce2', 3);

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

      const rawStart = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      const startRung = Math.min(rawStart, gameMaxRung);
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
        setCategories(pick.donnees.categories);
        setPool(shuffle(pick.donnees.items.map((it, i) => ({ ...it, key: i }))));
        setTotalItems(pick.donnees.items.length);
        speakSmart('Range chaque objet dans la bonne case !');
      }
      setLoading(false);
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
      totalRounds: totalItems,
      startedAt: startedAt.current,
      maxRung: gameMaxRung,
    });
    setSessionSummary(summary);
    setSessionDone(true);
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
        setTimeout(finishSession, 400);
      }
    } else {
      errorsTotal.current += 1;
      setSelected(null);
    }
  }

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} />;
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
        <Text style={styles.gameTitle}>🗂️ Le Tri du Village</Text>
        <Text style={styles.roundLabel}>{placedCount}/{totalItems}</Text>
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
  const gameMaxRung = rungFromGradeAndPalier('ce2', 3);

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
      const { palier } = gradeAndPalierFromRung(startRung);
      const n = targetPiecesForPalier(palier);
      totalPieces.current = n;
      setPieces(shuffle(Array.from({ length: n }, (_, i) => i + 1)));
      speakSmart("Touche les pièces dans l'ordre, du numéro 1 au dernier !");
      setLoading(false);
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
      totalRounds: totalPieces.current,
      startedAt: startedAt.current,
      maxRung: gameMaxRung,
    });
    setSessionSummary(summary);
    setSessionDone(true);
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
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} />;
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
  const gameMaxRung = rungFromGradeAndPalier('ce2', 3);

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

      const rawStart = prog?.palier_actuel ?? rungFromGradeAndPalier(profil.niveau_defaut, 1);
      const startRung = Math.min(rawStart, gameMaxRung);
      setRung(startRung);
      const { niveau, palier } = gradeAndPalierFromRung(startRung);

      const { data: rows } = await supabase
        .from('contenu_mini_jeu')
        .select('donnees')
        .eq('mini_jeu_id', jeu.id)
        .eq('niveau', niveau)
        .eq('palier', palier)
        .eq('actif', true);

      const pool = rows ?? [];
      const pick = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
      const evts = pick?.donnees?.evenements ?? [];
      const sorted = [...evts].sort((a, b) => a.annee - b.annee).map((e) => e.nom);
      setCorrectOrder(sorted);
      setEvenements(shuffle(evts));
      speakSmart("Touche les événements dans l'ordre, du plus ancien au plus récent !");
      setLoading(false);
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
      totalRounds: evenements.length,
      startedAt: startedAt.current,
      maxRung: gameMaxRung,
    });
    setSessionSummary(summary);
    setSessionDone(true);
  }

  function onEventPress(nom) {
    if (nom === correctOrder[nextExpectedIndex]) {
      const isLast = nextExpectedIndex === correctOrder.length - 1;
      setNextExpectedIndex((i) => i + 1);
      if (isLast) setTimeout(finishSession, 500);
    } else {
      errorsTotal.current += 1;
      setWrongFlash(nom);
      setTimeout(() => setWrongFlash(null), 400);
    }
  }

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} />;
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
        <Text style={styles.gameTitle}>📜 La Frise du Temps</Text>
        <Text style={styles.roundLabel}>{progress}/{correctOrder.length}</Text>
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
    const summary = await completeSession({
      profil, miniJeuId, currentRung: rung,
      erreursTotal: errorsTotal.current,
      dureeSecondes: durationSeconds,
      totalRounds: 1,
      startedAt: startedAt.current,
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

  if (sessionDone) {
    return <SessionEndScreen profil={profil} summary={sessionSummary} navigation={navigation} timeUp={false} />;
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
          return { code: jeu.code, nom: jeu.nom, icon: GAME_ICONS[jeu.code] ?? '🎲', note };
        })
        .filter(Boolean)
        .sort((a, b) => a.nom.localeCompare(b.nom));
      setProgressionParProfil((prev) => ({ ...prev, [profilId]: lignes }));
    }
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
                  <Text style={{ fontSize: 32 }}>{p.avatar_personnel ?? '🐾'}</Text>
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

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  gameTitle: { fontSize: 16, fontWeight: '700', color: colors.mossDeep },
  roundLabel: { fontSize: 13, opacity: 0.6, fontWeight: '600' },
  prompt: { alignItems: 'center', marginBottom: 24 },
  gameScreenScroll: { flexGrow: 1, backgroundColor: colors.cream, padding: 18, paddingTop: 48, paddingBottom: 40 },
  promptZone: { alignItems: 'center', marginBottom: 20 },
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
  slots: { flexDirection: 'row', gap: 8, flexWrap: 'nowrap', justifyContent: 'center' },
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
  rankUpAvatar: { fontSize: 22, fontWeight: '700', color: colors.ink },
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
  friseTrack: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 8 },
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
    width: '46%', minHeight: 110, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  optionListenBtn: {
    position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center',
  },
  optionCorrect: { backgroundColor: colors.success, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.error, borderColor: colors.error },
  optionText: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
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
