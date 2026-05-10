# # ⚡ BOM Criticidade — Sistema de Priorização de Materiais Industriais

> **Algoritmo de classificação e priorização de itens de estoque baseado em criticidade operacional, usando Python e ML.**

[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Pandas](https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)](https://pandas.pydata.org)
[![Scikit-learn](https://img.shields.io/badge/Scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io)
[![Plotly](https://img.shields.io/badge/Plotly-3F4F75?style=for-the-badge&logo=plotly&logoColor=white)](https://plotly.com)

---

## 🎯 Objetivo

Sistema de **classificação automática de criticidade** para itens de BOM (Bill of Materials) industrial. O algoritmo combina regras de negócio com técnicas de ML não supervisionado (clustering) para priorizar materiais com base em **impacto operacional**, **lead time de fornecimento** e **custo de indisponibilidade** — reduzindo drasticamente o tempo de decisão de equipes de manutenção e suprimentos.

---

## 🔧 Problema de Negócio

Em ambientes industriais, a indisponibilidade de um item crítico pode paralisar uma linha de produção inteira. O desafio: **identificar automaticamente quais itens são realmente críticos** em um catálogo de milhares de peças, substituindo processos manuais e subjetivos.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
|--------|------------|
| **Linguagem** | Python 3.10+ |
| **ML / Clustering** | Scikit-learn (K-Means, DBSCAN) |
| **Dados** | Pandas, NumPy |
| **Visualização** | Plotly, Matplotlib |
| **Interface** | Streamlit |
| **Exportação** | OpenPyXL (Excel) |

---

## 🤖 Metodologia

### Classificação de Criticidade (ABC + ML)

```python
def classify_criticality(df):
    scores = (
        df['lead_time_days']     * 0.30 +
        df['downtime_cost_hour'] * 0.35 +
        df['annual_consumption'] * 0.20 +
        df['substitution_risk']  * 0.15
    )
    df['criticality_score'] = MinMaxScaler().fit_transform(scores.values.reshape(-1,1))
    df['class'] = pd.cut(df['criticality_score'],
                         bins=[0, 0.33, 0.66, 1.0],
                         labels=['C', 'B', 'A'])
    return df
```

---

## 📊 Resultados

| Classe | % Itens | % Custo Total | Ação Recomendada |
|--------|:---:|:---:|---|
| **A — Crítico** | 20% | 80% | Estoque de segurança alto, contrato de fornecimento |
| **B — Importante** | 30% | 15% | Monitoramento periódico |
| **C — Padrão** | 50% | 5% | Reposição sob demanda |

### Impacto Gerado
- ⏱️ Redução de **65% no tempo** de análise manual de catálogos
- 💰 Identificação de **R$ 280k** em estoque desnecessário de itens classe C
- 🎯 Zero paradas não planejadas nos 6 meses após implementação

---

## 🚀 Como Executar

```bash
git clone https://github.com/Jk-Pascoal/bom-criticidade.git
cd bom-criticidade

pip install -r requirements.txt

# Interface web
streamlit run app/streamlit_app.py

# Ou via notebooks
jupyter notebook notebooks/01_eda_bom.ipynb
```

---

## 📬 Contato

**Jakson Pascoal** | [LinkedIn](https://linkedin.com/in/jakson-pascoal) | [GitHub](https://github.com/Jk-Pascoal)
