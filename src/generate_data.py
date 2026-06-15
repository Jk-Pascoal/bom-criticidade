import os
import random
import csv
import math

# Definir semente para reprodutibilidade
random.seed(42)

os.makedirs("data/raw", exist_ok=True)
path = "data/raw/bom.csv"

# Cabeçalhos do arquivo bruto
headers = [
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

# Nomes industriais plausíveis de materiais e especificações por categoria e família
item_templates = [
    # (template_name, category, equipment_family, min_cost, max_cost, min_crit, max_crit)
    ("Rolamento SKF {spec}", "Mecanico", "Motores", 80, 1500, 3, 5),
    ("Rolamento FAG {spec}", "Mecanico", "Redutores", 120, 2200, 3, 5),
    ("Selo mecanico {spec} para bomba", "Vedacao", "Bombas", 300, 8000, 4, 5),
    ("Inversor de frequencia {spec} kW", "Automacao", "Paineis eletricos", 1500, 25000, 3, 5),
    ("Sensor de pressao {spec} bar", "Instrumentacao", "Sistemas de dosagem", 250, 1800, 2, 4),
    ("Valvula esfera inox {spec} pol", "Vedacao", "Valvulas", 150, 4500, 3, 5),
    ("Correia transportadora {spec} mm", "Mecanico", "Transportadores", 2000, 35000, 4, 5),
    ("Motor eletrico WEG {spec} cv", "Eletrico", "Motores", 800, 18000, 4, 5),
    ("Contator tripolar {spec}A", "Eletrico", "Paineis eletricos", 90, 1200, 2, 3),
    ("Redutor helicoidal SEW {spec}", "Mecanico", "Redutores", 4000, 45000, 4, 5),
    ("Bico pulverizador {spec}", "Processo", "Sistemas de dosagem", 15, 350, 1, 3),
    ("Chave fim de curso {spec}", "Automacao", "Transportadores", 80, 600, 2, 4),
    ("Acoplamento elastico {spec}", "Mecanico", "Redutores", 150, 3200, 2, 4),
    ("Elemento filtrante {spec} micra", "Consumiveis", "Sistemas de dosagem", 45, 850, 1, 3),
    ("Mangueira hidraulica {spec} PSI", "Hidraulico", "Compressores", 120, 1400, 2, 4),
    ("Junta espiralada {spec} pol", "Vedacao", "Tubulacoes", 10, 250, 1, 3),
    ("CLP modulo digital {spec}", "Automacao", "Paineis eletricos", 800, 7500, 3, 5),
    ("Transmissor de nivel {spec}", "Instrumentacao", "Bombas", 1200, 9500, 3, 5),
    ("Bomba dosadora {spec}", "Processo", "Sistemas de dosagem", 2500, 16000, 4, 5),
    ("Retentor industrial Sabo {spec}mm", "Vedacao", "Bombas", 12, 180, 2, 4),
    ("Parafuso inox {spec}", "Fixadores", "Tubulacoes", 2, 45, 1, 2),
    ("Valvula borboleta {spec} pol", "Mecanico", "Valvulas", 350, 5500, 3, 5),
    ("Filtro Y {spec} pol", "Processo", "Tubulacoes", 150, 1800, 1, 3),
    ("Pressostato {spec}", "Instrumentacao", "Compressores", 180, 1200, 2, 4),
    ("Disjuntor motor {spec}A", "Eletrico", "Paineis eletricos", 120, 950, 2, 4),
    ("Cabo eletrico flexivel {spec}", "Eletrico", "Paineis eletricos", 50, 800, 1, 3),
    ("O-Ring borracha nitrilica {spec}mm", "Vedacao", "Bombas", 1, 20, 1, 3),
    ("Graxa lubrificante alta temp {spec}", "Consumiveis", "Motores", 40, 350, 1, 2),
    ("Sensor indutivo de proximidade {spec}", "Automacao", "Transportadores", 90, 750, 2, 4),
    ("Manometro {spec} bar", "Instrumentacao", "Compressores", 75, 450, 1, 3),
    ("Silenciador pneumatico {spec}", "Pneumatico", "Compressores", 15, 120, 1, 2),
    ("Valvula solenoide {spec}V", "Pneumatico", "Valvulas", 180, 1600, 2, 4),
    ("Fita veda rosca {spec}", "Consumiveis", "Tubulacoes", 2, 15, 1, 1),
    ("Luva de raspa {spec}", "Seguranca", "Instrumentos de campo", 10, 45, 1, 1),
    ("Oculos de protecao {spec}", "Seguranca", "Instrumentos de campo", 15, 75, 1, 1)
]

def generate_spec(template_name):
    if "Rolamento SKF" in template_name or "Rolamento FAG" in template_name:
        return random.choice(["6204-2RS", "6312-C3", "22218-E", "NU 310-ECP", "6205", "6008-2Z"])
    elif "Selo mecanico" in template_name:
        return random.choice(["John Crane 2100 35mm", "Burgmann H74 50mm", "Viton 25mm", "Carbono 40mm"])
    elif "Inversor de frequencia" in template_name:
        return random.choice(["1.5", "7.5", "15", "30", "55", "110"])
    elif "Sensor de pressao" in template_name:
        return random.choice(["0-6", "0-10", "-1-9", "0-16", "0-40"])
    elif "Valvula esfera inox" in template_name or "Valvula borboleta" in template_name or "Filtro Y" in template_name:
        return random.choice(["1/2", "1", "2", "3", "4", "6"])
    elif "Correia transportadora" in template_name:
        return random.choice(["EP 400/3 800", "EP 500/4 1000", "PVC 600 2 lonas", "EP 630/5 1200"])
    elif "Motor eletrico" in template_name:
        return random.choice(["2", "5", "10", "20", "50", "100"])
    elif "Contator tripolar" in template_name:
        return random.choice(["9", "18", "32", "65", "110", "150"])
    elif "Redutor helicoidal" in template_name:
        return random.choice(["R57 i=15", "Falk i=40", "R87 i=25", "Rossi i=10"])
    elif "Bico pulverizador" in template_name:
        return random.choice(["leque 1/4 NPT", "cone cheio", "TeeJet inox", "alta pressao"])
    elif "Chave fim de curso" in template_name:
        return random.choice(["Schmersal rolete", "Honeywell metalica", "Telemecanique"])
    elif "Acoplamento elastico" in template_name:
        return random.choice(["Lovejoy L095", "Falk Steelflex 1040", "Vulcan Vulkardan"])
    elif "Elemento filtrante" in template_name:
        return random.choice(["10", "5", "25", "50", "100"])
    elif "Mangueira hidraulica" in template_name:
        return random.choice(["3000", "4000", "5000"])
    elif "Junta espiralada" in template_name:
        return random.choice(["1/2", "1", "2", "3", "4"])
    elif "CLP modulo digital" in template_name:
        return random.choice(["Siemens DI16", "Rockwell DO8", "Schneider S7-1200", "Siemens AI8"])
    elif "Transmissor de nivel" in template_name:
        return random.choice(["Ultrassonico Vega", "Radar Endress", "Capacitivo Siemens"])
    elif "Bomba dosadora" in template_name:
        return random.choice(["Milton Roy 20 L/h", "Prominent Beta 4", "LMI 5 L/h"])
    elif "Retentor industrial" in template_name:
        return random.choice(["45x62x8", "30x47x7", "50x72x10"])
    elif "Parafuso inox" in template_name:
        return random.choice(["M12x40", "M16x60 A2-70", "M8x25 Allen", "M20x80"])
    elif "Disjuntor motor" in template_name:
        return random.choice(["1.6-2.5", "4-6.3", "10-16", "25-40"])
    elif "Cabo eletrico flexivel" in template_name:
        return random.choice(["2.5mm2 750V", "4mm2 750V", "10mm2", "35mm2"])
    elif "O-Ring borracha nitrilica" in template_name:
        return random.choice(["25x3", "50x4", "10x2.5", "100x5"])
    elif "Graxa lubrificante alta temp" in template_name:
        return random.choice(["Mobil 1kg", "Kluber 500g", "Shell Gadus 18kg"])
    elif "Sensor indutivo de proximidade" in template_name:
        return random.choice(["M12 PNP NO", "M18 NPN NC", "M30 PNP"])
    elif "Manometro" in template_name:
        return random.choice(["0-10", "0-6", "0-100", "0-2.5"])
    elif "Silenciador pneumatico" in template_name:
        return random.choice(["1/4 NPT", "1/2 NPT", "1/8 BSP"])
    elif "Valvula solenoide" in template_name:
        return random.choice(["24VCC", "110VCA", "220VCA"])
    elif "Fita veda rosca" in template_name:
        return random.choice(["18mm x 10m", "18mm x 50m"])
    elif "Luva de raspa" in template_name:
        return random.choice(["cano curto", "cano longo 20cm"])
    elif "Oculos de protecao" in template_name:
        return random.choice(["incolor anti-risco", "cinza fume"])
    return ""

# Tabela de custos de parada de equipamento (R$ por hora) por familia
downtime_ranges = {
    "Bombas": (5000, 50000),
    "Compressores": (8000, 80000),
    "Redutores": (6000, 60000),
    "Transportadores": (3000, 20000),
    "Sistemas de dosagem": (4000, 25000),
    "Tubulacoes": (1000, 12000),
    "Paineis eletricos": (2000, 15000),
    "Motores": (1500, 18000),
    "Instrumentos de campo": (500, 6000),
    "Valvulas": (1000, 10000)
}

def generate_downtime(family):
    min_dt, max_dt = downtime_ranges.get(family, (200, 2000))
    r = random.random()
    return round(min_dt * (max_dt / min_dt) ** r, 2)

suppliers_pool = [
    ("Fornecedor Nacional A", "Nacional"),
    ("Fornecedor Regional B", "Regional"),
    ("Distribuidor Tecnico C", "Nacional"),
    ("Importador Industrial D", "Importado"),
    ("OEM Especializado E", "OEM"),
    ("Fabricante Local F", "Regional")
]

def choose_supplier(category):
    if category in ["Fixadores", "Consumiveis", "Seguranca"]:
        candidates = [
            ("Fornecedor Regional B", "Regional"),
            ("Fabricante Local F", "Regional"),
            ("Fornecedor Nacional A", "Nacional"),
            ("Distribuidor Tecnico C", "Nacional")
        ]
    elif category in ["Automacao", "Instrumentacao"]:
        candidates = [
            ("OEM Especializado E", "OEM"),
            ("Importador Industrial D", "Importado"),
            ("Fornecedor Nacional A", "Nacional")
        ]
    else:
        candidates = suppliers_pool
    return random.choice(candidates)

def generate_lead_time(origin):
    if origin == "Regional":
        return max(2, min(12, int(random.gauss(6, 2))))
    elif origin == "Nacional":
        return max(7, min(30, int(random.gauss(16, 6))))
    elif origin == "OEM":
        return max(30, min(90, int(random.gauss(55, 14))))
    else: # Importado
        return max(60, min(180, int(random.gauss(115, 30))))

def generate_sub_risk(origin):
    if origin == "Importado":
        return random.choices([3, 4, 5], weights=[0.1, 0.5, 0.4])[0]
    elif origin == "OEM":
        return random.choices([2, 3, 4, 5], weights=[0.1, 0.3, 0.5, 0.1])[0]
    else: # Regional ou Nacional
        return random.choices([1, 2, 3], weights=[0.6, 0.3, 0.1])[0]

def generate_demand(category, unit_cost):
    if category in ["Fixadores", "Consumiveis"]:
        return max(10, int(random.gauss(150, 45)))
    else:
        if unit_cost > 10000:
            return max(1, int(random.gauss(2, 1)))
        elif unit_cost > 2000:
            return max(1, int(random.gauss(4, 2)))
        else:
            return max(1, int(random.gauss(12, 6)))

def generate_coverage():
    # Cobertura de estoque em dias: concentrada entre 15 e 90, outliers ate 180, e 4% sem estoque.
    r = random.random()
    if r < 0.04:  # Sem estoque
        return 0.0
    elif r < 0.12:  # Estoque muito baixo (1 a 14 dias)
        return random.uniform(1, 14)
    elif r < 0.85:  # Estoque normal (15 a 90 dias)
        return random.uniform(15, 90)
    else:  # Estoque alto (91 a 180 dias)
        return random.uniform(91, 180)

# Gerar 1000 materiais
rows = []
for i in range(1, 1001):
    template = random.choice(item_templates)
    template_name, category, equipment_family, min_cost, max_cost, min_crit, max_crit = template
    
    spec = generate_spec(template_name)
    material_name = template_name.replace("{spec}", spec)
    
    # Gerar Código curto do material
    prefix = category[:3].upper()
    family_prefix = equipment_family[:3].upper()
    material_id = f"{prefix}-{family_prefix}-{i:04d}"
    
    supplier_name, origin_type = choose_supplier(category)
    lead_time_days = generate_lead_time(origin_type)
    
    # Distribuição de custo com viés para o valor mínimo (log-uniform)
    cost_factor = random.random()
    unit_cost = round(min_cost * (max_cost / min_cost) ** cost_factor, 2)
    
    # Custos de parada da planta com base na família
    downtime_cost_hour = generate_downtime(equipment_family)
    
    criticality_engineering = random.randint(min_crit, max_crit)
    substitution_risk = generate_sub_risk(origin_type)
    
    monthly_demand_avg = generate_demand(category, unit_cost)
    demand_std = round(monthly_demand_avg * random.uniform(0.15, 0.40), 2)
    
    # Cobertura e saldo de estoque físico
    coverage_days = generate_coverage()
    daily_demand = monthly_demand_avg / 30.0
    stock_quantity = int(math.ceil(coverage_days * daily_demand))
    
    # Ajuste de cobertura real para corresponder ao estoque arredondado
    if daily_demand > 0 and stock_quantity > 0:
        coverage_days = round(stock_quantity / daily_demand, 1)
    else:
        coverage_days = 0.0

    rows.append([
        material_id,
        material_name,
        category,
        equipment_family,
        supplier_name,
        origin_type,
        lead_time_days,
        unit_cost,
        monthly_demand_avg,
        demand_std,
        stock_quantity,
        downtime_cost_hour,
        substitution_risk,
        criticality_engineering
    ])

# Escrever arquivo bruto
with open(path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows([headers, *rows])

print(f"[OK] Gerado: {path} ({len(rows)} linhas)")
