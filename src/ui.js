export function renderApp(initialContainerId) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>TethrArca</title>
    <style>
      :root { --bg:#e4ebf3; --bg-deep:#cfd9e6; --panel:#fbfdff; --panel-soft:#eef4fb; --panel-strong:#e2ebf6; --ink:#18202b; --muted:#5f6b7b; --accent:#16508c; --accent-soft:#dfeafb; --accent-strong:#123a64; --teal:#0f6d73; --teal-soft:#d8f0f0; --gold:#b07d1f; --gold-soft:#f8ebc7; --rose:#9f4f6f; --rose-soft:#f4dfeb; --line:rgba(24,32,43,.09); --line-strong:rgba(24,32,43,.16); --danger:#8d3a31; --danger-soft:#f1ddd9; --shadow:0 28px 68px rgba(20,38,64,.14); --shadow-soft:0 14px 28px rgba(20,38,64,.10); --heading-font:"Iowan Old Style","Palatino Linotype","Book Antiqua",Palatino,Georgia,serif; --body-font:"Aptos","Segoe UI","Trebuchet MS",sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; font-family:var(--body-font); color:var(--ink); background:
        radial-gradient(circle at top left, rgba(15,109,115,.18), transparent 22%),
        radial-gradient(circle at top center, rgba(176,125,31,.15), transparent 24%),
        radial-gradient(circle at top right, rgba(22,80,140,.18), transparent 24%),
        linear-gradient(180deg, #f5f9ff 0%, #e9f0f8 34%, var(--bg) 70%, var(--bg-deep) 100%); }
      a { color:var(--accent); text-decoration:none; }
      img { width:100%; border-radius:16px; display:block; }
      .shell { max-width:1240px; margin:0 auto; padding:40px 28px 44px; display:grid; gap:24px; }
      .topbar,.panel,.modal-shell { background:
        linear-gradient(180deg, rgba(252,253,255,.98) 0%, rgba(246,249,253,.97) 100%);
        border:1px solid rgba(255,255,255,.65);
        border-radius:24px;
        box-shadow:var(--shadow), inset 0 1px 0 rgba(255,255,255,.72);
        backdrop-filter:blur(14px); }
      .topbar,.stage-head,.modal-header,.item-row-header,.button-row { display:flex; gap:12px; align-items:center; justify-content:space-between; }
      .topbar { padding:24px 28px; flex-wrap:wrap; }
      .brand { display:grid; gap:4px; }
      .brand h1 { margin:0; font-family:var(--heading-font); font-size:clamp(2.3rem,4vw,3.3rem); line-height:.95; letter-spacing:-.06em; font-weight:700; }
      .brand p,.meta,.muted,.mini-note { color:var(--muted); }
      .button-row,.topbar-nav { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .button-row { justify-content:flex-end; }
      .button-row > *, .topbar-nav > * { width:auto; }
      .topbar-nav .action-cluster { background:rgba(255,255,255,.56); box-shadow:0 10px 22px rgba(22,80,140,.08), inset 0 1px 0 rgba(255,255,255,.72); flex-wrap:nowrap; }
      .topbar-nav .action-cluster > * { width:auto; flex:0 0 auto; }
      .session-badge { display:grid; gap:2px; padding:10px 16px; border-radius:18px; background:rgba(255,255,255,.62); box-shadow:inset 0 1px 0 rgba(255,255,255,.72); min-width:0; text-align:left; }
      button.session-badge { border:0; color:var(--ink); cursor:pointer; background:rgba(255,255,255,.62); box-shadow:inset 0 1px 0 rgba(255,255,255,.72); }
      button.session-badge:hover { transform:translateY(-1px); box-shadow:0 8px 18px rgba(22,80,140,.10), inset 0 1px 0 rgba(255,255,255,.72); }
      .session-name { font-weight:700; color:var(--ink); line-height:1.1; }
      .session-email { color:var(--muted); font-size:.88rem; line-height:1.1; }
      .searchbar { flex:1 1 380px; max-width:440px; }
      .searchbar input { width:100%; }
      .panel { padding:28px; }
      .stage-shell,.stack,.tile-grid,.form-grid,.contents-grid,.photos-grid { display:grid; gap:16px; }
      .stage-head { align-items:flex-start; padding:0 2px 18px; border-bottom:1px solid rgba(24,32,42,.08); }
      .stage-head h2,.modal-header h2 { margin:0; letter-spacing:-.04em; font-family:var(--heading-font); }
      .stage-head h2 { font-size:clamp(2.2rem,3.4vw,3rem); line-height:.96; }
      .stage-meta { font-size:1rem; color:var(--muted); margin-top:6px; }
      .stage-meta:empty { display:none; }
      .stage-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:flex-end; }
      .empty-state { padding:56px 26px; border:1px dashed rgba(22,80,140,.18); border-radius:24px; text-align:center; background:linear-gradient(180deg,#f8fbff 0%,#e6eef8 100%); }
      .empty-state h3 { margin:0 0 8px; font-size:1.25rem; letter-spacing:-.02em; }
      .tile-grid { grid-template-columns:repeat(auto-fill,minmax(200px,240px)); gap:18px; align-items:stretch; justify-content:start; }
      .tile { width:100%; text-align:left; padding:24px; border:1px solid rgba(24,62,99,.07); border-radius:26px; background:
        linear-gradient(180deg, rgba(253,254,255,.98) 0%, rgba(240,245,251,.96) 100%);
        color:var(--ink); display:grid; gap:10px; box-shadow:var(--shadow-soft), inset 0 1px 0 rgba(255,255,255,.7); transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
      .tile:hover { transform:translateY(-3px); border-color:rgba(24,62,99,.18); box-shadow:0 22px 36px rgba(27,42,63,.12); }
      .tile.active { border-color:rgba(24,62,99,.24); background:linear-gradient(180deg, #f8fbff 0%, #eaf1f8 100%); box-shadow:0 20px 34px rgba(24,62,99,.11); }
      .tile.location-tone-1 { background:linear-gradient(180deg, #f8fbff 0%, #dce9fb 100%); border-color:rgba(22,80,140,.18); }
      .tile.location-tone-2 { background:linear-gradient(180deg, #f6fcfc 0%, #d9efef 100%); border-color:rgba(15,109,115,.18); }
      .tile.location-tone-3 { background:linear-gradient(180deg, #fffdf7 0%, #f6e7bf 100%); border-color:rgba(176,125,31,.18); }
      .tile.location-tone-4 { background:linear-gradient(180deg, #fefafd 0%, #eed8e6 100%); border-color:rgba(159,79,111,.18); }
      .tile.container-tone-1 { background:linear-gradient(180deg, #f8fbff 0%, #e0ebfb 100%); border-color:rgba(22,80,140,.15); }
      .tile.container-tone-2 { background:linear-gradient(180deg, #f7fcfc 0%, #dff0f0 100%); border-color:rgba(15,109,115,.15); }
      .tile.container-tone-3 { background:linear-gradient(180deg, #fffdf8 0%, #f5e6c8 100%); border-color:rgba(176,125,31,.16); }
      .tile-card { position:relative; padding:0; overflow:hidden; min-height:210px; }
      .tile-open { width:100%; min-height:210px; text-align:left; padding:28px 76px 26px 26px; border:0; border-radius:26px; background:transparent; color:inherit; display:grid; align-content:space-between; gap:12px; box-shadow:none; }
      .tile-open:hover { transform:none; box-shadow:none; }
      .tile-thumb { width:100%; aspect-ratio:1.15 / 1; border-radius:18px; overflow:hidden; border:1px solid rgba(24,62,99,.10); background:rgba(255,255,255,.55); box-shadow:0 8px 16px rgba(27,42,63,.08); }
      .tile-thumb img { width:100%; height:100%; object-fit:cover; }
      .tile-delete { position:absolute; top:18px; right:18px; width:42px; height:42px; padding:0; border-radius:999px; display:grid; place-items:center; background:linear-gradient(180deg, #a54a3c 0%, #873427 100%); color:#fff; box-shadow:0 8px 16px rgba(143,60,47,.18); z-index:1; }
      .tile-delete svg { width:18px; height:18px; display:block; stroke:currentColor; stroke-width:3.6; stroke-linecap:round; }
      .tile-delete:hover { transform:none; box-shadow:0 12px 24px rgba(159,67,51,.24); }
      .tile-title { font-family:var(--heading-font); font-size:1.9rem; line-height:.98; font-weight:700; letter-spacing:-.06em; }
      .tile-subtitle { font-size:.98rem; color:var(--muted); font-weight:600; }
      .hero { border:1px solid rgba(24,62,99,.08); border-radius:24px; background:linear-gradient(135deg, rgba(253,254,255,.99) 0%, rgba(235,242,249,.98) 100%); padding:36px 32px; display:grid; gap:24px; box-shadow:var(--shadow-soft), inset 0 1px 0 rgba(255,255,255,.72); }
      .hero-top { display:flex; justify-content:flex-end; }
      .action-cluster { display:inline-flex; gap:10px; align-items:center; padding:8px; border-radius:999px; background:rgba(255,255,255,.42); box-shadow:inset 0 1px 0 rgba(255,255,255,.55); }
      .hero-actions { display:flex; gap:10px; align-items:center; justify-content:flex-end; }
      .hero-title { display:grid; gap:8px; justify-items:center; text-align:center; }
      .hero-title h3 { margin:0; font-family:var(--heading-font); font-size:clamp(3.3rem,6vw,4.9rem); line-height:.9; letter-spacing:-.075em; }
      .hero-count { font-size:1.02rem; color:var(--accent-strong); background:linear-gradient(180deg, #edf3fa 0%, #dde7f2 100%); padding:8px 15px; border-radius:999px; font-weight:700; box-shadow:inset 0 1px 0 rgba(255,255,255,.7); }
      .hero-notes { max-width:760px; margin:0 auto; text-align:center; color:var(--muted); font-size:1.2rem; line-height:1.45; }
      .hero-count.item-quantity-display { font-family:var(--heading-font); font-size:2.35rem; line-height:1; padding:8px 14px; background:rgba(255,255,255,.6); box-shadow:inset 0 1px 0 rgba(255,255,255,.75); border-radius:18px; color:var(--accent-strong); min-width:72px; text-align:center; }
      .hero-notes.item-notes { font-size:1.2rem; max-width:760px; color:var(--ink); margin:0; text-align:left; }
      .hero.hero-tone-1 { background:linear-gradient(135deg, rgba(248,251,255,.99) 0%, rgba(224,235,251,.98) 100%); border-color:rgba(22,80,140,.16); }
      .hero.hero-tone-2 { background:linear-gradient(135deg, rgba(247,252,252,.99) 0%, rgba(223,240,240,.98) 100%); border-color:rgba(15,109,115,.16); }
      .hero.hero-tone-3 { background:linear-gradient(135deg, rgba(255,253,248,.99) 0%, rgba(245,230,200,.98) 100%); border-color:rgba(176,125,31,.17); }
      .hero.hero-tone-4 { background:linear-gradient(135deg, rgba(254,250,253,.99) 0%, rgba(238,216,230,.98) 100%); border-color:rgba(159,79,111,.16); }
      .container-hero-layout { display:grid; grid-template-columns:180px minmax(0, 1fr); gap:28px; align-items:start; }
      .container-hero-layout.no-photo { grid-template-columns:1fr; }
      .container-thumb { width:100%; aspect-ratio:1 / 1; border-radius:22px; overflow:hidden; border:1px solid rgba(24,62,99,.12); box-shadow:0 10px 22px rgba(27,42,63,.10), inset 0 1px 0 rgba(255,255,255,.7); background:rgba(255,255,255,.55); }
      .container-thumb img { width:100%; height:100%; object-fit:cover; }
      .container-hero-copy { display:grid; gap:16px; align-content:start; justify-items:start; text-align:left; }
      .container-hero-copy .hero-title { justify-items:start; text-align:left; }
      .item-hero { gap:18px; }
      .item-hero-layout { display:grid; grid-template-columns:160px minmax(0, 1fr); gap:28px; align-items:start; }
      .item-hero-layout.no-photo { grid-template-columns:1fr; }
      .item-thumb { width:100%; aspect-ratio:1 / 1; border-radius:22px; overflow:hidden; border:1px solid rgba(24,62,99,.12); box-shadow:0 10px 22px rgba(27,42,63,.10), inset 0 1px 0 rgba(255,255,255,.7); background:rgba(255,255,255,.55); }
      .item-thumb img { width:100%; height:100%; object-fit:cover; }
      .item-hero-copy { display:grid; gap:16px; align-content:start; justify-items:start; text-align:left; }
      .item-hero-header { width:100%; display:flex; justify-content:space-between; align-items:flex-start; gap:18px; }
      .item-title-line { display:flex; align-items:flex-end; gap:18px; flex-wrap:wrap; }
      .item-title-line h3 { margin:0; font-family:var(--heading-font); font-size:clamp(3rem,5vw,4.6rem); line-height:.92; letter-spacing:-.07em; }
      .item-detail-quantity-row { display:grid; grid-template-columns:52px minmax(72px,auto) 52px; gap:12px; align-items:center; justify-content:start; }
      .item-detail-quantity-row .item-quantity-button { width:52px; height:52px; }
      .item-detail-quantity-row .item-quantity-button svg { width:22px; height:22px; }
      .item-hero-copy .hero-title { justify-items:start; text-align:left; gap:4px; }
      .item-photo-strip { display:flex; gap:10px; flex-wrap:wrap; }
      .item-photo-chip { width:72px; height:72px; border-radius:16px; overflow:hidden; border:1px solid rgba(24,62,99,.12); background:rgba(255,255,255,.6); box-shadow:0 8px 16px rgba(27,42,63,.08); }
      .item-photo-chip img { width:100%; height:100%; object-fit:cover; }
      .section { border:1px solid rgba(24,62,99,.08); border-radius:24px; background:linear-gradient(180deg, rgba(241,246,251,.92) 0%, rgba(250,252,255,.98) 100%); padding:24px; display:grid; gap:20px; box-shadow:var(--shadow-soft), inset 0 1px 0 rgba(255,255,255,.65); }
      .section.items-section { background:linear-gradient(180deg, rgba(234,243,252,.98) 0%, rgba(246,250,255,.98) 100%); }
      .section.detail-tone-1 { background:linear-gradient(180deg, rgba(238,247,255,.98) 0%, rgba(248,252,255,.98) 100%); border-color:rgba(22,80,140,.14); }
      .section.detail-tone-2 { background:linear-gradient(180deg, rgba(239,250,249,.98) 0%, rgba(248,253,252,.98) 100%); border-color:rgba(15,109,115,.14); }
      .section.detail-tone-3 { background:linear-gradient(180deg, rgba(255,249,238,.98) 0%, rgba(255,253,248,.98) 100%); border-color:rgba(176,125,31,.15); }
      .section.detail-tone-4 { background:linear-gradient(180deg, rgba(252,244,248,.98) 0%, rgba(254,250,253,.98) 100%); border-color:rgba(159,79,111,.14); }
      .section-head { display:flex; gap:14px; align-items:center; justify-content:space-between; }
      .section-head.actions-only { justify-content:flex-end; padding-bottom:2px; }
      .section-head > button { min-width:120px; }
      .section-head h3 { margin:0; font-family:var(--heading-font); font-size:1.5rem; letter-spacing:-.04em; color:var(--accent-strong); }
      .identity-card { display:grid; gap:12px; align-content:start; }
      .identity-label { font-size:.82rem; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:700; }
      .identity-token { font-family:"Cascadia Code","Consolas","Courier New",monospace; font-size:1rem; line-height:1.45; color:var(--ink); word-break:break-all; background:rgba(255,255,255,.52); border:1px solid rgba(24,62,99,.08); border-radius:18px; padding:14px 16px; box-shadow:inset 0 1px 0 rgba(255,255,255,.7); }
      .identity-empty { color:var(--muted); }
      .contents-grid { grid-template-columns:repeat(auto-fill,minmax(220px,260px)); gap:18px; align-items:stretch; justify-content:start; }
      .item-card { position:relative; }
      .item-card-actions { position:absolute; top:16px; right:16px; z-index:2; display:flex; gap:8px; align-items:center; }
      .item-card-actions .icon-button { width:42px; height:42px; box-shadow:0 8px 16px rgba(22,80,140,.10); }
      .item-card-actions .icon-button svg { width:19px; height:19px; }
      .item-card-actions .delete-icon svg { width:20px; height:20px; }
      .item-row,.photo-card { border:1px solid rgba(24,62,99,.08); border-radius:22px; background:#fcfdff; padding:20px; box-shadow:0 12px 24px rgba(27,42,63,.06), inset 0 1px 0 rgba(255,255,255,.72); }
      .item-row { display:grid; gap:12px; color:var(--ink); text-align:left; min-height:196px; align-content:start; padding-top:56px; cursor:pointer; }
      .item-row:hover { transform:none; }
      .item-row:focus-visible { outline:none; box-shadow:0 0 0 4px rgba(22,80,140,.10), 0 12px 24px rgba(27,42,63,.06), inset 0 1px 0 rgba(255,255,255,.72); }
      .item-row-thumb { width:100%; aspect-ratio:1 / 1; border-radius:18px; overflow:hidden; border:1px solid rgba(24,62,99,.10); background:rgba(255,255,255,.55); box-shadow:0 8px 16px rgba(27,42,63,.08); }
      .item-row-thumb img { width:100%; height:100%; object-fit:cover; }
      .item-row-body { display:grid; gap:10px; }
      .item-row.item-tone-1 { background:linear-gradient(180deg, #f9fbff 0%, #e3ecfb 100%); border-color:rgba(22,80,140,.14); }
      .item-row.item-tone-2 { background:linear-gradient(180deg, #f8fcfc 0%, #e1f1f1 100%); border-color:rgba(15,109,115,.14); }
      .item-row.item-tone-3 { background:linear-gradient(180deg, #fffdf8 0%, #f6e8cb 100%); border-color:rgba(176,125,31,.15); }
      .item-row.item-tone-4 { background:linear-gradient(180deg, #fefafd 0%, #f0ddea 100%); border-color:rgba(159,79,111,.14); }
      .item-row-header { align-items:flex-start; }
      .item-name { font-family:var(--heading-font); font-size:1.45rem; font-weight:700; letter-spacing:-.04em; }
      .item-quantity { font-family:var(--heading-font); font-size:2.1rem; line-height:1; letter-spacing:-.05em; color:var(--accent-strong); }
      .item-quantity-wrap { display:grid; justify-items:center; width:100%; }
      .item-quantity-row { display:grid; grid-template-columns:44px minmax(56px,auto) 44px; gap:10px; align-items:center; justify-content:center; margin-top:2px; }
      .item-quantity-value { font-family:var(--heading-font); font-size:2.35rem; line-height:1; letter-spacing:-.05em; color:var(--accent-strong); text-align:center; }
      .item-quantity-button { width:44px; height:44px; padding:0; min-width:0; border-radius:999px; display:grid; place-items:center; }
      .item-quantity-button svg { width:20px; height:20px; stroke:currentColor; stroke-width:3.2; }
      .item-quantity-button.plus { background:linear-gradient(180deg, #2f8a63 0%, #216947 100%); box-shadow:0 8px 16px rgba(33,105,71,.18); }
      .item-quantity-button.minus { background:linear-gradient(180deg, #b04f3f 0%, #983b2b 100%); box-shadow:0 8px 16px rgba(152,59,43,.18); }
      .pill { display:inline-flex; padding:6px 11px; border-radius:999px; background:linear-gradient(180deg, #e9f2ff 0%, #d4e4fb 100%); color:var(--accent-strong); font-size:.82rem; font-weight:700; }
      .notice { padding:15px 17px; border-radius:18px; background:var(--accent-soft); color:var(--accent-strong); border:1px solid rgba(21,94,82,.1); }
      .notice.error { background:var(--danger-soft); color:var(--danger); border-color:rgba(162,63,50,.12); }
      label { display:grid; gap:6px; font-size:.92rem; color:var(--muted); }
      input,textarea,select,button { font:inherit; width:100%; }
      input,textarea,select { border-radius:16px; border:1px solid rgba(24,62,99,.12); padding:16px 18px; background:#fcfdff; color:var(--ink); box-shadow:inset 0 1px 0 rgba(255,255,255,.8); }
      input[type="file"] { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0, 0, 0, 0); border:0; }
      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
      input[type="number"] { appearance:textfield; -moz-appearance:textfield; }
      input:focus,textarea:focus,select:focus { outline:none; border-color:rgba(24,62,99,.42); box-shadow:0 0 0 4px rgba(24,62,99,.08); }
      textarea { min-height:84px; resize:vertical; }
      .quantity-field { display:grid; gap:8px; }
      .quantity-stepper { display:grid; grid-template-columns:76px 1fr 76px; gap:12px; align-items:center; }
      .quantity-stepper input { text-align:center; font-size:1.25rem; font-weight:700; padding-left:12px; padding-right:12px; }
      .step-button { height:58px; padding:0; display:grid; place-items:center; line-height:1; }
      .step-button svg { width:26px; height:26px; display:block; stroke:currentColor; stroke-width:3.2; stroke-linecap:round; }
      .step-button.plus { background:linear-gradient(180deg, #2f8a63 0%, #216947 100%); box-shadow:0 10px 20px rgba(33,105,71,.18); }
      .step-button.minus { background:linear-gradient(180deg, #b04f3f 0%, #983b2b 100%); box-shadow:0 10px 20px rgba(152,59,43,.18); }
      .file-picker { display:grid; gap:12px; justify-items:start; }
      .file-picker-button { width:auto; min-height:58px; padding:16px 26px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; background:linear-gradient(180deg, #f7fbff 0%, #dfeafb 100%); color:var(--ink); font-weight:700; letter-spacing:-.01em; box-shadow:0 10px 20px rgba(22,80,140,.10); cursor:pointer; }
      .file-picker-button:hover { box-shadow:0 12px 24px rgba(22,80,140,.14); transform:translateY(-1px); }
      .file-picker-name { font-size:.95rem; color:var(--muted); min-height:1.25rem; }
      button { border:0; border-radius:999px; background:linear-gradient(180deg, #2060a5 0%, #16508c 100%); color:#fff; padding:14px 22px; cursor:pointer; font-weight:700; letter-spacing:-.01em; box-shadow:0 10px 20px rgba(22,80,140,.18); }
      button.secondary { background:linear-gradient(180deg, #f7fbff 0%, #dfeafb 100%); color:var(--ink); box-shadow:0 8px 18px rgba(22,80,140,.08); }
      button.danger { background:linear-gradient(180deg, #b04f3f 0%, #983b2b 100%); color:#fff; }
      button:disabled { opacity:.58; cursor:not-allowed; box-shadow:none; }
      .icon-button { width:54px; height:54px; padding:0; border-radius:999px; display:grid; place-items:center; font-size:1.55rem; line-height:1; }
      .icon-button.secondary { background:linear-gradient(180deg, #f7fbff 0%, #dfeafb 100%); }
      .icon-button.danger { background:linear-gradient(180deg, #b04f3f 0%, #983b2b 100%); }
      .icon-button svg { width:24px; height:24px; display:block; stroke:currentColor; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
      .icon-button.save-icon { width:60px; height:60px; font-size:2rem; background:linear-gradient(180deg, #2ea56b 0%, #1f7d4d 100%); box-shadow:0 10px 22px rgba(31,125,77,.20); }
      .icon-button.add-icon { width:60px; height:60px; background:linear-gradient(180deg, #2ea56b 0%, #1f7d4d 100%); box-shadow:0 10px 22px rgba(31,125,77,.20); }
      .icon-button.add-icon svg { width:28px; height:28px; display:block; stroke:currentColor; stroke-width:3.2; stroke-linecap:round; }
      .icon-button.delete-icon svg { width:24px; height:24px; stroke-width:3.4; }
      .icon-button.nav-icon { width:60px; height:60px; font-weight:700; box-shadow:0 10px 20px rgba(22,80,140,.14); }
      .icon-button.nav-icon svg { width:28px; height:28px; display:block; }
      .icon-button.nav-icon.home-icon svg { width:28px; height:28px; }
      .icon-button.nav-icon.back-icon { font-size:2.25rem; }
      .modal-root[hidden] { display:none; }
      .modal-root { position:fixed; inset:0; z-index:30; }
      .modal-backdrop { position:absolute; inset:0; background:rgba(24,32,40,.34); backdrop-filter:blur(6px); display:grid; place-items:center; padding:24px; }
      .modal-shell { width:min(720px,100%); max-height:calc(100vh - 48px); overflow:auto; }
      .modal-header { padding:24px 24px 0; }
      .modal-header > div { min-width:0; flex:1 1 auto; }
      .modal-header h2 { font-size:2.2rem; line-height:1.02; letter-spacing:-.05em; }
      .modal-body { padding:20px 24px 24px; }
      .close-button { background:linear-gradient(180deg, #fbf7f0 0%, #efe4d2 100%); color:var(--ink); width:auto; flex:0 0 auto; min-width:112px; padding:12px 18px; box-shadow:0 8px 18px rgba(83,61,35,.08); }
      @media (max-width:900px) { .tile-grid { grid-template-columns:repeat(auto-fill,minmax(180px,220px)); } .contents-grid { grid-template-columns:repeat(auto-fill,minmax(180px,240px)); } }
      @media (max-width:720px) { .shell { padding:18px; } .topbar,.panel,.modal-shell,.hero,.tile,.section { border-radius:20px; } .stage-head,.topbar { align-items:flex-start; } .stage-actions,.hero-actions,.hero-top { justify-content:flex-start; } .tile-grid,.contents-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; } .tile-card,.tile-open { min-height:168px; } .tile-open { padding:22px 64px 22px 22px; } .tile-title { font-size:1.55rem; } .item-row { min-height:148px; } .hero-count.item-quantity-display { font-size:1.9rem; } .hero-notes.item-notes { font-size:1.05rem; } .item-hero-layout,.container-hero-layout { grid-template-columns:1fr; } .item-thumb,.container-thumb { max-width:180px; } .item-hero-header { flex-direction:column; align-items:flex-start; } .item-title-line h3 { font-size:clamp(2.6rem,10vw,3.4rem); } }
      @media (max-width:520px) { .tile-grid,.contents-grid { grid-template-columns:1fr; } .tile-card,.tile-open { min-height:150px; } .item-row { min-height:136px; } }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="topbar">
        <div class="brand">
          <h1>TethrArca</h1>
        </div>
        <form id="search-form" class="searchbar">
          <input id="search-input" placeholder="Search locations, containers, or items">
        </form>
        <div id="topbar-nav" class="topbar-nav"></div>
      </section>

      <section id="message"></section>

      <section class="panel">
        <div class="stage-shell">
          <div class="stage-head">
            <div>
              <h2 id="stage-title">Locations</h2>
              <div id="stage-meta" class="stage-meta">Choose a location to see its containers.</div>
            </div>
            <div id="stage-actions" class="stage-actions"></div>
          </div>
          <div id="stage-content"></div>
        </div>
      </section>
    </main>

    <div id="modal-root" class="modal-root" hidden></div>

    <script>
      const state = {
        bootstrap: null,
        googleAuthConfigured: false,
        stage: ${JSON.stringify(initialContainerId ? "container" : "locations")},
        selectedLocationId: null,
        activeContainerId: ${JSON.stringify(initialContainerId)},
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

      const els = {
        message: document.getElementById("message"),
        stageTitle: document.getElementById("stage-title"),
        stageMeta: document.getElementById("stage-meta"),
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

      boot();

      function boot() {
        els.searchForm.addEventListener("submit", onSearch);
        els.searchInput.addEventListener("input", onSearchInput);
        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && !els.modalRoot.hidden) closeModal();
        });
        window.addEventListener("popstate", () => {
          applyCurrentPath();
        });
        refreshAll().then(() => applyCurrentPath());
      }

      async function refreshAll() {
        try {
          const googleStatus = await api("/api/auth/google/status");
          state.googleAuthConfigured = Boolean(googleStatus.configured);
        } catch (error) {
          state.googleAuthConfigured = false;
        }
        state.bootstrap = await api("/api/bootstrap?selectedContainerId=" + encodeURIComponent(state.activeContainerId || ""));
        renderOverview();
        renderStage();
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

      function renderSignInStage() {
        state.stage = "locations";
        state.searchResults = null;
        els.stageTitle.textContent = "Welcome";
        els.stageMeta.textContent = "Sign in to get your own private TethrArca workspace.";
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
        const scanMatch = window.location.pathname.match(/^\\/scan\\/([^/]+)$/);
        if (scanMatch) {
          await openScanToken(decodeURIComponent(scanMatch[1]), false);
          return;
        }
        const containerMatch = window.location.pathname.match(/^\\/containers\\/([^/]+)$/);
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
          await refreshAll();
          await openContainer(pending.containerId, true);
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
          await refreshAll();
          await openContainer(result.entityId, true);
          await openItem(pending.itemId);
        }
      }

      function getLocation(id) {
        return state.bootstrap.locations.find((location) => location.id === id) || null;
      }

      function getContainer(id) {
        return state.bootstrap.containers.find((container) => container.id === id) || null;
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

      function getSimulationRecord(entityType) {
        if (entityType === "location") {
          return state.bootstrap.locations[0] || null;
        }
        if (entityType === "container") {
          return state.bootstrap.containers[0] || null;
        }
        if (entityType === "item") {
          return state.bootstrap.items[0] || null;
        }
        return null;
      }

      function renderSimulatedScanStage() {
        renderTopbarNav();
        if (state.pendingScanAction?.kind === "moveContainer") {
          const locations = state.bootstrap.locations;
          els.stageTitle.textContent = "Scan Location to Move";
          els.stageMeta.textContent = "Choose a location label to move this container.";
          els.stageActions.innerHTML = "";
          els.stageContent.innerHTML =
            '<div class="section">' +
              (locations.length
                ? '<div class="tile-grid">' + locations.map((location, index) => (
                    '<div class="tile ' + toneClass(locationTones, index) + '">' +
                      '<div class="tile-title">' + escapeHtml(location.name) + '</div>' +
                      '<div class="tile-subtitle">Move container here.</div>' +
                      '<button class="secondary" type="button" data-simulated-scan-record="location" data-record-id="' + location.id + '">Scan Location</button>' +
                    '</div>'
                  )).join("") + '</div>'
                : '<div class="empty-state"><h3>No locations yet</h3><div class="mini-note">Create a location before using scan-to-move.</div></div>') +
            '</div>';
        } else if (state.pendingScanAction?.kind === "moveItem") {
          const containers = state.bootstrap.containers.filter((container) => container.id !== state.activeItemDetail?.item?.container_id);
          els.stageTitle.textContent = "Scan Container to Move";
          els.stageMeta.textContent = "Choose a container label to move this item.";
          els.stageActions.innerHTML = "";
          els.stageContent.innerHTML =
            '<div class="section">' +
              (containers.length
                ? '<div class="tile-grid">' + containers.map((container, index) => (
                    '<div class="tile ' + toneClass(containerTones, index) + '">' +
                      '<div class="tile-title">' + escapeHtml(container.name) + '</div>' +
                      '<div class="tile-subtitle">Move item here.</div>' +
                      '<button class="secondary" type="button" data-simulated-scan-record="container" data-record-id="' + container.id + '">Scan Container</button>' +
                    '</div>'
                  )).join("") + '</div>'
                : '<div class="empty-state"><h3>No other containers yet</h3><div class="mini-note">Create another container before using scan-to-move.</div></div>') +
            '</div>';
        } else {
          const location = getSimulationRecord("location");
          const container = getSimulationRecord("container");
          const item = getSimulationRecord("item");

          els.stageTitle.textContent = "Simulated Scan";
          els.stageMeta.textContent = "Use these buttons to test the scan flow without a phone.";
          els.stageActions.innerHTML = "";

          const tiles = [
            {
              type: "location",
              title: location ? location.name : "No location yet",
              subtitle: location ? "Test opening a location by scan." : "Create a location first to test this."
            },
            {
              type: "container",
              title: container ? container.name : "No container yet",
              subtitle: container ? "Test opening a container by scan." : "Create a container first to test this."
            },
            {
              type: "item",
              title: item ? item.name : "No item yet",
              subtitle: item ? "Test opening an item by scan." : "Create an item first to test this."
            },
            {
              type: "unassigned",
              title: "New Unassigned Tag",
              subtitle: "Test the setup flow for a brand new label."
            }
          ];

          els.stageContent.innerHTML =
            '<div class="section">' +
              '<div class="tile-grid">' +
                tiles.map((entry, index) => (
                  '<div class="tile ' + toneClass(locationTones, index) + '">' +
                    '<div class="tile-title">' + escapeHtml(entry.title) + '</div>' +
                    '<div class="tile-subtitle">' + escapeHtml(entry.subtitle) + '</div>' +
                    '<button class="secondary" type="button" data-simulated-scan="' + entry.type + '"' + (
                      entry.type !== "unassigned" && !getSimulationRecord(entry.type) ? " disabled" : ""
                    ) + '>' + (
                      entry.type === "unassigned"
                        ? "Scan New Tag"
                        : ("Scan " + entry.type[0].toUpperCase() + entry.type.slice(1))
                    ) + '</button>' +
                  '</div>'
                )).join("") +
              '</div>' +
            '</div>';
        }

        els.stageContent.querySelectorAll("[data-simulated-scan]").forEach((button) => {
          button.addEventListener("click", async () => {
            const type = button.dataset.simulatedScan;
            if (type === "unassigned") {
              await openScanToken("sim-" + crypto.randomUUID(), true);
              return;
            }

            const record = getSimulationRecord(type);
            if (!record) {
              return;
            }

            let token = record.tag_token || "";
            if (!token) {
              const created = await createTagForEntity(type, record.id);
              token = created.token;
              await refreshAll();
            }

            await openScanToken(token, true);
          });
        });

        els.stageContent.querySelectorAll("[data-simulated-scan-record]").forEach((button) => {
          button.addEventListener("click", async () => {
            const type = button.dataset.simulatedScanRecord;
            const id = button.dataset.recordId;
            const record = type === "location"
              ? getLocation(id)
              : getContainer(id);
            if (!record) {
              return;
            }

            let token = record.tag_token || "";
            if (!token) {
              const created = await createTagForEntity(type, record.id);
              token = created.token;
              await refreshAll();
            }

            await openScanToken(token, true);
          });
        });
      }

      function renderLocationsStage() {
        els.stageTitle.textContent = "Locations";
        els.stageMeta.textContent = "Choose a location to see its containers.";
        els.stageActions.innerHTML =
          '<div class="action-cluster">' +
            '<button id="open-simulated-scan" class="secondary" type="button">Test Scan</button>' +
            '<button id="stage-add-location" class="icon-button add-icon" type="button" aria-label="Add location" title="Add location">' + addIconMarkup + '</button>' +
          '</div>';
        const noLocationCount = containersForLocation(null).length;
        const locationTiles = state.bootstrap.locations.map((location, index) => (
          '<div class="tile tile-card ' + toneClass(locationTones, index) + '">' +
            '<button class="tile-delete danger" type="button" data-delete-location="' + location.id + '" aria-label="Delete ' + escapeAttr(location.name) + '">' + deleteIconMarkup + '</button>' +
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
        document.getElementById("open-simulated-scan").addEventListener("click", () => {
          state.stage = "simulatedScan";
          history.pushState({}, "", "/simulate-scan");
          renderStage();
        });
        els.stageContent.querySelectorAll("[data-open-location]").forEach((button) => {
          button.addEventListener("click", () => openLocation(button.dataset.openLocation === "__none__" ? null : button.dataset.openLocation));
        });
        els.stageContent.querySelectorAll("[data-delete-location]").forEach((button) => {
          button.addEventListener("click", () => {
            const location = getLocation(button.dataset.deleteLocation);
            if (location) {
              openDeleteLocationModal(location);
            }
          });
        });
      }

      function renderScanSetupStage() {
        renderTopbarNav();
        els.stageTitle.textContent = "New Tag Detected";
        els.stageMeta.textContent = "Token: " + state.scanToken;
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
        els.stageMeta.textContent = location ? "Choose a container to see its contents." : "Choose a container to see its contents.";
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
                  '<button class="tile-delete danger" type="button" data-delete-container="' + container.id + '" aria-label="Delete ' + escapeAttr(container.name) + '">' + deleteIconMarkup + '</button>' +
                  '<button class="tile-open" type="button" data-open-container="' + container.id + '">' +
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
        els.stageContent.querySelectorAll("[data-delete-container]").forEach((button) => {
          button.addEventListener("click", () => {
            const container = getContainer(button.dataset.deleteContainer);
            if (container) {
              openDeleteContainerModal(container);
            }
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
        els.stageMeta.textContent = "";
        els.stageActions.innerHTML = "";

        const itemRows = detail.items.length
          ? detail.items.map((item, index) => (
              '<div class="item-card">' +
                '<div class="item-card-actions">' +
                  '<button class="secondary icon-button" type="button" data-edit-item="' + item.id + '" aria-label="Edit ' + escapeAttr(item.name) + '" title="Edit item">' + editIconMarkup + '</button>' +
                  '<button class="danger icon-button delete-icon" type="button" data-delete-item="' + item.id + '" aria-label="Delete ' + escapeAttr(item.name) + '" title="Delete item">' + deleteIconMarkup + '</button>' +
                '</div>' +
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
                            '<div class="item-quantity-value">' + item.quantity + '</div>' +
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

        document.getElementById("container-history-button").addEventListener("click", () => openContainerHistoryModal(detail));
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
        els.stageContent.querySelectorAll("[data-edit-item]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openItemModal({ itemId: button.dataset.editItem, containerId: detail.container.id });
          });
        });
        els.stageContent.querySelectorAll("[data-delete-item]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openDeleteItemModal(button.dataset.deleteItem);
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
        const heroTone = toneClassForId(heroTones, detail.item.id);
        const detailTone = toneClassForId(detailTones, detail.item.id);
        renderTopbarNav();
        els.stageTitle.textContent = detail.item.container_name;
        els.stageMeta.textContent = "";
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
        document.getElementById("item-history-button").addEventListener("click", () => openItemHistoryModal(detail));
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
              const form = new FormData(event.currentTarget);
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
              if (selectedPhoto) {
                const optimizedPhoto = await optimizeImageFile(selectedPhoto);
                const photoForm = new FormData();
                photoForm.append("photo", optimizedPhoto);
                await api("/api/containers/" + saved.id + "/photo", { method: "POST", body: photoForm });
              }
              closeModal();
              showMessage(isEdit
                ? (selectedPhoto ? "Container and image updated." : "Container updated.")
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
        const existing = itemId ? await api("/api/items/" + itemId) : null;
        const item = existing?.item;
        const showLabelButton = item && canShowLabelAction(existing?.tag?.token, existing?.tag?.source);
        const selectedContainerId = item?.container_id || containerId || state.activeContainerId || "";
        const lockContainer = !item && Boolean(selectedContainerId);
        const containerOptions = state.bootstrap.containers.map((container) => (
          '<option value="' + container.id + '"' + (container.id === selectedContainerId ? ' selected' : '') + '>' + escapeHtml(container.name) + '</option>'
        )).join("");
        const containerField = lockContainer
          ? '<input name="containerId" type="hidden" value="' + escapeAttr(selectedContainerId) + '">'
          : '<label>Container<select name="containerId">' + containerOptions + '</select></label>';
        const existingPhoto = existing?.photos?.[0] || null;
        const imageSection =
          '<div class="stack">' +
            '<h3 style="margin:0;">Image</h3>' +
            (existingPhoto
              ? '<div class="photos-grid">' +
                  '<div class="photo-card">' +
                    '<img src="' + getImageUrl(existingPhoto.stored_name, "items") + '" alt="' + escapeHtml(existingPhoto.file_name) + '">' +
                    '<div class="mini-note" style="margin-top:8px;">' + escapeHtml(existingPhoto.file_name) + '</div>' +
                  '</div>' +
                '</div>'
              : '') +
            '<div class="file-picker">' +
              '<input id="item-photo-input" name="photo" type="file" accept="image/*">' +
              '<label id="item-photo-button" for="item-photo-input" class="secondary file-picker-button">' + (existingPhoto ? "Change Image" : "Add Image") + '</label>' +
              '<div id="item-photo-name" class="file-picker-name">' + (existingPhoto ? "Current image is set." : "No image selected.") + '</div>' +
            '</div>' +
          '</div>';

        openModal(
          item ? "Edit Item" : "Add Item",
          '<form id="item-modal-form" class="form-grid">' +
            '<label>Name<input name="name" value="' + escapeAttr(item?.name || "") + '" required></label>' +
            containerField +
            '<label class="quantity-field">Quantity' +
              '<div class="quantity-stepper">' +
                '<button class="step-button minus" type="button" data-step="-1" aria-label="Decrease quantity">' + minusIconMarkup + '</button>' +
                '<input name="quantity" type="number" min="1" value="' + (item?.quantity || 1) + '" required>' +
                '<button class="step-button plus" type="button" data-step="1" aria-label="Increase quantity">' + plusIconMarkup + '</button>' +
              '</div>' +
            '</label>' +
            '<label>Notes<textarea name="notes">' + escapeHtml(item?.notes || "") + '</textarea></label>' +
            imageSection +
            '<div class="button-row">' +
              (showLabelButton ? '<button id="item-qr-button" class="secondary" type="button">Label</button>' : '') +
              saveActionButton +
            '</div>' +
          '</form>',
          (modal) => {
            if (showLabelButton) {
              modal.querySelector("#item-qr-button").addEventListener("click", async () => {
                await openLabelModal({
                  entityType: "item",
                  entityId: item.id,
                  name: item.name,
                  existingToken: existing?.tag?.token || ""
                });
              });
            }
            const quantityInput = modal.querySelector('input[name="quantity"]');
            modal.querySelectorAll("[data-step]").forEach((button) => {
              button.addEventListener("click", () => {
                const delta = Number.parseInt(button.dataset.step, 10) || 0;
                const current = Number.parseInt(quantityInput.value || "1", 10) || 1;
                quantityInput.value = String(Math.max(1, current + delta));
                quantityInput.dispatchEvent(new Event("input", { bubbles: true }));
              });
            });
            const photoInput = modal.querySelector("#item-photo-input");
            const photoName = modal.querySelector("#item-photo-name");
            const photoButton = modal.querySelector("#item-photo-button");
            if (photoInput && photoName && photoButton) {
              photoInput.addEventListener("change", () => {
                const hasSelection = photoInput.files && photoInput.files[0];
                const selected = hasSelection
                  ? (photoInput.files[0].name + " (will be optimized)")
                  : (existingPhoto ? "Current image is set." : "No image selected.");
                photoName.textContent = selected;
                photoButton.textContent = hasSelection || existingPhoto ? "Change Image" : "Add Image";
              });
            }

            modal.querySelector("#item-modal-form").addEventListener("submit", async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
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
              if (selectedPhoto) {
                const optimizedPhoto = await optimizeImageFile(selectedPhoto);
                const photoForm = new FormData();
                photoForm.append("photo", optimizedPhoto);
                await api("/api/items/" + saved.id + "/photos", { method: "POST", body: photoForm });
              }
              closeModal();
              showMessage(item
                ? (selectedPhoto ? "Item and image updated." : "Item updated.")
                : (tagToken ? "Item created and tag assigned." : "Item created."));
              await refreshAll();
              if (item) {
                await openItem(item.id);
              } else {
                state.scanToken = null;
                await openContainer(saved.container_id || form.get("containerId"), false);
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

      function openDeleteContainerModal(container) {
        openConfirmModal("Delete Container", 'Delete <strong>' + escapeHtml(container.name) + '</strong>? Items and photos inside it will also be deleted.', async () => {
          await api("/api/containers/" + container.id, { method: "DELETE" });
          showMessage("Container deleted.");
          await refreshAll();
          openLocation(container.location_id || null);
        });
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
        renderStage();

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
          await refreshAll();
          if (state.stage === "item" && state.activeItemId) {
            await openItem(state.activeItemId);
          } else if (state.activeContainerId) {
            await openContainer(state.activeContainerId, false);
          }
        } catch (error) {
          await refreshAll();
          if (state.stage === "item" && state.activeItemId) {
            await openItem(state.activeItemId);
          } else if (state.activeContainerId) {
            await openContainer(state.activeContainerId, false);
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

      function openModal(title, contentHtml, setup) {
        els.modalRoot.hidden = false;
        els.modalRoot.innerHTML =
          '<div class="modal-backdrop">' +
            '<div class="modal-shell">' +
              '<div class="modal-header">' +
                '<div><h2>' + title + '</h2></div>' +
                '<button class="close-button" type="button" data-close-modal>Close</button>' +
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
          }
        );
      }

      function closeModal() {
        els.modalRoot.hidden = true;
        els.modalRoot.innerHTML = "";
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
    </script>
  </body>
</html>`;
}

export function renderPrintLabelPage({ name, entityType, qrUrl, size }) {
  const settings = labelSizeDefinitionForPrint(size);
  const title = escapeHtmlStatic(name || "Label");
  const subtitle = escapeHtmlStatic((entityType || "item").slice(0, 1).toUpperCase() + (entityType || "item").slice(1));
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Print Label</title>
    <style>
      @page { size: auto; margin: 0.3in; }
      body { margin:0; padding:0.25in; font-family:"Aptos","Segoe UI",sans-serif; background:#ffffff; color:#18202b; }
      .sheet { display:flex; justify-content:center; }
      .label { width:${settings.width}; border:1px solid #c8d4e3; border-radius:18px; padding:${settings.padding}; text-align:center; }
      .type { font-size:${settings.subtitle}; letter-spacing:.08em; text-transform:uppercase; color:#5f6b7b; font-weight:700; margin-bottom:0.14in; }
      .name { font-family:"Iowan Old Style","Palatino Linotype",Georgia,serif; font-size:${settings.title}; line-height:1.05; font-weight:700; margin-bottom:0.18in; }
      .qr { width:${settings.qr}px; height:${settings.qr}px; margin:0 auto; display:block; }
    </style>
  </head>
  <body onload="setTimeout(function(){ window.print(); }, 250)">
    <div class="sheet">
      <div class="label">
        <div class="type">${subtitle}</div>
        <div class="name">${title}</div>
        <img class="qr" src="${qrUrl}" alt="QR code">
      </div>
    </div>
  </body>
</html>`;
}

function labelSizeDefinitionForPrint(size) {
  if (size === "small") {
    return { width: "2.25in", qr: 150, title: "1rem", subtitle: ".72rem", padding: ".18in" };
  }
  if (size === "large") {
    return { width: "4in", qr: 280, title: "1.45rem", subtitle: ".9rem", padding: ".32in" };
  }
  return { width: "3in", qr: 220, title: "1.2rem", subtitle: ".82rem", padding: ".24in" };
}

function escapeHtmlStatic(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
