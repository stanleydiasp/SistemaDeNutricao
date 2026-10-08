/**
 * SistemaDeNutricao — Ponto de entrada
 * main.js
 *
 * Carregado pelo index.html com <script type="module">.
 * Existe para manter a arquitetura em camadas: o HTML não conhece
 * as telas, e as telas não conhecem o HTML diretamente.
 *
 *   index.html → js/main.js → js/telas/calculadora.js → js/nucleo/
 *
 * IMPORTANTE: abrir o projeto pelo botão "Go Live" (Live Server).
 * Módulos ES não funcionam quando o arquivo é aberto por duplo-clique.
 */

import { iniciar } from './telas/calculadora.js';

iniciar();
