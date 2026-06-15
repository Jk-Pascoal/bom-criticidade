# 📖 Dicionário de Dados — BOM Criticidade

Este documento apresenta a especificação técnica de cada uma das colunas utilizadas e geradas no projeto **BOM Criticidade**.

O pipeline processa dados brutos gerados em `data/raw/bom.csv` e exporta o conjunto de dados modelado em `data/processed/criticidade.csv`.

---

## 📥 1. Dados Brutos (Input: `data/raw/bom.csv`)

As colunas a seguir são geradas pelo script de simulação `src/generate_data.py` e servem como entrada para o pipeline ETL:

| Nome da Coluna | Tipo Esperado | Descrição do Campo | Uso no Processo ETL / Modelo |
| :--- | :--- | :--- | :--- |
| `material_id` | `string` | Identificador alfanumérico único do material (ex: `MP-URE-0001`). | Chave primária. Mapeado para `material_id`. |
| `descricao` | `string` | Descrição técnica abreviada do material ou peça sobressalente. | Identificador textual exibido em gráficos e tabelas. |
| `criticidade_engenharia` | `int` | Avaliação qualitativa de importância operacional feita pela manutenção (1 a 5). | Mapeado para `eng_crit`. Base da dimensão técnica do score. |
| `lead_time_dias` | `int` | Tempo decorrido entre a solicitação de compra e a entrega física na planta (dias). | Mapeado para `lead_time_days`. Base da dimensão logística do score. |
| `custo_unitario` | `float` | Valor financeiro de aquisição de uma unidade do item (em R$). | Mapeado para `unit_cost`. Base da dimensão financeira do score. |
| `consumo_mensal` | `int` | Quantidade estimada de itens consumidos em média por mês. | Mapeado para `daily_consumption` (dividido por 30) para cálculo de taxas diárias. |
| `estoque_atual` | `int` | Saldo físico atual em estoque no almoxarifado principal. | Mapeado para `stock_qty`. Usado no cálculo de cobertura de estoque. |

---

## 📤 2. Dados Processados (Output: `data/processed/criticidade.csv`)

As colunas a seguir são exportadas pelo script `src/etl.py` após a aplicação das regras de negócio, normalizações e cálculos de estoque de segurança:

| Nome da Coluna | Tipo Esperado | Descrição do Campo | Uso no Modelo / Significado Analítico |
| :--- | :--- | :--- | :--- |
| `material_id` | `string` | Código identificador único padronizado do material. | Identificação e chave primária. |
| `category` | `string` | Categoria do material inferida a partir de prefixos (ex: `MP`, `IP`, `SB`). | Segmentação e filtros analíticos. |
| `supplier` | `string` | Código ou nome do fornecedor principal do material (padrão `N/A`). | Rastreabilidade comercial. |
| `eng_crit` | `float` | Criticidade técnica de Engenharia (escala numérica de 1.0 a 5.0). | Representa o risco de quebra e impacto no ativo físico. |
| `lead_time_days` | `float` | Tempo de entrega do fornecedor em dias. | Indicador de vulnerabilidade de abastecimento logístico. |
| `unit_cost` | `float` | Custo unitário de aquisição do material (em R$). | Dimensão de impacto financeiro direto. |
| `stock_qty` | `float` | Saldo físico disponível em estoque. | Base de cálculo de segurança e rupturas. |
| `daily_consumption` | `float` | Taxa de consumo médio diário calculada pelo pipeline. | Usada para estimar a velocidade de escoamento físico. |
| `coverage_days` | `float` | Cobertura do estoque em dias (`stock_qty / daily_consumption`), limitada a 180 dias. | Indica quanto tempo o estoque atual atende à demanda média. |
| `annual_value` | `float` | Valor de consumo financeiro anualizado (`unit_cost * daily_consumption * 365.0`). | Base para a curva de priorização de Pareto (Classes ABC). |
| `score` | `float` | Score de Criticidade unificado entre `0.00` e `1.00`. | Média ponderada das dimensões normalizadas de custo, lead time, cobertura e eng. |
| `risk_flag` | `int` | Sinalizador binário de risco de stockout (`1` se cobertura < lead time, `0` caso contrário). | Indica se o estoque acaba antes da chegada de um novo pedido. |
| `risk_score` | `float` | Score de Criticidade ajustado pelo risco (`score * risk_flag`). | Usado para ordenar e priorizar ações de abastecimento urgente. |
| `abc_class` | `string` | Classificação de Pareto Financeira baseada em consumo anual (`A`, `B` ou `C`). | `A`: 80% do valor acumulado, `B`: 15% seguintes, `C`: 5% finais. |
| `xyz_class` | `string` | Classificação estatística de previsibilidade de demanda (`X`, `Y` ou `Z`). | Baseada no coeficiente de desvio padrão da taxa de consumo diário. |
| `suggest_qty` | `float` | Quantidade sugerida para compra imediata baseada no ponto de pedido dinâmico. | Apoio à compra preventiva de reposição de estoque. |

---

## 🛠️ 3. Variáveis Auxiliares de Normalização (Internas no ETL)

Essas variáveis temporárias são geradas na memória pelo `src/etl.py` para calcular o score final e não são salvas no arquivo CSV de saída para manter a tabela limpa:

*   `eng_crit_norm` (MinMax de `eng_crit`): Escala linear $[0, 1]$ do risco de engenharia.
*   `lead_time_norm` (MinMax de `lead_time_days`): Escala linear $[0, 1]$ da lentidão logística de entrega.
*   `unit_cost_norm` (MinMax de `unit_cost`): Escala linear $[0, 1]$ da relevância do preço do material.
*   `coverage_norm` (MinMax de `coverage_days`): Escala linear $[0, 1]$ do tempo de cobertura.
