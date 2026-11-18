(() => {
  "use strict";

  const SUPABASE_URL = "https://vjwkfydxsfiowvlspeid.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MmQZzTpm1f5uMvTzl65-PA_JmsOskEK";
  const LOCAL_STORAGE_KEY = "controle_patio_operacional_v1";
  const PREFS_KEY = "controle_patio_preferences_v1";
  const MIGRATION_KEY = "controle_patio_migracao_supabase_v1";

  if (!window.supabase?.createClient) {
    alert("Não foi possível carregar a biblioteca do Supabase. Verifique sua conexão com a internet.");
    return;
  }
  if (SUPABASE_PUBLISHABLE_KEY.startsWith("COLE_AQUI")) {
    alert("Configure a chave Publishable do Supabase no arquivo supabase-integracao.js antes de acessar o portal.");
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const fieldMap = {
    cesv:"cesv", agendamento:"agendamento", apresentacao:"apresentacao",
    tipo:"tipo", qtd:"qtd", un:"un", carga:"carga", nf:"nf",
    origemDestino:"origem_destino", motorista:"motorista", placa:"placa",
    transp:"transp", status:"status", obs:"obs", inicio:"inicio",
    termino:"termino", liberacao:"liberacao"
  };
  let realtimeChannel = null;
  let loadingRemote = false;
  let suppressRealtime = false;
  let migrationAvailable = false;

  const el = id => document.getElementById(id);
  const notify = msg => {
    if (typeof window.showMessage === "function") window.showMessage(msg);
    else alert(msg);
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);

  function addAuthStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #authGate{position:fixed;inset:0;z-index:9999;background:#0f172a;display:flex;align-items:center;justify-content:center;padding:20px}
      #authCard{background:white;color:#0f172a;width:100%;max-width:420px;border-radius:18px;padding:26px;box-shadow:0 20px 60px #0005}
      #authCard input{width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:11px;margin-top:5px;font-size:13px}
      #authCard button{border-radius:9px;padding:11px 14px;font-weight:700;font-size:13px}
      #authMessage{font-size:12px;min-height:18px;margin-top:10px;color:#b91c1c}
      #accountBar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11px}
      #migrationPanel{background:#eff6ff;border:1px solid #bfdbfe;padding:12px;border-radius:12px;margin:10px 0;font-size:12px}
    `;
    document.head.appendChild(style);
  }

  function addAuthUI() {
    addAuthStyles();
    const gate = document.createElement("div");
    gate.id = "authGate";
    gate.innerHTML = `
      <div id="authCard">
        <div style="font-size:11px;font-weight:800;color:#2563eb;letter-spacing:1px">PORTAL OPERACIONAL</div>
        <h2 style="font-size:22px;font-weight:800;margin:8px 0 4px">Controle de Pátio</h2>
        <p style="font-size:12px;color:#64748b;margin-bottom:18px">Entre com seu e-mail e senha para acessar os dados compartilhados.</p>
        <form id="authForm">
          <label style="font-size:12px;font-weight:700">E-mail</label>
          <input id="authEmail" type="email" autocomplete="username" required placeholder="seuemail@empresa.com">
          <label style="display:block;font-size:12px;font-weight:700;margin-top:12px">Senha</label>
          <input id="authPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="Mínimo de 6 caracteres">
          <div style="display:flex;gap:8px;margin-top:18px">
            <button type="submit" id="loginButton" style="background:#2563eb;color:white;flex:1">Entrar</button>
            <button type="button" id="signupButton" style="background:#e2e8f0;color:#0f172a;flex:1">Criar conta</button>
          </div>
          <div id="authMessage"></div>
        </form>
        <p style="font-size:10px;color:#64748b;margin-top:12px">Cada colaborador deve utilizar seu próprio e-mail e senha.</p>
      </div>`;
    document.body.appendChild(gate);

    const bar = document.createElement("div");
    bar.id = "accountBar";
    bar.className = "no-print-view";
    bar.style.cssText = "justify-content:flex-end;padding:7px 12px;background:#e2e8f0;color:#334155";
    bar.innerHTML = `<span id="accountEmail">Não autenticado</span><button id="logoutButton" style="background:#334155;color:white;padding:5px 10px;border-radius:7px">Sair</button>`;
    const main = document.querySelector(".main-container");
    if (main) main.insertBefore(bar, main.firstChild);

    const migration = document.createElement("div");
    migration.id = "migrationPanel";
    migration.className = "no-print-view";
    migration.style.display = "none";
    migration.innerHTML = `
      <strong>Dados antigos encontrados neste navegador.</strong>
      <p style="margin:4px 0 8px">Você pode enviar os clientes e registros locais para o banco compartilhado. Faça isso apenas uma vez, preferencialmente antes de outros usuários começarem a cadastrar dados.</p>
      <button id="migrateButton" style="background:#2563eb;color:white;padding:7px 12px;border-radius:7px;font-weight:700">Importar dados antigos para o Supabase</button>
      <span id="migrationStatus" style="margin-left:8px"></span>`;
    if (main) main.insertBefore(migration, main.children[1] || null);

    el("authForm").addEventListener("submit", async e => {
      e.preventDefault();
      await authenticate("login");
    });
    el("signupButton").addEventListener("click", () => authenticate("signup"));
    el("logoutButton").addEventListener("click", async () => {
      const {error} = await db.auth.signOut();
      if (error) notify("Erro ao sair: " + error.message);
    });
    el("migrateButton").addEventListener("click", migrateLocalData);
  }

  async function authenticate(mode) {
    const email = el("authEmail").value.trim();
    const password = el("authPassword").value;
    const msg = el("authMessage");
    msg.textContent = "Aguarde...";
    const result = mode === "signup"
      ? await db.auth.signUp({email, password})
      : await db.auth.signInWithPassword({email, password});
    if (result.error) {
      msg.textContent = result.error.message;
      return;
    }
    if (mode === "signup" && !result.data.session) {
      msg.style.color = "#166534";
      msg.textContent = "Conta criada. Verifique seu e-mail para confirmar o cadastro e depois entre no portal.";
      return;
    }
    msg.textContent = "Acesso autorizado.";
  }

  function readLocalData() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.clients) || !parsed.clients.length) return null;
      return parsed;
    } catch (e) {
      console.warn("Não foi possível ler os dados locais", e);
      return null;
    }
  }

  function localClientKey(client, index) {
    const safe = String(client.id || client.name || index)
      .toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 45);
    return `legacy_${index}_${safe}`;
  }

  async function migrateLocalData() {
    const button = el("migrateButton");
    const status = el("migrationStatus");
    const local = readLocalData();
    if (!local) {
      status.textContent = "Não há dados locais para importar.";
      return;
    }
    if (localStorage.getItem(MIGRATION_KEY) === "done") {
      status.textContent = "Esta migração já foi concluída neste navegador.";
      return;
    }
    if (!confirm("Confirma enviar os clientes e todos os registros locais para o Supabase? Não feche a página durante a importação.")) return;
    button.disabled = true;
    status.textContent = "Importando...";
    try {
      const {data: existing, error: checkError} = await db.from("clients").select("id").limit(1);
      if (checkError) throw checkError;
      if (existing?.length) {
        throw new Error("O banco já contém clientes. Para evitar duplicidade, a importação automática foi interrompida. Não apague nada; peça orientação antes de migrar.");
      }
      for (let i = 0; i < local.clients.length; i++) {
        const old = local.clients[i];
        const clientPayload = {
          client_key: localClientKey(old, i),
          name: old.name || "Cliente sem nome",
          logo: old.logo || "CLI",
          logo_image: old.logoImage || null,
          report_title: old.title || "",
          report_date: old.date || "",
          report_shift: old.shift || ""
        };
        const {data: insertedClient, error: clientError} = await db
          .from("clients").insert(clientPayload).select().single();
        if (clientError) throw clientError;

        const rows = (old.records || []).map(record => toDatabaseRecord(record, insertedClient.id));
        if (rows.length) {
          const {error: recordsError} = await db.from("records").insert(rows);
          if (recordsError) throw recordsError;
        }
      }
      localStorage.setItem(MIGRATION_KEY, "done");
      status.textContent = "Importação concluída!";
      await loadRemoteData();
      notify("Dados antigos importados com sucesso!");
    } catch (error) {
      console.error(error);
      status.textContent = "Falha na importação.";
      alert("Não foi possível concluir a migração: " + error.message + "\nOs dados locais foram mantidos. Antes de tentar novamente, confira se parte dos dados chegou ao Supabase para evitar duplicidade.");
    } finally {
      button.disabled = false;
    }
  }

  function toDatabaseRecord(record, clientId) {
    const row = {client_id:clientId};
    Object.entries(fieldMap).forEach(([local, remote]) => {
      row[remote] = String(record?.[local] ?? "");
    });
    return row;
  }

  function fromDatabaseRecord(row) {
    const record = {_dbId:row.id};
    Object.entries(fieldMap).forEach(([local, remote]) => {
      record[local] = row[remote] ?? "";
    });
    return record;
  }

  function fromDatabaseClient(row, records) {
    return {
      id:row.id,
      clientKey:row.client_key,
      name:row.name || "Cliente",
      logo:row.logo || "CLI",
      logoImage:row.logo_image || "",
      title:row.report_title || ("REPORT OPERACIONAL — " + String(row.name || "").toUpperCase()),
      date:row.report_date || "",
      shift:row.report_shift || "",
      records:records.map(fromDatabaseRecord)
    };
  }
  async function loadRemoteData() {
    if (loadingRemote) return;
    loadingRemote = true;
    try {
      const [{data:clientRows,error:clientError},{data:recordRows,error:recordError}] = await Promise.all([
        db.from("clients").select("*").order("created_at",{ascending:true}),
        db.from("records").select("*").order("created_at",{ascending:true})
      ]);
      if (clientError) throw clientError;
      if (recordError) throw recordError;

      if (!clientRows.length) {
        const {data:newClient,error} = await db.from("clients").insert({
          client_key:"cliente_padrao",
          name:"Cliente Padrão",
          logo:"CLI",
          report_title:"REPORT OPERACIONAL — CLIENTE GERAL",
          report_date:new Date().toLocaleDateString("pt-BR"),
          report_shift:"01 / Geral"
        }).select().single();
        if (error) throw error;
        clientRows.push(newClient);
      }

      const previous = activeClientId;
      clients = clientRows.map(c => fromDatabaseClient(
        c, recordRows.filter(r => r.client_id === c.id)
      ));
      const preferred = localStorage.getItem(PREFS_KEY);
      const preferredId = preferred ? JSON.parse(preferred).activeClientId : previous;
      activeClientId = clients.some(c => c.id === preferredId) ? preferredId : clients[0].id;
      renderAll();
      updateMigrationPanel();
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar dados do Supabase: " + error.message);
    } finally {
      loadingRemote = false;
    }
  }

  function updateMigrationPanel() {
    const local = readLocalData();
    const already = localStorage.getItem(MIGRATION_KEY) === "done";
    const panel = el("migrationPanel");
    if (panel) panel.style.display = local && !already ? "block" : "none";
  }

  async function saveClientChanges(client, changes) {
    if (!client?.id) return;
    const {error} = await db.from("clients").update(changes).eq("id",client.id);
    if (error) {
      console.error(error);
      notify("Erro ao salvar dados do cliente: " + error.message);
      throw error;
    }
  }

  async function insertOrUpdateRecord(client, record) {
    const payload = toDatabaseRecord(record, client.id);
    let result;
    if (record._dbId) {
      result = await db.from("records").update(payload).eq("id",record._dbId).select().single();
    } else {
      result = await db.from("records").insert(payload).select().single();
    }
    if (result.error) throw result.error;
    return fromDatabaseRecord(result.data);
  }

  // Sobrescreve o armazenamento: somente preferências ficam no navegador.
  window.saveDatabase = function() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        activeClientId,
        darkMode:document.body.classList.contains("dark-mode")
      }));
      return true;
    } catch(e) { console.warn(e); return false; }
  };
  window.loadDatabase = function() {};
  window.normalizeRecord = function(record={}) {
    const normalized = {};
    FIELDS.forEach(f => normalized[f] = record[f] ?? "");
    if (record._dbId) normalized._dbId = record._dbId;
    return normalized;
  };

  window.switchClient = function(id) {
    if (!clients.some(c => c.id === id)) return;
    activeClientId = id;
    saveDatabase();
    renderAll();
  };

  window.createClientTab = async function() {
    const name = el("newClientNameInput").value.trim();
    const logo = el("newClientLogoInput").value.trim().toUpperCase();
    if (!name) return alert("Informe o nome do cliente.");
    const payload = {
      client_key:"client_" + crypto.randomUUID(),
      name, logo:logo || name.substring(0,3).toUpperCase(),
      report_title:"REPORT OPERACIONAL — " + name.toUpperCase(),
      report_date:el("reportDate").textContent.trim(),
      report_shift:el("reportShift").textContent.trim()
    };
    const {data,error} = await db.from("clients").insert(payload).select().single();
    if (error) return alert("Erro ao criar cliente: " + error.message);
    closeNewClientModal();
    await loadRemoteData();
    activeClientId = data.id;
    renderAll();
    notify("Nova aba criada e compartilhada!");
  };

  window.removeClientTab = async function(id) {
    if (clients.length <= 1) return alert("É necessário manter pelo menos uma aba.");
    const client = clients.find(c => c.id === id);
    if (!client || !confirm(`Excluir a aba ${client.name} e todos os seus registros?`)) return;
    const {error} = await db.from("clients").delete().eq("id",id);
    if (error) return alert("Erro ao excluir cliente: " + error.message);
    await loadRemoteData();
    notify("Aba excluída para todos os usuários.");
  };

  window.saveRecord = async function(event) {
    event.preventDefault();
    const client = activeClient();
    if (!client) return;
    const record = {};
    FIELDS.forEach(field => record[field] = el("f_"+field)?.value.trim() || "");
    if (!record.cesv) return alert("O CESV é obrigatório.");
    const index = Number(el("editIndex").value);
    if (index >= 0 && client.records[index]?._dbId) record._dbId = client.records[index]._dbId;
    try {
      const saved = await insertOrUpdateRecord(client,record);
      if (index >= 0) client.records[index] = saved;
      else client.records.push(saved);
      closeModal();
      renderAll();
      notify(index >= 0 ? "Registro atualizado e sincronizado!" : "Registro cadastrado e compartilhado!");
    } catch(error) {
      alert("Erro ao salvar registro: " + error.message);
    }
  };

  window.addQuickRow = function() {
    const client = activeClient();
    if (!client) return;
    const record = normalizeRecord({tipo:"Carga",status:"Aguardando Veículo"});
    client.records.push(record);
    openModal(client.records.length - 1);
  };

  window.editCell = async function(index,field) {
    const client = activeClient();
    if (!client || !FIELDS.includes(field)) return;
    const record = client.records[index];
    if (!record) return;
    const value = prompt("Editar " + FIELD_LABELS[FIELDS.indexOf(field)],record[field] ?? "");
    if (value === null) return;
    const updated = {...record,[field]:value.trim()};
    try {
      const saved = await insertOrUpdateRecord(client,updated);
      client.records[index] = saved;
      renderAll();
    } catch(error) { alert("Erro ao atualizar: " + error.message); }
  };

  window.deleteRecord = async function(index) {
    const client = activeClient();
    const record = client?.records[index];
    if (!record || !confirm("Deseja excluir este registro para todos os usuários?")) return;
    if (record._dbId) {
      const {error} = await db.from("records").delete().eq("id",record._dbId);
      if (error) return alert("Erro ao excluir: " + error.message);
    }
    client.records.splice(index,1);
    renderAll();
    notify("Registro excluído para todos os usuários.");
  };

  window.importPastedData = async function() {
    const client = activeClient();
    const content = el("pasteTextarea").value.trim();
    if (!client || !content) return alert("Cole os dados da planilha primeiro.");
    const lines = content.split(/\r?\n/);
    const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
    const imported = lines.map(line => {
      const cols = line.split(delimiter);
      const r = {};
      FIELDS.forEach((f,i) => r[f] = (cols[i] || "").trim());
      return r;
    }).filter(r => r.cesv);
    if (!imported.length) return alert("Nenhum CESV válido encontrado.");
    if (el("replaceExisting").checked) {
      if (!confirm("Substituir todos os registros desta aba para todos os usuários?")) return;
      const {error:deleteError} = await db.from("records").delete().eq("client_id",client.id);
      if (deleteError) return alert("Erro ao substituir registros: " + deleteError.message);
    }
    const rows = imported.map(r => toDatabaseRecord(r,client.id));
    const {data,error} = await db.from("records").insert(rows).select();
    if (error) return alert("Erro ao importar: " + error.message);
    closePasteModal();
    await loadRemoteData();
    notify(data.length + " registros importados e compartilhados!");
  };
  window.clearActiveClientData = async function() {
    const client = activeClient();
    if (!client || !confirm("Apagar todos os registros desta aba para todos os usuários?")) return;
    const {error} = await db.from("records").delete().eq("client_id",client.id);
    if (error) return alert("Erro ao limpar aba: " + error.message);
    await loadRemoteData();
    notify("Aba limpa com sucesso!");
  };

  window.resetActiveClientData = async function() {
    if (!confirm("Restaurar os 3 registros de exemplo nesta aba? Os registros atuais serão substituídos para todos os usuários.")) return;
    const client = activeClient();
    if (!client) return;
    const examples = [
      {cesv:"48920",agendamento:"08:00",apresentacao:"07:45",tipo:"Descarga",qtd:"1200",un:"CX",carga:"TR-90412",nf:"104582",origemDestino:"CD Uberlândia",motorista:"João Silva",placa:"ABC-1D23",transp:"Transportadora Alfa",status:"Descarga Concluída",obs:"Operação finalizada",inicio:"08:15",termino:"09:40",liberacao:"10:05"},
      {cesv:"48921",agendamento:"09:00",apresentacao:"08:55",tipo:"Carga",qtd:"850",un:"CX",carga:"TR-90413",nf:"104583",origemDestino:"CD São Paulo",motorista:"Carlos Souza",placa:"DEF-2G45",transp:"Transportadora Beta",status:"Em Carregamento",obs:"Aguardando conferência",inicio:"09:15",termino:"",liberacao:""},
      {cesv:"48922",agendamento:"10:00",apresentacao:"09:50",tipo:"Transferência",qtd:"500",un:"PLT",carga:"TR-90414",nf:"104584",origemDestino:"Filial RJ",motorista:"Pedro Lima",placa:"GHI-3J67",transp:"Transportadora Alfa",status:"Aguardando Veículo",obs:"Aguardando chegada",inicio:"",termino:"",liberacao:""}
    ];
    const {error:delError} = await db.from("records").delete().eq("client_id",client.id);
    if (delError) return alert("Erro ao limpar registros: " + delError.message);
    const {error:insError} = await db.from("records").insert(examples.map(r => toDatabaseRecord(r,client.id)));
    if (insError) return alert("Erro ao restaurar exemplos: " + insError.message);
    await loadRemoteData();
    notify("Exemplos restaurados e compartilhados!");
  };

  window.handleLogoFile = function(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Selecione uma imagem válida.");
    if (file.size > 2*1024*1024) return alert("A imagem deve ter no máximo 2 MB.");
    const reader = new FileReader();
    reader.onload = async e => {
      const client = activeClient();
      if (!client) return;
      const imageData = e.target.result;
      try {
        await saveClientChanges(client,{logo_image:imageData});
        client.logoImage = imageData;
        renderHeader();
        notify("Logotipo atualizado e compartilhado!");
      } catch(_) {}
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  // Metadados editáveis do cabeçalho são gravados no cadastro do cliente.
  function bindHeaderField(id, column, property) {
    const node = el(id);
    node.addEventListener("blur", async () => {
      const client = activeClient();
      if (!client) return;
      const value = node.textContent.trim();
      if (client[property] === value) return;
      try {
        await saveClientChanges(client,{[column]:value});
        client[property] = value;
      } catch(_) { node.textContent = client[property] || ""; }
    });
  }

  async function startRealtime() {
    if (realtimeChannel) await db.removeChannel(realtimeChannel);
    realtimeChannel = db.channel("controle-patio-compartilhado")
      .on("postgres_changes",{event:"*",schema:"public",table:"clients"},async () => {
        if (!suppressRealtime) await loadRemoteData();
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"records"},async () => {
        if (!suppressRealtime) await loadRemoteData();
      })
      .subscribe();
  }

  async function onAuthenticated(session) {
    el("authGate").style.display = "none";
    el("accountEmail").textContent = session.user.email || "Usuário autenticado";
    await loadRemoteData();
    await startRealtime();
  }

  async function boot() {
    // Impede que a inicialização antiga carregue dados locais como fonte principal.
    addAuthUI();
    bindHeaderField("reportTitle","report_title","title");
    bindHeaderField("reportDate","report_date","date");
    bindHeaderField("reportShift","report_shift","shift");

    const {data,error} = await db.auth.getSession();
    if (error) {
      el("authMessage").textContent = error.message;
      return;
    }
    if (data.session) await onAuthenticated(data.session);
    else el("authGate").style.display = "flex";

    db.auth.onAuthStateChange((_event,session) => {
      if (session) onAuthenticated(session);
      else {
        el("authGate").style.display = "flex";
        el("accountEmail").textContent = "Não autenticado";
        if (realtimeChannel) db.removeChannel(realtimeChannel);
      }
    });
  }

  // A inicialização antiga chama loadDatabase/renderAll no DOMContentLoaded.
  // Este script é carregado depois do script original, então substitui loadDatabase antes do evento.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      // Espera a inicialização original terminar antes de iniciar autenticação.
      setTimeout(boot,0);
    },{once:true});
  } else {
    boot();
  }
})();