# 📖 Dicionário de Dados — BOM Criticidade

Este documento apresenta a especificação técnica de cada uma das colunas utilizadas e geradas no projeto **BOM Criticidade**.

O pipeline processa os dados brutos gerados em `data/raw/bom.csv` e exporta o conjunto de dados final modelado em `data/processed/criticidade.csv`.

---

## 📊 Especificação das Colunas (22 Variáveis Finais)

O conjunto de dados final processado contém as seguintes variáveis estruturadas:

| # | Nome da Coluna | Tipo Esperado | Descrição do Campo | Uso no Modelo / Significado Analítico |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `material_id` | `string` | Identificador alfanumérico único do material (ex: `MEC-MOT-0001`). | Chave primária de identificação. |
| 2 | `material_name` | `string` | Descrição técnica realista do material ou peça sobressalente. | Nome de exibição em gráficos e tabelas. |
| 3 | `category` | `string` | Categoria de manutenção do item (ex: `Mecanico`, `Eletrico`, `Automacao`, `Vedacao`). | Segmentação e filtros operacionais. |
| 4 | `equipment_family` | `string` | Família de equipamento associada ao material (ex: `Bombas`, `Motores`, `Valvulas`). | Usado para definir o custo de parada operacional. |
| 5 | `supplier_name` | `string` | Nome do fornecedor principal (ex: `Fornecedor Nacional A`, `OEM Especializado E`). | Identificação comercial. |
| 6 | `origin_type` | `string` | Tipo de origem geográfica/comercial (`Regional`, `Nacional`, `OEM`, `Importado`). | Regula a base de lead times e risco de substituição. |
| 7 | `lead_time_days` | `int` | Tempo de entrega do fornecedor em dias (de 2 a 180 dias, dependendo da origem). | Variável logística explicativa (peso 20% no score). |
| 8 | `unit_cost` | `float` | Custo de aquisição unitário do material (em R$). | Impacto financeiro de compra direta. |
| 9 | `annual_consumption` | `int` | Quantidade anual estimada consumida (`monthly_demand_avg * 12`). | Usado para cálculo do valor financeiro total. |
| 10 | `monthly_demand_avg` | `int` | Demanda média mensal do item em estoque. | Base de cálculo da taxa de consumo diário. |
| 11 | `demand_std` | `float` | Desvio padrão da demanda média mensal do material. | Medida de variabilidade e cálculo de estoque de segurança. |
| 12 | `stock_quantity` | `int` | Saldo físico atual disponível no almoxarifado principal. | Usado no cálculo de cobertura e estoque mínimo. |
| 13 | `minimum_stock` | `float` | Estoque mínimo dinâmico recalculado (`safety_stock + daily_demand * lead_time`). | Gatilho para alertas de "Revisar estoque mínimo". |
| 14 | `coverage_days` | `float` | Dias de cobertura (`stock_quantity / daily_demand`), limitados a 180 dias. | Indica a durabilidade física do estoque atual. |
| 15 | `downtime_cost_hour` | `float` | Custo de parada de produção por hora caso o equipamento pare (em R$). | Variável de impacto técnico (peso 25% no score). |
| 16 | `substitution_risk` | `int` | Risco técnico/logístico de substituição do material (escala de 1 a 5). | Indica a dificuldade de achar substitutos (peso 10% no score). |
| 17 | `criticality_engineering` | `int` | Criticidade de engenharia avaliada pela equipe técnica (escala de 1 a 5). | Relevância física para o ativo de manutenção (peso 35% no score). |
| 18 | `criticality_score` | `float` | Score de Criticidade ponderado consolidado (entre `0.00` e `1.00`). | Soma ponderada de: Engenharia (35%), Parada (25%), LT (20%), Sub (10%), Stockout (10%). |
| 19 | `abc_class` | `string` | Classificação de prioridade baseada no score (`A`, `B` ou `C`). | `A`: Top 15% por score, `B`: próximos 30% por score, `C`: restantes 55%. |
| 20 | `stockout_risk` | `float` | Risco de stockout estimado na escala [0, 1] com base na cobertura. | Cobertura comparada ao lead time do item (peso 10% no score). |
| 21 | `annual_consumption_value` | `float` | Consumo financeiro anualizado valorizado (`annual_consumption * unit_cost`). | Usado para Pareto financeiro e custos por categoria. |
| 22 | `recommended_action` | `string` | Plano de ação sugerido (ex: `Reabastecer agora`, `Revisar estoque mínimo`). | Direcionamento operacional e de planejamento de estoque. |

---

## 📐 Regras de Derivação das Colunas

*   **Taxa de Consumo Diário:**
    $$\text{daily\_demand} = \frac{\text{monthly\_demand\_avg}}{30}$$
*   **Cobertura de Estoque (coverage_days):**
    $$\text{coverage\_days} = \text{clip}\left(\frac{\text{stock\_quantity}}{\text{daily\_demand}}, \, 0, \, 180\right)$$
    *(Caso `daily_demand` seja 0, assume-se 180 dias se houver estoque e 0 se estiver zerado).*
*   **Risco de Stockout (stockout_risk):**
    $$\text{stockout\_risk} = \text{clip}\left(1.0 - \frac{\text{coverage\_days}}{1.5 \times \text{lead\_time\_days}}, \, 0.0, \, 1.0\right)$$
*   **Estoque Mínimo (minimum_stock):**
    $$\text{minimum\_stock} = 1.65 \times \frac{\text{demand\_std}}{30} \times \sqrt{\text{lead\_time\_days}} + \text{daily\_demand} \times \text{lead\_time\_days}$$
*   **Classe ABC por Criticidade (abc_class):**
    Ordenado por `criticality_score` decrescente:
    *   Top 15% das linhas $\rightarrow$ Classe A.
    *   Próximos 30% das linhas $\rightarrow$ Classe B.
    *   Restante 55% das linhas $\rightarrow$ Classe C.
