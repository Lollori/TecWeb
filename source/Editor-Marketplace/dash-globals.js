const SESSION = {
    userId:   localStorage.getItem('userId')       || '',
    role:     localStorage.getItem('userRole')     || '',
    username: localStorage.getItem('userUsername') || '',
};


const ROLE_AVATARS = {

    autore:     '/img/pfp_autore.jpg',

    visitatore: '/img/pfp_visitatore.jpg',

    curatore:   '/img/pfp_curatore.jpg',

    admin:      '/img/pfp_admin.jpg',
};


function applyAvatar(el, role, fallbackLetter) {
    if (!el) return;
    const src = ROLE_AVATARS[role];
    if (src) {
        el.style.backgroundImage = `url('${src}')`;
        el.textContent = '';
    } else {
        el.style.backgroundImage = '';
        el.textContent = fallbackLetter || '?';
    }
}

let curMusei = [];


let currentMuseoOpere  = [];
let currentMuseoVisite = [];
let currentDetailTab   = 'opere';

let currentViewMuseo = null;

let allMuseiAutore          = [];
let currentAutoreMuseoOpere = [];

let allVisitatoreCachedMusei = [];
let currentVisitatoreOpere   = [];

let _vfCurrentMuseo    = '';
let _vfItemTab         = 'miei';
let _vfMyItems         = [];
let _vfAcquistatiItems = [];
let _vfSelectedItemIds = new Set();
let _vfOperaSalaMap    = {};
let _vfRoomGeo         = null;


let _vfLoadToken       = 0;


const DASH_AMENITY_ICONS = {
    scale:       { icon: 'fa-stairs',           label: 'Scale' },
    ascensore:   { icon: 'fa-arrows-up-down',   label: 'Ascensore' },
    bagno:       { icon: 'fa-restroom',         label: 'Bagni' },
    caffetteria: { icon: 'fa-mug-saucer',       label: 'Caffetteria' },
    ingresso:    { icon: 'fa-door-open',        label: 'Ingresso' },
    U:           { icon: 'fa-right-from-bracket', label: 'Uscita' },
};


const DASH_TEMP_EXHIBIT_ID = 'mostre_temp';

function dashRoomDisplayName(roomId) {
    return roomId === DASH_TEMP_EXHIBIT_ID ? 'Sale per Mostre temporanee' : `Sala ${roomId}`;
}

function dashRingCentroid(ring) {
    let sx = 0, sy = 0;
    ring.forEach(([x, y]) => { sx += x; sy += -y; });
    return { x: sx / ring.length, y: sy / ring.length };
}


function dashPolygonLongAxis(ring) {
    const pts = ring.map(([x, y]) => ({ x, y: -y }));
    const n = pts.length;
    let mx = 0, my = 0;
    pts.forEach(p => { mx += p.x; my += p.y; });
    mx /= n; my /= n;
    let sxx = 0, syy = 0, sxy = 0;
    pts.forEach(p => {
        const dx = p.x - mx, dy = p.y - my;
        sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    });
    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const dirx  = Math.cos(angle), diry = Math.sin(angle);
    let tmin = Infinity, tmax = -Infinity;
    pts.forEach(p => {
        const t = (p.x - mx) * dirx + (p.y - my) * diry;
        if (t < tmin) tmin = t;
        if (t > tmax) tmax = t;
    });
    return {
        p1: { x: mx + tmin * dirx, y: my + tmin * diry },
        p2: { x: mx + tmax * dirx, y: my + tmax * diry },
    };
}


function dashBuildCorridorSpine(segments) {
    if (!segments.length) return null;
    const nodes = [];


    const mergeThreshold = 60;
    function nodeIndex(pt) {
        for (let i = 0; i < nodes.length; i++) {
            if (Math.hypot(nodes[i].x - pt.x, nodes[i].y - pt.y) < mergeThreshold) return i;
        }
        nodes.push({ x: pt.x, y: pt.y });
        return nodes.length - 1;
    }
    const edges = [];
    segments.forEach(seg => {
        const a = nodeIndex(seg.p1);
        const b = nodeIndex(seg.p2);
        if (a === b) return;
        edges.push({ a, b, len: Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) });
    });
    if (!edges.length) return null;

    const n = nodes.length;
    const dist = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) dist[i][i] = 0;
    edges.forEach(e => {
        dist[e.a][e.b] = Math.min(dist[e.a][e.b], e.len);
        dist[e.b][e.a] = Math.min(dist[e.b][e.a], e.len);
    });
    for (let k = 0; k < n; k++)
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];

    return { nodes, edges, allPairs: dist };
}


function dashProjectOntoSpine(spine, pt) {
    let best = null;
    spine.edges.forEach((e, idx) => {
        const a = spine.nodes[e.a], b = spine.nodes[e.b];
        const abx = b.x - a.x, aby = b.y - a.y;
        const lenSq = abx * abx + aby * aby;
        let t = lenSq > 0 ? ((pt.x - a.x) * abx + (pt.y - a.y) * aby) / lenSq : 0;
        t = Math.max(0, Math.min(1, t));
        const px = a.x + t * abx, py = a.y + t * aby;
        const d = Math.hypot(pt.x - px, pt.y - py);
        if (!best || d < best.d) best = { edgeIdx: idx, t, d };
    });
    return best;
}


function dashSpineDistance(spine, ptA, ptB) {
    const pa = dashProjectOntoSpine(spine, ptA);
    const pb = dashProjectOntoSpine(spine, ptB);
    const ea = spine.edges[pa.edgeIdx], eb = spine.edges[pb.edgeIdx];
    if (pa.edgeIdx === pb.edgeIdx) {
        return Math.abs(pa.t - pb.t) * ea.len;
    }
    const distA_a = pa.t * ea.len;
    const distA_b = (1 - pa.t) * ea.len;
    const distB_a = pb.t * eb.len;
    const distB_b = (1 - pb.t) * eb.len;
    return Math.min(
        distA_a + spine.allPairs[ea.a][eb.a] + distB_a,
        distA_a + spine.allPairs[ea.a][eb.b] + distB_b,
        distA_b + spine.allPairs[ea.b][eb.a] + distB_a,
        distA_b + spine.allPairs[ea.b][eb.b] + distB_b,
    );
}


function applyDashFloorPlanOverrides(museo) {
    if (!museo?.mappaInterna) return [];
    const ovMap = FLOOR_PLAN_OVERRIDES[museo.codiceIsil];
    if (!ovMap) return museo.mappaInterna;
    return museo.mappaInterna.map(p => {
        const ov = ovMap[p.piano];
        return ov ? { ...p, ...ov } : p;
    });
}
