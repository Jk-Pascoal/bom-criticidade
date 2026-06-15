import os
import math
from pathlib import Path
import numpy as np
import pandas as pd

# ---------- Config ----------
INPUT_PATH = Path("data/raw/bom.csv")
OUTPUT_PATH = Path("data/processed/criticidade.csv")
Z_SERVICE = 1.65  # ~95% nível de serviço

# Colunas obrigatórias no arquivo bruto
RAW_COLS = [
    "material_id",
    "material_name",
    "category",
    "equipment_family",
    "supplier_name",
    "origin_type",
    "lead_time_days",
    "unit_cost",
    "monthly_demand_avg",
    "demand_std",
    "stock_quantity",
    "downtime_cost_hour",
    "substitution_risk",
    "criticality_engineering"
]

def minmax(s):
    vmin, vmax = float(s.min()), float(s.max())
    if math.isclose(vmin, vmax):
        return pd.Series(np.zeros(len(s)), index=s.index)
    return (s - vmin) / (vmax - vmin)

def main():
    print("[ETL] Iniciando processamento do BOM Criticidade...")
    
    # 1. Validação de Arquivo de Entrada
    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Arquivo de entrada não encontrado em: {INPUT_PATH.resolve()}\n"
            "Por favor, execute 'python src/generate_data.py' primeiro para gerar os dados brutos."
        )

    # 2. Leitura dos dados brutos
    df = pd.read_csv(INPUT_PATH, sep=",", encoding="utf-8")

    # 3. Verificação de Colunas Obrigatórias
    missing = [c for c in RAW_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"O CSV bruto está sem as seguintes colunas necessárias: {missing}")

    # 4. Cálculos e Regras de Negócio
    
    # Consumo anualizado
    df["annual_consumption"] = df["monthly_demand_avg"] * 12
    
    # Consumo diário para fins de cobertura
    daily_demand = df["monthly_demand_avg"] / 30.0
    
    # Cobertura de estoque em dias: stock_qty / daily_demand. Limitado a 180 dias.
    cov = np.where(
        daily_demand > 0,
        df["stock_quantity"] / daily_demand,
        np.where(df["stock_quantity"] > 0, 180.0, 0.0)
    )
    df["coverage_days"] = np.clip(cov, 0.0, 180.0).round(1)

    # Estoque Mínimo (Ponto de ressuprimento dinâmico)
    # safety_stock = Z * demand_std * sqrt(LT/30)
    # minimum_stock = safety_stock + daily_demand * lead_time
    safety_stock = Z_SERVICE * (df["demand_std"] / 30.0) * np.sqrt(df["lead_time_days"].clip(lower=1))
    min_stk = safety_stock + daily_demand * df["lead_time_days"]
    df["minimum_stock"] = np.round(min_stk, 1)

    # Valor de Consumo Anualizado (R$)
    df["annual_consumption_value"] = np.round(df["annual_consumption"] * df["unit_cost"], 2)

    # Risco de Stockout: 1.0 se cobertura=0; diminui linearmente até 0 quando a cobertura atinge 1.5x o lead time.
    stk_risk = np.where(
        df["coverage_days"] < (1.5 * df["lead_time_days"]),
        1.0 - (df["coverage_days"] / (1.5 * df["lead_time_days"] + 1e-9)),
        0.0
    )
    df["stockout_risk"] = np.clip(stk_risk, 0.0, 1.0).round(4)

    # 5. Normalizações para o Score Ponderado
    eng_crit_norm = (df["criticality_engineering"] - 1.0) / 4.0
    sub_risk_norm = (df["substitution_risk"] - 1.0) / 4.0
    downtime_norm = minmax(df["downtime_cost_hour"])
    lead_time_norm = minmax(df["lead_time_days"])

    # 6. Cálculo do Score de Criticidade Ponderado
    # Pesos: 35% eng_crit, 25% downtime, 20% lead_time, 10% sub_risk, 10% stockout_risk
    df["criticality_score"] = (
        0.35 * eng_crit_norm
        + 0.25 * downtime_norm
        + 0.20 * lead_time_norm
        + 0.10 * sub_risk_norm
        + 0.10 * df["stockout_risk"]
    ).round(4)

    # 7. Classificação ABC com base no Score de Criticidade
    # A: top 15% por score, B: próximos 30%, C: restante
    df = df.sort_values("criticality_score", ascending=False).reset_index(drop=True)
    n = len(df)
    
    df["abc_class"] = "C"
    idx_a = int(n * 0.15)
    idx_b = int(n * 0.45)
    
    df.loc[:idx_a-1, "abc_class"] = "A"
    df.loc[idx_a:idx_b-1, "abc_class"] = "B"

    # 8. Lógica Realista de Ações Recomendadas
    actions = []
    for idx, r in df.iterrows():
        # Cobertura muito baixa em relação ao lead time (ruptura iminente) em item crítico
        if r["coverage_days"] < r["lead_time_days"] and r["criticality_score"] >= 0.55:
            actions.append("Reabastecer agora")
        # Estoque abaixo do mínimo calculado em item importante
        elif r["stock_quantity"] < r["minimum_stock"] and r["criticality_score"] >= 0.40:
            actions.append("Revisar estoque mínimo")
        # Item importado de alta criticidade e alto risco de substituição
        elif r["origin_type"] == "Importado" and r["abc_class"] in ["A", "B"] and r["substitution_risk"] >= 4:
            actions.append("Desenvolver fornecedor alternativo")
        # Longo lead time em item financeiramente relevante ou crítico
        elif r["lead_time_days"] > 45 and r["abc_class"] in ["A", "B"]:
            actions.append("Negociar lead time")
        # Excesso de estoque em itens de baixa criticidade (Classe C)
        elif r["coverage_days"] > 100 and r["abc_class"] == "C":
            actions.append("Reduzir excesso de estoque")
        # Item com estoque confortável
        elif r["coverage_days"] > 60:
            actions.append("Monitorar consumo")
        # Padrão
        else:
            actions.append("Manter política atual")
            
    df["recommended_action"] = actions

    # 9. Exportar colunas finais no formato especificado
    final_cols = [
        "material_id",
        "material_name",
        "category",
        "equipment_family",
        "supplier_name",
        "origin_type",
        "lead_time_days",
        "unit_cost",
        "annual_consumption",
        "monthly_demand_avg",
        "demand_std",
        "stock_quantity",
        "minimum_stock",
        "coverage_days",
        "downtime_cost_hour",
        "substitution_risk",
        "criticality_engineering",
        "criticality_score",
        "abc_class",
        "stockout_risk",
        "annual_consumption_value",
        "recommended_action"
    ]
    
    # Salvar ordenado por score de criticidade decrescente
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df[final_cols].sort_values("criticality_score", ascending=False).to_csv(
        OUTPUT_PATH, index=False, encoding="utf-8"
    )

    # Imprimir resumos de validação no console
    print(f"[OK] Arquivo processado gerado com sucesso em: {OUTPUT_PATH}")
    print("\n--- Estatísticas Finais de Classes ---")
    print(df["abc_class"].value_counts(normalize=True).mul(100).round(1).astype(str) + "%")
    print("\n--- Contagem de Ações Recomendadas ---")
    print(df["recommended_action"].value_counts())
    print("--------------------------------------")

if __name__ == "__main__":
    main()
