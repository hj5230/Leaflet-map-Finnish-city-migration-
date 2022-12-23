async function fetchJson() {
    const url = 'https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326';
    const promise = await fetch(url);
    const json = await promise.json();
    const posiUrl = 'https://statfin.stat.fi/PxWeb/sq/4bb2c735-1dc3-4c5e-bde7-2165df85e65f';
    const negaUrl = 'https://statfin.stat.fi/PxWeb/sq/944493ca-ea4d-4fd9-a75c-4975192f7b6e';
    let posi = fetch(posiUrl);
    let nega = fetch(negaUrl);
    const [posiPro, negaPro] = await Promise.all([posi, nega]);
    posi = posiPro.json();
    nega = negaPro.json();
    const [posiRes, negaRes] = await Promise.all([posi, nega]);
    const posiMgri = posiRes.dataset.value;
    const negaMgri = negaRes.dataset.value;

    let posi_index = posiRes.dataset.dimension.Tuloalue.category.index;
    let posi_label = posiRes.dataset.dimension.Tuloalue.category.label;
    let posi_name_mgri = {};
    for(let _ in posi_index) {
        posi_name_mgri[posi_label[_].substring(10)] = posiMgri[posi_index[_]];
    }

    let nega_index = negaRes.dataset.dimension.Lähtöalue.category.index;
    let nega_label = negaRes.dataset.dimension.Lähtöalue.category.label;
    let nega_name_mgri = {};
    for(let _ in nega_index) {
        nega_name_mgri[nega_label[_].substring(12)] = negaMgri[nega_index[_]];
    }

    // console.log(json.features); // 308
    // console.log(posi_name_mgri, nega_name_mgri); // 310
    // posi_helsinki 35032
    for(let _ in json.features) {
        let name = json.features[_].properties['name'];
        json.features[_].properties['posiMgri'] = posi_name_mgri[name];
        json.features[_].properties['negaMgri'] = nega_name_mgri[name];
    }
    setMap(json)
    setColor(json)
}

function setMap(geo) {
    let map = L.map('map', {
        minZoom: -3
    });
    let bounds = L.geoJSON(geo, {
        onEachFeature: mapFeatures,
        style: mapStyles
    }).addTo(map);
    let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
    map.fitBounds(bounds.getBounds());
}

function mapFeatures(feature, layer) {
    let properties = feature.properties;
    layer.bindPopup(
        `
        <ul>
          <li>${properties.name}</li>
          <li>positive migration: ${properties.posiMgri}</li>
          <li>negative migration: ${properties.negaMgri}</li>
        </ul>
        `
    );
    layer.bindTooltip(properties.name);
}
const mapStyles = {
    weight: 2,
}

function getHue(posi, nega) {
    let hue = Math.pow((posi/nega), 3) * 60
    if(hue > 120) return 120;
    return hue;
}

function setColor(geo) {
    let cities = document.getElementsByClassName("leaflet-interactive");
    for(let i = 0; i < geo.features.length; ++i) {
        let posi = geo.features[i].properties['posiMgri'];
        let nega = geo.features[i].properties['negaMgri'];
        cities[i].setAttribute("fill", "hsl(" + getHue(posi, nega) + ", 75%, 50%)");
    }
}

try {
    fetchJson();
} catch (err) {
    alert(err);
}