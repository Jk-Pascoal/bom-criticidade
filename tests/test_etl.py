from pathlib import Path

import pandas as pd
import pytest

from src import etl


def make_raw_dataframe(rows: int = 20) -> pd.DataFrame:
    data = []
    categories = ["Mecanico", "Eletrico", "Automacao", "Vedacao"]
    origins = ["Regional", "Nacional", "OEM", "Importado"]

    for i in range(rows):
        data.append(
            {
                "material_id": f"MAT-{i:04d}",
                "material_name": f"Material de teste {i}",
                "category": categories[i % len(categories)],
                "equipment_family": "Bombas",
                "supplier_name": f"Fornecedor {i % 3}",
                "origin_type": origins[i % len(origins)],
                "lead_time_days": 5 + (i * 4),
                "unit_cost": 100.0 + (i * 25.0),
                "monthly_demand_avg": 2.0 + (i % 6),
                "demand_std": 0.5 + (i % 4) * 0.25,
                "stock_quantity": float(i % 12),
                "downtime_cost_hour": 1000.0 + (i * 750.0),
                "substitution_risk": 1 + (i % 5),
                "criticality_engineering": 1 + (i % 5),
            }
        )

    return pd.DataFrame(data)


def run_pipeline(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, df: pd.DataFrame) -> pd.DataFrame:
    input_path = tmp_path / "data" / "raw" / "bom.csv"
    output_path = tmp_path / "data" / "processed" / "criticidade.csv"
    input_path.parent.mkdir(parents=True)
    df.to_csv(input_path, index=False)

    monkeypatch.setattr(etl, "INPUT_PATH", input_path)
    monkeypatch.setattr(etl, "OUTPUT_PATH", output_path)

    etl.main()

    assert output_path.exists()
    return pd.read_csv(output_path)


def test_minmax_constant_series_returns_zero() -> None:
    series = pd.Series([7.0, 7.0, 7.0])

    result = etl.minmax(series)

    assert result.tolist() == [0.0, 0.0, 0.0]


def test_pipeline_generates_valid_scores_classes_and_actions(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    result = run_pipeline(tmp_path, monkeypatch, make_raw_dataframe())

    assert len(result) == 20
    assert result["criticality_score"].between(0.0, 1.0).all()
    assert result["stockout_risk"].between(0.0, 1.0).all()
    assert result["criticality_score"].is_monotonic_decreasing
    assert result["abc_class"].value_counts().to_dict() == {"C": 11, "B": 6, "A": 3}

    allowed_actions = {
        "Reabastecer agora",
        "Revisar estoque mínimo",
        "Desenvolver fornecedor alternativo",
        "Negociar lead time",
        "Reduzir excesso de estoque",
        "Monitorar consumo",
        "Manter política atual",
    }
    assert set(result["recommended_action"]).issubset(allowed_actions)

    expected_columns = {
        "annual_consumption",
        "minimum_stock",
        "coverage_days",
        "criticality_score",
        "abc_class",
        "stockout_risk",
        "annual_consumption_value",
        "recommended_action",
    }
    assert expected_columns.issubset(result.columns)


def test_pipeline_rejects_missing_required_column(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    invalid = make_raw_dataframe().drop(columns=["lead_time_days"])
    input_path = tmp_path / "bom.csv"
    output_path = tmp_path / "criticidade.csv"
    invalid.to_csv(input_path, index=False)

    monkeypatch.setattr(etl, "INPUT_PATH", input_path)
    monkeypatch.setattr(etl, "OUTPUT_PATH", output_path)

    with pytest.raises(ValueError, match="lead_time_days"):
        etl.main()

    assert not output_path.exists()
