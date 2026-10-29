/**
 * Translation system: Instant Japanese Dictionary + Offline MarianMT backend.
 */

import { useState, useCallback } from 'react';
import { useApp } from './context/AppContext';
import api from './api';

// Instant Technical Engineering Dictionary for zero-latency switching
const DICTIONARY = {
  // Navigation & Core App
  'Navigation': 'ナビゲーション',
  'Main NVH Workspace': 'メインNVHワークスペース',
  'Parity Chart': 'パリティチャート',
  'Multi-Dataset Compare': '複数データセット比較',
  'Operating Mode': '動作モード',
  'Design Verification': '設計検証',
  'Target Optimization': '目標最適化',
  'Benchmark': 'ベンチマーク',
  'Load Benchmark': 'ベンチマーク読込',
  'Engineering Guide': 'エンジニアリングガイド',
  'Settings': '設定',
  'Appearance': '外観',
  'Dark Mode': 'ダークモード',
  'Toggle between light and dark themes': 'ライトテーマとダークテーマの切替',
  'Language': '言語',
  'Display Language': '表示言語',
  'Specs': '仕様',
  'Loading...': '読み込み中...',
  'Select at least 2': '2つ以上のデータセットを選択してください',
  'Select 2–4 datasets:': '2〜4個のデータセットを選択:',

  // Main NVH Workspace
  'Forward Design Verification': '順方向設計検証',
  'Enter gear geometry and load parameters:': '歯車諸元および負荷パラメータを入力:',
  'Macro-Geometry': 'マクロ諸元',
  'Normal Module mn [mm]': '正面モジュール mn [mm]',
  'Pinion Teeth z1': '小歯車 歯数 z1',
  'Wheel Teeth z2': '大歯車 歯数 z2',
  'Gear Ratio': '変速比',
  'Helix Angle β [deg]': 'ねじれ角 β [deg]',
  'Face Width b [mm]': '歯幅 b [mm]',
  'Operating Loads': '運転負荷',
  'Torque T1 [Nm]': 'トルク T1 [Nm]',
  'Speed n1 [rpm]': '回転数 n1 [rpm]',
  'Application Factor KA': '用途係数 KA',
  'Micro-Geometry & Quality': 'マイクロ諸元および品質等級',
  'Tip Relief Cα [µm]': '歯先修整 Cα [µm]',
  'Flank Crowning Cβ [µm]': 'クラウニング Cβ [µm]',
  'ISO Quality Grade Q': 'ISO精度等級 Q',
  'Predicted NVH Metrics': '予測NVH指標',
  'Shaft Misalignment (M)': '軸心狂い (M)',
  'Transmission Error (STE)': '伝達誤差 (STE)',
  'Radiated Noise (LW)': '放射音響パワーレベル (LW)',
  'Model Accuracy: CAE vs AI': 'モデル精度: CAE vs AI',
  'CAE True': 'CAE真値',
  'AI Model': 'AIモデル予測',
  'High Accuracy': '高精度',
  'Moderate Accuracy': '中精度',
  'Low Accuracy': '低精度',
  'Output Summary Table (Engineering Report Format)': '出力サマリー表 (技術レポート形式)',
  'Download CAE Sign-Off Deck (JSON)': 'CAE承認デッキ出力 (JSON)',
  'Download Output Report (Excel .xlsx)': '出力レポート出力 (Excel .xlsx)',

  // Parity Page
  '1:1 Parity Chart Comparison Between 2 Datasets': '2データセット間の1:1パリティチャート比較',
  'Select two datasets below. Each tab displays a spacious': '下記より2つのデータセットを選択してください。各タブには広々とした',
  '1:1 Parity Plot': '1:1パリティプロット',
  'with a': 'および',
  'Green High-Accuracy Zone': '緑色の高精度ゾーン',
  'on the left, paired with a': 'が左側に、そして',
  'Direct Bar Comparison': '直接バー比較',
  'on the right.': 'が右側に表示されます。',
  'Select Dataset A (Baseline / Reference)': 'データセットAの選択 (ベースライン/参照)',
  'Select Dataset B (Comparison Variant)': 'データセットBの選択 (比較バリアント)',
  '1:1 Parity Accuracy Plot': '1:1パリティ精度プロット',
  'Green Band = High Accuracy Zone': '緑色バンド = 高精度許容ゾーン',
  'Direct A vs. B Value Comparison': 'A対B 直接数値比較',
  'Benchmark CAE': 'ベンチマークCAE',
  'AI Predicted': 'AIモデル予測',
  'Executive Summary': 'エグゼクティブサマリー',
  'Model error is': 'モデル誤差:',
  'Inside Green High-Accuracy Zone': '高精度ゾーン内 (適合)',
  'Outside High-Accuracy Zone': '高精度ゾーン外 (再検討推奨)',
  'Net Design Change (A → B)': '純設計変化量 (A → B)',
  'Complete 2-Dataset Parity & Residual Summary Table': '2データセット パリティおよび残差サマリー全表',
  'NVH Target Metric': 'NVH目標指標',
  'True CAE': 'CAE真値',
  'Predicted': '予測値',
  'Error': '誤差',
  'Design Shift (B - A)': '設計シフト量 (B - A)',

  // Multi-Compare
  'Multi-Dataset Comparison': '複数データセット比較',
  'CAE': 'CAE',
  'AI': 'AI',
  'Multi-Dataset Engineering Specification & NVH Matrix': '複数データセット技術仕様およびNVHマトリクス',
  'Parameter / Metric': 'パラメータ / 指標',
  'Unit': '単位',
  'Best Performing Case': '最良性能ケース',
  'Download Comparison Matrix (Excel .xlsx)': '比較マトリクス出力 (Excel .xlsx)',
};

const cache = { ...DICTIONARY };
const pending = new Set();
let queue = [];
let queueTimer = null;
const BATCH_DELAY = 80;

function flushQueue(onUpdate) {
  if (queue.length === 0) return;
  const batch = [...new Set(queue)];
  queue = [];

  api.post('/api/translate', { texts: batch, source: 'en', target: 'ja' })
    .then(({ data }) => {
      data.translations.forEach((tr, i) => {
        cache[batch[i]] = tr;
        pending.delete(batch[i]);
      });
      onUpdate();
    })
    .catch(() => {
      batch.forEach(t => pending.delete(t));
    });
}

export function tr(langMode, en, ja) {
  if (langMode === 'ja') return ja;
  if (langMode === 'both') return `${en} / ${ja}`;
  return en;
}

export function useTranslate() {
  const { langMode } = useApp();
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  const t = useCallback((en) => {
    if (!en || typeof en !== 'string') return en || '';
    if (langMode === 'en') return en;

    // Check instant technical dictionary first
    const ja = cache[en] || DICTIONARY[en];
    if (ja !== undefined) {
      return langMode === 'both' ? `${en} / ${ja}` : ja;
    }

    // Otherwise fetch asynchronously from MarianMT backend
    if (!pending.has(en)) {
      pending.add(en);
      queue.push(en);
      clearTimeout(queueTimer);
      queueTimer = setTimeout(() => flushQueue(forceUpdate), BATCH_DELAY);
    }

    return en;
  }, [langMode, forceUpdate]);

  return t;
}

export default tr;