// dashboard/script.js

// Caminhos de fallback do CSV processado
const DATA_PATHS = [
  "../data/processed/criticidade.csv",
  "./data/processed/criticidade.csv",
  "./data/processed/sample_criticidade.csv",
  "data/processed/criticidade.csv"
];

// Formatadores Locais (pt-BR)
const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const fmtInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const fmtMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

// Helpers Utilitários
const toNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

// Cores temáticas para Chart.js
const colors = {
  blue: "rgba(56, 189, 248, 0.85)",
  blueBorder: "rgba(56, 189, 248, 1)",
  orange: "rgba(249, 115, 22, 0.85)",
  orangeBorder: "rgba(249, 115, 22, 1)",
  green: "rgba(16, 185, 129, 0.85)",
  greenBorder: "rgba(16, 185, 129, 1)",
  violet: "rgba(139, 92, 246, 0.85)",
  violetBorder: "rgba(139, 92, 246, 1)",
  red: "rgba(239, 68, 68, 0.85)",
  redBorder: "rgba(239, 68, 68, 1)",
  grid: "rgba(255, 255, 255, 0.08)",
  text: "#94a3b8",
};

// Configuração global de fontes e grades do Chart.js
Chart.defaults.color = colors.text;
Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";

function tryLoadCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      header: true,
      download: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.data && res.data.length) {
          resolve(res.data);
        } else {
          reject(new Error("CSV vazio ou inválido"));
        }
      },
      error: (err) => reject(err),
    });
  });
}

async function loadCsvWithFallback(paths) {
  for (const p of paths) {
    const url = p + `?t=${Date.now()}`;
    try {
      const data = await tryLoadCsv(url);
      console.log(`[OK] CSV carregado com sucesso de: ${p}`);
      return data;
    } catch (e) {
      console.warn(`[Aviso] Falha ao carregar ${p}:`, e.message || e);
    }
  }
  throw new Error("Nenhum arquivo CSV pôde ser carregado a partir dos caminhos especificados.");
}

// -------------------------------------------------------------
// FUNÇÕES DE CONSTRUÇÃO DE GRÁFICOS
// -------------------------------------------------------------

// 1) Top 20 por Score
function buildCritChart(data) {
  const top20 = [...data].sort((a, b) => b.score - a.score).slice(0, 20);
  const labels = top20.map((d) => d.material_id);
  const scores = top20.map((d) => d.score);

  const ctx = document.getElementById("critChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Score de Criticidade",
          data: scores,
          backgroundColor: colors.blue,
          borderColor: colors.blueBorder,
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Score: ${fmt.format(ctx.raw)}`,
            afterBody: (ctx) => {
              const item = top20[ctx[0].dataIndex];
              return [
                `Classe ABC: ${item.abc_class}`,
                `Lead Time: ${fmtInt.format(item.lead_time_days)} dias`,
                `Cobertura: ${fmtInt.format(item.coverage_days)} dias`,
                `Custo Unit.: ${fmtMoney.format(item.unit_cost)}`,
              ];
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: colors.grid } },
      },
    },
  });
}

// 2) Histograma dos Scores
function buildHistScore(data) {
  const scores = data.map((d) => d.score).filter((s) => !isNaN(s));
  const k = 10; // número de faixas
  const min = 0;
  const max = 1;
  const step = (max - min) / k;
  
  const counts = new Array(k).fill(0);
  scores.forEach((s) => {
    let idx = Math.floor((s - min) / step);
    if (idx >= k) idx = k - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  });

  const labels = counts.map((_, i) => `${(min + i * step).toFixed(1)} - ${(min + (i + 1) * step).toFixed(1)}`);

  const ctx = document.getElementById("histScore").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Materiais nesta faixa",
          data: counts,
          backgroundColor: colors.violet,
          borderColor: colors.violetBorder,
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} materiais`,
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: colors.grid } },
      },
    },
  });
}

// 3) Dispersão Lead Time vs Custo (Raio = Score)
function buildBubbleLeadCusto(data) {
  const pts = data.map((d) => ({
    x: d.lead_time_days,
    y: d.unit_cost,
    r: 3 + 12 * d.score, // escala dinâmica de tamanho
    label: d.material_id,
    score: d.score,
  }));

  const ctx = document.getElementById("bubbleLeadCusto").getContext("2d");
  new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Materiais",
          data: pts,
          backgroundColor: "rgba(249, 115, 22, 0.6)",
          borderColor: colors.orangeBorder,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const p = ctx.raw;
              return [
                `Material: ${p.label}`,
                `Lead Time: ${fmtInt.format(p.x)} dias`,
                `Custo Unit.: ${fmtMoney.format(p.y)}`,
                `Score: ${fmt.format(p.score)}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Lead time (dias)" },
          grid: { color: colors.grid },
        },
        y: {
          title: { display: true, text: "Custo unitário (R$)" },
          beginAtZero: true,
          grid: { color: colors.grid },
        },
      },
    },
  });
}

// 4) Pareto ABC por Valor Anual (Top 20)
function buildParetoABC(data) {
  const sorted = [...data].sort((a, b) => b.annual_value - a.annual_value);
  const top20 = sorted.slice(0, 20);
  const labels = top20.map((d) => d.material_id);
  const values = top20.map((d) => d.annual_value);
  
  // Acumulado geral para linha percentual
  const total = data.reduce((s, v) => s + v.annual_value, 0) || 1;
  let acc = 0;
  const cumPercentage = top20.map((d) => {
    acc += d.annual_value;
    return (acc / total) * 100;
  });

  const ctx = document.getElementById("paretoABC").getContext("2d");
  new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Custo Anual (R$)",
          data: values,
          yAxisID: "y",
          backgroundColor: colors.blue,
          borderColor: colors.blueBorder,
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          type: "line",
          label: "Acumulado Global (%)",
          data: cumPercentage,
          yAxisID: "y1",
          borderColor: colors.orangeBorder,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: colors.orangeBorder,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) return `Custo Anual: ${fmtMoney.format(ctx.raw)}`;
              return `Acumulado: ${fmt.format(ctx.raw)}%`;
            },
          },
        },
      },
      scales: {
        y: {
          type: "linear",
          position: "left",
          title: { display: true, text: "Custo Anual (R$)" },
          grid: { color: colors.grid },
        },
        y1: {
          type: "linear",
          position: "right",
          min: 0,
          max: 100,
          title: { display: true, text: "Acumulado (%)" },
          grid: { drawOnChartArea: false },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

// 5) Distribuição por Criticidade de Engenharia
function buildBarCritEng(data) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  data.forEach((d) => {
    const val = Math.round(d.eng_crit);
    if (counts[val] !== undefined) counts[val]++;
  });

  const labels = ["1 (Muito Baixa)", "2 (Baixa)", "3 (Média)", "4 (Alta)", "5 (Crítica)"];
  const values = [counts[1], counts[2], counts[3], counts[4], counts[5]];

  const ctx = document.getElementById("barCritEng").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Quantidade de Itens",
          data: values,
          backgroundColor: colors.green,
          borderColor: colors.greenBorder,
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: colors.grid } },
      },
    },
  });
}

// 6) Risco de Stockout (Lead Time x Cobertura)
function buildScatterRisk(data) {
  const pts = data.map((d) => ({
    x: d.coverage_days,
    y: d.lead_time_days,
    material_id: d.material_id,
    eng_crit: d.eng_crit,
    score: d.score,
  }));

  const maxVal = Math.max(10, ...data.map((d) => Math.max(d.coverage_days, d.lead_time_days))) || 180;
  const linePts = [
    { x: 0, y: 0 },
    { x: maxVal, y: maxVal },
  ];

  const ctx = document.getElementById("scatterRisk").getContext("2d");
  new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Itens Saudáveis",
          data: pts.filter((p) => p.x >= p.y),
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: colors.greenBorder,
          borderWidth: 1,
        },
        {
          label: "Itens em Risco (LT > Cobertura)",
          data: pts.filter((p) => p.x < p.y),
          backgroundColor: "rgba(239, 68, 68, 0.6)",
          borderColor: colors.redBorder,
          borderWidth: 1,
        },
        {
          label: "Linha de Ruptura (y = x)",
          type: "line",
          data: linePts,
          borderColor: "rgba(148, 163, 184, 0.6)",
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          showLine: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 2) return "Linha de Ruptura (Lead Time = Cobertura)";
              const p = ctx.raw;
              return [
                `Material: ${p.material_id}`,
                `Cobertura: ${fmtInt.format(p.x)} dias`,
                `Lead Time: ${fmtInt.format(p.y)} dias`,
                `Crit. Eng: ${fmtInt.format(p.eng_crit)}`,
                `Score: ${fmt.format(p.score)}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Cobertura de Estoque (dias)" },
          grid: { color: colors.grid },
          beginAtZero: true,
        },
        y: {
          title: { display: true, text: "Lead Time de Fornecimento (dias)" },
          grid: { color: colors.grid },
          beginAtZero: true,
        },
      },
    },
  });
}

// 7) Curva de Pareto do Score Acumulado
function buildParetoScore(data) {
  const sorted = [...data].sort((a, b) => b.score - a.score);
  const total = sorted.reduce((sum, d) => sum + d.score, 0) || 1;
  let running = 0;

  const cumPercentages = sorted.map((d) => {
    running += d.score;
    return (running / total) * 100;
  });

  const labels = sorted.map((_, i) => (i + 1).toString());

  const ctx = document.getElementById("pareto").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Percentual Acumulado do Score de Criticidade",
          data: cumPercentages,
          borderColor: colors.blueBorder,
          backgroundColor: "rgba(56, 189, 248, 0.15)",
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.15,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (ctx) => `Item N° ${ctx[0].label}`,
            label: (ctx) => `Acumulado: ${fmt.format(ctx.raw)}%`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Itens Ordenados por Criticidade (Rank)" },
          ticks: { maxTicksLimit: 15 },
          grid: { display: false },
        },
        y: {
          title: { display: true, text: "Acumulado (%)" },
          min: 0,
          max: 100,
          ticks: { callback: (v) => `${v}%` },
          grid: { color: colors.grid },
        },
      },
    },
  });
}

// -------------------------------------------------------------
// TABELA E MÈTRICAS
// -------------------------------------------------------------

function buildRiskTable(data) {
  const tbody = document.querySelector("#riskTable tbody");
  tbody.innerHTML = "";

  // Ordena por maior score de risco, depois por score de criticidade
  const sorted = [...data]
    .sort((a, b) => {
      if (b.risk_score !== a.risk_score) {
        return b.risk_score - a.risk_score;
      }
      return b.score - a.score;
    })
    .slice(0, 20);

  const getBadgeClassAndText = (r) => {
    if (r.risk_flag && r.suggest_qty > 0) {
      return { css: "action-buy", text: "Reabastecer Agora" };
    }
    if (!r.risk_flag && r.coverage_days > r.lead_time_days * 2) {
      return { css: "action-reduce", text: "Reduzir Estoque" };
    }
    if (r.lead_time_days >= 60) {
      return { css: "action-review", text: "Rever Lead Time" };
    }
    return { css: "action-monitor", text: "Monitorar" };
  };

  sorted.forEach((r) => {
    const badge = getBadgeClassAndText(r);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.material_id}</td>
      <td>${fmtInt.format(r.eng_crit)}</td>
      <td>${fmtInt.format(r.lead_time_days)}</td>
      <td>${fmtInt.format(r.coverage_days)}</td>
      <td>${fmt.format(r.score)}</td>
      <td>${fmt.format(r.risk_score)}</td>
      <td>${fmtInt.format(r.suggest_qty)}</td>
      <td><span class="badge-action ${badge.css}">${badge.text}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Calcula KPIs e atualiza no painel superior
function buildKpis(data) {
  const totalMaterials = data.length;
  
  const classA = data.filter((d) => d.abc_class === "A");
  const classACount = classA.length;
  const classAPct = totalMaterials > 0 ? (classACount / totalMaterials) * 100 : 0;

  const sumLeadTime = data.reduce((s, d) => s + d.lead_time_days, 0);
  const avgLeadTime = totalMaterials > 0 ? sumLeadTime / totalMaterials : 0;

  const totalAnnualCost = data.reduce((s, d) => s + d.annual_value, 0);
  const maxScore = Math.max(...data.map((d) => d.score), 0);

  // Injetar nos elementos HTML
  document.getElementById("kpi-total-materials").innerText = fmtInt.format(totalMaterials);
  document.getElementById("kpi-class-a-count").innerText = fmtInt.format(classACount);
  document.getElementById("kpi-class-a-pct").innerText = `${fmt.format(classAPct)}% dos itens`;
  document.getElementById("kpi-avg-lead-time").innerText = `${fmt.format(avgLeadTime)} dias`;
  document.getElementById("kpi-total-annual-cost").innerText = fmtMoney.format(totalAnnualCost);
  document.getElementById("kpi-max-score").innerText = fmt.format(maxScore);
}

// -------------------------------------------------------------
// BOOTSTRAP / INICIALIZAÇÃO
// -------------------------------------------------------------
(async function init() {
  try {
    const rawData = await loadCsvWithFallback(DATA_PATHS);
    if (!rawData || !rawData.length) {
      throw new Error("Não foi possível carregar os dados ou o arquivo está vazio.");
    }

    // Tipagem explícita e limpeza de campos
    const data = rawData.map((r) => ({
      material_id: r.material_id ?? "N/A",
      category: r.category ?? "N/A",
      supplier: r.supplier ?? "N/A",
      eng_crit: toNum(r.eng_crit),
      lead_time_days: toNum(r.lead_time_days),
      unit_cost: toNum(r.unit_cost),
      stock_qty: toNum(r.stock_qty),
      daily_consumption: toNum(r.daily_consumption),
      coverage_days: toNum(r.coverage_days),
      annual_value: toNum(r.annual_value),
      score: toNum(r.score),
      risk_flag: toNum(r.risk_flag),
      risk_score: toNum(r.risk_score),
      abc_class: r.abc_class ?? "C",
      xyz_class: r.xyz_class ?? "Z",
      suggest_qty: toNum(r.suggest_qty),
    }));

    // Executa as renderizações
    buildKpis(data);
    buildCritChart(data);
    buildHistScore(data);
    buildBubbleLeadCusto(data);
    buildParetoABC(data);
    buildBarCritEng(data);
    buildScatterRisk(data);
    buildParetoScore(data);
    buildRiskTable(data);

  } catch (err) {
    console.error("Erro ao carregar o painel:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#ef4444;color:#fff;padding:12px;text-align:center;font-weight:700">Erro ao carregar painel de controle: ${err.message}</div>`
    );
  }
})();
