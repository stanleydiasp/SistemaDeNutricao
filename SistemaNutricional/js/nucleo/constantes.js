/**
 * SistemaDeNutricao — Núcleo
 * constantes.js
 *
 * Valores fixos usados pelos cálculos.
 *
 * ORIGEM DE CADA BLOCO
 *   [MATERIAL] — transcrito da "Especificação — Calculadora Nutricional", Versão 2.
 *   [DECISÃO]  — decisão de produto/interface do nosso projeto (planejamento.md, seção 16).
 *
 * ATENÇÃO NA TRANSCRIÇÃO DOS NÚMEROS
 *   O material usa a convenção brasileira (vírgula decimal, ponto de milhar).
 *   Aqui os números usam ponto decimal, como exige o JavaScript:
 *     584,90 → 584.90        1.004,82 → 1004.82        −517,88 → -517.88
 *   Um erro nesta transcrição muda o resultado silenciosamente.
 *
 * Este arquivo não importa nada e não toca na interface.
 */

/* ==========================================================================
   ENTRADAS — chaves internas
   ========================================================================== */

/** Sexo. Apenas as equações mudam conforme o valor. [MATERIAL] */
export const SEXOS = Object.freeze({
  FEMININO: 'feminino',
  MASCULINO: 'masculino',
});

/** Objetivo do usuário. Define como o VET é obtido a partir do GET. [MATERIAL] */
export const OBJETIVOS = Object.freeze({
  MANUTENCAO: 'manutencao',
  DEFICIT: 'deficit',
  SUPERAVIT: 'superavit',
});

/**
 * Níveis de atividade física, na ordem em que o material os apresenta. [MATERIAL]
 *
 * É um único campo de escolha: apenas o rótulo muda conforme o sexo.
 */
export const NIVEIS_ATIVIDADE = Object.freeze({
  1: Object.freeze({ rotuloFeminino: 'Inativa', rotuloMasculino: 'Inativo' }),
  2: Object.freeze({ rotuloFeminino: 'Pouco ativa', rotuloMasculino: 'Pouco ativo' }),
  3: Object.freeze({ rotuloFeminino: 'Ativa', rotuloMasculino: 'Ativo' }),
  4: Object.freeze({ rotuloFeminino: 'Muito ativa', rotuloMasculino: 'Muito ativo' }),
});

/* ==========================================================================
   TMB — Taxa Metabólica Basal (Harris-Benedict)
   ========================================================================== */

/**
 * TMB = constante + (coeficiente do peso × peso) + (coeficiente da altura × altura)
 *                 + (coeficiente da idade × idade)
 *
 * Cada propriedade do objeto abaixo é um COEFICIENTE, aplicado à variável de
 * mesmo nome. Altura em CENTÍMETROS. Peso em kg. Idade em anos. [MATERIAL]
 */
export const TMB_HARRIS_BENEDICT = Object.freeze({
  [SEXOS.FEMININO]: Object.freeze({
    constante: 655,
    peso: 9.6,
    altura: 1.85,
    idade: -4.7,
  }),
  [SEXOS.MASCULINO]: Object.freeze({
    constante: 66.5,
    peso: 13.7,
    altura: 5.0,
    idade: -6.8,
  }),
});

/* ==========================================================================
   GET — Gasto Energético Total (NASEM 2023)
   ========================================================================== */

/**
 * GET = constante + (coeficiente da idade × idade) + (coeficiente da altura × altura)
 *                 + (coeficiente do peso × peso)
 *
 * Cada propriedade do objeto abaixo é um COEFICIENTE, aplicado à variável de
 * mesmo nome. Altura em CENTÍMETROS. Peso em kg. Idade em anos. [MATERIAL]
 *
 * A idade entra DIRETO na equação, inclusive quando inferior a 19 anos.
 * Não existe restrição de idade neste sistema (decisão 13 do planejamento).
 *
 * Observação: no nível 4 masculino a constante é negativa (−517,88).
 */
export const GET_NASEM_2023 = Object.freeze({
  [SEXOS.FEMININO]: Object.freeze({
    1: Object.freeze({ constante: 584.90, idade: -7.01, altura: 5.72, peso: 11.71 }),
    2: Object.freeze({ constante: 575.77, idade: -7.01, altura: 6.60, peso: 12.14 }),
    3: Object.freeze({ constante: 710.25, idade: -7.01, altura: 6.54, peso: 12.34 }),
    4: Object.freeze({ constante: 511.83, idade: -7.01, altura: 9.07, peso: 12.56 }),
  }),
  [SEXOS.MASCULINO]: Object.freeze({
    1: Object.freeze({ constante: 753.07, idade: -10.83, altura: 6.50, peso: 14.10 }),
    2: Object.freeze({ constante: 581.47, idade: -10.83, altura: 8.30, peso: 14.94 }),
    3: Object.freeze({ constante: 1004.82, idade: -10.83, altura: 6.52, peso: 15.91 }),
    4: Object.freeze({ constante: -517.88, idade: -10.83, altura: 15.61, peso: 19.11 }),
  }),
});

/* ==========================================================================
   Proteínas
   ========================================================================== */

/**
 * PTN (g) = peso × fator proteico  [MATERIAL]
 *
 * O fator "personalizado" não tem valor fixo: quem informa é o usuário, em g/kg.
 */
export const FATORES_PROTEICOS = Object.freeze({
  ADULTO_SAUDAVEL: 0.8,
  FISICAMENTE_ATIVO: 1.4,
  GANHO_MANUTENCAO_MASSA: 1.8,
});

/* ==========================================================================
   Macronutrientes — energia por grama
   ========================================================================== */

/** Energia por grama de cada macronutriente. [MATERIAL] */
export const KCAL_POR_GRAMA = Object.freeze({
  PROTEINA: 4,
  CARBOIDRATO: 4,
  LIPIDIO: 9,
});

/* ==========================================================================
   Lipídios
   ========================================================================== */

/**
 * Valor SUGERIDO e EDITÁVEL para o percentual de lipídios. [DECISÃO]
 *
 * É decisão de interface do nosso projeto (decisão 20) — NÃO é regra
 * nutricional do material. O usuário pode alterar este valor.
 */
export const PERCENTUAL_LIPIDIOS_SUGERIDO = 30;

/* ==========================================================================
   Fibras
   ========================================================================== */

/** Fibras (g) = 14 × VET ÷ 1000  [MATERIAL] — exemplo: 2000 kcal → 28 g/dia */
export const FIBRAS = Object.freeze({
  GRAMAS: 14,
  KCAL_REFERENCIA: 1000,
});

/* ==========================================================================
   Conversões
   ========================================================================== */

/** O IMC usa altura em metros; as demais equações usam centímetros. [DERIVADO] */
export const CM_POR_METRO = 100;

/** Base usada para converter fração em percentual e vice-versa. [DERIVADO] */
export const BASE_PERCENTUAL = 100;

/* ==========================================================================
   Apresentação dos resultados
   ========================================================================== */

/**
 * Casas decimais por tipo de resultado. [DECISÃO]
 *
 * Regra: manter a precisão completa durante os cálculos e arredondar
 * SOMENTE na apresentação (decisão 16 do planejamento).
 *
 * Unidades cobertas (consolidado em 2026-10-04):
 *   INDICE    → IMC e RCE (kg/m² e adimensional)
 *   KCAL      → TMB, GET, VET e kcal de cada macronutriente
 *   GRAMA     → PTN, CHO, LIP e fibras
 *   PESO_KG   → peso correspondente ao IMC desejado, MG e MLG (decisão 42)
 *   PERCENTUAL→ %PTN, %CHO e %LIP
 *   ML        → água (decisão 36)
 */
export const CASAS_DECIMAIS = Object.freeze({
  INDICE: 2,
  KCAL: 0,
  GRAMA: 1,
  PESO_KG: 1,
  PERCENTUAL: 1,
  ML: 0,
});

/**
 * Tolerância da conferência interna da soma dos percentuais. [DECISÃO]
 *
 * Serve apenas para absorver erro de ponto flutuante (decisão 27).
 * Não é validação clínica.
 */
export const TOLERANCIA_SOMA_PERCENTUAIS = 0.01;

/* ==========================================================================
   Mensagens ao usuário — aprovadas no planejamento (seção 17)
   ========================================================================== */

export const MENSAGENS = Object.freeze({
  CAMPO_OBRIGATORIO: 'Informe um valor maior que zero.',
  VET_INVALIDO:
    'O VET precisa ser maior que zero para calcular os macronutrientes. ' +
    'Revise o objetivo ou o valor de déficit informado.',
  MACROS_INVALIDOS:
    'As calorias de proteínas e lipídios ultrapassam o VET disponível. ' +
    'Nesta combinação não sobram calorias para carboidratos. ' +
    'Ajuste o fator de proteína, o percentual de lipídios ou o VET.',
  DEFICIT_SUPERAVIT_OBRIGATORIO:
    'Informe a quantidade de kcal de déficit (ou de superávit).',
  SOMA_PERCENTUAIS_FORA:
    'A soma dos percentuais dos macronutrientes não fechou em 100%.',
  // Faixa matemática do percentual de gordura: extensão da V1 (decisão 44).
  PERCENTUAL_GORDURA_FORA_DA_FAIXA:
    'Informe um percentual maior que zero e de até 100.',
});

/* ==========================================================================
   VALORES DELIBERADAMENTE AUSENTES
   ==========================================================================
   Estes valores NÃO existem neste arquivo de propósito. O material não os
   define e não inventamos parâmetros nutricionais (regra 8 do planejamento):

   • Ponto de corte do RCE ................. o material não fornece (lacuna L1 / decisão 18)
   • Faixas de classificação do IMC ........ o material não fornece (lacuna L3)
   • Faixa de peso por intervalo de IMC .... não será implementada (decisão 22)
   • Valor padrão do fator de hidratação ... não há padrão (decisão 23)
   • Limites clínicos de validação ......... não existem (lacuna L6)

   Enquanto esses valores não vierem do material, os resultados correspondentes
   são exibidos apenas como número, sem classificação e sem cor de alerta.
   ========================================================================== */
