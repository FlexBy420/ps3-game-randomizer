'use strict';

async function initPicker() {
    const API_URL = 'compatibility.json';
    const statusesEl = document.getElementById('statuses');
    const randomBtn = document.getElementById('randomBtn');
    const resetBtn = document.getElementById('resetBtn');
    const pickedEl = document.getElementById('picked');
    const resultBox = document.getElementById('result');

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
    order.forEach(status=>{
        if(foundStatuses.has(status)){
            const label=document.createElement('label');
            label.className='status-item';
            label.innerHTML=`<input type="checkbox" data-status="${status}" checked /> ${status}`;
            statusesEl.appendChild(label);
        }
    });
    const onlineLabel=document.createElement('label');
    onlineLabel.className='status-item';
    onlineLabel.innerHTML=`<input type="checkbox" id="onlineOnly" /> Online Only`;
    statusesEl.appendChild(onlineLabel);
    document.getElementById('onlineOnly').checked = false;

    regions.forEach(region=>{
        const label=document.createElement('label');
        label.className='status-item';
        label.innerHTML=`<input type="checkbox" data-region="${region}" checked /> ${regionFullNames[region]}`;
        statusesEl.appendChild(label);
    });

    function getSelectedStatuses(){ return [...statusesEl.querySelectorAll('input[data-status]')].filter(c=>c.checked).map(c=>c.dataset.status);}
    function getSelectedRegions(){ return [...statusesEl.querySelectorAll('input[data-region]')].filter(c=>c.checked).map(c=>c.dataset.region);}

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
    
        const pool = items.filter(it =>
            selectedStatuses.includes(it.status) &&
            selectedRegions.includes(getRegionFromId(it.id)) &&
            (onlineOnly ? true : it.network !== 1)
        );
      
        document.getElementById('entryCount').textContent = `Available entries: ${pool.length}`;
    }

    [...statusesEl.querySelectorAll('input[type=checkbox]')].forEach(c =>{c.addEventListener('change', updateEntryCount);});
    updateEntryCount();

    // fetch game icon
    async function getIconFromXML(gameId){
        try{
            const url=`https://raw.githubusercontent.com/FlexBy420/sce-tmdb-scraper/main/xml/${gameId}.xml`;
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
            (onlineOnly ? true : it.network !== 1)
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
        const wikiUrl=`https://wiki.rpcs3.net/index.php?title=${wikiTitle}`;

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
                <img src="${iconUrl}" style="width:320px; height:176px; border-radius:10px; object-fit:contain; box-shadow:0 0 8px #0003;">
                <div>
                    <div class="picked-game">${game.title||'No title'}</div>
                    <div class="meta">
                        ID: ${game.id} · Status: ${colorStatus(game.status)} · Region: ${regionFullNames[getRegionFromId(game.id)]||getRegionFromId(game.id)} · Date: ${game.date||'—'}
                    </div>
                </div>
            </div>
            <br>
            <a target="_blank" href="${wikiUrl}"><button>RPCS3 Wiki Page</button></a>
        `;
        resultBox.scrollIntoView({behavior:'smooth'});
    }

    resetBtn.addEventListener('click', ()=>{[...statusesEl.querySelectorAll('input[type=checkbox]')].forEach(c=>c.checked=true);
      document.getElementById('onlineOnly').checked = false;
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