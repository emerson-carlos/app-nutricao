# Fontes dos cálculos

Todos os números do app são estimativas (erro típico de 10% a 20%). O app não substitui nutricionista, médico ou educador físico.

| # | O quê | Regra no app | Fonte |
| --- | --- | --- | --- |
| 1 | Metabolismo em repouso | Mifflin-St Jeor: 10 × peso + 6,25 × altura − 5 × idade + 5 (homens) ou − 161 (mulheres) | Mifflin et al., *Am J Clin Nutr* 1990;51:241-247 |
| 2 | Gasto do dia sem treino | Metabolismo × 1,2 (sedentário). Treinos entram à parte | Fator de atividade sedentária usual |
| 3 | Gasto de exercício (fase 2) | (MET − 1) × peso (kg) × horas | 2024 Adult Compendium of Physical Activities (pacompendium.com) |
| 4 | Meta de calorias | Perder 0,85 · Recomposição 0,90 · Manter 1,00 · Ganhar 1,08 × gasto; nunca abaixo do metabolismo | Déficit de 15% a 20% e superávit de 5% a 10% recomendados no plano |
| 5 | Proteína | 2,0 g/kg (perder e recomposição) · 1,8 (ganhar) · 1,6 (manter) | ISSN Position Stand: protein and exercise (Jäger et al., 2017) |
| 6 | Gordura | 25% das calorias | OMS 2023 (até 30%) |
| 7 | Gordura saturada | Menos de 10% das calorias | OMS |
| 8 | Fibras | Pelo menos 25 g por dia | OMS 2023 |
| 9 | Água para beber | 80% de 2,5 L (homens) ou 2,0 L (mulheres) | EFSA 2010, adotada pelas Nordic Nutrition Recommendations 2023 |
| 10 | Alimentos | 591 alimentos, valores por 100 g | TACO 4ª edição (NEPA/Unicamp, 2011), via `raulfdm/taco-api` (MIT), conferida por amostragem com a planilha original |

## Medidas caseiras

A TACO não traz medidas caseiras. Por enquanto, cada medida (colher, concha, unidade) é informada por você uma vez e fica salva para aquele alimento. A ideia é importar depois a *Tabela de Medidas Referidas* do IBGE (POF 2008-2009) ou as medidas da TBCA (USP).
