# src/etl.py  (versão com auto-mapeamento de colunas)
import math
import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

# ---------- Config ----------
INPUT_PATH = Path("data/raw/bom.csv")
OUTPUT_PATH = Path("data/processed/criticidade.csv")
COVERAGE_CLIP = 180  # dias
Z_SERVICE = 1.65     # ~95% nível de serviço

REQ_COLS = [
    "material_id",
    "eng_crit",
    "lead_time_days",
    "unit_cost",
    "stock_qty",
    "daily_consumption",
]
OPT_COLS_DEFAULTS = {"category": "N/A", "supplier": "N/A", "demand_std": None}


# ---------- helpers ----------
def norm_name(s: str) -> str:
    """lower, remove acentos e caracteres não alfanuméricos"""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s


def guess_target(norm: str) -> str | None:
    """heurística para mapear nome normalizado -> coluna padrão"""
    if norm in {"id", "material", "codigo", "cod", "sku", "item"} or "material" in norm or norm.endswith("_id"):
        return "material_id"

    if any(k in norm for k in ["eng", "criticidade", "critical", "crit_eng", "criticidade_eng", "critic"]):
        return "eng_crit"

    if any(k in norm for k in ["lead_time", "leadtime", "lt", "prazo", "tempo"]):
        return "lead_time_days"

    if any(k in norm for k in ["unit_cost", "unitprice", "unit_price", "preco", "custo", "valor_unit"]):
        return "unit_cost"

    if any(k in norm for k in ["stock", "estoque", "saldo", "qtd", "quantidade"]) and "consum" not in norm:
        return "stock_qty"

    if any(k in norm for k in ["consumo", "consum", "demand", "demanda", "usage", "uso"]):
        return "daily_consumption"

    if "categoria" in norm or "category" in norm:
        return "category"

    if "fornecedor" in norm or "supplier" in norm:
        return "supplier"

    if any(k in norm for k in ["desvio", "std", "sigma", "cv_demanda", "stdev"]):
        return "demand_std"

    return None


def auto_rename(df: pd.DataFrame) -> pd.DataFrame:
    mapping = {}
    used_targets = set()

    for c in df.columns:
        target = guess_target(norm_name(c))
        if target and target not in used_targets:
            mapping[c] = target
            used_targets.add(target)

    if mapping:
        for src, dst in mapping.items():
            print(f"[map] {src} -> {dst}")
        df = df.rename(columns=mapping)

    return df


def to_num_series(s: pd.Series) -> pd.Series:
    """tenta converter números (aceita decimal com vírgula)."""
    if s.dtype.kind in "if":
        return s
    # remove separador de milhar e troca vírgula por ponto
    s2 = (
        s.astype(str)
        .str.replace(r"\.", "", regex=True)
        .str.replace(",", ".", regex=False)
        .str.replace(r"[^0-9\.-]", "", regex=True)
    )
    return pd.to_numeric(s2, errors="coerce")


def minmax(s: pd.Series):
    s = s.astype(float)
    vmin, vmax = float(np.nanmin(s)), float(np.nanmax(s))
    if math.isclose(vmin, vmax):
        return pd.Series(np.zeros(len(s)), index=s.index)
    return (s - vmin) / (vmax - vmin)


def classify_abc(df: pd.DataFrame):
    tmp = df.sort_values("annual_value", ascending=False).copy()
    total = max(tmp["annual_value"].sum(), 1.0)
    tmp["cum"] = tmp["annual_value"].cumsum() / total
    cls = pd.Series(index=df.index, dtype="object")
    cls.loc[tmp.index[tmp["cum"] <= 0.80]] = "A"
    cls.loc[tmp.index[(tmp["cum"] > 0.80) & (tmp["cum"] <= 0.95)]] = "B"
    cls.loc[tmp.index[tmp["cum"] > 0.95]] = "C"
    return cls


def classify_xyz(cv: pd.Series):
    xq, yq = cv.quantile([0.33, 0.66]).tolist()
    out = pd.Series(index=cv.index, dtype="object")
    out[cv <= xq] = "X"
    out[(cv > xq) & (cv <= yq)] = "Y"
    out[cv > yq] = "Z"
    return out


# ---------- main ----------
def main(in_path=INPUT_PATH, out_path=OUTPUT_PATH):
    in_path = Path(in_path)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Verifica se o arquivo de entrada existe
    if not in_path.exists():
        raise FileNotFoundError(
            f"Arquivo de entrada nao encontrado em: {in_path.resolve()}\n"
            "Por favor, execute 'python src/generate_data.py' primeiro para gerar os dados brutos."
        )

    # tenta detectar separador automaticamente
    df = pd.read_csv(in_path, sep=None, engine="python")

    # renomeia por heurística
    df = auto_rename(df)

    # checagem de obrigatórias
    missing = [c for c in REQ_COLS if c not in df.columns]
    if missing:
        cols = ", ".join(df.columns)
        raise ValueError(f"CSV não contém colunas obrigatórias: {missing}\nColunas encontradas: {cols}")

    # converter numéricos (aceita vírgula)
    for c in ["eng_crit", "lead_time_days", "unit_cost", "stock_qty", "daily_consumption"]:
        df[c] = to_num_series(df[c]).fillna(0.0)

    # opcionais
    for c, default in OPT_COLS_DEFAULTS.items():
        if c not in df.columns:
            df[c] = default

    if df["demand_std"].isna().all():
        df["demand_std"] = (df["daily_consumption"].abs() * 0.25).astype(float)
    else:
        df["demand_std"] = to_num_series(df["demand_std"]).fillna(df["daily_consumption"].abs() * 0.25)

    # --------- Métricas ---------
    cov = np.where(
    df["daily_consumption"] > 0,
    df["stock_qty"] / df["daily_consumption"],
    COVERAGE_CLIP
).astype(float)

    df["coverage_days"] = np.minimum(cov, COVERAGE_CLIP)


    df["annual_value"] = df["unit_cost"] * 365.0 * df["daily_consumption"]

    df["eng_crit_norm"] = minmax(df["eng_crit"])
    df["lead_time_norm"] = minmax(df["lead_time_days"])
    df["unit_cost_norm"] = minmax(df["unit_cost"])
    df["coverage_norm"] = minmax(df["coverage_days"])

    df["score"] = (
        0.4 * df["eng_crit_norm"]
        + 0.3 * df["lead_time_norm"]
        + 0.2 * df["unit_cost_norm"]
        + 0.1 * (1 - df["coverage_norm"])
    )

    df["risk_flag"] = (df["coverage_days"] < df["lead_time_days"]).astype(int)
    df["risk_score"] = df["score"] * df["risk_flag"]

    df["abc_class"] = classify_abc(df)

    eps = 1e-9
    cv = df["demand_std"] / (df["daily_consumption"].abs() + eps)
    df["xyz_class"] = classify_xyz(cv)

    df["safety_stock"] = Z_SERVICE * df["demand_std"] * np.sqrt(df["lead_time_days"].clip(lower=1))
    df["reorder_point"] = df["daily_consumption"] * df["lead_time_days"] + df["safety_stock"]
    df["suggest_qty"] = (df["reorder_point"] - df["stock_qty"]).clip(lower=0).round(0)

    out_cols = [
        "material_id",
        "category",
        "supplier",
        "eng_crit",
        "lead_time_days",
        "unit_cost",
        "stock_qty",
        "daily_consumption",
        "coverage_days",
        "annual_value",
        "score",
        "risk_flag",
        "risk_score",
        "abc_class",
        "xyz_class",
        "suggest_qty",
    ]
    df[out_cols].sort_values(["risk_score", "score", "annual_value"], ascending=False).to_csv(
        out_path, index=False
    )
    print(f"[ok] arquivo gerado: {out_path}")


if __name__ == "__main__":
    main()
