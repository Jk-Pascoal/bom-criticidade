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

// Cores Executivas e Sóbrias para Chart.js
const colors = {
  blueDark: "#1e3a8a",
  blueMedium: "#3b82f6",
  blueLight: "#93c5fd",
  charcoal: "#334155",
  grayMedium: "#64748b",
  grayLight: "#cbd5e1",
  green: "#16a34a",
  red: "#dc2626",
  grid: "#e2e8f0",
  text: "#334155",
};

// Configuração global de fontes e grades do Chart.js
Chart.defaults.color = colors.text;
Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
Chart.defaults.font.size = 11;

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
// GRÁFICOS DO DASHBOARD (7 GRÁFICOS ÚTEIS)
// -------------------------------------------------------------

// 1. Distribuição ABC (Doughnut)
function buildAbcChart(data) {
  const counts = { A: 0, B: 0, C: 0 };
  data.forEach((d) => {
    if (counts[d.abc_class] !== undefined) counts[d.abc_class]++;
  });

  const ctx = document.getElementById("abcChart").getContext("2d");
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Classe A (Crítico)", "Classe B (Importante)", "Classe C (Padrão)"],
      datasets: [
        {
          data: [counts.A, counts.B, counts.C],
          backgroundColor: [colors.blueDark, colors.grayMedium, colors.grayLight],
          borderColor: "#ffffff",
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12 } },
      },
    },
  });
}

// 2. Histograma do Score (Bar)
function buildHistChart(data) {
  const scores = data.map((d) => d.criticality_score).filter((s) => !isNaN(s));
  const k = 10;
  const counts = new Array(k).fill(0);
  
  scores.forEach((s) => {
    let idx = Math.floor(s * k);
    if (idx >= k) idx = k - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  });

  const labels = counts.map((_, i) => `${(i / k).toFixed(1)}-${((i + 1) / k).toFixed(1)}`);

  const ctx = document.getElementById("histChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Itens",
          data: counts,
          backgroundColor: colors.charcoal,
          borderRadius: 3,
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

// 3. Top 15 Materiais por Score (Horizontal Bar)
function buildTop15Chart(data) {
  const top15 = [...data].sort((a, b) => b.criticality_score - a.criticality_score).slice(0, 15);
  
  // Nomes curtos ou códigos para não quebrar o layout
  const labels = top15.map((d) => d.material_id);
  const values = top15.map((d) => d.criticality_score);

  const ctx = document.getElementById("top15Chart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Score",
          data: values,
          backgroundColor: colors.blueDark,
          borderRadius: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterBody: (ctx) => {
              const item = top15[ctx[0].dataIndex];
              return `Material: ${item.material_name}\nClasse: ${item.abc_class}\nCobertura: ${item.coverage_days}d | LT: ${item.lead_time_days}d`;
            }
          }
        }
      },
      scales: {
        x: { beginAtZero: true, max: 1.0, grid: { color: colors.grid } },
        y: { grid: { display: false } },
      },
    },
  });
}

// 4. Lead Time x Cobertura (Scatter com linha y=x)
function buildScatterRiskChart(data) {
  const pts = data.map((d) => ({
    x: d.coverage_days,
    y: d.lead_time_days,
    id: d.material_id,
    name: d.material_name,
    score: d.criticality_score,
  }));

  const maxVal = Math.max(20, ...data.map((d) => Math.max(d.coverage_days, d.lead_time_days))) || 180;

  const ctx = document.getElementById("scatterRiskChart").getContext("2d");
  new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Materiais",
          data: pts,
          // Cor vermelha se LT > Cobertura (risco), verde se saudável
          backgroundColor: pts.map((p) => (p.y > p.x ? "rgba(220, 38, 38, 0.7)" : "rgba(22, 163, 74, 0.6)")),
          borderColor: pts.map((p) => (p.y > p.x ? colors.red : colors.green)),
          borderWidth: 1,
          pointRadius: 4,
        },
        {
          label: "Linha de Ruptura (y = x)",
          type: "line",
          data: [{ x: 0, y: 0 }, { x: maxVal, y: maxVal }],
          borderColor: "#64748b",
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
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 1) return "Linha de Ruptura (Lead Time = Cobertura)";
              const p = ctx.raw;
              return [
                `Material: ${p.id} - ${p.name}`,
                `Cobertura: ${fmtInt.format(p.x)} dias`,
                `Lead Time: ${fmtInt.format(p.y)} dias`,
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
          title: { display: true, text: "Lead Time (dias)" },
          grid: { color: colors.grid },
          beginAtZero: true,
        },
      },
    },
  });
}

// 5. Custo de Parada x Score (Scatter/Bubble)
function buildScatterDowntimeChart(data) {
  const pts = data.map((d) => ({
    x: d.criticality_score,
    y: d.downtime_cost_hour,
    id: d.material_id,
    name: d.material_name,
    class: d.abc_class,
  }));

  const ctx = document.getElementById("scatterDowntimeChart").getContext("2d");
  new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Materiais",
          data: pts,
          backgroundColor: "rgba(30, 58, 138, 0.6)",
          borderColor: colors.blueDark,
          borderWidth: 1,
          pointRadius: 4,
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
                `Material: ${p.id} - ${p.name}`,
                `Score Criticidade: ${fmt.format(p.x)}`,
                `Custo Parada: ${fmtMoney.format(p.y)}/h`,
                `Classe: ${p.class}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Score de Criticidade" },
          grid: { color: colors.grid },
          beginAtZero: true,
          max: 1.0,
        },
        y: {
          title: { display: true, text: "Custo de Parada (R$/h)" },
          grid: { color: colors.grid },
          beginAtZero: true,
        },
      },
    },
  });
}

// 6. Valor Anual Consumido por Categoria (Bar)
function buildCategoryCostChart(data) {
  const costs = {};
  data.forEach((d) => {
    costs[d.category] = (costs[d.category] || 0) + d.annual_consumption_value;
  });

  // Ordenar decrescente
  const sortedCats = Object.keys(costs).sort((a, b) => costs[b] - costs[a]);
  const labels = sortedCats;
  const values = sortedCats.map((c) => costs[c]);

  const ctx = document.getElementById("barCategoryCostChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors.grayMedium,
          borderRadius: 3,
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
            label: (ctx) => `Custo Anual: ${fmtMoney.format(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: colors.grid } },
      },
    },
  });
}

// 7. Risco de Ruptura por Categoria (Bar)
function buildRiskCategoryChart(data) {
  const counts = {};
  const risks = {};
  
  data.forEach((d) => {
    counts[d.category] = (counts[d.category] || 0) + 1;
    if (d.lead_time_days > d.coverage_days) {
      risks[d.category] = (risks[d.category] || 0) + 1;
    }
  });

  const labels = Object.keys(counts).sort();
  const values = labels.map((c) => {
    const total = counts[c] || 1;
    const r = risks[c] || 0;
    return (r / total) * 100;
  });

  const ctx = document.getElementById("barRiskCategoryChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors.red,
          borderRadius: 3,
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
            label: (ctx) => `Taxa de Risco: ${fmt.format(ctx.raw)}%`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: (v) => `${v}%` },
          grid: { color: colors.grid },
        },
      },
    },
  });
}

// -------------------------------------------------------------
// TABELA E METRICAS (SOBRIAS, SEM EMOJIS, DESTAQUES DISCRETOS)
// -------------------------------------------------------------

function buildRiskTable(data) {
  const tbody = document.querySelector("#riskTable tbody");
  tbody.innerHTML = "";

  // Mostrar os 25 itens mais críticos
  const sorted = [...data]
    .sort((a, b) => b.criticality_score - a.criticality_score)
    .slice(0, 25);

  const getActionBadge = (action) => {
    let css = "action-default";
    if (action === "Reabastecer agora") css = "action-buy";
    else if (action === "Revisar estoque mínimo") css = "action-min-stock";
    else if (action === "Desenvolver fornecedor alternativo") css = "action-supplier";
    else if (action === "Negociar lead time") css = "action-lead-time";
    else if (action === "Reduzir excesso de estoque") css = "action-reduce";
    else if (action === "Monitorar consumo") css = "action-monitor";
    
    return `<span class="badge-action ${css}">${action}</span>`;
  };

  sorted.forEach((r) => {
    const tr = document.createElement("tr");
    
    // Destaca Classe A discretamente com classe de estilo dedicada
    if (r.abc_class === "A") {
      tr.classList.add("class-a-row");
    }

    tr.innerHTML = `
      <td>${r.material_id}</td>
      <td>${r.material_name}</td>
      <td>${r.category}</td>
      <td>${r.equipment_family}</td>
      <td>${r.supplier_name}</td>
      <td>${fmtInt.format(r.lead_time_days)}</td>
      <td>${fmtInt.format(r.coverage_days)}</td>
      <td>${fmtMoney.format(r.downtime_cost_hour)}</td>
      <td><strong>${fmt.format(r.criticality_score)}</strong></td>
      <td><strong>${r.abc_class}</strong></td>
      <td>${getActionBadge(r.recommended_action)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function buildKpis(data) {
  const total = data.length;
  
  const classACount = data.filter((d) => d.abc_class === "A").length;
  const classAPct = total > 0 ? (classACount / total) * 100 : 0;

  // Itens em risco: Lead Time > Cobertura
  const riskCount = data.filter((d) => d.lead_time_days > d.coverage_days).length;
  const riskPct = total > 0 ? (riskCount / total) * 100 : 0;

  const avgLead = data.reduce((s, d) => s + d.lead_time_days, 0) / (total || 1);
  const totalAnnualCost = data.reduce((s, d) => s + d.annual_consumption_value, 0);
  const maxScore = Math.max(...data.map((d) => d.criticality_score), 0);

  // Preencher no HTML
  document.getElementById("kpi-total").innerText = fmtInt.format(total);
  document.getElementById("kpi-class-a").innerText = fmtInt.format(classACount);
  document.getElementById("kpi-class-a-pct").innerText = `${fmt.format(classAPct)}% do catálogo`;
  document.getElementById("kpi-rupture-pct").innerText = `${fmt.format(riskPct)}%`;
  document.getElementById("kpi-avg-lead").innerText = `${fmt.format(avgLead)} dias`;
  document.getElementById("kpi-total-value").innerText = fmtMoney.format(totalAnnualCost);
  document.getElementById("kpi-max-score").innerText = fmt.format(maxScore);
}

// -------------------------------------------------------------
// INICIALIZAÇÃO DO CONTEXTO
// -------------------------------------------------------------
(async function init() {
  try {
    const rawData = await loadCsvWithFallback(DATA_PATHS);
    if (!rawData || !rawData.length) {
      throw new Error("Base de dados indisponível.");
    }

    buildKpis(rawData);
    buildAbcChart(rawData);
    buildHistChart(rawData);
    buildTop15Chart(rawData);
    buildScatterRiskChart(rawData);
    buildScatterDowntimeChart(rawData);
    buildCategoryCostChart(rawData);
    buildRiskCategoryChart(rawData);
    buildRiskTable(rawData);

  } catch (err) {
    console.error("Falha ao carregar o painel:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#dc2626;color:#fff;padding:8px;text-align:center;font-weight:700;font-size:0.85rem">Erro na carga do Painel: ${err.message}</div>`
    );
  }
})();
