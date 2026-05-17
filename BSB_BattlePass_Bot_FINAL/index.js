// ============================================================
//  index.js — Bot Telegram BSB Battle Pass
//  LA BRINK'S × BSB Bot — Saison 1
//  node index.js pour lancer
// ============================================================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');
const msg = require('./messages');

const BOT_TOKEN     = process.env.BOT_TOKEN;
const MINI_APP_URL  = process.env.MINI_APP_URL;
const ADMIN_IDS     = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
const ADMIN_TG_ID   = parseInt(process.env.ADMIN_TELEGRAM_ID);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN manquant dans .env');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 BSB Battle Pass Bot démarré...');

// ─── UTILITAIRES ─────────────────────────────────────────────

function isAdmin(telegramId) {
  return ADMIN_IDS.includes(telegramId) || telegramId === ADMIN_TG_ID;
}

async function getOrCreateMember(telegramUser) {
  let member = await db.getMember(telegramUser.id);
  if (!member) {
    member = await db.createMember(
      telegramUser.id,
      telegramUser.username,
      telegramUser.first_name
    );
    return { member, isNew: true };
  }
  await db.updateLastActive(member.id);
  return { member, isNew: false };
}

async function notifyAdmins(text, keyboard = null) {
  for (const adminId of ADMIN_IDS) {
    try {
      await bot.sendMessage(adminId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard || undefined
      });
    } catch (e) {
      console.error(`Erreur notification admin ${adminId}:`, e.message);
    }
  }
}

// État temporaire pour les soumissions en cours
const pendingSubmissions = {};

// ─── COMMANDES MEMBRES ───────────────────────────────────────

// /start — Inscription ou retour
bot.onText(/\/start/, async (message) => {
  const chatId = message.chat.id;
  const user   = message.from;
  try {
    const { member, isNew } = await getOrCreateMember(user);
    if (member.is_banned) {
      return bot.sendMessage(chatId, '🚫 Ton accès au Battle Pass a été suspendu. Contacte le support.');
    }

    const text    = isNew ? msg.msgWelcomeNew(member.first_name) : msg.msgWelcomeBack(member);
    const keyboard = msg.kbMain(MINI_APP_URL);

    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });

    if (isNew) {
      console.log(`✅ Nouveau membre inscrit : @${user.username} (${user.id})`);
    }
  } catch (err) {
    console.error('/start error:', err);
    bot.sendMessage(chatId, '❌ Une erreur est survenue. Réessaie dans quelques instants.');
  }
});

// /progress — Voir sa progression complète
bot.onText(/\/progress/, async (message) => {
  const chatId = message.chat.id;
  try {
    const { member } = await getOrCreateMember(message.from);
    if (member.is_banned) return;

    const missions = await db.getMemberMissions(member.id);
    const text = msg.msgProgress(member, missions);
    const keyboard = msg.kbMain(MINI_APP_URL);

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (err) {
    console.error('/progress error:', err);
    bot.sendMessage(chatId, '❌ Erreur lors du chargement de ta progression.');
  }
});

// /mission[N] — Voir le détail d'une mission
bot.onText(/\/mission(\d+)/, async (message, match) => {
  const chatId    = message.chat.id;
  const missionId = parseInt(match[1]);

  if (missionId < 1 || missionId > 10) {
    return bot.sendMessage(chatId, '❌ Mission invalide. Les missions vont de 1 à 10.');
  }

  try {
    const { member } = await getOrCreateMember(message.from);
    if (member.is_banned) return;

    const mStatus = await db.getMemberMission(member.id, missionId);
    if (mStatus.status === 'locked') {
      return bot.sendMessage(chatId,
        `🔒 *Mission ${missionId} verrouillée*\n\nComplète d'abord les missions précédentes.`,
        { parse_mode: 'Markdown' }
      );
    }

    const text     = msg.msgMissionDetail(missionId, mStatus.status);
    const keyboard = msg.kbMission(missionId, mStatus.status);

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (err) {
    console.error(`/mission${missionId} error:`, err);
    bot.sendMessage(chatId, '❌ Erreur lors du chargement de la mission.');
  }
});

// /soumettre — Démarrer une soumission de preuve
bot.onText(/\/soumettre/, async (message) => {
  const chatId = message.chat.id;
  try {
    const { member } = await getOrCreateMember(message.from);
    if (member.is_banned) return;

    const missions   = await db.getMemberMissions(member.id);
    const activeMission = missions.find(m => m.status === 'active');

    if (!activeMission) {
      const hasPending = missions.some(m => m.status === 'pending');
      if (hasPending) {
        return bot.sendMessage(chatId,
          '⏳ Tu as déjà une soumission en attente de validation.\nPatiente 24–72h.'
        );
      }
      return bot.sendMessage(chatId, '✅ Toutes tes missions disponibles sont déjà complétées !');
    }

    // Sauvegarder l'état de soumission en cours
    pendingSubmissions[chatId] = {
      memberId:  member.id,
      missionId: activeMission.mission_id,
      files:     [],
      step:      'waiting_files'
    };

    const text     = msg.msgSubmitPrompt(activeMission.mission_id);
    const keyboard = { inline_keyboard: [[{ text: '❌ Annuler', callback_data: 'cancel_submit' }]] };

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (err) {
    console.error('/soumettre error:', err);
    bot.sendMessage(chatId, '❌ Erreur. Réessaie avec /soumettre.');
  }
});

// /annuler — Annuler une soumission en cours
bot.onText(/\/annuler/, async (message) => {
  const chatId = message.chat.id;
  if (pendingSubmissions[chatId]) {
    delete pendingSubmissions[chatId];
    bot.sendMessage(chatId, '✅ Soumission annulée.', {
      reply_markup: msg.kbMain(MINI_APP_URL)
    });
  } else {
    bot.sendMessage(chatId, 'Aucune soumission en cours.');
  }
});

// /classement — Top 10 membres
bot.onText(/\/classement/, async (message) => {
  const chatId = message.chat.id;
  try {
    const leaderboard = await db.getLeaderboard(10);
    let text = '🏅 *BSB BATTLE PASS — CLASSEMENT*\n\n';
    const medals = ['🥇', '🥈', '🥉'];

    leaderboard.forEach((entry, i) => {
      const medal = medals[i] || `${i + 1}.`;
      const rankEmoji = msg.RANKS[entry.rank]?.emoji || '🎖️';
      text += `${medal} ${rankEmoji} @${entry.telegram_username || entry.first_name} — Niv.*${entry.current_level}* — ${entry.total_earned}$\n`;
    });

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('/classement error:', err);
    bot.sendMessage(chatId, '❌ Erreur lors du chargement du classement.');
  }
});

// /aide — Aide et commandes disponibles
bot.onText(/\/aide/, (message) => {
  const text = `
🤖 *BSB BATTLE PASS — COMMANDES*

*/start* — Ouvrir le Battle Pass
*/progress* — Voir ta progression
*/mission1* à */mission10* — Détail d'une mission
*/soumettre* — Soumettre une preuve
*/classement* — Top 10 membres
*/annuler* — Annuler une soumission en cours

💬 *Support :* ${process.env.SUPPORT_USERNAME || '@BSB_Support'}
`;
  bot.sendMessage(message.chat.id, text, { parse_mode: 'Markdown' });
});

// ─── RÉCEPTION DE PHOTOS (preuves) ───────────────────────────

bot.on('photo', async (message) => {
  const chatId = message.chat.id;
  const state  = pendingSubmissions[chatId];

  if (!state || state.step !== 'waiting_files') return;

  // Récupérer la photo en haute résolution
  const photos  = message.photo;
  const bestPhoto = photos[photos.length - 1];
  state.files.push(bestPhoto.file_id);

  // Demander si c'est tout ou s'il y a d'autres fichiers
  const keyboard = {
    inline_keyboard: [
      [{ text: `✅ Confirmer (${state.files.length} photo${state.files.length > 1 ? 's' : ''})`, callback_data: 'confirm_submit' }],
      [{ text: '➕ Ajouter une autre photo', callback_data: 'add_more_photo' }],
      [{ text: '❌ Annuler', callback_data: 'cancel_submit' }]
    ]
  };

  bot.sendMessage(chatId,
    `📷 Photo reçue (${state.files.length}/5 max).\nAjoute d'autres photos ou confirme ta soumission.`,
    { reply_markup: keyboard }
  );
});

// Réception de documents (PDF, etc.)
bot.on('document', async (message) => {
  const chatId = message.chat.id;
  const state  = pendingSubmissions[chatId];
  if (!state || state.step !== 'waiting_files') return;

  state.files.push(message.document.file_id);
  bot.sendMessage(chatId, `📎 Fichier reçu. Envoie d'autres fichiers ou confirme.`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: `✅ Confirmer (${state.files.length} fichier${state.files.length > 1 ? 's' : ''})`, callback_data: 'confirm_submit' }],
        [{ text: '❌ Annuler', callback_data: 'cancel_submit' }]
      ]
    }
  });
});

// ─── CALLBACK QUERIES (boutons inline) ───────────────────────

bot.on('callback_query', async (query) => {
  const chatId   = query.message.chat.id;
  const msgId    = query.message.message_id;
  const data     = query.data;
  const user     = query.from;

  bot.answerCallbackQuery(query.id);

  // ── Boutons membres ──

  if (data === 'progress') {
    try {
      const { member } = await getOrCreateMember(user);
      const missions = await db.getMemberMissions(member.id);
      const text = msg.msgProgress(member, missions);
      bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: msg.kbMain(MINI_APP_URL) });
    } catch (e) { console.error(e); }
    return;
  }

  if (data === 'active_mission') {
    try {
      const { member } = await getOrCreateMember(user);
      const missions = await db.getMemberMissions(member.id);
      const active = missions.find(m => m.status === 'active');
      if (!active) {
        bot.sendMessage(chatId, '✅ Toutes tes missions disponibles sont complétées !');
        return;
      }
      const text = msg.msgMissionDetail(active.mission_id, 'active');
      const keyboard = msg.kbMission(active.mission_id, 'active');
      bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (e) { console.error(e); }
    return;
  }

  if (data === 'leaderboard') {
    try {
      const leaderboard = await db.getLeaderboard(10);
      let text = '🏅 *CLASSEMENT BSB BATTLE PASS*\n\n';
      const medals = ['🥇', '🥈', '🥉'];
      leaderboard.forEach((entry, i) => {
        const medal = medals[i] || `${i + 1}.`;
        text += `${medal} @${entry.telegram_username || entry.first_name} — Niv.*${entry.current_level}*\n`;
      });
      bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) { console.error(e); }
    return;
  }

  // ── Soumission de preuve ──

  if (data.startsWith('submit_')) {
    const missionId = parseInt(data.split('_')[1]);
    try {
      const { member } = await getOrCreateMember(user);
      const mStatus = await db.getMemberMission(member.id, missionId);
      if (mStatus.status !== 'active') {
        bot.sendMessage(chatId, '❌ Cette mission n\'est pas disponible pour soumission.');
        return;
      }
      pendingSubmissions[chatId] = { memberId: member.id, missionId, files: [], step: 'waiting_files' };
      const text = msg.msgSubmitPrompt(missionId);
      bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌ Annuler', callback_data: 'cancel_submit' }]] } });
    } catch (e) { console.error(e); }
    return;
  }

  if (data === 'confirm_submit') {
    const state = pendingSubmissions[chatId];
    if (!state || state.files.length === 0) {
      bot.sendMessage(chatId, '❌ Aucun fichier reçu. Envoie d\'abord une capture d\'écran.');
      return;
    }
    try {
      // Créer la soumission dans la DB
      const submission = await db.createSubmission(
        state.memberId,
        state.missionId,
        state.files[0],
        state.files.length > 1 ? state.files : null,
        state.note || null
      );

      // Passer la mission en pending
      await db.setMissionPending(state.memberId, state.missionId);

      // Récupérer infos membre pour notif admin
      const member = await db.getMember(user.id);

      // Confirmer au membre
      bot.sendMessage(chatId, msg.msgSubmitSuccess(state.missionId), { parse_mode: 'Markdown' });

      // Notifier les admins
      const missions_ref = require('./messages').MISSIONS;
      const mInfo = missions_ref[state.missionId];
      const adminText = msg.msgAdminNewSubmission({
        submission_id:    submission.id,
        telegram_username: user.username,
        first_name:       user.first_name,
        telegram_id:      user.id,
        mission_id:       state.missionId,
        mission_name:     `Mission ${state.missionId}`,
        reward_label:     mInfo.reward,
        member_note:      state.note,
        submitted_at:     new Date().toISOString(),
        attempt:          1
      });
      const adminKb = msg.kbAdminSubmission(submission.id, state.memberId, state.missionId);
      await notifyAdmins(adminText, adminKb);

      // Transférer les photos aux admins
      if (state.files.length > 0) {
        for (const adminId of ADMIN_IDS) {
          for (const fileId of state.files) {
            try { await bot.sendPhoto(adminId, fileId, { caption: `Preuve Mission ${state.missionId} — @${user.username || user.first_name}` }); }
            catch (e) { console.error(`Erreur envoi photo admin ${adminId}:`, e.message); }
          }
        }
      }

      delete pendingSubmissions[chatId];
    } catch (e) {
      console.error('Erreur soumission:', e);
      bot.sendMessage(chatId, '❌ Erreur lors de la soumission. Réessaie avec /soumettre.');
    }
    return;
  }

  if (data === 'cancel_submit') {
    delete pendingSubmissions[chatId];
    bot.sendMessage(chatId, '✅ Soumission annulée.', { reply_markup: msg.kbMain(MINI_APP_URL) });
    return;
  }

  if (data === 'add_more_photo') {
    bot.sendMessage(chatId, '📷 Envoie ta prochaine photo.');
    return;
  }

  // ── Commandes admin ──

  if (!isAdmin(user.id)) return;

  if (data === 'admin_pending') {
    try {
      const subs = await db.getPendingSubmissions();
      if (subs.length === 0) {
        bot.sendMessage(chatId, '✅ Aucune soumission en attente.');
        return;
      }
      for (const sub of subs.slice(0, 5)) {
        const text = msg.msgAdminNewSubmission(sub);
        const kb = msg.kbAdminSubmission(sub.submission_id, sub.member_id, sub.mission_id);
        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: kb });
      }
      if (subs.length > 5) {
        bot.sendMessage(chatId, `... et ${subs.length - 5} autres soumissions en attente.`);
      }
    } catch (e) { console.error(e); }
    return;
  }

  if (data === 'admin_stats') {
    try {
      const stats = await db.getSeasonStats();
      bot.sendMessage(chatId, msg.msgAdminStats(stats), { parse_mode: 'Markdown' });
    } catch (e) { console.error(e); }
    return;
  }

  if (data === 'admin_leaderboard') {
    try {
      const lb = await db.getLeaderboard(10);
      let text = '🏅 *CLASSEMENT ADMIN*\n\n';
      lb.forEach((e, i) => {
        text += `${i + 1}. @${e.telegram_username || e.first_name} — Niv.${e.current_level} — ${e.total_earned}$ — ${e.rank}\n`;
      });
      bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) { console.error(e); }
    return;
  }

  // Validation admin : admin_approve_[submissionId]_[memberId]_[missionId]
  if (data.startsWith('admin_approve_')) {
    const parts = data.split('_');
    const submissionId = parts[2];
    const memberId     = parts[3];
    const missionId    = parseInt(parts[4]);
    try {
      await db.approveSubmission(submissionId, user.username || 'admin');
      await db.validateMission(memberId, missionId, user.username || 'admin');

      // Récupérer le membre pour notif
      const missions_ref = require('./messages').MISSIONS;
      const mDef = missions_ref[missionId];

      // Créer la récompense
      await db.createReward(
        memberId, missionId,
        mDef.reward.includes('$') || mDef.reward.includes('USDT') ? 'usdt' :
        mDef.reward.includes('€') ? 'cash' :
        mDef.reward.includes('clé') ? 'physical' : 'content',
        parseFloat(mDef.reward.replace(/[^0-9.]/g, '')) || null,
        mDef.reward.includes('€') ? 'EUR' : 'USD',
        mDef.reward
      );

      // Notifier le membre
      const memberData = await supabaseGetMemberById(memberId);
      if (memberData) {
        await bot.sendMessage(
          memberData.telegram_id,
          msg.msgValidated(memberData, missionId),
          { parse_mode: 'Markdown', reply_markup: msg.kbMain(MINI_APP_URL) }
        );
      }

      bot.editMessageText(
        `✅ Mission ${missionId} validée pour le membre.`,
        { chat_id: chatId, message_id: msgId }
      );

      console.log(`✅ Admin ${user.username} a validé mission ${missionId} pour ${memberId}`);
    } catch (e) {
      console.error('Erreur validation admin:', e);
      bot.sendMessage(chatId, '❌ Erreur lors de la validation.');
    }
    return;
  }

  // Rejet admin : admin_reject_[submissionId]_[memberId]_[missionId]
  if (data.startsWith('admin_reject_')) {
    const parts = data.split('_');
    const submissionId = parts[2];
    const memberId     = parts[3];
    const missionId    = parseInt(parts[4]);

    // Demander la raison du rejet
    bot.sendMessage(chatId,
      `❌ *Rejeter la mission ${missionId}*\n\nEnvoie la raison du rejet (sera transmise au membre) :`,
      { parse_mode: 'Markdown' }
    );

    // Attendre la réponse de l'admin
    bot.once('message', async (replyMsg) => {
      if (replyMsg.chat.id !== chatId || !isAdmin(replyMsg.from.id)) return;
      const reason = replyMsg.text;
      try {
        await db.rejectSubmission(submissionId, user.username || 'admin', reason);

        // Remettre la mission en statut active
        const { createClient } = require('@supabase/supabase-js');
        const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        await supa.from('mission_status').update({ status: 'active', submitted_at: null })
          .eq('member_id', memberId).eq('mission_id', missionId);

        // Notifier le membre
        const memberData = await supabaseGetMemberById(memberId);
        if (memberData) {
          await bot.sendMessage(
            memberData.telegram_id,
            msg.msgRejected(memberData, missionId, reason),
            { parse_mode: 'Markdown' }
          );
        }

        bot.sendMessage(chatId, `✅ Soumission rejetée. Membre notifié.`);
        console.log(`❌ Admin ${user.username} a rejeté mission ${missionId} pour ${memberId}`);
      } catch (e) {
        console.error('Erreur rejet admin:', e);
        bot.sendMessage(chatId, '❌ Erreur lors du rejet.');
      }
    });
    return;
  }
});

// ─── COMMANDES ADMIN ─────────────────────────────────────────

bot.onText(/\/admin/, async (message) => {
  if (!isAdmin(message.from.id)) {
    return bot.sendMessage(message.chat.id, '🚫 Accès refusé.');
  }
  bot.sendMessage(message.chat.id, '🔧 *PANEL ADMIN — BSB BATTLE PASS*', {
    parse_mode: 'Markdown',
    reply_markup: msg.kbAdminPanel()
  });
});

bot.onText(/\/stats/, async (message) => {
  if (!isAdmin(message.from.id)) return;
  try {
    const stats = await db.getSeasonStats();
    bot.sendMessage(message.chat.id, msg.msgAdminStats(stats), { parse_mode: 'Markdown' });
  } catch (e) {
    bot.sendMessage(message.chat.id, '❌ Erreur stats.');
  }
});

bot.onText(/\/ban (.+)/, async (message, match) => {
  if (!isAdmin(message.from.id)) return;
  const telegramId = parseInt(match[1]);
  try {
    const member = await db.getMember(telegramId);
    if (!member) return bot.sendMessage(message.chat.id, '❌ Membre introuvable.');
    await db.banMember(member.id, 'Ban manuel admin');
    bot.sendMessage(message.chat.id, `✅ Membre ${telegramId} banni.`);
    bot.sendMessage(telegramId, '🚫 Ton accès au BSB Battle Pass a été suspendu pour non-respect des règles.');
  } catch (e) {
    bot.sendMessage(message.chat.id, '❌ Erreur ban.');
  }
});

// ─── Helper interne ───────────────────────────────────────────

async function supabaseGetMemberById(memberId) {
  const { createClient } = require('@supabase/supabase-js');
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data } = await supa.from('members').select('*').eq('id', memberId).single();
  return data;
}

// ─── DÉMARRAGE ───────────────────────────────────────────────

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

console.log(`
╔══════════════════════════════════════╗
║   BSB BATTLE PASS BOT — ACTIF       ║
║   LA BRINK'S × BSB Bot              ║
║   Commandes : /start /admin /stats  ║
╚══════════════════════════════════════╝
`);
