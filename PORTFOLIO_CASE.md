# Estudo de Caso: BOM Criticidade

## Sistema Analítico de Priorização de Materiais Industriais

---

## 1. Contexto do Projeto

Em operações industriais de capital intensivo (como plantas de fertilizantes, petroquímicas ou siderúrgicas), a manutenção e o suprimento de ativos são críticos para a continuidade de negócio. O gerenciamento de estoque de peças de reposição (MRO - Manutenção, Reparo e Operação) envolve catálogos extensos denominados **BOM (Bill of Materials)**. Este projeto simula um almoxarifado técnico de uma planta industrial contendo 1.000 materiais sobressalentes ativos de diferentes especialidades (mecânica, elétrica, instrumentação, vedação, automação, pneumática, hidráulica e consumíveis).

---

## 2. Problema de Negócio

Como priorizar de forma reprodutível e livre de subjetividade o abastecimento de milhares de materiais técnicos, reduzindo as chances de stockout de peças críticas (o que pode paralisar a produção e custar até dezenas de milhares de reais por hora) sem inflar o capital de giro imobilizado em estoque?

Tradicionalmente, a classificação de prioridade de ressuprimento é feita por percepções qualitativas ou baseada puramente na curva ABC financeira de consumo (que falha ao ignorar itens baratos, mas essenciais para o funcionamento físico das máquinas).

---

## 3. Solução Analítica e Metodologia

Este estudo desenvolve uma metodologia baseada em dados para gerar um **score de criticidade interpretável** e de fácil assimilação executiva.

O pipeline analítico realiza:
1.  **Ingestão de Dados Brutos:** Carregamento de dados de fornecedores, categorias, tempos de entrega, consumo histórico e criticidade física.
2.  **Cálculo Dinâmico de Cobertura e Risco de Stockout:** Mapeamento em dias de quanto tempo o saldo físico de estoque atende ao consumo, ponderado em relação ao lead time do fornecedor.
3.  **Normalização das Dimensões:** Padronização linear em escala $[0, 1]$ utilizando MinMax para equalizar variáveis de unidades distintas (como dias, reais e escalas qualitativas).
4.  **Pontuação Multicritério:** Aplicação da fórmula ponderada de criticidade.
5.  **Estratificação ABC por Criticidade:** Classificação baseada em limites fixos de score para otimização de foco de controle.
6.  **Sugestão de Ações de Controle:** Regras estruturadas para direcionar compras e gestão de fornecedores.

---

## 4. Fórmula do Score de Criticidade

O score consolida cinco fatores críticos e varia de `0.00` (mínima prioridade) a `1.00` (máxima urgência):

$$\text{Score} = 0.35 \times \text{Criticidade Técnica} + 0.25 \times \text{Custo Parada} + 0.20 \times \text{Lead Time} + 0.10 \times \text{Risco Substituição} + 0.10 \times \text{Risco Stockout}$$

*   **Criticidade Técnica de Engenharia (35%):** Nível de relevância física do item atribuído pela equipe de manutenção técnica (escala 1 a 5).
*   **Custo de Parada de Planta (25%):** Impacto financeiro por hora de inatividade do equipamento que depende da peça (normalizado).
*   **Lead Time de Entrega (20%):** Tempo necessário para o fornecedor entregar o lote físico (normalizado).
*   **Risco de Substituição (10%):** Facilidade de encontrar substitutos ou fornecedores locais alternativos (escala 1 a 5).
*   **Risco de Stockout (10%):** Severidade de desabastecimento calculada pela relação entre cobertura e tempo de entrega.

---

## 5. Estratificação de Prioridade (Nova Lógica ABC)

Diferente de Pareto financeiros tradicionais, o agrupamento de classes é derivado diretamente do score consolidado:
*   **Classe A (Top 15%):** Materiais altamente críticos para a planta, exigindo estoque de segurança rigoroso e contratos de parceria.
*   **Classe B (Próximos 30%):** Materiais de importância moderada, monitorados periodicamente.
*   **Classe C (Restante 55%):** Materiais padrão ou com baixo risco logístico/financeiro.

---

## 6. Ações de Controle Recomendadas

O modelo de decisão sugere uma das 7 ações distintas para cada item de estoque:
*   **Reabastecer agora:** Alerta crítico para itens importantes com cobertura inferior ao lead time do fornecedor.
*   **Revisar estoque mínimo:** Itens com saldos físicos abaixo do ponto de ressuprimento dinâmico.
*   **Negociar lead time:** Itens Classe A ou B com fornecimento superior a 45 dias.
*   **Desenvolver fornecedor alternativo:** Itens importados Classe A/B com alto risco de substituição.
*   **Reduzir excesso de estoque:** Itens Classe C com cobertura superior a 100 dias (liberação de capital de giro).
*   **Monitorar consumo:** Itens com cobertura saudável e estável.
*   **Manter política atual:** Itens dentro das metas de planejamento.

---

## 7. Principais Resultados e Insights (Cenário Simulador)

Com base nos dados gerados e processados:
*   **Detecção de Excesso de Estoque:** Mapeamento de 85 itens Classe C com estoques sobredimensionados, representando oportunidade analítica de redução do capital de giro estagnado.
*   **Evidência de Risco:** Localização de 79 itens altamente críticos com risco de ruptura iminente antes do recebimento da ordem de compra, permitindo intervenção pró-ativa.
*   **Concentração por Especialidade:** Mapeamento claro dos custos e riscos concentrados em categorias específicas (como peças mecânicas pesadas ou componentes elétricos importados).

---

## 8. Stack Técnica

*   **Ingestão e ETL:** Python 3.10+ (com Pandas e NumPy).
*   **Dashboard Visual:** HTML5, CSS3, JavaScript puro (PapaParse para ler arquivos de dados brutos locais e Chart.js para renderização de gráficos).

---

## 9. Limitações do Modelo

> [!IMPORTANT]
> *   **Dados Sintéticos:** O dataset foi simulado estatisticamente para ilustrar as relações e comportamentos reais de plantas industriais. Nenhum dado de empresa real foi exposto.
> *   **Calibração de Pesos:** A parametrização dos pesos do score (35/25/20/10/10) representa diretrizes iniciais de negócio e deve ser validada e recalibrada com o time de engenharia da planta.
> *   **Não Substituição do Técnico:** O painel serve de apoio de triagem analítica, não substituindo o julgamento técnico, de suprimentos ou de segurança.

---

## 10. Links de Navegação do Projeto

*   [Pipeline de Tratamento (src/etl.py)](file:///C:/Users/Administrador/Documents/BOM-Criticidade/src/etl.py)
*   [Script de Geração (src/generate_data.py)](file:///C:/Users/Administrador/Documents/BOM-Criticidade/src/generate_data.py)
*   [Dicionário de Variáveis (DATA_DICTIONARY.md)](file:///C:/Users/Administrador/Documents/BOM-Criticidade/DATA_DICTIONARY.md)
*   [Interface do Dashboard (dashboard/index.html)](file:///C:/Users/Administrador/Documents/BOM-Criticidade/dashboard/index.html)
