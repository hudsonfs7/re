/* ============================================================
   Configuração compartilhada: apresentação (slides.html) + votação (index.html)
   ============================================================ */
window.RE = (() => {
  const CONFIG = {
    // Sala da votação. Trocar o nome = começar uma votação totalmente nova.
    ROOM: "rextrab-dt26-q7k2",
    // Link que os celulares abrem (aparece no QR code). Vazio = detecta sozinho.
    VOTE_URL: "https://hudsonfs7.github.io/re/",
    // Tempo de cada pergunta (segundos)
    QUESTION_TIME: 30,
    // Transportes em tempo real (públicos, sem cadastro). Usa todos ao mesmo tempo.
    BROKERS: [
      "wss://broker.emqx.io:8084/mqtt",
      "wss://broker.hivemq.com:8884/mqtt",
    ],
    NTFY: "https://ntfy.sh",
  };

  // Modo ensaio: ?sala=qualquercoisa usa outra sala (não mexe na votação oficial)
  try {
    const sala = new URLSearchParams(location.search).get("sala");
    if (sala) CONFIG.ROOM = CONFIG.ROOM + "-" + sala.replace(/[^a-z0-9-]/gi, "").slice(0, 20);
  } catch (e) { }

  // Quem fala em cada parte. Quando o grupo decidir, é só trocar "name" pelo nome
  // da pessoa (ex.: name: "Fulano") e a apresentação inteira se ajusta sozinha.
  const ROLES = {
    intro: { name: "Boas-vindas", label: "Abertura e introdução" },
    a: { name: "Apresentador 1", label: "Bloco A · O que é e quando cabe" },
    b: { name: "Apresentador 2", label: "Bloco B · Os filtros do RE" },
    c: { name: "Apresentador 3", label: "Bloco C · Tramitação, efeitos e casos" },
    quiz: { name: "Perguntas", label: "Quiz ao vivo" },
    end: { name: "Boas-vindas", label: "Encerramento" },
  };

  const QUESTIONS = [
    {
      t: "Nas causas de alçada (até 2 salários mínimos), não cabe recurso nenhum, nem mesmo ao STF.",
      a: false,
      j: "Cabe recurso, sim, se a matéria for constitucional. A Lei 5.584/70 (art. 2º, § 4º) ressalva a matéria constitucional, e a Súmula 640 do STF admite RE direto contra a sentença do juiz de 1º grau.",
      base: "Lei 5.584/70, art. 2º, § 4º · Súmula 640 STF",
    },
    {
      t: "No processo do trabalho, a interposição do recurso extraordinário não impede que a execução continue.",
      a: true,
      j: "O RE tem só efeito devolutivo. A CLT diz que recorrer ao STF não prejudica a execução do julgado.",
      base: "CLT, art. 893, § 2º · CPC, art. 995",
    },
    {
      t: "Se o TST violou um artigo da CLT, cabe recurso extraordinário, já que a CLT é lei federal.",
      a: false,
      j: "O RE só serve para ofensa direta à Constituição. Ofensa a lei federal, ou ofensa “reflexa” à CF, não abre a porta do STF.",
      base: "CF, art. 102, III · Súmulas 505 e 636 STF",
    },
    {
      t: "O STF só pode recusar a repercussão geral pelo voto de 2/3 dos seus ministros.",
      a: true,
      j: "São 8 dos 11 ministros. A regra é admitir; para recusar é preciso quórum qualificado.",
      base: "CF, art. 102, § 3º · CPC, art. 1.035",
    },
    {
      t: "No RE, o STF pode reanalisar as provas para conferir se o trabalhador realmente fazia horas extras.",
      a: false,
      j: "O STF não reexamina fatos e provas. O RE discute só a questão constitucional, com os fatos como o tribunal de origem fixou.",
      base: "Súmula 279 STF (no TST: Súmula 126)",
    },
  ];

  const NICK_A = ["Ipê", "Jatobá", "Arara", "Tucano", "Onça", "Capivara", "Jabuti", "Sabiá", "Peroba", "Mico", "Boto", "Lobo-guará", "Tamanduá", "Quati", "Pequi", "Buriti", "Seriema", "Ariranha", "Jacarandá", "Bem-te-vi", "Carcará", "Pau-brasil", "Araucária", "Tatu"];

  function uid(n = 10) {
    const c = "abcdefghijkmnpqrstuvwxyz23456789";
    let s = "";
    const r = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint32Array(n)) : Array.from({ length: n }, () => Math.random() * 1e9);
    for (let i = 0; i < n; i++) s += c[r[i] % c.length];
    return s;
  }
  function randomNick() {
    return "Participante " + (10 + Math.floor(Math.random() * 90));
  }
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  };

  function voteUrl() {
    const sp = new URLSearchParams(location.search);
    const sala = sp.get("shot") ? null : sp.get("sala"); // nas imagens do roteiro mostra o link oficial
    const q = sala ? "?sala=" + encodeURIComponent(sala) : "";
    if (CONFIG.VOTE_URL) return CONFIG.VOTE_URL + q;
    if (location.protocol.startsWith("http")) return new URL("./", location.href).origin + new URL("./", location.href).pathname + q;
    return "(defina CONFIG.VOTE_URL em shared.js)";
  }

  /**
   * Barramento em tempo real.
   * opts.subs: tipos de mensagem a ouvir ("state", "vote", "hello")
   * opts.ntfySince: { tipo: "15m" } para pegar histórico recente no ntfy
   * opts.onMessage(kind, obj), opts.onStatus({mqtt, ntfy})
   */
  function createBus(opts) {
    const seen = new Set();
    const clients = [];
    const status = { mqtt: 0, ntfy: false };
    const T = (k) => `${CONFIG.ROOM}/${k}`;
    const upd = () => {
      status.mqtt = clients.filter((c) => c.connected).length;
      opts.onStatus && opts.onStatus({ ...status });
    };
    const deliver = (kind, obj) => {
      if (!obj || !obj.mid || seen.has(obj.mid)) return;
      seen.add(obj.mid);
      if (seen.size > 5000) seen.clear();
      opts.onMessage(kind, obj);
    };

    if (window.mqtt) {
      CONFIG.BROKERS.forEach((url) => {
        try {
          const c = mqtt.connect(url, { clientId: "re_" + uid(10), clean: true, reconnectPeriod: 3000, connectTimeout: 8000, keepalive: 30 });
          c.on("connect", () => { c.subscribe(opts.subs.map(T), { qos: 1 }); upd(); });
          c.on("close", upd); c.on("offline", upd); c.on("error", () => { });
          c.on("message", (topic, buf) => {
            try { deliver(topic.split("/").pop(), JSON.parse(buf.toString())); } catch (e) { }
          });
          clients.push(c);
        } catch (e) { }
      });
    }

    // ntfy.sh (HTTPS 443) como reserva, caso a rede bloqueie as portas do MQTT
    opts.subs.forEach((k) => {
      const since = opts.ntfySince && opts.ntfySince[k];
      const url = `${CONFIG.NTFY}/${CONFIG.ROOM}-${k}/sse` + (since ? `?since=${since}` : "");
      try {
        const es = new EventSource(url);
        es.onopen = () => { status.ntfy = true; upd(); };
        es.onerror = () => { status.ntfy = false; upd(); };
        es.onmessage = (e) => {
          try { const m = JSON.parse(e.data); if (m.event === "message" && m.message) deliver(k, JSON.parse(m.message)); } catch (_) { }
        };
      } catch (e) { }
    });

    function publish(kind, obj, o = {}) {
      obj.mid = obj.mid || uid(12);
      let sent = 0;
      clients.forEach((c) => {
        if (c.connected) { c.publish(T(kind), JSON.stringify(obj), { qos: 1, retain: !!o.retain }); sent++; }
      });
      // ntfy: sempre que pedido, ou quando nenhum MQTT está conectado
      if (o.ntfy || !sent) {
        fetch(`${CONFIG.NTFY}/${CONFIG.ROOM}-${kind}`, { method: "POST", body: JSON.stringify(obj) }).catch(() => { });
      }
      return sent;
    }
    return { publish, status: () => ({ ...status, mqtt: clients.filter((c) => c.connected).length }) };
  }

  return { CONFIG, ROLES, QUESTIONS, uid, randomNick, store, voteUrl, createBus };
})();
