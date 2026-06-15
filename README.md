# BOM Criticidade — Priorização Analítica de Materiais Industriais

> **Sistema interpretável para classificar materiais críticos considerando lead time, custo de parada, consumo anual, risco de substituição e cobertura de estoque.**

---

## Problema de Negócio

Como priorizar materiais industriais em catálogos extensos, reduzindo subjetividade e apoiando decisões de estoque, manutenção, suprimentos e engenharia?

Em operações industriais de capital intensivo (como plantas de fertilizantes), a indisponibilidade de um item sobressalente vital pode paralisar linhas de produção inteiras, gerando perdas operacionais expressivas por hora. Esta solução desenvolve um modelo de decisão estruturado para classificar e priorizar itens de estoque MRO (Manutenção, Reparo e Operação), equilibrando riscos de paradas não planejadas e custos de capital imobilizado.

---

## Sumário Executivo

O projeto propõe um **score de criticidade interpretável** que pondera o impacto operacional técnico (engenharia), perdas financeiras (custo de parada), tempo de ressuprimento (lead time), facilidade de substituição e risco de desabastecimento. A partir dessa pontuação, o painel executivo estratifica os itens nas classes A, B e C e gera planos de ação para direcionar esforços de compra, negociação de lead times, desenvolvimento de fornecedores ou redução de overstock.

---

## Objetivos do Projeto

1. **Classificar materiais** por criticidade com base em parâmetros quantitativos.
2. **Criar um score interpretável** entre 0.00 e 1.00.
3. **Apoiar decisões de estoque de segurança**, calculando o estoque mínimo.
4. **Identificar itens em risco de ruptura**, permitindo compras proativas.
5. **Reduzir capital de giro**, sinalizando excessos de estoque em itens Classe C.
6. **Gerar um painel executivo sóbrio** para controle gerencial rápido.

---

## Dados Utilizados

> [!IMPORTANT]
> Este projeto utiliza dados sintéticos gerados para simular um cenário industrial realista de uma planta de fertilizantes. Nenhum dado confidencial corporativo foi utilizado.

As variáveis que compõem o banco de dados processado são:
*   `material_id`: Identificador alfanumérico único do item.
*   `material_name`: Descrição técnica realística do material (ex: "Rolamento SKF 6312-C3").
*   `category`: Especialidade do material (ex: `Mecanico`, `Vedacao`, `Automacao`).
*   `equipment_family`: Família do equipamento associado (ex: `Bombas`, `Motores`, `Valvulas`).
*   `supplier_name`: Nome do fornecedor principal (ex: `Fornecedor Nacional A`).
*   `origin_type`: Tipo de origem geográfica/comercial (`Regional`, `Nacional`, `OEM`, `Importado`).
*   `lead_time_days`: Lead time de fornecimento em dias.
*   `unit_cost`: Custo de aquisição unitário do material (em R$).
*   `annual_consumption`: Quantidade anual consumida (`monthly_demand_avg * 12`).
*   `monthly_demand_avg`: Demanda média mensal do item.
*   `demand_std`: Desvio padrão da demanda mensal.
*   `stock_quantity`: Saldo físico atual em estoque.
*   `minimum_stock`: Estoque mínimo dinâmico calculado.
*   `coverage_days`: Cobertura em dias do estoque atual.
*   `downtime_cost_hour`: Custo de parada de produção por hora do equipamento associado.
*   `substitution_risk`: Dificuldade de encontrar substitutos ou fornecedores locais (1 a 5).
*   `criticality_engineering`: Criticidade física do item dada pela manutenção (1 a 5).
*   `criticality_score`: Score ponderado final de criticidade [0.00, 1.00].
*   `abc_class`: Classe de prioridade baseada no score (A: Top 15%, B: próximos 30%, C: restante 55%).
*   `stockout_risk`: Severidade de risco de stockout com base na cobertura e lead time [0.00, 1.00].
*   `annual_consumption_value`: Valor financeiro anualizado de consumo (R$).
*   `recommended_action`: Plano de ação sugerido (ex: "Reabastecer agora", "Reduzir excesso de estoque").

---

## Metodologia de Cálculo e Normalização

1.  **Geração dos Dados (`src/generate_data.py`):** Simulação estatística de 1.000 materiais MRO seguindo perfis reais de custo e comportamento logístico.
2.  **Limpeza e Ajuste (`src/etl.py`):** Ingestão do CSV bruto, conversão de formatos monetários e tratamento de nulos.
3.  **Cálculo Logístico:** Cálculo dinâmico da cobertura de estoque, do estoque mínimo (segurança) e do risco de stockout.
4.  **Normalização MinMax:** Variáveis explicativas de unidades distintas são normalizadas na escala de 0 a 1 para garantir a neutralidade matemática do modelo.
5.  **Score Multicritério:** Aplicação da fórmula ponderada de criticidade.
6.  **Classificação ABC por Score:** O catálogo é ordenado pelo score de criticidade decrescente e fatiado nas proporções de 15% (A), 30% (B) e 55% (C).
7.  **Determinação de Ações:** Regras de negócio de estoque que mapeiam riscos e geram planos recomendados.

---

## Fórmula do Score de Criticidade

O score final é obtido por:

$$\text{Score} = 0.35 \times \text{EngCrit}_{\text{norm}} + 0.25 \times \text{Downtime}_{\text{norm}} + 0.20 \times \text{LeadTime}_{\text{norm}} + 0.10 \times \text{SubRisk}_{\text{norm}} + 0.10 \times \text{StockoutRisk}$$

*   **Criticidade de Engenharia (35%):** Gravidade técnica de falha da peça.
*   **Custo de Parada de Planta (25%):** Impacto financeiro por hora de parada do equipamento.
*   **Lead Time de Entrega (20%):** Lentidão de entrega física do fornecedor.
*   **Risco de Substituição (10%):** Dificuldade logística ou comercial de achar alternativas locais.
*   **Risco de Stockout (10%):** Risco de ficar sem estoque físico antes do recebimento do novo pedido.

> [!NOTE]
> Os pesos adotados no modelo constituem premissas de negócio gerais e devem ser calibrados com o corpo técnico e de suprimentos de cada unidade operacional.

---

## Decisões que o Projeto Apoia

*   **Definição de Parâmetros de Abastecimento:** Calibração de níveis mínimos dinâmicos de segurança.
*   **Negociação com Fornecedores:** Focar acordos de fornecimento (lead time reduzido) em itens de alto score.
*   **Priorização de Compras:** Automação de solicitações de aquisição focadas na ação "Reabastecer agora".
*   **Redução de Overstock:** Sinalização de itens Classe C com alta cobertura para escoamento, liberando capital de giro.

---

## Dashboard Executivo

O painel visual contém 7 representações gráficas interativas e sóbrias:

1.  **Distribuição ABC:** Divisão dos materiais pelas classes A, B e C.
2.  **Histograma de Score:** Quantidade de itens distribuídos por faixas de score [0.0, 1.0].
3.  **Top 15 Materiais Críticos:** Gráfico horizontal contendo os 15 maiores scores de criticidade.
4.  **Lead Time × Cobertura de Estoque:** Gráfico de dispersão evidenciando os itens em risco iminente de desabastecimento (acima da linha tracejada $y=x$).
5.  **Custo de Parada × Score:** Cruzamento do custo de hora inativa de ativo em relação ao score do material.
6.  **Valor Anual Consumido por Categoria:** Custos totais anualizados agregados por especialidade de manutenção.
7.  **Risco de Ruptura por Categoria:** Percentual de itens com risco ativo por especialidade.
8.  **Tabela Executiva de Ações:** Tabela detalhada dos itens mais críticos contendo pílulas visuais de ações de controle (reabastecer, reduzir estoque, negociar lead time, monitorar, etc.).

---

## Stack Técnica

*   **Linguagem & Processamento:** Python 3.10+ (com Pandas e NumPy).
*   **Front-end & Visualização:** HTML5, CSS3, JavaScript puro (PapaParse para ingestão de dados locales, Chart.js para renderizações gráficas).

---

## Estrutura do Projeto

```text
BOM-Criticidade/
│
├── data/
│   ├── raw/                  # Arquivo bruto gerado (bom.csv)
│   └── processed/            # Arquivo processado de criticidade (criticidade.csv)
│
├── src/
│   ├── generate_data.py      # Script Python gerador de dados industriais simulados
│   └── etl.py                # Pipeline de processamento, normalização e pontuação dos materiais
│
├── dashboard/
│   ├── index.html            # Interface web principal do painel analítico
│   ├── styles.css            # Estilização corporativa clara e compacta
│   └── script.js             # Lógica de carga do CSV, KPIs e inicialização do Chart.js
│
├── docs/                     # Pasta de deploy sincronizada para hospedagem estática (GitHub Pages)
│   ├── data/processed/       # Cópia do CSV processado para o deploy
│   ├── index.html
│   ├── styles.css
│   └── script.js
│
├── requirements.txt          # Dependências Python mínimas para reprodutibilidade
├── PORTFOLIO_CASE.md         # Estudo de caso executivo voltado a recrutadores
├── DATA_DICTIONARY.md        # Dicionário técnico detalhado das variáveis do modelo
└── README.md                 # Documento principal do repositório
```

---

## Reprodutibilidade (Como Executar)

Siga as etapas abaixo para rodar o projeto localmente:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/Jk-Pascoal/bom-criticidade.git
    cd bom-criticidade
    ```

2.  **Inicialize o ambiente virtual e instale as dependências:**
    ```bash
    # Windows
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt

    # Linux/MacOS
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

3.  **Gere a base simulada de materiais:**
    ```bash
    python src/generate_data.py
    ```

4.  **Execute o pipeline ETL de modelagem:**
    ```bash
    python src/etl.py
    ```

5.  **Inicie o servidor local para abrir o painel executivo:**
    ```bash
    python -m http.server 8000
    ```
    Abra no navegador o endereço: [http://localhost:8000/dashboard/](http://localhost:8000/dashboard/)

---

## Limitações do Modelo

*   **Dados Sintéticos:** O dataset representa uma simulação estatística técnica e não expõe dados reais.
*   **Subjetividade Técnica:** A nota técnica de engenharia de manutenção depende da avaliação do time técnico da unidade operacional.
*   **Falta de Modelos Confiabilistas:** O score é baseado em variáveis estáticas e não consome dados dinâmicos de quebras históricas de ativos.
*   **Ponderações Iniciais:** Os pesos definidos são arbitrários para o cenário MRO padrão e devem ser calibrados para cada planta real.
*   **Não Substituição do Técnico:** O score serve apenas para triagem analítica, não substituindo o parecer de engenharia, manutenção e suprimentos.
