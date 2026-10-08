/**
 * SistemaDeNutricao — Núcleo
 * formulas.js
 *
 * As fórmulas do material de referência, em funções puras.
 *
 * O QUE ESTE ARQUIVO É
 *   • Cada função recebe números e devolve um número.
 *   • Nenhuma função lê ou escreve na tela.
 *   • Nenhum arredondamento: a precisão é total e o arredondamento
 *     acontece na apresentação (decisão 16 e decisão 35).
 *   • Nenhuma validação clínica: isso é responsabilidade de validacoes.js.
 *     Este arquivo apenas CONFERE que os valores recebidos são números
 *     válidos, que os divisores são maiores que zero e que a chave escolhida
 *     (sexo, nível, objetivo) existe — isso evita que um resultado vire "NaN"
 *     ou "Infinity" sem ninguém perceber.
 *
 * CONVENÇÃO DE CHAMADA
 *   • Um argumento  → número direto:        calcularFibras(vet)
 *   • Vários        → objeto com nomes:     calcularIMC({ pesoKg, alturaCm })
 *     O objeto evita trocar a ordem dos valores por engano.
 *
 * TODOS os coeficientes vêm de ./constantes.js. Nenhum número do material
 * é repetido aqui — assim existe um único lugar para conferir cada valor.
 *
 * Referência: planejamento.md, seção 12 (fórmulas) e seção 13 (ordem).
 */

import {
  SEXOS,
  OBJETIVOS,
  TMB_HARRIS_BENEDICT,
  GET_NASEM_2023,
  KCAL_POR_GRAMA,
  FIBRAS,
  CM_POR_METRO,
  BASE_PERCENTUAL,
  TOLERANCIA_SOMA_PERCENTUAIS,
} from './constantes.js';

/* ==========================================================================
   Conferências internas (contrato de programação)
   ==========================================================================
   Não são validações clínicas nem de formulário: servem apenas para que um
   valor ausente ou uma chave errada falhem de imediato, em vez de produzir
   um "NaN" silencioso que apareceria na tela como resultado.
   ========================================================================== */

function exigirNumero(valor, nome) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new TypeError(`"${nome}" precisa ser um número finito. Recebido: ${valor}`);
  }
}

/**
 * Divisor utilizável: número finito E maior que zero.
 *
 * Sem esta conferência, um divisor zero devolveria `Infinity` (ex.: altura 0
 * no IMC) — um valor que chegaria à tela sem ninguém perceber, que é
 * exatamente o que estas conferências existem para evitar. Lançar é a única
 * resposta correta: o sistema não inventa valor substituto nem disfarça o erro
 * com um resultado falso.
 */
function exigirDivisor(valor, nome) {
  exigirNumero(valor, nome);
  if (valor <= 0) {
    throw new RangeError(`"${nome}" precisa ser maior que zero. Recebido: ${valor}`);
  }
}

function exigirSexo(sexo) {
  if (!Object.values(SEXOS).includes(sexo)) {
    throw new RangeError(`Sexo inválido: ${sexo}. Use SEXOS.FEMININO ou SEXOS.MASCULINO.`);
  }
}

function exigirEquacaoGET(sexo, nivelAtividade) {
  exigirSexo(sexo);
  const equacao = GET_NASEM_2023[sexo][nivelAtividade];
  if (!equacao) {
    throw new RangeError(`Nível de atividade inválido: ${nivelAtividade}. Use 1, 2, 3 ou 4.`);
  }
  return equacao;
}

/* ==========================================================================
   Conversão
   ========================================================================== */

/** altura_m = altura_cm ÷ 100 */
export function converterAlturaParaMetros(alturaCm) {
  exigirNumero(alturaCm, 'alturaCm');
  return alturaCm / CM_POR_METRO;
}

/* ==========================================================================
   IMC — Índice de Massa Corporal
   ========================================================================== */

/**
 * IMC = peso (kg) ÷ altura (m)²
 *
 * Exemplo do material: peso 63 kg, altura 1,65 m → 23,14 kg/m²
 * Altura informada em CENTÍMETROS; a conversão para metros é feita aqui.
 */
export function calcularIMC({ pesoKg, alturaCm }) {
  exigirNumero(pesoKg, 'pesoKg');
  exigirDivisor(alturaCm, 'alturaCm');
  const alturaM = converterAlturaParaMetros(alturaCm);
  return pesoKg / (alturaM * alturaM);
}

/**
 * Peso correspondente = IMC desejado × altura (m)²
 *
 * O material menciona uma faixa de peso por intervalo de IMC, mas não define
 * o intervalo. Essa faixa NÃO é implementada (decisão 22) — aqui existe
 * apenas o peso correspondente ao IMC desejado informado pelo usuário.
 */
export function calcularPesoCorrespondenteIMC({ imcDesejado, alturaCm }) {
  exigirNumero(imcDesejado, 'imcDesejado');
  // Altura é a mesma entrada de calcularIMC() e calcularRCE(): zero aqui
  // devolveria "0 kg" como se fosse resposta, e não é.
  exigirDivisor(alturaCm, 'alturaCm');
  const alturaM = converterAlturaParaMetros(alturaCm);
  return imcDesejado * (alturaM * alturaM);
}

/* ==========================================================================
   RCE — Relação Cintura-Estatura
   ========================================================================== */

/**
 * RCE = circunferência da cintura (cm) ÷ altura (cm)
 *
 * Exemplo do material: 80 ÷ 165 = 0,485 (o cálculo real é 0,484848…)
 *
 * O material NÃO fornece ponto de corte, portanto NÃO existe classificação
 * (lacuna L1 / decisão 18). O resultado é apenas um número.
 * Este valor fica com precisão total; a apresentação usa 2 casas (decisão 42).
 */
export function calcularRCE({ circunferenciaCinturaCm, alturaCm }) {
  exigirNumero(circunferenciaCinturaCm, 'circunferenciaCinturaCm');
  exigirDivisor(alturaCm, 'alturaCm');
  return circunferenciaCinturaCm / alturaCm;
}

/* ==========================================================================
   TMB — Taxa Metabólica Basal (Harris-Benedict)
   ========================================================================== */

/**
 * TMB = constante + (coeficiente do peso × peso)
 *                 + (coeficiente da altura × altura)
 *                 + (coeficiente da idade × idade)
 *
 * Altura em CENTÍMETROS. Peso em kg. Idade em anos.
 * Os coeficientes vêm de TMB_HARRIS_BENEDICT (constantes.js).
 *
 * A TMB é exibida como informação. Ela NÃO é multiplicada por fator de
 * atividade: o VET vem do GET, não da TMB.
 */
export function calcularTMB({ sexo, pesoKg, alturaCm, idade }) {
  exigirSexo(sexo);
  exigirNumero(pesoKg, 'pesoKg');
  exigirNumero(alturaCm, 'alturaCm');
  exigirNumero(idade, 'idade');

  const c = TMB_HARRIS_BENEDICT[sexo];
  return c.constante + c.peso * pesoKg + c.altura * alturaCm + c.idade * idade;
}

/* ==========================================================================
   GET — Gasto Energético Total (NASEM 2023)
   ========================================================================== */

/**
 * GET = constante + (coeficiente da idade × idade)
 *                 + (coeficiente da altura × altura)
 *                 + (coeficiente do peso × peso)
 *
 * Existem 8 equações no material: 2 sexos × 4 níveis de atividade.
 * A equação é buscada em GET_NASEM_2023; nenhum coeficiente é escrito aqui.
 *
 * Altura em CENTÍMETROS. Peso em kg. Idade em anos.
 * A idade entra DIRETO na equação, inclusive quando inferior a 19 anos
 * (decisão 13 — não existe restrição de idade neste sistema).
 */
export function calcularGET({ sexo, idade, alturaCm, pesoKg, nivelAtividade }) {
  exigirNumero(idade, 'idade');
  exigirNumero(alturaCm, 'alturaCm');
  exigirNumero(pesoKg, 'pesoKg');

  const c = exigirEquacaoGET(sexo, nivelAtividade);
  return c.constante + c.idade * idade + c.altura * alturaCm + c.peso * pesoKg;
}

/* ==========================================================================
   VET — Valor Energético Total
   ========================================================================== */

/**
 * Manutenção: VET = GET
 * Déficit:    VET = GET − déficit informado
 * Superávit:  VET = GET + superávit informado
 *
 * Não existe valor implícito de zero: quando o objetivo é Déficit ou
 * Superávit, o valor correspondente precisa ser informado (decisão 32).
 * Se não vier, a função lança um erro em vez de calcular com "NaN" —
 * quem mostra a mensagem ao usuário é validacoes.js / a interface (V6).
 *
 * O VET pode resultar em zero ou negativo (déficit maior que o GET).
 * A fórmula NÃO corrige isso: a V2 trata o caso na exibição.
 */
export function calcularVET({ get, objetivo, deficitKcal, superavitKcal }) {
  exigirNumero(get, 'get');

  switch (objetivo) {
    case OBJETIVOS.MANUTENCAO:
      return get;

    case OBJETIVOS.DEFICIT:
      exigirNumero(deficitKcal, 'deficitKcal');
      return get - deficitKcal;

    case OBJETIVOS.SUPERAVIT:
      exigirNumero(superavitKcal, 'superavitKcal');
      return get + superavitKcal;

    default:
      throw new RangeError(
        `Objetivo inválido: ${objetivo}. Use OBJETIVOS.MANUTENCAO, OBJETIVOS.DEFICIT ou OBJETIVOS.SUPERAVIT.`
      );
  }
}

/* ==========================================================================
   Proteínas
   ========================================================================== */

/**
 * PTN (g) = peso × fator proteico
 *
 * Fatores do material: 0,8 (adulto saudável) · 1,4 (fisicamente ativo) ·
 * 1,8 (ganho/manutenção de massa) · personalizado (informado em g/kg).
 * O fator personalizado é apenas um número — não precisa ser um dos três.
 */
export function calcularProteinaGramas({ pesoKg, fatorProteico }) {
  exigirNumero(pesoKg, 'pesoKg');
  exigirNumero(fatorProteico, 'fatorProteico');
  return pesoKg * fatorProteico;
}

/** kcal de proteína = proteína (g) × 4 */
export function calcularCaloriasProteina(proteinaG) {
  exigirNumero(proteinaG, 'proteinaG');
  return proteinaG * KCAL_POR_GRAMA.PROTEINA;
}

/* ==========================================================================
   Lipídios
   ========================================================================== */

/**
 * LIP (g) = VET × % lipídios ÷ 9
 *
 * O usuário informa o PERCENTUAL: 30 significa 30%.
 * A conversão para fração (0,30) acontece aqui, dividindo por 100.
 * Não existe heurística para interpretar 0,30 como 30% (decisão 38).
 */
export function calcularLipidioGramas({ vet, percentualLipidios }) {
  exigirNumero(vet, 'vet');
  exigirNumero(percentualLipidios, 'percentualLipidios');

  const fracao = percentualLipidios / BASE_PERCENTUAL;
  return (vet * fracao) / KCAL_POR_GRAMA.LIPIDIO;
}

/** kcal de lipídios = lipídios (g) × 9 */
export function calcularCaloriasLipidio(lipidioG) {
  exigirNumero(lipidioG, 'lipidioG');
  return lipidioG * KCAL_POR_GRAMA.LIPIDIO;
}

/* ==========================================================================
   Carboidratos
   ========================================================================== */

/**
 * CHO (g) = [VET − (PTN × 4) − (LIP × 9)] ÷ 4
 *
 * ATENÇÃO: como o carboidrato é a sobra do VET, esta fórmula pode devolver
 * um número NEGATIVO quando (PTN × 4) + (LIP × 9) > VET.
 *
 * Este arquivo NÃO corrige nem bloqueia isso — a fórmula é implementada
 * exatamente como está no material. Quem identifica o caso e mostra a
 * mensagem ao usuário é a validação V3 (planejamento.md, seção 17).
 */
export function calcularCarboidratoGramas({ vet, proteinaG, lipidioG }) {
  exigirNumero(vet, 'vet');
  exigirNumero(proteinaG, 'proteinaG');
  exigirNumero(lipidioG, 'lipidioG');

  const caloriasRestantes =
    vet - proteinaG * KCAL_POR_GRAMA.PROTEINA - lipidioG * KCAL_POR_GRAMA.LIPIDIO;

  return caloriasRestantes / KCAL_POR_GRAMA.CARBOIDRATO;
}

/** kcal de carboidratos = carboidratos (g) × 4 */
export function calcularCaloriasCarboidrato(carboidratoG) {
  exigirNumero(carboidratoG, 'carboidratoG');
  return carboidratoG * KCAL_POR_GRAMA.CARBOIDRATO;
}

/* ==========================================================================
   Percentuais dos macronutrientes
   ========================================================================== */

/** %PTN = (PTN × 4 ÷ VET) × 100 */
export function calcularPercentualProteina({ proteinaG, vet }) {
  exigirNumero(proteinaG, 'proteinaG');
  exigirDivisor(vet, 'vet');
  return ((proteinaG * KCAL_POR_GRAMA.PROTEINA) / vet) * BASE_PERCENTUAL;
}

/** %CHO = (CHO × 4 ÷ VET) × 100 */
export function calcularPercentualCarboidrato({ carboidratoG, vet }) {
  exigirNumero(carboidratoG, 'carboidratoG');
  exigirDivisor(vet, 'vet');
  return ((carboidratoG * KCAL_POR_GRAMA.CARBOIDRATO) / vet) * BASE_PERCENTUAL;
}

/** %LIP = (LIP × 9 ÷ VET) × 100 */
export function calcularPercentualLipidio({ lipidioG, vet }) {
  exigirNumero(lipidioG, 'lipidioG');
  exigirDivisor(vet, 'vet');
  return ((lipidioG * KCAL_POR_GRAMA.LIPIDIO) / vet) * BASE_PERCENTUAL;
}

/**
 * Soma dos três percentuais: %PTN + %CHO + %LIP
 *
 * É uma CONFERÊNCIA INTERNA de sanidade, não uma validação clínica
 * (decisão 27). Como o carboidrato é a sobra do VET, a soma reconstrói
 * os 100% matematicamente — qualquer diferença real indicaria erro de
 * cálculo, não problema nos dados informados.
 */
export function somarPercentuaisMacronutrientes({
  percentualProteina,
  percentualCarboidrato,
  percentualLipidio,
}) {
  exigirNumero(percentualProteina, 'percentualProteina');
  exigirNumero(percentualCarboidrato, 'percentualCarboidrato');
  exigirNumero(percentualLipidio, 'percentualLipidio');

  return percentualProteina + percentualCarboidrato + percentualLipidio;
}

/**
 * A soma dos percentuais está dentro da tolerância?
 *
 * A tolerância existe apenas para absorver erro de ponto flutuante
 * (TOLERANCIA_SOMA_PERCENTUAIS). Não é validação clínica.
 */
export function somaPercentuaisDentroDaTolerancia(somaPercentuais) {
  exigirNumero(somaPercentuais, 'somaPercentuais');
  return Math.abs(somaPercentuais - BASE_PERCENTUAL) <= TOLERANCIA_SOMA_PERCENTUAIS;
}

/* ==========================================================================
   Fibras
   ========================================================================== */

/**
 * Fibras (g) = 14 × VET ÷ 1000
 *
 * Exemplo do material: VET de 2000 kcal → 28 g/dia
 *
 * As fibras DEPENDEM do VET. Se o VET for zero ou negativo, este valor
 * também seria zero ou negativo — a V2 impede que seja exibido.
 */
export function calcularFibras(vet) {
  exigirNumero(vet, 'vet');
  return (FIBRAS.GRAMAS * vet) / FIBRAS.KCAL_REFERENCIA;
}

/* ==========================================================================
   Água
   ========================================================================== */

/**
 * Água (mL) = peso × fator de hidratação
 *
 * Decisão do projeto (decisão 17): SOMENTE este método.
 * Não há diferenciação por idade, e os valores de DRI por idade/sexo que
 * aparecem como exemplo no material NÃO são implementados.
 *
 * O fator é informado em mL/kg/dia e NÃO tem valor padrão (decisão 23).
 */
export function calcularAgua({ pesoKg, fatorHidratacao }) {
  exigirNumero(pesoKg, 'pesoKg');
  exigirNumero(fatorHidratacao, 'fatorHidratacao');
  return pesoKg * fatorHidratacao;
}

/* ==========================================================================
   Composição corporal (opcional)
   ========================================================================== */

/**
 * MG (massa gorda) = peso × (% gordura ÷ 100)
 *
 * O percentual de gordura é OPCIONAL (decisão 19). Quem chama esta função
 * é responsável por verificar se o valor foi informado.
 */
export function calcularMassaGorda({ pesoKg, percentualGordura }) {
  exigirNumero(pesoKg, 'pesoKg');
  exigirNumero(percentualGordura, 'percentualGordura');
  return pesoKg * (percentualGordura / BASE_PERCENTUAL);
}

/** MLG (massa livre de gordura) = peso − massa gorda */
export function calcularMassaLivreGordura({ pesoKg, massaGordaKg }) {
  exigirNumero(pesoKg, 'pesoKg');
  exigirNumero(massaGordaKg, 'massaGordaKg');
  return pesoKg - massaGordaKg;
}

/* ==========================================================================
   VALORES DELIBERADAMENTE AUSENTES
   ==========================================================================
   Estas fórmulas NÃO existem neste arquivo de propósito:

   • Classificação do RCE ............ o material não fornece ponto de corte
   • Classificação do IMC ............ o material não fornece faixas
   • Faixa de peso por intervalo de IMC  não será implementada (decisão 22)
   • Água por DRI (idade/sexo) ....... não será implementada (decisão 17)
   • Filtro de idade (19+ ou pediátrico)  não existe (decisão 13)
   • Ajuste automático de macros ..... nunca corrigir o que o usuário escolheu
                                        (decisões 25 e 32)
   ========================================================================== */
