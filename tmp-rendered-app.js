
      const state = {
        bootstrap: null,
        googleAuthConfigured: false,
        stage: "locations",
        selectedLocationId: null,
        activeContainerId: null,
        activeContainerDetail: null,
        activeItemId: null,
        activeItemDetail: null,
        scanToken: null,
        pendingScanAction: null,
        searchResults: null,
        messageTimer: null,
        searchTimer: null
      };

      const imageUploadPolicy = {
        maxDimension: 1000,
        quality: 0.72
      };
      const scannerState = {
        stream: null,
        animationFrame: 0,
        detector: null,
        active: false,
        detecting: false,
        lastToken: ""
      };

      const els = {
        message: document.getElementById("message"),
        stageTitle: document.getElementById("stage-title"),
        stageMeta: document.getElementById("stage-meta"),
        stageBreadcrumbs: document.getElementById("stage-breadcrumbs"),
        stageActions: document.getElementById("stage-actions"),
        stageContent: document.getElementById("stage-content"),
        searchForm: document.getElementById("search-form"),
        searchInput: document.getElementById("search-input"),
        topbarNav: document.getElementById("topbar-nav"),
        modalRoot: document.getElementById("modal-root")
      };

      function getImageUrl(storedName, category = "items") {
        const cleanName = String(storedName || "").trim();
        if (!cleanName) {
          return "";
        }
        return "/images/" + encodeURIComponent(category) + "/" + encodeURIComponent(cleanName);
      }

      function renameFileExtension(name, nextExtension) {
        const original = String(name || "image").trim() || "image";
        const base = original.includes(".") ? original.slice(0, original.lastIndexOf(".")) : original;
        return base + nextExtension;
      }

      function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error("Could not read image file."));
          reader.readAsDataURL(blob);
        });
      }

      async function loadImageElement(file) {
        const source = await blobToDataUrl(file);
        const image = new Image();
        return new Promise((resolve, reject) => {
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Could not load the selected image."));
          image.src = source;
        });
      }

      async function optimizeImageFile(file) {
        if (!(file instanceof File) || !String(file.type || "").startsWith("image/")) {
          return file;
        }

        const image = await loadImageElement(file);
        const longestSide = Math.max(image.naturalWidth || image.width || 0, image.naturalHeight || image.height || 0);
        const needsResize = longestSide > imageUploadPolicy.maxDimension;
        const outputType = "image/jpeg";
        const outputName = renameFileExtension(file.name, ".jpg");

        if (!needsResize && outputType === file.type && file.size <= 900 * 1024) {
          return file;
        }

        const scale = needsResize ? (imageUploadPolicy.maxDimension / longestSide) : 1;
        const width = Math.max(1, Math.round((image.naturalWidth || image.width || 1) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || image.height || 1) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          return file;
        }
        context.drawImage(image, 0, 0, width, height);

        const optimizedBlob = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
              return;
            }
            reject(new Error("Could not optimize the selected image."));
          }, outputType, imageUploadPolicy.quality);
        });

        if (!optimizedBlob || optimizedBlob.size >= file.size) {
          return file;
        }

        return new File([optimizedBlob], outputName, {
          type: outputType,
          lastModified: Date.now()
        });
      }

      async function uploadImage(endpoint, file) {
        if (!file) {
          return null;
        }
        const provider = state.bootstrap?.storage?.provider || "local";
        if (provider === "supabase") {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          const chunkSize = 0x8000;
          for (let index = 0; index < bytes.length; index += chunkSize) {
            const chunk = bytes.subarray(index, index + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          return api(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type || "image/jpeg",
              base64: btoa(binary)
            })
          });
        }

        const photoForm = new FormData();
        photoForm.append("photo", file);
        return api(endpoint, { method: "POST", body: photoForm });
      }

      const locationTones = ["location-tone-1", "location-tone-2", "location-tone-3", "location-tone-4"];
      const containerTones = ["container-tone-1", "container-tone-2", "container-tone-3"];
      const itemTones = ["item-tone-1", "item-tone-2", "item-tone-3", "item-tone-4"];
      const heroTones = ["hero-tone-1", "hero-tone-2", "hero-tone-3", "hero-tone-4"];
      const detailTones = ["detail-tone-1", "detail-tone-2", "detail-tone-3", "detail-tone-4"];
      const saveActionButton = '<button class="icon-button save-icon" type="submit" aria-label="Save" title="Save">&#10003;</button>';
      const addIconMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
      const plusIconMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
      const minusIconMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M5 12h14"/></svg>';
      const deleteIconMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>';
      const editIconMarkup = '&#9998;';
      const historyIconMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v4h4"></path><path d="M12 7v5l3 2"></path></svg>';
      const compassEditIconMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4Z"></path><path d="M13 7l4 4"></path></svg>';
      const moveIconMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 7 5 5-5 5"></path><path d="m13 7 5 5-5 5"></path></svg>';

      boot();

      function boot() {
        window.addEventListener("error", (event) => {
          showFatalError(event.error || event.message || "The page hit a browser error.");
        });
        window.addEventListener("unhandledrejection", (event) => {
          showFatalError(event.reason || "The page hit an unexpected async error.");
        });
        els.searchForm.addEventListener("submit", onSearch);
        els.searchInput.addEventListener("input", onSearchInput);
        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && !els.modalRoot.hidden) closeModal();
        });
        window.addEventListener("popstate", () => {
          applyCurrentPath().catch((error) => {
            showFatalError(error);
          });
        });
        refreshAll()
          .then(() => applyCurrentPath())
          .catch((error) => {
            showFatalError(error);
          });
      }

      async function refreshAll() {
        try {
          const googleStatus = await api("/api/auth/google/status");
          state.googleAuthConfigured = Boolean(googleStatus.configured);
        } catch (error) {
          state.googleAuthConfigured = false;
        }
        state.bootstrap = await api("/api/bootstrap?selectedContainerId=" + encodeURIComponent(state.activeContainerId || ""));
        try {
          renderOverview();
          renderStage();
        } catch (error) {
          showFatalError(error);
          throw error;
        }
      }

      function renderOverview() {
        document.title = state.bootstrap.authenticated
          ? state.bootstrap.workspace.name + " | TethrArca"
          : "TethrArca";
        els.searchInput.disabled = !state.bootstrap.authenticated;
        els.searchInput.placeholder = state.bootstrap.authenticated
          ? "Search locations, containers, or items"
          : "Sign in to search";
        renderTopbarNav();
      }

      function renderTopbarNav() {
        if (!state.bootstrap.authenticated) {
          els.topbarNav.innerHTML = "";
          return;
        }
        const user = state.bootstrap.currentUser || {};
        const sessionBadgeHtml =
          '<button id="topbar-account-button" class="session-badge" type="button" aria-label="Account">' +
            '<div class="session-name">' + escapeHtml(user.name || "Signed in") + '</div>' +
            '<div class="session-email">' + escapeHtml(user.email || "") + '</div>' +
          '</button>';
        const showBack = state.stage === "containers" || state.stage === "container" || state.stage === "item" || state.stage === "simulatedScan";
        if (!showBack) {
          els.topbarNav.innerHTML =
            '<div class="action-cluster">' +
              sessionBadgeHtml +
            '</div>';
          document.getElementById("topbar-account-button").addEventListener("click", openAccountModal);
          return;
        }
        const showHome = state.stage === "container" || state.stage === "item";
        els.topbarNav.innerHTML =
          '<div class="action-cluster">' +
            sessionBadgeHtml +
            (showHome
              ? '<button id="topbar-home-button" class="secondary icon-button nav-icon home-icon" type="button" aria-label="Home" title="Home"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 3.2 2.8 10.6a1 1 0 0 0 .62 1.78H5v7.1c0 .83.67 1.5 1.5 1.5h3.8a.7.7 0 0 0 .7-.7V15.2c0-.39.31-.7.7-.7h1.6c.39 0 .7.31.7.7v5.05a.7.7 0 0 0 .7.7h3.8c.83 0 1.5-.67 1.5-1.5v-7.1h1.58a1 1 0 0 0 .62-1.78L12 3.2Z"/></svg></button>'
              : '') +
            '<button id="topbar-back-button" class="secondary icon-button nav-icon back-icon" type="button" aria-label="Back" title="Back">&#8617;</button>' +
          '</div>';
        document.getElementById("topbar-back-button").addEventListener("click", () => {
          if (state.stage === "item") {
            state.stage = "container";
            state.activeItemId = null;
            state.activeItemDetail = null;
            renderOverview();
            renderStage();
            return;
          }
          if (state.stage === "simulatedScan") {
            if (state.pendingScanAction?.kind === "moveItem" && state.activeItemDetail) {
              state.pendingScanAction = null;
              state.stage = "item";
              renderOverview();
              renderStage();
              return;
            }
            if (state.pendingScanAction?.kind === "moveContainer" && state.activeContainerDetail) {
              state.pendingScanAction = null;
              state.stage = "container";
              renderOverview();
              renderStage();
              return;
            }
          }
          if (state.stage === "container") {
            openLocation(state.selectedLocationId || null);
            return;
          }
          goToLocations(true);
        });
        const homeButton = document.getElementById("topbar-home-button");
        if (homeButton) {
          homeButton.addEventListener("click", () => {
            goToLocations(true);
          });
        }
        document.getElementById("topbar-account-button").addEventListener("click", openAccountModal);
      }

      function openAccountModal() {
        const user = state.bootstrap?.currentUser || {};
        const workspace = state.bootstrap?.workspace || {};
        openModal(
          "Account",
          '<div class="stack">' +
            '<div class="section">' +
              '<div class="identity-card">' +
                '<div class="identity-label">Signed In As</div>' +
                '<div class="item-name" style="font-size:1.3rem;">' + escapeHtml(user.name || "Signed in") + '</div>' +
                '<div class="mini-note">' + escapeHtml(user.email || "") + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="section">' +
              '<div class="identity-card">' +
                '<div class="identity-label">Workspace</div>' +
                '<div class="item-name" style="font-size:1.2rem;">' + escapeHtml(workspace.name || "") + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="button-row">' +
              '<button id="account-logout-button" class="secondary" type="button">Log Out</button>' +
            '</div>' +
          '</div>',
          (modal) => {
            modal.querySelector("#account-logout-button").addEventListener("click", async () => {
              closeModal();
              await logout();
            });
          }
        );
      }

      function renderStage() {
        if (state.stage !== "simulatedScan") {
          stopScanner();
        }
        if (!state.bootstrap.authenticated) {
          renderSignInStage();
          return;
        }
        if (state.searchResults) {
          renderSearchStage();
          return;
        }
        if (state.stage === "locations") {
          renderLocationsStage();
          return;
        }
        if (state.stage === "containers") {
          renderContainersStage();
          return;
        }
        if (state.stage === "container") {
          renderContainerStage();
          return;
        }
        if (state.stage === "scanSetup") {
          renderScanSetupStage();
          return;
        }
        if (state.stage === "simulatedScan") {
          renderSimulatedScanStage();
          return;
        }
        if (state.stage === "item") {
          renderItemStage();
        }
      }

      function setBreadcrumbs(crumbs = []) {
        if (!els.stageBreadcrumbs) {
          return;
        }
        const safeCrumbs = Array.isArray(crumbs) ? crumbs.filter(Boolean) : [];
        if (!safeCrumbs.length) {
          els.stageBreadcrumbs.innerHTML = "";
          return;
        }
        els.stageBreadcrumbs.innerHTML = safeCrumbs.map((crumb, index) => {
          const isLast = index === safeCrumbs.length - 1;
          const label = escapeHtml(crumb.label || "");
          const chip = isLast
            ? '<span class="breadcrumb-current">' + label + '</span>'
            : '<button class="breadcrumb-link" type="button" data-breadcrumb-index="' + index + '">' + label + '</button>';
          const separator = isLast ? "" : '<span class="breadcrumb-separator">/</span>';
          return chip + separator;
        }).join("");
        els.stageBreadcrumbs.querySelectorAll("[data-breadcrumb-index]").forEach((button) => {
          button.addEventListener("click", () => {
            const index = Number.parseInt(button.dataset.breadcrumbIndex, 10);
            const crumb = safeCrumbs[index];
            if (crumb?.onClick) {
              crumb.onClick();
            }
          });
        });
      }

      function renderSignInStage() {
        state.stage = "locations";
        state.searchResults = null;
        els.stageTitle.textContent = "Welcome";
        els.stageMeta.textContent = "Sign in to get your own private TethrArca workspace.";
        setBreadcrumbs([]);
        els.stageActions.innerHTML = "";
        els.stageContent.innerHTML =
          '<div class="section" style="max-width:560px;">' +
            '<form id="sign-in-form" class="form-grid">' +
              '<label>Your Name<input name="name" autocomplete="name" placeholder="Jason" required></label>' +
              '<label>Email<input name="email" type="email" autocomplete="email" placeholder="jason@example.com" required></label>' +
              '<div class="button-row">' +
                '<button class="secondary" type="submit">Sign In</button>' +
              '</div>' +
            '</form>' +
            '<div class="button-row" style="justify-content:flex-start;">' +
              '<button id="google-sign-in-button" class="secondary" type="button"' + (state.googleAuthConfigured ? '' : ' disabled') + '>Continue with Google</button>' +
            '</div>' +
            '<div id="google-sign-in-note" class="mini-note">' + (state.googleAuthConfigured
              ? 'Google sign-in is configured.'
              : 'Google sign-in will be connected next. For now, use name and email.') + '</div>' +
            '<div class="mini-note">This is the simple beta sign-in for now. It gives each person their own private workspace.</div>' +
          '</div>';
        document.getElementById("sign-in-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("/api/auth/sign-in", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              email: form.get("email")
            })
          });
          showMessage("Signed in.");
          await refreshAll();
          await applyCurrentPath();
        });
        document.getElementById("google-sign-in-button").addEventListener("click", () => {
          if (state.googleAuthConfigured) {
            window.location.href = "/auth/google/start";
          }
        });
      }

      function goToLocations(push = true) {
        state.stage = "locations";
        state.selectedLocationId = null;
        state.activeContainerId = null;
        state.activeContainerDetail = null;
        state.activeItemId = null;
        state.activeItemDetail = null;
        state.scanToken = null;
        state.pendingScanAction = null;
        if (push) {
          history.pushState({}, "", "/");
        }
        renderStage();
      }

      function openLocation(locationId, push = true) {
        state.stage = "containers";
        state.selectedLocationId = locationId;
        state.activeContainerId = null;
        state.activeContainerDetail = null;
        state.activeItemId = null;
        state.activeItemDetail = null;
        state.scanToken = null;
        state.pendingScanAction = null;
        if (push) {
          history.pushState({}, "", "/");
        }
        renderStage();
      }

      async function applyCurrentPath() {
        if (!state.bootstrap || !state.bootstrap.authenticated) {
          renderStage();
          return;
        }
        if (window.location.pathname === "/simulate-scan") {
          state.searchResults = null;
          state.stage = "simulatedScan";
          state.scanToken = null;
          renderStage();
          return;
        }
        const scanMatch = window.location.pathname.match(/^\/scan\/([^/]+)$/);
        if (scanMatch) {
          await openScanToken(decodeURIComponent(scanMatch[1]), false);
          return;
        }
        const containerMatch = window.location.pathname.match(/^\/containers\/([^/]+)$/);
        if (containerMatch) {
          const id = extractRecordIdFromSlug(containerMatch[1]);
          if (id) {
            await openContainer(id, false);
            return;
          }
        }
        goToLocations(false);
      }

      function extractRecordIdFromSlug(value) {
        const match = String(value || "").trim().match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
        return match ? match[1] : "";
      }

      async function openScanToken(token, push = true) {
        const cleanToken = String(token || "").trim();
        if (!cleanToken) {
          goToLocations(push);
          return;
        }
        if (push) {
          history.pushState({}, "", "/scan/" + encodeURIComponent(cleanToken));
        }
        state.searchResults = null;
        const response = await fetch("/api/tags/" + encodeURIComponent(cleanToken), { cache: "no-store" });
        const result = response.status === 404 ? null : await response.json();
        if (!response.ok && response.status !== 404) {
          const body = result || {};
          showMessage(body.error || "Request failed", true);
          return;
        }
        if (state.pendingScanAction) {
          await handlePendingScanAction(cleanToken, result);
          return;
        }
        if (!result || result.status === "unassigned") {
          state.stage = "scanSetup";
          state.scanToken = cleanToken;
          state.selectedLocationId = null;
          state.activeContainerId = null;
          state.activeContainerDetail = null;
          state.activeItemId = null;
          state.activeItemDetail = null;
          renderStage();
          return;
        }
        if (result.entityType === "location") {
          state.scanToken = cleanToken;
          openLocation(result.entityId, false);
          return;
        }
        if (result.entityType === "container") {
          state.scanToken = cleanToken;
          await openContainer(result.entityId, false);
          return;
        }
        if (result.entityType === "item") {
          state.scanToken = cleanToken;
          await openItem(result.entityId);
        }
      }

      async function handlePendingScanAction(cleanToken, result) {
        const pending = state.pendingScanAction;
        if (!pending) {
          return;
        }

        if (!result || result.status === "unassigned") {
          showMessage("That label is not set up yet.", true);
          renderStage();
          return;
        }

        if (pending.kind === "moveContainer") {
          if (result.entityType !== "location") {
            showMessage("Scan a location to move this container.", true);
            renderStage();
            return;
          }
          await api("/api/containers/" + pending.containerId + "/move", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              locationId: result.entityId,
              notes: "Moved by scan"
            })
          });
          state.pendingScanAction = null;
          state.scanToken = cleanToken;
          showMessage("Container moved.");
          await openContainer(pending.containerId, true);
          refreshAll().catch(() => {});
          return;
        }

        if (pending.kind === "moveItem") {
          if (result.entityType !== "container") {
            showMessage("Scan a container to move this item.", true);
            renderStage();
            return;
          }
          await api("/api/items/" + pending.itemId + "/move", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              containerId: result.entityId,
              notes: "Moved by scan"
            })
          });
          state.pendingScanAction = null;
          state.scanToken = cleanToken;
          showMessage("Item moved.");
          await openContainer(result.entityId, true);
          await openItem(pending.itemId);
          refreshAll().catch(() => {});
        }
      }

      function extractTokenFromScanValue(rawValue) {
        const value = String(rawValue || "").trim();
        if (!value) {
          return "";
        }
        const directMatch = value.match(/\/scan\/([^/?#]+)/i);
        if (directMatch) {
          return decodeURIComponent(directMatch[1]);
        }
        try {
          const parsed = new URL(value);
          const match = parsed.pathname.match(/\/scan\/([^/]+)/i);
          return match ? decodeURIComponent(match[1]) : value;
        } catch {
          return value;
        }
      }

      function updateScannerStatus(message) {
        const status = document.getElementById("scanner-status");
        if (status) {
          status.textContent = message || "";
        }
      }

      function stopScanner() {
        scannerState.active = false;
        scannerState.detecting = false;
        scannerState.lastToken = "";
        if (scannerState.animationFrame) {
          cancelAnimationFrame(scannerState.animationFrame);
          scannerState.animationFrame = 0;
        }
        if (scannerState.stream) {
          scannerState.stream.getTracks().forEach((track) => track.stop());
          scannerState.stream = null;
        }
        const video = document.getElementById("scanner-video");
        if (video) {
          try {
            video.pause();
          } catch {
            // Ignore pause failures.
          }
          video.srcObject = null;
        }
      }

      async function startScanner() {
        stopScanner();
        const shell = document.getElementById("scanner-shell");
        const video = document.getElementById("scanner-video");
        if (!shell || !video) {
          return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          shell.classList.add("is-unavailable");
          shell.innerHTML = '<div class="empty-state" style="padding:24px; background:transparent; border:0; color:#eef5ff;"><h3>Camera not available</h3><div class="mini-note" style="color:#d9e5f7;">This browser cannot open the camera here yet. You can still paste a code below.</div></div>';
          updateScannerStatus("Camera scanning is not available on this browser.");
          return;
        }
        if (!("BarcodeDetector" in window)) {
          shell.classList.add("is-unavailable");
          shell.innerHTML = '<div class="empty-state" style="padding:24px; background:transparent; border:0; color:#eef5ff;"><h3>Scanner not supported</h3><div class="mini-note" style="color:#d9e5f7;">This browser can open the camera, but it cannot decode QR codes in-page yet. You can still paste a code below.</div></div>';
          updateScannerStatus("This browser does not support in-page QR reading yet.");
          return;
        }
        try {
          scannerState.stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" }
            },
            audio: false
          });
          video.srcObject = scannerState.stream;
          await video.play();
          scannerState.detector = new BarcodeDetector({ formats: ["qr_code"] });
          scannerState.active = true;
          updateScannerStatus("Point your camera at a QR label.");
          const scanFrame = async () => {
            if (!scannerState.active) {
              return;
            }
            if (!scannerState.detecting && video.readyState >= 2) {
              scannerState.detecting = true;
              try {
                const codes = await scannerState.detector.detect(video);
                const rawValue = codes?.[0]?.rawValue || "";
                const token = extractTokenFromScanValue(rawValue);
                if (token && token !== scannerState.lastToken) {
                  scannerState.lastToken = token;
                  stopScanner();
                  await openScanToken(token, true);
                  return;
                }
              } catch {
                // Ignore detector frame errors and keep scanning.
              } finally {
                scannerState.detecting = false;
              }
            }
            scannerState.animationFrame = requestAnimationFrame(() => {
              scanFrame().catch(() => {});
            });
          };
          scanFrame().catch(() => {});
        } catch (error) {
          shell.classList.add("is-unavailable");
          shell.innerHTML = '<div class="empty-state" style="padding:24px; background:transparent; border:0; color:#eef5ff;"><h3>Camera blocked</h3><div class="mini-note" style="color:#d9e5f7;">Allow camera access to scan labels here, or paste a code below.</div></div>';
          updateScannerStatus(error?.message || "Camera access was not granted.");
        }
      }

      function getLocation(id) {
        return state.bootstrap.locations.find((location) => location.id === id) || null;
      }

      function getContainer(id) {
        return state.bootstrap.containers.find((container) => container.id === id) || null;
      }

      function getItem(id) {
        return state.bootstrap.items.find((item) => item.id === id) || null;
      }

      function containersForLocation(locationId) {
        return state.bootstrap.containers.filter((container) => (container.location_id || null) === (locationId || null));
      }

      function itemsByContainerMap() {
        const map = new Map();
        for (const item of state.bootstrap.items) {
          map.set(item.container_id, (map.get(item.container_id) || 0) + 1);
        }
        return map;
      }

      function toneClass(list, index) {
        return list[index % list.length];
      }

      function toneClassForId(list, id) {
        let hash = 0;
        const value = String(id || "");
        for (let index = 0; index < value.length; index += 1) {
          hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
        }
        return list[Math.abs(hash) % list.length];
      }

      function attachPressAndHoldAction(target, onHold, options = {}) {
        if (!target || typeof onHold !== "function") {
          return;
        }
        const holdDelay = options.holdDelay || 420;
        const cancelSelector = options.cancelSelector || "";
        let timer = null;
        let holdTriggered = false;
        let startPoint = null;

        const pointForEvent = (event) => {
          const touch = event.touches?.[0] || event.changedTouches?.[0];
          return touch
            ? { x: touch.clientX, y: touch.clientY }
            : { x: event.clientX || 0, y: event.clientY || 0 };
        };

        const shouldIgnore = (event) => cancelSelector && event.target.closest(cancelSelector);

        const clearHold = () => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          startPoint = null;
        };

        const triggerHold = (event) => {
          holdTriggered = true;
          clearHold();
          onHold(event);
        };

        const startHold = (event) => {
          if (shouldIgnore(event)) {
            return;
          }
          holdTriggered = false;
          startPoint = pointForEvent(event);
          clearHold();
          startPoint = pointForEvent(event);
          timer = setTimeout(() => triggerHold(event), holdDelay);
        };

        const maybeCancelHold = (event) => {
          if (!timer || !startPoint) {
            return;
          }
          const point = pointForEvent(event);
          if (Math.abs(point.x - startPoint.x) > 10 || Math.abs(point.y - startPoint.y) > 10) {
            clearHold();
          }
        };

        target.addEventListener("touchstart", startHold, { passive: true });
        target.addEventListener("touchmove", maybeCancelHold, { passive: true });
        target.addEventListener("touchend", clearHold, { passive: true });
        target.addEventListener("touchcancel", clearHold, { passive: true });
        target.addEventListener("mousedown", startHold);
        target.addEventListener("mousemove", maybeCancelHold);
        target.addEventListener("mouseup", clearHold);
        target.addEventListener("mouseleave", clearHold);
        target.addEventListener("contextmenu", (event) => {
          if (shouldIgnore(event)) {
            return;
          }
          event.preventDefault();
          onHold(event);
        });
        target.addEventListener("click", (event) => {
          if (!holdTriggered) {
            return;
          }
          holdTriggered = false;
          event.preventDefault();
          event.stopPropagation();
        }, true);
      }

      function openActionCompass(title, actions = {}, options = {}) {
        const buttonHtml = (action, position, extraClass = "") => {
          if (!action) {
            return '<div class="action-compass-spacer"></div>';
          }
          const disabledAttr = options.requireRelease ? ' disabled' : '';
          return '<button class="action-compass-button ' + extraClass + (action.danger ? ' danger' : ' secondary') + '" type="button" data-action-compass="' + position + '">' +
            (action.icon || ('<span class="compass-glyph">' + escapeHtml(action.label) + '</span>')) +
            '<span class="sr-only">' + escapeHtml(action.label) + '</span>' +
          '</button>'.replace('>', disabledAttr + '>');
        };
        openModal(
          title,
          '<div class="action-compass">' +
            '<div class="action-compass-row">' +
              buttonHtml(actions.top, "top") +
            '</div>' +
            '<div class="action-compass-middle">' +
              buttonHtml(actions.left, "left", "side ") +
              '<div class="action-compass-center">?</div>' +
              buttonHtml(actions.right, "right", "side ") +
            '</div>' +
            '<div class="action-compass-row">' +
              buttonHtml(actions.bottom, "bottom") +
            '</div>' +
          '</div>',
          (modal) => {
            const compassButtons = Array.from(modal.querySelectorAll("[data-action-compass]"));
            const armActions = () => {
              compassButtons.forEach((button) => {
                button.disabled = false;
              });
            };
            if (options.requireRelease) {
              const releaseEvents = ["pointerup", "touchend", "mouseup", "touchcancel"];
              releaseEvents.forEach((eventName) => {
                window.addEventListener(eventName, armActions, { once: true, capture: true });
              });
            }
            modal.querySelectorAll("[data-action-compass]").forEach((button) => {
              button.addEventListener("click", async () => {
                const position = button.dataset.actionCompass;
                const action = actions[position];
                closeModal();
                if (action?.run) {
                  await action.run();
                }
              });
            });
          }
        );
      }

      function renderTagCard(tag, options = {}) {
        const entityType = options.entityType || "record";
        const entityId = options.entityId || "";
        const title = options.title || "Tag";
        const buttonId = options.buttonId || "";
        const buttonHtml = !tag
          ? '<button class="secondary" type="button" id="' + buttonId + '">Create Tag</button>'
          : "";
        return (
          '<div class="section ' + (options.toneClassName || "") + '">' +
            '<div class="identity-card">' +
              '<div class="identity-label">' + escapeHtml(title) + '</div>' +
              (tag
                ? '<div class="identity-token">' + escapeHtml(tag.token) + '</div>'
                : '<div class="identity-empty">No tag assigned yet.</div>') +
              buttonHtml +
            '</div>' +
          '</div>'
        );
      }

      async function createTagForEntity(entityType, entityId) {
        const created = await api("/api/tags", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entityType,
            entityId
          })
        });
        showMessage("Tag created.");
        return created;
      }

      async function ensureTagForEntity(entityType, entityId, existingToken = "") {
        const token = String(existingToken || "").trim();
        if (token) {
          return token;
        }
        const created = await createTagForEntity(entityType, entityId);
        await refreshAll();
        return created.token;
      }

      function canShowLabelAction(tagToken, tagSource) {
        const token = String(tagToken || "").trim();
        const source = String(tagSource || "").trim().toLowerCase();
        return !token || source !== "external";
      }

      function buildScanUrl(token) {
        return window.location.origin + "/scan/" + encodeURIComponent(token);
      }

      function openPrintLabelWindow({ name, entityType, token, size }) {
        const printUrl = window.location.origin +
          "/print-label?name=" + encodeURIComponent(name || "Label") +
          "&entityType=" + encodeURIComponent(entityType) +
          "&token=" + encodeURIComponent(token) +
          "&size=" + encodeURIComponent(size || "medium");
        const printWindow = window.open(printUrl, "_blank");
        if (!printWindow) {
          showMessage("Popup blocked. Please allow popups to print labels.", true);
        }
      }

      async function openLabelModal({ entityType, entityId, name, existingToken }) {
        const token = await ensureTagForEntity(entityType, entityId, existingToken);
        const scanUrl = buildScanUrl(token);
        const previewName = name || "Label";
        const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" + encodeURIComponent(scanUrl);
        const subtitle = entityType[0].toUpperCase() + entityType.slice(1);
        openModal(
          "Label",
          '<div class="stack">' +
            '<div id="label-panel" class="photo-card" data-size="medium" style="max-width:3in; margin:0 auto; text-align:center;">' +
              '<div class="item-name" style="font-size:1.4rem;">' + escapeHtml(previewName) + '</div>' +
              '<div class="mini-note" style="margin-top:6px; text-transform:uppercase; letter-spacing:.08em;">' + escapeHtml(subtitle) + '</div>' +
              '<div style="max-width:320px; width:100%; margin:18px auto 0;"><img src="' + qrUrl + '" alt="QR code for ' + escapeAttr(previewName) + '"></div>' +
            '</div>' +
            '<div class="section-head actions-only">' +
              '<label style="width:auto; min-width:190px;">Label Size<select id="label-size-select"><option value="small">Small</option><option value="medium" selected>Medium</option><option value="large">Large</option></select></label>' +
              '<button id="print-label-button" class="secondary" type="button">Print Label</button>' +
            '</div>' +
          '</div>',
          (modal) => {
            const panel = modal.querySelector("#label-panel");
            const sizeSelect = modal.querySelector("#label-size-select");
            const syncPanelSize = () => {
              panel.style.maxWidth = sizeSelect.value === "small"
                ? "2.25in"
                : sizeSelect.value === "large"
                  ? "4in"
                  : "3in";
            };
            syncPanelSize();
            sizeSelect.addEventListener("change", syncPanelSize);
            modal.querySelector("#print-label-button").addEventListener("click", () => {
              openPrintLabelWindow({
                name: previewName,
                entityType,
                token,
                size: sizeSelect.value || "medium"
              });
            });
          }
        );
      }

      function renderSimulatedScanStage() {
        renderTopbarNav();
        let title = "Scan Label";
        let meta = "Point your camera at a QR label, or paste a label code below.";
        let breadcrumbs = [
          { label: "Places", onClick: () => goToLocations(true) },
          { label: "Scan" }
        ];

        if (state.pendingScanAction?.kind === "moveContainer" && state.activeContainerDetail) {
          title = "Scan Place to Move";
          meta = "Scan a place label to move this container there.";
          const detail = state.activeContainerDetail;
          const currentLocation = detail.container.location_id ? getLocation(detail.container.location_id) : null;
          breadcrumbs = currentLocation
            ? [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: currentLocation.name, onClick: () => openLocation(currentLocation.id, true) },
                { label: detail.container.name, onClick: () => openContainer(detail.container.id, true) },
                { label: "Scan Move" }
              ]
            : [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: "No Location", onClick: () => openLocation(null, true) },
                { label: detail.container.name, onClick: () => openContainer(detail.container.id, true) },
                { label: "Scan Move" }
              ];
        } else if (state.pendingScanAction?.kind === "moveItem" && state.activeItemDetail) {
          title = "Scan Container to Move";
          meta = "Scan a container label to move this item there.";
          const detail = state.activeItemDetail;
          const container = getContainer(detail.item.container_id);
          const location = container?.location_id ? getLocation(container.location_id) : null;
          breadcrumbs = location
            ? [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: location.name, onClick: () => openLocation(location.id, true) },
                { label: detail.item.container_name, onClick: () => openContainer(detail.item.container_id, true) },
                { label: detail.item.name, onClick: () => openItem(detail.item.id) },
                { label: "Scan Move" }
              ]
            : [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: "No Location", onClick: () => openLocation(null, true) },
                { label: detail.item.container_name, onClick: () => openContainer(detail.item.container_id, true) },
                { label: detail.item.name, onClick: () => openItem(detail.item.id) },
                { label: "Scan Move" }
              ];
        }

        els.stageTitle.textContent = title;
        els.stageMeta.textContent = meta;
        setBreadcrumbs(breadcrumbs);
        els.stageActions.innerHTML = "";
        els.stageContent.innerHTML =
          '<div class="section scanner-section">' +
            '<div id="scanner-shell" class="scanner-shell">' +
              '<video id="scanner-video" autoplay playsinline muted></video>' +
              '<div class="scanner-overlay">Hold the code inside the frame.</div>' +
            '</div>' +
            '<div id="scanner-status" class="scanner-status">Opening camera...</div>' +
            '<form id="scanner-manual-form" class="scanner-manual">' +
              '<div class="scanner-manual-row">' +
                '<label>Label Code<input id="scanner-manual-input" placeholder="Paste or type a tag code"></label>' +
                '<button class="secondary" type="submit">Use Code</button>' +
              '</div>' +
            '</form>' +
          '</div>';

        document.getElementById("scanner-manual-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const input = document.getElementById("scanner-manual-input");
          const token = extractTokenFromScanValue(input?.value || "");
          if (!token) {
            showMessage("Enter a label code first.", true);
            return;
          }
          stopScanner();
          await openScanToken(token, true);
        });

        startScanner().catch(() => {
          updateScannerStatus("Scanner could not start. You can still paste a code below.");
        });
      }

      function renderLocationsStage() {
        els.stageTitle.textContent = "Locations";
        els.stageMeta.textContent = "Tap a place to open it. Press and hold a tile for actions.";
        setBreadcrumbs([
          { label: "Places" }
        ]);
        els.stageActions.innerHTML =
          '<div class="action-cluster">' +
            '<button id="stage-add-location" class="icon-button add-icon" type="button" aria-label="Add location" title="Add location">' + addIconMarkup + '</button>' +
          '</div>';
        const noLocationCount = containersForLocation(null).length;
        const locationTiles = state.bootstrap.locations.map((location, index) => (
          '<div class="tile tile-card ' + toneClass(locationTones, index) + '">' +
            '<button class="tile-open" type="button" data-open-location="' + location.id + '">' +
              '<div class="tile-title">' + escapeHtml(location.name) + '</div>' +
              '<div class="tile-subtitle">' + location.container_count + ' container' + (location.container_count === 1 ? '' : 's') + '</div>' +
            '</button>' +
          '</div>'
        ));
        locationTiles.push(
          '<div class="tile tile-card location-tone-1">' +
            '<button class="tile-open" type="button" data-open-location="__none__">' +
              '<div class="tile-title">No Location</div>' +
              '<div class="tile-subtitle">' + noLocationCount + ' container' + (noLocationCount === 1 ? '' : 's') + '</div>' +
            '</button>' +
          '</div>'
        );
        els.stageContent.innerHTML = locationTiles.length
          ? '<div class="tile-grid">' + locationTiles.join("") + '</div>'
          : '<div class="empty-state"><h3>No locations yet</h3><div class="mini-note">Create a location, or start with containers that have no location.</div></div>';
        document.getElementById("stage-add-location").addEventListener("click", () => openLocationModal());
        els.stageContent.querySelectorAll("[data-open-location]").forEach((button) => {
          button.addEventListener("click", () => openLocation(button.dataset.openLocation === "__none__" ? null : button.dataset.openLocation));
        });
        els.stageContent.querySelectorAll("[data-open-location]").forEach((button) => {
          const locationId = button.dataset.openLocation;
          if (!locationId || locationId === "__none__") {
            return;
          }
          const location = getLocation(locationId);
          if (!location) {
            return;
          }
          attachPressAndHoldAction(button, () => {
            openLocationActionSheet(location);
          });
        });
      }

      function renderScanSetupStage() {
        renderTopbarNav();
        els.stageTitle.textContent = "New Tag Detected";
        els.stageMeta.textContent = "Token: " + state.scanToken;
        setBreadcrumbs([
          { label: "Places", onClick: () => goToLocations(true) },
          { label: "New Label" }
        ]);
        els.stageActions.innerHTML = "";
        els.stageContent.innerHTML =
          '<div class="section">' +
            '<div class="stack">' +
              '<div class="notice">What should this tag become?</div>' +
              '<div class="tile-grid">' +
                '<button class="tile" type="button" data-scan-create="location">' +
                  '<div class="tile-title">Location</div>' +
                  '<div class="tile-subtitle">Create a new location and assign this tag.</div>' +
                '</button>' +
                '<button class="tile" type="button" data-scan-create="container">' +
                  '<div class="tile-title">Container</div>' +
                  '<div class="tile-subtitle">Create a new Arca and assign this tag.</div>' +
                '</button>' +
                '<button class="tile" type="button" data-scan-create="item">' +
                  '<div class="tile-title">Item</div>' +
                  '<div class="tile-subtitle">Create a new item and assign this tag.</div>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        els.stageContent.querySelectorAll("[data-scan-create]").forEach((button) => {
          button.addEventListener("click", () => {
            const type = button.dataset.scanCreate;
            if (type === "location") {
              openLocationModal(null, { tagToken: state.scanToken });
              return;
            }
            if (type === "container") {
              openContainerModal({ container: null, defaultLocationId: null, tagToken: state.scanToken });
              return;
            }
            openItemModal({ itemId: null, containerId: null, tagToken: state.scanToken });
          });
        });
      }

      function renderContainersStage() {
        const location = state.selectedLocationId ? getLocation(state.selectedLocationId) : null;
        const containers = containersForLocation(state.selectedLocationId);
        const itemsMap = itemsByContainerMap();
        const detailTone = location ? toneClassForId(detailTones, location.id) : "";
        const infoBlocks = [];
        if (location?.notes) {
          infoBlocks.push(
            '<div class="section ' + detailTone + '">' +
              '<div class="hero-notes item-notes">' + escapeHtml(location.notes) + '</div>' +
            '</div>'
          );
        }
        renderTopbarNav();
        els.stageTitle.textContent = location ? (location.name + " Containers") : "Unassigned Containers";
        els.stageMeta.textContent = "Tap a container to open it. Press and hold a tile for actions.";
        setBreadcrumbs(
          location
            ? [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: location.name }
              ]
            : [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: "No Location" }
              ]
        );
        els.stageActions.innerHTML =
          '<div class="action-cluster">' +
            (location
              ? '<button id="edit-location-button" class="secondary icon-button" type="button" aria-label="Edit location" title="Edit location">' + editIconMarkup + '</button>'
              : '') +
            '<button id="add-container-here" class="icon-button add-icon" type="button" aria-label="Add container" title="Add container">' + addIconMarkup + '</button>' +
          '</div>';

        els.stageContent.innerHTML = infoBlocks.join("") + (containers.length
          ? '<div class="section">' +
              '<div class="tile-grid">' + containers.map((container, index) => (
                '<div class="tile tile-card ' + toneClass(containerTones, index) + '">' +
                  '<button class="tile-open container-tile-open' + (container.image_stored_name ? ' has-image' : '') + '" type="button" data-open-container="' + container.id + '">' +
                    (container.image_stored_name
                      ? '<div class="tile-thumb"><img src="' + getImageUrl(container.image_stored_name, "containers") + '" alt="' + escapeHtml(container.name) + '"></div>'
                      : '') +
                    '<div class="tile-title">' + escapeHtml(container.name) + '</div>' +
                    '<div class="tile-subtitle">' + (itemsMap.get(container.id) || 0) + ' item' + ((itemsMap.get(container.id) || 0) === 1 ? '' : 's') + '</div>' +
                  '</button>' +
                '</div>'
              )).join("") + '</div>' +
            '</div>'
          : '<div class="section">' +
              '<div class="empty-state"><h3>No containers yet</h3><div class="mini-note">Add a container to this location.</div></div>' +
            '</div>');
        document.getElementById("add-container-here").addEventListener("click", async () => {
          const saved = await api("/api/containers", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              locationId: state.selectedLocationId || null
            })
          });
          showMessage(saved.name + " created.");
          await refreshAll();
        });
        if (location) {
          document.getElementById("edit-location-button").addEventListener("click", () => openLocationModal(location));
        }
        els.stageContent.querySelectorAll("[data-open-container]").forEach((button) => {
          button.addEventListener("click", () => openContainer(button.dataset.openContainer, true));
        });
        els.stageContent.querySelectorAll("[data-open-container]").forEach((button) => {
          const container = getContainer(button.dataset.openContainer);
          if (!container) {
            return;
          }
          attachPressAndHoldAction(button, () => {
            openContainerActionSheet(container);
          });
        });
      }

      async function openContainer(containerId, pushUrl) {
        const detail = await api("/api/containers/" + containerId);
        state.stage = "container";
        state.selectedLocationId = detail.container.location_id || null;
        state.activeContainerId = containerId;
        state.activeContainerDetail = detail;
        state.activeItemId = null;
        state.activeItemDetail = null;
        if (pushUrl) {
          history.pushState({}, "", "/containers/" + detail.container.slug + "-" + detail.container.id);
        }
        renderStage();
      }

      function renderContainerStage() {
        if (!state.activeContainerDetail) {
          els.stageTitle.textContent = "Container";
          els.stageMeta.textContent = "Open a container to see what is inside it.";
          setBreadcrumbs([]);
          els.stageActions.innerHTML = '<button id="back-to-locations" class="secondary" type="button">Back</button>';
          els.stageContent.innerHTML = '<div class="empty-state"><h3>No container open</h3><div class="mini-note">Choose a location first, then a container.</div></div>';
          document.getElementById("back-to-locations").addEventListener("click", () => goToLocations(true));
          return;
        }

        const detail = state.activeContainerDetail;
        const location = detail.container.location_id ? getLocation(detail.container.location_id) : null;
        const heroTone = toneClassForId(heroTones, detail.container.id);
        const containerThumb = detail.container.image_stored_name
          ? '<div class="container-thumb"><img src="' + getImageUrl(detail.container.image_stored_name, "containers") + '" alt="' + escapeHtml(detail.container.name) + '"></div>'
          : "";
        renderTopbarNav();
        els.stageTitle.textContent = location ? location.name : "No Location";
        els.stageMeta.textContent = "Tap an item to open it. Press and hold a tile for actions.";
        setBreadcrumbs(
          location
            ? [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: location.name, onClick: () => openLocation(location.id, true) },
                { label: detail.container.name }
              ]
            : [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: "No Location", onClick: () => openLocation(null, true) },
                { label: detail.container.name }
              ]
        );
        els.stageActions.innerHTML = "";

        const itemRows = detail.items.length
          ? detail.items.map((item, index) => (
              '<div class="item-card">' +
                '<div class="item-row ' + toneClass(itemTones, index) + '" data-open-item="' + item.id + '" tabindex="0" role="button" aria-label="Open ' + escapeAttr(item.name) + '">' +
                  (item.thumbnail_stored_name
                    ? '<div class="item-row-thumb"><img src="' + getImageUrl(item.thumbnail_stored_name, "items") + '" alt="' + escapeHtml(item.name) + '"></div>'
                    : '') +
                  '<div class="item-row-body">' +
                    '<div class="item-row-header">' +
                      '<div style="display:grid; gap:10px; width:100%;">' +
                        '<div class="item-name">' + escapeHtml(item.name) + '</div>' +
                        '<div class="item-quantity-wrap">' +
                          '<div class="item-quantity-row">' +
                            '<button class="item-quantity-button minus" type="button" data-quantity-delta="-1" data-item-id="' + item.id + '" aria-label="Decrease quantity for ' + escapeAttr(item.name) + '">' + minusIconMarkup + '</button>' +
                            '<div class="item-quantity-value" data-item-quantity-value="' + item.id + '">' + item.quantity + '</div>' +
                            '<button class="item-quantity-button plus" type="button" data-quantity-delta="1" data-item-id="' + item.id + '" aria-label="Increase quantity for ' + escapeAttr(item.name) + '">' + plusIconMarkup + '</button>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +
                    (item.notes ? '<div class="mini-note">' + escapeHtml(item.notes) + '</div>' : '') +
                  '</div>' +
                '</div>' +
              '</div>'
            )).join("")
          : '<div class="empty-state"><h3>No items yet</h3><div class="mini-note">Add the first item to this container.</div></div>';

        els.stageContent.innerHTML =
          '<div class="hero ' + heroTone + '">' +
            '<div class="hero-top"><div class="action-cluster">' +
              '<button id="container-history-button" class="secondary icon-button" type="button" aria-label="View container history" title="View container history">' + historyIconMarkup + '</button>' +
              '<button id="container-scan-move-button" class="secondary" type="button">Scan Move</button>' +
              '<button id="edit-container-button" class="secondary icon-button" type="button" aria-label="Edit container" title="Edit container">' + editIconMarkup + '</button>' +
            '</div></div>' +
            '<div class="container-hero-layout' + (containerThumb ? "" : " no-photo") + '">' +
              containerThumb +
              '<div class="container-hero-copy">' +
                '<div class="hero-title">' +
                  '<h3>' + escapeHtml(detail.container.name) + '</h3>' +
                  '<div class="hero-count">' + detail.items.length + ' item' + (detail.items.length === 1 ? '' : 's') + '</div>' +
                '</div>' +
                (detail.container.notes ? '<div class="hero-notes item-notes">' + escapeHtml(detail.container.notes) + '</div>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="section items-section">' +
            '<div class="section-head">' +
              '<h3>Items</h3>' +
              '<button id="add-item-button" class="icon-button add-icon" type="button" aria-label="Add item" title="Add item">' + addIconMarkup + '</button>' +
            '</div>' +
            '<div class="contents-grid">' + itemRows + '</div>' +
          '</div>';

        document.getElementById("container-history-button").addEventListener("click", async () => {
          try {
            const freshDetail = await api("/api/containers/" + detail.container.id);
            state.activeContainerDetail = freshDetail;
            openContainerHistoryModal(freshDetail);
          } catch (error) {
            showError(error.message || "Could not load container history.");
          }
        });
        document.getElementById("container-scan-move-button").addEventListener("click", () => {
          state.pendingScanAction = {
            kind: "moveContainer",
            containerId: detail.container.id
          };
          state.stage = "simulatedScan";
          history.pushState({}, "", "/simulate-scan");
          renderStage();
        });
        document.getElementById("edit-container-button").addEventListener("click", () => openContainerModal({ container: detail.container, defaultLocationId: detail.container.location_id || null }));
        document.getElementById("add-item-button").addEventListener("click", () => openItemModal({ itemId: null, containerId: detail.container.id }));
        els.stageContent.querySelectorAll("[data-open-item]").forEach((button) => {
          button.addEventListener("click", (event) => {
            if (event.target.closest("[data-quantity-delta]")) {
              return;
            }
            event.preventDefault();
            openItem(button.dataset.openItem);
          });
          button.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openItem(button.dataset.openItem);
            }
          });
        });
        els.stageContent.querySelectorAll("[data-quantity-delta]").forEach((button) => {
          button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const delta = Number.parseInt(button.dataset.quantityDelta, 10) || 0;
            await adjustItemQuantity(button.dataset.itemId, delta);
          });
        });
        els.stageContent.querySelectorAll("[data-open-item]").forEach((button) => {
          const item = detail.items.find((entry) => entry.id === button.dataset.openItem);
          if (!item) {
            return;
          }
          attachPressAndHoldAction(button, () => {
            openItemActionSheet(item);
          }, {
            cancelSelector: "[data-quantity-delta]"
          });
        });
      }

      async function openItem(itemId) {
        const detail = await api("/api/items/" + itemId);
        state.stage = "item";
        state.activeItemId = itemId;
        state.activeItemDetail = detail;
        renderStage();
      }

      function renderItemStage() {
        if (!state.activeItemDetail) {
          state.stage = state.activeContainerDetail ? "container" : "locations";
          renderStage();
          return;
        }

        const detail = state.activeItemDetail;
        const container = getContainer(detail.item.container_id);
        const location = container?.location_id ? getLocation(container.location_id) : null;
        const heroTone = toneClassForId(heroTones, detail.item.id);
        const detailTone = toneClassForId(detailTones, detail.item.id);
        renderTopbarNav();
        els.stageTitle.textContent = detail.item.container_name;
        els.stageMeta.textContent = "";
        setBreadcrumbs(
          location
            ? [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: location.name, onClick: () => openLocation(location.id, true) },
                { label: detail.item.container_name, onClick: () => openContainer(detail.item.container_id, true) },
                { label: detail.item.name }
              ]
            : [
                { label: "Places", onClick: () => goToLocations(true) },
                { label: "No Location", onClick: () => openLocation(null, true) },
                { label: detail.item.container_name, onClick: () => openContainer(detail.item.container_id, true) },
                { label: detail.item.name }
              ]
        );
        els.stageActions.innerHTML = "";

        const primaryPhoto = detail.photos[0] || null;
        const thumbHtml = primaryPhoto
          ? '<div class="item-thumb"><img src="' + getImageUrl(primaryPhoto.stored_name, "items") + '" alt="' + escapeHtml(primaryPhoto.file_name) + '"></div>'
          : "";
        const photoStrip = detail.photos.length > 1
          ? '<div class="item-photo-strip">' + detail.photos.map((photo) => (
              '<div class="item-photo-chip"><img src="' + getImageUrl(photo.stored_name, "items") + '" alt="' + escapeHtml(photo.file_name) + '"></div>'
            )).join("") + '</div>'
          : "";
        const notesHtml = detail.item.notes ? '<div class="hero-notes item-notes">' + escapeHtml(detail.item.notes) + '</div>' : "";
        const copyHtml =
          '<div class="item-hero-copy">' +
            '<div class="item-hero-header">' +
              '<div class="item-title-line">' +
                '<h3>' + escapeHtml(detail.item.name) + '</h3>' +
                '<div class="item-detail-quantity-row">' +
                  '<button class="item-quantity-button minus" type="button" data-item-detail-quantity-delta="-1" data-item-id="' + detail.item.id + '" aria-label="Decrease quantity for ' + escapeAttr(detail.item.name) + '">' + minusIconMarkup + '</button>' +
                  '<div class="hero-count item-quantity-display">' + detail.item.quantity + '</div>' +
                  '<button class="item-quantity-button plus" type="button" data-item-detail-quantity-delta="1" data-item-id="' + detail.item.id + '" aria-label="Increase quantity for ' + escapeAttr(detail.item.name) + '">' + plusIconMarkup + '</button>' +
                '</div>' +
              '</div>' +
              '<div class="action-cluster">' +
                '<button id="item-history-button" class="secondary icon-button" type="button" aria-label="View item history" title="View item history">' + historyIconMarkup + '</button>' +
                '<button id="item-scan-move-button" class="secondary" type="button">Scan Move</button>' +
                '<button id="edit-item-button" class="secondary icon-button" type="button" aria-label="Edit item" title="Edit item">' + editIconMarkup + '</button>' +
              '</div>' +
            '</div>' +
            notesHtml +
            photoStrip +
          '</div>';

        els.stageContent.innerHTML =
          '<div class="hero item-hero ' + heroTone + '">' +
            '<div class="item-hero-layout' + (primaryPhoto ? "" : " no-photo") + '">' +
              thumbHtml +
              copyHtml +
            '</div>' +
          '</div>';
        document.getElementById("item-history-button").addEventListener("click", async () => {
          try {
            const freshDetail = await api("/api/items/" + detail.item.id);
            state.activeItemDetail = freshDetail;
            openItemHistoryModal(freshDetail);
          } catch (error) {
            showError(error.message || "Could not load item history.");
          }
        });
        document.getElementById("item-scan-move-button").addEventListener("click", () => {
          state.pendingScanAction = {
            kind: "moveItem",
            itemId: detail.item.id
          };
          state.stage = "simulatedScan";
          history.pushState({}, "", "/simulate-scan");
          renderStage();
        });
        els.stageContent.querySelectorAll("[data-item-detail-quantity-delta]").forEach((button) => {
          button.addEventListener("click", async (event) => {
            event.preventDefault();
            const delta = Number.parseInt(button.dataset.itemDetailQuantityDelta, 10) || 0;
            await adjustItemQuantity(button.dataset.itemId, delta);
          });
        });
        document.getElementById("edit-item-button").addEventListener("click", () => openItemModal({ itemId: detail.item.id, containerId: detail.item.container_id }));
      }

      function renderSearchStage() {
        els.stageTitle.textContent = "Search";
        els.stageMeta.textContent = state.searchResults.query ? 'Results for "' + state.searchResults.query + '"' : "Search";
        setBreadcrumbs([
          { label: "Places", onClick: () => goToLocations(true) },
          { label: "Search" }
        ]);
        els.stageActions.innerHTML = '<button id="clear-search" class="secondary" type="button">Clear Search</button>';

        const locationResults = state.searchResults.locations.map((location) => (
          '<button class="tile" type="button" data-search-location="' + location.id + '">' +
            '<div class="tile-title">' + escapeHtml(location.name) + '</div>' +
            '<div class="tile-subtitle">Location</div>' +
          '</button>'
        )).join("");
        const containerResults = state.searchResults.containers.map((container) => (
          '<button class="tile" type="button" data-search-container="' + container.id + '">' +
            '<div class="tile-title">' + escapeHtml(container.name) + '</div>' +
            '<div class="tile-subtitle">' + ((container.item_count ?? 0)) + ' item' + ((container.item_count ?? 0) === 1 ? '' : 's') + '</div>' +
          '</button>'
        )).join("");
        const itemResults = state.searchResults.items.map((item) => (
          '<button class="tile" type="button" data-search-item="' + item.id + '">' +
            '<div class="tile-title">' + escapeHtml(item.name) + '</div>' +
            '<div class="tile-subtitle">' + escapeHtml(item.container_name) + ' · Qty ' + item.quantity + '</div>' +
          '</button>'
        )).join("");

        const blocks = [];
        if (locationResults) {
          blocks.push('<div class="section"><div class="section-head"><h3>Locations</h3></div><div class="tile-grid">' + locationResults + '</div></div>');
        }
        if (containerResults) {
          blocks.push('<div class="section"><div class="section-head"><h3>Containers</h3></div><div class="tile-grid">' + containerResults + '</div></div>');
        }
        if (itemResults) {
          blocks.push('<div class="section"><div class="section-head"><h3>Items</h3></div><div class="tile-grid">' + itemResults + '</div></div>');
        }

        els.stageContent.innerHTML = blocks.length
          ? '<div class="stack">' + blocks.join("") + '</div>'
          : '<div class="empty-state"><h3>No matches</h3><div class="mini-note">Try a different search term.</div></div>';

        document.getElementById("clear-search").addEventListener("click", clearSearch);
        els.stageContent.querySelectorAll("[data-search-location]").forEach((button) => {
          button.addEventListener("click", () => {
            clearSearch();
            openLocation(button.dataset.searchLocation);
          });
        });
        els.stageContent.querySelectorAll("[data-search-container]").forEach((button) => {
          button.addEventListener("click", () => {
            clearSearch();
            openContainer(button.dataset.searchContainer, true);
          });
        });
        els.stageContent.querySelectorAll("[data-search-item]").forEach((button) => {
          button.addEventListener("click", async () => {
            clearSearch();
            await openItem(button.dataset.searchItem);
          });
        });
      }

      function clearSearch() {
        if (!state.bootstrap.authenticated) {
          return;
        }
        if (state.searchTimer) {
          clearTimeout(state.searchTimer);
          state.searchTimer = null;
        }
        state.searchResults = null;
        els.searchInput.value = "";
        renderStage();
      }

      function onSearchInput() {
        if (!state.bootstrap.authenticated) {
          return;
        }
        const query = els.searchInput.value.trim();
        if (!query) {
          clearSearch();
          return;
        }
        if (state.searchTimer) {
          clearTimeout(state.searchTimer);
        }
        state.searchTimer = setTimeout(async () => {
          state.searchTimer = null;
          try {
            state.searchResults = await api("/api/search?q=" + encodeURIComponent(query));
            renderStage();
          } catch (error) {
            // The API helper already surfaces the message.
          }
        }, 180);
      }

      async function onSearch(event) {
        event.preventDefault();
        if (!state.bootstrap.authenticated) {
          return;
        }
        const query = els.searchInput.value.trim();
        if (!query) {
          clearSearch();
          return;
        }
        state.searchResults = await api("/api/search?q=" + encodeURIComponent(query));
        renderStage();
      }

      function openLocationModal(location, options = {}) {
        const isEdit = Boolean(location);
        const tagToken = options.tagToken || null;
        const showLabelButton = isEdit && canShowLabelAction(location?.tag_token, location?.tag_source);
        openModal(
          isEdit ? "Edit Location" : "Add Location",
          '<form id="location-modal-form" class="form-grid">' +
            '<label>Name<input name="name" value="' + escapeAttr(location?.name || "") + '" required></label>' +
            '<label>Notes<textarea name="notes">' + escapeHtml(location?.notes || "") + '</textarea></label>' +
            '<div class="button-row">' +
                  (showLabelButton ? '<button id="location-qr-button" class="secondary" type="button">Label</button>' : '') +
              saveActionButton +
            '</div>' +
          '</form>',
          (modal) => {
            if (showLabelButton && location) {
              modal.querySelector("#location-qr-button").addEventListener("click", async () => {
                await openLabelModal({
                  entityType: "location",
                  entityId: location.id,
                  name: location.name,
                  existingToken: location.tag_token || ""
                });
              });
            }
            modal.querySelector("#location-modal-form").addEventListener("submit", async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const url = isEdit ? "/api/locations/" + location.id : "/api/locations";
              const method = isEdit ? "PATCH" : "POST";
              const saved = await api(url, {
                method,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  name: form.get("name"),
                  notes: form.get("notes")
                })
              });
              if (tagToken && !isEdit) {
                await api("/api/tags/" + encodeURIComponent(tagToken), {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    entityType: "location",
                    entityId: saved.id
                  })
                });
              }
              closeModal();
              showMessage(isEdit ? "Location updated." : (tagToken ? "Location created and tag assigned." : "Location created."));
              await refreshAll();
              if (tagToken && !isEdit) {
                state.scanToken = null;
                openLocation(saved.id, false);
              }
            });
          }
        );
      }

      function openContainerModal({ container, defaultLocationId, tagToken = null }) {
        const isEdit = Boolean(container);
        const showLabelButton = isEdit && canShowLabelAction(container?.tag_token, container?.tag_source);
        const selectedLocationId = defaultLocationId ?? container?.location_id ?? null;
        const locationOptions = ['<option value="">No location</option>'].concat(
          state.bootstrap.locations.map((location) => (
            '<option value="' + location.id + '"' + (location.id === selectedLocationId ? ' selected' : '') + '>' + escapeHtml(location.name) + '</option>'
          ))
        ).join("");
        const imageSection =
          '<div class="stack">' +
            '<h3 style="margin:0;">Image</h3>' +
            (container?.image_stored_name
              ? '<div class="photos-grid">' +
                  '<div class="photo-card">' +
                    '<img src="' + getImageUrl(container.image_stored_name, "containers") + '" alt="' + escapeHtml(container.image_file_name || container.name) + '">' +
                    '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(container.image_file_name || container.name) + '</div>' +
                  '</div>' +
                '</div>'
              : '') +
            '<div class="file-picker">' +
              '<input id="container-photo-input" name="photo" type="file" accept="image/*">' +
              '<label id="container-photo-button" for="container-photo-input" class="secondary file-picker-button">' + (container?.image_stored_name ? "Change Image" : "Add Image") + '</label>' +
              '<div id="container-photo-name" class="file-picker-name">' + (container?.image_stored_name ? "Current image is set." : "No image selected.") + '</div>' +
            '</div>' +
          '</div>';

        openModal(
          isEdit ? "Edit Container" : "Add Container",
          '<form id="container-modal-form" class="form-grid">' +
            '<label>Name<input name="name" value="' + escapeAttr(container?.name || "") + '" required></label>' +
            '<label>Location<select name="locationId">' + locationOptions + '</select></label>' +
            '<label>Notes<textarea name="notes">' + escapeHtml(container?.notes || "") + '</textarea></label>' +
            imageSection +
            '<div class="button-row">' +
              (showLabelButton ? '<button id="container-qr-button" class="secondary" type="button">Label</button>' : '') +
              saveActionButton +
            '</div>' +
          '</form>',
          (modal) => {
            if (showLabelButton && container) {
              modal.querySelector("#container-qr-button").addEventListener("click", async () => {
                const current = getContainer(container.id) || container;
                await openLabelModal({
                  entityType: "container",
                  entityId: container.id,
                  name: container.name,
                  existingToken: current.tag_token || ""
                });
              });
            }
            const photoInput = modal.querySelector("#container-photo-input");
            const photoName = modal.querySelector("#container-photo-name");
            const photoButton = modal.querySelector("#container-photo-button");
            if (photoInput && photoName && photoButton) {
              photoInput.addEventListener("change", () => {
                const hasSelection = photoInput.files && photoInput.files[0];
                const selected = hasSelection
                  ? (photoInput.files[0].name + " (will be optimized)")
                  : (container?.image_stored_name ? "Current image is set." : "No image selected.");
                photoName.textContent = selected;
                photoButton.textContent = hasSelection || container?.image_stored_name ? "Change Image" : "Add Image";
              });
            }

            modal.querySelector("#container-modal-form").addEventListener("submit", async (event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              setFormSaving(formElement, true);
              try {
                const form = new FormData(formElement);
                const url = isEdit ? "/api/containers/" + container.id : "/api/containers";
                const method = isEdit ? "PATCH" : "POST";
                const saved = await api(url, {
                  method,
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    name: form.get("name"),
                    locationId: form.get("locationId") || null,
                    notes: form.get("notes")
                  })
                });
                if (tagToken && !isEdit) {
                  await api("/api/tags/" + encodeURIComponent(tagToken), {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      entityType: "container",
                      entityId: saved.id
                    })
                  });
                }
                const selectedPhoto = photoInput && photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
                let photoSaved = false;
                if (selectedPhoto) {
                  try {
                    const optimizedPhoto = await optimizeImageFile(selectedPhoto);
                    await uploadImage("/api/containers/" + saved.id + "/photo", optimizedPhoto);
                    photoSaved = true;
                  } catch (error) {
                    await refreshAll();
                    closeModal();
                    showMessage(isEdit
                      ? "Container saved, but the image upload failed."
                      : "Container created, but the image upload failed.", true);
                    if (saved.id) {
                      await openContainer(saved.id, false);
                    }
                    return;
                  }
                }
                closeModal();
                showMessage(isEdit
                  ? (photoSaved ? "Container and image updated." : "Container updated.")
                  : (tagToken ? "Container created and tag assigned." : "Container created."));
                if (isEdit) {
                  await refreshAll();
                  await openContainer(saved.id, false);
                  return;
                }
                if (tagToken) {
                  state.scanToken = null;
                  await refreshAll();
                  await openContainer(saved.id, false);
                  return;
                }
                state.stage = "containers";
                state.selectedLocationId = saved.location_id || null;
                state.activeContainerId = null;
                state.activeContainerDetail = null;
                state.activeItemId = null;
                state.activeItemDetail = null;
                history.pushState({}, "", "/");
                await refreshAll();
              } finally {
                setFormSaving(formElement, false);
              }
            });
          }
        );
      }

      function openMoveContainerModal(container) {
        const locationOptions = ['<option value="">No location</option>'].concat(
          state.bootstrap.locations.map((location) => (
            '<option value="' + location.id + '"' + (location.id === container.location_id ? ' selected' : '') + '>' + escapeHtml(location.name) + '</option>'
          ))
        ).join("");

        openModal(
          "Move Container",
          '<form id="move-container-modal-form" class="form-grid">' +
            '<label>Move To Location<select name="locationId">' + locationOptions + '</select></label>' +
            '<label>Move Notes<input name="notes" placeholder="optional move note"></label>' +
            '<div class="button-row">' + saveActionButton + '</div>' +
          '</form>',
          (modal) => {
            modal.querySelector("#move-container-modal-form").addEventListener("submit", async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              await api("/api/containers/" + container.id + "/move", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  locationId: form.get("locationId") || null,
                  notes: form.get("notes") || ""
                })
              });
              closeModal();
              showMessage("Container moved.");
              await refreshAll();
              await openContainer(container.id, false);
            });
          }
        );
      }

      async function openItemModal({ itemId, containerId, tagToken = null }) {
        let existing = state.activeItemDetail?.item?.id === itemId ? state.activeItemDetail : null;
        let item = existing?.item || (itemId ? getItem(itemId) : null);
        if (itemId && !item) {
          existing = await api("/api/items/" + itemId);
          item = existing?.item;
        }
        const returnToContainerAfterSave = Boolean(item && state.stage === "container" && state.activeContainerId);
        const selectedContainerId = item?.container_id || containerId || state.activeContainerId || "";
        const lockContainer = !item && Boolean(selectedContainerId);
        const selectedContainer = selectedContainerId ? getContainer(selectedContainerId) : null;
        const containerOptions = state.bootstrap.containers.map((container) => (
          '<option value="' + container.id + '"' + (container.id === selectedContainerId ? ' selected' : '') + '>' + escapeHtml(container.name) + '</option>'
        )).join("");
        const containerField = lockContainer
          ? '<input name="containerId" type="hidden" value="' + escapeAttr(selectedContainerId) + '"><div class="mini-note">Saving into <strong>' + escapeHtml(selectedContainer?.name || "this container") + '</strong>.</div>'
          : '<label>Container<select name="containerId">' + containerOptions + '</select></label>';
        let existingPhoto = existing?.photos?.[0] || null;
        let resolvedTag = existing?.tag || null;
        const renderPhotoPreview = () => (
          existingPhoto
            ? '<div class="item-modal-preview">' +
                '<img src="' + getImageUrl(existingPhoto.stored_name, "items") + '" alt="' + escapeHtml(existingPhoto.file_name || item?.name || "Item photo") + '">' +
                '<div class="mini-note">' + escapeHtml(existingPhoto.file_name || "Current image is set.") + '</div>' +
              '</div>'
            : '<div class="mini-note">Add a photo to make this item easier to spot.</div>'
        );
        const canShowItemLabel = () => item && canShowLabelAction(resolvedTag?.token || item?.tag_token, resolvedTag?.source || item?.tag_source);

        openModal(
          item ? "Edit Item" : "Add Item",
          '<form id="item-modal-form" class="form-grid">' +
            '<div class="item-modal-layout">' +
              '<div class="item-modal-topline">' +
                '<label>Name<input name="name" value="' + escapeAttr(item?.name || "") + '" required></label>' +
                '<div class="item-modal-section">' +
                  '<h3>Quantity</h3>' +
                  '<label class="quantity-field">' +
                    '<div class="quantity-stepper">' +
                      '<button class="step-button minus" type="button" data-step="-1" aria-label="Decrease quantity">' + minusIconMarkup + '</button>' +
                      '<input name="quantity" type="number" min="1" value="' + (item?.quantity || 1) + '" required>' +
                      '<button class="step-button plus" type="button" data-step="1" aria-label="Increase quantity">' + plusIconMarkup + '</button>' +
                    '</div>' +
                  '</label>' +
                '</div>' +
              '</div>' +
              '<div class="item-modal-secondary">' +
                '<div class="item-modal-section">' +
                  '<h3>Details</h3>' +
                  '<div class="stack">' +
                    containerField +
                    '<label>Notes<textarea name="notes">' + escapeHtml(item?.notes || "") + '</textarea></label>' +
                  '</div>' +
                '</div>' +
                '<div class="item-modal-section">' +
                  '<h3>Image</h3>' +
                  '<div id="item-photo-preview-slot">' + renderPhotoPreview() + '</div>' +
                  '<div class="file-picker">' +
                    '<input id="item-photo-input" name="photo" type="file" accept="image/*">' +
                    '<label id="item-photo-button" for="item-photo-input" class="secondary file-picker-button">' + (existingPhoto ? "Change Image" : "Add Image") + '</label>' +
                    '<div id="item-photo-name" class="file-picker-name">' + (existingPhoto ? "Current image is set." : "No image selected.") + '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="item-modal-actions">' +
                '<div id="item-label-slot">' + (canShowItemLabel() ? '<button id="item-qr-button" class="secondary" type="button">Label</button>' : '') + '</div>' +
                saveActionButton +
              '</div>' +
            '</div>' +
          '</form>',
          (modal) => {
            const labelSlot = modal.querySelector("#item-label-slot");
            const photoPreviewSlot = modal.querySelector("#item-photo-preview-slot");
            const photoInput = modal.querySelector("#item-photo-input");
            const photoName = modal.querySelector("#item-photo-name");
            const photoButton = modal.querySelector("#item-photo-button");
            const syncPhotoUi = () => {
              const hasSelection = photoInput && photoInput.files && photoInput.files[0];
              const selected = hasSelection
                ? (photoInput.files[0].name + " (will be optimized)")
                : (existingPhoto ? "Current image is set." : "No image selected.");
              if (photoName) {
                photoName.textContent = selected;
              }
              if (photoButton) {
                photoButton.textContent = hasSelection || existingPhoto ? "Change Image" : "Add Image";
              }
              if (!hasSelection && photoPreviewSlot) {
                photoPreviewSlot.innerHTML = renderPhotoPreview();
              }
            };
            const bindLabelButton = () => {
              const button = modal.querySelector("#item-qr-button");
              if (!button || button.dataset.bound === "true" || !item) {
                return;
              }
              button.dataset.bound = "true";
              button.addEventListener("click", async () => {
                await openLabelModal({
                  entityType: "item",
                  entityId: item.id,
                  name: item.name,
                  existingToken: resolvedTag?.token || ""
                });
              });
            };
            const refreshLabelSlot = () => {
              if (!labelSlot) {
                return;
              }
              labelSlot.innerHTML = canShowItemLabel()
                ? '<button id="item-qr-button" class="secondary" type="button">Label</button>'
                : '';
              bindLabelButton();
            };
            refreshLabelSlot();
            const quantityInput = modal.querySelector('input[name="quantity"]');
            modal.querySelectorAll("[data-step]").forEach((button) => {
              button.addEventListener("click", () => {
                const delta = Number.parseInt(button.dataset.step, 10) || 0;
                const current = Number.parseInt(quantityInput.value || "1", 10) || 1;
                quantityInput.value = String(Math.max(1, current + delta));
                quantityInput.dispatchEvent(new Event("input", { bubbles: true }));
              });
            });
            if (photoInput && photoName && photoButton) {
              photoInput.addEventListener("change", syncPhotoUi);
            }
            syncPhotoUi();
            if (itemId && !existing) {
              (async () => {
                try {
                  const fetched = await api("/api/items/" + itemId);
                  if (els.modalRoot.hidden || !modal.isConnected) {
                    return;
                  }
                  existing = fetched;
                  item = fetched?.item || item;
                  existingPhoto = fetched?.photos?.[0] || null;
                  resolvedTag = fetched?.tag || resolvedTag;
                  syncPhotoUi();
                  refreshLabelSlot();
                } catch (error) {
                  // Keep the fast modal open even if the detail enrichment fails.
                }
              })();
            }

            modal.querySelector("#item-modal-form").addEventListener("submit", async (event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              setFormSaving(formElement, true);
              try {
                const form = new FormData(formElement);
                const url = item ? "/api/items/" + item.id : "/api/items";
                const method = item ? "PATCH" : "POST";
                const saved = await api(url, {
                  method,
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    name: form.get("name"),
                    containerId: form.get("containerId"),
                    quantity: form.get("quantity"),
                    notes: form.get("notes")
                  })
                });
                if (tagToken && !item) {
                  await api("/api/tags/" + encodeURIComponent(tagToken), {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      entityType: "item",
                      entityId: saved.id
                    })
                  });
                }
                const selectedPhoto = photoInput && photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
                let photoSaved = false;
                if (selectedPhoto) {
                  try {
                    const optimizedPhoto = await optimizeImageFile(selectedPhoto);
                    await uploadImage("/api/items/" + saved.id + "/photos", optimizedPhoto);
                    photoSaved = true;
                  } catch (error) {
                    await refreshAll();
                    closeModal();
                    showMessage(item
                      ? "Item saved, but the image upload failed."
                      : "Item created, but the image upload failed.", true);
                    if (item) {
                      if (returnToContainerAfterSave) {
                        await openContainer(saved.container_id || form.get("containerId"), false);
                      } else {
                        await openItem(saved.id || item.id);
                      }
                    } else {
                      await openContainer(saved.container_id || form.get("containerId"), false);
                    }
                    return;
                  }
                }
                closeModal();
                showMessage(item
                  ? (photoSaved ? "Item and image updated." : "Item updated.")
                  : (tagToken ? "Item created and tag assigned." : "Item created."));
                await refreshAll();
                if (item) {
                  if (returnToContainerAfterSave) {
                    await openContainer(saved.container_id || form.get("containerId"), false);
                  } else {
                    await openItem(saved.id || item.id);
                  }
                } else {
                  state.scanToken = null;
                  await openContainer(saved.container_id || form.get("containerId"), false);
                }
              } finally {
                setFormSaving(formElement, false);
              }
            });
          }
        );
      }

      function openDeleteLocationModal(location) {
        openConfirmModal("Delete Location", 'Delete <strong>' + escapeHtml(location.name) + '</strong>? This only works if no containers are assigned to it.', async () => {
          await api("/api/locations/" + location.id, { method: "DELETE" });
          showMessage("Location deleted.");
          await refreshAll();
          goToLocations(false);
        });
      }

      function openLocationActionSheet(location) {
        openActionCompass(location.name, {
          top: {
            label: "Edit",
            icon: compassEditIconMarkup,
            run: async () => {
              openLocationModal(location);
            }
          },
          bottom: {
            label: "Delete",
            icon: deleteIconMarkup,
            danger: true,
            run: async () => {
              openDeleteLocationModal(location);
            }
          }
        }, { requireRelease: true });
      }

      function openDeleteContainerModal(container) {
        openConfirmModal("Delete Container", 'Delete <strong>' + escapeHtml(container.name) + '</strong>? Items and photos inside it will also be deleted.', async () => {
          await api("/api/containers/" + container.id, { method: "DELETE" });
          showMessage("Container deleted.");
          await refreshAll();
          openLocation(container.location_id || null);
        });
      }

      function openContainerActionSheet(container) {
        openActionCompass(container.name, {
          top: {
            label: "Edit",
            icon: compassEditIconMarkup,
            run: async () => {
              openContainerModal({ container, defaultLocationId: container.location_id || null });
            }
          },
          left: {
            label: "History",
            icon: historyIconMarkup,
            run: async () => {
              const freshDetail = await api("/api/containers/" + container.id);
              state.activeContainerDetail = freshDetail;
              openContainerHistoryModal(freshDetail);
            }
          },
          right: {
            label: "Move",
            icon: moveIconMarkup,
            run: async () => {
              openMoveContainerModal(container);
            }
          },
          bottom: {
            label: "Delete",
            icon: deleteIconMarkup,
            danger: true,
            run: async () => {
              openDeleteContainerModal(container);
            }
          }
        }, { requireRelease: true });
      }

      function openDeleteItemModal(itemId) {
        openConfirmModal("Delete Item", "Delete this item and its photos?", async () => {
          await api("/api/items/" + itemId, { method: "DELETE" });
          showMessage("Item deleted.");
          await refreshAll();
          if (state.activeContainerId) {
            await openContainer(state.activeContainerId, false);
          } else {
            goToLocations(false);
          }
        });
      }

      function openMoveItemModal(item) {
        const containerOptions = state.bootstrap.containers
          .filter((container) => container.id !== item.container_id)
          .map((container) => (
            '<option value="' + container.id + '">' + escapeHtml(container.name) + '</option>'
          )).join("");

        if (!containerOptions) {
          showMessage("Create another container before moving this item.", true);
          return;
        }

        openModal(
          "Move Item",
          '<form id="move-item-modal-form" class="form-grid">' +
            '<label>Move To Container<select name="containerId">' + containerOptions + '</select></label>' +
            '<label>Move Notes<input name="notes" placeholder="optional move note"></label>' +
            '<div class="button-row">' + saveActionButton + '</div>' +
          '</form>',
          (modal) => {
            modal.querySelector("#move-item-modal-form").addEventListener("submit", async (event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              setFormSaving(formElement, true);
              try {
                const form = new FormData(formElement);
                const destinationId = String(form.get("containerId") || "").trim();
                await api("/api/items/" + item.id + "/move", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    containerId: destinationId,
                    notes: form.get("notes") || ""
                  })
                });
                const bootstrapItem = getItem(item.id);
                if (bootstrapItem) {
                  bootstrapItem.container_id = destinationId || null;
                }
                closeModal();
                showMessage("Item moved.");
                if (destinationId) {
                  await openContainer(destinationId, false);
                }
                refreshAll().catch(() => {});
              } finally {
                setFormSaving(formElement, false);
              }
            });
          }
        );
      }

      function openItemActionSheet(item) {
        openActionCompass(item.name, {
          top: {
            label: "Edit",
            icon: compassEditIconMarkup,
            run: async () => {
              await openItemModal({ itemId: item.id, containerId: item.container_id });
            }
          },
          left: {
            label: "History",
            icon: historyIconMarkup,
            run: async () => {
              const freshDetail = await api("/api/items/" + item.id);
              state.activeItemDetail = freshDetail;
              openItemHistoryModal(freshDetail);
            }
          },
          right: {
            label: "Move",
            icon: moveIconMarkup,
            run: async () => {
              openMoveItemModal(item);
            }
          },
          bottom: {
            label: "Delete",
            icon: deleteIconMarkup,
            danger: true,
            run: async () => {
              openDeleteItemModal(item.id);
            }
          }
        }, { requireRelease: true });
      }

      async function adjustItemQuantity(itemId, delta) {
        if (!delta) {
          return;
        }
        const containerItem = state.activeContainerDetail?.items?.find((entry) => entry.id === itemId) || null;
        const detailItem = state.activeItemDetail?.item?.id === itemId ? state.activeItemDetail.item : null;
        const item = containerItem || detailItem;
        if (!item) {
          return;
        }
        const nextQuantity = Math.max(1, Number(item.quantity || 1) + delta);
        if (nextQuantity === item.quantity) {
          return;
        }

        const previousContainerItems = state.activeContainerDetail?.items
          ? state.activeContainerDetail.items.map((entry) => ({ ...entry }))
          : null;
        const previousActiveItemDetail = state.activeItemDetail
          ? {
              ...state.activeItemDetail,
              item: state.activeItemDetail.item
                ? { ...state.activeItemDetail.item }
                : state.activeItemDetail.item
            }
          : null;
        const previousBootstrapItems = Array.isArray(state.bootstrap?.items)
          ? state.bootstrap.items.map((entry) => ({ ...entry }))
          : null;

        if (state.activeContainerDetail?.items) {
          state.activeContainerDetail.items = state.activeContainerDetail.items.map((entry) => (
            entry.id === itemId
              ? { ...entry, quantity: nextQuantity }
              : entry
          ));
        }
        if (state.activeItemDetail?.item?.id === itemId) {
          state.activeItemDetail = {
            ...state.activeItemDetail,
            item: {
              ...state.activeItemDetail.item,
              quantity: nextQuantity
            }
          };
        }
        if (Array.isArray(state.bootstrap?.items)) {
          state.bootstrap.items = state.bootstrap.items.map((entry) => (
            entry.id === itemId
              ? { ...entry, quantity: nextQuantity }
              : entry
          ));
        }

        const containerQuantityValue = els.stageContent.querySelector('[data-item-quantity-value="' + itemId + '"]');
        if (containerQuantityValue) {
          containerQuantityValue.textContent = String(nextQuantity);
        }
        const itemDetailQuantityValue = els.stageContent.querySelector(".hero-count.item-quantity-display");
        if (!containerQuantityValue && itemDetailQuantityValue && state.activeItemDetail?.item?.id === itemId) {
          itemDetailQuantityValue.textContent = String(nextQuantity);
        }

        try {
          await api("/api/items/" + itemId, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              containerId: item.container_id,
              quantity: nextQuantity,
              notes: item.notes || ""
            })
          });
          if (state.activeItemDetail?.item?.id === itemId) {
            state.activeItemDetail = await api("/api/items/" + itemId);
          }
        } catch (error) {
          if (previousContainerItems) {
            state.activeContainerDetail.items = previousContainerItems;
          }
          if (previousActiveItemDetail) {
            state.activeItemDetail = previousActiveItemDetail;
          }
          if (previousBootstrapItems) {
            state.bootstrap.items = previousBootstrapItems;
          }
          if (previousContainerItems) {
            const restoredContainerItem = previousContainerItems.find((entry) => entry.id === itemId);
            const containerQuantityValueAfterError = els.stageContent.querySelector('[data-item-quantity-value="' + itemId + '"]');
            if (restoredContainerItem && containerQuantityValueAfterError) {
              containerQuantityValueAfterError.textContent = String(restoredContainerItem.quantity);
            }
          }
          if (previousActiveItemDetail?.item?.id === itemId) {
            const itemDetailQuantityValueAfterError = els.stageContent.querySelector(".hero-count.item-quantity-display");
            if (itemDetailQuantityValueAfterError) {
              itemDetailQuantityValueAfterError.textContent = String(previousActiveItemDetail.item.quantity);
            }
          }
        }
      }

      function openContainerHistoryModal(detail) {
        const createdEntry =
          '<div class="photo-card">' +
            '<div class="item-name" style="font-size:1.2rem;">Created</div>' +
            '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(formatDateTime(detail.container.created_at)) + '</div>' +
          '</div>';

        const historyEntries = [
          ...(detail.moveLog || []).map((entry) => {
            const fromName = entry.from_location_name || "Unassigned";
            const toName = entry.to_location_name || "Unassigned";
            return {
              id: "move-" + entry.id,
              timestamp: entry.moved_at,
              html:
                '<div class="photo-card">' +
                  '<div class="item-name" style="font-size:1.2rem;">Moved</div>' +
                  '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(fromName + " -> " + toName) + '</div>' +
                  '<div class="mini-note" style="margin-top:6px;">' + escapeHtml(formatDateTime(entry.moved_at)) + '</div>' +
                  (entry.notes ? '<div class="mini-note" style="margin-top:10px;">' + escapeHtml(entry.notes) + '</div>' : '') +
                '</div>'
            };
          }),
          ...(detail.eventLog || []).map((entry) => {
            if (entry.event_type === "renamed") {
              return {
                id: "event-" + entry.id,
                timestamp: entry.created_at,
                html:
                  '<div class="photo-card">' +
                    '<div class="item-name" style="font-size:1.2rem;">Renamed</div>' +
                    '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(entry.from_text + " -> " + entry.to_text) + '</div>' +
                    '<div class="mini-note" style="margin-top:6px;">' + escapeHtml(formatDateTime(entry.created_at)) + '</div>' +
                    (entry.notes ? '<div class="mini-note" style="margin-top:10px;">' + escapeHtml(entry.notes) + '</div>' : '') +
                  '</div>'
              };
            }

            const imageLabel = entry.from_text
              ? "Image Changed"
              : "Image Added";
            const imageDetail = entry.from_text
              ? entry.from_text + " -> " + entry.to_text
              : entry.to_text;
            return {
              id: "event-" + entry.id,
              timestamp: entry.created_at,
              html:
                '<div class="photo-card">' +
                  '<div class="item-name" style="font-size:1.2rem;">' + escapeHtml(imageLabel) + '</div>' +
                  '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(imageDetail) + '</div>' +
                  '<div class="mini-note" style="margin-top:6px;">' + escapeHtml(formatDateTime(entry.created_at)) + '</div>' +
                  (entry.notes ? '<div class="mini-note" style="margin-top:10px;">' + escapeHtml(entry.notes) + '</div>' : '') +
                '</div>'
            };
          }),
          ...(detail.itemActivity || [])
            .filter((entry) => entry.action_type !== "quantity_changed")
            .map((entry) => ({
            id: "item-activity-" + entry.id,
            timestamp: entry.created_at,
            html:
              '<div class="photo-card">' +
                '<div class="item-name" style="font-size:1.2rem;">' + escapeHtml(entry.action_type === "item_added" ? "Item Added" : "Item Removed") + '</div>' +
                '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(entry.item_name || "Unknown item") + '</div>' +
                '<div class="mini-note" style="margin-top:6px;">' + escapeHtml(formatDateTime(entry.created_at)) + '</div>' +
                (entry.notes ? '<div class="mini-note" style="margin-top:10px;">' + escapeHtml(entry.notes) + '</div>' : '') +
              '</div>'
          }))
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const activityHtml = historyEntries.length
          ? historyEntries.map((entry) => entry.html).join("")
          : '<div class="empty-state"><h3>No history yet</h3><div class="mini-note">This container has not had any moves or item changes since it was created.</div></div>';

        openModal(
          "Container History",
          '<div class="stack">' +
            createdEntry +
            activityHtml +
          '</div>'
        );
      }

      function openItemHistoryModal(detail) {
        const createdEntry =
          '<div class="photo-card">' +
            '<div class="item-name" style="font-size:1.2rem;">Created</div>' +
            '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(formatDateTime(detail.item.created_at)) + '</div>' +
          '</div>';

        const historyEntries = [
          ...(detail.moveLog || []).map((entry) => {
            const fromName = entry.from_container_name || "Unknown";
            const toName = entry.to_container_name || "Unknown";
            return {
              id: "move-" + entry.id,
              timestamp: entry.moved_at,
              html:
                '<div class="photo-card">' +
                  '<div class="item-name" style="font-size:1.2rem;">Moved</div>' +
                  '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(fromName + " -> " + toName) + '</div>' +
                  '<div class="mini-note" style="margin-top:6px;">' + escapeHtml(formatDateTime(entry.moved_at)) + '</div>' +
                  (entry.notes ? '<div class="mini-note" style="margin-top:10px;">' + escapeHtml(entry.notes) + '</div>' : '') +
                '</div>'
            };
          }),
          ...(detail.quantityLog || []).map((entry) => ({
            id: "quantity-" + entry.id,
            timestamp: entry.created_at,
            html:
              '<div class="photo-card">' +
                '<div class="item-name" style="font-size:1.2rem;">Quantity Changed</div>' +
                '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(String(entry.from_quantity) + " -> " + String(entry.to_quantity)) + '</div>' +
                '<div class="mini-note" style="margin-top:6px;">' + escapeHtml(formatDateTime(entry.created_at)) + '</div>' +
                (entry.notes ? '<div class="mini-note" style="margin-top:10px;">' + escapeHtml(entry.notes) + '</div>' : '') +
              '</div>'
          })),
          ...(detail.eventLog || []).map((entry) => {
            if (entry.event_type === "renamed") {
              return {
                id: "event-" + entry.id,
                timestamp: entry.created_at,
                html:
                  '<div class="photo-card">' +
                    '<div class="item-name" style="font-size:1.2rem;">Renamed</div>' +
                    '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(entry.from_text + " -> " + entry.to_text) + '</div>' +
                    '<div class="mini-note" style="margin-top:6px;">' + escapeHtml(formatDateTime(entry.created_at)) + '</div>' +
                    (entry.notes ? '<div class="mini-note" style="margin-top:10px;">' + escapeHtml(entry.notes) + '</div>' : '') +
                  '</div>'
              };
            }

            const imageLabel = entry.from_text
              ? "Image Changed"
              : "Image Added";
            const imageDetail = entry.from_text
              ? entry.from_text + " -> " + entry.to_text
              : entry.to_text;
            return {
              id: "event-" + entry.id,
              timestamp: entry.created_at,
              html:
                '<div class="photo-card">' +
                  '<div class="item-name" style="font-size:1.2rem;">' + escapeHtml(imageLabel) + '</div>' +
                  '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(imageDetail) + '</div>' +
                  '<div class="mini-note" style="margin-top:6px;">' + escapeHtml(formatDateTime(entry.created_at)) + '</div>' +
                  (entry.notes ? '<div class="mini-note" style="margin-top:10px;">' + escapeHtml(entry.notes) + '</div>' : '') +
                '</div>'
            };
          })
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const activityHtml = historyEntries.length
          ? historyEntries.map((entry) => entry.html).join("")
          : '<div class="empty-state"><h3>No history yet</h3><div class="mini-note">This item has not been moved or changed since it was created.</div></div>';

        openModal(
          "Item History",
          '<div class="stack">' +
            createdEntry +
            activityHtml +
          '</div>'
        );
      }

      function openModal(title, contentHtml, setup, options = {}) {
        const showCloseButton = options.showCloseButton !== false;
        els.modalRoot.hidden = false;
        els.modalRoot.innerHTML =
          '<div class="modal-backdrop">' +
            '<div class="modal-shell">' +
              '<div class="modal-header">' +
                '<div><h2>' + title + '</h2></div>' +
                (showCloseButton ? '<button class="close-button" type="button" data-close-modal>Close</button>' : '') +
              '</div>' +
              '<div class="modal-body">' + contentHtml + '</div>' +
            '</div>' +
          '</div>';
        els.modalRoot.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
        els.modalRoot.querySelector(".modal-backdrop").addEventListener("click", (event) => {
          if (event.target === event.currentTarget) {
            closeModal();
          }
        });
        if (setup) {
          setup(els.modalRoot);
        }
      }

      function openConfirmModal(title, bodyHtml, onConfirm) {
        openModal(
          title,
          '<div class="stack">' +
            '<div class="muted">' + bodyHtml + '</div>' +
            '<div class="button-row">' +
              '<button id="confirm-modal-button" class="danger" type="button">Delete</button>' +
              '<button class="secondary" type="button" data-close-modal>Cancel</button>' +
            '</div>' +
          '</div>',
          (modal) => {
            modal.querySelector("#confirm-modal-button").addEventListener("click", async () => {
              await onConfirm();
              closeModal();
            });
          },
          { showCloseButton: false }
        );
      }

      function closeModal() {
        els.modalRoot.hidden = true;
        els.modalRoot.innerHTML = "";
      }

      function setFormSaving(form, isSaving) {
        if (!form) {
          return;
        }
        const saveButton = form.querySelector('.save-icon[type="submit"]');
        if (!saveButton) {
          return;
        }
        saveButton.disabled = isSaving;
        saveButton.classList.toggle("is-saving", isSaving);
        saveButton.setAttribute("aria-busy", isSaving ? "true" : "false");
        saveButton.setAttribute("title", isSaving ? "Saving..." : "Save");
        saveButton.innerHTML = isSaving ? "..." : "&#10003;";
      }

      async function api(url, options) {
        const response = await fetch(url, { cache: "no-store", ...(options || {}) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 401) {
            state.bootstrap = { authenticated: false };
            state.selectedLocationId = null;
            state.activeContainerId = null;
            state.activeContainerDetail = null;
            state.activeItemId = null;
            state.activeItemDetail = null;
            state.searchResults = null;
            renderOverview();
            renderStage();
          }
          showMessage(body.error || "Request failed", true);
          throw new Error(body.error || "Request failed");
        }
        return body;
      }

      async function logout() {
        await api("/api/auth/logout", { method: "POST" });
        state.bootstrap = { authenticated: false };
        state.selectedLocationId = null;
        state.activeContainerId = null;
        state.activeContainerDetail = null;
        state.activeItemId = null;
        state.activeItemDetail = null;
        state.searchResults = null;
        history.pushState({}, "", "/");
        renderOverview();
        renderStage();
        showMessage("Signed out.");
      }

      function showMessage(message, isError = false) {
        els.message.innerHTML = '<div class="notice' + (isError ? ' error' : '') + '">' + escapeHtml(message) + '</div>';
        if (state.messageTimer) {
          clearTimeout(state.messageTimer);
        }
        state.messageTimer = setTimeout(() => {
          els.message.innerHTML = "";
          state.messageTimer = null;
        }, isError ? 5000 : 3200);
      }

      function showFatalError(error) {
        const rawMessage = error && typeof error === "object"
          ? (error.stack || error.message || String(error))
          : String(error || "The page hit an unexpected error.");
        const message = rawMessage.trim() || "The page hit an unexpected error.";
        console.error(error);
        els.message.innerHTML =
          '<div class="notice error">' +
            '<strong>Page Error:</strong> ' + escapeHtml(message) +
          '</div>';
      }

      function escapeHtml(value) {
        return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
      }

      function escapeAttr(value) {
        return escapeHtml(value).split(String.fromCharCode(96)).join("&#96;");
      }

      function formatDateTime(value) {
        if (!value) {
          return "";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return String(value);
        }
        return date.toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        });
      }
    