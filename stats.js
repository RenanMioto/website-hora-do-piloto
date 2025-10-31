// HP MANAGER — STATS (novo formato results.json)
// - Lê /data/results.json (robusto, sem cache, multipath)
// - Normaliza nomes de pista (remove acentos p/ agrupar)
// - Recordes por pista (melhor pole / melhor volta rápida)
// - Histórico completo da pista
// - Estatísticas por piloto (ordenadas: Vitórias > Pódios > Poles > VR > Piloto do Dia)

document.addEventListener("DOMContentLoaded", () => {
  const select       = document.getElementById("trackSelect");
  const recordsPanel = document.getElementById("recordsPanel");
  const bestPoleText = document.getElementById("bestPoleText");
  const bestLapText  = document.getElementById("bestLapText");
  const tbodyTrack   = document.getElementById("trackTableBody");
  const tbodyPilots  = document.getElementById("pilotsTableBody");

  let all = [];

  // Tenta múltiplos caminhos (GitHub Pages pode ter subpath) e desativa cache
  const ts = Date.now();
  const candidates = [
    `./data/results.json?_=${ts}`,
    `data/results.json?_=${ts}`,
    `/data/results.json?_=${ts}`,
  ];

  (async function loadData(){
    let lastErr = null;
    for (const url of candidates){
      try{
        const res = await fetch(url, { cache: "no-store" });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        all = await res.json();
        console.info("[HP] results.json em:", url, "registros:", all.length);
        init();
        return;
      }catch(e){
        lastErr = e;
        console.warn("[HP] Falhou", url, e);
      }
    }
    select.innerHTML = `<option value="">Erro ao carregar pistas</option>`;
    tbodyPilots.innerHTML = `<tr><td colspan="7" style="padding:10px;color:var(--muted)">Erro ao carregar estatísticas.</td></tr>`;
    console.error("[HP] Não conseguiu carregar results.json", lastErr);
  })();

  function init(){
    // Normaliza nomes de pistas p/ agrupar variações com/sem acentos
    const trackMap = buildTrackMap(all); // {norm: {display, items[]}}

    // Preenche o select usando um nome display canônico (o mais frequente)
    const options = Object.values(trackMap)
      .sort((a,b)=>a.display.localeCompare(b.display, "pt-BR", {sensitivity:"base"}))
      .map(t => `<option value="${escapeHtml(t.norm)}">${escapeHtml(t.display)}</option>`)
      .join("");

    select.innerHTML = options || `<option value="">Nenhuma pista encontrada</option>`;
    if (options){
      select.value = Object.values(trackMap)[0].norm;
      renderTrack(trackMap, select.value);
    }

    select.addEventListener("change", () => renderTrack(trackMap, select.value));

    // Estatísticas gerais por piloto
    renderPilots(all);
  }

  // ================= HISTÓRICO / RECORDES POR PISTA =================

  function renderTrack(trackMap, normKey){
    const bucket = trackMap[normKey];
    if(!bucket){
      recordsPanel.style.display = "none";
      tbodyTrack.innerHTML = `<tr><td colspan="7" style="padding:10px;color:var(--muted)">Sem corridas registradas para esta pista.</td></tr>`;
      return;
    }
    const rows = bucket.items.slice();

    // Recordes
    const bestPole = getBest(rows, "pole");
    const bestLap  = getBest(rows, "volta_rapida");
    if (bestPole || bestLap){
      recordsPanel.style.display = "";
      bestPoleText.textContent = bestPole
        ? `${bestPole.piloto} — ${bestPole.tempo} (${bestPole.temporada} · ${bestPole.jogo})`
        : "—";
      bestLapText.textContent = bestLap
        ? `${bestLap.piloto} — ${bestLap.tempo} (${bestLap.temporada} · ${bestLap.jogo})`
        : "—";
    } else {
      recordsPanel.style.display = "none";
    }

    // Histórico ordenado por temporada (numérico) e depois por jogo
    rows.sort((a,b)=>{
      const t = (a.temporada||"").localeCompare(b.temporada||"", "pt-BR", {numeric:true, sensitivity:"base"});
      if (t) return t;
      return (a.jogo||"").localeCompare(b.jogo||"", "pt-BR", { sensitivity:"base" });
    });

    tbodyTrack.innerHTML = rows.map(r=>{
      const vencedor = (r.podio||[]).find(p=>p.posicao===1)?.piloto || "—";
      const podio = (r.podio||[]).sort((a,b)=>a.posicao-b.posicao).map(p=>p.piloto).join(" / ") || "—";
      const poleStr = r.pole && r.pole.piloto && r.pole.tempo ? `${r.pole.piloto} (${r.pole.tempo})` : "—";
      const vrStr   = r.volta_rapida && r.volta_rapida.piloto && r.volta_rapida.tempo ? `${r.volta_rapida.piloto} (${r.volta_rapida.tempo})` : "—";
      const pdd     = r.piloto_dia || "—";
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid var(--line);">${escapeHtml(r.temporada||"—")}</td>
          <td style="padding:8px;border-bottom:1px solid var(--line);">${escapeHtml(r.jogo||"—")}</td>
          <td style="padding:8px;border-bottom:1px solid var(--line);">${escapeHtml(vencedor)}</td>
          <td style="padding:8px;border-bottom:1px solid var(--line);">${escapeHtml(podio)}</td>
          <td style="padding:8px;border-bottom:1px solid var(--line);">${escapeHtml(poleStr)}</td>
          <td style="padding:8px;border-bottom:1px solid var(--line);">${escapeHtml(vrStr)}</td>
          <td style="padding:8px;border-bottom:1px solid var(--line);">${escapeHtml(pdd)}</td>
        </tr>
      `;
    }).join("");
  }

  function getBest(rows, key){
    // key = "pole" | "volta_rapida"
    let best = null;
    for (const r of rows){
      const obj = r[key];
      if(!obj || !obj.piloto || !obj.tempo) continue;
      const ms = parseLap(obj.tempo);
      if(ms == null) continue;
      if(!best || ms < best.ms){
        best = { ms, tempo: obj.tempo, piloto: obj.piloto, temporada: r.temporada||"—", jogo: r.jogo||"—" };
      }
    }
    return best;
  }

  // ====================== ESTATÍSTICAS POR PILOTO ======================

  function renderPilots(data){
    const map = new Map(); // nome => stats
    for (const r of data){
      const presentes = new Set();
      for (const p of (r.podio||[])){
        ensure(map, p.piloto);
        const S = map.get(p.piloto);
        if (p.posicao === 1) S.vitorias++;
        S.podios++;
        presentes.add(p.piloto);
      }
      if (r.pole && r.pole.piloto){
        ensure(map, r.pole.piloto);
        map.get(r.pole.piloto).poles++;
        presentes.add(r.pole.piloto);
      }
      if (r.volta_rapida && r.volta_rapida.piloto){
        ensure(map, r.volta_rapida.piloto);
        map.get(r.volta_rapida.piloto).vr++;
        presentes.add(r.volta_rapida.piloto);
      }
      if (r.piloto_dia){
        ensure(map, r.piloto_dia);
        map.get(r.piloto_dia).pdd++;
        presentes.add(r.piloto_dia);
      }
      presentes.forEach(n => map.get(n).corridas++);
    }

    const rows = [...map.values()].sort((a,b)=>{
      if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
      if (b.podios !== a.podios)     return b.podios   - a.podios;
      if (b.poles !== a.poles)       return b.poles    - a.poles;
      if (b.vr !== a.vr)             return b.vr       - a.vr;
      if (b.pdd !== a.pdd)           return b.pdd      - a.pdd;
      return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity:"base" });
    });

    if (!rows.length){
      tbodyPilots.innerHTML = `<tr><td colspan="7" style="padding:10px;color:var(--muted)">Sem estatísticas para exibir.</td></tr>`;
      return;
    }

    tbodyPilots.innerHTML = rows.map(p=>`
      <tr>
        <td style="padding:8px;border-bottom:1px solid var(--line);">${escapeHtml(p.nome)}</td>
        <td style="padding:8px;border-bottom:1px solid var(--line); text-align:right;">${p.vitorias}</td>
        <td style="padding:8px;border-bottom:1px solid var(--line); text-align:right;">${p.podios}</td>
        <td style="padding:8px;border-bottom:1px solid var(--line); text-align:right;">${p.poles}</td>
        <td style="padding:8px;border-bottom:1px solid var(--line); text-align:right;">${p.vr}</td>
        <td style="padding:8px;border-bottom:1px solid var(--line); text-align:right;">${p.pdd}</td>
      </tr>
    `).join("");
  }

  function ensure(map, nome){
    if (!map.has(nome)){
      map.set(nome, { nome, corridas:0, vitorias:0, podios:0, poles:0, vr:0, pdd:0 });
    }
  }

  // =========================== UTILIDADES ============================

  function parseLap(s){
    if (typeof s !== "string") return null;
    const str = s.trim();
    const parts = str.split(":");
    let m=0, sec="0";
    if (parts.length === 2){ m = parseInt(parts[0],10)||0; sec = parts[1]; }
    else if (parts.length === 1){ sec = parts[0]; }
    else return null;
    const seconds = Number(sec);
    if (Number.isNaN(seconds)) return null;
    return m*60000 + Math.round(seconds*1000);
  }

  function escapeHtml(x){
    return String(x)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function normalize(str){
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();
  }

  function buildTrackMap(data){
    // Agrupa por nome normalizado, e elege um "display" canônico (o mais frequente)
    const bucket = new Map(); // norm => {displayCount: Map, items:[]}
    for (const r of data){
      const et = r.etapa || "";
      const norm = normalize(et);
      if (!norm) continue;
      if (!bucket.has(norm)){
        bucket.set(norm, { displayCount: new Map(), items: [] });
      }
      const b = bucket.get(norm);
      b.items.push(r);
      const disp = et.trim();
      b.displayCount.set(disp, (b.displayCount.get(disp)||0) + 1);
    }
    const out = {};
    for (const [norm, b] of bucket){
      // escolhe o display mais frequente
      let display = "";
      let max = -1;
      for (const [name, cnt] of b.displayCount){
        if (cnt > max){ max = cnt; display = name; }
      }
      out[norm] = { norm, display, items: b.items };
    }
    return out;
  }
});