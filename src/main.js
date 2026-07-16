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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Speech from 'expo-speech';
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

// ============================================================
// Chaine d'avatar de jeu (100 echelons, un tous les 10 niveaux)
// ============================================================
const AVATAR_CHAIN = [
  '🐜 Fourmi','🐞 Coccinelle','🦋 Papillon','🐝 Abeille','🐌 Escargot','🐛 Ver luisant','🦗 Sauterelle','🪰 Libellule','🪲 Scarabee','🦗 Grillon',
  '🐭 Souris','🐭 Mulot','🐁 Musaraigne','🐸 Grenouille','🐸 Crapaud','🦎 Lezard','🐸 Tetard','🐹 Campagnol','🐛 Chenille','🦗 Criquet',
  '🦔 Herisson','🐹 Taupe','🐿️ Ecureuil','🐿️ Tamia','🦇 Chauve-souris','🦡 Belette','🦡 Furet','🦡 Putois','🐀 Rat des champs','🐭 Loir',
  '🐦 Geai','🐦‍⬛ Pie','🐦‍⬛ Corbeau','🦅 Faucon crecerelle','🦉 Chouette','🦩 Heron','🦢 Cigogne','🐦 Pelican','🦜 Perruche','🦜 Toucan',
  '🦡 Martre','🦡 Fouine','🦡 Mangouste','🦫 Suricate','🦡 Blaireau','🐆 Genette','🐺 Chacal','🦫 Ragondin','🦦 Loutre','🐆 Ocelot',
  '🦌 Gazelle','🦌 Impala','🦌 Antilope','🦌 Springbok','🦓 Zebre','🐃 Gnou','🦩 Autruche','🐗 Phacochere','🐗 Sanglier','🐐 Chevre de montagne',
  '🐇 Lievre','🦊 Renard des neiges','🐺 Coyote','🐈 Lynx','🐈 Caracal','🐈‍⬛ Chat sauvage','🐆 Guepard','🐺 Loup','🐆 Puma','🐆 Panthere',
  '🦌 Cerf','🦌 Elan','🦌 Wapiti','🦬 Bison','🐃 Buffle d\'Afrique','🦛 Hippopotame','🐫 Chameau','🐂 Yack','🦒 Girafe','🦏 Rhinoceros noir',
  '🐻 Ours brun','🐻 Ours noir','🦍 Gorille','🐒 Chimpanze','🐆 Jaguar','🐆 Leopard','🐅 Tigre du Bengale','🐊 Crocodile du Nil','🐍 Python','🦅 Aigle royal',
  '🐻‍❄️ Ours polaire','🦏 Rhinoceros blanc','🦍 Gorille des montagnes','🐘 Elephant de foret','🐘 Elephant de savane','🐆 Panthere des neiges','🐅 Tigre de Siberie','🐻 Grizzly geant','🦁 Lionne','🦁 Lion',
];

function avatarRankFor(niveauGlobal) {
  return Math.min(100, Math.max(1, Math.floor((niveauGlobal ?? 0) / 10) + 1));
}

function avatarLabelFor(niveauGlobal) {
  return AVATAR_CHAIN[avatarRankFor(niveauGlobal) - 1];
}

// ============================================================
// Fin de session partagee entre tous les mini-jeux :
// enregistre la progression, avance le niveau global, verifie
// un changement d'echelon d'avatar et une recompense parentale.
// ============================================================
async function completeSession({ profil, miniJeuId, finalPalier, erreursTotal, dureeSecondes, totalRounds, startedAt }) {
  await supabase
    .from('progression')
    .upsert(
      { profil_id: profil.id, mini_jeu_id: miniJeuId, palier_actuel: finalPalier },
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

  return {
    newNiveau,
    rankChanged: newRank !== previousRank,
    newRank,
    reward,
  };
}

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
      <Text style={styles.authTitle}>🌲 Kid Crack</Text>
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
      <Text style={styles.title}>🌲 Qui joue aujourd'hui ?</Text>

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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('mini_jeux').select('*').order('competence');
      setMiniJeux(data ?? []);
      setLoading(false);
    })();
  }, []);

  // Rafraîchit le niveau/avatar à chaque retour sur cet écran (après une session de jeu).
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const { data } = await supabase
        .from('profils_enfants')
        .select('*')
        .eq('id', route.params.profil.id)
        .maybeSingle();
      if (data) setProfil(data);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

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
        <Text style={styles.mapAvatar}>{profil.avatar_personnel ?? '🐾'}</Text>
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

      <FlatList
        data={miniJeux}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const targetScreen = GAME_SCREENS[item.code];
          return (
            <Pressable
              style={styles.gameCard}
              disabled={!targetScreen}
              onPress={() => targetScreen && navigation.navigate(targetScreen, { profil })}
            >
              <Text style={styles.gameIcon}>{GAME_ICONS[item.code] ?? '🎲'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gameName}>{item.nom}</Text>
                <Text style={styles.gameCompetence}>{item.competence}</Text>
              </View>
              {!targetScreen && <Text style={styles.soon}>bientôt</Text>}
            </Pressable>
          );
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
  const [palier, setPalier] = useState(1);
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

      setPalier(prog?.palier_actuel ?? 1);
    })();
  }, [profil.id]);

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

  useEffect(() => {
    if (miniJeuId) loadRound(miniJeuId, profil.niveau_defaut, palier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniJeuId]);

  function speak(text) {
    Speech.speak(text, { language: 'fr-FR', rate: 0.85 });
  }

  const [sessionSummary, setSessionSummary] = useState(null);

  async function finishSession(finalPalier) {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const summary = await completeSession({
      profil, miniJeuId, finalPalier,
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
          let nextPalier = palier;
          if (errorsThisRound.current === 0) nextPalier = Math.min(3, palier + 1);
          else if (errorsThisRound.current >= 2) nextPalier = Math.max(1, palier - 1);

          if (round >= TOTAL_ROUNDS) {
            setPalier(nextPalier);
            await finishSession(nextPalier);
          } else {
            setPalier(nextPalier);
            setRound((r) => r + 1);
            loadRound(miniJeuId, profil.niveau_defaut, nextPalier);
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
    return <SessionEndScreen profil={profil} palier={palier} summary={sessionSummary} navigation={navigation} />;
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
        <Text
          style={[
            styles.feedback,
            feedback === 'Bravo !' ? styles.feedbackSuccess : styles.feedbackError,
          ]}
        >
          {feedback}
        </Text>
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
function SessionEndScreen({ profil, palier, summary, navigation }) {
  return (
    <View style={styles.center}>
      <Text style={styles.endEmoji}>🌟</Text>
      <Text style={styles.endTitle}>Bravo {profil.prenom} !</Text>
      {palier != null && (
        <Text style={styles.endText}>Tu as fini ta session au palier {palier} sur 3.</Text>
      )}
      {summary?.rankChanged && (
        <View style={styles.rankUpBox}>
          <Text style={styles.rankUpTitle}>Nouvel avatar débloqué !</Text>
          <Text style={styles.rankUpAvatar}>{AVATAR_CHAIN[summary.newRank - 1]}</Text>
        </View>
      )}
      {summary?.reward && (
        <View style={styles.rewardBox}>
          <Text style={styles.rewardTitle}>🎁 Une récompense t'attend !</Text>
          {summary.reward.description ? (
            <Text style={styles.rewardText}>{summary.reward.description}</Text>
          ) : null}
        </View>
      )}
      <Pressable style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Retour à la carte</Text>
      </Pressable>
    </View>
  );
}

// ============================================================
// Moteur générique : question à choix (Sons Magiques + Pommes de Luma)
// ============================================================
function ChoiceGameScreen({ route, navigation, jeuCode, jeuTitre, buildPrompt }) {
  const { profil } = route.params;
  const [loading, setLoading] = useState(true);
  const [miniJeuId, setMiniJeuId] = useState(null);
  const [palier, setPalier] = useState(1);
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

      setPalier(prog?.palier_actuel ?? 1);
    })();
  }, [profil.id]);

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

  useEffect(() => {
    if (miniJeuId) loadRound(miniJeuId, profil.niveau_defaut, palier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniJeuId]);

  function speak(text) {
    if (text) Speech.speak(String(text), { language: 'fr-FR', rate: 0.85 });
  }

  async function finishSession(finalPalier) {
    if (!miniJeuId) return;
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
    const summary = await completeSession({
      profil, miniJeuId, finalPalier,
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
        let nextPalier = palier;
        if (errorsThisRound.current === 0) nextPalier = Math.min(3, palier + 1);
        else if (errorsThisRound.current >= 2) nextPalier = Math.max(1, palier - 1);

        if (round >= TOTAL_ROUNDS) {
          setPalier(nextPalier);
          await finishSession(nextPalier);
        } else {
          setPalier(nextPalier);
          setRound((r) => r + 1);
          loadRound(miniJeuId, profil.niveau_defaut, nextPalier);
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
    return <SessionEndScreen profil={profil} palier={palier} summary={sessionSummary} navigation={navigation} />;
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

      <View style={styles.prompt}>
        {promptData.icon ? <Text style={styles.icon}>{promptData.icon}</Text> : null}
        {promptData.visual ? <Text style={styles.visualRow}>{promptData.visual}</Text> : null}
        <Text style={styles.promptText}>{promptData.promptText}</Text>
        {promptData.speak ? (
          <Pressable style={styles.listenButton} onPress={() => speak(promptData.speak)}>
            <Text style={styles.listenText}>🔊 Écouter</Text>
          </Pressable>
        ) : null}
      </View>

      {feedback && (
        <Text style={[styles.feedback, feedback === 'Bravo !' ? styles.feedbackSuccess : styles.feedbackError]}>
          {feedback}
        </Text>
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
      const symbole = d.operation === 'addition' ? '+' : '−';
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
});
