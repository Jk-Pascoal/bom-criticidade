# 💼 Case Study: BOM Criticidade

## 📈 Sistema Analítico de Priorização de Materiais Industriais

---

## 📖 Contexto

Em operações industriais de grande porte (tais como plantas químicas, de fertilizantes, petroleiras ou de manufatura pesada), a estrutura de ativos (máquinas, equipamentos e instalações) é altamente complexa. Para manter a planta operando com segurança e alta confiabilidade, equipes de manutenção e suprimentos gerenciam catálogos de estoque conhecidos como **BOM (Bill of Materials)**, que podem conter de milhares a dezenas de milhares de itens de reposição (MRO - Manutenção, Reparo e Operação).

---

## 🔍 Problema de Negócio

O principal desafio na gestão de almoxarifados industriais é equilibrar duas forças opostas:
1.  **Custo de Parada de Planta:** A indisponibilidade de um material crítico (como um selo mecânico especial ou um sensor de nível) pode travar a produção inteira por dias, gerando perdas milionárias.
2.  **Custo de Capital Empacotado (Overstock):** Comprar estoques excessivos de segurança para todas as peças de reposição infla o capital de giro da empresa e gera custos de estocagem e obsolescência.

Os métodos convencionais de priorização costumam ser puramente qualitativos, baseados na intuição ou em avaliações manuais e descentralizadas, o que causa inconsistências graves nos níveis de estoque.

---

## 🎯 Objetivo

Desenvolver um **modelo quantitativo e interpretável** para calcular e classificar o risco de desabastecimento e a criticidade de materiais industriais. O sistema consolida dimensões logísticas, de custo e de criticidade operacional em um único score analítico de apoio à tomada de decisão para:
*   Reduzir as chances de indisponibilidade física de itens altamente críticos.
*   Direcionar de maneira automática ações de compras prioritárias.
*   Identificar oportunidades de redução de capital de giro em itens de baixo risco.

---

## 💾 Dados Utilizados

> [!IMPORTANT]
> Este estudo de caso utiliza dados sintéticos gerados especificamente para simular uma planta de fertilizantes. Nenhuma informação comercial confidencial ou dado real de fornecedores foi exposto.

Os dados contemplam um mix de **400 itens catalogados**, categorizados em:
*   **Matérias-Primas (MP):** Itens de alto custo unitário, alto consumo e longos lead times (ex: Nitrato de Amônio, Ureia).
*   **Insumos de Processo (IP):** Reagentes e catalisadores químicos (ex: Antiespumantes).
*   **Sobressalentes de Manutenção (SB):** Peças mecânicas, elétricas e de instrumentação (ex: Rolamentos, Motores, Válvulas).

As variáveis modeladas incluem identificadores de material, categoria, criticidade técnica (escala de engenharia), custo unitário, tempo de fornecimento (lead time) e saldo atual de estoque.

---

## ⚙️ Metodologia

O pipeline analítico é composto por cinco etapas modulares:

```mermaid
graph LR
    A[1. Ingestão] --> B[2. Normalização]
    B --> C[3. Cálculo do Score]
    C --> D[4. Análise de Estoque]
    D --> E[5. Geração de Ações]
```

1.  **Mapeamento de Nomenclatura (Auto-Rename):** O pipeline em Python (`etl.py`) possui um dicionário heurístico para mapear automaticamente variações de colunas comuns em planilhas do setor (ex: converter `custo_unitario` ou `unitprice` para a variável padronizada `unit_cost`).
2.  **Tratamento de Tipos e Limpeza:** Conversão de formatos monetários (vírgula por ponto, remoção de caracteres de milhar) e preenchimento de nulos.
3.  **Ponderação Multicritério:** Normalização das colunas explicativas via técnica MinMax para a escala $[0, 1]$ e aplicação da fórmula ponderada de score.
4.  **Matriz de Risco Operacional:** Cálculo dinâmico da cobertura de estoque atual (em dias). Cruzamento dessa cobertura com o lead time do fornecedor para sinalizar o `risk_flag` (cobertura menor que o lead time).
5.  **Cálculo Dinâmico de Estoque de Segurança:** Dimensionamento matemático de ressuprimento dinâmico considerando a variabilidade histórica de demanda.

---

## 📐 Fórmula do Score de Criticidade

O score final é calculado de forma transparente e ponderada:

$$\text{Score} = 0.40 \times \text{Criticidade Técnica} + 0.30 \times \text{Lead Time} + 0.20 \times \text{Custo Unitário} + 0.10 \times \text{Inverso da Cobertura}$$

Esta composição garante que itens de alta importância técnica tenham prioridade máxima, mas penaliza ou eleva a criticidade caso o item sofra com demoras de fornecedores ou estoques locais criticamente baixos.

---

## 📊 Principais Insights Obtidos

*   **Identificação de Cauda Longa:** O histograma de scores revela que apenas uma pequena porcentagem do catálogo de materiais se encontra na zona de altíssima criticidade operacional (scores acima de 0.75), justificando o foco das ações operacionais do departamento de compras nestes pontos.
*   **Identificação de Itens em Risco Iminente:** A visualização de dispersão de risco revela os itens cujo estoque acabará antes do tempo de entrega física de novos lotes (área de stockout iminente), permitindo antecipação a eventuais paradas de máquina.
*   **Estrutura de Pareto Estrita:** 20% dos itens da planta respondem por aproximadamente 80% do investimento financeiro anual necessário (Classe A). O painel cruzado de Pareto expõe quais destes itens também possuem score elevado de risco técnico.

---

## 💡 Decisões Apoiadas pelo Case

O projeto atua diretamente na otimização de rotinas de supply chain e manutenção, apoiando as seguintes decisões críticas:
*   **Contratos MRO de Longo Prazo:** Quais materiais devem ter estoques consignados em fornecedores ou contratos com lead times curtos garantidos.
*   **Abertura Preventiva de Compras:** Automação de solicitações de aquisição de materiais que cruzaram o limiar de ponto de pedido dinâmico.
*   **Redução de Overstock:** Identificação de materiais Classe C com cobertura superior a 180 dias, recomendando suspensão imediata de novas ordens de compra para liberação de capital de giro.

---

## 💰 Impacto Potencial (Cenário de Análise Simulada)

> [!NOTE]
> Os impactos citados abaixo constituem uma **estimativa analítica** e um **cenário simulado** com base nas distribuições estatísticas dos dados sintéticos gerados pelo modelo.

*   **Redução Potencial de Tempo:** Estimativa de até **60% a 70% de redução no tempo gasto** por planejadores em análises de priorização visual e manual de planilhas.
*   **Otimização Financeira:** Identificação de potencial liberação de capital em estoque parado na ordem de **R$ 150k a R$ 300k** ao adequar os excedentes de itens não críticos (Classe C / Baixo Score).
*   **Mitigação de Riscos operacionais:** Rastreabilidade imediata e visual de todos os itens com risco iminente de stockout, auxiliando na mitigação de prejuízos operacionais decorrentes de paradas não planejadas de produção.

---

## 🛠️ Stack Técnica

*   **Python 3.10+** (Bibliotecas principais: `pandas` e `numpy`)
*   **Frontend Analítico:** HTML5, CSS3 estrutural responsivo.
*   **Bibliotecas de Visualização Client-Side:**
    *   **Chart.js** (para criação de gráficos interativos: barras, linhas, dispersão, bolhas e pareto).
    *   **PapaParse** (para parsing rápido e ingestão de arquivos CSV em tempo de execução no navegador).

---

## ⚠️ Limitações do Modelo

1.  **Insumos Sintéticos:** Por se tratar de dados simulados, as curvas financeiras e as contagens representam um perfil teórico e estatístico, necessitando de carregamento de base real para validação industrial prática.
2.  **Calibração de Pesos:** A fórmula de criticidade atual adota pesos fixos. Dependendo da criticidade financeira de certas fábricas, o peso do custo ou do lead time pode exigir reprogramação ou ajuste empírico.
3.  **Dependência de Entrada de Engenharia:** A variável `eng_crit` é qualitativa e requer auditoria periódica para evitar notas superestimadas por parte das equipes de manutenção.

---

## 🔮 Próximas Fases do Case

*   Adição de histórico dinâmico de compras para calcular dinamicamente o desvio padrão de lead time por fornecedor.
*   Modelagem estatística preditiva para prever quebras futuras de ativos (RCM) associadas às demandas de sobressalentes.
*   Criação de funcionalidade de simulação dinâmica de cenários diretamente no front-end, permitindo que o usuário manipule os pesos do score em tempo real através de barras deslizantes.

---

## 🔄 Como Executar

Para reproduzir este estudo de caso localmente:

1.  **Inicialize o ambiente virtual e instale dependências:**
    ```bash
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    ```
2.  **Gere a base simulada de materiais:**
    ```bash
    python src/generate_data.py
    ```
3.  **Execute o pipeline ETL de modelagem:**
    ```bash
    python src/etl.py
    ```
4.  **Inicie o servidor local para abrir o painel executivo:**
    ```bash
    python -m http.server 8000
    ```
    Navegue no navegador para: [http://localhost:8000/dashboard/](http://localhost:8000/dashboard/)

---

## 🔗 Links Úteis

*   [Código do Pipeline ETL (etl.py)](file:///C:/Users/Administrador/Documents/BOM-Criticidade/src/etl.py)
*   [Script Gerador de Dados (generate_data.py)](file:///C:/Users/Administrador/Documents/BOM-Criticidade/src/generate_data.py)
*   [Painel Web Executivo (index.html)](file:///C:/Users/Administrador/Documents/BOM-Criticidade/dashboard/index.html)
*   [Dicionário de Dados do Modelo](file:///C:/Users/Administrador/Documents/BOM-Criticidade/DATA_DICTIONARY.md)
