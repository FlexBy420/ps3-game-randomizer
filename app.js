'use strict';

async function initPicker() {
    const API_URL = 'compatibility.json';
    const statusesEl = document.getElementById('statuses');
    const regionsEl = document.getElementById('regions');
    const typesEl = document.getElementById('types');
    const randomBtn = document.getElementById('randomBtn');
    const resetBtn = document.getElementById('resetBtn');
    const pickedEl = document.getElementById('picked');
    const resultBox = document.getElementById('result');
    const ICON_ALIAS = {
    // star ocean 4
    "BLES00767": "MRTC00001",
    "BLUS30462": "MRTC00001",
    "BCKS10106": "MRTC00001",
    "BLJM60189": "MRTC00001",
    "BLJM60338": "MRTC00001",
    // lost planet 2
    "BLES00710": "MRTC00002",
    "BLUS30434": "MRTC00002",
    "BLAS50173": "MRTC00002",
    "BLJM60177": "MRTC00002",
    // ff13
    "BLES00783": "MRTC00003",
    "BLUS30416": "MRTC00003",
    // sengoku basara
    "BLES00832": "MRTC00005",
    "BLUS30492": "MRTC00005",
    "BLAS50250": "MRTC00005",
    // blood drive
    "BLUS30602": "MRTC00011",
    "BLES01046": "MRTC00011",
    // mindjack
    "BLES01009": "MRTC00014",
    "BLUS30547": "MRTC00014",
    "BLJM60272": "MRTC00014",
    // cabela
    "BLES01112": "MRTC00016",
    };

    let items = [];

    // fetch data
    try {
        const r = await fetch(API_URL);
        const j = await r.json();
        items = Object.entries(j.results || {}).map(([id, info]) => ({ id, ...info }));
    } catch (err) { console.error('Error loading JSON:', err); }

    const order = ["Playable","Ingame","Intro","Loadable","Nothing"];
    const foundStatuses = new Set(items.map(i=>i.status));
    const regions = ["EU","US","AS","JP","HK","KR","IN"];
    const regionFullNames = {EU:'Europe',US:'USA',AS:'Asia',JP:'Japan',HK:'Hong Kong',KR:'Korea',IN:'International'};

    statusesEl.innerHTML='';
    regionsEl.innerHTML='';
    typesEl.innerHTML='';
    order.forEach(status=>{
        if(foundStatuses.has(status)){
            const label=document.createElement('label');
            label.className='status-item';
            label.innerHTML=`<input type="checkbox" data-status="${status}" checked/> ${status}`;
            statusesEl.appendChild(label);
        }
    });

    // disc or digital check
    const discLabel = document.createElement('label');
    discLabel.className='status-item';
    discLabel.innerHTML=`<input type="checkbox" id="typeDisc" checked/> Disc`;

    const digitalLabel = document.createElement('label');
    digitalLabel.className='status-item';
    digitalLabel.innerHTML=`<input type="checkbox" id="typeDigital" checked/> Digital`;

    const onlineLabel = document.createElement('label');
    onlineLabel.className='status-item';
    onlineLabel.innerHTML=`<input type="checkbox" id="onlineOnly"/> Online Only`;

    typesEl.appendChild(discLabel);
    typesEl.appendChild(digitalLabel);
    typesEl.appendChild(onlineLabel);

    regions.forEach(region => {
        const label = document.createElement('label');
        label.className = 'status-item';
        label.innerHTML = `
            <input type="checkbox" data-region="${region}" checked/>
            <img src="https://rpcs3.net/img/icons/compat/${region}.png" class="region-flag"/>
            ${regionFullNames[region]}
        `;
        regionsEl.appendChild(label);
    });

    function getSelectedStatuses(){ return [...statusesEl.querySelectorAll('input[data-status]')].filter(c=>c.checked).map(c=>c.dataset.status);}
    function getSelectedRegions(){ return [...regionsEl.querySelectorAll('input[data-region]')].filter(c=>c.checked).map(c=>c.dataset.region);}

    function getRegionFromId(id){
      const c=(id[2]||'').toUpperCase();
      switch(c){
        case 'E':return 'EU';
        case 'U':return 'US';
        case 'A':return 'AS';
        case 'J':return 'JP';
        case 'H':return 'HK';
        case 'K':return 'KR';
        case 'I':case 'T':return 'IN';
        default:return 'unknown';}}

    function getTypeFromId(id) {
        if (id.startsWith("NP")) return "Digital";
        return "Disc";
    }

    let selectedTypes = { Disc: true, Digital: true };

    function updateTypeFilter() {
        selectedTypes.Disc = document.getElementById("typeDisc")?.checked ?? true;
        selectedTypes.Digital = document.getElementById("typeDigital")?.checked ?? true;
    }
    updateTypeFilter();

    function colorStatus(s){
      const colors={
        Playable:'#27ae60',
        Ingame:'#f1c40f',
        Intro:'#e67e22',
        Loadable:'#d8213aff',
        Nothing:'#95a5a6'};
        return `<span style="color:${colors[s]||'#111'}">${s}</span>`;
      }

    function updateEntryCount() {
        const selectedStatuses = getSelectedStatuses();
        const selectedRegions = getSelectedRegions();
        const onlineOnly = document.getElementById('onlineOnly').checked;

        const selectedTypesLocal = {
            Disc: document.getElementById('typeDisc').checked,
            Digital: document.getElementById('typeDigital').checked
        };
        const pool = items.filter(it =>
            selectedStatuses.includes(it.status) &&
            selectedRegions.includes(getRegionFromId(it.id)) &&
            (onlineOnly ? true : it.network !== 1) &&
            selectedTypesLocal[getTypeFromId(it.id)]
        );
      
        document.getElementById('entryCount').textContent = `Available entries: ${pool.length}`;
    }

    [...statusesEl.querySelectorAll('input[type=checkbox]'),...regionsEl.querySelectorAll('input[type=checkbox]'),...typesEl.querySelectorAll('input[type=checkbox]')].forEach(c => c.addEventListener('change', () => {
        updateTypeFilter();
        updateEntryCount();
    }));
    updateEntryCount();

    // fetch game icon
    async function getIconFromXML(gameId){
        try{
            const realId = ICON_ALIAS[gameId] || gameId;
            const url = `https://raw.githubusercontent.com/FlexBy420/sce-tmdb-scraper/main/xml/${realId}.xml`;
            const res=await fetch(url);
            if(!res.ok) return null;
            const text=await res.text();
            const parser=new DOMParser();
            const xml=parser.parseFromString(text,'application/xml');
            const iconEl=xml.querySelector('icon');
            return iconEl?iconEl.textContent:null;
        }catch(err){console.warn('Failed to fetch game icon:',err); return null;}
    }

    // rng
    async function pick() {
        const selectedStatuses = getSelectedStatuses();
        const selectedRegions = getSelectedRegions();
        const onlineOnly = document.getElementById('onlineOnly').checked;

        if (selectedStatuses.length === 0) { alert('Select at least one status!'); return; }
        if (selectedRegions.length === 0) { alert('Select at least one region!'); return; }

        const pool = items.filter(it =>
            selectedStatuses.includes(it.status) &&
            selectedRegions.includes(getRegionFromId(it.id)) &&
            (onlineOnly ? true : it.network !== 1) &&
            selectedTypes[getTypeFromId(it.id)]
        );

        if (pool.length === 0) { alert('No games to randomize from.'); return; }
        resultBox.style.display = 'block';

        // animation: show random titles
        const animationDuration = 1000; // ms
        const interval = 100; // ms
        const steps = Math.floor(animationDuration / interval);

        for (let i = 0; i < steps; i++) {
            const randomGame = pool[Math.floor(Math.random() * pool.length)];
            pickedEl.innerHTML = `<div style="opacity:0.6; transition:opacity 0.1s;">
                <div class="picked-game">${randomGame.title || 'No title'}</div>
            </div>`;
            await new Promise(r => setTimeout(r, interval));
        }
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        await show(chosen);
    }

    // display result
    async function show(game){
        resultBox.style.display='block';
        const wikiTitle=encodeURIComponent(game['wiki-title']||game.title||'');
        const forumThread=encodeURIComponent(game['thread']||game.title||'');
        const serialId = game.id.slice(0,4);
        const serialCode = game.id.slice(4);
        const wikiUrl=`https://wiki.rpcs3.net/index.php?title=${wikiTitle}`;
        const forumUrl=`https://forums.rpcs3.net/thread-${forumThread}.html`;
        const serialUrl = `https://www.serialstation.com/titles/${serialId}/${serialCode}`;

        let iconUrl = await getIconFromXML(game.id);
        if (!iconUrl) {
            const placeholders = [
                'https://media1.tenor.com/m/C5awosdlt2EAAAAd/rpcs3-emulation.gif',
                'https://media1.tenor.com/m/6YrZxxOsPcwAAAAd/rpcs3-clienthax.gif',
                'https://media1.tenor.com/m/of_mwJmMNbsAAAAd/azumanga-azumanga-daioh.gif',
                'https://media1.tenor.com/m/ck2dxqKEeckAAAAC/azumanga-daioh-osaka.gif',
            ];
            iconUrl = placeholders[Math.floor(Math.random() * placeholders.length)];
        }

        pickedEl.innerHTML=`
            <div style="display:flex; gap:20px; align-items:center;">
                <img src="${iconUrl}" class="game-icon">
                <div>
                    <div class="picked-game">${game.title||'No title'}</div>
                    <div class="meta">
                        ID: ${game.id} · Status: ${colorStatus(game.status)}
                         · Region: <img src="https://rpcs3.net/img/icons/compat/${getRegionFromId(game.id)}.png" alt="${getRegionFromId(game.id)}" class="region-flag">
                         · Type: ${getTypeFromId(game.id)}
                         · Date: ${game.date||'—'}
                    </div>
                </div>
            </div>
            <br>
            <a target="_blank" href="${wikiUrl}"><button>Wiki</button></a>
            <a target="_blank" href="${forumUrl}"><button>Forum</button></a>
            <a target="_blank" href="${serialUrl}"><button>SerialStation</button></a>
        `;
        resultBox.scrollIntoView({behavior:'smooth'});
    }

    resetBtn.addEventListener('click', ()=>{
        [...statusesEl.querySelectorAll('input[type=checkbox]')].forEach(c=>c.checked=true);
        [...regionsEl.querySelectorAll('input[type=checkbox]')].forEach(c=>c.checked=true);
        [...typesEl.querySelectorAll('input[type=checkbox]')].forEach(c=>c.checked=true);
        document.getElementById('onlineOnly').checked = false;
        updateTypeFilter();
        updateEntryCount();
    });
    randomBtn.addEventListener('click',pick);

    // dark mode functions
    function toggleDarkMode(){
        const html=document.documentElement;
        const isDark=html.getAttribute('data-bs-theme')==='dark';
        html.setAttribute('data-bs-theme',isDark?'light':'dark');
        localStorage.setItem('darkMode',!isDark);
    }

    function initializeDarkMode(){
        const savedMode=localStorage.getItem('darkMode');
        const systemPrefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
        if(savedMode==='true'||(savedMode===null&&systemPrefersDark)) document.documentElement.setAttribute('data-bs-theme','dark');
        else document.documentElement.setAttribute('data-bs-theme','light');
        document.getElementById('darkModeToggle').addEventListener('click',toggleDarkMode);
    }
    initializeDarkMode();
}
initPicker();