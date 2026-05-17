// ============================================================
//  messages.js — Tous les textes et claviers du bot
//  BSB Battle Pass — LA BRINK'S × BSB Bot
// ============================================================

const MISSIONS = {
  1:  { type: 'Social',         reward: 'Vidéo exclusive',  emoji: '📱' },
  2:  { type: 'Social',         reward: 'Porte-clé BSB',    emoji: '🔑' },
  3:  { type: 'Partage',        reward: '10 $ USDT',        emoji: '📤' },
  4:  { type: 'Referral',       reward: '5 €',              emoji: '👥' },
  5:  { type: 'Preuve sociale', reward: '15 $ USDT',        emoji: '📊' },
  6:  { type: 'Viral',          reward: '300 $ USDT',       emoji: '🔥' },
  7:  { type: 'Affiliation',    reward: '50 $ USDT',        emoji: '💼' },
  8:  { type: 'Élite',          reward: '100 $ USDT',       emoji: '⭐' },
  9:  { type: 'Élite',          reward: '250 $ USDT',       emoji: '💎' },
  10: { type: 'Légendaire',     reward: '600 $ USDT',       emoji: '👑' },
};

const RANKS = {
  RECRUE:     { emoji: '🎖️',  min: 0  },
  AGENT:      { emoji: '⚡',  min: 4  },
  ÉLITE:      { emoji: '💎',  min: 7  },
  LÉGENDAIRE: { emoji: '👑',  min: 10 },
};

// ─── MESSAGES ────────────────────────────────────────────────

function msgWelcomeNew(firstName) {
  return `
🏆 *BSB BATTLE PASS — SAISON 1*
_LA BRINK'S × BSB Bot_

Bienvenue ${firstName} !

Tu viens de rejoindre le programme exclusif LA BRINK'S.
Complete des missions, gagne jusqu'à *1 330 $ USDT* + récompenses physiques.

*Comment ça marche :*
→ 10 missions progressives
→ Chaque mission débloque une récompense réelle
→ Plus tu progresses, plus les gains sont élevés

Ta *Mission 1* est débloquée — commence maintenant !
`;
}

function msgWelcomeBack(member) {
  const rank = RANKS[member.rank] || RANKS['RECRUE'];
  return `
${rank.emoji} *BSB BATTLE PASS*
Bon retour, *${member.first_name}* !

📊 Niveau actuel : *${member.current_level}/10*
🏅 Rang : *${member.rank}*
💰 Total gagné : *${member.total_earned} $*

Utilise les boutons ci-dessous pour naviguer.
`;
}

function msgProgress(member, missions) {
  const done = missions.filter(m => m.status === 'done').length;
  const active = missions.find(m => m.status === 'active');
  const pending = missions.filter(m => m.status === 'pending').length;
  const rank = RANKS[member.rank] || RANKS['RECRUE'];

  let text = `${rank.emoji} *BSB BATTLE PASS — TA PROGRESSION*\n\n`;
  text += `👤 *${member.first_name}*\n`;
  text += `🏅 Rang : *${member.rank}*\n`;
  text += `📊 Niveau : *${member.current_level}/10*\n`;
  text += `💰 Total gagné : *${member.total_earned} $*\n\n`;
  text += `*─── Missions ───*\n`;

  missions.forEach(m => {
    const mInfo = MISSIONS[m.mission_id];
    let icon = '';
    if (m.status === 'done')    icon = '✅';
    else if (m.status === 'active')   icon = '▶️';
    else if (m.status === 'pending')  icon = '⏳';
    else icon = '🔒';

    text += `${icon} Niv.${m.mission_id} — ${mInfo.reward}\n`;
  });

  if (active) {
    const mInfo = MISSIONS[active.mission_id];
    text += `\n🎯 *Mission en cours :* Niveau ${active.mission_id} (${mInfo.type})\n`;
    text += `Récompense : *${mInfo.reward}*`;
  }

  if (pending > 0) {
    text += `\n\n⏳ *${pending} preuve(s) en attente de validation* — patiente 24–72h.`;
  }

  return text;
}

function msgMissionDetail(missionId, missionStatus) {
  const details = {
    1: {
      title: 'Like & commentaire Instagram @beb7oo',
      steps: [
        'Va sur Instagram et cherche @beb7oo',
        'Like le post épinglé ou désigné par le support',
        'Laisse un commentaire visible (minimum 5 mots)',
        'Ton compte Instagram doit être public',
        'Envoie une capture d\'écran du like + commentaire'
      ]
    },
    2: {
      title: 'Abonnements réseaux sociaux',
      steps: [
        'Abonne-toi à @beb7oo sur Instagram',
        'Rejoins le canal Telegram LA BRINK\'S',
        'Abonne-toi à la chaîne YouTube LA BRINK\'S',
        'Envoie 3 captures d\'écran (une par réseau)'
      ]
    },
    3: {
      title: 'Repost d\'un Reel en story Instagram',
      steps: [
        'Va sur le profil @beb7oo et reposts le Reel désigné en story',
        'La story doit rester active minimum 24h',
        'Ton compte doit être public',
        'Envoie une capture de ta story avec l\'horodatage'
      ]
    },
    4: {
      title: 'Inviter 7 personnes sur LA BRINK\'S',
      steps: [
        'Partage le lien du canal public LA BRINK\'S',
        '7 personnes distinctes doivent rejoindre le canal',
        'Les membres doivent être actifs (pas de bots)',
        'Envoie les captures des 7 invitations'
      ]
    },
    5: {
      title: 'Preuve de gains du jour',
      steps: [
        'Fais un screenshot de tes gains du jour',
        'La capture doit montrer : date du jour + montant + plateforme',
        'Source valide : LA BRINK\'S signaux OU BSB Bot',
        'Image réelle, non retouchée'
      ]
    },
    6: {
      title: 'Liker, commenter & partager à 20 personnes',
      steps: [
        'Like ET commente la vidéo désignée par le support',
        'Partage cette vidéo à 20 contacts distincts',
        'Plateformes acceptées : WhatsApp, Telegram, Instagram DM...',
        'Envoie les captures du like + commentaire + 20 envois'
      ]
    },
    7: {
      title: 'VIP LA BRINK\'S ou 1 membre (dépôt 450€ min.)',
      steps: [
        'Option A : Rejoins le VIP LA BRINK\'S avec dépôt min. 450€',
        'Option B : Parraine 1 personne qui dépose min. 450€',
        'Donne ton ID parrain au support AVANT le dépôt',
        'Envoie la confirmation de dépôt officielle'
      ]
    },
    8: {
      title: '1 client avec dépôt min. 1 000€',
      steps: [
        'Parraine 1 nouveau client (BSB Bot ou LA BRINK\'S)',
        'Le dépôt minimum est de 1 000€',
        'Enregistre ton ID parrain avant le dépôt du filleul',
        'Envoie la confirmation de dépôt officielle'
      ]
    },
    9: {
      title: '2 clients avec dépôt min. 1 000€ chacun',
      steps: [
        '2 clients distincts, chacun avec 1 000€ de dépôt',
        'Clients différents de ceux des niveaux précédents',
        'Enregistre ton ID parrain pour chaque filleul',
        'Envoie 2 confirmations de dépôt distinctes'
      ]
    },
    10: {
      title: '5 clients avec dépôt min. 1 000€ chacun',
      steps: [
        '5 clients uniques, chacun avec 1 000€ minimum',
        'Tous les dépôts dans la période Saison 1 (30 jours)',
        'ID parrain enregistré pour chaque filleul',
        'Envoie 5 confirmations de dépôt officielles'
      ]
    }
  };

  const d = details[missionId];
  const mInfo = MISSIONS[missionId];
  const statusIcon = missionStatus === 'done' ? '✅ Validée'
    : missionStatus === 'pending' ? '⏳ En attente de validation'
    : '▶️ En cours';

  let text = `${mInfo.emoji} *MISSION ${missionId} — ${d.title.toUpperCase()}*\n`;
  text += `_${statusIcon}_\n\n`;
  text += `💰 *Récompense : ${mInfo.reward}*\n\n`;
  text += `*Étapes à suivre :*\n`;
  d.steps.forEach((s, i) => { text += `${i + 1}. ${s}\n`; });

  if (missionStatus === 'active') {
    text += `\nPrêt ? Envoie ta preuve via le bouton ci-dessous.`;
  } else if (missionStatus === 'pending') {
    text += `\nTa preuve est en cours de vérification. Résultat sous 24–72h.`;
  }

  return text;
}

function msgSubmitPrompt(missionId) {
  const mInfo = MISSIONS[missionId];
  return `
📤 *SOUMISSION — MISSION ${missionId}*

Envoie maintenant ta preuve pour la mission ${missionId} (${mInfo.type}).

*Formats acceptés :*
• Photo / capture d'écran
• Plusieurs photos si nécessaire
• Message texte avec lien si applicable

Envoie ton/tes captures d'écran maintenant, ou /annuler pour revenir.
`;
}

function msgSubmitSuccess(missionId) {
  return `
✅ *Preuve reçue !*

Ta soumission pour la *Mission ${missionId}* a bien été enregistrée.

⏳ Notre équipe la vérifie sous *24 à 72h*.
Tu recevras une notification ici dès que c'est traité.

Continue à trader et à faire grandir LA BRINK'S ! 💪
`;
}

function msgValidated(member, missionId) {
  const mInfo = MISSIONS[missionId];
  const nextMission = missionId + 1;
  let text = `
🎉 *MISSION ${missionId} VALIDÉE !*

Félicitations *${member.first_name}* !

Ta récompense : *${mInfo.reward}* est en cours de traitement.
Versement sous 48h.
`;
  if (nextMission <= 10) {
    const nextInfo = MISSIONS[nextMission];
    text += `\n🔓 *Mission ${nextMission} débloquée !*\nRécompense suivante : *${nextInfo.reward}*\nUtilise /mission${nextMission} pour voir les détails.`;
  } else {
    text += `\n👑 *Tu as complété toutes les missions de la Saison 1 !*\nMerci d'être un vrai LÉGENDAIRE de LA BRINK'S !`;
  }
  return text;
}

function msgRejected(member, missionId, reason) {
  return `
❌ *Preuve refusée — Mission ${missionId}*

Bonjour ${member.first_name},

Ta soumission n'a pas pu être validée.

*Raison :* ${reason || 'Preuve non conforme aux conditions requises.'}

Tu peux soumettre à nouveau via /mission${missionId}.
N'hésite pas à contacter le support si tu as des questions.
`;
}

// ─── ADMIN MESSAGES ──────────────────────────────────────────

function msgAdminNewSubmission(sub) {
  return `
🔔 *NOUVELLE SOUMISSION*

👤 Membre : @${sub.telegram_username || 'inconnu'} (${sub.first_name})
📋 Mission : *${sub.mission_id} — ${sub.mission_name}*
💰 Récompense : *${sub.reward_label}*
${sub.member_note ? `💬 Note : _${sub.member_note}_` : ''}
⏰ Soumis le : ${new Date(sub.submitted_at).toLocaleString('fr-FR')}
🔄 Tentative n°${sub.attempt}

ID soumission : \`${sub.submission_id}\`
`;
}

function msgAdminStats(stats) {
  return `
📊 *BSB BATTLE PASS — STATS SAISON 1*

👥 Membres total : *${stats.total_members}*
⏳ En attente validation : *${stats.pending_submissions}*
✅ Validées : *${stats.approved_submissions}*
💰 Total versé : *${stats.total_paid_usd} $*
💎 Membres élite (niv. 7+) : *${stats.elite_members}*
👑 Légendaires (niv. 10) : *${stats.legendary_members}*
`;
}

// ─── CLAVIERS INLINE ─────────────────────────────────────────

function kbMain(miniAppUrl) {
  return {
    inline_keyboard: [
      [{ text: '🏆 Ouvrir le Battle Pass', web_app: { url: miniAppUrl } }],
      [
        { text: '📊 Ma progression', callback_data: 'progress' },
        { text: '🎯 Mission active', callback_data: 'active_mission' }
      ],
      [{ text: '🏅 Classement', callback_data: 'leaderboard' }],
    ]
  };
}

function kbMission(missionId, status) {
  const buttons = [];
  if (status === 'active') {
    buttons.push([{ text: '📤 Soumettre ma preuve', callback_data: `submit_${missionId}` }]);
  }
  buttons.push([{ text: '← Retour', callback_data: 'progress' }]);
  return { inline_keyboard: buttons };
}

function kbAdminSubmission(submissionId, memberId, missionId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Valider', callback_data: `admin_approve_${submissionId}_${memberId}_${missionId}` },
        { text: '❌ Rejeter', callback_data: `admin_reject_${submissionId}_${memberId}_${missionId}` }
      ],
      [{ text: '⚠️ Demander plus de preuves', callback_data: `admin_more_${submissionId}_${memberId}_${missionId}` }]
    ]
  };
}

function kbAdminPanel() {
  return {
    inline_keyboard: [
      [{ text: '📋 Soumissions en attente', callback_data: 'admin_pending' }],
      [
        { text: '📊 Stats saison', callback_data: 'admin_stats' },
        { text: '🏅 Classement', callback_data: 'admin_leaderboard' }
      ],
      [{ text: '💰 Paiements en attente', callback_data: 'admin_payments' }]
    ]
  };
}

module.exports = {
  MISSIONS, RANKS,
  msgWelcomeNew, msgWelcomeBack, msgProgress,
  msgMissionDetail, msgSubmitPrompt, msgSubmitSuccess,
  msgValidated, msgRejected,
  msgAdminNewSubmission, msgAdminStats,
  kbMain, kbMission, kbAdminSubmission, kbAdminPanel
};
