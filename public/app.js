// ============================================================================
// App de Moda — frontend simples em vanilla JS
// Conversa com a API local em /auth/* e /api/*
// ============================================================================

const state = {
  token: null,
  userId: null,
  userName: null,
  pendingPhoto: null,
};

// ---------------------- Helpers ----------------------
function $(id) {
  return document.getElementById(id);
}

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

function showError(message) {
  const el = $("login-error");
  el.textContent = message;
  show(el);
  setTimeout(() => hide(el), 5000);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.token && !path.startsWith("/auth/")) {
    headers["Authorization"] = "Bearer " + state.token;
  }
  const res = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || ("Erro HTTP " + res.status);
    throw new Error(msg);
  }
  return data;
}

// ---------------------- Login ----------------------
async function login(email, password) {
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    state.token = data.token;
    state.userId = data.id;
    state.userName = data.name;
    enterApp();
  } catch (err) {
    showError(err.message);
  }
}

async function register(name, email, password) {
  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    state.token = data.token;
    state.userId = data.id;
    state.userName = data.name;
    enterApp();
  } catch (err) {
    showError(err.message);
  }
}

// Alterna entre as telas de "Entrar" e "Criar conta".
function showAuthView(view) {
  if (view === "register") {
    hide($("login-view"));
    show($("register-view"));
  } else {
    hide($("register-view"));
    show($("login-view"));
  }
  hide($("login-error"));
}

function logout() {
  state.token = null;
  state.userId = null;
  state.userName = null;
  hide($("app-screen"));
  show($("login-screen"));
  showAuthView("login");
  $("email").value = "";
  $("password").value = "";
  $("outfit-result").innerHTML = "";
  hide($("outfit-result"));
}

function enterApp() {
  hide($("login-screen"));
  show($("app-screen"));
  $("user-name").textContent = state.userName;
  switchTab("outfit");
}

// ---------------------- Tabs ----------------------
function switchTab(tabId) {
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-content").forEach((c) => {
    if (c.id === "tab-" + tabId) show(c);
    else hide(c);
  });
}

// ---------------------- Outfit ----------------------
async function generateOutfit() {
  const occasion = $("occasion").value;
  const weather = $("weather").value;
  const vibe = $("vibe").value.trim();

  const result = $("outfit-result");
  result.innerHTML = "";
  hide(result);
  show($("outfit-loading"));

  try {
    const data = await api("/api/outfit", {
      method: "POST",
      body: {
        userId: state.userId,
        occasion,
        weather,
        ...(vibe ? { vibe } : {}),
      },
    });
    renderOutfit(data[0]);
  } catch (err) {
    result.innerHTML = `<div class="error">${err.message}</div>`;
    show(result);
  } finally {
    hide($("outfit-loading"));
  }
}

function renderOutfit(outfit) {
  if (!outfit) return;

  const items = [
    { label: "Parte de cima", obj: outfit.upper },
    { label: "Parte de baixo", obj: outfit.lower },
    { label: "Sobreposição", obj: outfit.layer },
    { label: "Calçado", obj: outfit.shoes },
  ].filter((x) => x.obj);

  const itemsHtml = items
    .map(
      (i) => `
        <div class="item-card">
          <div class="item-type">${i.label}</div>
          <div class="item-name">
            <span class="color-dot" style="background:${cssColor(i.obj.color)}"></span>
            ${i.obj.subcategory || i.obj.category}
          </div>
          <div class="item-detail">${i.obj.color}${i.obj.fabric ? " · " + i.obj.fabric : ""}</div>
        </div>`,
    )
    .join("");

  const accessoriesHtml = (outfit.accessories || [])
    .map(
      (a) => `
        <div class="item-card">
          <div class="item-type">Acessório</div>
          <div class="item-name">
            <span class="color-dot" style="background:${cssColor(a.color)}"></span>
            ${a.subcategory || a.category}
          </div>
          <div class="item-detail">${a.color}</div>
        </div>`,
    )
    .join("");

  const fragranceHtml = outfit.fragrance
    ? `
      <div class="section-divider">
        <h4>Perfume sugerido</h4>
        <div class="fragrance-box">
          <strong>${outfit.fragrance.family}</strong>
          <p class="muted" style="margin-top:4px">${outfit.fragrance.reason}</p>
        </div>
      </div>`
    : "";

  const missingHtml =
    outfit.missingItems && outfit.missingItems.length > 0
      ? `
        <div class="section-divider">
          <h4>Faltando no guarda-roupa</h4>
          <ul class="missing-list">
            ${outfit.missingItems
              .map((m) => `<li><strong>${m.category}</strong> — ${m.reason}</li>`)
              .join("")}
          </ul>
        </div>`
      : "";

  const shoppingHtml =
    outfit.shoppingSuggestions && outfit.shoppingSuggestions.length > 0
      ? `
        <div class="section-divider">
          <h4>Sugestões de compra</h4>
          <ul class="missing-list">
            ${outfit.shoppingSuggestions
              .map(
                (s) =>
                  `<li><strong>${s.title}</strong> — R$ ${s.price.toFixed(2)} em ${s.storeName}<br/><span class="muted">${s.reason}</span></li>`,
              )
              .join("")}
          </ul>
        </div>`
      : "";

  const result = $("outfit-result");
  result.innerHTML = `
    <div class="outfit-card">
      <div class="outfit-score">Score: ${Number(outfit.score).toFixed(1)}</div>
      <div class="outfit-title">${outfit.title}</div>
      <p class="outfit-reasoning">${outfit.reasoning}</p>
      <div class="items-grid">${itemsHtml}${accessoriesHtml}</div>
      ${fragranceHtml}
      ${missingHtml}
      ${shoppingHtml}
    </div>
  `;
  show(result);
}

// ---------------------- Packing ----------------------
async function generatePacking() {
  const destination = $("destination").value.trim();
  const duration = parseInt($("duration").value, 10);
  const weather = $("packing-weather").value;
  const occasionsStr = $("occasions").value.trim();
  const plannedOccasions = occasionsStr
    ? occasionsStr.split(",").map((o) => o.trim()).filter(Boolean)
    : undefined;

  const result = $("packing-result");
  result.innerHTML = "";
  hide(result);
  show($("packing-loading"));

  try {
    const data = await api("/api/packing", {
      method: "POST",
      body: {
        userId: state.userId,
        destination: destination || "São Paulo",
        durationDays: duration > 0 ? duration : 1,
        weather,
        ...(plannedOccasions ? { plannedOccasions } : {}),
      },
    });
    renderPacking(data.packingSuggestion);
  } catch (err) {
    result.innerHTML = `<div class="error">${err.message}</div>`;
    show(result);
  } finally {
    hide($("packing-loading"));
  }
}

function renderPacking(packing) {
  const itemsHtml = (packing.selectedItems || [])
    .map(
      (item) => `
        <div class="item-card">
          <div class="item-type">${item.category}</div>
          <div class="item-name">
            <span class="color-dot" style="background:${cssColor(item.color)}"></span>
            ${item.subcategory || item.category}
          </div>
          <div class="item-detail">${item.color}</div>
        </div>`,
    )
    .join("");

  const summary = packing.summary || {};
  const summaryHtml = `
    <div class="summary-grid">
      <div class="summary-cell"><div class="summary-number">${summary.uppers || 0}</div><div class="summary-label">Cima</div></div>
      <div class="summary-cell"><div class="summary-number">${summary.lowers || 0}</div><div class="summary-label">Baixo</div></div>
      <div class="summary-cell"><div class="summary-number">${summary.layers || 0}</div><div class="summary-label">Casacos</div></div>
      <div class="summary-cell"><div class="summary-number">${summary.shoes || 0}</div><div class="summary-label">Sapatos</div></div>
      <div class="summary-cell"><div class="summary-number">${summary.accessories || 0}</div><div class="summary-label">Acess.</div></div>
    </div>
  `;

  const notesHtml =
    packing.notes && packing.notes.length > 0
      ? `<div class="section-divider"><h4>Dicas</h4><ul class="missing-list">${packing.notes
          .map((n) => `<li>${n}</li>`)
          .join("")}</ul></div>`
      : "";

  const missingHtml =
    packing.missingItems && packing.missingItems.length > 0
      ? `<div class="section-divider"><h4>Faltando</h4><ul class="missing-list">${packing.missingItems
          .map((m) => `<li><strong>${m.category}</strong> — ${m.reason}</li>`)
          .join("")}</ul></div>`
      : "";

  $("packing-result").innerHTML = `
    <div class="outfit-card">
      <div class="outfit-title">${packing.destination} — ${packing.durationDays} dia${packing.durationDays > 1 ? "s" : ""}</div>
      <p class="muted">Clima: ${packing.weather}</p>
      ${summaryHtml}
      <div class="section-divider"><h4>Peças sugeridas</h4></div>
      <div class="items-grid">${itemsHtml}</div>
      ${notesHtml}
      ${missingHtml}
    </div>
  `;
  show($("packing-result"));
}

// ---------------------- Wardrobe ----------------------
// Redimensiona a foto no próprio navegador antes de enviar — mantém o upload
// leve e o banco enxuto (a imagem é guardada em base64).
function resizeImage(file, maxSize = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showWardrobeMsg(message, isError) {
  const el = $("wardrobe-add-msg");
  el.textContent = message;
  el.classList.toggle("error", !!isError);
  show(el);
}

async function handlePhotoSelected(e) {
  const file = e.target.files && e.target.files[0];
  const btn = $("btn-add-wardrobe");
  const box = $("wardrobe-preview-box");
  hide($("wardrobe-add-msg"));

  if (!file) {
    state.pendingPhoto = null;
    btn.disabled = true;
    hide(box);
    return;
  }
  try {
    const dataUrl = await resizeImage(file);
    state.pendingPhoto = dataUrl;
    $("wardrobe-preview").src = dataUrl;
    show(box);
    btn.disabled = false;
  } catch (err) {
    state.pendingPhoto = null;
    btn.disabled = true;
    hide(box);
    showWardrobeMsg(err.message, true);
  }
}

async function addWardrobeItem() {
  if (!state.pendingPhoto) return;
  const btn = $("btn-add-wardrobe");
  btn.disabled = true;
  hide($("wardrobe-add-msg"));
  show($("wardrobe-add-loading"));

  try {
    const result = await api("/api/wardrobe", {
      method: "POST",
      body: { image: state.pendingPhoto },
    });
    const item = result.item || {};
    const detected = item.subcategory || item.category || "peça";
    const msg = result.aiUsed
      ? `Peça cadastrada: ${detected} (${item.color}). A IA analisou a foto. ✦`
      : `Peça cadastrada. ${(result.warnings || []).join(" ")}`;
    showWardrobeMsg(msg, false);

    // limpa o formulário
    state.pendingPhoto = null;
    $("wardrobe-photo").value = "";
    hide($("wardrobe-preview-box"));
    loadWardrobe();
  } catch (err) {
    showWardrobeMsg(err.message, true);
    btn.disabled = false;
  } finally {
    hide($("wardrobe-add-loading"));
  }
}

async function loadWardrobe() {
  const container = $("wardrobe-list");
  container.innerHTML = "<div class='loading'>Carregando...</div>";
  try {
    const items = await api("/api/wardrobe", { method: "GET" });

    if (!items.length) {
      container.innerHTML =
        "<div class='card'><p class='muted'>Nenhuma peça ainda. Envie uma foto acima pra começar.</p></div>";
      return;
    }

    const itemsHtml = items
      .map(
        (item) => `
          <div class="wardrobe-item">
            <img class="wardrobe-thumb" src="${item.imageUrl}" alt="${item.category}" />
            <div class="wardrobe-item-body">
              <div class="item-type">${item.category}</div>
              <div class="item-name">
                <span class="color-dot" style="background:${cssColor(item.color)}"></span>
                ${item.subcategory || item.category}
              </div>
              <div class="item-detail">${item.color}${item.fabric ? " · " + item.fabric : ""}</div>
            </div>
            <button class="btn-ghost wardrobe-del" data-id="${item.id}">Remover</button>
          </div>`,
      )
      .join("");

    container.innerHTML = `
      <div class="card">
        <h3>Você tem ${items.length} peça${items.length > 1 ? "s" : ""}</h3>
        <div class="wardrobe-grid">${itemsHtml}</div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class='card'><div class='error'>${err.message}</div></div>`;
  }
}

async function removeWardrobeItem(id) {
  if (!confirm("Remover esta peça do guarda-roupa?")) return;
  try {
    await api("/api/wardrobe/" + id, { method: "DELETE" });
    loadWardrobe();
  } catch (err) {
    showWardrobeMsg(err.message, true);
  }
}

// ---------------------- Color helper ----------------------
function cssColor(name) {
  const map = {
    preto: "#1a1a1a",
    branco: "#f8f8f8",
    cinza: "#9e9e9e",
    grafite: "#3a3a3a",
    marinho: "#1e3a5f",
    azul: "#2563eb",
    "azul medio": "#3b82f6",
    bege: "#d4b896",
    marrom: "#6b4423",
    prata: "#c0c0c0",
    dourado: "#d4af37",
    verde: "#2d7a3e",
    vermelho: "#c0392b",
    rosa: "#ec4899",
  };
  return map[(name || "").toLowerCase()] || "#bbbbbb";
}

// ---------------------- Wire up ----------------------
document.addEventListener("DOMContentLoaded", () => {
  $("btn-login").addEventListener("click", () => {
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || !password) {
      showError("Preencha email e senha.");
      return;
    }
    login(email, password);
  });

  $("btn-demo").addEventListener("click", () => {
    $("email").value = "demo@app-de-moda.dev";
    $("password").value = "demo12345";
    login("demo@app-de-moda.dev", "demo12345");
  });

  // Alternar entre Entrar e Criar conta
  $("to-register").addEventListener("click", () => showAuthView("register"));
  $("to-login").addEventListener("click", () => showAuthView("login"));

  $("btn-register").addEventListener("click", () => {
    const name = $("reg-name").value.trim();
    const email = $("reg-email").value.trim();
    const password = $("reg-password").value;
    if (!name || !email || !password) {
      showError("Preencha nome, email e senha.");
      return;
    }
    if (password.length < 8) {
      showError("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    register(name, email, password);
  });

  $("reg-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("btn-register").click();
  });

  $("btn-logout").addEventListener("click", logout);
  $("btn-generate").addEventListener("click", generateOutfit);
  $("btn-packing").addEventListener("click", generatePacking);
  $("btn-refresh-wardrobe").addEventListener("click", loadWardrobe);

  // Cadastro de peça por foto
  $("wardrobe-photo").addEventListener("change", handlePhotoSelected);
  $("btn-add-wardrobe").addEventListener("click", addWardrobeItem);

  // Remover peça (delegação de evento — os botões são criados dinamicamente)
  $("wardrobe-list").addEventListener("click", (e) => {
    const delBtn = e.target.closest(".wardrobe-del");
    if (delBtn) removeWardrobeItem(delBtn.dataset.id);
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
      if (tabId === "wardrobe") loadWardrobe();
    });
  });

  // Enter no campo de senha = login
  $("password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("btn-login").click();
  });
});
