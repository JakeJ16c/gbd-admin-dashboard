// js/layout.js
const shell = document.getElementById("app-shell");

shell.innerHTML = `
  <header style="
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:14px 16px;
    border-bottom:1px solid rgba(0,0,0,.08);
    background:#fff;
    font-family: Fredoka, system-ui;
  ">
    <div style="display:flex; align-items:center; gap:10px;">
      <button style="
        border:1px solid rgba(0,0,0,.12);
        background:#fff;
        padding:10px 12px;
        border-radius:12px;
        cursor:pointer;
        font-weight:600;
      ">
        ☰ Menu
      </button>

      <strong style="font-size:16px;">GBD Admin</strong>
    </div>

    <div style="display:flex; align-items:center; gap:10px;">
      <div style="
        width:40px; height:40px;
        border-radius:12px;
        display:grid;
        place-items:center;
        font-weight:700;
        background: rgba(32,78,207,.12);
      ">D</div>
    </div>
  </header>
`;
