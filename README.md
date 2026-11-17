# report
controle de entrada e saida de veiculos
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório Operacional — Controle de Pátio & Carga/Descarga</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 0;
    }
    body.dark-mode {
      background-color: #0b1120;
      color: #f8fafc;
    }

    /* Sistema de Abas de Clientes */
    .client-tab {
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 8px 8px 0 0;
      background: #e2e8f0;
      color: #475569;
      cursor: pointer;
      border: 1px solid #cbd5e1;
      border-bottom: none;
      transition: all 0.2s;
    }
    .client-tab.active {
      background: #ffffff;
      color: #2563eb;
      border-color: #cbd5e1;
      border-bottom: 2px solid #ffffff;
      box-shadow: 0 -2px 4px rgba(0,0,0,0.03);
    }
    body.dark-mode .client-tab {
      background: #1e293b;
      color: #94a3b8;
      border-color: #334155;
    }
    body.dark-mode .client-tab.active {
      background: #0f172a;
      color: #38bdf8;
      border-color: #334155;
      border-bottom: 2px solid #0f172a;
    }

    /* Tabela 100% ajustada na largura da tela sem barra horizontal */
    .report-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .report-table th,
    .report-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 4px;
      font-size: 10.5px;
      line-height: 1.25;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      vertical-align: middle;
    }
    body.dark-mode .report-table th,
    body.dark-mode .report-table td {
      border-color: #334155;
    }
    .report-table th {
      background-color: #1e293b;
      color: #f8fafc;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.02em;
      text-align: center;
    }
    .report-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    body.dark-mode .report-table tbody tr:nth-child(even) {
      background-color: #131c31;
    }
    .report-table tbody tr:hover {
      background-color: #e0f2fe;
    }
    body.dark-mode .report-table tbody tr:hover {
      background-color: #1e293b;
    }

    /* Célula editável */
    .editable-cell {
      cursor: pointer;
      border-radius: 3px;
      transition: background-color 0.15s;
    }
    .editable-cell:hover {
      outline: 1px dashed #3b82f6;
    }
    .cell-input {
      width: 100%;
      font-size: 10.5px;
      padding: 2px 3px;
      border: 1px solid #2563eb;
      border-radius: 3px;
      background: #ffffff;
      color: #0f172a;
      outline: none;
    }

    /* Badges de Status */
    .badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 700;
      text-align: center;
      white-space: normal;
      max-width: 100%;
      line-height: 1.2;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .badge-concluido { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-andamento { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .badge-aguardando { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-atrasado { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    /* Modo Print / Tela Cheia Limpa */
    body.print-view .no-print-view {
      display: none !important;
    }
    body.print-view .col-acoes {
      display: none !important;
    }
    body.print-view .main-container {
      max-width: 100% !important;
      padding: 8px 12px !important;
    }
    #exitPrintBanner {
      display: none;
    }
    body.print-view #exitPrintBanner {
      display: flex;
    }

    @media print {
      @page { size: landscape; margin: 6mm; }
      .no-print-view, .col-acoes, #exitPrintBanner { display: none !important; }
      body { background: #ffffff !important; color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .main-container { max-width: 100% !important; padding: 0 !important; }
      .card-box { box-shadow: none !important; border: 1px solid #cbd5e1 !important; }
    }
  </style>
</head>
<body>

  <!-- Input oculto para carregar logo por arquivo -->
  <input type="file" id="logoFileInput" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" onchange="handleLogoFile(event)" />

  <!-- Banner flutuante para sair do Modo Print -->
  <div id="exitPrintBanner" class="fixed bottom-4 right-4 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 items-center gap-3 text-xs">
    <span>Modo Captura de Tela ativo (100% enquadrado)</span>
    <button type="button" onclick="togglePrintView()" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1 rounded-lg cursor-pointer">
      Voltar à Edição (ESC)
    </button>
  </div>

  <div class="main-container max-w-[1920px] mx-auto px-3 py-3 space-y-3">

    <!-- GERENCIADOR DE ABAS DE CLIENTES -->
    <div class="no-print-view flex items-center justify-between border-b border-slate-300 pb-0 px-1 overflow-x-auto">
      <div id="clientTabsContainer" class="flex items-center gap-1.5 pt-2">
        <!-- Injetado via JS -->
      </div>
      <button type="button" onclick="openNewClientModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer shrink-0">
        <span>+ Nova Aba (Cliente)</span>
      </button>
    </div>

    <!-- CABEÇALHO EXECUTIVO COM UPLOAD DE LOGO POR ARQUIVO -->
    <header class="card-box bg-white dark-card rounded-xl shadow-sm border border-slate-200 px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <!-- Logo por Ficheiro / Arquivo -->
        <div id="clientLogoArea" class="relative group cursor-pointer shrink-0" onclick="document.getElementById('logoFileInput').click()" title="Clique para selecionar a logo deste cliente (PNG, JPG, WEBP ou GIF)">
          <div id="clientLogoBox" class="w-20 h-20 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md overflow-hidden border-2 border-slate-200">
            <span id="clientLogoText">CLI</span>
          </div>
          <div class="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
            Inserir Imagem
          </div>
        </div>
        <div>
          <h1 id="reportTitle" contenteditable="true" title="Clique para editar o título" class="text-xl font-bold tracking-tight text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 rounded px-1">
            REPORT OPERACIONAL — CLIENTE GERAL
          </h1>
          <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 px-1 mt-1">
            <span>Cliente: <strong id="clientNameDisplay" class="text-blue-600">Cliente Padrão</strong></span>
            <span>•</span>
            <span>Data: <strong id="reportDate" contenteditable="true" class="text-slate-700 outline-none focus:underline">16/11/2026</strong></span>
            <span>•</span>
            <span>Turno: <strong id="reportShift" contenteditable="true" class="text-slate-700 outline-none focus:underline">01 / Geral</strong></span>
          </div>
        </div>
      </div>

      <!-- Barra de Ações -->
      <div class="no-print-view flex flex-wrap items-center gap-2">
        <button type="button" onclick="openModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer">
          <span>+ Novo Registro</span>
        </button>
        <button type="button" onclick="addQuickRow()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer">
          <span>+ Linha Rápida</span>
        </button>
        <button type="button" onclick="openPasteModal()" class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm cursor-pointer">
          Colar Excel / CSV
        </button>
        <button type="button" onclick="togglePrintView()" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm cursor-pointer">
          Modo Print / Tela Cheia
        </button>
        <button type="button" onclick="exportToExcel()" class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm cursor-pointer">
          Exportar Excel (.xlsx)
        </button>
        <button type="button" onclick="window.print()" class="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer">
          Exportar PDF
        </button>
        <button type="button" onclick="toggleDarkMode()" title="Alternar Tema" class="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-2.5 py-2 rounded-lg cursor-pointer">
          🌓
        </button>
      </div>
    </header>

    <!-- CARDS DE INFORMAÇÕES (KPIS ATUALIZADOS) -->
    <section class="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase text-slate-500">Total de Veículos</p>
        <p id="kpiTotal" class="text-2xl font-bold text-slate-900 mt-0.5">0</p>
        <p id="kpiTotalSub" class="text-[11px] text-slate-500 mt-0.5">CESVs lançados</p>
      </div>
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase text-slate-500">Qtd. Programada</p>
        <p id="kpiProg" class="text-2xl font-bold text-indigo-600 mt-0.5">0</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Volume planejado</p>
      </div>
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase text-slate-500">Cargas Recebidas</p>
        <p id="kpiRecebido" class="text-2xl font-bold text-emerald-600 mt-0.5">0</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Cargas (Descarga)</p>
      </div>
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase text-slate-500">Cargas Expedidas</p>
        <p id="kpiExpedido" class="text-2xl font-bold text-blue-600 mt-0.5">0</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Cargas (Embarque)</p>
      </div>
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase text-slate-500">Operações Concluídas</p>
        <p id="kpiConcluidos" class="text-2xl font-bold text-emerald-600 mt-0.5">0%</p>
        <p id="kpiConcluidosSub" class="text-[11px] text-slate-500 mt-0.5">Finalizados</p>
      </div>
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase text-slate-500">Tempo Médio Op.</p>
        <p id="kpiTempoMedio" class="text-2xl font-bold text-amber-600 mt-0.5">--</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Início ao término</p>
      </div>
    </section>

    <!-- BARRA DE FILTROS -->
    <section class="no-print-view card-box bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <input type="text" id="searchInput" oninput="renderTable()" placeholder="Buscar por CESV, placa, motorista, NF, carga, transportadora..." class="text-xs border border-slate-300 rounded-lg px-3 py-1.5 w-full sm:w-80 outline-none focus:border-blue-500" />
        <select id="filterStatus" onchange="renderTable()" class="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500">
          <option value="">Todos os Status</option>
          <option value="Em Descarga">Em Descarga</option>
          <option value="Em Carregamento">Em Carregamento</option>
          <option value="Em Separação">Em Separação</option>
          <option value="Não Separada">Não Separada</option>
          <option value="Separada">Separada</option>
          <option value="Aguardando Carregamento">Aguardando Carregamento</option>
          <option value="Aguardando Veículo">Aguardando Veículo</option>
          <option value="Aguardando Descarga">Aguardando Descarga</option>
          <option value="Descarga Concluída">Descarga Concluída</option>
          <option value="Carregamento Concluído">Carregamento Concluído</option>
          <option value="Aguardando Troca de Lote">Aguardando Troca de Lote</option>
        </select>
        <select id="filterTipo" onchange="renderTable()" class="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500">
          <option value="">Todas Operações</option>
          <option value="Carga">Carga</option>
          <option value="Descarga">Descarga</option>
          <option value="Transferência">Transferência</option>
        </select>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <button type="button" onclick="resetActiveClientData()" class="text-slate-600 hover:text-slate-900 underline px-2 py-1 cursor-pointer">Restaurar Exemplo</button>
        <button type="button" onclick="clearActiveClientData()" class="text-red-600 hover:text-red-800 underline px-2 py-1 cursor-pointer">Limpar Aba</button>
      </div>
    </section>



    <!-- TABELA PRINCIPAL COM CAMPOS EDITÁVEIS -->
    <section class="card-box bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table class="report-table" id="mainTable">
        <colgroup>
          <col style="width: 4.2%;" />
          <col style="width: 5.0%;" />
          <col style="width: 5.0%;" />
          <col style="width: 5.0%;" />
          <col style="width: 4.0%;" />
          <col style="width: 3.0%;" />
          <col style="width: 6.0%;" />
          <col style="width: 5.0%;" />
          <col style="width: 8.0%;" />
          <col style="width: 7.0%;" />
          <col style="width: 5.0%;" />
          <col style="width: 6.5%;" />
          <col style="width: 10.0%;" />
          <col style="width: 13.0%;" />
          <col style="width: 4.0%;" />
          <col style="width: 4.0%;" />
          <col style="width: 4.0%;" />
          <col class="col-acoes" style="width: 3.3%;" />
        </colgroup>
        <thead>
          <tr>
            <th>CESV</th>
            <th>Agenda-mento</th>
            <th>Apres. Veículo</th>
            <th>Tipo Op.</th>
            <th>Qtd.</th>
            <th>Un.</th>
            <th>Nº Carga / TR-OC</th>
            <th>NF</th>
            <th>Origem / Destino</th>
            <th>Motorista</th>
            <th>Placa</th>
            <th>Transp.</th>
            <th>Status da Carga</th>
            <th>Observação</th>
            <th>Início Op.</th>
            <th>Término Op.</th>
            <th>Lib. Veículo</th>
            <th class="col-acoes">Ações</th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </section>

    <!-- GRÁFICOS EXECUTIVOS -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <h3 class="text-xs font-bold uppercase text-slate-600 mb-2">Status das Cargas</h3>
        <div class="h-36">
          <canvas id="chartStatus"></canvas>
        </div>
      </div>
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <h3 class="text-xs font-bold uppercase text-slate-600 mb-2">Tipo de Operação</h3>
        <div class="h-36">
          <canvas id="chartTipo"></canvas>
        </div>
      </div>
      <div class="card-box bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <h3 class="text-xs font-bold uppercase text-slate-600 mb-2">Volume por Transportadora (Top 5)</h3>
        <div class="h-36">
          <canvas id="chartTransp"></canvas>
        </div>
      </div>
    </section>

  </div>

  <!-- MODAL DE CADASTRO / EDIÇÃO COMPLETA -->
  <div id="recordModal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
        <h2 id="modalTitle" class="text-base font-bold text-slate-900">Novo Registro Operacional</h2>
        <button type="button" onclick="closeModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer">&times;</button>
      </div>

      <form id="recordForm" onsubmit="saveRecord(event)" class="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
        <input type="hidden" id="editIndex" value="-1" />

        <div>
          <label class="block font-semibold text-slate-700 mb-1">CESV *</label>
          <input type="text" id="f_cesv" required placeholder="Ex: 48920" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Agendamento</label>
          <input type="text" id="f_agendamento" placeholder="Ex: 08:00" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Apresentação do Veículo</label>
          <input type="text" id="f_apresentacao" placeholder="Ex: 07:45" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Tipo de Operação</label>
          <select id="f_tipo" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5">
            <option value="Carga">Carga</option>
            <option value="Descarga">Descarga</option>
            <option value="Transferência">Transferência</option>
          </select>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Qtd.</label>
          <input type="number" step="any" id="f_qtd" placeholder="Ex: 1200" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Un.</label>
          <input type="text" id="f_un" placeholder="CX / PLT / TON" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nº Carga - TR/OC</label>
          <input type="text" id="f_carga" placeholder="Ex: TR-90412" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">NF</label>
          <input type="text" id="f_nf" placeholder="Ex: 104582" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>

        <div class="sm:col-span-2">
          <label class="block font-semibold text-slate-700 mb-1">Origem / Destino</label>
          <input type="text" id="f_origemDestino" placeholder="Ex: CD Uberlândia / Filial SP" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Motorista</label>
          <input type="text" id="f_motorista" placeholder="Nome do motorista" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Placa</label>
          <input type="text" id="f_placa" placeholder="ABC-1D23" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 uppercase" />
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Transp.</label>
          <input type="text" id="f_transp" placeholder="Transportadora" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Status da Carga</label>
          <select id="f_status" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5">
            <option value="Em Descarga">Em Descarga</option>
            <option value="Em Carregamento">Em Carregamento</option>
            <option value="Em Separação">Em Separação</option>
            <option value="Não Separada">Não Separada</option>
            <option value="Separada">Separada</option>
            <option value="Aguardando Carregamento">Aguardando Carregamento</option>
            <option value="Aguardando Veículo">Aguardando Veículo</option>
            <option value="Aguardando Descarga">Aguardando Descarga</option>
            <option value="Descarga Concluída">Descarga Concluída</option>
            <option value="Carregamento Concluído">Carregamento Concluído</option>
            <option value="Aguardando Troca de Lote">Aguardando Troca de Lote</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Início da Operação</label>
          <input type="text" id="f_inicio" placeholder="Ex: 08:15" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Término da Operação</label>
          <input type="text" id="f_termino" placeholder="Ex: 09:40" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Liberação Veículo</label>
          <input type="text" id="f_liberacao" placeholder="Ex: 10:05" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>
        <div class="sm:col-span-2 md:col-span-3">
          <label class="block font-semibold text-slate-700 mb-1">Observação</label>
          <input type="text" id="f_obs" placeholder="Detalhes da doca, conferência ou ocorrência..." class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5" />
        </div>

        <div class="col-span-full flex justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer">Cancelar</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm cursor-pointer">Salvar Registro</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL CRIAR NOVA ABA (CLIENTE) -->
  <div id="newClientModal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-3">
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <h2 class="text-base font-bold text-slate-900">Nova Aba de Cliente</h2>
        <button type="button" onclick="closeNewClientModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer">&times;</button>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Nome do Cliente / Operação *</label>
        <input type="text" id="newClientNameInput" placeholder="Ex: Cliente Alpha, Logística Sul..." class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Sigla Padrão (3-4 letras)</label>
        <input type="text" id="newClientLogoInput" maxlength="4" placeholder="Ex: ALP" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs uppercase outline-none focus:border-blue-500" />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeNewClientModal()" class="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer">Cancelar</button>
        <button type="button" onclick="createClientTab()" class="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer">Criar Aba</button>
      </div>
    </div>
  </div>

  <!-- MODAL COLAR DO EXCEL -->
  <div id="pasteModal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl p-5 space-y-3">
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <h2 class="text-base font-bold text-slate-900">Importar Dados do Excel / Planilha</h2>
        <button type="button" onclick="closePasteModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer">&times;</button>
      </div>
      <p class="text-xs text-slate-600">
        Copie as linhas da sua planilha na ordem exata das <strong>17 colunas</strong> e cole abaixo:
      </p>
      <textarea id="pasteTextarea" rows="8" placeholder="Cole aqui com Ctrl+V..." class="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono outline-none focus:border-blue-500"></textarea>
      <div class="flex items-center justify-between pt-2">
        <label class="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" id="replaceExisting" />
          Substituir registros atuais
        </label>
        <div class="flex gap-2">
          <button type="button" onclick="closePasteModal()" class="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer">Cancelar</button>
          <button type="button" onclick="importPastedData()" class="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer">Importar Linhas</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const STORAGE_KEY_CLIENTS = 'report_operacional_clients_v8';

    const SAMPLE_RECORDS = [
      {
        cesv: '50142', agendamento: '07:00', apresentacao: '06:48', tipo: 'Descarga',
        qtd: '1450', un: 'CX', carga: 'OC-77319', nf: '98412',
        origemDestino: 'Fornecedor AgroSul / CD UDI', motorista: 'Marcos Vinícius', placa: 'QWE-9E12',
        transp: 'RodoRápido', status: 'Descarga Concluída', obs: 'Doca 02 — Sem avarias',
        inicio: '08:10', termino: '09:35', liberacao: '09:50'
      },
      {
        cesv: '50145', agendamento: '08:00', apresentacao: '07:55', tipo: 'Carga',
        qtd: '28', un: 'PLT', carga: 'TR-88410', nf: '312904',
        origemDestino: 'CD Uberlândia / CD Cajamar', motorista: 'Carlos Eduardo', placa: 'RTA-4B19',
        transp: 'TransLog', status: 'Em Carregamento', obs: 'Doca 04 — Lacre conferido',
        inicio: '08:15', termino: '', liberacao: ''
      }
    ];

    let clientsData = {};
    let activeClientKey = 'cliente_geral';

    let chartStatusInst = null;
    let chartTipoInst = null;
    let chartTranspInst = null;

    function initAppData() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CLIENTS);
        if (saved) {
          clientsData = JSON.parse(saved);
        } else {
          clientsData = {
            'cliente_geral': {
              name: 'Cliente Geral',
              logo: 'GER',
              records: JSON.parse(JSON.stringify(SAMPLE_RECORDS))
            }
          };
          saveAppData();
        }
      } catch (e) {
        clientsData = {
          'cliente_geral': {
            name: 'Cliente Geral',
            logo: 'GER',
            records: JSON.parse(JSON.stringify(SAMPLE_RECORDS))
          }
        };
      }

      if (!clientsData[activeClientKey]) {
        activeClientKey = Object.keys(clientsData)[0] || 'cliente_geral';
      }
      renderClientTabs();
      loadActiveClient();
    }

    function saveAppData() {
      try {
        localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clientsData));
      } catch (e) {}
    }

    function renderClientTabs() {
      const container = document.getElementById('clientTabsContainer');
      container.innerHTML = '';

      Object.keys(clientsData).forEach(key => {
        const client = clientsData[key];
        const tab = document.createElement('div');
        tab.className = `client-tab flex items-center gap-2 ${key === activeClientKey ? 'active' : ''}`;
        
        const span = document.createElement('span');
        span.textContent = client.name;
        span.onclick = () => switchClient(key);
        tab.appendChild(span);

        if (Object.keys(clientsData).length > 1) {
          const btnDel = document.createElement('button');
          btnDel.type = 'button';
          btnDel.textContent = '×';
          btnDel.className = 'text-slate-400 hover:text-red-600 font-bold px-1 rounded';
          btnDel.onclick = (e) => { e.stopPropagation(); deleteClientTab(key); };
          tab.appendChild(btnDel);
        }

        container.appendChild(tab);
      });
    }

    function switchClient(key) {
      activeClientKey = key;
      renderClientTabs();
      loadActiveClient();
    }

    function loadActiveClient() {
      const client = clientsData[activeClientKey];
      if (!client) return;

      document.getElementById('clientNameDisplay').textContent = client.name;
      document.getElementById('reportTitle').textContent = `REPORT OPERACIONAL — ${client.name.toUpperCase()}`;
      
      const logoBox = document.getElementById('clientLogoBox');
      const logoVal = client.logo || (client.name || 'CLI').substring(0, 3).toUpperCase();

      if (logoVal.startsWith('http://') || logoVal.startsWith('https://') || logoVal.startsWith('data:image')) {
        logoBox.innerHTML = `<img src="${logoVal}" alt="Logo" class="w-full h-full object-cover" />`;
      } else {
        logoBox.innerHTML = `<span class="text-sm font-extrabold tracking-wider">${logoVal}</span>`;
      }

      renderTable();
    }

    function handleLogoFile(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Selecione um arquivo de imagem válido (PNG, JPG, WEBP ou GIF).');
        event.target.value = '';
        return;
      }

      // Redimensiona a imagem para evitar exceder o limite do armazenamento local.
      const reader = new FileReader();
      reader.onerror = () => alert('Não foi possível ler o arquivo selecionado.');
      reader.onload = function(e) {
        const img = new Image();
        img.onerror = () => alert('Não foi possível abrir esta imagem.');
        img.onload = function() {
          const maxSide = 600;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // JPEG reduz o tamanho; PNG transparente é preservado quando necessário.
          const keepPng = file.type === 'image/png';
          const dataUrl = canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', 0.82);
          clientsData[activeClientKey].logo = dataUrl;
          saveAppData();
          loadActiveClient();
          if (!localStorage.getItem(STORAGE_KEY_CLIENTS)) {
            alert('A logo foi carregada, mas não foi possível confirmar o salvamento local.');
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }

    function openNewClientModal() {
      document.getElementById('newClientNameInput').value = '';
      document.getElementById('newClientLogoInput').value = '';
      const m = document.getElementById('newClientModal');
      m.classList.remove('hidden');
      m.classList.add('flex');
    }

    function closeNewClientModal() {
      const m = document.getElementById('newClientModal');
      m.classList.add('hidden');
      m.classList.remove('flex');
    }

    function createClientTab() {
      const name = document.getElementById('newClientNameInput').value.trim();
      if (!name) return;
      let logo = document.getElementById('newClientLogoInput').value.trim().toUpperCase();
      if (!logo) logo = name.substring(0, 3).toUpperCase();

      const key = 'client_' + Date.now();
      clientsData[key] = {
        name: name,
        logo: logo,
        records: []
      };

      saveAppData();
      closeNewClientModal();
      switchClient(key);
    }

    function deleteClientTab(key) {
      if (Object.keys(clientsData).length <= 1) return;
      if (confirm('Deseja realmente excluir esta aba de cliente?')) {
        delete clientsData[key];
        saveAppData();
        activeClientKey = Object.keys(clientsData)[0];
        renderClientTabs();
        loadActiveClient();
      }
    }

    function getStatusBadge(status) {
      const s = (status || '').toLowerCase();
      if (s.includes('concluíd') || s.includes('concluido')) return `<span class="badge badge-concluido">${status}</span>`;
      if (s.includes('descarga') || s.includes('carregamento') || s.includes('separação') || s.includes('separacao')) return `<span class="badge badge-andamento">${status}</span>`;
      if (s.includes('aguardando') || s.includes('separada') || s.includes('não') || s.includes('nao')) return `<span class="badge badge-aguardando">${status}</span>`;
      if (s.includes('atras') || s.includes('diverg')) return `<span class="badge badge-atrasado">${status}</span>`;
      return `<span class="badge badge-aguardando">${status || 'Aguardando'}</span>`;
    }

    function renderTable() {
      const tbody = document.getElementById('tableBody');
      const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const fStatus = document.getElementById('filterStatus').value;
      const fTipo = document.getElementById('filterTipo').value;

      tbody.innerHTML = '';
      const records = clientsData[activeClientKey].records || [];

      records.forEach((row, index) => {
        if (fStatus && row.status !== fStatus) return;
        if (fTipo && row.tipo !== fTipo) return;
        if (query) {
          const hay = Object.values(row).join(' ').toLowerCase();
          if (!hay.includes(query)) return;
        }

        const tr = document.createElement('tr');
        const fields = [
          { key: 'cesv', align: 'text-center font-bold' },
          { key: 'agendamento', align: 'text-center' },
          { key: 'apresentacao', align: 'text-center' },
          { key: 'tipo', align: 'text-center font-medium' },
          { key: 'qtd', align: 'text-right font-semibold' },
          { key: 'un', align: 'text-center' },
          { key: 'carga', align: 'text-center' },
          { key: 'nf', align: 'text-center' },
          { key: 'origemDestino', align: 'text-left' },
          { key: 'motorista', align: 'text-left' },
          { key: 'placa', align: 'text-center font-mono font-semibold' },
          { key: 'transp', align: 'text-left' },
          { key: 'status', align: 'text-center', isStatus: true },
          { key: 'obs', align: 'text-left' },
          { key: 'inicio', align: 'text-center' },
          { key: 'termino', align: 'text-center' },
          { key: 'liberacao', align: 'text-center font-semibold' }
        ];

        fields.forEach(f => {
          const td = document.createElement('td');
          td.className = `editable-cell ${f.align}${f.key === 'status' ? ' status-cell' : ''}${f.key === 'obs' ? ' obs-cell' : ''}`;
          td.title = 'Clique para editar';
          if (f.isStatus) {
            td.innerHTML = getStatusBadge(row[f.key]);
          } else {
            td.textContent = row[f.key] || '';
          }
          td.onclick = () => startInlineEdit(td, index, f.key);
          tr.appendChild(td);
        });

        const tdActions = document.createElement('td');
        tdActions.className = 'col-acoes text-center whitespace-nowrap';
        tdActions.innerHTML = `
          <button type="button" onclick="openModal(${index})" title="Editar completo" class="text-blue-600 hover:text-blue-800 font-bold px-1 cursor-pointer">✎</button>
          <button type="button" onclick="deleteRecord(${index})" title="Excluir linha" class="text-red-600 hover:text-red-800 font-bold px-1 cursor-pointer">✕</button>
        `;
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
      });

      updateKPIsAndCharts();
    }

    function startInlineEdit(td, index, key) {
      if (td.querySelector('input, select')) return;
      const records = clientsData[activeClientKey].records;
      const currentVal = records[index][key] || '';

      if (key === 'status') {
        const sel = document.createElement('select');
        sel.className = 'cell-input';
        [
          'Em Descarga', 'Em Carregamento', 'Em Separação', 'Não Separada', 'Separada',
          'Aguardando Carregamento', 'Aguardando Veículo', 'Aguardando Descarga', 'Descarga Concluída',
          'Carregamento Concluído', 'Aguardando Troca de Lote'
        ].forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (opt === currentVal) o.selected = true;
          sel.appendChild(o);
        });
        td.innerHTML = '';
        td.appendChild(sel);
        sel.focus();
        const commit = () => {
          records[index][key] = sel.value;
          saveAppData();
          renderTable();
        };
        sel.onchange = commit;
        sel.onblur = commit;
        return;
      }

      if (key === 'tipo') {
        const sel = document.createElement('select');
        sel.className = 'cell-input';
        ['Carga', 'Descarga', 'Transferência'].forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (opt === currentVal) o.selected = true;
          sel.appendChild(o);
        });
        td.innerHTML = '';
        td.appendChild(sel);
        sel.focus();
        const commit = () => {
          records[index][key] = sel.value;
          saveAppData();
          renderTable();
        };
        sel.onchange = commit;
        sel.onblur = commit;
        return;
      }

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = currentVal;
      inp.className = 'cell-input';
      td.innerHTML = '';
      td.appendChild(inp);
      inp.focus();
      inp.select();

      const commit = () => {
        records[index][key] = inp.value.trim();
        saveAppData();
        renderTable();
      };
      inp.onblur = commit;
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { renderTable(); }
      };
    }

    function openModal(index = -1) {
      document.getElementById('searchInput').value = '';
      const modal = document.getElementById('recordModal');
      document.getElementById('editIndex').value = index;
      const records = clientsData[activeClientKey].records;

      if (index >= 0 && records[index]) {
        const r = records[index];
        document.getElementById('modalTitle').textContent = `Editar Registro — CESV ${r.cesv}`;
        document.getElementById('f_cesv').value = r.cesv || '';
        document.getElementById('f_agendamento').value = r.agendamento || '';
        document.getElementById('f_apresentacao').value = r.apresentacao || '';
        document.getElementById('f_tipo').value = r.tipo || 'Carga';
        document.getElementById('f_qtd').value = r.qtd || '';
        document.getElementById('f_un').value = r.un || '';
        document.getElementById('f_carga').value = r.carga || '';
        document.getElementById('f_nf').value = r.nf || '';
        document.getElementById('f_origemDestino').value = r.origemDestino || '';
        document.getElementById('f_motorista').value = r.motorista || '';
        document.getElementById('f_placa').value = r.placa || '';
        document.getElementById('f_transp').value = r.transp || '';
        document.getElementById('f_status').value = r.status || 'Em Descarga';
        document.getElementById('f_obs').value = r.obs || '';
        document.getElementById('f_inicio').value = r.inicio || '';
        document.getElementById('f_termino').value = r.termino || '';
        document.getElementById('f_liberacao').value = r.liberacao || '';
      } else {
        document.getElementById('modalTitle').textContent = 'Novo Registro Operacional';
        document.getElementById('recordForm').reset();
        document.getElementById('editIndex').value = -1;
      }

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeModal() {
      const modal = document.getElementById('recordModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function saveRecord(e) {
      e.preventDefault();
      const idx = parseInt(document.getElementById('editIndex').value, 10);
      const records = clientsData[activeClientKey].records;

      const item = {
        cesv: document.getElementById('f_cesv').value.trim(),
        agendamento: document.getElementById('f_agendamento').value.trim(),
        apresentacao: document.getElementById('f_apresentacao').value.trim(),
        tipo: document.getElementById('f_tipo').value,
        qtd: document.getElementById('f_qtd').value.trim(),
        un: document.getElementById('f_un').value.trim().toUpperCase(),
        carga: document.getElementById('f_carga').value.trim(),
        nf: document.getElementById('f_nf').value.trim(),
        origemDestino: document.getElementById('f_origemDestino').value.trim(),
        motorista: document.getElementById('f_motorista').value.trim(),
        placa: document.getElementById('f_placa').value.trim().toUpperCase(),
        transp: document.getElementById('f_transp').value.trim(),
        status: document.getElementById('f_status').value,
        obs: document.getElementById('f_obs').value.trim(),
        inicio: document.getElementById('f_inicio').value.trim(),
        termino: document.getElementById('f_termino').value.trim(),
        liberacao: document.getElementById('f_liberacao').value.trim()
      };

      if (idx >= 0) {
        records[idx] = item;
      } else {
        records.push(item);
      }

      saveAppData();
      closeModal();
      renderTable();
    }

    function addQuickRow() {
      const records = clientsData[activeClientKey].records;
      records.push({
        cesv: String(50160 + records.length),
        agendamento: '',
        apresentacao: '',
        tipo: 'Carga',
        qtd: '0',
        un: 'PLT',
        carga: '',
        nf: '',
        origemDestino: '',
        motorista: '',
        placa: '',
        transp: '',
        status: 'Em Carregamento',
        obs: '',
        inicio: '',
        termino: '',
        liberacao: ''
      });
      saveAppData();
      renderTable();
    }

    function deleteRecord(index) {
      clientsData[activeClientKey].records.splice(index, 1);
      saveAppData();
      renderTable();
    }

    function openPasteModal() {
      const m = document.getElementById('pasteModal');
      document.getElementById('pasteTextarea').value = '';
      m.classList.remove('hidden');
      m.classList.add('flex');
    }

    function closePasteModal() {
      const m = document.getElementById('pasteModal');
      m.classList.add('hidden');
      m.classList.remove('flex');
    }

    function importPastedData() {
      const raw = document.getElementById('pasteTextarea').value.trim();
      if (!raw) return;
      const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
      const parsed = lines.map(line => {
        const cols = line.includes('\t') ? line.split('\t') : line.split(';');
        return {
          cesv: (cols[0] || '').trim(),
          agendamento: (cols[1] || '').trim(),
          apresentacao: (cols[2] || '').trim(),
          tipo: (cols[3] || 'Carga').trim(),
          qtd: (cols[4] || '0').trim().replace(',', '.'),
          un: (cols[5] || '').trim().toUpperCase(),
          carga: (cols[6] || '').trim(),
          nf: (cols[7] || '').trim(),
          origemDestino: (cols[8] || '').trim(),
          motorista: (cols[9] || '').trim(),
          placa: (cols[10] || '').trim().toUpperCase(),
          transp: (cols[11] || '').trim(),
          status: (cols[12] || 'Em Descarga').trim(),
          obs: (cols[13] || '').trim(),
          inicio: (cols[14] || '').trim(),
          termino: (cols[15] || '').trim(),
          liberacao: (cols[16] || '').trim()
        };
      });

      if (document.getElementById('replaceExisting').checked) {
        clientsData[activeClientKey].records = parsed;
      } else {
        clientsData[activeClientKey].records = clientsData[activeClientKey].records.concat(parsed);
      }

      saveAppData();
      closePasteModal();
      renderTable();
    }

    function parseMinutes(hhmm) {
      if (!hhmm || !hhmm.includes(':')) return null;
      const [h, m] = hhmm.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    }

    function updateKPIsAndCharts() {
      const records = clientsData[activeClientKey].records || [];
      const total = records.length;

      document.getElementById('kpiTotal').textContent = total;
      document.getElementById('kpiTotalSub').textContent = `${total} veículo(s) registrado(s)`;

      let totalProg = 0;
      let totalRecebido = 0;
      let totalExpedido = 0;

      const parseQuantidade = (valor) => {
        let s = String(valor ?? '').trim().replace(/\s/g, '');
        if (!s) return 0;
        // Aceita 1.234,56 (padrão brasileiro), 1234,56 e 1234.56.
        if (s.includes(',') && s.includes('.')) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else if (s.includes(',')) {
          s = s.replace(',', '.');
        }
        const numero = Number(s);
        return Number.isFinite(numero) ? numero : 0;
      };

      records.forEach(r => {
        const quantidade = parseQuantidade(r.qtd);
        totalProg += quantidade;
        const status = (r.status || '').trim().toLocaleLowerCase('pt-BR');
        if (status === 'descarga concluída' || status === 'descarga concluida') {
          totalRecebido += quantidade;
        }
        if (status === 'carregamento concluído' || status === 'carregamento concluido') {
          totalExpedido += quantidade;
        }
      });

      document.getElementById('kpiProg').textContent = totalProg.toLocaleString('pt-BR', {
        maximumFractionDigits: 2
      });
      document.getElementById('kpiRecebido').textContent = totalRecebido.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
      document.getElementById('kpiExpedido').textContent = totalExpedido.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

      const concluidos = records.filter(r => {
        const status = (r.status || '').toLocaleLowerCase('pt-BR');
        return status.includes('concluíd') || status.includes('concluido');
      }).length;
      const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
      document.getElementById('kpiConcluidos').textContent = `${pct}%`;
      document.getElementById('kpiConcluidosSub').textContent = `${concluidos} de ${total} finalizados`;

      let sumMin = 0, countMin = 0;
      records.forEach(r => {
        const ini = parseMinutes(r.inicio);
        const fim = parseMinutes(r.termino);
        if (ini !== null && fim !== null) {
          let duration = fim - ini;
          if (duration < 0) duration += 24 * 60; // operação que atravessou a meia-noite
          sumMin += duration;
          countMin++;
        }
      });

      if (countMin > 0) {
        const avg = Math.round(sumMin / countMin);
        const hh = Math.floor(avg / 60);
        const mm = String(avg % 60).padStart(2, '0');
        document.getElementById('kpiTempoMedio').textContent = `${hh}h ${mm}m`;
      } else {
        document.getElementById('kpiTempoMedio').textContent = '--';
      }

      renderCharts(records);
    }

    function renderCharts(records) {
      const statusCounts = {
        'Em Descarga': 0, 'Em Carregamento': 0, 'Em Separação': 0,
        'Não Separada': 0, 'Separada': 0, 'Aguardando Carregamento': 0,
        'Aguardando Veículo': 0, 'Aguardando Descarga': 0, 'Descarga Concluída': 0,
        'Carregamento Concluído': 0, 'Aguardando Troca de Lote': 0
      };
      const tipoCounts = { 'Carga': 0, 'Descarga': 0, 'Transferência': 0 };
      const transpVol = {};

      records.forEach(r => {
        if (statusCounts[r.status] !== undefined) statusCounts[r.status]++;

        if (tipoCounts[r.tipo] !== undefined) tipoCounts[r.tipo]++;
        else tipoCounts['Carga']++;

        const t = r.transp || 'N/I';
        const v = parseFloat(String(r.qtd || '0').replace(',', '.')) || 1;
        transpVol[t] = (transpVol[t] || 0) + v;
      });

      if (chartStatusInst) chartStatusInst.destroy();
      chartStatusInst = new Chart(document.getElementById('chartStatus'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: [
              '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
              '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#64748b'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 9 } } } }
        }
      });

      if (chartTipoInst) chartTipoInst.destroy();
      chartTipoInst = new Chart(document.getElementById('chartTipo'), {
        type: 'bar',
        data: {
          labels: Object.keys(tipoCounts),
          datasets: [{
            label: 'Veículos',
            data: Object.values(tipoCounts),
            backgroundColor: ['#2563eb', '#0d9488', '#6366f1'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
        }
      });

      const topTransp = Object.entries(transpVol).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (chartTranspInst) chartTranspInst.destroy();
      chartTranspInst = new Chart(document.getElementById('chartTransp'), {
        type: 'bar',
        data: {
          labels: topTransp.map(x => x[0]),
          datasets: [{
            label: 'Volume',
            data: topTransp.map(x => x[1]),
            backgroundColor: '#0284c7',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 } } } }
        }
      });
    }

    function exportToExcel() {
      if (typeof XLSX === 'undefined') {
        alert('Não foi possível carregar a biblioteca Excel. Verifique sua conexão com a internet e tente novamente.');
        return;
      }

      const client = clientsData[activeClientKey] || {};
      const records = client.records || [];

      if (!records.length) {
        alert('Não há registros para exportar nesta aba.');
        return;
      }

      const columns = [
        ['CESV', 'cesv'],
        ['Agendamento', 'agendamento'],
        ['Apresentação do Veículo', 'apresentacao'],
        ['Tipo de Operação', 'tipo'],
        ['Quantidade', 'qtd'],
        ['Unidade', 'un'],
        ['Nº Carga / TR-OC', 'carga'],
        ['NF', 'nf'],
        ['Origem / Destino', 'origemDestino'],
        ['Motorista', 'motorista'],
        ['Placa', 'placa'],
        ['Transportadora', 'transp'],
        ['Status da Carga', 'status'],
        ['Observação', 'obs'],
        ['Início da Operação', 'inicio'],
        ['Término da Operação', 'termino'],
        ['Liberação do Veículo', 'liberacao']
      ];

      const data = [
        ['RELATÓRIO OPERACIONAL'],
        ['Cliente', client.name || 'Cliente'],
        ['Data', document.getElementById('reportDate')?.textContent?.trim() || ''],
        ['Turno', document.getElementById('reportShift')?.textContent?.trim() || ''],
        [],
        columns.map(column => column[0]),
        ...records.map(record => columns.map(column => record[column[1]] ?? ''))
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      worksheet['!cols'] = columns.map(([label, key]) => {
        const lengths = records.map(record => String(record[key] ?? '').length);
        return { wch: Math.min(40, Math.max(label.length + 2, ...lengths) + 2) };
      });
      worksheet['!autofilter'] = {
        ref: `A6:${XLSX.utils.encode_col(columns.length - 1)}${records.length + 6}`
      };
      worksheet['!freeze'] = { xSplit: 0, ySplit: 6 };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Veículos');

      const safeName = String(client.name || 'Cliente')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'Cliente';
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Relatorio_Operacional_${safeName}_${date}.xlsx`);
    }

    function togglePrintView() {
      document.body.classList.toggle('print-view');
    }

    function toggleDarkMode() {
      document.body.classList.toggle('dark-mode');
    }

    function resetActiveClientData() {
      clientsData[activeClientKey].records = JSON.parse(JSON.stringify(SAMPLE_RECORDS));
      saveAppData();
      renderTable();
    }

    function clearActiveClientData() {
      clientsData[activeClientKey].records = [];
      saveAppData();
      renderTable();
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.body.classList.contains('print-view')) togglePrintView();
        closeModal();
        closeNewClientModal();
        closePasteModal();
      }
    });

    initAppData();
  </script>
</body>
</html>
