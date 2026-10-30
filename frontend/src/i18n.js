/**
 * Professional Automotive Engineering Translation System
 * Standardized per JSAE (Society of Automotive Engineers of Japan) and JIS B 1702/1752.
 */

import { useState, useCallback } from 'react';
import { useApp } from './context/AppContext';
import api from './api';

// Certified Automotive Gear & NVH Engineering Dictionary
const DICTIONARY = {
  // Navigation & Core Controls
  'Navigation': 'ナビゲーション',
  'Main NVH Workspace': 'メインNVH解析ワークスペース',
  'Parity Chart': 'パリティ評価チャート',
  'Multi-Dataset Compare': '複数データセット比較',
  'Operating Mode': '動作モード',
  'Design Verification': '設計検証モード (順方向予測)',
  'Target Optimization': '目標最適化モード (逆問題合成・感度解析)',
  'Benchmark': 'ベンチマークデータセット',
  'Load Benchmark': 'ベンチマーク読込',
  'Engineering Guide': '技術仕様・設計標準ガイド',
  'Settings': '環境設定',
  'Appearance': '外観表示',
  'Dark Mode': 'ダークモード',
  'Toggle between light and dark themes': 'ライトテーマとダークテーマの切り替え',
  'Language': '表示言語',
  'Display Language': 'システム言語設定',
  'Specs': '諸元仕様',
  'Loading...': '計算処理中...',
  'Select at least 2': '比較対象を2ケース以上選択してください',
  'Select 2–4 datasets to compare:': '比較するデータセットを2〜4件選択:',
  'Filter Cases': 'データセット抽出',
  'All Datasets': '全データセット',
  'Best Performers': '最良NVH成立ケース',
  'High NVH / Outliers': 'NVH悪化・限界超過ケース',

  // Macro-Geometry
  'Macro-Geometry': '歯車マクロ諸元',
  'Normal Module mn [mm]': '正面モジュール mn [mm]',
  'Normal Module (mn)': '正面モジュール (mn)',
  'Pinion Teeth z1': '小歯車 歯数 z1',
  'Pinion Teeth (z1)': '小歯車 歯数 (z1)',
  'Wheel Teeth z2': '大歯車 歯数 z2',
  'Wheel Teeth (z2)': '大歯車 歯数 (z2)',
  'Gear Ratio': '変速比 (ギヤ比)',
  'Gear Ratio (i)': '変速比 (i)',
  'Helix Angle β [deg]': 'ねじれ角 β [deg]',
  'Helix Angle (beta)': 'ねじれ角 (β)',
  'Helix Angle (β)': 'ねじれ角 (β)',
  'Face Width b [mm]': '歯幅 b [mm]',
  'Face Width (b)': '歯幅 (b)',
  'Pressure Angle (alpha)': '基準圧力角 (α)',

  // Operating Loads
  'Operating Loads': '運転荷重条件',
  'Torque T1 [Nm]': '入力トルク T1 [Nm]',
  'Input Torque (T1)': '入力トルク (T1)',
  'Torque (T1)': '入力トルク (T1)',
  'Speed n1 [rpm]': '小歯車回転数 n1 [rpm]',
  'Pinion Speed (n1)': '小歯車回転数 (n1)',
  'Speed (n1)': '小歯車回転数 (n1)',
  'Application Factor KA': '用途係数 (稼働率 KA)',
  'Application Factor (KA)': '用途係数 (KA)',

  // Micro-Geometry & Quality
  'Micro-Geometry & Quality': '歯形修整・マイクロ諸元および品質等級',
  'Tip Relief Cα [µm]': '歯先修整量 Cα [µm]',
  'Tip Relief (Calpha)': '歯先修整量 (Cα)',
  'Tip Relief (Cα)': '歯先修整量 (Cα)',
  'Flank Crowning Cβ [µm]': '歯筋クラウニング量 Cβ [µm]',
  'Flank Crowning (Cbeta)': '歯筋クラウニング量 (Cβ)',
  'Flank Crowning (Cβ)': '歯筋クラウニング量 (Cβ)',
  'ISO Quality Grade Q': 'ISO歯車精度等級 Q',
  'ISO Quality Grade (Q)': 'ISO歯車精度等級 (Q)',

  // NVH Output Metrics
  'Predicted NVH Metrics': '予測NVH評価指標',
  'Shaft Misalignment (M)': '軸心狂い・たわみ変位 (M)',
  'Transmission Error (STE)': '噛合い伝達誤差 (STE)',
  'Radiated Noise (LW)': '放射音響パワーレベル (LW)',
  'Radiated Noise Level (LW)': '放射音響パワーレベル (LW)',
  'True CAE Misalignment': 'CAE実績 軸心狂い',
  'Predicted Misalignment (M)': 'AI予測 軸心狂い (M)',
  'True CAE Trans. Error': 'CAE実績 噛合い伝達誤差',
  'Predicted Trans. Error (STE)': 'AI予測 伝達誤差 (STE)',
  'True CAE Sound Level': 'CAE実績 放射音響レベル',
  'Predicted Sound Level (LW)': 'AI予測 放射音響レベル (LW)',
  'Model Accuracy: CAE vs AI': '予測モデル精度比較: CAE実績値 vs AI予測値',
  'CAE True': 'CAE実績値',
  'AI Model': 'AIモデル予測値',

  // Derived Elements & Forces
  'Calculated Machine Element Properties': '機械力学・歯車諸元計算値',
  'Pinion Pitch Diameter (d1)': '基準円直径 d1',
  'Shaft Center Distance (a)': '軸間距離 a',
  'Tangential Tooth Contact Force (Ft)': '円周力 (接線力) Ft',
  'Specific Tooth Load (wt)': '有効かみ合い線荷重 wt',
  'Tooth Meshing Frequency (fm)': '噛合い基本周波数 fm',
  'Reference Parameter': '設計基準参照パラメータ',

  // Feasibility & Tolerance
  'Design Feasibility': '設計成立性判定',
  'Feasible': '成立 (設計限界内)',
  '✅ Feasible': '✅ 成立 (設計限界内)',
  'Exceeds Envelope': '設計限界超過 (非成立)',
  '⚠️ Exceeds Envelope': '⚠️ 設計限界超過 (非成立)',
  'Exceeds Bounds': '設計許容範囲外 (限界超過)',
  '⚠️ Exceeds Bounds': '⚠️ 設計許容範囲外 (限界超過)',
  'Within Tolerance': '許容公差内 (適合)',
  '✅ Within Tolerance': '✅ 許容公差内 (適合)',
  'Out of Tolerance': '公差超過 (不適合)',
  '❌ Out of Tolerance': '❌ 公差超過 (不適合)',

  // Target Optimization & Unified Sensitivity Table
  'Target Optimization Mode: Gear Design Synthesis & Sensitivity Analysis': '目標最適化モード: 諸元逆合成解析 & 感度トレードオフ分析',
  'Analyze parameter sensitivities to NVH targets or synthesize gear geometry directly from desired NVH performance values.': 'NVH目標性能に対するパラメータ感度を解析し、目標値から最適な諸元を逆算・合成します。',
  'Sensitivity Analysis & Trade-Offs': '感度解析 & パラメータトレードオフ',
  'Direct Gear Synthesis (Target NVH → Gear Design)': '諸元直接逆合成 (目標NVH → 最適諸元)',
  'Reference Baseline Configuration': '基準ベースライン設定',
  'Reset to Workspace Prediction': 'ワークスペース計算値にリセット',
  '✏️ Edit Baseline Values': '✏️ 基準値を直接手入力編集',
  'Baseline Misalignment (M)': '基準 軸心狂い (M)',
  'Baseline STE': '基準 噛合い伝達誤差 (STE)',
  'Baseline Noise (LW)': '基準 放射音響レベル (LW)',
  'Target Misalignment Delta (ΔM) [µm]': '目標 軸心狂い変化量 (ΔM) [µm]',
  'Target STE Delta (ΔSTE) [µm]': '目標 噛合い伝達誤差変化量 (ΔSTE) [µm]',
  'Target Noise Delta (ΔLW) [dB]': '目標 放射音響レベル変化量 (ΔLW) [dB]',
  'Set to 0.0 to keep Misalignment unchanged': '変化させない場合は 0.0 に設定',
  'Set to 0.0 to keep Transmission Error unchanged': '変化させない場合は 0.0 に設定',
  'Set to 0.0 to keep Sound Power Level unchanged': '変化させない場合は 0.0 に設定',
  'Run Sensitivity Analysis': '感度トレードオフ解析を実行',
  'Computing Sensitivities...': '感度行列・最適解を計算中...',

  // Unified Table Headers
  'Automotive NVH Target Trade-Off & Parameter Sensitivity Matrix': '自動車用ギヤ NVH目標トレードオフ & パラメータ感度統合マトリクス',
  'Design Parameter': '設計パラメータ',
  'Baseline Value': '基準値 (ベースライン)',
  'Valid Design Envelope': '設計許容エンベロープ [最小 – 最大]',
  'Coupled NVH Mechanism': '物理的連成メカニズム (作用機構)',
  'Sensitivity (∂Y/∂X)': '局所感度 (∂Y/∂X)',
  'Required Shift (Δ)': '必要シフト量 (Δ)',
  'Relative Change (%)': '相対変化率 (%)',
  'Recommended Target Value': '推奨設計変更目標値',
  'Engineering Impact Summary': 'エンジニアリング影響サマリー',
  'Directly governs specific line load wt and shaft span deflection resistance': '線荷重wtおよび軸曲げ剛性に直接影響し軸の傾きを抑制',
  'Compensates for longitudinal tooth end-loading and misalignment tilt': '軸の傾きによる歯端当たりを補正し偏当たりを解消',
  'Eliminates corner contact impact during meshing entry under torsional deflection': '歯のたわみによる噛合い入り口での角当たり衝突を排除',
  'Increases contact ratio (overlap) to damp high-frequency acoustic radiation': '全かみ合い率を高めて荷重分散を行い高周波音を低減',
  'Source of tangential tooth force Ft causing bending and housing deflection': '接線力Ftの発生源であり軸・ケーシングの弾性変形を左右',
  'Governs fundamental mesh excitation frequency fm = (n1 × z1) / 60': '噛合い基本周波数fm=(n1×z1)/60を決定し共鳴音を励起',
  'Fundamental tooth size; alters tooth compliance and bending stiffness': '基本歯形寸法であり歯のコンプライアンスと曲げ剛性を決定',
  'Discrete gear kinematic constraint; sets mesh frequency and contact ratio': '噛合い周波数と正面かみ合い率を規定する離散的歯数制約',
  'Discrete driven tooth count; locks center distance and overall ratio i': '減速比と軸間距離を決定する離散的大歯車歯数',
  'Service overload allowance factor accounting for drivetrain shock ripples': '駆動系の衝撃トルク・ねじり振動余裕度を示す過負荷係数',
  'Flank tolerance band (ISO 1328); lower grade reduces cumulative pitch error': 'ISO 1328精度等級。高精度(低等級)ほど累積ピッチ誤差が減少',
  'Governs radial separating force and contact pressure distribution along involute': 'インボリュート接触圧力とラジアル分離力比率を支配',

  // Reports and Exports
  'Output Summary Table (Engineering Report Format)': '出力判定サマリーテーブル (CAE検証レポート形式)',
  'Download CAE Sign-Off Deck (JSON)': 'CAE承認デッキ出力 (JSON)',
  'Download Output Report (Excel .xlsx)': 'CAE技術評価レポート出力 (Excel .xlsx)',
  'Download Comparison Matrix (Excel .xlsx)': '比較検証マトリクス出力 (Excel .xlsx)',
  'Save as Benchmark Case': '新規ベンチマークとして永続保存',
  'Saving...': '保存処理中...',

  // Parity Page
  '1:1 Parity Chart Comparison Between 2 Datasets': '2データセット間の1:1パリティ精度検証チャート',
  'Select Dataset A (Baseline / Reference)': 'データセットAの選択 (ベースライン / 参照基準)',
  'Select Dataset B (Comparison Variant)': 'データセットBの選択 (比較設計案)',
  '1:1 Parity Accuracy Plot': '1:1パリティ精度プロット',
  'Green Band = High Accuracy Zone': '緑色バンド = 高精度合致ゾーン (許容誤差域)',
  'Direct A vs. B Value Comparison': 'A案 vs B案 設計値直接比較',
  'Executive Summary': '検証エグゼクティブサマリー',
  'Complete 2-Dataset Parity & Residual Summary Table': '2データセット パリティ・残差検証サマリー全表',
};

const cache = { ...DICTIONARY };
const pending = new Set();
let queue = [];
let queueTimer = null;
const BATCH_DELAY = 60;

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

    const trimmed = en.trim();
    // Prioritize certified dictionary
    const ja = cache[trimmed] || DICTIONARY[trimmed];
    if (ja !== undefined) {
      return langMode === 'both' ? `${trimmed} / ${ja}` : ja;
    }

    // Secondary fallback: offline MarianMT batch queue
    if (!pending.has(trimmed)) {
      pending.add(trimmed);
      queue.push(trimmed);
      clearTimeout(queueTimer);
      queueTimer = setTimeout(() => flushQueue(forceUpdate), BATCH_DELAY);
    }

    return en;
  }, [langMode, forceUpdate]);

  return t;
}

export default tr;