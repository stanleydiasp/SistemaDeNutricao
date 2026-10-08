/**
 * SistemaDeNutricao — Núcleo
 * validacoes.js
 *
 * As validações V1 a V7 do planejamento.md (seção 17).
 *
 * O QUE ESTE ARQUIVO É
 *   • Um VERIFICADOR, não um calculador.
 *   • Ele recebe os dados do formulário e/ou os resultados já calculados,
 *     e devolve um relatório dizendo o que é válido e o que pode ser exibido.
 *   • Nenhuma conta é feita aqui. As únicas chamadas matemáticas são as
 *     funções de conferência de percentuais de ./formulas.js.
 *   • Nenhum acesso a HTML, DOM, document ou window.
 *
 * O QUE ELE NÃO FAZ
 *   • Não corrige valores escolhidos pelo usuário (decisões 25 e 32).
 *   • Não inventa limites clínicos de idade, peso, altura, IMC ou cintura.
 *   • Não classifica RCE nem IMC (lacunas L1 e L3).
 *
 * Natureza das validações (decisão 27): são verificações MATEMÁTICAS e
 * OPERACIONAIS — existem para impedir resultados impossíveis (número
 * negativo, divisão por zero). Não são regras nutricionais.
 *
 * ---------------------------------------------------------------------------
 * CONTRATO DE RETORNO — `avaliar({ dados, resultados })`
 * ---------------------------------------------------------------------------
 * A interface NÃO deve reinterpretar nenhuma regra: basta ler os campos abaixo.
 *
 * {
 *   entradas: {                       // resultado de validarEntradas()
 *     valido,                         // 1. os dados obrigatórios estão válidos?
 *     erros: [],                      // 2. quais erros existem?
 *     opcionais: { cinturaInformada, percentualGorduraInformado, imcDesejadoInformado },
 *     valores: { ... }                // entradas prontas para uso, ou null
 *   },
 *
 *   resultados: {                     // resultado de avaliarResultados()
 *     vet: {                          // 3. o VET é válido?
 *       disponivel, valido, valor, erro
 *     },
 *     macros: {                       // 4. os macronutrientes são válidos?
 *       disponivel, valido, carboidratoValido, erro
 *     },
 *     somaPercentuais: {
 *       disponivel, valor, dentroDaTolerancia, erro
 *     }
 *   },
 *
 *   exibir: {                         // 5. quais blocos podem ser exibidos?
 *     avaliacaoCorporal: { imc, pesoCorrespondente, rce },
 *     gastoEnergetico:   { tmb, get, vet },
 *     macronutrientes:   { proteina, lipidio, carboidrato,
 *                          percentualProteina, percentualCarboidrato, percentualLipidio,
 *                          conferenciaSoma },
 *     outros:            { fibras, agua, composicaoCorporal }
 *   },
 *
 *   erros: []                         // todos os erros, de entradas e de resultados
 * }
 *
 * Cada valor de `exibir` é um booleano. `true` significa "a interface deve
 * exibir este item". Nenhum cálculo é necessário para decidir.
 * ---------------------------------------------------------------------------
 */

import {
  SEXOS,
  OBJETIVOS,
  NIVEIS_ATIVIDADE,
  MENSAGENS,
  BASE_PERCENTUAL,
} from './constantes.js';

import {
  somarPercentuaisMacronutrientes,
  somaPercentuaisDentroDaTolerancia,
} from './formulas.js';

/* ==========================================================================
   Códigos de erro
   ========================================================================== */

/**
 * Códigos estáveis para a interface comparar sem depender do texto.
 * O texto exibido vem de MENSAGENS (constantes.js).
 */
export const CODIGOS_ERRO = Object.freeze({
  CAMPO_OBRIGATORIO: 'CAMPO_OBRIGATORIO',
  DEFICIT_SUPERAVIT_OBRIGATORIO: 'DEFICIT_SUPERAVIT_OBRIGATORIO',
  VET_INVALIDO: 'VET_INVALIDO',
  MACROS_INVALIDOS: 'MACROS_INVALIDOS',
  SOMA_PERCENTUAIS_FORA: 'SOMA_PERCENTUAIS_FORA',
  PERCENTUAL_GORDURA_FORA_DA_FAIXA: 'PERCENTUAL_GORDURA_FORA_DA_FAIXA',
});

/** V1 — nomes exibíveis dos campos, usados nas mensagens de erro. */
const ROTULOS_CAMPOS = Object.freeze({
  sexo: 'Sexo',
  idade: 'Idade',
  pesoKg: 'Peso',
  alturaCm: 'Altura',
  nivelAtividade: 'Nível de atividade física',
  objetivo: 'Objetivo',
  fatorProteico: 'Fator de proteína',
  percentualLipidios: 'Percentual de lipídios',
  fatorHidratacao: 'Fator de hidratação',
  deficitKcal: 'Déficit energético',
  superavitKcal: 'Superávit energético',
  circunferenciaCinturaCm: 'Circunferência da cintura',
  percentualGordura: 'Percentual de gordura',
  imcDesejado: 'IMC desejado',
});

/* ==========================================================================
   Auxiliares internos (não exportados)
   ========================================================================== */

/** O campo foi preenchido? Vazio = null, undefined ou texto em branco. */
function estaPreenchido(valor) {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === 'string') return valor.trim() !== '';
  return true;
}

/** Número finito e maior que zero. É a regra da V1. */
function ehNumeroPositivo(valor) {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return typeof numero === 'number' && Number.isFinite(numero) && numero > 0;
}

/** Converte para número (aceita texto vindo de um campo de formulário). */
function paraNumero(valor) {
  return typeof valor === 'string' ? Number(valor) : valor;
}

/** Monta um erro no formato padrão. */
function criarErro(codigo, campo, mensagem) {
  return { codigo, campo, mensagem };
}

/** Número positivo → valor; caso contrário → null. */
function lerOpcionalPositivo(valor) {
  return estaPreenchido(valor) && ehNumeroPositivo(valor) ? paraNumero(valor) : null;
}

/* ==========================================================================
   V1 · V5 · V6 · V7 — Validação das ENTRADAS
   ========================================================================== */

/**
 * Verifica os dados informados no formulário.
 *
 * V1 — campos obrigatórios: preenchidos e número positivo.
 * V1 (decisão 44) — percentual de gordura, quando informado, precisa ficar em
 *                   `0 < % ≤ 100`. É a ÚNICA faixa do sistema, e ela é
 *                   matemática (fração do peso), não clínica.
 * V5 — circunferência da cintura é OPCIONAL (ausência não é erro).
 * V6 — déficit/superávit é obrigatório quando o objetivo é Déficit/Superávit.
 * V7 — IMC desejado é OPCIONAL (ausência não é erro).
 *
 * Não há limites clínicos: idade, peso e altura não têm faixa de aceitação.
 */
export function validarEntradas(dados = {}) {
  const erros = [];

  const sexo = dados.sexo;
  const objetivo = dados.objetivo;
  const nivelAtividade = dados.nivelAtividade;

  /* --- V1: sexo --- */
  if (!estaPreenchido(sexo)) {
    erros.push(criarErro(CODIGOS_ERRO.CAMPO_OBRIGATORIO, 'sexo', `${ROTULOS_CAMPOS.sexo}: informe uma opção.`));
  } else if (!Object.values(SEXOS).includes(sexo)) {
    erros.push(criarErro(CODIGOS_ERRO.CAMPO_OBRIGATORIO, 'sexo', `${ROTULOS_CAMPOS.sexo}: opção inválida.`));
  }

  /* --- V1: números obrigatórios e positivos --- */
  const camposNumericosObrigatorios = [
    'idade',
    'pesoKg',
    'alturaCm',
    'fatorProteico',
    'percentualLipidios',
    'fatorHidratacao',
  ];

  for (const campo of camposNumericosObrigatorios) {
    if (!estaPreenchido(dados[campo]) || !ehNumeroPositivo(dados[campo])) {
      erros.push(
        criarErro(
          CODIGOS_ERRO.CAMPO_OBRIGATORIO,
          campo,
          `${ROTULOS_CAMPOS[campo]}: ${MENSAGENS.CAMPO_OBRIGATORIO}`
        )
      );
    }
  }

  /* --- V1: nível de atividade --- */
  if (!estaPreenchido(nivelAtividade)) {
    erros.push(
      criarErro(
        CODIGOS_ERRO.CAMPO_OBRIGATORIO,
        'nivelAtividade',
        `${ROTULOS_CAMPOS.nivelAtividade}: informe uma opção.`
      )
    );
  } else if (!Object.prototype.hasOwnProperty.call(NIVEIS_ATIVIDADE, nivelAtividade)) {
    erros.push(
      criarErro(
        CODIGOS_ERRO.CAMPO_OBRIGATORIO,
        'nivelAtividade',
        `${ROTULOS_CAMPOS.nivelAtividade}: opção inválida. Use 1, 2, 3 ou 4.`
      )
    );
  }

  /* --- V1: objetivo --- */
  if (!estaPreenchido(objetivo)) {
    erros.push(
      criarErro(
        CODIGOS_ERRO.CAMPO_OBRIGATORIO,
        'objetivo',
        `${ROTULOS_CAMPOS.objetivo}: informe uma opção.`
      )
    );
  } else if (!Object.values(OBJETIVOS).includes(objetivo)) {
    erros.push(
      criarErro(
        CODIGOS_ERRO.CAMPO_OBRIGATORIO,
        'objetivo',
        `${ROTULOS_CAMPOS.objetivo}: opção inválida.`
      )
    );
  }

  /* --- V6: déficit/superávit obrigatório conforme o objetivo --- */
  // Não existe zero implícito: o valor tem de ser informado (decisão 32).
  const exigeDeficit = objetivo === OBJETIVOS.DEFICIT;
  const exigeSuperavit = objetivo === OBJETIVOS.SUPERAVIT;

  if (exigeDeficit) {
    if (!estaPreenchido(dados.deficitKcal) || !ehNumeroPositivo(dados.deficitKcal)) {
      erros.push(
        criarErro(
          CODIGOS_ERRO.DEFICIT_SUPERAVIT_OBRIGATORIO,
          'deficitKcal',
          MENSAGENS.DEFICIT_SUPERAVIT_OBRIGATORIO
        )
      );
    }
  }

  if (exigeSuperavit) {
    if (!estaPreenchido(dados.superavitKcal) || !ehNumeroPositivo(dados.superavitKcal)) {
      erros.push(
        criarErro(
          CODIGOS_ERRO.DEFICIT_SUPERAVIT_OBRIGATORIO,
          'superavitKcal',
          MENSAGENS.DEFICIT_SUPERAVIT_OBRIGATORIO
        )
      );
    }
  }

  /* --- V5 e V7: opcionais --- */
  // V5: sem cintura, o RCE simplesmente não é calculado. Não é erro.
  // V7: sem IMC desejado, o peso correspondente não é exibido. Não é erro.
  // Se informados, precisam ser números positivos.
  const camposOpcionais = ['circunferenciaCinturaCm', 'percentualGordura', 'imcDesejado'];

  for (const campo of camposOpcionais) {
    if (estaPreenchido(dados[campo]) && !ehNumeroPositivo(dados[campo])) {
      erros.push(
        criarErro(
          CODIGOS_ERRO.CAMPO_OBRIGATORIO,
          campo,
          `${ROTULOS_CAMPOS[campo]}: ${MENSAGENS.CAMPO_OBRIGATORIO}`
        )
      );
    }
  }

  /* --- V1 (decisão 44): faixa matemática do percentual de gordura ---
     O percentual de gordura é a fração do peso: acima de 100% a massa gorda
     seria maior que o peso e a massa livre de gordura sairia negativa — um
     resultado impossível. Não é limite clínico (decisão 27): é a própria
     definição de percentual. O valor informado não é corrigido nem limitado;
     a entrada é apenas recusada. */
  if (
    estaPreenchido(dados.percentualGordura) &&
    ehNumeroPositivo(dados.percentualGordura) &&
    paraNumero(dados.percentualGordura) > BASE_PERCENTUAL
  ) {
    erros.push(
      criarErro(
        CODIGOS_ERRO.PERCENTUAL_GORDURA_FORA_DA_FAIXA,
        'percentualGordura',
        `${ROTULOS_CAMPOS.percentualGordura}: ${MENSAGENS.PERCENTUAL_GORDURA_FORA_DA_FAIXA}`
      )
    );
  }

  const valido = erros.length === 0;

  /* --- Flags dos campos opcionais --- */
  const opcionais = Object.freeze({
    cinturaInformada: estaPreenchido(dados.circunferenciaCinturaCm),
    percentualGorduraInformado: estaPreenchido(dados.percentualGordura),
    imcDesejadoInformado: estaPreenchido(dados.imcDesejado),
  });

  /* --- Valores normalizados (só quando tudo é válido) --- */
  const valores = valido
    ? Object.freeze({
        sexo,
        idade: paraNumero(dados.idade),
        pesoKg: paraNumero(dados.pesoKg),
        alturaCm: paraNumero(dados.alturaCm),
        nivelAtividade: paraNumero(nivelAtividade),
        objetivo,
        fatorProteico: paraNumero(dados.fatorProteico),
        percentualLipidios: paraNumero(dados.percentualLipidios),
        fatorHidratacao: paraNumero(dados.fatorHidratacao),
        deficitKcal: exigeDeficit ? paraNumero(dados.deficitKcal) : null,
        superavitKcal: exigeSuperavit ? paraNumero(dados.superavitKcal) : null,
        circunferenciaCinturaCm: lerOpcionalPositivo(dados.circunferenciaCinturaCm),
        percentualGordura: lerOpcionalPositivo(dados.percentualGordura),
        imcDesejado: lerOpcionalPositivo(dados.imcDesejado),
      })
    : null;

  return { valido, erros, opcionais, valores };
}

/* ==========================================================================
   V2 · V3 · V4 — Avaliação dos RESULTADOS
   ========================================================================== */

/**
 * V2 — VET precisa ser maior que zero.
 *
 * Sem VET válido, nada que dependa dele pode ser calculado. A fórmula do
 * VET não corrige o caso (pode devolver zero ou negativo); esta avaliação
 * apenas constata.
 */
export function avaliarVET(vet) {
  // Resultado ainda não calculado (por exemplo, as entradas eram inválidas).
  if (vet === null || vet === undefined) {
    return { disponivel: false, valido: false, valor: null, erro: null };
  }

  if (!Number.isFinite(vet)) {
    return {
      disponivel: true,
      valido: false,
      valor: null,
      erro: criarErro(CODIGOS_ERRO.VET_INVALIDO, 'vet', MENSAGENS.VET_INVALIDO),
    };
  }

  const valido = vet > 0;

  return {
    disponivel: true,
    valido,
    valor: vet,
    erro: valido ? null : criarErro(CODIGOS_ERRO.VET_INVALIDO, 'vet', MENSAGENS.VET_INVALIDO),
  };
}

/**
 * V3 — As calorias de proteína e lipídios cabem no VET?
 *
 * Condição: (PTN × 4) + (LIP × 9) > VET  →  o carboidrato ficaria negativo.
 *
 * Quando isso acontece:
 *   • o CARBOIDRATO é inválido e não pode ser exibido;
 *   • PROTEÍNAS e LIPÍDIOS continuam válidos e são exibidos (decisão 39);
 *   • nenhum valor é corrigido automaticamente (decisão 25).
 *
 * A comparação é feita sobre o carboidrato já calculado por formulas.js,
 * para não repetir a fórmula aqui.
 */
export function avaliarMacros({ vet, carboidratoG } = {}) {
  if (vet === null || vet === undefined || carboidratoG === null || carboidratoG === undefined) {
    return { disponivel: false, valido: false, carboidratoValido: false, erro: null };
  }

  const carboidratoValido = Number.isFinite(carboidratoG) && carboidratoG >= 0;

  return {
    disponivel: true,
    valido: carboidratoValido,
    carboidratoValido,
    erro: carboidratoValido
      ? null
      : criarErro(CODIGOS_ERRO.MACROS_INVALIDOS, 'carboidratoG', MENSAGENS.MACROS_INVALIDOS),
  };
}

/**
 * V4 — Conferência interna da soma dos percentuais.
 *
 * É verificação de SANIDADE, não validação clínica (decisão 27): como o
 * carboidrato é a sobra do VET, a soma reconstrói os 100% matematicamente.
 * A tolerância (constantes.js) existe apenas para absorver erro de ponto
 * flutuante.
 */
export function verificarSomaPercentuais({
  percentualProteina,
  percentualCarboidrato,
  percentualLipidio,
} = {}) {
  const todosPresentes =
    percentualProteina !== null &&
    percentualProteina !== undefined &&
    percentualCarboidrato !== null &&
    percentualCarboidrato !== undefined &&
    percentualLipidio !== null &&
    percentualLipidio !== undefined;

  if (!todosPresentes) {
    return { disponivel: false, valor: null, dentroDaTolerancia: false, erro: null };
  }

  const valor = somarPercentuaisMacronutrientes({
    percentualProteina,
    percentualCarboidrato,
    percentualLipidio,
  });

  const dentroDaTolerancia = somaPercentuaisDentroDaTolerancia(valor);

  return {
    disponivel: true,
    valor,
    dentroDaTolerancia,
    erro: dentroDaTolerancia
      ? null
      : criarErro(CODIGOS_ERRO.SOMA_PERCENTUAIS_FORA, 'percentuais', MENSAGENS.SOMA_PERCENTUAIS_FORA),
  };
}

/**
 * Reúne V2, V3 e V4 a partir dos valores calculados por formulas.js.
 *
 * `resultados` deve conter:
 *   { vet, proteinaG, lipidioG, carboidratoG,
 *     percentualProteina, percentualCarboidrato, percentualLipidio }
 *
 * Todos podem vir como null quando não foram calculados.
 */
export function avaliarResultados(resultados = {}) {
  const vet = avaliarVET(resultados.vet);

  // V2 manda: sem VET válido, nada do bloco de macros pode ser avaliado.
  const macros = vet.valido
    ? avaliarMacros({ vet: vet.valor, carboidratoG: resultados.carboidratoG })
    : { disponivel: false, valido: false, carboidratoValido: false, erro: null };

  // V4 só faz sentido quando os três percentuais existem.
  const percentuaisDisponiveis =
    vet.valido &&
    macros.valido &&
    resultados.percentualProteina !== null &&
    resultados.percentualProteina !== undefined &&
    resultados.percentualCarboidrato !== null &&
    resultados.percentualCarboidrato !== undefined &&
    resultados.percentualLipidio !== null &&
    resultados.percentualLipidio !== undefined;

  const somaPercentuais = percentuaisDisponiveis
    ? verificarSomaPercentuais({
        percentualProteina: resultados.percentualProteina,
        percentualCarboidrato: resultados.percentualCarboidrato,
        percentualLipidio: resultados.percentualLipidio,
      })
    : { disponivel: false, valor: null, dentroDaTolerancia: false, erro: null };

  return {
    vet,
    macros,
    somaPercentuais,
  };
}

/* ==========================================================================
   Mapa de exibição — o que a interface deve mostrar
   ========================================================================== */

/**
 * Decide quais blocos de resultado podem ser exibidos.
 *
 * Regras aplicadas (todas já aprovadas no planejamento):
 *   • Nada é exibido quando as entradas são inválidas (V1 ou V6).
 *   • RCE só existe quando a cintura foi informada (V5).
 *   • Peso correspondente só existe quando o IMC desejado foi informado (V7).
 *   • Composição corporal só existe quando o percentual de gordura foi informado.
 *   • Quando a V2 falha (VET ≤ 0): macros, percentuais e FIBRAS não são
 *     exibidos; o VET CONTINUA sendo exibido (é o valor que originou o
 *     problema); IMC, RCE, TMB, GET, água e composição corporal continuam.
 *   • Quando a V3 falha (CHO negativo): proteínas e lipídios continuam,
 *     o carboidrato é sinalizado como inválido, e a conferência da soma
 *     não é exibida (decisão 39).
 *   • Fibras dependem apenas do VET, e não dos macros.
 */
export function montarExibicao({ entradas, resultados } = {}) {
  const entradasValidas = Boolean(entradas && entradas.valido);

  // `vetDisponivel` e `vetValido` são coisas diferentes:
  //   disponivel → o VET existe como resultado (foi calculado)
  //   valido     → o VET é > 0 e serve de base para os macronutrientes
  // O VET é EXIBIDO quando existe, mesmo sendo inválido, porque é ele que
  // originou o problema e o usuário precisa vê-lo para entender a mensagem.
  // Já macros, percentuais e fibras dependem de um VET válido.
  const vetDisponivel = Boolean(entradasValidas && resultados && resultados.vet && resultados.vet.disponivel);
  const vetValido = Boolean(vetDisponivel && resultados.vet.valido);
  const macrosValidos = Boolean(vetValido && resultados.macros && resultados.macros.valido);

  // Sem VET válido, todo o bloco que depende dele sai de cena (V2).
  const blocoMacrosVisivel = vetValido;

  // Na falha da V3, apenas o carboidrato é sinalizado (decisão 39).
  const carboidratoVisivel = macrosValidos;

  const opcionais = (entradas && entradas.opcionais) || {
    cinturaInformada: false,
    percentualGorduraInformado: false,
    imcDesejadoInformado: false,
  };

  return {
    avaliacaoCorporal: {
      imc: entradasValidas,
      pesoCorrespondente: entradasValidas && opcionais.imcDesejadoInformado,
      rce: entradasValidas && opcionais.cinturaInformada,
    },
    gastoEnergetico: {
      tmb: entradasValidas,
      get: entradasValidas,
      vet: vetDisponivel,
    },
    macronutrientes: {
      proteina: blocoMacrosVisivel,
      lipidio: blocoMacrosVisivel,
      carboidrato: carboidratoVisivel,
      percentualProteina: blocoMacrosVisivel,
      percentualCarboidrato: carboidratoVisivel,
      percentualLipidio: blocoMacrosVisivel,
      conferenciaSoma: macrosValidos,
    },
    outros: {
      // Fibras dependem do VET, e não dos macros: continuam válidas na falha da V3.
      fibras: vetValido,
      agua: entradasValidas,
      composicaoCorporal: entradasValidas && opcionais.percentualGorduraInformado,
    },
  };
}

/* ==========================================================================
   Ponto de entrada único
   ========================================================================== */

/**
 * Executa todas as validações e devolve o contrato completo.
 *
 * Uso na interface:
 *
 *   const entradas = validarEntradas(dadosDoFormulario);
 *   if (!entradas.valido) { mostrar(entradas.erros); return; }
 *
 *   const calculados = {
 *     vet: calcularVET({ ... }),
 *     proteinaG: calcularProteinaGramas({ ... }),
 *     ...
 *   };
 *
 *   const contrato = avaliar({ dados: dadosDoFormulario, resultados: calculados });
 *   // contrato.exibir diz exatamente o que renderizar
 *
 * `resultados` é opcional: sem ele, as validações de entrada continuam
 * funcionando e os blocos que dependem de cálculo ficam como `false`.
 */
export function avaliar({ dados = {}, resultados = {} } = {}) {
  const entradas = validarEntradas(dados);
  const avaliacaoResultados = entradas.valido
    ? avaliarResultados(resultados)
    : {
        vet: { disponivel: false, valido: false, valor: null, erro: null },
        macros: { disponivel: false, valido: false, carboidratoValido: false, erro: null },
        somaPercentuais: { disponivel: false, valor: null, dentroDaTolerancia: false, erro: null },
      };

  const exibir = montarExibicao({ entradas, resultados: avaliacaoResultados });

  const erros = [...entradas.erros];

  if (entradas.valido) {
    if (avaliacaoResultados.vet.erro) erros.push(avaliacaoResultados.vet.erro);
    if (avaliacaoResultados.macros.erro) erros.push(avaliacaoResultados.macros.erro);
    if (avaliacaoResultados.somaPercentuais.erro) erros.push(avaliacaoResultados.somaPercentuais.erro);
  }

  return {
    entradas,
    resultados: avaliacaoResultados,
    exibir,
    erros,
    valido: entradas.valido,
  };
}

/* ==========================================================================
   VALIDAÇÕES DELIBERADAMENTE AUSENTES
   ==========================================================================
   Estas verificações NÃO existem aqui de propósito:

   • Faixa de idade (19+ ou pediátrica) .... não existe restrição (decisão 13)
   • Limites clínicos de peso/altura/IMC ... o material não define (lacuna L6)
   • Classificação do RCE .................. sem ponto de corte (lacuna L1)
   • Classificação do IMC .................. sem faixas definidas (lacuna L3)
   • Correção automática de macros ......... nunca ajustar o que o usuário
                                              escolheu (decisões 25 e 32)
   • Detecção de unidade trocada ........... altura em metros, percentual em
                                              fração: não há heurística
                                              (decisões 37 e 38)
   ========================================================================== */
