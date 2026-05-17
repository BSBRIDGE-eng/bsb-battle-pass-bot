// ============================================================
//  db.js — Connexion Supabase + toutes les fonctions DB
//  BSB Battle Pass — LA BRINK'S × BSB Bot
// ============================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── MEMBRES ────────────────────────────────────────────────

// Récupérer un membre par telegram_id
async function getMember(telegramId) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Créer un nouveau membre (inscription au Battle Pass)
async function createMember(telegramId, username, firstName) {
  const { data, error } = await supabase
    .from('members')
    .insert({
      telegram_id: telegramId,
      telegram_username: username || null,
      first_name: firstName || 'Membre',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Mettre à jour la dernière activité
async function updateLastActive(memberId) {
  await supabase
    .from('members')
    .update({ last_active: new Date().toISOString() })
    .eq('id', memberId);
}

// Marquer un membre comme banni
async function banMember(memberId, reason) {
  const { error } = await supabase
    .from('members')
    .update({ is_banned: true, ban_reason: reason })
    .eq('id', memberId);
  if (error) throw error;
}

// ─── MISSIONS ───────────────────────────────────────────────

// Récupérer toutes les missions d'un membre
async function getMemberMissions(memberId) {
  const { data, error } = await supabase
    .from('mission_status')
    .select('*, missions(*)')
    .eq('member_id', memberId)
    .order('mission_id');
  if (error) throw error;
  return data;
}

// Récupérer une mission spécifique d'un membre
async function getMemberMission(memberId, missionId) {
  const { data, error } = await supabase
    .from('mission_status')
    .select('*, missions(*)')
    .eq('member_id', memberId)
    .eq('mission_id', missionId)
    .single();
  if (error) throw error;
  return data;
}

// Passer une mission en statut "pending" (preuve soumise)
async function setMissionPending(memberId, missionId) {
  const { error } = await supabase
    .from('mission_status')
    .update({
      status: 'pending',
      submitted_at: new Date().toISOString()
    })
    .eq('member_id', memberId)
    .eq('mission_id', missionId);
  if (error) throw error;
}

// Valider une mission et débloquer la suivante (via fonction SQL)
async function validateMission(memberId, missionId, adminName) {
  // Appel de la fonction SQL unlock_next_mission
  const { error: fnError } = await supabase
    .rpc('unlock_next_mission', {
      p_member_id: memberId,
      p_mission_id: missionId
    });
  if (fnError) throw fnError;

  // Logger l'action admin
  await logAdminAction(adminName, 'validate', 'mission', null,
    `Mission ${missionId} validée pour membre ${memberId}`);
}

// ─── SOUMISSIONS ─────────────────────────────────────────────

// Créer une nouvelle soumission
async function createSubmission(memberId, missionId, fileUrl, fileUrls, note) {
  // Compter les tentatives précédentes
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('mission_id', missionId);

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      member_id: memberId,
      mission_id: missionId,
      file_url: fileUrl || null,
      file_urls: fileUrls || null,
      note: note || null,
      status: 'pending',
      attempt: (count || 0) + 1
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Récupérer toutes les soumissions en attente (panel admin)
async function getPendingSubmissions() {
  const { data, error } = await supabase
    .from('admin_pending_submissions')
    .select('*')
    .limit(50);
  if (error) throw error;
  return data || [];
}

// Approuver une soumission
async function approveSubmission(submissionId, adminName) {
  const { data: sub, error: fetchErr } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();
  if (fetchErr) throw fetchErr;

  await supabase
    .from('submissions')
    .update({
      status: 'approved',
      reviewed_by: adminName,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', submissionId);

  return sub;
}

// Rejeter une soumission
async function rejectSubmission(submissionId, adminName, reason) {
  const { data: sub, error: fetchErr } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();
  if (fetchErr) throw fetchErr;

  await supabase
    .from('submissions')
    .update({
      status: 'rejected',
      reviewed_by: adminName,
      reviewed_at: new Date().toISOString(),
      admin_note: reason || 'Preuve non conforme.'
    })
    .eq('id', submissionId);

  return sub;
}

// ─── RÉCOMPENSES ─────────────────────────────────────────────

// Créer une récompense après validation
async function createReward(memberId, missionId, rewardType, amount, currency, description) {
  const { data, error } = await supabase
    .from('rewards')
    .insert({
      member_id: memberId,
      mission_id: missionId,
      reward_type: rewardType,
      amount: amount,
      currency: currency,
      description: description,
      status: 'pending'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Marquer une récompense comme payée
async function markRewardPaid(rewardId, txHash, adminName) {
  await supabase
    .from('rewards')
    .update({
      status: 'paid',
      tx_hash: txHash || null,
      paid_at: new Date().toISOString()
    })
    .eq('id', rewardId);
  await logAdminAction(adminName, 'pay', 'reward', rewardId,
    `Récompense ${rewardId} marquée comme payée`);
}

// ─── REFERRALS ───────────────────────────────────────────────

// Enregistrer un referral
async function createReferral(referrerId, referredTelegramId, referredName, missionId, platform) {
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referred_telegram_id: referredTelegramId,
      referred_name: referredName,
      mission_id: missionId,
      platform: platform
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Confirmer un referral avec montant de dépôt
async function confirmReferral(referralId, depositAmount, commissionEarned, tier) {
  await supabase
    .from('referrals')
    .update({
      deposit_amount: depositAmount,
      commission_earned: commissionEarned,
      txcess_tier: tier,
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    })
    .eq('id', referralId);
}

// Compter les referrals confirmés d'un membre pour une mission
async function countConfirmedReferrals(memberId, missionId) {
  const { count, error } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', memberId)
    .eq('mission_id', missionId)
    .eq('status', 'confirmed');
  if (error) throw error;
  return count || 0;
}

// ─── STATS & CONFIG ──────────────────────────────────────────

// Récupérer les stats globales de la saison
async function getSeasonStats() {
  const { data, error } = await supabase
    .from('admin_season_stats')
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Récupérer la config de la saison
async function getSeasonConfig() {
  const { data, error } = await supabase
    .from('season_config')
    .select('*');
  if (error) throw error;
  const config = {};
  (data || []).forEach(row => { config[row.key] = row.value; });
  return config;
}

// Récupérer le classement
async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from('admin_leaderboard')
    .select('*')
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ─── ADMIN LOGS ──────────────────────────────────────────────

async function logAdminAction(adminName, action, targetType, targetId, details) {
  await supabase.from('admin_logs').insert({
    admin_name: adminName,
    action,
    target_type: targetType,
    target_id: targetId,
    details
  });
}

module.exports = {
  getMember, createMember, updateLastActive, banMember,
  getMemberMissions, getMemberMission, setMissionPending, validateMission,
  createSubmission, getPendingSubmissions, approveSubmission, rejectSubmission,
  createReward, markRewardPaid,
  createReferral, confirmReferral, countConfirmedReferrals,
  getSeasonStats, getSeasonConfig, getLeaderboard,
  logAdminAction
};
