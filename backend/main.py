"""NVH Helix Gear Project - FastAPI Backend"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import GradientBoostingRegressor
from scipy.optimize import minimize
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import io
from translator import translate, translate_batch

app = FastAPI(title="NVH Helix Gear API", version="6.4")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Data & Model Loading
# ---------------------------------------------------------------------------
IGNORE_COLS = ['id', 'Sound', 'Mtrue', 'TEtrue', 'Mhat_v01', 'TEhat_v01', 'Soundhat_v01', 'Mat']

df: pd.DataFrame = None
df_eval: pd.DataFrame = None
feature_cols: list = None
model_M = None
model_TE = None
model_Sound = None


def init_engine():
    global df, df_eval, feature_cols, model_M, model_TE, model_Sound
    df = pd.read_csv("data/SYNTHETIC_DATASET_100_CLEANED.csv")
    feature_cols = [c for c in df.columns if c not in IGNORE_COLS]
    X = df[feature_cols]

    model_M = GradientBoostingRegressor(n_estimators=100, max_depth=3, learning_rate=0.08, random_state=42)
    model_M.fit(X, df['Mtrue'])

    model_TE = Pipeline([('scaler', StandardScaler()), ('reg', Ridge(alpha=5.0))])
    model_TE.fit(X, df['TEtrue'])

    model_Sound = Pipeline([('scaler', StandardScaler()), ('reg', Ridge(alpha=5.0))])
    model_Sound.fit(X, df['Sound'])

    df_eval = df.copy()
    df_eval['Pred_M'] = model_M.predict(X)
    df_eval['Pred_STE'] = model_TE.predict(X)
    df_eval['Pred_Sound'] = model_Sound.predict(X)


@app.on_event("startup")
def startup():
    init_engine()


# ---------------------------------------------------------------------------
# Physics helpers
# ---------------------------------------------------------------------------
def calc_physics(inputs: dict) -> dict:
    mn = float(inputs['mn'])
    z1 = int(inputs['z1'])
    z2 = int(inputs['z2'])
    beta_rad = np.radians(float(inputs['beta']))
    alpha_n_rad = np.radians(float(inputs.get('alpha', 20.0)))
    alpha_t_rad = np.arctan(np.tan(alpha_n_rad) / np.cos(beta_rad))
    b = float(inputs['b'])
    T1 = float(inputs['T1'])
    n1 = float(inputs['n1'])

    d1 = (mn * z1) / np.cos(beta_rad)
    d2 = (mn * z2) / np.cos(beta_rad)
    a = (d1 + d2) / 2.0
    v = (np.pi * d1 * n1) / 60000.0
    Ft = (2000.0 * T1) / d1
    cos_beta_b = np.cos(beta_rad) * np.cos(alpha_t_rad) / np.cos(alpha_n_rad)
    wt = Ft / (b * cos_beta_b)
    fm = (n1 * z1) / 60.0

    res = dict(inputs)
    res.update({
        'd1_mm': d1, 'd2_mm': d2, 'a': a, 'v_mps': v,
        'Ft_N': Ft, 'wt_N_per_mm': wt, 'fm_Hz': fm,
    })
    return res


def predict_from_inputs(inputs: dict, template_id: Optional[int] = None):
    phys = calc_physics(inputs)
    template_idx = 0
    if template_id is not None:
        match_idx = df.index[df['id'] == template_id].tolist()
        template_idx = match_idx[0] if match_idx else 0

    sample = df[feature_cols].iloc[template_idx].copy()
    for k, v in phys.items():
        if k in sample.index:
            sample[k] = v
    X_eval = pd.DataFrame([sample])
    m = float(model_M.predict(X_eval)[0])
    te = float(model_TE.predict(X_eval)[0])
    s = float(model_Sound.predict(X_eval)[0])
    return m, te, s, phys


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class DesignInput(BaseModel):
    mn: float
    z1: int
    z2: int
    beta: float
    b: float
    T1: float
    n1: float
    K_A: float = 1.13
    Calpha: float = 10.0
    Cbeta: float = 8.0
    Q: int = 5
    alpha: float = 20.0
    i: Optional[float] = None
    template_id: Optional[int] = None


class OptimizationTargets(BaseModel):
    target_M: float = 35.0
    target_TE: float = 1.1
    target_Sound: float = 54.0


class SensitivityRequest(BaseModel):
    inputs: DesignInput
    delta_M: float = 0.0
    delta_TE: float = 0.0
    delta_Sound: float = 0.0
    custom_baseline_M: Optional[float] = None
    custom_baseline_TE: Optional[float] = None
    custom_baseline_Sound: Optional[float] = None


class AddCaseRequest(BaseModel):
    params: DesignInput
    targets: Optional[dict] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/dataset")
def get_dataset():
    """Return full evaluated dataset."""
    return df_eval.to_dict(orient="records")


@app.get("/api/case/{case_id}")
def get_case(case_id: int):
    """Return a single benchmark case input parameters + targets."""
    row = df[df['id'] == case_id]
    if row.empty:
        return {"error": "Case not found"}
    r = row.iloc[0]
    return {
        "params": {
            "mn": float(r['mn']), "z1": int(r['z1']), "z2": int(r['z2']),
            "i": float(r['i']), "beta": float(r['beta']), "b": float(r['b']),
            "T1": float(r['T1']), "n1": float(r['n1']), "K_A": float(r['K_A']),
            "Calpha": float(r['Calpha']), "Cbeta": float(r['Cbeta']), "Q": int(r['Q']),
        },
        "targets": {
            "id": int(r['id']),
            "Mtrue": float(r['Mtrue']),
            "TEtrue": float(r['TEtrue']),
            "Sound": float(r['Sound']),
        }
    }


@app.post("/api/case/add")
def add_case(req: AddCaseRequest):
    """Dynamically & permanently add a new benchmark case (e.g. #101) to CSV and memory."""
    global df, df_eval
    
    d = req.params.model_dump()
    if d.get('i') is None:
        d['i'] = round(d['z2'] / d['z1'], 2)
    
    m, te, s, phys = predict_from_inputs(d, template_id=req.params.template_id)
    next_id = int(df['id'].max()) + 1 if not df.empty else 1
    
    new_row = dict(phys)
    new_row['id'] = next_id
    
    if req.targets:
        new_row['Mtrue'] = float(req.targets.get('Mtrue', m))
        new_row['TEtrue'] = float(req.targets.get('TEtrue', te))
        new_row['Sound'] = float(req.targets.get('Sound', s))
    else:
        new_row['Mtrue'] = round(m, 2)
        new_row['TEtrue'] = round(te, 3)
        new_row['Sound'] = round(s, 2)
        
    new_row['Pred_M'] = round(m, 4)
    new_row['Pred_STE'] = round(te, 4)
    new_row['Pred_Sound'] = round(s, 4)
    new_row['created_at'] = datetime.utcnow().isoformat()
    
    row_df = pd.DataFrame([new_row])
    for col in df.columns:
        if col not in row_df.columns:
            row_df[col] = df[col].iloc[0] if not df.empty else 0
    row_df = row_df[df.columns]
    
    df = pd.concat([df, row_df], ignore_index=True)
    
    eval_row = row_df.copy()
    eval_row['Pred_M'] = round(m, 4)
    eval_row['Pred_STE'] = round(te, 4)
    eval_row['Pred_Sound'] = round(s, 4)
    df_eval = pd.concat([df_eval, eval_row], ignore_index=True)
    
    csv_path = "data/SYNTHETIC_DATASET_100_CLEANED.csv"
    df.to_csv(csv_path, index=False)
    
    return {
        "status": "success",
        "message": f"Case #{next_id} added successfully",
        "id": next_id,
        "case": {
            "params": d,
            "targets": {
                "id": next_id,
                "Mtrue": new_row['Mtrue'],
                "TEtrue": new_row['TEtrue'],
                "Sound": new_row['Sound']
            }
        }
    }


@app.post("/api/predict")
def predict(inp: DesignInput):
    """Forward prediction: gear inputs -> NVH outputs."""
    d = inp.model_dump()
    if d.get('i') is None:
        d['i'] = round(d['z2'] / d['z1'], 2)
    m, te, s, phys = predict_from_inputs(d, template_id=inp.template_id)
    return {
        "M": round(m, 4),
        "STE": round(te, 4),
        "Sound": round(s, 4),
        "physics": {k: round(float(v), 4) if isinstance(v, (float, np.floating)) else v
                    for k, v in phys.items()},
    }


@app.post("/api/optimize")
def optimize(targets: OptimizationTargets):
    """Inverse optimization: target NVH -> gear geometry."""
    bounds = [
        (1.5, 3.5), (17.0, 25.0), (15.0, 24.0), (20.0, 50.0),
        (6.0, 18.0), (6.0, 13.0), (20.0, 200.0), (8000.0, 15000.0), (3.5, 8.5)
    ]
    x0 = [2.2, 20.0, 19.0, 32.0, 11.0, 9.0, 80.0, 12000.0, 5.5]

    def obj(x):
        mn_v, z1_v, beta_v, b_v, ca_v, cb_v, t1_v, n1_v, i_v = x
        z1_int = int(round(z1_v))
        z2_int = int(round(z1_int * i_v))
        inp = {
            'mn': mn_v, 'z1': z1_int, 'z2': z2_int, 'beta': beta_v, 'alpha': 20.0,
            'b': b_v, 'T1': t1_v, 'n1': n1_v, 'i': i_v, 'Calpha': ca_v, 'Cbeta': cb_v,
            'Q': 5, 'K_A': 1.13
        }
        m, te, s, _ = predict_from_inputs(inp)
        return (m - targets.target_M)**2 + (te - targets.target_TE)**2 * 500.0 + (s - targets.target_Sound)**2 * 5.0

    res = minimize(obj, x0, method='L-BFGS-B', bounds=bounds)
    mn_o, z1_o, beta_o, b_o, ca_o, cb_o, t1_o, n1_o, i_o = res.x
    z1_fo = int(round(z1_o))
    z2_fo = int(round(z1_fo * i_o))
    calc_ratio = round(z2_fo / z1_fo, 2)

    opt_inputs = {
        'mn': round(mn_o, 2), 'z1': z1_fo, 'z2': z2_fo, 'beta': round(beta_o, 1),
        'alpha': 20.0, 'b': round(b_o, 1), 'T1': round(t1_o, 1), 'n1': round(n1_o, 1),
        'i': calc_ratio, 'Calpha': round(ca_o, 1), 'Cbeta': round(cb_o, 1), 'Q': 5, 'K_A': 1.13
    }
    m_fo, te_fo, s_fo, phys_fo = predict_from_inputs(opt_inputs)

    return {
        "optimized_params": opt_inputs,
        "achieved": {"M": round(m_fo, 2), "STE": round(te_fo, 3), "Sound": round(s_fo, 2)},
        "physics": {k: round(float(v), 4) if isinstance(v, (float, np.floating)) else v
                    for k, v in phys_fo.items()},
    }


@app.post("/api/sensitivity")
def sensitivity(req: SensitivityRequest):
    """
    Unified 12-Parameter Sensitivity Analysis & Trade-Off Matrix.
    Provides verified engineering envelopes and explicit physics coupling mechanisms.
    """
    d = req.inputs.model_dump()
    if d.get('i') is None:
        d['i'] = round(d['z2'] / d['z1'], 2)
    
    calc_m, calc_te, calc_s, _ = predict_from_inputs(d, template_id=req.inputs.template_id)
    
    base_m = req.custom_baseline_M if req.custom_baseline_M is not None else calc_m
    base_te = req.custom_baseline_TE if req.custom_baseline_TE is not None else calc_te
    base_s = req.custom_baseline_Sound if req.custom_baseline_Sound is not None else calc_s

    # Complete 12-parameter technical registry
    sens_defs = [
        {
            'param': 'Face Width (b)', 'key': 'b', 'unit': 'mm', 'step': 1.5,
            'bounds': (15.0, 70.0), 'is_discrete': False, 'target_for_action': 'M',
            'coupling': 'Directly governs specific line load wt and shaft span deflection resistance'
        },
        {
            'param': 'Flank Crowning (Cbeta)', 'key': 'Cbeta', 'unit': 'µm', 'step': 1.0,
            'bounds': (2.0, 25.0), 'is_discrete': False, 'target_for_action': 'STE',
            'coupling': 'Compensates for longitudinal tooth end-loading and misalignment tilt'
        },
        {
            'param': 'Tip Relief (Calpha)', 'key': 'Calpha', 'unit': 'µm', 'step': 1.0,
            'bounds': (2.0, 25.0), 'is_discrete': False, 'target_for_action': 'STE',
            'coupling': 'Eliminates corner contact impact during meshing entry under torsional deflection'
        },
        {
            'param': 'Helix Angle (beta)', 'key': 'beta', 'unit': 'deg', 'step': 1.0,
            'bounds': (10.0, 45.0), 'is_discrete': False, 'target_for_action': 'Noise',
            'coupling': 'Increases contact ratio (overlap) to damp high-frequency acoustic radiation'
        },
        {
            'param': 'Input Torque (T1)', 'key': 'T1', 'unit': 'Nm', 'step': 5.0,
            'bounds': (10.0, 350.0), 'is_discrete': False, 'target_for_action': 'M',
            'coupling': 'Source of tangential tooth force Ft causing bending and housing deflection'
        },
        {
            'param': 'Pinion Speed (n1)', 'key': 'n1', 'unit': 'rpm', 'step': 200.0,
            'bounds': (3000.0, 18000.0), 'is_discrete': False, 'target_for_action': 'Noise',
            'coupling': 'Governs fundamental mesh excitation frequency fm = (n1 × z1) / 60'
        },
        {
            'param': 'Normal Module (mn)', 'key': 'mn', 'unit': 'mm', 'step': 0.10,
            'bounds': (1.0, 5.0), 'is_discrete': False, 'target_for_action': 'STE',
            'coupling': 'Fundamental tooth size; alters tooth compliance and bending stiffness'
        },
        {
            'param': 'Pinion Teeth (z1)', 'key': 'z1', 'unit': 'teeth', 'step': 1.0,
            'bounds': (14, 45), 'is_discrete': True, 'target_for_action': 'STE',
            'coupling': 'Discrete gear kinematic constraint; sets mesh frequency and contact ratio'
        },
        {
            'param': 'Wheel Teeth (z2)', 'key': 'z2', 'unit': 'teeth', 'step': 1.0,
            'bounds': (50, 180), 'is_discrete': True, 'target_for_action': 'STE',
            'coupling': 'Discrete driven tooth count; locks center distance and overall ratio i'
        },
        {
            'param': 'Application Factor (KA)', 'key': 'K_A', 'unit': '', 'step': 0.05,
            'bounds': (1.0, 2.0), 'is_discrete': False, 'target_for_action': 'M',
            'coupling': 'Service overload allowance factor accounting for drivetrain shock ripples'
        },
        {
            'param': 'ISO Quality Grade (Q)', 'key': 'Q', 'unit': 'grade', 'step': 1.0,
            'bounds': (4, 10), 'is_discrete': True, 'target_for_action': 'STE',
            'coupling': 'Flank tolerance band (ISO 1328); lower grade reduces cumulative pitch error'
        },
        {
            'param': 'Pressure Angle (alpha)', 'key': 'alpha', 'unit': 'deg', 'step': 1.0,
            'bounds': (14.5, 25.0), 'is_discrete': False, 'target_for_action': 'STE',
            'coupling': 'Governs radial separating force and contact pressure distribution along involute'
        },
    ]

    tradeoff_rows = []

    for s in sens_defs:
        k = s['key']
        cur_val = float(d.get(k, 20.0 if k == 'alpha' else 1.0))
        inp_pert = dict(d)
        inp_pert[k] = cur_val + s['step']
        if s['is_discrete']:
            inp_pert[k] = int(round(inp_pert[k]))
            
        m_p, te_p, s_p, _ = predict_from_inputs(inp_pert, template_id=req.inputs.template_id)
        dM = (m_p - calc_m) / s['step']
        dTE = (te_p - calc_te) / s['step']
        dS = (s_p - calc_s) / s['step']

        # Map to active target metric
        target_name = s['target_for_action']
        if target_name == 'M':
            req_delta = req.delta_M
            deriv = dM
            target_metric_label = f"Shaft Misalignment (ΔM = {req.delta_M:+.2f} µm)" if req.delta_M != 0 else "Shaft Misalignment (ΔM = 0.00 — Unchanged)"
            is_active = (req.delta_M != 0)
            sens_val = dM
            sens_unit_str = f"µm/{s['unit']}" if s['unit'] else "µm/unit"
        elif target_name == 'STE':
            req_delta = req.delta_TE
            deriv = dTE
            target_metric_label = f"Transmission Error (ΔSTE = {req.delta_TE:+.2f} µm)" if req.delta_TE != 0 else "Transmission Error (ΔSTE = 0.00 — Unchanged)"
            is_active = (req.delta_TE != 0)
            sens_val = dTE
            sens_unit_str = f"µm/{s['unit']}" if s['unit'] else "µm/unit"
        else:
            req_delta = req.delta_Sound
            deriv = dS
            target_metric_label = f"Sound Power Level (ΔLW = {req.delta_Sound:+.2f} dB)" if req.delta_Sound != 0 else "Sound Power Level (ΔLW = 0.00 — Unchanged)"
            is_active = (req.delta_Sound != 0)
            sens_val = dS
            sens_unit_str = f"dB/{s['unit']}" if s['unit'] else "dB/unit"

        b_min, b_max = s['bounds']
        range_str = f"{b_min} – {b_max} {s['unit']}".strip()

        # Shift computation with discrete bounds protection
        if is_active and abs(deriv) > 1e-5:
            req_shift = req_delta / deriv
            new_val = cur_val + req_shift
            
            # For discrete teeth/grades, check viability
            if s['is_discrete']:
                req_shift = round(req_shift)
                new_val = int(round(new_val))
                
            pct_change = (req_shift / cur_val * 100.0) if cur_val != 0 else 0.0
            is_feasible = (b_min <= new_val <= b_max)
        else:
            req_shift = 0.0 if not is_active else None
            pct_change = 0.0 if not is_active else None
            new_val = cur_val
            is_feasible = True

        tradeoff_rows.append({
            'param': s['param'],
            'key': k,
            'current': cur_val,
            'unit': s['unit'],
            'envelope': range_str,
            'coupling': s['coupling'],
            'target_metric': target_metric_label,
            'is_target_active': is_active,
            'sensitivity': round(sens_val, 4),
            'sens_unit': sens_unit_str,
            'req_shift': round(req_shift, 3) if req_shift is not None else None,
            'pct_change': round(pct_change, 2) if pct_change is not None else None,
            'new_value': round(new_val, 3) if not s['is_discrete'] else int(new_val),
            'feasible': is_feasible,
            # Derivative details for multi-target inspection
            'sens_M': round(dM, 4),
            'sens_TE': round(dTE, 4),
            'sens_Sound': round(dS, 4),
        })

    return {
        "baseline": {"M": round(base_m, 2), "STE": round(base_te, 3), "Sound": round(base_s, 2)},
        "rows": tradeoff_rows,
    }


@app.get("/api/parity/{case_a_id}/{case_b_id}")
def parity_data(case_a_id: int, case_b_id: int):
    """Return data for parity chart comparison."""
    row_a = df_eval[df_eval['id'] == case_a_id]
    row_b = df_eval[df_eval['id'] == case_b_id]
    if row_a.empty or row_b.empty:
        return {"error": "Case not found"}

    all_data = df_eval[['id', 'Mtrue', 'Pred_M', 'TEtrue', 'Pred_STE', 'Sound', 'Pred_Sound']].to_dict(orient='records')

    def row_to_dict(r):
        r = r.iloc[0]
        return {c: float(r[c]) if isinstance(r[c], (float, np.floating)) else int(r[c])
                for c in ['id', 'Mtrue', 'Pred_M', 'TEtrue', 'Pred_STE', 'Sound', 'Pred_Sound']}

    return {
        "case_a": row_to_dict(row_a),
        "case_b": row_to_dict(row_b),
        "all_data": all_data,
    }


@app.get("/api/multi-compare")
def multi_compare(ids: str):
    """Return data for multi-dataset comparison with physics-computed fields."""
    id_list = [int(x) for x in ids.split(",")]
    sub = df_eval[df_eval['id'].isin(id_list)].copy()
    sub['sort_order'] = sub['id'].apply(lambda x: id_list.index(x))
    sub = sub.sort_values('sort_order')
    records = sub.to_dict(orient='records')
    for rec in records:
        phys = calc_physics(rec)
        rec['Ft_N'] = round(phys['Ft_N'], 1)
        rec['wt_N_per_mm'] = round(phys['wt_N_per_mm'], 1)
        rec['fm_Hz'] = round(phys['fm_Hz'], 1)
        rec['a_mm'] = round(phys['a'], 1)
        rec['d1_mm'] = round(phys['d1_mm'], 1)
    return records


@app.get("/api/export/multi-compare-excel")
def export_multi_compare_excel(ids: str):
    """Generate Multi-Dataset Comparison Matrix as Excel .xlsx."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

    id_list = [int(x) for x in ids.split(",")]
    sub = df_eval[df_eval['id'].isin(id_list)].copy()
    sub['sort_order'] = sub['id'].apply(lambda x: id_list.index(x))
    sub = sub.sort_values('sort_order')
    records = sub.to_dict(orient='records')
    for rec in records:
        phys = calc_physics(rec)
        rec['Ft_N'] = round(phys['Ft_N'], 1)
        rec['wt_N_per_mm'] = round(phys['wt_N_per_mm'], 1)
        rec['fm_Hz'] = round(phys['fm_Hz'], 1)
        rec['a_mm'] = round(phys['a'], 1)
        rec['d1_mm'] = round(phys['d1_mm'], 1)

    param_rows = [
        ('Normal Module (mn)', 'mm', 'mn', 2, None),
        ('Pinion Teeth (z1)', 'teeth', 'z1', 0, None),
        ('Wheel Teeth (z2)', 'teeth', 'z2', 0, None),
        ('Gear Ratio (i)', 'ratio', 'i', 2, None),
        ('Helix Angle (β)', 'deg', 'beta', 1, None),
        ('Face Width (b)', 'mm', 'b', 1, None),
        ('Torque (T1)', 'Nm', 'T1', 1, None),
        ('Speed (n1)', 'rpm', 'n1', 0, None),
        ('Tip Relief (Cα)', 'µm', 'Calpha', 1, None),
        ('Flank Crowning (Cβ)', 'µm', 'Cbeta', 1, None),
        ('ISO Quality Grade (Q)', 'grade', 'Q', 0, None),
        ('Tangential Force (Ft)', 'N', 'Ft_N', 1, None),
        ('Specific Line Load (wt)', 'N/mm', 'wt_N_per_mm', 1, None),
        ('Mesh Frequency (fm)', 'Hz', 'fm_Hz', 1, None),
        ('True CAE Misalignment', 'µm', 'Mtrue', 2, 'min'),
        ('Predicted Misalignment (M)', 'µm', 'Pred_M', 2, 'min'),
        ('True CAE Trans. Error', 'µm', 'TEtrue', 3, 'min'),
        ('Predicted Trans. Error (STE)', 'µm', 'Pred_STE', 3, 'min'),
        ('True CAE Sound Level', 'dB', 'Sound', 2, 'min'),
        ('Predicted Sound Level (LW)', 'dB', 'Pred_Sound', 2, 'min'),
    ]

    wb = Workbook()
    ws = wb.active
    ws.title = 'Comparison Matrix'

    headers = ['', 'Parameter / Metric', 'Unit'] + [f'Case #{r["id"]}' for r in records] + ['Best Performing Case']
    header_fill = PatternFill(start_color='1F4E79', end_color='1F4E79', fill_type='solid')
    header_font = Font(bold=True, color='FFFFFF', size=11)
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin'))

    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', wrap_text=True)
        cell.border = thin_border

    for r_idx, (name, unit, key, fmt, best_mode) in enumerate(param_rows, 2):
        ws.cell(row=r_idx, column=1, value=r_idx - 2).border = thin_border
        ws.cell(row=r_idx, column=2, value=name).border = thin_border
        ws.cell(row=r_idx, column=3, value=unit).border = thin_border
        vals = []
        for c_idx, rec in enumerate(records, 4):
            v = rec.get(key)
            cell = ws.cell(row=r_idx, column=c_idx, value=round(float(v), fmt) if v is not None else '—')
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center')
            if v is not None:
                vals.append((float(v), rec['id']))
        best_cell = ws.cell(row=r_idx, column=len(records) + 4)
        best_cell.border = thin_border
        best_cell.alignment = Alignment(horizontal='center')
        if best_mode and vals:
            best_val, best_id = min(vals, key=lambda x: x[0]) if best_mode == 'min' else max(vals, key=lambda x: x[0])
            best_cell.value = f'🏆 Case #{best_id} ({best_val:.{fmt}f} {unit})'
        else:
            best_cell.value = '—'

    col_widths = [5, 35, 10] + [18] * len(records) + [30]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[chr(64 + i) if i <= 26 else 'A' + chr(64 + i - 26)].width = w

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=HONDA_NVH_COMPARISON_MATRIX.xlsx'}
    )


@app.post("/api/export/json")
def export_json(inp: DesignInput):
    """Generate CAE sign-off deck JSON."""
    d = inp.model_dump()
    if d.get('i') is None:
        d['i'] = round(d['z2'] / d['z1'], 2)
    m, te, s, phys = predict_from_inputs(d, template_id=inp.template_id)

    deck = {
        "macro_geometry": {
            "mn_mm": d['mn'], "z1_pinion": d['z1'], "z2_wheel": d['z2'],
            "gear_ratio": d['i'], "beta_deg": d['beta'], "b_mm": d['b'],
            "center_distance_mm": round(phys['a'], 2)
        },
        "micro_geometry": {"Calpha_um": d['Calpha'], "Cbeta_um": d['Cbeta'], "ISO_quality_grade_Q": d['Q']},
        "operating_loads": {
            "T1_Nm": d['T1'], "n1_rpm": d['n1'],
            "Ft_N": round(phys['Ft_N'], 2), "wt_N_mm": round(phys['wt_N_per_mm'], 2)
        },
        "predicted_nvh": {"misalignment_um": round(m, 2), "STE_um": round(te, 3), "sound_power_dB": round(s, 2)},
    }
    return deck


@app.post("/api/export/excel")
def export_excel(inp: DesignInput):
    """Generate NVH Output Report as Excel .xlsx."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

    d = inp.model_dump()
    if d.get('i') is None:
        d['i'] = round(d['z2'] / d['z1'], 2)
    m, te, s, phys = predict_from_inputs(d, template_id=inp.template_id)

    tid = inp.template_id or 1
    row = df[df['id'] == tid]
    if not row.empty:
        r = row.iloc[0]
        tM, tTE, tS = float(r['Mtrue']), float(r['TEtrue']), float(r['Sound'])
    else:
        tM, tTE, tS = 0.0, 0.0, 0.0

    diffM, diffTE, diffS = m - tM, te - tTE, s - tS
    pctM = (diffM / tM * 100) if tM else 0
    pctTE = (diffTE / tTE * 100) if tTE else 0
    pctS = (diffS / tS * 100) if tS else 0

    rows_data = [
        [0, 'Vibration & Acoustic Response', 'Shaft Misalignment (M)', f'{tM:.2f}', f'{m:.2f}', f'{diffM:.2f}', f'{abs(pctM):.2f}%', 'µm', '✅ Within Tolerance' if 20 <= m <= 100 else '❌ Out of Tolerance'],
        [1, 'Vibration & Acoustic Response', 'Dynamic Transmission Error (STE)', f'{tTE:.3f}', f'{te:.3f}', f'{diffTE:.3f}', f'{abs(pctTE):.2f}%', 'µm', '✅ Within Tolerance' if 0.5 <= te <= 2.5 else '❌ Out of Tolerance'],
        [2, 'Vibration & Acoustic Response', 'Radiated Noise Level (LW)', f'{tS:.2f}', f'{s:.2f}', f'{diffS:.2f}', f'{abs(pctS):.2f}%', 'dB', '✅ Within Tolerance' if 50 <= s <= 70 else '❌ Out of Tolerance'],
        [3, 'Calculated Machine Element Properties', 'Pinion Pitch Diameter (d1)', f'{phys["d1_mm"]:.2f}', f'{phys["d1_mm"]:.2f}', '0.00', '0.00%', 'mm', 'Reference Parameter'],
        [4, 'Calculated Machine Element Properties', 'Shaft Center Distance (a)', f'{phys["a"]:.2f}', f'{phys["a"]:.2f}', '0.00', '0.00%', 'mm', 'Reference Parameter'],
        [5, 'Calculated Machine Element Properties', 'Tangential Tooth Contact Force (Ft)', f'{phys["Ft_N"]:.2f}', f'{phys["Ft_N"]:.2f}', '0.00', '0.00%', 'N', 'Reference Parameter'],
        [6, 'Calculated Machine Element Properties', 'Specific Tooth Load (wt)', f'{phys["wt_N_per_mm"]:.2f}', f'{phys["wt_N_per_mm"]:.2f}', '0.00', '0.00%', 'N/mm', 'Reference Parameter'],
        [7, 'Calculated Machine Element Properties', 'Tooth Meshing Frequency (fm)', f'{phys["fm_Hz"]:.1f}', f'{phys["fm_Hz"]:.1f}', '0.0', '0.00%', 'Hz', 'Reference Parameter'],
    ]

    wb = Workbook()
    ws = wb.active
    ws.title = 'NVH Output Report'

    headers = ['#', 'Parameter Classification', 'Engineering Parameter', 'Benchmark CAE Value',
               'Model Predicted Value', 'Difference (Δ)', 'Relative Deviation (%)', 'Unit', 'Design Feasibility']
    header_fill = PatternFill(start_color='1F4E79', end_color='1F4E79', fill_type='solid')
    header_font = Font(bold=True, color='FFFFFF', size=11)
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin'))

    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', wrap_text=True)
        cell.border = thin_border

    for r_idx, row_data in enumerate(rows_data, 2):
        for c_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center' if c_idx in (1, 7, 8) else 'left', wrap_text=True)

    col_widths = [5, 38, 40, 22, 24, 18, 22, 10, 24]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[chr(64 + i)].width = w

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=HONDA_NVH_OUTPUT_REPORT.xlsx'}
    )


@app.get("/api/case-ids")
def case_ids():
    """
    Return all case IDs with their 6 primary input parameters and NVH performance tier.
    Composite NVH Penalty: J_NVH = 0.30*M_norm + 0.40*STE_norm + 0.30*Sound_norm
    """
    cols = ['id', 'mn', 'z1', 'z2', 'beta', 'b', 'T1', 'n1', 'Mtrue', 'TEtrue', 'Sound']
    available_cols = [c for c in cols if c in df.columns]
    sub = df[available_cols].copy()
    
    m_norm = (sub['Mtrue'] - sub['Mtrue'].min()) / (sub['Mtrue'].max() - sub['Mtrue'].min() + 1e-6)
    te_norm = (sub['TEtrue'] - sub['TEtrue'].min()) / (sub['TEtrue'].max() - sub['TEtrue'].min() + 1e-6)
    s_norm = (sub['Sound'] - sub['Sound'].min()) / (sub['Sound'].max() - sub['Sound'].min() + 1e-6)
    score = 0.30 * m_norm + 0.40 * te_norm + 0.30 * s_norm
    
    q_low = score.quantile(0.15)
    q_high = score.quantile(0.85)
    
    tiers = []
    for sc in score:
        if sc <= q_low:
            tiers.append("best")
        elif sc >= q_high:
            tiers.append("worst")
        else:
            tiers.append("nominal")
            
    sub['tier'] = tiers
    return sub.to_dict(orient="records")


# ---------------------------------------------------------------------------
# Translation endpoints (MarianMT offline)
# ---------------------------------------------------------------------------
class TranslateRequest(BaseModel):
    texts: list[str]
    source: str = "en"
    target: str = "ja"


@app.post("/api/translate")
def translate_endpoint(req: TranslateRequest):
    """Batch translate texts using MarianMT."""
    results = translate_batch(req.texts, req.source, req.target)
    return {"translations": results}


@app.get("/api/translate/status")
def translate_status():
    """Check if translation models are available."""
    try:
        from translator import _models
        return {
            "available": True,
            "loaded_models": list(_models.keys()),
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)