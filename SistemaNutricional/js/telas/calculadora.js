/**
 * SistemaDeNutricao — Tela
 * calculadora.js
 *
 * Ligação entre o formulário (index.html) e o núcleo (js/nucleo/).
 *
 * RESPONSABILIDADES
 *   • Ler o formulário e montar o objeto `dados` que validacoes.js espera.
 *   • Controlar os campos condicionais (objetivo e fator de proteína).
 *   • Chamar o núcleo na ordem definida no planejamento (seção 13).
 *   • Arredondar e formatar — SOMENTE na apresentação (decisão 35).
 *   • Exibir ou ocultar cada resultado conforme `contrato.exibir`.
 *   • Copiar os resultados visíveis e anunciar o retorno (seção 15).
 *
 * O QUE ESTE ARQUIVO NÃO FAZ
 *   • Não calcula nada por conta própria: toda conta vem de formulas.js.
 *   • Não decide validação: toda regra vem de validacoes.js.
 *   • Não arredonda antes de calcular: o núcleo mantém a precisão total.
 *
 * CARREGAMENTO
 *   index.html → js/main.js → este arquivo.
 *   Precisa ser aberto pelo "Go Live" (módulos ES não funcionam em file://).
 */

import {
  OBJETIVOS,
  CASAS_DECIMAIS,
} from '../nucleo/constantes.js';

import {
  calcularIMC,
  calcularPesoCorrespondenteIMC,
  calcularRCE,
  calcularTMB,
  calcularGET,
  calcularVET,
  calcularProteinaGramas,
  calcularCaloriasProteina,
  calcularLipidioGramas,
  calcularCaloriasLipidio,
  calcularCarboidratoGramas,
  calcularCaloriasCarboidrato,
  calcularPercentualProteina,
  calcularPercentualCarboidrato,
  calcularPercentualLipidio,
  calcularFibras,
  calcularAgua,
  calcularMassaGorda,
  calcularMassaLivreGordura,
} from '../nucleo/formulas.js';

import {
  avaliar,
  validarEntradas,
} from '../nucleo/validacoes.js';

/* ==========================================================================
   A. APRESENTAÇÃO — arredondamento e formatação
   ==========================================================================
   O núcleo entrega números com precisão total. A conversão para texto
   acontece apenas aqui (decisão 35).
   ========================================================================== */

const TRACO = '—';

/** Unidade de percentual — sai colada ao número no texto copiado (decisão 46). */
const UNIDADE_PERCENTUAL = '%';

/**
 * Arredonda limpando o ruído de ponto flutuante.
 *
 * Sem o toPrecision(15), o JavaScript erra em casos comuns:
 *   0,615 → 0,61 (o correto seria 0,62)
 *   2,675 → 2,67 (o correto seria 2,68)
 * Porque 0,615 na memória do computador é 0,61499999999999999…
 */
function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round((valor * fator).toPrecision(15)) / fator;
}

/** Número → texto no padrão brasileiro (vírgula decimal). */
function formatar(valor, casas) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return TRACO;
  }
  return arredondar(valor, casas)
    .toFixed(casas)
    .replace('.', ',');
}

/* ==========================================================================
   B. TABELA DE ITENS — única fonte de verdade da tela
   ==========================================================================
   Cada entrada liga:
     • a chave do contrato (`exibir`)   → quando mostrar
     • os elementos do DOM (`itens`)    → o que mostrar ou ocultar
     • os valores calculados (`campos`) → o que escrever, com quantas casas
     • o rótulo e a unidade             → usados no modelo de saída (Copiar)

   Usada por renderizar(), limparResultados() e montarModeloSaida().
   ========================================================================== */

const ITENS = [
  /* ---------- AVALIAÇÃO CORPORAL ---------- */
  {
    exibir: ['avaliacaoCorporal', 'imc'],
    itens: ['item-imc'],
    categoria: 'Avaliação corporal',
    campos: [
      { id: 'valor-imc', chave: 'imc', casas: CASAS_DECIMAIS.INDICE, rotulo: 'IMC', unidade: 'kg/m²' },
    ],
  },
  {
    exibir: ['avaliacaoCorporal', 'pesoCorrespondente'],
    itens: ['item-peso-correspondente'],
    categoria: 'Avaliação corporal',
    campos: [
      { id: 'valor-peso-correspondente', chave: 'pesoCorrespondente', casas: CASAS_DECIMAIS.PESO_KG, rotulo: 'Peso correspondente ao IMC desejado', unidade: 'kg' },
    ],
  },
  {
    exibir: ['avaliacaoCorporal', 'rce'],
    itens: ['item-rce'],
    categoria: 'Avaliação corporal',
    campos: [
      { id: 'valor-rce', chave: 'rce', casas: CASAS_DECIMAIS.INDICE, rotulo: 'RCE', unidade: '' },
    ],
  },

  /* ---------- GASTO ENERGÉTICO ---------- */
  {
    exibir: ['gastoEnergetico', 'tmb'],
    itens: ['item-tmb'],
    categoria: 'Gasto energético',
    campos: [
      { id: 'valor-tmb', chave: 'tmb', casas: CASAS_DECIMAIS.KCAL, rotulo: 'TMB', unidade: 'kcal' },
    ],
  },
  {
    exibir: ['gastoEnergetico', 'get'],
    itens: ['item-get'],
    categoria: 'Gasto energético',
    campos: [
      { id: 'valor-get', chave: 'get', casas: CASAS_DECIMAIS.KCAL, rotulo: 'GET', unidade: 'kcal' },
    ],
  },
  {
    exibir: ['gastoEnergetico', 'vet'],
    itens: ['item-vet'],
    categoria: 'Gasto energético',
    campos: [
      { id: 'valor-vet', chave: 'vet', casas: CASAS_DECIMAIS.KCAL, rotulo: 'VET', unidade: 'kcal' },
    ],
  },

  /* ---------- MACRONUTRIENTES ---------- */
  {
    exibir: ['macronutrientes', 'proteina'],
    itens: ['item-proteina'],
    categoria: 'Macronutrientes',
    campos: [
      { id: 'valor-proteina', chave: 'proteinaG', casas: CASAS_DECIMAIS.GRAMA, rotulo: 'Proteínas', unidade: 'g' },
      { id: 'valor-kcal-proteina', chave: 'kcalProteina', casas: CASAS_DECIMAIS.KCAL, secundario: true },
    ],
  },
  {
    exibir: ['macronutrientes', 'lipidio'],
    itens: ['item-lipidio'],
    categoria: 'Macronutrientes',
    campos: [
      { id: 'valor-lipidio', chave: 'lipidioG', casas: CASAS_DECIMAIS.GRAMA, rotulo: 'Lipídios', unidade: 'g' },
      { id: 'valor-kcal-lipidio', chave: 'kcalLipidio', casas: CASAS_DECIMAIS.KCAL, secundario: true },
    ],
  },
  {
    exibir: ['macronutrientes', 'carboidrato'],
    itens: ['item-carboidrato'],
    categoria: 'Macronutrientes',
    campos: [
      { id: 'valor-carboidrato', chave: 'carboidratoG', casas: CASAS_DECIMAIS.GRAMA, rotulo: 'Carboidratos', unidade: 'g' },
      { id: 'valor-kcal-carboidrato', chave: 'kcalCarboidrato', casas: CASAS_DECIMAIS.KCAL, secundario: true },
    ],
  },
  {
    exibir: ['macronutrientes', 'percentualProteina'],
    itens: ['item-percentual-proteina'],
    categoria: 'Macronutrientes',
    campos: [
      { id: 'valor-percentual-proteina', chave: 'percentualProteina', casas: CASAS_DECIMAIS.PERCENTUAL, rotulo: 'Percentual de proteínas', unidade: UNIDADE_PERCENTUAL },
    ],
  },
  {
    exibir: ['macronutrientes', 'percentualLipidio'],
    itens: ['item-percentual-lipidio'],
    categoria: 'Macronutrientes',
    campos: [
      { id: 'valor-percentual-lipidio', chave: 'percentualLipidio', casas: CASAS_DECIMAIS.PERCENTUAL, rotulo: 'Percentual de lipídios', unidade: UNIDADE_PERCENTUAL },
    ],
  },
  {
    exibir: ['macronutrientes', 'percentualCarboidrato'],
    itens: ['item-percentual-carboidrato'],
    categoria: 'Macronutrientes',
    campos: [
      { id: 'valor-percentual-carboidrato', chave: 'percentualCarboidrato', casas: CASAS_DECIMAIS.PERCENTUAL, rotulo: 'Percentual de carboidratos', unidade: UNIDADE_PERCENTUAL },
    ],
  },
  {
    exibir: ['macronutrientes', 'conferenciaSoma'],
    itens: ['item-conferencia-soma'],
    categoria: 'Macronutrientes',
    campos: [
      { id: 'valor-conferencia-soma', chave: 'conferenciaSoma', casas: CASAS_DECIMAIS.PERCENTUAL, rotulo: 'Conferência da soma dos percentuais', unidade: UNIDADE_PERCENTUAL },
    ],
  },

  /* ---------- OUTROS ---------- */
  {
    exibir: ['outros', 'fibras'],
    itens: ['item-fibras'],
    categoria: 'Outros',
    campos: [
      { id: 'valor-fibras', chave: 'fibras', casas: CASAS_DECIMAIS.GRAMA, rotulo: 'Fibras', unidade: 'g' },
    ],
  },
  {
    exibir: ['outros', 'agua'],
    itens: ['item-agua'],
    categoria: 'Outros',
    campos: [
      { id: 'valor-agua', chave: 'agua', casas: CASAS_DECIMAIS.ML, rotulo: 'Água', unidade: 'mL' },
    ],
  },
  {
    // Uma única chave do contrato cobre dois itens (decisão 19).
    exibir: ['outros', 'composicaoCorporal'],
    itens: ['item-massa-gorda', 'item-massa-livre-gordura'],
    categoria: 'Outros',
    campos: [
      { id: 'valor-massa-gorda', chave: 'massaGorda', casas: CASAS_DECIMAIS.PESO_KG, rotulo: 'Massa gorda', unidade: 'kg' },
      { id: 'valor-massa-livre-gordura', chave: 'massaLivreGordura', casas: CASAS_DECIMAIS.PESO_KG, rotulo: 'Massa livre de gordura', unidade: 'kg' },
    ],
  },
];

/** Ordem das categorias no modelo de saída — igual à seção 15. */
const CATEGORIAS = ['Avaliação corporal', 'Gasto energético', 'Macronutrientes', 'Outros'];

/** IDs das entradas do formulário. */
const IDS_ENTRADA = {
  sexo: 'sexo',
  idade: 'idade',
  pesoKg: 'pesoKg',
  alturaCm: 'alturaCm',
  circunferenciaCinturaCm: 'circunferenciaCinturaCm',
  percentualGordura: 'percentualGordura',
  nivelAtividade: 'nivelAtividade',
  objetivo: 'objetivo',
  deficitKcal: 'deficitKcal',
  superavitKcal: 'superavitKcal',
  fatorProteicoOpcao: 'fatorProteicoOpcao',
  fatorProteicoPersonalizado: 'fatorProteicoPersonalizado',
  percentualLipidios: 'percentualLipidios',
  fatorHidratacao: 'fatorHidratacao',
  imcDesejado: 'imcDesejado',
};

/** IDs das áreas de apoio e dos botões. */
const IDS_APOIO = {
  formulario: 'formulario-calculadora',
  areaMensagens: 'area-mensagens',
  listaMensagens: 'lista-mensagens',
  mensagemMacros: 'mensagem-macronutrientes',
  observacaoConferencia: 'observacao-conferencia-soma',
  avisoCopia: 'aviso-copia',
  botaoCopiar: 'botao-copiar',
  botaoImprimir: 'botao-imprimir',
};

/* ==========================================================================
   C. CACHE DO DOM
   ========================================================================== */

const el = {};

/** Listas achatadas derivadas da tabela de itens. */
const TODOS_OS_VALORES = ITENS.flatMap((item) => item.campos.map((campo) => campo.id));
const TODOS_OS_ITENS = ITENS.flatMap((item) => item.itens);

function cachearElementos() {
  const ids = [
    ...Object.values(IDS_ENTRADA),
    ...Object.values(IDS_APOIO),
    ...TODOS_OS_VALORES,
    ...TODOS_OS_ITENS,
  ];

  for (const id of ids) {
    el[id] = document.getElementById(id);
    if (!el[id]) {
      // Falha visível: um id do HTML mudou de nome.
      console.error(`[calculadora] Elemento não encontrado: #${id}`);
    }
  }
}

/* ==========================================================================
   D. LEITURA DO FORMULÁRIO → objeto `dados`
   ========================================================================== */

/** Texto selecionado. Vazio vira null. */
function lerTexto(id) {
  const valor = el[id].value;
  return valor === '' ? null : valor;
}

/** Valor numérico. Vazio ou não numérico vira null — nunca 0 por engano. */
function lerNumero(id) {
  const texto = el[id].value;
  if (texto === '') return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Compõe o fator proteico a partir dos dois controles.
 *
 *   "personalizado"       → o valor digitado no campo personalizado
 *   "0.8" / "1.4" / "1.8" → o próprio valor da opção (ponto decimal no HTML)
 *   ""                    → null
 */
function comporFatorProteico() {
  const opcao = el[IDS_ENTRADA.fatorProteicoOpcao].value;

  if (opcao === '') return null;
  if (opcao === 'personalizado') return lerNumero(IDS_ENTRADA.fatorProteicoPersonalizado);

  const numero = Number(opcao);
  return Number.isFinite(numero) ? numero : null;
}

/** Objeto com as 14 chaves que validarEntradas() espera. */
function lerFormulario() {
  return {
    sexo: lerTexto(IDS_ENTRADA.sexo),
    idade: lerNumero(IDS_ENTRADA.idade),
    pesoKg: lerNumero(IDS_ENTRADA.pesoKg),
    alturaCm: lerNumero(IDS_ENTRADA.alturaCm),
    circunferenciaCinturaCm: lerNumero(IDS_ENTRADA.circunferenciaCinturaCm),
    percentualGordura: lerNumero(IDS_ENTRADA.percentualGordura),
    nivelAtividade: lerNumero(IDS_ENTRADA.nivelAtividade),
    objetivo: lerTexto(IDS_ENTRADA.objetivo),
    deficitKcal: lerNumero(IDS_ENTRADA.deficitKcal),
    superavitKcal: lerNumero(IDS_ENTRADA.superavitKcal),
    fatorProteico: comporFatorProteico(),
    percentualLipidios: lerNumero(IDS_ENTRADA.percentualLipidios),
    fatorHidratacao: lerNumero(IDS_ENTRADA.fatorHidratacao),
    imcDesejado: lerNumero(IDS_ENTRADA.imcDesejado),
  };
}

/* ==========================================================================
   E. CAMPOS CONDICIONAIS
   ========================================================================== */

/** Desabilitar é limpar: evita valor visível num campo que não está em uso. */
function desabilitarELimpar(id) {
  el[id].value = '';
  el[id].disabled = true;
}

function habilitar(id) {
  el[id].disabled = false;
}

/**
 * Objetivo controla déficit e superávit.
 *
 *   ""          → ambos desabilitados e limpos
 *   manutencao  → ambos desabilitados e limpos
 *   deficit     → déficit habilitado; superávit desabilitado e limpo
 *   superavit   → superávit habilitado; déficit desabilitado e limpo
 */
function aplicarObjetivo() {
  const objetivo = el[IDS_ENTRADA.objetivo].value;

  if (objetivo === OBJETIVOS.DEFICIT) {
    habilitar(IDS_ENTRADA.deficitKcal);
  } else {
    desabilitarELimpar(IDS_ENTRADA.deficitKcal);
  }

  if (objetivo === OBJETIVOS.SUPERAVIT) {
    habilitar(IDS_ENTRADA.superavitKcal);
  } else {
    desabilitarELimpar(IDS_ENTRADA.superavitKcal);
  }
}

/** Fator de proteína: o campo personalizado só vale quando escolhido. */
function aplicarFatorProteico() {
  const opcao = el[IDS_ENTRADA.fatorProteicoOpcao].value;

  if (opcao === 'personalizado') {
    habilitar(IDS_ENTRADA.fatorProteicoPersonalizado);
  } else {
    desabilitarELimpar(IDS_ENTRADA.fatorProteicoPersonalizado);
  }
}

/**
 * O nível de atividade é um único campo: apenas o rótulo muda por sexo.
 * Os textos alternativos vêm dos atributos data-rotulo-* de cada <option>.
 *
 * `sexoDoCampo` permite informar o sexo sem ler o formulário. É necessário
 * no reset: o evento `reset` dispara ANTES de o navegador limpar os campos,
 * então ler #sexo ali devolveria o valor antigo.
 * Quando o argumento é null/"" os quatro níveis mostram as duas formas.
 */
function atualizarRotulosAtividade(sexoDoCampo = el[IDS_ENTRADA.sexo].value) {
  const sexo = sexoDoCampo;
  const selecaoAtual = el[IDS_ENTRADA.nivelAtividade].value;

  for (const opcao of el[IDS_ENTRADA.nivelAtividade].options) {
    const feminino = opcao.dataset.rotuloFeminino;
    const masculino = opcao.dataset.rotuloMasculino;
    if (!feminino || !masculino) continue;

    if (sexo === 'feminino') opcao.textContent = feminino;
    else if (sexo === 'masculino') opcao.textContent = masculino;
    else opcao.textContent = `${feminino} / ${masculino}`;
  }

  // Preserva a escolha ao reescrever os textos das opções.
  el[IDS_ENTRADA.nivelAtividade].value = selecaoAtual;
}

/* ==========================================================================
   F. CÁLCULO — ordem da seção 13 do planejamento
   ========================================================================== */

/**
 * Recebe os valores JÁ validados e normalizados por validarEntradas().
 *
 * Devolve dois objetos:
 *   valores    → o que será exibido (índice da tabela ITENS)
 *   resultados → o que avaliarResultados() espera (7 chaves)
 *
 * Vários valores ficam null de propósito: é assim que o contrato sabe
 * que o item não deve ser exibido.
 */
function calcularTudo(v) {
  const valores = {};

  /* --- ONDA 3: cálculos independentes entre si --- */
  valores.imc = calcularIMC({ pesoKg: v.pesoKg, alturaCm: v.alturaCm });

  valores.pesoCorrespondente = v.imcDesejado === null
    ? null
    : calcularPesoCorrespondenteIMC({ imcDesejado: v.imcDesejado, alturaCm: v.alturaCm });

  valores.rce = v.circunferenciaCinturaCm === null
    ? null
    : calcularRCE({ circunferenciaCinturaCm: v.circunferenciaCinturaCm, alturaCm: v.alturaCm });

  valores.tmb = calcularTMB({
    sexo: v.sexo, pesoKg: v.pesoKg, alturaCm: v.alturaCm, idade: v.idade,
  });

  const get = calcularGET({
    sexo: v.sexo,
    idade: v.idade,
    alturaCm: v.alturaCm,
    pesoKg: v.pesoKg,
    nivelAtividade: v.nivelAtividade,
  });
  valores.get = get;

  const proteinaG = calcularProteinaGramas({
    pesoKg: v.pesoKg,
    fatorProteico: v.fatorProteico,
  });
  valores.proteinaG = proteinaG;
  valores.kcalProteina = calcularCaloriasProteina(proteinaG);

  valores.agua = calcularAgua({ pesoKg: v.pesoKg, fatorHidratacao: v.fatorHidratacao });

  valores.massaGorda = v.percentualGordura === null
    ? null
    : calcularMassaGorda({ pesoKg: v.pesoKg, percentualGordura: v.percentualGordura });

  valores.massaLivreGordura = valores.massaGorda === null
    ? null
    : calcularMassaLivreGordura({ pesoKg: v.pesoKg, massaGordaKg: valores.massaGorda });

  /* --- ONDA 4: o VET vem do GET --- */
  const vet = calcularVET({
    get,
    objetivo: v.objetivo,
    deficitKcal: v.deficitKcal,
    superavitKcal: v.superavitKcal,
  });
  valores.vet = vet;

  /* --- BIFURCAÇÃO OBRIGATÓRIA ---
     As funções abaixo dividem pelo VET. Com VET ≤ 0 elas produziriam
     Infinity ou valores negativos que chegariam à tela. Por isso só são
     chamadas quando o VET serve para calcular os macronutrientes (V2). */
  const vetUtilizavel = vet > 0;

  let lipidioG = null;
  let carboidratoG = null;
  let percentualProteina = null;
  let percentualLipidio = null;
  let percentualCarboidrato = null;

  if (vetUtilizavel) {
    /* --- ONDA 5: depende do VET --- */
    lipidioG = calcularLipidioGramas({ vet, percentualLipidios: v.percentualLipidios });
    valores.lipidioG = lipidioG;
    valores.kcalLipidio = calcularCaloriasLipidio(lipidioG);

    /* --- ONDA 6: depende de PTN e LIP ---
       Pode resultar negativo (V3). O núcleo devolve o valor real:
       nenhuma correção automática é feita aqui. */
    carboidratoG = calcularCarboidratoGramas({ vet, proteinaG, lipidioG });
    valores.carboidratoG = carboidratoG;
    valores.kcalCarboidrato = calcularCaloriasCarboidrato(carboidratoG);

    /* --- ONDA 7: percentuais --- */
    percentualProteina = calcularPercentualProteina({ proteinaG, vet });
    percentualLipidio = calcularPercentualLipidio({ lipidioG, vet });
    valores.percentualProteina = percentualProteina;
    valores.percentualLipidio = percentualLipidio;

    // %CHO depende do CHO: só existe quando o CHO é válido (decisão 39).
    if (carboidratoG >= 0) {
      percentualCarboidrato = calcularPercentualCarboidrato({ carboidratoG, vet });
      valores.percentualCarboidrato = percentualCarboidrato;
    }

    // Fibras dependem do VET, e não dos macros (decisão 43).
    valores.fibras = calcularFibras(vet);
  }

  /* --- Objeto esperado por avaliarResultados(): exatamente 7 chaves --- */
  const resultados = {
    vet,
    proteinaG,
    lipidioG,
    carboidratoG,
    percentualProteina,
    percentualCarboidrato,
    percentualLipidio,
  };

  return { valores, resultados };
}

/* ==========================================================================
   G. RENDERIZAÇÃO
   ========================================================================== */

let modeloAtual = null;

/** Escreve ou limpa um item conforme o contrato, e o exibe ou oculta. */
function aplicarItem(def, visivel, valores) {
  for (const campo of def.campos) {
    // Ao ficar invisível, o valor volta para "—" ANTES de ser ocultado,
    // para que um número antigo nunca reapareça.
    el[campo.id].textContent = visivel
      ? formatar(valores[campo.chave], campo.casas)
      : TRACO;
  }

  for (const idItem of def.itens) {
    el[idItem].hidden = !visivel;
  }
}

/**
 * Aplica o contrato à tela.
 *
 * A interface não reinterpreta nenhuma regra: apenas lê `contrato.exibir`.
 */
function renderizar(contrato, valores) {
  // Valor da conferência (V4): vem do contrato, não de um cálculo local.
  valores.conferenciaSoma = contrato.resultados.somaPercentuais.valor;

  for (const def of ITENS) {
    const [categoria, chave] = def.exibir;
    aplicarItem(def, contrato.exibir[categoria][chave], valores);
  }

  modeloAtual = montarModeloSaida(contrato, valores);
}

/** Estado inicial dos valores: todos os itens visíveis com "—". Não toca nas mensagens. */
function limparValores() {
  for (const id of TODOS_OS_VALORES) {
    el[id].textContent = TRACO;
  }
  for (const id of TODOS_OS_ITENS) {
    el[id].hidden = false;
  }

  modeloAtual = null;
  atualizarBotoesSaida(false);
}

/**
 * Invalida o resultado do cálculo anterior (decisão 45).
 *
 * Diferente de limparValores(), NÃO devolve os itens ocultos: o que não se
 * aplicava ao cálculo anterior continua oculto. O estado inicial completo
 * (todos os itens visíveis com "—") é restaurado apenas pelo botão Limpar.
 */
function invalidarResultados() {
  for (const id of TODOS_OS_VALORES) {
    el[id].textContent = TRACO;
  }

  // A mensagem de V2/V3 e a observação do V4 descrevem o resultado que acabou
  // de ser invalidado: sem esta limpeza elas ficariam presas na tela.
  limparMensagensDeResultado();

  modeloAtual = null;
  atualizarBotoesSaida(false);
}

/** Estado inicial completo: valores + mensagens. */
function limparResultados() {
  limparValores();
  limparMensagens();
}

/* ==========================================================================
   H. MENSAGENS
   ========================================================================== */

function limparMensagens() {
  el[IDS_APOIO.listaMensagens].replaceChildren();
  limparMensagensDeResultado();
  // Sem mensagens, a seção inteira fica oculta (também vale para a impressão).
  el[IDS_APOIO.areaMensagens].hidden = true;
}

/**
 * Mensagens que descrevem um RESULTADO calculado — V2/V3 (bloco
 * Macronutrientes) e V4 (observação da conferência). Elas saem junto com o
 * resultado que invalidam (decisão 45).
 */
function limparMensagensDeResultado() {
  el[IDS_APOIO.mensagemMacros].textContent = '';
  el[IDS_APOIO.observacaoConferencia].textContent = '';
}

/**
 * Erros de ENTRADA (V1, V5, V6, V7)  → #lista-mensagens
 * Erros de RESULTADO (V2 e V3)      → #mensagem-macronutrientes
 * Erro da conferência (V4)          → observação do item de conferência
 *
 * A separação evita a mesma frase aparecer duas vezes na tela.
 */
function mostrarMensagens(contrato) {
  limparMensagens();

  if (!contrato) return;

  const lista = el[IDS_APOIO.listaMensagens];

  // Erros de ENTRADA aparecem na lista da própria seção.
  for (const erro of contrato.entradas.erros) {
    const linha = document.createElement('li');
    linha.textContent = erro.mensagem;
    lista.append(linha);
  }

  // Sem resultado avaliado (entradas inválidas) não há erro de V2/V3/V4.
  if (contrato.resultados) {
    // V2/V3 têm lugar próprio, dentro da categoria Macronutrientes.
    const errosDeMacros = [];
    if (contrato.resultados.vet.erro) errosDeMacros.push(contrato.resultados.vet.erro.mensagem);
    if (contrato.resultados.macros.erro) errosDeMacros.push(contrato.resultados.macros.erro.mensagem);
    el[IDS_APOIO.mensagemMacros].textContent = errosDeMacros.join(' ');

    // V4 é exibida como observação do próprio item de conferência.
    if (contrato.resultados.somaPercentuais.erro) {
      el[IDS_APOIO.observacaoConferencia].textContent =
        contrato.resultados.somaPercentuais.erro.mensagem;
    }
  }

  // A seção "Verificações" só aparece quando tem algo a mostrar.
  el[IDS_APOIO.areaMensagens].hidden = lista.children.length === 0;
}

/* ==========================================================================
   I. BOTÕES DE SAÍDA
   ========================================================================== */

/**
 * Copiar e Imprimir só fazem sentido depois de um cálculo com entradas
 * válidas — mesmo que o VET seja ≤ 0, pois há resultados e mensagens.
 */
function atualizarBotoesSaida(habilitados) {
  el[IDS_APOIO.botaoCopiar].disabled = !habilitados;
  el[IDS_APOIO.botaoImprimir].disabled = !habilitados;
}

/* ==========================================================================
   J. SAÍDA — modelo, "Copiar resultado" e área de transferência
   ==========================================================================
   montarModeloSaida() é a única fonte do que está na tela, então a cópia
   apenas serializa esse modelo — sem reler o DOM. Assim o texto copiado
   reflete exatamente o que está visível: não lista um item oculto nem
   esquece um exibido (seção 15, comportamento 3).
   ========================================================================== */

function montarModeloSaida(contrato, valores) {
  const modelo = [];

  for (const nomeCategoria of CATEGORIAS) {
    const itens = [];

    for (const def of ITENS) {
      if (def.categoria !== nomeCategoria) continue;

      const [categoria, chave] = def.exibir;
      if (!contrato.exibir[categoria][chave]) continue;

      for (const campo of def.campos) {
        if (campo.secundario) continue; // kcal dos macros: detalhe do item
        itens.push({
          rotulo: campo.rotulo,
          valor: formatar(valores[campo.chave], campo.casas),
          unidade: campo.unidade,
        });
      }
    }

    if (itens.length > 0) modelo.push({ categoria: nomeCategoria, itens });
  }

  return modelo;
}

/**
 * Textos do retorno ao usuário.
 *
 * Ficam aqui, e não em nucleo/constantes.js, porque são puramente de
 * interface: não são dado do domínio nem mensagem aprovada no planejamento
 * (seção 17). O núcleo continua só com regras e números.
 */
const AVISOS_COPIA = Object.freeze({
  SUCESSO: 'Resultado copiado.',
  FALHA:
    'Não foi possível copiar automaticamente. ' +
    'Selecione os resultados na tela e use Ctrl+C.',
});

/**
 * Modelo → texto plano na estrutura aprovada (seção 15, comportamento 3):
 * as 4 categorias em MAIÚSCULAS, na ordem de CATEGORIAS, apenas os itens
 * disponíveis e nenhum dado de entrada.
 *
 * Cada item vira `Rótulo: valor unidade`, no padrão brasileiro já fornecido
 * por formatar() — a unidade some quando não existe (ex.: RCE).
 */
function serializarResultado(modelo) {
  const blocos = modelo.map(({ categoria, itens }) => {
    const linhas = itens.map(({ rotulo, valor, unidade }) => {
      if (unidade === '') return `${rotulo}: ${valor}`;
      // O percentual sai colado ao número: `9,8%` (decisão 46).
      if (unidade === UNIDADE_PERCENTUAL) return `${rotulo}: ${valor}${unidade}`;
      return `${rotulo}: ${valor} ${unidade}`;
    });
    return [categoria.toUpperCase(), ...linhas].join('\n');
  });

  return blocos.join('\n\n');
}

/**
 * Escreve na área de transferência.
 *
 * Usa a Clipboard API e, quando ela não existe (contexto não seguro, como
 * http:// fora de localhost, ou navegador antigo), cai no antigo execCommand
 * sobre um campo temporário — a alternativa mínima, sem bibliotecas.
 */
async function escreverNaAreaDeTransferencia(texto) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(texto);
    return;
  }

  if (typeof document.execCommand !== 'function') {
    throw new Error('Área de transferência indisponível neste navegador.');
  }

  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.style.position = 'fixed';
  campo.style.top = '-1000px';
  document.body.append(campo);
  campo.select();
  campo.setSelectionRange(0, texto.length); // o iOS ignora apenas select()

  const copiou = document.execCommand('copy');
  campo.remove();

  if (!copiou) throw new Error('execCommand("copy") recusado pelo navegador.');
}

/**
 * Retorno acessível: a região viva dedicada (index.html, #aviso-copia) anuncia
 * a mudança para leitores de tela, sem mexer no layout nem no texto visível.
 *
 * A limpeza e a escrita ficam em tarefas diferentes: sem isso, copiar duas
 * vezes seguidas com o mesmo resultado não seria reanunciado — o leitor de
 * tela só percebe mudança de conteúdo.
 *
 * Esta função NÃO pode lançar: ela é chamada também dentro do `catch` de
 * copiarResultado(), e uma exceção ali viraria promise rejeitada sem
 * tratamento, deixando o usuário sem qualquer retorno (decisão 9 / seção 15).
 */
function anunciarResultadoDaCopia(mensagem) {
  const aviso = el[IDS_APOIO.avisoCopia];

  // Sem a região viva não há o que anunciar; a cópia em si não é afetada.
  if (!aviso) return;

  aviso.textContent = '';
  window.setTimeout(() => {
    aviso.textContent = mensagem;
  }, 150);
}

/**
 * Serializa o modelo corrente e copia (seção 15, comportamento 3).
 *
 * Nunca quebra a página: uma falha só troca o aviso anunciado, e os resultados
 * permanecem na tela, disponíveis para seleção manual.
 */
async function copiarResultado() {
  // Sem cálculo válido não há o que copiar. O botão já nasce desabilitado
  // nesse estado — este retorno preserva a garantia para quem chamar daqui.
  if (modeloAtual === null) return;

  try {
    await escreverNaAreaDeTransferencia(serializarResultado(modeloAtual));
    anunciarResultadoDaCopia(AVISOS_COPIA.SUCESSO);
  } catch (erro) {
    console.error('[calculadora] Falha ao copiar o resultado:', erro);
    anunciarResultadoDaCopia(AVISOS_COPIA.FALHA);
  }
}

/* ==========================================================================
   K. FLUXO PRINCIPAL
   ========================================================================== */

function executarCalculo() {
  const dados = lerFormulario();

  // Portão: sem entradas válidas não há o que calcular.
  const entradas = validarEntradas(dados);

  if (!entradas.valido) {
    limparResultados();
    mostrarMensagens({ entradas, resultados: null });
    return;
  }

  const { valores, resultados } = calcularTudo(entradas.valores);
  const contrato = avaliar({ dados, resultados });

  renderizar(contrato, valores);
  mostrarMensagens(contrato);
  atualizarBotoesSaida(true);
}

/** O reset nativo já limpa os campos; aqui limpamos o que ele não toca. */
function aoLimpar() {
  // Não dependemos dos valores do formulário: o navegador só os limpa
  // DEPOIS deste handler. Por isso os dois selects são zerados aqui,
  // para que aplicarObjetivo() e aplicarFatorProteico() leiam o estado
  // inicial em vez do valor antigo.
  limparResultados();

  el[IDS_ENTRADA.objetivo].value = '';
  el[IDS_ENTRADA.fatorProteicoOpcao].value = '';

  aplicarObjetivo();
  aplicarFatorProteico();
  // null explícito: #sexo ainda contém o valor antigo neste momento.
  atualizarRotulosAtividade(null);
}

function aoImprimir() {
  window.print();
}

/**
 * Qualquer mudança relevante depois de um cálculo invalida o resultado.
 * Os valores digitados pelo usuário são preservados: só os resultados saem.
 *
 * As mensagens de ENTRADA (V1, V5, V6 e V7) continuam na tela: quem as apaga é
 * o próximo Calcular ou o Limpar. Já as mensagens de RESULTADO (V2, V3 e V4)
 * saem junto com o resultado, e os itens que estavam ocultos continuam ocultos
 * — decisão 45.
 */
function aoAlterarCampo(evento) {
  const alvo = evento.target;

  if (alvo === el[IDS_ENTRADA.objetivo]) {
    aplicarObjetivo();
  } else if (alvo === el[IDS_ENTRADA.fatorProteicoOpcao]) {
    aplicarFatorProteico();
  } else if (alvo === el[IDS_ENTRADA.sexo]) {
    atualizarRotulosAtividade();
  }

  invalidarResultados();
}

/* ==========================================================================
   L. INICIALIZAÇÃO
   ========================================================================== */

export function iniciar() {
  cachearElementos();

  // Estado inicial explícito (o HTML já nasce assim; aqui fica garantido).
  aplicarObjetivo();
  aplicarFatorProteico();
  atualizarRotulosAtividade();
  limparResultados();

  el[IDS_APOIO.formulario].addEventListener('submit', (evento) => {
    evento.preventDefault(); // o formulário tem novalidate: o fluxo é nosso
    executarCalculo();
  });

  el[IDS_APOIO.formulario].addEventListener('reset', aoLimpar);

  // `change` cobre selects e campos numéricos ao perderem o foco.
  // Não usamos `input`, para as mensagens não piscarem durante a digitação.
  el[IDS_APOIO.formulario].addEventListener('change', aoAlterarCampo);

  el[IDS_APOIO.botaoImprimir].addEventListener('click', aoImprimir);
  el[IDS_APOIO.botaoCopiar].addEventListener('click', copiarResultado);
}
